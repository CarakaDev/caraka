# Spec — ci-bangun-dulu: gerbang membangun sebelum menguji

**Status:** selesai · **Tanggal:** 13 Agustus 2026

## Latar

`npm test` gagal di GitHub Actions dan lolos di mesin pengembang. Yang gagal
satu test, `whatsapp costs no dependency either, and baileys is one import
deeper`, dan yang dilaporkannya bukan dependensi:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
'/home/runner/work/caraka/caraka/dist/cli.js'
imported from /home/runner/work/caraka/caraka/bin/caraka.mjs
```

Test itu menjalankan biner yang benar-benar diterbitkan, dan alasannya tercatat
di dalamnya (`test/unit.test.ts:2696-2700`): 1.1.1 terbit mengumumkan dirinya
1.1.0 karena versi adalah salinan kedua di `src/cli.ts`, jadi sejak 1.1.2 versi
dibaca dari manifes dan sebuah test menjalankan `bin/caraka.mjs --version` untuk
membuktikan pembacaan itu. `bin/caraka.mjs` berisi satu baris yang mengimpor
`../dist/cli.js`, dan `dist/` ada di `.gitignore`.

Runner tidak pernah membangun. Urutan gerbang di `package.json` menaruh
`npm run build` **sesudah** `npm test`, dan job `verify` di
`.github/workflows/ci.yml` menyalin urutan itu langkah demi langkah tanpa
membangun sama sekali. Jadi test yang dirancang untuk menangkap versi yang
salah tidak pernah sampai membaca versi: ia mati di modul yang tidak ada.

Di mesin pengembang test yang sama lolos, dan itu bagian yang paling perlu
diperbaiki. Ia lolos karena `dist/` masih tergeletak dari build sebelumnya,
yang berarti hasil gerbang di mesin itu bergantung pada sisa pekerjaan lama.
Gerbang yang jawabannya berbeda tergantung isi direktori yang tidak dilacak
bukan gerbang.

Kegagalan ini direproduksi apa adanya pada 13 Agustus 2026 dengan memindahkan
`dist/` ke samping dan menjalankan test itu sendiri; pesan yang keluar identik
dengan yang dilaporkan runner. Keluarannya ada di plan.

## Ruang lingkup

Satu baris di `package.json` (skrip `verify`) dan satu langkah di
`.github/workflows/ci.yml` (job `verify`), beserta komentar yang menjelaskan
kenapa langkah itu ada di posisi itu.

## Yang tidak dikerjakan

- Test yang gagal tidak diubah, tidak dilonggarkan, dan tidak dipindahkan ke
  jalur yang tidak menjalankan biner. Yang ditangkapnya adalah kelas kesalahan
  yang sudah pernah terbit sekali.
- `dist/` tidak dilacak git. Artefak build di dalam repositori publik adalah
  diff yang tidak dibaca siapa pun.
- `pretest` tidak dipakai, meski tidak dilarang — yang dilarang hanya
  `preinstall`, `install`, dan `postinstall` (`test/unit.test.ts:1399`). Sebuah
  hook `pretest` membangun ulang di setiap `npm test`, termasuk untuk 112 test
  yang tidak menyentuh `dist/`, dan menyembunyikan ketergantungan di tempat yang
  tidak dibaca orang saat membaca gerbang.
- Job `site`, `presets`, dan `audit` tidak disentuh. Tidak satu pun menjalankan
  `npm test` di akar.
- Urutan `scan:secrets` di paling depan tidak digeser.

## Acceptance criteria

- **AC-1** Skrip `verify` shall menjalankan `npm run build` sebelum `npm test`.
- **AC-2** Job `verify` di `.github/workflows/ci.yml` shall menjalankan
  `npm run build` sebelum langkah `npm test`.
- **AC-3** WHEN gerbang dijalankan pada checkout yang tidak memiliki `dist/`,
  gerbang shall lolos tanpa langkah manual.
- **AC-4** WHILE `dist/` tertinggal dari build sebelumnya, gerbang shall
  membangun ulang sebelum menguji, sehingga hasilnya tidak dibaca dari sisa
  build lama.
- **AC-5** Test yang membaca versi tercetak shall tetap menjalankan
  `bin/caraka.mjs` sebagai proses dan membandingkan keluarannya dengan
  `package.json`.
- **AC-6** IF `npm run build` gagal, THEN gerbang shall berhenti di langkah itu
  dan tidak menjalankan `npm test`.
