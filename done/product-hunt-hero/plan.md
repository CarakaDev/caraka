# Plan — product-hunt-hero

**Spec:** `spec/product-hunt-hero.md` · **Tanggal:** 9 September 2026

## Langkah

1. Tambahkan pemeriksaan e2e untuk atribut tautan dan gambar Product Hunt pada
   hero landing page, lalu jalankan pemeriksaan tersebut untuk membuktikan RED.
2. Tambahkan snippet Product Hunt yang diberikan ke kelompok CTA hero di
   `site/src/pages/index.astro`.
3. Jalankan `cd site && npm run check`, `npm run build`, dan `npm run e2e`.
4. Pindahkan spec dan plan ke `done/product-hunt-hero/`, commit hanya berkas
   pekerjaan ini, lalu push branch aktif.
5. Jalankan `npm run deploy` dari `site/` dengan akun Cloudflare yang tersedia.
6. Uji `https://caraka.dev/` dan periksa HTML produksi untuk URL Product Hunt.

## Berkas yang disentuh

- `site/src/pages/index.astro`
- `site/e2e/site.spec.ts`
- `spec/product-hunt-hero.md`
- `plan/product-hunt-hero.md`

## Risiko

- Gambar badge berasal dari Product Hunt dan dapat berubah tanpa perubahan
  kode.
- Penambahan badge mengubah baseline `/` dari 6627 menjadi 6710 piksel pada
  Chromium 1440x900; alasan pengukuran dicatat di `site/e2e/site.spec.ts`.

## Pemetaan AC → pembuktian

| AC | Pembuktian |
|---|---|
| AC-1 | E2E locator mencari satu anchor Product Hunt di `#hero`. |
| AC-2 | E2E memeriksa `target="_blank"` dan `rel="noopener noreferrer"`. |
| AC-3 | E2E memeriksa `alt`, `width`, `height`, dan `src` gambar. |
| AC-4 | Keluaran `npm run check`, `npm run build`, dan `npm run e2e`. |
| AC-5 | `curl` produksi memeriksa status `200` dan URL Product Hunt. |

## Keluaran verifikasi

- RED: pemeriksaan Product Hunt gagal sebelum markup ditambahkan karena locator
  menemukan 0 elemen.
- GREEN: pemeriksaan Product Hunt Chromium lulus setelah markup ditambahkan.
- `cd site && npm run check`: lint lulus, typecheck 0 error dengan satu hint
  lama pada `src/pages/guide.astro:19`, dan 35 unit test lulus.
- `cd site && npm run e2e`: 143 test lulus dan 2 test skip pada lima project.
- Root `npm run scan:secrets`: 325 tracked files, tanpa credential.
- Root `npm run lint`, `npm run typecheck`, dan `npm run build`: exit 0.
- Root `npm test`: 177 test lulus.
- Root `npm run e2e`: 108 test lulus.
- Dua percobaan `npm run verify` gabungan berhenti pada tes akar yang tidak
  terkait dan berubah antar-run: satu tes attachment pada percobaan pertama
  serta satu tes approval pada percobaan kedua. Masing-masing suite lulus saat
  dijalankan sendiri; tidak ada source akar yang diubah.
- `CLOUDFLARE_ACCOUNT_ID=... npm run deploy`: exit 0; Wrangler deployed
  `caraka-site` to `caraka.dev/*` with version
  `275b5888-abf1-4f90-9448-d065c2ea9258`.
- Production smoke `https://caraka.dev/`: HTTP 200, 80052 bytes, Product Hunt
  href true after HTML unescape, target blank true, rel noopener true, alt true,
  and dimensions true.
- Commit `c8342af95cfb9ed0fe8a59d4247b9fe3dbe2b4b9` was pushed to
  `origin/fix/proses-tak-berakhir` before deploy.
