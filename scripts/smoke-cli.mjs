// A live smoke for one CLI-route preset, named by argv (default `codex`): the
// real YAML through the real loader, the real `CliDriver`, the real binary in
// an empty temp workspace. Nothing here is a stub — if it passes, that agent
// answered on this machine.
//
// One condition skips: the binary is not installed. CI has no agents, and a
// smoke that cannot run is not a failure. An installed agent that will not
// answer — signed out, out of credits, expired token — is a failure, and the
// line it prints carries the agent's own reason for it.

import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CliDriver } from "../dist/drivers/cli.js";
import { loadPresets, resolveCommand } from "../dist/drivers/preset.js";

const id = process.argv[2] ?? "codex";
const { presets, errors } = await loadPresets();
for (const error of errors) console.error(error);

const preset = presets.get(id);
assert.ok(preset, `no preset named ${id} in presets/agents/`);
assert.equal(preset.driver, "cli", `preset ${id} takes the ${preset.driver} route, not cli`);

const binary = resolveCommand(preset.command);
if (!binary) {
  console.log(`SKIP ${id}: \`${preset.command}\` is not installed on this machine.`);
  process.exit(0);
}

// Material the second turn has to remember. It appears in the first prompt and
// nowhere else, so an answer carrying it came from the resumed thread rather
// than from the words this script just sent.
const token = String(Math.floor(Math.random() * 9000) + 1000);

const cwd = await mkdtemp(join(tmpdir(), `caraka-${id}-smoke-`));
const driver = new CliDriver(preset);
let sessionId;

async function turn(prompt) {
  let text = "";
  const result = await driver.prompt(sessionId, prompt, {
    update(notification) {
      const update = notification.update;
      if (update.sessionUpdate === "agent_message_chunk" && update.content.type === "text") {
        text += update.content.text;
      }
    },
    permission() {
      return Promise.resolve({ outcome: { outcome: "cancelled" } });
    },
  });
  assert.equal(result.stopReason, "end_turn");
  return text.trim();
}

try {
  await driver.start();
  sessionId = await driver.session(null, cwd);
  // Anchored, because `ready` is a word this script put in the prompt: an
  // unanchored match cannot tell an answer from an echo of the question.
  const first = await turn(
    `Remember the number ${token}. Reply with exactly the word ready. Do not use tools.`,
  );
  assert.match(first, /^ready[.!]?$/i, `first turn answered ${JSON.stringify(first)}`);
  // The agent's own thread id lands in the driver's session map and nowhere
  // public. Reading it here is the only way to tell an extracted id from a
  // `sessionIdFields` list that matched nothing, which is what breaks resume.
  const external = driver.sessions.get(sessionId)?.external;
  assert.ok(external, `no session id in any of: ${preset.sessionIdFields.join(", ")}`);
  // Turn two is the one that runs `resumeArgs`, substitutes that id, and parses
  // through `resumeOutput`. What it proves is that the agent resumed the thread
  // holding the number; whether the number arrives as the answer or inside a
  // replayed transcript is the agent's business, and either way it is material
  // the second prompt never carried.
  const second = await turn("What number were you asked to remember? Reply with digits only.");
  assert.match(second, new RegExp(token), `resumed turn answered ${JSON.stringify(second)}`);
  console.log(
    `${id} CLI smoke passed via ${binary}: answered ${JSON.stringify(first)}, session id ${external}, resumed and recalled ${token}.`,
  );
} catch (error) {
  // The binary exists and ran, so this is a real result, not a broken script.
  // `CliDriver` reads the agent's own reason out of its structured stdout
  // before falling back to the last stderr line, so what prints here is why the
  // agent stopped rather than what it was doing when it did.
  console.error(`FAIL ${id} via ${binary}: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
} finally {
  await driver.stop();
}
