# Changelog

All notable changes to this project are recorded here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-08-08

The version number, and not one capability that was not already running under it. Every phase in `docs/roadmap.md` carries shipped code at the same time, which is what the number says. It says nothing about use: every field gate in that document is still open, and each was moved past this release by the owner's decision on 8 August 2026 with the date written beside it.

### Added

- `docs/openclaw-vs-caraka.md`, with an English copy beside it. The comparison phase 7 asked for, written so that choosing OpenClaw is a conclusion it offers rather than one it argues against.
- `docs/integrasi-ekosistem.md`, with an English copy beside it: what this client needed from ACP and from Titen, what it could not say in the protocol's own vocabulary, and which half of that pair comes from an author who also writes the other one.
- English copies of the pages an English reader was until now sent to in Indonesian — `docs/faq.en.md`, `docs/install-guide.en.md`, `docs/security.en.md`, `docs/troubleshooting.en.md`. Seven documents under `docs/` now carry an English pair; thirty-eight do not, and that includes every architecture decision record and every research document.
- Every runtime string that named a document now prints its address on GitHub instead of a repository path, and the English catalogue points at the English copy. `docs/` is not in the package's `files` list, so the reconnect message and both risk warnings had been sending an installer to a path that exists only for someone who cloned the repository.
- The pre-release checklist in `docs/security.md` §13 answered against the code as it stands rather than against the audit that filled it in when the version still read 0.2. Nine of its thirteen rows are met, and each names the test that fails when the claim stops being true. Four are deferred with the date and with what has to happen to close them: the incoming-text parsers have no fuzz corpus, `splitMarkdown` can hand a channel a chunk past the channel's own limit, `npm audit` runs on no schedule and never sees the optional Baileys peer, and the shipped-defaults claim has no policy-mode gate on the run path to rest on. The thirteenth row is new and arrived already deferred: the seeded corpus found the splitter bug while proving something else.
- Measurements in `docs/roadmap.md` and `docs/techstack.md` where both files carried estimates: cold start, peak RSS, idle RAM, `caraka doctor`, the tarball, and the tree an install actually leaves on disk, each with the machine and the command it was read from. Two of them miss goal G3 in `docs/prd.md`. Idle RAM is 94,324 kB against a target of 80 MB, and `node -e ''` alone accounts for 42 MB of it. An install with `--omit=dev` occupies 309,248,851 bytes against a target of 15 MB, of which 275,013,181 bytes is the Claude Agent SDK platform binary that arrives through the ACP adapter. The published tarball is the part that meets the target.

### Changed

- Repeated code across the gateway, the dashboard, the store, the config loader, and the two push channels folded into named helpers, with no behaviour moved along with it. `src/` drops from 7,996 lines to 7,880 against the ~8,000 ceiling in `AGENTS.md`.
- CI gained a second job that runs the site's lint, type check, and unit tests. The site's Playwright suite stays a per-machine command, for the same reason the agent smoke does: the runner has no browsers to give it and a workflow that pretends otherwise is worth less than no workflow.

### Limited

- **No field gate in this project has been answered by a human, the author included.** There was no dogfood week, no five recorded setup sessions, no memory A/B across twenty tasks, no cohort of twenty beta developers, and no fourteen days on a real WhatsApp number. Each was moved past its release by the owner's decision on 8 August 2026 and written into `docs/roadmap.md` with that date beside it, rather than ticked. Reaching 1.0 says the code for every phase landed and passes the checks this repository can run. Whether any of it survives a day on someone else's machine is not known.
- Discord, WhatsApp, and Titen have only ever answered mocks and fixtures. No Discord bot token, no WhatsApp number, no Cloud API webhook, and no running Titen process has ever been used from here, so the real payload shapes, the real 429 behaviour, the real pairing flow, the ban behaviour, and Titen's live routes are all unproven. Telegram with Claude Code over ACP is the one path that has been driven end to end by a person.
- Six of the seven presets are transcribed rather than run. Claude Code is the only agent ever started against a live binary on this machine, and only through its ACP route, so goal G2 in `docs/prd.md` (≥ 15 agents covered) is not met.
- Phase 7 asked for the WhatsApp risk page and for a route to it on caraka.dev. The page has been in both languages since v0.6, because the error refusing `provider: baileys` links it; the site route is not built, so the page is reachable from the repository and from that error message and nowhere else.
- The npm registry still holds 0.2.1. Every release since is tagged in this repository and unpublished, because `npm publish` is the owner's command.
- There has been no third-party security audit, and this line stays until there is one.

## [0.6.0] — 2026-08-08

A third channel, and the first one that cannot show a button. WhatsApp arrives as another implementation of the contract Discord already answered, so what this release actually builds is the two things that seam left unanswered: how a permission is granted where there is nothing to press, and how a bridge behaves on a network that bans numbers for behaving like one.

### Added

- `src/channels/whatsapp.ts`, the third `Channel`, with both providers behind one `id`. No method was added to the interface, and `src/core/` holds no comparison against `channel.id` and no literal `"whatsapp"` — the same grep that guards Discord guards this.
- Linear mode cost nothing. The channel declares `caps.threads: false` and `header()`, already called at nine outbound sites, writes `[ws · #id]` in front of every reply. `/status` in a conversation without threads names every session that conversation is holding, capped at the five most recent so the answer does not grow with the transcript.
- `caps` gains a fourth field, `edit`, and its reader in the same change. Where it is false the progress path is off entirely: the first ack still goes out and nothing follows it until the result. The Cloud API has no edit endpoint, so `cloud-api` declares it false and `baileys` declares it true. `rich`, `files`, `typing`, and `ephemeral` stay undeclared, because core still asks about none of them.
- Approval on a channel with no buttons. The card carries a four-character code over a 32-symbol alphabet, generated from `randomBytes`, stored on the approval row, and printed on the card and nowhere else. It never appears in an audit row, a log line, or a prompt. Spending it takes the same `UPDATE … WHERE decision IS NULL` as the button path, bound to `(principal, session, request)` with the same ten-minute TTL. What is refused is the word: `yes` is a task, not a decision, and a code-shaped message is never forwarded to the agent whether it matches or not. A channel that has buttons is given no code at all.
- Two bounds around that code. Five wrong codes from one principal close the code route for that session until the pending question is decided or expires, said once rather than on every message, and the counter runs only while a question is waiting. Five undecided approvals per session is now a ceiling rather than a plan: the sixth request is cancelled without a card and the refusal goes to the audit. That row was specified in `docs/security.md` §9 from the beginning and is what the code's entropy argument rests on — five live codes out of 2^20 at a time.
- Hard rule 2 in `AGENTS.md` and FR-CHAN-02 in `docs/frd.md` were amended in the same change, and `spec/v10.md` AC-5.3 with them. The rule now reads "approval can never arrive as unauthenticated text", which is what it was always protecting. ADR-0009 carries the argument.
- The five ban mitigations as code that can fail. Every WhatsApp send passes through one function, and no caller can reach a transport around it: it enforces a rolling ceiling of 12 messages per 60 seconds with the excess queued rather than dropped, a uniform random gap of 1,200–3,500 ms, and a refusal to write to any number that has not written first and is not on `allowFrom`. `allowFrom` is `.min(1)` as on every other channel, and `provider: baileys` without `acknowledgeRisk: true` stops start with a message linking the risk page.
- `docs/whatsapp-risiko.md` and `docs/whatsapp-risiko.en.md`: what is known about bans, where each figure comes from, what its population actually was, which detection signal Caraka answers in code and which one it cannot answer at all, and when Cloud API is the right answer instead. The page is written so that deciding against `baileys` is a conclusion it offers.
- `@whiskeysockets/baileys` as an exact-version **optional peer dependency**, not a dependency and not an `optionalDependency` — npm installs the latter by default, which would drag its transitive tree into every Telegram-only install. Direct runtime dependencies stay at four. One file, `src/channels/whatsapp-baileys.ts`, names the module, and it is reached only through `await import()` behind the provider switch. A missing module is one sentence carrying the exact install command and the pinned version, with no stack trace.
- The Cloud API webhook receiver on `node:http`, bound to `127.0.0.1` unless `caraka start` is given another address, which prints a warning and writes an audit row before the first connection is accepted. `X-Hub-Signature-256` is mandatory and compared in constant time, loopback included, because another process on the same machine can knock as easily as Meta can. A body past its size bound is cut before it is read, and every other path and method answers 404. Provider `baileys` opens no listener at all.
- The Baileys auth state is treated as a credential, not as session state: `~/.caraka/secrets/whatsapp/` at directory mode 0700 with files at 0600, beside the token, verify token, and app secret the Cloud API needs. `caraka doctor` reports all four as their own lines, and every token the process loads is seeded to the scrubber as an exact secret.
- Reconnect with a ceiling and an end. Five seconds doubling with full jitter, capped at 300 seconds, and six attempts before the channel stops, writes an audit row, and raises the operator's sentence out of `updates()`. The counter returns to zero only after a connection has held for 60 seconds, so a link that connects and drops cannot reset it forever. A logged-out or 401 answer is never retried once — repeated reconnects after a logout are the reported way to lose the account — and the message names deleting `~/.caraka/secrets/whatsapp/` as the way back.
- Group messages are refused in `receive()`. On the linked-device protocol a group names itself as the sender, so every member would arrive as one principal and every member would read the approval code on the same card. The readiness message says so rather than letting someone discover it.

### Limited

- No live WhatsApp number was ever linked on this machine, and no live Cloud API webhook was ever received. Every check answers a fake transport, an injected `fetch`, a stand-in for the Baileys module, or a real listener on port 0 — so the real payload shapes, the real pairing flow, the real ban behaviour, and Meta's real webhook envelope stay unproven. This is the same posture as the printed-untested service units in 0.2.0 and the mocked Discord surface in 0.5.0.
- Because the Baileys peer is optional, CI never installs it. `npm audit` does not see it, and a breaking change in its API would not surface from this repository. What holds the line is the pinned exact version and an error message that names it.
- `caraka init whatsapp` is not built. A `whatsapp:` block is written by hand and Cloud API credentials are written by hand into `~/.caraka/secrets/`, with no verification call before they are used. Three acceptance criteria stay unmet and are recorded as unmet in `done/whatsapp-v06/`.
- The consequence of that is worth stating on its own: the risk warning is unskippable but late. Start refuses `baileys` without `acknowledgeRisk: true` and prints the separate-number warning on every start, so nobody runs it unwarned — but the warning arrives after the operator has already written the decision into the config rather than before.
- Most of the numbers in this release are spec-set rather than measured. The outbound ceiling and the jitter band, the code's four characters and its five-attempt limit, the backoff base, its 300-second ceiling, six attempts and the 60-second stability window, the five sessions `/status` names, and `maxChars` 4096 all come from `spec/whatsapp-v06.md` §7 with the reasoning beside each. Only the 30-second progress interval, the ten-minute TTL, and the five pending approvals trace to a document. Each one lives in the code as one named constant whose comment points back at the spec.
- Two flows core still sends with buttons — the workspace chooser and `/yolo` — are dead ends on WhatsApp. Core reads `caps.buttons` at the approval site and not at those two, so the cards arrive with nothing to press.
- Groups are unsupported and there is no `allowChats` in the `whatsapp:` block, because no room can reach this channel for a second list to gate. The `MEDIA:<path>` attachment convention is still absent on every channel, so a long answer travels as a `.md` file and nothing else is attached.
- The OS keychain is still not used on any channel; a 0600 file remains the store, as `docs/security.md` §6 has always said it would be where no keychain is available.
- `src/` stands at 7,996 lines against the ~8,000 line ceiling in `AGENTS.md`. That is the line, not room below it, and phase 7 does not fit until something is removed.
- The field half of the phase 6 gate stays open. Fourteen days of real use on a separate number with no ban and no manual relink cannot be answered from a repository, and it moved past the release by owner decision on 8 August 2026, the same shape as phases 3, 4, and 5. Until it is answered, the recommendation the risk page already gives stands: `cloud-api` if the number matters to you.

## [0.5.0] — 2026-08-08

A second channel and a page to watch it from. Discord proves the `Channel` seam was real rather than a name, and `caraka dashboard` reads the database the gateway writes without being allowed to change it.

### Added

- A `Channel` contract in `src/core/channel.ts`, named from the twelve methods the gateway already called rather than from the `onMessage`/`onChoice`/`send` sketch the specification carried. Updates stay an async generator that `Gateway.run()` drives in one line, so a channel that pushes bridges into a generator inside its own adapter.
- `caps` with three fields — `threads`, `buttons`, `maxChars` — because three are all core has anything to ask about. Without `buttons` a permission request is refused and audited; it never falls back to chat text. `maxChars` decides how much of the progress tail survives, so the newest output is what stays.
- One Gateway holding a list of channels. Allowlists and the operator are maps keyed by `channel.id`, and the run slot stays keyed by workspace slug, so one workspace still runs one task at a time no matter which channel asked.
- `src/channels/discord.ts` on the built-in `fetch` and Node's global `WebSocket`: no new dependency, and the module is imported only when a `discord:` block exists in config. Gateway identify, heartbeat, resume, backoff reconnect, a half-open socket closed rather than left to hang, and a fatal close code that stops instead of retrying.
- One public thread per Discord session, `auto_archive_duration` 10080, the state glyph in the thread name, and `archived: true` after the closing summary. Archiving is never claimed to free quota, because Discord counts archived threads against the active limit; the limit arrives as a thrown error and that container falls to linear mode.
- Thread capability on Discord is detected by catching that error, not by creating and deleting a test thread. The marker lives in the existing `meta` table and `doctor` clears it.
- Approval on Discord with the primitive untouched: the same 33-character signed payload travels as `custom_id`, the deferred ack is sent before core touches the database, and components are disabled at the same fork that clears a Telegram keyboard. A Discord role authorises nothing.
- Caraka asks Discord for no privileged intent, so the text of an ordinary message never arrives. The readiness message says that in as many words and names what does arrive: a slash command, and a button on a card Caraka sent.
- An optional `discord:` config block, additive with `version` still 1. `telegram:` became optional in the same shape, and start refuses when no channel is configured or when a configured channel has an empty `allowFrom`, naming which.
- `caraka dashboard [--port n] [--bind addr]`: seven read-only panels — sessions, runs, approvals, audit, policy, memory, beta — served from `127.0.0.1:7718` with the database opened `readOnly`. Anything other than GET or HEAD is refused before a query runs, every statement is a literal with bound parameters, and a request whose `Host` is not a loopback literal is refused so a web page cannot read a panel as its own origin.
- Runs and the beta numbers are derived from the audit log rather than from new tables. Setup time is the first `gateway.start` to the first `msg.in`; activation is a `run.finish` that ended a turn within 24 hours. The opt-in is on sharing the two numbers, not on collecting them — the audit log is a mandatory control and was never optional.
- htmx is vendored to `assets/dashboard/htmx.min.js` and served by the page itself. The page contacts no third-party origin and works with no network at all.
- Two leaks closed. `claudeEnvironment()` stopped removing one variable name and now removes every key beginning `CARAKA_`, so the next channel's token cannot escape the way this one would have. The scrubber learned the shape of a Discord bot token, which the Telegram and JWT patterns both missed.

### Limited

- No live Discord credential was ever used on this machine. Every Discord check answers a mocked `fetch` and a mocked `WebSocket`, which leaves the real payload shapes, the real 429 behaviour, and the real permission set unproven. This follows the same posture as the printed-untested service units in 0.2.0 and the credential-free CI matrix in 0.4.0.
- The dashboard has no authentication, deliberately and not by omission. While it runs, anyone on that machine who can reach `127.0.0.1` can read it, including a local user with no read permission on `~/.caraka/caraka.db`. Loopback is not an authentication boundary; the real boundary is the file mode, and the dashboard widens it for as long as it is up.
- `caraka init discord` is not built. A `discord:` block is written by hand today, and `saveConfig` writes the token file at mode 0600. The wizard is the remaining step of `done/discord-v05/plan.md`.
- The dashboard's htmx swap has never been watched in a real browser with the CSP live. What is checked automatically: every anchor carries `hx-get`, `hx-target`, and an `href` to the same path, an `HX-Request` returns the fragment alone, and every panel carries `hx-trigger="every 10s"`.
- Role to policy-mode mapping on Discord (FR-AUTH-06) is not built, and the reason is not time. No policy-mode gate exists on the run path for any channel, so mapping a role to `read-only` would promise a refusal that does not happen. The `grup (default) read-only` row in `docs/security.md` §5 is marked as design rather than build for the same reason.
- Embeds, attachments, and a typing indicator are still absent on both channels. A long Discord answer past three pieces travels as one `.md` file; everything else is plain markdown.
- A Discord session's route is stored as a namespaced `chat_id` rather than a `channel` column, so no query can filter by channel without matching a prefix. The column arrives with the first reader that genuinely needs it.
- Both human halves of the phase gate stay open: twenty beta developers have not been recruited, and neither DoD number — 60% first message within 24 hours, zero unapproved executions — can be answered by the author. Both moved past the release by owner decision on 8 August 2026.

## [0.4.0] — 2026-08-08

Seven agent presets and more than one workspace. The driver layer stops being Claude-shaped, and a test now proves that adding an agent is one YAML file.

### Added

- An `AgentDriver` interface named from the surface the gateway actually uses. The Claude ACP adapter and the new CLI driver both implement it, core reads its own update and permission types, and the ACP SDK import is gone from `src/core`.
- `presets/agents/`, holding seven presets — claude-code, codex, gemini, cursor, goose, amp, aider — validated by a strict schema of only the fields the code reads. An invalid file is named with its failing field and skipped while the rest load. An ACP preset carries its spawn as `acp: {command, args, env}`, and one preset may carry both routes.
- A generic CLI driver: it spawns the preset's command in the session's workspace, sends the prompt as an argument or over stdin past `maxPromptArgChars`, parses `json`, `jsonl`, or `text` output, finds the agent-side session id through `sessionIdFields`, and cancels with SIGTERM then SIGKILL after five seconds. The whole answer arrives as one text update.
- Driver selection per run: ACP when the preset's adapter resolves and survives initialize, the CLI route when it does not, otherwise an error naming the agent and the next step. `workspaces[].driver` forces one route and never tries the other.
- More than one workspace: an additive `workspaces[]` list in config, `@slug` in front of a message routes it and sticks as the chat's default, and a button chooser asks when several workspaces exist and none is sticky. A v0.3 database gains the two session routing columns through a guarded ALTER and keeps its rows.
- One active run per workspace, the rest queued FIFO per workspace with the ack numbered. `/stop` cancels the run of the sender's workspace only; shutdown cancels them all.
- `/switch <preset id>` moves a session to another loaded preset on its next task, and `/ws` lists workspaces, answering in General. Neither hardcodes any agent's mode names.
- Discovery scans PATH for the seven known binaries and caches the result for a day; `doctor` forces a rescan and draws one row per discovered agent. `init` now needs any one agent found rather than Claude specifically.
- The repository's first CI workflow: the four gate commands, every preset through the loader's schema, and the recorded parser fixtures.

### Limited

- Live verification still covers Claude Code only. The codex flags are copied verbatim from the documented block but were never run here, and the gemini, cursor, goose, and amp ACP commands plus every aider flag are transcribed from research, marked `# belum diverifikasi` inside their files.
- CI runs no live smoke: the runners hold no agent binary and no credentials, so the workflow validates schemas and parser fixtures and says so instead of faking a matrix. Smoke stays `npm run smoke`, per machine.
- The CLI route has no permission hook and no streaming. Approval on that route falls to the agent's own brakes — codex keeps `--sandbox read-only`, and aider's `--yes-always` was removed because auto-approval without a sandbox is execution without anyone's consent.
- A CLI session's agent-side thread id lives in process memory; after a gateway restart the next turn starts a fresh agent thread.
- The human half of the phase gate — someone adding an agent without asking a question — stays open, moved past the release by owner decision on 8 August 2026.

## [0.3.0] — 2026-08-08

Memory. What a run leaves behind rides in front of the next prompt, and its failure never blocks a reply.

### Added

- A `MemoryProvider` interface with three providers: `titen`, an HTTP adapter for a local [Titen](https://titen.dev) process; `local`, SQLite + FTS5 inside Caraka's own database with no embeddings; and `none`. A config file from before v0.3 reads as `local`.
- Compiled memory is injected in front of the prompt as a labelled data block, at most 6 items in 800 tokens. The bound is enforced on what the provider returns, not only passed to it, and `<memory` markers inside recalled text are stripped — recalled data cannot close the block and pose as instruction.
- Every run feeds memory back: the user's prompt and the agent's output become observations when the run ends, tool-call titles as they arrive, and the injected context receives its outcome. When the output's observation id returns within the time bound, the reply closes with `Memory saved: <id>`.
- Chat commands `/ingat <text>`, `/lupakan <id>`, and `/memori`, accepted from any topic and answered in General when topics are on.
- Degradation: a compile that fails or outlives 500 ms is skipped, audited as `memory_degraded`, and the run continues. Text bound for a provider passes the secret scrubber field by field before it leaves the process.
- The wizard offers to install Titen after pairing; declining, or a failed install, writes `provider: local` and finishes as usual. `doctor` probes Titen's `/health` when configured and says so when the memory endpoint is not loopback, because memory data then leaves the machine.

### Limited

- The `titen` adapter has only ever answered a mocked fetch; no check in this repository talks to a live Titen. Its routes were read from the Titen v0.7.0 source, a pre-1.0 surface that can move, and `local` keeps working without it.
- On `titen`, `forget` by filter deletes nothing, because v0.7.0 has no bulk delete route. Deleting by id works.
- The wizard's install command was not run while closing this release, and no automated test covers `init` or `doctor`.
- The phase's A/B across twenty tasks stays open, moved past the release by owner decision on 8 August 2026.

### Changed

- A session's topic now wears its state as a leading glyph in the name — `▸` running, `⏸` awaiting approval, `✓` done, `✗` failed, `⊘` cancelled — renamed on every transition through the one path that also writes the row, so the name cannot disagree with the database. `icon_color` is set once at creation, because `editForumTopic` cannot change it afterwards.

## [0.2.1] — 2026-08-08

Both fixes came out of live testing in a real group, not review.

### Fixed

- Single-use cards now clear their buttons. The approval path did this; `confirmTrust` and group pairing did not, so a pairing card kept working-looking buttons after it had been answered. The clear moved to the callback fork, after the principal check, so a member outside the sender allowlist still cannot wipe the operator's card.

### Added

- A readiness report after group pairing, repeated by `/status` in any non-private chat. Privacy mode stays on by design, so Telegram delivers only commands addressed to the bot, replies to its own messages, and service messages — an ordinary group message never arrives. That was documented but never said to the operator, so a working bot read as a broken one. The report also states whether topics are available, and that granting the rights they need makes the bot an admin, which makes it receive every message in the group.

## [0.2.0] — 2026-08-07

Groups, a trust window, service units, and a second interface language.

### Added

- Allowlisted groups: a chat allowlist and a sender allowlist that must both match, with pairing confirmed by a signed button in the operator's DM and the disclosure stated on the card.
- `/commands`, `/usage`, `/yolo <duration>`, and `/lock`, bringing the registered set to eight.
- A Caraka trust window opened by `/yolo`: one workspace, a mandatory duration capped at sixty minutes, closed by `/lock`, expiry, or restart. Permission requests are still received, the high-risk list still stops for a button, and every automatic decision is audited.
- `caraka service --print` writes a systemd, launchd, or schtasks unit to stdout. It installs nothing, has no `postinstall` hook, and never prints `sudo`.
- English and Indonesian interfaces, chosen once at `init` and never inferred from a message.
- `caraka stop`, a PID file, a twenty-message-per-minute rate limit, and a thirty-minute run limit.

### Limited

- `bypassPermissions` remains reachable only from the terminal, through `caraka trust --bypass`. No chat path reaches it.
- The launchd and schtasks units are printed but untested on their platforms.

## [0.1.0] — 2026-08-07

First usable preview for one private Telegram operator and Claude Code.

### Added

- `init`, `doctor`, and `start` commands with one-time Telegram pairing.
- Claude ACP initialize, new/load session, prompt streaming, permission requests, and cancellation.
- Optional private-chat topics with automatic linear-mode fallback.
- Signed, principal-bound, session-bound, single-use approval callbacks with a ten-minute TTL.
- Mode-`0600` token storage, outbound secret scrubbing, and append-only SQLite audit.
- Rich Telegram results with plain-text fallback and code-fence-aware splitting.
- English and Indonesian install docs plus a safe prompt for Codex or Claude to assist installation.
- Unit, mock Telegram e2e, package, and authenticated Claude ACP smoke checks.

### Limited

- One operator, bot, workspace, and Claude Code adapter.
- Foreground process only. Groups, services, memory, attachments, and other coding agents remain roadmap work.

## [0.0.0] — 2026-08-07

Name reservation on npm and the initial public specification.

[0.4.0]: https://github.com/CarakaDev/caraka/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/CarakaDev/caraka/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/CarakaDev/caraka/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/CarakaDev/caraka/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/CarakaDev/caraka/compare/v0.0.0...v0.1.0
[0.0.0]: https://github.com/CarakaDev/caraka/releases/tag/v0.0.0
