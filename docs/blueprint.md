# Blueprint — Caraka

**Versi:** 0.2 · **Tanggal:** 7 Agustus 2026 · **Status:** keputusan arah sudah terkunci
**Dasar:** semua dokumen di `docs/research/`

---

## 1. Satu kalimat

> **Caraka** (ꦕꦫꦏ, Jawa: *utusan*) adalah bridge tipis yang menyambungkan Telegram ke coding agent yang **sudah** terpasang di komputermu — dengan setiap tugas hidup di **topic-nya sendiri**, seperti tab di terminal.

Tagline: *"Kirim tugasnya. Caraka yang jalan."*

Nama ini adalah baris pertama aksara Jawa — *hana caraka*, "ada dua utusan" — dari legenda dua abdi setia yang saling bunuh karena instruksi yang bertabrakan tanpa konteks bersama. **Kesetiaan tanpa konteks itu berbahaya**; itulah kenapa produk ini punya approval, memori dengan provenance, dan audit. Selengkapnya di `brand.md`.

---

## 2. Keputusan yang sudah terkunci

| # | Keputusan | Alasan |
|---|---|---|
| **Channel pertama** | **Telegram** | Bot API resmi, tanpa risiko ban, long-polling (tanpa port terbuka), dan satu-satunya platform yang memberi topic di private chat |
| **Agent pertama** | **Claude Code** via ACP | Wrapper ACP resmi (`claude-agent-acp`), dukungan permission & streaming lengkap |
| **Memory** | **Titen** (titen.dev) | Open-source Apache-2.0, deterministik tanpa LLM, evidence→claim→context dengan provenance |
| **Rilis** | **Open source** | Perangkat lunak yang mengeksekusi kode di mesin developer harus bisa dibaca |
| **Skala** | **Satu operator** | Bukan multi-tenant, bukan SaaS. Fokus tajam = produk kecil |

---

## 3. Masalah

1. **Coding agent terkunci di satu mesin.** Ide muncul di jalan; eksekusi menunggu laptop.
2. **Run panjang berjalan buta.** Tidak ada visibilitas dari luar.
3. **Chat itu berantakan.** Satu aliran linear untuk lima tugas paralel = kekacauan. Di terminal kita punya tab; di chat tidak.
4. **Tidak ada memori lintas sesi.** Setiap sesi mulai dari nol.
5. **Solusi yang ada memecahkan masalah yang berbeda.** OpenClaw dan Hermes adalah asisten pribadi: mereka membereskan inbox, menjaga kalender, mengendalikan browser, dan **kebetulan juga bisa menulis kode**. Caraka hanya mengerjakan satu hal. Standard Compute meringkasnya: *"OpenClaw is a personal agent; OpenCode is a coding agent — different tools for different jobs."*

**Insight inti:** coding agent sudah lebih pintar daripada tool layer generik mana pun. Yang hilang bukan kecerdasan — yang hilang **transport dan tata letak**.

---

## 4. Solusi

```
        Telegram (private chat = ruang kerja)
        ├── 📋 General            ← kontrol
        ├── 🔵 toko-api · rate limit login    #a91   ← sesi = topic = "tab"
        ├── 🟡 toko-api · audit dependency    #a92   ← menunggu approval
        └── 🟢 web · revisi hero              #a85   ← selesai, tertutup
                        │
              ┌─────────▼──────────┐
              │      CARAKA        │
              │  identity · router │
              │  policy · approval │
              │  memory  · audit   │
              └─────────┬──────────┘
                        │  AgentDriver
          ┌─────────────┼─────────────┐
        ACP★          CLI          MCP inbox
          │             │             │
     Claude Code    Codex, Aider   Cline, Kilo,
     Gemini, Cursor                Windsurf, Kiro
     Cline, Goose, Amp…            Antigravity
                        ▼
      Runtime, tools, sandbox, model = milik agent

              Memory: Titen (lokal) ─ evidence → claim → context
```

### Tiga gagasan yang membuatnya berbeda

**1. Sesi = topic.** Bot membuat topic sendiri untuk setiap tugas, memberinya warna sesuai status (🔵 jalan · 🟡 menunggu izin · 🟢 selesai · 🔴 gagal), lalu menutupnya. Daftar topic menjadi papan status yang bisa dibaca sekilas. Ini mungkin karena sejak 2026 **bot Telegram bisa membuat topic di private chat tanpa hak admin apa pun** — nol setup bagi user.

**2. Runtime bukan milik kita.** Tidak ada agent loop, tidak ada tool eksekusi, tidak ada marketplace. Kita bicara **ACP** — satu protokol, 28+ agent — dan mewarisi sandbox serta permission model milik agent.

**3. Memori yang bisa menjelaskan dirinya.** Titen memisahkan *observation* (bukti), *claim* (kesimpulan yang menyebut buktinya), dan *context* (apa yang benar-benar diserahkan ke agent, dan apa yang dipotong budget). Deterministik, tanpa LLM di dalam loop, dan setiap claim dapat dirunut ke sumbernya.

---

## 5. Prinsip desain (tidak bisa ditawar)

1. **Kita bukan agent.** Tergoda menambah tool → jawabannya tidak.
2. **Warisi keamanan, jangan bikin sendiri.** Sandbox & permission sudah ada di coding agent.
3. **Membosankan secara default.** Allowlist wajib, `assisted` di DM, `read-only` di grup, localhost, heartbeat mati.
4. **Degradasi anggun.** Topic gagal → mode linear. Memory mati → chat jalan. ACP tidak ada → CLI. Rich message gagal → MarkdownV2.
5. **Tanpa marketplace.** Ekstensi hanya lewat preset YAML + MCP yang dipasang user secara sadar.
6. **Satu perintah untuk mulai.** `npx caraka init` → pesan pertama dalam < 3 menit.
7. **Anggaran kompleksitas.** Fitur baru harus menghapus sesuatu. Inti ≤ 8.000 LOC.

---

## 6. Batas produk

**Ya:** kirim tugas dari chat · sesi ber-tab otomatis · streaming progres · approval lewat tombol · memori lintas sesi · banyak workspace · banyak agent.

**Tidak:** agent loop / tool / model provider sendiri · marketplace skill · companion app, voice, kamera · multi-tenant SaaS · menggantikan IDE.

---

## 7. Contoh alur

```
📋 General
Kamu : @toko-api kenapa checkout 500 di staging?
Bot  : ▸ sesi #a91 dibuat → buka topic "toko-api · checkout 500"

🔵 toko-api · checkout 500                                       #a91
Bot  : membaca src/checkout/*.ts …
Bot  : Ketemu — `PaymentService.charge()` melempar saat
       idempotency_key null.

       ⚠️ Butuh izin · tulis src/checkout/payment.ts
       [ ✅ Setujui ]  [ 👁 Diff ]  [ ❌ Tolak ]
Kamu : (tekan ✅)
Bot  : ┌──────────────────────┬──────┬─────────┐
       │ Berkas               │ ±    │ Catatan │
       ├──────────────────────┼──────┼─────────┤
       │ src/checkout/pay.ts  │ +14  │ guard   │
       └──────────────────────┴──────┴─────────┘
       ✓ 34 test lulus · 1:12
       Ingatan disimpan: claim_f3963d7b

🟢 topic berubah hijau dan ditutup
```

---

## 8. Peta dokumen

| Dokumen | Isi |
|---|---|
| `research/` (11 dokumen) | OpenClaw · ACP · matriks agent · memory & Titen · channel Indonesia · keamanan · Telegram API 2026 · model sesi · warna · **perbandingan OpenClaw/Hermes** · **prasyarat & biaya** |
| `adr/` (7 keputusan) | Satu berkas per keputusan besar, dengan alternatif yang ditolak |
| `install-guide.md` | Prasyarat, biaya, jalur gratis, anatomi install.sh, uninstall |
| `faq.md` · `troubleshooting.md` · `api.md` | Pertanyaan berulang · gejala dan perbaikan · kontrak ekstensi |
| `brand.md` | Nama, filosofi, identitas visual, nada bahasa, penamaan teknis |
| `../Caraka Brandkit.dc.html` | Logo book: anatomi, animasi, invert, favicon, ruang aman, larangan, aset |
| `prd.md` | Kenapa, untuk siapa, sukses diukur bagaimana |
| `frd.md` | Perilaku fungsional (FR-xxx) |
| `brd.md` | Konteks bisnis & pasar |
| `session-model.md` | **Sesi = topic**: siklus hidup, penamaan, routing, housekeeping |
| `telegram-integration.md` | Pemetaan fitur Bot API 10.2 |
| `install-flow.md` | Alur install < 3 menit |
| `ui-ux.md` | Pengalaman di chat & terminal |
| `design.md` | Arsitektur teknis, interface, protokol |
| `erd.md` | Model data |
| `techstack.md` | Pilihan teknologi + alasan |
| `security.md` | Model ancaman & kontrol |
| `roadmap.md` | Fase & gerbang keputusan |

---

## 9. Pertanyaan terbuka yang tersisa

| # | Pertanyaan | Default |
|---|---|---|
| Q1 | Ketersediaan `caraka.dev`, npm `caraka`, dan handle GitHub | Perlu dicek; cadangan: `caraka.sh`, npm `carakadev` |
| Q2 | Berapa sesi aktif maksimum sebelum terasa berantakan? | 5 — divalidasi saat dogfood |
| Q3 | Titen dipasang otomatis atau ditawarkan? | Ditawarkan (satu pilihan di wizard) |
| Q4 | Apakah `RichBlockThinking` terlalu berisik untuk dipakai default? | Nyalakan di dogfood, matikan bila mengganggu |
