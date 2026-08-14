# Plan — menu-satu-set

**Spec:** [`../spec/menu-satu-set.md`](../spec/menu-satu-set.md)

## Bentuk yang dituju

Satu komponen, `SiteHeader.astro`, memasang batang header yang selama ini
disalin delapan kali. Kedelapan header itu sudah identik byte demi byte kecuali
tiga hal — teks lencana, daftar tautan, dan tombol di ujung kanan — jadi
komponennya menerima tepat tiga prop dan tidak ada yang keempat.

`NAV` naik dari lima menjadi enam butir: `Home` di depan, lalu Guide, Docs,
Install, Compare, Security. `Home` masuk karena tanpa halaman yang sedang dibuka
di dalam menu tidak ada yang bisa ditandai, dan `/` adalah satu-satunya halaman
yang tautannya selama ini hanya wordmark.

## Langkah

1. **`src/lib/site.ts`** — `Home` di depan `NAV`; komentarnya menyebut komponen
   yang memakainya, bukan lagi klaim yang tidak benar bahwa tiap header memuatnya.
2. **`src/components/SiteHeader.astro`** — markup header, disalin dari
   `src/pages/docs.astro` tanpa satu pun nilai gaya berubah. Prop: `badge?`,
   `active` (`href` halaman ini), `cta` (bawaan GitHub). Menautkan `NAV`,
   memberi `aria-current="page"` pada yang cocok, meneruskan keduanya ke
   `MobileMenu`.
3. **`src/components/MobileMenu.astro`** — `links` tidak lagi datang dari
   pemanggil; ia membaca `NAV` sendiri dan menerima `active` serta `cta`.
4. **Delapan halaman** — blok `<header>` diganti satu baris `<SiteHeader …/>`.
   Tidak ada yang lain di halaman-halaman itu disentuh.
5. **`src/styles/global.css`** — `.ck-nav` dan titiknya. Nama keyframe
   `ck-nav-ping` belum dipakai comp mana pun, jadi ia tidak bisa bertabrakan
   dengan sembilan nama yang berbeda nilainya antar-halaman.
6. **Tes** — `fidelity.test.js` mendapat satu tes yang gagal kalau ada halaman
   memasang header sendiri lagi, dan satu yang gagal kalau `NAV` dan menu ringkas
   berbeda isi. `e2e/site.spec.ts` memeriksa AC-1, AC-2, AC-5.
7. **`site/CLAUDE.md`** — penyimpangan keenam dicatat.

## Titiknya

Empat piksel, warna merek `#E2452C`, di bawah label, digambar oleh `::after`
sehingga tidak menambah tinggi baris. Ia sudah terlihat sebelum animasi apa pun
berjalan — `opacity` bawaannya 1 pada tautan halaman yang sedang dibuka — jadi
mesin yang membuang animasinya tetap menunjukkannya (AC-5).

Denyutnya satu cincin yang membesar dari titik itu dan memudar, 2.8 detik sekali,
digambar `box-shadow` pada elemen yang sama sehingga tidak ada simpul tambahan.
Caraka mengantar pesan; cincin yang berangkat dari satu titik adalah gambar yang
sama dengan yang dikerjakan program ini. Di bawah `prefers-reduced-motion:
reduce` cincinnya tidak digambar dan titiknya tinggal titik (AC-6).

Tautan yang bukan halaman ini menumbuhkan titik yang sama pada `:hover`, dari
`opacity: 0` ke `.45` dalam 200ms. Jadi titik itu berarti satu hal di dua
keadaan: di sinilah kamu, dan di sanalah kamu akan berada.

## Yang bisa retak

- **Tinggi halaman.** Header `position: fixed`, dan titiknya `::after` yang
  absolut; tidak ada baseline tinggi di `e2e/site.spec.ts` yang seharusnya
  bergerak. Kalau ada yang bergerak, itu tanda markup-nya tidak sama, bukan tanda
  baseline-nya perlu diperbarui.
- **Lebar header.** Enam tautan menggantikan tiga sampai lima. Diukur di 1440
  dan di 960 — tepat di atas titik putus menu ringkas — sebelum dinyatakan
  selesai.
- **`fidelity.test.js`** membandingkan port dengan comp. Header yang tidak lagi
  ada di berkas halaman bisa membuat perbandingan yang lama diam-diam kosong,
  bukan merah. Diperiksa dengan menjalankannya setelah langkah 4 dan sebelum
  langkah 6.

## Gate

```bash
cd site && npm run check && npm run e2e
```

```
- 0 errors
      Tests  33 passed (33)
  2 skipped
  140 passed (52.7s)
```

Tidak ada satu pun baseline tinggi di `e2e/site.spec.ts` yang bergerak: header
`position: fixed` dan titiknya `::after` yang absolut, jadi sepuluh header yang
diganti tidak mengubah tinggi halaman mana pun.

Satu hal yang retak lebih dulu dan dicatat di `site/AGENTS.md`: `npm run e2e`
menyajikan `dist/`, jadi run pertama hijau atas build sebelum perubahan dan
kesimpulan "tidak ada baseline bergerak" dari run itu keliru. `npm run e2e`
sekarang membangun lebih dulu.
