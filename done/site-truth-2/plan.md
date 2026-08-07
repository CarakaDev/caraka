# Plan — site-truth-2

**Spec:** `spec.md` di direktori ini · **Tanggal:** 8 Agustus 2026

## Langkah

1. Verifikasi kedua temuan terhadap sumbernya: `src/drivers/` (hanya
   `claude-acp.ts`), ketiadaan `presets/`, `docs/prd.md` G1, `docs/roadmap.md`
   Fase 2 & 4, `site/src/data/status.ts` (gerbang sesi setup masih terbuka),
   dan baris comp `Caraka Status.dc.html:187` serta `Caraka Compare.dc.html:312`.
2. `status.astro:162` — kalimat rute CLI dipindah ke masa depan ("When the
   planned CLI route lands…"), dengan komentar yang menyebut comp baris 187,
   `src/drivers/`, dan roadmap Fase 4.
3. `compare.ts:61` — sel Caraka menjadi "Target: under 3 min", dengan komentar
   yang menyebut comp baris 312, gerbang di `status.ts`, dan `prd.md` G1.
4. Bangun ulang `dist/` (webServer e2e memakai `astro preview`, jadi dist lama
   membuat baseline hijau palsu), lalu jalankan gerbang.

## Pemetaan AC → pembuktian

| AC | Pembuktian |
|---|---|
| AC-1 | `grep "planned CLI route" dist/status/index.html` + baca ulang halaman |
| AC-2 | `grep "Target: under 3 min" dist/compare/index.html` |
| AC-3 | Baca ulang kedua baris: komentar menyebut baris comp dan kodenya |
| AC-4 | Test baseline tinggi (`site.spec.ts:238`) di Chromium terhadap dist segar |

## Risiko

Salinan baru menggeser tinggi `/status` atau `/compare`. Terukur: tidak —
paragraf `/status` tetap pada jumlah baris yang sama di blok 640px, dan sel
`/compare` tetap satu baris di kolomnya. Baseline tidak berubah.

## Keluaran gerbang

`npm run check` (lint → typecheck → unit), terhadap sumber yang sudah diubah:

```
> caraka-site@0.0.1 lint
> oxlint src scripts test
> caraka-site@0.0.1 typecheck
> astro check
Result (44 files):
- 0 errors
- 0 warnings
> caraka-site@0.0.1 test
> vitest run
 Test Files  2 passed (2)
      Tests  26 passed (26)
   Duration  127ms (transform 36ms, setup 0ms, import 67ms, tests 19ms, environment 0ms)
```

`npm run e2e`, setelah `npm run build` (dist segar berisi salinan baru —
dibuktikan `grep -rl` menemukan kedua string di `dist/status/index.html` dan
`dist/compare/index.html`):

```
  2 skipped
  110 passed (44.3s)
```

Test baseline tinggi dijalankan sendiri terhadap dist segar untuk memastikan
angkanya nyata, bukan sisa build lama:

```
Running 1 test using 1 worker
  ✓  1 [chromium] › e2e/site.spec.ts:238:3 › the comps still decide the layout
     › every route keeps the document height its mockup renders at (12.6s)
  1 passed (13.6s)
```

Dua pemeriksaan tanpa alat: diff bebas rahasia (dua baris salinan dan dua
komentar), dan prosa dicek terhadap *Writing style* di `AGENTS.md`.
