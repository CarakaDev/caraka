# Riset: Matriks integrasi per coding agent

**Tanggal riset:** 7 Agustus 2026
**Sumber:** ACP Registry (agentclientprotocol.com), OpenClaw `gateway/cli-backends` & `tools/acp-agents`, jetbrains.com/acp, morphllm.com/agent-client-protocol, byteiota.com, github.com/formulahendry/vscode-acp, ai-sdk.dev/providers/community-providers/acp, dokumentasi masing-masing vendor.

> **Catatan kejujuran:** kolom yang ditandai ⚠️ perlu diverifikasi ulang saat implementasi karena vendor sering mengubah flag CLI. Kolom ACP diambil dari registry resmi per Agustus 2026.

---

## 1. Empat jalur integrasi yang mungkin

| Jalur | Cara kerja | Kualitas | Effort |
|---|---|---|---|
| **A. ACP** | Spawn agent sebagai sub-process, JSON-RPC 2.0 via stdio. Streaming, permission request, diff, multi-session. | ⭐⭐⭐⭐⭐ | Tulis 1×, jalan di 28+ agent |
| **B. Headless CLI** | `claude -p --output-format json`, `codex exec --json`. Text in → text/JSON out, session lewat `--session-id`/`resume`. | ⭐⭐⭐ (tanpa streaming, tanpa permission hook) | Konfigurasi per agent (deklaratif) |
| **C. MCP server** | Kita jadi **MCP server**; agent di IDE memanggil tool kita untuk mengambil pesan & mengirim balasan. | ⭐⭐⭐ (agent yang inisiatif, bukan kita) | 1× server, config per IDE |
| **D. Local API / SDK** | Agent mengekspos HTTP server sendiri (opencode server, Cline CLI, dsb.) | ⭐⭐⭐⭐ | Per agent |

**Keputusan desain:** A sebagai default → B sebagai fallback otomatis → C untuk agent yang terkurung di dalam IDE → D hanya bila terbukti lebih baik.

---

## 2. Matriks per agent

| # | Agent | Bentuk | ACP | Headless CLI | MCP client | Jalur yang kita pakai |
|---|---|---|---|---|---|---|
| 1 | **Claude Code** | CLI + IDE ext | ✅ via `claude-agent-acp` (0.65.0) | ✅ `claude -p --output-format json --session-id <id>`; resume `--resume {id}`; `--append-system-prompt`; `--model` | ✅ | **A**, fallback **B** |
| 2 | **Codex CLI** (OpenAI) | CLI | ✅ via `codex-acp` (1.1.13) | ✅ `codex exec --json --color never --sandbox read-only --skip-git-repo-check`; resume `codex exec resume {id}`; output JSONL → ambil last agent message + `thread_id`; `--image` | ✅ (`~/.codex/config.toml`) | **A**, fallback **B** |
| 3 | **Gemini CLI** (Google) | CLI | ✅ **native** | ✅ ⚠️ | ✅ + extensions | **A** |
| 4 | **GitHub Copilot CLI** | CLI | ✅ native (public preview) | ⚠️ | ✅ | **A** |
| 5 | **Cline** | VS Code ext + CLI | ✅ **native** (3.0.51, `cline.bot/cli`) | ✅ CLI tersedia | ✅ | **A** |
| 6 | **Kilo Code** | VS Code ext (fork Roo/Cline) | ⚠️ belum di registry | ⚠️ | ✅ | **C** (MCP) + pantau ACP. Catatan: OpenClaw punya provider `kilocode` (Kilo Gateway) — Kilo lebih dulu hadir sebagai *model gateway* daripada agent CLI |
| 7 | **Roo Code** | VS Code ext | ⚠️ | ❌ | ✅ | **C** |
| 8 | **Windsurf** (Cascade) | IDE | ❌ | ❌ | ✅ | **C** |
| 9 | **Kiro** (AWS) | IDE | ✅ sebagai **client** ACP; tercantum di vscode-acp sebagai agent | ⚠️ | ✅ (+ hooks, steering, specs) | **C**, cek **A** |
| 10 | **Antigravity** (Google) | IDE | ⚠️ | ⚠️ | ✅ | **C** |
| 11 | **Cursor** | IDE + CLI | ✅ (`cursor.com/docs/cli/acp`, 2026.07.23) | ✅ | ✅ | **A** |
| 12 | **OpenCode** | CLI + server | ✅ | ✅ + HTTP server | ✅ | **A** atau **D** |
| 13 | **Goose** (Block) | CLI | ✅ **native** | ✅ | ✅ | **A** |
| 14 | **Amp** (Sourcegraph) | CLI | ✅ wrapper `amp-acp` (0.9.0) | ✅ | ✅ | **A** |
| 15 | **Auggie** (Augment) | CLI | ✅ (0.34.0) | ✅ | ✅ | **A** |
| 16 | **Devin CLI** (Cognition) | CLI | ✅ (3000.3.27) | ✅ | ✅ | **A** |
| 17 | **Factory Droid** | CLI | ✅ (0.189.0) | ✅ | ✅ | **A** |
| 18 | **Pi** (earendil-works/pi) | CLI/runtime | ⚠️ dipakai OpenClaw sebagai agent runtime | ✅ | ✅ | **A/B** |
| 19 | **Hermes Agent** | Python package | ✅ (tercantum di vscode-acp) | ✅ `hermes` di PATH; Linux/macOS/WSL2 saja; auth via `hermes model` | ✅ | **A** |
| 20 | **Aider** | CLI | 🔜 in progress | ✅ | ⚠️ | **B** sementara |
| 21 | **OpenHands** | CLI/web | ✅ native | ✅ | ✅ | **A** |
| 22 | **Qwen Code / GLM / Codebuddy / Cortex Code / DeepAgents / fast-agent / Dirac / crow-cli** | CLI | ✅ semua di registry | — | ✅ | **A** |

**Cakupan dengan hanya menulis 1 ACP client + 1 CLI driver: ±19 dari 22 agent di atas.**
Sisanya (Kilo, Roo, Windsurf, Antigravity — semuanya agent-di-dalam-IDE) ditangani satu MCP server tunggal.

---

## 3. Detail jalur C (agent yang terkurung di IDE)

Cline, Kilo, Roo, Windsurf Cascade, Kiro, Antigravity **semuanya adalah MCP client**. Artinya kita bisa membalik arah kontrol:

```
Chat (WA/TG)  →  Gateway  →  antrian pesan (SQLite)
                                    ↑ (tool: inbox_pull)
                            MCP server "caraka"
                                    ↓ (tool: reply, ask_approval)
                        Cline/Kilo/Windsurf/Kiro/Antigravity di IDE
```

Tool MCP yang kita ekspos (minimal 4):
- `inbox_pull(session_id?)` → ambil pesan chat yang belum diproses
- `reply(session_id, text, media?)` → kirim balasan ke chat asal
- `ask(session_id, question, options[])` → tanya user, blokir sampai dijawab
- `status(session_id, state)` → update "sedang mengerjakan…", progress

Trade-off jujur: agent harus *diminta* memanggil `inbox_pull` (lewat instruksi di `AGENTS.md`/rules file atau slash command). Jadi jalur C **tidak** memberi "agent selalu nyala" sebaik jalur A. Ini harus dikomunikasikan ke user sebagai *degraded mode*, bukan dijanjikan setara.

---

## 4. Alternatif jalur B: kontrak konfigurasi deklaratif

Pelajaran dari OpenClaw `cliBackends`: driver CLI tidak perlu ditulis per agent — cukup **satu driver + tabel konfigurasi**. Field yang terbukti cukup:

```
command, args[], resumeArgs[], output: json|jsonl|text, resumeOutput,
input: arg|stdin, maxPromptArgChars, modelArg, modelAliases{},
sessionArg | sessionArgs[{sessionId}], sessionMode: always|existing|none,
sessionIdFields[], systemPromptArg, systemPromptWhen: first|always,
imageArg, imageMode: repeat|join, serialize: bool
```

Artinya: **menambah dukungan agent baru = menambah satu blok YAML, bukan menulis kode.** Ini yang membuat "plugin untuk semua coding agent" realistis dikerjakan satu orang.

---

## 5. Hal yang TIDAK perlu kita bangun

Karena runtime-nya adalah coding agent:

- ❌ Tool `read_file` / `write_file` / `bash` — sudah ada, lebih aman (sandbox bawaan Codex, permission bawaan Claude Code)
- ❌ Repo indexing / RAG kode — sudah ada
- ❌ Diff viewer & git workflow — sudah ada
- ❌ Model provider abstraction, failover, token accounting — sudah ada
- ❌ Sub-agent orchestration — sudah ada (Claude Code subagents, Codex, dst.)
- ❌ Skill marketplace — coding agent sudah punya skills/commands/rules-nya sendiri

Yang tersisa untuk kita: **transport, identitas, sesi, memori lintas-sesi, approval UX di chat.** Itu saja.
