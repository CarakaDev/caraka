import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ClaudeAcp } from "../dist/drivers/claude-acp.js";

const cwd = await mkdtemp(join(tmpdir(), "caraka-claude-smoke-"));
const claude = new ClaudeAcp();

async function prompt(sessionId, expected) {
  let text = "";
  const result = await claude.prompt(
    sessionId,
    `Reply with exactly ${expected}. Do not use tools.`,
    {
      update(notification) {
        const update = notification.update;
        if (update.sessionUpdate === "agent_message_chunk" && update.content.type === "text") {
          text += update.content.text;
        }
      },
      permission() {
        return Promise.resolve({ outcome: { outcome: "cancelled" } });
      },
    },
  );
  assert.equal(text.trim(), expected);
  assert.equal(result.stopReason, "end_turn");
}

try {
  await claude.start();
  const sessionId = await claude.session(null, cwd);
  await prompt(sessionId, "CARAKA_ACP_NEW_OK");
  assert.equal(await claude.session(sessionId, cwd), sessionId);
  await prompt(sessionId, "CARAKA_ACP_LOAD_OK");
  console.log("Claude ACP smoke passed: initialize, new, prompt, load, prompt.");
} finally {
  await claude.stop();
}
