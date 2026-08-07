# Plan — site-truth

**Spec:** `spec/site-truth.md` · **Tanggal:** 8 Agustus 2026

## Langkah

1. Verifikasi tiap temuan terhadap sumbernya (`src/cli.ts`, `src/core/gateway.ts`,
   `src/channels/telegram.ts`, `CHANGELOG.md`, `docs/roadmap.md`,
   `docs/install-guide.md`, `docs/frd.md`, isi `docs/research/`, dan baris comp
   di `design/mockups/*.dc.html`). Temuan yang tidak terbukti dibuang; tidak ada
   yang dibuang di putaran ini.
2. Terapkan koreksi berkas data (`landing.ts`, `compare.ts`, `readme.ts`,
   `ui-kit.ts`, `og.ts`) dengan komentar baris-comp di atas tiap nilai yang
   meninggalkan comp; header `compare.ts`, `readme.ts`, `og.ts` mengikuti pola
   `security.ts` karena klaim "mockup is the source of truth" tidak lagi benar.
3. Terapkan koreksi halaman (`index.astro`, `docs.astro`, `compare.astro`,
   `brand/og.astro`, `brand/readme.astro`, `brand/index.astro`) dengan komentar
   `{/* Comp line … */}`.
4. Terapkan koreksi akar: glyph state di diagram `README.md`/`README.id.md`
   (▸ ⏸ ✓, selesai = diganti nama, bukan ditutup), hitungan riset tiga belas,
   dan `llms.txt` (memori belum terkirim, satu agent di v0.2, status v0.2,
   deskripsi install-guide sesuai judul aslinya).
5. Jalankan gerbang; ukur ulang tinggi rute yang bergeser dan perbarui baseline.

## Berkas yang disentuh

Empat belas berkas konten di atas plus `site/e2e/site.spec.ts` (baseline `/`
6421 → 6450, +29 dari paragraf sesi; `/compare` pindah ke kelompok "diukur dari
situs" tanpa perubahan angka).

## Risiko

- Baseline tinggi per-engine: hanya Chromium yang diukur, sesuai komentar suite.
- `npm run e2e` menyajikan `dist/` lama lewat `astro preview`; wajib
  `npm run build` dulu supaya pengukuran mengenai salinan baru.

## Pemetaan AC → pembuktian

| AC | Pembuktian |
|---|---|
| AC-1 | `rg "0\.2\.0|v0\.0\.0" site/src` hanya menyisakan riwayat changelog di `status.ts:104` dan kutipan comp di komentar; ketiga tempat versi berjalan membaca 0.2.1 |
| AC-2 | baca diff: tiap nilai yang berubah berkomentar baris comp |
| AC-3 | e2e `honesty` hijau; `rg -i "gemini cli.*free|memory across" site/src` hanya tersisa di komentar |
| AC-4 | diff `README*.md` + `index.astro` vs `src/core/gateway.ts:485-499` |
| AC-5 | `ls docs/research | wc -l` = 13 = angka di salinan |
| AC-6 | test `every route keeps the document height` hijau setelah baseline 6450 |
| AC-7 | keluaran gerbang di bawah |

## Keluaran gerbang verifikasi

`cd site && npm run check`:

```
> oxlint src scripts test
> astro check
Result (44 files):
- 0 errors
- 0 warnings
 Test Files  2 passed (2)
      Tests  26 passed (26)
```

`cd site && npm run build && npm run e2e` (build dulu — preview menyajikan dist):

```
01:23:55 [build] 13 page(s) built in 280ms
01:23:55 [build] Complete!
```

Putaran pertama setelah build gagal di baseline, sesuai dugaan:

```
+   "/: 6450 (comp renders at 6421)",
1 failed
```

Setelah baseline diperbarui, `npm run check && npm run e2e`:

```
 Test Files  2 passed (2)
      Tests  26 passed (26)
  2 skipped
  110 passed (44.8s)
```

`npm run lint` di akar (README dan llms.txt berubah):

```
> oxlint src test scripts && oxfmt --check src test scripts bin package.json tsconfig.json
All matched files use the correct format.
Finished in 84ms on 15 files using 24 threads.
```

Tanpa rahasia di diff; prosa diperiksa terhadap *Writing style* di `AGENTS.md`.
