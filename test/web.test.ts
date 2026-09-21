import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { connect } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createScrubber } from "../src/core/security.js";
import { Store } from "../src/store/db.js";
import { WebChannel, WEB_INBOX_LIMIT } from "../src/channels/web.js";
import { webCommand } from "../src/web/cli.js";
import { WEB_SUBSCRIBER_LIMIT, webServerOrigin } from "../src/web/server.js";
import { parseConfig } from "../src/config.js";
import { Gateway } from "../src/core/gateway.js";
import type { AgentDriver, DriverRoute } from "../src/core/driver.js";

async function fixture(start = true, workspaceSlug = "main") {
  const home = await mkdtemp(join(tmpdir(), "caraka-web-"));
  const store = new Store(join(home, "caraka.db"), createScrubber([]));
  const channel = new WebChannel({
    config: {
      host: "127.0.0.1",
      port: 0,
      origin: "http://127.0.0.1",
      owner: "rama",
      workspaces: [{ slug: workspaceSlug, path: home }],
    },
    store,
    scrub: createScrubber([]),
    paths: { root: home },
    language: "en",
    version: "test",
  });
  if (start) await channel.start();
  const base = channel.url;
  return { home, store, channel, base };
}

async function rawStatus(url: string, host: string) {
  return new Promise<number>((resolve, reject) => {
    const target = new URL(url);
    const socket = connect(Number(target.port), target.hostname);
    let response = "";
    socket.once("connect", () =>
      socket.end(`GET ${target.pathname} HTTP/1.1\r\nHost: ${host}\r\nConnection: close\r\n\r\n`),
    );
    socket.on("data", (chunk: Buffer) => {
      response += chunk.toString("utf8");
    });
    socket.once("end", () => resolve(Number(/^HTTP\/1\.1 (\d+)/.exec(response)?.[1] ?? 0)));
    socket.once("error", reject);
  });
}

async function post(base: string, path: string, body: unknown, cookie = "", origin = base) {
  return fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json", origin, ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

test("web pairing is one time and private routes need a device cookie", async (t) => {
  const f = await fixture();
  t.after(async () => {
    await f.channel.close();
    f.store.close();
    await rm(f.home, { recursive: true, force: true });
  });
  assert.equal((await fetch(f.base + "/api/state")).status, 401);
  const code = f.channel.createPairCode();
  const paired = await post(f.base, "/api/pair", { code, name: "Phone" });
  assert.equal(paired.status, 200);
  const cookie = paired.headers.get("set-cookie")?.split(";")[0] ?? "";
  assert.match(cookie, /^caraka_device=/);
  assert.equal((await post(f.base, "/api/pair", { code, name: "Replay" })).status, 401);
  assert.equal((await fetch(f.base + "/api/state", { headers: { cookie } })).status, 200);
});

test("web rejects a foreign Origin before a state change", async (t) => {
  const f = await fixture();
  t.after(async () => {
    await f.channel.close();
    f.store.close();
    await rm(f.home, { recursive: true, force: true });
  });
  const code = f.channel.createPairCode();
  const paired = await post(f.base, "/api/pair", { code, name: "Phone" });
  const cookie = paired.headers.get("set-cookie")?.split(";")[0] ?? "";
  assert.equal(
    (await post(f.base, "/api/stop", { roomId: "unknown" }, cookie, "https://other.invalid"))
      .status,
    403,
  );
});

test("web persists token hashes, revokes devices, and accepts each client message once", async (t) => {
  const f = await fixture();
  t.after(async () => {
    await f.channel.close();
    f.store.close();
    await rm(f.home, { recursive: true, force: true });
  });
  const code = f.channel.createPairCode();
  const paired = await post(f.base, "/api/pair", { code, name: "Phone" });
  const cookie = paired.headers.get("set-cookie")?.split(";")[0] ?? "";
  assert.equal(
    f.store.db
      .prepare("SELECT token_hash FROM web_devices")
      .get()!
      .token_hash.includes("caraka_device"),
    false,
  );
  const first = await post(
    f.base,
    "/api/messages",
    { clientId: "one", workspace: "main", text: "hello" },
    cookie,
  );
  assert.equal(first.status, 202);
  assert.equal(
    (
      await post(
        f.base,
        "/api/messages",
        { clientId: "one", workspace: "main", text: "hello" },
        cookie,
      )
    ).status,
    200,
  );
  const device = (await (await fetch(f.base + "/api/devices", { headers: { cookie } })).json())
    .devices[0];
  assert.equal(
    (
      await fetch(f.base + "/api/devices/" + device.id, {
        method: "DELETE",
        headers: { cookie, origin: f.base },
      })
    ).status,
    200,
  );
  assert.equal((await fetch(f.base + "/api/state", { headers: { cookie } })).status, 401);
});

test("web accepts bounded files and refuses unknown rooms", async (t) => {
  const f = await fixture();
  t.after(async () => {
    await f.channel.close();
    f.store.close();
    await rm(f.home, { recursive: true, force: true });
  });
  const paired = await post(f.base, "/api/pair", {
    code: f.channel.createPairCode(),
    name: "Phone",
  });
  const cookie = paired.headers.get("set-cookie")?.split(";")[0] ?? "";
  const uploaded = await fetch(f.base + "/api/files?name=note.txt", {
    method: "POST",
    headers: { cookie, origin: f.base, "content-type": "text/plain" },
    body: "hello",
  });
  assert.equal(uploaded.status, 201);
  const file = (await uploaded.json()) as { id: string };
  assert.equal((await fetch(f.base + "/api/files/" + file.id)).status, 401);
  assert.equal(
    (await fetch(f.base + "/api/files/" + file.id, { headers: { cookie } })).status,
    200,
  );
  assert.equal(
    (
      await post(
        f.base,
        "/api/messages",
        { clientId: "bad-room", roomId: "missing", text: "hello" },
        cookie,
      )
    ).status,
    404,
  );
  assert.equal((await fetch(f.base + "/")).status, 503);
});

test("web init preserves malformed existing config bytes", async (t) => {
  const home = await mkdtemp(join(tmpdir(), "caraka-web-init-"));
  const prior = process.env.CARAKA_HOME;
  process.env.CARAKA_HOME = home;
  t.after(async () => {
    if (prior === undefined) delete process.env.CARAKA_HOME;
    else process.env.CARAKA_HOME = prior;
    await rm(home, { recursive: true, force: true });
  });
  const config = join(home, "config.yaml");
  const broken = "version: [broken";
  await writeFile(config, broken);
  await assert.rejects(webCommand(["init", "--workspace", home, "--agent", "codex"]));
  assert.equal(await readFile(config, "utf8"), broken);
});

test("web init preserves an existing language without a language flag", async (t) => {
  const home = await mkdtemp(join(tmpdir(), "caraka-web-init-language-"));
  const prior = process.env.CARAKA_HOME;
  process.env.CARAKA_HOME = home;
  t.after(async () => {
    if (prior === undefined) delete process.env.CARAKA_HOME;
    else process.env.CARAKA_HOME = prior;
    await rm(home, { recursive: true, force: true });
  });
  const config = join(home, "config.yaml");
  await writeFile(
    config,
    [
      "version: 1",
      "language: id",
      "workspace: { name: existing, path: " + home + " }",
      "telegram: { botUsername: bot, allowFrom: [owner], topics: false }",
      "agent: { adapter: claude-agent-acp, adapterVersion: 0.63.0 }",
      "memory: { provider: none, endpoint: http://127.0.0.1:8787 }",
    ].join("\n"),
  );
  await webCommand(["init", "--workspace", home, "--agent", "codex"]);
  assert.equal(parseConfig(await readFile(config, "utf8")).language, "id");
});

test("web room reaches Gateway through a fake driver", async (t) => {
  const f = await fixture(false, "My Project");
  let prompted = false;
  let approved = false;
  const driver: AgentDriver = {
    start: async () => undefined,
    session: async () => "web-agent-session",
    prompt: async (_session: string, prompt: string, route: DriverRoute) => {
      prompted = prompt.includes("web task");
      const decision = await route.permission({
        sessionId: "web-agent-session",
        toolCall: { toolCallId: "web-tool", title: "Write", kind: "edit" },
        options: [
          { optionId: "allow", name: "Allow", kind: "allow_once" },
          { optionId: "reject", name: "Reject", kind: "reject_once" },
        ],
      });
      approved = decision.outcome.outcome === "selected" && decision.outcome.optionId === "allow";
      await route.update({
        sessionId: "web-agent-session",
        update: {
          sessionUpdate: "agent_message_chunk",
          content: { type: "text", text: "web result" },
        },
      });
      return { stopReason: "end_turn" };
    },
    setMode: async () => undefined,
    cancel: async () => undefined,
    stop: async () => undefined,
  };
  const config = {
    version: 1 as const,
    language: "en" as const,
    workspace: { name: "My Project", path: f.home },
    workspaces: [{ slug: "My Project", path: f.home }],
    web: { host: "127.0.0.1", port: 0, origin: "http://127.0.0.1", owner: "rama" },
    agent: { adapter: "claude-agent-acp" as const, adapterVersion: "0.63.0" as const },
    memory: { provider: "none" as const, endpoint: "http://127.0.0.1:8787" },
  };
  const gateway = new Gateway(
    config,
    Buffer.alloc(32, 4),
    [f.channel],
    async () => driver,
    f.store,
    createScrubber([]),
    "test",
  );
  const running = gateway.run();
  t.after(async () => {
    await gateway.stop();
    await running.catch(() => undefined);
    await f.channel.close();
    await rm(f.home, { recursive: true, force: true });
  });
  for (let tries = 0; !f.channel.url && tries < 20; tries += 1)
    await new Promise((resolve) => setTimeout(resolve, 5));
  const base = f.channel.url;
  const paired = await post(base, "/api/pair", {
    code: f.channel.createPairCode(),
    name: "Phone",
  });
  const cookie = paired.headers.get("set-cookie")?.split(";")[0] ?? "";
  assert.equal(
    (
      await post(
        base,
        "/api/messages",
        { clientId: "gateway", workspace: "My Project", text: "web task" },
        cookie,
      )
    ).status,
    202,
  );
  for (let tries = 0; !prompted && tries < 40; tries += 1)
    await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(prompted, true);
  let state = (await (await fetch(base + "/api/state", { headers: { cookie } })).json()) as {
    rooms: Array<{ sessionId: string | null }>;
    messages: Array<{ id: string; text: string; buttons: Array<{ id: string }> }>;
  };
  const card = state.messages.find((message) => message.buttons.length > 0);
  assert.ok(card);
  assert.equal(
    (
      await post(
        base,
        "/api/callback",
        { messageId: card.id, buttonId: card.buttons[0]?.id },
        cookie,
      )
    ).status,
    202,
  );
  for (let tries = 0; !approved && tries < 40; tries += 1)
    await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(approved, true);
  state = (await (
    await fetch(base + "/api/state", { headers: { cookie } })
  ).json()) as typeof state;
  assert.ok(state.rooms.some((room) => typeof room.sessionId === "string"));
  assert.ok(state.messages.some((message) => message.text.includes("web result")));
  const completed = state.messages.find((message) => message.id === card.id);
  assert.deepEqual(completed?.buttons, []);
  assert.equal(
    (
      await post(
        base,
        "/api/callback",
        { messageId: card.id, buttonId: card.buttons[1]?.id },
        cookie,
      )
    ).status,
    409,
  );
  assert.equal(
    f.store.db.prepare("SELECT buttons FROM web_messages WHERE id = ?").get(card.id)!.buttons,
    "[]",
  );
});

test("web bounds JSON, event subscribers, and its inbox before message storage", async (t) => {
  const f = await fixture();
  t.after(async () => {
    await f.channel.close();
    f.store.close();
    await rm(f.home, { recursive: true, force: true });
  });
  const paired = await post(f.base, "/api/pair", {
    code: f.channel.createPairCode(),
    name: "Phone",
  });
  const cookie = paired.headers.get("set-cookie")?.split(";")[0] ?? "";
  const tooLarge = await fetch(f.base + "/api/messages", {
    method: "POST",
    headers: { cookie, origin: f.base, "content-type": "application/json" },
    body: JSON.stringify({ clientId: "large", text: "x".repeat(300_000) }),
  });
  assert.equal(tooLarge.status, 413);
  const subscribers = await Promise.all(
    Array.from({ length: WEB_SUBSCRIBER_LIMIT }, () =>
      fetch(f.base + "/api/events", { headers: { cookie } }),
    ),
  );
  assert.ok(subscribers.every((response) => response.status === 200));
  assert.equal((await fetch(f.base + "/api/events", { headers: { cookie } })).status, 429);
  await Promise.all(subscribers.map((response) => response.body?.cancel()));
  const inbox = (f.channel as unknown as { inbox: unknown[] }).inbox;
  inbox.push(...Array.from({ length: WEB_INBOX_LIMIT }, () => ({})));
  const before = Number(
    f.store.db.prepare("SELECT count(*) AS total FROM web_messages").get()!.total,
  );
  const beforeRooms = Number(
    f.store.db.prepare("SELECT count(*) AS total FROM web_rooms").get()!.total,
  );
  assert.equal(
    (
      await post(
        f.base,
        "/api/messages",
        { clientId: "full", workspace: "main", text: "no queue" },
        cookie,
      )
    ).status,
    429,
  );
  assert.equal(
    Number(f.store.db.prepare("SELECT count(*) AS total FROM web_messages").get()!.total),
    before,
  );
  assert.equal(
    Number(f.store.db.prepare("SELECT count(*) AS total FROM web_rooms").get()!.total),
    beforeRooms,
  );
});

test("web sends SSE frames, validates health Host, records input attachments, and preserves devices after restart", async (t) => {
  const f = await fixture();
  t.after(async () => {
    await f.channel.close().catch(() => undefined);
    await rm(f.home, { recursive: true, force: true });
  });
  assert.equal(await rawStatus(f.base + "/health", "other.invalid"), 421);
  const paired = await post(f.base, "/api/pair", {
    code: f.channel.createPairCode(),
    name: "Phone",
  });
  const cookie = paired.headers.get("set-cookie")?.split(";")[0] ?? "";
  const events = await fetch(f.base + "/api/events", { headers: { cookie } });
  const reader = events.body!.getReader();
  assert.match(
    new TextDecoder().decode((await reader.read()).value),
    /event: ready\ndata: \{\}\n\n/,
  );
  const upload = await fetch(f.base + "/api/files?name=input.txt", {
    method: "POST",
    headers: { cookie, origin: f.base, "content-type": "text/plain" },
    body: "input",
  });
  const file = (await upload.json()) as { id: string };
  const message = await post(
    f.base,
    "/api/messages",
    { clientId: "file-input", workspace: "main", text: "read file", files: [file.id] },
    cookie,
  );
  assert.equal(message.status, 202);
  assert.match(
    new TextDecoder().decode((await reader.read()).value),
    /event: invalidate\ndata: \{\}\n\n/,
  );
  await reader.cancel();
  const state = (await (await fetch(f.base + "/api/state", { headers: { cookie } })).json()) as {
    messages: Array<{ clientId?: string; attachments: Array<{ id: string; name: string }> }>;
  };
  assert.ok(
    state.messages.some(
      (entry) => entry.attachments[0]?.id === file.id && entry.attachments[0]?.name === "input.txt",
    ),
  );
  const staleCard = await f.channel.sendText(
    "web:" + ((await message.json()) as { roomId: string }).roomId,
    "Approval",
    "",
    {
      inline_keyboard: [[{ text: "Allow", callback_data: "allow" }]],
    },
  );
  await f.channel.close();
  f.store.close();
  const store = new Store(join(f.home, "caraka.db"), createScrubber([]));
  const restarted = new WebChannel({
    config: {
      host: "127.0.0.1",
      port: 0,
      origin: "http://127.0.0.1",
      owner: "rama",
      workspaces: [{ slug: "main", path: f.home }],
    },
    store,
    scrub: createScrubber([]),
    paths: { root: f.home },
    language: "en",
    version: "test",
  });
  await restarted.start();
  const restored = (await (
    await fetch(restarted.url + "/api/state", { headers: { cookie } })
  ).json()) as { messages: Array<{ id: string; buttons: unknown[] }> };
  assert.deepEqual(
    restored.messages.find((entry) => entry.id === staleCard.message_id)?.buttons,
    [],
  );
  await restarted.close();
  store.close();
});

test("web configuration accepts a public origin with its explicit port only", () => {
  const config = parseConfig(`version: 1
workspace: { name: app, path: /tmp/app }
web: { host: 127.0.0.1, port: 7720, origin: https://example.test:8443, owner: owner }
agent: { adapter: claude-agent-acp, adapterVersion: 0.63.0 }
memory: { provider: none, endpoint: http://127.0.0.1:8787 }`);
  assert.equal(config.web?.origin, "https://example.test:8443");
  assert.equal(
    webServerOrigin("https://example.test:8443", 7720, 39211),
    "https://example.test:8443",
  );
  assert.equal(webServerOrigin("http://127.0.0.1", 0, 39211), "http://127.0.0.1:39211");
  assert.throws(() =>
    parseConfig(`version: 1
workspace: { name: app, path: /tmp/app }
web: { host: 127.0.0.1, port: 7720, origin: https://example.test/path, owner: owner }
agent: { adapter: claude-agent-acp, adapterVersion: 0.63.0 }
memory: { provider: none, endpoint: http://127.0.0.1:8787 }`),
  );
});

test("web delivers an uploaded attachment through Gateway and stops its active room", async (t) => {
  const f = await fixture(false);
  let entered = false;
  let cancelled = false;
  let delivered = false;
  let release: (() => void) | undefined;
  const driver: AgentDriver = {
    start: async () => undefined,
    session: async () => "stop-agent-session",
    prompt: async (_session: string, prompt: string) => {
      entered = true;
      delivered = prompt.includes("<lampiran");
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return { stopReason: "cancelled" };
    },
    setMode: async () => undefined,
    cancel: async () => {
      cancelled = true;
      release?.();
    },
    stop: async () => undefined,
  };
  const config = {
    version: 1 as const,
    language: "en" as const,
    workspace: { name: "main", path: f.home },
    workspaces: [{ slug: "main", path: f.home }],
    web: { host: "127.0.0.1", port: 0, origin: "http://127.0.0.1", owner: "rama" },
    agent: { adapter: "claude-agent-acp" as const, adapterVersion: "0.63.0" as const },
    memory: { provider: "none" as const, endpoint: "http://127.0.0.1:8787" },
  };
  const gateway = new Gateway(
    config,
    Buffer.alloc(32, 4),
    [f.channel],
    async () => driver,
    f.store,
    createScrubber([]),
    "test",
  );
  const running = gateway.run();
  t.after(async () => {
    await gateway.stop();
    await running.catch(() => undefined);
    await f.channel.close();
    await rm(f.home, { recursive: true, force: true });
  });
  for (let tries = 0; !f.channel.url && tries < 20; tries += 1)
    await new Promise((resolve) => setTimeout(resolve, 5));
  const base = f.channel.url;
  const paired = await post(base, "/api/pair", { code: f.channel.createPairCode(), name: "Phone" });
  const cookie = paired.headers.get("set-cookie")?.split(";")[0] ?? "";
  const uploaded = await fetch(base + "/api/files?name=input.txt", {
    method: "POST",
    headers: { cookie, origin: base, "content-type": "text/plain" },
    body: "input",
  });
  const file = (await uploaded.json()) as { id: string };
  const created = await post(
    base,
    "/api/messages",
    { clientId: "stop-file", workspace: "main", text: "read this", files: [file.id] },
    cookie,
  );
  const roomId = ((await created.json()) as { roomId: string }).roomId;
  for (let tries = 0; !entered && tries < 40; tries += 1)
    await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(delivered, true);
  assert.equal((await post(base, "/api/stop", { roomId }, cookie)).status, 202);
  for (let tries = 0; !cancelled && tries < 40; tries += 1)
    await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(cancelled, true);
});
