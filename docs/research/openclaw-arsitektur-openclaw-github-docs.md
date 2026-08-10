# Riset: Arsitektur OpenClaw (dan kenapa terasa "berat")

**English:** this document is Indonesian only, and stays that way because it is research kept as provenance for a decision already made. English documentation starts at [`../../README.md`](../../README.md).

**Tanggal riset:** 7 Agustus 2026
**Sumber utama:**
- https://github.com/openclaw/openclaw (README, repo tree)
- https://docs.openclaw.ai + mirror https://openclawlab.com/en/docs
- arXiv: "Security, Privacy, and Ethical Risks in OpenClaw" (2605.23330)
- arXiv: "ClawMobile: Rethinking Smartphone-Carakaic Systems" (2602.22942)
- arXiv: "Foundations for Agentic AI Investigations from the Forensic Analysis of OpenClaw" (2604.05589)
- arXiv: "Lessons from Penetration Tests on Large-Scale Agent Systems" (2605.27042)
- DigitalOcean: "What is OpenClaw?"

---

## 1. Apa itu OpenClaw

OpenClaw (sebelumnya Clawdbot → Moltbot) adalah **personal AI assistant self-hosted** buatan Peter Steinberger, dikembangkan oleh OpenClaw Foundation (non-profit), lisensi MIT, runtime Node.js. Per Agustus 2026: ±385k stars, ±81k forks, 76.834 commits, pnpm monorepo.

Positioning resminya: *"assistant, on your devices, in your chats"* — dirancang untuk **satu operator** dan menyambungkan model, tools, messaging channels, dan companion apps lewat satu Gateway.

## 2. Komponen inti

Dari dokumentasi resmi dan paper akademis, OpenClaw punya **lima komponen**:

| Komponen | Fungsi |
|---|---|
| **Gateway** | Control plane lokal. Multiplex WebSocket + HTTP di satu port (default `18789`). Kelola session lifecycle, tool dispatch, channel routing, agent orchestration. |
| **Agent Runtime** | Multi-turn reasoning loop sendiri: terima history + system prompt → generate tool calls → eksekusi → resubmit context sampai balasan text-only. |
| **Tool layer** | exec, filesystem, browser (CDP), PDF, web, apply_patch, llm-task, subagents, dsb. Berjalan di host by default. |
| **Skills / Plugins** | Skill dimuat dinamis dari ClawHub (marketplace resmi, 56.000+ skill per laporan riset keamanan). Plugin SDK terpisah. |
| **Session & state** | `~/.openclaw/agents/<agentId>/sessions/*.jsonl` + `sessions.json`. Workspace `~/.openclaw/workspace` berisi `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `MEMORY.md` (opsional). |

Fitur tambahan yang menambah bobot: **Heartbeat Engine** (polling proaktif default tiap 30 menit — setiap heartbeat = satu full agent turn = biaya token), **Cron jobs**, **Nodes** (companion app iOS/Android/macOS untuk voice, camera, screen, Canvas), **Control UI + Dashboard + TUI + WebChat**, **Bonjour discovery**, **Tailscale**, **voice call plugin**, **browser automation**.

## 3. Channel yang didukung

BlueBubbles, Discord, Feishu, Google Chat, grammY, iMessage, IRC, LINE, Matrix, Mattermost, Microsoft Teams, Nextcloud Talk, Nostr, Signal, Slack, Synology Chat, Telegram, Tlon, Twitch, WhatsApp, Zalo, Zalo Personal.

→ **Ini bukti bahwa layer channel memang bisa digeneralisasi.** Tapi juga bukti kenapa repo-nya besar: 22 channel × logic pairing/routing/media masing-masing.

## 4. Temuan paling relevan: OpenClaw sudah punya "CLI Backends"

Halaman `gateway/cli-backends` mengungkap bahwa OpenClaw **sudah bisa memakai coding-agent CLI sebagai backend model** — tapi diposisikan sebagai *text-only fallback*, bukan jalur utama:

> "Tools are disabled (no tool calls). Text in → text out. Sessions are supported. Designed as a safety net rather than a primary path."

Default bawaan yang mereka pakai (sangat berguna untuk kita contek):

```
claude-cli:
  command: "claude"
  args: ["-p", "--output-format", "json", "--dangerously-skip-permissions"]
  resumeArgs: [..., "--resume", "{sessionId}"]
  modelArg: "--model"
  systemPromptArg: "--append-system-prompt"
  sessionArg: "--session-id"
  sessionMode: "always"

codex-cli:
  command: "codex"
  args: ["exec", "--json", "--color", "never", "--sandbox", "read-only", "--skip-git-repo-check"]
  resumeArgs: ["exec", "resume", "{sessionId}", ...]
  output: "jsonl"          # parse JSONL, ambil last agent message + thread_id
  resumeOutput: "text"
  modelArg: "--model"
  imageArg: "--image"
  sessionMode: "existing"
```

Limitasi yang mereka akui: no tools, no streaming, structured output tergantung format CLI, Codex tidak bisa resume dengan JSON output.

**Implikasi untuk ide kita:** justru limitasi itulah yang mau kita balik. Kalau agent runtime-nya adalah coding agent (yang sudah punya tool-nya sendiri, sandbox-nya sendiri, dan konteks repo-nya sendiri), maka "no OpenClaw tools" bukan kelemahan — itu **fitur**. Kita tidak butuh tool layer sendiri sama sekali.

## 5. OpenClaw juga sudah punya ACP

Ada `openclaw acp` di CLI reference dan halaman `tools/acp-agents`. Artinya jalur ACP sudah terbukti dipakai produksi untuk menyambung agent eksternal. Kita ambil jalur ini sebagai jalur **utama**, bukan sampingan.

Catatan: dokumentasi komunitas menyebut *"OpenClaw is a WhatsApp + Telegram + Discord + iMessage gateway for **Pi** agents"* — Pi (github.com/earendil-works/pi, Mario Zechner) adalah agent runtime yang di-credit di README OpenClaw.

## 6. Postur keamanan (diakui sendiri)

Dari README:
- "Treat inbound messages as untrusted input."
- DM channel melakukan pairing untuk sender tak dikenal; approve via `openclaw pairing approve <channel> <code>`.
- "Tools run on the host for the main session unless you configure sandboxing."
- Wajib baca security guide + exposure runbook + sandboxing guide sebelum expose Gateway.

Dari guide personal-assistant: wajib set `channels.whatsapp.allowFrom`, pakai nomor WhatsApp terpisah (two-phone setup), matikan heartbeat sampai percaya (`heartbeat.every: "0m"`).

Paper penetration test (2605.27042) menilai OpenClaw "highly representative of the current agentic AI landscape" dan mencatat deployment tipikal mengaktifkan shell execution, filesystem access, dan outbound network I/O **secara default**.

## 7. Kesimpulan riset: di mana beratnya

| Sumber berat | Detail | Perlu untuk use case kita? |
|---|---|---|
| Agent loop sendiri | Reasoning loop, compaction, retry, model failover, token accounting | ❌ coding agent sudah punya |
| Tool layer sendiri | exec, fs, browser, PDF, web, apply_patch | ❌ coding agent sudah punya, lebih bagus |
| Skill/plugin marketplace | ClawHub 56.000+ skill, dynamic loading, sandbox skill | ❌ ini sumber bloat & attack surface terbesar |
| 22 channel adapter | Termasuk Tlon, Nostr, Twitch, Synology | ❌ cukup 3–4 channel |
| Companion apps + Nodes | iOS/Android/macOS, Canvas, voice wake, camera | ❌ |
| Heartbeat engine | Full agent turn tiap 30 menit | ⚠️ opsional, bisa jadi cron sederhana |
| Multi-model provider (30+) | Bedrock, GLM, Qianfan, vLLM, dst | ❌ coding agent yang urus model |
| **Gateway + session + pairing + allowlist** | Control plane, routing, auth | ✅ **ini yang kita butuh** |
| **Channel adapter pattern** | Normalisasi inbound/outbound + media | ✅ **ini yang kita butuh** |
| **CLI/ACP backend driver** | Spawn + session + parse output | ✅ **ini inti produk kita** |

**Verdict:** hipotesis user benar. Yang dibutuhkan hanyalah ±3 dari 9 lapisan OpenClaw. Sisanya sudah disediakan oleh coding agent yang user pakai sehari-hari — dan versi coding agent lebih bagus (sandbox, diff review, git awareness, repo context).
