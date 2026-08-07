# Plan — situs caraka.dev

**Spec:** [`spec.md`](spec.md) · **Standar:** [`standards/ears.md`](../../standards/ears.md)

---

## 1. Bentuk yang dipilih

Astro statis, tanpa adapter, tanpa framework UI. Mockup adalah HTML dengan gaya inline; Astro adalah alat yang paling sedikit mengubahnya — komponen `.astro` merender HTML apa adanya, tanpa lapisan runtime di antara.

Deploy sebagai **aset statis Cloudflare Workers**, bukan Pages. Konfigurasi hanya `assets.directory`, tanpa skrip Worker.

### Yang mockup andalkan dan Astro tidak sediakan

| Di mockup | Di situs |
|---|---|
| `<sc-for list="{{ x }}" as="y">` | `{x.map((y) => (...))}` |
| `<sc-if value="{{ v }}">` | `{v && (...)}` |
| `style-hover="…"` | 13 kelas `.hv-*` di `src/styles/global.css` |
| `onClick="{{ jump }}"` | dihapus — `scroll-behavior: smooth` + `href="#id"` native sudah melakukannya, dan `scroll-margin-top` menahan header |
| `onClick="{{ copy }}"` | satu listener terdelegasi di `src/scripts/ck.js` |
| `--ck-sp` | listener gulir pasif di `src/scripts/ck.js`, satu tulis per bingkai |

### Kenapa CSS per halaman

Sembilan nama keyframe dipakai di lebih dari satu mockup dengan **nilai berbeda** — `ck-rise` bergeser 18px, 22px, 24px, 26px, atau 28px tergantung halamannya. Satu berkas global akan membuat halaman terakhir yang dimuat menang. Karena itu `src/styles/pages/<slug>.css` menyimpan blok `<style>` mockup apa adanya, di-*import* dari halamannya, dan Astro memancarkannya per halaman.

## 2. Langkah

1. **Fondasi** — struktur repo, `.gitignore`, Astro, `global.css` (font + 13 kelas hover + progres gulir + fokus), `ck.js`, `Base.astro`, `site.ts`, `astro.config.mjs`, `wrangler.jsonc`.
2. **Aset** — `scripts/gen-assets.mjs`: satori merender mark dan kartu OG, `embedFont` mengubah aksara jadi `path`, resvg menulis PNG, dan 15 baris pengemas ICO menggantikan sebuah dependensi.
3. **Port halaman** — landing dikerjakan tangan lebih dulu sebagai pola acuan, lalu sembilan agen paralel mengerjakan sisanya, masing-masing satu berkas `.astro` dan satu berkas data, diikuti agen audit kedua per halaman.
4. **Verifikasi** — lint, typecheck, unit, e2e lintas tiga mesin peramban, pembandingan tinggi dokumen terhadap tiap mockup, pemeriksaan rahasia, dan empat lensa tinjauan adversarial atas prosa, fakta, akses, dan drift.
5. **Rilis** — build, deploy ke `caraka.dev`, buat dan dorong kedua repositori `CarakaDev`.
6. **Tutup** — spec dan plan ini pindah ke `done/` dengan keluaran verifikasi tertempel, lalu commit.

## 3. Pembuktian tiap AC

| AC | Cara dibuktikan |
|---|---|
| AC-1.1 | e2e: setiap rute membalas 200 dan punya `<h1>` |
| AC-1.2, AC-1.3 | unit: bandingkan `src/styles/pages/*.css` dengan blok `<style>` mockup, karakter per karakter |
| AC-1.4 | unit: setiap nilai `style-hover` unik di mockup punya kelas `.hv-*` yang cocok |
| AC-1.5 | unit: `global.css` mendeklarasikan ketiga nama keluarga font |
| AC-2.1 | e2e (chromium): elemen ber-`animation-timeline` mulai transparan lalu terlihat setelah digulir |
| AC-2.2 | e2e (firefox, webkit): elemen yang sama terlihat tanpa gulir |
| AC-2.3 | e2e: dengan `prefers-reduced-motion: reduce`, konten terlihat saat dimuat |
| AC-2.4, AC-2.5, AC-2.6 | e2e: `--ck-sp` mulai di bawah 0,05 dan melewati 0,5 setelah digulir, di ketiga mesin |
| AC-3.1–3.3 | e2e: klik tombol salin, baca papan klip, periksa label; lalu tolak izin dan periksa `FAILED` |
| AC-4.1, AC-4.2 | unit: `favicon.svg` memuat `<path>` dan tidak memuat `<text>` |
| AC-4.3 | unit: satu berkas `public/og/<key>.png` ada untuk setiap kunci di `PAGES` |
| AC-4.4 | unit: setiap karakter di `ogKicker` dan `ogHeadline` ada di subset font yang dimuat |
| AC-4.5 | e2e: setiap halaman punya `canonical`, `og:image`, `og:url` yang menunjuk rutenya sendiri |
| AC-5.1, AC-5.2 | e2e: `Tab` pertama memunculkan tautan lewati; `:focus-visible` punya `outline` |
| AC-5.3 | unit: `[id]` punya `scroll-margin-top` |
| AC-5.4 | unit: setiap baris status di data halaman membawa `glyph` tak kosong |
| AC-6.1 | agen audit per halaman membandingkan berkas data dengan `renderVals()` mockup baris per baris; tinggi dokumen render juga dibandingkan |
| AC-6.2, AC-6.3 | tinjauan agen adversarial terhadap prosa terbangun, plus pembacaan manusia |
| AC-7.1, AC-7.3 | pemeriksaan pola rahasia terhadap `git ls-files` |
| AC-7.2 | `wrangler.jsonc` tidak memuat `account_id`; deploy membaca `CLOUDFLARE_ACCOUNT_ID` |

## 4. Risiko

**Animasi gulir yang gagal terbuka.** Elemen dengan `animation: ck-rise linear both` dan tanpa durasi bergantung pada `animation-timeline` untuk pernah terlihat. Di mesin tanpa dukungan, animasi berdurasi 0 dengan `fill: both` mendarat di bingkai akhir — terlihat. Ini kesimpulan dari spesifikasi, bukan pengamatan; e2e di Firefox dan WebKit yang memutuskannya, dan kalau salah, cadangannya adalah aturan `@supports` yang menetapkan `opacity: 1`.

**Aksara jadi tofu.** Ditutup dua kali: `embedFont` mengubah glif jadi path di aset ekspor, dan sebuah test menolak karakter di luar subset font. Panah `→` sudah tertangkap sekali oleh test itu.

**Rahasia bocor.** Repositori ini publik sejak commit pertama. `.gitignore` menutup `.env`, `.dev.vars`, `.wrangler/`, dan `.npmrc` sebelum berkas apa pun ditambahkan.

## 5. Keluaran verifikasi

Dijalankan 7 Agustus 2026, dari `site/`.

```
$ npm run lint
> oxlint src scripts test
                                   (tanpa keluaran — tanpa temuan)

$ npm run typecheck
> astro check
Result (37 files):
- 0 errors
- 0 warnings
- 0 hints

$ npm test
 Test Files  2 passed (2)
      Tests  20 passed (20)

$ npm run e2e
  63 passed (18.9s)                 chromium · firefox · webkit

$ ../scripts/scan-secrets.sh
clean: 128 tracked files, no credentials
```

### Kesetiaan pada mockup

`npm run compare` merender tiap mockup dan halaman hasil portnya di viewport yang
sama, lalu membandingkan tinggi dokumen. Kesepuluhnya sama persis:

| Halaman | Mockup | Port |
|---|---|---|
| `/` | 6374px | 6374px |
| `/docs` | 5220px | 5220px |
| `/install` | 4934px | 4934px |
| `/compare` | 5873px | 5873px |
| `/security` | 4546px | 4546px |
| `/status` | 5008px | 5008px |
| `/story` | 5734px | 5734px |
| `/brand` | 10171px | 10171px |
| `/brand/warna` | 5258px | 5258px |
| `/brand/ui-kit` | 9525px | 9525px |

### Tinjauan adversarial

Empat lensa — prosa, kebenaran fakta, akses, drift — mengangkat 31 temuan; setiap
temuan lalu diberikan ke agen terpisah yang tugasnya membantahnya. **24 terbantah,
7 bertahan** dan seluruhnya sudah diperbaiki. Yang terbantah sebagian besar adalah
usulan mengubah warna dan salinan yang berasal dari mockup: itu keputusan pemilik,
bukan cacat.

Dua temuan yang bertahan layak dicatat karena keduanya cacat nyata, bukan selera:

- Rel kanan menyembunyikan labelnya di `opacity: 0` dan hanya memunculkannya saat
  hover. Pengguna papan ketik mendapat cincin fokus mengelilingi garis 13px tanpa
  teks. Ditambahkan pasangan `:focus-visible`.
- Tombol salin mengembalikan labelnya setelah 1600 md; ketiga mockup bertombol
  salin memakai 1800 md. Diselaraskan.

### Yang perlu keputusan pemilik

Satu kalimat di `/compare` menggeneralisasi pengukuran satu produk menjadi klaim
satu kategori, dan menyebut tanggal yang tidak ada di `docs/`. Kalimat itu ada
apa adanya di `Caraka Compare.dc.html`, tetapi bertentangan dengan
`docs/research/perbandingan-openclaw-hermes-caraka.md:33`, yang menulis **85%
pemakaian OpenCode**, bukan 85% pemakaian coding agent secara umum. AC-6.3
melarang angka yang tidak ada di `docs/`, jadi kalimatnya diselaraskan dengan
riset dan tanggalnya dihapus. Kembalikan bila ada sumber untuk versi aslinya.

### Deploy

`caraka.dev` disajikan sebagai aset statis Cloudflare Workers lewat **route zona**,
bukan custom domain: zona itu sudah punya record DNS terproksi, dan memasang custom
domain mengharuskan record tersebut dihapus lebih dulu. Route mengikat Worker ke
hostname yang sudah ada tanpa menyentuh DNS sama sekali.

`html_handling` diset `drop-trailing-slash` agar sepadan dengan
`trailingSlash: 'never'` di Astro. Nilai bawaannya mengalihkan `/docs` ke `/docs/`,
yang berlawanan dengan `canonical` yang dinyatakan tiap halaman.

Kesebelas rute diperiksa langsung setelah propagasi: sepuluh membalas 200, dan
sebuah path yang tidak ada membalas 404 dengan halaman 404 yang benar.
