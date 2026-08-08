# Plan — Fase 6: WhatsApp sebagai channel ketiga (v0.6)

**Spec:** `spec/whatsapp-v06.md` · **Tanggal:** 8 Agustus 2026
**Basis:** commit `6eb5f67` (release 0.5.0) · `src/` = 6.599 baris

Sepuluh langkah, berurut. Empat langkah pertama tidak menyentuh WhatsApp sama
sekali: keduanya menutup lubang yang sudah ada di core dan store, dan channel
baru mendarat di atas core yang sudah benar. Setiap langkah berakhir dengan
gerbang hijau sebelum langkah berikutnya dimulai.

## Langkah

### 1 · `caps.edit` dan pembacanya

Berkas: `src/core/channel.ts`, `src/core/gateway.ts`, `src/channels/telegram.ts`,
`src/channels/discord.ts`, `docs/api.md`.

- Tambah `edit: boolean` ke `ChannelCaps` (`src/core/channel.ts:21-32`).
- Telegram dan Discord mendeklarasikan `edit: true`
  (`src/channels/telegram.ts:97`, `src/channels/discord.ts:198`) — perilaku
  keduanya tidak berubah.
- Pembacanya satu tempat: callback `update` di `runTask`
  (`src/core/gateway.ts:805-825`) keluar lebih awal ketika `caps.edit` false.
  Ack pertama (`:761`) dan penghapusan di `finally` (`:852`) tidak berubah.
- `docs/api.md:188` pindah dari "tiga caps" ke empat, dan `edit` keluar dari
  daftar rencana.

Selesai bila: `npm test` dan `npm run e2e` hijau tanpa satu pun test diubah
selain penambahan `edit` pada channel palsu.

### 2 · Kolom `short_code` dan plafon lima approval pending

Berkas: `src/store/db.ts`, `docs/erd.md`.

- `ALTER TABLE approvals ADD COLUMN short_code TEXT` di balik penjaga `PRAGMA
  table_info`, mengikuti pola yang sudah ada di `src/store/db.ts:125-136`.
- Index unik parsial atas `(session_id, short_code)` untuk baris yang
  `decision IS NULL`, sehingga AC-3.4 ditegakkan basis data, bukan konvensi.
- `createApproval` menerima `shortCode?: string` dan menolak insert bila sesi itu
  sudah punya lima baris `decision IS NULL` dengan `expires_at > now`.
- `resolveApprovalByCode(code, principal, sessionId)` — salinan
  `resolveApproval` (`:355-370`) dengan `WHERE short_code = ?` menggantikan
  `WHERE id = ?`, memakai `UPDATE ... WHERE decision IS NULL` yang sama.

Risiko: basis data v0.5 yang sudah ada di mesin operator. Penjaga `PRAGMA`
menangani kolom; index unik parsial dibuat `IF NOT EXISTS`.

### 3 · Approval lewat kode di gateway

Berkas: `src/core/gateway.ts`, `src/core/security.ts`, `src/i18n.ts`.

- `shortCode()` di `src/core/security.ts`, sebelah `approvalCallbacks` (`:54`):
  4 karakter dari alfabet 32 simbol lewat `randomBytes`, rejection sampling
  supaya distribusinya rata.
- `askPermission` (`:1090`): cabang `caps.buttons === false` berhenti membatalkan
  izin (`:1105-1114`) dan mulai menempuh jalur kode — bangkitkan kode, simpan di
  baris approval, render kartu tanpa `reply_markup`, dan pakai `pending` map serta
  timer TTL yang sudah ada tanpa perubahan.
- Parser kode dipasang **sebelum** router prompt di `handleMessage`, dijaga
  `caps.buttons === false`. Bentuk yang dikonsumsi: `^(ok|no)\s+([A-Z2-9]{4})$`
  tanpa memedulikan besar-kecil huruf. Pesan yang cocok bentuknya tidak pernah
  diteruskan ke agent, cocok kodenya maupun tidak.
- Penghitung percobaan: `Map<sessionId, {principal, misses}>` di memori proses,
  direset saat approval diputuskan atau kedaluwarsa. Tidak masuk basis data:
  jendelanya sepuluh menit dan proses tunggal sudah memegang seluruh `pending`
  map di memori yang sama (`:1186`).
- Audit memakai aksi yang sudah ada `approval.decide`, dengan `result` baru
  `badcode` dan `locked`. Detail audit memuat id approval, tidak pernah kodenya.
- Kunci i18n baru di kedua katalog: kartu kode, kode tidak berlaku, batas
  percobaan tercapai, plafon approval pending.

### 4 · Config `whatsapp:`, rahasia, dan penolakan start

Berkas: `src/config.ts`, `src/cli.ts`.

- Blok zod `whatsapp` aditif memakai `...allowlists` yang sudah ada
  (`src/config.ts:26-31`), ditambah `provider: z.enum(["baileys","cloud-api"])`,
  `acknowledgeRisk: z.boolean().default(false)`, `phoneNumberId` opsional, dan
  `webhook: { port, path }` opsional.
- Dua `superRefine`: `baileys` tanpa `acknowledgeRisk: true` ditolak dengan
  pesan yang menautkan `docs/whatsapp-risiko.md`; `cloud-api` tanpa
  `phoneNumberId` ditolak dengan menyebut kunci yang kurang.
- `channelBlocks()` (`:99-121`) menambah entri `whatsapp` dengan
  `threads: false`.
- `carakaPaths()` (`:138-148`) menambah `whatsappSession`
  (`secrets/whatsapp/`), `whatsappToken`, dan `whatsappVerify`.
- `loadConfig()` membaca token lewat `channelToken()` (`:176-179`) dengan env
  `CARAKA_WHATSAPP_TOKEN` dan `CARAKA_WHATSAPP_VERIFY_TOKEN`.
- `buildChannels()` (`src/cli.ts:144-160`) menambah cabang `whatsapp` di balik
  `await import("./channels/whatsapp.js")`, dan meneruskan host/port bind hasil
  `resolveBind` supaya `src/channels/` tidak mengimpor `src/dashboard/`.

### 5 · Kerangka channel WhatsApp: limiter, jitter, first-contact

Berkas: `src/channels/whatsapp.ts` (baru).

- Kelas `WhatsApp implements Channel`, `caps = { threads:false, buttons:false,
  edit: provider === "baileys", maxChars: 4096 }`.
- Antrean keluar tunggal: satu fungsi `emit()` yang **semua** pengiriman lewati.
  Ia menegakkan tiga hal berurut — plafon 12/60 dtk bergulir (bentuknya menyalin
  `rateDelay` `src/core/gateway.ts:552-562`), jeda acak 1.200–3.500 md, lalu
  penolakan first-contact.
- `seen: Set<string>` diisi setiap pesan masuk yang diterima proses ini;
  `allowFrom` diperlakukan sebagai anggota tetap.
- Empat konstanta spec-set di kepala berkas, masing-masing berkomentar merujuk
  `spec/whatsapp-v06.md` §7.
- `createTopic`/`editTopic` melempar error bernama; `finishThread` tidak
  didefinisikan.
- `sendResult` memakai `splitMarkdown(markdown, 4096)` dan jatuh ke satu berkas
  `.md` lewat tiga pecahan, meniru `src/channels/discord.ts:288`.
- `pairingText` dan `readiness` ditulis dengan kata-kata WhatsApp.

### 6 · Provider `cloud-api`: REST dan penerima webhook

Berkas: `src/channels/whatsapp.ts`.

- Kirim: `POST {base}/{phoneNumberId}/messages` lewat `fetch` yang bisa
  disuntik, dengan bentuk retry 429 yang sama dengan dua channel lain.
- Terima: `createServer` dari `node:http`, bind dari opsi, satu path yang
  dikonfigurasi.
  - `GET` dengan `hub.mode=subscribe` → bandingkan `hub.verify_token` waktu-tetap
    → balas `hub.challenge`, atau 403.
  - `POST` → baca badan dengan batas ukuran keras → hitung HMAC SHA-256 atas
    badan mentah → `timingSafeEqual` terhadap `X-Hub-Signature-256` → 403 bila
    gagal, tanpa badan balasan.
  - Metode dan path lain → 404.
- Peristiwa yang lolos verifikasi diterjemahkan menjadi `InboundEvent` dan
  didorong ke antrean yang dibaca `updates()`, bentuk yang sama dengan socket
  Discord.
- `editText` menyelesaikan tanpa panggilan (Cloud API tidak punya endpoint edit);
  `deleteMessage` juga, dan komentarnya menyebut ack "sedang bekerja" akan
  tertinggal di transkrip.

### 7 · Provider `baileys`: transport terpisah dan reconnect

Berkas: `src/channels/whatsapp-baileys.ts` (baru), `src/channels/whatsapp.ts`.

- Berkas ini satu-satunya yang menyebut `@whiskeysockets/baileys`, dan ia hanya
  dimuat lewat `await import()` dari cabang provider. Alasannya mekanis: impor
  puncak di `whatsapp.ts` akan memuat Baileys untuk pemakai `cloud-api` juga.
- `import()` dibungkus `try`; kegagalan resolusi modul menjadi error yang memuat
  perintah pemasangan persis beserta versi yang dipin.
- Auth state lewat `useMultiFileAuthState` ke `secrets/whatsapp/`; direktori
  dibuat `mode: 0o700` dan diperiksa ulang dengan `chmod`, meniru
  `src/config.ts:157-163`.
- Reconnect: 5 dtk × 2^n, jitter penuh, plafon 300 dtk, enam percobaan.
  Penghitungnya kembali ke nol hanya sesudah sambungan bertahan 60 detik, bukan
  setiap kali `connection: "open"` tiba — tautan yang berkedip akan mereset
  penghitung setiap siklus dan menyambung ulang selamanya di jeda dasar.
  Sesudah percobaan keenam channel berhenti, menulis audit, dan `updates()`
  melempar kalimatnya. Yang menangkapnya bukan `onGiveUp` melainkan
  `Gateway.pump()`: satu channel yang berhenti keluar dari proses, channel lain
  tetap menjawab, dan operator diberi tahu lewat salah satunya. Dengan satu
  channel saja error itu naik seperti dulu, jadi `caraka start` tetap berakhir
  dengan kalimat (AC-9.3).
- `loggedOut`/401 masuk daftar fatal, bentuknya sama dengan `FATAL_CLOSE`
  (`src/channels/discord.ts:45`), dan pesannya menyebut relink.
- `editText` memakai edit protokol Baileys, dengan penjaga 30 detik per pesan.

### 8 · `caraka init whatsapp` dan `caraka doctor`

Berkas: `src/cli.ts`, `src/i18n.ts`.

**Setengah dibangun.** Baris `caraka doctor` ada; wizardnya tidak.

- ~~`caraka init whatsapp` menanyakan provider~~ — **tidak dibangun.** `init()`
  tidak punya subperintah, dan `caraka init whatsapp` hari ini menjalankan
  wizard Telegram yang menimpa `config.yaml`. **AC-8.3, AC-8.10, dan AC-10.6
  tidak terpenuhi**, dan spec sudah mencatatnya di *Yang tidak dikerjakan*.
  Konsekuensi yang sudah ditutup: tidak ada satu pun string yang menyebut
  perintah itu (AC-9.4 diamendemen), dan pairing dicetak oleh `caraka start`
  saat perangkat belum tertaut (AC-7.5 diamendemen, AC-10.7 baru).
- `caraka doctor` menambah baris mode `secrets/whatsapp/` (0700) dan berkas
  token (0600) lewat `privateFile()` (`src/config.ts:196-199`).

### 9 · Harness uji WhatsApp

Berkas: `test/unit.test.ts`, `test/e2e.test.ts`, `test/fixtures/`.

- Tanpa kredensial hidup. Cloud API diuji lewat `fetch` palsu dan
  `http.request` ke listener yang benar-benar dijalankan pada port 0.
- Baileys diuji lewat modul palsu yang disuntik ke titik `import()`, sehingga
  `@whiskeysockets/baileys` tidak pernah masuk lockfile repo ini.
- Jam dan `Math.random` disuntik supaya jitter dan backoff bisa diuji tanpa
  menunggu.

### 10 · Dokumen, ADR, halaman risiko, situs, rilis

Berkas: seluruh daftar di AC-12.4, ditambah `docs/whatsapp-risiko.md` (baru),
`docs/adr/0009-*.md` (baru), `CHANGELOG.md`, `package.json`,
`site/src/data/security.ts`, `site/src/data/status.ts`.

- Amendemen aturan keras 2 dan FR-CHAN-02 ditulis lebih dulu, karena keduanya
  yang mengizinkan langkah 3 ada.
- `spec/v10.md` AC-5.3 diperbarui dengan carve-out yang sama.
- `docs/roadmap.md:132` tetap tidak tercentang.

---

## Pemetaan pembuktian

| AC | Bukti |
|---|---|
| AC-1.1 | unit: objek WhatsApp memenuhi `Channel` tanpa cast; diff `src/core/channel.ts` tidak menambah method |
| AC-1.2 | unit: grep `channel.id ===`, `case "whatsapp"`, `"whatsapp"` di `src/core/` kosong (gerbang yang sama dengan discord-v05 AC-1.5) |
| AC-1.3 | e2e: channel palsu `threads:false` → tiga balasan berturut-turut berheader `[ws · #id]`; diff `header()` kosong |
| AC-1.4 | e2e Telegram dan Discord yang ada tetap hijau tanpa diubah |
| AC-1.5 | unit: `createTopic` melempar; pesan memuat kata "thread" |
| AC-1.6 | unit: config dengan blok `whatsapp:` → `import()` modul channel terjadi |
| AC-1.7 | unit: config tanpa blok itu → `import()` tidak pernah terjadi |
| AC-1.8 | e2e: dua workspace di satu wadah linear → `/status` menyebut kedua sesi (`test/e2e.test.ts`, "without threads /status names every session") |
| AC-1.9 | e2e Discord yang ada: `/status` di dalam thread tetap melaporkan satu sesi |
| AC-1.10 | unit: `chat_id` tersimpan berprefiks channel; rute Telegram v0.5 tetap resolve |
| AC-2.1 | unit: `Object.keys(caps)` tepat empat; grep tiap nama cap punya pembaca di `src/core/` |
| AC-2.2 | unit: caps kedua provider |
| AC-2.3 | unit: `new WhatsApp({provider})` dua kali, assert `caps.edit` |
| AC-2.4 | unit: channel palsu `edit:false` + 10 notifikasi agent → nol panggilan `editText`, satu ack, satu hasil |
| AC-2.5 | unit: jam disuntik; dua edit berjarak 5 dtk → satu panggilan keluar; berjarak 31 dtk → dua |
| AC-2.6 | unit: `Object.keys(caps)` tidak memuat keempat nama itu |
| AC-2.7 | unit: `caps.maxChars` = 4096; `sendResult` memanggil `splitMarkdown` dengan angka itu |
| AC-2.8 | unit: hasil 20.000 karakter → satu unggahan berkas, nol pesan teks |
| AC-2.9 | unit: hasil dengan code block melewati batas → tiap pecahan berpagar genap |
| AC-3.1 | unit: channel palsu `buttons:false` → baris approval punya `short_code`, teks kartu memuatnya, `reply_markup` absen |
| AC-3.2 | e2e: channel Telegram (`buttons:true`) → `short_code` NULL dan teks kartu tidak memuat kode (`test/e2e.test.ts`, "private allowlisted Telegram message") |
| AC-3.3 | unit: 10.000 kode dibangkitkan → semua panjang 4, semua karakter di alfabet, tidak ada `I`/`O`/`0`/`1`, distribusi tidak timpang |
| AC-3.4 | unit: index unik parsial menolak kode kembar pada sesi yang sama |
| AC-3.5 | e2e: `ok <kode>` → izin `selected`, dan driver palsu tidak pernah menerima teks itu sebagai prompt |
| AC-3.6 | e2e: principal kedua yang lolos allowlist mengirim kode principal pertama → ditolak, audit `approval.decide/denied`, izin tetap pending |
| AC-3.7 | e2e: kode dikirim dari wadah lain → ditolak |
| AC-3.8 | e2e: kode yang sama dikirim dua kali → yang kedua dijawab "sudah dipakai", `pending.finish` dipanggil sekali |
| AC-3.9 | unit: jam dimajukan melewati TTL → kode ditolak, baris approval `decision = 'reject'` |
| AC-3.10 | e2e: `ok ZZZZ` → balasan "kode tidak berlaku", driver palsu tidak menerima prompt |
| AC-3.11 | e2e: dua approval pending, kode A memutuskan approval A saja |
| AC-3.12 | unit: seluruh baris audit dan seluruh prompt yang sampai ke driver palsu di-grep terhadap kode yang dibangkitkan → nol kecocokan |
| AC-3.13 | unit: teks kartu memuat `ok <kode>`, `no <kode>`, dan masa berlaku; kedua katalog i18n punya kuncinya |
| AC-3.14 | e2e Telegram yang ada: `ok A7F3` diteruskan ke agent seperti teks biasa, nol approval berubah |
| AC-4.1 | e2e: lima kode salah lalu satu kode benar → yang benar ditolak, izin tetap pending sampai TTL. Ditambah: lima kode salah dari principal kedua tidak menutup jalur principal pemilik, dan enam baris berbentuk kode tanpa approval menunggu tidak menghabiskan percobaan |
| AC-4.2 | unit: lima baris audit `badcode`, masing-masing menyebut principal dan sesi |
| AC-4.3 | unit: lima approval pending lalu permintaan keenam → nol pesan keluar, izin `cancelled`, satu baris audit |
| AC-4.4 | unit: `expires_at` sebelum dan sesudah lima percobaan salah identik |
| AC-4.5 | e2e: percobaan keenam sampai kesepuluh tidak menambah pesan keluar |
| AC-5.1 | unit: `Object.keys(dependencies).length === 4` |
| AC-5.2 | unit: `peerDependencies["@whiskeysockets/baileys"]` versi eksak dan `peerDependenciesMeta[...].optional === true`; grep `dependencies`/`optionalDependencies` tidak memuatnya |
| AC-5.3 | unit: grep `import` di jalur cloud-api hanya menyebut modul `node:` dan `src/`; adapter memakai `fetch` yang disuntik |
| AC-5.4 | unit: provider `cloud-api` → modul baileys palsu tidak pernah diminta |
| AC-5.5 | unit: titik `import()` dibuat gagal → pesan memuat `npm i @whiskeysockets/baileys@<versi>`, dan tidak ada stack trace di keluaran |
| AC-5.6 | manual: baris T8 `docs/security.md:43` sesudah amendemen; angka 4 dan 104 dari perintah yang ditulis di §2 spec, dijalankan ulang dan ditempel di bawah |
| AC-5.7 | perintah: `npm pack --dry-run --json`, `unpackedSize` ditempel di bawah |
| AC-6.1 | unit: provider `baileys` → `createServer` tidak pernah dipanggil |
| AC-6.2 | unit: tanpa flag bind → `server.address().address` adalah `127.0.0.1` |
| AC-6.3 | unit: bind `0.0.0.0` → peringatan tercetak dan audit tertulis sebelum `listen` selesai |
| AC-6.4 | unit: POST dengan signature salah, tanpa signature, dan dengan signature milik badan lain → tiga kali 403 berbadan kosong, nol peristiwa masuk antrean |
| AC-6.5 | unit: grep jalur verifikasi memakai `timingSafeEqual`, bukan `===` |
| AC-6.6 | unit: AC-6.4 diulang pada listener yang bind loopback |
| AC-6.7 | unit: GET dengan token cocok → 200 berisi challenge apa adanya; token salah → 403 |
| AC-6.8 | unit: `GET /`, `PUT /wa`, `POST /lain` → 404 |
| AC-6.9 | unit: badan 10 MB → koneksi ditolak sebelum badan habis dibaca; memori proses tidak menyimpannya |
| AC-6.10 | manual: `docs/security.md` §8 sesudah amendemen |
| AC-7.1 | unit: sesudah `start()`, mode direktori 0700 dan mode `creds.json` 0600; modul pengganti menulis berkas itu pada 0644 lebih dulu |
| AC-7.2 | unit: YAML hasil `caraka init whatsapp` tidak memuat token; env override terbaca |
| AC-7.3 | unit: `doctor` melaporkan dua baris itu; mode dirusak menjadi 0755 → baris menjadi merah |
| AC-7.4 | unit: scrubber hasil `start()` mengubah token yang dimuat menjadi `[REDACTED]` |
| AC-7.5 | unit: grep QR di jalur kirim channel kosong; payload `qr` tidak pernah dicetak, dan yang dicetak adalah hasil `requestPairingCode` |
| AC-7.6 | manual: `docs/design.md:41` sesudah amendemen |
| AC-8.1 | unit: blok `whatsapp:` dengan `allowFrom: []` → start berhenti dan menyebut `whatsapp` |
| AC-8.2 | unit: `provider: baileys` tanpa `acknowledgeRisk` dan dengan `false` → dua kali berhenti, pesan menautkan `docs/whatsapp-risiko.md` |
| AC-8.3 | **tidak terpenuhi** — wizard langkah 8 tidak dibangun |
| AC-8.4 | unit: jam disuntik; 20 kirim dalam satu jendela → 12 keluar, 8 tertahan lalu keluar di jendela berikutnya, nol dibuang |
| AC-8.5 | unit: `Math.random` disuntik ke 0 dan 1 → jeda 1.200 md dan 3.500 md; dengan acak nyata, 200 jeda semuanya di dalam rentang dan tidak semuanya sama |
| AC-8.6 | unit: kirim ke nomor tanpa riwayat dan di luar `allowFrom` → melempar error bernama, nol tulis ke transport palsu, satu baris audit |
| AC-8.7 | e2e: pemberitahuan startup ke operator terkirim pada channel WhatsApp yang belum menerima pesan apa pun |
| AC-8.8 | unit: empat call site menolak nomor tanpa riwayat dan nol tulis ke transport palsu; lalu jumlah tulis dicocokkan dengan jumlah jeda berpacu — satu tulis tanpa jeda di belakangnya adalah jalur yang melewati `emit()` |
| AC-8.9 | unit: nomor yang ada di daftar kontak palsu tetapi belum pernah mengirim → tetap ditolak |
| AC-8.10 | **tidak terpenuhi** — wizard langkah 8 tidak dibangun |
| AC-9.1 | unit: transport palsu menutup diri; jam disuntik → jeda 5, 10, 20, 40, 80, 160 dtk dengan jitter di dalam rentang, tidak ada yang melewati 300 dtk |
| AC-9.2 | unit: enam kegagalan → nol percobaan ketujuh, satu audit `channel.stopped`; ditambah tautan yang berkedip tetap kehabisan percobaan. e2e: channel kedua yang berhenti → channel pertama tetap menjawab dan kalimatnya sampai ke sana |
| AC-9.3 | unit: konfigurasi satu channel → `doctor` melaporkannya dan proses menulis baris log, bukan keluar diam-diam |
| AC-9.4 | unit: transport palsu melaporkan logged-out → nol percobaan sambung ulang, pesan menyebut `secrets/whatsapp/` |
| AC-9.5 | unit: enam baris audit dengan nomor percobaan 1 sampai 6 |
| AC-9.6 | unit: sepanjang seluruh siklus sambung ulang, transport palsu menerima nol pesan keluar |
| AC-9.7 | manual: baca `docs/troubleshooting.md` sesudah penambahan; empat runbook ada |
| AC-10.1 | unit: config v0.5 tanpa blok `whatsapp:` tetap lolos; dengan blok lolos, `version` tetap 1 |
| AC-10.2 | unit: `allowFrom` kosong ditolak skema; blok tidak punya `allowChats`, dan `channelBlocks` menerbitkan daftar kosong |
| AC-10.3 | unit: `provider: cloud` ditolak skema dan pesannya menyebut `cloud-api` |
| AC-10.4 | unit: `cloud-api` tanpa `phoneNumberId` → start berhenti menyebut kunci itu |
| AC-10.5 | e2e: skenario yang sama dijalankan dua kali, sekali per provider; jejak panggilan core identik kecuali `editText` |
| AC-10.6 | **tidak terpenuhi** — wizard langkah 8 tidak dibangun |
| AC-10.7 | unit: provider `baileys` tanpa `number` → kode pairing tidak diminta dan tidak ada payload `qr` di stdout |
| AC-11.1 | manual: setiap angka di spec dicocokkan satu per satu dengan tabel §7 |
| AC-11.2 | unit: setiap angka spec-set diimpor dari konstantanya di dalam test, bukan ditulis ulang sebagai literal; grep memastikan tiap konstanta dideklarasikan sekali dan komentarnya menyebut `spec/whatsapp-v06.md`. Konstanta outbound, jitter, backoff, dan `maxChars` di `src/channels/whatsapp.ts`; entropi kode, batas percobaan, dan plafon pending di `src/core/security.ts` dan `src/store/db.ts` |
| AC-11.3 | manual: `docs/security.md` §9 sesudah amendemen |
| AC-12.1 | manual: `AGENTS.md` aturan keras 2 sesudah amendemen |
| AC-12.2 | manual: `docs/frd.md` FR-CHAN-02 sesudah amendemen |
| AC-12.3 | manual: `spec/v10.md` AC-5.3 sesudah pembaruan |
| AC-12.4 | unit: daftar berkas di AC-12.4 dibandingkan dengan `git diff --name-only`; setiap berkas hadir |
| AC-12.5 | manual: `docs/whatsapp-risiko.md` ada; unit: pesan galat AC-8.2 memuat path-nya |
| AC-12.6 | manual: ADR baru menyebut ketiga keputusan dan menautkan ADR-0004 |
| AC-12.7 | unit: `docs/roadmap.md` baris uji lapangan tetap `- [ ]`; `site/src/data/status.ts` menyatakan hal yang sama |
| AC-12.8 | manual: entri CHANGELOG 0.6.0 |
| AC-12.9 | perintah: `wc -l src/**/*.ts src/*.ts`, ditempel di bawah |
| AC-12.10 | tidak ada perintah `npm publish` di log wave ini |

---

## Risiko

- **Anggaran kompleksitas.** `src/` = 6.599 baris pada `6eb5f67`; plafon ~8.000
  (`AGENTS.md:19`). Wave ini menambah dua berkas channel, dan Fase 7 masih harus
  muat. Bila langkah 5 sampai 7 melewati 900 baris gabungan, yang dipotong adalah
  permukaan Cloud API (media unggah/unduh), bukan mitigasi ban.
- **Aturan keras yang diamendemen.** Langkah 3 mengubah perilaku yang dijamin
  `done/discord-v05/spec.md` AC-2.5 (channel tanpa tombol menolak izin). Itu
  amendemen sadar, ditulis di AC-12.2, dan test yang mengunci perilaku lama
  diubah di commit yang sama dengan amendemennya, bukan sebelumnya.
- **Uji tanpa kredensial hidup.** Tidak ada nomor WhatsApp, tidak ada Meta
  Business, tidak ada QR di CI. Seluruh bukti turun ke unit dan e2e ber-mock, dan
  batas itu ditulis di CHANGELOG (AC-12.8), meniru preseden "printed untested"
  di 0.2.0.
- **Ban tetap mungkin.** Mitigasi di kode menurunkan sinyal yang bisa kita
  kendalikan (`riset:48`); tidak ada yang menjamin apa pun (`riset:50`). Itulah
  kenapa `docs/whatsapp-risiko.md` ada dan kenapa Cloud API dikirim di wave yang
  sama.
- **Baileys tidak di lockfile.** Peer opsional berarti CI tidak pernah memasang
  Baileys, jadi `npm audit` tidak melihatnya dan perubahan API-nya tidak akan
  ketahuan dari repo ini. Yang menahan: versi dipin eksak, dan pesan galat
  AC-5.5 menyebut versi itu.
- **Index unik parsial pada basis data lama.** Bila sebuah basis data v0.5 punya
  baris approval pending dengan `short_code` NULL, index parsial atas kolom NULL
  tidak bentrok. Diuji terhadap salinan skema v0.5 di `test/fixtures/`.

## Verifikasi

Ditempel sebelum pindah ke `done/whatsapp-v06/`:

```
npm run lint
npm run typecheck
npm test
npm run e2e
npm pack --dry-run --json   # unpackedSize < 15 MB (AC-5.7)
wc -l src/**/*.ts src/*.ts  # LOC pasca-merge (AC-12.9)
```

### Jalankan 8 Agustus 2026, sesudah putaran perbaikan review

```
$ npm run lint
> oxlint src test scripts && oxfmt --check src test scripts bin package.json tsconfig.json
Checking formatting...
All matched files use the correct format.
Finished in 154ms on 32 files using 24 threads.

$ npm run typecheck
> tsc -p tsconfig.json --noEmit
(tanpa keluaran)

$ npm test
ℹ tests 103
ℹ pass 103
ℹ fail 0
ℹ duration_ms 6023.432796

$ npm run e2e
ℹ tests 54
ℹ pass 54
ℹ fail 0
ℹ duration_ms 23938.946174

$ find src -name '*.ts' | xargs wc -l | tail -1
  7996 total
```

**AC-12.9: 7.996 baris, 4 baris di bawah plafon ~8.000 (`AGENTS.md:19`).** Ini
bukan ruang; ini garisnya. Fase 7 tidak muat tanpa ada yang dihapus lebih dulu,
dan kandidat pertamanya tetap permukaan Cloud API (unggah media), bukan mitigasi
ban.

Ditambah dua pemeriksaan yang tidak dilakukan alat: tanpa rahasia di diff, dan
prosa yang lolos bagian *Writing style* `AGENTS.md`.

---

## Langkah 10 — apa yang benar-benar mendarat

Halaman risikonya mendarat dwibahasa dan dengan nama lain dari yang ditulis spec.
`docs/whatsapp-risk.md` menjadi **`docs/whatsapp-risiko.md`** (ID) dan
**`docs/whatsapp-risiko.en.md`** (EN); pesan galat `acknowledgeRisk`, kedua
katalog `whatsapp.riskNotice`, komentar `src/cli.ts`, dan regex uji AC-8.2 ikut
pindah, jadi tautan yang dicetak `caraka start` resolve. Alasan dwibahasa:
`docs/security.md` §13 mensyaratkan halaman ini untuk rilis publik dan
`docs/roadmap.md` Fase 7 mensyaratkan dokumentasi ID/EN atas halaman yang sama;
menulis satu bahasa berarti menulis ulang seluruhnya di Fase 7.

Setiap klaim di halaman itu dicocokkan ulang dengan repositori pada tree ini, dan
tiga di antaranya berubah karena draftnya ditulis sebelum wave: "channel WhatsApp
belum ada di produk" (sekarang v0.6.0), "kelima mitigasi belum dibangun" (empat
kode, yang kelima setengah — `caraka init whatsapp` tidak ada), dan webhook Cloud
API yang dulu berupa rencana (sekarang terkirim, loopback, signature waktu-tetap).
Angka riset, tanggalnya, dan batas populasinya tidak diubah.

Dokumen yang diamendemen di perubahan yang sama: `AGENTS.md` (aturan keras 2,
paragraf pembuka, peta repositori), `docs/frd.md` (FR-CHAN-01, FR-CHAN-02),
`spec/v10.md` (AC-5.3), `docs/security.md` (T7, T8 + paragraf plafon dependensi,
T9, §4 butir 2, §6, §8 klaim tanpa-webhook, §9 dua baris rate limit, §11 butir 5,
§12, checklist §13), `docs/design.md` (`sessions/`, fallback kode, nama provider),
`docs/api.md` (empat caps), `docs/session-model.md` (§7), `docs/ui-ux.md` (§4.4,
§5), `docs/erd.md` (`short_code`), `docs/techstack.md` (dua baris WhatsApp + ADR
peer opsional), `docs/faq.md` (channel, dua pertanyaan baru), `docs/roadmap.md`
(Fase 6, Fase 7), `docs/troubleshooting.md` (runbook WhatsApp), `README.md` dan
`README.id.md` (klaim listener), `docs/adr/README.md` + ADR-0009 baru.

`docs/roadmap.md` uji lapangan 14 hari **tetap tidak tercentang** (AC-12.7), dan
`site/src/data/status.ts` menyatakan hal yang sama di kartu 0.6.0 dan di daftar
gerbang terbuka. Lima baris mesin Fase 6 tercentang.

### Situs

`site/src/data/`: `status.ts` (versi 0.6.0, channel 2 → 3, denyut fase pindah ke
6, kartu 0.6.0, gerbang terbuka keenam), `security.ts` (T7, T8, T9 yang dulu
berbunyi "tidak berlaku: tidak ada kode channel WhatsApp", dua baris "yang tidak
kami klaim" baru, kontrol wajib approval dan listener, v0.5 → v0.6),
`compare.ts` (channel `2 in v0.5` → `3 in v0.6`, maturity, v0.2 → v0.6),
`landing.ts` (klaim approval dan listener, chip versi), `docs.ts` (baris `code`
di tabel approval, blok `whatsapp:` di contoh config, jaringan, output, secret
files, catatan env), `install.ts` (`NO LISTENER` → `LOOPBACK ONLY`), `og.ts` dan
`scripts/gen-assets.mjs` (bar fase 6 terisi, denyut pindah), `readme.ts` (deskripsi
dan status kartu repo). Chip npm `readme.ts` **tetap v0.2.1**: ia melacak registry,
bukan `package.json`, dan komentarnya sekarang menyebut 0.3.0 sampai 0.6.0 sebagai
yang bertag dan belum diterbitkan.

`site/AGENTS.md` paragraf *Content* ditulis ulang ke permukaan v0.6, mengikuti
preseden rilis 0.5.0.

**Halaman risiko tidak mendapat rute situs.** Spec sudah menaruhnya di *Yang tidak
dikerjakan*, dan Fase 7 memilikinya bersama dokumentasi dwibahasa
(`docs/roadmap.md`). Rute baru berarti komp baru, gambar OG baru, entri `PAGES`,
dan baseline tinggi ketujuh; tidak satu pun dibayar oleh wave ini.

Baseline tinggi diukur ulang, bukan ditebak (Chromium, 1440×900, 8 Agustus 2026):
`/status` 7596 → 8660, `/docs` 5874 → 6499, `/security` 4757 → 5095, `/install`
5141 → 5210, `/` 6450 → 6515, `/brand/readme` 5533 → 5549. `/compare` dan lima
rute lainnya tidak bergerak. `/brand/readme` pindah dari kelompok "masih diukur
terhadap komp" ke kelompok yang diukur dari situs, dan alasannya ditulis di
`site/e2e/site.spec.ts`.

### Gerbang, dijalankan 8 Agustus 2026 pada tree yang ditutup

```
$ npm run lint
> caraka@0.6.0 lint
> oxlint src test scripts && oxfmt --check src test scripts bin package.json tsconfig.json
Checking formatting...
All matched files use the correct format.
Finished in 115ms on 32 files using 24 threads.

$ npm run typecheck
> caraka@0.6.0 typecheck
> tsc -p tsconfig.json --noEmit
(tanpa keluaran)

$ npm test
ℹ tests 103
ℹ pass 103
ℹ fail 0
ℹ duration_ms 6004.459823

$ npm run e2e
ℹ tests 54
ℹ pass 54
ℹ fail 0
ℹ duration_ms 23792.696947

$ find src -name '*.ts' | xargs wc -l | tail -1
  7996 total

$ npm pack --dry-run --json
size 177664  unpackedSize 684288  files 86
```

```
$ cd site && npm run check
- 0 errors
- 0 warnings
- 0 hints
 Test Files  2 passed (2)
      Tests  26 passed (26)
   Duration  150ms

$ cd site && npm run e2e
  2 skipped
  110 passed (54.7s)
```

**AC-5.7: 684.288 byte terbuka, jauh di bawah 15 MB** (`docs/frd.md` NFR-05), dan
angka itu benar justru karena Baileys peer opsional. **AC-12.9: 7.996 baris.**

Satu catatan tentang keandalan gerbang situs. `motion › scroll progress advances`
gagal di firefox dan webkit pada satu putaran penuh dan lolos 6 dari 6 kali saat
dijalankan sendiri (`--repeat-each=3`, dua engine). Ia tidak menyentuh apa pun
yang wave ini ubah: yang dibacanya adalah `--ck-sp` sesudah satu `scrollTo`, dan
kegagalannya berbentuk halaman yang belum sempat menggulir. Ia dicatat sebagai
flake di bawah beban, bukan sebagai temuan, dan putaran yang ditempel di atas
hijau seluruhnya.

### Yang tetap tidak terpenuhi saat wave ditutup

- **AC-8.3, AC-8.10, AC-10.6** — `caraka init whatsapp` tidak dibangun.
- **Uji lapangan 14 hari** (AC-12.7 menjaganya tidak tercentang). Tidak ada nomor
  WhatsApp hidup yang pernah ditautkan dan tidak ada webhook Cloud API hidup yang
  pernah diterima, jadi bentuk payload, alur pairing, perilaku 429, dan perilaku
  ban semuanya belum terbukti. CHANGELOG 0.6.0 mengatakannya (AC-12.8).
- **AC-12.10** — tidak ada `npm publish` yang dijalankan.
- Di luar AC: deskripsi meta di `site/src/lib/site.ts` masih menulis "Caraka v0.2"
  di lima rute. Ia sudah salah sebelum wave ini dan dilewati oleh rilis 0.4.0 dan
  0.5.0 juga; menyapunya adalah pekerjaan sendiri, bukan pekerjaan WhatsApp.
