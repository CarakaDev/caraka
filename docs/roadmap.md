# Roadmap

**Produk:** Caraka · **Versi:** 0.2 · **Tanggal:** 7 Agustus 2026

Roadmap ini adalah urutan **pembuktian**, bukan daftar fitur. Setiap fase menjawab satu pertanyaan yang bisa membatalkan fase berikutnya.

**Arah sudah terkunci:** Telegram · Claude Code · Titen · open source · satu operator.

---

## Fase 0 — Spike teknis (1 minggu)

**Pertanyaan:** apakah tiga fondasi ini benar-benar bekerja seperti yang dijanjikan dokumentasi?

- [ ] **ACP + Claude Code:** spawn `claude-agent-acp`, `session/new` → `session/prompt` → konsumsi `session/update` → tangani `session/request_permission` → `session/cancel`. **Konfirmasi permission request benar-benar muncul untuk operasi tulis.**
- [ ] **Topic di private chat:** `createForumTopic` di DM tanpa hak admin; kirim ke `message_thread_id`; ubah `icon_color`; `closeForumTopic`. Konfirmasi perilaku klien (gelembung "Type any message to create a new thread").
- [ ] **Rich Messages:** `sendRichMessage` dengan block table + code; `sendRichMessageDraft` untuk streaming; verifikasi tidak ada `editRichMessage` dan pola kirim-baru + hapus-lama bekerja.
- [ ] **Titen:** `titen bootstrap` + `titen serve`; POST `/v1/observations`, `/v1/context/compile`; ukur latensi compile.
- [ ] Ukur: latensi ack, RAM, cold start.

**Gerbang keputusan:** bila permission hook ACP tidak andal → arsitektur approval dirancang ulang **sebelum** melanjutkan. Bila topic di private chat tidak berperilaku seperti dokumentasi → model sesi turun ke mode linear dan seluruh UX ditinjau ulang.

---

## Fase 1 — MVP dogfood (2–3 minggu) → `v0.1`

**Pertanyaan:** apakah ini benar-benar berguna dalam pemakaian sehari-hari?

Lingkup minimum yang jujur:
- Telegram saja · driver ACP saja · Claude Code saja · satu workspace
- **Sesi = topic** dengan siklus hidup penuh (buat, warna status, tutup)
- Mode `assisted` + approval tombol + nonce/TTL
- Hasil sebagai Rich Message; progres sebagai edit teks polos
- Audit log + outbound scrubber (**sejak awal, bukan ditambal**)
- `init` + `doctor`

Tanpa memory. Tanpa WhatsApp. Tanpa multi-agent. Tanpa Discord.

**Definition of done:** penulis memakainya 1 minggu penuh dan menyelesaikan ≥ 5 tugas nyata tanpa membuka laptop; daftar topic terasa **lebih rapi** daripada satu aliran chat. Bila terasa mengganggu, perbaiki dulu — jangan tambah fitur.

---

## Fase 2 — Install yang mulus (1 minggu) → `v0.2`

**Pertanyaan:** bisakah orang lain memasangnya tanpa bantuan?

- [ ] Wizard `init` lengkap sesuai `install-flow.md`
- [ ] Auto-discovery agent (PATH + ACP Registry)
- [ ] Deep link pairing `?start=pair_<kode>`
- [ ] Validasi token via `getMe` saat itu juga
- [ ] Deteksi kemampuan container (topic aktif/tidak) + mode linear otomatis
- [ ] `doctor --fix`
- [ ] Uninstall bersih
- [ ] Rekam 5 sesi setup nyata dari orang yang belum pernah melihat produk ini

**Definition of done:** median waktu dari `npx` sampai pesan pertama terkirim **< 3 menit**, tanpa pertanyaan ke penulis.

---

## Fase 3 — Memori dengan Titen (2 minggu) → `v0.3`

**Pertanyaan:** apakah memori benar-benar meningkatkan kualitas, atau hanya menambah kebisingan?

- [ ] `MemoryProvider` + adapter `titen` (observe / consolidate / compile / feedback / trace)
- [ ] Pemetaan: transcript & tool event → *observation*; keputusan & preferensi → *claim*; injeksi prompt → *context* dengan budget
- [ ] Provider `local` sebagai fallback minimal (SQLite + FTS5, tanpa embedding)
- [ ] Degradasi: `recall` timeout 500 ms → lanjut tanpa memori
- [ ] `/ingat`, `/lupakan`, `/memori` + tautan trace ke claim
- [ ] Titen ditawarkan (bukan diwajibkan) di wizard
- [ ] Opsional: sambungkan MCP Titen langsung ke Claude Code

**Definition of done:** uji A/B pribadi pada 20 tugas, dengan vs tanpa memori. Kalau tidak terasa lebih baik — **kurangi** memori, jangan tambah.

---

## Fase 4 — Membuktikan abstraksi (2 minggu) → `v0.4`

**Pertanyaan:** apakah lapisan driver benar-benar generik, atau cuma terlihat generik?

- [ ] Driver CLI generik + preset: `codex`, `gemini`, `cursor`, `goose`, `amp`, `aider`
- [ ] Multi-workspace + routing `@slug`
- [ ] `/switch <agent>`
- [ ] Antrean + concurrency 1 run/workspace
- [ ] Smoke test CI per preset agent

**Definition of done:** menambah agent baru = menambah **satu file YAML**, tanpa menyentuh kode inti. Bila ternyata butuh kode, abstraksinya salah — perbaiki sekarang.

---

## Fase 5 — Beta tertutup (3 minggu) → `v0.5`

**Pertanyaan:** apakah produk ini bertahan di tangan orang lain?

- [ ] Grup Telegram + **ephemeral approval** (`receiver_user_id`)
- [ ] Discord + thread + approval berbasis role (memetakan model sesi yang sama)
- [ ] Dashboard read-only lokal (htmx)
- [ ] Rekrut 20 developer beta, utamakan Indonesia
- [ ] Instrumentasi lokal opt-in: waktu setup, aktivasi (tanpa telemetri keluar)

**Definition of done:** ≥ 60% peserta mengirim pesan pertama dalam 24 jam **tanpa bertanya**; 0 insiden eksekusi tanpa persetujuan.

---

## Fase 6 — WhatsApp (2 minggu) → `v0.6`

**Pertanyaan:** bisakah kita menyediakan WhatsApp tanpa membakar nomor pengguna?

- [ ] Provider `baileys` (QR, persistensi sesi, reconnect) + provider `cloud-api`
- [ ] Mode linear + header `[ws · #id]` (WhatsApp tidak punya konsep tab)
- [ ] Fallback approval kode `ok A7F3`
- [ ] Rate limit + jitter + larangan first-contact **di level kode**
- [ ] Alur peringatan risiko yang tidak bisa dilewati
- [ ] Uji lapangan 14 hari di nomor terpisah

**Definition of done:** 14 hari pemakaian nyata tanpa ban dan tanpa relink manual — **atau** temuan jujur yang menjadikan Cloud API sebagai rekomendasi utama.

---

## Fase 7 — Rilis publik (2 minggu) → `v1.0`

- [ ] Checklist keamanan `security.md` tuntas
- [ ] Dokumentasi dwibahasa (ID/EN) + halaman risiko WhatsApp
- [ ] ≥ 15 agent tercakup (7 diuji langsung, sisanya via ACP Registry)
- [ ] `SECURITY.md`, `CONTRIBUTING.md`, lisensi MIT, repo publik
- [ ] Artikel pembanding jujur: "Kapan pakai OpenClaw, kapan pakai Caraka"
- [ ] Kontribusi balik: catatan integrasi ke ekosistem ACP & Titen
- [ ] Peluncuran: komunitas dev Indonesia → ekosistem ACP/MCP → publik

**Definition of done:** seluruh sasaran G1–G6 di `prd.md` terpenuhi dan terukur.

---

## Sesudah v1.0 — kandidat, bukan janji

| Kandidat | Syarat masuk |
|---|---|
| Driver MCP inbox (Cline, Kilo, Windsurf, Kiro, Antigravity) | permintaan nyata dari pengguna agent tersebut |
| Signal (`signal-cli`) | ≥ 20 permintaan |
| Mini App sebagai dashboard | dashboard htmx terbukti kurang |
| Multi-operator / tim (+ Titen Level 6) | terbukti dipakai tim, bukan asumsi |
| Cron sederhana | **bukan** heartbeat berbasis agent — mahal & berisik |
| Managed Bots one-tap | hanya bila manager bot dijalankan user sendiri |
| Memory dengan LLM | mengikuti roadmap `consolidations` Titen, bukan dibangun sendiri |

**Tidak akan pernah masuk:** marketplace plugin, agent runtime sendiri, tool eksekusi sendiri, aplikasi mobile, hosted multi-tenant.

---

## Ritme & disiplin

- Siklus 2 minggu; setiap siklus berakhir dengan sesuatu yang bisa dipakai.
- **Anggaran kompleksitas:** fitur baru masuk hanya bila (a) menghapus sesuatu, atau (b) inti tetap ≤ 8.000 LOC.
- Setiap usulan diuji: *"apakah coding agent sudah bisa melakukan ini?"* Kalau ya → tolak.
- Setiap fase punya gerbang keputusan. Boleh berhenti, boleh berbelok — yang tidak boleh adalah menambah lingkup tanpa membuang lingkup.

---

## Estimasi waktu

| Fase | Durasi | Kumulatif |
|---|---|---|
| 0 Spike | 1 minggu | 1 minggu |
| 1 MVP dogfood | 3 minggu | 4 minggu |
| 2 Install mulus | 1 minggu | 5 minggu |
| 3 Memori (Titen) | 2 minggu | 7 minggu |
| 4 Abstraksi driver | 2 minggu | 9 minggu |
| 5 Beta | 3 minggu | 12 minggu |
| 6 WhatsApp | 2 minggu | 14 minggu |
| 7 Rilis | 2 minggu | **16 minggu (±4 bulan)** |

Asumsi: satu pengembang, dibantu coding agent — yang memang menjadi subjek produk ini.
