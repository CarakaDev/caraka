import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
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
    stop: async () => undefined,
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
  await gateway.stop();
});
