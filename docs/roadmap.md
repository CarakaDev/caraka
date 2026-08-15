# Roadmap

**English:** this document is Indonesian only, and stays that way because it is internal specification. English documentation starts at [`../README.md`](../README.md).

**Produk:** Caraka · **Versi:** 0.2 · **Tanggal:** 7 Agustus 2026

Roadmap ini adalah urutan **pembuktian**, bukan daftar fitur. Setiap fase menjawab satu pertanyaan yang bisa membatalkan fase berikutnya.

**Arah sudah terkunci:** Telegram · Claude Code · Titen · open source · satu operator.

---

## Fase 0 — Spike teknis (1 minggu)

**Pertanyaan:** apakah tiga fondasi ini benar-benar bekerja seperti yang dijanjikan dokumentasi?

- [x] **ACP + Claude Code:** spawn `claude-agent-acp`, `session/new`/`session/load` → `session/prompt` → konsumsi `session/update` → tangani `session/request_permission` → `session/cancel`. Smoke nyata membuktikan initialize, new, prompt, load, dan prompt lanjutan; e2e membuktikan permission callback.
- [ ] **Topic di private chat:** `createForumTopic` di DM tanpa hak admin; kirim ke `message_thread_id`; tetapkan `icon_color` saat membuat, lalu tandai keadaan lewat `editForumTopic` (`name` dan `icon_custom_emoji_id`, karena `icon_color` tidak dapat diubah setelahnya). Konfirmasi perilaku klien (gelembung "Type any message to create a new thread"). Butir ini dulu menyebut `closeForumTopic`; method itu didokumentasikan hanya untuk supergroup, jadi tidak ada yang bisa di-spike di DM (`telegram-integration.md` §2). Paruh kodenya sudah mendarat di `src/channels/telegram.ts`: `createTopic` menetapkan `icon_color` sekali saat membuat, `editTopic` menulis keadaan ke `name`, dan `sendText` mengirim ke `message_thread_id`. Hak admin tidak pernah diminta, dan `Gateway.topicsAvailable` beserta `noteThreadsOff` di `src/core/gateway.ts` memperlakukan penolakan pertama sebagai jawaban. Peta glif keadaannya ditutup di `done/topic-state-glyphs/spec.md`, yang sekalian mengeluarkan `icon_custom_emoji_id` dari lingkup karena ia menuntut custom emoji milik bot. Yang menahan kotak ini adalah paruh spike-nya: gelembung klien itu baru dibaca dari `core.telegram.org/api/forum` lewat `docs/research/sesi-topic-thread-telegram-discord.md`, dan repositori ini tidak memuat satu pun rekaman DM hidup yang memperlihatkannya. Yang menutupnya bukan kode: satu bot Telegram hidup, satu DM, dan satu orang yang melihat gelembung itu muncul di kliennya sendiri. Repositori tidak bisa menyediakan salah satu pun dari ketiganya, jadi kotak ini pindah menjadi validasi pasca-rilis pada 10 Agustus 2026, bentuk yang sama dengan gerbang lapangan di Fase 3 sampai 6
- [ ] **Rich Messages:** `sendRichMessage` dengan block table + code; `sendRichMessageDraft` untuk streaming; uji ulang apakah `editMessageText` ber-`rich_message` (Bot API 10.1) sudah cukup, atau pola kirim-baru + hapus-lama masih dibutuhkan. Yang mendarat cuma yang pertama, dalam bentuk paling sederhananya: `Telegram.sendResult` mengirim `rich_message: { markdown }` per pecahan dan jatuh ke teks polos begitu Telegram menolaknya. Block terstruktur dan `sendRichMessageDraft` dinyatakan di luar lingkup v0.2 (`done/v02/spec.md` §3.8) dan tidak pernah dibangun sesudahnya. Uji ulang `editMessageText` juga belum dijalankan: `docs/design.md`, `docs/frd.md` FR-RICH-02, dan `docs/telegram-integration.md` §2 sama-sama masih menulis "belum diuji ulang", dan ketiganya masih benar pada 10 Agustus 2026. Uji ulang itu tidak bisa dijalankan dari sini: ia dibaca dari pesan yang benar-benar tergambar ulang di klien Telegram, jadi butuh bot hidup dan orang yang menontonnya. Kotak ini pindah menjadi validasi pasca-rilis pada 10 Agustus 2026 bersama kotak topic di atasnya
- [x] **Titen:** `titen bootstrap` + `titen serve`; POST `/v1/observations`, `/v1/context/compile`; ukur latensi compile. Terjawab pada 10 Agustus 2026 terhadap Titen 0.7.3 hidup di `127.0.0.1:8787` — port default `titen serve`, bukan `7717` yang ditulis baris ini sampai saat itu. Latensi compile **4,9 md** median dari sepuluh panggilan berurutan, 4,2 md terendah dan 5,4 md tertinggi, budget 800 token, `used_tokens` 0. Caranya: `performance.now()` mengelilingi `compile` lewat adapter yang sudah dibangun, dijalankan sebagai proses di host yang menjalankan Titen, terhadap subject yang punya satu observation. Pengukuran pertama spike ini mencatat 2,3–4,3 **detik** dan angka itu dibuang, bukan dilaporkan: tiap sampelnya satu `ssh` baru yang menjalankan satu `curl`, jadi yang terukur jabat tangan SSH-nya. `curl` yang dijalankan di host itu sendiri menjawab 2–3 md, sekelas dengan angka in-process. Apa yang dibuktikan run itu terutama adalah bahwa adapter sebelumnya salah di setiap field: `scope`/`text` dan bukan `subject_id`/`content`, `budgetTokens` dan bukan `max_tokens`, tanpa header `authorization` terhadap server yang menjawab `401` di setiap rute kecuali `/healthz`, dan doctor menyelidik `/health` yang menjawab 404. Semuanya lolos test karena mock-nya menyepakati bentuk yang sama salahnya. Yang **belum** terjawab dan sengaja tidak diklaim: perjalanan pulangnya. `compile` hanya mengembalikan claim, `POST /v1/consolidations` menuntut `claims[].statement` beserta `sources[].relation`, dan tidak ada yang memanggilnya di sini — jadi di bawah Titen sebuah observation hanya-tulis (`docs/design.md` §13)
- [ ] Ukur: latensi ack, RAM, cold start. RAM dan cold start sudah terukur di bawah. Latensi ack belum: ia dibaca dari pesan sungguhan ke bot yang hidup, jadi butuh token yang bekerja dan orang yang mengetik, dan tidak ada cara mengukurnya dari sini (8 Agustus 2026).

### Pengukuran RAM, cold start, dan ukuran paket

Mesin: AMD Ryzen AI 9 HX 370 (24 thread), RAM 24.194.772 kB, Linux 7.0.0-28-generic x86_64, Node v24.18.0, npm 11.16.0. Yang diukur adalah `dist/` hasil `npm run build` di atas `v0.6.0`. Puncak RSS dan waktu dinding datang dari `/usr/bin/time -v`, yang menghitung proses beserta anak yang sudah dituai. RSS saat diam dibaca dari `VmRSS` di `/proc/<pid>/status`, disampel tiap 500 md. Setiap angka di bawah adalah bacaan apa adanya, bukan pembulatan ke sasaran G3 di `prd.md`.

**Cold start** — `caraka start` memakai config bertoken Telegram mati. Baris `Caraka is live` terbit pada 119 md, 121 md, dan 146 md dalam tiga kali menjalankan. Proses lalu berhenti pada 772–838 md; selisihnya satu perjalanan HTTPS ke `api.telegram.org` yang dijawab 401. Penolakan itu jatuh di dalam `channel.start()`, jadi angka ini belum memuat spawn adapter ACP. Sebagai pembanding: `node -e ''` 10 md, dan `import("./dist/cli.js")` saja 110–150 md.

**Puncak RSS `caraka start` sampai penolakan** — 103.288, 103.916, 104.112, 104.440, dan 105.864 kB dalam lima kali menjalankan.

**RAM saat diam** — token yang mati membuat proses mati juga, jadi angka diam dibaca dari jalur yang benar-benar sampai ke loop: config `whatsapp` `cloud-api` dengan kredensial palsu, baris `startup.notice` disemai lebih dulu supaya tidak ada satu pun paket keluar dari mesin. Pada detik ke-25, proses `caraka` memegang 94.324 kB dan adapter ACP yang ia spawn memegang 107.612 kB, jadi 201.936 kB untuk keduanya. Selama 30 detik, pohon proses bergerak antara 199.880 kB dan 231.220 kB.

Yang mengisi 94 MB itu bukan kode Caraka: `node -e ''` sendiri sudah 41.956–42.396 kB, dan `import("@agentclientprotocol/sdk")` saja membawanya ke 89.560 kB. Sasaran G3 "RAM idle < 80 MB" karena itu tidak terpenuhi, dan tidak akan terpenuhi dengan memangkas `src/`.

**`caraka doctor`** — 1,05–1,12 detik dinding dengan puncak RSS pohon 323.244–324.120 kB pada mesin yang punya `claude` dan `codex` di PATH; puncak itu milik `claude --version` yang di-spawn discovery, bukan milik doctor. Dengan PATH tanpa agent sama sekali, doctor sendiri 0,73–0,77 detik dan 102.236–103.256 kB.

**Ukuran paket** — `npm pack --json` sesudah `npm run build`: tarball 182.869 byte, isi terbuka 697.228 byte, 86 berkas. Terpasang, angkanya lain: `npm install caraka-0.6.0.tgz --omit=dev` ke direktori kosong menarik 106 paket dan menempati 309.248.851 byte, dan 275.013.181 byte di antaranya adalah `@anthropic-ai/claude-agent-sdk-linux-x64`, yang masuk lewat `@agentclientprotocol/claude-agent-acp`. Sasaran G3 "Paket < 15 MB" terpenuhi untuk yang diterbitkan dan tidak terpenuhi untuk yang mendarat di disk pemasang.

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

Dogfood seminggu itu belum dijalankan saat fase-fase sesudahnya mendarat; ia dipindah menjadi validasi pasca-rilis atas keputusan pemilik 8 Agustus 2026 (`done/v10/spec.md`), dan hasilnya dicatat di sini begitu ada.

---

## Fase 2 — Install yang mulus (1 minggu) → `v0.2`

**Pertanyaan:** bisakah orang lain memasangnya tanpa bantuan?

- [x] Wizard `init` lengkap sesuai `install-flow.md` — `init()` di `src/cli.ts` menjalankan urutan itu utuh: pemeriksaan Node 22+ dan Git, discovery agent, pilihan bahasa, prompt token raw-mode yang tidak mencetak apa pun, `getMe`, `deleteWebhook`, tautan pairing, konfirmasi identitas di terminal, tawaran memori, lalu `saveConfig` yang menulis `~/.caraka` 0700 dan tiap secret 0600. Dua hal berbeda dari dokumen yang ditulis untuk v0.1. Persyaratan kerasnya bergeser: satu agent yang ditemukan sudah cukup dan status login Claude pindah ke `doctor` (AC-9.8, `done/driver-v04/spec.md`). Ringkasan penutupnya juga lebih pendek daripada §5: ia mencetak config, bot, dan perintah berikutnya, tanpa baris mode topic dan tanpa baris model keamanan
- [x] Auto-discovery agent lewat PATH — `src/discovery.ts` memindai tujuh biner yang disebut FR-SETUP-02, menyelidik `--version` masing-masing, dan menyimpan hasilnya 24 jam di `~/.caraka/discovery.json`; cache yang rusak dibaca sebagai tidak ada cache. `init` berhenti hanya bila tidak menemukan satu pun, dan `caraka doctor` memaksa pindai ulang lalu mencetak satu baris per agent lewat `agentChecks` di `src/cli.ts`. Di mesin penulis pindaian itu menemukan `claude` dan `codex` tanpa satu pun konfigurasi, dan angka doctor di Fase 0 diukur pada PATH yang sama
- [ ] Pembacaan ACP Registry — dicabut, bukan tertinggal. Pada tinjauan pra-tutup Fase 4, 8 Agustus 2026, AC-9.2 dan AC-9.3 ditarik karena metadata yang dibaca tidak ditampilkan di mana pun, sehingga pembacaannya adalah kode mati berharga satu fetch pada setiap first run (`done/driver-v04/spec.md`; header `src/discovery.ts` menuliskan alasan yang sama). Ia kembali bersama baris `doctor` yang menampilkannya
- [x] Deep link pairing `?start=pair_<kode>` — `pairingCode()` di `src/cli.ts` menarik 9 byte dari `randomBytes` menjadi payload `pair_…`, dan `init` mencetak `https://t.me/<bot>?start=<payload>` bersama satu baris yang menyebut tautan itu bearer secret. `claim()` menjawab satu pesan saja, membandingkan seluruh teks `/start <payload>` dengan `timingSafeEqual` karena payload-nya datang dari jaringan, dan mati sendiri di `PAIRING_TTL_MS` — lima menit, deadline yang sama yang membatalkan poll `getUpdates` lewat `AbortController` alih-alih menunggu putaran berikutnya. Tidak ada tanda tangan, dan alasannya ditulis di header fungsinya: kode ini tidak pernah meninggalkan proses yang akan memeriksanya. unit: *the pairing code answers once, dies on its own clock, and refuses a wrong code*
- [x] Validasi token via `getMe` saat itu juga — `init` memanggilnya tepat setelah prompt token dan melempar `cli.tokenRejected` sebelum satu berkas pun ditulis; `saveConfig` baru berjalan di akhir wizard, jadi token yang ditolak tidak menyentuh disk. `doctor` mengulang pemeriksaan yang sama dan membandingkan `username` yang dijawab dengan `telegram.botUsername` di config (keduanya di `src/cli.ts`, jalur `getMe` diuji di `test/unit.test.ts`)
- [x] Deteksi kemampuan container (topic aktif/tidak) + mode linear otomatis — dua lapis. Yang berlaku bot-wide adalah preferensi operator, bukan bacaan: sejak 1.4.1, 14 Agustus 2026, `init` menulis `telegram.topics` bernilai benar **tanpa** membaca `has_topics_enabled`. Bot API mendefinisikan field itu sebagai mode topic di percakapan pribadi, dan menuliskannya sebagai gerbang membuat supergroup forum yang topic-nya hidup tidak pernah mendapat satu pun dari Caraka (`done/topic-dm-vs-grup/spec.md` AC-1, `src/cli.ts`). Nilai itu disimpan sebagai `telegram.topics` (`src/config.ts`) dan menjadi `caps.threads` (`src/channels/telegram.ts`); gerbangnya sendiri sengaja tidak disentuh, karena memindahkan pemeriksaan `caps.threads` ke cabang `private` memperbaiki Telegram dengan merusak `discord.threads`, yang di sana adalah opt-out operator sungguhan. Yang per-container dijawab saat sesi dibuat: `Gateway.topicsAvailable` membaca `is_forum` beserta penanda `threads.<chatId>` di tabel `meta`, `noteThreadsOff` menulis penanda itu pada penolakan sungguhan yang pertama alih-alih memancing dengan topic uji, dan sesi berikutnya jalan linear tanpa satu cabang pun atas `channel.id`. `caraka doctor` menghapus penanda itu supaya container yang pernah menolak dicoba lagi, dan kedua barisnya kini menyebut percakapan pribadi apa adanya — yang pertama menambahkan bahwa topic milik grup tidak terpengaruh, karena baris lamanya yang berbunyi "Topics" saja pernah mengirim pemilik grup ke @BotFather atas setelan yang tidak menyentuh grupnya
- [x] `doctor --fix` — `doctorFix` di `src/cli.ts` menjalankan pass perbaikan sebelum baris-baris `doctor` dicetak, jadi yang dilaporkan adalah keadaan setelahnya. Yang diperbaikinya cuma empat hal yang punya nilai benar tertulis: direktori `~/.caraka`, `secrets/`, dan sesi WhatsApp dikembalikan ke 0700, tiap berkas rahasia ke 0600, dan PID file yang menyebut proses mati dihapus. Setiap cabangnya `stat`, `chmod`, `mkdir`, atau unlink — tidak ada yang menulis kredensial dan tidak ada yang membuka socket. Yang ditolaknya keluar dengan alasannya: config yang tidak terbaca, workspace yang hilang, dan allowlist kosong tidak diperbaiki karena ketiganya keputusan pemilik, bukan drift. Bit milik pemilik sendiri dibiarkan, dan di Windows mode berkas tidak disentuh sama sekali karena `privateFile` sudah membacanya sebagai privat. unit: *doctor --fix repairs what drifted and names what it will not decide*
- [x] Uninstall bersih — `uninstallTargets` menyebut delapan path: config, database beserta `-wal` dan `-shm`, cache discovery, direktori `inbox/` tempat lampiran chat mendarat selama sebuah run membacanya — satu subdirektori per sesi di 0700 — PID file, dan seluruh `secrets/`. Kedua sidecar SQLite ikut karena `caraka.db-wal` memegang ekor sesi terakhir. `~/.caraka` sendiri tidak ada di daftar itu; ia dihapus lewat `rmdir` yang hanya berhasil kalau kosong, jadi berkas yang diletakkan pemilik di sana selamat. Gateway yang hidup menghentikan perintahnya dengan exit 78 sebelum satu berkas pun dihapus, konfirmasinya menuntut kata `uninstall` diketik utuh, dan penolakan keluar 1 supaya `caraka uninstall && …` tidak membacanya sebagai penghapusan. Dua hal dinyatakan bukan miliknya untuk dihapus dan dicetak sebelum konfirmasi: bot di sisi Telegram dan apa pun yang ditulis coding agent di workspace. unit: *uninstall lists only what Caraka wrote and takes the whole word*
- [ ] Rekam 5 sesi setup nyata dari orang yang belum pernah melihat produk ini — nol dari lima pada 10 Agustus 2026. Ia menuntut lima orang yang belum pernah melihat produk ini, waktu mereka, dan izin merekamnya; tidak ada satu pun dari ketiganya yang bisa dibuat di repositori. Validasi pasca-rilis sejak keputusan pemilik 8 Agustus 2026

Enam pekerjaan lain masuk fase ini lewat `done/v02/spec.md` — lima dari §2, yang terakhir lewat §2b.2 — dan sudah mendarat:
bahasa antarmuka alat, `setMyCommands`, kontrol saat tidak diawasi (`stop`,
`status`, PID file, rate limit, batas durasi run), `caraka service --print`,
jendela trust dengan `/lock`, serta **grup Telegram lewat allowlist**.
Yang terakhir dulu berada di Fase 5 dan
dipasangkan dengan approval ephemeral; pemasangan itu dibatalkan karena ephemeral
tidak bisa menutupi kartu approval (`security.md` §4). Grup masuk dengan
pengungkapan yang dinyatakan, bukan dengan kerahasiaan yang dijanjikan.

**Definition of done:** median waktu dari `npx` sampai pesan pertama terkirim **< 3 menit**, tanpa pertanyaan ke penulis.

Lima rekaman setup itu belum ada, dan tanpa rekamannya median di atas tidak punya sampel untuk dihitung. Keduanya dipindah menjadi validasi pasca-rilis atas keputusan pemilik 8 Agustus 2026 (`done/v10/spec.md`), dan hasilnya dicatat di sini begitu ada.

---

## Fase 3 — Memori dengan Titen (2 minggu) → `v0.3`

**Pertanyaan:** apakah memori benar-benar meningkatkan kualitas, atau hanya menambah kebisingan?

- [x] `MemoryProvider` + adapter `titen` (observe / compile / feedback / trace / forget; konsolidasi bukan method interface — ia langkah internal Titen, `done/memori-v03/spec.md`)
- [x] Pemetaan: transcript & tool event → *observation*; keputusan & preferensi → *claim*; injeksi prompt → *context* dengan budget
- [x] Provider `local` sebagai fallback minimal (SQLite + FTS5, tanpa embedding)
- [x] Degradasi: `recall` timeout 500 ms → lanjut tanpa memori
- [x] `/ingat`, `/lupakan`, `/memori` + tautan trace ke claim
- [x] Titen ditawarkan (bukan diwajibkan) di wizard
- [x] Opsional: sambungkan MCP Titen langsung ke Claude Code — **diputuskan dan dibatalkan** pada 10 Agustus 2026, alasan lengkap dan angkanya di `done/mcp-titen-passthrough/spec.md`. Diukur dulu, baru ditolak: sesi ACP lewat `ClaudeAcp` apa adanya, yang mengirim `mcpServers: []`, sudah membawa ke-18 tool Titen karena adapter `claude-agent-acp` tidak pernah menyetel `strictMcpConfig`, sehingga registrasi MCP milik pengguna tetap terbaca. Registrasi itu bukan `.mcp.json` seperti yang ditulis pertama kali: di mesin uji tidak ada `.mcp.json` di direktori kerja mana pun yang dipakai, yang ada dua entri stdio `titen mcp` di `~/.claude.json`, satu scope-pengguna dengan `TITEN_MCP_URL` dan `TITEN_API_KEY` dan satu scope-proyek dengan `env` kosong. Yang teramati juga bukan pembacaan memori: ke-18 tool hadir dan satu `titen_project_resolve` dipanggil, dan tool itu dijawab store mana pun, jadi tidak pernah ditunjukkan bahwa sesi itu membaca database yang dilayani. Penolakannya tidak bergantung pada itu dan tidak berubah: 12 dari 18 tool menulis atau menghapus di luar scrubber, di luar audit, dan di luar budget `compile`. Sejak `ec7060d` di hulu jembatan menyebut sendiri store yang dibukanya, yang memperbaiki cara memasangnya, bukan permukaan tulis yang jadi alasan menolak

**Definition of done:** uji A/B pribadi pada 20 tugas, dengan vs tanpa memori. Kalau tidak terasa lebih baik — **kurangi** memori, jangan tambah.

Gerbang A/B itu belum dijalankan saat `v0.3.0` dirilis; ia dipindah menjadi validasi pasca-rilis atas keputusan pemilik 8 Agustus 2026 (`done/v10/spec.md`). Hasilnya dicatat di sini begitu ada.

---

## Fase 4 — Membuktikan abstraksi (2 minggu) → `v0.4`

**Pertanyaan:** apakah lapisan driver benar-benar generik, atau cuma terlihat generik?

- [x] Driver CLI generik + preset: `codex`, `gemini`, `cursor`, `goose`, `amp`, `aider` (plus `claude-code`, yang membawa kedua jalur)
- [x] Multi-workspace + routing `@slug`
- [x] `/switch <agent>`
- [x] Antrean + concurrency 1 run/workspace
- [ ] Smoke test CI per preset agent — masih tidak ada, dan alasannya sekarang tertulis per agent alih-alih sebagai satu kalimat. Job `presets` di `.github/workflows/ci.yml` memvalidasi setiap preset lewat loader + skema, menguji parser terhadap fixture rekaman, dan sejak 10 Agustus 2026 juga menolak preset yang menyatakan sebuah rute tanpa menyebut perintah untuk rute itu — hal yang tidak bisa dinyatakan skema, karena `command` dan `acp` sama-sama opsional di sana. Yang tetap tidak bisa dijalankan runner adalah giliran hidupnya, dan header workflow itu mendaftar alasannya untuk kesembilan preset lewat empat jalan berbeda: `claude-code`, `codex`, dan `goose` menuntut akun developer yang sudah masuk, dan menaruh akun berbayar di secrets repositori publik berarti menyerahkannya ke setiap fork; `aider` tidak butuh akun tetapi butuh model di mesin, dan model terkecil yang berguna adalah tarikan multi-gigabyte per job untuk dua giliran kerja; `gemini`, `cursor`, dan `amp` menuntut login atau kunci API berbayar; dan `antigravity`, yang jalan keempatnya — satu-satunya sign-in-nya adalah URL OAuth Google dengan jendela tempel enam puluh detik, yang belum pernah dikenai run tanpa penunggu, di runner maupun di mesin ini. `opencode` mendarat bersamanya di v1.4.0 pada 14 Agustus 2026 dan jatuh ke kelompok pertama. Daftar itu sempat berhenti di tujuh sampai 15 Agustus 2026, dua rilis sesudah keduanya ada, sementara `presets/agents/` sudah berisi sembilan berkas dan test `the nine shipped presets load, and every unverified flag says so` mematoknya. Yang bergerak di sisi mesin per-mesin: `npm run smoke` naik dari dua jalan menjadi lima (`claude-code` ACP, `claude-code cli`, `codex`, `aider`, `goose`), masing-masing melewati kalau binernya tidak ada

**Definition of done:** menambah agent baru = menambah **satu file YAML**, tanpa menyentuh kode inti. Bila ternyata butuh kode, abstraksinya salah — perbaiki sekarang.

Separuh mesin DoD ini tercentang saat `v0.4.0` dirilis: test `one dummy preset YAML drives a full turn to the channel through the CLI driver` (`test/e2e.test.ts`) memuat sebuah preset dari satu berkas YAML dan membuktikan satu giliran penuh sampai ke channel lewat jalur produksi, tanpa berkas `src/core/` disentuh. Pengamatan manusianya — orang lain menambah agent tanpa bertanya — dipindah menjadi validasi pasca-rilis atas keputusan pemilik 8 Agustus 2026 (`done/v10/spec.md`), dan hasilnya dicatat di sini begitu ada.

---

## Fase 5 — Beta tertutup (3 minggu) → `v0.5`

**Pertanyaan:** apakah produk ini bertahan di tangan orang lain?

- [x] Discord + thread + approval terikat principal (memetakan model sesi yang sama) — `done/discord-v05/spec.md`. Baris ini dulu menulis "approval berbasis role"; role Discord tidak pernah memberi otoritas approval, dan pemetaan role → mode kebijakan (FR-AUTH-06) tetap tidak dibangun. Alasannya bukan lagi menunggu: gerbang mode mendarat di jalur run pada v1.1.0, 8 Agustus 2026. Yang menahannya sekarang adalah bentuk petanya — kunci `modes` adalah id container, atau id principal di percakapan pribadi, bukan role (`docs/security.md` §5), jadi sebuah guild channel dipilih satu per satu.
- [x] Dashboard read-only lokal (htmx) — `caraka dashboard`, `done/dashboard-v05/spec.md`
- [ ] Rekrut 20 developer beta, utamakan Indonesia — nol dari dua puluh pada 10 Agustus 2026, dan tidak ada rekrutmen yang dimulai. Validasi pasca-rilis sejak keputusan pemilik 8 Agustus 2026
- [x] Instrumentasi lokal: waktu setup dan aktivasi, dihitung dari audit yang sudah ada, tanpa telemetri keluar. Opt-in melekat pada **membagikan** angkanya, bukan pada mengumpulkannya — audit adalah kontrol wajib dan tidak pernah opsional, jadi angkanya sudah ada di mesin sebelum ada yang membukanya.

**Definition of done:** ≥ 60% peserta mengirim pesan pertama dalam 24 jam **tanpa bertanya**; 0 insiden eksekusi tanpa persetujuan.

Dua baris mesin fase ini tercentang saat `v0.5.0` dirilis. Yang tersisa adalah gerbang manusia: rekrutmen 20 developer beta dan kedua angka DoD hanya bisa dijawab oleh orang lain yang memakainya. Keduanya dipindah menjadi validasi pasca-rilis atas keputusan pemilik 8 Agustus 2026 (`done/v10/spec.md`), bentuk yang sama dengan Fase 4, dan hasilnya dicatat di sini begitu ada.

---

## Fase 6 — WhatsApp (2 minggu) → `v0.6`

**Pertanyaan:** bisakah kita menyediakan WhatsApp tanpa membakar nomor pengguna?

- [x] Provider `baileys` (persistensi sesi di `secrets/whatsapp/`, reconnect berplafon) + provider `cloud-api` — `done/whatsapp-v06/spec.md`. Baris ini dulu menulis "QR"; payload `qr` Baileys adalah bahan gambar dan tidak ada renderer di repositori ini, jadi yang dipakai adalah `requestPairingCode`, delapan karakter yang bisa diketik.
- [x] Mode linear + header `[ws · #id]` (WhatsApp tidak punya konsep tab) — tanpa satu baris pun kode mode linear yang baru di core: `caps.threads: false` dan `header()` yang sudah ada mengerjakannya
- [x] Fallback approval kode `ok A7F3` — kolom `short_code`, index unik parsial, batas lima percobaan salah, dan plafon lima approval menunggu per sesi. Aturan keras 2 di `AGENTS.md` diamendemen di PR yang sama, ADR-0009
- [x] Rate limit + jitter + larangan first-contact **di level kode** — satu fungsi kirim yang tidak bisa dilewati pemanggil mana pun; 12 pesan / 60 detik bergulir, jeda acak 1.200–3.500 md
- [x] Alur peringatan risiko yang tidak bisa dilewati — `provider: baileys` tanpa `acknowledgeRisk: true` menghentikan start dengan pesan yang menautkan `docs/whatsapp-risiko.md`, dan peringatan nomor terpisah dicetak setiap `caraka start`. Setengahnya belum: `caraka init whatsapp` tidak dibangun, jadi peringatannya tiba sesudah blok config ditulis tangan, bukan sebelum
- [ ] Uji lapangan 14 hari di nomor terpisah — nol hari pada 10 Agustus 2026. Tidak ada nomor WhatsApp yang pernah ditautkan ke kode ini, jadi hitungannya belum mulai berjalan, dan empat belas hari kalender tidak bisa dipercepat. Validasi pasca-rilis sejak keputusan pemilik 8 Agustus 2026

**Definition of done:** 14 hari pemakaian nyata tanpa ban dan tanpa relink manual — **atau** temuan jujur yang menjadikan Cloud API sebagai rekomendasi utama.

Lima baris mesin fase ini tercentang saat `v0.6.0` dirilis. Yang tersisa adalah gerbang lapangan, dan ia tidak bisa dijawab dari repositori: tidak ada nomor WhatsApp hidup yang pernah ditautkan ke kode ini, dan tidak ada webhook Cloud API hidup yang pernah diterima. Ia dipindah menjadi validasi pasca-rilis atas keputusan pemilik 8 Agustus 2026 (`done/v10/spec.md`), bentuk yang sama dengan Fase 3, 4, dan 5, dan hasilnya dicatat di sini begitu ada. Sampai itu tiba, rekomendasi yang berlaku sudah tertulis di `docs/whatsapp-risiko.md`: `cloud-api` bila nomor itu penting bagimu.

---

## Fase 7 — Rilis publik (2 minggu) → `v1.0`

- [x] Checklist keamanan `security.md` tuntas — diisi ulang pada 8 Agustus 2026 terhadap kode v1.0.0, bukan terhadap audit yang mengisinya saat versi masih 0.2. Sembilan dari tiga belas baris `met`, masing-masing menyebut test yang gagal kalau klaimnya berhenti benar; empat `deferred` dengan tanggal dan syarat penutupnya (fuzz jalur teks masuk, `splitMarkdown` yang bisa melewati batas channel, `npm audit` tanpa langkah CI, default teraman tanpa gerbang mode di jalur run). Baris ketiga belas baru dan lahir sudah `deferred`: corpus berseed menabrak bug splitter saat membuktikan hal lain. Keempatnya tertutup pada 8 Agustus 2026 — tanggal yang dibawa keempat barisnya sendiri di `docs/security.md` §13, di mana `met (8 Agustus 2026)` muncul empat kali dan `deferred` tidak muncul lagi — dan §13 kini menjawab tiga belas dari tiga belas, dua bahasa sepakat: corpus berseed diperluas ke jalur teks masuk dan menemukan tiga crash di pembaca webhook WhatsApp, `splitMarkdown` menganggarkan kedua fence-nya, langkah `npm audit` masuk CI dan pada jalan pertamanya menemukan pin Baileys ada di bawah advisory critical, dan gerbang mode mendarat di jalur run
- [ ] Dokumentasi dwibahasa (ID/EN) + halaman risiko WhatsApp — sembilan dokumen di bawah `docs/` punya pasangan Inggris pada 10 Agustus 2026: `faq`, `install-guide`, `security`, `troubleshooting`, `openclaw-vs-caraka`, `integrasi-ekosistem`, dan `whatsapp-risiko` — yang ditulis dua bahasa lebih dulu di v0.6 karena pesan galat penolak `provider: baileys` menautkannya — ditambah `install-flow` dan `install-with-ai`. `README.md` punya `README.id.md`. Halaman risiko itu punya rutenya di `caraka.dev/whatsapp-risk` sejak 8 Agustus 2026, ditaut dari halaman keamanan dan halaman dokumentasi, dan menayangkan paruh Inggrisnya saja karena situs menyatakan satu bahasa per rute. Tiga puluh delapan berkas lain di bawah `docs/` tinggal Indonesia, dan sejak 10 Agustus 2026 itu keputusan, bukan antrean: masing-masing membawa satu baris `**English:**` di kepalanya yang menyebut alasannya dan mengarahkan pembaca Inggris ke `README.md`. Dua kelompok yang menutup pintunya rapat. Dua belas berkas `docs/adr/` tidak diterjemahkan karena catatan keputusan yang sudah diterima tidak pernah ditulis ulang — menerjemahkannya berarti membuat versi kedua dari sesuatu yang nilainya justru pada tidak berubah. Tiga belas berkas `docs/research/` tidak diterjemahkan karena isinya catatan sumber, bukan dokumen produk. Sisanya adalah himpunan spesifikasi — `prd`, `brd`, `frd`, `design`, `erd`, `api`, `techstack`, `blueprint`, `brand`, `ui-ux`, `session-model`, `telegram-integration`, `roadmap` — yang tetap Indonesia karena pembacanya kontributor yang bekerja di repositori ini, dan satu spesifikasi dalam dua bahasa adalah dua spesifikasi yang akan berselisih. Kotak ini terbuka bukan karena ada yang tertinggal, melainkan karena halaman risiko WhatsApp-nya masih menayangkan satu bahasa per rute dan pilihan bahasa di situs belum ada
- [ ] Cakupan agent — sembilan preset terkirim di `presets/agents/`. Enam menyatakan blok `acp:` dan dijalankan oleh satu klien ACP yang mengambil perintah spawn-nya dari preset (`claude-code`, `amp`, `cursor`, `gemini`, `goose`, `opencode`); empat menyatakan `command:` untuk driver CLI generik (`claude-code`, `codex`, `aider`, `antigravity`), jadi `claude-code` membawa kedua jalur. Yang pernah dijalankan terhadap biner hidup di mesin ini ada **lima**, lewat **enam jalur**, semuanya dengan dua giliran dan satu resume yang mengingat angka giliran pertama: **Claude Code** lewat ACP (`scripts/smoke-claude.mjs`) dan lewat CLI (`scripts/smoke-cli.mjs claude-code cli`, 10 Agustus 2026 — separuh CLI dari preset dua-jalur itu tidak pernah dijalankan sebelumnya, karena tanpa argumen rute skripnya mengambil `driver: acp` dan mengulang smoke yang sudah jalan), **Codex** lewat CLI, **aider 0.86.2** lewat CLI, dan **goose 1.45.0** lewat ACP, keempatnya pada 10 Agustus 2026, lalu **opencode 1.18.18** lewat ACP pada 14 Agustus 2026 (`scripts/smoke-cli.mjs opencode`: dua giliran dengan satu `session/load` di antaranya, dan giliran kedua menyebut angka yang disebut giliran pertama — 3847). Tiga preset berubah karena dijalankan, dan satu tidak. Codex: `codex exec resume` tidak menerima `--color` maupun `--sandbox`, jadi baris resume selama ini membawa bendera yang ditolak biner dan sandbox yang tidak pernah berlaku. Aider: `--no-pretty` dan `--no-check-update` ditambahkan, `--no-auto-commits` menjadi rem yang menggantikan konfirmasi Aider sendiri (`CliDriver` menutup stdin, jadi setiap konfirmasi bertemu EOF dan menjawab dirinya sendiri), dan `resumeArgs` lahir karena Aider tidak punya id thread sama sekali. Opencode tidak berubah sesudah run-nya; perintah dan benderanya benar sejak percobaan pertama. Empat preset sisanya tetap menandai sendiri bahwa isinya belum diverifikasi, dan berhenti di dua tempat yang berbeda. Tiga berhenti di **handshake, bukan giliran** (`amp`, `cursor`, `gemini`): ketiganya menjawab `initialize` pada 10 Agustus 2026, lalu berhenti di "Authentication required" karena giliran penuhnya menuntut akun berbayar — kunci API Amp, login Cursor, kunci Gemini. Handshake itu tetap membetulkan satu baris: bendera `--experimental-acp` milik Gemini sudah usang, dan presetnya pindah ke `--acp`. Yang keempat, `antigravity`, tidak punya handshake untuk dilewati karena ia rute CLI — `agy --help` pada 1.1.13 tidak menyebut ACP sama sekali — dan berhenti lebih awal: run 14 Agustus 2026 mencetak URL OAuth Google, menunggu enam puluh detik, lalu menjawab bahwa autentikasinya gagal atau kehabisan waktu. Baris ini dulu berbunyi "≥ 15 agent tercakup (7 diuji langsung, sisanya via ACP Registry)" — tujuh yang diuji langsung tidak pernah terjadi, dan pembacaan ACP Registry dicabut dari discovery pada 8 Agustus 2026 (`done/driver-v04/plan.md`), sehingga satu-satunya cara cakupan bertambah adalah satu berkas YAML lagi. Sembilan masih bukan lima belas: sasaran G2 di `prd.md` (≥ 15 agent) belum terpenuhi
- [x] `SECURITY.md`, `CONTRIBUTING.md`, lisensi MIT, repo publik
- [x] Artikel pembanding jujur: "Kapan pakai OpenClaw, kapan pakai Caraka" — `docs/openclaw-vs-caraka.md` dan pasangan Inggrisnya, ditulis supaya memilih OpenClaw adalah kesimpulan yang ia tawarkan. Halaman `/compare` di situs (`site/src/pages/compare.astro`, isinya `site/src/data/compare.ts`) sudah lebih dulu memuat tabel "kalau kamu mau X, pakai Y" yang mengarahkan tiga kebutuhan ke OpenClaw dan Hermes
- [x] Kontribusi balik: catatan integrasi ke ekosistem ACP & Titen — `docs/integrasi-ekosistem.md` dan pasangan Inggrisnya: yang klien ini butuhkan dari ACP dan dari Titen, yang tidak bisa ia sebut dengan kosakata protokolnya sendiri, dan penyebutan bahwa separuh pasangan itu ditulis penulis yang juga menulis separuh lainnya. Mengirimkannya ke hulu belum dilakukan
- [ ] Peluncuran: komunitas dev Indonesia → ekosistem ACP/MCP → publik — belum dimulai pada 15 Agustus 2026. Yang dulu ditulis mendahuluinya sudah lewat: baris ini pernah berbunyi "registry npm masih memegang 1.1.2, jadi apa pun yang diumumkan hari ini menunjuk ke versi yang bukan versi ini". Empat belas versi menyusul kalimat itu, dan registry memegang `1.5.5` pada 15 Agustus 2026 — satu rilis di belakang `package.json`, yang menunggu `npm publish` milik pemilik, dan chip npm di situs sengaja ikut menunggu di sana (`site/src/data/readme.ts`). Jaraknya satu rilis, bukan empat belas, jadi pengumuman hari ini sudah menunjuk ke baris rilis ini. `npm publish` tetap milik pemilik untuk setiap rilis berikutnya. Yang tersisa adalah peluncurannya sendiri, satu-satunya langkah di baris ini yang tidak bisa dikerjakan dari repositori. Langkah pasca-rilis sejak keputusan pemilik 8 Agustus 2026

**Definition of done:** seluruh sasaran G1–G6 di `prd.md` terpenuhi dan terukur.

Peluncuran ke komunitas dev Indonesia dan ke ekosistem ACP belum dijalankan; ia dipindah menjadi langkah pasca-rilis atas keputusan pemilik 8 Agustus 2026 (`done/v10/spec.md`), bentuk yang sama dengan gerbang lapangan di Fase 3 sampai 6, dan tanggalnya dicatat di sini begitu ada.

---

## Sesudah v1.0 — yang sudah dikirim

Fase 7 tidak pernah ditutup, dan delapan belas rilis mendarat di dalamnya. Daftar fase di atas berhenti di `v1.0` karena itu memang rencananya; yang di bawah ini adalah apa yang terjadi sesudah rencana itu habis. Tidak ada satu pun yang membuka fase baru — semuanya jatuh di dalam gerbang Fase 7 yang masih terbuka, dan tidak satu pun menjawabnya.

Bentuknya berubah di 1.3.0. Sampai 1.2.0 rilis datang dari spesifikasi yang ditulis lebih dulu; sejak 1.3.0 sebagian besar datang dari laporan pemakaian sungguhan di instalasi orang lain — isu #9, #10, dan #11 masing-masing menghasilkan rilisnya sendiri. Itu bukan perubahan proses yang diputuskan, melainkan yang terjadi begitu ada yang memakai.

Setiap entri di bawah dicatat panjang lengkap di [`../CHANGELOG.md`](../CHANGELOG.md); yang di sini satu baris masing-masing.

| Versi | Tanggal | Apa |
|---|---|---|
| `1.5.6` | 15 Agu 2026 | Tidak ada yang bergerak di runtime; yang bergerak adalah semua yang menjelaskannya, dan gerbang yang selama ini membiarkan sebuah rilis terbit sambil salah menjelaskan dirinya |
| `1.5.5` | 14 Agu 2026 | Dua laporan dari satu instalasi: satu request yang jatuh membuat sesi tergantung selamanya, dan id rollout yang sudah tidak ada membuatnya rusak permanen |
| `1.5.4` | 14 Agu 2026 | Sembilan kalimat menyebut `Claude` apa adanya, dan instalasi yang menjalankan codex membacanya di setiap tugas |
| `1.5.3` | 14 Agu 2026 | Instalasi yang config-nya `agent: codex` menjalankan Claude, dan mengatakannya |
| `1.5.2` | 14 Agu 2026 | Topic tertutup sesudah setiap giliran, karena `done` dibaca sebagai akhir sesi |
| `1.5.1` | 14 Agu 2026 | Formulir folder menolak satu-satunya tata letak yang dipunyai kebanyakan orang |
| `1.5.0` | 14 Agu 2026 | Bekerja di grup berhenti berarti berteriak ke dalamnya |
| `1.4.2` | 14 Agu 2026 | Dua hal yang proyek ini katakan selama empat rilis ternyata salah, keduanya diselesaikan dengan mengukur |
| `1.4.1` | 14 Agu 2026 | Setelan yang menggambarkan pesan langsung mematikan topic di grup |
| `1.4.0` | 14 Agu 2026 | Prompt install menyuruh orang memakai Claude, dan README mengubur jalur cepatnya di bawah jalur manual; `opencode` dan `antigravity` mendarat di sini |
| `1.3.3` | 13 Agu 2026 | `@~/Project/Coret` menjawab bahwa tidak ada workspace bernama itu |
| `1.3.2` | 13 Agu 2026 | Menjawab `y` pada tawaran memori meninggalkan config yang menunjuk service yang tidak bisa dijalankan lewat namanya |
| `1.3.1` | 13 Agu 2026 | Caraka mengganti nama thread yang tidak ia buat, dan di channel yang bisa mengarsipkan, ia arsipkan juga |
| `1.3.0` | 13 Agu 2026 | Enam isu dilaporkan terhadap 1.2.0 yang sudah rilis; dua hal termahal di rilis ini tidak ada di satu pun dari keenamnya |
| `1.2.0` | 10 Agu 2026 | Adapter Titen bicara ke Titen hidup untuk pertama kalinya, dan setiap field yang selama ini dikirimnya ditolak |
| `1.1.2` | 10 Agu 2026 | `caraka --version` mencetak 1.1.0 pada 1.1.1 yang terpasang |
| `1.1.1` | 10 Agu 2026 | Satu preset salah dengan cara yang hanya bisa ditunjukkan dengan menjalankannya |
| `1.1.0` | 8 Agu 2026 | Empat kotak yang terbuka sejak spesifikasi, ditutup dengan kode: gerbang mode kebijakan di jalur run, pairing deep-link, `doctor --fix`, dan `uninstall` |

Yang tidak bergerak sama sekali di delapan belas rilis itu: tidak satu pun gerbang lapangan terjawab. Tidak ada minggu dogfood, tidak ada lima rekaman setup, tidak ada A/B memori atas dua puluh tugas, tidak ada dua puluh developer beta, tidak ada empat belas hari di nomor sungguhan, dan peluncurannya belum dimulai. Itulah sebabnya baris keadaan rilis di situs berbunyi satu kata — `unproven` — dan bukan kata kematangan yang harus diperoleh gerbang-gerbang itu.

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

Baris pertama tabel itu sudah meninggalkan jejak di kode tanpa menjadi kemampuan: skema preset menerima `driver: mcp`, tetapi tidak ada jalur yang membangunnya, dan preset yang menyebut nilai itu tanpa blok `acp:` maupun `command:` berhenti di galat `driver.none` (`src/cli.ts`). Nilainya cadangan nama, bukan driver.

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
