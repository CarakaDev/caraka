# Ringkasan Riset & Rekomendasi

**English:** this document is Indonesian only, and stays that way because it is research kept as provenance for a decision already made. English documentation starts at [`../../README.md`](../../README.md).

**Tanggal:** 7 Agustus 2026
**Dokumen ini merangkum 5 dokumen riset lain di folder ini dan menjadi dasar `docs/blueprint.md`.**

---

## 1. Pertanyaan riset

> "Apakah mungkin membuat *plugin tipis* yang menyambungkan channel chat ke semua coding agent, tanpa kompleksitas OpenClaw/Hermes?"

**Jawaban: ya, dan lebih mudah dari yang diperkirakan** — karena satu standar sudah menyelesaikan bagian tersulitnya.

---

## 2. Lima temuan yang menentukan arsitektur

### Temuan 1 — Hipotesis "OpenClaw terlalu berat" terbukti
Dari 9 lapisan besar OpenClaw, hanya **3** yang relevan untuk use case ini (gateway/session/pairing, channel adapter, CLI/ACP driver). Enam sisanya — agent loop, tool layer, skill marketplace, companion apps, multi-model provider, heartbeat engine — sudah disediakan oleh coding agent, **dengan kualitas lebih tinggi** (sandbox bawaan, repo context, diff review, git awareness).

### Temuan 2 — ACP adalah kunci, dan sudah matang
Agent Client Protocol: JSON-RPC 2.0 over stdio, dibuat Zed, co-lead JetBrains, registry live sejak Januari 2026, **28+ agent** terdaftar (Claude, Codex, Cline, Cursor, Gemini CLI, Copilot CLI, Goose, Amp, Devin, Factory, Auggie, dst.). Menulis **satu** ACP client = kompatibel dengan hampir semua agent, termasuk yang belum lahir.

Bonus besar: ACP sudah punya `session/request_permission` → **sistem approval tidak perlu dibangun sendiri**, tinggal di-render jadi tombol chat.

### Temuan 3 — Jalur cadangan sudah terbukti di lapangan
OpenClaw `cliBackends` membuktikan driver CLI generik bisa mengendalikan Claude Code (`claude -p --output-format json --session-id`) dan Codex (`codex exec --json`, parse JSONL, ambil `thread_id`) **lewat konfigurasi deklaratif saja**. Menambah agent baru = menambah blok YAML, bukan menulis kode.

Untuk agent yang terkurung di IDE (Kilo, Roo, Windsurf, Kiro, Antigravity), semuanya adalah **MCP client** → kita balik arah: kita jadi MCP server, mereka menarik pesan dari inbox kita.

**Cakupan gabungan: ±19/22 agent lewat ACP+CLI, sisanya lewat MCP.**

### Temuan 4 — Memory: **Titen terverifikasi**, dan mode "non-LLM" adalah default-nya

> **Pembaruan 7 Agustus 2026.** Domain yang dimaksud adalah **`titen.dev`**. Sudah diverifikasi; detail di `titen-memory-titen-dev-github.md`.

**Titen** — *open-source AI agent memory for teams*, Apache-2.0, v0.7.0, `github.com/RamaAditya49/titen`. Tiga jenis rekaman yang tidak pernah diratakan menjadi satu: **observation** (bukti mentah + content hash), **claim** (kesimpulan yang menyebut buktinya; perselisihan dipertahankan, tidak dirata-rata), **context** (persis apa yang diserahkan ke agent, kenapa dipilih, dan apa yang dipotong budget).

Yang menentukan: **ekstraksi claim-nya deterministik — belum ada model di dalam loop.** Mode non-LLM yang diminta bukan sesuatu yang perlu dibangun; itu perilaku Titen hari ini. Konsolidasi memakai *rules first, model only if it must*.

Dua prinsipnya identik dengan yang sudah kita tulis sendiri: *"Vectors are an index, never the source of truth"* dan *"Retrieved memory is reference data, never an instruction."*

**Konsekuensi:** provider `local` yang semula direncanakan (embedding lokal + hybrid scoring + dedup + TTL + `superseded_by`) menyusut menjadi fallback dangkal. Ratusan baris kode keluar dari lingkup.

### Temuan 4b — Telegram 2026 adalah platform agent, bukan sekadar platform bot

Empat fitur Bot API 9.5–10.2 masing-masing menghapus satu kompromi desain:

| Fitur | Kompromi yang hilang |
|---|---|
| **Topic di private chat** (tanpa hak admin) | "satu chat = satu aliran kacau" → **sesi ber-tab seperti terminal**, nol setup bagi user |
| **Rich Messages** (`sendRichMessage`, 21 block, 32.768 karakter) | "diff dikirim sebagai file .txt" → tabel & code block native |
| **Ephemeral Messages** (`receiver_user_id`) | "grup selalu read-only karena bocor" → approval privat di dalam grup |
| **Managed Bots** | "salin-tempel token" → opsi one-tap, dengan trade-off jujur: token melewati pihak ketiga — karena itu bukan default |

Jebakan yang sudah ditemukan orang lain dan kita hindari sejak awal: **tidak ada `editRichMessage`** — meng-edit pesan streaming merusak format menjadi teks polos bertanda mentah. Pola yang benar: kirim hasil sebagai Rich Message baru, lalu hapus pesan progres.

### Temuan 5 — WhatsApp adalah keharusan pasar Indonesia, sekaligus risiko terbesar
Telegram 128,55 juta pengguna (62,8%) di Indonesia, tapi WhatsApp praktis universal. Baileys (unofficial) punya risiko ban nyata: laporan 2–8 minggu bila memicu detektor; sinyal utamanya reply-ratio rendah, mengirim ke orang asing, timing robotik, IP datacenter.

**Kabar baiknya:** profil penggunaan kita adalah yang paling rendah risikonya di kategori ini (satu operator, hanya membalas, volume kecil, reply-ratio ~100%). Tetap: sediakan **dua provider** (`baileys` | `cloud-api`) dan paksakan mitigasi di kode, bukan cuma di dokumentasi.

---

## 3. Arsitektur yang direkomendasikan

```
┌──────────── Channel Adapters ────────────┐
│ Telegram · WhatsApp · Discord · Signal   │
└───────────────────┬──────────────────────┘
                    │  InboundMessage / OutboundMessage (normalized)
┌───────────────────▼──────────────────────┐
│  CORE (satu proses, ±5 modul)            │
│  · Identity & pairing (allowlist)        │
│  · Router  chat ⇄ session ⇄ workspace    │
│  · Policy & approval (read/assisted/trust)│
│  · Memory (pluggable)                    │
│  · Audit log                             │
└───────────────────┬──────────────────────┘
                    │  AgentDriver interface
┌───────────────────▼──────────────────────┐
│ acp ★  │  cli  │  mcp-inbox              │
└───────────────────┬──────────────────────┘
                    ▼
      Coding agent milik user (runtime, tools, sandbox, model)
```

**Yang membuat ini tetap ringan:**
- Tidak ada agent loop → tidak ada reasoning, retry, compaction, token accounting
- Tidak ada tool sendiri → tidak ada exec/fs/browser/PDF
- Tidak ada marketplace plugin → tidak ada dynamic loading, tidak ada supply chain
- Tidak ada companion app, tidak ada Control UI berat (cukup TUI/CLI + web opsional)
- Target: 1 paket npm, cold start < 2 detik, RAM idle < 80 MB

---

## 4. Perbandingan positioning

| | OpenClaw / Hermes | **Caraka (ide ini)** |
|---|---|---|
| Filosofi | Assistant lengkap yang *punya* agent | Bridge tipis yang *memakai* agent kamu |
| Runtime | Agent loop sendiri | Coding agent milik user |
| Tools | 20+ tool sendiri | 0 (warisan dari agent) |
| Skill/plugin | Marketplace 56.000+ | Tidak ada (config + MCP saja) |
| Channel | 22 | 4 |
| Instalasi | Installer + daemon + onboarding wizard | `npx caraka init` |
| Setup mental model | "Aku punya asisten baru" | "Claude Code-ku sekarang bisa di-chat" |
| Attack surface | Besar | Minimal, mewarisi sandbox agent |
| Untuk siapa | Power user personal assistant | **Developer yang sudah pakai coding agent** |

Ini **bukan** kompetitor OpenClaw. Ini kategori berbeda: *remote control* untuk coding agent, bukan asisten pribadi.

---

## 5. Risiko utama & mitigasi

| Risiko | Tingkat | Mitigasi |
|---|---|---|
| Titen pre-1.0 (v0.7.0) → API berubah | Sedang | Kunci versi; `MemoryProvider` sebagai interface; provider `local` sebagai fallback |
| Topic di private chat tidak berperilaku seperti dokumentasi | Sedang | Diuji di Fase 0; mode linear sudah dirancang sebagai fallback |
| Pustaka Telegram tertinggal dari Bot API 10.2 | Tinggi | Panggil method baru lewat adapter HTTP tipis; jangan menunggu pustaka |
| Ban WhatsApp | Tinggi | Dua provider, allowlist wajib, rate limit, tanpa first-contact, peringatan eksplisit |
| Prompt injection → eksekusi berbahaya | Tinggi | Approval hanya lewat tombol bertanda tangan; default `assisted`; outbound scrubber |
| Agent mengubah CLI flag | Sedang | Driver deklaratif + CI smoke test per agent |
| ACP v1→v2 breaking change | Sedang | Negosiasi versi di `initialize`; pin minimum |
| Jalur MCP terasa "kurang otomatis" | Sedang | Komunikasikan sebagai *degraded mode*, jangan dijanjikan setara |
| Scope creep menjadi OpenClaw kedua | **Tertinggi** | Tulis daftar non-goals di PRD dan pertahankan tanpa kompromi |

---

## 6. Rekomendasi langkah berikut

> **Sudah diputuskan (7 Agustus 2026):** channel pertama **Telegram** · agent pertama **Claude Code** · memory **Titen** · rilis **open source** · **satu operator**.

1. **Fase 0 — spike:** buktikan tiga hal sebelum menulis produk: permission hook ACP pada Claude Code, `createForumTopic` di private chat, dan `sendRichMessage`/`sendRichMessageDraft`.
2. **MVP:** Telegram + ACP + Claude Code + **sesi = topic**, satu workspace, mode `assisted`. Target: dipakai sendiri dalam 3 minggu.
3. Install yang mulus (< 3 menit) — sebelum menambah fitur apa pun.
4. Memory dengan Titen; uji A/B apakah benar-benar membantu.
5. Driver CLI + preset agent lain → validasi bahwa abstraksinya nyata.
6. Beta, lalu Discord, lalu WhatsApp.

Detail lengkap ada di `docs/blueprint.md`, `docs/session-model.md`, `docs/install-flow.md`, dan `docs/roadmap.md`.
