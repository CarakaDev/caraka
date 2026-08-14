/**
 * The channel contract, taken from what `Gateway` already consumes: the methods
 * it calls and the handful of update fields it reads. `docs/api.md` §4 sketches
 * a wider surface with `onMessage`/`onChoice`; the loop here stays an async
 * generator because `Gateway.run()` drives it in one line and a push channel
 * bridges into a generator inside its own adapter.
 *
 * Dependency direction is one-way (`AGENTS.md`), so the contract lives in
 * `src/core/` and every adapter under `src/channels/` imports it. Core never
 * imports an adapter, and never branches on which one answered.
 */
import { setTimeout as delay } from "node:timers/promises";

/** Identity for map keys and stored routes. Never a branch (hard rule 1). */
export type ChannelId = string;

/**
 * What a channel can do. Four fields, because four are all core has anything to
 * ask about, and each one has a reader in `src/core/`; declaring more would be a
 * promise nothing checks (`docs/api.md` §5).
 */
export type ChannelCaps = {
  /** A session can have a thread of its own. */
  threads: boolean;
  /** A card can carry a callback button. */
  buttons: boolean;
  /**
   * A message already sent can be rewritten. False turns the progress path off
   * altogether: the first ack still goes out, and nothing follows it until the
   * result (`spec/whatsapp-v06.md` §6).
   */
  edit: boolean;
  /** Longest body the channel accepts in one message. */
  maxChars: number;
};

/** Whoever sent an event. Core reads the id; the bot's own name is the adapter's. */
export type ChannelUser = { id: number | string; username?: string };

/**
 * The conversation an event arrived in, whether a DM or a room. `type` is read
 * against `private` and against Telegram's broadcast `channel`, the one shape
 * core refuses outright.
 */
export type ChannelContainer = {
  id: number | string;
  type: string;
  title?: string;
  /**
   * Whether this container can hold threads. The wire name survives the seam
   * because renaming it means an adapter-side translation layer, and the caps
   * step replaces the field with `caps.threads` anyway.
   */
  is_forum?: boolean;
};

/** A message on the way in. */
export type InboundMessage = {
  message_id: number | string;
  message_thread_id?: number | string;
  from?: ChannelUser;
  chat: ChannelContainer;
  text?: string;
  /**
   * Whether this message was aimed at the bot: a mention, a reply to one of the
   * bot's own messages, or a command the channel routes to it. Left unset means
   * the channel cannot tell, and core answers rather than going quiet — the
   * absent half of that capability (`AGENTS.md`, graceful degradation).
   */
  addressed?: boolean;
  /**
   * What arrived that is not text. `kind` is a neutral word — `image`,
   * `document`, `audio`, `video`, `sticker`, `location` — and never a channel's
   * own field name; `docs/design.md` already chose those words. There is no slot
   * for a file identifier: a Telegram download URL carries the bot token, so
   * whatever names the bytes stays inside the adapter that read them.
   *
   * `tooBig` is set by the adapter that knows its own download ceiling, so core
   * refuses before a byte is asked for without storing any channel's ceiling.
   */
  attachments?: Array<{ kind: string; mime?: string; size?: number; tooBig?: boolean }>;
};

/** A button press. The payload in `data` is signed; see `security.ts`. */
export type InboundCallback = {
  id: string;
  from: ChannelUser;
  message?: InboundMessage;
  data?: string;
};

/** The bot was added to a container, or thrown out of one. */
export type InboundMembership = {
  chat: ChannelContainer;
  from: ChannelUser;
  new_chat_member: { status: string; can_manage_topics?: boolean };
};

/** One event off the wire. Exactly one of the three slots is filled. */
export type InboundEvent = {
  message?: InboundMessage;
  callback_query?: InboundCallback;
  my_chat_member?: InboundMembership;
};

/** All core keeps of a message it sent: enough to edit or delete it later. */
export type MessageRef = { message_id: number | string };

/** A thread a channel opened for a session. */
export type ThreadRef = { message_thread_id: number | string };

/** One entry of the command list core asks a channel to publish. */
export type ChannelCommand = { command: string; description: string };

/**
 * A stored route carries the channel in front of the container id, so the prefix
 * comes off before anything goes on the wire and goes back on before core sees
 * one. Telegram keys a DM by the sender's own id and needs neither; Discord and
 * WhatsApp both wrote this pair out, identical but for the class around it.
 */
export function containerOf(id: ChannelId, chatId: string) {
  return chatId.startsWith(`${id}:`) ? chatId.slice(id.length + 1) : chatId;
}

export function routeOf(id: ChannelId, containerId: string) {
  return `${id}:${containerId}`;
}

// ponytail: a poll, because the alternative is a condition variable and a
// wake-up to leak; swap it if 20 ms of latency ever shows up in a run.
const POLL_MS = 20;

/**
 * The generator a push channel exposes as `updates()`: Discord and WhatsApp
 * both receive on a socket and fill an array, and this drains it in order.
 * `fatal` is read on every pass, so an error the channel decided not to retry
 * is raised here the way `telegram.ts` rethrows a 401.
 */
export async function* drainInbox(
  inbox: InboundEvent[],
  signal: AbortSignal,
  fatal: () => Error | undefined,
) {
  while (!signal.aborted) {
    const stop = fatal();
    if (stop) throw stop;
    const next = inbox.shift();
    if (next) yield next;
    else await delay(POLL_MS, undefined, { signal }).catch(() => undefined);
  }
}

// Drop the oldest entries until one more fits. Insertion order is the age. Both
// push channels keep bounded maps of what they sent, and both wrote this loop.
export function evict(
  store: { size: number; keys(): Iterator<string>; delete(key: string): unknown },
  limit: number,
) {
  while (store.size >= limit) {
    const oldest: string | undefined = store.keys().next().value;
    if (oldest === undefined) return;
    store.delete(oldest);
  }
}

/** How long to wait before the one retry a dropped request gets. */
const RETRY_PAUSE_MS = 500;

/**
 * Run `send` once more if the transport drops it. One retry, not a loop: a
 * transport that is down is not a transport that is flaky, and retrying it
 * forever only moves the hang somewhere else.
 *
 * Only a *thrown* send is retried. Every channel here answers a refusal by
 * returning it or by throwing its own error class after reading the body, so a
 * 400 never reaches this path — which is what keeps a permanent refusal from
 * being asked twice.
 *
 * It cannot tell a request that never left from one whose answer was lost, so a
 * retried write can arrive twice. The trade is written down in
 * `done/transport-goyah/spec.md`: one rare duplicate progress line against a
 * session stuck `running` and a workspace locked behind it.
 */
export async function retrySend<T>(
  send: () => Promise<T>,
  sleep: (ms: number) => Promise<unknown> = (ms) => delay(ms),
  signal?: AbortSignal,
): Promise<T> {
  try {
    return await send();
  } catch (error) {
    // A run that was cancelled aborted its own requests; trying again is work
    // on a task somebody already stopped.
    if (signal?.aborted) throw error;
    await sleep(RETRY_PAUSE_MS);
    return await send();
  }
}

/**
 * Send, wait out a 429, send again; anything else that is not ok becomes one
 * translated sentence. Discord and WhatsApp both wrote this out. There is no
 * `init` parameter and there never should be one: the request arrives as a
 * closure this function cannot see into, so the authorization header — a bot
 * token — has nothing here to leak from. A `Response` comes back rather than a
 * parsed body, because 204 is Discord's answer to a delete and WhatsApp has no
 * equivalent. Telegram is not a caller: it reports a refusal inside a 200 JSON
 * body, so nothing below would fire on it, and teaching this function that one
 * channel reports differently is the branch hard rule 1 refuses.
 */
export async function fetchWithRetry(request: {
  send: () => Promise<Response>;
  /** Injected, so a test waits out a retry without waiting. */
  sleep: (ms: number) => Promise<unknown>;
  /** The adapter's error class, and the two sentences that name its channel. */
  fail: (sentence: string, status?: number) => Error;
  unreachable: string;
  refused: string;
  /** Seconds to wait when the response carries no usable `retry-after`. */
  retryAfter?: (response: Response) => Promise<number | undefined>;
}): Promise<Response> {
  for (;;) {
    let response: Response;
    try {
      response = await retrySend(request.send, request.sleep);
    } catch {
      throw request.fail(request.unreachable);
    }
    if (response.status === 429) {
      // The wait comes off the response, never off a number written down here.
      const header = Number(response.headers.get("retry-after"));
      const seconds =
        Number.isFinite(header) && header > 0
          ? header
          : ((await request.retryAfter?.(response)) ?? 1);
      await request.sleep(Math.min(seconds, 60) * 1000);
      continue;
    }
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw request.fail(`${request.refused} ${detail}`.trim(), response.status);
    }
    return response;
  }
}

function toggledFence(line: string, openFence: string | null) {
  const match = /^\s*(```[^\r\n]*)/.exec(line);
  if (!match) return openFence;
  return openFence ? null : (match[1] ?? "```");
}

/**
 * Cut markdown into pieces no longer than `limit`, reopening a code fence that
 * a cut left hanging so no piece ever carries an odd number of them. Every
 * channel needs this and none of them needs a different one, so it sits beside
 * the contract rather than inside the first adapter that wanted it.
 */
export function splitMarkdown(input: string, limit = 3900, empty = "(Claude sent no text.)") {
  const text = input.trim() || empty;
  // A cut inside a fenced block costs the reopening marker on the next piece
  // and "\n```" on this one. The longest marker in the input decides how much
  // of the limit a hard-split line has to leave behind; 16 is the floor.
  // A hostile info string can be longer than the limit itself, so the marker a
  // cut reopens with is capped: past the cap the language hint is dropped and
  // the block reopens bare. Losing a highlight beats losing the text.
  const cap = Math.max(3, Math.floor(limit / 2) - 5);
  const longest = Math.max(
    ...(text.match(/^[^\S\n]*```[^\r\n]*/gm) ?? [""]).map((f) => f.trim().length),
  );
  const room = Math.max(1, limit - Math.max(16, Math.min(longest, cap) + 5));
  const lines: string[] = [];
  for (let line of text.match(/[^\n]*\n|[^\n]+$/g) ?? [text]) {
    while (line.length > room) {
      lines.push(line.slice(0, room));
      line = line.slice(room);
    }
    if (line) lines.push(line);
  }
  const chunks: string[] = [];
  let current = "";
  let fence: string | null = null;

  for (const line of lines) {
    // Budget the fence this line leaves behind, not the one it arrived to: a
    // line that opens a block adds a closing marker the old state knows
    // nothing about, and the piece silently overran the channel's limit.
    const closing = fence ? "\n```" : "";
    const after = toggledFence(line, fence) ? "\n```" : "";
    if (current && current.length + line.length + after.length > limit) {
      chunks.push(`${current.trimEnd()}${closing}`);
      const reopen = fence && fence.length > cap ? "```" : fence;
      current = reopen ? `${reopen}\n` : "";
    }
    current += line;
    fence = toggledFence(line, fence);
  }
  if (current) chunks.push(`${current.trimEnd()}${fence ? "\n```" : ""}`);
  return chunks;
}

// A name is 1–32 characters of lowercase a-z, digits, and underscores; a
// description is 1–256 characters. Telegram rejects the whole call otherwise.
export const gatewayCommands: ChannelCommand[] = [
  { command: "new", description: "Start a fresh session in this conversation, title optional" },
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
  { command: "close", description: "Finish this session and close its topic" },
  { command: "help", description: "Explain how to send a task" },
];

/**
 * What the gateway holds. The method names are the ones the Telegram adapter
 * already answers to, which is what makes this seam a rename rather than a
 * rewrite; the Discord adapter answers to the same names.
 */
export interface Channel {
  readonly id: ChannelId;
  readonly caps: ChannelCaps;

  /** Whatever the channel has to do before its first update. */
  start?(signal?: AbortSignal): Promise<void>;

  /**
   * Write attachment `index` of this message to `target`. Optional, the way
   * `finishThread?` and `direct?` declare a capability. The adapter downloads,
   * because a Telegram download URL carries the bot token. The argument is the
   * message object this adapter emitted, so it re-reads its own fields and no
   * file identifier crosses into core. Null means the adapter refused, and core
   * answers with one sentence.
   */
  fetchAttachment?(message: InboundMessage, index: number, target: string): Promise<string | null>;

  updates(signal: AbortSignal): AsyncGenerator<InboundEvent>;

  setMyCommands(commands: ChannelCommand[], scopeId: string): Promise<unknown>;

  sendText(
    chatId: string,
    text: string,
    threadId?: string,
    replyMarkup?: Record<string, unknown>,
  ): Promise<MessageRef>;

  sendResult(chatId: string, markdown: string, threadId?: string): Promise<MessageRef[]>;

  editText(chatId: string, messageId: number | string, text: string): Promise<unknown>;

  deleteMessage(chatId: string, messageId: number | string): Promise<unknown>;

  createTopic(chatId: string, name: string): Promise<ThreadRef>;

  editTopic(chatId: string, threadId: string, name: string): Promise<unknown>;

  /**
   * Close a finished session's thread. Optional because a channel may have no
   * such call, and because the same channel may have one in a group and none in
   * a private conversation: Telegram's `closeForumTopic` is documented for a
   * forum supergroup only, so a session whose topic lives in a DM answers with an
   * error and the call site swallows it. Nothing here ever deletes a thread: the
   * Bot API call that removes a topic takes its messages with it, and a test
   * fails on that name appearing under `src/`.
   */
  finishThread?(chatId: string, threadId: string): Promise<unknown>;

  /**
   * Reopen the thread a finished session left closed, so a session that
   * continues is writable again. Called only on the transition that closed it,
   * because a no-op is an error for a bot: `TOPIC_NOT_MODIFIED` is swallowed for
   * user accounts and answered as a 400 for bots.
   */
  resumeThread?(chatId: string, threadId: string): Promise<unknown>;

  answerCallback(id: string, text: string, alert?: boolean): Promise<unknown>;

  clearKeyboard(chatId: string, messageId: number | string): Promise<unknown>;

  /**
   * Where a private message to this principal lands. A Telegram DM is keyed by
   * the sender's own id, so Telegram leaves this out; Discord has to open the
   * channel first. Core asks and uses the answer as a chat id.
   */
  direct?(principal: string): Promise<string>;

  /**
   * What the operator is told a room will expose before it joins the allowlist.
   * The words belong to the channel: what a Discord guild member can read is
   * not what a Telegram group member can read.
   */
  pairingText(title: string, containerId: string): string;

  /**
   * What reaches the bot in a paired room and what does not. Both channels hold
   * something back — Telegram by privacy mode, Discord by the unprivileged
   * intent — and both say so in their own terms.
   */
  readiness(threads: boolean): Promise<string>;
}
