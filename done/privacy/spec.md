# Spec — kebijakan privasi Caraka

**Slug:** `privacy` · **Tanggal:** 13 Oktober 2026
**Standar:** [`standards/ears.md`](../../standards/ears.md)

---

## 1. Latar

Google Play meminta URL kebijakan privasi untuk aplikasi Android. Caraka juga belum punya kebijakan privasi tertulis untuk paket npm-nya. Satu halaman di `https://caraka.dev/privacy` menjawab keduanya.

Jawabannya pendek karena fakta dasarnya pendek: pengembang tidak menjalankan server, akun, atau analitik. Semua data pengguna berada di mesin pengguna sendiri.

## 2. Ruang lingkup

- `docs/privacy.md` (Inggris) dan `docs/privacy.id.md` (Indonesia): teks kebijakan.
- Rute `/privacy` di `site/`, yang membaca kedua berkas itu dan menampilkannya. Teks Inggris di atas, blok Indonesia di bawah pada halaman yang sama.
- Meta halaman, tautan dari footer beranda, dan baseline tinggi di e2e.

## 3. Yang tidak dikerjakan

- **Tidak ada perubahan di `src/`, `android/`, atau `assets/`.** Kebijakan menjelaskan perilaku yang sudah ada.
- **Tidak ada klaim yang tidak bisa dilacak ke `docs/`, `spec/android-app/`, atau `plan/android-app/store-listing.md`.** Kebijakan ini bukan nasihat hukum dan tidak menambah janji.
- **Tidak ada halaman kedua untuk bahasa Indonesia.** Rute tetap satu, supaya pola `lang="en"` situs tidak berubah.
- **Tidak ada deploy dan tidak ada pengiriman ke Play Console.** Keduanya keputusan pemilik.
- **Tidak ada pelacak persetujuan (cookie banner).** Situs tidak memasang cookie atau analitik.

## 4. Acceptance criteria

### AC-1 · Isi

- **AC-1.1** Kebijakan shall menyebut PT Global Raya Oris Wijaya sebagai pengembang dan pengendali, dan halo@caraka.dev sebagai kontak.
- **AC-1.2** Kebijakan shall menyatakan bahwa pengembang tidak mengumpulkan data dan tidak menerima analitik atau laporan crash.
- **AC-1.3** Kebijakan shall menyatakan bahwa aplikasi Android mengirim pesan, berkas, dan nama perangkat hanya ke server yang dipasangkan pengguna, dan bahwa build rilis hanya memakai HTTPS.
- **AC-1.4** Kebijakan shall menyatakan bahwa cookie pairing dan alamat server disimpan terenkripsi dengan Android Keystore, bahwa backup Android mati, dan bahwa Putuskan memanggil logout lalu menghapus semua data lokal.
- **AC-1.5** Kebijakan shall menyatakan bahwa pemindaian QR memakai Google code scanner di perangkat tanpa izin kamera, dan bahwa Google Play memproses data instalasi menurut kebijakan Google.
- **AC-1.6** Kebijakan shall menyatakan bahwa server Caraka pengguna menyimpan riwayat di SQLite lokal yang dikendalikan dan dapat dihapus pengguna, dan bahwa kanal chat mengikuti kebijakan penyedianya.
- **AC-1.7** Kebijakan shall memuat bagian anak-anak dan bagian perubahan, dan halaman shall menampilkan tanggal "Last updated" 13 Oktober 2026.

### AC-2 · Halaman

- **AC-2.1** WHEN pengunjung membuka `/privacy`, situs shall menjawab 200 dengan `lang="en"`, judul, deskripsi, URL kanonik, dan kartu OG halaman itu.
- **AC-2.2** Halaman shall menampilkan setiap bagian dari `docs/privacy.md` dan `docs/privacy.id.md` tanpa kalimat kebijakan yang ditulis di berkas `.astro`.
- **AC-2.3** IF berkas kebijakan memuat markdown di luar subset yang dibaca situs, THEN pembangunan shall gagal.
- **AC-2.4** Blok Indonesia shall berada di dalam elemen `lang="id"`.
- **AC-2.5** WHEN lebar viewport di bawah 1080px, halaman shall menyediakan daftar isi yang sama dengan sidebar.
- **AC-2.6** Halaman shall memuat bilah header yang menandai rutenya, tanpa meluap horizontal pada 320px.
- **AC-2.7** Beranda shall menautkan `/privacy` dari footernya.
