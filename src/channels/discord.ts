/**
 * Discord over the two things Node already ships: `fetch` for REST and the
 * global `WebSocket` for the gateway. No `discord.js`, so the dependency count
 * does not move (`spec/discord-v05.md` K5), and this module is imported only
 * when a `discord:` block exists in the config.
 *
 * Everything channel-shaped stays here. Core never learns which channel
 * answered, so the routing prefix, the wire names, and the disclosure wording
 * are all written on this side of the seam.
 */
import { setTimeout as delay } from "node:timers/promises";
import {
  containerOf,
  drainInbox,
  evict,
  fetchWithRetry,
  routeOf,
  splitMarkdown,
  type Channel,
  type ChannelCaps,
  type ChannelCommand,
  type InboundEvent,
  type MessageRef,
  type ThreadRef,
} from "../core/channel.js";
import { translator, type Translate } from "../i18n.js";

const API = "https://discord.com/api/v10";
const GATEWAY = "wss://gateway.discord.gg/?v=10&encoding=json";

// GUILDS, GUILD_MESSAGES, DIRECT_MESSAGES. MESSAGE_CONTENT is 1 << 15 and it is
// privileged: Caraka never asks for it, and `readiness()` says what that costs.
const INTENTS = (1 << 0) | (1 << 9) | (1 << 12);

const PUBLIC_THREAD = 11;
// The longest window Discord offers before it archives a thread itself, in
// minutes (`docs/frd.md` FR-TOPIC-10).
const AUTO_ARCHIVE_MINUTES = 10080;
const NAME_LIMIT = 100;
const BUTTON_LABEL_LIMIT = 80;
// `docs/ui-ux.md`: one Discord message carries 2.000 characters.
const MESSAGE_LIMIT = 2000;
// Past this many pieces the answer travels as one file instead of a wall of
// messages. Three is a reading decision, not a platform limit.
const FILE_AFTER_CHUNKS = 3;
const RECONNECT_CEILING_MS = 30_000;
// Close codes Discord repeats: the credential is wrong (4004) or the identify
// is (4010-4014). No reconnect answers either, so the loop stops and the error
// is named, the way `telegram.ts` rethrows a 401.
const FATAL_CLOSE = new Set([4004, 4010, 4011, 4012, 4013, 4014]);
// How many entries each of the small maps below keeps before the oldest is
// dropped. A message older than this many sends is past editing, an interaction
// token expires in fifteen minutes, and a second pairing offer costs one card.
const REMEMBERED = 500;

export class DiscordError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

/** The slice of `WebSocket` this adapter uses, so a test can hand over its own. */
export type Socket = {
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener(type: string, handler: (event: { data?: unknown; code?: number }) => void): void;
};

export type DiscordOptions = {
  token: string;
  appId: string;
  threads?: boolean;
  fetcher?: typeof fetch;
  base?: string;
  socketFor?: (url: string) => Socket;
  t?: Translate;
  /** One audit line per reconnect, written by whoever owns the store. */
  log?: (action: string, result: string, details: Record<string, unknown>) => void;
};

type Frame = { op: number; d?: unknown; s?: number | null; t?: string | null };

type WireUser = { id: string; username?: string; bot?: boolean };

type WireMessage = {
  id: string;
  channel_id: string;
  guild_id?: string;
  content?: string;
  author?: WireUser;
  /**
   * Who the message pinged. The list of fields MESSAGE_CONTENT truncates names
   * `content`, `embeds`, `attachments`, `components` and `poll`, and does not
   * name this one — a conclusion drawn from that list, not a quotation. If the
   * conclusion is wrong the field is simply absent, `addressed` goes unset, and
   * core answers the way it does today. That dies the day someone adds `1 << 15`
   * to `INTENTS` above and starts reading `content` too.
   */
  mentions?: WireUser[];
  /**
   * What came with the message. `attachments` is named verbatim in the
   * MESSAGE_CONTENT redaction list, so in a guild channel this arrives empty and
   * an entry built from it would be a claim about a file nobody can see. Read for
   * direct messages only (AC-1.8).
   */
  attachments?: Array<{ content_type?: string; size?: number }>;
};

// The neutral word for a mime. Discord reports a mime and nothing else about
// what a file is, and core reads the word rather than the type.
function kindOf(mime: string) {
  const top = mime.split("/")[0] ?? "";
  return top === "image" || top === "audio" || top === "video" ? top : "document";
}

type WireInteraction = {
  id: string;
  token: string;
  type: number;
  channel_id?: string;
  guild_id?: string;
  channel?: { id: string; name?: string; parent_id?: string | null };
  member?: { user: WireUser };
  user?: WireUser;
  message?: { id: string; channel_id?: string };
  data?: {
    custom_id?: string;
    name?: string;
    options?: Array<{ name: string; value?: unknown }>;
  };
};

/** Discord's button rows, built from the neutral markup core already sends. */
function actionRows(markup: Record<string, unknown>, disabled = false) {
  const rows = (markup.inline_keyboard ?? []) as Array<
    Array<{ text: string; callback_data: string }>
  >;
  return rows.map((row) => ({
    type: 1,
    components: row.map((button) => ({
      type: 2,
      style: 2,
      label: button.text.slice(0, BUTTON_LABEL_LIMIT),
      // The signed payload travels whole. It is 33 characters and Discord's
      // `custom_id` holds 100, so nothing here truncates a signature.
      custom_id: button.callback_data,
      ...(disabled ? { disabled: true } : {}),
    })),
  }));
}

function threadName(name: string, fallback: string) {
  return name.replace(/\s+/g, " ").trim().slice(0, NAME_LIMIT) || fallback;
}

export class Discord implements Channel {
  readonly id = "discord";
  readonly caps: ChannelCaps;

  private readonly token: string;
  private readonly appId: string;
  private readonly fetcher: typeof fetch;
  private readonly base: string;
  private readonly socketFor: (url: string) => Socket;
  private readonly t: Translate;
  private readonly log: DiscordOptions["log"];

  private readonly inbox: InboundEvent[] = [];
  // A component interaction is answered twice: a deferred ack the moment it
  // lands, and a follow-up once core has decided. The token is what the second
  // one needs.
  private readonly interactions = new Map<string, string>();
  // Which channel a message of ours went to, and what its buttons were, so an
  // edit or a disable can find it. Core holds a message id alone.
  // ponytail: a bounded map, oldest dropped; a message older than 500 sends is
  // past editing anyway.
  private readonly sentIn = new Map<
    string,
    { channel: string; markup?: Record<string, unknown> }
  >();
  private readonly dms = new Map<string, string>();
  private readonly announced = new Set<string>();

  private socket: Socket | undefined;
  private signal: AbortSignal | undefined;
  private sessionId = "";
  private resumeUrl = "";
  private sequence: number | null = null;
  private heartbeat: NodeJS.Timeout | undefined;
  private firstBeat: NodeJS.Timeout | undefined;
  private attempt = 0;
  private stopped = false;
  private acked = true;
  private fatal: DiscordError | undefined;
  private botName = "";
  private registered = false;

  constructor(options: DiscordOptions) {
    this.token = options.token;
    this.appId = options.appId;
    this.fetcher = options.fetcher ?? fetch;
    this.base = options.base ?? API;
    this.socketFor =
      options.socketFor ?? ((url: string) => new WebSocket(url) as unknown as Socket);
    this.t = options.t ?? translator();
    this.log = options.log;
    this.caps = {
      threads: options.threads ?? true,
      buttons: true,
      edit: true,
      maxChars: MESSAGE_LIMIT,
    };
  }

  // ---- REST -------------------------------------------------------------

  private async call<T>(
    method: string,
    path: string,
    body?: unknown,
    init?: RequestInit,
  ): Promise<T> {
    const response = await fetchWithRetry({
      send: () =>
        this.fetcher(`${this.base}${path}`, {
          method,
          headers: {
            authorization: `Bot ${this.token}`,
            ...(body === undefined ? {} : { "content-type": "application/json" }),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          ...init,
        }),
      sleep: (ms) => delay(ms),
      fail: (sentence, status) => new DiscordError(sentence, status),
      unreachable: this.t("channel.unreachable", { channel: "Discord", method: path }),
      refused: this.t("channel.refused", { channel: "Discord", method: path }),
      // The header, which the shared loop reads first, and this when it is
      // missing. Both are seconds, and neither is a number written down here.
      retryAfter: async (rateLimited) =>
        ((await rateLimited.json().catch(() => ({}))) as { retry_after?: number }).retry_after,
    });
    if (response.status === 204) return undefined as T;
    return (await response.json().catch(() => undefined)) as T;
  }

  private remember(messageId: string, channel: string, markup?: Record<string, unknown>) {
    evict(this.sentIn, REMEMBERED);
    this.sentIn.set(messageId, { channel, ...(markup ? { markup } : {}) });
  }

  private channelOfMessage(chatId: string, messageId: number | string) {
    return this.sentIn.get(String(messageId))?.channel ?? containerOf(this.id, chatId);
  }

  async sendText(
    chatId: string,
    text: string,
    threadId = "",
    replyMarkup?: Record<string, unknown>,
  ): Promise<MessageRef> {
    const channel = threadId || containerOf(this.id, chatId);
    const sent = await this.call<{ id: string }>("POST", `/channels/${channel}/messages`, {
      content: text.slice(0, MESSAGE_LIMIT),
      // The one sanitiser Discord actually needs: an agent that writes
      // `@everyone` into its output pings nobody.
      allowed_mentions: { parse: [] },
      ...(replyMarkup ? { components: actionRows(replyMarkup) } : {}),
    });
    this.remember(sent.id, channel, replyMarkup);
    return { message_id: sent.id };
  }

  async sendResult(chatId: string, markdown: string, threadId = ""): Promise<MessageRef[]> {
    const channel = threadId || containerOf(this.id, chatId);
    const chunks = splitMarkdown(markdown, MESSAGE_LIMIT, this.t("channel.empty"));
    if (chunks.length > FILE_AFTER_CHUNKS) return [await this.sendFile(channel, markdown)];
    const sent: MessageRef[] = [];
    for (const chunk of chunks) sent.push(await this.sendText(chatId, chunk, threadId));
    return sent;
  }

  private async sendFile(channel: string, markdown: string): Promise<MessageRef> {
    const form = new FormData();
    form.append(
      "payload_json",
      JSON.stringify({
        content: this.t("discord.asFile"),
        allowed_mentions: { parse: [] },
        attachments: [{ id: 0, filename: "caraka-output.md" }],
      }),
    );
    form.append("files[0]", new Blob([markdown], { type: "text/markdown" }), "caraka-output.md");
    const sent = await this.call<{ id: string }>(
      "POST",
      `/channels/${channel}/messages`,
      undefined,
      { body: form },
    );
    this.remember(sent.id, channel);
    return { message_id: sent.id };
  }

  /**
   * The same multipart shape `sendFile` above uses, with the caption as the
   * message body rather than as a field of its own — Discord has no caption. It
   * is cut at the channel's own outbound ceiling for the reason Telegram's is:
   * losing the tail of a sentence is smaller than losing the picture.
   *
   * `allowed_mentions: { parse: [] }` rides along for the same reason it does
   * everywhere else in this file: text that came from an agent must not be able
   * to ping a room.
   */
  async sendImage(
    chatId: string,
    image: { bytes: Buffer; mimeType: string; name: string },
    caption = "",
    threadId = "",
  ): Promise<MessageRef> {
    const channel = threadId || containerOf(this.id, chatId);
    const form = new FormData();
    form.append(
      "payload_json",
      JSON.stringify({
        ...(caption ? { content: caption.slice(0, this.caps.maxChars) } : {}),
        allowed_mentions: { parse: [] },
        attachments: [{ id: 0, filename: image.name }],
      }),
    );
    form.append(
      "files[0]",
      new Blob([new Uint8Array(image.bytes)], { type: image.mimeType }),
      image.name,
    );
    const sent = await this.call<{ id: string }>(
      "POST",
      `/channels/${channel}/messages`,
      undefined,
      {
        body: form,
      },
    );
    this.remember(sent.id, channel);
    return { message_id: sent.id };
  }

  editText(chatId: string, messageId: number | string, text: string) {
    return this.call(
      "PATCH",
      `/channels/${this.channelOfMessage(chatId, messageId)}/messages/${messageId}`,
      { content: text.slice(-MESSAGE_LIMIT), allowed_mentions: { parse: [] } },
    );
  }

  deleteMessage(chatId: string, messageId: number | string) {
    return this.call(
      "DELETE",
      `/channels/${this.channelOfMessage(chatId, messageId)}/messages/${messageId}`,
    );
  }

  // A pressed card keeps its text and loses its buttons: the same point in the
  // callback fork where Telegram clears its keyboard.
  clearKeyboard(chatId: string, messageId: number | string) {
    const known = this.sentIn.get(String(messageId));
    return this.call(
      "PATCH",
      `/channels/${known?.channel ?? containerOf(this.id, chatId)}/messages/${messageId}`,
      { components: known?.markup ? actionRows(known.markup, true) : [] },
    );
  }

  // ---- Threads ----------------------------------------------------------

  // There is no sweep here. An archived thread still counts against Discord's
  // active limit (`docs/research/sesi-topic-thread-telegram-discord.md`), and a
  // finished session's thread is archived the moment it finishes, so a sweep
  // could only ever close a live session's thread and would buy nothing for it.
  // Running out is caught as the error `createTopic` throws (AC-5.1).
  async createTopic(chatId: string, name: string): Promise<ThreadRef> {
    const thread = await this.call<{ id: string }>(
      "POST",
      `/channels/${containerOf(this.id, chatId)}/threads`,
      {
        name: threadName(name, this.t("session.untitled")),
        type: PUBLIC_THREAD,
        auto_archive_duration: AUTO_ARCHIVE_MINUTES,
      },
    );
    return { message_thread_id: thread.id };
  }

  // The name is the only status channel a Discord thread has, so the glyph core
  // puts in front of it is the whole signal (hard rule 7).
  editTopic(_chatId: string, threadId: string, name: string) {
    return this.call("PATCH", `/channels/${threadId}`, {
      name: threadName(name, this.t("session.untitled")),
    });
  }

  finishThread(_chatId: string, threadId: string) {
    return this.call("PATCH", `/channels/${threadId}`, { archived: true });
  }

  resumeThread(_chatId: string, threadId: string) {
    return this.call("PATCH", `/channels/${threadId}`, { archived: false });
  }

  // ---- Identity, commands, interactions ---------------------------------

  async getMe() {
    const me = await this.call<{ username?: string }>("GET", "/users/@me");
    this.botName = me.username ?? "";
    return me;
  }

  async direct(principal: string) {
    const known = this.dms.get(principal);
    if (known) return routeOf(this.id, known);
    const channel = await this.call<{ id: string }>("POST", "/users/@me/channels", {
      recipient_id: principal,
    });
    this.dms.set(principal, channel.id);
    return routeOf(this.id, channel.id);
  }

  // Core registers per chat, which is what Telegram scopes by. Discord scopes
  // an application command globally, so the first call publishes the list and
  // the rest are the same list again.
  async setMyCommands(commands: ChannelCommand[], _scopeId: string) {
    if (this.registered) return undefined;
    this.registered = true;
    return this.call("PUT", `/applications/${this.appId}/commands`, [
      ...commands.map((entry) => ({
        name: entry.command,
        description: entry.description,
        type: 1,
        options: [{ type: 3, name: "argument", description: entry.description, required: false }],
      })),
      {
        name: "caraka",
        description: "Send a task to the coding agent",
        type: 1,
        options: [{ type: 3, name: "task", description: "What to do", required: true }],
      },
    ]);
  }

  // The follow-up half of an interaction: the deferred ack already went out
  // when the press arrived, so this is a message on the interaction's webhook.
  async answerCallback(id: string, text: string, _alert = false) {
    const token = this.interactions.get(id);
    if (!token) return undefined;
    this.interactions.delete(id);
    // Ephemeral for tidiness only. It carries no decision, and the card that
    // does is never sent this way (`docs/security.md` §5).
    return this.call("POST", `/webhooks/${this.appId}/${token}`, {
      content: text.slice(0, MESSAGE_LIMIT),
      flags: 64,
      allowed_mentions: { parse: [] },
    }).catch(() => undefined);
  }

  pairingText(title: string, containerId: string) {
    return this.t("discord.pairing", { title, chatId: containerOf(this.id, containerId) });
  }

  async readiness(threads: boolean) {
    if (!this.botName) await this.getMe().catch(() => undefined);
    return this.t("discord.ready", {
      topics: this.t(threads ? "discord.threadsOn" : "discord.threadsOff"),
    });
  }

  // ---- Gateway ----------------------------------------------------------

  async start(signal?: AbortSignal) {
    this.signal = signal;
    signal?.addEventListener("abort", () => this.shutdown(), { once: true });
    await this.connect(false);
  }

  private shutdown() {
    this.stopped = true;
    this.stopHeartbeat();
    this.socket?.close(1000, "caraka stopping");
    this.socket = undefined;
  }

  private connect(resume: boolean) {
    const url = resume && this.resumeUrl ? `${this.resumeUrl}/?v=10&encoding=json` : GATEWAY;
    const socket = this.socketFor(url);
    this.socket = socket;
    return new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      socket.addEventListener("open", done);
      socket.addEventListener("message", (event) => this.onFrame(String(event.data), resume));
      socket.addEventListener("close", (event) => {
        done();
        void this.onClose(typeof event.code === "number" ? event.code : 0);
      });
      socket.addEventListener("error", () => done());
    });
  }

  private send(frame: Frame) {
    try {
      this.socket?.send(JSON.stringify(frame));
    } catch {
      // A socket that refuses a frame is a socket about to close, and `close`
      // is where the reconnect lives.
    }
  }

  private beat() {
    this.send({ op: 1, d: this.sequence });
  }

  private stopHeartbeat() {
    if (this.firstBeat) clearTimeout(this.firstBeat);
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.firstBeat = undefined;
    this.heartbeat = undefined;
  }

  // Discord asks for the first beat after a random slice of the interval, so a
  // fleet that reconnects together does not beat in lockstep.
  private startHeartbeat(interval: number) {
    this.stopHeartbeat();
    this.acked = true;
    const tick = () => {
      this.acked = false;
      this.beat();
    };
    this.firstBeat = setTimeout(
      () => {
        tick();
        this.heartbeat = setInterval(() => {
          // A beat with no op 11 behind it means the socket is open and deaf,
          // which is what a sleeping laptop or an idle NAT leaves behind: TCP
          // delivers no FIN, so nothing else would ever fire `close`. The code
          // has to be something other than 1000 for the next connection to
          // resume rather than start over.
          if (!this.acked) {
            this.stopHeartbeat();
            this.socket?.close(4009, "no heartbeat ack");
            return;
          }
          tick();
        }, interval);
        this.heartbeat.unref?.();
      },
      Math.floor(interval * Math.random()),
    );
    this.firstBeat.unref?.();
  }

  private onFrame(raw: string, resuming: boolean) {
    let frame: Frame;
    try {
      frame = JSON.parse(raw) as Frame;
    } catch {
      return;
    }
    if (typeof frame.s === "number") this.sequence = frame.s;
    if (frame.op === 10) {
      const hello = frame.d as { heartbeat_interval?: number } | undefined;
      this.startHeartbeat(hello?.heartbeat_interval ?? 41_250);
      if (resuming && this.sessionId)
        this.send({
          op: 6,
          d: { token: this.token, session_id: this.sessionId, seq: this.sequence },
        });
      else
        this.send({
          op: 2,
          d: {
            token: this.token,
            intents: INTENTS,
            properties: { os: process.platform, browser: "caraka", device: "caraka" },
          },
        });
      return;
    }
    if (frame.op === 1) {
      this.beat();
      return;
    }
    // 11 acknowledges a beat. Missing it is the only evidence a half-open
    // socket ever gives.
    if (frame.op === 11) {
      this.acked = true;
      return;
    }
    // 7 asks for a reconnect that may resume; 9 says the session is gone.
    if (frame.op === 7) {
      this.socket?.close(4000, "reconnect");
      return;
    }
    if (frame.op === 9) {
      this.sessionId = "";
      this.socket?.close(4000, "invalid session");
      return;
    }
    if (frame.op === 0) this.onDispatch(frame.t ?? "", frame.d);
  }

  private async onClose(code: number) {
    this.stopHeartbeat();
    if (this.stopped || this.signal?.aborted) return;
    if (FATAL_CLOSE.has(code)) {
      // The credential or the identify is what Discord refused, so retrying
      // asks the same question again. `updates()` raises this on its next look.
      this.stopped = true;
      this.fatal = new DiscordError(this.t("discord.fatalClose", { code }));
      this.log?.("channel.stopped", "fatal", { channel: this.id, code });
      return;
    }
    this.attempt += 1;
    this.log?.("channel.reconnect", "reconnecting", {
      channel: this.id,
      attempt: this.attempt,
      resume: Boolean(this.sessionId),
    });
    // Bound to the signal, or a stopping process waits out the whole backoff:
    // `caraka start` leaves on a drained event loop, not on `process.exit`.
    await delay(Math.min(RECONNECT_CEILING_MS, 1000 * 2 ** (this.attempt - 1)), undefined, {
      signal: this.signal,
    }).catch(() => undefined);
    if (this.stopped || this.signal?.aborted) return;
    await this.connect(Boolean(this.sessionId));
  }

  private onDispatch(type: string, data: unknown) {
    if (type === "READY") {
      const ready = data as { session_id?: string; resume_gateway_url?: string };
      this.sessionId = ready.session_id ?? "";
      this.resumeUrl = ready.resume_gateway_url ?? "";
      this.attempt = 0;
      return;
    }
    if (type === "MESSAGE_CREATE") this.onMessage(data as WireMessage);
    else if (type === "INTERACTION_CREATE") void this.onInteraction(data as WireInteraction);
  }

  private emit(event: InboundEvent) {
    this.inbox.push(event);
  }

  // A container Caraka has not been paired to is announced, so the operator
  // gets the same DM card a Telegram group gets. Discord has no membership
  // event for a channel, so the first thing a member does in one stands in for
  // it — once per member, for the reason below.
  private announce(containerId: string, guildId: string, actor: WireUser, title?: string) {
    // One offer per member, not one per channel. Core drops this event when the
    // actor is not on the sender allowlist (AC-8.3), so a stranger's `/caraka`
    // in an unpaired channel must not spend the operator's only announcement.
    const seen = `${containerId}:${actor.id}`;
    if (!guildId || this.announced.has(seen)) return;
    evict(this.announced, REMEMBERED);
    this.announced.add(seen);
    this.emit({
      my_chat_member: {
        chat: {
          id: routeOf(this.id, containerId),
          type: "guild",
          title: title ?? containerId,
          is_forum: true,
        },
        from: { id: actor.id, ...(actor.username ? { username: actor.username } : {}) },
        // A bot that can see a guild channel can open a public thread in it,
        // and a bot that cannot finds out from the error the first attempt
        // throws — never from a test thread against the limit under test.
        new_chat_member: { status: "member", can_manage_topics: true },
      },
    });
  }

  private container(containerId: string, guildId?: string) {
    return {
      id: routeOf(this.id, containerId),
      type: guildId ? "guild" : "private",
      // A guild channel holds threads; a direct message does not.
      is_forum: Boolean(guildId),
    };
  }

  private onMessage(message: WireMessage) {
    if (message.author?.bot) return;
    // Without MESSAGE_CONTENT the text of an ordinary message arrives empty.
    // That is the intent Caraka did not ask for, so the message is left alone —
    // no reply, no error (`readiness()` says so out loud). `attachments` is on the
    // same redaction list, so it is read in a direct message and nowhere else: a
    // DM carrying only a file is not empty, and a guild message is never answered
    // on the strength of a field Caraka refuses to read (AC-1.8).
    const files = message.guild_id ? [] : (message.attachments ?? []);
    if (!message.content && files.length === 0) return;
    if (message.guild_id)
      this.announce(message.channel_id, message.guild_id, message.author ?? { id: "" });
    this.emit({
      message: {
        message_id: message.id,
        chat: this.container(message.channel_id, message.guild_id),
        ...(message.author ? { from: { id: message.author.id } } : {}),
        ...(message.mentions
          ? { addressed: message.mentions.some((user) => user.id === this.appId) }
          : {}),
        ...(files.length
          ? {
              attachments: files.map((file) => ({
                kind: kindOf(file.content_type ?? ""),
                ...(file.content_type ? { mime: file.content_type } : {}),
                ...(file.size === undefined ? {} : { size: file.size }),
              })),
            }
          : {}),
        // This app's own mention, cut when it opens the message, so a command
        // behind one reaches the router core already has. `<@!ID>` is the
        // deprecated nickname form and old clients still send it. Only offset 0
        // is cut; a mention further along is part of what was said.
        text: (message.content ?? "").replace(new RegExp(`^<@!?${this.appId}>\\s*`), ""),
      },
    });
  }

  private async onInteraction(interaction: WireInteraction) {
    const user = interaction.member?.user ?? interaction.user;
    if (!user) return;
    const containerId = interaction.channel_id ?? interaction.channel?.id ?? "";
    const parent = interaction.channel?.parent_id ?? "";

    if (interaction.type === 3) {
      // Only a component press gets a follow-up, so only its token is kept: an
      // application command is answered by the ack below and nothing else ever
      // asks for it again.
      evict(this.interactions, REMEMBERED);
      this.interactions.set(interaction.id, interaction.token);
      // The deferred ack goes out before core is handed the press, because
      // Discord closes the reply window in seconds and the database work behind
      // an approval is not bounded by that (`spec/discord-v05.md` K8).
      await this.ack(interaction, { type: 6 });
      this.emit({
        callback_query: {
          id: interaction.id,
          from: { id: user.id },
          ...(interaction.data?.custom_id ? { data: interaction.data.custom_id } : {}),
          message: {
            message_id: interaction.message?.id ?? "",
            chat: this.container(parent || containerId, interaction.guild_id),
            ...(parent ? { message_thread_id: containerId } : {}),
          },
        },
      });
      return;
    }
    if (interaction.type !== 2) return;
    await this.ack(interaction, {
      type: 4,
      data: { content: this.t("discord.acknowledged"), flags: 64 },
    });
    if (interaction.guild_id)
      this.announce(parent || containerId, interaction.guild_id, user, interaction.channel?.name);
    // Rebuilt as the line a person would have typed, so the command parser core
    // already has reads it without a Discord branch.
    const name = interaction.data?.name ?? "";
    const argument = String(interaction.data?.options?.[0]?.value ?? "").trim();
    const text = name === "caraka" ? argument : `/${name}${argument ? ` ${argument}` : ""}`;
    if (!text) return;
    this.emit({
      message: {
        message_id: interaction.id,
        chat: this.container(parent || containerId, interaction.guild_id),
        from: { id: user.id, ...(user.username ? { username: user.username } : {}) },
        ...(parent ? { message_thread_id: containerId } : {}),
        // A slash command is the one Discord message that provably named Caraka.
        // Letting it through as "the channel cannot tell" would spend the
        // degradation path on something already certain.
        addressed: true,
        text,
      },
    });
  }

  private ack(interaction: WireInteraction, body: Record<string, unknown>) {
    return this.call(
      "POST",
      `/interactions/${interaction.id}/${interaction.token}/callback`,
      body,
    ).catch(() => undefined);
  }

  // The push side above fills the inbox; the seam drains it as a generator,
  // which is what keeps `Gateway.run()` a single `for await` for every channel.
  updates(signal: AbortSignal) {
    return drainInbox(this.inbox, signal, () => this.fatal);
  }
}
