# Tech Stack

**Produk:** Caraka · **Versi:** 0.2 · **Tanggal:** 7 Agustus 2026

Setiap pilihan di bawah punya alasan dan alternatif yang ditolak. Kriteria utama: **ukuran kecil, sedikit dependensi, mudah dipasang oleh developer awam, dan tidak menambah permukaan serangan.**

---

## 1. Runtime & bahasa

| Pilihan | **Node.js 22 LTS + TypeScript** |
|---|---|
| Alasan | (1) Semua library channel terbaik ada di sini: `grammY`, `Baileys`, `discord.js`. (2) SDK ACP resmi tersedia dalam TypeScript. (3) Coding agent yang jadi target sebagian besar didistribusikan lewat npm — user sudah punya Node. (4) `npx caraka` = instalasi tanpa instalasi. |
| Alternatif ditolak | **Go/Rust** — binary tunggal menggoda, tapi Baileys hanya ada di TS dan menulis ulang protokol WhatsApp adalah proyek tersendiri. **Python** — SDK ACP ada, tapi ekosistem channel lebih lemah dan distribusi ke pengguna awam lebih ribet (venv). **Bun** — menarik, tapi kompatibilitas native module (`better-sqlite3`, `sqlite-vec`) masih berisiko; jadikan target opsional, bukan target utama. |
| Catatan | ESM murni. `tsx` untuk dev, `tsdown`/`tsup` untuk build. Node ≥ 22 wajib (native `fetch`, `--watch`, test runner). |

---

## 2. Penyimpanan

| Pilihan | **`node:sqlite`** bawaan Node (WAL) |
|---|---|
| Alasan | Satu file, tanpa server, native dependency, atau Docker. v0.1 hanya menyimpan sesi, approval, dan audit. Tabel audit dilindungi trigger append-only. |
| Alternatif ditolak | **Postgres + pgvector** — kekuatan berlebih untuk single-user, menambah beban instalasi. **Qdrant/Chroma** — proses/container terpisah, melanggar "satu proses". **LanceDB** — bagus, tapi menambah ~50 MB. **JSON files** — tidak scale untuk memory & audit. |
| Migrasi | SQL bernomor maju-saja, dijalankan saat start. |

---

## 3. Memory

| Pilihan | **Titen** (titen.dev) sebagai provider default, dijalankan lokal |
|---|---|
| Alasan | Apache-2.0, open source, satu paket tanpa dependensi, self-host Bun + SQLite. Ekstraksi claim **deterministik — belum ada model di dalam loop** — persis mode non-LLM yang diminta. Memberi observation/claim/context dengan provenance yang dapat dirunut, plus `supersede`/`expire` dan pemotongan budget bawaan. Semua itu adalah kode yang **tidak perlu kita tulis**. |
| Konsumsi | REST (`/v1/observations`, `/v1/consolidations`, `/v1/context/compile`, `/v1/context/:id/feedback`, `/v1/claims/:id/evidence`) · MCP di `/mcp` |
| Runtime | Titen berjalan sebagai **proses terpisah** (Bun); gateway kita tetap Node. Tidak ada percampuran runtime. |
| Fallback | Provider `local`: SQLite + FTS5 saja, tanpa embedding — sengaja dangkal |
| Alternatif ditolak | **Membangun sendiri** (embedding lokal + hybrid scoring + dedup + TTL) — ratusan baris kode untuk menyamai sesuatu yang sudah ada, open source, dan lebih baik. **Mem0/Zep/Letta** — cloud-first atau butuh LLM di jalur tulis. **fastembed lokal** — tidak lagi diperlukan karena embedding ditangani Titen. |
| Risiko | Pre-1.0 (v0.7.0) → kunci versi, smoke test di CI, dan pertahankan `MemoryProvider` sebagai interface |

---

## 4. Protokol agent

| Pilihan | **ACP TypeScript SDK** (`agentclientprotocol/typescript-sdk`) sebagai jalur utama |
|---|---|
| Alasan | Menghindari implementasi ulang JSON-RPC + skema; SDK resmi mengikuti evolusi v1→v2. Satu integrasi → 28+ agent. |
| Implementasi v0.1 | `@agentclientprotocol/sdk@1.3.0` + adapter resmi `@agentclientprotocol/claude-agent-acp@0.63.0`, keduanya dikunci di package. Driver CLI dan MCP inbox tetap roadmap. |
| Alternatif ditolak | Menulis klien ACP dari nol — hanya menambah beban pemeliharaan skema. Bergantung **hanya** pada CLI — kehilangan streaming, permission, dan diff. |

---

## 5. Channel

| Channel | Library | Alasan |
|---|---|---|
| Telegram | **`fetch` bawaan Node** | v0.1 hanya memakai beberapa method Bot API 10.2. Satu adapter HTTP menangani long-polling, 429, topic, rich result, edit progres, dan callback tanpa framework bot. |
| WhatsApp (unofficial) | **`@whiskeysockets/baileys`** | Standar de-facto; WebSocket (tanpa Puppeteer), jauh lebih ringan dari `whatsapp-web.js`. |
| WhatsApp (official) | **Graph API langsung** (`fetch`) | Tidak butuh SDK; webhook + REST sederhana. Memberi jalan keluar dari risiko ban. |
| Discord | **`discord.js`** | Standar; button, thread, role permission. |
| Signal | **`signal-cli`** (proses eksternal, JSON-RPC) | Tidak ada Bot API resmi; jalur yang terbukti. P2. |

Ditolak: `whatsapp-web.js` (Puppeteer = Chromium ±300 MB, melanggar target ukuran); `telegraf` (grammY lebih segar); Evolution API/WAHA (proses tambahan, risiko ban tetap sama).

---

## 6. Konfigurasi & validasi

| Pilihan | **YAML** (`yaml`) + **skema Zod** |
|---|---|
| Alasan | YAML lebih ramah manusia untuk file yang akan sering diedit tangan (preset agent). Zod memberi validasi + tipe TypeScript dari satu sumber, dan pesan error yang bisa dibaca. |
| Alternatif ditolak | JSON (tanpa komentar), TOML (kurang familier untuk YAML-heavy dev), JS config (mengeksekusi kode dari config = risiko). |
| Rahasia | Keychain OS via `keytar` bila tersedia; fallback file `chmod 600`. Env `CARAKA_*` menimpa semuanya. |

---

## 7. CLI & pengalaman terminal

| Komponen | Pilihan |
|---|---|
| Parser perintah | beberapa perbandingan string; tidak ada dependency CLI |
| Prompt interaktif | `node:readline/promises` + input raw untuk token |
| Warna/tabel | format teks manual |
| Logger | audit SQLite; tidak ada dependency logger |

---

## 8. Proses & penjadwalan

| Kebutuhan | Pilihan |
|---|---|
| Spawn agent | `node:child_process` (`spawn`) + manajemen lifecycle sendiri |
| Antrean | In-memory + persist ke SQLite (tidak perlu Redis/BullMQ untuk 1 operator) |
| Cron (P2) | `croner` — ringan, tanpa dependensi |
| Service | tiga template unit (systemd user, launchd agent, schtasks) yang **dicetak** CLI ke stdout; operator sendiri yang memasangnya |

---

## 9. Dashboard web (P1)

| Pilihan | **HTML statis + `htmx`**, disajikan dari server HTTP bawaan Node |
|---|---|
| Alasan | Dashboard hanya read-only: daftar sesi, riwayat run, audit, memori. Tidak ada alasan memasang React + bundler + toolchain untuk empat tabel. Menjaga janji "satu paket, kecil". |
| Alternatif ditolak | React/Next/Vite SPA — menambah puluhan MB dan pipeline build demi tampilan tabel. |

---

## 10. Kualitas & rilis

| Aspek | Pilihan |
|---|---|
| Test | `node:test` bawaan; `tsx` hanya menjalankan test TypeScript |
| Smoke test agent | Matriks CI per preset agent (spawn → prompt sederhana → assert balasan). Ini pertahanan utama saat vendor mengubah flag CLI. |
| Lint/format | `oxlint` + `oxfmt` (cepat, tanpa konfigurasi berat) |
| Build | `tsc` → ESM + `.d.ts` |
| Distribusi | npm (`caraka`), `npx caraka init` sebagai jalur utama; Docker image opsional |
| Versioning | SemVer; skema DB punya versi sendiri |
| Lisensi | MIT |

---

## 11. Anggaran ketergantungan

Batas keras: **≤ 25 dependensi runtime langsung**, dan setiap penambahan harus dijustifikasi di PR.

Perkiraan ukuran terpasang:

| Bagian | Perkiraan |
|---|---|
| Inti + CLI | ~2 MB |
| grammY | ~1 MB |
| Baileys | ~4 MB |
| discord.js (opsional) | ~5 MB |
| better-sqlite3 | ~3 MB |
| ACP SDK + MCP SDK | ~1,5 MB |
| **Total v1.0 (Telegram saja)** | **≈ 7 MB** ✅ target < 15 MB |
| Titen (proses terpisah, opsional) | dipasang sendiri oleh user; tidak masuk paket kita |

Channel dan provider dimuat **secara malas** — pengguna yang hanya memakai Telegram tidak pernah memuat Baileys ataupun discord.js.

---

## 12. Yang sengaja TIDAK dipakai

| Ditolak | Alasan |
|---|---|
| Docker sebagai kebutuhan | Menaikkan hambatan setup; target < 5 menit |
| Redis / message broker | Beban berlebih untuk satu operator |
| LangChain / framework agent | Kita bukan agent; ini justru menambah lapisan yang ingin kita hindari |
| Vector DB terpisah | Titen sudah mengurus vektor di dalam dirinya |
| Embedding lokal di proses kita | idem — satu tanggung jawab, satu tempat |
| Framework plugin / dynamic loading | Keputusan keamanan (lihat `security.md`) |
| Kubernetes / cloud runtime | Produk ini hidup di mesin developer |
| Electron / desktop app | Terminal + chat sudah menjadi UI-nya |
