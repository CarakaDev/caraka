# AGENTS.md

Instructions for coding agents working on this repository. Human contributors should read [CONTRIBUTING.md](CONTRIBUTING.md) first; everything here applies to both.

## What this project is

Caraka is a bridge from a chat app to the coding agent already installed on the user's machine. Telegram came first, Discord landed in v0.5, and WhatsApp in v0.6; all three speak the same `Channel` contract. It has no reasoning loop, no execution tools, no model provider, and no plugin marketplace, on purpose.

Before writing code, read `docs/blueprint.md` and the phase you are working in from `docs/roadmap.md`.

## The rule that governs every change

> **Does the coding agent already do this?** If yes, we do not build it.

Proposals that add an agent loop, execution tools, a model abstraction, or a plugin registry will be declined however well implemented.

Two more constraints shape every review:

- **Complexity budget.** A new feature must either remove something or keep the core under ~8,000 lines. v1.1 broke this rule and the number is recorded rather than the ceiling moved: `src/` measured 8,349 lines on 8 August 2026, against 7,880 at v1.0. A simplification pass returned 73 lines and stopped where a normalised block scan stopped finding repetition. Raising the ceiling because we crossed it is how a budget stops being one.

  The debt grew again rather than being paid. On 10 August 2026 `src/` measures 8,498 lines, +149 from rewriting `src/memory/titen.ts` against a live Titen, making `caraka doctor` prove a credentialed call, and breaking a tie in `activeGrant` that let two trust windows opened in the same millisecond be chosen between at random. Most of it is not logic: the adapter's header block records the exact rejection each wrong field caused, because the previous version was 111 lines that agreed with a document and with nothing the server accepts, and six of the six lines the tie-break cost are the comment explaining why one word of SQL is there. Comments that stop a wrong shape from being written a second time are the last thing this budget should buy back.

  On 13 August 2026 `src/` measures **8,808 lines**, 808 over the ceiling. `workspace-dari-chat` added 262 of them, measured against the 8,546 the tree held when it started, six above the number the line below records. The estimate written into its spec before the code was ~100, and the gap is where the four preconditions turned out to live: a workspace path that is canonical where it becomes a grant key, a `caraka trust` that refuses a path no config names, a session slug that no longer resolves to the first workspace and inherits its trust window, a containment predicate `docs/security.md` §7 had promised since v1.0 with nothing behind it, and a `/lock` that stopped answering "no window is open" while every window stayed open. The feature on top of them is the path form in the operator's DM and the signed card that writes the entry. Fourteen of the lines are seven catalog pairs, and the comments carry the readings that made three earlier readings of these paths wrong. No deletion paid for it: each of the four candidates — the shared fetch-with-retry, `Channel.getMe()` with no caller in `src/core/`, the twin PRAGMA scans, the three memory command openers — belongs to another concern, and a PR that fixes a bug and refactors is two PRs. The ceiling stays ~8,000.

  On 13 August 2026 `src/` measured **8,540 lines**, +42 from `spawn-windows`. It bought a crash: the one `spawn` in the tree with no `"error"` listener, which Node throws and which ended `caraka start` on any operating system before the fall to the CLI driver could run, and a `resolveCommand` that answered "exists on disk" where the question was "can be spawned" — on Windows those differ, and the npm shim it returned was the file that cannot. Four things went out with it: the `node_modules/.bin` branch, the second PATH walk in `discovery.ts`, the `realpathSync` that undid the first one's answer, and a `ponytail:` comment whose upgrade path CVE-2024-27980 had already closed. Eighteen of the 42 lines are comment, holding the libuv and npm facts that made two earlier readings of this bug wrong. The ceiling stays ~8,000, and the next feature owes 540 lines or a removal.

  On 13 August 2026 `src/` measures **9,412 lines**, 1,412 over the ceiling. `lampiran-chat` added 487 of them, measured against the 8,925 the tree held when it started. Its spec estimated ~185, and the gap is almost all declaration and comment rather than logic: four channels' wire shapes had to be named before anything could be read off them — nine Telegram media slots behind one shared file type, five Cloud API slots, five Baileys slots, and Discord's `attachments` with the reason a guild message may not be read from it — and the four sentences that carry a refusal each cost their comment. The feature itself is small: a photo no longer dies at a guard that asked whether the text was empty when the question was what kind of payload arrived, and an image reaches the agent as bytes on the ACP route or as `-i <path>` on the codex one. One deletion paid part of it, the `target()`/`route()` pair Discord and WhatsApp had each written out, now one pair in `core/channel.ts`. The five verified removals `spec/lampiran-chat.md` names were left where they are: a PR that fixes a bug and refactors is two PRs. The ceiling stays ~8,000.
- **Graceful degradation.** Nothing hard-fails when a capability is missing. Topics unavailable falls back to linear mode. Memory down still replies. ACP absent falls back to the CLI driver. A rejected rich message falls back to MarkdownV2.

## Repository map

```
src/core/        channel.ts (the contract) gateway.ts security.ts status.ts driver.ts
src/channels/    one flat file per channel: telegram.ts discord.ts whatsapp.ts (signal later)
                 plus whatsapp-baileys.ts, the only file that names the optional peer
src/drivers/     acp/ cli/ mcp/
src/memory/      titen/ local/ mcp/
src/store/       db.ts migrations/
src/dashboard/   the read-only local page: server.ts queries.ts render.ts
presets/agents/  one YAML per coding agent
assets/dashboard/ the page's CSS and the vendored htmx, shipped in the package
docs/            specification, research, brand
design/mockups/  the ten .dc.html design comps — the visual source of truth
site/            the caraka.dev website (Astro, static)
standards/       how work is written and closed here
spec/ plan/      work in flight
done/            work that shipped or was cancelled, with the reason
```

Dependency direction is one-way: `channels → core ← drivers`. A channel never imports a driver, and a driver never imports a channel. `src/dashboard/` sits on the same side as a channel: it imports `src/core` and `src/store`, and nothing in `src/core` imports it.

## How work moves

Every change follows [`standards/ears.md`](standards/ears.md): `spec/` → `plan/` → build → verify → publish → `done/`. Acceptance criteria are written in EARS, so each one names its trigger and can fail.

Nothing is "done" because it looks done. The gate is `npm run verify`, which runs `npm run scan:secrets` before `npm run lint`, `npm run typecheck`, `npm test`, `npm run e2e`, and the build. The scanner reads every tracked file against a fixed list of credential shapes, so a secret in a shape it does not carry still reaches the repository and the diff still has to be read. Prose has no tool at all and is checked against the *Writing style* section below. Paste the command output into the plan before moving it to `done/`.

## The website

`site/` is Astro, static, no UI framework, and no server. The mockups in `design/mockups/` decide how it looks; the docs decide what it says. Read [`site/AGENTS.md`](site/AGENTS.md) before touching it — the mockups rely on a design-comp runtime that does not exist in a browser, and the port has exact rules for replacing it.

## Hard rules

1. **Core never branches on `channel.id`.** Read `channel.caps` and degrade. Adding an `if (channel.id === "telegram")` to core is a design error, not a shortcut. Using the id as identity — a map key, a stored route prefix — stays fine; a test greps for the comparison and fails on it. Until v0.5 there was one channel and the rule passed inside a vacuum, so the grep proved nothing.
2. **Approval can never arrive as unauthenticated text.** A signed, single-use callback with a TTL, bound to `(principal, session, request)`. Since v0.6 a channel with no buttons decides through the card's short code, which is the same class of thing: generated from `randomBytes` server-side, printed on the card Caraka wrote and nowhere else, never in the agent's context, single-use against the same `UPDATE … WHERE decision IS NULL`. What is refused is the word — no `yes`, no `approve`, nothing an injected prompt could produce. A channel that has buttons carries the decision in the callback and is given no code at all.
3. **`trusted` mode must expire, and `bypassPermissions` is terminal-only.** The expiry is the database's promise: `CHECK(mode <> 'trusted' OR expires_at IS NOT NULL)` in `src/store/db.ts`. Terminal-only never was — the same table's `CHECK(granted_by IN ('config', 'cli', 'chat'))` names `chat` on purpose, and `/yolo` has written it since v0.2. What is terminal-only is `agent_mode = 'bypassPermissions'`, and what holds it there is the number of callers that write it: one, in `src/cli.ts`, with a test that reads every file under `src/` and fails on a second. This rule said "enforced by a database constraint" of both halves until 13 August 2026; adding the missing CHECK means rebuilding a STRICT table, which is the numbered migration ledger a `ponytail:` comment in `db.ts` defers, so the sentence was corrected instead of the schema.
4. **Secrets are scrubbed before they touch disk or a chat.** The outbound scrubber runs on every message and every log line.
5. **Adding a coding agent on the CLI route is one YAML file** in `presets/agents/`. If it needs core code, the abstraction is wrong.
6. **Ring geometry in the mark is written in px.** Percentage margins resolve against container width, which puts the ∞ pair off-centre.
7. **Colour is never the only signal.** Every status carries its glyph, because `done` and `cancelled` sit at ΔE 2.5 under deuteranopia.

## Writing style

Documentation and user-facing strings follow [seng-jelas](https://github.com/RamaAditya49/seng-jelas). In short: no rule-of-three lists, no negative parallelism, no lines that restate the heading, sparing em-dashes, no signposting, no vague attribution, no significance inflation, and none of the machine-prose vocabulary (`seamless`, `robust`, `leverage`, `unlock`, `crucial`).

Errors shown to users name what happened and what to do next. Never a stack trace in chat.

## Tests

Anything touching approval, policy, secret scrubbing, or session routing needs a test. These are the paths where a mistake is expensive.

```bash
npm test          # unit
npm run lint      # oxlint + oxfmt
npm run smoke     # per-agent, requires the agents installed
```

## Pull requests

One concern per PR. A PR that fixes a bug and refactors is two PRs. Update the affected document under `docs/` in the same PR: the specification is not decoration, and a change that contradicts it is a change to it.

AI-assisted contributions are welcome. You are responsible for understanding and standing behind what you submit.
