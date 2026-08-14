# Spec — menu-satu-set: satu menu di semua halaman, dan tanda halaman yang sedang dibuka

**Status:** selesai · **Tanggal:** 14 Agustus 2026

## Latar

Delapan halaman caraka.dev memasang delapan menu yang berbeda. Yang dibawa
masing-masing hari ini:

| Halaman | Menu di header |
|---|---|
| `/` | Guide, Docs, Install, Compare, Security |
| `/docs` | Home, Guide, Compare, Install, Story |
| `/install` | Home, Guide, Docs, Security |
| `/security` | Home, Docs, Install |
| `/status` | Home, Docs, Install |
| `/compare` | Home, Docs, Story |
| `/story` | Home, Docs, Compare, Install |
| `/guide` | Home, Docs, Install, Security, Status |

Tidak ada dua yang sama. Akibatnya sebuah rute bisa hilang tergantung di mana
pembacanya berdiri: `/status` tidak ada di satu pun header kecuali `/guide`,
`/guide` hanya ada di tiga, dan dari `/security` maupun `/status` tidak ada jalan
ke `/compare`, `/story`, atau `/guide` sama sekali.

Sebabnya bukan keputusan desain yang berlaku menyeluruh. Tiap comp di
`design/mockups/` digambar sendiri-sendiri dan masing-masing memilih tiga sampai
empat saudaranya; port-nya menyalin pilihan itu apa adanya, seperti seharusnya.
Yang tidak ada di comp mana pun adalah gambaran menyeluruh, karena tidak ada satu
comp pun yang memuat delapan halaman sekaligus. `NAV` di `src/lib/site.ts` sudah
menyatakan dirinya "the links in the fixed header" dan hanya `/` yang benar-benar
memakainya — komentar itu keliru sejak `/guide` ada.

Hal kedua yang tidak ada: tanda halaman yang sedang dibuka. Halaman dalam tidak
pernah menautkan dirinya sendiri, jadi tanda "kamu di sini" satu-satunya adalah
lencana merah di sebelah wordmark (`DOCS`, `SECURITY`). Menu-nya sendiri diam.

## Ruang lingkup

`site/src/components/SiteHeader.astro` (baru), `site/src/components/MobileMenu.astro`,
`site/src/lib/site.ts`, delapan berkas di `site/src/pages/`, `site/src/styles/global.css`,
`site/test/fidelity.test.js`, `site/e2e/site.spec.ts`, dan catatan penyimpangan di
`site/CLAUDE.md`.

## Yang tidak dikerjakan

- **Footer tidak disatukan.** Footer tiap halaman juga berbeda isi, dan itu
  memang gambar comp-nya masing-masing — sebuah footer yang panjangnya berbeda
  adalah bagian dari komposisi halaman, sedangkan header adalah satu batang yang
  sama di kedelapan comp. Footer `/` sudah memuat kedua belas tautan termasuk
  `/status` dan `/story`.
- **`/status` dan `/story` tidak masuk menu.** Tujuh butir di satu baris header
  mulai membungkus di lebar yang comp-nya pakai; keduanya endnote, bukan rute
  yang dibaca berurutan, dan keduanya ada di footer `/`.
- **Lencana halaman tidak dicabut.** Ia gambar comp dan ia yang menamai halaman;
  titik di menu menandai posisi, lencana menyebut namanya.
- **Tidak ada JavaScript baru.** Situs ini mengirim satu berkas skrip sepanjang
  60 baris dan penanda halaman tidak menambah satu pun ke dalamnya.

## Acceptance criteria

- **AC-1** WHERE sebuah halaman memasang header situs, header itu shall memuat
  keenam tautan `NAV` dalam urutan yang sama, tanpa kecuali.
- **AC-2** WHERE halaman yang sedang dibuka ada di `NAV`, tautannya shall membawa
  `aria-current="page"`.
- **AC-3** WHERE sebuah tautan menu menandai halaman yang sedang dibuka, ia shall
  menggambar titik di bawah labelnya dan mewarnai labelnya dengan warna merek.
- **AC-4** WHILE penunjuk berada di atas tautan menu yang bukan halaman yang
  sedang dibuka, titik yang sama shall muncul lebih redup dan hilang lagi saat
  penunjuk pergi.
- **AC-5** IF mesin peramban tidak mendukung animasi yang dipakai titik itu,
  THEN titik penanda shall tetap terlihat pada halaman yang sedang dibuka.
- **AC-6** WHERE pembaca memakai `prefers-reduced-motion: reduce`, denyut pada
  titik shall berhenti dan titiknya shall tetap terlihat.
- **AC-7** WHERE lebarnya di bawah 940px, menu ringkas shall memuat keenam tautan
  yang sama dan menandai halaman yang sedang dibuka dengan cara yang sama.
- **AC-8** WHEN sebuah halaman baru ditambahkan ke `NAV`, kedelapan header shall
  ikut membawanya tanpa satu pun berkas halaman disunting.
