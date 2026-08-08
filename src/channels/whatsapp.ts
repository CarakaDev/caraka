/**
 * WhatsApp, the third channel on the contract two others already answer. Both
 * providers live behind one `id`: the Cloud API on plain `fetch` and a webhook,
 * Baileys on a linked device in `whatsapp-baileys.ts`. Core cannot tell them
 * apart except through `caps.edit`, which is the one thing that actually differs
 * (`spec/whatsapp-v06.md` §6).
 *
 * The ban posture shapes this file more than the protocol does. A linked device
 * is banned for behaviour, not for being a bridge, so the five mitigations in
 * `docs/security.md` T9 are code that can fail here rather than sentences in a
 * document: one outbound funnel, a rolling ceiling, jitter, a refusal to speak
 * to anyone who has not spoken first, and a start that stops without an
 * acknowledged risk.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import {
  drainInbox,
  splitMarkdown,
  type Channel,
  type ChannelCaps,
  type ChannelCommand,
  type InboundEvent,
  type MessageRef,
  type ThreadRef,
} from "../core/channel.js";
import { translator, type Translate } from "../i18n.js";

const GRAPH = "https://graph.facebook.com/v21.0";

// Every number below is `spec/whatsapp-v06.md` §7. The sourced ones name their
// source; the rest are marked spec-set there, with the reasoning beside them.

// spec-set: twelve messages per rolling minute per channel. A run sends an ack,
// sometimes a card, and a result; twelve is three times ordinary use and still
// nothing that reads as broadcasting.
export const OUTBOUND_LIMIT = 12;
export const OUTBOUND_WINDOW_MS = 60_000;
// spec-set: the reported detection signal is robotic timing, which means
// constant. A uniform gap breaks that and costs one line.
export const JITTER_MIN_MS = 1_200;
export const JITTER_MAX_MS = 3_500;
// spec-set: the Cloud API's text body limit, and an honest floor for Baileys.
export const MESSAGE_LIMIT = 4096;
// `docs/ui-ux.md` §5: at most one progress update every 30 seconds.
export const EDIT_INTERVAL_MS = 30_000;
// spec-set: reconnect is itself a reported ban trigger, so the ceiling is ten
// times Discord's and the attempts are finite.
export const RECONNECT_BASE_MS = 5_000;
export const RECONNECT_CEILING_MS = 300_000;
export const RECONNECT_ATTEMPTS = 6;
// spec-set: how long a connection has to hold before it counts as recovered.
// Without it a link that connects and drops again resets the counter on every
// cycle, the ceiling never arrives, and the six-attempt bound means nothing —
// which is the reconnect churn the bound exists to stop.
export const RECONNECT_STABLE_MS = 60_000;

// Past this many pieces the answer travels as one file (`docs/ui-ux.md` §5).
const FILE_AFTER_CHUNKS = 3;
// Nothing Meta sends is anywhere near this large, and reading a body without a
// bound is the point of sending a large one.
const WEBHOOK_BODY_LIMIT = 1 << 20;

export class WhatsAppError extends Error {}

/** Fixed-length compare, so neither the value nor its length leaks by timing. */
function sameSecret(supplied: string, expected: string) {
  return timingSafeEqual(
    createHash("sha256").update(supplied).digest(),
    createHash("sha256").update(expected).digest(),
  );
}

/**
 * What a provider has to do, and the whole of it. Everything a ban depends on —
 * the queue, the ceiling, the jitter, the first-contact refusal — sits on this
 * side of it, so a provider cannot forget any of them.
 */
export type WhatsAppTransport = {
  start?(): Promise<void>;
  send(to: string, text: string): Promise<{ id: string }>;
  sendFile?(to: string, name: string, body: string): Promise<{ id: string }>;
  /** Absent when the provider has no edit at all; `caps.edit` says so too. */
  edit?(to: string, messageId: string, text: string): Promise<unknown>;
  stop?(): void;
};

export type WhatsAppWebhook = { host: string; port: number; path: string; exposed: boolean };

export type WhatsAppOptions = {
  provider: "baileys" | "cloud-api";
  /** The numbers Caraka may write to before they have written to it (AC-8.7). */
  allowFrom: string[];
  /** The number the linked device runs as, and the only thing pairing needs. */
  number?: string;
  phoneNumberId?: string;
  token?: string;
  verifyToken?: string;
  appSecret?: string;
  sessionDir?: string;
  webhook?: WhatsAppWebhook;
  fetcher?: typeof fetch;
  base?: string;
  t?: Translate;
  /** One audit line per event, written by whoever owns the store. */
  log?: (action: string, result: string, details: Record<string, unknown>) => void;
  /** Clock, randomness, and sleep as seams, so the pacing is testable in ms. */
  now?: () => number;
  random?: () => number;
  sleep?: (ms: number) => Promise<void>;
  /** The `import()` point, so a test can stand in for an absent Baileys. */
  importer?: (specifier: string) => Promise<unknown>;
  /** A transport a test hands over instead of either provider. */
  transport?: WhatsAppTransport;
};

type CloudPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: { messages?: Array<{ from?: string; id?: string; text?: { body?: string } }> };
    }>;
  }>;
};

export class WhatsApp implements Channel {
  readonly id = "whatsapp";
  readonly caps: ChannelCaps;

  private readonly options: WhatsAppOptions;
  private readonly t: Translate;
  private readonly fetcher: typeof fetch;
  private readonly base: string;
  private readonly now: () => number;
  private readonly random: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly log: WhatsAppOptions["log"];

  private readonly allowFrom: Set<string>;
  // Who has written to this process. Not a contact list: a number WhatsApp
  // knows and this process has never heard from is still a first contact
  // (AC-8.9).
  private readonly seen = new Set<string>();
  private readonly inbox: InboundEvent[] = [];
  private readonly sends: number[] = [];
  private readonly lastEdit = new Map<string, number>();
  // One chain, so the ceiling and the gap mean something. Parallel sends would
  // make both of them decorative.
  private queue: Promise<unknown> = Promise.resolve();

  private transport: WhatsAppTransport | undefined;
  private server: Server | undefined;
  private signal: AbortSignal | undefined;
  private fatal: Error | undefined;
  private stopped = false;

  constructor(options: WhatsAppOptions) {
    this.options = options;
    this.t = options.t ?? translator();
    this.fetcher = options.fetcher ?? fetch;
    this.base = options.base ?? GRAPH;
    this.now = options.now ?? Date.now;
    this.random = options.random ?? Math.random;
    this.sleep = options.sleep ?? ((ms: number) => delay(ms, undefined, { signal: this.signal }));
    this.log = options.log;
    this.allowFrom = new Set(options.allowFrom);
    this.transport = options.transport;
    // Neither provider holds a thread and neither carries a button. Only the
    // edit differs: a linked device can rewrite its own message and the Cloud
    // API has no endpoint for it.
    this.caps = {
      threads: false,
      buttons: false,
      edit: options.provider === "baileys",
      maxChars: MESSAGE_LIMIT,
    };
  }

  // ---- routing ----------------------------------------------------------

  // A stored route carries the channel in front of the number, the way Discord
  // does. The prefix comes off before anything goes on the wire.
  private target(chatId: string) {
    return chatId.startsWith(`${this.id}:`) ? chatId.slice(this.id.length + 1) : chatId;
  }

  private route(from: string) {
    return `${this.id}:${from}`;
  }

  private wire() {
    if (!this.transport) throw new WhatsAppError(this.t("whatsapp.notStarted"));
    return this.transport;
  }

  // ---- the one way out --------------------------------------------------

  /**
   * The only write to a transport there is (AC-8.8). Three things happen in
   * order, and no caller can skip them: the rolling ceiling, the random gap,
   * and the refusal to write to someone who has never written here. Core has
   * already scrubbed whatever text arrives; this sits after that, never instead
   * of it.
   */
  private emit<T>(to: string, write: (to: string) => Promise<T>): Promise<T> {
    const next = this.queue.then(async () => {
      if (!this.seen.has(to) && !this.allowFrom.has(to)) {
        this.log?.("msg.out", "firstcontact", { channel: this.id });
        throw new WhatsAppError(this.t("whatsapp.firstContact"));
      }
      await this.pace();
      return write(to);
    });
    // The chain has to survive a rejection, or one refusal silences every send
    // behind it.
    this.queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  /** Wait out the ceiling, then the gap. Excess is queued, never dropped. */
  private async pace() {
    for (;;) {
      const now = this.now();
      const live = this.sends.filter((at) => now - at < OUTBOUND_WINDOW_MS);
      this.sends.splice(0, this.sends.length, ...live);
      const oldest = live[0];
      if (live.length < OUTBOUND_LIMIT || oldest === undefined) break;
      await this.sleep(OUTBOUND_WINDOW_MS - (now - oldest));
    }
    await this.sleep(JITTER_MIN_MS + Math.round(this.random() * (JITTER_MAX_MS - JITTER_MIN_MS)));
    this.sends.push(this.now());
  }

  // ---- the contract -----------------------------------------------------

  async sendText(chatId: string, text: string, _threadId = ""): Promise<MessageRef> {
    // ponytail: reply markup is dropped, because there is nothing to render it
    // with. Two cards core still sends with buttons — the workspace chooser and
    // `/yolo` — are dead ends here until core reads `caps.buttons` at those two
    // sites the way it reads it for approval.
    const sent = await this.emit(this.target(chatId), (to) =>
      this.wire().send(to, text.slice(0, MESSAGE_LIMIT)),
    );
    return { message_id: sent.id };
  }

  async sendResult(chatId: string, markdown: string, _threadId = ""): Promise<MessageRef[]> {
    const chunks = splitMarkdown(markdown, MESSAGE_LIMIT, this.t("channel.empty"));
    const sendFile = this.wire().sendFile;
    if (chunks.length > FILE_AFTER_CHUNKS && sendFile) {
      const sent = await this.emit(this.target(chatId), (to) =>
        sendFile(to, "caraka-output.md", markdown),
      );
      return [{ message_id: sent.id }];
    }
    const sent: MessageRef[] = [];
    for (const chunk of chunks) sent.push(await this.sendText(chatId, chunk));
    return sent;
  }

  // At most one rewrite per message every 30 seconds (`docs/ui-ux.md` §5). The
  // ones in between finish here and cost nothing on the wire.
  async editText(chatId: string, messageId: number | string, text: string) {
    const edit = this.wire().edit;
    if (!edit) return undefined;
    const key = String(messageId);
    const now = this.now();
    if (now - (this.lastEdit.get(key) ?? 0) < EDIT_INTERVAL_MS) return undefined;
    this.lastEdit.set(key, now);
    return this.emit(this.target(chatId), (to) => edit(to, key, text.slice(-MESSAGE_LIMIT)));
  }

  // Nothing is deleted and nothing is answered: WhatsApp has no ephemeral reply
  // and no card to clear, so the "working" ack stays in the transcript.
  async deleteMessage(_chatId: string, _messageId: number | string) {
    return undefined;
  }

  async answerCallback(_id: string, _text: string, _alert = false) {
    return undefined;
  }

  async clearKeyboard(_chatId: string, _messageId: number | string) {
    return undefined;
  }

  // WhatsApp publishes no command list, so core's registration is a no-op here
  // and `/help` is what tells anyone what exists.
  async setMyCommands(_commands: ChannelCommand[], _scopeId: string) {
    return undefined;
  }

  createTopic(_chatId: string, _name: string): Promise<ThreadRef> {
    return Promise.reject(new WhatsAppError(this.t("whatsapp.noThreads")));
  }

  editTopic(_chatId: string, _threadId: string, _name: string) {
    return Promise.reject(new WhatsAppError(this.t("whatsapp.noThreads")));
  }

  async getMe() {
    return { username: this.options.phoneNumberId ?? "caraka" };
  }

  // A WhatsApp direct message is keyed by the number itself.
  async direct(principal: string) {
    return this.route(principal);
  }

  // Nothing pairs a room here, because nothing but a one-to-one conversation
  // reaches `receive()`. The sentence is what an operator would need to read if
  // core ever asked, and it says why rather than describing a flow that is not
  // there.
  pairingText(_title: string, _containerId: string) {
    return this.t("whatsapp.noGroups");
  }

  async readiness(_threads: boolean) {
    return this.t("whatsapp.ready");
  }

  // A logged-out session and a reconnect that gave up both reach the operator
  // as the error `drainInbox` raises out of here.
  updates(signal: AbortSignal) {
    return drainInbox(this.inbox, signal, () => this.fatal);
  }

  // ---- lifecycle --------------------------------------------------------

  async start(signal?: AbortSignal) {
    this.signal = signal;
    signal?.addEventListener("abort", () => this.shutdown(), { once: true });
    if (!this.transport)
      this.transport = this.options.provider === "baileys" ? await this.linkDevice() : this.cloud();
    await this.transport.start?.();
    // AC-6.1: the linked device opens no listener at all. Its socket is
    // outbound, like Telegram's long polling.
    if (this.options.provider === "cloud-api") await this.listen();
  }

  private shutdown() {
    this.stopped = true;
    this.transport?.stop?.();
    this.server?.close();
    this.server = undefined;
  }

  private async linkDevice() {
    const { connectBaileys } = await import("./whatsapp-baileys.js");
    return connectBaileys({
      sessionDir: this.options.sessionDir ?? "",
      number: this.options.number ?? "",
      t: this.t,
      receive: (from, id, text) => this.receive(from, id, text),
      giveUp: (error) => {
        this.fatal = error;
      },
      random: this.random,
      sleep: this.sleep,
      now: this.now,
      ...(this.log ? { log: this.log } : {}),
      ...(this.options.importer ? { importer: this.options.importer } : {}),
    });
  }

  /**
   * The inbound half of the transport seam: a provider hands a message in here
   * and nowhere else. It is also where the first-contact rule gets its facts —
   * the sender is remembered because this process heard from them, never
   * because WhatsApp lists them as a contact (AC-8.9).
   */
  receive(from: string, id: string, text: string) {
    if (this.stopped) return;
    // The three parameter types are a promise the wire cannot keep. Both
    // providers hand over whatever a JSON payload held, and JSON holds a number
    // or an object wherever this signature says string. A number in `from`
    // reached `includes` below and left the process on an unhandled rejection
    // out of the POST handler; a number in `text` reached core's `trim` and
    // stopped the channel. The check sits here because this is the one door
    // both providers come through.
    if (typeof from !== "string" || typeof id !== "string" || typeof text !== "string") {
      this.log?.("msg.reject", "malformed", { channel: this.id });
      return;
    }
    if (!from || !text) return;
    // A one-to-one conversation and nothing else. Baileys hands the container's
    // own jid over as the sender, so a group (`…@g.us`), a broadcast, and a
    // newsletter all arrive as one principal that is not a person: every member
    // would drive the agent as that principal and read the approval code off
    // the card. A user jid loses its suffix upstream and a Cloud API number
    // never had one, so what is left holding an `@` is exactly what is refused.
    if (from.includes("@")) {
      this.log?.("msg.reject", "notprivate", { channel: this.id });
      return;
    }
    this.seen.add(from);
    this.inbox.push({
      message: {
        message_id: id,
        chat: { id: this.route(from), type: "private" },
        from: { id: from },
        text,
      },
    });
  }

  // ---- Cloud API --------------------------------------------------------

  private async graph<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
    for (;;) {
      let response: Response;
      try {
        response = await this.fetcher(`${this.base}${path}`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${this.options.token ?? ""}`,
            ...(body === undefined ? {} : { "content-type": "application/json" }),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          ...init,
        });
      } catch {
        throw new WhatsAppError(
          this.t("channel.unreachable", { channel: "WhatsApp", method: path }),
        );
      }
      if (response.status === 429) {
        // The wait comes off the response, never off a number written here.
        const header = Number(response.headers.get("retry-after"));
        await this.sleep(Math.min(Number.isFinite(header) && header > 0 ? header : 1, 60) * 1000);
        continue;
      }
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new WhatsAppError(
          `${this.t("channel.refused", { channel: "WhatsApp", method: path })} ${detail}`.trim(),
        );
      }
      return (await response.json().catch(() => undefined)) as T;
    }
  }

  private cloud(): WhatsAppTransport {
    const phone = this.options.phoneNumberId ?? "";
    const post = async (body: Record<string, unknown>) => {
      const sent = await this.graph<{ messages?: Array<{ id?: string }> }>(`/${phone}/messages`, {
        messaging_product: "whatsapp",
        ...body,
      });
      return { id: sent?.messages?.[0]?.id ?? "" };
    };
    return {
      send: (to, text) => post({ to, type: "text", text: { body: text, preview_url: false } }),
      sendFile: async (to, name, body) => {
        const form = new FormData();
        form.append("messaging_product", "whatsapp");
        form.append("type", "text/markdown");
        form.append("file", new Blob([body], { type: "text/markdown" }), name);
        const media = await this.graph<{ id?: string }>(`/${phone}/media`, undefined, {
          body: form,
        });
        return post({
          to,
          type: "document",
          document: { id: media?.id ?? "", filename: name, caption: this.t("whatsapp.asFile") },
        });
      },
      // No edit endpoint exists, and `caps.edit` already says so, so core never
      // asks. Leaving the method off is the honest shape.
    };
  }

  // ---- webhook ----------------------------------------------------------

  private async listen() {
    const bind = this.options.webhook;
    if (!bind) return;
    // Both go out before the socket can accept anything, the order
    // `caraka dashboard` set in v0.5 (`docs/security.md` §8).
    this.log?.("webhook.start", bind.exposed ? "exposed" : "loopback", {
      channel: this.id,
      host: bind.host,
      port: bind.port,
    });
    if (bind.exposed)
      console.log(this.t("whatsapp.webhookExposed", { host: bind.host, port: bind.port }));
    const server = createServer((request, response) => this.onRequest(request, response));
    this.server = server;
    await new Promise<void>((ready, failed) => {
      server.once("error", failed);
      server.listen(bind.port, bind.host, ready);
    });
  }

  /** The listener, for a test that wants its port. Undefined until it listens. */
  get listener() {
    return this.server;
  }

  private end(response: ServerResponse, status: number, body = "") {
    response.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
    response.end(body);
  }

  private onRequest(request: IncomingMessage, response: ServerResponse) {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    // One path, two methods, and no file server behind either of them.
    if (url.pathname !== this.options.webhook?.path) return this.end(response, 404);
    if (request.method === "GET") return this.handshake(url, response);
    if (request.method !== "POST") return this.end(response, 404);
    void this.onPost(request, response);
  }

  private handshake(url: URL, response: ServerResponse) {
    const supplied = url.searchParams.get("hub.verify_token") ?? "";
    if (
      url.searchParams.get("hub.mode") !== "subscribe" ||
      !sameSecret(supplied, this.options.verifyToken ?? "")
    )
      return this.end(response, 403);
    return this.end(response, 200, url.searchParams.get("hub.challenge") ?? "");
  }

  private async onPost(request: IncomingMessage, response: ServerResponse) {
    const raw = await this.readBody(request, response);
    if (raw === null) return;
    if (!this.verify(request.headers["x-hub-signature-256"], raw)) {
      // 403 and nothing else. Loopback is not a trust boundary either: any
      // other process on this machine can knock as easily as Meta can.
      this.log?.("webhook.reject", "unsigned", { channel: this.id });
      return this.end(response, 403);
    }
    this.end(response, 200);
    this.ingest(raw);
  }

  private readBody(request: IncomingMessage, response: ServerResponse) {
    return new Promise<string | null>((done) => {
      const parts: Buffer[] = [];
      let size = 0;
      let refused = false;
      request.on("data", (chunk: Buffer) => {
        if (refused) return;
        size += chunk.length;
        if (size > WEBHOOK_BODY_LIMIT) {
          refused = true;
          this.end(response, 413);
          request.destroy();
          done(null);
          return;
        }
        parts.push(chunk);
      });
      request.on("end", () => {
        if (!refused) done(Buffer.concat(parts).toString("utf8"));
      });
      request.on("error", () => done(null));
    });
  }

  private verify(header: string | string[] | undefined, raw: string) {
    const supplied = Array.isArray(header) ? header[0] : header;
    const secret = this.options.appSecret ?? "";
    if (!supplied?.startsWith("sha256=") || !secret) return false;
    return sameSecret(supplied.slice(7), createHmac("sha256", secret).update(raw).digest("hex"));
  }

  private ingest(raw: string) {
    let body: CloudPayload;
    try {
      body = (JSON.parse(raw) ?? {}) as CloudPayload;
    } catch {
      return;
    }
    // `null` is valid JSON, in the body and in every slot the type below
    // declares as an object, and it is the one value a shape check cannot see
    // coming. The `??` above and the optional chaining here are what stand
    // between a signed one and a read on nothing.
    for (const entry of body.entry ?? [])
      for (const change of entry?.changes ?? [])
        for (const message of change?.value?.messages ?? [])
          this.receive(message?.from ?? "", message?.id ?? "", message?.text?.body ?? "");
  }
}
