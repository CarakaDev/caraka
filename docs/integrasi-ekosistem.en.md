# Integration notes: ACP and Titen

**Product:** Caraka `1.2.0` · **Date:** 10 August 2026 · **Bahasa Indonesia:** [`integrasi-ekosistem.md`](integrasi-ekosistem.md)
**Supporting research:** `docs/research/acp-protokol-universal-agentclientprotocol-jetbrains-morph.md`, `docs/research/titen-memory-titen-dev-github.md`
**Who this is for:** the maintainers of ACP and the maintainers of Titen.

Phase 7 in `docs/roadmap.md` asks for contributions back to the two upstream projects Caraka uses. These notes collect what was found up to release `1.2.0`. Files and symbols are named rather than cited by line number, so the references do not rot as the code moves.

Titen is written by the same person as Caraka (`docs/research/titen-memory-titen-dev-github.md` §2). The second half therefore comes from a party who is not neutral, and is better read with that in mind.

---

## ACP

Caraka is an ACP client: `@agentclientprotocol/sdk` 1.3.0 with the Claude adapter pinned at `@agentclientprotocol/claude-agent-acp` 0.63.0 (`package.json`). The surface it uses lives in `src/drivers/claude-acp.ts`: `initialize`, `session/load`, `session/new`, `session/prompt`, `session/set_mode`, `session/cancel`, the `session/update` notification, and the `session/request_permission` request.

Since `0.6` this client serves three chat channels, and one of them has no buttons at all. That changes nothing on the protocol side, but it explains where the client stands in the two requests below: the ACP route is Caraka's only route with a permission hook, and the person who has to answer it is almost never sitting at the machine running the agent.

### A client that refuses every standing permission

Caraka runs the agent on its owner's machine and drives it from chat, so an approval has to stay one decision for one action. That rule is enforced in two places.

The first decides what may appear as a button. `askPermission` in `src/core/gateway.ts` looks for the first option whose `kind` is `allow_once` and whose id is not in the ceding list; when there is none, the request is answered `cancelled` without ever reaching chat. The comment above it records the reason from the field: ExitPlanMode really does send `bypassPermissions` as the first option on a non-root machine.

The second is the last net before an answer goes out. `guardPermission` in `src/core/security.ts` swaps any selected answer whose id is in `cedingOptionIds` (`bypassPermissions`, `acceptEdits`, `auto`, `dontAsk`), or whose `kind` is `allow_always`, for the same request's `reject_once` option. When the request carries no single-use refusal, the answer is `cancelled`. The trust-window path goes through the same gate, so even a window of leniency cannot produce a standing permission. The test `no permission response can cede standing permission` in `test/unit.test.ts` locks the table, including the case of a request that offers only `bypassPermissions` and is therefore answered `cancelled`.

That id list exists because `kind` alone is not enough. In the test table, `auto` is labelled `allow_once` and is still refused, because its id is known. An option that wears the single-use label while storing a permission would pass a client that reads only `kind`.

What this looks like on the wire: the agent offers `allow_always` on every request, this client throws it away on every request, and both sides pay a full round trip for an option whose outcome was already decided. When the agent offers nothing but permission-storing options, the result is `cancelled` and the machine's owner never sees the question.

### Request 1: a way to announce that a client will never store a permission

The protocol has no vocabulary for the behaviour above. A client can refuse `allow_always`, but it cannot say so in advance, so the agent has no way to know the option is wasted.

What is asked for: one client capability flag meaning "this client will never honour a permission that keeps applying". The place for it already exists, since `initialize` sends `clientCapabilities` and Caraka sends it empty. Naming is upstream's business. What needs agreeing is the effect on the agent: stop offering permission-storing options, and always include one `allow_once` alongside one `reject_once` so the request stays answerable.

The value to upstream sits outside Caraka. Any client that runs an agent on behalf of someone who is not at the machine has the same reason to refuse standing permissions, and today every such client has to guess its own list of ids like `cedingOptionIds`. A guessed list will always lag behind an agent that adds a new name.

### Request 2: a shape for spawning an ACP adapter

Up to `0.3`, how Caraka ran the adapter was hardcoded in the driver; `ClaudeAcp.start()` still keeps that path as the fallback when there is no preset. The preset work in `0.4` had to move it into a configuration file, and there was no standard shape to copy. Decision K1 records the search and ends it with a shape of our own: a nested `acp: {command, args[], env{}}` block inside the preset (`done/driver-v04/spec.md` K1, its schema in `presetSchema` in `src/drivers/preset.ts`, its row in `docs/api.md` §1). The nested shape was chosen so that a flat `command`/`args` still means the CLI route, letting one preset carry both routes and letting automatic selection fall from ACP to CLI (`docs/frd.md` FR-DRV-07, example in `presets/agents/claude-code.yaml`).

The evidence that three fields are enough comes from another implementation: vscode-acp talks to nine different agents with nothing but `{command, args, env}` per agent (`docs/research/acp-protokol-universal-agentclientprotocol-jetbrains-morph.md` §5). Every ACP preset Caraka ships now fills it in, and the test `the seven shipped presets load, and every unverified flag says so` refuses an amp, cursor, gemini, or goose preset on the ACP route without `acp.command`.

What is asked for: that the ACP specification name a standard shape for describing how to run a local adapter, even one as small as those three fields. Every client that offers a list of agents today reinvents the same shape, and each reinvention makes an agent configuration file non-portable between clients. Two small things belong with it, because we decided both ourselves with nothing to refer to:

- **Resolving `command`.** An adapter installed as an npm dependency is only found if `node_modules/.bin` is searched alongside `PATH`; that is what `resolveCommand` in `src/drivers/preset.ts` does.
- **The semantics of `env`.** In Caraka the `env` map is layered over the parent environment rather than replacing it, and that parent environment is first stripped of every variable beginning `CARAKA_` (`claudeEnvironment` in `src/drivers/claude-acp.ts`). A specification that says which of the two applies saves the next client one guess.

### The registry JSON as a source for auto-discovery

The research places the registry as a source of version and distribution metadata a client can read to find agents without manual configuration (`docs/research/acp-protokol-universal-agentclientprotocol-jetbrains-morph.md` §3), and FR-SETUP-02 asks for it (`docs/frd.md`).

In `0.4` that read did not ship, and `0.6` has not changed it. `src/discovery.ts` scans `PATH` for seven known binaries, probes `--version`, and caches the result for 24 hours. The file's opening comment states that the registry is deliberately left unread, and the reason is recorded as the withdrawal of AC-9.2 and AC-9.3 at the pre-close review: the metadata read was displayed nowhere, so reading it was dead code at the price of one fetch on every first run (`done/driver-v04/spec.md`, `docs/design.md` §"Penemuan agent"). It comes back together with the `doctor` row that displays it.

The note for upstream comes out of that reason for deferral. The registry is available; what is missing is an answer to the question a local client brings to it: of the binaries already on this machine, which speak ACP, with what command are they run, and which adapter version matches the protocol version we support. A registry carrying a mapping from binary name to the spawn shape of Request 2 would turn reading it into something immediately useful on first run, and the `PATH` scan in `src/discovery.ts` could stop guessing binary names one at a time.

### The risks the research recorded, and where they stand in the code

The risk table in `docs/research/acp-protokol-universal-agentclientprotocol-jetbrains-morph.md` §6 names three things that are still relevant now that the client has actually been built.

**Schema version negotiation.** The planned mitigation was negotiation at `initialize` with a pinned minimum version. What shipped is simpler: the SDK's `PROTOCOL_VERSION` is used as it comes, and an `initialize` failure of any cause is caught as one error, the adapter is shut down, and the run falls to the CLI route (`ClaudeAcp.start()`, test `an adapter that dies during initialize falls back to the preset's CLI route`). The client cannot tell an incompatible protocol version from a broken adapter, so the user is never told which happened. An error that separates the two has to come from the protocol.

**Third-party adapters lagging behind.** The planned mitigation leaned on the registry as the source of version truth, and the previous section explains why that road has not been taken. What is in place instead: one adapter pinned in `package.json`, the rest written into presets and marked unverified inside their own files.

**No cross-agent auth standard yet.** The recorded mitigation was curating the registry down to agents that support `authenticate`. This client never calls `authenticate` at all; the only trace of authentication in the code is a comment in `src/cli.ts` that `initialize` can fail because the agent is not authenticated, and the answer to that is moving to the CLI route. For a client with no editor window, registry curation does not help: what is needed is a way for the agent to say "I need a login" in a form that can be relayed into chat.

---

## Titen

Caraka uses Titen as its default memory provider over HTTP to a local process (`src/memory/titen.ts`). Writing that adapter forced answers to questions the published documentation does not answer, and those answers are below.

### The route mapping as shipped

The `MemoryProvider` interface has five operations (`docs/design.md` §13). What the adapter actually sends:

| Operation | Method and path |
|---|---|
| `observe` | `POST /v1/observations` |
| `compile` | `POST /v1/context/compile` |
| `feedback` | `POST /v1/context/:id/feedback` |
| `trace` | `GET /v1/claims/:id/evidence` |
| `forget` | `DELETE /v1/observations/:id` |

All five are locked by the test `the titen adapter maps its five operations to the documented routes` in `test/unit.test.ts`. The first four follow the table in `docs/research/titen-memory-titen-dev-github.md` §3, copied from `titen.dev/docs/api`. The conceptual mapping is in the same document (§7): Caraka's transcripts and tool events become observations, facts and decisions become claims, memory injected into the prompt becomes context with an explicit budget, and `superseded_by` was dropped from our ERD because `supersede` is already a first-class concept in Titen.

One thing that is not in the published table and only surfaced from a real answer: results are wrapped in `{ data }`. The adapter reads `data` when present and accepts a bare body when it is not. Naming that wrapper on the API page would save the next client one attempt.

### Two routes that are not in the published table

The five-operation table names no way to delete anything. Both routes below were found by reading the Titen v0.7.0 source on 8 August 2026, and the result of that check is recorded in the opening comment of `src/memory/titen.ts`.

`DELETE /v1/observations/:id` deletes one observation. This is the route `forget` uses, and through it the `/lupakan` command in chat. A 404 is read as zero rows deleted.

`POST /v1/claims/:id/revoke` revokes a claim. The adapter does not use it, because that route demands the claim's current version while the ids `observe` hands out are observation ids. As a result, `forget` in Caraka purges observations only, and a claim already derived from that observation is untouched. This deserves a line in Titen's documentation: someone deleting a piece of evidence reasonably expects the conclusion standing on it to go with it.

### An issue for upstream: deletion by filter has no route

**What was expected.** `MemoryProvider.forget` accepts an id or a `Filter` holding `scope` and `kind` (`src/memory/index.ts`). That shape was designed for requests like "forget everything from this workspace", following the same scope `POST /v1/context/compile` already accepts.

**What happens.** Titen v0.7.0 has no bulk delete route, so the adapter returns zero without sending any request at all. A test locks that behaviour: after `forget({ kind: "note" })`, the recorded request count does not grow. The interface accepts a filter, and then the caller receives a zero that means the same thing as "nothing matched". The `local` provider returns zero for a filter for a different reason (`src/memory/local.ts`), so no provider serves this half of the interface. The only caller today, `/lupakan`, always sends a string.

**What a fix would look like.** First option: a delete route accepting the same scope and kind compile already understands, returning the number of records deleted, and stating what happens to claims citing a deleted observation. Second option: if bulk deletion is genuinely unwanted on append-only storage, the API page states that as a decision, so a client can refuse the request honestly instead of returning zero. Either one closes this; what cannot continue is the present state, where the only way to find out is to read the source.

### An issue for upstream: an MCP bridge with no environment answers empty without naming the store it opened

**What was expected.** One subject, one task, two routes, one answer. The MCP tool `titen_compile` passes its arguments through to the `POST /v1/context/compile` handler (`toolCompile` in `src/core/mcp.ts`), so a claim `curl` finds has to be found by the coding agent calling the tool.

**What happens.** On 10 August 2026, against Titen 0.7.3 at `127.0.0.1:8787`, one active claim reading `The caraka repo formats code with oxfmt; prettier is never used.` stood under the subject `caraka`. `POST /v1/context/compile` with `{"subject_id":"caraka","task":"oxfmt prettier","max_tokens":800}` returned one item. Claude Code called `titen_compile` with exactly the same subject and task and received zero items. `claude mcp list` called that bridge Connected with 18 tools visible, and writes through MCP were landing in a store, so the read side is what was suspected for hours.

**How to reproduce.** Titen serves a database holding one claim under the subject `caraka`. Send four JSON-RPC lines to the stdio bridge run without either variable:

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"probe","version":"0"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"titen_compile","arguments":{"subject_id":"caraka","task":"oxfmt prettier","max_tokens":800}}}' \
| env -u TITEN_MCP_URL -u TITEN_API_KEY titen mcp
```

`tools/list` answers 18 tools, `titen_compile` answers zero items with the right `scope.subject_id`, stderr is empty, and the exit code is 0. `curl` to `/v1/context/compile` on the running server answers one item in the same minute.

**How far it has been narrowed.** The server's handler is not involved: `POST /mcp` with `tools/call titen_compile`, the same subject, task, and key, returns one item. Only the stdio process answers empty. `runMcpStdio` (`src/runtime/bun/mcp-stdio.ts`) calls `runLocalMcpStdio` when neither `TITEN_MCP_URL` nor `TITEN_API_KEY` is in the process environment, and that local store is `~/.titen/memory.db`, not the database being served. On the test machine that local store held one observation with the subject `caraka` under `org_local` and zero claims, while the claim being looked for stood in the served database. That session's reads and writes hit a different file from the one `curl` was checking, and no line on either stream said so.

The trigger is host configuration, not Titen. `~/.claude.json` holds a project-scope registration for `/home/ramaaditya/Project/caraka` that runs `titen mcp` with an empty `env`, and it shadows the user-scope registration carrying both variables. The environment was not lost; the narrower entry won. Titen cannot fix that file, but a bridge that names the store it opened makes such layering visible in seconds rather than hours.

**The fix.** Written upstream and on Titen's `main` as `ec7060d`, in no release yet, so the 0.7.3 used above still falls back in silence. It has three parts. `runLocalMcpStdio` prints one line to stderr naming the store it opened along with the two missing variables. The same sentence is appended to `instructions` in the `initialize` result, because stderr ends up in the host's log file and the reader who needs it is the model holding the empty pack. And the bridge's `catch` names the endpoint and the reason, so a revoked key stops reading the same as a dead port. What remains is a design decision rather than a defect: local mode is chosen by the absence of two variables, so a client that means to bridge has no way to ask for a failure instead of a fallback.

### Two installation traps that cost time before the issue above was visible

**Which database is in use is named by one command only.** `titen serve` prints `titen listening on … (database …)` on its first line. `titen bootstrap`, `titen migrate`, and `titen key create` take `--db`, which defaults to a `titen.db` relative to the working directory (`src/runtime/bun/cli.ts`), and nothing warns that the working directory is part of choosing a database. A key created from one directory therefore belongs to a different database from the one being served, and what the client sees is a `401`. This test machine holds 14 `titen.db` files in 14 directories, one from today's work and the other 13 in backup, canary, and benchmark directories from 1–4 August, plus the `~/.titen/memory.db` the environment-less bridge opens.

**`TITEN_MCP_URL` must end in `/mcp` and must carry no credentials.** `endpointFrom` rejects a URL holding a username, password, query, or fragment, and rejects a path not ending in `/mcp`, with the message `TITEN_MCP_URL must be a credential-free HTTP /mcp endpoint`. Setting only one of the two is rejected as well: `set both TITEN_MCP_URL and TITEN_API_KEY to bridge to a served instance, or neither to use the local store`. Both are the right errors, but both happen inside a process the MCP host started, where stderr is not always shown, so what is visible is a bridge entry that fails for no readable reason.

### `compile` selects lexically

Against the same claim on the same server, the task `oxfmt` returns one item, `prettier` one, `oxfmt prettier` one, `formatter` zero, and `which formatter` zero. The claim reads `formats code with oxfmt`, so a word that does not appear in it does not retrieve it. This is not a bug: `/readyz` on that instance reports `fts` `enabled` with `vector` and `embedding` `disabled`, and vector retrieval is configured through the environment. What a client needs to know: Caraka sends the user's message through as the `task` (`compileMemory` in `src/core/gateway.ts`), so a question phrased in words other than the claim's receives empty memory on an instance without embeddings. That a `compile` result depends on the retrieval configuration deserves a line on the `compile` page, not only in `/readyz`.

### The limits of these notes

The Titen half is one day old as field notes. Up to `1.1.2` the adapter had only ever answered a mocked fetch, and the sentence in the `0.3.0` release notes held as written for that whole time:

> The `titen` adapter has only ever answered a mocked fetch; no check in this repository talks to a live Titen. Its routes were read from the Titen v0.7.0 source, a pre-1.0 surface that can move, and `local` keeps working without it.

On 10 August 2026 the adapter was rewritten against a live Titen 0.7.3, and that exercise is what produced the three sections above. The tests in this repository still use a mocked fetch; what changed is that the shape being mocked is now the shape the real server accepts, rather than the shape a document agreed with. One day of contact is not operating experience. 0.7.x is still a pre-1.0 surface (`docs/research/titen-memory-titen-dev-github.md` §2) whose risk of moving has been recorded since the research (§8), so the routes and figures above are the record of one date on one machine, and they do not bind Titen.

The author's closeness cuts both ways. The undocumented routes were found by reading the source, which another integrator would not do, and that means Titen's documentation has not yet been tested by a user who has to survive on its API page alone.

---

## What is not written here, for want of a source

- Titen's behaviour beyond one subject on one machine. Every figure above comes from one test host on 10 August 2026, with `vector` and `embedding` off.
- Whether MCP hosts other than Claude Code layer registrations the same way. Only `~/.claude.json` on one machine was inspected.
- The shape of the ACP registry JSON. The research describes it in prose; there is no example file in this repository.
- Whether ACP upstream has already discussed a "client stores no permission" flag. No file here records a search of upstream issues.
- Whether Titen v0.7.0 has bulk deletion under another name. Only its absence is recorded.
- The shape of a Titen error body. The adapter reads the HTTP status only.
- Permission option `kind` values other than `allow_always`, `allow_once`, and `reject_once`. Only those three appear in this repository.
- `POST /v1/consolidations`. It is in Titen's published table, was never implemented here, and so there is no experience to report.
