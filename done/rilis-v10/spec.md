# Spec — Wave 6: rilis publik v1.0

**Slug:** rilis-v10 · **Tanggal:** 8 Agustus 2026 · **Status:** aktif

## Latar

Wave 0 sampai 5 di `plan/v10.md` sudah mendarat: glif topic, audit kebenaran
situs, memori, driver dan multi-workspace, Discord dan dasbor, lalu WhatsApp.
Kode untuk setiap fase `docs/roadmap.md` ada di pohon yang sama, dan
`package.json` masih membaca `0.6.0`.

Yang tersisa adalah Fase 7, dan isinya bukan kemampuan baru. Fase 7 meminta
empat hal yang semuanya berupa teks dan bukti: checklist keamanan yang dijawab
terhadap kode, dokumentasi yang bisa dibaca orang di luar Indonesia, artikel
pembanding dan catatan integrasi yang mengembalikan sesuatu ke ekosistem yang
dipakai proyek ini, dan angka yang selama ini berupa perkiraan.

Satu hal yang tidak diminta Fase 7 tetapi menghalangi Fase 7: `src/` berhenti di
7.996 baris pada `v0.6.0`, empat baris di bawah plafon ~8.000 di `AGENTS.md`.
Tidak ada yang muat sebelum ada yang dihapus.

Dua batas kampanye tetap berlaku dan diulang di sini karena wave inilah yang
paling mudah melanggarnya:

1. **Gerbang lapangan tidak dipalsukan.** Dogfood seminggu, lima rekaman setup,
   A/B dua puluh tugas, dua puluh developer beta, dan empat belas hari WhatsApp
   adalah bukti manusia. Tidak satu pun pernah dijalankan. Nomor versi tidak
   menggantikannya, dan CHANGELOG yang tidak mengatakannya membuat pembaca
   menemukannya sendiri sesudah memasang.
2. **`npm publish` milik pemilik.** Wave ini menyiapkan sampai satu perintah
   terakhir dan berhenti di sana.

## Lingkup

1. Dokumentasi dwibahasa: salinan Inggris untuk halaman yang selama ini dikirim
   ke pembaca Inggris dalam bahasa Indonesia, dan katalog string `en` yang
   menunjuk salinan itu.
2. `docs/openclaw-vs-caraka.md` beserta pasangan Inggrisnya.
3. `docs/integrasi-ekosistem.md` beserta pasangan Inggrisnya.
4. `docs/security.md` §13: setiap baris checklist berstatus `met` dengan nama
   test-nya, atau `deferred` dengan tanggal, alasan, dan syarat penutupnya.
   Test yang dibutuhkan baris `met` ditulis bila belum ada.
5. Pengukuran: cold start, puncak RSS, RAM diam, `caraka doctor`, ukuran
   tarball, dan ukuran pohon terpasang — masuk ke `docs/roadmap.md` dan
   menggantikan tabel perkiraan di `docs/techstack.md`.
6. Penyederhanaan `src/`: pengulangan dilipat menjadi helper bernama, tanpa
   perilaku ikut pindah, sampai ada ruang di bawah plafon.
7. Situs: setiap permukaan yang menyebut versi membaca 1.0, dan keadaan rilis
   dinyatakan satu kata yang sama di semua tempat ia muncul.
8. `package.json` dan `CHANGELOG.md` menyatakan 1.0.0, dan `docs/roadmap.md`
   mencatat setiap gerbang lapangan yang dipindah pasca-rilis dengan tanggalnya.
9. Persiapan publikasi sampai satu perintah, tanpa menjalankannya.

## Yang tidak dikerjakan

- Menjalankan `npm publish`, dan membuat tag `1.0.0`.
- Deploy `caraka.dev`.
- Rute halaman risiko WhatsApp di situs. Rute baru berarti comp baru, gambar OG
  baru, entri `PAGES`, dan baseline tinggi baru; tidak satu pun dibayar wave ini.
- Menerjemahkan `docs/adr/` dan `docs/research/`.
- Menutup empat baris checklist yang tidak bisa ditutup jujur hari ini.
- Menambah preset agar mendekati sasaran G2 ≥ 15 agent. Preset yang tidak pernah
  dijalankan menambah angka, bukan cakupan.
- Mengirim catatan integrasi ke hulu ACP dan Titen.
- Peluncuran ke komunitas.

## Acceptance criteria

### AC-1 · Dokumentasi dwibahasa

- **AC-1.1** WHERE sebuah dokumen `docs/` ditautkan oleh string runtime,
  repositori shall memuat salinan Inggrisnya sebagai `<nama>.en.md`.
- **AC-1.2** WHEN katalog `en` menyebut sebuah dokumen, string itu shall
  menunjuk salinan Inggris dokumen tersebut, bukan aslinya.
- **AC-1.3** WHEN sebuah string runtime menyebut dokumen, string itu shall
  memuat alamat yang bisa dibuka dari mesin yang memasang paket, karena `docs/`
  tidak ada di `files` `package.json`.
- **AC-1.4** IF sebuah dokumen punya pasangan Inggris, THEN kedua berkas shall
  saling menautkan di kepala halaman.

### AC-2 · Artikel pembanding

- **AC-2.1** `docs/openclaw-vs-caraka.md` shall menyebut sekurang-kurangnya satu
  kebutuhan yang jawabannya OpenClaw dan bukan Caraka.
- **AC-2.2** `docs/openclaw-vs-caraka.md` shall tidak menyatakan kemampuan
  Caraka yang tidak ada di `src/` pada commit yang sama.

### AC-3 · Catatan integrasi

- **AC-3.1** `docs/integrasi-ekosistem.md` shall menyebut bahwa Titen dan Caraka
  ditulis penulis yang sama.

### AC-4 · Checklist keamanan

- **AC-4.1** Setiap baris `docs/security.md` §13 shall berstatus `met` atau
  `deferred`.
- **AC-4.2** WHERE sebuah baris berstatus `met`, baris itu shall menyebut nama
  test yang gagal bila klaimnya berhenti benar.
- **AC-4.3** WHERE sebuah baris berstatus `deferred`, baris itu shall menyebut
  tanggal keputusan dan apa yang harus terjadi supaya ia tertutup.
- **AC-4.4** IF sebuah baris `met` tidak punya test, THEN test itu shall ditulis
  di wave ini atau barisnya turun menjadi `deferred`.
- **AC-4.5** IF pengujian menemukan perilaku yang melanggar sebuah baris, THEN
  baris itu shall dicatat sebagai `deferred` dengan temuannya, bukan dihilangkan.

### AC-5 · Pengukuran

- **AC-5.1** WHEN sebuah angka pengukuran ditulis di `docs/`, angka itu shall
  disertai mesin, perintah, dan versi tempat ia dibaca.
- **AC-5.2** IF sebuah pengukuran meleset dari sasaran G3 `docs/prd.md`, THEN
  dokumen shall menyatakan meleset beserta angkanya, bukan menghilangkan
  sasarannya.
- **AC-5.3** `docs/techstack.md` shall tidak lagi memuat tabel perkiraan ukuran
  yang menghitung dependensi yang tidak pernah dipasang.

### AC-6 · Anggaran kompleksitas

- **AC-6.1** WHEN wave ditutup, `find src -name '*.ts' | xargs wc -l` shall
  membaca di bawah 7.996 baris.
- **AC-6.2** WHILE penyederhanaan berjalan, gerbang verifikasi shall tetap
  hijau tanpa satu pun test diubah untuk mengakomodasinya.

### AC-7 · Situs

- **AC-7.1** Situs shall menyatakan 1.0 di setiap tempat sebuah versi rilis
  disebut.
- **AC-7.2** WHERE situs menyebut keadaan rilis, ketiga berkas yang memuatnya
  shall memakai kata yang sama.
- **AC-7.3** Chip npm di `site/src/data/readme.ts` shall tetap membaca versi
  yang ada di registry, karena ia melacak registry dan bukan `package.json`.
- **AC-7.4** Situs shall tidak menyatakan kemampuan yang belum ada di `src/`
  pada commit yang sama.

### AC-8 · Rilis

- **AC-8.1** `package.json` shall membaca `1.0.0`, dan `VERSION` di `src/cli.ts`
  shall membaca angka yang sama.
- **AC-8.2** `CHANGELOG.md` shall memuat entri `[1.0.0]` bertanggal.
- **AC-8.3** Bagian *Limited* entri itu shall menyatakan bahwa tidak ada satu
  pun gerbang lapangan yang pernah dijawab manusia, dan menyebut kelimanya satu
  per satu.
- **AC-8.4** Bagian *Limited* entri itu shall menyatakan bahwa Discord,
  WhatsApp, dan Titen hanya pernah menjawab mock dan fixture.
- **AC-8.5** `docs/roadmap.md` shall mencatat setiap gerbang lapangan yang
  dipindah pasca-rilis dengan tanggal keputusan 8 Agustus 2026.

### AC-9 · Persiapan publikasi

- **AC-9.1** WHEN `npm pack --dry-run` dijalankan sesudah `npm run build`, isi
  tarball, ukurannya, dan perintah tunggal yang akan dijalankan pemilik shall
  tercatat di plan.
- **AC-9.2** IF persetujuan pemilik belum ada, THEN tidak ada `npm publish` yang
  dijalankan dan tidak ada tag `1.0.0` yang dibuat.

### AC-10 · Gerbang verifikasi

- **AC-10.1** WHEN `npm run lint && npm run typecheck && npm test && npm run e2e`
  dijalankan di akar, dan `npm run check && npm run e2e && npm run build` di
  `site/`, seluruhnya shall hijau dengan keluaran ditempel di plan.
