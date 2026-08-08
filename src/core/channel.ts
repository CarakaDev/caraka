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

/** Identity for map keys and stored routes. Never a branch (hard rule 1). */
export type ChannelId = string;

/**
 * What a channel can do. Three fields, because three are all core has anything
 * to ask about. Their readers are wired in the caps step of
 * `plan/discord-v05.md`; declaring more would be a promise nothing checks.
 */
export type ChannelCaps = {
  /** A session can have a thread of its own. */
  threads: boolean;
  /** A card can carry a callback button. */
  buttons: boolean;
  /** Longest body the channel accepts in one message. */
  maxChars: number;
};

/** Whoever sent an event. Core reads the id, and the bot's own username once. */
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

// A name is 1–32 characters of lowercase a-z, digits, and underscores; a
// description is 1–256 characters. Telegram rejects the whole call otherwise.
export const gatewayCommands: ChannelCommand[] = [
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
   * Close a finished session's thread. Optional on purpose: Telegram's
   * `closeForumTopic` is supergroups only and `deleteForumTopic` takes the
   * transcript with it, so a Telegram session stops at the rename. A channel
   * that leaves this out is the absent half of that capability, and core marks
   * the session either way.
   */
  finishThread?(chatId: string, threadId: string): Promise<unknown>;

  answerCallback(id: string, text: string, alert?: boolean): Promise<unknown>;

  clearKeyboard(chatId: string, messageId: number | string): Promise<unknown>;

  getMe(): Promise<{ username?: string }>;

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
