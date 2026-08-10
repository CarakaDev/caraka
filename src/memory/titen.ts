import type { createScrubber } from "../core/security.js";
import type { CompiledContext, Evidence, Filter, MemoryProvider, Outcome, Scope } from "./index.js";

// The one file that knows Titen's HTTP surface. Every field below was read off
// a running Titen 0.7.3 on 10 August 2026, not off a document: the previous
// version of this file was written against `docs/design.md` §13 and agreed with
// nothing the server accepts — wrong port, wrong health path, no auth header,
// `scope`/`text` where Titen wants `subject_id`/`content`, `budgetTokens` where
// it wants `max_tokens`, and `tokensUsed` read from a key it never sends. It
// passed its test because the test mocked the same wrong shape.
//
// Verified against the live server, with the exact rejection each error caused:
//   POST /v1/observations   {subject_id, kind, content, source:{type, ref}}
//     kind absent from the enum      -> VALIDATION_ERROR "must be one of: …"
//     source absent                  -> VALIDATION_ERROR "must be an object"
//     source.ref absent              -> VALIDATION_ERROR "is required"
//   POST /v1/context/compile {subject_id, task, max_tokens}
//     max_tokens absent              -> VALIDATION_ERROR "is required"
//   POST /v1/context/:id/feedback {outcome}   outcome is a closed enum
//   GET  /v1/claims/:id/evidence  -> {claim, evidence:{supporting,…}}
//   DELETE /v1/observations/:id   -> {purged, already_purged}; 404 if unknown
// Unknown fields are ignored rather than rejected, which is exactly why the old
// shape has to be removed instead of left alongside the new one.

/**
 * Titen's own default: `titen serve --help` prints `[--port 8787]`, and the
 * 0.7.3 this file was read off listens there with no flag given. `src/config.ts`
 * imports this rather than keeping a second copy — through v1.1.2 it kept one,
 * spelled 7717, and because `src/cli.ts` always passes the configured endpoint
 * the copy was the only number any install ever used.
 */
export const DEFAULT_ENDPOINT = "http://127.0.0.1:8787";

/**
 * Titen's key, under Caraka's prefix. Titen prints it as `TITEN_API_KEY`, and
 * that name is deliberately not the one read here: `claudeEnvironment()`
 * (`src/drivers/claude-acp.ts`) strips `CARAKA_` and nothing else, so a key
 * under Titen's own name would be inherited by every spawned coding agent —
 * the same credential, and the same 18 MCP tools, that
 * `done/mcp-titen-passthrough/spec.md` refused to hand over on purpose.
 */
const API_KEY_VAR = "CARAKA_TITEN_API_KEY";

/** Seeded into the startup scrubber, so the key never reaches a log or a chat. */
export function titenApiKey(source: NodeJS.ProcessEnv = process.env) {
  return source[API_KEY_VAR] ?? "";
}

/** `/memori` compiles with no task. Titen rejects an empty one with a 400. */
const LISTING_TASK = "recent memory for this subject";

// Judgement call (b). Titen's `kind` is a closed enum, so Caraka's own kinds are
// mapped here rather than passed through: a free string is a VALIDATION_ERROR
// and a silently lost observation. `user_prompt` and `/ingat` are things a
// person said; a tool call is a tool result; the agent's answer is what the run
// concluded, which is the closest the enum comes to it. Anything a future seam
// adds falls to `system_event`, so a new kind degrades instead of failing.
const OBSERVATION_KIND: Record<string, string> = {
  user_prompt: "user_statement",
  note: "user_statement",
  tool_call: "tool_result",
  agent_output: "decision",
};

// Titen records how a context landed, not whether a run succeeded. Caraka only
// knows the latter, so it claims the weakest thing that is true: the context
// was used and the run finished, or it was there and the run did not.
// `incorrect` and `harmful` stay unused — Caraka has no evidence for either.
const FEEDBACK_OUTCOME = { ok: "useful", failed: "irrelevant" } as const;

type Scrubber = ReturnType<typeof createScrubber>;

function record(value: unknown) {
  return (value ?? {}) as Record<string, unknown>;
}

export class TitenMemory implements MemoryProvider {
  constructor(
    private readonly scrub: Scrubber,
    private readonly endpoint = DEFAULT_ENDPOINT,
    private readonly fetcher: typeof fetch = fetch,
    private readonly requestTimeoutMs = 10_000,
    // Every route except `/healthz` answers 401 without it. It comes from the
    // environment because the key belongs on the machine, not in `config.yaml`.
    private readonly apiKey = titenApiKey(),
  ) {}

  // Every string in an outbound body is scrubbed, not just the field that
  // happens to carry user text: Titen's SQLite is disk (`docs/erd.md`: no raw
  // secret reaches disk) and a workspace path or a source ref can carry one
  // too. Scrubbing the serialized JSON instead would break it — the env-var
  // pattern redacts up to the next whitespace and JSON.stringify emits none, so
  // the match would swallow the quote that closes the value.
  private scrubDeep(value: unknown): unknown {
    if (typeof value === "string") return this.scrub(value);
    if (Array.isArray(value)) return value.map((entry) => this.scrubDeep(entry));
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, this.scrubDeep(entry)]),
      );
    return value;
  }

  private request(method: string, path: string, body?: unknown) {
    return this.fetcher(new URL(path, this.endpoint), {
      method,
      signal: AbortSignal.timeout(this.requestTimeoutMs),
      headers: {
        ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(this.scrubDeep(body)) }),
    });
  }

  // Titen wraps every result as `{ data }` and every failure as `{ error }`.
  private async payload(response: Response) {
    return record(record(await response.json().catch(() => ({}))).data);
  }

  // Titen has no nested scope: a subject is one flat string, so Caraka's
  // workspace/user pair is flattened into it and kept as the source ref, which
  // is the only origin this adapter is given.
  private subject(scope: Scope) {
    return `${scope.kind}:${scope.id}`;
  }

  async observe(e: { scope: Scope; kind: string; text: string; meta?: object }) {
    const response = await this.request("POST", "/v1/observations", {
      subject_id: this.subject(e.scope),
      kind: OBSERVATION_KIND[e.kind] ?? "system_event",
      content: e.text,
      source: { type: "caraka", ref: this.subject(e.scope) },
    });
    if (!response.ok) throw new Error(`Titen observe answered ${response.status}`);
    return String((await this.payload(response)).observation_id ?? "");
  }

  async compile(q: { scope: Scope; task: string; budgetTokens: number }): Promise<CompiledContext> {
    // `/memori` asks for a listing by sending no task, which `local` reads as
    // "the newest rows". Titen answers an empty `task` with
    // `VALIDATION_ERROR "must be a non-empty string"`, so the listing gets
    // words here rather than the command losing its provider.
    const response = await this.request("POST", "/v1/context/compile", {
      subject_id: this.subject(q.scope),
      task: q.task.trim() || LISTING_TASK,
      max_tokens: q.budgetTokens,
    });
    if (!response.ok) throw new Error(`Titen compile answered ${response.status}`);
    const data = await this.payload(response);
    // Judgement call (a). The reply carries its own `instructions` line telling
    // the reader to treat items as untrusted, and Caraka drops it. Two reasons.
    // The `<memory note=…>` wrapper is written by the gateway for every
    // provider, and `local` sends no such line, so a label that appeared only
    // when Titen answered would be a label the agent could not rely on. And the
    // wrapper is the one place in the prompt where a sentence is read as
    // framing: forwarding a string the memory server controls into it hands
    // whoever controls that server the power to relabel the block. Caraka says
    // it in its own words, and Titen saying the same thing is agreement, not a
    // reason to stop saying it.
    // Items are claims, not observations — `claim` carries the text and
    // `claim_id` is what `trace` takes.
    const items = (Array.isArray(data.items) ? data.items : []).map((item: unknown) => {
      const entry = record(item);
      return {
        text: String(entry.claim ?? ""),
        source: `${String(entry.kind ?? "claim")} ${String(entry.claim_id ?? "")}`.trim(),
      };
    });
    return {
      id: String(data.context_id ?? ""),
      items,
      tokensUsed: Number(record(data.budget).used_tokens ?? 0),
    };
  }

  async feedback(contextId: string, outcome: Outcome) {
    // `outcome.note` is dropped: Titen stores an outcome and nothing else, and
    // no caller sends a note.
    const response = await this.request(
      "POST",
      `/v1/context/${encodeURIComponent(contextId)}/feedback`,
      { outcome: outcome.ok ? FEEDBACK_OUTCOME.ok : FEEDBACK_OUTCOME.failed },
    );
    if (!response.ok) throw new Error(`Titen feedback answered ${response.status}`);
  }

  async trace(claimId: string): Promise<Evidence[]> {
    const response = await this.request(
      "GET",
      `/v1/claims/${encodeURIComponent(claimId)}/evidence`,
    );
    if (!response.ok) throw new Error(`Titen trace answered ${response.status}`);
    const evidence = record((await this.payload(response)).evidence);
    // Three stances come back under three keys. `Evidence` has no field for a
    // stance, so it is kept in the source label: dropping it would make an
    // observation that contradicts the claim read as one that supports it.
    return ["supporting", "contradicting", "qualifying"].flatMap((stance) =>
      (Array.isArray(evidence[stance]) ? (evidence[stance] as unknown[]) : []).map((item) => {
        const entry = record(item);
        const source = record(entry.source);
        return {
          id: String(entry.observation_id ?? ""),
          text: String(entry.content ?? ""),
          source: `${stance} ${String(source.type ?? "titen")}:${String(source.ref ?? "")}`,
        };
      }),
    );
  }

  async forget(idOrFilter: string | Filter) {
    // ponytail: Titen 0.7.3 has no bulk purge route, so a Filter deletes
    // nothing; only deletion by id — the path `/lupakan` uses — is wired.
    if (typeof idOrFilter !== "string") return 0;
    const response = await this.request(
      "DELETE",
      `/v1/observations/${encodeURIComponent(idOrFilter)}`,
    );
    if (response.status === 404) return 0;
    if (!response.ok) throw new Error(`Titen forget answered ${response.status}`);
    // A second delete of the same id answers 200 with `already_purged`, so the
    // status alone would report the same row deleted twice.
    const data = await this.payload(response);
    return data.purged === true && data.already_purged !== true ? 1 : 0;
  }
}
