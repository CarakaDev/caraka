# Spec — typing-indicator: status kerja di header chat selama run berjalan

**Status:** rencana · **Tanggal:** 14 Agustus 2026

## Latar

`runTask` (`src/core/gateway.ts`) mengirim satu ack `run.working`, lalu menulis
ulang pesan yang sama paling cepat tiap 1.500 md dengan ekor keluaran agent.
Seluruh jalur itu bergantung pada `caps.edit`: bernilai false, ack pertama tetap
keluar dan tidak ada apa pun sesudahnya sampai hasil. Tidak ada satu pun
panggilan status di repositori ini.

`docs/frd.md` FR-CHAN-08 menuliskannya sebagai P0 — "Indikator 'sedang
mengetik/bekerja' saat run aktif, bila channel mendukung" — dan barisnya belum
pernah punya kode. Tiga dokumen lain mencatat ketiadaannya dengan kata
"rencana": `docs/api.md` §5, `docs/design.md` baris 307, dan daftar di
`site/CLAUDE.md` baris 132 yang berpasangan dengan `site/AGENTS.md` baris 132.
Keempatnya harus berpindah bersama kodenya, bukan sesudahnya.

Yang diminta pemilik adalah status di header chat, di samping teks yang sudah
tumbuh di tempat. Tiga dari empat jalur channel bisa melakukannya, dan yang
keempat tidak akan dicoba sampai satu pertanyaan terjawab di perangkat sungguhan.

### Apa yang tiap jalur sediakan

**Telegram — `sendChatAction`.** Statusnya "is set for 5 seconds or less (when a
message arrives from your bot, Telegram clients clear its typing status)", dan
dokumennya sendiri menganjurkan pemakaian "when a response from the bot will take
a noticeable amount of time to arrive"
([bots/api#sendchataction](https://core.telegram.org/bots/api#sendchataction)).
Nilai `action` yang benar untuk keluaran teks adalah `typing`, satu dari sepuluh
nilai di halaman yang sama. Parameternya menerima `message_thread_id` "for
supergroups and private chats of bots with forum topic mode enabled only",
ditambahkan di Bot API 6.4
([api-changelog](https://core.telegram.org/bots/api-changelog)). Caraka
merutekan tiap sesi dengan pasangan `(chatId, threadId)`, jadi thread id itu
selalu ikut.

Yang tidak tertulis di mana pun: berapa sering aksi itu boleh diulang. Jendela 5
detik adalah satu-satunya angka, dan setiap pola "kirim ulang tiap 4 detik" di
luar sana adalah kesimpulan dari angka itu. Tidak ada batas per-method yang
diterbitkan; yang ada adalah jalur umum 429 dengan `retry_after` di
`ResponseParameters`
([making-requests](https://core.telegram.org/bots/api#making-requests)) dan
angka-angka di FAQ yang semuanya berbunyi *messages*: "In a single chat, avoid
sending more than one message per second… In a group, bots are not be able to
send more than 20 messages per minute"
([bots/faq](https://core.telegram.org/bots/faq)). Apakah sebuah chat action
dihitung sebagai message tidak dinyatakan, jadi bagian **Biaya** di bawah
menganggapnya dihitung.

**Discord — `POST /channels/{channel.id}/typing`.** Mengembalikan "a 204 empty
response on success" dan "expires after 10 seconds". Dokumennya menyebut kasus
ini persis: "Generally bots should not use this route. However, if a bot is
responding to a command and expects the computation to take a few seconds, this
endpoint may be called to let the user know that the bot is processing their
message"
([resources/channel](https://docs.discord.com/developers/resources/channel)).
Sebuah thread adalah channel dengan id sendiri
([topics/threads](https://docs.discord.com/developers/topics/threads)), dan
`discord.ts` sudah menyulih id thread ke rute channel di `sendText`, `editTopic`,
dan `finishThread`.

Rute itu tidak menyebut permission apa pun. Yang disebut halaman thread adalah
bahwa "the SEND_MESSAGES permission has no effect in threads; users must have
SEND_MESSAGES_IN_THREADS to talk in a thread", dan bahwa thread yang terarsip
tertutup untuk hampir semua aksi. Caraka mengarsipkan thread begitu sesi selesai,
jadi satu detak yang berlomba dengan pengarsipan itu bisa dijawab 403 atau 404.
Itulah alasan detak berhenti pada kegagalan pertama: batas yang menghukum pola
gagal berulang adalah "10,000 invalid HTTP requests per 10 minutes"
([topics/rate-limits](https://docs.discord.com/developers/topics/rate-limits)).

**WhatsApp Cloud API — bukan pengiriman pesan.** Panggilannya adalah read
receipt dengan satu objek tambahan, ke `POST /<PHONE_NUMBER_ID>/messages` dengan
`status: "read"`, `message_id`, dan `typing_indicator: { type: "text" }`.
"The typing indicator will be dismissed once you respond, or after 25 seconds,
whichever comes first", dan "to prevent a poor user experience, only display a
typing indicator if you are going to respond"
([typing-indicators](https://developers.facebook.com/documentation/business-messaging/whatsapp/typing-indicators)).
Ia butuh `message_id` pesan masuk, yang sudah tiba di `receive(from, id, …)` di
`src/channels/whatsapp.ts` dan tidak boleh menyeberang ke core — aturan yang sama
yang dipegang `fetchAttachment`. Apakah mengirim ulang `message_id` yang sama
memperbarui 25 detiknya tidak tertulis, jadi jalur ini mendapat satu panggilan
per run dan tidak punya timer sama sekali.

**WhatsApp Baileys — ada, dan tidak dipakai.** `sendPresenceUpdate('composing',
jid)` tersedia; README-nya menulis "the presence expires after about 10 seconds"
([Baileys](https://github.com/WhiskeySockets/Baileys)), dan pada versi yang
repositori ini pin, `WAPresence` memuat `composing`
([`src/Types/Chat.ts` v6.7.22](https://raw.githubusercontent.com/WhiskeySockets/Baileys/v6.7.22/src/Types/Chat.ts))
dengan implementasinya di
[`src/Socket/chats.ts` v6.7.22](https://raw.githubusercontent.com/WhiskeySockets/Baileys/v6.7.22/src/Socket/chats.ts).
Yang menahan adalah laporan bahwa `composing` mungkin butuh
`presenceSubscribe(jid)` atau presence `available` lebih dulu
([Baileys#866](https://github.com/WhiskeySockets/Baileys/issues/866)) — sebuah
utas isu, bukan dokumentasi. Kalau ternyata benar, harganya bukan lagi satu node
protokol: `available` adalah presence yang dilaporkan menekan push notification
di ponsel ([openclaw#30286](https://github.com/openclaw/openclaw/issues/30286)),
dan itu kerugian yang lebih besar daripada indikatornya. Jalur ini juga
satu-satunya yang punya risiko ban, dan `docs/whatsapp-risiko.md` baris 56
menamai timing sebagai sinyal yang dilaporkan. Baileys tidak mendapat apa-apa
sampai pertanyaan itu dijawab pada perangkat sungguhan, dan degradasinya bukan
kehilangan: `caps.edit` bernilai true di sana, jadi teksnya tetap tumbuh di
tempat.

### Kenapa sebuah method opsional dan bukan field `caps`

`docs/api.md` §5 sudah menolak field ini dengan menyebut namanya: "`files`,
`typing`, `rich`, dan `ephemeral` tetap rencana; mendeklarasikannya sekarang
berarti menjanjikan sesuatu yang tidak ada yang memeriksa." Empat `caps` yang ada
masing-masing membeli satu percabangan di core: `threads` memilih mode linear,
`buttons` memilih kode pendek, `edit` menyalakan jalur progres, `maxChars`
menentukan panjang ekor. Typing tidak punya cabang kedua — ia terjadi atau tidak
ada yang terjadi. Sebuah `caps.typing` akan dibaca hanya untuk memutuskan apakah
memanggil method yang kehadirannya sudah fakta yang sama, dan dua sumber
kebenaran yang bisa berbeda pendapat adalah cacat, bukan kelengkapan.

Bentuknya mengikuti `finishThread?`, bukan `direct?`. `direct?` mengembalikan
nilai yang core pakai, dengan fallback di sisi kanan `??`. Typing tidak
mengembalikan apa pun yang core baca, jadi `??` tidak punya isi. `finishThread?`
adalah bentuk untuk "lakukan bila bisa, dan kalau tidak bisa itulah seluruh
jawabannya": dipanggil dengan `?.`, dirantai `.catch()`, tanpa `if` dan tanpa
perbandingan id di mana pun (hard rule 1).

## Ruang lingkup

`src/core/channel.ts` (satu method opsional pada `Channel`), `src/core/gateway.ts`
(detak di `runTask` dan penghentiannya di `finally`, ditambah satu parameter
konstruktor untuk kadensnya), `src/channels/telegram.ts`, `src/channels/discord.ts`,
`src/channels/whatsapp.ts` (slot transport, id pesan masuk terakhir, method
typing), `test/unit.test.ts` dan `test/e2e.test.ts`, serta dokumen di bagian AC-7.

## Yang tidak dikerjakan

- **Tidak ada field `caps.typing`.** Alasannya di atas, dan `docs/api.md` §5 sudah
  memutuskannya lebih dulu.
- **Tidak ada typing di Baileys.** Sampai `Baileys#866` diverifikasi pada
  perangkat sungguhan, tidak ada node presence maupun chatstate yang keluar dari
  jalur itu. Kalau verifikasi menunjukkan `composing` berdiri sendiri, yang
  ditambahkan adalah jitter di adapter dan satu baris baru di tabel
  `docs/whatsapp-risiko.md` untuk traffic protokol yang tidak melewati `emit()`.
- **Tidak ada pengulangan di Cloud API.** Satu panggilan per pesan masuk. Jendela
  25 detiknya habis di tengah run yang panjang dan tidak diperbarui, karena
  perbaruannya tidak berdokumen.
- **Tidak ada penipisan detak per adapter.** Core berdetak pada satu kadens dan
  Discord memakainya apa adanya meski jendelanya dua kali lebih panjang. Menipis
  ke 8 detik menghemat 7,5 panggilan per menit dari anggaran 50 request per detik
  yang tidak sedang ketat.
- **Tidak ada penggabungan per `chat_id` di adapter Telegram.** Bagian **Biaya**
  menghitung kasus yang melewati batas dan menamai penggabungan itu sebagai
  jawabannya; yang menahan adalah bahwa penggabungan berarti hanya satu dari
  beberapa topic yang berjalan bersamaan menampilkan status, dan bahwa jalur
  progres sudah melewati angka yang sama hari ini tanpa fitur ini.
- **Tidak ada kalimat pengganti di channel yang tidak punya.** Pesan teks
  "Caraka sedang mengetik" akan memakai plafon outbound WhatsApp untuk hiasan dan
  menambah satu dinding teks di setiap channel. Baris `readiness()` yang
  mengumumkan ketiadaannya juga tidak ada: tidak ada satu pun kemampuan absen
  yang diumumkan di sana hari ini.
- **Tidak ada indikator untuk keadaan selain run berjalan.** Menunggu approval,
  antrean, dan pemuatan memori tidak mendapat status apa pun.

## Biaya panggilan, terhadap batas yang terdokumentasi

Kadens core adalah 4.000 md: jendela terpendek di antara keempat jalur adalah 5
detik milik Telegram, dan 4 detik adalah interval terpendek yang berguna di
bawahnya.

| Jalur | Jendela terdokumentasi | Detak | Panggilan / menit / run |
|---|---|---|---|
| Telegram | ≤ 5 dtk | 4 dtk | 15 |
| Discord | 10 dtk | 4 dtk | 15 |
| WhatsApp `cloud-api` | 25 dtk, hilang saat dibalas | tidak ada | 1 per run |
| WhatsApp `baileys` | — | tidak ada | 0 |

**Discord ada di dalam batas.** 15 per menit terhadap "all bots can make up to 50
requests per second" dan sebuah bucket yang dikunci id channel atau thread sesi
itu sendiri. Kegagalan berulang yang dihukum 10.000 request tidak sah per 10
menit tidak bisa terjadi karena detak berhenti pada kegagalan pertama: satu 403
per run, bukan 150.

**Cloud API ada di dalam batas.** Satu panggilan per run terhadap "up to 80
messages per second"
([throughput](https://developers.facebook.com/documentation/business-messaging/whatsapp/throughput)),
dan halaman itu tidak menyatakan apakah read receipt ikut dihitung.

**Telegram ada di dalam batas untuk satu run, dan di luar batas untuk beberapa
run di satu chat yang sama.** Satu run: 15 typing ditambah paling banyak 40 edit
progres per menit, 55 request per menit, 0,92 per detik terhadap "avoid sending
more than one message per second" di satu chat. Lima run bersamaan adalah lima
workspace, dan lima workspace bisa hidup di lima topic dari satu supergroup —
`chat_id` yang sama. Di sana angkanya 75 typing per menit, 1,25 per detik,
sebelum edit dihitung. Yang perlu ditulis apa adanya: jalur progres sendiri sudah
melewati angka itu hari ini pada situasi yang sama, 200 edit per menit alias 3,3
per detik, jadi fitur ini menambah 37% pada angka yang sudah di luar batas dan
bukan yang membawanya ke sana. Bentuk kegagalannya adalah 429 dengan
`retry_after` yang `call()` di `telegram.ts` sudah menunggu, dan karena detak
tidak pernah ditunggu run, tidak ada pesan yang hilang atau tertunda karenanya.
Kalau pemakaian menunjukkan 429 yang sering, yang dipasang adalah penggabungan
per `chat_id` di adapter, dan angkanya diukur sebelum ditulis.

## Yang mungkin tidak seperti yang dibayangkan

Dua hal yang diminta bersamaan mungkin tidak bisa tampil bersamaan di Telegram.
Dokumennya menyatakan status hilang "when a message arrives from your bot"; ia
tidak menyatakan apa yang dilakukan sebuah **edit**. Kalau edit juga
menghapusnya, run yang cerewet menulis ulang pesannya tiap 1,5 detik dan status
di header hanya sempat terlihat di sela-sela, sementara run yang diam
menampilkannya penuh. Itu bukan kegagalan yang perlu diperbaiki dengan detak yang
lebih cepat, karena yang membatasi detak adalah bagian **Biaya** di atas. Yang
dilakukan adalah mengukurnya terhadap bot sungguhan di sebuah topic dan menulis
hasilnya di `docs/telegram-integration.md`.

## Acceptance criteria

### AC-1 · Detak di core

- **AC-1.1** WHILE sebuah run berjalan, gateway shall memanggil `typing` milik
  channel sesi itu paling banyak sekali per `typingMs`.
- **AC-1.2** WHEN ack `run.working` selesai terkirim, panggilan `typing` pertama
  shall terjadi sesudahnya dan tidak sebelumnya.
- **AC-1.3** WHEN sebuah run berakhir dengan `done`, `failed`, `cancelled`, atau
  batas waktu, gateway shall menghentikan detak sesi itu sebelum `runTask`
  kembali.
- **AC-1.4** WHERE sesi punya thread, gateway shall meneruskan `session.threadId`
  ke `typing` pada setiap detak.

### AC-2 · Tidak pernah menunda, menghalangi, atau menggagalkan run

- **AC-2.1** IF panggilan `typing` menolak, THEN gateway shall menghentikan detak
  run itu dan run shall mengeluarkan urutan pesan yang identik dengan run yang
  sama tanpa `typing`.
- **AC-2.2** IF sebuah panggilan `typing` tidak pernah selesai, THEN gateway shall
  tetap menyelesaikan run dan tidak mengirim panggilan `typing` kedua di
  belakangnya.
- **AC-2.3** Jalur run shall tidak pernah menunggu hasil `typing`, dan tidak ada
  `await` pada pemanggilannya di `src/core/`.

### AC-3 · Channel yang tidak menyediakannya

- **AC-3.1** WHERE channel tidak punya method `typing`, gateway shall menjalankan
  run tanpa perubahan pada satu pun pesan yang dikirimnya.
- **AC-3.2** WHERE channel tidak punya method `typing`, gateway shall tidak
  menulis kalimat ke chat, baris audit, maupun kalimat `readiness()` yang
  menyebut ketiadaan itu.

### AC-4 · Telegram

- **AC-4.1** WHERE sesi punya thread, adapter Telegram shall mengirim
  `sendChatAction` dengan `message_thread_id` bernilai number thread itu.
- **AC-4.2** Adapter Telegram shall mengirim `action` bernilai `typing` dan tidak
  pernah salah satu dari sembilan nilai lain di halaman method itu.

### AC-5 · Discord

- **AC-5.1** WHERE sesi punya thread, adapter Discord shall mem-POST ke
  `/channels/<id thread>/typing` dan bukan ke id channel induknya.
- **AC-5.2** Adapter Discord shall mengirim rute itu tanpa body dan tanpa header
  `content-type`.

### AC-6 · WhatsApp

- **AC-6.1** WHERE provider adalah `cloud-api`, adapter shall mengirim
  `status: "read"` dengan `typing_indicator` bertipe `text` dan `message_id`
  pesan masuk yang memulai run itu.
- **AC-6.2** WHERE provider adalah `cloud-api`, adapter shall mengirim paling
  banyak satu panggilan typing untuk satu pesan masuk, berapa pun jumlah detak
  yang tiba.
- **AC-6.3** WHERE provider adalah `baileys`, adapter shall tidak mengirim node
  presence maupun chatstate apa pun, dan nama `sendPresenceUpdate` shall tidak
  muncul di bawah `src/`.
- **AC-6.4** Panggilan typing shall tidak melewati `emit()`, sehingga tidak
  mengurangi plafon 12 pesan per 60 detik dan tidak menambah jeda acak.

### AC-7 · Dokumen dan ledger

- **AC-7.1** `docs/api.md` §5 shall berhenti menyebut `typing` sebagai rencana dan
  shall menyebut kenapa ia sebuah method opsional alih-alih field `caps`.
- **AC-7.2** `docs/design.md` baris 307 shall menyebut empat kemampuan yang tetap
  rencana, bukan lima.
- **AC-7.3** `site/CLAUDE.md` dan `site/AGENTS.md` baris 132 shall tidak lagi
  memuat "a typing indicator" di daftar yang belum pernah terkirim.
- **AC-7.4** `docs/frd.md` FR-CHAN-08 shall mencatat tanggal pemasangannya dan
  channel mana yang sengaja tidak mendapatkannya.
- **AC-7.5** `docs/whatsapp-risiko.md` shall menyebut bahwa progres `cloud-api`
  sekarang satu ack ditambah 25 detik status mengetik, dan shall tetap menyebut
  `caps.edit` sebagai satu-satunya perbedaan yang dilihat core.
- **AC-7.6** `docs/ui-ux.md` §5 shall punya baris "Indikator kerja" yang terisi
  untuk ketiga kolom channel.
- **AC-7.7** Ledger di `AGENTS.md` shall mencatat jumlah baris `src/` terukur
  sesudah pekerjaan ini, selisihnya terhadap rentang yang plan tulis, dan pagu
  ~8.000 yang tidak bergeser.
