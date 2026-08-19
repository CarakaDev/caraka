# Spec — prosa-tertinggal: enam angka dan satu kalimat rilis yang berhenti benar

**Status:** selesai · **Tanggal:** 19 Agustus 2026

## Latar

`1.5.6` menyapu empat puluh satu klaim yang tidak lagi cocok dengan kodenya dan
menaruh satu test di gerbang rilis supaya nomor versi tidak bisa lolos lagi. Test
itu membaca satu hal saja: judul `## [x.y.z]` di `CHANGELOG.md` harus punya baris
di `site/src/data/status.ts`. Sisanya tetap prosa, dan prosa tidak punya alat.

Pemeriksaan berikutnya, dipicu tiga issue yang masuk minggu ini, menemukan enam
tempat yang sudah salah. Empat di antaranya salah sejak rilis yang membuatnya
salah, dua sejak lebih lama:

1. **`README.id.md` menutup dengan dua kalimat yang tidak ada di `README.md`.**
   "Lampiran masih belum ada" — `lampiran-chat` mengirimkannya di 1.4.x, dan
   kalimat di sebelahnya pada paragraf yang sama sudah menyebut lampiran sebagai
   yang terkirim. "Registry npm masih memegang 0.2.1 sampai pemilik
   menerbitkan" — registry memegang 1.5.8, dan chip npm di situs sudah
   menyebutkannya. Pembaca berbahasa Indonesia membaca versi yang tertinggal
   dua puluh rilis.

2. **Kedua panduan pasang menyebut lampiran sebagai belum tersedia**, di
   paragraf yang sama yang menyebut Discord dan WhatsApp sebagai terkirim.

3. **Kedua panduan pasang menyebut "enam preset selain Claude Code".**
   `presets/agents/` berisi sembilan berkas sejak 1.4.0.

4. **`docs/openclaw-vs-caraka.md` dan versi Inggrisnya menyebut tujuh preset**
   dan "verifikasi hidup masih Claude Code saja". Lima agent sudah
   menyelesaikan giliran di sini lewat enam jalur, dan `README.md` sudah
   menuliskannya.

5. **Dokumen yang sama mencatat inti pada 8.349 baris** terhadap plafon ~8.000,
   dan satu paragraf di bawahnya menyebut 7.996 sebagai satu-satunya angka yang
   terukur. Keduanya ditulis pada 8 Agustus 2026. `AGENTS.md` mencatat setiap
   pelampauan sejak itu dan angkanya hari ini 10.552.

6. **Situs menyebut Claude sebagai teks tetap di empat tempat** yang agent-nya
   bisa apa saja: dua di `/docs`, dua di `/security`. Ini kelas cacat yang sama
   dengan yang diperbaiki 1.5.4 di dalam produk, tertinggal di luar produk.
   Yang tidak ikut adalah `bypassPermissions`, yang memang milik Claude.

## Ruang lingkup

Keenam butir di atas, di `README.id.md`, kedua panduan pasang, kedua versi
`openclaw-vs-caraka`, dan `site/src/data/{docs,security}.ts`.

## Yang tidak dikerjakan

- **Bukan audit ulang seluruh `docs/`.** Yang disentuh adalah butir yang sudah
  terbukti salah, bukan setiap kalimat yang mungkin salah. `1.5.6` sudah
  melakukan sapuan besarnya, dan sapuan kedua yang tidak dipicu apa pun akan
  menemukan kalimat yang benar lalu menulisnya ulang.
- **Bukan test yang menghitung baris.** Angka LOC di prosa dicatat bersama
  tanggal pengukurannya, dan angka bertanggal tidak bisa basi — yang basi adalah
  angka yang ditulis seolah berlaku selamanya. Yang diperbaiki adalah
  kalimatnya, bukan gerbangnya.
- **Bukan penerjemahan ulang `README.id.md`.** Hanya kalimat yang salah.

## Acceptance criteria

### AC-1 · README

- **AC-1.1** `README.id.md` shall tidak menyatakan bahwa lampiran belum ada.
- **AC-1.2** `README.id.md` shall tidak menyebut sebuah versi npm sebagai yang
  terbaru di registry.
- **AC-1.3** Paragraf pembuka `README.id.md` shall menyatakan hal yang sama
  dengan paragraf pembuka `README.md`.

### AC-2 · Panduan pasang

- **AC-2.1** `docs/install-guide.md` dan `docs/install-guide.en.md` shall tidak
  menyebut lampiran sebagai belum tersedia.
- **AC-2.2** Kedua berkas itu shall menyebut jumlah preset yang benar-benar ada
  di `presets/agents/`.

### AC-3 · Perbandingan OpenClaw

- **AC-3.1** `docs/openclaw-vs-caraka.md` dan versi Inggrisnya shall menyebut
  sembilan preset.
- **AC-3.2** Keduanya shall menyebut lima agent lewat enam jalur sebagai yang
  terverifikasi hidup, bukan Claude Code saja.
- **AC-3.3** Setiap angka LOC di kedua berkas itu shall disertai tanggal
  pengukurannya.
- **AC-3.4** Angka LOC yang disebut shall sama dengan hasil pengukuran yang
  dicatat di `AGENTS.md` untuk rilis ini.

### AC-4 · Nama agent di situs

- **AC-4.1** Tidak ada kalimat di `site/src/data/docs.ts` maupun
  `site/src/data/security.ts` yang shall menyebut sebuah coding agent sebagai
  teks tetap ketika kalimat itu berlaku untuk agent mana pun.
- **AC-4.2** Kalimat tentang `bypassPermissions` shall tetap menyebut Claude,
  karena mode itu memang miliknya.
