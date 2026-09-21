import { test as base } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Store } from "../../src/store/db.js";
import { createScrubber } from "../../src/core/security.js";
import { WebChannel } from "../../src/channels/web.js";
import { Gateway } from "../../src/core/gateway.js";
import type { AgentDriver } from "../../src/core/driver.js";

export const test = base.extend<{
  server: { channel: WebChannel; prompts: string[]; cancellations: string[] };
}>({
  server: async ({ browserName: _browserName }, use) => {
    const home = await mkdtemp(join(tmpdir(), "caraka-browser-"));
    const scrub = createScrubber([]);
    const store = new Store(join(home, "caraka.db"), scrub);
    const config = {
      version: 1 as const,
      language: "en" as const,
      workspace: { name: "demo", path: home },
      workspaces: [{ slug: "demo", path: home }],
      web: { host: "127.0.0.1", port: 0, origin: "http://127.0.0.1", owner: "operator" },
      agent: { adapter: "claude-agent-acp" as const, adapterVersion: "0.63.0" as const },
      memory: { provider: "none" as const, endpoint: "http://127.0.0.1:8787" },
    };
    const channel = new WebChannel({
      config: { ...config.web, workspaces: config.workspaces },
      store,
      scrub,
      paths: { root: home },
      language: "en",
      version: "test",
    });
    const prompts: string[] = [];
    const cancellations: string[] = [];
    const waits = new Map<string, () => void>();
    const driver: AgentDriver = {
      start: async () => {},
      session: async (existing) => existing ?? randomUUID(),
      prompt: async (sessionId, prompt, route) => {
        prompts.push(prompt);
        if (prompt.includes("permission")) {
          const decision = await route.permission({
            sessionId,
            toolCall: { toolCallId: randomUUID(), title: "Write src/auth/login.ts", kind: "edit" },
            options: [
              { optionId: "allow", name: "Allow once", kind: "allow_once" },
              { optionId: "reject", name: "Reject", kind: "reject_once" },
            ],
          });
          await route.update({
            sessionId,
            update: {
              sessionUpdate: "agent_message_chunk",
              content: {
                type: "text",
                text:
                  decision.outcome.outcome === "selected"
                    ? `Decision: ${decision.outcome.optionId}`
                    : "Decision: cancelled",
              },
            },
          });
        } else if (prompt.includes("wait for stop")) {
          await new Promise<void>((resolve) => waits.set(sessionId, resolve));
        } else {
          const text = prompt.includes("long code")
            ? "```js\n" + "const safe = 1; ".repeat(90) + "\n```\n<img src=x onerror=alert(1)>"
            : "Task complete.";
          await route.update({
            sessionId,
            update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text } },
          });
        }
        return { stopReason: "end_turn" };
      },
      setMode: async () => {},
      cancel: async (id) => {
        cancellations.push(id);
        waits.get(id)?.();
      },
      stop: async () => {
        for (const done of waits.values()) done();
      },
    };
    const gateway = new Gateway(
      config,
      Buffer.alloc(32, 7),
      [channel],
      async () => driver,
      store,
      scrub,
      "test",
    );
    const running = gateway.run();
    while (!channel.url) await new Promise((resolve) => setTimeout(resolve, 5));
    try {
      await use({ channel, prompts, cancellations });
    } finally {
      await gateway.stop();
      await running.catch(() => {});
      await channel.close();
      await rm(home, { recursive: true, force: true });
    }
  },
});
export { expect } from "@playwright/test";
