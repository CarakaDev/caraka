# Plan — kebijakan privasi Caraka

**Spec:** [`../../spec/privacy/spec.md`](../../spec/privacy/spec.md) · **Standar:** [`standards/ears.md`](../../standards/ears.md)

## 1. Bentuk

```
docs/privacy.md            teks Inggris (sumber)
docs/privacy.id.md         teks Indonesia (sumber)
site/src/lib/policy.ts     pembaca markdown subset: #, ##, paragraf, daftar, kode, tebal, tautan
site/src/components/PolicyText.astro   satu baris inline
site/src/pages/privacy.astro           halaman, meminjam security.css seperti /whatsapp-risk
site/src/lib/site.ts       PageKey `privacy` + meta
site/src/data/landing.ts   tautan footer beranda
site/test/privacy.test.js  pembaca dan fakta kunci
site/e2e/*.spec.ts         daftar rute dan baseline tinggi
```

## 2. Keputusan

| Hal | Pilihan | Alasan |
|---|---|---|
| Sumber teks | berkas `docs/` dibaca lewat `?raw` | halaman tidak bisa melenceng dari berkasnya |
| Pembaca markdown | tulis sendiri, subset kecil, melempar bila ada bentuk lain | tanpa dependensi baru; bentuk tak dikenal tidak tampil sebagai markdown mentah |
| Dua bahasa | satu rute, blok `lang="id"` kedua | e2e memeriksa `lang` per rute; satu rute menjaga pola itu |
| Gaya | `security.css` dipinjam | pola `/whatsapp-risk`; keyframe tidak bercabang |
| Footer | hanya beranda (`footerLinks`) | tidak ada daftar footer bersama; footer lain ditulis tangan dan mengubah baseline |

## 3. Pembuktian

| AC | Bukti |
|---|---|
| AC-1.1 sampai AC-1.7 | `site/test/privacy.test.js` membaca kedua berkas; teks dibaca orang terhadap `docs/` dan `store-listing.md` |
| AC-2.1 | `e2e/site.spec.ts` "routes", otomatis dari `PAGES`, tiga peramban |
| AC-2.2, AC-2.4 | `dist/privacy/index.html` diperiksa: berisi `halo@caraka.dev`, `lang="id"`, semua judul bagian |
| AC-2.3 | `privacy.test.js` "markdown the reader does not handle throws" |
| AC-2.5 | `e2e/mobile.spec.ts` "table of contents" |
| AC-2.6 | `fidelity.test.js` (`active`), `e2e/mobile.spec.ts` "header menu" dan uji luapan 320px |
| AC-2.7 | `fidelity.test.js` "every page reaches every other page it links to" |
| tinggi halaman | baseline `/privacy` di `e2e/site.spec.ts`, nilai terukur |

## 4. Gate

Berjalan di `rama-tuf`, direktori `~/caraka-gate-privacy/` (rsync). Tidak ada build atau test di mesin Rama.

```bash
ssh rama-tuf 'bash -lc "cd ~/caraka-gate-privacy/site && systemd-run --user --scope -q -p MemoryMax=8G -p MemorySwapMax=0 npm run check"'
ssh rama-tuf 'bash -lc "cd ~/caraka-gate-privacy/site && systemd-run --user --scope -q -p MemoryMax=8G -p MemorySwapMax=0 npm run e2e -- --workers=4"'
```

## 5. Hasil gate

Dijalankan 13 Oktober 2026 di `rama-tuf`, `~/caraka-gate-privacy/`, Playwright 1.62.1.

**Gate hijau sebagian. Dua hal merah, keduanya bukan dari perubahan ini.**

`npm run check` di `site/` (exit 0):

```
Found 0 warnings and 0 errors.          (oxlint)
Result (53 files): 0 errors, 0 warnings, 1 hint   (astro check; hint lama di guide.astro: 'links')
 ✓ test/og-glyphs.test.js (3 tests)
 ✓ test/privacy.test.js (8 tests)
 ✓ test/fidelity.test.js (32 tests)
 Test Files  3 passed (3)
      Tests  43 passed (43)
```

`npm run e2e -- --workers=4` di `site/`:

```
  53 failed
  1 skipped
  94 passed (1.1m)
```

Rincian 53 yang gagal:

| Jumlah | Penyebab |
|---|---|
| 52 | `webkit` dan `mobile-safari` tidak bisa berjalan: `browserType.launch: Host system is missing dependencies to run browsers` (butuh `sudo npx playwright install-deps`). Tidak diinstal, karena itu mengubah sistem `rama-tuf`. |
| 1 | `chromium` uji tinggi dokumen. `/` dan `/privacy` cocok. Lima rute lain lama selisih 1 sampai 2 px di Chromium host ini, dan selisih itu ada juga tanpa perubahan ini: `/install` 5500 (5501), `/whatsapp-risk` 6849 (6850), `/brand/readme` 5551 (5552), `/brand` 10203 (10202), `/brand/ui-kit` 9556 (9554). Baseline mereka tidak disentuh. |

Chromium, Firefox, dan Chrome seluler: semua uji lain lulus, termasuk `/privacy` di rute, menu, daftar isi, dan luapan.

Baseline baru: `/privacy` 4971 (pertama kali), `/` 6676 ke 6719 (+43 dari tautan footer; diukur ulang tanpa tautan, hasilnya 6676).

Bukti halaman: `site/dist/privacy/index.html` ada, memuat `halo@caraka.dev` dan `lang="id"`.

### Gate ulang di container Playwright resmi (13 Oktober 2026)

Host `rama-tuf` tidak punya dependensi WebKit, jadi e2e dijalankan ulang di `mcr.microsoft.com/playwright:v1.62.1-noble` (podman, `MemoryMax=8G`). Semua tiga engine dan dua profil seluler berjalan, termasuk baseline tinggi halaman:

```
  2 skipped
  146 passed (2.0m)
```

Selisih 1–2 px pada lima rute lama hanya muncul di Chromium host, bukan di container.
