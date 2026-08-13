import { writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import {
  splitMarkdown,
  type Channel,
  type ChannelCaps,
  type ChannelCommand,
  type InboundMessage,
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
  /** `getMe` only: "True, if privacy mode is disabled for the bot." */
  can_read_all_group_messages?: boolean;
};

export type TelegramChat = {
  id: number;
  type: string;
  title?: string;
  is_forum?: boolean;
};

/**
 * One file on the wire, in the shape eight of the nine media slots share.
 * `file_name` and `mime_type` are "as defined by the sender" per the Bot API, so
 * neither ever names a file on this machine; `file_name` is not declared here at
 * all, because nothing may read it (`docs/api.md` §5).
 */
export type TelegramFile = {
  file_id: string;
  file_size?: number;
  mime_type?: string;
  width?: number;
  height?: number;
};

export type TelegramMessage = {
  message_id: number;
  message_thread_id?: number;
  from?: TelegramUser;
  chat: TelegramChat;
  text?: string;
  /** What a photo, a video, or a document was sent with. Never both with `text`. */
  caption?: string;
  /** Offset and length are counted in UTF-16 code units, per the Bot API. */
  entities?: Array<{ type: string; offset: number; length: number }>;
  /** The same list for a caption, which is a separate field on the wire. */
  caption_entities?: Array<{ type: string; offset: number; length: number }>;
  photo?: TelegramFile[];
  document?: TelegramFile;
  voice?: TelegramFile;
  audio?: TelegramFile;
  video?: TelegramFile;
  video_note?: TelegramFile;
  animation?: TelegramFile;
  sticker?: TelegramFile;
  /** The ninth slot, and the one with no file behind it at all. */
  location?: { latitude: number; longitude: number };
  reply_to_message?: TelegramMessage;
  /**
   * The service message that opened a topic. `is_topic_message` would answer the
   * same question and has no reader here, and a field nothing reads is a promise
   * nobody checks (`docs/api.md` §4).
   */
  forum_topic_created?: { name: string };
  /** Filled in by this adapter, not by Telegram; core reads it (FR-CHAN-09). */
  addressed?: boolean;
  /** Filled in by this adapter from the slots above; core reads the neutral words. */
  attachments?: NonNullable<InboundMessage["attachments"]>;
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

// getFile: "bots can download files of up to 20MB in size". A file that reports
// more is refused before the request, and the count below catches one that
// reported nothing.
const DOWNLOAD_LIMIT = 20 * 1024 * 1024;

// Slot → the neutral word core reads. Seven of the eight file slots pair one to
// one; `photo` is the eighth and is read below, because it arrives as a list.
const MEDIA_SLOTS = [
  ["document", "document"],
  ["voice", "audio"],
  ["audio", "audio"],
  ["video", "video"],
  ["video_note", "video"],
  ["animation", "video"],
  ["sticker", "sticker"],
] as const;

// The Bot API promises no order for `photo[]`, so the biggest is the one with
// the most pixels rather than the last element.
function largest(sizes: TelegramFile[]) {
  return sizes.reduce((best, next) =>
    (next.width ?? 0) * (next.height ?? 0) > (best.width ?? 0) * (best.height ?? 0) ? next : best,
  );
}

/**
 * What this message carries that is not text, one entry per filled slot. The
 * wire file rides along so `fetchAttachment` can re-read it by index; core is
 * handed the neutral fields only. `location` has no file at all, so it is
 * classified, audited, and answered with one sentence.
 */
function mediaOf(message: TelegramMessage) {
  const found: Array<{ kind: string; file?: TelegramFile }> = [];
  if (message.photo?.length) found.push({ kind: "image", file: largest(message.photo) });
  for (const [slot, kind] of MEDIA_SLOTS) {
    const file = message[slot];
    if (file) found.push({ kind, file });
  }
  if (message.location) found.push({ kind: "location" });
  return found;
}

export class Telegram implements Channel {
  private offset = 0;
  private botName = "";
  private readsEverything = false;

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
    // One `getMe`, two answers: the name a mention has to spell, and whether
    // privacy mode is off, which decides which readiness sentence is true. A
    // failure here does not stop the start — with no name nothing is reported
    // about who was addressed, and core answers.
    const me = await this.getMe(signal).catch(() => undefined);
    this.botName = me?.username ?? "";
    this.readsEverything = me?.can_read_all_group_messages === true;
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
        const message = update.message;
        // A caption is the text of the message that carried it, and the media
        // slots become the neutral entries core reads. Both happen before
        // `addressed` below, because a caption is where a room's mention is.
        if (message) this.classify(message);
        // Only a room asks the question. A private conversation is aimed here by
        // definition, and core reads `chat.type` for that; two answers to one
        // question would be two places to be wrong.
        if (message && message.chat.type !== "private") {
          const aimed = this.addressed(message);
          if (aimed !== undefined) message.addressed = aimed;
        }
        yield update;
      }
    }
  }

  /**
   * The caption becomes the text and the media slots become attachment entries.
   * Nothing is dropped for want of a reader: a slot with no route to an agent is
   * still an entry, and core answers it with one sentence.
   */
  private classify(message: TelegramMessage) {
    if (!message.text && message.caption) message.text = message.caption;
    const media = mediaOf(message);
    if (media.length === 0) return;
    message.attachments = media.map(({ kind, file }) => ({
      kind,
      ...(file?.mime_type ? { mime: file.mime_type } : {}),
      ...(file?.file_size === undefined ? {} : { size: file.file_size }),
      // The ceiling belongs to whoever downloads, so core is told the answer
      // rather than the number (`src/core/channel.ts`).
      ...((file?.file_size ?? 0) > DOWNLOAD_LIMIT ? { tooBig: true } : {}),
    }));
  }

  /**
   * Whether a room message was aimed at this bot. Undefined is the honest answer
   * while the bot's own name is unknown: there is nothing to compare a mention
   * against, and core answers rather than going quiet.
   */
  private addressed(message: TelegramMessage): boolean | undefined {
    if (!this.botName) return undefined;
    const suffix = `@${this.botName.toLowerCase()}`;
    const text = message.text ?? "";
    // A caption's entities arrive in a field of their own, and `classify` above
    // already moved the caption into `text`, so the offsets line up.
    for (const entity of message.entities ?? message.caption_entities ?? []) {
      if (entity.type !== "mention" && entity.type !== "bot_command") continue;
      // The Bot API counts an entity in UTF-16 code units, which is what a
      // JavaScript string is indexed in, so the slice needs no conversion. A
      // byte-based one would miss every entity behind an emoji.
      const slice = text.slice(entity.offset, entity.offset + entity.length);
      if (slice.toLowerCase().endsWith(suffix)) return true;
    }
    // A reply to one of the bot's own messages is aimed at it, except for the one
    // that opened a topic: inside a topic Caraka created, every first-level
    // message is a reply to that service message, and that message is Caraka's.
    const replied = message.reply_to_message;
    if (replied && !replied.forum_topic_created)
      return replied.from?.username?.toLowerCase() === this.botName.toLowerCase();
    return false;
  }

  /**
   * The one downloader in this repository. `getFile` is called here rather than
   * at classification, because a file path is documented to hold for at least an
   * hour and a run can queue for longer than that. The URL is
   * `…/file/bot<token>/<path>`, so it is built and spent inside this method: what
   * leaves is the path written or null (AC-2.3).
   */
  async fetchAttachment(message: InboundMessage, index: number, target: string) {
    const fileId = mediaOf(message as TelegramMessage)[index]?.file?.file_id;
    if (!fileId) return null;
    const file = await this.call<{ file_path?: string }>("getFile", { file_id: fileId });
    if (!file.file_path) return null;
    const response = await this.fetcher(`${this.base}/file/bot${this.token}/${file.file_path}`);
    if (!response.ok || !response.body) return null;
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
      bytes += chunk.byteLength;
      // The reported size is a number the sender wrote, so the bytes are counted
      // again here. Past the ceiling the read stops and nothing is written at
      // all, so there is no half file to clean up (AC-4.3).
      if (bytes > DOWNLOAD_LIMIT) return null;
      chunks.push(chunk);
    }
    await writeFile(target, Buffer.concat(chunks), { mode: 0o600 });
    return target;
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

  // Pairing is the one moment the operator is watching, and which sentence is
  // true here depends on privacy mode: with it on, an ordinary group message
  // never reaches the bot; with it off, every message does and Caraka answers
  // only the ones that name it. `getMe` in `start()` decided which, so the
  // sentence is read off an answer rather than off an assumption.
  async readiness(threads: boolean) {
    return this.t(this.readsEverything ? "group.readyAll" : "group.ready", {
      bot: this.botName || "caraka",
      topics: this.t(threads ? "group.topicsOn" : "group.topicsOff"),
    });
  }
}
