# Spec — close-bukan-otomatis: `done` bukan akhir sesi

**Status:** selesai · **Tanggal:** 14 Agustus 2026

## Latar

1.5.0 menutup topic pada setiap keadaan akhir, dan salah satunya bukan akhir.

`FINISHED` memuat `done`, `failed`, dan `cancelled`, dan `setState` menutup topic
begitu salah satunya ditulis. Tetapi `done` adalah keadaan yang ditinggalkan
**satu run**, bukan akhir sebuah sesi: pesan berikutnya di topic yang sama
melanjutkan sesi itu juga. Jadi setiap giliran menutup topic-nya, dan giliran
berikutnya membukanya lagi.

Terlihat pada instalasi pertama yang memakainya, 14 Agustus 2026: dua pertanyaan
berturut-turut di satu topic, dua jawaban, dan topic itu tertutup di antaranya
tanpa ada yang menyuruhnya. Telegram menulis satu service message `closed` dan
satu `reopened` tiap kali, jadi transkripnya juga terisi keduanya.

Yang diminta pemiliknya semula adalah "fungsi close topic, bukan delete" —
kemampuan menutup, bukan penutupan otomatis pada keadaan yang bukan akhir.
Caraka tidak punya kejadian yang berarti "sesi ini berakhir", dan menebaknya dari
`done` adalah tebakan yang salah.

## Ruang lingkup

`src/core/gateway.ts` (penutupan otomatis dan pembukaan otomatis dicabut, satu
perintah baru), `src/core/channel.ts` (satu entri di daftar perintah),
`src/i18n.ts` (dua pasang kalimat), `test/unit.test.ts`, `test/e2e.test.ts`,
`docs/session-model.md`, dan teks `/help` di kedua katalog.

## Yang tidak dikerjakan

- **Tidak menutup pada `cancelled` atau `failed` juga.** Keduanya sama-sama
  keadaan sebuah run, bukan sebuah sesi. `/stop` membatalkan tugas yang berjalan
  dan sesinya tetap bisa dilanjutkan.
- **Tidak membuka kembali secara otomatis.** Dengan tidak ada yang menutup
  sendiri, tidak ada yang perlu dibuka sendiri. Sebelumnya pembukaan itu menembak
  di setiap giliran kedua dan membelanjakan satu `TOPIC_NOT_MODIFIED` tiap kali.
  Orang yang menutup topic bisa membukanya sendiri dari kliennya.
- **Tidak menambah timeout idle yang menutup sendiri.** Itu tebakan yang sama
  dalam bentuk lain, dan tidak ada yang memintanya.
- **Tidak menyentuh `deleteForumTopic`**, yang tetap tidak ada di `src/`.

## Acceptance criteria

- **AC-1** WHEN sebuah run selesai dengan keadaan apa pun, Caraka shall tidak
  menutup topic sesi itu.
- **AC-2** WHEN sebuah run selesai, Caraka shall tetap menulis glif keadaan ke
  nama topic-nya.
- **AC-3** WHEN sebuah pesan melanjutkan sesi yang run sebelumnya sudah selesai,
  Caraka shall tidak memanggil pembukaan topic.
- **AC-4** WHEN `/close` dikirim di sebuah sesi, Caraka shall menandai sesi itu
  `done`, mengirim satu baris penutup, lalu menutup topic-nya, dalam urutan itu.
- **AC-5** IF sebuah tugas masih berjalan di sesi itu, THEN `/close` shall
  menolak, menyebut `/stop`, dan tidak menutup apa pun.
- **AC-6** IF thread itu bukan milik Caraka, THEN `/close` shall tidak
  menutupnya.
- **AC-7** IF sesi itu berjalan tanpa thread, THEN `/close` shall tetap menandai
  sesi selesai.
- **AC-8** IF channel menolak penutupan, THEN keadaan sesi shall tetap tertulis
  dan tidak ada pesan galat yang masuk ke chat.
- **AC-9** `/close` shall terdaftar di menu perintah dan disebut di kedua badan
  `/help`.
- **AC-10** Setiap kalimat baru shall ada di kedua katalog.
