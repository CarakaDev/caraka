# Spec — situs caraka.dev

**Slug:** `site-caraka-dev` · **Tanggal:** 7 Agustus 2026
**Standar:** [`standards/ears.md`](../../standards/ears.md)

---

## 1. Latar

Nama `caraka` sudah terkunci di tiga namespace (domain, npm, org GitHub) tetapi `caraka.dev` belum mengarah ke apa pun. Proyek ini pra-alfa: spesifikasinya lengkap dan publik, implementasinya belum dimulai. Perangkat lunak yang mengeksekusi perintah di mesin orang lain dijual oleh kepercayaan, dan kepercayaan dibangun dengan menunjukkan spesifikasi sebelum menunjukkan rilis.

Sepuluh mockup di `design/mockups/*.dc.html` sudah selesai: setiap warna, jarak, animasi, dan seluruh isi daftar sudah ditetapkan. Isinya tidak ada di markup — ia ada di blok `<script data-dc-script>` di kaki tiap berkas, dikembalikan oleh `renderVals()`. Pekerjaan ini transkripsi, bukan penulisan konten.

## 2. Ruang lingkup

Situs statis di `caraka.dev`, sepuluh halaman, dibangun dengan Astro, di-deploy sebagai aset statis Cloudflare.

Mockup adalah sumber kebenaran visual. Adaptasinya harus utuh: markup, gaya inline, keyframe, dan animasi yang digerakkan gulir ikut semua.

## 3. Yang tidak dikerjakan

- Tidak ada CMS, tidak ada konten yang di-*fetch* saat runtime, tidak ada adapter server.
- Tidak ada analitik, tidak ada cookie, tidak ada tag pihak ketiga.
- Tidak ada halaman dalam dua bahasa sekaligus. Setiap halaman memakai bahasa yang sudah dipakai mockup-nya.
- Tidak ada framework UI (React, Vue, Svelte). Mockup tidak membutuhkannya.
- Tidak ada dokumentasi yang di-*render* dari `docs/*.md` ke situs pada iterasi ini. Halaman `/docs` adalah halaman ikhtisar yang menautkan ke repositori.

## 4. Acceptance criteria

### AC-1 · Kesetiaan pada mockup

- **AC-1.1** Situs shall menyajikan sepuluh rute: `/`, `/docs`, `/install`, `/compare`, `/security`, `/status`, `/story`, `/brand`, `/brand/warna`, `/brand/ui-kit`.
- **AC-1.2** Setiap halaman shall memuat himpunan `@keyframes` milik mockup-nya sendiri, dengan nilai persis seperti di mockup.
- **AC-1.3** WHERE sebuah nama keyframe dipakai di lebih dari satu mockup dengan nilai berbeda, situs shall menjaga tiap halaman memakai nilai versinya sendiri.
- **AC-1.4** Situs shall menerjemahkan setiap atribut `style-hover` di mockup menjadi aturan `:hover` yang menghasilkan deklarasi yang sama persis.
- **AC-1.5** Situs shall memakai keluarga font `Public Sans`, `JetBrains Mono`, dan `Noto Sans Javanese` dengan nama persis seperti yang tertulis di gaya inline mockup.

### AC-2 · Gerak

- **AC-2.1** WHERE peramban mendukung `animation-timeline: view()`, situs shall menganimasikan elemen yang memakainya seiring gulir, dengan `animation-range` seperti di mockup.
- **AC-2.2** WHERE peramban tidak mendukungnya, situs shall menampilkan elemen tersebut dalam keadaan akhirnya — terlihat, dengan `opacity: 1`.
- **AC-2.3** WHILE peramban melaporkan `prefers-reduced-motion: reduce`, situs shall memangkas durasi animasi menjadi 0,001 md dan membatasi pengulangan menjadi satu.
- **AC-2.4** WHEN halaman digulir, situs shall menetapkan `--ck-sp` ke rasio posisi gulir terhadap jarak gulir maksimum, dibulatkan ke rentang 0..1.
- **AC-2.5** WHILE halaman digulir, situs shall menulis `--ck-sp` paling banyak sekali per bingkai.
- **AC-2.6** IF tinggi dokumen tidak melebihi tinggi viewport, THEN situs shall menetapkan `--ck-sp` ke `0` dan tidak membaginya dengan nol.

### AC-3 · Tombol salin

- **AC-3.1** WHEN pengunjung menekan elemen ber-`data-copy`, situs shall menyalin nilai atribut itu ke papan klip.
- **AC-3.2** WHEN penyalinan berhasil, situs shall mengubah label menjadi `COPIED` berwarna `#8EEE98`, lalu mengembalikannya setelah 1,8 detik — jeda yang dipakai ketiga mockup bertombol salin.
- **AC-3.3** IF papan klip ditolak peramban, THEN situs shall mengubah label menjadi `FAILED` berwarna `#FF93B2` dan tidak menampilkan galat lain.

### AC-4 · Identitas & berbagi

- **AC-4.1** Situs shall menyediakan favicon dalam varian mark padat: aksara ꦕ di kotak kesumba `#E2452C`, tanpa cincin.
- **AC-4.2** Setiap aset gambar yang diekspor shall memuat aksara sebagai `path`, tidak pernah sebagai elemen `text`.
- **AC-4.3** Setiap halaman shall punya gambar Open Graph 1200×630 miliknya sendiri, dengan judul halaman itu.
- **AC-4.4** IF sebuah teks pada gambar Open Graph memuat karakter di luar subset font yang dimuat generator, THEN gerbang verifikasi shall gagal.
- **AC-4.5** Setiap halaman shall menyatakan `canonical`, `og:*`, dan `twitter:*` yang menunjuk ke rute halaman itu sendiri.

### AC-5 · Akses

- **AC-5.1** Setiap halaman shall menyediakan tautan lewati-ke-konten yang muncul saat menerima fokus papan ketik.
- **AC-5.2** Setiap elemen yang bisa difokus shall menampilkan indikator fokus yang terlihat.
- **AC-5.3** WHEN sebuah tautan jangkar diikuti, situs shall memposisikan sasaran di bawah header tetap, bukan di belakangnya.
- **AC-5.4** Situs shall tidak memakai warna sebagai satu-satunya pembawa informasi status; setiap status membawa glifnya (`▸ ⏸ ✓ ✗ ⊘`).

### AC-6 · Isi

- **AC-6.1** Setiap `sc-for` di mockup shall dirender dari data yang ditranskripsi apa adanya dari `renderVals()` mockup itu: baris yang sama, urutan yang sama, string yang sama.
- **AC-6.2** Situs shall tidak menyatakan satu pun kemampuan sebagai sudah berjalan. Status yang benar adalah pra-alfa.
- **AC-6.3** Situs shall tidak memuat angka, tanggal, versi, atau kutipan yang tidak ada di `docs/`.

### AC-7 · Keamanan rilis

- **AC-7.1** Repositori shall tidak memuat token, kunci API, atau pengenal akun Cloudflare.
- **AC-7.2** Proses deploy shall membaca akun tujuan dari lingkungan, bukan dari berkas yang di-commit.
- **AC-7.3** IF sebuah berkas yang cocok dengan pola rahasia muncul di indeks git, THEN gerbang verifikasi shall gagal.

## 5. Selesai bila

Sepuluh rute tayang di `caraka.dev` lewat HTTPS, gerbang verifikasi hijau, dan kedua repositori `CarakaDev` publik.
