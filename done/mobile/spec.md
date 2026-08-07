# Spec — situs caraka.dev di layar telepon

**Slug:** `mobile` · **Tanggal:** 7 Agustus 2026
**Standar:** [`standards/ears.md`](../../standards/ears.md)
**Pekerjaan sebelumnya:** [`../site-caraka-dev/`](../site-caraka-dev/)

---

## 1. Latar

Situs tayang di `caraka.dev` dengan kesetiaan penuh pada mockup di lebar desktop. Mockup itu tidak pernah menggambar layar telepon: seluruh perilaku responsifnya adalah empat aturan yang **menyembunyikan** sesuatu, tanpa satu pun yang menggantikannya.

```
@media (max-width: 1040px) { [data-toc]      { display: none } }
@media (max-width: 1080px) { [data-toc]      { display: none } }
@media (max-width:  940px) { [data-rail]     { display: none } }
@media (max-width:  620px) { [data-navlinks] { display: none } }
```

Rel kanan punya pengganti — bilah kemajuan atas muncul di bawah 941px. Tiga sisanya tidak.

Diukur pada 375px, 390px, dan 412px:

| Cacat | Halaman | Akibat |
|---|---|---|
| Header meluber 82–141px | tujuh halaman | `GitHub` tidak terjangkau di semuanya; `Story` dan `Install` hilang di tiga halaman |
| Daftar isi disembunyikan | `/docs` `/install` `/security` `/brand/ui-kit` | 6–13 tautan dalam-halaman hilang tanpa pengganti |
| Nav landing disembunyikan | `/` | Docs, Install, Compare, Security hanya lewat footer |
| Kanvas lebar tetap 1200px | `/brand` `/brand/warna` | meluber 810px; halaman praktis tidak terpakai |
| Sasaran ketuk di bawah 44px | semua | 10–18 per halaman |

Dua halaman terakhir berbeda sifatnya: keduanya digambar sebagai **papan referensi kanvas tetap**, bukan halaman yang mengalir. Tidak ada satu pun `min()` atau `clamp()` pada shell-nya, sementara halaman lain memakai `width: min(1120px, 100%)`.

## 2. Ruang lingkup

Perilaku telepon untuk kesebelas rute, dari 320px ke atas.

Mockup tetap sumber kebenaran untuk **bahasa visual**: warna, tipografi, radius, kurva easing, dan kosakata gerak diambil dari sana dan dari `docs/brand.md`. Yang dirancang di sini hanya tata letak untuk lebar yang tidak pernah digambar.

## 3. Yang tidak dikerjakan

- **Rendering desktop tidak berubah sedikit pun.** Di 1440px setiap halaman harus tetap identik dengan mockup-nya, termasuk tinggi dokumen. Ini batasan paling keras di dokumen ini.
- Tidak ada framework UI, dan tidak ada pustaka menu.
- Tidak ada tata letak khusus tablet. Satu titik potong memisahkan telepon dari desktop, kecuali daftar isi yang sudah punya titik potongnya sendiri di mockup.
- Tidak ada gestur geser, tidak ada bilah navigasi bawah, tidak ada pola khas aplikasi. Ini situs.
- Rel kanan tetap disembunyikan di bawah 941px. Mockup sudah memutuskan itu dan penggantinya sudah ada.

## 4. Acceptance criteria

### AC-1 · Tanpa luberan

- **AC-1.1** WHILE lebar viewport paling kecil 320px, situs shall menjaga `scrollWidth` elemen akar tidak melebihi `clientWidth`-nya di setiap rute.
- **AC-1.2** IF sebuah elemen lebih lebar dari viewport karena memang harus — tabel, blok kode, papan referensi — THEN situs shall menempatkannya di dalam wadah yang menggulir sendiri, bukan meluberkan halaman.
- **AC-1.3** WHERE sebuah wadah menggulir mendatar, situs shall menandainya secara visual agar tidak terbaca sebagai isi yang terpotong.

### AC-2 · Navigasi terjangkau

- **AC-2.1** WHILE lebar viewport di bawah 941px, setiap halaman shall menyediakan tombol menu di header yang membuka seluruh tautan navigasi halaman itu.
- **AC-2.2** WHEN menu terbuka, situs shall menampilkan setiap tautan yang ada di header desktop halaman itu, tanpa kecuali.
- **AC-2.3** WHEN pengunjung menekan `Escape` selagi menu terbuka, situs shall menutupnya.
- **AC-2.4** WHILE menu terbuka, situs shall mencegah isi di belakangnya ikut tergulir.
- **AC-2.5** Tombol menu shall menyatakan keadaan buka-tutupnya kepada pembaca layar.
- **AC-2.6** WHILE lebar viewport paling kecil 941px, situs shall menyembunyikan tombol menu dan menampilkan header desktop apa adanya.

### AC-3 · Daftar isi di telepon

- **AC-3.1** WHERE sebuah halaman punya daftar isi, WHILE daftar itu disembunyikan oleh titik potong mockup, situs shall menyediakan daftar yang sama dalam bentuk terlipat di atas isi halaman.
- **AC-3.2** Daftar terlipat shall memuat setiap butir yang ada di daftar isi desktop, dengan nomor dan judul yang sama.
- **AC-3.3** WHEN sebuah butir ditekan, situs shall menggulir ke bagian itu dengan sasaran berada di bawah header tetap.
- **AC-3.4** Daftar terlipat shall tertutup saat halaman dimuat.

### AC-4 · Papan brand mengalir

- **AC-4.1** WHILE lebar viewport di bawah 941px, `/brand` dan `/brand/warna` shall menyusun isinya dalam satu kolom selebar viewport.
- **AC-4.2** Situs shall mempertahankan setiap nilai warna, nama nada, angka kontras, dan keterangan yang ada di papan versi desktop.
- **AC-4.3** Situs shall mempertahankan koreksi optis aksara `translateY(17.5%)` di setiap ukuran lambang.
- **AC-4.4** WHERE sebuah spesimen hanya bermakna pada ukuran aslinya — kisi konstruksi, deret ukuran mark, uji buta warna — situs shall menempatkannya di wadah yang menggulir mendatar alih-alih mengecilkannya.

### AC-5 · Sasaran ketuk

- **AC-5.1** Setiap tautan dan tombol shall punya area ketuk paling kecil 44×44 px pada viewport telepon.
- **AC-5.2** Situs shall memenuhi AC-5.1 tanpa mengubah ukuran teks atau jarak antar elemen yang terlihat di desktop.

### AC-6 · Desktop tidak bergerak

- **AC-6.1** WHILE lebar viewport 1440px, setiap rute shall punya tinggi dokumen yang sama persis dengan mockup-nya.
- **AC-6.2** IF sebuah perubahan menggeser tinggi dokumen desktop satu piksel pun, THEN gerbang verifikasi shall gagal.

## 5. Selesai bila

Kesebelas rute lolos AC-1 sampai AC-5 pada 320px, 375px, 390px, dan 412px; AC-6 tetap hijau; dan gerbang verifikasi penuh lolos di chromium, firefox, dan webkit.
