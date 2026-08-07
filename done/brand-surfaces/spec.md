# Spec — permukaan merek: lambang, kartu OG, README, profil org

**Slug:** `brand-surfaces` · **Tanggal:** 7 Agustus 2026
**Standar:** [`standards/ears.md`](../../standards/ears.md)
**Pekerjaan sebelumnya:** [`../site-caraka-dev/`](../site-caraka-dev/) · [`../mobile/`](../mobile/)

---

## 1. Latar

Comp diperbarui dan membawa satu aturan baru di `docs/brand.md`, **Ukuran minimum lambang**:

> Di bawah 48px, cincin dilepas dan lambang menjadi kotak padat. Cincin setipis 1px hilang atau berubah jadi bubur piksel. Header dan footer situs karena itu memakai kotak padat, bukan varian bercincin.
>
> Satu pengecualian: indikator gerak ∞ boleh dipakai di bawah 48px, karena ia komponen *loading*, bukan lambang identitas.

Situs melanggarnya di setiap halaman: lockup header memakai dua cincin 21px, dan tiga footer memakai cincin 25–26px. Kesepuluh comp sudah diperbaiki; halaman Astro-nya belum.

Bersamaan dengan itu datang tiga hal yang belum pernah ada:

- **`Caraka OG Images.dc.html`** — spesifikasi kartu Open Graph. Generator yang ada ditulis sebelum comp ini dan tidak menyerupainya.
- **`Caraka README.dc.html`** dengan `assets/banner.svg` dan `assets/flow.svg` — desain README repositori dan profil organisasi.
- **`org-profile/README.md`** — isi halaman depan `github.com/CarakaDev`.

## 2. Keadaan yang menentukan isi

`v0.1` sudah nyata. Diverifikasi langsung, bukan diasumsikan: `npm run typecheck` bersih, enam unit test lulus (pengikatan approval, pemecah pesan Telegram, retry 429 dengan fallback, penanganan rahasia), dan satu e2e lulus — *"private allowlisted Telegram message reaches Claude and signed approval returns once"*.

README di comp masih menulis "pre-alpha, nothing useful to install yet". Itu sudah tidak benar. Desain visualnya dipakai utuh; kalimat statusnya mengikuti implementasi yang jalan.

## 3. Ruang lingkup

Lambang di seluruh permukaan, kartu OG untuk sebelas rute, README repositori dalam dua bahasa, dan README profil organisasi.

## 4. Yang tidak dikerjakan

- Tidak ada perubahan pada cincin di tempat yang memang besar: spesimen logo book, lambang hero landing 286px, dan indikator gerak ∞ yang dikecualikan `docs/brand.md`.
- Tidak ada `<picture>` dua berkas untuk tema terang dan gelap. Kartu SVG sudah gelap di kedua tema GitHub.
- Tidak ada perubahan pada `src/`, `test/`, atau `docs/` milik implementasi v0.1. Itu pekerjaan berjalan milik orang lain.

## 5. Acceptance criteria

### AC-1 · Ukuran minimum lambang

- **AC-1.1** WHERE lambang dirender di bawah 48px, situs shall memakai varian kotak padat: aksara ꦕ di kotak kesumba, tanpa cincin.
- **AC-1.2** Setiap lockup header shall identik dengan lockup header comp-nya, karakter per karakter.
- **AC-1.3** Lockup footer landing, kolofon Sistem Warna, dan kolofon Brandkit shall identik dengan comp-nya masing-masing.
- **AC-1.4** WHERE sebuah lambang berukuran 48px atau lebih, situs shall mempertahankan varian bercincin.
- **AC-1.5** Indikator gerak ∞ shall mempertahankan cincinnya di ukuran berapa pun, karena ia komponen *loading*, bukan lambang identitas.
- **AC-1.6** Setiap aksara shall membawa `transform: translateY(17.5%)` pada setiap ukuran.

### AC-2 · Kartu Open Graph

- **AC-2.1** Setiap rute shall punya satu kartu 1200×630 miliknya sendiri.
- **AC-2.2** Judul kartu shall diset 58px dan tidak pernah lebih dari dua baris.
- **AC-2.3** IF sebuah judul tidak muat dalam dua baris pada 58px, THEN judulnya yang dipendekkan, bukan ukuran hurufnya yang dikecilkan.
- **AC-2.4** Situs shall menjaga area 72px di setiap tepi kartu bebas dari teks, glif, dan motif.
- **AC-2.5** Setiap kartu shall membawa bilah bab di tepi atas yang terisi sesuai posisi halaman dalam urutan situs.
- **AC-2.6** Motif kartu shall mengulang isi halaman dan tidak membawa informasi yang tidak ada di halamannya.
- **AC-2.7** Setiap kartu shall memuat tepat tiga fakta mono di kaki kolom teks.
- **AC-2.8** IF sebuah karakter pada kartu berada di luar subset font yang dimuat generator, THEN gerbang verifikasi shall gagal.
- **AC-2.9** WHERE sebuah motif tidak dapat digambar setia oleh satori, situs shall menggambar pendekatan terdekat dan mencatat penyederhanaannya; ia tidak boleh mengosongkan kolom motif.

### AC-3 · README

- **AC-3.1** README shall memakai banner, badge, dan baris navigasi dari comp.
- **AC-3.2** README shall menyatakan status yang sama dengan keadaan kode: pratinjau v0.1, bukan pra-alfa.
- **AC-3.3** README shall tidak menyatakan kemampuan yang tidak ada di v0.1 sebagai sudah berjalan. Memori, grup, service latar, lampiran, dan coding agent selain Claude Code termasuk di dalamnya.
- **AC-3.4** Setiap tautan relatif di README shall menunjuk ke berkas yang ada.
- **AC-3.5** Situs shall menyertakan diagram alur versi teks polos di dalam `<details>`, karena npm tidak merender gambar berpath relatif.
- **AC-3.6** Rujukan gambar shall memakai path relatif, bukan URL ke host lain — GitHub menyajikan path relatif dari origin-nya sendiri, sedangkan URL luar dilewatkan proksi gambarnya.
- **AC-3.7** README bahasa Indonesia shall membawa isi yang setara, bukan terjemahan setengah.

### AC-4 · Aset

- **AC-4.1** Berkas aset shall disimpan tanpa akhiran `.txt`.
- **AC-4.2** Aset SVG shall tidak memuat aksara sebagai teks hidup.
- **AC-4.3** README profil organisasi shall berada di `profile/README.md` pada repositori bernama persis `.github`.

### AC-5 · Tidak ada regresi

- **AC-5.1** Berkas di `site/src/styles/pages/` shall tetap identik byte demi byte dengan blok `<style>` comp-nya.
- **AC-5.2** WHILE lebar viewport 1440px, setiap rute shall mempertahankan tinggi dokumen yang sudah tercatat.
- **AC-5.3** Gerbang verifikasi penuh shall tetap hijau di lima proyek peramban.

## 6. Selesai bila

Kesebelas kartu OG tayang, lambang benar di setiap permukaan, kedua README dan profil org terpasang, dan gerbang verifikasi hijau.
