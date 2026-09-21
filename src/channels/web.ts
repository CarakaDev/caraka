import { randomBytes } from "node:crypto";
import { copyFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  Channel,
  ChannelCaps,
  ChannelCommand,
  InboundEvent,
  InboundMessage,
  MessageRef,
} from "../core/channel.js";
import { drainInbox } from "../core/channel.js";
import type { Store } from "../store/db.js";
import { code, hash, PAIR_TTL_MS, token } from "../web/auth.js";
import { WebServer } from "../web/server.js";

type Button = { id: string; text: string; data: string };
type WebConfig = {
  host: string;
  port: number;
  origin: string;
  owner: string;
  workspaces?: Array<{ slug: string; path: string; agent?: string | undefined }>;
};
type FileInput = { id: string; name: string; mime: string; path: string };
export const WEB_INBOX_LIMIT = 100;

export class WebQueueFull extends Error {
  constructor() {
    super("Web inbox is full");
    this.name = "WebQueueFull";
  }
}

export class WebChannel implements Channel {
  readonly id = "web";
  readonly caps: ChannelCaps = { threads: false, buttons: true, edit: true, maxChars: 100_000 };
  readonly inbox: InboundEvent[] = [];
  private readonly files = new Map<string, FileInput[]>();
  private readonly callbacks = new Map<
    string,
    { roomId: string; messageId?: string; data: string }
  >();
  private readonly server: WebServer;
  private closed = false;
  constructor(
    readonly options: {
      config: WebConfig;
      store: Store;
      scrub: (text: string) => string;
      paths: { root: string };
      language: string;
      version: string;
    },
  ) {
    this.server = new WebServer({
      host: options.config.host,
      port: options.config.port,
      origin: options.config.origin,
      root: options.paths.root,
      store: options.store,
      hooks: {
        pair: (value, name) => this.pair(value, name),
        state: (device) => this.state(device),
        message: (device, input) => this.message(device, input),
        callback: (device, input) => this.callback(device, input),
        stop: (device, roomId) => this.stop(device, roomId),
        invalidated: () => this.server.invalidate(),
      },
    });
  }
  get url() {
    return this.server.url;
  }
  async start(signal?: AbortSignal) {
    await this.server.start();
    signal?.addEventListener("abort", () => void this.close(), { once: true });
  }
  async close() {
    if (this.closed) return;
    this.closed = true;
    await this.server.close();
  }
  createPairCode() {
    const value = code();
    this.options.store.db
      .prepare("DELETE FROM web_pair_codes WHERE expires_at <= ?")
      .run(Date.now());
    this.options.store.db
      .prepare("INSERT INTO web_pair_codes(hash,expires_at) VALUES(?,?)")
      .run(hash(value), Date.now() + PAIR_TTL_MS);
    return value;
  }
  private pair(value: string, name: string) {
    const used = this.options.store.db
      .prepare("DELETE FROM web_pair_codes WHERE hash = ? AND expires_at > ?")
      .run(hash(value), Date.now());
    if (Number(used.changes) !== 1) return undefined;
    const id = randomBytes(8).toString("hex");
    const valueToken = token();
    this.options.store.db
      .prepare(
        "INSERT INTO web_devices(id,name,token_hash,created_at,revoked_at) VALUES(?,?,?,?,NULL)",
      )
      .run(id, this.options.scrub(name), hash(valueToken), Date.now());
    this.server.invalidate();
    return { id, token: valueToken };
  }
  private state(device: { id: string; name: string }) {
    const rooms = this.options.store.db
      .prepare(`SELECT r.id, r.workspace, r.created_at AS createdAt,
      s.id AS sessionId, s.title, s.state, s.agent FROM web_rooms r LEFT JOIN sessions s ON s.id =
      (SELECT id FROM sessions WHERE chat_id = 'web:' || r.id ORDER BY updated_at DESC LIMIT 1)
      ORDER BY r.created_at DESC`)
      .all();
    const messages = (
      this.options.store.db
        .prepare(
          "SELECT id, room_id AS roomId, role, text, buttons, attachments, created_at AS createdAt FROM web_messages ORDER BY created_at ASC",
        )
        .all() as unknown as Array<{
        id: string;
        roomId: string;
        role: string;
        text: string;
        buttons: string;
        attachments: string;
        createdAt: number;
      }>
    ).map((row) => ({
      ...row,
      buttons: (JSON.parse(row.buttons) as Button[]).filter(
        (button) => this.callbacks.get(button.id)?.messageId === row.id,
      ),
      attachments: JSON.parse(row.attachments),
    }));
    return {
      device: { id: device.id, name: device.name },
      language: this.options.language,
      workspaces: this.options.config.workspaces ?? [],
      rooms,
      messages,
      connection: { state: "connected", origin: this.url },
      push: { available: false, message: "Web Push is not configured." },
    };
  }
  private async message(
    _device: unknown,
    input: {
      clientId: string;
      roomId?: string;
      workspace?: string;
      text: string;
      files?: string[];
    },
  ) {
    const replay = this.options.store.db
      .prepare("SELECT room_id AS roomId FROM web_messages WHERE client_id = ?")
      .get(input.clientId) as { roomId: string } | undefined;
    if (replay) return { roomId: replay.roomId, replay: true };
    // Reject before persisting any room or message. Gateway cannot accept work
    // after this bounded inbox reaches its capacity.
    if (this.inbox.length >= WEB_INBOX_LIMIT) throw new WebQueueFull();
    const files: FileInput[] = [];
    for (const fileId of input.files ?? []) {
      const file = this.options.store.db
        .prepare("SELECT id,name,mime,path FROM web_files WHERE id = ?")
        .get(fileId) as FileInput | undefined;
      if (!file) throw new Error("file");
      files.push(file);
    }
    let roomId = input.roomId;
    if (roomId) {
      const found = this.options.store.db
        .prepare("SELECT id, workspace FROM web_rooms WHERE id = ?")
        .get(roomId) as { id: string; workspace: string } | undefined;
      if (!found) throw new Error("room");
    } else {
      const workspace = input.workspace ?? this.options.config.workspaces?.[0]?.slug;
      if (!workspace || !this.options.config.workspaces?.some((entry) => entry.slug === workspace))
        throw new Error("workspace");
      roomId = randomBytes(9).toString("base64url");
      this.options.store.db
        .prepare("INSERT INTO web_rooms(id,workspace,created_at) VALUES(?,?,?)")
        .run(roomId, workspace, Date.now());
    }
    const id = randomBytes(8).toString("hex");
    this.options.store.db
      .prepare(
        "INSERT INTO web_messages(id,room_id,client_id,role,text,buttons,attachments,created_at) VALUES(?,?,?,?,?,?,?,?)",
      )
      .run(
        id,
        roomId,
        input.clientId,
        "user",
        this.options.scrub(input.text),
        "[]",
        JSON.stringify(
          files.map((file) => ({
            id: file.id,
            name: this.options.scrub(file.name),
            mime: file.mime,
          })),
        ),
        Date.now(),
      );
    const messageId = `web-in-${id}`;
    this.files.set(messageId, files);
    const room = this.options.store.db
      .prepare("SELECT workspace FROM web_rooms WHERE id = ?")
      .get(roomId) as { workspace: string };
    this.inbox.push({
      message: {
        message_id: messageId,
        from: { id: this.options.config.owner },
        chat: { id: `web:${roomId}`, type: "private" },
        text: input.roomId ? input.text : `@${JSON.stringify(room.workspace)} ${input.text}`,
        attachments: files.map((file) => ({ kind: "document", mime: file.mime })),
      },
    });
    this.server.invalidate();
    return { roomId, replay: false };
  }
  private callback(_device: unknown, input: { messageId: string; buttonId: string }) {
    const entry = this.callbacks.get(input.buttonId);
    if (!entry || entry.messageId !== input.messageId) return false;
    if (this.inbox.length >= WEB_INBOX_LIMIT) return "full" as const;
    this.callbacks.delete(input.buttonId);
    this.inbox.push({
      callback_query: {
        id: `web-callback-${randomBytes(6).toString("hex")}`,
        from: { id: this.options.config.owner },
        message: {
          message_id: input.messageId,
          from: { id: this.options.config.owner },
          chat: { id: `web:${entry.roomId}`, type: "private" },
        },
        data: entry.data,
      },
    });
    this.server.invalidate();
    return true;
  }
  private stop(_device: unknown, roomId: string) {
    if (this.inbox.length >= WEB_INBOX_LIMIT) return "full" as const;
    if (!this.options.store.db.prepare("SELECT id FROM web_rooms WHERE id = ?").get(roomId))
      return false;
    this.inbox.push({
      message: {
        message_id: `web-stop-${randomBytes(6).toString("hex")}`,
        from: { id: this.options.config.owner },
        chat: { id: `web:${roomId}`, type: "private" },
        text: "/stop",
      },
    });
    return true;
  }
  async *updates(signal: AbortSignal) {
    yield* drainInbox(this.inbox, signal, () =>
      this.closed ? new Error("Web server stopped") : undefined,
    );
  }
  async fetchAttachment(message: InboundMessage, index: number, target: string) {
    const file = this.files.get(String(message.message_id))?.[index];
    if (!file) return null;
    await copyFile(file.path, target);
    return target;
  }
  async setMyCommands(_commands: ChannelCommand[], _scopeId: string) {}
  private room(chatId: string) {
    return chatId.startsWith("web:") ? chatId.slice(4) : chatId;
  }
  private buttons(roomId: string, markup?: Record<string, unknown>) {
    const rows = (markup?.inline_keyboard ?? []) as Array<
      Array<{ text?: unknown; callback_data?: unknown }>
    >;
    const buttons: Button[] = [];
    for (const row of rows)
      for (const item of row)
        if (typeof item.text === "string" && typeof item.callback_data === "string") {
          const id = randomBytes(8).toString("base64url");
          this.callbacks.set(id, { roomId, data: item.callback_data });
          buttons.push({ id, text: item.text, data: id });
        }
    return buttons;
  }
  async sendText(
    chatId: string,
    text: string,
    _threadId = "",
    replyMarkup?: Record<string, unknown>,
  ): Promise<MessageRef> {
    const roomId = this.room(chatId);
    const id = randomBytes(8).toString("hex");
    const buttons = this.buttons(roomId, replyMarkup);
    for (const button of buttons) {
      const entry = this.callbacks.get(button.id);
      if (entry) entry.messageId = id;
    }
    this.options.store.db
      .prepare(
        "INSERT INTO web_messages(id,room_id,client_id,role,text,buttons,attachments,created_at) VALUES(?,?,?,?,?,?,?,?)",
      )
      .run(
        id,
        roomId,
        null,
        "assistant",
        this.options.scrub(text),
        JSON.stringify(buttons),
        "[]",
        Date.now(),
      );
    this.server.invalidate();
    return { message_id: id };
  }
  async sendResult(chatId: string, markdown: string, threadId = "") {
    return [await this.sendText(chatId, markdown, threadId)];
  }
  async sendAttachment(chatId: string, file: { bytes: Buffer; mimeType: string; name: string }) {
    const id = randomBytes(8).toString("hex");
    const path = join(this.options.paths.root, "web-files", id);
    await import("node:fs/promises").then(({ writeFile }) =>
      writeFile(path, file.bytes, { mode: 0o600 }),
    );
    this.options.store.db
      .prepare("INSERT INTO web_files(id,name,mime,path,created_at) VALUES(?,?,?,?,?)")
      .run(id, file.name, file.mimeType, path, Date.now());
    const messageId = randomBytes(8).toString("hex");
    this.options.store.db
      .prepare(
        "INSERT INTO web_messages(id,room_id,client_id,role,text,buttons,attachments,created_at) VALUES(?,?,?,?,?,?,?,?)",
      )
      .run(
        messageId,
        this.room(chatId),
        null,
        "assistant",
        `[File: ${this.options.scrub(file.name)}]`,
        "[]",
        JSON.stringify([{ id, name: this.options.scrub(file.name), mime: file.mimeType }]),
        Date.now(),
      );
    this.server.invalidate();
    return { message_id: messageId };
  }
  async editText(chatId: string, messageId: string | number, text: string) {
    const roomId = this.room(chatId);
    this.options.store.db
      .prepare("UPDATE web_messages SET text = ? WHERE id = ? AND room_id = ?")
      .run(this.options.scrub(text), String(messageId), roomId);
    this.server.invalidate();
  }
  async deleteMessage(_chatId: string, _messageId: string | number) {}
  async createTopic(_chatId: string, _name: string): Promise<{ message_thread_id: string }> {
    throw new Error("Web has no topics");
  }
  async editTopic() {
    throw new Error("Web has no topics");
  }
  async answerCallback(_id: string, _text: string, _alert = false) {}
  async clearKeyboard(_chatId: string, messageId: string | number) {
    const id = String(messageId);
    for (const [buttonId, entry] of this.callbacks)
      if (entry.messageId === id) this.callbacks.delete(buttonId);
    this.options.store.db.prepare("UPDATE web_messages SET buttons = ? WHERE id = ?").run("[]", id);
    this.server.invalidate();
  }
  async direct(_principal: string) {
    const id = "control";
    if (!this.options.store.db.prepare("SELECT id FROM web_rooms WHERE id = ?").get(id))
      this.options.store.db
        .prepare("INSERT INTO web_rooms(id,workspace,created_at) VALUES(?,?,?)")
        .run(id, this.options.config.workspaces?.[0]?.slug ?? "", Date.now());
    return `web:${id}`;
  }
  pairingText(title: string) {
    return title;
  }
  async readiness() {
    return "Web is ready.";
  }
}
