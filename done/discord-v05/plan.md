# Plan — Fase 5 (bagian Discord): channel kedua (v0.5)

**Slug:** discord-v05 · **Tanggal:** 8 Agustus 2026 · **Spec:** `spec/discord-v05.md`

Urutan langkahnya mengikuti satu aturan: seam lebih dulu tanpa mengubah perilaku,
lalu dua kebocoran rahasia karena keduanya murah dan sudah terbuka hari ini, baru
Discord. Setiap langkah adalah satu commit dan meninggalkan gerbang verifikasi
hijau.

Baris yang dikutip diukur pada `9494ec5` (release 0.4.0). LOC `src/` dasar:
**4.290** (`wc -l`, 8 Agustus 2026) — gateway 1461, cli 624, db 405, telegram
302, i18n 286, drivers/cli 180, security 169, config 156, claude-acp 126,
service 112, titen 111, discovery 99, preset 87, driver 66, memory/local 58,
memory/index 48.

## Langkah

### 1 · Seam `Channel` dinamai — nol perubahan perilaku

Berkas: `src/core/channel.ts` (baru), `src/core/gateway.ts`,
`src/channels/telegram.ts`, `src/cli.ts`, `test/e2e.test.ts`.

- Deklarasikan `Channel` di `src/core/channel.ts` dari permukaan de-facto: 12
  method yang gateway benar-benar panggil di 23 call site — `deleteWebhook`
  `:180`, `updates` `:186`, `setMyCommands` `:192`, `answerCallback` `:366`,
  `sendText` `:539`, `sendResult` `:553`, `createTopic` `:594`, `editText`
  `:694`, `deleteMessage` `:728`, `editTopic` `:770`, `clearKeyboard` `:1096`,
  `getMe` `:1353` — bukan `onMessage`/`onChoice`/`send` dari
  `docs/api.md:153-155` (K2).
- Tipe netral yang ikut lahir di berkas yang sama: `ChannelId`, `ChannelCaps`,
  `MessageRef` (menggantikan `TelegramMessage` sebagai nilai balik pengiriman —
  termasuk sentinel palsu `gateway.ts:537`), `InboundEvent` (satu union: pesan,
  penekanan tombol, perubahan keanggotaan), dan `ThreadRef`.
- Retype 37 rujukan `TelegramMessage`/`TelegramUpdate` di `gateway.ts` menjadi
  tipe netral itu. Mekanis; `route()` `:518-520` menjadi pembaca tunggal bentuk
  rute, dan tiap `String(message.from?.id)` menjadi field `principal` pada
  `InboundEvent`.
- `gatewayCommands` (`telegram.ts:55-69`) pindah ke `src/core/channel.ts`. Core
  mengimpornya hari ini (`gateway.ts:5-6`) dan mendaftarkannya lewat channel
  (`:190-192`), jadi selama daftar itu tinggal di adapter Telegram, AC-1.3 tidak
  bisa lulus. Isinya tidak berubah, dan adapter Discord mendaftarkan daftar yang
  sama di langkah 6.
- `Telegram` memenuhi interface secara struktural (`implements Channel`), tanpa
  lapisan terjemahan runtime. Method yang berganti nama tetap satu baris.
- `deleteWebhook` (`gateway.ts:180`) pindah ke dalam `Telegram.start()`: ia
  lifecycle Telegram, bukan kontrak channel.
- Teks pengungkapan pindah ke channel sebagai `readiness(threadsAvailable)` dan
  `pairingText(title, containerId)` (AC-7.7). `groupReadiness()`
  `gateway.ts:1351-1361` menjadi implementasi Telegram-nya, hampir verbatim.
- Perilaku tidak berubah; buktinya AC-1.2 — test lama lulus tanpa assertion
  diubah. Yang boleh hilang hanyalah dua cast `as unknown as Telegram`
  (`test/e2e.test.ts:101`, `:300`), persis seperti dua cast driver yang hilang
  di `done/driver-v04`.

Dua bagian langkah ini ditunda ke langkah 3, dan alasannya ditulis di sini
supaya plan tetap menggambarkan kode:

- Dua cast `as unknown as Telegram` masih berdiri. Menghapusnya berarti
  melengkapi kedua channel palsu (`id`, `caps`, `setMyCommands`, `getMe`,
  `editTopic`), dan langkah 3 menulis ulang baris yang sama saat konstruktor
  menerima daftar channel. AC-1.1 dibuktikan di sana, sekali.
- `groupReadiness()` (`gateway.ts:1349`) belum pindah menjadi `readiness()` dan
  `pairingText()` milik channel. Teksnya masih di core dan masih Telegram; itu
  utang AC-7.7, bukan pelanggaran AC-1.5 — grep `channel.id` dan literal nama
  channel di `src/core/` kosong.

### 2 · `caps` tiga field dan pembacanya

Berkas: `src/core/channel.ts`, `src/core/gateway.ts`, `src/channels/telegram.ts`,
`test/unit.test.ts`.

- `ChannelCaps = { threads: boolean; buttons: boolean; maxChars: number }`.
  Telegram: `threads` dari `config.telegram.topics` dan `chat.is_forum` seperti
  hari ini (`gateway.ts:577-582`), `buttons: true`, `maxChars: 4096` (angka yang
  sudah dipakai adapter di `telegram.ts:221`).
- `topicsAvailable()` membaca `caps.threads`; kartu approval dan pemilih
  workspace membaca `caps.buttons`; potongan ekor progres `:698` membaca
  `caps.maxChars` dikurangi panjang header (AC-2.6).
- Jalur `caps.buttons === false`: `askPermission` mengembalikan `cancelled`
  sebelum kartu dibuat, dan menulis satu baris audit. Diuji dengan channel palsu
  (AC-2.5).
- Unit test: channel palsu tanpa thread menjalankan mode linear berheader;
  channel palsu tanpa tombol menolak izin; `maxChars` kecil memotong ekor, bukan
  kepala.

### 3 · Gateway memegang daftar channel

Berkas: `src/core/gateway.ts`, `src/cli.ts`, `test/e2e.test.ts`.

- Parameter konstruktor `telegram: Telegram` (`gateway.ts:104`) menjadi
  `channels: [Channel, ...Channel[]]`.
- `run()` menjalankan `start()` tiap channel lalu menggabungkan generator update
  mereka; satu channel yang gagal start menghentikan start seluruhnya dengan
  pesan yang menyebut namanya (AC-1.7).
- `allowed`, `allowedChats`, dan `operator` (`gateway.ts:120-128`) menjadi peta
  yang dikunci `channel.id`, diisi sekali di konstruktor dari config. Kunci peta,
  bukan cabang (K4).
- Antrean tetap satu peta yang dikunci slug workspace (`:90`), jadi satu run per
  workspace bertahan lintas channel (AC-1.6).
- e2e: dua channel palsu mengirim tugas ke workspace yang sama; assert run kedua
  mengantre, tidak berjalan paralel.

### 4 · Dua kebocoran rahasia ditutup

Berkas: `src/drivers/claude-acp.ts`, `src/core/security.ts`, `src/cli.ts`,
`test/unit.test.ts`, `test/e2e.test.ts`.

- `claudeEnvironment()` `:11-15` berhenti menghapus satu nama dan menghapus
  setiap kunci berawalan `CARAKA_`. Dua driver memanggilnya (`claude-acp.ts:40`,
  `drivers/cli.ts:114`), jadi satu perbaikan menutup keduanya, dan token channel
  berikutnya tidak bocor lewat lubang yang sama.
- `fixedSecretPatterns` `:3-15` mendapat satu pola untuk bentuk tiga segmen
  base64url berpisah titik yang tidak diawali `eyJ`. Pola JWT `:9` dibiarkan
  utuh supaya tidak ada regresi pada bentuk yang sudah tertangkap.
- Ambang panjang tiap segmen adalah pilihan implementasi, bukan fakta: yang
  mengikat adalah dua test — satu token Discord sintetis teredaksi (AC-9.2),
  satu paragraf berisi `caraka.dev`, `1.2.3`, dan `file.test.ts` tetap utuh
  (AC-9.3).
- Seeding exact di `cli.ts:446` menerima token Discord bila ada.
- Test yang sudah ada diperluas, bukan diganti: `test/unit.test.ts:64-65` (fungsi)
  dan `test/unit.test.ts:849` (proses CLI yang di-spawn, lewat fixture
  `test/fixtures/bin/fake-agent.mjs:25`) mendapat kasus `CARAKA_DISCORD_TOKEN`.
  Fixture itu hari ini melaporkan satu nama saja, jadi ia melaporkan setiap kunci
  berawalan `CARAKA_` supaya assertion-nya menutup nama yang belum ada.

### 5 · Config `discord:`, rahasia, dan penolakan start

Berkas: `src/config.ts`, `src/cli.ts`, `src/i18n.ts`, `test/unit.test.ts`.

- Blok `discord:` opsional: `{ appId, allowFrom[], allowChats[], threads }`,
  aditif, `version` tetap 1 (preseden `workspaces[]` `config.ts:36`). Blok
  `telegram:` menjadi opsional dengan bentuk yang sama persis, sehingga berkas
  v0.4 mana pun tetap lolos skema.
- Refinement: minimal satu channel terkonfigurasi (AC-10.2), dan tiap channel
  yang ada wajib `allowFrom.min(1)` dengan pesan yang menyebut channel-nya
  (AC-10.3, FR-SETUP-05).
- `carakaPaths()` `:73-83` mendapat `discordToken`. Kunci lama `token` dibiarkan
  bernama begitu; menggantinya menyentuh empat call site tanpa mengubah apa pun.
- `loadConfig()` `:110-118` memuat token per channel yang terkonfigurasi;
  `saveConfig` menulis lewat `atomicSecret` `:85-90` (mode 0600, AC-9.5).
- `doctor` memeriksa mode berkas token Discord di sebelah baris "Token mode"
  yang sudah ada (`cli.ts:371`).
- `addAllowedChat` `:144-156` menerima id channel dan menulis ke blok yang tepat.

### 6 · Adapter Discord: REST, gateway, application command

Berkas: `src/channels/discord.ts` (baru), `src/core/channel.ts`, `src/i18n.ts`,
`test/unit.test.ts`.

- REST lewat `fetch` bawaan: satu `call(method, path, body)` seperti
  `telegram.ts:135-164`, dengan penanganan 429 yang menunggu `retry_after` dari
  respons lalu mengulang (AC-3.3). Tidak ada angka batas yang ditulis; header
  dan bodi respons yang menentukan.
- Gateway lewat `WebSocket` global: identify tanpa `MESSAGE_CONTENT` (AC-7.1),
  heartbeat sesuai `hello`, resume bila Discord mengizinkan, jika tidak identify
  ulang. Jeda menaik antar percobaan, satu baris audit per putus (AC-3.4).
- Jembatan dorongan ke tarikan: event masuk ditaruh di antrean kecil, `updates()`
  membacanya sebagai async generator (K2). Ini bagian yang membuat
  `gateway.ts:186` tidak perlu berubah.
- Application command: `gatewayCommands` (dipindah ke `src/core/channel.ts` di
  langkah 1) didaftarkan apa adanya, masing-masing dengan satu opsi string
  opsional, ditambah satu perintah milik adapter untuk teks tugas bebas. Interaksi disusun kembali menjadi
  `/nama argumen` supaya parser `gateway.ts:249-250` membacanya tanpa perubahan
  (AC-7.2, AC-7.3).
- Pendaftaran memakai seam `registerCommands(commands, scopeId)` yang sudah ada
  untuk Telegram (`setMyCommands` per chat, `gateway.ts:190-192`); di Discord
  scope-nya guild.
- Pesan biasa: bila isinya sampai, ia menjadi teks tugas; bila kosong karena
  intent tidak privileged, ia diabaikan tanpa balasan (AC-7.4, AC-7.5).
- Pemecahan pesan panjang di adapter, batas 2.000 (`docs/ui-ux.md:165`), memakai
  `splitTelegramText` (`telegram.ts:94-119`, sudah menerima `limit` dan sudah
  menutup pagar yang terbuka) yang dipindah ke helper bersama tanpa berganti
  perilaku: code block tidak pernah terpotong di tengah (FR-CHAN-06, AC-3.7).
  Tidak ada lapisan escape — Discord membaca markdown yang sama dengan yang
  `sendResult` kirim hari ini (FR-CHAN-07).
- i18n: kunci `telegram.empty`/`unreachable`/`refused` (`src/i18n.ts:80-82`)
  menjadi `channel.*` berparameter `{channel}` — jumlah kunci berkurang, dua
  katalog tetap lockstep dan `tsc` yang menjaganya.
- Unit test terhadap `fetch` dan `WebSocket` palsu: identify tanpa
  `MESSAGE_CONTENT`, 429 diulang sekali lalu berhasil, socket tertutup
  menyambung ulang, interaksi application command menjadi teks perintah.

### 7 · Thread sebagai sesi dan deteksi lewat error

Berkas: `src/channels/discord.ts`, `src/core/gateway.ts`, `src/cli.ts`,
`test/unit.test.ts`.

- `createThread` menyetel `auto_archive_duration: 10080` dan nama `<glif> judul`
  dipotong 100 karakter (AC-4.1, AC-4.2). Glif datang dari core apa adanya
  (`gateway.ts:757-763`), jadi tabel glifnya tetap satu.
- `finishThread` mengirim ringkasan penutup lalu `archived: true` (AC-4.4).
  Telegram tidak mengimplementasikannya dan berhenti pada rename — itulah pasangan
  kasus absennya (AC-4.5).
- Tidak ada sweep sebelum membuat thread baru (AC-4.6). Dua hal membatalkan
  rencana itu: `finishThread` sudah mengarsipkan thread sesi begitu sesi selesai,
  jadi yang tersisa untuk disapu hanya milik sesi yang masih hidup; dan thread
  terarsip tetap dihitung Discord, jadi sapuan yang berhasil pun tidak membeli
  kuota (AC-4.7, riset `:73`). Batas ±50/1.000 tiba sebagai error dari pembuatan
  thread, yang sudah ditangani jalur AC-5.1. Komentar di kodenya menyebut alasan
  itu supaya tak ada yang menambahkannya kembali.
- Deteksi: `createSession` `gateway.ts:584-611` sudah menangkap kegagalan
  pembuatan dan jatuh ke `threadId = ""`. Yang ditambahkan adalah menyimpan
  penanda di `meta` (`threads.<containerId>`, preseden `ws.last.<chatId>` `:298`)
  dan memberi tahu sekali dengan remedi (AC-5.1, AC-5.2, AC-5.6).
- `caraka doctor` menghapus penanda itu (AC-5.4).
- Tidak ada thread uji yang dibuat lalu dihapus (AC-5.5).

### 8 · Approval di Discord

Berkas: `src/channels/discord.ts`, `src/core/gateway.ts`, `test/e2e.test.ts`.

- Primitif tidak disentuh: `approvalCallbacks`, `verifyApprovalCallback`
  (`security.ts:45-71`), `resolveApproval` (`db.ts:348-364`). Payload 33 karakter
  masuk ke `custom_id` apa adanya (AC-6.1); test menegaskan panjangnya supaya
  perubahan bentuk kelak gagal di sini, bukan di Discord. Batas `custom_id`
  dikonfirmasi ke referensi API Discord saat langkah ini dikerjakan dan angkanya
  ditulis di sini, bukan ditebak sekarang.
- Ack tertunda: adapter mengirimnya saat interaksi diterima, sebelum event
  diserahkan ke core (AC-6.2). Test merekam urutan panggilan dan gagal bila
  sentuhan DB mendahului ack.
- Penonaktifan komponen menempel di fork yang sama dengan `clearKeyboard`
  (`gateway.ts:1095-1098`), jadi tetap satu titik untuk approval, trust, dan
  pairing (AC-6.3).
- e2e jalur Discord: kartu approval, penekanan sah, penekanan kedua ditolak
  (AC-6.4), penekanan dari principal di luar allowlist ditolak dan tercatat
  (AC-6.5).
- Grep di test memastikan jalur approval tidak menyebut role (AC-6.6).

### 9 · Pairing guild dan pengungkapan

Berkas: `src/channels/discord.ts`, `src/i18n.ts`, `src/core/gateway.ts`.

- Guild channel yang belum di allowlist memicu kartu pairing di DM operator,
  memakai jalur `handleMembership`/`confirmGroup` yang sudah ada
  (`gateway.ts:1262-1346`) lewat `InboundEvent` keanggotaan (AC-8.1, AC-8.3).
- Sekali-pakai penawaran itu dikunci pada pasangan `(container, pelaku)`, bukan
  pada container saja: core membuang peristiwanya saat pelakunya bukan principal
  (AC-8.3), jadi kunci per container membuat satu orang asing menghabiskan
  penawaran milik operator (AC-8.5). Himpunannya dibatasi seperti `sentIn`.
- `pairingText` versi Discord menyebut kartu approval, path, diff, dan keluaran
  perintah terbaca setiap anggota yang bisa melihat channel itu (AC-8.2).
- `readiness` versi Discord menyebut isi pesan biasa tidak sampai, dan menyebut
  jalan yang sampai — bentuknya mengikuti pengungkapan privacy mode Telegram
  (`src/i18n.ts:75-76`), bukan menirunya kata per kata (AC-7.6).
- Ephemeral, bila dipakai, hanya untuk balasan interaksi tanpa keputusan; kartu
  approval tidak pernah ephemeral (AC-11).

### 10 · `caraka init discord`

Berkas: `src/cli.ts`, `src/i18n.ts`, `test/unit.test.ts`.

- Alur mencerminkan wizard Telegram (`cli.ts:235-300`): prompt token tanpa echo,
  verifikasi ke Discord sebelum menulis apa pun (AC-10.6), cetak URL undangan
  berisi scope dan permission yang persis dibutuhkan, tunggu operator menjalankan
  perintah pairing berkode, konfirmasi identitas, tulis blok config dan berkas
  token.
- Penantian memakai koneksi gateway adapter yang lalu ditutup — bentuk yang sama
  dengan loop `getUpdates` di wizard Telegram, dengan batas waktu 5 menit yang
  sudah ada di sana.

### 11 · Harness e2e Discord

Berkas: `test/e2e.test.ts`.

- Cermin test Telegram yang ada (`test/e2e.test.ts:26-60`): `WebSocket` palsu
  yang mengalirkan event dan `fetch` palsu yang menjawab REST, menggerakkan
  `src/channels/discord.ts` yang asli sampai ke Gateway asli.
- Satu giliran penuh: tugas lewat application command → thread dibuat →
  progres di-edit → kartu approval → penekanan sah → hasil → `archived: true`.
- Tidak ada kredensial di test dan tidak ada panggilan keluar. Batas ini ditulis
  di CHANGELOG (AC-12.3).

### 12 · Dokumen, ADR, rilis 0.5.0

Berkas: seluruh daftar AC-12.1, `docs/adr/0008-*.md` (baru), `CHANGELOG.md`,
`package.json`, `site/src/data/*.ts`.

- Amandemen bertanggal di tiap dokumen, dengan alasannya, bukan penghapusan
  diam-diam. Yang paling berat: `docs/techstack.md:59` (`discord.js` → `fetch` +
  `WebSocket`, argumen K5), `docs/design.md:291-327` dan `docs/api.md:143-169`
  (caps delapan → tiga, `onMessage`/`onChoice` → generator), `docs/frd.md:34`
  (FR-CHAN-01 kehilangan "satu-satunya channel"), `docs/design.md:319`
  (probe-and-delete bukan jalur Discord).
- ADR-0008 menggantikan `docs/adr/0006:13`; bentuknya mengikuti amandemen
  bertanggal `docs/adr/0004:15` (AC-12.2).
- `AGENTS.md:27` dikoreksi: `src/channels/` berisi berkas datar, bukan direktori
  per channel. Koreksi peta, bukan perubahan layout.
- `docs/security.md` §5 mencatat baris `grup (default) read-only` belum
  terbangun untuk channel mana pun (AC-8.4).
- CHANGELOG 0.5.0 dengan bagian **Limited** yang menyebut Discord tidak pernah
  dijalankan terhadap Discord sungguhan di mesin ini.
- LOC `src/` pasca-merge ditempel di sini (AC-12.4). Tidak ada `npm publish`
  (AC-12.5).

## Pemetaan pembuktian

| AC | Bukti |
|---|---|
| AC-1.1 | `test/e2e.test.ts` — channel palsu diterima konstruktor tanpa cast |
| AC-1.2 | keluaran `npm test` + `npm run e2e` pada commit langkah 1, ditempel di bawah; diff test hanya menghapus cast |
| AC-1.3 | unit: grep `from "../channels/` di `src/core/` harus kosong |
| AC-1.4 | unit: seam mendeklarasikan `updates(signal): AsyncGenerator`; e2e menggerakkannya lewat `for await` |
| AC-1.5 | unit: grep `channel.id ===`, `case "telegram"`, `case "discord"`, `"telegram"`, `"discord"` di `src/core/` harus kosong |
| AC-1.6 | e2e: dua channel palsu, satu workspace, run kedua mengantre |
| AC-1.7 | unit: channel palsu melempar di `start()`; assert pesan menyebut namanya dan channel lain tidak jalan |
| AC-2.1 | unit: `Object.keys(caps)` tepat tiga; grep tiap nama cap punya pembaca di `src/core/` |
| AC-2.2 | e2e Discord langkah 11 (thread dibuat) |
| AC-2.3 | unit: channel palsu `threads:false` → balasan berheader `[ws · #id]` |
| AC-2.4 | e2e Telegram yang ada (kartu bertombol) tetap hijau |
| AC-2.5 | unit: channel palsu `buttons:false` → izin `cancelled`, satu baris audit, nol pesan terkirim |
| AC-2.6 | unit: `maxChars: 40` → potongan berisi ekor keluaran, bukan kepalanya |
| AC-2.7 | unit: `caps.maxChars` adapter Discord = 2000 |
| AC-2.8 | manual: baca `docs/design.md` §2.2/§11 dan `docs/api.md` §4 setelah amandemen; tiga caps kontrak, lima ditandai rencana |
| AC-3.1 | unit: `Object.keys(package.json dependencies).length === 4` |
| AC-3.2 | unit: grep `discord.js` di `package.json` dan `src/` kosong; adapter memakai `fetch` dan `WebSocket` yang disuntik |
| AC-3.3 | unit: `fetch` palsu menjawab 429 + `retry_after` sekali lalu 200; assert dua panggilan dan hasil benar |
| AC-3.4 | unit: `WebSocket` palsu menutup diri; assert percobaan sambung ulang dan satu baris audit |
| AC-3.8 | unit: hello dengan `heartbeat_interval` 20 md, tak ada op 11; assert socket ditutup dengan 4009 dan tak ada detak kedua |
| AC-3.9 | unit: socket palsu ditutup dengan 4004; assert tidak ada socket kedua, satu baris audit `channel.stopped`, dan `updates()` melempar error yang menyebut kodenya |
| AC-3.5 / AC-3.6 | unit: config dengan dan tanpa blok `discord:`; assert `import()` modul Discord terjadi hanya pada yang pertama |
| AC-3.7 | unit: hasil 5.000 karakter berisi satu code block yang melewati batas → tiap pecahan ≤ 2.000 dan tiap pecahan punya jumlah pagar genap; tidak ada karakter escape yang ditambahkan ke markdown masuk |
| AC-4.1 | unit: bodi `POST` pembuatan thread memuat `auto_archive_duration: 10080` |
| AC-4.2 | unit: judul 200 karakter → nama terkirim 100 karakter dan diawali glif |
| AC-4.3 | unit: lima state → lima nama, glif sama dengan tabel `gateway.ts:757-763` |
| AC-4.4 | e2e Discord: setelah hasil terkirim, `PATCH` thread membawa `archived: true`, dan urutannya sesudah ringkasan |
| AC-4.5 | e2e Telegram yang ada: sesi selesai hanya berganti nama, tidak ada panggilan penutupan |
| AC-4.6 | unit: 51 pembuatan berturut-turut, yang ke-51 ditolak Discord; assert nol `PATCH` `archived: true` dan error yang dilempar |
| AC-4.7 | manual: komentar di `src/channels/discord.ts` menyebut arsip tidak membeli kuota; tidak ada klaim sebaliknya di kode maupun spec |
| AC-5.1 | unit: `fetch` palsu menolak pembuatan thread → run selesai dalam mode linear, tanpa throw |
| AC-5.2 | unit: pemberitahuan terkirim tepat sekali untuk dua kegagalan berurutan |
| AC-5.3 | unit: percobaan kedua tidak memanggil endpoint pembuatan thread |
| AC-5.4 | unit: `doctor` menghapus kunci `meta`; percobaan berikutnya memanggil lagi |
| AC-5.5 | unit: tidak ada pasangan buat-lalu-hapus thread di log `fetch` palsu |
| AC-5.6 | unit: `PRAGMA table_info` tidak berubah; kunci ada di tabel `meta` |
| AC-6.1 | unit: `custom_id` yang dihasilkan sepanjang 33, sama persis dengan payload dari `approvalCallbacks`, dan lolos `verifyApprovalCallback` |
| AC-6.2 | e2e Discord: urutan panggilan terekam; ack tertunda mendahului `resolveApproval` |
| AC-6.3 | e2e Discord: `PATCH` pesan dengan komponen `disabled` terjadi sebelum percabangan jalur |
| AC-6.4 | e2e Discord: penekanan kedua dijawab "sudah dipakai", `pending` tidak dipanggil dua kali |
| AC-6.5 | e2e Discord: principal di luar allowlist ditolak, baris audit `approval.decide/denied` ada |
| AC-6.6 | unit: grep `role` di jalur approval `src/core/` kosong |
| AC-6.7 | unit: nama opsi agent muncul sebagai label tombol Discord |
| AC-7.1 | unit: payload identify tidak memuat bit `MESSAGE_CONTENT` |
| AC-7.2 | unit: interaksi application command → teks `/status` sampai ke parser core |
| AC-7.3 | unit: daftar perintah terdaftar sama dengan `gatewayCommands`, ditambah satu milik adapter |
| AC-7.4 | unit: `MESSAGE_CREATE` berisi teks → tugas berjalan |
| AC-7.5 | unit: `MESSAGE_CREATE` dengan `content` kosong → nol pesan keluar, nol error |
| AC-7.6 | unit: teks kesiapan Discord memuat kalimat "tidak sampai" dan menyebut jalur yang sampai; kedua katalog i18n punya kuncinya |
| AC-7.7 | unit: gerbang grep AC-1.5 mencakupnya; teks datang dari method channel |
| AC-8.1 | e2e Discord: kartu pairing terkirim ke DM operator, bukan ke channel |
| AC-8.2 | unit: teks pairing Discord memuat empat hal yang terbaca anggota, dan dikirim sebelum penulisan allowlist |
| AC-8.3 | unit: pemasang di luar allowlist → nol kartu pairing |
| AC-8.4 | manual: baris status di `docs/security.md` §5 setelah amandemen |
| AC-8.5 | unit: tiga slash command di satu channel dari dua anggota → dua peristiwa keanggotaan, satu per anggota |
| AC-9.1 | unit: `claudeEnvironment({CARAKA_TELEGRAM_TOKEN, CARAKA_DISCORD_TOKEN, CARAKA_HOME, PATH})` menyisakan `PATH` saja; `test/unit.test.ts:849` mengulanginya pada proses CLI yang benar-benar di-spawn |
| AC-9.2 | unit: token Discord sintetis di tengah kalimat → `[REDACTED]`, tanpa seeding |
| AC-9.3 | unit: `caraka.dev`, `1.2.3`, `file.test.ts`, dan satu kalimat biasa tetap utuh |
| AC-9.4 | unit: scrubber hasil `start()` memuat token yang dimuat sebagai rahasia exact |
| AC-9.5 | unit: mode berkas 0600 setelah `saveConfig`; baris `doctor` memeriksanya |
| AC-9.6 | unit: YAML hasil tulis tidak memuat token |
| AC-10.1 | unit: config v0.4 tanpa blok `discord:` tetap lolos skema; config dengan blok lolos, `version` tetap 1 |
| AC-10.2 | unit: config tanpa channel mana pun → start berhenti dengan pesan perbaikan |
| AC-10.3 | unit: blok `discord:` dengan `allowFrom: []` → start berhenti dan menyebut `discord` |
| AC-10.4 | unit: sesi Discord tersimpan dengan `chat_id` berprefiks `discord:`; komentar `ponytail:` ada di titik penulisannya |
| AC-10.5 | unit: basis data v0.4 berisi sesi Telegram dibuka, sesi lama terbaca dan terute |
| AC-10.6 | unit: `fetch` palsu menolak token → wizard berhenti sebelum menulis berkas apa pun |
| AC-11.1 | unit: bodi kartu approval tidak pernah memuat flag ephemeral |
| AC-11.2 | manual: pembacaan dokumen setelah amandemen; ephemeral tidak disebut kontrol |
| AC-11.3 | tanpa jalur yang bergantung padanya — dibuktikan oleh AC-11.1 dan grep flag ephemeral |
| AC-12.1 | `git diff --stat` pada commit dokumen memuat setiap berkas di daftar |
| AC-12.2 | berkas ADR baru ada dan `docs/adr/0006:13` menunjuk ke sana |
| AC-12.3 | pembacaan CHANGELOG 0.5.0 |
| AC-12.4 | keluaran `wc -l src/**/*.ts` ditempel di plan ini |
| AC-12.5 | tidak ada perintah publish di log wave ini |

## Risiko

- **Langkah 1 menyentuh 37 baris di berkas terbesar repo.** `gateway.ts` sudah
  1.461 baris. Mitigasi: langkah 1 tidak boleh mengubah satu assertion pun; kalau
  sebuah test perlu diubah, itu tanda perilaku ikut berubah dan langkahnya
  dipecah.
- **Tanpa kredensial Discord.** Semua bukti Discord adalah `fetch` dan
  `WebSocket` palsu. Yang tidak terbukti: bentuk payload nyata, perilaku 429
  nyata, dan izin nyata. Ditulis di CHANGELOG, tidak disamarkan.
- **Anggaran kompleksitas.** Perkiraan tambahan 600–900 baris di atas 4.290;
  plafon 8.000 (`AGENTS.md:19`). Kalau angka pasca-merge melewati 7.000, sweep
  penyederhanaan masuk ke wave ini, bukan ditunda.
- **Dua item Fase 5 mendarat di rilis yang sama.** Dashboard adalah PR terpisah
  dan spec terpisah; keduanya menyentuh `src/cli.ts`. Discord mendarat lebih
  dulu supaya dashboard membaca seam yang sudah jadi.
- **Angka rate limit Discord tidak ada di `docs/`.** Tidak ada satu pun yang
  ditulis; mekanismenya yang diuji (AC-3.3). Kalau kelak angka dibutuhkan, ia
  diukur terhadap Discord sungguhan dan pengukurannya dicatat, sesuai
  `standards/ears.md:120`.
- **Bentuk token Discord dipola dari struktur, bukan dari contoh nyata.** Karena
  itu dua test mengapitnya: satu yang harus teredaksi dan satu yang harus utuh.
  Seeding exact tetap jalur utama; polanya adalah jaring kedua.

## Gerbang verifikasi

`package.json:41` adalah kebenarannya: `npm run verify` =
`lint && typecheck && test && e2e && build`. Keluarannya ditempel di bawah
sebelum spec dan plan pindah ke `done/discord-v05/`.

Langkah 1–9 dan 11 sudah di pohon kerja. Yang belum: **langkah 10**
(`caraka init discord`) dan **langkah 12** (amandemen dokumen, ADR-0008,
CHANGELOG, rilis). Sampai langkah 10 ada, blok `discord:` ditulis tangan dan
berkas tokennya ditulis lewat `atomicSecret` oleh `saveConfig`.

Tiga hal berubah dari yang tertulis di langkah aslinya, dan dicatat di sini
supaya plan tetap menggambarkan kode:

- **Ringkasan penutup mendahului `setState`.** `runTask` dulu menyetel state
  lebih dulu, lalu mengirim hasil. Karena `finishThread` menempel pada
  `setState`, urutan lama berarti mengarsipkan thread sebelum ringkasannya
  masuk (AC-4.4). Urutannya dibalik; nama glif tetap berubah dua kali dan test
  Telegram yang lama tidak berubah satu assertion pun.
- **Rute Discord ber-namespace di adapter, bukan di core.** `chat.id` keluar
  dari adapter sebagai `discord:<id>` dan dilepas lagi di tepi REST. Core hanya
  punya `channelOf()` dan `container()`; rute Telegram tetap telanjang, jadi
  basis data v0.4 terute persis seperti sebelumnya (AC-10.4, AC-10.5).
- **`caps.threads` Telegram datang dari `config.telegram.topics`.** Angka itu
  dulu dibaca core di `topicsAvailable()`; sekarang konstruktor adapter yang
  menerimanya, dan core hanya membaca `caps` plus `is_forum` milik container.

```
$ npm run lint
oxlint src test scripts && oxfmt --check src test scripts bin package.json tsconfig.json
Checking formatting...
All matched files use the correct format.
Finished in 223ms on 26 files using 24 threads.
exit 0

$ npm run typecheck
tsc -p tsconfig.json --noEmit
exit 0

$ npm test
ℹ tests 66
ℹ pass 66
ℹ fail 0
exit 0

$ npm run e2e
ℹ tests 39
ℹ pass 39
ℹ fail 0
exit 0

$ npm run build
tsc -p tsconfig.json
exit 0
```

```
$ grep -rn 'channel\.id ===\|"telegram"\|"discord"' src/core/
(kosong)
```

LOC `src/` setelah langkah 11: **5.559** (plafon 8.000, `AGENTS.md:19`).
Berkas baru: `src/channels/discord.ts` 730, `src/core/channel.ts` 215.
Angka final AC-12.4 diambil lagi setelah langkah 12.

Gerbang penuh untuk seluruh wave dijalankan lagi setelah langkah 12.

---

### Langkah 12 — dokumen, ADR, rilis 0.5.0

Dikerjakan 8 Agustus 2026. Yang berubah dari daftar di langkah 12 aslinya, dan
alasannya:

- **`docs/adr/0008-discord-sebagai-channel-kedua.md` ditulis, dan ADR-0006 tidak
  dihapus.** ADR-0006 mendapat penanda "sebagian digantikan" di kepalanya dan
  satu blok kutipan tepat di bawah kalimat yang diganti, sehingga pembaca yang
  tiba lewat tautan lama membaca keputusan lamanya beserta penggantinya. Tabel
  `docs/adr/README.md` menyebut status itu (AC-12.2).
- **`AGENTS.md` dikoreksi lebih jauh dari peta `src/channels/`.** Baris
  `src/core/` juga aspirasional (`identity router topics policy approval runner
  memory render audit`, sembilan berkas yang tak satu pun ada), dan kalimat
  pembuka masih menyebut Caraka jembatan dari Telegram. Keduanya ikut dikoreksi;
  peta yang salah adalah peta yang menyesatkan agen berikutnya. Hard rule 1
  ditambahi satu kalimat: `channel.id` sah sebagai identitas, dan grep-nya
  tidak membuktikan apa-apa selama hanya ada satu channel.
- **`docs/ui-ux.md` §5 dibaca ulang terhadap kode, bukan hanya ditambahi kolom
  Discord.** Tiga sel ternyata menjanjikan lebih dari yang ada — `sendRichMessage`
  tetap dipakai Telegram (`telegram.ts:208`), jadi baris hasil dipertahankan;
  embed Discord tidak pernah dibangun; dan batas Telegram 32.768 karakter
  diganti dua angka yang benar-benar ada di kode (30.000 untuk rich message,
  4.096 untuk pesan biasa). Baris "diff panjang" Discord menyebut lampiran
  `.md` lewat tiga pecahan, yang memang dibangun (`discord.ts:288`).
- **`docs/erd.md`** mendapat satu blok kutipan di bawah tabel `container`, bukan
  perubahan enum: enum-nya sudah menyebut `discord` sejak v0.0. Yang salah
  adalah tabelnya sendiri tidak ada, dan blok itu menyebutkan rute ber-namespace
  serta penanda `meta` yang menggantikannya (AC-10.4).
- **README, README.id, dan llms.txt tidak disapu.** Hanya satu baris yang
  disentuh di kedua README — klaim "opens **no listening port**", yang dasbor
  membuatnya salah dan yang merupakan klaim keamanan. Sisanya masih ditulis ke
  permukaan v0.2, dan sudah begitu sejak sebelum wave ini: 0.3.0 dan 0.4.0
  keduanya rilis tanpa menyentuhnya. Menaikkan badge ke v0.5 sementara badan
  teksnya menjelaskan v0.2 membuatnya lebih tidak konsisten, bukan kurang.
  Sapuan README adalah concern sendiri (`AGENTS.md:79`) dan tetap terbuka.
  **AC-12.1 karena itu tidak lulus utuh** dan dicatat begitu, bukan diklaim.
- **Langkah 10 (`caraka init discord`) tidak dikerjakan di wave ini**, jadi
  **AC-10.6 tidak lulus.** Blok `discord:` ditulis tangan, dan berkas tokennya
  ditulis `atomicSecret` lewat `saveConfig` pada mode 0600 (AC-9.5 tetap lulus).
  Batas ini ada di bagian **Limited** CHANGELOG 0.5.0 dan di kartu 0.5.0
  `site/src/data/status.ts`, bukan hanya di sini.

### Gerbang penutup — 8 Agustus 2026, rilis 0.5.0

`npm run verify` di akar, exit 0, baris per-test dipangkas:

```
> caraka@0.5.0 verify
> npm run lint && npm run typecheck && npm test && npm run e2e && npm run build

> caraka@0.5.0 lint
> oxlint src test scripts && oxfmt --check src test scripts bin package.json tsconfig.json
Checking formatting...
All matched files use the correct format.

> caraka@0.5.0 typecheck
> tsc -p tsconfig.json --noEmit

> caraka@0.5.0 test
> node --import tsx --test test/unit.test.ts
ℹ tests 83
ℹ pass 83
ℹ fail 0

> caraka@0.5.0 e2e
> node --import tsx --test test/e2e.test.ts
ℹ tests 41
ℹ pass 41
ℹ fail 0

> caraka@0.5.0 build
> node -e "require('node:fs').rmSync('dist', { recursive: true, force: true })" && tsc -p tsconfig.json
```

Gerbang situs, karena `site/src/data/` disentuh di tujuh berkas:

```
$ cd site && npm run check
> oxlint src scripts test
(tanpa keluaran)
> astro check
Result (44 files):
- 0 errors
- 0 warnings
- 0 hints
> vitest run
 Test Files  2 passed (2)
      Tests  26 passed (26)

$ npm run e2e
  2 skipped
  110 passed (47.2s)
```

Satu baseline tinggi bergeser, diukur bukan ditebak: `/status` 6788 → **7596**
(+808), dari kartu rilis 0.5.0 dan dua gerbang terbuka baru pada kartu
Unreleased. Diukur pada run e2e Chromium 1440x900 yang gagal lebih dulu dengan
angka itu di pesannya, lalu ditulis ke `site/e2e/site.spec.ts` dan dijalankan
ulang hijau. Enam rute lain tidak bergeser: perubahan Discord dan dasbor di
`/`, `/docs`, `/compare`, `/install`, dan `/security` semuanya masuk ke baris
dan kartu yang sudah ada.

Gerbang mekanis AC-1.5 dan AC-6.6, dijalankan ulang setelah langkah 12:

```
$ grep -rn 'channel\.id ===\|case "telegram"\|case "discord"\|"telegram"\|"discord"' src/core/
(kosong, exit 1)
```

AC-3.1, dependensi runtime tetap empat:

```
$ node -e 'console.log(Object.keys(require("./package.json").dependencies).join(" "))'
@agentclientprotocol/claude-agent-acp @agentclientprotocol/sdk yaml zod
```

### LOC inti penutup (AC-12.4)

```
$ wc -l $(find src -name '*.ts')
   752 src/channels/discord.ts     260 src/dashboard/queries.ts
   294 src/channels/telegram.ts    114 src/dashboard/render.ts
   743 src/cli.ts                  409 src/dashboard/server.ts
   232 src/config.ts                99 src/discovery.ts
   215 src/core/channel.ts         133 src/drivers/claude-acp.ts
    66 src/core/driver.ts          180 src/drivers/cli.ts
  1600 src/core/gateway.ts          87 src/drivers/preset.ts
   178 src/core/security.ts        463 src/i18n.ts
    33 src/core/status.ts          217 src/memory/*.ts
                                   112 src/service.ts
                                   412 src/store/db.ts
  6599 total
```

**6.599** dari plafon 8.000 (`AGENTS.md`), sisa 1.401. Dasar pra-wave 4.290, jadi
kedua bagian Fase 5 menambah 2.309 — perkiraan Discord 600–900 dan perkiraan
dasbor 350–450 sama-sama meleset ke atas. Sebabnya terbaca di angkanya: `i18n.ts`
sendiri naik dari 286 ke 463, dan 177 baris itu adalah kunci dikali dua katalog,
bukan satu perilaku.

Dua pemeriksaan tanpa alat: tidak ada rahasia di diff (yang disentuh adalah
dokumen, katalog i18n, data situs, dan string versi; token Discord di test
adalah bentuk sintetis), dan prosa diperiksa terhadap *Writing style*
`AGENTS.md`. Tidak ada `npm publish` yang dijalankan (AC-12.5).
