# Spec — lumaku: baris kerja membawa mereknya sendiri

**Status:** selesai · **Tanggal:** 14 Agustus 2026

## Latar

`nama-yang-bekerja` membuat baris kerja menyebut agen yang benar dan menghapus
`Claude` dari sembilan kalimat. Yang hilang bersamanya adalah Caraka: barisnya
kini berbunyi `◌ codex sedang bekerja…`, dan tidak ada yang menyebut siapa yang
mengantar.

Pemiliknya meminta mereknya ada di sana, dan bentuk yang dipilihnya sudah dipakai
proyek ini di tempat lain: `cli.running` mencetak
`Caraka is live: telegram → codex (/path)`. Panah itu berarti "dibawa dari, ke",
dan baris kerja adalah tempat kedua yang artinya persis sama.

`lumaku` adalah bahasa Jawa untuk "sedang berjalan" — bahasa yang sama dengan
aksara ꦕꦫꦏ pada lambangnya, dan kata kerja milik Caraka, bukan milik agennya.

## Ruang lingkup

`src/i18n.ts` (satu kunci, dua katalog), `test/e2e.test.ts`.

## Yang tidak dikerjakan

- **Hanya baris kerja.** Kartu izin tetap `⏸ {agent} meminta izin` dan laporan
  gagal tetap `{agent} tidak dapat menyelesaikan tugas` — yang meminta izin dan
  yang gagal adalah agennya, dan panah di sana akan mengklaim keduanya milik
  Caraka.
- **`lumaku` tidak diterjemahkan.** Ia kata merek, bukan kata kerja yang
  diterjemahkan, jadi kedua katalog membawanya utuh. Aturan di
  `site/AGENTS.md` yang menerjemahkan `MEMBUKA GERBANG` berlaku untuk halaman
  yang menyatakan `lang="en"`, bukan untuk katalog chat.

## Acceptance criteria

- **AC-1** WHEN Caraka mengabarkan bahwa sebuah tugas berjalan, baris itu shall
  menyebut Caraka, lalu agennya, dalam urutan itu.
- **AC-2** WHERE kedua katalog membawa baris itu, keduanya shall membawa
  `lumaku` dalam bentuk yang sama.
- **AC-3** WHERE sebuah kalimat bukan tentang pengantaran, ia shall tidak
  menyebut Caraka — kartu izin dan laporan gagal tetap milik agennya.
