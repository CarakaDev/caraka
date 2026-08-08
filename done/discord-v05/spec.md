# Spec — Fase 5 (bagian Discord): channel kedua (v0.5)

**Slug:** discord-v05 · **Tanggal:** 8 Agustus 2026 · **Status:** aktif
**Induk:** `spec/v10.md` (kampanye v1.0, lingkup butir 5) · **Roadmap:** `docs/roadmap.md:108`

Dashboard htmx adalah pekerjaan terpisah dengan spec dan plan sendiri
(`AGENTS.md:79`, satu concern per PR). Dokumen ini tidak menyebutnya lagi.

Baris yang dikutip diukur pada commit `9494ec5` (release 0.4.0).

## Latar

Roadmap menutup Fase 5 dengan pertanyaan apakah produk ini bertahan di tangan
orang lain (`docs/roadmap.md:110`). Butir pertamanya adalah Discord dengan thread
dan approval, memetakan model sesi yang sudah ada (`docs/roadmap.md:112`). Baris
itu menulis "approval berbasis role", dan K9 menjelaskan kenapa kata itu berubah.

Yang menghalangi bukan Discord, melainkan tidak adanya seam. `grep caps src/`
mengembalikan nol baris. Interface `Channel` di `docs/design.md:74-89`,
`docs/design.md:291-307`, dan `docs/api.md:143-169` adalah prosa; di kode,
`src/channels/` berisi satu berkas (`telegram.ts`, 302 baris, 15 method publik)
dan gateway memegangnya sebagai tipe konkret: import kelas dan dua tipe pesan di
`src/core/gateway.ts:5-10`, parameter konstruktor bertipe `Telegram` di `:104`,
37 rujukan tipe `TelegramMessage`/`TelegramUpdate` di 37 baris, dan 12 method
Telegram dipanggil di 23 call site (`:180` sampai `:1353`, dua belas di
antaranya `answerCallback`).

Hard rule 1 (`AGENTS.md:53`) karena itu lolos di dalam vakum: tidak ada
`channel.id` untuk dicabangkan karena tidak ada `channel`. Bukti "grep
`channel.id`" di `plan/v10.md` hijau hari ini dan tidak membuktikan apa pun.
Begitu Discord mendarat, vakum itu berakhir, dan seam-lah yang menentukan apakah
aturan itu bertahan atau berubah menjadi rangkaian `if`.

Dua kebocoran nyata ikut terbuka bersama channel kedua, dan keduanya ditutup di
sini sebagai AC, bukan sebagai catatan:

1. `claudeEnvironment()` (`src/drivers/claude-acp.ts:11-15`) menghapus tepat satu
   nama, `CARAKA_TELEGRAM_TOKEN`. `CARAKA_DISCORD_TOKEN` akan diwariskan ke
   setiap proses agent yang di-spawn kedua driver (`claude-acp.ts:40`,
   `drivers/cli.ts:114`). Test yang ada hanya memeriksa kasus Telegram
   (`test/unit.test.ts:64-65` untuk fungsinya, `test/unit.test.ts:849` untuk
   proses CLI yang benar-benar di-spawn).
2. Scrubber tidak mengenali bentuk token bot Discord.
   `src/core/security.ts:8` mencocokkan bentuk Telegram (`\d{6,12}:` diikuti
   base64url), dan `:9` mensyaratkan awalan `eyJ` sehingga hanya JWT yang
   tertangkap. Token bot Discord adalah tiga segmen base64url dipisah titik dan
   tidak diawali `eyJ`, jadi ia lolos kedua pola. Yang tersisa hanyalah seeding
   exact di `src/cli.ts:446`, dan seeding hanya menutup token yang proses ini
   memang muat.

## Keputusan kontrak

Sembilan keputusan yang mengikat lingkup ini. Amandemen dokumennya dikerjakan
pada langkah dokumen-dan-rilis di plan, bukan dicicil.

**K1 — Seam diambil dari permukaan de-facto, dalam satu commit tanpa perubahan
perilaku.** Preseden K3 `done/driver-v04/spec.md`: interface dinamai dari apa
yang benar-benar dipakai, bukan dari bentuk aspirasional. Untuk `Channel` itu
berarti 12 method di atas, bukan `onMessage`/`onChoice`/`send` di
`docs/api.md:153-155`. `Telegram` sudah memenuhi hampir seluruhnya; yang berubah
adalah nama dan bentuk argumen, dan `MessageRef` netral menggantikan
`TelegramMessage` sebagai nilai balik pengiriman. Commit pertama wave ini
mengganti tipe dan tidak mengganti perilaku; buktinya seluruh test lama lulus
tanpa satu assertion pun diubah.

**K2 — Loop update tetap async generator.** `telegram.ts:199-216` menghasilkan
update lewat generator dan gateway menggerakkannya dengan satu baris
(`gateway.ts:186`). `docs/api.md:153-154` menjanjikan pendaftaran callback
`onMessage`/`onChoice`; memakainya berarti menulis ulang `:186` beserta
`dispatch`. Discord mendorong (WebSocket), Telegram menarik (long-poll), dan
menjembatani dorongan ke generator adalah beberapa baris antrean di dalam
adapter. Generator menang karena diff-nya lebih kecil; `docs/design.md` dan
`docs/api.md` diamendemen mengikuti kode.

**K3 — `caps` berisi tiga field, karena tiga itulah yang punya pembaca.**
`{ threads, buttons, maxChars }`.

| Cap | Pembaca hari ini |
|---|---|
| `threads` | `topicsAvailable()` `gateway.ts:577-582`, dipakai `createSession` `:592` |
| `buttons` | kartu approval `:1014-1036` dan pemilih workspace `:339-352`; FR-CHAN-02 (`docs/frd.md:37`) mensyaratkan izin **ditolak** bila channel tidak punya callback pilihan |
| `maxChars` | `output.slice(-3500)` `:698` — sebuah angka Telegram yang hari ini tinggal di core |

Delapan caps di `docs/design.md:294` dan `docs/api.md:147-150` adalah wishlist:
`edit`, `files`, `typing`, `rich`, dan `ephemeral` tidak punya satu pun pembaca.
Mendeklarasikan caps yang tidak dibaca melanggar kalimat `docs/api.md:166`
sendiri, yang mensyaratkan deklarasi jujur. Ketiganya dikirim, lima sisanya
ditandai rencana di dokumen.

`maxChars` layak masuk karena arah pemotongannya penting. Batas Discord 2.000
karakter (`docs/ui-ux.md:165`); tiap adapter juga memotong sendiri, dan arahnya
berbeda per method (`src/channels/telegram.ts:221` menyisakan kepala, `:256`
menyisakan ekor). Buffer progres adalah keluaran yang terus tumbuh: yang ingin
dibaca operator adalah baris terakhir. Kalau core mengirim 3.500 karakter ke
channel berbatas 2.000 dan adapter menyisakan 2.000 karakter pertamanya, yang
hilang justru bagian terbaru. Karena itu core memotong lebih dulu, menyisakan
**ekor** sepanjang `caps.maxChars` dikurangi header, dan angka Telegram keluar
dari core.

**K4 — Satu Gateway memegang daftar channel, bukan satu proses per channel.**
Antrean dan slot run dikunci per slug workspace (`gateway.ts:90`, FR-SESS-04
`docs/frd.md:72`). Dua Gateway di satu proses berarti dua peta antrean, dan dua
run bisa berjalan bersamaan di satu workspace. Karena itu `channels` adalah
daftar tak-kosong pada satu Gateway. Allowlist pengirim dan chat berbeda per
channel (id Telegram tidak berarti apa-apa di Discord), jadi keduanya disimpan di
satu peta yang **dikunci** oleh `channel.id`. Hard rule 1 melarang perilaku
bersyarat atas `channel.id`, bukan pemakaiannya sebagai identitas: kunci peta dan
prefiks rute tersimpan tetap sah, `if (channel.id === "discord")` tidak. Gerbang
mekanisnya ada di AC-1.5.

**K5 — Discord memakai `fetch` bawaan dan `WebSocket` global, bukan
`discord.js`.** `docs/techstack.md:59` memilih `discord.js`, dan tabel ukuran
`:132` menaksirnya ~5 MB. Empat alasan menolaknya, semuanya lahir dari kode yang
sudah ada:

- Preseden Telegram adalah `fetch` polos: 302 baris menangani long-poll, 429
  `retry_after`, topic, hasil kaya, edit progres, dan callback tanpa framework
  (`docs/techstack.md:56`). REST Discord adalah HTTP JSON yang sama.
- Permukaan yang dipakai kecil: satu WebSocket dan sekitar sepuluh endpoint REST.
  `discord.js` membawa cache entitas, sharding, voice, dan builder yang tak satu
  pun dibaca gateway.
- Dependensi runtime hari ini **empat** (`package.json`); batasnya 25
  (`docs/techstack.md:123`) dan target terpasang < 15 MB (NFR-05). Menambah nol
  menjaga keduanya tanpa argumen.
- `docs/techstack.md:138` menjanjikan channel dimuat malas. Hari ini tidak ada
  yang dimuat malas karena hanya ada satu channel. Dengan adapter `fetch`, janji
  itu menjadi satu `await import()` yang hanya berjalan bila blok `discord:` ada
  di config, dan klaim di dokumen berhenti menjadi aspirasi.

Node ≥ 22 adalah engine terkunci (`package.json`), dan `WebSocket` global
tersedia di sana. `docs/techstack.md:59` dan `:132` diamendemen dengan alasan
ini, tidak diam-diam.

**K6 — Text channel dengan thread, bukan forum channel.** Riset menyebut
keduanya tanpa memilih (`docs/research/sesi-topic-thread-telegram-discord.md:60`,
`:80`). Text channel dipilih karena memetakan satu-lawan-satu ke model yang sudah
jalan: channel induk = permukaan kontrol = topic General
(`docs/session-model.md:135`), thread = sesi. Forum channel mewajibkan judul dan
tag per post dan tidak menyisakan channel induk sebagai tempat perintah global
dijawab. Dukungan forum channel tidak dikerjakan.

**K7 — Deteksi kemampuan adalah tangkapan error, bukan probe-and-delete.**
`docs/design.md:319` mewajibkan `detect()` membuat satu thread uji lalu
menghapusnya. Bentuk itu lahir dari perilaku Telegram, yang **gagal diam-diam**
saat forum mode mati. Discord melempar error saat batas atau izin tidak
terpenuhi (riset `:106`), jadi percobaan nyata yang pertama sudah menjadi
deteksinya, dan thread uji hanya menambah satu thread ke batas yang justru
sedang diuji. Hasilnya disimpan per container di tabel `meta`
(preseden `ws.last.<chatId>` `gateway.ts:298`, tanpa tabel baru) dan dihapus oleh
`doctor` supaya deteksi diulang. `docs/design.md` §11 diamendemen.

**K8 — Approval diangkut apa adanya; dua perilaku Discord ditambahkan di
sekitarnya.** Payload `${prefix}:${id}:${a|r}:${sig16}`
(`src/core/security.ts:45-52`) berukuran 33 karakter terukur (`c:` 2 + id 12 +
`:a:` 3 + tanda tangan 16). Batas `callback_data` Telegram 64 ada di dokumen
(T13 `docs/security.md:48`, FR-APPR-04d `docs/frd.md:140`) dan 33 lolos dengan
lapang. Batas `custom_id` Discord tidak ada di `docs/` repo ini dan tidak bisa
diukur di mesin tanpa kredensial; ia dibaca dari referensi API Discord saat
adapter ditulis, dan yang diikat AC-6.1 adalah panjang payload yang kita
kendalikan, bukan angka platform yang tidak kita punya buktinya.

`verifyApprovalCallback` (`:54-71`) dan gerbang sekali-pakai `resolveApproval`
(`src/store/db.ts:348-364`) netral terhadap channel dan tidak disentuh.

Yang ditambahkan hanya dua, keduanya di adapter:

- **Ack tertunda sebelum kerja DB.** Discord menutup jendela balasan awal sebuah
  interaksi setelah beberapa detik. Angkanya tidak ada di `docs/` repo ini, jadi
  ia menjadi alasan urutannya dan bukan nilai yang diuji: AC-6.2 menguji urutan,
  bukan waktu. Hari ini `answerCallback` justru dipanggil paling akhir
  (`gateway.ts:1147`, setelah `pending.finish`), dan urutan itu aman di Telegram.
- **Menonaktifkan komponen di fork yang sama dengan pembersihan keyboard.**
  `gateway.ts:1095-1098` membersihkan keyboard sekali di percabangan callback,
  setelah pemeriksaan allowlist, supaya tidak ada handler yang lupa. Discord
  memakai titik yang sama untuk mengedit pesan dengan komponen `disabled`.

**K9 — Role Discord memetakan ke mode kebijakan, tidak pernah ke otoritas
approval.** FR-AUTH-06 (`docs/frd.md:60`) meminta pemetaan role → mode kebijakan.
FR-APPR-03 (`docs/frd.md:136`) mengunci approval pada principal pemilik sesi, dan
kode menegakkannya di dua tempat (`gateway.ts:1087` allowlist pengirim,
`db.ts:358` `row.principal !== principal`). Tabrakan keduanya diselesaikan ke
satu arah: role tidak pernah menjadi jalan menyetujui. `docs/ui-ux.md:163`
menyebut "button/select + role" sebagai cara merender, bukan cara mengotorisasi.

Tabrakan yang sama muncul ketiga kalinya di `docs/roadmap.md:112`, yang menulis
butir ini sebagai "approval berbasis role". Kalimat itu diperbaiki di PR yang
sama menjadi approval terikat principal dengan role di jalur kebijakan
(AC-12.1), karena membiarkannya berarti dua dokumen menjanjikan dua otoritas
yang berbeda untuk tombol yang sama.

Pemetaan role → mode kebijakan itu sendiri **tidak dibangun di wave ini**, dan
alasannya bukan kekurangan waktu: gerbang mode belum ada di jalur run untuk
channel mana pun. Yang ada hanyalah jendela trust (`store.activeGrant`,
`gateway.ts:975`). `src/config.ts:11-15` sudah menuliskan aturannya — kunci
config yang menjanjikan gerbang keamanan baru boleh ada setelah gerbangnya ada di
jalur run. Membangun `role → read-only` sekarang berarti menjanjikan penolakan
tulis yang tidak akan terjadi.

## Lingkup

1. Seam `Channel` dinamai di `src/core/channel.ts`, diekstrak dari
   `src/channels/telegram.ts`, nol perubahan perilaku (K1, K2).
2. `caps` tiga field dengan pembaca nyata, plus amandemen `docs/design.md` dan
   `docs/api.md` (K3).
3. Gateway menerima daftar channel; allowlist dan operator per channel (K4).
4. `src/channels/discord.ts` di atas `fetch` + `WebSocket` global: identify tanpa
   intent privileged, application command, interaksi tombol, REST pesan dan
   thread, pemecahan pesan pada batas channel, reconnect, penghormatan 429 (K5).
5. Thread sebagai sesi: glif state di nama, `auto_archive_duration: 10080`,
   `archived: true` saat selesai, batas ±50/1.000 terdeteksi sebagai error (K6).
6. Deteksi kemampuan lewat tangkapan error, disimpan di `meta`, disegarkan
   `doctor`, jatuh ke mode linear (K7).
7. Approval diangkut tanpa perubahan primitif, ditambah ack tertunda dan
   penonaktifan komponen (K8).
8. Pengungkapan: apa yang tidak sampai karena intent tidak privileged, dan apa
   yang terbaca setiap anggota saat sebuah guild channel dipasangkan.
9. Config `discord:` opsional, `caraka init discord`, `CARAKA_DISCORD_TOKEN`,
   berkas token 0600, pemeriksaan `doctor`.
10. Penutupan dua kebocoran rahasia di Latar.
11. Amandemen dokumen dan ADR, CHANGELOG yang menyebut batas verifikasinya.

## Yang tidak dikerjakan

- **Role sebagai otoritas approval.** Sebuah role tidak pernah memberi otoritas
  approval. Approval tetap terikat principal pemilik sesi, apa pun role penekan
  tombolnya (K9).
- **Pemetaan role → mode kebijakan** (FR-AUTH-06, P1). Gerbang mode belum ada di
  jalur run untuk channel mana pun; pemetaan menyusul bersama gerbangnya, dan
  status itu dicatat di `docs/security.md` §5.
- **Mode `read-only` untuk guild** (`docs/security.md:125`). Baris tabel itu
  belum terbangun untuk grup Telegram maupun guild Discord. Yang benar-benar
  membatasi guild hari ini adalah pairing dari DM operator ditambah allowlist
  pengirim, dan itulah yang dinyatakan — bukan sebuah mode yang belum ada.
- **`discord.js`** (K5).
- **Forum channel** (K6).
- **Smoke Discord hidup.** Mesin ini tidak memegang kredensial Discord. Bukti
  turun ke unit dan e2e dengan gateway serta REST ter-mock, mengikuti preseden
  "printed untested" 0.2.0 dan matriks CI 0.4.0. CHANGELOG menyebutnya apa
  adanya.
- **Rekrutmen 20 developer beta dan setiap gerbang manusia** — validasi
  pasca-rilis per keputusan pemilik 8 Agustus 2026 (`spec/v10.md`), dicatat di
  `docs/roadmap.md`.
- **Instrumentasi beta opt-in** (butir keempat Fase 5) — pekerjaan sendiri;
  datanya sudah ada di audit dan yang kurang adalah laporannya.
- **Dashboard htmx** — spec terpisah.
- **Lampiran masuk dan keluar** (FR-CHAN-04, FR-CHAN-05), **indikator mengetik**
  (FR-CHAN-08), **embed** (`docs/ui-ux.md:162`). Tidak ada satu pun yang
  terbangun di Telegram; membangunnya khusus untuk Discord akan membuat dua
  channel berbeda kemampuan tanpa pembaca caps.
- **Ephemeral sebagai kontrol keamanan.** Boleh dipakai untuk kerapian, tidak
  pernah diklaim sebagai kontrol (`docs/security.md:64`).
- **Kolom `channel` di `sessions`.** Lihat AC-10.4: id chat ber-namespace,
  dicatat sebagai plafon yang disengaja.
- **`npm publish`** — menunggu pemilik (`spec/v10.md`).

Dua hal ditambahkan ke daftar ini saat penutupan, 8 Agustus 2026, karena wave
ditutup tanpa keduanya dan sebuah spec yang diam soal itu akan terbaca seperti
keduanya ada:

- **`caraka init discord` (lingkup butir 9, AC-10.6).** Tidak dibangun. Blok
  `discord:` ditulis tangan hari ini; `saveConfig` tetap menulis berkas tokennya
  lewat `atomicSecret` pada mode 0600, jadi AC-9.5 dan AC-9.6 lulus dan yang
  hilang adalah wizard-nya, bukan penanganan rahasianya. Sisa lingkup butir 9
  lulus. Alasannya urutan, bukan keputusan: wizard adalah satu-satunya langkah
  yang tidak bisa diuji tanpa kredensial Discord, dan pekerjaan itu berdiri
  sendiri di atas seam yang sudah mendarat.
- **Sapuan README, README.id, dan llms.txt (AC-12.1).** Ketiganya masih ditulis
  ke permukaan v0.2 dan sudah begitu sejak sebelum wave ini — 0.3.0 dan 0.4.0
  rilis tanpa menyentuhnya. Yang disentuh di sini hanya satu baris di kedua
  README, klaim "opens **no listening port**" yang dasbor membuatnya salah.
  Sisanya adalah sapuan versi yang berdiri sendiri sebagai concern
  (`AGENTS.md:79`). **AC-12.1 karena itu lulus sebagian**, dan dicatat begitu di
  plan alih-alih diklaim penuh.

## Acceptance criteria

Angka yang muncul di bawah punya sumber di `docs/` atau diberi keterangan
asalnya. Angka rate limit Discord tidak ada di `docs/` dan karena itu tidak
ditulis di satu pun AC; yang diuji adalah mekanismenya (AC-3.3).

### AC-1 · Seam `Channel`, nol perubahan perilaku

- **AC-1.1** Gateway shall menerima objek apa pun yang memenuhi interface
  `Channel` milik `src/core` pada parameter channel konstruktornya
  (hari ini bertipe `Telegram`, `src/core/gateway.ts:104`).
- **AC-1.2** WHEN commit yang menamai seam diuji dengan `npm test` dan
  `npm run e2e`, seluruh test yang sudah ada shall lulus tanpa satu assertion
  pun diubah.
- **AC-1.3** `src/core/` shall tidak memuat import dari `src/channels/`
  (hari ini `src/core/gateway.ts:5-10`).
- **AC-1.4** Gateway shall menerima update lewat async generator yang di-`for
  await` (bentuk hari ini `src/core/gateway.ts:186`), bukan lewat pendaftaran
  callback.
- **AC-1.5** `src/core/` shall tidak memuat perbandingan atau `switch` atas
  `channel.id` maupun literal `"telegram"`/`"discord"`, dibuktikan dengan grep
  yang gagal bila ada (`AGENTS.md:53`).
- **AC-1.6** Gateway shall menerima daftar channel tak-kosong dan menjalankan
  paling banyak satu run aktif per workspace lintas seluruh channel di daftar
  itu (FR-SESS-04 `docs/frd.md:72`).
- **AC-1.7** WHEN sebuah channel di daftar melempar error saat start, THEN
  gateway shall melaporkan channel mana yang gagal dan tidak menjalankan satu
  pun channel lain dalam keadaan setengah hidup.

### AC-2 · Caps yang punya pembaca

- **AC-2.1** `caps` shall memuat tepat `threads`, `buttons`, dan `maxChars`, dan
  setiap field shall punya minimal satu pembaca di `src/core/` (K3).
- **AC-2.2** WHERE `caps.threads` bernilai true pada container sebuah sesi,
  gateway shall menempatkan sesi itu di thread-nya sendiri.
- **AC-2.3** WHERE `caps.threads` bernilai false, gateway shall menjalankan mode
  linear dan mengawali setiap balasan dengan header `[ws · #id]`
  (`docs/session-model.md:168`; bentuk header hari ini
  `src/core/gateway.ts:622-626`).
- **AC-2.4** WHERE `caps.buttons` bernilai true, gateway shall mengirim kartu
  approval berikut tombolnya.
- **AC-2.5** WHERE `caps.buttons` bernilai false, gateway shall menolak
  permintaan izin tanpa mengirim kartu dan mencatat penolakan itu di audit
  (FR-CHAN-02 `docs/frd.md:37`: approval tidak pernah berpindah ke teks chat).
  Wave ini tidak punya channel produksi tanpa tombol, jadi pembuktiannya memakai
  channel palsu di test.
- **AC-2.6** Panjang potongan ekor buffer progres shall dihitung dari
  `caps.maxChars` channel sesi itu (menggantikan konstanta 3.500 di
  `src/core/gateway.ts:698`).
- **AC-2.7** `caps.maxChars` channel Discord shall bernilai 2.000
  (`docs/ui-ux.md:165`).
- **AC-2.8** `docs/design.md` §2.2 dan §11 serta `docs/api.md` §4 shall menyebut
  tiga caps sebagai kontrak, dan menandai `edit`, `files`, `typing`, `rich`, dan
  `ephemeral` sebagai rencana tanpa pembaca.

### AC-3 · Channel Discord tanpa dependensi baru

- **AC-3.1** WHEN wave ini ditutup, `dependencies` di `package.json` shall tetap
  berisi empat paket (batas 25 `docs/techstack.md:123`).
- **AC-3.2** Channel Discord shall memanggil REST lewat `fetch` bawaan dan
  membuka gateway lewat `WebSocket` global Node (engine terkunci `node >= 22`).
- **AC-3.3** IF Discord menjawab sebuah panggilan REST dengan 429, THEN channel
  shall menunggu selama `retry_after` yang disebut respons itu lalu mengulang
  panggilan yang sama (mekanisme yang sama dengan
  `src/channels/telegram.ts:155-157`; tidak ada angka batas yang ditulis di
  dokumen ini).
- **AC-3.4** IF koneksi gateway tertutup dengan kode yang bisa pulih, THEN
  channel shall menyambung ulang dengan jeda yang menaik dan mencatat satu baris
  audit, tanpa menghentikan proses (FR-CHAN-12 `docs/frd.md:47`).
- **AC-3.5** WHERE blok `discord:` ada di config, `caraka start` shall memuat
  modul Discord.
- **AC-3.6** WHERE blok `discord:` tidak ada, `caraka start` shall tidak memuat
  modul Discord sama sekali (`docs/techstack.md:138`).
- **AC-3.7** WHEN sebuah hasil melebihi `caps.maxChars`, channel shall
  memecahnya tanpa memotong code block di tengah (FR-CHAN-06
  `docs/frd.md:41`; aturan keras `docs/ui-ux.md:168`). Sanitizer per channel
  yang diminta FR-CHAN-07 (`docs/frd.md:42`) terpenuhi tanpa lapisan escape:
  markdown agent dikirim apa adanya, seperti `sendResult`
  (`src/channels/telegram.ts:234-250`) mengirimnya hari ini, dan Discord
  membaca markdown yang sama.
- **AC-3.8** IF sebuah heartbeat lewat tanpa op 11 dari Discord sebelum
  heartbeat berikutnya jatuh tempo, THEN channel shall menutup socket dengan
  kode selain 1000 alih-alih berdetak lagi. Socket setengah terbuka — laptop
  yang tidur, NAT yang menganggur — tidak pernah mengirim FIN, jadi tanpa ini
  `close` tak pernah terpicu dan AC-3.4 tak pernah tercapai.
- **AC-3.9** IF gateway tertutup dengan 4004 atau 4010-4014, THEN channel shall
  berhenti tanpa menjadwalkan sambungan ulang, menulis satu baris audit yang
  memuat kodenya, dan melempar error bernama dari `updates()` sehingga
  `Gateway.run()` menyebut channel yang gagal. Kredensial yang ditolak platform
  tidak dijawab oleh percobaan ulang; Telegram memperlakukan 401 dan 409 sama
  (`src/channels/telegram.ts:176-180`).

### AC-4 · Thread sebagai sesi

- **AC-4.1** WHEN sesi baru dibuat pada container Discord yang mendukung thread,
  channel shall membuat public thread dengan `auto_archive_duration: 10080`
  (FR-TOPIC-10 `docs/frd.md:94`; `docs/design.md:327`).
- **AC-4.2** Nama thread shall berupa glif state diikuti judul sesi, dipotong
  pada 100 karakter (batas nama dari riset
  `docs/research/sesi-topic-thread-telegram-discord.md:72`).
- **AC-4.3** WHEN state sebuah sesi berubah, nama thread shall memakai glif yang
  sama dengan Telegram (`▸ ⏸ ✓ ✗ ⊘`, `src/core/gateway.ts:757-763`; FR-TOPIC-04
  `docs/frd.md:88`; hard rule 7 `AGENTS.md:59`). Nama adalah satu-satunya kanal
  status yang dimiliki Discord (riset `:94`).
- **AC-4.4** WHERE sebuah channel menyediakan pengarsipan thread, WHEN sesi
  selesai, gagal, atau dibatalkan, channel shall mengirim ringkasan penutup lebih
  dulu lalu menyetel `archived: true` (`docs/session-model.md:120`, `:137`).
- **AC-4.5** WHERE sebuah channel tidak menyediakan pengarsipan, penandaan
  selesai shall berhenti pada penggantian nama (perilaku Telegram hari ini,
  `src/core/gateway.ts:765-773`; FR-TOPIC-05 `docs/frd.md:89` melarang menutup
  atau menghapus topic DM).
- **AC-4.6** Channel shall tidak menyapu thread lama sebelum membuat yang baru.
  Batas ±50 per container dan 1.000 per guild (`docs/session-model.md:138`, riset
  `:70-71`) terdeteksi sebagai error yang dilempar pembuatan thread, ditangani
  AC-5.1. Ini mengganti sweep yang direncanakan versi pertama spec ini: AC-4.4
  sudah mengarsipkan thread sesi begitu sesi itu selesai, jadi satu-satunya
  thread yang tersisa untuk disapu adalah milik sesi yang masih hidup.
- **AC-4.7** Pengarsipan pada AC-4.4 shall tidak diklaim membebaskan kuota:
  thread yang ditandai `archived` tetap dihitung ke batas thread aktif (riset
  `:73`, diskusi Discord #6703 `:75`). Itulah separuh kedua alasan AC-4.6 tidak
  menyapu — sapuan yang berhasil pun tidak membeli ruang untuk thread berikutnya.

### AC-5 · Deteksi kemampuan lewat tangkapan error

- **AC-5.1** IF pembuatan thread pada sebuah container melempar error, THEN
  gateway shall menyimpan bahwa container itu tidak mendukung thread dan
  melanjutkan run yang sedang berjalan dalam mode linear, tanpa gagal keras
  (`docs/session-model.md:163-172`; FR-TOPIC-09 `docs/frd.md:93`).
- **AC-5.2** WHEN ketidaktersediaan thread pertama kali disimpan untuk sebuah
  container, gateway shall memberi tahu operator satu kali, dengan langkah
  perbaikan yang tepat untuk penyebabnya.
- **AC-5.3** WHILE penanda itu tersimpan, gateway shall tidak mencoba membuat
  thread lagi di container tersebut.
- **AC-5.4** WHEN `caraka doctor` dijalankan, ia shall menghapus penanda itu
  sehingga percobaan berikutnya mendeteksi ulang (`docs/session-model.md:171`).
- **AC-5.5** Channel Discord shall tidak membuat lalu menghapus thread uji
  (`detect()` gaya `docs/design.md:319` tidak dipakai di jalur Discord; K7).
- **AC-5.6** Penanda pada AC-5.1 shall disimpan di tabel `meta` yang sudah ada
  (`src/store/db.ts:112-115`), tanpa tabel atau migrasi baru.

### AC-6 · Approval di Discord

- **AC-6.1** Payload callback approval shall tetap
  `${prefix}:${id}:${a|r}:${sig16}` (`src/core/security.ts:45-52`) dan shall
  berukuran 33 karakter, dikirim sebagai `custom_id` tanpa dipotong,
  ditandatangani, dan diubah bentuknya. Batas platform yang berlaku dicatat di
  K8; yang diuji adalah panjang yang kita hasilkan sendiri.
- **AC-6.2** WHEN sebuah interaksi tombol Discord tiba, channel shall mengirim
  ack tertunda sebelum core menyentuh basis data (urutan hari ini terbalik:
  `answerCallback` terakhir, `src/core/gateway.ts:1147`).
- **AC-6.3** WHEN penekan tombol lolos allowlist pengirim, gateway shall
  menonaktifkan komponen kartu itu pada titik yang sama dengan pembersihan
  keyboard Telegram (`src/core/gateway.ts:1095-1098`), sebelum jalur trust,
  pairing, dan approval bercabang.
- **AC-6.4** WHEN callback approval yang sah ditekan dua kali, penekanan kedua
  shall ditolak (`resolveApproval` `src/store/db.ts:348-364`), dan perilaku ini
  shall diuji lewat jalur Discord, bukan hanya jalur Telegram.
- **AC-6.5** IF penekan tombol berada di luar allowlist pengirim, THEN gateway
  shall menolak penekanan itu dan mencatat audit, apa pun role Discord yang ia
  punya (`src/core/gateway.ts:1087`; FR-APPR-03 `docs/frd.md:136`).
- **AC-6.6** Jalur approval shall tidak membaca role Discord sama sekali,
  dibuktikan dengan grep yang gagal bila ada rujukan role di dalamnya (K9).
- **AC-6.7** Kartu approval Discord shall memuat nama opsi yang dikirim agent
  sebagai teks tombol, sama seperti Telegram (`src/core/gateway.ts:1021-1030`).

### AC-7 · Intent tanpa privilege

- **AC-7.1** Channel Discord shall melakukan identify tanpa meminta intent
  `MESSAGE_CONTENT`.
- **AC-7.2** Sebuah tugas shall dapat dikirim lewat application command, dan
  channel shall menyusunnya menjadi teks yang dibaca parser perintah core apa
  adanya (`src/core/gateway.ts:249-250`).
- **AC-7.3** Perintah yang sudah ada di `gatewayCommands`
  (`src/channels/telegram.ts:55-69`) shall didaftarkan sebagai application
  command tanpa penambahan perintah baru di core.
- **AC-7.4** WHERE isi sebuah pesan biasa sampai ke bot, channel shall
  memperlakukannya sebagai teks tugas seperti Telegram.
- **AC-7.5** WHERE isi pesan biasa tidak sampai, channel shall mengabaikan pesan
  itu tanpa error dan tanpa balasan.
- **AC-7.6** Pengungkapan kesiapan yang dibaca operator shall menyebut bahwa isi
  pesan biasa tidak sampai ke bot dan menyebut jalan yang sampai, mengikuti
  bentuk pengungkapan privacy mode Telegram (`src/i18n.ts:75-76`).
- **AC-7.7** Teks pengungkapan itu shall berasal dari channel, bukan dipilih core
  berdasarkan identitas channel (AC-1.5).

### AC-8 · Pairing dan pengungkapan guild

- **AC-8.1** WHEN Caraka menemui sebuah guild channel yang belum ada di allowlist
  chat, pairing shall dikonfirmasi di DM operator, bukan di channel itu
  (perilaku Telegram hari ini `src/core/gateway.ts:1262-1303`).
- **AC-8.2** Kalimat pengungkapan shall tampil di kartu pairing sebelum channel
  ditulis ke allowlist, dengan kata-kata Discord, dan shall menyebut bahwa kartu
  approval, path berkas, diff, dan keluaran perintah terbaca setiap anggota yang
  bisa melihat channel itu (`docs/security.md:41`, `:64`, `:88-91`).
- **AC-8.3** IF pemasang bot bukan principal di allowlist pengirim, THEN tidak
  ada kartu pairing yang dikirim (`src/core/gateway.ts:1280`).
- **AC-8.4** `docs/security.md` shall mencatat bahwa baris `grup (default)
  read-only` pada tabel §5 belum terbangun untuk channel mana pun, alih-alih
  membiarkannya terbaca sebagai kontrol yang berjalan.
- **AC-8.5** IF anggota guild yang bukan principal di allowlist pengirim memicu
  penawaran pairing sebuah channel, THEN penawaran untuk anggota lain di channel
  yang sama shall tetap tersedia. Peristiwa keanggotaan Discord disintesis dari
  hal pertama yang terjadi di sebuah channel, dan AC-8.3 membuang peristiwa itu
  saat pelakunya bukan principal; sekali-pakai per container berarti satu orang
  asing bisa membungkam penawaran yang dibutuhkan operator sampai proses
  dijalankan ulang.

### AC-9 · Dua kebocoran

- **AC-9.1** Env yang diwariskan ke proses agent shall tidak memuat satu pun
  variabel berawalan `CARAKA_` (hari ini hanya `CARAKA_TELEGRAM_TOKEN` yang
  dihapus, `src/drivers/claude-acp.ts:11-15`), sehingga token channel yang
  ditambahkan kelak tidak bocor lagi lewat lubang yang sama.
- **AC-9.2** WHEN scrubber memproses teks yang memuat token bot Discord, ia shall
  menggantinya dengan `[REDACTED]`, termasuk saat token itu tidak pernah
  di-seed sebagai rahasia exact (`src/core/security.ts:3-15`).
- **AC-9.3** WHEN scrubber memproses kalimat biasa yang memuat titik, nama
  berkas, atau versi semver, ia shall membiarkannya utuh.
- **AC-9.4** Token Discord yang dimuat proses shall di-seed sebagai rahasia exact
  ke scrubber (`src/cli.ts:446`).
- **AC-9.5** Berkas token Discord shall ditulis dengan mode 0600 lewat
  `atomicSecret` (`src/config.ts:85-90`), dan `caraka doctor` shall memeriksa
  modenya seperti berkas rahasia lain (baris "Token mode" `src/cli.ts:371`).
- **AC-9.6** Token Discord shall tidak pernah ditulis ke `config.yaml`
  (`docs/security.md:200`).

### AC-10 · Config dan identitas sesi

- **AC-10.1** Config shall menerima blok `discord:` opsional secara aditif dengan
  `version` tetap `1` (preseden `workspaces[]`, `src/config.ts:36`).
- **AC-10.2** IF tidak ada satu pun channel terkonfigurasi, THEN `caraka start`
  shall berhenti dengan pesan yang menyebut cara memperbaikinya.
- **AC-10.3** IF sebuah channel terkonfigurasi punya `allowFrom` kosong, THEN
  `caraka start` shall berhenti dan menyebut channel mana (FR-SETUP-05
  `docs/frd.md:23`).
- **AC-10.4** Sesi Discord shall disimpan dengan `chat_id` ber-namespace
  `discord:<id>` pada skema `sessions` yang ada
  (`src/store/db.ts:58-71`), tanpa migrasi. Plafon yang disengaja: tidak ada
  kolom yang bisa difilter per channel, jadi laporan "seluruh sesi Discord"
  butuh pencocokan prefiks. Kolom `channel` (`docs/erd.md:142`) dibangun saat ada
  pembaca pertama yang benar-benar memfilter atau mengelompokkan per channel;
  plafon ini dicatat sebagai komentar `ponytail:` di titik penulisannya.
- **AC-10.5** WHEN store dibuka pada basis data v0.4, seluruh sesi Telegram yang
  ada shall tetap terbaca dan terute seperti sebelumnya.
- **AC-10.6** WHEN `caraka init discord` dijalankan, ia shall memverifikasi token
  ke Discord sebelum menulis apa pun, dan menolak token yang ditolak dengan pesan
  yang menyebut langkah berikutnya (preseden `src/cli.ts:249-255`).

### AC-11 · Ephemeral

- **AC-11.1** Kartu approval shall tidak pernah dikirim sebagai pesan ephemeral
  (`docs/security.md:64`; FR-APPR-04c `docs/frd.md:139`).
- **AC-11.2** WHERE ephemeral dipakai untuk kerapian, ia shall terbatas pada
  balasan interaksi yang tidak membawa keputusan, dan dokumen shall tidak
  menyebutnya kontrol.
- **AC-11.3** WHERE ephemeral tidak tersedia, gateway shall berperilaku sama
  persis dengan saat ia tersedia, karena tidak ada jalur yang bergantung
  padanya.

### AC-12 · Dokumen dan rilis

- **AC-12.1** Dokumen berikut shall diperbarui pada PR yang sama:
  `docs/roadmap.md:108` dan `:112` (butir Fase 5 berhenti menulis "approval
  berbasis role", K9); `docs/frd.md:34`, `:37`, `:45`, `:60`, `:94`;
  `docs/design.md:74-89`, `:291-327`; `docs/api.md:143-169`;
  `docs/session-model.md:129-141`, `:163-172`; `docs/security.md:41`, `:64`,
  `:125`, `:200`, `:246`; `docs/ui-ux.md:158-166`; `docs/erd.md:46`, `:142`;
  `docs/techstack.md:59`, `:132`, `:135`; `docs/faq.md:54`;
  `AGENTS.md:27` (peta `src/channels/` adalah berkas datar, bukan direktori);
  README, README.id, llms.txt, CHANGELOG, kedua katalog `src/i18n.ts`.
- **AC-12.2** ADR baru shall menggantikan kalimat "Telegram menjadi satu-satunya
  channel di v1.0" (`docs/adr/0006-telegram-sebagai-channel-pertama.md:13`),
  atau kalimat itu shall diberi amandemen bertanggal di tempatnya (preseden
  `docs/adr/0004-approval-hanya-lewat-callback.md:15`).
- **AC-12.3** CHANGELOG 0.5.0 shall menyebut bahwa jalur Discord tidak pernah
  dijalankan terhadap Discord yang sesungguhnya di mesin ini, dan bukti apa yang
  menggantikannya.
- **AC-12.4** WHEN wave ditutup, plan shall memuat LOC `src/` hasil `wc -l`
  dengan total di bawah 8.000 baris (anggaran `AGENTS.md:19`; dasar terukur pada
  `9494ec5`: 4.290).
- **AC-12.5** IF persetujuan pemilik belum ada, THEN tidak ada `npm publish` yang
  dijalankan (`spec/v10.md`).
