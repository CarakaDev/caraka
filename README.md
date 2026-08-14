<p align="center">
  <img src="assets/banner.svg" width="100%" alt="caraka — send the task, Caraka runs it">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/caraka"><img src="https://img.shields.io/npm/v/caraka?style=flat-square&labelColor=05080C&color=E2452C&label=npm" alt="npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-8EEE98?style=flat-square&labelColor=05080C" alt="MIT"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%E2%89%A522-E2452C?style=flat-square&labelColor=05080C" alt="node >= 22"></a>
  <a href="https://agentclientprotocol.com"><img src="https://img.shields.io/badge/protocol-ACP-FF7A5E?style=flat-square&labelColor=05080C" alt="ACP"></a>
  <a href="docs/roadmap.md"><img src="https://img.shields.io/badge/status-v1.0-FFD67E?style=flat-square&labelColor=05080C" alt="v1.0"></a>
</p>

<p align="center">
  <a href="https://caraka.dev"><b>caraka.dev</b></a> ·
  <a href="docs/blueprint.md">Blueprint</a> ·
  <a href="docs/install-guide.md">Install</a> ·
  <a href="docs/security.md">Threat model</a> ·
  <a href="docs/roadmap.md">Roadmap</a> ·
  <a href="README.id.md">🇮🇩 Bahasa Indonesia</a>
</p>

> **v1.0.** Telegram, Discord, and WhatsApp reach the coding agent on your machine over one contract, with seven agent presets, memory, more than one workspace, and a read-only dashboard on loopback. Four of the seven agents have been run here against a live binary, no Discord credential and no WhatsApp number has ever been used here, and not one field gate has been answered by anyone, the author included. Attachments are still absent. The npm registry holds 0.2.1 until the owner publishes.

---

## What it is

Coding agents are locked to one terminal on one machine. Caraka is the missing transport — a thin bridge, not another assistant.

It has **no agent loop, no tools, no model provider, and no plugin marketplace.** Your coding agent already has all of those, and its versions are better: real sandboxing, repo context, diff review, git awareness. Caraka adds only what chat needs — identity, sessions, approvals, and audit.

<p align="center">
  <img src="assets/flow.svg" width="100%" alt="Telegram topics to caraka to your coding agent">
</p>

<details>
<summary>Same thing, as plain text</summary>

```
        Telegram (private chat = workspace)
        ├── 📋 General                            ← control
        ├── ▸ toko-api · rate limit login   #a91  ← session = topic = "tab"
        ├── ⏸ toko-api · dependency audit   #a92  ← waiting for your approval
        └── ✓ web · hero revision           #a85  ← done, summary posted
                        │
                  ┌─────▼─────┐
                  │  caraka   │  identity · router · topics
                  │           │  policy · approval · audit
                  └─────┬─────┘
                        │ ACP (Agent Client Protocol)
                        ▼
              your coding agent — runtime, tools, sandbox, model
```

</details>

## Install

### Ask your coding agent to install it

Paste this into whichever coding agent runs on the machine that holds the repository. It checks the prerequisites, installs what is missing, and is written so the agent never asks you to send the Telegram token through chat.

```text
Install Caraka for the repository in my current working directory.

Read https://github.com/CarakaDev/caraka first. Verify Node.js 22 or newer,
Git, and that you yourself are installed and signed in. Fix only missing
prerequisites without changing my repository.

Never ask me to paste, reveal, or repeat the Telegram bot token in chat, command
output, logs, or a committed file. Tell me to create a bot with @BotFather, then
hand me this command to run myself in a local terminal:

  npx caraka init --workspace "$PWD"

After I confirm init is complete, run `npx caraka doctor`, explain failed
checks, and start it with `npx caraka start`. Do not enable a webhook, open a
port, install a service, or change your own model or provider configuration.
```

The agent narrates each step and waits for you to approve it, so read what it proposes before you say yes. Create the bot token with [@BotFather](https://t.me/BotFather), and do not paste it into an issue or into an AI chat.

Any coding agent can do the installing. What Caraka then runs is one of the seven it has a preset for, signed in, on Node.js 22+ with Git. Claude Code, Codex, aider, and goose are the ones verified here.

Some coding-agent clients can hold an interactive terminal open for the wizard. If yours cannot, run the one `init` command yourself and let the agent continue with `doctor` and `start`. That boundary is what keeps the token out of the conversation transcript.

### Or run the commands yourself

Everything the prompt does can be done by hand:

```bash
claude auth status
npx caraka init
npx caraka doctor
npx caraka start
```

`init` validates the bot token through Telegram, opens a one-time pairing link, asks for confirmation in the terminal, then stores the token outside `config.yaml` in a mode-`0600` file.

Enable topic mode for the bot in BotFather if you want one Telegram topic per session. Where topics are unavailable, Caraka keeps working in linear mode with a session header.

Installing globally is optional:

```bash
npm install --global caraka
caraka init
caraka start
```

## Using it

Send ordinary text to give the agent a task. Thirteen commands cover the rest:

| | |
|---|---|
| `/new [title]` | start a fresh session in this conversation, title optional |
| `/status` | report the state of this conversation's session |
| `/stop` | cancel the running task |
| `/ws` | list the workspaces and their paths |
| `/switch <preset>` | run this session on another agent preset |
| `/commands` | list the commands the agent reported |
| `/usage` | report the context and cost the agent reported |
| `/ingat <note>` | save a note to memory |
| `/lupakan <id>` | delete a memory item by its id |
| `/memori` | list what memory holds for this workspace |
| `/yolo <duration>` | open a Caraka trust window for a stated duration |
| `/lock` | close the trust window now |
| `/help` | explain how to send a task |

Permission requests arrive as **Allow once** and **Reject** buttons. Each callback is signed, bound to the chat principal and the session, expires after ten minutes, and works once. Where a channel has no buttons at all — WhatsApp — the card carries a four-character code Caraka generated and printed nowhere else, spent once against the same database update. A plain word is never a decision on any channel.

## Why it's small

One protocol does the heavy lifting. [ACP](https://agentclientprotocol.com) is the LSP-equivalent for coding agents: JSON-RPC 2.0 over stdio, created by Zed, co-led by JetBrains, with 28+ agents in its registry. Writing **one** ACP client is what keeps the door open to the rest of them, and adding an agent on the CLI route is one YAML file in `presets/agents/` rather than a change to the core. Seven presets ship; three of them are transcribed from research and have never been run here.

ACP also ships `session/request_permission`, so the approval system is not something Caraka invents. It renders the protocol's own permission requests as buttons in your chat.

## Sessions are tabs

Since 2026, Telegram bots can create forum topics **in a private chat, with no admin rights at all.** That turns a DM with your bot into a tabbed workspace at zero setup cost.

One session = one topic. Caraka names it, marks its state with a glyph in the name (▸ running · ⏸ needs you · ✓ done · ✗ failed · ⊘ cancelled), and posts a closing summary. The icon colour is chosen when the topic is created — Telegram's `editForumTopic` can change a topic's name and emoji afterwards, but not its colour. The topic list becomes a status board you can read at a glance without opening anything.

Discord maps the same session to one public thread. WhatsApp has neither, so the same task runs in linear mode behind a `[workspace · #id]` header, and `/status` there names the five most recent sessions the conversation is holding.

## Safe by default

Caraka connects untrusted input (chat) to code execution on your machine. It is deliberately boring out of the box:

- Private chats and an explicit allowlist are **mandatory** — the gateway refuses to start without one
- Writes and commands require approval; an approval is a **single-use secret with a TTL**, bound to the principal, the session, and the request — a signed callback where the channel has buttons, a code on the card where it has none — so chat text can never approve anything
- Nothing is opened to the internet on its own. Telegram is long-polled, Discord and the WhatsApp `baileys` provider hold outbound sockets, and both listeners bind `127.0.0.1` unless you say otherwise: `caraka dashboard` serves a read-only page and answers GET only, and since v0.6 the WhatsApp Cloud API webhook checks `X-Hub-Signature-256` in constant time even on loopback
- The bot token and the approval key are separate mode-`0600` files under `~/.caraka/secrets/`
- Every outbound message and every audit entry passes through the secret scrubber
- The SQLite audit table rejects updates and deletes
- Model API keys are never touched — those belong to your coding agent

Read the [threat model](docs/security.md) before connecting a sensitive repository.

## Philosophy

**Caraka** (ꦕꦫꦏ, Javanese: *envoy*) is the first word of the Javanese script, from the legend of Aji Saka's two loyal servants:

> ꦲꦤꦕꦫꦏ · *hana caraka* — there were two envoys
> ꦢꦠꦱꦮꦭ · *data sawala* — they disagreed
> ꦥꦝꦗꦪꦚ · *padha jayanya* — they were equally strong
> ꦩꦒꦧꦛꦔ · *maga bathanga* — both became corpses

Both obeyed perfectly. Both were right according to the instructions they held. Both died — killed not by disloyalty but by **loyalty without context**: two orders that collided, no way to verify, and no human between them at the moment it mattered.

That is why this project has approvals and an audit trail. See [docs/brand.md](docs/brand.md).

## What v1.0 does not give you

**Proof that it works for anyone else.** Every phase of [roadmap.md](docs/roadmap.md) carries shipped code, and every phase still holds a gate that no repository can answer: a week of daily use, five recorded setup sessions, an A/B across twenty tasks, twenty beta developers, fourteen days on a real WhatsApp number. Each one was moved past its release by the owner's decision, with the date written down, rather than ticked. Reaching 1.0 says the code landed; it says nothing about use.

**Live verification of most of the surface.** Four of the seven presets have answered a live binary here — Claude Code on both its routes, Codex and aider on the CLI, goose over ACP — and every one of the four needed the run: two of them shipped flags the binary rejects, and one shipped a security control that had silently stopped applying. The other three got as far as an ACP handshake here and no further, because a full turn needs a paid account nobody here has, and all three say `belum diverifikasi` inside their own files. No live Discord credential and no WhatsApp number has ever been used: every check on both answers a fake transport.

**Attachments**, and an MCP inbox for IDE agents. Both are still specified and not built.

**Memory** did ship, at v0.3, through [Titen](https://titen.dev) — agent memory that never flattens a conclusion into its evidence, with deterministic claim extraction and no model in the loop — or through a local SQLite provider, or not at all. Titen and Caraka are written by the same author: one remembers, one is sent. The Titen adapter answered a live Titen 0.7.3 for the first time on 10 August 2026, and every field it sent was wrong: it had only ever been checked against a mock that agreed with the same wrong document. What it does today is write. Reading back needs claims, which nothing here creates, so a `provider: titen` install stores observations and recalls nothing.

Three things that did ship carry a condition worth knowing.

**Groups.** Adding a group to the allowlist means choosing to show that work to its members: approval cards, file paths, diffs, and command output are readable by every member. Telegram's ephemeral replies cannot hide them — they only work for 15 seconds after a qualifying action, or if the bot is a chat admin, and Caraka never asks to be one. What stays closed is the decision: an approval button is only valid from an account on the sender allowlist, so other members can read a card without being able to answer it.

Privacy mode stays on, which is why an ordinary message in a group never reaches the bot. Address it — `/new@yourbot …` — or reply to one of its own messages. Turning that off, or granting the admin rights that group topics require, makes the bot receive every message in the group. Caraka never asks for either; `/status` in a group reports which of them is in force.

**WhatsApp.** The unofficial `baileys` provider links a real account as a device, and WhatsApp bans accounts for behaving like automation. Caraka answers four of the five known signals in code — a mandatory `allowFrom`, a ceiling of twelve messages a rolling minute, a random gap between sends, and a refusal to write first to any number — and the fifth is not ours to answer. Choosing it stops `start` until you write `acknowledgeRisk: true`. Read [docs/whatsapp-risiko.md](docs/whatsapp-risiko.md) first; if the number matters to you, the answer there is Cloud API.

**Background services.** `caraka service --print` writes a systemd, launchd, or schtasks unit to stdout for you to install yourself. Caraka never installs one, has no `postinstall` hook, and never prints the word `sudo`.

## Verify from source

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run e2e
npm run smoke   # five live runs: Claude Code over ACP and over its CLI route,
                # codex, aider, goose. Each step skips when its binary is absent
```

## Documentation

| | |
|---|---|
| [install-guide.md](docs/install-guide.md) | Setup, step by step |
| [install-with-ai.md](docs/install-with-ai.md) | The prompt above, and why it is shaped that way |
| [blueprint.md](docs/blueprint.md) | One-page overview and locked decisions |
| [session-model.md](docs/session-model.md) | Sessions as topics or threads: lifecycle, routing, housekeeping |
| [design.md](docs/design.md) | Architecture, interfaces, protocols |
| [security.md](docs/security.md) | Threat model, controls, and the pre-release checklist |
| [whatsapp-risiko.md](docs/whatsapp-risiko.md) | Ban risk, where each figure comes from, and when to pick Cloud API |
| [openclaw-vs-caraka.md](docs/openclaw-vs-caraka.md) | When to use OpenClaw instead |
| [roadmap.md](docs/roadmap.md) | Phases, decision gates, and the field gates moved past the release |
| [research/](docs/research/) | Thirteen sourced research documents |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Vulnerabilities go to `security@caraka.dev` — see [SECURITY.md](SECURITY.md).

## License

MIT — see [LICENSE](LICENSE).

---

`halo@caraka.dev` · [caraka.dev](https://caraka.dev)
