import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { Readable, Writable } from "node:stream";
import * as acp from "@agentclientprotocol/sdk";
import type { AgentDriver, AgentUpdate, DriverRoute } from "../core/driver.js";
import { translator, type Translate } from "../i18n.js";
import { lockedAdapter, resolveCommand } from "./preset.js";

/** How to spawn an ACP adapter, taken from a preset's `acp:` block. */
export type AcpSpawn = {
  command: string;
  args: string[];
  env: Record<string, string>;
  asksPermission?: boolean;
};

/**
 * The environment a spawned agent inherits, with everything Caraka named to
 * itself taken out. A prefix rather than a list of one: the token of the next
 * channel would otherwise leak through the hole the last one left open, and
 * both drivers spawn through here (`drivers/cli.ts` too), so one filter closes
 * both.
 */
export function claudeEnvironment(source: NodeJS.ProcessEnv = process.env) {
  return {
    ...Object.fromEntries(Object.entries(source).filter(([key]) => !key.startsWith("CARAKA_"))),
    // Nobody is at the terminal a run inherits. `git` does not read credentials
    // from stdin: it opens `/dev/tty`, which the stdio pipes below do not close,
    // so a clone needing a password wrote `Username for 'https://github.com':`
    // to a terminal no one reads and waited there for good (issue #15). Zero
    // turns that into `fatal: could not read Username …: terminal prompts
    // disabled` in about a second. Credential helpers still answer; only the
    // prompt is refused. Both call sites write `preset.env` after this, so a
    // preset that wants the prompt back still wins.
    GIT_TERMINAL_PROMPT: "0",
  } as NodeJS.ProcessEnv;
}

/**
 * Whether a spawned agent gets a process group of its own, and therefore
 * whether ending it signals a group or a process. One constant answers both
 * questions, in one file, because they cannot be allowed to disagree: a child
 * spawned into Caraka's own group and then signalled at `-pid` would end
 * Caraka. Windows is false on both counts — `detached` there opens a console
 * window, and there is no negative pid to signal.
 */
const ownGroup = process.platform !== "win32";

/**
 * How both routes start an agent. The group is what lets a cancel reach further
 * than the agent itself: a hung `git` is a grandchild at least
 * (`caraka → claude → bash → git`), and a signal to the agent never touched it
 * (issue #15). A new group is also a new session, so nothing under it has a
 * controlling terminal left to block on.
 */
export function spawnAgent(command: string, args: string[], env: NodeJS.ProcessEnv, cwd?: string) {
  return spawn(command, args, { cwd, env, stdio: ["pipe", "pipe", "pipe"], detached: ownGroup });
}

/**
 * The agent and everything it started, signalled together. Only a child from
 * `spawnAgent` may be passed here; that is what makes the group above the right
 * thing to signal.
 */
export function endTree(child: ChildProcessWithoutNullStreams, signal: NodeJS.Signals) {
  if (child.pid === undefined) return;
  try {
    if (ownGroup) process.kill(-child.pid, signal);
    else child.kill(signal);
  } catch {
    // A process or a group that has already gone is the outcome asked for.
  }
}

/**
 * The bytes of one image, as the content block ACP defines. The source is never a
 * URL: `claude-agent-acp` forwards an `ImageContent` whose `uri` starts with
 * `http` to the model as the image source (`acp-agent.js:5366-5373`), and a
 * Telegram download URL carries the bot token (AC-7.7).
 *
 * Only an image ever arrives here. Core decides that in `takeAttachments` with
 * `isImageAttachment`, because the mime below is rebuilt from the extension: a
 * `.pdf` in this array would be sent to the model as `image/pdf`.
 */
async function imageBlock(file: string) {
  // The extension was generated from the mime allowlist in `core/security.ts`, so
  // it maps back: `.jpg` is `image/jpeg`, and the other three name themselves.
  const extension = extname(file).slice(1).toLowerCase();
  return {
    type: "image" as const,
    mimeType: `image/${extension === "jpg" ? "jpeg" : extension}`,
    data: (await readFile(file)).toString("base64"),
  };
}

export class ClaudeAcp implements AgentDriver {
  /**
   * Whether `session/request_permission` really arrives from this agent. This
   * class spawns every preset with an `acp:` block, and most of those presets
   * are marked unverified, so the answer is the preset's to give
   * (`acp.asksPermission`) and not the class's to assume. No spawn spec means
   * the locked `claude-agent-acp` dependency, which the smoke exercises here.
   */
  readonly asksPermission: boolean;
  /**
   * Whether an image block may ride in a prompt, read off `initialize` rather
   * than assumed per adapter: one class serves every ACP preset, and only the
   * agent knows (AC-7.4). False until an answer says otherwise.
   */
  acceptsFiles = false;
  private child: ChildProcessWithoutNullStreams | undefined;
  private connection: acp.ClientConnection | undefined;
  private readonly routes = new Map<string, DriverRoute>();

  constructor(
    private readonly t: Translate = translator(),
    private readonly spawnSpec?: AcpSpawn,
  ) {
    this.asksPermission = spawnSpec ? spawnSpec.asksPermission === true : true;
  }

  async start() {
    if (this.connection) return;
    let spec = this.spawnSpec;
    if (!spec) {
      // Without a preset block the adapter is the locked dependency.
      const entry = resolveCommand(lockedAdapter);
      if (!entry) throw new Error(this.t("acp.start"));
      spec = { command: process.execPath, args: [entry], env: {} };
    }
    // Held locally so the listener below is attached in this tick.
    const child = spawnAgent(spec.command, spec.args, { ...claudeEnvironment(), ...spec.env });
    this.child = child;
    // An `"error"` event with no listener is thrown, printed, and ends the
    // process, and `spawn` defers ENOENT, EACCES, EAGAIN, EMFILE, and ENFILE to
    // exactly that event on the next tick. Read here it becomes the rejection
    // the fall to the CLI route in `cli.ts` waits on, and the race below keeps a
    // reader on it after initialize wins.
    const failed = new Promise<never>((_, reject) => child.once("error", reject));
    child.stderr.resume();
    const output = Writable.toWeb(child.stdin) as unknown as WritableStream<Uint8Array>;
    const input = Readable.toWeb(child.stdout) as unknown as ReadableStream<Uint8Array>;
    const stream = acp.ndJsonStream(output, input);
    const app = acp
      .client({ name: "caraka" })
      .onRequest(acp.methods.client.session.requestPermission, ({ params }) => {
        const route = this.routes.get(params.sessionId);
        return route ? route.permission(params) : { outcome: { outcome: "cancelled" } };
      })
      .onNotification(acp.methods.client.session.update, ({ params }) =>
        // The wire union is wider than the core type; kinds the gateway does
        // not read fall through its readers unread.
        this.routes.get(params.sessionId)?.update(params as AgentUpdate),
      );
    this.connection = app.connect(stream);
    try {
      // The answer is kept rather than dropped: it is the only place the agent
      // says whether a prompt may carry an image.
      const ready = await Promise.race([
        this.connection.agent.request(acp.methods.agent.initialize, {
          protocolVersion: acp.PROTOCOL_VERSION,
          clientCapabilities: {},
        }),
        failed,
      ]);
      this.acceptsFiles = ready.agentCapabilities?.promptCapabilities?.image === true;
    } catch {
      await this.stop();
      throw new Error(this.t("acp.start"));
    }
  }

  async session(existing: string | null, cwd: string) {
    const agent = this.connection?.agent;
    if (!agent) throw new Error(this.t("acp.notStarted"));
    if (existing) {
      try {
        await agent.request(acp.methods.agent.session.load, {
          sessionId: existing,
          cwd,
          mcpServers: [],
        });
        return existing;
      } catch {
        // A removed Claude session is replaced; the Telegram session remains usable.
      }
    }
    const created = await agent.request(acp.methods.agent.session.new, { cwd, mcpServers: [] });
    return created.sessionId;
  }

  async prompt(sessionId: string, prompt: string, route: DriverRoute, files?: string[]) {
    const agent = this.connection?.agent;
    if (!agent) throw new Error(this.t("acp.notStarted"));
    this.routes.set(sessionId, route);
    const images = this.acceptsFiles ? await Promise.all((files ?? []).map(imageBlock)) : [];
    const blocks: acp.ContentBlock[] = [...images, { type: "text", text: prompt }];
    try {
      return await agent.request(acp.methods.agent.session.prompt, {
        sessionId,
        prompt: blocks,
      });
    } finally {
      this.routes.delete(sessionId);
    }
  }

  // Only `caraka trust --bypass` reaches this, and only through a database row
  // the terminal wrote. Once the adapter takes a ceding mode it answers
  // permissions locally and stops sending `session/request_permission` at all.
  setMode(sessionId: string, modeId: string) {
    return (
      this.connection?.agent.request(acp.methods.agent.session.setMode, { sessionId, modeId }) ??
      Promise.resolve(undefined)
    );
  }

  cancel(sessionId: string) {
    return (
      this.connection?.agent.notify(acp.methods.agent.session.cancel, { sessionId }) ??
      Promise.resolve()
    );
  }

  async stop() {
    this.routes.clear();
    this.connection?.close();
    this.connection = undefined;
    // The adapter's whole tree, not the adapter: what the coding agent started
    // for a tool call is a grandchild here, and shutting down used to leave it
    // running with nothing left to end it (issue #15).
    if (this.child) endTree(this.child, "SIGTERM");
    this.child = undefined;
  }
}
