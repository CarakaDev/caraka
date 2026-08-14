// The fallback route (`docs/design.md` §4): one implementation, driven by the
// preset table. No streaming and no permission hook — the process runs, exits,
// and the whole answer becomes one text update, which the gateway already
// treats the same as a slow stream.

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { AgentDriver, DriverRoute } from "../core/driver.js";
import { createScrubber } from "../core/security.js";
import { translator, type Translate } from "../i18n.js";
import { claudeEnvironment } from "./claude-acp.js";
import type { AgentPreset } from "./preset.js";

// `docs/design.md:278` names SIGTERM → SIGKILL; the 5-second grace is set by
// spec driver-v04 AC-4.12.
const KILL_GRACE_MS = 5_000;
// A runaway process stops growing the buffer here; the gateway keeps even less.
const OUTPUT_LIMIT = 4_000_000;

type OutputFormat = "json" | "jsonl" | "text";

/**
 * The parser contract from `docs/design.md:185`: `json` takes the text field
 * and the first `sessionIdFields[]` key present; `jsonl` takes the last agent
 * message and the thread id from the stream; `text` passes stdout through.
 */
export function parseOutput(format: OutputFormat, stdout: string, sessionIdFields: string[]) {
  if (format === "text") return { text: stdout, sessionId: null };
  const objects: Array<Record<string, unknown>> = [];
  const lines = format === "json" ? [stdout] : stdout.split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const parsed: unknown = JSON.parse(line);
      if (parsed && typeof parsed === "object") objects.push(parsed as Record<string, unknown>);
    } catch {
      // Progress noise between JSON lines is not an error.
    }
  }
  let text = "";
  let sessionId: string | null = null;
  for (const object of objects) {
    sessionId ??= firstString(object, sessionIdFields);
    const candidate = agentMessage(object, format);
    if (candidate !== null) text = candidate;
  }
  return { text, sessionId };
}

function firstString(object: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = object[key];
    if (typeof value === "string") return value;
  }
  return null;
}

/**
 * Why the agent stopped, in its own words. A failing CLI agent writes its
 * reason into the structured stdout it was asked for — codex answers a spent
 * quota with `{"type":"error","message":…}` — while stderr carries progress
 * notes, so the last stderr line names the wrong cause about as often as the
 * right one. Null when stdout said nothing, which is when stderr is all there is.
 */
export function failureReason(stdout: string) {
  let found: string | null = null;
  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;
    try {
      const parsed: unknown = JSON.parse(line);
      const message = (parsed as Record<string, unknown>)?.message;
      if (typeof message === "string" && message.trim()) found = message.trim();
    } catch {
      // A line that is not JSON is progress noise, the same as in parseOutput.
    }
  }
  return found;
}

function agentMessage(object: Record<string, unknown>, format: "json" | "jsonl") {
  if (format === "json") return firstString(object, ["result", "text", "response", "message"]);
  const item = object.item;
  if (item && typeof item === "object") {
    const inner = item as Record<string, unknown>;
    if (inner.type === "agent_message" && typeof inner.text === "string") return inner.text;
  }
  if (object.type === "agent_message") return firstString(object, ["text", "message"]);
  return null;
}

type CliSession = { cwd: string; external: string | null; turns: number };

export class CliDriver implements AgentDriver {
  /** No permission hook on this route: the process runs, and then it is over. */
  readonly asksPermission = false;
  /** A file reaches this agent only if its preset names the flag that carries one. */
  readonly acceptsFiles: boolean;
  private readonly command: string;
  private readonly sessions = new Map<string, CliSession>();
  private readonly children = new Map<string, ChildProcessWithoutNullStreams>();
  private readonly cancelling = new Set<string>();

  constructor(
    private readonly preset: AgentPreset,
    private readonly t: Translate = translator(),
    private readonly scrub: (input: unknown) => string = createScrubber(),
    private readonly killGraceMs = KILL_GRACE_MS,
  ) {
    if (!preset.command) throw new Error(this.t("driver.cliMissing", { agent: preset.id }));
    this.command = preset.command;
    this.acceptsFiles = Boolean(preset.imageArg);
  }

  async start() {}

  // Session ids live in this process. After a restart the same id starts a
  // fresh first turn, and the agent-side thread id is discovered again.
  // ponytail: resume across restarts needs the external id persisted; add it
  // when the gateway learns to store what prompt() extracted.
  async session(existing: string | null, cwd: string) {
    const id = existing ?? randomUUID();
    const known = this.sessions.get(id);
    if (known) known.cwd = cwd;
    else this.sessions.set(id, { cwd, external: null, turns: 0 });
    return id;
  }

  async prompt(
    sessionId: string,
    prompt: string,
    route: DriverRoute,
    files?: string[],
  ): Promise<{ stopReason: string }> {
    const state = this.sessions.get(sessionId);
    if (!state) throw new Error(this.t("driver.noSession"));
    const resume = state.turns > 0 && (this.preset.resumeArgs?.length ?? 0) > 0;
    const base = resume ? (this.preset.resumeArgs ?? []) : this.preset.args;
    const argv = base.map((arg) => arg.replaceAll("{sessionId}", state.external ?? sessionId));
    const viaArg =
      this.preset.input === "arg" &&
      prompt.length <= (this.preset.maxPromptArgChars ?? Number.POSITIVE_INFINITY);
    // Ahead of the prompt, because the prompt is positional and goes last.
    // `repeat` writes the flag once per path, `join` writes it once with the
    // paths joined by a comma (AC-7.2).
    const image = this.preset.imageArg;
    if (image && files?.length) {
      if (this.preset.imageMode === "join") argv.push(image, files.join(","));
      else for (const file of files) argv.push(image, file);
    }
    if (viaArg) argv.push(prompt);
    const child = spawn(this.command, argv, {
      cwd: state.cwd,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...claudeEnvironment(), ...this.preset.env },
    });
    this.children.set(sessionId, child);
    const collected = { stdout: "", stderr: "" };
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      collected.stdout = `${collected.stdout}${chunk}`.slice(-OUTPUT_LIMIT);
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      collected.stderr = `${collected.stderr}${chunk}`.slice(-OUTPUT_LIMIT);
    });
    child.stdin.on("error", () => undefined);
    if (!viaArg) child.stdin.write(prompt);
    child.stdin.end();
    const exit = await new Promise<{ code: number | null; error?: Error }>((resolve) => {
      child.once("error", (error) => resolve({ code: null, error }));
      child.once("close", (code) => resolve({ code }));
    });
    this.children.delete(sessionId);
    if (this.cancelling.delete(sessionId)) return { stopReason: "cancelled" };
    if (exit.error) {
      throw new Error(
        this.t("driver.exit", { command: this.command, detail: this.scrub(exit.error.message) }),
      );
    }
    if (exit.code !== 0) {
      const reason = failureReason(collected.stdout) ?? collected.stderr.trim();
      const detail = this.scrub(reason).slice(-400) || `status ${exit.code}`;
      // The agent saying the id we just handed it does not exist, in its own
      // words, whatever those are. No preset has to guess at nine agents'
      // error sentences: the id is the signal, because we are the ones who
      // sent it. Eight characters, so a short id cannot match by accident.
      //
      // Only this failure is retried. A run that died halfway may already have
      // written files, and repeating its prompt would repeat them; a resume the
      // agent refused before starting has done nothing (issue #10).
      const external = state.external;
      if (resume && external && external.length >= 8 && detail.includes(external)) {
        state.external = null;
        // Zero turns is what makes the call below a fresh one, and it is also
        // what bounds this to a single retry: `resume` cannot be true again.
        state.turns = 0;
        // Said out loud, because the fresh session does not carry the earlier
        // turns and an answer that quietly forgot them is worse than an error.
        await route.update({
          sessionId,
          update: {
            sessionUpdate: "agent_message_chunk",
            content: { type: "text", text: this.t("driver.rolloutGone") },
          },
        });
        return this.prompt(sessionId, prompt, route, files);
      }
      throw new Error(this.t("driver.exit", { command: this.command, detail }));
    }
    const format =
      (resume ? (this.preset.resumeOutput ?? this.preset.output) : this.preset.output) ?? "text";
    const parsed = parseOutput(format, collected.stdout, this.preset.sessionIdFields);
    if (parsed.sessionId) state.external = parsed.sessionId;
    state.turns += 1;
    await route.update({
      sessionId,
      update: {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: parsed.text },
      },
    });
    return { stopReason: "end_turn" };
  }

  // No modes on this route: resolve and change nothing (the ACP precedent for
  // an unconnected agent).
  setMode() {
    return Promise.resolve(undefined);
  }

  async cancel(sessionId: string) {
    const child = this.children.get(sessionId);
    if (!child) return;
    this.cancelling.add(sessionId);
    child.kill("SIGTERM");
    const timer = setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    }, this.killGraceMs);
    timer.unref();
  }

  async stop() {
    for (const [sessionId] of this.children) await this.cancel(sessionId);
    this.sessions.clear();
  }
}
