import { randomBytes } from "node:crypto";
import type { Store } from "../store/db.js";
import type { CompiledContext, Evidence, Filter, MemoryProvider, Outcome, Scope } from "./index.js";

// SQLite + FTS5 and nothing more — no embeddings, no claim graph, no ranking
// beyond FTS5's own (`docs/design.md` §13, FR-MEM-03b). The Store scrubs on
// write, so a secret shape never reaches the `memory_local` rows.

// Six items is the injection default (FR-MEM-06). The interface carries only
// the token budget, so the count bound lives with each provider.
const MAX_ITEMS = 6;

function scopeKey(scope: Scope) {
  return `${scope.kind}:${scope.id}`;
}

export class LocalMemory implements MemoryProvider {
  constructor(private readonly store: Store) {}

  async observe(e: { scope: Scope; kind: string; text: string; meta?: object }) {
    return this.store.memoryInsert(scopeKey(e.scope), e.kind, e.text);
  }

  async compile(q: { scope: Scope; task: string; budgetTokens: number }): Promise<CompiledContext> {
    // Raw task text is not FTS5 query syntax; only its word tokens are passed
    // down. An empty task lists the newest rows, which is what `/memori` asks.
    const terms = q.task.match(/[\p{L}\p{N}_]+/gu) ?? [];
    const rows = this.store.memorySearch(scopeKey(q.scope), terms, MAX_ITEMS);
    // Four characters to a token is an estimate; `local` has no tokenizer to
    // consult, and the budget is honoured against the estimate.
    let tokensUsed = 0;
    const items: CompiledContext["items"] = [];
    for (const row of rows) {
      const tokens = Math.ceil(row.text.length / 4);
      if (tokensUsed + tokens > q.budgetTokens) break;
      tokensUsed += tokens;
      // The source label carries the row id, so `/memori` output is enough to
      // aim `/lupakan` at an item.
      items.push({ text: row.text, source: `${row.kind} ${row.id}` });
    }
    return { id: randomBytes(6).toString("hex"), items, tokensUsed };
  }

  // Outcomes tune recall on Titen's side; `local` has no ranker to tune.
  async feedback(_contextId: string, _outcome: Outcome) {}

  // No claim graph, so no evidence to trace.
  async trace(_claimId: string): Promise<Evidence[]> {
    return [];
  }

  async forget(idOrFilter: string | Filter) {
    // ponytail: only deletion by id is wired — the one path `/lupakan` uses. A
    // Filter deletes nothing until a caller exists.
    if (typeof idOrFilter !== "string") return 0;
    return this.store.memoryDelete(idOrFilter);
  }
}
