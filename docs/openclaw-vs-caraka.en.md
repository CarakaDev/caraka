# When to use OpenClaw, when to use Caraka

**Product:** Caraka `1.0.0` · **Date:** 8 August 2026 · **Bahasa Indonesia:** [`openclaw-vs-caraka.md`](openclaw-vs-caraka.md)
**Supporting research:** `docs/research/openclaw-arsitektur-openclaw-github-docs.md`, `docs/research/perbandingan-openclaw-hermes-caraka.md`, `docs/research/ringkasan-temuan-dan-rekomendasi.md`
**Who this is for:** anyone choosing between the two, before installing either.

If what you want is an assistant that clears your inbox, keeps your calendar, and occasionally touches code, use OpenClaw. It is mature at that job and Caraka will never compete with it there. If what you want is to finish work in a repository from your phone, through the coding agent already installed on your machine, without installing a new assistant and without paying for tokens twice, that is Caraka.

The OpenClaw figures on this page come from the 7 August 2026 research in `docs/research/`, where each one carries its source and its date. The Caraka figures come from `CHANGELOG.md` and the `1.0.0` source tree.

---

## The jobs are different

Standard Compute puts the categories in one sentence: *"OpenClaw is a personal agent; OpenCode is a coding agent — different tools for different jobs."* Eigent, comparing OpenClaw with Claude Code, reaches the same verdict: the two *"barely overlap"*, and picking the wrong tool for the problem you actually have only wastes time.

OpenClaw is a self-hosted personal AI assistant, MIT licensed, on a Node.js runtime. It brings an agent runtime with its own reasoning loop, its own tool layer running on the host (exec, filesystem, browser, PDF), the ClawHub marketplace with 56,000+ skills, 22 chat channels, and companion apps for iOS, Android, and macOS. Skywork describes the product: *"It doesn't just write code; it clears your inbox, manages your calendar, and executes multi-step workflows autonomously in the background."* Writing code is on that list, but it is not why the product exists.

Caraka does one thing: it connects a chat app to the coding agent already installed on your computer. It has no reasoning loop, no execution tools, no model provider, and no marketplace, and that is deliberate, because your coding agent already has all of it, sandbox and repository context and diff review included. What Caraka adds is only what chat needs: identity, sessions, approval, and an audit trail.

## When OpenClaw is the answer

**You want an assistant that works on its own in the background.** OpenClaw's heartbeat polls proactively, every 30 minutes by default, and there are cron jobs, browser automation, and voice. Those belong to an assistant, and Caraka names them as permanent non-goals. Even a simple cron is only a post-1.0 candidate in `docs/roadmap.md`, and an agent-based heartbeat is refused there as expensive and noisy.

**You need a channel Caraka does not have.** OpenClaw supports 22 channels, among them iMessage, Signal, Slack, and Microsoft Teams. Caraka `1.0.0` has three: Telegram, Discord, and WhatsApp. Signal is a post-1.0 candidate whose entry condition is 20 real requests, and iMessage is on no list at all. Recommending Caraka to someone who needs iMessage today is recommending something that does not exist.

**You are weighing project maturity.** As of August 2026 OpenClaw stands at roughly 385 thousand stars, 81 thousand forks, and 76,834 commits, with its own official deployment platform (OpenClaw Launch) and a far larger community. Caraka is at `1.0.0`, and its entire release history from `0.0.0` to `1.0.0` fits inside two calendar days, 7 and 8 August 2026.

The list of what is unproven in Caraka is more useful than its version number, and all of it is written in the **Limited** section of each release:

- Live verification covers five of the nine agent presets that ship, over six routes: Claude Code on ACP and on its CLI route, Codex and aider on the CLI, goose and opencode over ACP. The runs are what corrected them — two shipped flags the binary rejects. The other four say `# belum diverifikasi` inside their own files: gemini, cursor, and amp answered an ACP handshake and stopped at a paid account, and antigravity has never got past its OAuth window.
- Every Discord check answers a mocked `fetch` and a mocked `WebSocket`, so the real payload shapes and the real 429 behaviour stay unproven.
- No live WhatsApp number was ever linked to this code, and no live Cloud API webhook was ever received.
- The Titen memory adapter has only ever answered a mocked fetch; its routes were read from the Titen v0.7.0 source, a pre-1.0 surface that can move.
- The phase 5 beta gate is still open. Twenty beta developers have not been recruited, so neither of its Definition of Done numbers can be answered by anyone but the people who would use it.
- The core has passed its own ceiling and kept going: 10,552 lines on 19 August 2026 against the ~8,000 written in `AGENTS.md`. v1.0 sat at the line with 7,880; v1.1 went over it, and `AGENTS.md` records every release since with the measurement and what it bought rather than moving the ceiling. One simplification pass gave back 73 lines and a second measured the five folding candidates four specs had promised at 35 lines in the wrong direction.

**You need WhatsApp on a number that matters.** Caraka's `baileys` provider uses an unofficial route, and its own risk page (`docs/whatsapp-risiko.md`) is written so that you can decide against it. The fourteen-day field test that gates phase 6 has not been run. The recommendation that stands today is `cloud-api`, Meta's official route.

## If your coding agent is already on the machine

OpenClaw can already use a coding-agent CLI as a model backend, and its documentation is honest about where that route sits: *"Tools are disabled (no tool calls). Text in → text out… Designed as a safety net rather than a primary path."* For an assistant that carries its own tool layer, that placement makes sense, because the coding agent's tools are not needed there.

For Caraka that route is the whole product. Through ACP, the JSON-RPC protocol created by Zed and co-led by JetBrains with 28+ agents in its registry, the coding agent keeps its own tools, its own sandbox, and its own repository context, and its permission requests (`session/request_permission`) are rendered as buttons in chat. Since `0.4` that route stopped being Claude-shaped: nine presets ship as YAML files, a generic CLI driver runs agents that do not speak ACP yet, and selection falls from ACP to CLI when the adapter is not on the machine. One test loads a preset from a single YAML file and proves a full turn through to the channel without `src/core/` being touched.

What does not come down to the CLI route is the permission hook. ACP sends `session/request_permission` and Caraka renders it as a card; the CLI driver has no equivalent, so on that route the only brake is the agent's own. That is why the codex preset keeps `--sandbox read-only` as a security control, and why `--yes-always` was removed from the aider preset: auto-approval without a sandbox is execution without anyone's consent.

Of OpenClaw's nine large layers, the research behind Caraka found only three needed for this use case: gateway and sessions, the channel adapter, and the driver to the agent. The other six are already provided by the coding agent you use every day.

The difference shows up on the bill. OpenClaw's loop burns tokens outside your coding-agent subscription, and each heartbeat is one full agent turn. Composio, using OpenClaw since January 2026, wrote: *"Agentic tasks consume a massive amount of tokens. And if you want to use it like a personal assistant, the cost will skyrocket pretty fast."* That complaint comes from early 2026 releases and may have improved since; the date is named so you can judge for yourself. Caraka has no loop, so tokens burn only in the subscription you already pay for.

On machine weight, Caraka's figures are targets stated in `docs/prd.md`: package under 15 MB, idle RAM under 80 MB, cold start under 2 seconds, core at or below 8,000 lines. The RAM and cold-start measurement item in phase 0 of the roadmap is unchecked, so the first three are not yet entitled to be called results. The last one is measured and it is missed: 10,552 lines on 19 August 2026, with each overrun recorded in `AGENTS.md`.

## Approval and attack surface

OpenClaw's own README is the clearest source here: *"Treat inbound messages as untrusted input"*, and *"Tools run on the host for the main session unless you configure sandboxing."* Pairing for an unknown sender is approved through the CLI, and users are required to read the security guide, the exposure runbook, and the sandboxing guide before exposing the Gateway. The penetration-test paper against it (arXiv 2605.27042) records that typical deployments enable shell execution, filesystem access, and outbound network I/O by default. That is the fair consequence of an assistant that owns its tools: securing it is the owner's configuration work, and the official guides give the right recipe, including a sender allowlist, a separate WhatsApp number, and the heartbeat turned off until trust is earned.

Caraka takes a structurally different position. It adds no execution surface, because all execution happens inside a coding agent that already has its own sandbox and permission model. What it guards is three gates: who may speak, what may run, what may leave.

The allowlist is mandatory, and the gateway refuses to start when a configured channel has an empty one, naming which. On the ACP route approval arrives only as a signed callback, single-use, bound to principal and session, expiring after ten minutes.

Since `0.6` there is a second form, because WhatsApp has no buttons. The approval card carries a four-character code generated from `randomBytes` server-side, printed on that card and nowhere else, never entering the agent's context or an audit row, and spent through the same `UPDATE … WHERE decision IS NULL` as the button path. What is refused is the word: `yes` is treated as a task rather than a decision, and a code-shaped message is never forwarded to the agent whether it matches or not. The hard rule in `AGENTS.md` was amended in the same change, from "approval never arrives as text" to "approval can never arrive as unauthenticated text", which is what it was always protecting. A channel that has buttons is given no code at all.

A trust window opened from chat runs for at most sixty minutes and is closed by `/lock`, by expiry, or by a restart. Claude's `bypassPermissions` can only be switched on from the terminal. Every outbound message passes the secret scrubber, and the audit table refuses updates and deletes.

On ports, the checkable claim is narrower than "no open ports": **Caraka opens nothing to the internet on its own initiative.** Telegram is pulled over long-polling and Discord holds an outbound WebSocket, so neither needs an inbound port. Two listeners do exist, from `0.5` and `0.6`: the read-only dashboard and the WhatsApp Cloud API webhook receiver. Both bind to `127.0.0.1` unless the operator supplies another address, which prints a warning and writes an audit row before the first connection is accepted. The webhook requires `X-Hub-Signature-256` compared in constant time, loopback included, because another process on the same machine can knock as easily as Meta can. The `baileys` provider opens no listener at all.

The limits are written in `docs/security.md` §12 and are not softened here. Caraka cannot prevent prompt injection outright; all it ensures is that the consequences require a human tap. While a `--bypass` window is open it sees no permission decision at all, so what gets audited is the window. The local dashboard has no authentication, deliberately, so for as long as it runs anyone on that machine who can reach `127.0.0.1` can read it, including a local user with no read permission on the database file. And Caraka cannot stop WhatsApp from blocking your number if you use an unofficial provider.

## One table

| | OpenClaw | Caraka `1.0.0` |
|---|---|---|
| Category | self-hosted personal assistant | chat bridge to an installed coding agent |
| Agent runtime | its own reasoning loop | your coding agent's |
| Execution tools | exec, filesystem, browser, PDF, on the host by default | none |
| Skills / plugins | ClawHub, 56,000+ skills | no marketplace |
| Channels today | 22 | 3 (Telegram, Discord, WhatsApp) |
| Coding-agent CLI route | text-only fallback; `openclaw acp` exists | the main route: ACP, falling to a generic CLI driver |
| Permission hook | its own permission model and sandbox | present on the ACP route; the CLI route leans on the agent's brakes |
| Agents shipped | ClawHub + registry | 7 YAML presets, one validated live (Claude Code) |
| Tokens outside the coding agent | yes: its own loop plus heartbeat | no loop |
| Standing as of August 2026 | ~385k stars, 76,834 commits | `1.0.0`, a two-day release history |

## Use both

Both products are self-hosted, both are designed for a single operator, and by their own industry sources they barely overlap. What you need may well cover both: an assistant for inbox and calendar, and a remote control for the coding agent working your repository. *Different tools for different jobs* runs both ways, and that sentence does not require you to pick one.

If you are still unsure, look at the work you want to hand off this week. If it is inbox, calendar, and background automation, install OpenClaw. If it is your repository, and your coding agent is already logged in at the terminal, install Caraka.
