# Spec — panduan-situs: satu halaman yang mengajar jalan dari terpasang sampai bekerja di grup

**Status:** rencana · **Tanggal:** 14 Agustus 2026

## Latar

Pemilik meminta "satu halaman di website berisi petunjuk lengkap yang mudah
dipahami". `spec/grup-nyaman.md` menundanya ke pekerjaan sendiri dan sudah
memutuskan bentuknya: rute `/guide`, tanpa comp, mengimpor stylesheet halaman
lain alih-alih menyalinnya, dengan komentar provenance bergaya
`site/src/data/whatsapp-risk.ts`. Alasan penundaannya juga tertulis, dan alasan
itu sekarang habis: isi halaman ini adalah deskripsi perilaku yang
`grup-nyaman` baru ubah, dan dokumen-dokumen yang dirujuknya baru benar setelah
gerbang pekerjaan itu hijau.

Yang belum ada bukan informasinya. `docs/install-guide.md` menjelaskan
pemasangan, `docs/session-model.md` §5 menjelaskan routing, `docs/security.md`
§5 menjelaskan mode kebijakan, dan `help.direct` beserta `help.room`
(`src/i18n.ts:54-57`) menjelaskan pemakaian di dalam chat. Yang tidak ada adalah
satu tempat yang membacanya berurutan sebagai satu jalan, untuk orang yang baru
selesai memasang dan belum tahu kenapa pesannya di grup tidak dijawab.

Tiga hal membuat jalan itu tidak bisa ditebak sendiri oleh pembaca, dan
ketiganya baru mendarat di 1.4.3:

- **Topic sesi bukan lagi pengecualian gerbang sapaan.** Sebelum 1.4.3, setiap
  baris di topic sesi adalah prompt. Sekarang pesan di sana harus menyebut
  Caraka atau membalas salah satu pesannya, sama seperti di sisa ruangan
  (`docs/frd.md` FR-CHAN-09). Orang yang mengetik satu kalimat di topic sesi dan
  tidak dijawab tidak punya cara menduga sebabnya.
- **Sesi yang selesai menutup topic-nya.** Di grup, komposer di topic itu hilang
  untuk setiap anggota yang bukan admin ber-`can_manage_topics`
  (`docs/session-model.md` §5). Itu trade yang dipilih sadar, dan halaman yang
  tidak menyebutnya membiarkan pembaca menyimpulkan ada yang rusak.
- **Bentuk `/new <folder> <judul>` diterima dari ruangan, dari operator saja,
  dengan kartunya di DM operator** (ADR-0011). Ruangan hanya menerima satu
  kalimat tetap yang menyebut di mana jawabannya diberikan, jadi orang yang
  mengirimnya dari grup melihat jawaban yang tidak menjelaskan apa pun tanpa
  halaman yang menjelaskannya.

Selain itu ada dua prasyarat yang bukan milik Caraka dan tidak bisa dibangun:
akun aplikasi chat beserta token bot dari @BotFather, dan grup yang sudah
dinyalakan Topics-nya oleh pemiliknya. Halaman ini menyebut keduanya sebagai hal
yang pembaca sediakan sendiri.

### Kenapa rute baru dan bukan bab di `/docs`

`/docs` menjawab "apa yang perangkat lunak ini lakukan, dan apa yang sengaja
tidak". Pembacanya orang yang menimbang, dan strukturnya daftar kemampuan.
Halaman ini menjawab "saya sudah memasang, sekarang bagaimana", dan
strukturnya urutan langkah. Menambahkannya sebagai bab kesembilan `/docs`
membuat satu halaman melayani dua pertanyaan dengan satu daftar isi, dan
`/docs` sudah 7.403px.

### Preseden yang diikuti, dan ia satu-satunya

`site/AGENTS.md` menyatakan comp di `design/mockups/` yang memutuskan desain,
dan rute baru tidak punya comp. Ada tepat satu preseden untuk itu:
`/whatsapp-risk`, yang merender sebuah dokumen markdown di `docs/` dan
**mengimpor** `security.css` alih-alih memiliki salinannya, karena halaman itu
dibangun dari bentuk-bentuk yang comp keamanan sudah port. Halaman ini mengikuti
preseden itu apa adanya: bentuknya milik comp `Caraka Docs.dc.html` yang sudah
di-port `/docs` — bab bernomor, rel kanan, tabel baris, blok terminal, panel
catatan — jadi yang diimpor `src/styles/pages/docs.css`, dan tidak ada
`guide.css`. Aturannya berlaku, bukan dilonggarkan: satu berkas tidak bisa
menyimpang dari dirinya sendiri, dan halaman yang punya comp sendiri tidak
pernah berbagi.

## Ruang lingkup

`site/src/pages/guide.astro` (baru), `site/src/data/guide.ts` (baru),
`site/src/lib/site.ts` (`PageKey` `guide`, entri `PAGES`, satu baris di `NAV`),
`site/src/pages/index.astro` dan `site/src/data/landing.ts` (header, menu
ponsel, `footerLinks`), `site/src/pages/docs.astro` dan
`site/src/pages/install.astro` (header, menu ponsel, footer),
`site/e2e/site.spec.ts` (baseline tinggi `/guide` dan baseline apa pun yang
bergeser), `site/e2e/mobile.spec.ts` (`NAVIGATED`, `WITH_TOC`),
`site/AGENTS.md` (rute tanpa comp, dan tautan Guide sebagai penyimpangan dari
comp), `src/i18n.ts` (empat penunjuk "versi panjang" di `help.direct` dan
`help.room`, dua katalog).

## Yang tidak dikerjakan

- **Tidak ada comp baru di `design/mockups/`.** Halaman ini tidak menuntutnya,
  dan comp yang digambar sesudah kodenya bukan sumber kebenaran desain, ia
  gambar dari kode.
- **Tidak ada `site/src/styles/pages/guide.css`.** Preseden `/whatsapp-risk`,
  dan alasannya ada di `site/AGENTS.md`: sembilan nama keyframe punya nilai
  berbeda di comp yang berbeda, jadi salinan kedua `docs.css` adalah dua nilai
  yang bisa berselisih.
- **Tidak ada entri di `CARDS` pada `site/scripts/gen-assets.mjs`.** Rute yang
  tidak digambar comp OG mendapat kartu netral, seperti `/whatsapp-risk` dan
  keempat halaman brand. `ogHeadline`-nya tetap ada karena ia yang menjadi
  `og:image:alt`.
- **Tidak ada nomor versi di halaman ini.** `site/AGENTS.md` menyebut dua
  permukaan pembawa versi yang disapu tangan; halaman ketiga adalah tempat
  ketiga yang bisa tertinggal. Keadaan rilis disebut dengan satu kata,
  `unproven`, tanpa angka di sampingnya.
- **Halaman ini tidak menjadi tempat keempat yang menyatakan keadaan rilis.**
  Tiga berkas sudah memegangnya (`src/data/status.ts`, `src/data/compare.ts`,
  `src/data/security.ts`), dan `site/AGENTS.md` melarang keempatnya berselisih.
  Yang halaman ini tulis adalah batas-batas yang mengikat petunjuknya sendiri —
  channel mana yang pernah dijalankan, dan apa yang belum pernah diuji terhadap
  server sungguhan — bukan penilaian ulang atas kematangan rilis.
- **Tidak ada versi Indonesia dari halaman ini.** Situs menyatakan satu bahasa
  per rute dan tidak punya pemilih bahasa, yang `docs/roadmap.md` catat sebagai
  kotak yang masih terbuka. Semua rute isi berbahasa Inggris, dan halaman ini
  ikut.
- **Baris `/new [title] [@slug]` di `site/src/data/docs.ts` tidak diperbaiki di
  sini**, meskipun urutannya sudah tidak cocok dengan `markWorkspace`: `routeTask`
  membaca `/^@(\S+)/` yang berjangkar di awal, jadi folder mendahului judul.
  Memperbaikinya menggeser baseline `/docs` dan itu concern lain. Halaman ini
  mencetak bentuk yang benar, dan spec ini mencatat bahwa yang lama salah.
- **Tautan Guide tidak dipasang di setiap header dan setiap footer.** Tiga
  header (`/`, `/docs`, `/install`) dan tiga footer (`/`, `/docs`, `/install`)
  saja, karena ketiganya jalan masuk orang yang baru memasang. Menyentuh
  sepuluh halaman lain menagih sepuluh baseline untuk tautan yang sudah bisa
  dicapai dari header.
- **Tidak ada dokumen baru di bawah `docs/`.** Setiap klaim halaman ini melacak
  ke dokumen atau kode yang sudah ada, yang `site/AGENTS.md` tuntut, dan dokumen
  yang ditulis bersamaan dengan halaman yang merendernya adalah satu klaim yang
  membuktikan dirinya sendiri.
- **Tidak ada `/guide` di sitemap khusus, feed, atau pencarian di situs.** Situs
  belum punya ketiganya.
- **Tidak ada tangkapan layar chat.** Setiap gambar chat menua pada rilis
  berikutnya dan tidak ada test yang bisa membacanya. Bentuk perintah dicetak
  sebagai teks di blok terminal yang comp `Caraka Docs.dc.html` sudah punya.
- **Tidak ada halaman troubleshooting.** `docs/troubleshooting.md` sudah ada, dan
  bagian penolakan di halaman ini menjawab penolakan yang Caraka sendiri kirim,
  bukan kegagalan pemasangan.

## Acceptance criteria

### AC-1 · Rute, dan tempatnya di antara rute lain

- **AC-1.1** Situs shall menyajikan `/guide` sebagai halaman statis dengan
  `PageKey` `guide` dan `lang="en"`.
- **AC-1.2** Halaman `/guide` shall mengimpor `src/styles/pages/docs.css`, dan
  `site/src/styles/pages/` shall tidak memuat berkas `guide.css`.
- **AC-1.3** `/og/og-guide.png` shall ada dan shall lebih besar dari 1.000 byte.
- **AC-1.4** `site/AGENTS.md` shall menyebut `/guide` di kalimat yang mencatat
  rute tanpa comp, di samping `/whatsapp-risk`, beserta stylesheet yang
  dipinjamnya.
- **AC-1.5** WHEN lebar viewport di bawah 1040px, `/guide` shall menawarkan
  daftar isi yang sama dengan rel kanannya, dengan nomor dan urutan yang sama.
- **AC-1.6** IF tinggi dokumen sebuah rute bergeser karena tautan yang
  ditambahkan pekerjaan ini, THEN baseline di `site/e2e/site.spec.ts` shall
  diperbarui ke angka terukur, dan bukan ke angka yang ditebak.
- **AC-1.7** `site/e2e/mobile.spec.ts` shall memuat `/guide` di `NAVIGATED` dan
  di `WITH_TOC`.

### AC-2 · Bisa dijangkau

- **AC-2.1** Header `/`, `/docs`, dan `/install` shall memuat satu tautan ke
  `/guide`.
- **AC-2.2** WHERE lebar viewport menyembunyikan `[data-navlinks]`, menu ponsel
  ketiga halaman itu shall memuat tautan yang sama, karena test paritas menu
  membandingkan keduanya.
- **AC-2.3** Footer `/`, `/docs`, dan `/install` shall memuat satu tautan ke
  `/guide`.
- **AC-2.4** `NAV` di `site/src/lib/site.ts` shall tetap menggambarkan header
  `/` apa adanya, jadi ia shall memuat entri Guide.
- **AC-2.5** `help.direct` dan `help.room` shall menunjuk `caraka.dev/guide`
  sebagai versi panjang, di kedua katalog, dan `caraka.dev/docs` shall tidak
  tersisa di satu pun dari keempat badan itu.

### AC-3 · Jalan dari terpasang sampai bekerja di grup

- **AC-3.1** Halaman shall menyebut apa yang pembaca sediakan sendiri sebelum
  satu perintah pun jalan: akun aplikasi chat, token bot dari @BotFather, Node
  22+, Git, dan coding agent yang sudah masuk.
- **AC-3.2** Halaman shall menyebut bahwa tautan pairing yang `caraka init`
  cetak memasangkan siapa pun yang membukanya lebih dulu, bekerja sekali, dan
  mati dalam lima menit.
- **AC-3.3** Halaman shall menyebut bahwa kartu pairing grup tiba di percakapan
  pribadi operator dan tidak di grup, dan bahwa yang menambahkan bot harus ada
  di allowlist pengirim.
- **AC-3.4** Halaman shall menyebut dua syarat yang memutuskan apakah tiap tugas
  mendapat topic sendiri di grup — grup itu forum, dan Caraka admin
  ber-`can_manage_topics` — dan shall menyebut bahwa tanpa keduanya sesi
  berjalan linier di belakang satu baris kepala.
- **AC-3.5** Halaman shall menyebut harga hak itu: bot admin menerima setiap
  pesan di grup.
- **AC-3.6** Halaman shall menyebut ketiga cara menujukan pesan kepada Caraka,
  dan shall menyatakan bahwa gerbang itu berlaku di dalam topic sesi juga.
- **AC-3.7** WHERE privacy mode masih hidup, halaman shall menyebut bahwa pesan
  biasa di grup tidak tiba sama sekali, dan bahwa itu Telegram dan bukan
  kesalahan.
- **AC-3.8** Setiap bentuk perintah yang halaman cetak shall cocok dengan yang
  `src/core/gateway.ts` terima: folder mendahului judul di `/new`, `@slug`
  berada di awal baris, dan tiga belas nama perintah itu yang terdaftar.
- **AC-3.9** Halaman shall menyebut bahwa bentuk path hanya dibaca dari operator
  channel, bahwa jawabannya diberikan di percakapan pribadi operator, dan bahwa
  ruangan menerima satu kalimat tetap yang tidak bercabang atas apa pun.
- **AC-3.10** Halaman shall menyebut bahwa kartu approval bekerja sekali,
  kedaluwarsa dalam sepuluh menit, dan tidak bisa dijawab dengan kata apa pun;
  dan WHERE channel tidak punya tombol, shall menyebut kode yang tercetak di
  kartu sebagai satu-satunya cara memutuskan.
- **AC-3.11** Halaman shall menyebut bahwa sesi yang berakhir menutup topic-nya
  dan tidak menghapusnya, dan bahwa di grup anggota yang bukan admin
  ber-`can_manage_topics` tidak bisa lagi menulis di sana.
- **AC-3.12** Halaman shall memberi satu jalan keluar untuk tiap penolakan yang
  Caraka kirim ke pemakai: ruangan yang `read-only`, bentuk path dari bukan
  operator, path yang bukan direktori, path yang tumpang-tindih dengan workspace
  yang ada, slug yang tidak bisa dipakai, dan `/yolo` di ruangan yang belum
  di-opt-in.

### AC-4 · Tidak mengklaim lebih dari yang terbukti

- **AC-4.1** Halaman shall memakai kata `unproven` untuk keadaan rilis dan shall
  tidak menggantinya dengan kata kematangan yang gerbang lapangan harus dapatkan
  lebih dulu.
- **AC-4.2** Halaman shall tidak memuat satu pun nomor versi.
- **AC-4.3** Halaman shall menyebut batas yang mengikat petunjuknya sendiri:
  jalur Discord belum pernah menyentuh Discord sungguhan, belum pernah ada nomor
  WhatsApp yang ditautkan, dan penutupan serta pembukaan topic belum pernah
  dijalankan terhadap forum supergroup sungguhan.
- **AC-4.4** Halaman shall lulus test kejujuran yang sudah ada di
  `site/e2e/site.spec.ts`, yang membaca setiap rute di `PAGES` dan menolak klaim
  adopsi maupun kematangan.

### AC-5 · Gerbang

- **AC-5.1** `npm run check`, `npm run build` terhadap `dist/` yang dihapus
  lebih dulu, dan `npm run e2e` shall hijau, dan keluarannya shall ditempel di
  plan apa adanya.
- **AC-5.2** `npm run verify` dari akar repositori shall hijau, karena
  `src/i18n.ts` disentuh.
- **AC-5.3** Baseline tinggi `/guide` shall diukur di Chromium 1440x900
  terhadap `dist/` segar, dan angkanya shall ditulis di plan.

## Harga

Di `site/`, sekitar 300 baris untuk `guide.astro` dan `guide.ts` bersama,
terhadap `/whatsapp-risk` yang memakai 286 + 155. Perkiraan `spec/grup-nyaman.md`
untuk pekerjaan ini adalah "sekitar 500 baris", ditulis sebelum bentuk isinya
diputuskan; selisihnya akan diukur dan dicatat di plan, apa pun hasilnya.

Di `src/`, empat karakter dikali empat string: penunjuk versi panjang di
`help.direct` dan `help.room`, dua katalog. Ledger anggaran `AGENTS.md` tidak
bergerak karena tidak ada baris yang lahir atau mati.
