# Spec — Wave 8: tutup semua v1.2

**Slug:** tutup-semua-v12 · **Tanggal:** 10 Agustus 2026 · **Status:** aktif
**Roadmap:** Fase 0 (Titen, topic, Rich Messages), Fase 3 (MCP), Fase 4 (smoke CI), Fase 7 (dwibahasa, cakupan agent, peluncuran)

## Urutannya tidak seperti yang diminta standar

Seperti `done/tutup-celah-v11/spec.md`, dokumen ini ditulis **sesudah** kodenya
ada. Wave ini datang sebagai satu instruksi, dikerjakan oleh beberapa agent yang
berjalan bersamaan di berkas yang berbeda, dan `spec/` maupun `plan/` baru
dibuka saat waktunya menutup. `standards/ears.md` §4 menyatakan satu arah dan
`CLAUDE.md` menyebut alasannya, jadi ini dicatat sebagai penyimpangan, bukan
sebagai kebiasaan.

Yang dilakukan dokumen ini bukan berpura-pura ditulis lebih dulu. Ia mencatat
kriteria yang dipakai untuk menahan pekerjaan itu, dan tiap AC di bawah punya
pembuktian di `plan/tutup-semua-v12.md` yang menunjuk test atau perintah di
pohon yang sama. Satu wave anak di dalamnya memang mengikuti urutan yang benar:
`spec/titen-hidup.md` dan `plan/titen-hidup.md` ditulis lebih dulu, dan
`done/mcp-titen-passthrough/spec.md` ditutup sebagai keputusan sebelum satu
baris kode pun lahir untuknya.

## Latar

`v1.1.2` terbit dengan `src/memory/titen.ts` yang belum pernah bicara dengan
sebuah Titen. Rutenya dibaca dari tabel di `docs/design.md` §13, mock-nya
dibangun dari tabel yang sama, jadi test menyetujui dokumen dan dokumen itu
keliru. Pada 10 Agustus 2026 sebuah Titen 0.7.3 dipasang dan dijalankan di host
pengembangan `rama-tuf`, dan setiap field yang dikirim adapter ditolak.
`caraka doctor` lebih buruk lagi: ia menyelidik `http://127.0.0.1:7717/health`,
sebuah port yang tidak didengarkan siapa pun dan sebuah jalur yang menjawab
`404` di port yang Titen memang dengarkan. Tidak ada satu pun konfigurasi yang
membuat baris memori itu hijau.

Wave ini menutup jarak itu, lalu menyapu apa yang jadi salah karenanya:
`docs/roadmap.md`, `CHANGELOG.md`, dan setiap kalimat di `site/` yang menghitung
agent, menyebut memori, atau menyebut versi.

Tiga pekerjaan lain ikut karena mesin yang sama tiba-tiba punya jawaban:
empat coding agent dijalankan terhadap biner hidup, kotak MCP di Fase 3 bisa
diukur lalu ditolak, dan dua dokumen mendapat pasangan Inggris sementara
tiga puluh enam sisanya menyatakan bahwa mereka Indonesia karena pilihan.

## Ruang lingkup

Roadmap, changelog, versi paket, dan isi situs. Ditambah dua kegagalan gerbang
yang hanya muncul saat gerbang yang sama dijalankan di mesin kedua.

## Yang tidak dikerjakan

- **Konsolidasi Titen.** Selama tidak ada yang memasok claim, `provider: titen`
  menyimpan dan tidak mengembalikan apa pun. Dicatat, bukan diperbaiki
  (`spec/titen-hidup.md`).
- **Empat gerbang lapangan.** Lima rekaman setup, dua puluh developer beta, uji
  lapangan WhatsApp empat belas hari, dan peluncuran. Masing-masing butuh orang
  lain atau waktu kalender, dan tidak satu pun bisa dibuat di repositori.
- **Dua spike Fase 0 yang tersisa.** Gelembung topic di DM dan uji ulang
  `editMessageText` ber-`rich_message` butuh bot Telegram hidup dan orang yang
  menonton kliennya sendiri.
- **`npm publish` dan deploy `caraka.dev`.** Keduanya milik pemilik.
- **Menerjemahkan himpunan spesifikasi dan riset.** Itu keputusan, dan AC-4
  di bawah menuntut keputusan itu tertulis, bukan dikerjakan.
- **Melonggarkan baseline tinggi situs supaya mesin kedua hijau.** Gerbang itu
  ada justru untuk ketat; batasnya dicatat di plan.

## Acceptance criteria

### AC-1 · Roadmap yang jujur

- **AC-1.1** Kotak Titen di Fase 0 shall tercentang dan shall menyebut angka
  latensi compile beserta cara pengukurannya.
- **AC-1.2** IF sebuah angka di roadmap pernah diukur dengan cara yang mengukur
  hal lain, THEN roadmap shall menyebut angka yang dibuang itu dan sebabnya.
- **AC-1.3** Kotak topic di DM dan kotak Rich Messages shall menyebut bahwa
  penutupnya menuntut bot Telegram hidup dan orang yang menonton kliennya.
- **AC-1.4** Setiap kotak yang tetap terbuka shall membawa tanggal dan alasan
  terbukanya.
- **AC-1.5** Kotak MCP di Fase 3 shall tercentang sebagai dibatalkan dan shall
  menunjuk berkas yang memuat angkanya.
- **AC-1.6** Baris cakupan agent di Fase 7 shall menyebut agent yang dijalankan
  hidup dan agent yang tidak bisa dijalankan, masing-masing dengan sebabnya.
- **AC-1.7** Baris dwibahasa di Fase 7 shall menyebut jumlah dokumen berpasangan
  dan shall menyatakan bahwa himpunan spesifikasi dan riset tetap Indonesia
  karena pilihan.

### AC-2 · Changelog

- **AC-2.1** `CHANGELOG.md` shall memuat bagian `[1.2.0]` bertanggal
  2026-08-10.
- **AC-2.2** Bagian itu shall menyatakan bahwa adapter Titen belum pernah bicara
  dengan Titen sungguhan dan setiap field-nya salah.
- **AC-2.3** Bagian itu shall menyatakan bahwa penyelidikan doctor memeriksa
  sebuah port dan sebuah jalur yang dua-duanya tidak ada.
- **AC-2.4** Bagian `Limited` shall menyatakan bahwa sebuah observation tidak
  pernah muncul di `compile`.
- **AC-2.5** Bagian `Limited` shall menyebut preset mana yang belum pernah
  menyelesaikan satu giliran.
- **AC-2.6** Bagian `Limited` shall menyatakan bahwa plafon LOC terlewati,
  dengan angkanya.
- **AC-2.7** Bagian `Limited` shall menyatakan bahwa setiap gerbang lapangan
  masih terbuka.

### AC-3 · Versi

- **AC-3.1** `package.json` shall menyatakan `1.2.0`.
- **AC-3.2** Statistik versi di `site/src/data/status.ts` shall menyatakan
  `1.2.0`.
- **AC-3.3** Chip npm di `site/src/data/readme.ts` shall menyatakan versi yang
  ada di registry, bukan versi rilis ini.

### AC-4 · Situs yang berhenti berbohong

- **AC-4.1** Tidak satu pun kalimat berlaku di `site/` shall menyatakan bahwa
  Claude Code adalah satu-satunya agent yang pernah menjawab di sini.
- **AC-4.2** Tidak satu pun kalimat berlaku di `site/` shall menyatakan bahwa
  adapter Titen hanya pernah menjawab mock.
- **AC-4.3** Halaman status shall memuat kartu `1.2.0`.
- **AC-4.4** WHERE sebuah kartu rilis lama memuat kalimat yang benar saat rilis
  itu, situs shall membiarkannya — kartu rilis adalah catatan, bukan klaim
  berjalan.
- **AC-4.5** Setiap baseline tinggi yang bergeser shall diganti dengan angka
  yang diukur, dan shall diukur dua kali terhadap build bersih.

### AC-5 · Gerbang di dua mesin

- **AC-5.1** `npm run lint`, `npm run typecheck`, `npm test`, dan `npm run e2e`
  shall keluar 0 di kedua mesin, dibaca dari `$?`.
- **AC-5.2** IF sebuah test hijau di satu mesin dan merah di mesin lain, THEN
  penyebabnya shall diperbaiki di akarnya, bukan ditandai flaky.
- **AC-5.3** WHERE sebuah gerbang tidak bisa dijalankan di mesin kedua karena
  batas mesin itu, plan shall menyebut batasnya dan buktinya bahwa itu batas
  mesin.

## Angka dan sumbernya

Semua diukur pada 10 Agustus 2026.

| Angka | Cara diambil |
|---|---|
| latensi compile 4,9 md median (4,2–5,4) | `performance.now()` mengelilingi `compile` lewat adapter yang sudah dibangun, sepuluh panggilan berurutan, in-process di host yang menjalankan Titen |
| 2,3–4,3 detik yang dibuang | pengukuran pertama spike; tiap sampel satu `ssh` baru menjalankan satu `curl` |
| `curl` di host itu sendiri 2–3 md | `curl -w "%{time_total}"` lima kali, dijalankan di `rama-tuf` |
| 8.498 baris inti | `find src -name '*.ts' \| xargs wc -l \| tail -1` |
| registry npm 1.1.2 | `npm view caraka version` |
| 9 dokumen berpasangan, 36 tinggal Indonesia | `ls docs/*.en.md \| wc -l`; `find docs -name '*.md'` dikurangi pasangannya |
| 10 ADR, 13 riset | `ls docs/adr/*.md \| wc -l`, `ls docs/research/*.md \| wc -l` |
| baseline tinggi situs | Chromium 1440x900 sesudah `rm -rf dist && npm run build`, dua kali |
