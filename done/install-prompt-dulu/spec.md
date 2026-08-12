# Spec — install-prompt-dulu: prompt AI jadi langkah pertama di `/install`

**Status:** selesai · **Tanggal:** 12 Agustus 2026

## Latar

`/install` menaruh "Ask Codex or Claude to install it" di bagian 06 dari 07.
Pembaca melewati lima bagian prasyarat — Node, Claude Code, tabel cek init,
pilihan jalur — sebelum tahu bahwa satu prompt yang ditempel ke coding agent
mengerjakan semuanya. Prompt itu sendiri sudah memverifikasi Node, Git, Claude
Code, dan `claude auth status` (`src/data/install.ts:79-93`), jadi lima bagian
di atasnya adalah pekerjaan yang baru berguna kalau pembaca memilih jalur
manual.

`docs/install-guide.md` sudah menyusunnya begitu: §2 "Jalur tercepat: suruh
coding agent yang memasangnya" mendahului §3 "Jalur manual". Situs adalah satu-
satunya permukaan yang masih terbalik.

## Ruang lingkup

`site/src/data/install.ts` (urutan `toc`, satu baris di `paths`),
`site/src/pages/install.astro` (posisi blok `<section id="script">` dan nomor
01–07), `site/AGENTS.md` (mencatat penyimpangan urutan dari comp), dan baseline
tinggi `/install` di `site/e2e/site.spec.ts` bila bergeser.

## Yang tidak dikerjakan

- Tidak menulis ulang isi prompt, aturan `scriptRules`, atau salinan bagian mana
  pun selain baris yang menyebut letak prompt.
- Tidak mengubah warna, radius, animasi, `animation-range`, atau hero.
- Tidak menyentuh `design/mockups/Caraka Install.dc.html`.
- Tidak menyusun ulang `docs/install-guide.md`: urutannya sudah benar, dan yang
  diminta adalah halaman situs.
- Tidak memindahkan `#verify`; ia tetap bagian terakhir.

## Acceptance criteria

- **AC-1** Halaman `/install` shall menempatkan bagian prompt AI sebagai bagian
  pertama badan halaman, mendahului bagian prasyarat.
- **AC-2** Daftar isi `/install` shall menyebut ketujuh bagian dalam urutan yang
  sama dengan badan halaman, bernomor 01 sampai 07 tanpa lompatan.
- **AC-3** Baris "Want Codex or Claude to help" di tabel jalur shall menyebut
  letak prompt yang baru, bukan letak lamanya.
- **AC-4** Penyimpangan urutan bagian dari `design/mockups/Caraka Install.dc.html`
  shall tercatat di `site/AGENTS.md` beserta alasannya dan sumber yang
  mendahuluinya.
- **AC-5** IF tinggi dokumen `/install` bergeser karena penyusunan ulang, THEN
  baseline di `site/e2e/site.spec.ts` shall diperbarui ke nilai terukur.
