# Spec — product-hunt-hero

**Status:** berjalan · **Tanggal:** 9 September 2026

## Latar

Hero caraka.dev perlu menampilkan badge Featured Product Hunt agar pengunjung
dapat membuka halaman Product Hunt Caraka langsung dari area utama situs.

## Ruang lingkup

Tambahkan badge Product Hunt yang diberikan pengguna ke hero halaman `/`.
Badge harus membuka halaman Product Hunt di tab baru dan menampilkan alt text,
lebar, tinggi, serta URL gambar dari snippet yang diberikan.

## Yang tidak dikerjakan

- Tidak mengubah headline, CTA instalasi, statistik, warna, atau animasi hero.
- Tidak menambah dependensi atau JavaScript baru.
- Tidak mengubah halaman selain hero `/`.

## Acceptance criteria

- **AC-1** Situs shall menampilkan satu tautan Product Hunt di dalam hero `/`.
- **AC-2** WHEN pengunjung memilih badge Product Hunt, situs shall membuka URL
  Product Hunt Caraka di tab baru dengan rel `noopener noreferrer`.
- **AC-3** Situs shall menampilkan gambar badge dengan alt text Caraka yang
  diberikan, lebar `250`, tinggi `54`, dan URL gambar Product Hunt yang diberikan.
- **AC-4** WHEN gerbang situs dijalankan, pemeriksaan lint, typecheck, unit,
  build, dan e2e shall selesai tanpa kegagalan.
- **AC-5** WHEN situs dideploy, `https://caraka.dev/` shall merespons `200` dan
  HTML produksi shall memuat tautan Product Hunt.
