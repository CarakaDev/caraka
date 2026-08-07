# Plan — situs caraka.dev di layar telepon

**Spec:** [`spec.md`](spec.md) · **Standar:** [`standards/ears.md`](../../standards/ears.md)

---

## 1. Batasan yang membentuk semua keputusan

AC-6 mengatakan rendering desktop tidak boleh bergeser satu piksel. Konsekuensinya keras dan menentukan bentuk seluruh pekerjaan ini:

**Setiap perilaku telepon hidup di dalam media query, dan setiap elemen baru berawal `display: none`.** Markup mockup diport dengan gaya *inline*, dan gaya inline mengalahkan aturan stylesheet apa pun tanpa `!important`. Karena itu tidak ada satu pun nilai inline yang disentuh; yang ditambahkan hanya elemen baru yang tidak terlihat di atas 940px, dan aturan `@media` yang mematikannya di sana.

Titik potong **940px** dipakai untuk header dan papan brand, sama dengan titik potong rel kanan di mockup. Daftar isi memakai titik potongnya sendiri — 1040px atau 1080px, tergantung halaman — karena mockup sudah menetapkannya berbeda per halaman.

## 2. Menu header

`<details>` dan `<summary>`, bukan tombol dengan state di JavaScript.

Alasannya bukan penghematan baris. `<summary>` sudah punya peran tombol, sudah bisa difokus, sudah mengumumkan buka-tutup ke pembaca layar, dan sudah membuka-tutup tanpa skrip. Menulis ulang semua itu dengan `aria-expanded` dan penangan klik berarti mengganti sesuatu yang benar dengan tiruannya. AC-2.5 lunas tanpa satu baris pun.

Yang tetap butuh skrip hanya dua, dan keduanya tidak disediakan `<details>`:

- **`Escape` menutup menu.** Delegasi `keydown` di dokumen.
- **Isi di belakang tidak ikut tergulir.** Event `toggle` menyalakan `overflow: hidden` di `body`.

Delapan baris di `ck.js`, di samping tombol salin yang sudah ada.

Komponen `MobileMenu.astro` menerima daftar tautan dan dirender di dalam `<header>` tiap halaman. Ia `display: none` di atas 940px, jadi header desktop tetap persis seperti sekarang.

## 3. Daftar isi

Pola yang sama. `MobileToc.astro` merender daftar yang sama dengan `<aside data-toc>` desktop, terlipat, tepat di atas isi halaman. Tertutup saat dimuat (AC-3.4), dan `scroll-margin-top` yang sudah ada di `global.css` menangani AC-3.3 tanpa tambahan apa pun.

Dipasang di empat halaman yang punya daftar isi: `/docs`, `/install`, `/security`, `/brand/ui-kit`. Datanya sudah ada di berkas `src/data/*.ts` masing-masing, jadi tidak ada isi yang ditulis ulang atau digandakan.

## 4. Papan brand

`/brand` dan `/brand/warna` adalah kanvas tetap 1200px, tanpa satu pun `min()` di shell-nya. Keduanya di-reflow jadi satu kolom di bawah 941px.

Karena gaya inline tidak bisa ditimpa dari stylesheet, shell-nya diberi kelas, lalu media query mengambil alih di bawah titik potong. Nilai desktop-nya tetap tertulis di `style` dan tetap menang di atas 940px.

Yang **tidak** di-reflow: kisi konstruksi lambang, deret ukuran mark, dan uji buta warna. Ketiganya hanya bermakna pada ukuran aslinya — mengecilkan kisi konstruksi menghapus hal yang justru sedang ditunjukkannya. Ketiganya masuk wadah yang menggulir mendatar, dengan penanda tepi (AC-4.4, AC-1.3).

## 5. Sasaran ketuk

Diperluas dengan pseudo-elemen, bukan dengan `padding`: `padding` menggeser tata letak, dan tata letak tidak boleh bergeser. Aturannya diberi lingkup pada kelas tautan yang sudah ada dan pada isi header, daftar isi, serta footer — bukan pada setiap `<a>` di halaman, karena banyak `<a>` sudah membawa `position` inline yang akan bertabrakan.

Hanya berlaku di bawah `pointer: coarse`, sehingga tetikus di layar sempit tidak ikut terkena.

## 6. Pembuktian tiap AC

| AC | Cara dibuktikan |
|---|---|
| AC-1.1 | e2e: `scrollWidth <= clientWidth` untuk sebelas rute di 320/375/390/412px |
| AC-1.2, AC-1.3 | e2e: setiap elemen yang lebih lebar dari viewport punya leluhur ber-`overflow-x: auto` |
| AC-2.1, AC-2.6 | e2e: tombol menu terlihat di 390px dan tidak terlihat di 1440px |
| AC-2.2 | e2e: himpunan teks tautan di menu telepon sama dengan himpunan di header desktop |
| AC-2.3 | e2e: `Escape` menutup menu |
| AC-2.4 | e2e: `body` tidak tergulir selagi menu terbuka |
| AC-2.5 | `<summary>` — perilaku bawaan; e2e memeriksa perannya `group`/`button` dan atribut `open` |
| AC-3.1, AC-3.2 | e2e: jumlah dan teks butir daftar telepon sama dengan daftar desktop |
| AC-3.3 | sudah dijamin `[id] { scroll-margin-top }`; e2e memeriksa nilainya |
| AC-3.4 | e2e: `details` tidak ber-`open` saat dimuat |
| AC-4.1 | e2e: tidak ada luberan di `/brand` dan `/brand/warna` pada empat lebar |
| AC-4.2 | unit: setiap nilai hex dan nama nada di berkas data papan masih ada di markup |
| AC-4.3 | unit: setiap lambang membawa `translateY(17.5%)` |
| AC-4.4 | e2e: spesimen berukuran tetap berada di dalam wadah yang menggulir |
| AC-5.1, AC-5.2 | e2e: tidak ada sasaran di bawah 44px pada viewport telepon; tinggi dokumen desktop tidak berubah |
| AC-6.1, AC-6.2 | `npm run compare` — tinggi dokumen kesepuluh rute dibandingkan dengan mockup, harus tetap sama persis |

## 7. Risiko

**Gaya inline menang.** Ini bukan kemungkinan, ini kepastian, dan seluruh rencana disusun mengelilinginya. Satu-satunya cara aman mengubah tata letak di telepon adalah lewat kelas pada elemen yang sudah ada plus media query, tidak pernah dengan mengedit `style`.

**Reflow papan menggeser desktop.** Tertangkap AC-6: `npm run compare` membandingkan tinggi dokumen tiap rute dengan mockup-nya. Kesepuluhnya sama persis sebelum pekerjaan ini dimulai, jadi setiap pergeseran adalah regresi yang diperkenalkan di sini.

**`<details>` diberi gaya berbeda antar mesin peramban.** WebKit memberi `<summary>` penanda segitiga bawaan yang perlu dimatikan lewat `::-webkit-details-marker`. E2E berjalan di webkit, jadi ini akan ketahuan.

## 8. Keluaran verifikasi

Dijalankan 7 Agustus 2026, dari `site/`.

```
$ npm run lint            (tanpa keluaran — tanpa temuan)
$ npm run typecheck       0 errors, 0 warnings, 0 hints
$ npm test                20 passed (2 files)
$ npm run e2e             92 passed, 2 skipped
                          chromium · firefox · webkit · Pixel 7 · iPhone 14
$ ../scripts/scan-secrets.sh
                          clean: 182 tracked files, no credentials
```

Dua yang dilewati adalah test baseline tinggi dokumen di firefox dan webkit; ia sengaja dibatasi ke chromium (lihat §7).

### Di `caraka.dev`, iPhone 14, setelah deploy

Kesebelas rute membalas 200 dan **tidak satu pun meluber** — `scrollWidth − clientWidth` bernilai 0 di semuanya. Menu hadir di delapan halaman bernavigasi, daftar isi hadir di empat halaman berdaftar-isi. Sebelumnya, di lebar yang sama, tujuh header meluber 82–141px dan dua papan meluber 810px.

### Yang tertangkap karena diukur, bukan karena dilihat

Empat cacat lolos dari pemeriksaan mata dan hanya jatuh saat diukur:

- **Panel `<details>` yang tertutup tetap punya kotak layout**, dan anak ber-`position: absolute` lolos dari penyembunyian bawaan peramban sepenuhnya. Panel terukur 34×273 dalam keadaan tertutup, jadi tautannya bisa dicapai `Tab` dari halaman yang tampak tertutup.
- **Kunci gulir tidak mengunci apa pun.** `body` memang `overflow: hidden`, tetapi yang menggulir adalah elemen akar; halaman tetap bergulir ke 900px. iOS Safari mengabaikan `overflow: hidden` di akar juga, sehingga hanya menyematkan `body` dengan `position: fixed` yang bertahan di keduanya.
- **Panel menu tembus pandang.** Header sudah memasang `backdrop-filter`, yang menjadikannya *backdrop root*; blur milik anaknya tidak punya apa pun untuk disampel, dan transparansi 3% membuat isi halaman terbaca menembus menu.
- **Gradien tepi pada wadah yang menggulir melukis nol.** Diukur agen verifikasi: fade berjalan dari `rgba(8,11,16,0)` ke `#080B10` di atas lapisan `#080B10` — secara aritmetika tidak melakukan apa-apa. Delta maksimum 0,43 dari 255.

Satu lagi yang tertangkap tetapi tidak diperbaiki di sini: region yang menggulir tidak bisa dicapai papan ketik di WebKit — dibuktikan dengan menekan `Tab` 80 kali. Chromium dan Firefox memfokuskan wadah yang meluber dengan sendirinya; WebKit tidak. Diperbaiki di `ck.js` dengan memasang `tabindex` berdasarkan pengukuran, hanya selama elemennya benar-benar meluber.

### Yang tersisa

`-webkit-mask-image` dijatuhkan bundler, sehingga penanda tepi hilang di iOS Safari di bawah 15.4. Strip-nya tetap menggulir. Tidak dikejar: versi itu terbit Maret 2022.
