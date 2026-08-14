# Plan — status-tidak-terus-tumbuh

**Spec:** `spec/status-tidak-terus-tumbuh.md` · **Tanggal:** 14 Agustus 2026

## Bentuk yang dipilih, dan yang ditolak

Tiga bentuk ditimbang terhadap satu kalimat di `site/AGENTS.md`: comp yang
memutuskan desain, perubahan isi di dalam blok yang sudah digambar comp boleh,
perancangan ulang tata letak tidak.

1. **Satu baris ringkas per rilis lama, masing-masing berdiri sendiri.** Ditolak:
   baris ringkas itu blok yang tidak pernah digambar comp, jadi ia markup dan
   gaya baru.
2. **`<details>` yang melipat rilis lama.** Ditolak untuk alasan yang sama,
   ditambah satu widget yang tidak ada di comp mana pun di situs ini.
3. **Satu kartu arsip, dalam bentuk kartu rilis yang digambar comp.** Dipakai.
   Kepala kartu, chip status, tanggal, label grup, dan daftar butir `·` semuanya
   sudah ada di comp; yang berubah hanya apa yang ditaruh data ke dalamnya.
   Diffnya satu berkas data, dan `status.astro` tidak disentuh sama sekali.

Lima kartu penuh dipilih sebagai batas karena itu jumlah yang angkanya sudah
diukur di `site/e2e/site.spec.ts:377-382` — lima rilis terakhir dengan selisih
tingginya masing-masing — dan karena batas tetaplah satu-satunya hal yang
membuat pertumbuhan berhenti: jumlah yang mengikuti seri minor akan tumbuh lagi
begitu seri itu panjang.

Kartu arsip memakai palet abu-abu yang sudah dipakai kartu `0.0.0`
(`#B2BCC6` / `#171C22` / `#7A848F` / `#0E1216`), jadi tidak ada warna baru.

## Langkah

1. `site/src/data/status.ts` — kartu `1.3.0` sampai `0.0.0` (empat belas kartu)
   diganti satu kartu: `v: '1.3.0 → 0.0.0'`, `date: '7–13 August 2026'`, dan dua
   grup. Chip `state` membawa `in CHANGELOG.md`, bukan `archived` seperti yang
   ditulis di sini semula: `archived` menjelaskan kartunya dan bisa terbaca
   sebagai rilis yang ditarik, sedangkan yang perlu dibaca adalah tempat entri
   penuhnya. Grup pertama, `WHERE THE FULL ENTRIES ARE`, satu kalimat yang
   menunjuk berkas itu dan taut di footer halaman. Grup kedua, `SHIPPED`, empat
   belas baris `versi · tanggal — ringkasan`, tiap ringkasan diambil dari
   kalimat pembuka entri rilis itu di `CHANGELOG.md`. Paletnya palet abu-abu
   kartu `0.0.0`, dan `range`-nya `r(2, 4, 28)`, satu langkah setelah blok kartu
   penuh di atasnya.

   Komentar provenance yang menempel di butir "Thirteen sourced research
   documents" ikut pindah ke komentar kartu itu. Isinya masih benar — `CHANGELOG.md`
   menulis "Eleven" dan `docs/research/` berisi tiga belas berkas — tapi
   penyimpangannya hilang, karena baris baru untuk `0.0.0` tidak menyebut angka
   sama sekali.
2. `site/test/fidelity.test.js` — satu `describe` baru: paling banyak lima
   `releases` yang `v`-nya berbentuk `x.y.z`, kartu arsip ada dan menyebut
   `CHANGELOG.md`, dan setiap versi yang punya judul `## [x.y.z]` di
   `CHANGELOG.md` masih tersebut di halaman.
3. `site/AGENTS.md` — satu paragraf di "Where the port leaves the mockup", dan
   hitungan di kepala bagian itu naik dari tiga ke empat.
4. `rm -rf dist && npm run build`, ukur ulang tinggi `/status`, tulis angkanya
   ke `EXPECTED` di `site/e2e/site.spec.ts` dan satu baris ke komentar di
   atasnya dengan bentuk yang sama dengan entri yang sudah ada di sana.
5. Gerbang: `npm run check`, `rm -rf dist && npm run build`, `npm run e2e` dari
   `site/`, ditambah `npm run verify` dari akar. Lalu ukur ulang test 320px
   sendirian dan catat marjinnya.

## Pemetaan AC → pembuktian

| AC | Pembuktian |
|---|---|
| AC-1.1 | `fidelity.test.js` → `at most five releases keep a full card`; hitungan kartu di `dist/status/index.html` |
| AC-1.2 | Test yang sama, dijalankan sekali dengan kartu keenam ditempel sementara, lalu dikembalikan |
| AC-2.1 | `fidelity.test.js` → `every version in CHANGELOG.md is still named on the page`, dibaca dari `CHANGELOG.md` yang sebenarnya |
| AC-2.2 | Baca kelima belas butir kartu arsip: empat belas membawa versi dan tanggal, satu menunjuk CHANGELOG |
| AC-2.3 | `grep "CHANGELOG.md" dist/status/index.html` menemukan sebutan di badan halaman, bukan hanya di footer |
| AC-3.1 | `git diff --stat` — `src/pages/status.astro` tidak muncul |
| AC-3.2 | Baca `site/AGENTS.md`: paragraf menyebut baris comp, tinggi terukur, dan bentuk penggantinya |
| AC-4.1 | Test baseline tinggi di `e2e/site.spec.ts`, Chromium 1440x900, terhadap `dist/` segar |
| AC-4.2 | `npm run e2e` penuh: test 320px lulus di dalam batas 30 detiknya; durasinya diambil dari reporter |
| AC-4.3 | Baca komentar di atas `EXPECTED` di `e2e/site.spec.ts`: dua angka, bentuk run yang mengukurnya, dan pemecahan waktunya per rute |

## Risiko

Kalimat ringkasan bisa jadi salah tanpa ketahuan alat mana pun. Setiap butir
diringkas dari kepala entri rilisnya di `CHANGELOG.md` dan tidak dikarang, dan
tidak ada angka, tanggal, atau versi baru yang masuk.

Risiko kedua: seseorang menambah rilis berikutnya sebagai kartu keenam dan tidak
menurunkan yang terlama. Baseline tinggi akan merah, tapi baseline merah cuma
bilang "berubah". Test di langkah 2 yang menyebut batasnya.

Risiko ketiga, yang terjadi: alasan yang dipakai di spec — marjin test 320px —
ternyata bukan yang dibayar halaman ini. Diukur, bukan diperkirakan, dan
hasilnya ditulis di `e2e/site.spec.ts` dan di `site/AGENTS.md` apa adanya.
Pekerjaannya tetap dikirim karena AC-1 sampai AC-3 berdiri sendiri: daftar yang
tumbuh tanpa batas adalah cacatnya, dan test di langkah 2 yang menahannya.

## Yang diukur

Perbandingan sebelum/sesudah diambil di mesin yang sama, dengan `dist/` dibangun
ulang untuk masing-masing, dan `site/src/data/status.ts` dikembalikan ke versi
yang di-commit untuk sisi "sebelum".

| Ukuran | Sebelum | Sesudah |
|---|---|---|
| tinggi `/status`, Chromium 1440x900 | 18.455px | 8.638px |
| kartu rilis di `dist/status/index.html` | 20 | 7 |
| test 320px, mobile-safari, `npm run e2e` penuh | 22,2 s | 22,2 s |
| test 320px, mobile-chrome, run yang sama | 15,8 s | 15,3 s |
| test 320px, mobile-safari, dua proyek ponsel saja | 19,7 s | 19,4 s |
| test 320px, mobile-safari, sendirian | 15,8 s / 15,3 s | 15,2 s / 15,1 s |

Tiga bentuk run, tiga pasang, dan ketiganya sepakat: setengah detik paling
banyak. Angka suite penuh sendiri bergerak antara 18,5 dan 22,2 detik di antara
run-run pada satu build yang sama, jadi setengah detik bukan selisih yang bisa
dibaca suite ini.

Marjinnya: 22,2 detik terhadap batas 30 detik di bawah suite penuh, 7,8 detik
tersisa, dan angka itu tidak bergerak karena perubahan ini. Sendirian 15,2
detik, 14,8 detik tersisa.

Ke mana waktunya pergi, diukur rute per rute di 320px pada WebKit terhadap
`dist/` yang sudah dipangkas:

```
/                goto   287ms   settle+read  3008ms
/docs            goto   145ms   settle+read   707ms
/install         goto    95ms   settle+read   706ms
/compare         goto   102ms   settle+read   704ms
/security        goto    78ms   settle+read   705ms
/whatsapp-risk   goto    81ms   settle+read   703ms
/status          goto   123ms   settle+read   705ms
/story           goto    88ms   settle+read   703ms
/brand           goto   433ms   settle+read   703ms
/brand/warna     goto   204ms   settle+read   704ms
/brand/ui-kit    goto   156ms   settle+read   704ms
/brand/og        goto   102ms   settle+read   705ms
/brand/readme    goto   779ms   settle+read   704ms

total goto 2673ms, total settle+read 11461ms
```

`/status` adalah rute keempat termurah untuk dimuat, dan `settle()` adalah 11,5
detik dari 14,1 detik. Memangkas halaman tidak menyentuh yang 11,5 itu.
Memindahkan yang 11,5 adalah pekerjaan lain dan PR lain.

Pembuktian AC-1.2, satu kali dengan kartu keenam ditempel sementara lalu
dikembalikan:

```
 FAIL  test/fidelity.test.js > the changelog list is bounded > at most five releases keep a full card
AssertionError: full cards: 1.4.1, 1.4.0, 1.3.3, 1.3.2, 1.3.1, 9.9.9 — the sixth belongs in the archive card as one line: expected 6 to be less than or equal to 5
```

Pembuktian AC-2.3 dan AC-3.1 terhadap `dist/` segar:

```
release cards in dist: 7
CHANGELOG.md mentions in dist/status: 4
-- status.astro touched? --
(empty above means untouched)
```

Tujuh kartu itu: `Open gates`, lima kartu rilis penuh, dan kartu arsip. Empat
sebutan `CHANGELOG.md`: chip kepala kartu arsip, kalimat di grup pertamanya, dan
taut di footer yang sudah ada (teks dan `href`).

## Keluaran gerbang

`npm run check` dari `site/` (lint → typecheck → unit):

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
      Tests  29 passed (29)
   Duration  135ms (transform 50ms, setup 0ms, import 71ms, tests 19ms, environment 0ms)
```

Dua puluh sembilan, naik dari dua puluh enam: tiga test batas daftar rilis.

`rm -rf dist && npm run build`:

```
11:55:29 [build] ✓ Completed in 314ms.
11:55:29 [@astrojs/sitemap] `sitemap-index.xml` created at `dist`
11:55:29 [build] 14 page(s) built in 373ms
11:55:29 [build] Complete!
```

`npm run e2e`, chromium + firefox + webkit + dua profil ponsel, terhadap `dist/`
segar:

```
  -   58 [firefox] › e2e/site.spec.ts:238:3 › the comps still decide the layout › every route keeps the document height its mockup renders at
  ✓   29 [chromium] › e2e/site.spec.ts:238:3 › the comps still decide the layout › every route keeps the document height its mockup renders at (15.6s)
  -   86 [webkit] › e2e/site.spec.ts:238:3 › the comps still decide the layout › every route keeps the document height its mockup renders at
  ✓   88 [mobile-chrome] › e2e/mobile.spec.ts:15:5 › no overflow › nothing spills past 320px on any route (14.4s)
  ✓  102 [mobile-safari] › e2e/mobile.spec.ts:15:5 › no overflow › nothing spills past 320px on any route (18.7s)

  2 skipped
  113 passed (49.3s)
```

Dua yang dilewati adalah baseline tinggi di Firefox dan WebKit, yang memang
per-mesin-render dan dilewati sejak sebelum pekerjaan ini.

`npm run verify` dari akar repositori, keenamnya berurut:

```
> caraka@1.4.1 verify
> caraka@1.4.1 scan:secrets
clean: 279 tracked files, no credentials
> caraka@1.4.1 lint
> caraka@1.4.1 typecheck
> caraka@1.4.1 build
> caraka@1.4.1 test
ℹ tests 160
ℹ pass 160
ℹ fail 0
> caraka@1.4.1 e2e
ℹ tests 93
ℹ pass 93
ℹ fail 0
EXIT=0
```

Pohon kerja memuat perubahan di `src/` milik pekerjaan lain yang sedang jalan
berdampingan; gerbang akar hijau dengan perubahan itu ada di dalamnya, dan tidak
ada berkas di `src/` yang disentuh dari sini.
