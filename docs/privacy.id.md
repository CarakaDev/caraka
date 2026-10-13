# Kebijakan privasi

**Produk:** Caraka, paket npm `caraka` dan aplikasi Android Caraka · **Terakhir diperbarui:** 13 Oktober 2026 · **English:** [privacy.md](privacy.md)

Caraka tidak punya akun, layanan cloud, atau server yang dijalankan pengembang. Halaman ini menjelaskan artinya bagi data Anda.

## Siapa kami

PT Global Raya Oris Wijaya (pengembang) membuat Caraka. Pengembang adalah pengendali data pribadi yang dicakup kebijakan ini. Untuk menghubungi pengembang, tulis ke [halo@caraka.dev](mailto:halo@caraka.dev).

## Yang dikumpulkan pengembang

Tidak ada. Paket `caraka` dan aplikasi Android tidak mengirim analitik atau laporan crash ke pengembang. Pengembang tidak dapat melihat pesan, berkas, atau alamat server Anda.

## Yang dikirim aplikasi Android

Aplikasi terhubung ke satu server: server Caraka yang Anda pasangkan. Server itu adalah instalasi Caraka milik Anda sendiri. Aplikasi mengirim pesan, berkas, dan nama perangkat Anda ke server itu. Aplikasi tidak mengirimnya ke tempat lain.

Build rilis hanya memakai HTTPS.

## Yang disimpan aplikasi Android

Aplikasi menyimpan cookie pairing dan alamat server di perangkat Anda. Android Keystore mengenkripsi keduanya. Backup Android dimatikan untuk aplikasi ini.

Saat Anda menekan Putuskan, aplikasi memanggil logout di server Anda. Lalu aplikasi menghapus semua data lokalnya.

## Kamera dan kode QR

Aplikasi tidak punya izin kamera. Untuk memindai kode QR pairing, aplikasi memakai Google code scanner dari Google Play services. Pemindai membaca gambar di perangkat Anda, dan Google tidak menyimpan gambar atau hasilnya. Google Play services dapat mengirim data diagnostik pemindai ke Google: model perangkat, versi Android, versi aplikasi, dan angka performa.

## Google Play

Google Play memproses data instalasi sesuai kebijakan privasi Google sendiri.

## Server Caraka Anda

Server Caraka berjalan di mesin Anda. Ia menyimpan riwayat sesi di database SQLite lokal, `~/.caraka/caraka.db`. Variabel `CARAKA_HOME` dapat menunjuk direktori lain.

Anda mengendalikan data ini dan dapat menghapusnya. Jalankan `caraka stop`, lalu hapus direktori datanya. Itu juga menghapus konfigurasi dan rahasia Anda.

## Kanal chat dan coding agent Anda

Telegram, Discord, dan WhatsApp bersifat opsional. Jika Anda menyambungkan salah satunya, pesan Anda melewati penyedia itu, dan kebijakan penyedia itu berlaku.

Caraka juga meneruskan pesan Anda ke coding agent di mesin Anda. Caraka tidak menyimpan API key untuk agent itu. Penyedia agent menetapkan aturan untuk data tersebut.

## Anak-anak

Caraka tidak ditujukan untuk anak di bawah 13 tahun, atau di bawah 18 tahun bila hukum menetapkan usia itu.

## Perubahan

Bagian atas halaman ini menampilkan tanggal pembaruan terakhir. Riwayat repositori mencatat setiap perubahan: [github.com/CarakaDev/caraka](https://github.com/CarakaDev/caraka/commits/main/docs/privacy.id.md).

## Kontak

[halo@caraka.dev](mailto:halo@caraka.dev)
