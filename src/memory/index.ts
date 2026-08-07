// The v0.2 memory interface, from `docs/design.md` §13 and `docs/api.md` §3.
// Two classes implement it: `TitenMemory` (HTTP adapter) and `LocalMemory`
// (SQLite + FTS5). The third provider, `none`, is the absence of a provider
// object — every gateway seam guards with one `if (!this.memory)` check
// instead of a five-method no-op.

export type Scope = { kind: "workspace" | "user"; id: string };

export type CompiledContext = {
  id: string;
  items: { text: string; source: string }[];
  tokensUsed: number;
};

export type Outcome = { ok: boolean; note?: string };

// Named by the interface but left open in the docs. Kept minimal until a
// caller needs more.
export type Evidence = { id: string; text: string; source: string };
export type Filter = { scope?: Scope; kind?: string };

export interface MemoryProvider {
  observe(e: { scope: Scope; kind: string; text: string; meta?: object }): Promise<string>;
  compile(q: { scope: Scope; task: string; budgetTokens: number }): Promise<CompiledContext>;
  feedback(contextId: string, outcome: Outcome): Promise<void>;
  trace(claimId: string): Promise<Evidence[]>;
  forget(idOrFilter: string | Filter): Promise<number>;
}

// The 500 ms rule (`docs/frd.md` FR-MEM-07): memory never blocks a reply. The
// bound arrives as a parameter, following the repo convention that a time seam
// is a constructor argument, not a faked clock. A late settlement of the inner
// promise lands on an already-settled outer one, so nothing goes unhandled.
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`memory call passed ${ms} ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}
