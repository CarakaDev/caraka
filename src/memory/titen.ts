import type { createScrubber } from "../core/security.js";
import type { CompiledContext, Evidence, Filter, MemoryProvider, Outcome, Scope } from "./index.js";

// The one file that knows Titen's HTTP surface. Routes follow the table in
// `docs/design.md` §13, checked against the Titen v0.7.0 source on 8 August
// 2026. That check settled the route the table lacks: `forget` maps to
// `DELETE /v1/observations/:id`. Claim revocation exists too
// (`POST /v1/claims/:id/revoke`) but demands the claim's current version, and
// the ids our `observe` hands out are observation ids — so `forget` purges
// observations only.

type Scrubber = ReturnType<typeof createScrubber>;

export class TitenMemory implements MemoryProvider {
  constructor(
    private readonly scrub: Scrubber,
    private readonly endpoint = "http://127.0.0.1:7717",
    private readonly fetcher: typeof fetch = fetch,
    private readonly requestTimeoutMs = 10_000,
  ) {}

  // Nothing else in the process filters an HTTP body, and Titen's SQLite is
  // disk (`docs/erd.md`: no raw secret ever reaches disk) — so each string
  // field is scrubbed before the body is serialized. Scrubbing the serialized
  // JSON instead would break it: the env-var pattern redacts up to the next
  // whitespace, and JSON.stringify emits none, so the match would swallow the
  // quote that closes the value.
  private request(method: string, path: string, body?: unknown) {
    return this.fetcher(new URL(path, this.endpoint), {
      method,
      signal: AbortSignal.timeout(this.requestTimeoutMs),
      ...(body === undefined
        ? {}
        : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
    });
  }

  // Titen wraps results as `{ data }`; a bare payload is accepted as well.
  private async payload(response: Response) {
    const parsed = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    return (parsed.data ?? parsed) as Record<string, unknown>;
  }

  async observe(e: { scope: Scope; kind: string; text: string; meta?: object }) {
    const response = await this.request("POST", "/v1/observations", {
      ...e,
      text: this.scrub(e.text),
    });
    if (!response.ok) throw new Error(`Titen observe answered ${response.status}`);
    const data = await this.payload(response);
    return String(data.observation_id ?? data.id ?? "");
  }

  async compile(q: { scope: Scope; task: string; budgetTokens: number }): Promise<CompiledContext> {
    const response = await this.request("POST", "/v1/context/compile", {
      ...q,
      task: this.scrub(q.task),
    });
    if (!response.ok) throw new Error(`Titen compile answered ${response.status}`);
    const data = await this.payload(response);
    const items = (Array.isArray(data.items) ? data.items : []).map((item: unknown) => {
      const entry = (item ?? {}) as Record<string, unknown>;
      return { text: String(entry.text ?? ""), source: String(entry.source ?? "titen") };
    });
    return {
      id: String(data.context_id ?? data.id ?? ""),
      items,
      tokensUsed: Number(data.tokensUsed ?? 0),
    };
  }

  async feedback(contextId: string, outcome: Outcome) {
    const response = await this.request(
      "POST",
      `/v1/context/${encodeURIComponent(contextId)}/feedback`,
      outcome.note === undefined ? outcome : { ...outcome, note: this.scrub(outcome.note) },
    );
    if (!response.ok) throw new Error(`Titen feedback answered ${response.status}`);
  }

  async trace(claimId: string): Promise<Evidence[]> {
    const response = await this.request(
      "GET",
      `/v1/claims/${encodeURIComponent(claimId)}/evidence`,
    );
    if (!response.ok) throw new Error(`Titen trace answered ${response.status}`);
    const data = await this.payload(response);
    const list = Array.isArray(data) ? data : Array.isArray(data.evidence) ? data.evidence : [];
    return list.map((item: unknown) => {
      const entry = (item ?? {}) as Record<string, unknown>;
      return {
        id: String(entry.id ?? ""),
        text: String(entry.text ?? entry.content ?? ""),
        source: String(entry.source ?? "titen"),
      };
    });
  }

  async forget(idOrFilter: string | Filter) {
    // ponytail: Titen v0.7.0 has no bulk purge route, so a Filter deletes
    // nothing; only deletion by id — the path `/lupakan` uses — is wired.
    if (typeof idOrFilter !== "string") return 0;
    const response = await this.request(
      "DELETE",
      `/v1/observations/${encodeURIComponent(idOrFilter)}`,
    );
    if (response.status === 404) return 0;
    if (!response.ok) throw new Error(`Titen forget answered ${response.status}`);
    return 1;
  }
}
