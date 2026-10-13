# Spec — aplikasi Android Caraka

**Slug:** `android-app` · **Tanggal:** 13 Oktober 2026
**Standar:** [`standards/ears.md`](../../standards/ears.md)
**Desain:** kanvas "Caraka — Android" (11 artboard), dipakai sebagai sumber bahasa visual.

---

## 1. Latar

Web/PWA sejak v1.6 menghubungkan satu peramban ke Caraka lewat `docs/web-api.md`. Di Android, PWA bergantung pada peramban: sesi kadang hilang saat tab ditutup, berkas tidak bisa dibuka dengan aplikasi lain, dan pemindaian pairing tidak ada.

Aplikasi ini adalah **klien native untuk API yang sudah ada**. Ia tidak menambah bridge baru, karena Caraka sudah bridge-nya.

## 2. Ruang lingkup

- Kode di `android/`: Kotlin 2.4, Jetpack Compose, satu modul `app`, `minSdk 26`, `targetSdk 36`.
- Nama paket `dev.caraka.android`. Nama aplikasi "Caraka".
- Layar: Splash, Sambungkan mesin, Sesi, Percakapan, Kartu izin, Penampil berkas, Perangkat & koneksi.
- Bahasa UI: Inggris dan Indonesia. Bahasa mengikuti field `language` dari `/api/state`.
- Varian build `demo` berisi data contoh, hanya untuk tangkapan layar. Varian ini tidak pernah diunggah ke Play.

## 3. Yang tidak dikerjakan

- **Tidak ada perubahan di `src/`.** Semua yang dipakai aplikasi sudah ada di Web API.
- **Rutin dan MCP & Skills dari mockup tidak dibangun.** API tidak menyediakannya, dan `AGENTS.md` menolak fitur yang sudah dimiliki coding agent.
- **Blok reasoning dan kartu tool per langkah tidak dibangun.** API hanya mengirim teks pesan yang tumbuh lewat `editText`. Aplikasi menampilkan status sesi dan teks yang tumbuh.
- **Tidak ada notifikasi push.** Web push memakai VAPID untuk peramban. Push native butuh FCM dan perubahan server.
- Tidak ada akun, login, atau server pihak ketiga. Aplikasi hanya bicara ke origin milik pengguna.

## 4. Acceptance criteria

### AC-1 · Pairing

- **AC-1.1** WHEN pengguna menempel tautan berbentuk `ORIGIN/#pair=CODE`, aplikasi shall memisahkan origin dan kode tanpa mengirim apa pun.
- **AC-1.2** WHEN pengguna memindai kode QR yang berisi tautan itu, aplikasi shall memperlakukannya sama dengan tautan yang ditempel.
- **AC-1.3** WHEN pengguna menekan Sambungkan, aplikasi shall mengirim `POST /api/pair` dengan header `Origin` sama persis dengan origin.
- **AC-1.4** IF origin bukan `https://`, THEN aplikasi shall menolak sebelum mengirim, kecuali host-nya loopback atau `10.0.2.2` pada build debug.
- **AC-1.5** IF server menjawab selain 200, THEN aplikasi shall menampilkan satu kalimat yang menyuruh pengguna membuat kode baru.
- **AC-1.6** WHEN pairing berhasil, aplikasi shall menyimpan cookie `caraka_device` dan origin di penyimpanan terenkripsi.

### AC-2 · Sesi dan pesan

- **AC-2.1** WHILE aplikasi di depan, aplikasi shall menjaga satu langganan `GET /api/events`.
- **AC-2.2** WHEN event `invalidate` tiba, aplikasi shall memuat ulang `/api/state` paling banyak sekali per 250 md.
- **AC-2.3** IF langganan putus, THEN aplikasi shall menyambung ulang dengan jeda bertambah sampai 30 detik dan menandai status "Menyambung ulang".
- **AC-2.4** IF server menjawab 401, THEN aplikasi shall menghapus cookie dan kembali ke layar Sambungkan mesin.
- **AC-2.5** Aplikasi shall menampilkan glyph status sesi dari `src/core/status.ts` di samping warnanya.
- **AC-2.6** WHEN pengguna mengirim pesan, aplikasi shall memakai `clientId` acak yang sama pada setiap percobaan ulang.
- **AC-2.7** WHEN pengguna menekan Hentikan, aplikasi shall mengirim `POST /api/stop`.

### AC-3 · Izin

- **AC-3.1** WHEN pesan membawa `buttons`, aplikasi shall menampilkan kartu izin dengan satu tombol per item.
- **AC-3.2** WHEN pengguna menekan tombol kartu, aplikasi shall mengirim `POST /api/callback` dengan `messageId` dan `buttonId`.
- **AC-3.3** IF callback menjawab 409, THEN aplikasi shall menandai kartu sebagai kedaluwarsa dan mematikan tombolnya.
- **AC-3.4** Aplikasi shall tidak pernah mengubah teks yang diketik pengguna menjadi keputusan izin.

### AC-4 · Animasi status

- **AC-4.1** WHILE sesi `running` dan pesan asisten terakhir belum berubah selama 1,5 detik, aplikasi shall menampilkan indikator mengetik.
- **AC-4.2** WHILE pesan asisten terakhir bertambah panjang, aplikasi shall menampilkan caret berkedip di ujungnya.
- **AC-4.3** WHILE sesi `awaiting_approval`, aplikasi shall menampilkan cincin berdenyut emas di header.
- **AC-4.4** WHILE sistem meminta animasi dikurangi, aplikasi shall menampilkan keadaan akhir tiap animasi tanpa gerak.

### AC-5 · Berkas

- **AC-5.1** WHEN pengguna memilih berkas sampai 20 MiB, aplikasi shall mengunggahnya ke `POST /api/files` lalu menyertakan id-nya pada pesan.
- **AC-5.2** IF berkas lebih dari 20 MiB, THEN aplikasi shall menolak sebelum mengunggah dan menyebut batasnya.
- **AC-5.3** Aplikasi shall menampilkan lampiran berdasarkan `mime`: gambar sebagai pratinjau, Markdown sebagai teks yang dirender, PDF per halaman, audio dan video dengan pemutar, lainnya sebagai kartu Simpan.
- **AC-5.4** WHEN pengguna membuka Markdown, aplikasi shall menyediakan tombol Tampilan dan Sumber.
- **AC-5.5** Aplikasi shall mengunduh lampiran hanya lewat rute berkas yang memakai cookie perangkat.

### AC-6 · Keamanan

- **AC-6.1** Aplikasi shall menolak lalu lintas cleartext pada build rilis.
- **AC-6.2** Aplikasi shall tidak menulis teks pesan, cookie, atau origin ke log.
- **AC-6.3** WHEN pengguna menekan Putuskan, aplikasi shall mengirim `POST /api/logout` lalu menghapus semua data lokal.
- **AC-6.4** Aplikasi shall mematikan backup otomatis Android untuk data aplikasi.

## 5. Pembuktian

- Unit test JVM untuk parser tautan, klien API (MockWebServer), dan pemetaan status.
- `./gradlew :app:testDebugUnitTest :app:lintRelease :app:bundleRelease` hijau di `rama-tuf`.
- Uji manual di emulator `rama-tuf` terhadap Caraka lokal: pairing, kirim pesan, kartu izin, unggah berkas.
- Telepon fisik dan origin Tailscale tetap uji manual milik pemilik.
