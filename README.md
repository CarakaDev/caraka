# ꦕꦫꦏ caraka

**Send the task. Caraka runs it.**

Caraka connects Telegram to the coding agent already installed on your machine. Every task lives in its own topic — like tabs in a terminal — with approvals, streaming progress, and memory that can explain itself.

[![npm](https://img.shields.io/npm/v/caraka?style=flat-square&labelColor=05080C&color=E2452C)](https://www.npmjs.com/package/caraka)
[![license](https://img.shields.io/badge/license-MIT-8EEE98?style=flat-square&labelColor=05080C)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A522-E2452C?style=flat-square&labelColor=05080C)](https://nodejs.org)

🇮🇩 [Baca dalam Bahasa Indonesia](README.id.md)

> **Status: pre-alpha.** The specification is complete and public; implementation is starting. There is nothing useful to install yet. The npm package currently reserves the name. Follow the [roadmap](docs/roadmap.md) — Phase 0 is a technical spike, not a release.

---

## What it is

Coding agents are locked to one terminal on one machine. Caraka is the missing transport — a thin bridge, not another assistant.

It has **no agent loop, no tools, no model provider, and no plugin marketplace.** Your coding agent already has all of those, and its versions are better: real sandboxing, repo context, diff review, git awareness. Caraka adds only what chat needs — identity, sessions, approvals, memory, and audit.

```
        Telegram (private chat = workspace)
        ├── 📋 General                            ← control
        ├── 🔵 toko-api · rate limit login   #a91  ← session = topic = "tab"
        ├── 🟡 toko-api · dependency audit   #a92  ← waiting for your approval
        └── 🟢 web · hero revision           #a85  ← done, closed
                        │
                  ┌─────▼─────┐
                  │  caraka   │  identity · router · topics
                  │           │  policy · approval · memory · audit
                  └─────┬─────┘
                        │ ACP (Agent Client Protocol)
                        ▼
              your coding agent — runtime, tools, sandbox, model
```

## Why it's small

One protocol does the heavy lifting. [ACP](https://agentclientprotocol.com) is the LSP-equivalent for coding agents: JSON-RPC 2.0 over stdio, created by Zed, co-led by JetBrains, with 28+ agents in its registry. Writing **one** ACP client covers nearly all of them — including agents that do not exist yet.

ACP also ships `session/request_permission`, so the approval system is not something Caraka invents. It renders the protocol's own permission requests as buttons in your chat.

## Sessions are tabs

Since 2026, Telegram bots can create forum topics **in a private chat, with no admin rights at all.** That turns a DM with your bot into a tabbed workspace at zero setup cost.

One session = one topic. Caraka names it, colours its icon by state (🔵 running · 🟡 needs you · 🟢 done · 🔴 failed), posts a closing summary, and closes it. The topic list becomes a status board you can read at a glance without opening anything.

Where topics are unavailable, Caraka falls back to linear mode with a `[workspace · #id]` header. Nothing hard-fails.

## Memory that can explain itself

Caraka uses [Titen](https://titen.dev) — open-source agent memory that never flattens a conclusion into its evidence. Observations carry content hashes, claims cite the observations they came from, and context records exactly what the agent was handed and what the budget cut.

Claim extraction is **deterministic — no model in the loop.** Memory works without an LLM by default. Every claim traces back to its source, so *"why does it think that?"* always has an answer.

Titen and Caraka are written by the same author. Two Javanese-named projects: one remembers, one is sent.

## Safe by default

Caraka connects untrusted input (chat) to code execution on your machine. It is deliberately boring out of the box:

- Allowlist is **mandatory** — the gateway refuses to start without one
- Default mode is `assisted`: writes and commands require approval
- Approvals come from **signed, single-use callbacks with a TTL** — chat text can never approve anything
- Groups are read-only; sensitive output is sent as ephemeral messages visible only to you
- Binds to `127.0.0.1`; Telegram uses long-polling, so no port is ever exposed
- Secrets are scrubbed from every outbound message and every log line
- Model API keys are never touched — those belong to your coding agent

Read the [threat model](docs/security.md) before connecting anything.

## Philosophy

**Caraka** (ꦕꦫꦏ, Javanese: *envoy*) is the first word of the Javanese script, from the legend of Aji Saka's two loyal servants:

> ꦲꦤꦕꦫꦏ · *hana caraka* — there were two envoys
> ꦢꦠꦱꦮꦭ · *data sawala* — they disagreed
> ꦥꦝꦗꦪꦚ · *padha jayanya* — they were equally strong
> ꦩꦒꦧꦛꦔ · *maga bathanga* — both became corpses

Both obeyed perfectly. Both were right according to the instructions they held. Both died — killed not by disloyalty but by **loyalty without context**: two orders that collided, no way to verify, and no human between them at the moment it mattered.

That is why this project has approvals, provenance-backed memory, and an audit trail. See [docs/brand.md](docs/brand.md).

## Documentation

| | |
|---|---|
| [blueprint.md](docs/blueprint.md) | One-page overview and locked decisions |
| [session-model.md](docs/session-model.md) | Sessions as topics: lifecycle, routing, housekeeping |
| [design.md](docs/design.md) | Architecture, interfaces, protocols |
| [security.md](docs/security.md) | Threat model and controls |
| [install-flow.md](docs/install-flow.md) | Setup in under three minutes |
| [roadmap.md](docs/roadmap.md) | Phases and decision gates |
| [research/](docs/research/) | Eight sourced research documents |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Vulnerabilities go to `security@caraka.dev` — see [SECURITY.md](SECURITY.md).

## License

MIT — see [LICENSE](LICENSE).

---

`halo@caraka.dev` · [caraka.dev](https://caraka.dev)
