# Plan — ci-bangun-dulu

**Spec:** `spec.md` di direktori ini · **Tanggal:** 13 Agustus 2026

## Langkah

1. Reproduksi dulu, sebelum menyentuh apa pun. `dist/` dipindahkan ke samping,
   lalu test yang gagal dijalankan sendiri. Kalau pesannya tidak identik dengan
   yang dilaporkan runner, dugaan penyebabnya salah dan langkah 2 tidak boleh
   dikerjakan.
2. `package.json` — skrip `verify`: `npm run build` dipindah dari ujung ke
   antara `typecheck` dan `test`. Urutan penuhnya menjadi `scan:secrets`,
   `lint`, `typecheck`, `build`, `test`, `e2e`. `scan:secrets` tetap di depan.
3. `.github/workflows/ci.yml` — job `verify`: satu langkah `- run: npm run build`
   di antara `npm run typecheck` dan `npm test`, dengan komentar yang menyebut
   `bin/caraka.mjs`, `dist/` yang di-gitignore, dan kenapa test itu menjalankan
   biner sungguhan. CI menjalankan perintahnya satu per satu, bukan lewat
   `npm run verify`, jadi langkah 2 tidak menutupi langkah ini.
4. Gerbang dijalankan dari keadaan yang sama dengan runner: `rm -rf dist` lebih
   dulu, supaya yang diuji adalah checkout tanpa artefak dan bukan mesin ini.

## Pemetaan AC → pembuktian

| AC | Pembuktian |
|---|---|
| AC-1 | Baca skrip `verify` di `package.json`: `build` berada sebelum `test` |
| AC-2 | Baca job `verify` di `ci.yml`: langkah `npm run build` sebelum `npm test` |
| AC-3 | `rm -rf dist && npm run verify` lolos utuh; keluarannya di bawah |
| AC-4 | Skrip `build` membuka dengan `rmSync('dist')`, jadi setiap build menghapus lebih dulu; keluaran langkah `build` di bawah memperlihatkan baris itu |
| AC-5 | `test/unit.test.ts:2700` masih `execFileSync` atas `bin/caraka.mjs --version` dan masih membandingkan dengan `package.json`; diff pada test nol |
| AC-6 | `build` menjalankan `tsc`, dan `&&` di antara langkah membuat kegagalannya menghentikan rantai sebelum `test`. Diperlihatkan oleh langkah `typecheck` yang identik: keduanya `tsc` atas `tsconfig.json` yang sama |

## Risiko

Gerbang jadi lebih lambat satu build. Terukur: `tsc` atas proyek ini 4–6 detik,
terhadap gerbang yang sudah berjalan sekitar 40 detik, dan build itu memang
harus terjadi sebelum `npm publish` melalui `prepublishOnly` — jadi yang berubah
posisinya, bukan jumlahnya.

Risiko kedua, yang sebenarnya: memindahkan `build` ke depan membuat `test`
membaca `dist/` yang selalu segar, dan itu bisa menyembunyikan hal lain kalau
suatu hari ada test yang justru bergantung pada `dist/` lama. Tidak ada yang
seperti itu sekarang, dan kalau nanti ada, yang salah test-nya.

## Keluaran gerbang

Reproduksi, 13 Agustus 2026, `dist/` dipindahkan ke samping lalu satu test
dijalankan sendiri:

```
✖ whatsapp costs no dependency either, and baileys is one import deeper (24.65316ms)
  Error [ERR_MODULE_NOT_FOUND]: Cannot find module
  '/home/ramaaditya/Project/caraka/caraka/dist/cli.js'
  imported from /home/ramaaditya/Project/caraka/caraka/bin/caraka.mjs
    code: 'ERR_MODULE_NOT_FOUND',
```

Sama dengan yang dilaporkan runner, sampai ke nama modulnya. `npm run build`
lalu test yang sama:

```
✔ whatsapp costs no dependency either, and baileys is one import deeper (120.863818ms)
```

Gerbang penuh sesudah perbaikan, dijalankan atas checkout tanpa `dist/`
(`rm -rf dist && npm run verify`):

```
> caraka@1.2.0 scan:secrets
> bash scripts/scan-secrets.sh
clean: 253 tracked files, no credentials

> caraka@1.2.0 lint
> oxlint src test scripts && oxfmt --check src test scripts bin package.json tsconfig.json

> caraka@1.2.0 typecheck
> tsc -p tsconfig.json --noEmit

> caraka@1.2.0 build
> node -e "require('node:fs').rmSync('dist', { recursive: true, force: true })" && tsc -p tsconfig.json

> caraka@1.2.0 test
> node --import tsx --test test/unit.test.ts
ℹ tests 113
ℹ pass 113
ℹ fail 0

> caraka@1.2.0 e2e
> node --import tsx --test test/e2e.test.ts
ℹ tests 62
ℹ pass 62
ℹ fail 0
```

113 lolos dari 113, tanpa `dist/` sebelum gerbang dimulai. Itu AC-3, dan
sebelum perbaikan angkanya 112 dari 113 di keadaan yang sama.
