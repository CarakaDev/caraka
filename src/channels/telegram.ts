import { setTimeout as delay } from "node:timers/promises";
import {
  splitMarkdown,
  type Channel,
  type ChannelCaps,
  type ChannelCommand,
  type ThreadRef,
} from "../core/channel.js";
import { translator, type Translate } from "../i18n.js";

export type TelegramUser = {
  id: number;
  username?: string;
  first_name: string;
  is_bot: boolean;
  has_topics_enabled?: boolean;
  allows_users_to_create_topics?: boolean;
};

export type TelegramChat = {
  id: number;
  type: string;
  title?: string;
  is_forum?: boolean;
};

export type TelegramMessage = {
  message_id: number;
  message_thread_id?: number;
  from?: TelegramUser;
  chat: TelegramChat;
  text?: string;
};

export type TelegramChatMember = {
  status: string;
  user?: TelegramUser;
  can_manage_topics?: boolean;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: {
    id: string;
    from: TelegramUser;
    message?: TelegramMessage;
    data?: string;
  };
  my_chat_member?: {
    chat: TelegramChat;
    from: TelegramUser;
    new_chat_member: TelegramChatMember;
    old_chat_member?: TelegramChatMember;
  };
};

type ApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
  parameters?: { retry_after?: number };
};

export class TelegramError extends Error {
  constructor(
    message: string,
    readonly code?: number,
  ) {
    super(message);
  }
}

function topicName(name: string, fallback: string) {
  return name.replace(/\s+/g, " ").trim().slice(0, 128) || fallback;
}

export class Telegram implements Channel {
  private offset = 0;
  private botName = "";

  readonly id = "telegram";
  // Whether a given chat has threads is a per-chat matter Telegram answers with
  // `is_forum`; this says the channel is able to hold them at all, which for
  // Telegram is the bot-wide Threaded Mode the wizard wrote down. 4096 is the
  // cap `sendText` already slices to.
  readonly caps: ChannelCaps;

  constructor(
    private readonly token: string,
    private readonly fetcher: typeof fetch = fetch,
    private readonly base = "https://api.telegram.org",
    private readonly t: Translate = translator(),
    topics = true,
  ) {
    this.caps = { threads: topics, buttons: true, edit: true, maxChars: 4096 };
  }

  async call<T>(
    method: string,
    params: Record<string, unknown> = {},
    signal?: AbortSignal,
  ): Promise<T> {
    for (;;) {
      let response: Response;
      try {
        response = await this.fetcher(`${this.base}/bot${this.token}/${method}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(params),
          ...(signal ? { signal } : {}),
        });
      } catch (error) {
        if (signal?.aborted) throw error;
        throw new TelegramError(this.t("channel.unreachable", { channel: "Telegram", method }));
      }
      const body = (await response.json()) as ApiResponse<T>;
      if (body.ok && body.result !== undefined) return body.result;
      if (body.error_code === 429 && body.parameters?.retry_after) {
        await delay(body.parameters.retry_after * 1000, undefined, signal ? { signal } : undefined);
        continue;
      }
      throw new TelegramError(
        body.description ?? this.t("channel.refused", { channel: "Telegram", method }),
        body.error_code,
      );
    }
  }

  // Dropping a leftover webhook is what long polling needs before it starts,
  // and it means nothing to any other channel, so it belongs here rather than
  // in the contract.
  async start(signal?: AbortSignal) {
    await this.deleteWebhook(false, signal);
  }

  getMe(signal?: AbortSignal) {
    return this.call<TelegramUser>("getMe", {}, signal);
  }

  deleteWebhook(dropPendingUpdates = false, signal?: AbortSignal) {
    return this.call<boolean>(
      "deleteWebhook",
      { drop_pending_updates: dropPendingUpdates },
      signal,
    );
  }

  // `my_chat_member` is the only signal that the bot was blocked or added to a
  // group. Leaving it out of this list is what made both paths unreachable.
  getUpdates(offset = this.offset, timeout = 25, signal?: AbortSignal) {
    return this.call<TelegramUpdate[]>(
      "getUpdates",
      {
        offset,
        timeout,
        allowed_updates: ["message", "callback_query", "my_chat_member"],
      },
      signal,
    );
  }

  setMyCommands(commands: ChannelCommand[], chatId: string) {
    return this.call<boolean>("setMyCommands", {
      commands,
      scope: { type: "chat", chat_id: chatId },
    });
  }

  async *updates(signal: AbortSignal) {
    while (!signal.aborted) {
      let updates: TelegramUpdate[];
      try {
        updates = await this.getUpdates(this.offset, 25, signal);
      } catch (error) {
        if (signal.aborted) return;
        if (error instanceof TelegramError && (error.code === 401 || error.code === 409))
          throw error;
        await delay(2000, undefined, { signal }).catch(() => undefined);
        continue;
      }
      for (const update of updates) {
        this.offset = Math.max(this.offset, update.update_id + 1);
        yield update;
      }
    }
  }

  sendText(chatId: string, text: string, threadId = "", replyMarkup?: Record<string, unknown>) {
    return this.call<TelegramMessage>("sendMessage", {
      chat_id: chatId,
      text: text.slice(0, 4096),
      ...(threadId ? { message_thread_id: Number(threadId) } : {}),
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    });
  }

  async sendPlain(chatId: string, text: string, threadId = "") {
    const sent: TelegramMessage[] = [];
    for (const chunk of splitMarkdown(text, 3900, this.t("channel.empty")))
      sent.push(await this.sendText(chatId, chunk, threadId));
    return sent;
  }

  async sendResult(chatId: string, markdown: string, threadId = "") {
    const sent: TelegramMessage[] = [];
    for (const chunk of splitMarkdown(markdown, 30_000, this.t("channel.empty"))) {
      try {
        sent.push(
          await this.call<TelegramMessage>("sendRichMessage", {
            chat_id: chatId,
            rich_message: { markdown: chunk },
            ...(threadId ? { message_thread_id: Number(threadId) } : {}),
          }),
        );
      } catch {
        sent.push(...(await this.sendPlain(chatId, chunk, threadId)));
      }
    }
    return sent;
  }

  // A message id is a number here and a snowflake string elsewhere, so the
  // contract carries both and this adapter narrows at the wire.
  editText(chatId: string, messageId: number | string, text: string) {
    return this.call<TelegramMessage>("editMessageText", {
      chat_id: chatId,
      message_id: Number(messageId),
      text: text.slice(-3900),
    });
  }

  deleteMessage(chatId: string, messageId: number | string) {
    return this.call<boolean>("deleteMessage", { chat_id: chatId, message_id: Number(messageId) });
  }

  // `icon_color` is settable once, at creation, and only from Telegram's six
  // documented values. `editForumTopic` cannot change it afterwards, so the
  // running blue is the colour a topic keeps for life; the state that moves
  // lives in the name.
  createTopic(chatId: string, name: string, iconColor = 7322096): Promise<ThreadRef> {
    return this.call<{ message_thread_id: number }>("createForumTopic", {
      chat_id: chatId,
      name: topicName(name, this.t("session.untitled")),
      icon_color: iconColor,
    });
  }

  // `editForumTopic` is documented for a private chat too, and it exposes only
  // `name` and `icon_custom_emoji_id`. `closeForumTopic` is documented for
  // supergroups alone, so a finished session is marked, never closed or deleted.
  editTopic(chatId: string, threadId: string, name: string) {
    return this.call<boolean>("editForumTopic", {
      chat_id: chatId,
      message_thread_id: Number(threadId),
      name: topicName(name, this.t("session.untitled")),
    });
  }

  answerCallback(id: string, text: string, alert = false) {
    return this.call<boolean>("answerCallbackQuery", {
      callback_query_id: id,
      text: text.slice(0, 200),
      show_alert: alert,
    });
  }

  clearKeyboard(chatId: string, messageId: number | string) {
    return this.call<TelegramMessage>("editMessageReplyMarkup", {
      chat_id: chatId,
      message_id: Number(messageId),
      reply_markup: { inline_keyboard: [] },
    });
  }

  pairingText(title: string, containerId: string) {
    return this.t("group.pairing", { title, chatId: containerId });
  }

  // Pairing is the one moment the operator is watching, and privacy mode means
  // an ordinary group message never reaches the bot at all. Saying so here is
  // the difference between a documented boundary and a bot that looks broken.
  async readiness(threads: boolean) {
    if (!this.botName)
      this.botName = await this.getMe()
        .then((me) => me.username ?? "")
        .catch(() => "");
    return this.t("group.ready", {
      bot: this.botName || "caraka",
      topics: this.t(threads ? "group.topicsOn" : "group.topicsOff"),
    });
  }
}
