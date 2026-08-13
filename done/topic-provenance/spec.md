# Spec — topic-provenance: hanya menyentuh thread yang dibuat sendiri

**Status:** sedang dikerjakan · **Tanggal:** 13 Agustus 2026 · **Isu:** #7

## Latar

Caraka mengubah nama thread yang bukan miliknya, dan di Discord ia juga
mengarsipkannya.

Jalurnya satu dan pendek. `createSession` (`src/core/gateway.ts:996`) mengambil
thread dari pesan yang masuk:

```ts
let threadId = String(message.message_thread_id ?? "");
if (!threadId && this.topicsAvailable(message)) { … createTopic … }
```

Topic hanya dibuat kalau `threadId` kosong. Jadi sebuah pesan yang dikirim di
dalam topic yang sudah ada — topic yang dibuat dan dinamai manusia — memberi
sesi itu `thread_id` milik manusia tersebut, dan tidak ada topic baru yang
dibuat. Tabel `sessions` tidak punya kolom yang mencatat siapa yang membuat
thread itu, jadi sesudah baris itu tidak ada apa pun yang bisa membedakan
keduanya.

Lalu `setState` (`src/core/gateway.ts:1245-1259`) mengubah nama setiap kali sesi
berpindah keadaan, tanpa syarat selain thread-nya ada:

```ts
if (!session.threadId) return;
await channel.editTopic(session.chatId, session.threadId, `${glyph} ${session.title}`)
```

`session.title` adalah baris pertama pesan yang memulai sesi. Jadi topic bernama
`Project • Client Ops` menjadi `◐ perbaiki bug login` pada `setState` pertama,
dan nama lamanya tidak tersimpan di mana pun, sehingga tidak ada yang bisa
memulihkannya.

**Discord lebih jauh dari yang dilaporkan isu.** `finishThread`
(`src/channels/discord.ts:374-376`) mengirim `{ archived: true }`, dan `setState`
memanggilnya pada `done`, `failed`, dan `cancelled`. Jadi di Discord, satu tugas
yang dikerjakan di dalam thread milik orang lain mengganti namanya lalu
**mengarsipkannya** ketika tugas itu selesai. Isu #7 ditulis dari kejadian di
Telegram, dan lubangnya ada di core, bukan di adapter.

Gerbang mention yang mendarat di 1.3.0 mempersempit ini dan tidak
menutupnya: sebuah pesan yang tidak menyapa Caraka di topic manusia tidak lagi
membuat sesi. Begitu ada yang menyapa Caraka di sana sekali, penggantian nama
tetap terjadi.

Dua hal yang membatasi bentuk perbaikan ini, keduanya diperiksa lebih dulu:

- **Tidak ada jejak untuk backfill.** Tidak ada satu pun baris audit yang
  mencatat pembuatan topic (`grep 'audit("session'` di `gateway.ts` hanya
  menemukan `session.switch`), dan `store.createSession` tidak menulis audit.
  Jadi untuk thread yang sudah ada sebelum rilis ini, kepemilikan tidak bisa
  dibuktikan dari data yang ada, dan satu-satunya jawaban yang aman adalah tidak
  menyentuhnya.
- **Nama topic tidak bisa dibaca.** Bot API tidak punya method yang mengembalikan
  nama sebuah forum topic, jadi Caraka tidak bisa memeriksa nama sekarang, tidak
  bisa menyimpan nama sebelumnya untuk topic yang bukan buatannya, dan tidak bisa
  menampilkan `nama sekarang → nama tujuan`.

## Ruang lingkup

`src/core/gateway.ts` (mencatat kepemilikan saat `createTopic` berhasil, dan satu
syarat di `setState`), `src/store/db.ts` bila penyimpanannya menuntut sesuatu di
luar `meta` yang sudah ada, `test/unit.test.ts` dan `test/e2e.test.ts`,
`docs/session-model.md`, `docs/security.md` beserta pasangan `.en`, dan
`docs/frd.md`.

## Yang tidak dikerjakan

- **Tidak membangun perintah rename atau restore.** Caraka tidak punya satu pun,
  dan tidak diminta punya. Separuh acceptance criteria di isu #7 — meminta nama
  tujuan yang eksplisit, menampilkan `nama sekarang → nama tujuan`, konfirmasi
  sebelum mutasi — ditulis untuk produk yang menawarkan penggantian nama kepada
  penggunanya. Satu-satunya mutasi topic milik Caraka bersifat otomatis, yaitu
  glif keadaan. Yang dibutuhkannya adalah syarat kepemilikan, bukan dialog
  konfirmasi. Kalau suatu hari ada perintah rename, konfirmasi itu berlaku saat
  itu, dan catatan ini yang menjelaskan kenapa ia belum ada.
- **Tidak menyimpan nama asli topic milik manusia.** Nama itu tidak pernah bisa
  dibaca, jadi menyimpannya berarti mengarang. Yang disimpan adalah kepemilikan.
- **Tidak memulihkan nama topic yang sudah tertimpa** oleh versi sebelum ini.
  Nama lamanya tidak pernah tersimpan dan tidak bisa dibaca, jadi tidak ada yang
  bisa dipulihkan. `CHANGELOG` mengatakan ini apa adanya.
- **Tidak menyentuh `topicsAvailable`, `noteThreadsOff`, atau peta glif.** Yang
  berubah adalah kepada thread mana glif itu ditulis, bukan glifnya.
- **Tidak membuat topic baru ketika pesan datang di topic orang lain.** Itu
  perilaku yang berbeda dan lebih ramai; sesi tetap berjalan di thread itu, hanya
  namanya yang tidak disentuh.

## Acceptance criteria

- **AC-1** WHEN Caraka berhasil membuat sebuah thread untuk sebuah sesi, Caraka
  shall mencatat thread itu sebagai miliknya.
- **AC-2** WHEN sebuah sesi dibuat pada thread yang datang bersama pesan masuk,
  Caraka shall tidak mencatat thread itu sebagai miliknya.
- **AC-3** WHILE sebuah thread tercatat sebagai milik Caraka, WHEN sesi di thread
  itu berpindah keadaan, Caraka shall mengganti nama thread itu menjadi glif
  keadaan diikuti judul sesi.
- **AC-4** IF sebuah thread tidak tercatat sebagai milik Caraka, THEN Caraka
  shall tidak memanggil `editTopic` untuk thread itu.
- **AC-5** IF sebuah thread tidak tercatat sebagai milik Caraka, THEN Caraka
  shall tidak memanggil `finishThread` untuk thread itu.
- **AC-6** WHEN sebuah sesi di thread yang bukan milik Caraka berpindah keadaan,
  Caraka shall tetap menulis keadaan baru itu ke basis data.
- **AC-7** WHEN Caraka melewatkan mutasi thread karena kepemilikan tidak
  terbukti, Caraka shall menulis satu baris audit yang menyebut chat dan thread
  itu.
- **AC-8** WHERE sebuah basis data dibuat sebelum rilis ini, Caraka shall
  memperlakukan setiap thread di dalamnya sebagai bukan miliknya.
- **AC-9** WHEN sebuah sesi baru dibuat pada thread yang sebelumnya dibuat oleh
  Caraka, Caraka shall tetap memperlakukan thread itu sebagai miliknya.
- **AC-10** IF sebuah pesan masuk membawa `message_thread_id` yang sama dengan
  thread yang tercatat milik Caraka, THEN pencatatan itu shall tidak berubah.
- **AC-11** Caraka shall tidak pernah menyimpan nama thread yang tidak pernah
  dibacanya dari channel.
- **AC-12** WHEN sebuah sesi berjalan di thread yang bukan milik Caraka, Caraka
  shall tetap mengirim balasan ke thread itu.
