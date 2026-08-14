# Spec — status-tidak-terus-tumbuh: daftar rilis `/status` berhenti tumbuh

**Status:** dikerjakan · **Tanggal:** 14 Agustus 2026

## Latar

`/status` menggambar satu kartu per rilis dari `site/src/data/status.ts`, dan
setiap rilis menambah satu. Diukur 14 Agustus 2026, Chromium 1440x900, terhadap
`dist/` segar: halaman itu setinggi 18.455px, dan lima rilis terakhir menambah
663, 632, 513, 716, dan 610px (`site/e2e/site.spec.ts:377-382`). Kira-kira 600px
per rilis, dan tidak ada yang pernah keluar dari daftar.

Yang dipakai sebagai alasan untuk mengerjakannya sekarang: `site/e2e/mobile.spec.ts`
menyusuri ketiga belas rute di lebar 320px dan butuh sekitar 18 detik sendirian
terhadap batas 30 detik bawaan Playwright. Pada 14 Agustus 2026 batas itu
terlewat sekali saat suite penuh berjalan paralel dan run-nya merah, dan
beberapa rilis berikutnya diperkirakan menghabiskan sisa marjinnya.

Alasan itu tidak bertahan diukur, dan itu ditulis di sini daripada dibuang. Test
yang sama mencatat 22,2 detik sebelum perubahan dan 22,2 detik sesudahnya di
bawah `npm run e2e` penuh. Membuang 9.817px tidak mengembalikan apa pun di sana:
waktunya habis di `settle()`-nya sendiri — 3.000 md di `/` ditambah 700 md di dua
belas rute lain adalah 11,5 detik menunggu terhadap 2,7 detik navigasi untuk
ketiga belasnya, dan `/status` sendiri dimuat dalam 123 md, salah satu yang
termurah di daftar itu. Pertumbuhan halaman ini tetap layak dihentikan karena
pertumbuhannya sendiri; ia bukan yang dibayar suite ponsel.

Riwayat penuh setiap rilis sudah hidup dan terpelihara di `CHANGELOG.md`, yang
sudah ditaut dari footer halaman ini.

## Ruang lingkup

`site/src/data/status.ts` (isi `releases`), `site/e2e/site.spec.ts` (baseline
tinggi `/status` dan komentar di atasnya), `site/AGENTS.md` (bagian "Where the
port leaves the mockup"), dan satu pemeriksaan di `site/test/fidelity.test.js`
yang mengikat batasnya.

Bentuknya: lima rilis terbaru tetap kartu penuh; semua yang lebih lama masuk ke
satu kartu — dalam bentuk kartu yang sama yang digambar comp — berisi satu baris
per rilis, dengan kepala kartu dan satu grup di atas baris-baris itu menunjuk
`CHANGELOG.md`. Biaya sebuah rilis di halaman ini berubah dari satu kartu
menjadi satu baris.

## Yang tidak dikerjakan

- Tidak mengubah markup, gaya inline, kelas, atau `animation-range` apa pun di
  `site/src/pages/status.astro`. Comp yang memutuskan tampilannya; yang berubah
  hanya isi yang ditaruh data ke dalam blok yang sudah digambar comp.
- Tidak membuat rute baru, halaman arsip, komponen `<details>`, atau JavaScript
  apa pun. Situs ini mengirim satu berkas skrip dan jumlahnya tetap satu.
- Tidak menyentuh `CHANGELOG.md`, `package.json`, `design/mockups/*.dc.html`,
  `stats`, `phases`, `candidates`, atau `never`.
- Tidak menghapus satu pun rilis dari halaman. Yang hilang adalah kartunya,
  bukan keberadaannya.
- Tidak menyentuh kartu `Open gates`: ia bukan rilis dan tidak ikut menua.
- Tidak mengubah ambang atau isi test lain untuk membuat gerbang lewat.

## Acceptance criteria

### AC-1 · Batas pertumbuhan

- **AC-1.1** Halaman `/status` shall menyajikan paling banyak lima rilis sebagai
  kartu penuh dengan grup-grupnya.
- **AC-1.2** WHEN sebuah rilis baru ditambahkan sebagai kartu penuh keenam,
  gerbang shall gagal di `site/test/fidelity.test.js` dengan menyebut batas itu.

### AC-2 · Tidak ada rilis yang hilang tanpa jejak

- **AC-2.1** Halaman `/status` shall menyebut setiap nomor versi yang punya
  entri di `CHANGELOG.md`, termasuk yang tidak lagi punya kartu penuh.
- **AC-2.2** Setiap rilis yang tidak lagi punya kartu penuh shall dibawa satu
  baris yang memuat nomor versi, tanggal rilis, dan isi rilisnya.
- **AC-2.3** Kartu yang menampung baris-baris itu shall menyebut `CHANGELOG.md`
  sebagai tempat entri penuhnya dibaca.

### AC-3 · Comp tetap yang memutuskan tampilan

- **AC-3.1** `site/src/pages/status.astro` shall tidak berubah satu bait pun.
- **AC-3.2** Penyimpangan dari `design/mockups/Caraka Status.dc.html` shall
  tercatat di `site/AGENTS.md` beserta angka yang jadi alasannya.

### AC-4 · Gerbang dan marjin

- **AC-4.1** IF tinggi dokumen `/status` bergeser, THEN baseline di
  `site/e2e/site.spec.ts` shall diperbarui ke nilai terukur, dan komentar di
  atasnya shall mencatat pekerjaan ini beserta selisihnya.
- **AC-4.2** WHILE suite e2e penuh berjalan paralel, test
  `nothing spills past 320px on any route` shall selesai sebelum batas 30 detik
  yang dipasang Playwright untuknya.
- **AC-4.3** Durasi test itu sebelum dan sesudah perubahan shall tercatat di
  `site/e2e/site.spec.ts` beserta bentuk run yang mengukurnya, termasuk bila
  angkanya tidak membaik.
