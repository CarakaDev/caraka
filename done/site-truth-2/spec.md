# Spec — site-truth-2: dua klaim yang lolos dari putaran pertama

**Status:** selesai · **Tanggal:** 8 Agustus 2026

## Latar

Putaran pertama (`done/site-truth/`) menagih 42 temuan stale-copy. Dua klaim
lolos. Halaman `/status` menyebut rute preset CLI dalam kalimat kini —
"Adding a coding agent on the CLI route is a single YAML file" — padahal
`src/drivers/` hanya berisi `claude-acp.ts` dan `presets/agents/` baru datang
di roadmap Fase 4 (`v0.4`); situs yang sama sudah menandainya roadmap di
`landing.ts` dan `docs.ts`. Halaman `/compare` menaruh "Under 3 min" di baris
"Reported setup time" seolah hasil ukur, padahal `docs/prd.md` G1 menetapkannya
sebagai target dan gerbang "Record five real setup sessions" di `status.ts`
masih terbuka.

## Ruang lingkup

Dua berkas: `site/src/pages/status.astro` (baris 162) dan
`site/src/data/compare.ts` (baris 61), plus baseline tinggi di
`site/e2e/site.spec.ts` bila salinan baru menggeser tinggi dokumen.

## Yang tidak dikerjakan

- Tidak mengubah desain, layout, warna, atau animasi.
- Tidak menyentuh `design/mockups/` — comp tetap rujukan desain.
- Tidak menulis ulang prosa yang hanya "bisa lebih baik".
- Tidak memakai slug `site-truth` lagi: `standards/ears.md` §6 melarang dua
  pekerjaan menimpa satu direktori `done/`.

## Acceptance criteria

- **AC-1** Halaman `/status` shall menyebut rute preset CLI sebagai rencana
  yang belum mendarat, konsisten dengan `landing.ts` dan `docs.ts`.
- **AC-2** Baris waktu setup di `/compare` shall menamai angka di bawah tiga
  menit sebagai target (`docs/prd.md` G1), bukan laporan.
- **AC-3** WHEN salinan sebuah baris berubah, baris itu shall membawa komentar
  yang menyebut baris comp yang ditinggalkan dan kode yang membuatnya salah.
- **AC-4** IF tinggi dokumen sebuah rute bergeser karena salinan baru, THEN
  baseline di `e2e/site.spec.ts` shall diperbarui ke nilai terukur.
