// A live smoke for one shipped preset, named by argv (default `codex`): the
// real YAML through the real loader, the real driver for the route that preset
// declares, the real binary in an empty temp workspace. Nothing here is a stub
// — if it passes, that agent answered on this machine.
//
// The name says `cli` because the CLI route came first; the file now drives an
// `acp:` block too, through the same client the gateway uses. One smoke per
// preset beats one script per agent, and a preset nobody can run says so out
// loud instead of quietly not being covered.
//
// One condition skips: the binary is not installed. CI has no agents, and a
// smoke that cannot run is not a failure. An installed agent that will not
// answer — signed out, out of credits, expired token — is a failure, and the
// line it prints carries the agent's own reason for it.

import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ClaudeAcp } from "../dist/drivers/claude-acp.js";
import { CliDriver } from "../dist/drivers/cli.js";
import { loadPresets, resolveCommand } from "../dist/drivers/preset.js";

// The second argument names the route, for the one preset that declares both.
// Without it `claude-code` takes its `driver: acp` and repeats what
// `smoke-claude.mjs` just ran, leaving the CLI half — `claude -p
// --output-format json --session-id`, and `--resume` on the second turn — the
// only shipped route nothing had ever run.
const id = process.argv[2] ?? "codex";
const route = process.argv[3] ?? undefined;
const { presets, errors } = await loadPresets();
for (const error of errors) console.error(error);

const preset = presets.get(id);
assert.ok(preset, `no preset named ${id} in presets/agents/`);
const taken = route ?? preset.driver;
assert.ok(taken === "acp" || taken === "cli", `no driver here drives the ${taken} route`);
const acp = taken === "acp" ? preset.acp : undefined;
assert.ok(acp ?? (taken === "cli" && preset.command), `preset ${id} declares no ${taken} route`);

const command = acp?.command ?? preset.command;
const binary = resolveCommand(command);
if (!binary) {
  console.log(`SKIP ${id}: \`${command}\` is not installed on this machine.`);
  process.exit(0);
}

// Material the second turn has to remember. It appears in the first prompt and
// nowhere else, so an answer carrying it came from the resumed thread rather
// than from the words this script just sent.
const token = String(Math.floor(Math.random() * 9000) + 1000);

const cwd = await mkdtemp(join(tmpdir(), `caraka-${id}-smoke-`));
// The absolute path, because an ACP adapter is spawned by name and the smoke
// already resolved which name on this machine answered.
const driver = acp ? new ClaudeAcp(undefined, { ...acp, command: binary }) : new CliDriver(preset);
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
  // Anchored per line, because `ready` is a word this script put in the prompt:
  // an unanchored match cannot tell an answer from an echo of the question, and
  // no line of that prompt is the bare word. Per line rather than whole,
  // because a `text` preset has no structured field to read and the agent's
  // banner arrives on the same stdout as its answer.
  const first = await turn(
    `Remember the number ${token}. Reply with exactly the word ready. Do not use tools.`,
  );
  assert.match(first, /^ready[.!]?$/im, `first turn answered ${JSON.stringify(first)}`);
  // What the second turn has to cross. The CLI route crosses a process
  // boundary, so it needs the agent's own thread id, which lands in the
  // driver's session map and nowhere public: reading it here is the only way to
  // tell an extracted id from a `sessionIdFields` list that matched nothing,
  // which is what breaks resume. A CLI preset that declares no such field
  // carries its thread in the workspace instead, and then `resumeArgs` is the
  // whole mechanism. The ACP route keeps one process, so its boundary is
  // `session/load` — the call that has to return the same session back.
  let carried;
  if (acp) {
    assert.equal(await driver.session(sessionId, cwd), sessionId, "session/load lost the session");
    carried = "reloaded through session/load";
  } else if (preset.sessionIdFields.length > 0) {
    const external = driver.sessions.get(sessionId)?.external;
    assert.ok(external, `no session id in any of: ${preset.sessionIdFields.join(", ")}`);
    carried = `session id ${external}`;
  } else {
    assert.ok(preset.resumeArgs?.length, "no sessionIdFields and no resumeArgs: nothing resumes");
    carried = `resumed by \`${preset.resumeArgs.join(" ")}\` in the workspace`;
  }
  // Turn two runs that resume path for real. What it proves is that the agent
  // came back to the thread holding the number; whether the number arrives as
  // the answer or inside a replayed transcript is the agent's business, and
  // either way it is material the second prompt never carried.
  const second = await turn("What number were you asked to remember? Reply with digits only.");
  assert.match(second, new RegExp(token), `resumed turn answered ${JSON.stringify(second)}`);
  console.log(
    `${id} ${taken} smoke passed via ${binary}: answered ${JSON.stringify(first)}, ${carried}, recalled ${token}.`,
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
  // An ACP adapter that outlives SIGTERM keeps its pipes open, and the open
  // pipes keep this process alive after the result is already known — gemini's
  // does. Unreffed, so a clean run still exits the moment the loop empties;
  // when it does not, the summary line has flushed and the exit code is the
  // one the run earned.
  setTimeout(() => process.exit(process.exitCode ?? 0), 500).unref();
}
