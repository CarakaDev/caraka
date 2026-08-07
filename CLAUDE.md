# CLAUDE.md

Claude Code reads this file; other agents read [`AGENTS.md`](AGENTS.md). The two do not repeat each other — **read `AGENTS.md` first**, then this.

## Before you change anything

1. [`AGENTS.md`](AGENTS.md) — what this project refuses to build, and why.
2. [`standards/ears.md`](standards/ears.md) — how work starts, gets verified, and closes.
3. [`docs/blueprint.md`](docs/blueprint.md) — the locked decisions.
4. For website work, [`site/AGENTS.md`](site/AGENTS.md).

## The lifecycle is not optional

`spec/` → `plan/` → build → verify → publish → `done/`.

Work that skips the spec produces acceptance criteria written after the fact, which are always the criteria the code happens to meet.

A task that looks too small for a spec gets one anyway; if it really is that small, the spec is four lines and costs nothing. Both files move to `done/` in the same commit as the code.

## The verification gate

```bash
cd site && npm run check && npm run e2e
```

Four commands, all green, output pasted into the plan. "Should work" is not a result. If a check fails and you cannot fix it, say so and leave the task open — a green claim over a red run costs more than the bug did.

## Two things that are irreversible

**This repository is public.** A committed secret is a leaked secret, and rewriting history does not un-leak it. `.gitignore` covers `.env`, `.dev.vars`, `.wrangler/`, and `.npmrc` before anything is staged. There is no `account_id` in `wrangler.jsonc` by design.

**Publishing leaves the machine.** `npm publish` cannot be undone, and a deploy replaces what is live at `caraka.dev`. Both need the owner's go-ahead each time, not once.

## Prose

Everything written here is read by people deciding whether to let this software run commands on their machine. [`AGENTS.md`](AGENTS.md) has the style rules; the short version is that a sentence which restates its heading, a list that is three items because three feels right, or a word like `seamless` costs more trust than it saves effort.
