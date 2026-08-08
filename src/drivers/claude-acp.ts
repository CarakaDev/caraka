import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { Readable, Writable } from "node:stream";
import { fileURLToPath } from "node:url";
import * as acp from "@agentclientprotocol/sdk";
import type { AgentDriver, AgentUpdate, DriverRoute } from "../core/driver.js";
import { translator, type Translate } from "../i18n.js";

/** How to spawn an ACP adapter, taken from a preset's `acp:` block. */
export type AcpSpawn = { command: string; args: string[]; env: Record<string, string> };

export function claudeEnvironment(source: NodeJS.ProcessEnv = process.env) {
  const env = { ...source };
  delete env.CARAKA_TELEGRAM_TOKEN;
  return env;
}

export class ClaudeAcp implements AgentDriver {
  private child: ChildProcessWithoutNullStreams | undefined;
  private connection: acp.ClientConnection | undefined;
  private readonly routes = new Map<string, DriverRoute>();

  constructor(
    private readonly t: Translate = translator(),
    private readonly spawnSpec?: AcpSpawn,
  ) {}

  async start() {
    if (this.connection) return;
    // Without a preset block the adapter is the locked dependency, resolved the
    // way it was before presets existed.
    const spec = this.spawnSpec ?? {
      command: process.execPath,
      args: [
        fileURLToPath(import.meta.resolve("@agentclientprotocol/claude-agent-acp/dist/index.js")),
      ],
      env: {},
    };
    this.child = spawn(spec.command, spec.args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...claudeEnvironment(), ...spec.env },
    });
    this.child.stderr.resume();
    const output = Writable.toWeb(this.child.stdin) as unknown as WritableStream<Uint8Array>;
    const input = Readable.toWeb(this.child.stdout) as unknown as ReadableStream<Uint8Array>;
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
      await this.connection.agent.request(acp.methods.agent.initialize, {
        protocolVersion: acp.PROTOCOL_VERSION,
        clientCapabilities: {},
      });
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

  async prompt(sessionId: string, prompt: string, route: DriverRoute) {
    const agent = this.connection?.agent;
    if (!agent) throw new Error(this.t("acp.notStarted"));
    this.routes.set(sessionId, route);
    try {
      return await agent.request(acp.methods.agent.session.prompt, {
        sessionId,
        prompt: [{ type: "text", text: prompt }],
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
