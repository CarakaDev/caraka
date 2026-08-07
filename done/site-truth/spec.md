# Spec — site-truth: menagih salinan yang tertinggal rilis v0.2.1

**Status:** selesai · **Tanggal:** 8 Agustus 2026

## Latar

Sebelas berkas situs dan tiga berkas akar (`README.md`, `README.id.md`,
`llms.txt`) masih membawa klaim era spesifikasi: versi 0.0.0/0.2.0, status
pre-alpha, jalur gratis Gemini CLI, memori yang "sudah ada", ikon topic yang
berubah warna, dan delapan/sembilan dokumen riset. Kode sudah bergerak:
`package.json` 0.2.1, hanya Claude Code yang dikendarai, state topic adalah
glyph di nama (`src/core/gateway.ts:485-499`), dan `docs/research/` berisi tiga
belas berkas. `site/AGENTS.md` menetapkan bahwa comp berwenang atas desain,
bukan atas fakta rilis.

## Ruang lingkup

42 temuan stale-copy terverifikasi (putaran 1) pada: `site/src/data/landing.ts`,
`compare.ts`, `readme.ts`, `ui-kit.ts`, `og.ts`; `site/src/pages/index.astro`,
`docs.astro`, `compare.astro`, `brand/og.astro`, `brand/readme.astro`,
`brand/index.astro`; `README.md`, `README.id.md`, `llms.txt`; plus baseline
tinggi di `site/e2e/site.spec.ts`.

## Yang tidak dikerjakan

- Tidak mengubah desain, layout, warna, atau animasi mana pun.
- Tidak menyentuh `design/mockups/` — comp tetap menjadi rujukan desain.
- Tidak menulis ulang prosa yang hanya "bisa lebih baik"; hanya klaim yang salah.
- Tidak memperkenalkan angka, tanggal, versi, atau kutipan di luar `docs/` dan `src/`.

## Acceptance criteria

- **AC-1** Situs shall menampilkan versi rilis `0.2.1` di setiap tempat versi
  disebut (`landing.ts`, `readme.ts`, `brand/index.astro`), sesuai
  `package.json` dan `src/cli.ts:17`.
- **AC-2** WHEN sebuah nilai meninggalkan comp-nya, berkas shall memuat komentar
  yang menyebut baris comp yang ditinggalkan dan kode yang membuatnya salah.
- **AC-3** Situs shall tidak menyiratkan bahwa memori, jalur Gemini CLI, preset
  YAML, atau MCP sudah terkirim di v0.2 (`docs/roadmap.md` Fase 3-4).
- **AC-4** Salinan status sesi shall menggambarkan glyph di nama topic, bukan
  warna ikon yang berubah atau topic yang ditutup (`src/core/gateway.ts:480-501`).
- **AC-5** Jumlah dokumen riset yang disebut shall tiga belas, sesuai isi
  `docs/research/`.
- **AC-6** IF tinggi dokumen sebuah rute berubah karena salinan, THEN baseline
  di `e2e/site.spec.ts` shall diperbarui ke nilai terukur dan alasannya dicatat
  di komentar yang sama.
- **AC-7** WHEN gerbang verifikasi dijalankan, `npm run check` dan `npm run e2e`
  di `site/` shall hijau, dan `npm run lint` di akar shall hijau karena berkas
  akar ikut berubah.
