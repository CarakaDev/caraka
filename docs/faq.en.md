# FAQ

**Bahasa Indonesia:** [`faq.md`](faq.md)

The questions that keep coming up before anyone dares to install. The long answers are in the documents linked from here.

---

## Basics

**What is Caraka?**
A bridge from Telegram to the coding agent already installed on your machine. You send the task from chat, your agent does the work, Caraka carries it and reports back.

**How is it different from OpenClaw and Hermes?**
Both are personal assistants whose skills happen to include writing code. Caraka only works on repos. Standard Compute puts it briefly: *"OpenClaw is a personal agent; OpenCode is a coding agent — different tools for different jobs."* Details in `research/perbandingan-openclaw-hermes-caraka.md`.

**Why the name Caraka?**
Javanese for messenger, and the first word of the Javanese script. Its legend is about two messengers who died over instructions that collided without context. That is also exactly the failure mode of an autonomous agent holding permissions. More in `brand.md`.

**Is it usable yet?**
Not yet. The specification is complete and open, the implementation has only started. The npm package right now just holds the name.

---

## Prerequisites and cost

**What if the machine has no Node.js?**
Install it first, version 22 or newer. The per-operating-system commands are in `install-guide.md` §3. Without Node there is no `npx` either.

**What if I have no coding agent at all?**
Install one, then run `caraka init` again. The free one: `npm i -g @google/gemini-cli`, 1,000 requests a day at no cost.

**Does Caraka cost money?**
No. MIT, and it never asks for a card. The cost that may show up is the cost of your coding agent, and that applies the same whether you use Caraka or not.

**How much does the coding agent cost?**
Gemini CLI is free at 1,000 requests/day. Claude Code is not in a free tier at all, starting at $20/month. Codex CLI is free with limited access on ChatGPT Free, paid from $8/month. Figures as of August 2026, full table in `install-guide.md` §5.

**Does Caraka add to the token bill?**
No. We have no agent loop, so there is no second set of tokens. This is the clearest thing that sets it apart from a personal assistant running its own reasoning loop.

**Do I need a model API key?**
No. Caraka never asks for, stores, or sends a model API key. That is your coding agent's business.

---

## How it works

**Which agents are supported?**
Through ACP: 28+ agents including Claude Code, Codex, Gemini CLI, Cursor, Cline, Goose, Amp, Copilot CLI, Devin. The ones without ACP go through the CLI driver. The ones living inside an IDE go through the MCP inbox.

**Can I use more than one agent?**
Yes. They are all registered, and you switch with `/switch <agent>` per workspace.

**Why Telegram first?**
An official Bot API with no ban risk, long-polling so there is no open port, and the only platform that lets a bot create a topic in a private chat without admin rights. That is what makes tabbed sessions possible with no setup at all.

**Which channels are running?**
Three. Telegram; since v0.5 Discord, one public thread per session in a text channel with a state glyph in the thread name and a button-bearing approval card that stays bound to the principal who owns the session; and since v0.6 WhatsApp, one to one, linear mode with headers, two providers behind a single config block. A Discord role never confers approval authority. All three use the same `Channel` interface, and core does not know which channel is answering. Signal is not scheduled.

**Why does WhatsApp have no buttons?**
WhatsApp has no callback buttons like Telegram and Discord, so its approval card carries a four-character code and only a reply of `ok <code>` or `no <code>` decides it. What decides is not the word `ok` — it is the code, and that code is generated server-side, appears only on the card Caraka wrote, never enters the agent's context, and works once. Prompt injection can produce the word "yes"; it cannot produce a code it has never seen. Details in ADR-0009.

**Can my WhatsApp number get banned?**
Yes, if you pick the `baileys` provider. It joins a real account as a linked device over a reverse-engineered protocol, and that breaks WhatsApp's ToS. Caraka enforces four mitigations in code — a mandatory `allowFrom`, an outbound ceiling, a random gap, and a refusal to write to a number that has never written first — but none of them guarantees anything. Read `docs/whatsapp-risiko.md` before installing, and use a number you can afford to lose. The `cloud-api` provider is Meta's official route and carries none of this risk.

**Ordinary message content on Discord does not reach the bot?**
Correct, and that is on purpose. Caraka does not ask for the privileged `MESSAGE_CONTENT` intent, for the same reason Telegram's privacy mode stays on: this bot does not need to read people's conversations to do the work. What reaches it is slash commands and the buttons on cards Caraka sent itself. That sentence is shown once in a newly paired channel, rather than buried here.

**Why is one session one topic?**
In a terminal you open a tab. Chat forces five jobs into one stream. Topics bring the tab model back, and the icon colour turns the topic list into a status board. Details in `session-model.md`.

**What if topics are unavailable?**
Linear mode: every reply is prefixed `[workspace · #id]`. It does the same job in a denser shape. Nothing hard-fails.

**Can it run on a VPS?**
Yes, but your repo has to be there too. Caraka is designed for the machine where the code lives. `install-guide.md` §10.

---

## Security

**Can the agent delete my code?**
The default mode is `assisted`: every file write and every command stops and asks for approval through a button. High-risk actions such as force-push and `rm -rf` always ask for confirmation, even in `trusted` mode.

**What if someone sends a malicious command to the bot?**
The allowlist is mandatory, and the gateway refuses to run without it. An unknown sender gets a neutral reply and their request is recorded. Pairing is approved from the terminal only.

**What about prompt injection?**
An approval is always a single-use secret bound to `(principal, session, request)`: a signed callback where the channel has buttons, and a code printed only on the card where it has none. No ordinary word is ever a decision, so malicious text cannot approve itself.

**Can my secrets leak into chat?**
The outbound scrubber runs on every message and every log line. The shapes it knows are the table in `docs/security.md` §6: private key blocks, Telegram bot tokens, Discord bot tokens, JWTs, the prefixes `sk-ant-`, `sk-proj-`, `ghp_`, `github_pat_`, `xox[baprs]-`, `AKIA`, and any line whose name ends in `_TOKEN`, `_SECRET`, `_PASSWORD`, `_API_KEY`, or `_PRIVATE_KEY`. That last row is a variable name and not a file: `DATABASE_URL=postgres://user:pw@host/db` is not redacted. A secret with no shape at all — an old OpenAI key that is `sk-` followed by anything, or the forty characters of an AWS secret access key — is covered only by exact seeding.

**Is a port open to the internet?**
Caraka opens nothing to the internet on its own initiative. Telegram is long-polled, and the two listeners that exist — the read-only dashboard and the WhatsApp Cloud API webhook receiver — bind `127.0.0.1` by default. That webhook verifies `X-Hub-Signature-256` in constant time, on loopback too. Leaving loopback takes an explicit operator decision, printed and audited.

---

## Memory

**What is Titen, and is it required?**
An open source memory agent that keeps evidence, conclusions, and context apart. It is not required. If it is not installed, Caraka falls back to the `local` provider, which is deliberately shallow, or you turn memory off entirely.

**Does memory need an LLM?**
No. Titen's claim extraction is deterministic, with no model in the loop.

**Can I see what is remembered?**
`/memori` to list, `/lupakan <id>` to delete, and every claim can be traced back to the evidence it came from.

**What if memory goes down?**
Replies keep working. `recall` times out at 500 ms and carries on without memory. Memory is allowed to lower the quality of an answer, never to block it.

---

## The project

**What is the licence?**
The code is MIT. The brand assets are not: the logo and the name may be used to refer to this project, not to imply official endorsement. A fork must use its own name.

**Can I contribute?**
Yes. The most valuable and the lightest: add an agent preset, one YAML file with no core code. See `CONTRIBUTING.md`.

**Why is there no plugin marketplace?**
It is a security decision as much as a complexity decision. OpenClaw users report a large plugin ecosystem with a poor experience, and a registry is a supply chain surface. Extension happens only through YAML presets and MCP servers you install knowingly.

**What if I need feature X?**
It is tested with one question: can the coding agent already do it? If yes, the answer is no.
