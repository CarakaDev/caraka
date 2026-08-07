# Plan — permukaan merek

**Spec:** [`spec.md`](spec.md) · **Standar:** [`standards/ears.md`](../../standards/ears.md)

---

## 1. Urutan, dan kenapa begitu

Tree ini sedang dikerjakan dua pihak: implementasi v0.1 di `src/`, `test/`, `bin/`, dan sebagian `docs/` berjalan paralel. Karena itu pekerjaan ini dibatasi pada berkas yang tidak disentuh pihak lain, dan berkas milik pihak lain tidak pernah di-*stage*.

1. **Impor** — dua belas comp, `docs/brand.md`, dan aset masuk ke tempatnya. Aset kehilangan akhiran `.txt`; comp menimpa versi lama.
2. **Lambang** — sebelas substitusi cincin→kotak di halaman Astro.
3. **Kartu OG** — generator ditulis ulang dari comp barunya.
4. **README** — desain comp digabung dengan keadaan v0.1 yang sudah diverifikasi.
5. **Verifikasi, deploy, tutup.**

Langkah 2 dan 3 berjalan paralel; keduanya tidak berbagi satu berkas pun.

## 2. Kenapa statusnya v0.1, bukan pra-alfa

Comp dan repositori bertentangan: comp menulis "nothing useful to install yet", pekerjaan paralel menulis "v0.1 preview: usable with Claude Code over ACP". Dua klaim berlawanan tentang apakah perangkat lunaknya jalan, dan yang satu ini menentukan seluruh copy README, kartu OG, dan profil org.

Diputuskan dengan menjalankan kodenya, bukan dengan memilih:

```
npm run typecheck   0 errors
npm test            6 pass — pengikatan approval, pemecah pesan Telegram,
                    retry 429 dengan fallback, penanganan rahasia
npm run e2e         1 pass — "private allowlisted Telegram message reaches
                    Claude and signed approval returns once"
```

Itu alur v0.1 yang utuh, lulus. Desain visual comp dipakai apa adanya; kalimat statusnya diambil dari kode yang jalan.

Satu hal yang tetap perlu disebut: registry npm masih menyajikan `0.0.0`, sedangkan `package.json` sudah `0.1.0`. Sampai `0.1.0` terbit, `npx caraka init` masih mengambil rilis penampung.

## 3. Lambang

`docs/brand.md` menetapkan ambangnya di 48px, dan comp sudah dikoreksi. Halaman Astro-nya menyusul: delapan lockup header, satu lockup footer landing, dan dua kolofon.

Yang **tidak** disentuh, karena aturannya tidak berlaku di sana: lambang hero landing (286px), enam puluh spesimen cincin di logo book, dan indikator gerak ∞ yang dikecualikan `docs/brand.md` dengan menyebut alasannya — ia komponen *loading*, bukan lambang identitas.

## 4. Kartu OG

Comp menetapkan satu kerangka dan delapan isi. Yang mengikat:

- Judul 58px, maksimal dua baris, **tidak pernah mengecil**. Kalimat yang tidak muat adalah kalimat yang salah, dan diperbaiki di `site.ts`.
- Padding aman 72px di setiap tepi. LinkedIn dan Telegram memotong tepi.
- Bilah bab di tepi atas terisi sesuai posisi halaman dalam urutan situs.
- Motif mengulang isi halaman dan tidak menambah apa pun.
- Tiga fakta mono. Bukan empat.

Berkasnya berganti nama dari `<halaman>.png` menjadi `og-<halaman>.png`, mengikuti comp, dan `ogPath()` ikut berubah supaya meta tag menunjuk ke nama baru.

satori tidak mendukung `repeating-conic-gradient`, `mask-image`, sebaran `box-shadow`, atau `text-shadow`, dan dukungan `radial-gradient`-nya sebagian. Motif yang tidak bisa digambar setia digambar sedekat mungkin dan **penyederhanaannya dicatat** — kolom motif yang kosong lebih buruk daripada pendekatan, dan pendekatan yang tidak dicatat lebih buruk daripada keduanya.

## 5. README

Comp memberi kerangka: banner, badge, baris navigasi, diagram alur, dan bagian bernarasi. Implementasi v0.1 memberi isinya: langkah pemasangan sungguhan, prompt pemasangan lewat AI, daftar perintah, dan model keamanan yang benar-benar berlaku.

Empat kalimat comp yang sudah tidak akurat diperbaiki, bukan disalin:

| Comp | Keadaan v0.1 |
|---|---|
| "nothing useful to install yet" | pratinjau v0.1, bisa dipakai |
| "Bind ke `127.0.0.1`" | tidak ada port listener sama sekali |
| "Grup bersifat read-only" | grup belum ada di rilis ini |
| memori sebagai fitur yang berjalan | dispesifikasikan, belum dikirim |

Bagian **Yang belum ada di v0.1** ditambahkan supaya yang belum dikirim disebut sekali, jelas, alih-alih disamarkan.

Diagram alur disimpan dua kali: sebagai `assets/flow.svg` untuk GitHub, dan sebagai teks polos di dalam `<details>` untuk npm, yang tidak merender gambar berpath relatif. Path-nya relatif, bukan `raw.githubusercontent`, karena raw menyajikan SVG sebagai teks.

## 6. Pembuktian tiap AC

| AC | Cara dibuktikan |
|---|---|
| AC-1.1–1.3 | diff lockup tiap halaman terhadap comp-nya, karakter per karakter |
| AC-1.4, AC-1.5 | hitung cincin di comp dan di port; angkanya harus sama |
| AC-1.6 | pencarian `translateY(17.5%)` pada setiap elemen beraksara |
| AC-2.1 | satu PNG 1200×630 per kunci di `PAGES` |
| AC-2.2, AC-2.3 | ukur tinggi baris judul tiap kartu terhadap dua kotak baris |
| AC-2.4 | potong bingkai 72px tiap kartu; sisanya harus latar saja |
| AC-2.5 | ambil sampel baris 3px teratas; ukur di mana gradiennya berhenti |
| AC-2.7 | hitung fakta mono per kartu |
| AC-2.8 | `test/og-glyphs.test.js` |
| AC-2.9 | daftar penyederhanaan dalam laporan, ditinjau agen kedua |
| AC-3.1–3.3 | pembacaan manusia terhadap keadaan kode yang sudah diukur |
| AC-3.4 | setiap tautan relatif diuji keberadaannya |
| AC-3.5, AC-3.6 | pencarian `<details>` dan pencarian `raw.githubusercontent` |
| AC-4.1, AC-4.2 | daftar berkas; pencarian aksara di dalam SVG |
| AC-5.1 | `test/fidelity.test.js` |
| AC-5.2 | `e2e/site.spec.ts`, baseline tinggi dokumen |
| AC-5.3 | gerbang penuh di lima proyek peramban |

## 7. Risiko

**Menimpa pekerjaan orang lain.** Yang paling mungkin merugikan di sini. `README.md`, `README.id.md`, dan `docs/brand.md` disunting oleh pekerjaan ini; `src/`, `test/`, `bin/`, `package.json`, dan `docs/` lainnya tidak. Hanya berkas milik pekerjaan ini yang di-*stage*.

**Comp lebih tua dari kode.** Sudah terjadi sekali, pada kalimat status. Setiap klaim comp yang menyangkut perilaku diperiksa terhadap `src/` sebelum disalin.

## 8. Keluaran verifikasi

Dijalankan 7 Agustus 2026, dari `site/`.

```
$ npm run lint          (tanpa keluaran — tanpa temuan)
$ npm run typecheck     0 errors, 0 warnings, 0 hints
$ npm test              22 passed
$ npm run e2e           98 passed, 2 skipped
                        chromium · firefox · webkit · Pixel 7 · iPhone 14
$ ../scripts/scan-secrets.sh
                        clean: 171 tracked files, no credentials
```

### Di `caraka.dev` setelah deploy

Ketiga belas rute membalas 200, **luberan nol** di iPhone 14, dan tiap halaman menunjuk kartunya sendiri. Ketiga belas kartu tersaji di atas 50 kB, dan ketiga SVG merek tersaji di `/brand/`.

### Kartu OG, diukur pikselnya

- **Area aman** — kicker, judul, body, fakta, dan motif seluruhnya di dalam 72px pada ketiga belas kartu.
- **Bilah bab** — 12,4 · 24,9 · 37,4 · 49,9 · 62,4 · 74,9 · 87,4 persen. Progresi seperdelapan, cocok dengan 12,5% yang comp tetapkan untuk landing.

Pengukur area aman pertama melaporkan gagal di ketiga belas kartu. **Pengukurnya yang salah, bukan kartunya:** comp menaruh lockup kaki di `bottom: 56px`, di dalam band 72px yang ia sendiri gambar sebagai SAFE. Itu pengecualian yang disengaja — mark dan domain adalah elemen paling tidak kritis di kartu. Pengukur diperbaiki untuk mengecualikan bilah bab dan band kaki, dua pengecualian yang comp buat sendiri.

### Tiga baseline tinggi bergeser, dan itu benar

`/brand` +6, `/brand/warna` +6, `/brand/ui-kit` +59. Bukan regresi: kolofon yang dulu bercincin kini kotak padat, dan UI Kit bertambah satu aturan. Diukur ulang terhadap comp yang sudah diperbarui — **10177/10177, 5264/5264, 9584/9584**. Baseline-nya yang basi.

### Satu drift yang ditemukan, dan kenapa tidak diperbaiki

`/brand/readme` merender 5474px, comp-nya 5490px. Ditelusuri sampai ke satu span: aksara verse di section 05 setinggi 17px di situs, 33px di comp — dengan gaya komputasi **identik** (16px/400/28px/"Noto Sans Javanese").

Bedanya berkas font. Comp menarik keluarga ini dari CDN Google Fonts, yang melaporkan sekitar 2,06em ascent+descent untuk memesan ruang sandhangan dan pasangan; subset fontsource yang di-*self-host* melaporkan sekitar 1,06em. Screenshot berdampingan: glyph, ukuran, warna, dan jarak huruf identik — satu-satunya akibatnya baris verse 4px lebih rapat.

Tidak diperbaiki dengan `ascent-override`, karena penyebabnya bukan di situs. Setiap aksara lain di seluruh desain membawa `line-height: 1; display: block` sesuai `docs/brand.md` §6, yang mengunci kotaknya dan membuat metrik font tidak berpengaruh. Span verse di comp **melewatkan aturan itu** — dan situs mereproduksi markup comp, bukan mengoreksinya. Dicatat di `global.css` di tempat kejadiannya.

### Satu duplikasi dihapus

`assets/*.svg` dan `site/public/brand/*.svg` sempat menjadi dua salinan berkas yang sama, siap menyimpang. `assets/` kini satu-satunya sumber; `gen-assets.mjs` menyalinnya saat prebuild dan `site/public/brand/` masuk `.gitignore`.

---

## 9. Dua pertanyaan terbuka, ditutup

Spec ini menyisakan dua hal untuk keputusan pemilik. Keduanya dijawab, dan keduanya ternyata cacat di comp, bukan di port.

### Cincin 46px di kartu error

`Caraka UI Kit.dc.html` menggambar mark kartu error dengan cincin 46px, dua piksel di bawah ambang 48px yang aturan 07 di comp yang sama tetapkan.

**Dinaikkan ke 48px, bukan diubah jadi kotak padat.** Warna cincin di kartu itu membawa jenis error — `#414950` untuk 404, `#FF93B2` untuk 500, `#FFD67E` untuk 503, `#E2452C` untuk 424. Kotak padat selalu kesumba, dan sinyal itu hilang. Naik dua piksel memenuhi aturan tanpa membuang apa pun. Comp ikut dikoreksi; posisinya absolut di dalam bingkai 96×48, jadi tidak ada tata letak yang bergeser.

Yang 503 tidak tersentuh: cincinnya berputar, dan `docs/brand.md` mengecualikan indikator gerak dengan menyebut alasannya.

### Verse README 16px lebih pendek

Diagnosis pertama salah, dan salahnya menarik untuk dicatat. Angkanya sempat dikaitkan ke asal berkas font — comp menarik dari CDN Google, situs self-host subset fontsource — dengan kesimpulan bahwa metriknya berbeda dan selisihnya harus diterima.

Metriknya diukur, dan **identik: 112/92 di kedua berkas**, persis angka yang `docs/brand.md` §6 catat. Lebar teks juga sama, 87px di keduanya, jadi glyph memang dirender font yang sama.

Yang berbeda hanya kotak barisnya: port memakai metrik `serif` (14/3), comp memakai metrik aksara (18/15). Penyebabnya satu karakter. CSS memilih *first available font* — yang metriknya menentukan strut baris — sebagai keluarga pertama yang punya glyph untuk spasi. `unicode-range` di sini tidak memuat `U+0020`, jadi subset ini dilewati untuk keperluan itu dan strut-nya jatuh ke `serif`.

`U+0020` ditambahkan ke ketiga muka Javanese. `/brand/readme` kini merender 5490px, sama dengan comp-nya, dan angka 112/92 yang `docs/brand.md` ukur akhirnya benar-benar berlaku di situs. Tidak ada rute lain yang bergerak: setiap aksara lain membawa `line-height: 1; display: block`, yang mengunci kotaknya.

**Pelajarannya:** "metrik font berbeda" adalah dugaan yang masuk akal dan salah. Membaca metrik kedua berkas — dua perintah — membalikkannya, dan menunjuk ke perbaikan satu karakter alih-alih `ascent-override` yang akan menyembunyikan gejalanya sambil membiarkan sebabnya.
