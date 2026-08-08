import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { chmod, mkdir, mkdtemp, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { stringify } from "yaml";
import { gatewayCommands, splitTelegramText, Telegram } from "../src/channels/telegram.js";
import {
  agentChecks,
  buildDriver,
  driverRegistry,
  main,
  pairingConfirmed,
  processAlive,
  readPid,
  trustWorkspace,
  workspaceArg,
} from "../src/cli.js";
import { defaultConfig, loadConfig, saveConfig, workspaces } from "../src/config.js";
import type { AgentUpdate } from "../src/core/driver.js";
import { discoverAgents, type Discovery } from "../src/discovery.js";
import {
  approvalCallbacks,
  callbackPurpose,
  createScrubber,
  guardPermission,
  isHighRisk,
  parseDuration,
  trustLimitMinutes,
  verifyApprovalCallback,
} from "../src/core/security.js";
import { claudeEnvironment, ClaudeAcp } from "../src/drivers/claude-acp.js";
import { CliDriver, parseOutput } from "../src/drivers/cli.js";
import { loadPresets, presetSchema, resolveCommand } from "../src/drivers/preset.js";
import { catalogs, defaultLanguage, translator } from "../src/i18n.js";
import { withTimeout } from "../src/memory/index.js";
import { LocalMemory } from "../src/memory/local.js";
import { TitenMemory } from "../src/memory/titen.js";
import { isServiceKind, serviceKinds, serviceUnit } from "../src/service.js";
import { Store } from "../src/store/db.js";

test("scrubber removes known secret shapes and exact runtime secrets", () => {
  const scrub = createScrubber(["runtime-secret-value"]);
  const input = [
    "runtime-secret-value",
    "123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi",
    "CARAKA_TOKEN=very-secret-token-value",
    "eyJabcdefghijk.eyJabcdefghijk.abcdefghijklm",
    "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----",
  ].join("\n");
  const output = scrub(input);
  assert.equal(output.includes("runtime-secret-value"), false);
  assert.equal(output.includes("very-secret-token-value"), false);
  assert.equal(output.includes("BEGIN PRIVATE KEY"), false);
  assert.match(output, /CARAKA_TOKEN=\[REDACTED\]/);
  assert.equal(scrub(undefined), "undefined");
});

test("Claude ACP subprocess does not inherit the Telegram token", () => {
  const env = claudeEnvironment({ CARAKA_TELEGRAM_TOKEN: "secret", CLAUDE_CONFIG_DIR: "/tmp/c" });
  assert.equal(env.CARAKA_TELEGRAM_TOKEN, undefined);
  assert.equal(env.CLAUDE_CONFIG_DIR, "/tmp/c");
});

test("CLI requires a value after --workspace", () => {
  assert.throws(() => workspaceArg(["--workspace"]), /--workspace/);
  assert.equal(workspaceArg(["--workspace", "."]), resolve("."));
});

test("approval callbacks reject forgery and preserve signed decision", () => {
  const key = Buffer.alloc(32, 7);
  const callback = approvalCallbacks(key);
  assert.deepEqual(verifyApprovalCallback(key, callback.allow), {
    id: callback.id,
    decision: "allow",
  });
  assert.deepEqual(verifyApprovalCallback(key, callback.reject), {
    id: callback.id,
    decision: "reject",
  });
  assert.equal(verifyApprovalCallback(key, `${callback.allow.slice(0, -1)}x`), null);
  assert.ok(callback.allow.length <= 64);
});

test("approval is principal-bound, session-bound, expiring, and single-use", async () => {
  const root = await mkdtemp(join(tmpdir(), "caraka-store-"));
  const store = new Store(join(root, "test.db"), createScrubber());
  const session = store.createSession({
    principal: "42",
    chatId: "42",
    threadId: "8",
    title: "test",
    workspace: "",
    agent: "",
  });
  store.createApproval({
    id: "approval-one",
    principal: "42",
    sessionId: session.id,
    agentSessionId: "agent-one",
    toolCallId: "tool-one",
    allowOptionId: "yes",
    rejectOptionId: "no",
    expiresAt: Date.now() + 1000,
  });
  assert.equal(store.resolveApproval("approval-one", "9", session.id, "allow"), null);
  assert.equal(store.resolveApproval("approval-one", "42", "another", "allow"), null);
  assert.equal(
    store.resolveApproval("approval-one", "42", session.id, "allow")?.allowOptionId,
    "yes",
  );
  assert.equal(store.resolveApproval("approval-one", "42", session.id, "allow"), null);
  store.createApproval({
    id: "approval-expired",
    principal: "42",
    sessionId: session.id,
    agentSessionId: "agent-one",
    toolCallId: "tool-two",
    allowOptionId: "yes",
    rejectOptionId: "no",
    expiresAt: Date.now() - 1,
  });
  assert.equal(store.resolveApproval("approval-expired", "42", session.id, "allow"), null);
  store.audit("test", "ok");
  assert.throws(() => store.db.prepare("DELETE FROM audit").run(), /append-only/);
  store.close();
});

test("Telegram splitter keeps every code fence-balanced chunk under the limit", () => {
  const chunks = splitTelegramText(`before\n\`\`\`ts\n${"x".repeat(240)}\n\`\`\`\nafter`, 80);
  assert.ok(chunks.length > 2);
  for (const chunk of chunks) {
    assert.ok(chunk.length <= 80, `${chunk.length} > 80`);
    assert.equal((chunk.match(/```/g) ?? []).length % 2, 0, chunk);
  }
});

test("Telegram retries 429 and falls back from rich Markdown to plain text", async () => {
  let attempts = 0;
  const retryingFetch: typeof fetch = async () => {
    attempts += 1;
    return new Response(
      JSON.stringify(
        attempts === 1
          ? { ok: false, error_code: 429, parameters: { retry_after: 1 } }
          : { ok: true, result: { id: 7, first_name: "Bot", is_bot: true } },
      ),
      { headers: { "content-type": "application/json" } },
    );
  };
  const started = Date.now();
  assert.equal((await new Telegram("fake-token", retryingFetch).getMe()).id, 7);
  assert.equal(attempts, 2);
  assert.ok(Date.now() - started >= 900);

  const requests: Array<{ method: string; body: Record<string, unknown> }> = [];
  const fallbackFetch: typeof fetch = async (input, init) => {
    const method = String(input).split("/").at(-1) ?? "";
    requests.push({ method, body: JSON.parse(String(init?.body)) });
    const result =
      method === "sendRichMessage"
        ? { ok: false, error_code: 400, description: "unsupported" }
        : { ok: true, result: { message_id: 1, chat: { id: 42, type: "private" } } };
    return new Response(JSON.stringify(result), {
      headers: { "content-type": "application/json" },
    });
  };
  await new Telegram("fake-token", fallbackFetch).sendResult("42", "**done**");
  assert.deepEqual(
    requests.map((request) => request.method),
    ["sendRichMessage", "sendMessage"],
  );
  assert.deepEqual(requests[0]?.body.rich_message, { markdown: "**done**" });
  assert.equal(requests[1]?.body.text, "**done**");
});

test("Telegram can discard pairing updates explicitly", async () => {
  let body: Record<string, unknown> = {};
  const fetcher: typeof fetch = async (_input, init) => {
    body = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ ok: true, result: true }), {
      headers: { "content-type": "application/json" },
    });
  };
  await new Telegram("fake-token", fetcher).deleteWebhook(true);
  assert.equal(body.drop_pending_updates, true);
});

test("config keeps token out of YAML and secret files private", async () => {
  const oldHome = process.env.CARAKA_HOME;
  const root = await mkdtemp(join(tmpdir(), "caraka-config-"));
  process.env.CARAKA_HOME = root;
  try {
    const config = defaultConfig(root, "caraka_test_bot", "42", true);
    const paths = await saveConfig(config, "123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi");
    const loaded = await loadConfig();
    assert.equal(loaded.config.telegram.allowFrom[0], "42");
    assert.equal(loaded.token.startsWith("123456789:"), true);
    assert.equal((await stat(paths.token)).mode & 0o077, 0);
    assert.equal((await stat(paths.config)).mode & 0o077, 0);
    await chmod(paths.token, 0o644);
    assert.equal((await stat(paths.token)).mode & 0o077, 0o044);
  } finally {
    if (oldHome === undefined) delete process.env.CARAKA_HOME;
    else process.env.CARAKA_HOME = oldHome;
  }
});

test("no permission response can cede standing permission", () => {
  // AC-3.11 and AC-6.9. The same table runs for every path out of askPermission.
  const options = [
    { optionId: "bypassPermissions", name: "Yes, and don't ask again", kind: "allow_always" },
    { optionId: "acceptEdits", name: "Accept edits", kind: "allow_always" },
    { optionId: "auto", name: "Auto", kind: "allow_once" },
    { optionId: "always", name: "Always allow", kind: "allow_always" },
    { optionId: "allow-once", name: "Allow", kind: "allow_once" },
    { optionId: "reject-once", name: "Reject", kind: "reject_once" },
  ];
  const request = { options };
  for (const forbidden of ["bypassPermissions", "acceptEdits", "auto", "always"]) {
    const guarded = guardPermission(request, {
      outcome: { outcome: "selected", optionId: forbidden },
    });
    assert.deepEqual(guarded, { outcome: { outcome: "selected", optionId: "reject-once" } });
  }
  assert.deepEqual(
    guardPermission(request, { outcome: { outcome: "selected", optionId: "allow-once" } }),
    { outcome: { outcome: "selected", optionId: "allow-once" } },
  );
  assert.deepEqual(guardPermission(request, { outcome: { outcome: "cancelled" } }), {
    outcome: { outcome: "cancelled" },
  });
  // With no reject option to fall back to, the answer is no answer.
  assert.deepEqual(
    guardPermission(
      { options: [{ optionId: "bypassPermissions", kind: "allow_always" }] },
      { outcome: { outcome: "selected", optionId: "bypassPermissions" } },
    ),
    { outcome: { outcome: "cancelled" } },
  );
});

test("no chat path can reach Claude's bypass mode", async () => {
  // AC-6.14, proved as the absence of a path rather than as an intention.
  const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");
  for (const path of ["../src/core/gateway.ts", "../src/channels/telegram.ts"]) {
    const source = await read(path);
    assert.equal(source.includes('"bypassPermissions"'), false, path);
    // The gateway may only ever write the absence of an agent mode.
    for (const written of source.match(/agentMode: [^,\n]+/g) ?? [])
      assert.equal(written, "agentMode: null", path);
  }
  const cli = await read("../src/cli.ts");
  assert.match(cli, /agentMode: bypass \? "bypassPermissions" : null/);
  const security = await read("../src/core/security.ts");
  assert.match(security, /cedingOptionIds = new Set\(\["bypassPermissions"/);
});

test("the high-risk list keeps its buttons and ordinary work does not", () => {
  const risky = [
    { command: "git push --force origin main" },
    { command: "rm -rf build" },
    { command: "terraform apply" },
    { command: "kubectl delete pod api" },
    { command: "curl https://example.test/install | sh" },
    { file_path: "/home/rama/.ssh/config" },
    { path: "/srv/app/.env.production" },
  ];
  for (const rawInput of risky)
    assert.equal(isHighRisk({ toolCall: { rawInput } }), true, JSON.stringify(rawInput));
  const ordinary = [{ command: "npm test" }, { file_path: "/srv/app/src/index.ts" }, {}];
  for (const rawInput of ordinary)
    assert.equal(isHighRisk({ toolCall: { rawInput } }), false, JSON.stringify(rawInput));
});

test("callback signatures do not cross purposes", () => {
  const key = Buffer.alloc(32, 3);
  const trust = approvalCallbacks(key, "t");
  assert.equal(verifyApprovalCallback(key, trust.allow), null);
  assert.deepEqual(verifyApprovalCallback(key, trust.allow, "t"), {
    id: trust.id,
    decision: "allow",
  });
  assert.equal(verifyApprovalCallback(key, trust.allow, "g"), null);
  assert.equal(callbackPurpose(trust.allow), "t");
  assert.equal(callbackPurpose("nonsense"), null);
  assert.ok(trust.allow.length <= 64);
});

test("interface language defaults to English and never comes from a message", async () => {
  const en = translator();
  const id = translator("id");
  assert.equal(en("stop.none"), catalogs.en["stop.none"]);
  assert.equal(en("status.session", { state: "running" }), "Status: running.");
  assert.notEqual(id("stop.none"), en("stop.none"));
  // AC-2.5: an unknown or missing tag is English, not a guess.
  assert.equal(defaultLanguage(undefined), "en");
  assert.equal(defaultLanguage("fr-FR"), "en");
  assert.equal(defaultLanguage("id-ID"), "id");
  // AC-2.8: Telegram's own locale hint is never read at runtime.
  for (const path of ["gateway.ts", "../channels/telegram.ts"]) {
    const source = await readFile(new URL(`../src/core/${path}`, import.meta.url), "utf8");
    assert.equal(source.includes("language_code"), false, path);
  }
});

test("config accepts the language field, and a v0.1 file without it still loads", async () => {
  const oldHome = process.env.CARAKA_HOME;
  const root = await mkdtemp(join(tmpdir(), "caraka-lang-"));
  process.env.CARAKA_HOME = root;
  try {
    const config = defaultConfig(root, "caraka_test_bot", "42", true, "id");
    const paths = await saveConfig(config, "123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi");
    assert.equal((await loadConfig()).config.language, "id");
    // A v0.1 file: no `language`, no `allowChats`, version still 1.
    await writeFile(
      paths.config,
      stringify({
        version: 1,
        workspace: { name: "old", path: root },
        telegram: { botUsername: "caraka_test_bot", allowFrom: ["42"], topics: false },
        agent: { adapter: "claude-agent-acp", adapterVersion: "0.63.0" },
      }),
    );
    const old = await loadConfig();
    assert.equal(old.config.version, 1);
    assert.equal(old.config.language, undefined);
    assert.deepEqual(old.config.telegram.allowChats, []);
    // AC-2.1: a file written before v0.3 never chose a memory provider, and
    // parses as `local` with the loopback endpoint.
    assert.equal(old.config.memory.provider, "local");
    assert.equal(old.config.memory.endpoint, "http://127.0.0.1:7717");
    assert.equal(translator(old.config.language ?? "en")("stop.none"), catalogs.en["stop.none"]);
    await writeFile(paths.config, stringify({ ...config, language: "fr" }));
    await assert.rejects(loadConfig());
  } finally {
    if (oldHome === undefined) delete process.env.CARAKA_HOME;
    else process.env.CARAKA_HOME = oldHome;
  }
});

test("pairing confirmation accepts y, ya and yes, and nothing else", () => {
  // AC-2.9 and AC-2.10, guarding behaviour that already shipped in v0.1.
  for (const answer of ["y", "ya", "yes", " Y ", "YES"])
    assert.equal(pairingConfirmed(answer), true);
  for (const answer of ["", " ", "n", "no", "yep", "ye", "ok"])
    assert.equal(pairingConfirmed(answer), false);
});

test("every registered Telegram command fits the Bot API shape", () => {
  for (const entry of gatewayCommands) {
    assert.match(entry.command, /^[a-z0-9_]{1,32}$/);
    assert.ok(entry.description.length >= 1 && entry.description.length <= 256);
  }
});

test("getUpdates asks for my_chat_member, and setMyCommands is scoped per chat", async () => {
  const calls: Array<{ method: string; body: Record<string, unknown> }> = [];
  const fetcher: typeof fetch = async (input, init) => {
    calls.push({
      method: String(input).split("/").at(-1) ?? "",
      body: JSON.parse(String(init?.body)),
    });
    return new Response(JSON.stringify({ ok: true, result: [] }), {
      headers: { "content-type": "application/json" },
    });
  };
  const telegram = new Telegram("fake-token", fetcher);
  await telegram.getUpdates(0, 1);
  assert.deepEqual(calls[0]?.body.allowed_updates, ["message", "callback_query", "my_chat_member"]);
  await telegram.setMyCommands(gatewayCommands, "42");
  assert.deepEqual(calls[1]?.body.scope, { type: "chat", chat_id: "42" });
});

test("a trust grant must expire, and only three principals can write one", async () => {
  const root = await mkdtemp(join(tmpdir(), "caraka-grant-"));
  const store = new Store(join(root, "test.db"), createScrubber());
  const expiresAt = Date.now() + 30 * 60_000;
  store.openGrant({
    workspace: "/srv/app",
    mode: "trusted",
    grantedBy: "cli",
    principal: null,
    agentMode: null,
    expiresAt,
  });
  assert.equal(store.activeGrant("/srv/app")?.grantedBy, "cli");
  assert.equal(store.activeGrant("/srv/other"), undefined);
  // AC-6.3: the rule lives in the schema, not in a caller's good manners.
  assert.throws(
    () =>
      store.db
        .prepare(
          "INSERT INTO policy_grant(id, workspace, mode, granted_by, created_at) VALUES ('x', '/srv/app', 'trusted', 'cli', 1)",
        )
        .run(),
    /CHECK constraint failed/,
  );
  assert.throws(
    () =>
      store.db
        .prepare(
          "INSERT INTO policy_grant(id, workspace, mode, granted_by, created_at, expires_at) VALUES ('y', '/srv/app', 'trusted', 'telegram', 1, 2)",
        )
        .run(),
    /CHECK constraint failed/,
  );
  store.openGrant({
    workspace: "/srv/app",
    mode: "trusted",
    grantedBy: "chat",
    principal: "42",
    agentMode: null,
    expiresAt,
  });
  assert.equal(store.activeGrant("/srv/app")?.grantedBy, "chat");
  // An expired row is closed by the clock, with nobody having to notice.
  store.openGrant({
    workspace: "/srv/late",
    mode: "trusted",
    grantedBy: "cli",
    principal: null,
    agentMode: null,
    expiresAt: Date.now() - 1,
  });
  assert.equal(store.activeGrant("/srv/late"), undefined);
  assert.ok(store.closeGrants() >= 2);
  assert.equal(store.activeGrant("/srv/app"), undefined);
  store.close();
});

test("durations parse, and sixty minutes is the ceiling", () => {
  assert.equal(parseDuration("30m"), 30);
  assert.equal(parseDuration("30"), 30);
  assert.equal(parseDuration("1h"), 60);
  assert.equal(parseDuration("2 jam"), 120);
  assert.equal(parseDuration(undefined), null);
  assert.equal(parseDuration(""), null);
  assert.equal(parseDuration("0m"), null);
  assert.equal(parseDuration("soon"), null);
  assert.equal(trustLimitMinutes, 60);
  assert.ok((parseDuration("61m") ?? 0) > trustLimitMinutes);
});

test("the group pairing card says what a group will see, in both catalogs", () => {
  // AC-7b.5. Disclosure is the control here, so it cannot quietly go missing.
  assert.match(catalogs.en["group.pairing"], /every member sees the approval cards/);
  assert.match(catalogs.id["group.pairing"], /setiap anggota melihat kartu approval/);
  for (const catalog of Object.values(catalogs)) {
    assert.match(catalog["group.pairing"], /\{title\}/);
    assert.match(catalog["trust.card"], /\{minutes\}/);
  }
});

test("PID file helpers read a pid and tell a live process from a dead one", () => {
  assert.equal(readPid("1234\n"), 1234);
  assert.equal(readPid(""), null);
  assert.equal(readPid("-1"), null);
  assert.equal(readPid("nonsense"), null);
  assert.equal(processAlive(process.pid), true);
  // A pid far above the usual maximum is not running.
  assert.equal(processAlive(4194303), false);
});

test("a flag's value is never mistaken for the trust workspace", () => {
  // `caraka trust --for 30m` used to open a window on a directory named `30m`
  // and report it as open.
  assert.equal(trustWorkspace(["--for", "30m"]), resolve(process.cwd()));
  assert.equal(trustWorkspace(["--bypass", "--for", "30m"]), resolve(process.cwd()));
  assert.equal(trustWorkspace(["/srv/app", "--for", "30m"]), "/srv/app");
  assert.equal(trustWorkspace(["--bypass", "--for", "30m", "/srv/app"]), "/srv/app");
});

test("printed service units install nothing and never say sudo", async () => {
  const before = await readdir(process.cwd());
  const input = {
    execPath: "/usr/bin/node",
    cliPath: "/opt/caraka/bin/caraka.mjs",
    workspace: "/srv/app",
  };
  const units = serviceKinds.map((kind) => serviceUnit({ ...input, kind }));
  for (const unit of units) {
    assert.equal(unit.includes("sudo"), false);
    assert.ok(unit.includes("/usr/bin/node"));
    assert.ok(unit.includes("/opt/caraka/bin/caraka.mjs"));
  }
  const [systemd, launchd, schtasks] = units;
  assert.ok(systemd?.includes("~/.config/systemd/user"));
  assert.ok(systemd?.includes("Restart=on-failure"));
  assert.ok(systemd?.includes("RestartSec=5"));
  assert.ok(systemd?.includes("RestartPreventExitStatus=78"));
  assert.match(systemd ?? "", /Optional[\s\S]*loginctl enable-linger/);
  assert.match(systemd ?? "", /Lingering keeps the unit running after you log out/);
  assert.ok(launchd?.includes("~/Library/LaunchAgents"));
  assert.ok(launchd?.includes("0600"));
  assert.match(launchd ?? "", /It does not start at boot/);
  assert.ok(schtasks?.includes("/sc ONLOGON"));
  assert.equal(schtasks?.includes("/ru System"), false);
  assert.equal(isServiceKind("upstart"), false);
  assert.deepEqual(await readdir(process.cwd()), before);
});

test("the package has no install lifecycle script", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  ) as { scripts: Record<string, string> };
  for (const name of ["preinstall", "install", "postinstall"])
    assert.equal(name in manifest.scripts, false, name);
});

test("node:sqlite carries FTS5, the ground the local provider stands on", () => {
  // Plan memori-v03 step 1: measured on Node v24.18.0 on 8 August 2026. This
  // repeats the measurement wherever the suite runs, so a Node build without
  // FTS5 fails here instead of quietly inside compile.
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE VIRTUAL TABLE probe USING fts5(text)");
  db.prepare("INSERT INTO probe(text) VALUES (?)").run("caraka remembers the lockfile");
  const hit = db.prepare("SELECT count(*) AS n FROM probe WHERE probe MATCH ?").get("lockfile") as {
    n: number;
  };
  assert.equal(hit.n, 1);
  db.close();
});

test("withTimeout hands back a fast value, cuts a hang, and keeps the original error", async () => {
  // AC-4.1's mechanism at the unit: the bound is an argument, so the test
  // passes a small one instead of racing a real half second.
  assert.equal(await withTimeout(Promise.resolve("fast"), 50), "fast");
  await assert.rejects(withTimeout(new Promise<never>(() => {}), 10), /passed 10 ms/);
  await assert.rejects(
    withTimeout(Promise.reject(new Error("inner failure")), 50),
    /inner failure/,
  );
});

test("the memory block accepts its providers and rejects one it does not know", async () => {
  // AC-2.2.
  const oldHome = process.env.CARAKA_HOME;
  const root = await mkdtemp(join(tmpdir(), "caraka-memcfg-"));
  process.env.CARAKA_HOME = root;
  try {
    const config = defaultConfig(root, "caraka_test_bot", "42", true, "en", "titen");
    const paths = await saveConfig(config, "123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi");
    assert.equal((await loadConfig()).config.memory.provider, "titen");
    // A block naming only the provider still gets the loopback endpoint.
    await writeFile(paths.config, stringify({ ...config, memory: { provider: "none" } }));
    const bare = await loadConfig();
    assert.equal(bare.config.memory.provider, "none");
    assert.equal(bare.config.memory.endpoint, "http://127.0.0.1:7717");
    await writeFile(paths.config, stringify({ ...config, memory: { provider: "vector" } }));
    await assert.rejects(loadConfig());
  } finally {
    if (oldHome === undefined) delete process.env.CARAKA_HOME;
    else process.env.CARAKA_HOME = oldHome;
  }
});

test("the local provider stores scrubbed rows, searches within budget, and forgets by id", async () => {
  // AC-10.1, AC-10.2, AC-10.3, and AC-5.3 on the local path.
  const root = await mkdtemp(join(tmpdir(), "caraka-localmem-"));
  const store = new Store(join(root, "test.db"), createScrubber());
  const memory = new LocalMemory(store);
  const scope = { kind: "workspace" as const, id: "/srv/app" };

  // AC-10.1: the row lands with its scope and time.
  const id = await memory.observe({ scope, kind: "note", text: "prefer pnpm here" });
  const row = store.db
    .prepare("SELECT scope, kind, text, created_at FROM memory_local WHERE id = ?")
    .get(id) as { scope: string; kind: string; text: string; created_at: number };
  assert.equal(row.scope, "workspace:/srv/app");
  assert.equal(row.kind, "note");
  assert.equal(row.text, "prefer pnpm here");
  assert.ok(row.created_at > 0);

  // AC-5.3: a secret-shaped note is scrubbed before it reaches the file.
  await memory.observe({ scope, kind: "note", text: "CARAKA_TOKEN=super-secret-token-value" });
  const texts = (store.db.prepare("SELECT text FROM memory_local").all() as Array<{ text: string }>)
    .map((entry) => entry.text)
    .join("\n");
  assert.equal(texts.includes("super-secret-token-value"), false);
  assert.match(texts, /CARAKA_TOKEN=\[REDACTED\]/);

  // AC-10.2: seven matching rows, at most six back, inside the budget.
  for (let index = 0; index < 7; index += 1)
    await memory.observe({ scope, kind: "note", text: `pnpm note number ${index}` });
  const context = await memory.compile({ scope, task: "anything about pnpm", budgetTokens: 800 });
  assert.ok(context.items.length >= 1 && context.items.length <= 6);
  for (const item of context.items) assert.match(item.text, /pnpm/);
  assert.ok(context.tokensUsed <= 800);
  // A budget of five tokens fits exactly one of these rows.
  const tight = await memory.compile({ scope, task: "pnpm", budgetTokens: 5 });
  assert.equal(tight.items.length, 1);
  assert.ok(tight.tokensUsed <= 5);
  // A scope the store never saw returns nothing.
  const other = await memory.compile({
    scope: { kind: "workspace", id: "/elsewhere" },
    task: "pnpm",
    budgetTokens: 800,
  });
  assert.deepEqual(other.items, []);

  // AC-10.3: forgetting by id deletes exactly that row.
  assert.equal(await memory.forget(id), 1);
  assert.equal(store.db.prepare("SELECT id FROM memory_local WHERE id = ?").get(id), undefined);
  assert.equal(await memory.forget("feedbeef"), 0);
  assert.equal(await memory.forget({ kind: "note" }), 0);
  store.close();
});

test("a database from before v0.3 gains the memory tables and keeps its rows", async () => {
  // AC-10.4. The constructor's CREATE TABLE IF NOT EXISTS block is the only
  // migration there is, so an old file has to pass through it unharmed.
  const root = await mkdtemp(join(tmpdir(), "caraka-olddb-"));
  const path = join(root, "test.db");
  const store = new Store(path, createScrubber());
  const session = store.createSession({
    principal: "42",
    chatId: "42",
    threadId: "",
    title: "old work",
    workspace: "",
    agent: "",
  });
  store.close();
  // Rewind the file to the v0.2 shape: the memory tables did not exist then.
  const raw = new DatabaseSync(path);
  raw.exec("DROP TABLE memory_local; DROP TABLE IF EXISTS memory_local_fts;");
  raw.close();
  const reopened = new Store(path, createScrubber());
  const kept = reopened.db.prepare("SELECT title FROM sessions WHERE id = ?").get(session.id) as {
    title: string;
  };
  assert.equal(kept.title, "old work");
  const id = reopened.memoryInsert("workspace:/x", "note", "fresh row");
  assert.equal(reopened.memoryDelete(id), 1);
  reopened.close();
});

test("the titen adapter maps its five operations to the documented routes", async () => {
  // AC-11.1, AC-11.2, and AC-5.3 on the HTTP path.
  const requests: Array<{ method: string; path: string; body: string | undefined }> = [];
  const json = (payload: unknown) =>
    new Response(JSON.stringify(payload), { headers: { "content-type": "application/json" } });
  let answer = () => json({});
  const fetcher: typeof fetch = async (input, init) => {
    requests.push({
      method: init?.method ?? "GET",
      path: new URL(String(input)).pathname,
      body: init?.body === undefined ? undefined : String(init.body),
    });
    return answer();
  };
  const memory = new TitenMemory(createScrubber(), "http://127.0.0.1:7717", fetcher);
  const scope = { kind: "workspace" as const, id: "/srv/app" };

  answer = () => json({ data: { observation_id: "obs-7" } });
  const observed = await memory.observe({
    scope,
    kind: "note",
    text: "CARAKA_TOKEN=super-secret-token-value",
  });
  assert.equal(observed, "obs-7");
  assert.equal(requests[0]?.method, "POST");
  assert.equal(requests[0]?.path, "/v1/observations");
  // AC-5.3: the body is scrubbed before it crosses the process boundary, and
  // the scrub keeps the body parseable — a redaction that ate the closing
  // quote would make Titen reject the request and lose the observation.
  const observeBody = JSON.parse(requests[0]?.body ?? "") as { scope: unknown; text: string };
  assert.deepEqual(observeBody.scope, scope);
  assert.equal(observeBody.text, "CARAKA_TOKEN=[REDACTED]");

  answer = () =>
    json({ data: { context_id: "ctx-9", items: [{ text: "t", source: "s" }], tokensUsed: 3 } });
  const context = await memory.compile({ scope, task: "t", budgetTokens: 800 });
  assert.equal(requests[1]?.method, "POST");
  assert.equal(requests[1]?.path, "/v1/context/compile");
  assert.deepEqual(context, { id: "ctx-9", items: [{ text: "t", source: "s" }], tokensUsed: 3 });

  answer = () => json({});
  await memory.feedback("ctx-9", { ok: true });
  assert.equal(requests[2]?.method, "POST");
  assert.equal(requests[2]?.path, "/v1/context/ctx-9/feedback");

  answer = () => json({ data: { evidence: [{ id: "ev-1", text: "seen", source: "run" }] } });
  const evidence = await memory.trace("claim-1");
  assert.equal(requests[3]?.method, "GET");
  assert.equal(requests[3]?.path, "/v1/claims/claim-1/evidence");
  assert.deepEqual(evidence, [{ id: "ev-1", text: "seen", source: "run" }]);

  // AC-11.2: forget purges the observation; 404 is zero; a Filter never calls.
  answer = () => json({});
  assert.equal(await memory.forget("obs-7"), 1);
  assert.equal(requests[4]?.method, "DELETE");
  assert.equal(requests[4]?.path, "/v1/observations/obs-7");
  answer = () => new Response("", { status: 404 });
  assert.equal(await memory.forget("gone"), 0);
  assert.equal(await memory.forget({ kind: "note" }), 0);
  assert.equal(requests.length, 6);
});

test("the memory commands are in the help text and the Telegram menu", () => {
  // AC-7.8's static half; the dispatch chain itself is proved end to end.
  for (const [language, catalog] of Object.entries(catalogs))
    for (const name of ["/ingat", "/lupakan", "/memori"])
      assert.ok(catalog["help.body"].includes(name), `${language} ${name}`);
  for (const name of ["ingat", "lupakan", "memori"])
    assert.ok(
      gatewayCommands.some((entry) => entry.command === name),
      name,
    );
});

// ---- Preset schema, loader, and the generic CLI driver (spec driver-v04) ----

const stubAgent = fileURLToPath(new URL("./fixtures/bin/fake-agent.mjs", import.meta.url));

// A parsed preset with defaults applied, pointing at the stub agent.
function cliPreset(over: Record<string, unknown> = {}) {
  return presetSchema.parse({
    id: "fake",
    driver: "cli",
    command: process.execPath,
    args: [stubAgent],
    output: "text",
    ...over,
  });
}

function textRoute(updates: string[]) {
  return {
    update(notification: AgentUpdate) {
      if (notification.update.sessionUpdate === "agent_message_chunk")
        updates.push(notification.update.content.text);
    },
    permission: async () => ({ outcome: { outcome: "cancelled" as const } }),
  };
}

test("the seven shipped presets load, and every unverified flag says so", async () => {
  // AC-3.1, AC-3.4, AC-3.5. The loader's default directory is the package's own
  // `presets/agents/`.
  const shipped = await loadPresets();
  assert.deepEqual(shipped.errors, []);
  assert.deepEqual([...shipped.presets.keys()].sort(), [
    "aider",
    "amp",
    "claude-code",
    "codex",
    "cursor",
    "gemini",
    "goose",
  ]);
  for (const id of ["amp", "cursor", "gemini", "goose"]) {
    const preset = shipped.presets.get(id);
    assert.equal(preset?.driver, "acp", id);
    assert.ok(preset?.acp?.command, id);
  }
  // AC-3.3: the codex sandbox is a security control (`docs/security.md` §7).
  const codex = shipped.presets.get("codex");
  assert.deepEqual(codex?.args.slice(4, 6), ["--sandbox", "read-only"]);
  assert.equal(codex?.resumeArgs?.includes("read-only"), true);
  // AC-3.5: aider is wholly unverified and says so in the file.
  const aider = await readFile(new URL("../presets/agents/aider.yaml", import.meta.url), "utf8");
  assert.match(aider, /belum diverifikasi/);
});

test("a broken preset is named with its file and field, and the rest still load", async () => {
  // AC-3.2.
  const root = await mkdtemp(join(tmpdir(), "caraka-preset-"));
  await writeFile(join(root, "good.yaml"), stringify({ id: "good", driver: "cli", command: "x" }));
  await writeFile(join(root, "bad.yaml"), stringify({ id: "bad", driver: "warp" }));
  const result = await loadPresets(root);
  assert.deepEqual([...result.presets.keys()], ["good"]);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0] ?? "", /bad\.yaml/);
  assert.match(result.errors[0] ?? "", /driver/);
  // A directory that does not exist is zero presets, not a crash.
  const empty = await loadPresets(join(root, "missing"));
  assert.equal(empty.presets.size, 0);
  assert.deepEqual(empty.errors, []);
});

test("the three output parsers honour the recorded fixtures", async () => {
  // AC-4.6 through AC-4.8, against `test/fixtures/`. Both fixtures are
  // synthesised from the documented formats (codex: research matrix row 2,
  // JSONL with last agent message + `thread_id`; claude:
  // `claude -p --output-format json`, `docs/design.md` §4); real recordings
  // replace them when the binaries are on a dev machine (plan driver-v04 §4).
  const codex = await readFile(new URL("./fixtures/codex.jsonl", import.meta.url), "utf8");
  const jsonl = parseOutput("jsonl", codex, ["thread_id", "session_id"]);
  assert.equal(jsonl.text, "Second answer, the one that counts.");
  assert.equal(jsonl.sessionId, "0199a213-81c0-7800-8000-0d43e30d913c");
  const claude = await readFile(new URL("./fixtures/claude.json", import.meta.url), "utf8");
  const json = parseOutput("json", claude, ["session_id"]);
  assert.equal(json.text, "The answer text.");
  assert.equal(json.sessionId, "5c1c7316-3193-4d02-9186-a1fdf9d8e6d7");
  const text = parseOutput("text", "plain stdout, as is\n", []);
  assert.equal(text.text, "plain stdout, as is\n");
  assert.equal(text.sessionId, null);
  // Garbage between JSONL lines is skipped, not fatal.
  assert.equal(
    parseOutput("jsonl", 'notjson\n{"type":"agent_message","text":"ok"}', []).text,
    "ok",
  );
});

test("the CLI driver spawns the preset command and resumes with the extracted id", async () => {
  // AC-4.1, AC-4.2, AC-4.3, AC-4.9, and the `{sessionId}` substitution.
  const root = await mkdtemp(join(tmpdir(), "caraka-cli-"));
  const record = join(root, "record.jsonl");
  const preset = cliPreset({
    args: [stubAgent, "--flag"],
    resumeArgs: [stubAgent, "resume", "{sessionId}"],
    output: "jsonl",
    sessionIdFields: ["thread_id"],
    env: {
      FAKE_RECORD: record,
      FAKE_EXTRA: "yes",
      FAKE_STDOUT:
        '{"type":"thread.started","thread_id":"t-1"}\n{"type":"item.completed","item":{"type":"agent_message","text":"turn done"}}',
    },
  });
  const driver = new CliDriver(preset);
  const oldToken = process.env.CARAKA_TELEGRAM_TOKEN;
  process.env.CARAKA_TELEGRAM_TOKEN = "must-not-leak";
  try {
    const updates: string[] = [];
    const sid = await driver.session(null, root);
    const first = await driver.prompt(sid, "task one", textRoute(updates));
    assert.equal(first.stopReason, "end_turn");
    assert.deepEqual(updates, ["turn done"]);
    await driver.prompt(sid, "task two", textRoute(updates));
    const lines = (await readFile(record, "utf8")).trim().split("\n");
    const [turn1, turn2] = lines.map(
      (line) =>
        JSON.parse(line) as {
          argv: string[];
          cwd: string;
          env: Record<string, string | null>;
          stdin: string;
        },
    );
    assert.deepEqual(turn1?.argv, ["--flag", "task one"]);
    assert.equal(turn1?.cwd, root);
    assert.equal(turn1?.env.CARAKA_TELEGRAM_TOKEN, null);
    assert.equal(turn1?.env.FAKE_EXTRA, "yes");
    assert.equal(turn1?.stdin, "");
    assert.deepEqual(turn2?.argv, ["resume", "t-1", "task two"]);
  } finally {
    if (oldToken === undefined) delete process.env.CARAKA_TELEGRAM_TOKEN;
    else process.env.CARAKA_TELEGRAM_TOKEN = oldToken;
  }
  await driver.stop();
});

test("the prompt travels on stdin when asked, and past the arg ceiling", async () => {
  // AC-4.4 and AC-4.5.
  const root = await mkdtemp(join(tmpdir(), "caraka-cli-stdin-"));
  const record = join(root, "record.jsonl");
  const byStdin = new CliDriver(
    cliPreset({ input: "stdin", env: { FAKE_RECORD: record, FAKE_STDOUT: "ok" } }),
  );
  await byStdin.prompt(await byStdin.session(null, root), "via stdin", textRoute([]));
  const overflow = new CliDriver(
    cliPreset({ maxPromptArgChars: 5, env: { FAKE_RECORD: record, FAKE_STDOUT: "ok" } }),
  );
  await overflow.prompt(await overflow.session(null, root), "longer than five", textRoute([]));
  await overflow.prompt(await overflow.session(null, root), "tiny", textRoute([]));
  const turns = (await readFile(record, "utf8"))
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as { argv: string[]; stdin: string });
  assert.deepEqual(
    turns.map((turn) => ({ argv: turn.argv, stdin: turn.stdin })),
    [
      { argv: [], stdin: "via stdin" },
      { argv: [], stdin: "longer than five" },
      { argv: ["tiny"], stdin: "" },
    ],
  );
});

test("a cancelled CLI run gets SIGTERM, then SIGKILL after the grace", async () => {
  // AC-4.11 and AC-4.12. The stub ignores SIGTERM, so only the escalation can
  // end it; the grace is a constructor seam, 5 seconds in production.
  const root = await mkdtemp(join(tmpdir(), "caraka-cli-kill-"));
  const ready = join(root, "ready");
  const driver = new CliDriver(
    cliPreset({ env: { FAKE_IGNORE_TERM: "1", FAKE_READY: ready } }),
    undefined,
    undefined,
    80,
  );
  const sid = await driver.session(null, root);
  const run = driver.prompt(sid, "hang", textRoute([]));
  while (!existsSync(ready)) await delay(10);
  const cancelledAt = Date.now();
  await driver.cancel(sid);
  const result = await run;
  assert.equal(result.stopReason, "cancelled");
  assert.ok(Date.now() - cancelledAt >= 80, "the process outlived SIGTERM until the grace ran out");
});

test("a CLI run that exits non-zero answers with scrubbed stderr", async () => {
  // AC-4.13. The message carries a stderr snippet, never a secret and never a
  // stack trace.
  const root = await mkdtemp(join(tmpdir(), "caraka-cli-fail-"));
  const driver = new CliDriver(
    cliPreset({ env: { FAKE_EXIT: "2", FAKE_STDERR: "boom CARAKA_TOKEN=super-secret-value" } }),
  );
  const sid = await driver.session(null, root);
  await assert.rejects(driver.prompt(sid, "fail", textRoute([])), (error: Error) => {
    assert.match(error.message, /boom/);
    assert.match(error.message, /\[REDACTED\]/);
    assert.equal(error.message.includes("super-secret-value"), false);
    assert.equal(error.message.includes("    at "), false);
    return true;
  });
});

test("setMode on the CLI driver resolves and changes nothing", async () => {
  // AC-4.10, the precedent set by the unconnected ACP driver.
  assert.equal(await new CliDriver(cliPreset()).setMode(), undefined);
});

test("driver selection: ACP when the adapter resolves, CLI otherwise, forced routes never cross", () => {
  // AC-5.1 through AC-5.5 at the construction seam, plus `resolveCommand`.
  const en = translator();
  const scrub = createScrubber();
  assert.equal(resolveCommand(process.execPath), process.execPath);
  assert.equal(resolveCommand("no-such-command-caraka"), null);
  assert.ok(resolveCommand("claude-agent-acp"), "the locked adapter resolves from node_modules");
  const acpPreset = presetSchema.parse({
    id: "a",
    driver: "acp",
    acp: { command: process.execPath },
  });
  assert.ok(buildDriver(acpPreset, undefined, en, scrub) instanceof ClaudeAcp);
  const bothRoutes = presetSchema.parse({
    id: "b",
    driver: "acp",
    command: process.execPath,
    acp: { command: "no-such-command-caraka" },
  });
  // The ACP command is gone, the same preset carries a CLI route: fall through.
  assert.ok(buildDriver(bothRoutes, undefined, en, scrub) instanceof CliDriver);
  // Forced routes are taken or refused, never swapped for the other.
  assert.ok(buildDriver(bothRoutes, "cli", en, scrub) instanceof CliDriver);
  assert.throws(() => buildDriver(bothRoutes, "acp", en, scrub), /no-such-command-caraka/);
  assert.throws(() => buildDriver(acpPreset, "cli", en, scrub), /no CLI command/);
  const nothing = presetSchema.parse({
    id: "n",
    driver: "acp",
    acp: { command: "no-such-command-caraka" },
  });
  assert.throws(() => buildDriver(nothing, undefined, en, scrub), /caraka doctor/);
  // No preset on disk keeps the pre-preset Claude behaviour.
  assert.ok(buildDriver(undefined, undefined, en, scrub) instanceof ClaudeAcp);
});

test("the driver registry serves one instance per preset and route, '' as the default", async () => {
  // The production selection seam behind the gateway's `driverFor`.
  const preset = cliPreset({ id: "fake" });
  const registry = driverRegistry(
    new Map([["fake", preset]]),
    "fake",
    translator(),
    createScrubber(),
  );
  const byDefault = await registry("");
  assert.equal(byDefault, await registry("fake"), "'' and the default id share the instance");
  assert.notEqual(byDefault, await registry("fake", "cli"), "a forced route is its own instance");
});

test("an adapter that dies during initialize falls back to the preset's CLI route", async () => {
  // AC-5.2 at runtime: the `acp:` command resolves and spawns, then exits
  // before answering initialize. The same preset's CLI route takes over —
  // unless a route was forced (AC-5.4: forced routes never cross).
  const preset = cliPreset({
    id: "flaky",
    driver: "acp",
    acp: { command: process.execPath, args: ["-e", "process.exit(1)"] },
  });
  const registry = driverRegistry(
    new Map([["flaky", preset]]),
    "flaky",
    translator(),
    createScrubber(),
  );
  assert.ok((await registry("flaky")) instanceof CliDriver);
  await assert.rejects(registry("flaky", "acp"), /ACP/);
});

test("workspace.driver is optional, constrained to the two routes, and loads back", async () => {
  // AC-5.4's config half: the force is written by hand and survives the parse.
  const oldHome = process.env.CARAKA_HOME;
  const root = await mkdtemp(join(tmpdir(), "caraka-drvcfg-"));
  process.env.CARAKA_HOME = root;
  try {
    const config = defaultConfig(root, "caraka_test_bot", "42", true);
    const paths = await saveConfig(config, "123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi");
    assert.equal((await loadConfig()).config.workspace.driver, undefined);
    await writeFile(
      paths.config,
      stringify({ ...config, workspace: { ...config.workspace, driver: "cli" } }),
    );
    assert.equal((await loadConfig()).config.workspace.driver, "cli");
    await writeFile(
      paths.config,
      stringify({ ...config, workspace: { ...config.workspace, driver: "warp" } }),
    );
    await assert.rejects(loadConfig());
  } finally {
    if (oldHome === undefined) delete process.env.CARAKA_HOME;
    else process.env.CARAKA_HOME = oldHome;
  }
});

test("workspaces[] is additive, and a singular config lifts into a one-element list", async () => {
  // AC-6.1 and AC-6.2 (spec driver-v04): `version` stays 1, nothing rewrites
  // the file, and the singular `name` becomes the slug.
  const oldHome = process.env.CARAKA_HOME;
  const root = await mkdtemp(join(tmpdir(), "caraka-wscfg-"));
  process.env.CARAKA_HOME = root;
  try {
    const config = defaultConfig(root, "caraka_test_bot", "42", true);
    const paths = await saveConfig(config, "123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi");
    const lifted = workspaces((await loadConfig()).config);
    assert.deepEqual(lifted, [{ slug: basename(root), path: root }]);
    const list = [
      { slug: "alpha", path: "/srv/alpha", driver: "cli", agent: "codex" },
      { slug: "beta", path: "/srv/beta" },
    ];
    await writeFile(paths.config, stringify({ ...config, workspaces: list }));
    const loaded = await loadConfig();
    assert.equal(loaded.config.version, 1);
    assert.deepEqual(workspaces(loaded.config), list);
    // A relative path is refused, like the singular's always was.
    await writeFile(
      paths.config,
      stringify({ ...config, workspaces: [{ slug: "bad", path: "relative/path" }] }),
    );
    await assert.rejects(loadConfig());
  } finally {
    if (oldHome === undefined) delete process.env.CARAKA_HOME;
    else process.env.CARAKA_HOME = oldHome;
  }
});

test("a v0.3 database gains the two session routing columns and keeps its rows", async () => {
  // AC-6.3: the PRAGMA-guarded ALTERs are the whole migration, and a row from
  // before them reads back with '' in both new columns.
  const root = await mkdtemp(join(tmpdir(), "caraka-wsdb-"));
  const path = join(root, "test.db");
  const raw = new DatabaseSync(path);
  raw.exec(`
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      principal TEXT NOT NULL,
      chat_id TEXT NOT NULL,
      thread_id TEXT NOT NULL DEFAULT '',
      agent_session_id TEXT,
      title TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'idle',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    ) STRICT;
    INSERT INTO sessions VALUES ('abc123', '42', '42', '', 'agent-1', 'old work', 'done', 1, 1);
  `);
  raw.close();
  const store = new Store(path, createScrubber());
  const row = store.sessionById("abc123");
  assert.equal(row?.title, "old work");
  assert.equal(row?.workspace, "");
  assert.equal(row?.agent, "");
  // `/switch` writes the agent and drops the agent-side session id together.
  store.setAgent("abc123", "codex");
  const switched = store.sessionById("abc123");
  assert.equal(switched?.agent, "codex");
  assert.equal(switched?.agentSessionId, null);
  store.close();
});

// ---- Auto-discovery and the agent gate in init/doctor (spec driver-v04 AC-9) ----

// A directory of executable stubs that answer `--version`, standing in for the
// machine's PATH.
async function binDir(root: string, versions: Record<string, string>) {
  const dir = join(root, "bin");
  await mkdir(dir, { recursive: true });
  for (const [name, version] of Object.entries(versions))
    await writeFile(join(dir, name), `#!/bin/sh\necho "${version}"\n`, { mode: 0o755 });
  return dir;
}

test("discovery scans PATH for the known binaries and caches the result for a day", async () => {
  // AC-9.1, AC-9.4, AC-9.5, AC-9.6. The clock, the PATH, and the cache file
  // are all arguments, so nothing here touches the machine's own setup.
  const root = await mkdtemp(join(tmpdir(), "caraka-discovery-"));
  const bin = await binDir(root, {
    claude: "2.1.0 (Claude Code)",
    codex: "codex-cli 0.48.0",
    vim: "9.1",
  });
  const cacheFile = join(root, "discovery.json");
  const day = 24 * 60 * 60_000;
  const first = await discoverAgents({ path: bin, cacheFile, now: 1000 });
  // AC-9.1: the known binaries and nothing else — vim shares the PATH.
  assert.deepEqual(
    first.agents.map((agent) => `${agent.binary}:${agent.version}`),
    ["claude:2.1.0 (Claude Code)", "codex:codex-cli 0.48.0"],
  );
  // AC-9.4: under 24 hours the cache answers; the empty PATH proves no rescan.
  const cachedRun = await discoverAgents({ path: "", cacheFile, now: 1000 + day - 1 });
  assert.equal(cachedRun.agents.length, 2);
  // AC-9.6: doctor's refresh ignores the cache's age.
  const refreshed = await discoverAgents({ path: "", cacheFile, now: 2000, refresh: true });
  assert.deepEqual(refreshed.agents, []);
  // AC-9.5: at 24 hours the cache is stale and discovery runs again.
  const stale = await discoverAgents({ path: bin, cacheFile, now: 2000 + day });
  assert.equal(stale.agents.length, 2);
  // A corrupt cache file reads as no cache at all.
  await writeFile(cacheFile, "not json");
  const rebuilt = await discoverAgents({ path: bin, cacheFile, now: 3000 + day });
  assert.equal(rebuilt.agents.length, 2);
});

test("doctor rows: one per discovered agent, Claude login only when claude is there", () => {
  // AC-9.9, AC-9.10, AC-9.11.
  const en = translator();
  const both: Discovery = {
    at: 0,
    agents: [
      { binary: "claude", path: "/usr/local/bin/claude", version: "2.1.0 (Claude Code)" },
      { binary: "codex", path: "/usr/local/bin/codex", version: null },
    ],
  };
  assert.deepEqual(
    agentChecks(both, () => true, en),
    [
      ["Agent claude 2.1.0 (Claude Code)", true, "/usr/local/bin/claude"],
      ["Agent codex", true, "/usr/local/bin/codex"],
      ["Claude login", true, "run `claude auth login`"],
    ],
  );
  // AC-9.11: without claude there is no login row, nothing red, and the login
  // probe never even runs.
  const noClaude: Discovery = {
    at: 0,
    agents: [{ binary: "codex", path: "/usr/local/bin/codex", version: "0.48.0" }],
  };
  const rows = agentChecks(
    noClaude,
    () => {
      throw new Error("probed a login that is not there");
    },
    en,
  );
  assert.deepEqual(rows, [["Agent codex 0.48.0", true, "/usr/local/bin/codex"]]);
  // Zero agents is one failing row carrying the remedy, in either catalog
  // (`docs/troubleshooting.md` §Coding agent).
  const none = agentChecks({ at: 0, agents: [] }, () => true, en);
  assert.equal(none.length, 1);
  assert.equal(none[0]?.[1], false);
  assert.match(none[0]?.[2] ?? "", /caraka doctor/);
  assert.match(catalogs.en["agents.none"], /No coding agent was found/);
  assert.match(catalogs.id["agents.none"], /Tidak ada coding agent yang ditemukan/);
});

test("init stops with the remedy when discovery finds no agent", async () => {
  // AC-9.7 and AC-9.8: the gate is "at least one agent", not Claude by name. A
  // fresh zero-agent cache under CARAKA_HOME feeds init's discovery, so the
  // gate is crossed without a network and without the machine's PATH.
  const oldHome = process.env.CARAKA_HOME;
  const root = await mkdtemp(join(tmpdir(), "caraka-init-"));
  process.env.CARAKA_HOME = root;
  await writeFile(join(root, "discovery.json"), JSON.stringify({ at: Date.now(), agents: [] }));
  const errors: string[] = [];
  const original = console.error;
  console.error = (...parts: unknown[]) => {
    errors.push(parts.join(" "));
  };
  try {
    await main(["init", "--workspace", root]);
  } finally {
    console.error = original;
    if (oldHome === undefined) delete process.env.CARAKA_HOME;
    else process.env.CARAKA_HOME = oldHome;
  }
  assert.equal(process.exitCode, 1);
  process.exitCode = 0;
  // The message is the catalog's remedy, in whichever language this machine
  // speaks — both carry the phrase.
  assert.match(errors.join("\n"), /coding agent/);
  // AC-9.8's other half: the hard Claude probe is gone from init, so one
  // non-claude agent passes the same gate this test just saw fail at zero.
  const cli = await readFile(new URL("../src/cli.ts", import.meta.url), "utf8");
  assert.equal(cli.includes('command("claude", ["--version"])'), false);
});

test("no Indonesian string survives outside the catalog", async () => {
  // AC-2.1 and AC-2.7. The tool speaks English unless the config says otherwise,
  // so a stray Indonesian literal anywhere else is a string that escaped i18n.
  const words = /\b(tidak|yang|jalankan|sudah|belum|dengan|untuk|atau|dibatalkan|silakan)\b/i;
  const root = new URL("../src/", import.meta.url);
  const files = (await readdir(root, { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts") && entry.name !== "i18n.ts")
    .map((entry) => join(entry.parentPath, entry.name));
  assert.ok(files.length >= 6);
  for (const file of files) {
    const found = words.exec(await readFile(file, "utf8"));
    assert.equal(found, null, `${file} still carries ${found?.[0]}`);
  }
});
