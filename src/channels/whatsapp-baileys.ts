/**
 * The only module in this repository that names `@whiskeysockets/baileys`, and
 * it is reached through one `await import()` from the provider branch in
 * `whatsapp.ts`. A top-level import there would load the whole Baileys tree for
 * a Cloud API install too, which is the opposite of the reason it is an optional
 * peer dependency (`spec/whatsapp-v06.md` §2).
 *
 * Nothing here has ever run against WhatsApp in CI: linking a device needs a
 * real number and a scanned code, so every line below is covered by a stand-in
 * module and by nothing else. The CHANGELOG says so out loud.
 */
import { chmod, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { evict } from "../core/channel.js";
import type { Translate } from "../i18n.js";
import {
  RECONNECT_ATTEMPTS,
  RECONNECT_BASE_MS,
  RECONNECT_CEILING_MS,
  RECONNECT_STABLE_MS,
  WhatsAppError,
  type WhatsAppTransport,
} from "./whatsapp.js";

export const BAILEYS_PACKAGE = "@whiskeysockets/baileys";
// Pinned exactly, because CI never installs it: a range would let an API change
// arrive on an operator's machine with nothing in this repository to catch it.
export const BAILEYS_VERSION = "6.7.22";

const USER_SUFFIX = "@s.whatsapp.net";
// How many of our own message keys are kept for a later edit. A message older
// than this many sends is past editing anyway.
const REMEMBERED = 500;
// What WhatsApp answers with when the linked device is gone. Neither is worth a
// retry: the session has to be linked again by hand.
const LOGGED_OUT = new Set([401, 403, 428]);

type WireKey = { id?: string; remoteJid?: string; fromMe?: boolean };

type WireMessage = {
  key?: WireKey;
  message?: { conversation?: string; extendedTextMessage?: { text?: string } };
};

type Socket = {
  ev: { on(event: string, handler: (payload: unknown) => void): void };
  sendMessage(
    jid: string,
    content: Record<string, unknown>,
  ): Promise<{ key?: WireKey } | undefined>;
  /** The eight characters an operator types on the phone. See `pair()` below. */
  requestPairingCode?(number: string): Promise<string>;
  end?(error?: Error): void;
};

type BaileysModule = {
  default?: (config: Record<string, unknown>) => Socket;
  makeWASocket?: (config: Record<string, unknown>) => Socket;
  useMultiFileAuthState: (folder: string) => Promise<{
    state: unknown;
    saveCreds: () => Promise<void>;
  }>;
};

export type BaileysOptions = {
  sessionDir: string;
  /** The number this device links as. Empty means pairing cannot be offered. */
  number?: string;
  t: Translate;
  receive: (from: string, id: string, text: string) => void;
  /** Called once when reconnecting stops. `updates()` raises what it is given. */
  giveUp: (error: Error) => void;
  random: () => number;
  sleep: (ms: number) => Promise<void>;
  now?: () => number;
  log?: (action: string, result: string, details: Record<string, unknown>) => void;
  importer?: (specifier: string) => Promise<unknown>;
};

function jidOf(to: string) {
  return to.includes("@") ? to : `${to}${USER_SUFFIX}`;
}

function numberOf(jid: string) {
  return jid.endsWith(USER_SUFFIX) ? jid.slice(0, -USER_SUFFIX.length) : jid;
}

function textOf(message: WireMessage) {
  return message.message?.conversation ?? message.message?.extendedTextMessage?.text ?? "";
}

/**
 * Link the device and hand back a transport. Everything that keeps the account
 * out of trouble — the queue, the ceiling, the gap, the first-contact refusal —
 * belongs to `whatsapp.ts` and is not repeated here.
 */
export async function connectBaileys(options: BaileysOptions): Promise<WhatsAppTransport> {
  const load = options.importer ?? ((specifier: string) => import(specifier));
  let module: BaileysModule;
  try {
    module = (await load(BAILEYS_PACKAGE)) as BaileysModule;
  } catch {
    // Not a stack trace: the one line that says what to type (AC-5.5).
    throw new WhatsAppError(
      options.t("whatsapp.baileysMissing", {
        install: `npm i ${BAILEYS_PACKAGE}@${BAILEYS_VERSION}`,
      }),
    );
  }
  const makeSocket = module.makeWASocket ?? module.default;
  if (typeof makeSocket !== "function" || typeof module.useMultiFileAuthState !== "function")
    throw new WhatsAppError(
      options.t("whatsapp.baileysMissing", {
        install: `npm i ${BAILEYS_PACKAGE}@${BAILEYS_VERSION}`,
      }),
    );

  // The auth state is the credential: whoever holds this directory holds the
  // WhatsApp session of that number (`docs/security.md` §7). 0700 is set on the
  // way in and again afterwards, because `mkdir` honours the umask.
  await mkdir(options.sessionDir, { recursive: true, mode: 0o700 });
  await chmod(options.sessionDir, 0o700);
  const { state, saveCreds } = await module.useMultiFileAuthState(options.sessionDir);
  // The directory is 0700, and `useMultiFileAuthState` writes `creds.json` and
  // the key files with a plain `writeFile`, which lands them at the umask —
  // 0644 on an ordinary machine. AC-7.1 asks for 0600, and Baileys rewrites
  // these files on every `creds.update`, so the mode is set again each time.
  const lockFiles = async () => {
    for (const entry of await readdir(options.sessionDir).catch(() => []))
      await chmod(join(options.sessionDir, entry), 0o600).catch(() => undefined);
  };
  await lockFiles();

  const now = options.now ?? Date.now;
  const keys = new Map<string, WireKey>();
  let socket: Socket | undefined;
  let attempt = 0;
  let openedAt = 0;
  let asked = false;
  let stopped = false;

  /**
   * What an unlinked device is offered. Baileys' `qr` field is the payload a QR
   * image is drawn from, and this repository has no renderer and no room for a
   * dependency that is one, so the eight-character pairing code is the flow
   * that exists here. It is a live credential for the couple of minutes it
   * lasts: it goes to stdout, never to a chat on any channel (AC-7.5).
   */
  const pair = async (sock: Socket) => {
    if (!options.number || !sock.requestPairingCode) {
      console.log(options.t("whatsapp.pairingNoNumber"));
      return;
    }
    const code = await sock.requestPairingCode(options.number).catch(() => "");
    if (code) console.log(options.t("whatsapp.pairingCode", { code }));
    else options.log?.("channel.pairing", "failed", { channel: "whatsapp" });
  };

  const open = () => {
    const next = makeSocket({ auth: state, printQRInTerminal: false, syncFullHistory: false });
    socket = next;
    asked = false;
    next.ev.on(
      "creds.update",
      () =>
        void saveCreds()
          .then(lockFiles)
          .catch(() => undefined),
    );
    next.ev.on("messages.upsert", (payload) => {
      const batch = (payload as { messages?: WireMessage[] } | undefined)?.messages ?? [];
      for (const message of batch) {
        if (message.key?.fromMe) continue;
        options.receive(
          numberOf(message.key?.remoteJid ?? ""),
          message.key?.id ?? "",
          textOf(message),
        );
      }
    });
    next.ev.on("connection.update", (payload) => {
      const update = payload as {
        connection?: string;
        qr?: string;
        lastDisconnect?: { error?: { output?: { statusCode?: number } } };
      };
      // A `qr` means this device is not linked. The payload itself is never
      // printed: it is unreadable without a renderer and it is a credential.
      if (update.qr && !asked) {
        asked = true;
        void pair(next).catch(() => undefined);
      }
      if (update.connection === "open") openedAt = now();
      if (update.connection === "close")
        void reconnect(update.lastDisconnect?.error?.output?.statusCode).catch(() => undefined);
    });
  };

  const reconnect = async (status: number | undefined) => {
    if (stopped) return;
    if (status !== undefined && LOGGED_OUT.has(status)) {
      // A logged-out session is the one close that must not be retried: the
      // reported ban pattern is repeated reconnects after exactly this.
      options.log?.("channel.stopped", "loggedout", { channel: "whatsapp", status });
      options.giveUp(new WhatsAppError(options.t("whatsapp.loggedOut")));
      return;
    }
    // A connection that opened and dropped again is not a fresh start. The
    // counter only goes back to zero once the link has held, or a flapping
    // socket resets it every cycle and reconnects forever at the base delay.
    if (openedAt && now() - openedAt >= RECONNECT_STABLE_MS) attempt = 0;
    openedAt = 0;
    attempt += 1;
    if (attempt > RECONNECT_ATTEMPTS) {
      options.log?.("channel.stopped", "gaveup", { channel: "whatsapp", attempts: attempt - 1 });
      options.giveUp(
        new WhatsAppError(options.t("whatsapp.gaveUp", { attempts: RECONNECT_ATTEMPTS })),
      );
      return;
    }
    options.log?.("channel.reconnect", "reconnecting", { channel: "whatsapp", attempt });
    // Full jitter under a ceiling ten times Discord's: a reconnect here is a
    // reported ban trigger, not merely an inconvenience.
    const ceiling = Math.min(RECONNECT_CEILING_MS, RECONNECT_BASE_MS * 2 ** (attempt - 1));
    // The sleep is bound to the run signal, so a stopping process rejects it
    // rather than waiting out the whole backoff (`discord.ts` does the same).
    // Unhandled, that rejection ends the process instead of the shutdown
    // `cli.ts` is arranging.
    await options.sleep(Math.floor(options.random() * ceiling)).catch(() => undefined);
    if (stopped) return;
    open();
  };

  const live = () => {
    if (!socket) throw new WhatsAppError(options.t("whatsapp.notStarted"));
    return socket;
  };

  const remember = (key: WireKey | undefined) => {
    const id = key?.id ?? "";
    if (!id || !key) return "";
    evict(keys, REMEMBERED);
    keys.set(id, key);
    return id;
  };

  return {
    start: async () => {
      open();
    },
    send: async (to, text) => {
      const sent = await live().sendMessage(jidOf(to), { text });
      return { id: remember(sent?.key) };
    },
    sendFile: async (to, name, body) => {
      const sent = await live().sendMessage(jidOf(to), {
        document: Buffer.from(body, "utf8"),
        mimetype: "text/markdown",
        fileName: name,
      });
      return { id: remember(sent?.key) };
    },
    edit: async (to, messageId, text) => {
      const key = keys.get(messageId);
      // Without the original key there is nothing to edit, and sending the text
      // again would be a second message, which is what the 30-second guard and
      // the outbound ceiling exist to prevent.
      if (!key) return undefined;
      return live().sendMessage(jidOf(to), { text, edit: key });
    },
    stop: () => {
      stopped = true;
      socket?.end?.();
      socket = undefined;
    },
  };
}
