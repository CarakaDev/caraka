import { setTimeout as delay } from "node:timers/promises";
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

export type BotCommand = { command: string; description: string };

// A name is 1–32 characters of lowercase a-z, digits, and underscores; a
// description is 1–256 characters. Telegram rejects the whole call otherwise.
export const gatewayCommands: BotCommand[] = [
  { command: "new", description: "Start a fresh session in this conversation" },
  { command: "status", description: "Report the state of this conversation's session" },
  { command: "stop", description: "Cancel the running task" },
  { command: "ws", description: "List the workspaces and their paths" },
  { command: "switch", description: "Run this session on another agent preset" },
  { command: "commands", description: "List the commands the agent reported" },
  { command: "usage", description: "Report the context and cost the agent reported" },
  { command: "ingat", description: "Save a note to memory" },
  { command: "lupakan", description: "Delete a memory item by its id" },
  { command: "memori", description: "List what memory holds for this workspace" },
  { command: "yolo", description: "Open a Caraka trust window for a stated duration" },
  { command: "lock", description: "Close the trust window now" },
  { command: "help", description: "Explain how to send a task" },
];

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

function toggledFence(line: string, openFence: string | null) {
  const match = /^\s*(```[^\r\n]*)/.exec(line);
  if (!match) return openFence;
  return openFence ? null : (match[1] ?? "```");
}

export function splitTelegramText(input: string, limit = 3900, empty = "(Claude sent no text.)") {
  const text = input.trim() || empty;
  const lines: string[] = [];
  for (let line of text.match(/[^\n]*\n|[^\n]+$/g) ?? [text]) {
    while (line.length > limit - 16) {
      lines.push(line.slice(0, limit - 16));
      line = line.slice(limit - 16);
    }
    if (line) lines.push(line);
  }
  const chunks: string[] = [];
  let current = "";
  let fence: string | null = null;

  for (const line of lines) {
    const closing = fence ? "\n```" : "";
    if (current && current.length + line.length + closing.length > limit) {
      chunks.push(`${current.trimEnd()}${closing}`);
      current = fence ? `${fence}\n` : "";
    }
    current += line;
    fence = toggledFence(line, fence);
  }
  if (current) chunks.push(`${current.trimEnd()}${fence ? "\n```" : ""}`);
  return chunks;
}

function topicName(name: string, fallback: string) {
  return name.replace(/\s+/g, " ").trim().slice(0, 128) || fallback;
}

export class Telegram {
  private offset = 0;

  constructor(
    private readonly token: string,
    private readonly fetcher: typeof fetch = fetch,
    private readonly base = "https://api.telegram.org",
    private readonly t: Translate = translator(),
  ) {}

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
        throw new TelegramError(this.t("telegram.unreachable", { method }));
      }
      const body = (await response.json()) as ApiResponse<T>;
      if (body.ok && body.result !== undefined) return body.result;
      if (body.error_code === 429 && body.parameters?.retry_after) {
        await delay(body.parameters.retry_after * 1000, undefined, signal ? { signal } : undefined);
        continue;
      }
      throw new TelegramError(
        body.description ?? this.t("telegram.refused", { method }),
        body.error_code,
      );
    }
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

  setMyCommands(commands: BotCommand[], chatId: string) {
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
    for (const chunk of splitTelegramText(text, 3900, this.t("telegram.empty")))
      sent.push(await this.sendText(chatId, chunk, threadId));
    return sent;
  }

  async sendResult(chatId: string, markdown: string, threadId = "") {
    const sent: TelegramMessage[] = [];
    for (const chunk of splitTelegramText(markdown, 30_000, this.t("telegram.empty"))) {
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

  editText(chatId: string, messageId: number, text: string) {
    return this.call<TelegramMessage>("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: text.slice(-3900),
    });
  }

  deleteMessage(chatId: string, messageId: number) {
    return this.call<boolean>("deleteMessage", { chat_id: chatId, message_id: messageId });
  }

  // `icon_color` is settable once, at creation, and only from Telegram's six
  // documented values. `editForumTopic` cannot change it afterwards, so the
  // running blue is the colour a topic keeps for life; the state that moves
  // lives in the name.
  createTopic(chatId: string, name: string, iconColor = 7322096) {
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

  clearKeyboard(chatId: string, messageId: number) {
    return this.call<TelegramMessage>("editMessageReplyMarkup", {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: [] },
    });
  }
}
