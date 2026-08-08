# Roadmap

**Produk:** Caraka · **Versi:** 0.2 · **Tanggal:** 7 Agustus 2026

Roadmap ini adalah urutan **pembuktian**, bukan daftar fitur. Setiap fase menjawab satu pertanyaan yang bisa membatalkan fase berikutnya.

**Arah sudah terkunci:** Telegram · Claude Code · Titen · open source · satu operator.

---

## Fase 0 — Spike teknis (1 minggu)

**Pertanyaan:** apakah tiga fondasi ini benar-benar bekerja seperti yang dijanjikan dokumentasi?

- [x] **ACP + Claude Code:** spawn `claude-agent-acp`, `session/new`/`session/load` → `session/prompt` → konsumsi `session/update` → tangani `session/request_permission` → `session/cancel`. Smoke nyata membuktikan initialize, new, prompt, load, dan prompt lanjutan; e2e membuktikan permission callback.
- [ ] **Topic di private chat:** `createForumTopic` di DM tanpa hak admin; kirim ke `message_thread_id`; tetapkan `icon_color` saat membuat, lalu tandai keadaan lewat `editForumTopic` (`name` dan `icon_custom_emoji_id`, karena `icon_color` tidak dapat diubah setelahnya). Konfirmasi perilaku klien (gelembung "Type any message to create a new thread"). Butir ini dulu menyebut `closeForumTopic`; method itu didokumentasikan hanya untuk supergroup, jadi tidak ada yang bisa di-spike di DM (`telegram-integration.md` §2).
- [ ] **Rich Messages:** `sendRichMessage` dengan block table + code; `sendRichMessageDraft` untuk streaming; uji ulang apakah `editMessageText` ber-`rich_message` (Bot API 10.1) sudah cukup, atau pola kirim-baru + hapus-lama masih dibutuhkan.
- [ ] **Titen:** `titen bootstrap` + `titen serve`; POST `/v1/observations`, `/v1/context/compile`; ukur latensi compile.
- [ ] Ukur: latensi ack, RAM, cold start.

**Gerbang keputusan:** bila permission hook ACP tidak andal → arsitektur approval dirancang ulang **sebelum** melanjutkan. Bila topic di private chat tidak berperilaku seperti dokumentasi → model sesi turun ke mode linear dan seluruh UX ditinjau ulang.

---

## Fase 1 — MVP dogfood (`v0.1.x`)

**Pertanyaan:** apakah ini benar-benar berguna dalam pemakaian sehari-hari?

Lingkup minimum yang jujur:
- Telegram saja · driver ACP saja · Claude Code saja · satu workspace
- **Sesi = topic** dengan siklus hidup penuh (buat, warna status, tutup)
- Mode `assisted` + approval tombol + nonce/TTL
- Hasil sebagai Rich Message; progres sebagai edit teks polos
- Audit log + outbound scrubber (**sejak awal, bukan ditambal**)
- `init` + `doctor`

Tanpa memory. Tanpa WhatsApp. Tanpa multi-agent. Tanpa Discord.

`v0.1.0` adalah pratinjau yang dapat dipasang: private DM, topic dengan fallback
linear, sesi ACP persisten, approval HMAC sekali pakai, scrubber, audit, `init`,
`doctor`, dan `start`. Dogfood satu minggu serta lima tugas nyata tetap menjadi
gerbang untuk menutup fase ini; nomor paket tidak menggantikan bukti pemakaian.

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

Enam pekerjaan lain masuk fase ini lewat `spec/v02.md` §2 dan sudah mendarat:
bahasa antarmuka alat, `setMyCommands`, kontrol saat tidak diawasi (`stop`,
`status`, PID file, rate limit, batas durasi run), `caraka service --print`,
jendela trust dengan `/lock`, serta **grup Telegram lewat allowlist**.
Yang terakhir dulu berada di Fase 5 dan
dipasangkan dengan approval ephemeral; pemasangan itu dibatalkan karena ephemeral
tidak bisa menutupi kartu approval (`security.md` §4). Grup masuk dengan
pengungkapan yang dinyatakan, bukan dengan kerahasiaan yang dijanjikan.

**Definition of done:** median waktu dari `npx` sampai pesan pertama terkirim **< 3 menit**, tanpa pertanyaan ke penulis.

---

## Fase 3 — Memori dengan Titen (2 minggu) → `v0.3`

**Pertanyaan:** apakah memori benar-benar meningkatkan kualitas, atau hanya menambah kebisingan?

- [x] `MemoryProvider` + adapter `titen` (observe / compile / feedback / trace / forget; konsolidasi bukan method interface — ia langkah internal Titen, `spec/memori-v03.md`)
- [x] Pemetaan: transcript & tool event → *observation*; keputusan & preferensi → *claim*; injeksi prompt → *context* dengan budget
- [x] Provider `local` sebagai fallback minimal (SQLite + FTS5, tanpa embedding)
- [x] Degradasi: `recall` timeout 500 ms → lanjut tanpa memori
- [x] `/ingat`, `/lupakan`, `/memori` + tautan trace ke claim
- [x] Titen ditawarkan (bukan diwajibkan) di wizard
- [ ] Opsional: sambungkan MCP Titen langsung ke Claude Code — ditunda ke fase berikutnya (`spec/memori-v03.md`)

**Definition of done:** uji A/B pribadi pada 20 tugas, dengan vs tanpa memori. Kalau tidak terasa lebih baik — **kurangi** memori, jangan tambah.

Gerbang A/B itu belum dijalankan saat `v0.3.0` dirilis; ia dipindah menjadi validasi pasca-rilis atas keputusan pemilik 8 Agustus 2026 (`spec/v10.md`). Hasilnya dicatat di sini begitu ada.

---

## Fase 4 — Membuktikan abstraksi (2 minggu) → `v0.4`

**Pertanyaan:** apakah lapisan driver benar-benar generik, atau cuma terlihat generik?

- [x] Driver CLI generik + preset: `codex`, `gemini`, `cursor`, `goose`, `amp`, `aider` (plus `claude-code`, yang membawa kedua jalur)
- [x] Multi-workspace + routing `@slug`
- [x] `/switch <agent>`
- [x] Antrean + concurrency 1 run/workspace
- [ ] Smoke test CI per preset agent — CI yang lahir fase ini memvalidasi setiap preset lewat loader + skema dan menguji parser terhadap fixture rekaman; smoke hidup per binari tidak dibangun karena runner CI tidak punya satu pun agent maupun kredensialnya (8 Agustus 2026, `done/driver-v04/plan.md` langkah 9). Smoke tetap `npm run smoke` per mesin.

**Definition of done:** menambah agent baru = menambah **satu file YAML**, tanpa menyentuh kode inti. Bila ternyata butuh kode, abstraksinya salah — perbaiki sekarang.

Separuh mesin DoD ini tercentang saat `v0.4.0` dirilis: test `one dummy preset YAML drives a full turn to the channel through the CLI driver` (`test/e2e.test.ts`) memuat sebuah preset dari satu berkas YAML dan membuktikan satu giliran penuh sampai ke channel lewat jalur produksi, tanpa berkas `src/core/` disentuh. Pengamatan manusianya — orang lain menambah agent tanpa bertanya — dipindah menjadi validasi pasca-rilis atas keputusan pemilik 8 Agustus 2026 (`spec/v10.md`), dan hasilnya dicatat di sini begitu ada.

---

## Fase 5 — Beta tertutup (3 minggu) → `v0.5`

**Pertanyaan:** apakah produk ini bertahan di tangan orang lain?

- [x] Discord + thread + approval terikat principal (memetakan model sesi yang sama) — `done/discord-v05/spec.md`. Baris ini dulu menulis "approval berbasis role"; role Discord tidak pernah memberi otoritas approval, dan pemetaan role → mode kebijakan (FR-AUTH-06) menunggu gerbang modenya ada di jalur run.
- [x] Dashboard read-only lokal (htmx) — `caraka dashboard`, `done/dashboard-v05/spec.md`
- [ ] Rekrut 20 developer beta, utamakan Indonesia
- [x] Instrumentasi lokal: waktu setup dan aktivasi, dihitung dari audit yang sudah ada, tanpa telemetri keluar. Opt-in melekat pada **membagikan** angkanya, bukan pada mengumpulkannya — audit adalah kontrol wajib dan tidak pernah opsional, jadi angkanya sudah ada di mesin sebelum ada yang membukanya.

**Definition of done:** ≥ 60% peserta mengirim pesan pertama dalam 24 jam **tanpa bertanya**; 0 insiden eksekusi tanpa persetujuan.

Dua baris mesin fase ini tercentang saat `v0.5.0` dirilis. Yang tersisa adalah gerbang manusia: rekrutmen 20 developer beta dan kedua angka DoD hanya bisa dijawab oleh orang lain yang memakainya. Keduanya dipindah menjadi validasi pasca-rilis atas keputusan pemilik 8 Agustus 2026 (`spec/v10.md`), bentuk yang sama dengan Fase 4, dan hasilnya dicatat di sini begitu ada.

---

## Fase 6 — WhatsApp (2 minggu) → `v0.6`

**Pertanyaan:** bisakah kita menyediakan WhatsApp tanpa membakar nomor pengguna?

- [x] Provider `baileys` (persistensi sesi di `secrets/whatsapp/`, reconnect berplafon) + provider `cloud-api` — `done/whatsapp-v06/spec.md`. Baris ini dulu menulis "QR"; payload `qr` Baileys adalah bahan gambar dan tidak ada renderer di repositori ini, jadi yang dipakai adalah `requestPairingCode`, delapan karakter yang bisa diketik.
- [x] Mode linear + header `[ws · #id]` (WhatsApp tidak punya konsep tab) — tanpa satu baris pun kode mode linear yang baru di core: `caps.threads: false` dan `header()` yang sudah ada mengerjakannya
- [x] Fallback approval kode `ok A7F3` — kolom `short_code`, index unik parsial, batas lima percobaan salah, dan plafon lima approval menunggu per sesi. Aturan keras 2 di `AGENTS.md` diamendemen di PR yang sama, ADR-0009
- [x] Rate limit + jitter + larangan first-contact **di level kode** — satu fungsi kirim yang tidak bisa dilewati pemanggil mana pun; 12 pesan / 60 detik bergulir, jeda acak 1.200–3.500 md
- [x] Alur peringatan risiko yang tidak bisa dilewati — `provider: baileys` tanpa `acknowledgeRisk: true` menghentikan start dengan pesan yang menautkan `docs/whatsapp-risiko.md`, dan peringatan nomor terpisah dicetak setiap `caraka start`. Setengahnya belum: `caraka init whatsapp` tidak dibangun, jadi peringatannya tiba sesudah blok config ditulis tangan, bukan sebelum
- [ ] Uji lapangan 14 hari di nomor terpisah

**Definition of done:** 14 hari pemakaian nyata tanpa ban dan tanpa relink manual — **atau** temuan jujur yang menjadikan Cloud API sebagai rekomendasi utama.

Lima baris mesin fase ini tercentang saat `v0.6.0` dirilis. Yang tersisa adalah gerbang lapangan, dan ia tidak bisa dijawab dari repositori: tidak ada nomor WhatsApp hidup yang pernah ditautkan ke kode ini, dan tidak ada webhook Cloud API hidup yang pernah diterima. Ia dipindah menjadi validasi pasca-rilis atas keputusan pemilik 8 Agustus 2026 (`spec/v10.md`), bentuk yang sama dengan Fase 3, 4, dan 5, dan hasilnya dicatat di sini begitu ada. Sampai itu tiba, rekomendasi yang berlaku sudah tertulis di `docs/whatsapp-risiko.md`: `cloud-api` bila nomor itu penting bagimu.

---

## Fase 7 — Rilis publik (2 minggu) → `v1.0`

- [ ] Checklist keamanan `security.md` tuntas
- [ ] Dokumentasi dwibahasa (ID/EN) + halaman risiko WhatsApp — separuhnya sudah mendarat lebih awal: halaman risikonya ditulis di v0.6 dalam dua bahasa (`docs/whatsapp-risiko.md`, `docs/whatsapp-risiko.en.md`) karena pesan galat yang menolak `provider: baileys` menautkannya. Sisa dokumentasi dwibahasa, dan halaman risiko di `caraka.dev`, tetap pekerjaan fase ini
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
