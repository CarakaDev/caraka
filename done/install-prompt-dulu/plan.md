# Plan — install-prompt-dulu

**Spec:** `spec.md` di direktori ini · **Tanggal:** 12 Agustus 2026

## Langkah

1. `src/data/install.ts` — `toc` disusun ulang: `script` naik ke `01`, lima
   entri di atasnya turun satu, `verify` tetap `07`. Judulnya tetap seperti
   sekarang.
2. `src/data/install.ts` — baris `paths` "Want Codex or Claude to help" menjadi
   "copy the prompt above". Lima huruf ditukar lima huruf, jadi chip tidak
   berubah lebar.
3. `src/pages/install.astro` — blok `<section id="script">` dipindah utuh ke
   atas `<section id="chain">`, dan angka yang tercetak di tiap kepala bagian
   diperbarui mengikuti `toc`. Tidak ada properti gaya yang disentuh:
   `#script` sudah membawa `margin-bottom` yang sama dengan lima bagian lain,
   dan `#verify` tetap satu-satunya bagian tanpanya.
4. `site/AGENTS.md` — satu paragraf di bawah "The one place the port leaves the
   mockup": urutan bagian `/install` sekarang dua penyimpangan, bukan satu, dan
   alasannya adalah `docs/install-guide.md` §2.
5. `rm -rf dist && npm run build`, lalu gerbang. Baseline `/install` (5465)
   diperiksa terhadap dist segar dan diperbarui bila bergeser.

## Pemetaan AC → pembuktian

| AC | Pembuktian |
|---|---|
| AC-1 | `dist/install/index.html`: offset `id="script"` lebih kecil dari `id="chain"` |
| AC-2 | Baca `toc` dan tujuh kepala bagian berdampingan: nomor dan urutan cocok |
| AC-3 | `grep "copy the prompt above" dist/install/index.html`, dan tidak ada "below" tersisa |
| AC-4 | Baca `site/AGENTS.md`: paragraf menyebut comp, urutan baru, dan `install-guide.md` §2 |
| AC-5 | Test baseline tinggi (`e2e/site.spec.ts`) di Chromium 1440x900 terhadap dist segar |

## Risiko

Penyusunan ulang menggeser tinggi dokumen. Diperkirakan tidak: keenam bagian
pertama memakai `margin-bottom` yang identik dan tidak ada yang berubah lebar,
jadi urutannya tidak mengubah total. Kalau ternyata bergeser, angkanya diukur
dan ditulis di sini, bukan ditebak.

Risiko kedua: comp berhenti jadi rujukan urutan untuk halaman ini. Itu
disengaja dan dicatat di AGENTS.md, bukan dibiarkan jadi selisih yang ditemukan
orang lain enam bulan lagi.

## Keluaran gerbang

Tinggi `/install` tidak bergeser. Baseline 5465 di `e2e/site.spec.ts` lolos
apa adanya terhadap `dist/` segar (`rm -rf dist && npm run build`), jadi AC-5
tidak menuntut perubahan angka — perkiraan di bagian Risiko terbukti.

`npm run scan:secrets`, dari akar repositori:

```
> caraka@1.2.0 scan:secrets
> bash scripts/scan-secrets.sh
clean: 251 tracked files, no credentials
```

`npm run check` (lint → typecheck → unit):

```
> caraka-site@0.0.1 lint
> oxlint src scripts test
> caraka-site@0.0.1 typecheck
> astro check
Result (46 files):
- 0 errors
- 0 warnings
- 0 hints
> caraka-site@0.0.1 test
> vitest run
 Test Files  2 passed (2)
      Tests  26 passed (26)
   Duration  138ms (transform 58ms, setup 0ms, import 78ms, tests 19ms, environment 0ms)
```

`npm run e2e`, chromium + firefox + webkit + dua profil ponsel, terhadap dist
segar:

```
  2 skipped
  113 passed (49.0s)
```

Pembuktian AC-1 dan AC-3 di `dist/install/index.html`: `id="script"` berada di
offset 9510 dan `id="chain"` di 17222, dan "copy the prompt above" muncul satu
kali sementara "below" nol kali.
