# Standar — Acceptance Criteria (EARS) & Siklus Kerja

**Versi:** 1.0 · **Tanggal:** 7 Agustus 2026
**Berlaku untuk:** setiap perubahan di repositori ini, termasuk situs `site/` dan dokumen di `docs/`.

Dokumen ini mengikat. `AGENTS.md` mengatur *apa* yang boleh dibangun; dokumen ini mengatur *bagaimana* pekerjaan dimulai, diverifikasi, dan ditutup.

---

## 1. Kenapa EARS

Requirement yang ditulis bebas hampir selalu gagal di satu titik yang sama: tidak jelas kapan ia berlaku. "Sistem harus menangani error dengan baik" tidak bisa diuji, tidak bisa ditolak, dan tidak bisa diselesaikan — dua orang membacanya dan sepakat, lalu membangun dua hal berbeda.

EARS (*Easy Approach to Requirements Syntax*) menutup celah itu dengan memaksa setiap kalimat menyebut pemicunya. Cetakannya sedikit, dan setiap cetakan menghasilkan satu kalimat yang bisa langsung dijadikan test.

Aturan tunggal yang mendasari semuanya:

> **Satu requirement = satu kalimat = satu perilaku yang bisa diuji.**

Kalau sebuah kalimat butuh kata "dan" untuk menyambung dua perilaku, itu dua requirement.

---

## 2. Lima cetakan

Kata kunci ditulis kapital dan tidak diterjemahkan. Kata kuncilah yang membuat cetakan ini bisa dibaca mesin dan dicari dengan `grep`; menerjemahkannya menghilangkan seluruh manfaatnya.

### 2.1 Ubiquitous — berlaku selalu

Tanpa pemicu.

```
<sistem> shall <respons>.
```

> Situs shall menyajikan setiap halaman sebagai HTML statis tanpa runtime server.

Hati-hati: ini cetakan yang paling sering disalahgunakan. Kalau sebuah perilaku sebenarnya punya kondisi, memakai cetakan ini menyembunyikan kondisi itu.

### 2.2 Event-driven — WHEN

Dipicu satu kejadian diskrit. Pemicunya selesai, lalu responsnya terjadi.

```
WHEN <pemicu>, <sistem> shall <respons>.
```

> WHEN pengunjung menekan tombol salin perintah, situs shall menyalin teks perintah ke papan klip dan mengganti label tombol menjadi `COPIED` selama 1,8 detik.

### 2.3 State-driven — WHILE

Berlaku selama sebuah keadaan bertahan, bukan pada satu titik waktu.

```
WHILE <keadaan>, <sistem> shall <respons>.
```

> WHILE peramban melaporkan `prefers-reduced-motion: reduce`, situs shall memangkas setiap durasi animasi menjadi 0,001 md.

### 2.4 Optional feature — WHERE

Berlaku hanya bila sebuah kemampuan hadir. Inilah cetakan untuk *graceful degradation*, dan karena itu cetakan yang paling sering dibutuhkan di proyek ini.

```
WHERE <kemampuan tersedia>, <sistem> shall <respons>.
```

> WHERE peramban mendukung `animation-timeline: view()`, situs shall menganimasikan elemen seiring gulir sesuai `animation-range`-nya.

Setiap `WHERE` **wajib** punya pasangan yang menjelaskan perilaku saat kemampuan itu absen. Kemampuan yang hilang tanpa pasangan adalah halaman kosong yang tidak ketahuan sampai ada yang mengeluh.

### 2.5 Unwanted behaviour — IF/THEN

Untuk kegagalan, input tidak sah, dan hal yang tidak seharusnya terjadi. Ditulis terpisah dari jalur normal supaya tidak ikut hilang saat jalur normal disederhanakan.

```
IF <kondisi tak diinginkan>, THEN <sistem> shall <respons>.
```

> IF papan klip ditolak peramban, THEN situs shall mengganti label tombol menjadi `FAILED` berwarna `#FF93B2` dan tidak menampilkan pesan lain.

### 2.6 Gabungan

Cetakan boleh ditumpuk, dengan urutan tetap: `WHILE` → `WHERE` → `WHEN`/`IF`.

```
WHILE <keadaan>, WHEN <pemicu>, <sistem> shall <respons>.
```

> WHILE lebar viewport di bawah 941px, WHEN halaman digulir, situs shall menampilkan bilah kemajuan atas dan menyembunyikan rel kanan.

Lebih dari dua kata kunci dalam satu kalimat berarti requirement itu belum dipecah.

---

## 3. Menulis acceptance criteria

Setiap butir AC ditulis dengan salah satu cetakan di atas, diberi id, dan ditaruh di berkas spec.

```markdown
### AC-3 · Bilah kemajuan gulir

- **AC-3.1** WHEN halaman digulir, situs shall menetapkan `--ck-sp` ke
  rasio posisi gulir terhadap jarak gulir maksimum.
- **AC-3.2** WHILE halaman digulir, situs shall menulis `--ck-sp` paling
  banyak sekali per bingkai.
- **AC-3.3** IF tinggi dokumen tidak melebihi tinggi viewport, THEN situs
  shall menetapkan `--ck-sp` ke 0 dan tidak membaginya dengan nol.
```

Yang membuat sebuah AC layak dikirim:

| Wajib | Bukan AC |
|---|---|
| Menyebut pemicunya | "Harus cepat" |
| Punya nilai yang bisa dicek | "Harus terlihat bagus" |
| Bisa gagal | "Kode harus bersih" |
| Satu perilaku | "Menyalin teks dan menampilkan toast dan mencatat analitik" |

Angka yang muncul di AC harus punya sumber. Kalau tidak ada di `docs/`, ukur dulu, lalu catat pengukurannya di spec — jangan menebak lalu menuliskannya seperti fakta.

---

## 4. Siklus kerja

Tiga direktori dan satu tahap kerja, satu arah. Sebuah pekerjaan tidak pernah melompati tahap.

```
spec/          plan/          (kerjakan)         done/
apa & kenapa → bagaimana  →  kode + verifikasi → arsip
```

### Tahap 1 — `spec/<slug>.md`

Apa yang dibangun dan kenapa. Berisi latar, ruang lingkup, **yang tidak dikerjakan**, dan acceptance criteria dalam EARS. Tidak berisi keputusan implementasi.

Spec tanpa bagian "yang tidak dikerjakan" akan tumbuh sampai tidak pernah selesai.

### Tahap 2 — `plan/<slug>.md`

Bagaimana membangunnya: langkah berurut, berkas yang disentuh, risiko, dan **pemetaan setiap AC ke cara pembuktiannya** (test unit, e2e, atau pemeriksaan manual dengan langkah tertulis).

AC yang tidak punya cara pembuktian tidak boleh masuk plan. Ia kembali ke spec untuk ditulis ulang sampai bisa diuji.

### Tahap 3 — kerjakan

Kode ditulis mengikuti plan. Plan yang ternyata salah **diperbarui**, tidak diabaikan diam-diam: plan yang tidak lagi menggambarkan kode adalah plan yang berbohong.

### Tahap 4 — gerbang verifikasi

Keempatnya harus hijau, dan buktinya ditempel di plan. Klaim "sudah lulus" tanpa keluaran perintah tidak dihitung.

```bash
npm run lint          # oxlint
npm run typecheck     # astro check
npm test              # vitest
npm run e2e           # playwright, lintas chromium/firefox/webkit
```

Ditambah dua pemeriksaan yang tidak dilakukan alat:

- **Tanpa rahasia.** Tidak ada token, kunci, atau kata sandi di diff. Repositori ini publik; satu commit yang salah tidak bisa ditarik kembali.
- **Tanpa AI slop.** Prosa diperiksa terhadap bagian *Writing style* di `AGENTS.md`: tanpa daftar tiga hal, tanpa paralelisme negatif, tanpa kalimat yang mengulang judulnya sendiri, tanpa kosakata mesin (`seamless`, `robust`, `leverage`, `unlock`, `crucial`), tanpa spesifik yang dikarang.

### Tahap 5 — publikasi

Yang berlaku saja:

- **npm** — hanya bila permukaan paket berubah. Sekali terbit, sebuah versi tidak bisa ditarik; periksa `files` di `package.json` sebelum `npm publish`.
- **Situs** — `npm run build && npm run deploy` dari `site/`.

Keduanya keluar dari mesin ini. Keduanya butuh persetujuan pemilik lebih dulu.

### Tahap 6 — tutup

Pindahkan spec dan plan ke `done/<slug>/`, apa adanya, termasuk keluaran verifikasi yang ditempel. Baru kemudian commit dan push.

```bash
mkdir -p done/<slug>
git mv spec/<slug>.md done/<slug>/spec.md
git mv plan/<slug>.md done/<slug>/plan.md
```

Satu direktori per pekerjaan, bukan dua berkas bernama sama di satu direktori — keduanya memakai slug yang sama, dan yang kedua akan menimpa yang pertama.

`done/` adalah catatan alasan sebuah keputusan diambil, bukan tempat pembuangan. Pekerjaan yang dibatalkan juga masuk ke sana, ditandai `**Status:** dibatalkan —` dan alasannya. Pekerjaan yang menghilang tanpa jejak akan diusulkan lagi enam bulan kemudian oleh orang yang tidak tahu ia pernah ditolak.

---

## 5. Yang membuat pekerjaan ditolak

- AC yang tidak bisa gagal.
- Plan tanpa pemetaan pembuktian.
- Gerbang verifikasi yang dilewati dengan "seharusnya jalan".
- Spec yang tumbuh setelah plan disetujui, tanpa plan ikut diperbarui.
- Satu PR yang memperbaiki bug sekaligus melakukan refactor. Itu dua PR.
