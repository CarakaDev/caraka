# Riset: ACP (Agent Client Protocol) — jalur universal ke semua coding agent

**English:** this document is Indonesian only, and stays that way because it is research kept as provenance for a decision already made. English documentation starts at [`../../README.md`](../../README.md).

**Tanggal riset:** 7 Agustus 2026
**Sumber utama:**
- https://agentclientprotocol.com (Registry, protocol docs, SDK)
- https://github.com/agentclientprotocol (schema, rust-sdk, typescript-sdk, python-sdk, codex-acp, claude-agent-acp, registry)
- https://www.jetbrains.com/acp/
- https://www.morphllm.com/agent-client-protocol
- https://byteiota.com/agent-client-protocol-lsp-ai-coding-agents/
- https://ai-sdk.dev/providers/community-providers/acp
- https://github.com/formulahendry/vscode-acp

---

## 1. Temuan inti

> **ACP adalah LSP untuk AI coding agent.**

ACP menstandardisasi komunikasi antara *client* (editor/IDE — atau dalam kasus kita: **gateway chat**) dan *coding agent* (program yang memodifikasi kode secara otonom). Dibuat Zed Industries, rilis Agustus 2025. JetBrains bergabung sebagai co-lead September 2025.

Analogi resmi: sebelum LSP, tiap editor butuh parser sendiri per bahasa. Sesudah LSP, satu language server jalan di mana-mana. ACP melakukan hal yang sama untuk agent.

**Ini menjawab langsung kebutuhan user:** tidak perlu bikin plugin terpisah untuk Claude Code, Codex, Cline, Kilo, dst. Cukup jadi **ACP client** satu kali.

## 2. Bentuk teknis

- **Transport:** JSON-RPC 2.0 over **stdin/stdout** untuk agent lokal (client men-spawn agent sebagai sub-process on demand). Agent remote bisa lewat HTTP/WebSocket.
- **Concurrency:** satu koneksi mendukung beberapa session paralel ("multiple trains of thought"). → Cocok untuk multi-chat / multi-repo.
- **Relasi dengan MCP:** ACP dan MCP **saling melengkapi, bukan bersaing**. ACP me-reuse tipe JSON dari MCP di mana bisa, lalu menambah tipe khusus coding UX (mis. menampilkan diff). Saat session ACP dimulai, client meneruskan daftar MCP server config ke agent — jadi kedua protokol jalan bersamaan.
- **SDK resmi:** Rust, TypeScript, Python (`pip install agent-client-protocol`, butuh Python 3.10+, menyediakan async base class, stdio JSON-RPC transport, helper builder).

### Alur permukaan yang kita pakai (versi v1)

```
client → agent : initialize            (negosiasi versi + capability)
client → agent : authenticate          (kalau agent butuh)
client → agent : session/new           (cwd = workspace, mcpServers = [...])
client → agent : session/prompt        (kirim pesan user)
agent  → client: session/update        (notifikasi stream: chunk teks, tool call, plan, diff)
agent  → client: session/request_permission  (minta izin tulis file / jalankan command)
client → agent : session/cancel
agent  → client: fs/read_text_file, fs/write_text_file, terminal/*   (kalau client mengiklankan capability-nya)
```

**Ini penting:** `session/request_permission` adalah *hook approval bawaan protokol*. Kita tinggal me-render-nya jadi tombol **[Setujui] [Tolak]** di Telegram/WhatsApp. Tidak perlu bikin sistem approval sendiri.

`session/update` yang streaming adalah yang membuat pengalaman chat terasa hidup (bisa kirim "sedang mengedit `src/auth.ts`…" ke chat).

## 3. ACP Registry

Registry live sejak Januari 2026. Kurasi agent yang **mendukung authentication**. Instalasi langsung dari editor (JetBrains 2025.3.2+ lewat Agent Picker → "Install From ACP Registry"; Zed v0.221.x+ sebagai default install path). Agent dari registry auto-update. Metadata registry berupa JSON yang memuat informasi distribusi untuk instalasi otomatis.

→ **Kita bisa membaca registry JSON yang sama** untuk auto-discovery agent yang terpasang di mesin user. Zero konfigurasi manual.

## 4. Daftar agent (per Agustus 2026)

Dari halaman registry resmi (dipotong, sebagian):

| Agent | Vendor | Versi (registry) | Catatan |
|---|---|---|---|
| Claude Agent | Anthropic (wrapper resmi ACP) | 0.65.0 | `agentclientprotocol/claude-agent-acp` |
| Codex | OpenAI (adapter) | 1.1.13 | `agentclientprotocol/codex-acp` |
| Cline | Cline | 3.0.51 | **native**, `cline.bot/cli` |
| Cursor | Cursor | 2026.07.23 | `cursor.com/docs/cli/acp` |
| Gemini CLI | Google | — | **native** |
| Devin CLI | Cognition | 3000.3.27 | |
| Factory Droid | Factory AI | 0.189.0 | |
| Auggie CLI | Augment Code | 0.34.0 | |
| Amp | Sourcegraph (wrapper) | 0.9.0 | |
| Cortex Code | Snowflake | 1.0.73 | |
| Codebuddy Code | Tencent Cloud | 2.106.7 | |
| DeepAgents | LangChain | 0.1.7 | |
| fast-agent | evalstate | 0.9.30 | |
| Dirac, DimCode, crow-cli, Corust, Autohand, Agoragentic | indie | — | |

Sumber sekunder (Morph, byteiota, vscode-acp) menyebut juga: **GitHub Copilot CLI** (native, public preview), **Goose** (native), **OpenHands** (native), **Mistral Vibe**, **Blackbox AI**, **Qwen Code**, **OpenCode**, **Kiro**, **OpenClaw**, **Hermes**, **Aider** (in progress). Total **28+ agent**.

Klien/editor yang bicara ACP: Zed (paling lengkap), JetBrains (native), Neovim & Emacs (plugin komunitas stabil), VS Code (ekstensi komunitas `formulahendry/vscode-acp`), Kiro IDE (AWS).

## 5. Ekosistem pendukung yang membuktikan pola ini berhasil

- **Vercel AI SDK community provider `acp`** — mem-bridge agent ACP (Claude Code, Gemini CLI, Codex CLI, dll) ke interface `LanguageModel`, lengkap dengan process management (spawn + lifecycle otomatis) dan MCP server integration. **Ini persis pola arsitektur yang kita butuhkan, hanya target output-nya web app, bukan chat.**
- **vscode-acp** — bukti bahwa satu client generik bisa bicara ke Claude, Codex, Copilot, Qwen, Gemini, OpenCode, Kiro, OpenClaw, Hermes hanya dengan config `{command, args, env}` per agent.
- **Koog 1.0 (JetBrains)** — agent yang dibangun dengan Koog ACP-compatible out of the box.

## 6. Risiko & keterbatasan ACP

| Risiko | Mitigasi di desain kita |
|---|---|
| Belum semua agent native (Claude Code & Codex lewat adapter) | Punya **driver kedua**: headless CLI (`claude -p --output-format json`, `codex exec --json`) |
| Agent yang hidup di dalam IDE (Cline extension, Kilo, Windsurf Cascade, Kiro, Antigravity) tidak selalu punya CLI ACP | Jalur ketiga: **MCP server + inbox file/HTTP** yang di-poll dari dalam IDE |
| Versi protokol v1 vs v2 (schema/v1, schema/v2 ada di repo) | Negosiasi versi di `initialize`, pin minimum version |
| Adapter pihak ketiga bisa telat update | Registry JSON dibaca sebagai sumber kebenaran versi |
| Belum ada standar auth lintas agent | Registry hanya memuat agent yang mendukung `authenticate` |

## 7. Kesimpulan riset

ACP mengubah masalah "N agent × M channel" menjadi **"1 ACP client + M channel adapter"**. Ini adalah *unlock* terbesar untuk ide user: plugin bisa tetap kecil, dan tetap kompatibel dengan hampir semua coding agent — termasuk agent yang belum ada hari ini, selama mereka mendaftar ke ACP Registry.
