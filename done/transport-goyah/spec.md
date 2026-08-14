# Spec — transport-goyah: satu kegagalan transport tidak boleh menggantung sesi

**Status:** selesai · **Tanggal:** 14 Agustus 2026

## Latar

Dilaporkan dari luar sebagai [issue #11], dengan analisis sumber dan bukti yang
direproduksi. Pada 14 Agustus 2026 pukul 18:46:07 WIB, urutan auditnya:

```
msg.in   accepted
error    failed   {"message":"Telegram sendMessage could not be reached."}
msg.out  sent     satu detik kemudian
```

Tidak ada `run.start`: Codex tidak pernah dijalankan. Sesi yang dipilih tugas itu
tetap `state: running` selamanya, dan karena satu workspace hanya menjalankan
satu run pada satu waktu (FR-SESS-04), workspace itu terkunci.

Pelapornya mengukur sebabnya, bukan menebaknya: lima panggilan `getMe` berurutan
berhasil; tiga puluh panggilan serentak menghasilkan empat penolakan, masing-masing
`TypeError` dari fetch dengan cause `ECONNRESET` setelah 420–466 ms. Transport
yang goyah sesaat, bukan token yang salah dan bukan jaringan yang mati.

Dua cacat, dan yang kedua yang membuatnya permanen:

1. **Tidak ada yang mengulang galat transport.** `fetchWithRetry` di
   `core/channel.ts` menangkap `fetch` yang ditolak dan langsung melemparnya
   sebagai `unreachable`; satu-satunya yang diulangnya adalah 429. Dan Telegram
   bahkan tidak memakai helper itu — `Telegram.call` punya jalannya sendiri, jadi
   lubangnya ada di tiga channel dengan dua bentuk.
   AC-5 mula-mula ditulis "termasuk Telegram harus lewat `fetchWithRetry`", dan
   itu salah: Telegram menjawab 200 untuk galatnya dan menaruh `error_code` di
   dalam body, sedangkan `fetchWithRetry` membaca status HTTP. Memaksanya lewat
   sana berarti menjejalkan dua protokol ke satu bentuk — persis yang diukur
   `pangkas-berulang` sebagai lebih mahal digabung daripada disalin. Yang
   dibagikan adalah pengulangannya saja.

2. **Pesan progres dikirim di luar `try`.** `runTask` menulis `running`, lalu
   memanggil `sendToSession` sebelum blok `try` dibuka. Kegagalan di sana
   melewati seluruh `catch` dan `finally`, jadi tidak ada yang menulis `failed`
   dan tidak ada yang membebaskan antrean. `catch` di tingkat antrean memanggil
   `reportError` tanpa sesi, yang menjelaskan id sesi yang kosong di baris audit.

## Ruang lingkup

`src/core/channel.ts` (`fetchWithRetry`), `src/channels/telegram.ts`,
`src/core/gateway.ts` (`runTask`), `test/unit.test.ts`, `test/e2e.test.ts`.

## Yang tidak dikerjakan

- **Tidak ada retry tak terbatas.** Satu pengulangan, dan kalau yang kedua gagal
  juga, tugas itu gagal dengan benar. Transport yang mati bukan transport yang
  goyah, dan mengulanginya selamanya hanya memindahkan gantungnya ke tempat lain.
- **Galat Bot API tidak diulang.** 400 dan 401 adalah jawaban, bukan kegagalan
  transport; mengulangnya hanya mengulang penolakan yang sama.
- **Tidak ada kunci idempoten.** Telegram tidak punya, jadi lihat batas di bawah.

## Batas yang dibayar

Sebuah permintaan yang sampai ke Telegram dan jawabannya yang hilang tidak bisa
dibedakan dari permintaan yang tidak pernah sampai. Pengulangan karena itu bisa
mengirim satu pesan dua kali. Yang ditukar: satu pesan progres ganda yang jarang,
melawan sesi yang tergantung `running` dan workspace yang terkunci sampai ada
yang menyadarinya. Pengukuran pelapornya — penolakan pada 420–466 ms, pada
pembentukan koneksi — menempatkan kegagalan ini sebelum permintaannya terkirim,
tetapi itu pengamatan, bukan jaminan.

## Acceptance criteria

- **AC-1** WHEN sebuah permintaan channel ditolak oleh transport, Caraka shall
  mencobanya sekali lagi sebelum menyerah.
- **AC-2** WHEN percobaan kedua berhasil, permintaan itu shall dianggap berhasil
  dan tidak ada galat yang sampai ke pemanggilnya.
- **AC-3** IF percobaan kedua juga ditolak transport, THEN Caraka shall
  melemparkan galat `unreachable` channel itu, tepat satu kali.
- **AC-4** IF sebuah permintaan dijawab galat Bot API, THEN Caraka shall tidak
  mengulangnya.
- **AC-5** WHERE lebih dari satu channel mengulang galat transport, pengulangan
  itu shall datang dari satu fungsi, bukan satu salinan per channel.
- **AC-6** IF pesan progres sebuah tugas gagal terkirim, THEN sesi itu shall
  menjadi `failed`, bukan tetap `running`.
- **AC-7** IF pesan progres tidak pernah ada, THEN pembersihan di akhir run
  shall tetap berjalan dan tidak mencoba menghapusnya.

[issue #11]: https://github.com/CarakaDev/caraka/issues/11
