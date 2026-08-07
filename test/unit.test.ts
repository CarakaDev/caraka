import assert from "node:assert/strict";
import { chmod, mkdtemp, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { splitTelegramText, Telegram } from "../src/channels/telegram.js";
import { workspaceArg } from "../src/cli.js";
import { defaultConfig, loadConfig, saveConfig } from "../src/config.js";
import { approvalCallbacks, createScrubber, verifyApprovalCallback } from "../src/core/security.js";
import { claudeEnvironment } from "../src/drivers/claude-acp.js";
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
  assert.throws(() => workspaceArg(["--workspace"]), /Isi path/);
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
