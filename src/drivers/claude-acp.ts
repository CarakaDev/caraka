import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { Readable, Writable } from "node:stream";
import { fileURLToPath } from "node:url";
import * as acp from "@agentclientprotocol/sdk";
import type {
  RequestPermissionRequest,
  RequestPermissionResponse,
  SessionNotification,
} from "@agentclientprotocol/sdk";

export type ClaudeRoute = {
  update(notification: SessionNotification): void | Promise<void>;
  permission(request: RequestPermissionRequest): Promise<RequestPermissionResponse>;
};

export function claudeEnvironment(source: NodeJS.ProcessEnv = process.env) {
  const env = { ...source };
  delete env.CARAKA_TELEGRAM_TOKEN;
  return env;
}

export class ClaudeAcp {
  private child: ChildProcessWithoutNullStreams | undefined;
  private connection: acp.ClientConnection | undefined;
  private readonly routes = new Map<string, ClaudeRoute>();

  async start() {
    if (this.connection) return;
    const adapter = fileURLToPath(
      import.meta.resolve("@agentclientprotocol/claude-agent-acp/dist/index.js"),
    );
    this.child = spawn(process.execPath, [adapter], {
      stdio: ["pipe", "pipe", "pipe"],
      env: claudeEnvironment(),
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
        this.routes.get(params.sessionId)?.update(params),
      );
    this.connection = app.connect(stream);
    try {
      await this.connection.agent.request(acp.methods.agent.initialize, {
        protocolVersion: acp.PROTOCOL_VERSION,
        clientCapabilities: {},
      });
    } catch {
      await this.stop();
      throw new Error(
        "Claude tidak dapat dimulai lewat ACP. Jalankan `claude auth login`, lalu coba lagi.",
      );
    }
  }

  async session(existing: string | null, cwd: string) {
    const agent = this.connection?.agent;
    if (!agent) throw new Error("Claude ACP belum dimulai.");
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

  async prompt(sessionId: string, prompt: string, route: ClaudeRoute) {
    const agent = this.connection?.agent;
    if (!agent) throw new Error("Claude ACP belum dimulai.");
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
