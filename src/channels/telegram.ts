import { setTimeout as delay } from "node:timers/promises";

export type TelegramUser = {
  id: number;
  username?: string;
  first_name: string;
  is_bot: boolean;
  has_topics_enabled?: boolean;
};

export type TelegramMessage = {
  message_id: number;
  message_thread_id?: number;
  from?: TelegramUser;
  chat: { id: number; type: string };
  text?: string;
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

function toggledFence(line: string, openFence: string | null) {
  const match = /^\s*(```[^\r\n]*)/.exec(line);
  if (!match) return openFence;
  return openFence ? null : (match[1] ?? "```");
}

export function splitTelegramText(input: string, limit = 3900) {
  const text = input.trim() || "(Claude tidak mengirim teks.)";
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

export class Telegram {
  private offset = 0;

  constructor(
    private readonly token: string,
    private readonly fetcher: typeof fetch = fetch,
    private readonly base = "https://api.telegram.org",
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
        throw new TelegramError(`Telegram ${method} tidak dapat dihubungi.`);
      }
      const body = (await response.json()) as ApiResponse<T>;
      if (body.ok && body.result !== undefined) return body.result;
      if (body.error_code === 429 && body.parameters?.retry_after) {
        await delay(body.parameters.retry_after * 1000, undefined, signal ? { signal } : undefined);
        continue;
      }
      throw new TelegramError(body.description ?? `Telegram menolak ${method}.`, body.error_code);
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

  getUpdates(offset = this.offset, timeout = 25, signal?: AbortSignal) {
    return this.call<TelegramUpdate[]>(
      "getUpdates",
      { offset, timeout, allowed_updates: ["message", "callback_query"] },
      signal,
    );
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
    for (const chunk of splitTelegramText(text))
      sent.push(await this.sendText(chatId, chunk, threadId));
    return sent;
  }

  async sendResult(chatId: string, markdown: string, threadId = "") {
    const sent: TelegramMessage[] = [];
    for (const chunk of splitTelegramText(markdown, 30_000)) {
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

  createTopic(chatId: string, name: string) {
    return this.call<{ message_thread_id: number }>("createForumTopic", {
      chat_id: chatId,
      name: name.replace(/\s+/g, " ").trim().slice(0, 128) || "Tugas baru",
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
