# Spec — awal-dingin: satu permintaan yang jatuh saat boot tidak boleh membatalkan start

**Status:** selesai · **Tanggal:** 19 Agustus 2026

## Latar

Dilaporkan dari luar sebagai [issue #12], dari VPS yang baru saja dinyalakan.
`npx caraka init` berhenti dengan satu kalimat:

```
Telegram deleteWebhook could not be reached.
```

Percobaan pertama sampai kedua gagal; sesudah kira-kira lima kali init diulang,
ia lolos dan sesudah itu stabil selamanya. Kalimatnya tidak pernah muncul lagi
saat polling berjalan.

Yang penting dari laporan itu bukan `deleteWebhook`-nya, melainkan panggilan
tepat sebelumnya. `init` memanggil `getMe()` lebih dulu dan menjawab
`cli.tokenRejected` bila ia gagal. Pelapor tidak melihat kalimat itu, jadi
`getMe` berhasil dan `deleteWebhook` yang menyusul dua ratus milidetik kemudian
gagal dua kali berturut-turut. Transport yang goyah sesaat, bukan jaringan yang
mati dan bukan token yang salah — bentuk yang sama persis dengan yang diukur
pelapor [issue #11]: empat `ECONNRESET` dalam tiga puluh panggilan, masing-masing
setelah 420–466 md.

Dua hal membuat kegoyahan itu berakhir sebagai proses yang berhenti.

1. **Tangga ulangnya cuma dua anak.** `retrySend` (`src/core/channel.ts`)
   mencoba sekali, tidur 500 md, lalu mencoba sekali lagi dan menyerah. Sebuah
   burst `ECONNRESET` yang berlangsung lebih lama dari 500 md memakan kedua
   percobaan itu. Angka 500 md dan satu percobaan ulang dipilih pada
   `transport-goyah` untuk jalur *run*, tempat percobaan yang ditulis dua kali
   berarti satu baris progres ganda; ia tidak pernah diukur untuk jalur boot.

2. **`deleteWebhook` mematikan start, padahal poller sudah tahan.**
   `Telegram.start()` memanggil `deleteWebhook`, dan lemparan dari sana naik ke
   `Gateway.run()` yang membungkusnya jadi `channel.startFailed` dan mengakhiri
   proses. Satu baris di bawahnya, `getMe()` sudah `.catch(() => undefined)`
   dengan alasan yang sama berlakunya di sini. Dan `Telegram.updates()` sudah
   menelan galat transport, tidur 2 detik, lalu mengulang selamanya: jaringan
   yang datang terlambat sembuh sendiri di sana, kalau saja prosesnya masih
   hidup untuk menyambutnya.

Webhook yang tertinggal tetap punya akibat, dan akibat itu terbaca: `getUpdates`
menjawab 409, `updates()` melempar 409 apa adanya, dan `caraka start` berhenti
dengan kalimat 409 milik Telegram serta exit code 78. Jadi menelan kegagalan
`deleteWebhook` tidak menyembunyikan webhook yang sungguh ada, ia hanya berhenti
membunuh proses karena satu paket yang hilang.

## Ruang lingkup

Tangga ulang bersama di `src/core/channel.ts`, satu baris di
`Telegram.start()`, dan kalimat yang dibaca orang saat `init` benar-benar tidak
bisa menjangkau jaringan.

## Yang tidak dikerjakan

- **Bukan tangga tak terbatas.** `retrySend` tetap menyerah, dan anggarannya
  tetap dalam hitungan detik. Transport yang mati bukan transport yang goyah,
  dan mengulanginya selamanya cuma memindahkan gantungnya ke tempat lain.
- **Bukan retry khusus `deleteWebhook`.** Yang goyah adalah transportnya, bukan
  metodenya; cabang per metode akan menaruh pengetahuan satu channel di dalam
  helper bersama.
- **Bukan penundaan start sampai jaringan siap.** Menunggu di `start()` berarti
  `caraka start` menggantung tanpa kalimat pada mesin yang memang tidak punya
  jalan keluar. Poller yang sudah ada mengerjakan penantian itu sambil tetap
  bisa dihentikan dengan Ctrl-C.
- **Bukan `init` yang menelan kegagalan `deleteWebhook`.** Sesudah itu `init`
  menunggu pairing lewat `getUpdates` selama lima menit; menelan kegagalannya
  berarti menukar satu kalimat cepat dengan lima menit diam.

## Acceptance criteria

### AC-1 · Tangga ulang

- **AC-1.1** WHEN sebuah kiriman melempar, `retrySend` shall mencobanya lagi
  sampai tiga percobaan seluruhnya.
- **AC-1.2** WHEN `retrySend` menunda sebuah percobaan, ia shall menunggu 500 md
  sebelum percobaan kedua dan 1.500 md sebelum percobaan ketiga.
- **AC-1.3** IF ketiga percobaan melempar, THEN `retrySend` shall melempar galat
  dari percobaan terakhir.
- **AC-1.4** WHILE `signal` sudah aborted, WHEN sebuah kiriman melempar,
  `retrySend` shall melemparkannya tanpa percobaan kedua.
- **AC-1.5** WHEN sebuah kiriman menjawab, `retrySend` shall mengembalikan
  jawaban itu tanpa mencoba lagi, apa pun isi jawabannya.

### AC-2 · Start yang tidak dibunuh satu paket

- **AC-2.1** IF `deleteWebhook` gagal saat `Telegram.start()`, THEN start shall
  tetap selesai dan poller shall tetap dijalankan.
- **AC-2.2** WHEN `getUpdates` menjawab 409 karena webhook masih terpasang,
  Telegram shall melempar galat 409 itu apa adanya, seperti sebelumnya.

### AC-3 · Kalimat yang menyebut langkah berikutnya

- **AC-3.1** IF `deleteWebhook` tidak dapat dijangkau saat `caraka init`, THEN
  `init` shall berhenti dengan kalimat yang menyebut jaringan dan menyuruh
  menjalankan `caraka init` lagi.
- **AC-3.2** Kalimat AC-3.1 shall ada di kedua katalog bahasa.
