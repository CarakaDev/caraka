# Spec — Kampanye v1.0 (Rilis publik)

**Slug:** v10 · **Tanggal:** 8 Agustus 2026 · **Status:** aktif

## Latar

v0.2.1 sudah terbit. Pada 8 Agustus 2026 pemilik memberi arahan langsung: kerjakan
roadmap sampai Fase 7 — Rilis publik → v1.0 — dalam satu kampanye agen, termasuk
merapikan setiap teks situs yang belum mengikuti keadaan kode, dan dokumen yang
menghalangi jalannya kampanye boleh diamendemen. Dua hal tetap dipegang:

1. **Gerbang lapangan tidak dipalsukan.** Dogfood seminggu, lima rekaman setup,
   rekrutmen beta, dan uji lapangan WhatsApp 14 hari adalah bukti manusia.
   Kampanye ini memindahkannya menjadi validasi pasca-rilis, dicatat di
   `docs/roadmap.md` dengan tanggal dan alasan — bukan dicentang seolah terjadi.
2. **`npm publish` menunggu persetujuan pemilik.** Semuanya disiapkan sampai satu
   perintah terakhir; perintah itu milik pemilik.

## Lingkup

1. Menutup pekerjaan in-flight: status sesi sebagai glif pada nama topic
   (`setState` terpusat, `icon_color` saat createForumTopic).
2. Situs: setiap nilai di `site/src/data/*.ts` cocok dengan `docs/` dan `src/`
   pada versi berjalan, di semua halaman.
3. Fase 3 — memori: `MemoryProvider`, provider `local` (SQLite FTS5), adapter
   `titen`, `/ingat` `/lupakan` `/memori`, degradasi recall 500 ms.
4. Fase 4 — abstraksi: driver CLI generik, preset YAML per agent, multi-workspace
   dengan routing `@slug`, `/switch`, antrean 1 run per workspace.
5. Fase 5 — Discord: channel thread + approval berbasis role; dashboard htmx
   read-only lokal.
6. Fase 6 — WhatsApp: provider `baileys` dan `cloud-api`, mode linear, approval
   fallback kode, rate limit + larangan first-contact di level kode, alur
   peringatan risiko.
7. Fase 7 — checklist `security.md` tuntas atau tercatat alasannya, dokumentasi
   dwibahasa ID/EN, ≥ 15 agent tercakup, artikel pembanding OpenClaw/Caraka,
   README + situs + profil org menyatakan v1.0, deploy caraka.dev.

Setiap fase berjalan sebagai pekerjaan sendiri (`spec/<slug>.md` → `plan/` →
kode → verifikasi → `done/`), dengan commit dan push per fase.

## Yang tidak dikerjakan

- Menjalankan `npm publish` (menunggu pemilik).
- Mencentang gerbang lapangan tanpa bukti lapangan.
- Segala yang ada di daftar "tidak akan pernah masuk" roadmap: marketplace
  plugin, agent runtime sendiri, tool eksekusi sendiri, aplikasi mobile, hosted
  multi-tenant.
- Telemetri keluar, dalam bentuk apa pun.

## Acceptance criteria

### AC-1 · Situs jujur

- **AC-1.1** Situs shall menyatakan versi berjalan dari `package.json` di setiap
  tempat sebuah versi disebut.
- **AC-1.2** IF sebuah nilai di `site/src/data/*.ts` meninggalkan comp-nya,
  THEN berkas itu shall menyebut baris comp yang ditinggalkan dan kode yang
  membuatnya usang.
- **AC-1.3** Situs shall tidak menyatakan kemampuan yang belum ada di `src/`
  pada commit yang sama.

### AC-2 · Gerbang verifikasi

- **AC-2.1** WHEN `npm run lint && npm run typecheck && npm test` dijalankan di
  akar dan `npm run check && npm run e2e` di `site/`, seluruhnya shall hijau,
  dengan keluaran ditempel di plan tiap fase.

### AC-3 · Memori

- **AC-3.1** WHERE provider memori absen, gateway shall menjalankan run tanpa
  memori dan tanpa pesan galat ke chat.
- **AC-3.2** IF recall melebihi 500 ms, THEN gateway shall melanjutkan prompt
  tanpa konteks memori dan mencatatnya di audit.

### AC-4 · Abstraksi driver

- **AC-4.1** WHEN sebuah agent baru ditambahkan lewat satu berkas YAML di
  `presets/agents/`, diff shall tidak menyentuh `src/core/`.

### AC-5 · Channel baru

- **AC-5.1** Core shall tetap tidak bercabang pada `channel.id`.
- **AC-5.2** WHERE sebuah kemampuan channel absen (thread, tombol, edit),
  channel shall menurunkan perilaku sesuai `channel.caps` tanpa gagal keras.
- **AC-5.3** Approval di channel mana pun shall tetap berupa bearer secret
  sekali pakai ber-TTL yang terikat `(principal, sesi, permintaan)`, tidak
  pernah teks yang tak terautentikasi. *Diamendemen 8 Agustus 2026
  (`done/whatsapp-v06/`):* baris ini dulu menulis "callback bertanda-tangan …
  tidak pernah teks chat", yang menutup setiap channel tanpa tombol. Sejak v0.6
  channel tanpa tombol memutuskan lewat kode pendek di kartu — dibangkitkan
  `randomBytes` di server, hanya tampil di kartu yang Caraka tulis, tidak pernah
  masuk konteks agent, dan dipakai lewat `UPDATE … WHERE decision IS NULL` yang
  sama. Yang tetap ditolak adalah katanya: `ya`, `ok` tanpa kode, apa pun yang
  bisa diproduksi prompt injection.

### AC-6 · Keamanan

- **AC-6.1** Setiap butir checklist `docs/security.md` shall berstatus terpenuhi,
  atau tercatat ditunda dengan alasan dan tanggal.

### AC-7 · Rilis

- **AC-7.1** WHEN kampanye selesai, `CHANGELOG.md` shall memuat 1.0.0 dengan
  tanggal, dan `package.json` shall membaca 1.0.0.
- **AC-7.2** `docs/roadmap.md` shall mencatat setiap gerbang lapangan yang
  dipindah pasca-rilis, dengan tanggal keputusan 8 Agustus 2026.
- **AC-7.3** IF persetujuan pemilik belum ada, THEN tidak ada `npm publish`
  yang dijalankan.
