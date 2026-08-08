# Plan — Kampanye v1.0

**Spec:** `spec/v10.md` · **Tanggal:** 8 Agustus 2026

Kampanye berjalan sebagai deretan wave. Tiap wave adalah satu pekerjaan lifecycle
penuh dengan spec dan plan-nya sendiri; plan ini memetakan urutannya dan cara
setiap AC kampanye dibuktikan.

## Urutan

| Wave | Isi | Keluaran |
|---|---|---|
| 0 | Baseline hijau + tutup pekerjaan glif topic | commit `topic-state-glyphs`, semua gate hijau |
| 1 | Audit kebenaran situs, semua halaman | commit + deploy caraka.dev |
| 2 | Fase 3 — memori (local + titen) | v0.3.0 |
| 3 | Fase 4 — driver CLI + preset | v0.4.0 |
| 4 | Fase 5 — Discord + dashboard htmx | v0.5.0 |
| 5 | Fase 6 — WhatsApp (baileys + cloud-api) | v0.6.0 |
| 6 | Fase 7 — keamanan, dwibahasa, ≥15 agent, artikel, v1.0 | 1.0.0 + deploy final |

Kode inti dikerjakan serial (satu builder per wave) untuk menghindari konflik;
riset, audit, penulisan dokumen, dan verifikasi dikerjakan paralel oleh subagent.

## Pemetaan pembuktian

| AC | Bukti |
|---|---|
| AC-1.x | sweep grep versi + banding `data/*.ts` ↔ `docs/`+`src/` oleh agen audit; e2e situs |
| AC-2.1 | keluaran perintah ditempel di plan tiap wave |
| AC-3.x | unit test degradasi (provider absen; recall lambat di-mock > 500 ms) |
| AC-4.1 | test menambah preset dummy dan mengecek diff `src/core/` kosong |
| AC-5.x | unit test caps + grep `channel.id` di `src/core/`; test approval callback per channel |
| AC-6.1 | tabel status di `docs/security.md` diperiksa satu per satu |
| AC-7.x | pemeriksaan berkas CHANGELOG/package/roadmap; tidak ada perintah publish di log kampanye |

## Risiko

- **Gerbang lapangan.** Tidak bisa dibuktikan mesin — dipindah pasca-rilis dan
  dicatat (AC-7.2). Roadmap diamendemen, bukan dicentang.
- **Integrasi luar (Discord, WhatsApp, Titen).** Tanpa kredensial hidup, bukti
  turun ke unit/e2e ber-mock plus smoke opsional; batas ini ditulis jujur di
  CHANGELOG per versi, meniru preseden "printed untested" di 0.2.0.
- **Anggaran kompleksitas.** Inti ≤ 8.000 baris; tiap wave melaporkan LOC inti
  sesudah merge.
- **Baseline tinggi e2e situs.** Setiap perubahan copy mengubah baseline —
  perbarui lewat `site/scripts/compare-to-mockup.mjs`, jangan menebak angka.

## Verifikasi per wave

Keluaran `npm run lint`, `npm run typecheck`, `npm test` (akar) dan
`npm run check`, `npm run e2e` (site bila tersentuh) ditempel di plan wave itu
sebelum pindah ke `done/`.

---

## Penutup — 8 Agustus 2026

Ketujuh wave mendarat pada hari yang sama, masing-masing dengan spec, plan, dan
keluaran gerbangnya sendiri di `done/`: `topic-state-glyphs`, `site-truth` dan
`site-truth-2`, `memori-v03`, `driver-v04`, `discord-v05` dan `dashboard-v05`,
`whatsapp-v06`, lalu `rilis-v10`. Yang keluar dari kampanye ini: tiga channel di
atas satu kontrak `Channel` yang tidak pernah dicabangkan di core, tujuh preset
agent yang masing-masing satu berkas YAML, memori dengan tiga provider dan
degradasi 500 md, lebih dari satu workspace dengan antrean per workspace, dasbor
read-only di loopback, approval yang tetap rahasia sekali pakai di channel yang
tidak punya tombol, checklist keamanan yang dijawab baris per baris, dokumentasi
dwibahasa untuk tujuh dokumen, artikel pembanding, catatan integrasi, dan angka
terukur di tempat yang selama ini berisi perkiraan. `src/` berakhir di 7.880
baris, di bawah plafon ~8.000 yang dijaga `AGENTS.md`.

Yang **tidak** keluar dari kampanye ini adalah bukti lapangan, dan itu keputusan
yang diambil di depan, bukan kelalaian yang ketahuan di belakang. Lima gerbang
dipindah melewati rilis atas keputusan pemilik pada 8 Agustus 2026, dengan
alasan yang sama untuk kelimanya: tidak satu pun bisa dijawab dari sebuah
repositori, karena masing-masing meminta orang memakai perangkat lunak ini
selama beberapa hari.

| Gerbang | Fase | Kenapa dipindah |
|---|---|---|
| Dogfood seminggu, ≥ 5 tugas nyata | 1 | butuh penulis memakainya seminggu penuh |
| Lima rekaman setup, median < 3 menit | 2 | tanpa rekaman tidak ada sampel untuk median |
| A/B memori atas dua puluh tugas | 3 | butuh dua puluh tugas nyata dijalankan dua kali |
| Dua puluh developer beta + dua angka DoD | 5 | hanya bisa dijawab orang lain yang memakainya |
| Empat belas hari nomor WhatsApp hidup | 6 | tidak ada nomor yang pernah ditautkan ke kode ini |

Kelimanya tercatat di `docs/roadmap.md` sebagai validasi pasca-rilis dengan
tanggal keputusannya, bukan dicentang. Sejalan dengan itu: Discord, WhatsApp,
dan Titen hanya pernah menjawab mock dan fixture di repositori ini, dan
`CHANGELOG.md` 1.0.0 menyebutnya di bagian *Limited* supaya orang yang menimbang
mesinnya sendiri membacanya sebelum memasang, bukan sesudah.

`npm publish` **tidak dijalankan**, dan itu disengaja sejak `spec/v10.md`
ditulis (AC-7.3). Registry masih memegang 0.2.1. Paket disiapkan sampai satu
perintah — `npm pack --dry-run` sudah merekam isi dan ukurannya di
`done/rilis-v10/plan.md` — dan perintah terakhirnya milik pemilik, sama seperti
deploy `caraka.dev`. Tag `1.0.0` juga tidak dibuat di kampanye ini.

Selain gerbang lapangan, yang tetap terbuka saat kampanye ditutup: sasaran G2
(≥ 15 agent) dan dua bagian sasaran G3 (RAM diam, pohon terpasang), empat baris
checklist keamanan berstatus `deferred`, `caraka init discord` dan
`caraka init whatsapp`, lampiran, gerbang mode kebijakan di jalur run, rute
halaman risiko WhatsApp di situs, dan tiga puluh delapan berkas `docs/` yang
masih satu bahasa.
