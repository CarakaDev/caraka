# Spec — berkas-keluar: agent mengirim gambar dan dokumen ke Telegram, Discord, dan WhatsApp

**Status:** rencana · **Tanggal:** 10 September 2026

## Latar

Hari ini agent bisa menaruh gambar di chat hanya pada satu jalur yang sempit.
`Gateway.imagesOf` (`src/core/gateway.ts:1673`) mengangkat blok konten `image`
dari notifikasi ACP, mendekode base64-nya, lalu `Gateway.sendImage`
(`:1703`) menyerahkannya ke `Channel.sendImage?` (`src/core/channel.ts:410`).
Yang mengimplementasikan method itu dua: Telegram (`src/channels/telegram.ts:434`)
dan Discord (`src/channels/discord.ts:317`).

Yang tertinggal dari jalur sesempit itu bisa dihitung. Agent di rute CLI tidak
pernah menghasilkan blok konten, jadi ia tidak pernah mengirim gambar. Dokumen
tidak punya jalur sama sekali, di rute mana pun. WhatsApp tidak menerima media
apa pun, dan `gateway.ts:1708` menjawabnya dengan `attach.outUnsupported`.

Pemilik meminta satu hal: Caraka mengirim dokumen dan gambar keluar, di ketiga
channel.

### Kenapa arahnya direktori, dan kenapa itu bukan `MEDIA:<path>`

`docs/frd.md:42` (FR-CHAN-05) mencabut konvensi `MEDIA:<path-atau-url>` pada 15
Agustus 2026, dan `docs/api.md:94` mencabutnya dengan kalimat yang sama:
mengangkat path dari teks agent berarti membaca berkas atas perintah masukan yang
model ancaman proyek ini sendiri sebut tidak tepercaya (`docs/security.md` §2).
Pekerjaan ini tidak mengembalikannya dalam bentuk apa pun.

Yang dibangun bentuknya berbeda pada satu titik yang menentukan: **tidak ada path
yang diangkat dari prosa agent, dan core membaca satu direktori tetap yang ia
buat sendiri.** Core membuat `<workspace>/.caraka-keluar/<run>/` sebelum run
mulai, menyebut nama direktori itu kepada agent di blok berlabel yang sama yang
sudah dipakai lampiran masuk (`gateway.ts:1344`), lalu sesudah turn agent
berakhir ia membaca isi direktori itu dengan `readdir` dan mengirim apa yang ia
temukan. Nama berkas datang dari `readdir`, jenisnya dari tabel milik core, dan
tempatnya sudah diputuskan sebelum agent menulis satu karakter.

Yang berubah karena itu luas wewenangnya. `MEDIA:<path>` membuat setiap path di
mesin ini bisa dinamai oleh teks. Bentuk ini membuat berkas yang agent tulis
sendiri di satu direktori bisa keluar, dan itu saja.

Direktori itu ada **di dalam workspace**, bukan di bawah `~/.caraka` seperti
inbox (`src/config.ts:263`), dan alasannya jalur CLI. `presets/agents/claude-code.yaml:14`
mencatat bahwa Read dilaporkan menjawab EPERM untuk path di luar direktori proyek
dan `additionalDirectories` dilaporkan tidak menutupnya
([anthropics/claude-code#29013](https://github.com/anthropics/claude-code/issues/29013)).
Tool tulis ada di batas yang sama. Direktori di bawah `~/.caraka` karena itu akan
menjadi direktori yang tidak bisa ditulis agent di rute yang paling banyak
dipakai, jadi jalur keluar akan lahir mati di sana persis seperti jalur masuk
lahir mati di sana.

Namanya `.caraka-keluar` dan bukan `.caraka/keluar`, karena sebuah workspace boleh
berupa direktori home dan `<home>/.caraka` adalah direktori yang memuat
`caraka.db` beserta `secrets/`.

### Sisi channel: satu method, satu panggilan, mime yang memilih

`sendImage?` menjadi `sendAttachment?`, sebentuk dengan `fetchAttachment?`
(`src/core/channel.ts:378`) yang sudah menjadi pasangannya di jalur masuk. Ia
menerima `{ bytes, mimeType, name }` yang sama seperti sekarang, jadi jalur blok
konten ACP tidak berubah selain nama yang dipanggilnya.

Yang memilih `sendPhoto`, `sendAnimation`, atau `sendDocument` adalah adapter,
dari mime yang diserahkan kepadanya. Core tidak pernah menyebut nama method
channel dan tidak pernah membandingkan `channel.id` (hard rule 1).

WhatsApp mendapat method itu untuk pertama kali. Kedua transportnya sudah punya
slot `sendFile` (`src/channels/whatsapp.ts:87`), dan hari ini slot itu hanya
membawa markdown ketika hasil melewati `FILE_AFTER_CHUNKS`
(`whatsapp.ts:279`): `cloud-api` mengunggah ke `/<phone>/media` lalu mengirim
`type: "document"` (`:477`), `baileys` mengirim buffer sebagai `document`
(`whatsapp-baileys.ts:292`). Menggeneralisasi dua slot itu dari "satu string
markdown" menjadi "byte dengan mime" adalah sebagian besar pekerjaan ini.

### Angka tiap channel, terhadap dokumentasinya sendiri

**Telegram.** Halaman *Sending files* menyebut batas unggah multipart:
"10 MB max size for photos, 50 MB for other files"
([bots/api#sending-files](https://core.telegram.org/bots/api#sending-files)).
Field `photo` pada `sendPhoto` mengulanginya lebih ketat beserta dua batas
geometri: "The photo must be at most 10 MB in size. The photo's width and height
must not exceed 10000 in total. Width and height ratio must be at most 20."
`sendDocument` dan `sendAnimation` masing-masing berbunyi "Bots can currently send
files of any type of up to 50 MB in size, this limit may be changed in the future"
dan "Bots can currently send animation files of up to 50 MB in size, this limit
may be changed in the future" ([bots/api](https://core.telegram.org/bots/api)).
Caption ketiganya "0-1024 characters after entities parsing", angka yang
`telegram.ts:444` sudah pakai.

**Discord.** "The file upload size limit applies to each file in a request. The
default limit is 20 MiB for all users, but may be higher for users depending on
their Nitro status or by the server's Boost Tier"
([developers/reference](https://docs.discord.com/developers/reference)). Halaman
yang sama menetapkan bentuk kirimnya: "Some endpoints support file attachments,
indicated by the `files[n]` parameter. To add file(s), the standard
application/json body must be replaced by a multipart/form-data body. The JSON
message body can optionally be provided using the `payload_json` parameter."
Bentuk itu sudah terpasang di `discord.ts:286` dan `:317`.

Komentar `channel.ts:406` hari ini menulis "Discord 10 MiB". Angka itu tidak lagi
cocok dengan halaman di atas dan diperbaiki di pekerjaan ini.

**WhatsApp Cloud API.** Tabel *Supported media types* memberi batas per tipe:
`image/jpeg` dan `image/png` 5 MB, `application/pdf` dan `text/plain` 100 MB,
`image/webp` hanya untuk sticker dengan 100 KB statis dan 500 KB animasi, dan
halaman yang sama menyatakan "The maximum supported file size for media messages
on Cloud API is 100MB"
([cloud-api/reference/media](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media)).
`image/gif` tidak ada di satu tabel pun, jadi GIF tidak bisa keluar sebagai
pesan gambar di jalur ini. Caption pesan gambar dan pesan dokumen sama-sama
"Maximum 1024 characters"
([image-messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/image-messages),
[document-messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/document-messages)).

**WhatsApp Baileys.** Bentuk kirimnya ada di versi yang repositori ini pin:
`AnyMediaMessageContent` memuat `image: WAMediaUpload` dengan `caption?`, dan
`document: WAMediaUpload` dengan `mimetype`, `fileName?`, dan `caption?`
([`src/Types/Message.ts` v6.7.22 baris 145-176](https://raw.githubusercontent.com/WhiskeySockets/Baileys/v6.7.22/src/Types/Message.ts)).
Tidak ada dokumen Baileys yang menyebut batas ukuran. Jalur ini karena itu
memakai angka Cloud API di atas sebagai plafon, **spec-set berdasarkan analogi**,
karena kedua transport berakhir di server WhatsApp yang sama. Yang akan
mengukurnya: mengirim berkas dengan ukuran naik bertahap dari perangkat tertaut
sungguhan dan mencatat ukuran pertama yang ditolak.

### Plafon milik core, dan kenapa ia ada satu

Core membaca berkas ke dalam `Buffer` sebelum menyerahkannya ke adapter, jadi ia
butuh satu batas yang bukan angka channel mana pun. Batasnya 20 MiB, angka yang
sama dengan `DOWNLOAD_LIMIT` di jalur masuk (`src/channels/telegram.ts:128`) dan
baris "Ukuran lampiran masuk" di `docs/security.md` §9, supaya §9 tetap memegang
satu angka dan satu kalimat. Ia **spec-set**, dan yang membenarkannya memori
proses; tidak ada dokumen vendor di belakangnya. Ukuran dibaca dengan `stat`
sebelum berkasnya dibuka, jadi berkas yang melewati plafon tidak pernah masuk
memori.

Angka Discord 20 MiB dan plafon ini sama besar, jadi di Discord plafon core-lah
yang berlaku lebih dulu untuk berkas tepat di batas.

## Ruang lingkup

Kontrak dan core: `src/core/channel.ts` (`sendImage?` menjadi `sendAttachment?`
beserta komentarnya), `src/core/gateway.ts` (pembuatan dan penyapuan direktori
keluar di jalur run, nama direktori di blok berlabel `:1344`, pembacaan direktori
sesudah `driver.prompt` kembali, pemanggil di `:1440`, `Gateway.sendImage` di
`:1703` yang menjadi pengirim berkas, dan penyapuan saat gateway mulai di `:357`),
`src/core/security.ts` (tabel mime keluar di sebelah `ATTACHMENT_EXTENSIONS`
`:52`, dan satu pembaca nama berkas sebentuk dengan `attachmentName` `:72`).

Adapter: `src/channels/telegram.ts` (pemilihan `sendPhoto`, `sendAnimation`, dan
`sendDocument`), `src/channels/discord.ts` (nama method dan mime dari argumen),
`src/channels/whatsapp.ts` (`sendAttachment` pada channel, dan slot transport
`sendFile` `:87` yang menjadi berbyte-dan-bermime), `src/channels/whatsapp-baileys.ts`
(bentuk `image` dan `document`).

Kalimat: `src/i18n.ts`, tiga kunci baru di kedua katalog.

Dokumen yang ikut bergerak di commit yang sama: `docs/frd.md` (FR-CHAN-05),
`docs/api.md` (§4 nama method dan §5 paragraf `caps`), `docs/design.md:69`,
`docs/security.md` §9 dan §12, `docs/ui-ux.md` §5, `docs/telegram-integration.md`
baris "Lampiran keluar", `docs/whatsapp-risiko.md`, dan ledger `AGENTS.md`.

Test: `test/unit.test.ts` dan `test/e2e.test.ts`.

## Yang tidak dikerjakan

- **Tidak ada path yang dibaca dari keluaran agent.** Tidak `MEDIA:<path>`, tidak
  nama berkas di dalam kalimat, tidak pola apa pun yang mengangkat path dari
  prosa. Core membaca `readdir` atas satu direktori yang ia buat sendiri, dan
  tidak ada jalan kedua.
- **Tidak ada berkas dari luar direktori keluar.** Berkas di tempat lain di
  workspace tidak dikirim, dan tidak ada perintah untuk memintanya.
- **Tidak ada rekursi ke subdirektori.** Entri `readdir` yang bukan berkas biasa
  dilewati, dan yang dilewati dijawab satu kalimat.
- **Tidak ada symlink yang diikuti.** `readdir` dengan `withFileTypes` memakai
  semantik `lstat`, jadi symlink menjawab false pada `isFile()` dan lewat tanpa
  kode tambahan. Ini yang menutup `.caraka-keluar/x -> ~/.ssh/id_ed25519`, dan
  `insideWorkspace` (`src/core/security.ts:285`) tidak bisa menutupnya karena ia
  berjalan atas `resolve()` dan buta terhadap symlink (`docs/security.md` §7).
- **Tidak ada deteksi berkas yang masih ditulis.** Tidak ada sinyal in-band untuk
  itu, dan konvensi tulis-lalu-rename berarti menaruh protokol pada agent.
  Direktori dibaca sekali sesudah turn agent berakhir, jadi yang tertangkap
  separuh hanya berkas yang ditulis proses latar yang hidup lebih lama daripada
  turn-nya. Bentuk kegagalannya berkas rusak di chat, bukan berkas yang salah.
- **Tidak ada sniffing magic byte.** Jenis berkas ditentukan ekstensi yang dicari
  di tabel milik core. Ekstensi yang berbohong menghasilkan mime yang salah dan
  penolakan dari channel, yang dijawab satu kalimat. Membaca magic byte berarti
  tabel kedua yang bisa berbeda pendapat dengan yang pertama.
- **Tidak ada arsip dan tidak ada berkas Office.** `zip`, `tar`, `xlsx`, dan
  `docx` di luar daftar izin, meski Cloud API mendokumentasikan tiga yang
  terakhir. Arsip adalah pembungkus eksfiltrasi yang paling murah, dan tidak ada
  agent di repositori ini yang menghasilkan berkas Office.
- **Tidak ada approval per berkas keluar.** Alasannya di bagian model ancaman:
  byte yang sama bisa keluar sebagai teks hari ini tanpa satu ketukan pun, jadi
  ketukan di sini membeli tampilan wewenang dan bukan wewenang.
- **Tidak ada field `caps` kelima.** Kemampuan dibawa method opsional, cara yang
  sama dipakai `fetchAttachment?`, `finishThread?`, dan `direct?`. `docs/api.md:197`
  sudah menolak `files` sebagai field yang tidak punya pembaca.
- **Tidak ada beberapa berkas dalam satu pesan.** Discord menerima banyak
  `files[n]` dalam satu request, dua channel lain tidak, jadi satu berkas satu
  pesan di ketiganya. Ini juga yang sudah dilakukan jalur gambar ACP hari ini
  (`gateway.ts:1438`).
- **Tidak ada retensi.** Direktori keluar dibuat kosong saat run mulai dan
  dihapus saat run berakhir, mengikuti inbox. Tidak ada kebijakan baru.
- **Tidak ada gambar keluar di rute MCP.** Tidak ada kodenya di `src/`, dan
  `docs/api.md:91` menyebut `media` sebagai sketsa.

## Yang mungkin tidak seperti yang dibayangkan

**Telegram mungkin memampatkan gambarnya.** Kasus utama fitur ini bagan yang
agent gambar, dan bagan yang dimampatkan adalah bagan yang teksnya tidak terbaca.
Halaman `sendPhoto` tidak menyatakan apa pun tentang re-encoding, jadi tidak ada
kutipan yang bisa ditulis di sini ke arah mana pun, dan ini tidak diukur di mesin
ini. Yang akan mengukurnya: kirim PNG lewat `sendPhoto`, ambil `file_id`-nya,
unduh kembali lewat `getFile`, dan bandingkan sha256 dengan berkas asal. Kalau
hasilnya berbeda, yang berubah adalah satu baris di tabel pemilihan method
Telegram, dan angkanya ditulis di `docs/telegram-integration.md` lebih dulu.

**`text/markdown` tidak ada di tabel dokumen Cloud API.** Tabel itu memuat
`text/plain` dan tidak memuat `text/markdown`, sementara `whatsapp.ts:480` sudah
mengunggah `text/markdown` hari ini untuk hasil yang melewati tiga pecahan.
Apakah Meta menerimanya tidak terbukti di repositori ini, karena tidak ada test
yang menyentuh API sungguhan. Yang akan mengukurnya: satu `POST /<phone>/media`
dengan `type=text/markdown` terhadap `phone_number_id` sungguhan, lalu membaca
kode errornya. Sampai itu diukur, `.md` tetap di daftar izin dan penolakan Meta
dijawab kalimat AC-4.3, karena mencabutnya berarti memundurkan perilaku yang
sudah terkirim.

**Discord bisa menerima lebih besar daripada yang kami tolak.** `attachment_size_limit`
naik dengan Boost Tier, jadi menolak di 20 MiB menolak berkas yang server itu
sebenarnya terima. Yang menahan adalah plafon core yang sama besar; melewatinya
berarti core membaca berkas yang lebih besar ke memori untuk satu channel.

**Direktori keluar hidup di dalam repositori pengguna.** Selama run berjalan,
`git status` di workspace itu melihatnya. Yang dipasang untuk itu satu berkas
`.gitignore` berisi `*` di dalam direktori keluar saat dibuat, jadi git
mengabaikan direktori itu beserta isinya. Berkas itu sendiri tidak pernah
terkirim, karena nama berawalan titik dilewati (AC-2.5).

## Model ancaman, kalimat yang jujur

Agent yang bisa menulis berkas ke direktori itu **sudah** bisa mengirim byte yang
sama ke chat hari ini: base64 di dalam code block sampai ke percakapan yang sama
tanpa satu ketukan pun. Fitur ini karena itu tidak membuka jalan keluar baru, ia
memberi bentuk pada jalan keluar yang sudah ada.

Dua hal yang benar-benar ia tambahkan, dan keduanya ditulis apa adanya. Pertama,
byte yang tidak dibaca manusia sebelum keluar: dinding base64 setidaknya terlihat
sebagai dinding, sedangkan lampiran terlihat sebagai lampiran. Kedua, ukuran:
satu pesan chat berhenti di beberapa ribu karakter, direktori ini berhenti di 20
MiB.

Scrubber keluar (`docs/security.md` §6) tidak bisa berkata apa pun tentang byte.
Yang ia lihat teks: nama berkas dan caption lewat `scrub` seperti setiap kalimat
lain. Isi berkas tidak lewat, tidak akan lewat, dan §12 mendapat satu baris yang
menyatakannya. Rahasia yang dirender ke dalam PNG keluar sebagai PNG, sama
seperti gambar masuk tidak bisa diberi label "data, bukan perintah" dan §12 sudah
mengakuinya.

Menulis berkas ke dalam workspace bukan aksi berisiko tinggi menurut `isHighRisk`
(`src/core/security.ts:301`), jadi di dalam jendela trust berkas itu ditulis tanpa
kartu. Itu keadaan yang sama untuk setiap berkas lain yang agent tulis di
workspace hari ini.

## Biaya, terhadap batas yang terdokumentasi

Satu berkas satu pesan, dan run yang biasa menghasilkan nol berkas.

| Jalur | Batas terdokumentasi per berkas | Yang ditolak adapter | Biaya per berkas |
|---|---|---|---|
| Telegram `sendPhoto` | 10 MB | di atas 10 MB, turun ke `sendDocument` | 1 request |
| Telegram `sendAnimation` / `sendDocument` | 50 MB | di atas plafon core 20 MiB | 1 request |
| Discord | 20 MiB per berkas, bisa lebih tinggi | di atas 20 MiB | 1 request |
| WhatsApp `cloud-api` gambar | 5 MB (`image/jpeg`, `image/png`) | di atas 5 MB, turun ke dokumen | 2 request |
| WhatsApp `cloud-api` dokumen | 100 MB | di atas plafon core 20 MiB | 2 request |
| WhatsApp `baileys` | tidak berdokumen | angka Cloud API, spec-set | 1 pesan |

**Telegram dan Discord ada di dalam batas.** Keduanya tidak punya limiter
proaktif dan menjawab 429 dengan menunggu `retry_after` (`docs/security.md` §9),
dan `fetchWithRetry` (`src/core/channel.ts:231`) sudah memegang jalur itu.

**WhatsApp memakai plafon yang sudah ada, dan tidak dikecualikan darinya.** Setiap
kirim lewat `emit()` (`src/channels/whatsapp.ts:231`), jadi berkas keluar
mengambil satu slot dari 12 pesan per 60 detik bergulir dan menunggu jeda acak
1.200-3.500 md seperti pesan lain. Di `cloud-api` unggahan ke `/<phone>/media`
adalah request pertama dan pesannya request kedua, dan hanya yang kedua yang
memakai slot, karena `emit()` membungkus pengiriman pesan. Bentuk kegagalan
plafonnya antrean, bukan penjatuhan.

## Anggaran

`src/` terukur **10.621 baris** pada 10 September 2026
(`find src -name '*.ts' | xargs wc -l`), 2.621 di atas plafon ~8.000. Plafon
tidak bergeser.

Perkiraannya sebuah rentang, bukan satu angka, karena ledger `AGENTS.md` mencatat
empat perkiraan tunggal yang meleset rendah dan satu rentang yang tepat
(`grup-nyaman`). Rentangnya **+200 sampai +320**, dengan pembagian kasar: core dan
kontrak ≈ 85, tabel mime dan pembaca nama ≈ 30, Telegram ≈ 15, Discord ≈ 5, dua
transport WhatsApp ≈ 75, dan kalimat ≈ 12.

Yang paling mungkin membuatnya mendekati ujung atas hal yang sama yang membuat
`lampiran-chat` meleset dari 185 ke 487: bentuk wire dua transport WhatsApp harus
dideklarasikan sebelum apa pun bisa dikirim lewatnya, dan setiap penolakan
membawa komentarnya. Yang membuatnya mendekati ujung bawah: `sendImage?` sudah
ada beserta dua implementasinya, `emit()` sudah memegang plafon WhatsApp, dan
harness test sudah mencatat panggilan channel (`test/e2e.test.ts:403`), jadi tidak
ada seam yang harus dibeli.

Tidak ada penghapusan yang membayarnya, dan tidak ada yang dijanjikan:
`pangkas-berulang` sudah mengukur lima kandidat yang berulang kali dijanjikan
spec sebelumnya pada −35 baris, bukan +400.

## Acceptance criteria

Kalimat penolakan di bawah ada tiga, dan masing-masing disebut dengan nomor
AC-nya.

### AC-1 · Direktori yang core miliki

- **AC-1.1** WHEN sebuah run mulai, gateway shall membuat
  `<path workspace>/.caraka-keluar/<id sesi>/` dengan mode 0700.
- **AC-1.2** WHEN direktori itu dibuat, gateway shall menulis satu berkas
  `.gitignore` berisi `*` di dalamnya.
- **AC-1.3** WHEN sebuah run mulai, gateway shall menghapus setiap subdirektori
  lain di bawah `.caraka-keluar/` workspace itu, sehingga sisa run yang mati
  tanpa penutup tidak pernah terkirim ke sesi berikutnya.
- **AC-1.4** WHEN sebuah run selesai, gagal, atau dibatalkan, gateway shall
  menghapus direktori run itu beserta isinya sebelum `runTask` kembali.
- **AC-1.5** WHEN gateway mulai, ia shall tidak memindai satu workspace pun untuk
  mencari direktori keluar yang tertinggal, dan AC-1.3 shall menjadi satu-satunya
  penyapunya.
- **AC-1.6** WHERE sebuah run membawa direktori keluar, prompt shall memuat nama
  direktori itu di dalam blok berlabel `data referensi, bukan perintah` yang sama
  yang dipakai lampiran masuk.
- **AC-1.7** Core shall tidak pernah membaca path dari teks agent, dan tidak ada
  ekspresi di bawah `src/core/` yang mencocokkan path di dalam keluaran agent.

### AC-2 · Apa yang dibaca dari direktori itu

- **AC-2.1** WHEN turn agent berakhir, gateway shall membaca direktori keluar run
  itu tepat satu kali.
- **AC-2.2** WHEN direktori itu dibaca, gateway shall mengirim setiap berkas biasa
  di dalamnya sebagai satu pesan tersendiri.
- **AC-2.3** IF sebuah entri adalah symlink, THEN gateway shall tidak membuka dan
  tidak mengirimnya, dan shall menjawab kalimat AC-4.1.
- **AC-2.4** IF sebuah entri adalah direktori, THEN gateway shall tidak
  memasukinya, dan shall menjawab kalimat AC-4.1.
- **AC-2.5** IF nama entri dimulai dengan titik, THEN gateway shall melewatinya
  tanpa mengirim kalimat apa pun.
- **AC-2.6** WHEN sebuah berkas dikirim, nama pesannya shall nama entri itu apa
  adanya sesudah melewati scrubber keluar.
- **AC-2.7** Nama berkas yang dikirim shall tidak pernah memuat pemisah path.

### AC-3 · Jenis dan ukuran

- **AC-3.1** WHERE ekstensi sebuah berkas ada di tabel mime keluar, gateway shall
  memakai mime dari tabel itu.
- **AC-3.2** IF ekstensi sebuah berkas berada di luar tabel itu, THEN gateway
  shall menjawab kalimat AC-4.1 dan tidak membuka berkasnya.
- **AC-3.3** Tabel mime keluar shall memuat sembilan pasangan dan tidak lebih:
  `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.pdf`, `.txt`, `.md`, dan `.csv`.
- **AC-3.4** WHEN ukuran sebuah berkas dibaca, gateway shall membacanya dengan
  `stat` sebelum berkas itu dibuka.
- **AC-3.5** IF ukuran sebuah berkas melebihi 20 MiB, THEN gateway shall menjawab
  kalimat AC-4.2 dan tidak membaca satu byte pun dari berkas itu.
- **AC-3.6** Core shall tidak memuat satu pun angka batas milik channel.

### AC-4 · Kalimat yang keluar saat menolak

- **AC-4.1** IF sebuah entri ditolak karena jenisnya, THEN gateway shall mengirim
  satu kalimat yang menyebut nama entri itu dan daftar jenis yang bisa dikirim.
- **AC-4.2** IF sebuah berkas ditolak karena ukurannya, THEN gateway shall
  mengirim satu kalimat yang menyebut ukurannya dan plafon 20 MiB.
- **AC-4.3** IF channel menolak sebuah berkas yang sudah dikirimkan kepadanya,
  THEN gateway shall mengirim satu kalimat yang menyebut nama berkas itu dan
  bahwa channel tidak menerimanya.
- **AC-4.4** WHERE channel tidak punya method `sendAttachment`, gateway shall
  menjawab dengan kalimat `attach.outUnsupported` yang sudah ada.
- **AC-4.5** Setiap kunci pesan baru shall ada di katalog `en` dan katalog `id`
  `src/i18n.ts`.
- **AC-4.6** Tidak satu pun kalimat di AC ini shall menyebut nama direktori keluar,
  nama method channel, atau path apa pun di luar nama berkas milik pengguna.

### AC-5 · Kontrak channel

- **AC-5.1** `Channel.sendImage?` shall berganti nama menjadi `sendAttachment?`,
  dan nama `sendImage` shall tidak muncul lagi di bawah `src/core/`.
- **AC-5.2** `sendAttachment?` shall menerima byte beserta mime dan nama, dan
  shall tidak menerima path.
- **AC-5.3** WHERE sebuah notifikasi ACP membawa blok konten `image`, gateway
  shall mengirimnya lewat `sendAttachment` dan urutan pesannya shall identik
  dengan perilaku hari ini.
- **AC-5.4** Core shall memilih method channel tanpa membandingkan `channel.id`,
  dan test hard rule 1 shall tetap hijau.

### AC-6 · Telegram

- **AC-6.1** WHERE mime `image/jpeg` atau `image/png` dan ukurannya tidak melebihi
  10 MB, adapter Telegram shall memanggil `sendPhoto`.
- **AC-6.2** WHERE mime `image/gif`, adapter Telegram shall memanggil
  `sendAnimation`.
- **AC-6.3** WHERE mime di luar ketiga nilai itu, adapter Telegram shall memanggil
  `sendDocument`.
- **AC-6.4** IF mime sebuah gambar `image/jpeg` atau `image/png` dan ukurannya
  melebihi 10 MB, THEN adapter Telegram shall memanggil `sendDocument` alih-alih
  menolak berkasnya.
- **AC-6.5** WHERE sesi punya thread, adapter Telegram shall mengirim
  `message_thread_id` bernilai number thread itu pada ketiga method.
- **AC-6.6** Adapter Telegram shall memotong caption pada 1.024 karakter.

### AC-7 · Discord

- **AC-7.1** Adapter Discord shall mengirim satu berkas sebagai `files[0]` di
  dalam body `multipart/form-data` dengan `payload_json`.
- **AC-7.2** IF ukuran sebuah berkas melebihi 20 MiB, THEN adapter Discord shall
  menolaknya tanpa mengirim request.
- **AC-7.3** Adapter Discord shall mengirim `allowed_mentions: { parse: [] }` pada
  setiap pesan berkas.
- **AC-7.4** WHERE sesi punya thread, adapter Discord shall mem-POST ke id thread
  itu dan bukan ke id channel induknya.

### AC-8 · WhatsApp

- **AC-8.1** `WhatsAppChannel` shall mengimplementasikan `sendAttachment`.
- **AC-8.2** WHERE provider `cloud-api` dan mime `image/jpeg` atau `image/png`
  dengan ukuran tidak melebihi 5 MB, adapter shall mengirim `type: "image"`.
- **AC-8.3** WHERE provider `cloud-api` dan mime di luar pasangan itu, adapter
  shall mengirim `type: "document"` dengan `filename` bernilai nama berkasnya.
- **AC-8.4** WHERE provider `cloud-api`, adapter shall mengunggah byte ke
  `/<phone>/media` lebih dulu dan memakai id yang dikembalikannya.
- **AC-8.5** WHERE provider `baileys` dan mime `image/jpeg` atau `image/png`,
  adapter shall mengirim konten `image`, dan untuk mime lain konten `document`
  dengan `mimetype` dan `fileName`.
- **AC-8.6** Setiap pengiriman berkas shall melewati `emit()`, sehingga ia
  mengambil satu slot dari 12 pesan per 60 detik dan menunggu jeda acaknya.
- **AC-8.7** WHERE provider `cloud-api`, adapter shall memotong caption pada 1.024
  karakter.
- **AC-8.8** WHEN hasil run melewati tiga pecahan, jalur berkas markdown yang ada
  shall tetap berperilaku sama seperti hari ini.

### AC-9 · Audit

- **AC-9.1** WHEN sebuah berkas benar-benar terkirim, gateway shall menulis satu
  baris audit `attachment.out` yang memuat mime, ukuran, dan sha256 isi berkasnya.
- **AC-9.2** IF sebuah berkas ditolak sebelum dibuka, THEN baris `attachment.out`
  shall bernilai `refused` dan shall tidak memuat sha256.
- **AC-9.3** IF sebuah pengiriman gagal di channel, THEN baris `attachment.out`
  shall bernilai `failed`.
- **AC-9.4** Baris `attachment.out` shall memuat nama berkas dan shall tidak
  memuat path direktori keluar.

### AC-10 · Dokumen dan ledger

- **AC-10.1** `docs/frd.md` FR-CHAN-05 shall menyebut tanggal pemasangan berkas
  keluar, ketiga channel yang mendapatkannya, dan shall tetap menyatakan
  `MEDIA:<path-atau-url>` dicabut.
- **AC-10.2** `docs/api.md` §4 shall menyebut `sendAttachment?` dan shall tidak
  lagi menyebut `sendImage?`.
- **AC-10.3** `docs/api.md` §5 shall menjelaskan kenapa berkas keluar sebuah
  method opsional dan bukan field `caps` kelima.
- **AC-10.4** `docs/security.md` §9 shall memuat satu baris "Ukuran berkas keluar"
  bernilai 20 MiB beserta keterangan bahwa ia spec-set.
- **AC-10.5** `docs/security.md` §12 shall memuat satu baris yang menyatakan
  scrubber tidak melihat isi berkas keluar, dan bahwa byte yang sama bisa keluar
  sebagai teks hari ini.
- **AC-10.6** `docs/ui-ux.md` §5 shall punya baris "Berkas keluar" yang terisi
  untuk ketiga kolom channel.
- **AC-10.7** `docs/telegram-integration.md` baris "Lampiran keluar" shall menyebut
  ketiga method beserta apa yang memilihnya.
- **AC-10.8** `docs/whatsapp-risiko.md` shall menyebut bahwa berkas keluar memakai
  plafon 12 pesan per 60 detik yang sama.
- **AC-10.9** Komentar `src/core/channel.ts` yang menyebut batas Discord shall
  berbunyi 20 MiB beserta sumbernya.
- **AC-10.10** Ledger `AGENTS.md` shall mencatat jumlah baris `src/` terukur
  sesudah pekerjaan ini, selisihnya terhadap rentang +200 sampai +320, dan pagu
  ~8.000 yang tidak bergeser.
