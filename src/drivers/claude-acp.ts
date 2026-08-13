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
  return Object.fromEntries(
    Object.entries(source).filter(([key]) => !key.startsWith("CARAKA_")),
  ) as NodeJS.ProcessEnv;
}

/**
 * The bytes of one image, as the content block ACP defines. The source is never a
 * URL: `claude-agent-acp` forwards an `ImageContent` whose `uri` starts with
 * `http` to the model as the image source (`acp-agent.js:5366-5373`), and a
 * Telegram download URL carries the bot token (AC-7.7).
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
    const child = spawn(spec.command, spec.args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...claudeEnvironment(), ...spec.env },
    });
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
    if (this.child && !this.child.killed) this.child.kill("SIGTERM");
    this.child = undefined;
  }
}
