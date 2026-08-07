import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import type { RequestPermissionRequest, RequestPermissionResponse } from "@agentclientprotocol/sdk";
import { Telegram, type TelegramMessage, type TelegramUpdate } from "../src/channels/telegram.js";
import { defaultConfig } from "../src/config.js";
import { Gateway } from "../src/core/gateway.js";
import { createScrubber } from "../src/core/security.js";
import { ClaudeAcp, type ClaudeRoute } from "../src/drivers/claude-acp.js";
import { Store } from "../src/store/db.js";

test("private allowlisted Telegram message reaches Claude and signed approval returns once", async () => {
  const root = await mkdtemp(join(tmpdir(), "caraka-e2e-"));
  const config = defaultConfig(root, "caraka_test_bot", "42", true);
  const scrub = createScrubber();
  const store = new Store(join(root, "test.db"), scrub);
  const approvalKey = Buffer.alloc(32, 4);
  const sent: Array<{ kind: string; text: string; markup?: Record<string, unknown> }> = [];
  let callbackData = "";
  let finalSent = false;
  let topicAttempted = false;
  let messageId = 10;
  let claudeStops = 0;

  const telegram = {
    deleteWebhook: async () => true,
    async *updates(): AsyncGenerator<TelegramUpdate> {
      yield {
        update_id: 1,
        message: {
          message_id: 1,
          from: { id: 99, first_name: "No", is_bot: false },
          chat: { id: 99, type: "private" },
          text: "ignored",
          future_field: true,
        } as TelegramMessage,
      };
      yield {
        update_id: 2,
        message: {
          message_id: 2,
          from: { id: 42, first_name: "Rama", is_bot: false },
          chat: { id: 42, type: "private" },
          text: "write the file",
          future_field: true,
        } as TelegramMessage,
      };
      while (!callbackData) await delay(5);
      yield {
        update_id: 3,
        callback_query: {
          id: "callback-1",
          from: { id: 42, first_name: "Rama", is_bot: false },
          data: callbackData,
          message: { message_id: 12, chat: { id: 42, type: "private" } },
        },
      };
      while (!finalSent) await delay(5);
    },
    sendText: async (
      _chat: string,
      text: string,
      _thread: string,
      markup?: Record<string, unknown>,
    ) => {
      messageId += 1;
      sent.push({ kind: "text", text, ...(markup ? { markup } : {}) });
      if (markup) {
        const rows = markup.inline_keyboard as Array<Array<{ callback_data: string }>>;
        callbackData = rows[0]?.[0]?.callback_data ?? "";
      }
      return { message_id: messageId, chat: { id: 42, type: "private" } } as TelegramMessage;
    },
    sendResult: async (_chat: string, text: string) => {
      sent.push({ kind: "result", text });
      finalSent = true;
      return [];
    },
    editText: async () => ({ message_id: 11, chat: { id: 42, type: "private" } }),
    deleteMessage: async () => true,
    createTopic: async () => {
      topicAttempted = true;
      throw new Error("topics unavailable");
    },
    answerCallback: async () => true,
    clearKeyboard: async () => ({ message_id: 12, chat: { id: 42, type: "private" } }),
  } as unknown as Telegram;

  let receivedPrompt = "";
  const claude = {
    start: async () => undefined,
    session: async () => "agent-session-1",
    prompt: async (_session: string, prompt: string, route: ClaudeRoute) => {
      receivedPrompt = prompt;
      const request: RequestPermissionRequest = {
        sessionId: "agent-session-1",
        toolCall: { toolCallId: "tool-1", title: "Write file", kind: "edit" },
        options: [
          { optionId: "allow-once", name: "Allow", kind: "allow_once" },
          { optionId: "reject-once", name: "Reject", kind: "reject_once" },
        ],
      };
      const choice: RequestPermissionResponse = await route.permission(request);
      assert.deepEqual(choice, { outcome: { outcome: "selected", optionId: "allow-once" } });
      await route.update({
        sessionId: "agent-session-1",
        update: {
          sessionUpdate: "agent_message_chunk",
          content: { type: "text", text: "done CARAKA_TOKEN=synthetic-secret-value" },
        },
      });
      return { stopReason: "end_turn" as const };
    },
    cancel: async () => undefined,
    stop: async () => {
      claudeStops += 1;
    },
  } as unknown as ClaudeAcp;

  const gateway = new Gateway(config, approvalKey, telegram, claude, store, scrub);
  await gateway.run();
  assert.equal(receivedPrompt, "write the file");
  assert.equal(topicAttempted, true);
  assert.equal(
    sent.some((item) => item.text.includes("ignored")),
    false,
  );
  const result = sent.find((item) => item.kind === "result");
  assert.ok(result?.text.includes("done"));
  assert.match(result?.text ?? "", /^\[[^\]]+\]/);
  assert.equal(result?.text.includes("synthetic-secret-value"), false);
  assert.equal(store.db.prepare("SELECT decision FROM approvals").get()?.decision, "allow");
  const audits = store.db.prepare("SELECT action, details FROM audit").all();
  assert.equal(
    audits.some((audit) => audit.action === "msg.out"),
    true,
  );
  assert.equal(JSON.stringify(audits).includes("synthetic-secret-value"), false);
  const firstStop = gateway.stop();
  const secondStop = gateway.stop();
  assert.equal(firstStop, secondStop);
  await firstStop;
  assert.equal(claudeStops, 1);
});

// A scripted Telegram: the test pushes updates, the gateway drains them, and
// everything the gateway sent back stays on `sent` for inspection.
class Feed {
  private readonly queue: TelegramUpdate[] = [];
  private closed = false;
  private id = 0;

  push(update: Omit<TelegramUpdate, "update_id">) {
    this.id += 1;
    this.queue.push({ update_id: this.id, ...update });
  }

  close() {
    this.closed = true;
  }

  async *updates(): AsyncGenerator<TelegramUpdate> {
    for (;;) {
      const next = this.queue.shift();
      if (next) {
        yield next;
        continue;
      }
      if (this.closed) return;
      await delay(2);
    }
  }
}

type Sent = { chatId: string; text: string; markup?: Record<string, unknown> };

function message(chatId: number, from: number, text: string, type = "private") {
  return {
    message: {
      message_id: chatId + from,
      from: { id: from, first_name: "Rama", is_bot: false },
      chat: { id: chatId, type },
      text,
    } as TelegramMessage,
  };
}

function callback(from: number, data: string, chatId = from) {
  return {
    callback_query: {
      id: `cb-${data.slice(0, 6)}`,
      from: { id: from, first_name: "Rama", is_bot: false },
      data,
      message: { message_id: 12, chat: { id: chatId, type: "private" } } as TelegramMessage,
    },
  };
}

async function harness(
  options: {
    allowChats?: string[];
    topics?: boolean;
    editTopicFails?: boolean;
    onPrompt?: (prompt: string, route: ClaudeRoute) => Promise<{ stopReason: string }>;
    store?: Store;
    root?: string;
    runLimitMs?: number;
  } = {},
) {
  const root = options.root ?? (await mkdtemp(join(tmpdir(), "caraka-e2e-")));
  const config = defaultConfig(root, "caraka_test_bot", "42", options.topics ?? false);
  if (options.allowChats) config.telegram.allowChats = options.allowChats;
  const scrub = createScrubber();
  const store = options.store ?? new Store(join(root, "test.db"), scrub);
  const feed = new Feed();
  const sent: Sent[] = [];
  const calls: string[] = [];
  let messageId = 100;

  const telegram = {
    deleteWebhook: async () => true,
    setMyCommands: async () => {
      calls.push("setMyCommands");
      return true;
    },
    updates: () => feed.updates(),
    sendText: async (
      chatId: string,
      text: string,
      _thread: string,
      markup?: Record<string, unknown>,
    ) => {
      messageId += 1;
      sent.push({ chatId, text, ...(markup ? { markup } : {}) });
      return { message_id: messageId, chat: { id: Number(chatId), type: "private" } };
    },
    sendResult: async (chatId: string, text: string) => {
      sent.push({ chatId, text });
      return [];
    },
    editText: async () => ({ message_id: 11, chat: { id: 42, type: "private" } }),
    deleteMessage: async () => true,
    createTopic: async () => {
      calls.push("createForumTopic");
      if (!options.topics) throw new Error("topics unavailable");
      return { message_thread_id: 7001 };
    },
    editTopic: async (_chatId: string, _threadId: string, name: string) => {
      calls.push(`editForumTopic:${name}`);
      if (options.editTopicFails) throw new Error("TOPIC_NOT_MODIFIED");
      return true;
    },
    answerCallback: async (_id: string, text: string) => {
      sent.push({ chatId: "callback", text });
      return true;
    },
    clearKeyboard: async (chatId: string, messageId: number) => {
      calls.push(`clearKeyboard:${chatId}:${messageId}`);
      return { message_id: 12, chat: { id: 42, type: "private" } };
    },
    getMe: async () => ({ id: 7, is_bot: true, first_name: "Caraka", username: "carakadevbot" }),
  } as unknown as Telegram;

  const prompts: string[] = [];
  const claude = {
    start: async () => undefined,
    session: async () => "agent-session-1",
    prompt: async (_session: string, prompt: string, route: ClaudeRoute) => {
      prompts.push(prompt);
      return options.onPrompt
        ? await options.onPrompt(prompt, route)
        : { stopReason: "end_turn" as const };
    },
    setMode: async (_session: string, mode: string) => {
      calls.push(`set_mode:${mode}`);
    },
    cancel: async () => undefined,
    stop: async () => undefined,
  } as unknown as ClaudeAcp;

  const gateway = new Gateway(
    config,
    Buffer.alloc(32, 4),
    telegram,
    claude,
    store,
    scrub,
    "0.2.0",
    options.runLimitMs ?? 30 * 60_000,
  );
  const running = gateway.run();
  const buttons = () => {
    const withMarkup = sent.filter((item) => item.markup);
    const rows = withMarkup.at(-1)?.markup?.inline_keyboard as
      | Array<Array<{ text: string; callback_data: string }>>
      | undefined;
    return rows?.[0] ?? [];
  };
  return {
    root,
    store,
    feed,
    sent,
    calls,
    prompts,
    buttons,
    async settle(ms = 60) {
      await delay(ms);
    },
    async finish() {
      feed.close();
      await running;
      await gateway.stop();
    },
  };
}

function audits(store: Store, action: string) {
  return store.db
    .prepare("SELECT action, result, details FROM audit WHERE action = ?")
    .all(action) as Array<{ action: string; result: string; details: string }>;
}

// The list `@agentclientprotocol/claude-agent-acp` 0.63.0 really sends for
// ExitPlanMode on a machine that is not root, copied from its
// `dist/acp-agent.js` lines 3455-3471: the bypass option is unshifted to the
// front, so it is the first thing any naive renderer would draw.
const exitPlanOptions = [
  {
    optionId: "bypassPermissions",
    name: "Yes, and bypass permissions",
    kind: "allow_always" as const,
  },
  { optionId: "auto", name: 'Yes, and use "auto" mode', kind: "allow_always" as const },
  { optionId: "acceptEdits", name: "Yes, and auto-accept edits", kind: "allow_always" as const },
  { optionId: "default", name: "Yes, and manually approve edits", kind: "allow_once" as const },
  { optionId: "plan", name: "No, keep planning", kind: "reject_once" as const },
];

function planRequest(
  id: string,
  options: Array<{ optionId: string; name: string; kind: string }>,
): RequestPermissionRequest {
  return {
    sessionId: "agent-session-1",
    toolCall: {
      toolCallId: id,
      title: "Exit plan mode",
      kind: "other",
      rawInput: { plan: "ship it" },
    },
    options,
  } as RequestPermissionRequest;
}

test("ExitPlanMode's own options never reach the chat as a standing grant", async () => {
  const answers: Record<string, RequestPermissionResponse> = {};
  const h = await harness({
    onPrompt: async (_prompt, route) => {
      answers.real = await route.permission(planRequest("tool-plan", exitPlanOptions));
      // Nothing Caraka may press: first the same list without its one
      // `allow_once`, then a list whose only `allow_once` cedes standing
      // permission. Neither may produce a card.
      answers.noAllowOnce = await route.permission(
        planRequest(
          "tool-plan-2",
          exitPlanOptions.filter((option) => option.kind !== "allow_once"),
        ),
      );
      answers.cedingAllowOnce = await route.permission(
        planRequest("tool-plan-3", [
          { optionId: "auto", name: 'Yes, and use "auto" mode', kind: "allow_once" },
          { optionId: "plan", name: "No, keep planning", kind: "reject_once" },
        ]),
      );
      return { stopReason: "end_turn" as const };
    },
  });
  h.feed.push(message(42, 42, "exit plan mode"));
  await h.settle(150);

  // Two buttons, and neither is one of the three standing grants on the wire.
  const row = h.buttons();
  assert.equal(row.length, 2);
  assert.equal(row[0]?.text, "Yes, and manually approve edits");
  assert.equal(row[1]?.text, "No, keep planning");
  const card = JSON.stringify(h.sent.filter((item) => item.markup).at(-1));
  for (const forbidden of [
    "bypassPermissions",
    "acceptEdits",
    "Yes, and bypass permissions",
    'Yes, and use "auto" mode',
    "Yes, and auto-accept edits",
  ])
    assert.equal(card.includes(forbidden), false, forbidden);

  // The only two ids the button can ever return are written down before it is
  // pressed, so no later message can widen them.
  const stored = h.store.db
    .prepare("SELECT allow_option_id AS allow, reject_option_id AS reject FROM approvals")
    .get() as { allow: string; reject: string };
  assert.equal(stored.allow, "default");
  assert.equal(stored.reject, "plan");

  h.feed.push(callback(42, row[0]?.callback_data ?? ""));
  await h.settle(150);
  assert.deepEqual(answers.real, { outcome: { outcome: "selected", optionId: "default" } });
  assert.equal(answers.noAllowOnce?.outcome.outcome, "cancelled");
  assert.equal(answers.cedingAllowOnce?.outcome.outcome, "cancelled");
  // Neither unpressable request became a card, so the chat was never offered one.
  assert.equal(
    (h.store.db.prepare("SELECT count(*) AS n FROM approvals").get() as { n: number }).n,
    1,
  );
  assert.equal(h.buttons()[0]?.text, "Yes, and manually approve edits");
  await h.finish();
});

test("a trust window opens only from a signed button, and never covers the high-risk list", async () => {
  let ordinary: RequestPermissionResponse | undefined;
  let risky: RequestPermissionResponse | undefined;
  const options = [
    { optionId: "allow-once", name: "Yes", kind: "allow_once" as const },
    { optionId: "reject-once", name: "No", kind: "reject_once" as const },
  ];
  const h = await harness({
    onPrompt: async (_prompt, route) => {
      ordinary = await route.permission({
        sessionId: "agent-session-1",
        toolCall: {
          toolCallId: "tool-ordinary",
          title: "Write file",
          kind: "edit",
          rawInput: { file_path: "/srv/app/src/index.ts" },
        },
        options,
      });
      risky = await route.permission({
        sessionId: "agent-session-1",
        toolCall: {
          toolCallId: "tool-risky",
          title: "Run command",
          kind: "execute",
          rawInput: { command: "rm -rf build" },
        },
        options,
      });
      return { stopReason: "end_turn" as const };
    },
  });
  const count = () =>
    (h.store.db.prepare("SELECT count(*) AS n FROM policy_grant").get() as { n: number }).n;

  // AC-6.11: a window without a duration is not a window.
  h.feed.push(message(42, 42, "/yolo"));
  await h.settle();
  assert.match(h.sent.at(-1)?.text ?? "", /duration/i);
  assert.equal(count(), 0);

  // AC-6.4: the ceiling is enforced before anything is written.
  h.feed.push(message(42, 42, "/yolo 61m"));
  await h.settle();
  assert.equal(count(), 0);

  // AC-6.1: the card changes nothing on its own.
  h.feed.push(message(42, 42, "/yolo 30m"));
  await h.settle();
  const confirm = h.buttons()[0]?.callback_data ?? "";
  assert.ok(confirm.startsWith("t:"));
  assert.equal(count(), 0);

  // AC-6.10: a forged signature and a stranger both fail.
  h.feed.push(callback(42, `${confirm.slice(0, -1)}x`));
  h.feed.push(callback(99, confirm));
  await h.settle();
  assert.equal(count(), 0);

  h.feed.push(callback(42, confirm));
  await h.settle();
  const grant = h.store.db
    .prepare("SELECT granted_by, expires_at, agent_mode FROM policy_grant")
    .get() as {
    granted_by: string;
    expires_at: number;
    agent_mode: string | null;
  };
  assert.equal(grant.granted_by, "chat");
  assert.ok(grant.expires_at > Date.now());
  assert.equal(grant.agent_mode, null);

  // AC-6.12: chat can narrow a window, never lengthen one. A second `/yolo`
  // while one is open is refused, and the clock on the open row does not move.
  h.feed.push(message(42, 42, "/yolo 60m"));
  await h.settle();
  assert.match(h.sent.at(-1)?.text ?? "", /already open/i);
  assert.equal(count(), 1);
  assert.equal(
    (h.store.db.prepare("SELECT expires_at FROM policy_grant").get() as { expires_at: number })
      .expires_at,
    grant.expires_at,
  );

  h.feed.push(message(42, 42, "do the work"));
  await h.settle(120);
  // AC-6.5: ordinary work is allowed once, announced without a button, audited.
  assert.deepEqual(ordinary, { outcome: { outcome: "selected", optionId: "allow-once" } });
  const auto = h.sent.find((item) => item.text.includes("Trust window:"));
  assert.ok(auto, "the trust window announces what it allowed");
  assert.equal(auto?.markup, undefined);
  assert.equal(
    audits(h.store, "approval.decide").some((row) => row.result === "auto"),
    true,
  );

  // AC-6.6: the high-risk list still gets its buttons, inside the window.
  const approval = h.buttons();
  assert.ok(approval[0]?.callback_data.startsWith("c:"));
  assert.equal(approval[0]?.text, "Yes");
  assert.equal(approval[1]?.text, "No");
  h.feed.push(callback(42, approval[0]?.callback_data ?? ""));
  await h.settle(120);
  assert.deepEqual(risky, { outcome: { outcome: "selected", optionId: "allow-once" } });

  // AC-6.14 from the running side: a window opened in chat carries no agent
  // mode, so the gateway never asks Claude to change one.
  assert.equal(
    h.calls.some((entry) => entry.startsWith("set_mode")),
    false,
  );

  // AC-6.7: /lock closes now.
  h.feed.push(message(42, 42, "/lock"));
  await h.settle();
  assert.equal(h.store.activeGrant(h.root), undefined);
  assert.equal(
    audits(h.store, "trust.close").some((row) => row.result === "locked"),
    true,
  );
  await h.finish();
});

test("a trust window does not survive a restart", async () => {
  // AC-6.8. The window is a promise about a running process.
  const first = await harness();
  first.store.openGrant({
    workspace: first.root,
    mode: "trusted",
    grantedBy: "cli",
    principal: null,
    agentMode: null,
    expiresAt: Date.now() + 30 * 60_000,
  });
  assert.ok(first.store.activeGrant(first.root));
  first.feed.close();
  const second = await harness({ store: first.store, root: first.root });
  await second.settle();
  assert.equal(second.store.activeGrant(second.root), undefined);
  assert.equal(
    audits(second.store, "trust.close").some((row) => row.result === "restart"),
    true,
  );
  await second.finish();
});

test("a bypass window that ends takes the agent's mode with it", async () => {
  // The mode is session state on Claude's side, and `session/load` hands back a
  // live session as it stands. A closed window that leaves the mode behind is a
  // gateway saying it is guarding while the agent decides alone.
  const h = await harness();
  h.store.openGrant({
    workspace: h.root,
    mode: "trusted",
    grantedBy: "cli",
    principal: null,
    agentMode: "bypassPermissions",
    expiresAt: Date.now() + 30 * 60_000,
  });
  const modes = () => h.calls.filter((entry) => entry.startsWith("set_mode"));
  h.feed.push(message(42, 42, "inside the window"));
  await h.settle(150);
  assert.deepEqual(modes(), ["set_mode:bypassPermissions"]);

  h.feed.push(message(42, 42, "/lock"));
  await h.settle();
  assert.equal(h.store.activeGrant(h.root), undefined);
  h.feed.push(message(42, 42, "after the window"));
  await h.settle(150);
  assert.deepEqual(modes(), ["set_mode:bypassPermissions", "set_mode:default"]);
  assert.equal(audits(h.store, "trust.mode").length, 1);

  // Once restored it stays restored; nothing re-sends a mode nobody granted.
  h.feed.push(message(42, 42, "and again"));
  await h.settle(150);
  assert.equal(modes().length, 2);
  await h.finish();
});

test("both allowlists are consulted, and the sender list guards every button", async () => {
  let decision: RequestPermissionResponse | undefined;
  const h = await harness({
    allowChats: ["-1009990001", "42"],
    onPrompt: async (_prompt, route) => {
      decision = await route.permission({
        sessionId: "agent-session-1",
        toolCall: { toolCallId: "tool-group", title: "Write file", kind: "edit" },
        options: [
          { optionId: "allow-once", name: "Allow", kind: "allow_once" },
          { optionId: "reject-once", name: "Reject", kind: "reject_once" },
        ],
      });
      return { stopReason: "end_turn" as const };
    },
  });
  // AC-7b.1: a chat outside the chat allowlist is not even a denial to record.
  h.feed.push(message(-1009990002, 42, "from an unpaired group", "supergroup"));
  await h.settle();
  assert.deepEqual(h.prompts, []);

  // AC-7b.2: the chat is allowed, the sender is not.
  h.feed.push(message(-1009990001, 77, "from a group member", "supergroup"));
  await h.settle();
  assert.equal(
    audits(h.store, "msg.reject").some((row) => row.result === "denied"),
    true,
  );
  assert.deepEqual(h.prompts, []);

  // Both lists agree: the message is served.
  h.feed.push(message(-1009990001, 42, "run the tests", "supergroup"));
  await h.settle(120);
  assert.deepEqual(h.prompts, ["run the tests"]);
  // AC-7.3 and AC-7b.7: no forum right, so linear mode with a session header.
  assert.equal(h.calls.includes("createForumTopic"), false);
  assert.ok(h.sent.some((item) => /^\[[^\]]+\]/.test(item.text)));

  // AC-7b.8: the real button Caraka drew in the group, pressed by a member who
  // is not on the sender allowlist, decides nothing. The card is readable by
  // everyone in the room; the decision is not.
  const button = h.buttons()[0]?.callback_data ?? "";
  assert.ok(button.startsWith("c:"));
  h.feed.push(callback(77, button, -1009990001));
  await h.settle();
  assert.equal(decision, undefined);
  assert.equal(h.store.db.prepare("SELECT decision FROM approvals").get()?.decision, null);
  assert.equal(
    audits(h.store, "approval.decide").some((row) => row.result === "denied"),
    true,
  );

  // The same button in the allowlisted operator's hand is the one that lands.
  h.feed.push(callback(42, button, -1009990001));
  await h.settle(150);
  assert.deepEqual(decision, { outcome: { outcome: "selected", optionId: "allow-once" } });
  await h.finish();
});

test("a group is paired in the operator's DM, with the disclosure on the card", async () => {
  const h = await harness();
  // AC-7b.3 and AC-7b.5.
  h.feed.push({
    my_chat_member: {
      chat: { id: -1009990003, type: "supergroup", title: "Kantor" },
      from: { id: 42, first_name: "Rama", is_bot: false },
      new_chat_member: { status: "member" },
    },
  });
  await h.settle();
  const card = h.sent.at(-1);
  assert.equal(card?.chatId, "42", "the confirmation goes to the DM, not the group");
  assert.match(card?.text ?? "", /every member sees the approval cards/);
  const confirm = h.buttons()[0]?.callback_data ?? "";
  assert.ok(confirm.startsWith("g:"));

  // AC-7b.4: a forged signature adds nothing to the allowlist.
  h.feed.push(callback(42, `${confirm.slice(0, -1)}x`));
  h.feed.push(message(-1009990003, 42, "too early", "supergroup"));
  await h.settle();
  assert.deepEqual(h.prompts, []);

  h.feed.push(callback(42, confirm));
  await h.settle();
  h.feed.push(message(-1009990003, 42, "now paired", "supergroup"));
  await h.settle(120);
  assert.deepEqual(h.prompts, ["now paired"]);
  await h.finish();
});

test("the bot stops writing to a chat that blocked it", async () => {
  // AC-3.13, the path that was unreachable while my_chat_member was filtered out.
  const h = await harness();
  h.feed.push({
    my_chat_member: {
      chat: { id: 42, type: "private" },
      from: { id: 42, first_name: "Rama", is_bot: false },
      new_chat_member: { status: "kicked" },
    },
  });
  await h.settle();
  assert.equal(audits(h.store, "chat.blocked").length, 1);
  const before = h.sent.length;
  h.feed.push(message(42, 42, "/status"));
  await h.settle();
  assert.equal(h.sent.length, before);
  await h.finish();
});

test("slash commands are forwarded until the agent says what it answers to", async () => {
  const h = await harness({
    onPrompt: async (_prompt, route) => {
      await route.update({
        sessionId: "agent-session-1",
        update: {
          sessionUpdate: "available_commands_update",
          availableCommands: [{ name: "review", description: "Review the diff" }],
        },
      });
      await route.update({
        sessionId: "agent-session-1",
        update: { sessionUpdate: "usage_update", used: 1200, size: 200_000 },
      });
      return { stopReason: "end_turn" as const };
    },
  });
  // AC-3.9 and AC-3.6: nothing reported yet, so /usage says so and an unknown
  // slash command goes through as written.
  h.feed.push(message(42, 42, "/usage"));
  await h.settle();
  assert.match(h.sent.at(-1)?.text ?? "", /has not reported usage/);
  h.feed.push(message(42, 42, "/frobnicate now"));
  await h.settle(120);
  assert.deepEqual(h.prompts, ["/frobnicate now"]);

  // AC-3.4, AC-3.7, AC-3.8: the reported facts are kept for the session.
  h.feed.push(message(42, 42, "/commands"));
  await h.settle();
  assert.match(h.sent.at(-1)?.text ?? "", /\/review — Review the diff/);
  h.feed.push(message(42, 42, "/usage"));
  await h.settle();
  assert.match(h.sent.at(-1)?.text ?? "", /1200\/200000/);

  // AC-3.5: with a list in hand, a typo is answered, not forwarded.
  h.feed.push(message(42, 42, "/frobnicate again"));
  await h.settle(120);
  assert.deepEqual(h.prompts, ["/frobnicate now"]);
  assert.match(h.sent.at(-1)?.text ?? "", /\/commands/);
  await h.finish();
});

test("the startup notice names the machine once an hour", async () => {
  // AC-4.10 and AC-4.11.
  const first = await harness();
  await first.settle();
  const notice = first.sent.find((item) => item.text.includes("Caraka is up on"));
  assert.ok(notice);
  assert.match(notice?.text ?? "", /Workspace .+, version 0\.2\.0/);
  first.feed.close();
  const second = await harness({ store: first.store, root: first.root });
  await second.settle();
  assert.equal(
    second.sent.some((item) => item.text.includes("Caraka is up on")),
    false,
  );
  await second.finish();
});

test("a topic gets its colour once and carries its state in the name", async () => {
  // Roadmap Fase 0: `icon_color` is fixed at creation, so the state that moves
  // lives in the name, glyph first because Telegram shows the start of it.
  const h = await harness({ topics: true });
  h.feed.push(message(42, 42, "ship it"));
  await h.settle(150);
  assert.ok(h.calls.includes("createForumTopic"));
  assert.equal(
    (h.store.db.prepare("SELECT thread_id FROM sessions").get() as { thread_id: string }).thread_id,
    "7001",
  );
  const renames = h.calls.filter((call) => call.startsWith("editForumTopic:"));
  assert.deepEqual(renames, ["editForumTopic:▸ ship it", "editForumTopic:✓ ship it"]);
  await h.finish();

  // The colour itself travels on the wire at creation and never again:
  // `editForumTopic` exposes no `icon_color` field to change it with.
  let body: Record<string, unknown> = {};
  const fetcher: typeof fetch = async (_input, init) => {
    body = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ ok: true, result: { message_thread_id: 1 } }), {
      headers: { "content-type": "application/json" },
    });
  };
  await new Telegram("fake-token", fetcher).createTopic("42", "ship it");
  assert.equal(body.icon_color, 7322096);
});

test("a rename Telegram refuses changes neither the run nor the row", async () => {
  const h = await harness({ topics: true, editTopicFails: true });
  h.feed.push(message(42, 42, "ship it"));
  await h.settle(150);
  assert.deepEqual(h.prompts, ["ship it"]);
  assert.equal(
    (h.store.db.prepare("SELECT state FROM sessions").get() as { state: string }).state,
    "done",
  );
  await h.finish();
});

test("a session that finishes is marked, never closed and never deleted", async () => {
  // AC-7.4 and AC-7.5: closeForumTopic and deleteForumTopic are not in the code.
  const h = await harness();
  h.feed.push(message(42, 42, "ship it"));
  await h.settle(120);
  assert.equal(h.calls.includes("createForumTopic"), false);
  await h.finish();
  const gateway = await readFile(new URL("../src/core/gateway.ts", import.meta.url), "utf8");
  const telegram = await readFile(new URL("../src/channels/telegram.ts", import.meta.url), "utf8");
  // Neither name appears as a called method; both appear only in prose saying why.
  for (const source of [gateway, telegram]) {
    assert.equal(source.includes('"closeForumTopic"'), false);
    assert.equal(source.includes('"deleteForumTopic"'), false);
  }
  assert.ok(telegram.includes('"editForumTopic"'));
});

test("a run past its time limit is cancelled, marked, and recorded", async () => {
  // AC-4.9. The limit is thirty minutes in production; the test moves the same
  // seam rather than the clock.
  const h = await harness({
    runLimitMs: 40,
    onPrompt: async () => {
      await delay(300);
      return { stopReason: "cancelled" as const };
    },
  });
  h.feed.push(message(42, 42, "a long job"));
  await h.settle(400);
  const rows = audits(h.store, "run.timeout");
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.result, "cancelled");
  assert.equal(
    (h.store.db.prepare("SELECT state FROM sessions").get() as { state: string }).state,
    "cancelled",
  );
  assert.ok(h.sent.some((item) => /passed 0\.0\d+ minutes|was cancelled/.test(item.text)));
  await h.finish();
});

test("a sender past twenty messages a minute is told once and made to wait", async () => {
  // AC-4.8. The queue was already serial; the limit adds the wait and one line.
  const h = await harness();
  for (let index = 0; index < 21; index += 1) h.feed.push(message(42, 42, `task ${index}`));
  await h.settle(400);
  const notices = h.sent.filter((item) => item.text.includes("20 messages a minute"));
  assert.equal(notices.length, 1);
  // The twenty-first is held, not dropped: it has not reached the agent yet.
  assert.equal(h.prompts.includes("task 20"), false);
  assert.equal(h.prompts.length, 20);
  await h.finish();
});

test("a terminal bypass window is applied to the agent and never claimed as audited", async () => {
  // AC-6.13 and AC-6.15. The row is written by `caraka trust --bypass` in the
  // terminal; the gateway only carries it to the agent and records the window.
  const h = await harness();
  h.store.openGrant({
    workspace: h.root,
    mode: "trusted",
    grantedBy: "cli",
    principal: null,
    agentMode: "bypassPermissions",
    expiresAt: Date.now() + 30 * 60_000,
  });
  h.feed.push(message(42, 42, "go"));
  await h.settle(150);
  assert.ok(h.calls.includes("set_mode:bypassPermissions"));
  await h.finish();
  // The gateway closes the store on shutdown, so the record is read back fresh.
  const reopened = new Store(join(h.root, "test.db"), createScrubber());
  const closing = audits(reopened, "trust.close").find((row) => row.result === "shutdown");
  assert.ok(closing);
  const details = JSON.parse(closing?.details ?? "{}") as {
    cededMode: string | null;
    auditedActionsInside: boolean;
  };
  assert.equal(details.cededMode, "bypassPermissions");
  assert.equal(details.auditedActionsInside, false);
  // Nothing inside the window produced a per-action decision, and nothing
  // pretends otherwise.
  assert.equal(audits(reopened, "approval.decide").length, 0);
  reopened.close();
});

test("pairing clears its buttons and says what privacy mode will not deliver", async () => {
  const h = await harness();
  h.feed.push({
    my_chat_member: {
      chat: { id: -1009990004, type: "supergroup", title: "Rama's Castle" },
      from: { id: 42, first_name: "Rama", is_bot: false },
      new_chat_member: { status: "member" },
    },
  });
  await h.settle();
  const confirm = h.buttons()[0]?.callback_data ?? "";
  assert.ok(confirm.startsWith("g:"));

  h.feed.push(callback(42, confirm));
  await h.settle();

  // The card is single-use, so its buttons go the moment it is answered. This
  // is asserted on the real signature, not a fabricated one: a forged callback
  // is rejected before any of this and would pass the assertion vacuously.
  assert.equal(
    h.calls.some((call) => call.startsWith("clearKeyboard:")),
    true,
    "the pairing keyboard is cleared",
  );

  // Privacy mode is on by design, so an ordinary group message never arrives.
  // Saying nothing is what made a working bot look broken in the group.
  const ready = h.sent.at(-1)?.text ?? "";
  assert.match(ready, /\/new@carakadevbot/);
  assert.match(ready, /never reaches me/);
  assert.match(ready, /an admin bot receives all messages/);

  // And /status in the group repeats it, since that is where it gets asked.
  h.feed.push(message(-1009990004, 42, "/status", "supergroup"));
  await h.settle();
  assert.match(h.sent.at(-1)?.text ?? "", /never reaches me/);
  await h.finish();
});
