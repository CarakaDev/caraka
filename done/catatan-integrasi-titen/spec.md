# Spec — catatan-integrasi-titen: satu hari kontak dengan Titen yang hidup

**Status:** selesai · **Tanggal:** 10 Agustus 2026

## Latar

Fase 7 di `docs/roadmap.md` meminta kontribusi balik ke ACP dan Titen.
`docs/integrasi-ekosistem.md` mengumpulkannya, dan sampai `1.1.2` seluruh bagian
Titen berasal dari kode yang berbicara dengan fetch tiruan. Pada 10 Agustus 2026
adapter ditulis ulang terhadap Titen 0.7.3 yang hidup, dan hari itu menghasilkan
satu isu hulu yang belum tercatat: jembatan MCP yang dijalankan tanpa
`TITEN_MCP_URL` dan `TITEN_API_KEY` melayani `~/.titen/memory.db` dan menjawab
kosong untuk subject yang di HTTP mengembalikan satu item.

Empat kalimat di draf catatan itu tidak bertahan terhadap mesinnya.

"Akarnya sudah ditutup di hulu" diikuti "belum masuk rilis" terbaca sebagai
sudah di-commit. Saat draf ditulis, ketiga artefaknya masih perubahan pohon
kerja di `/home/ramaaditya/Project/titen`, dan `HEAD` masih `6211fd6`.

"Mesin uji ini berakhir dengan tujuh berkas `titen.db` di tujuh direktori"
tidak cocok dengan mesinnya. `find` menemukan 14 berkas di 14 direktori, dan
hanya satu di antaranya dari kerja hari itu.

"Mengapa environment jembatan tidak sampai ke prosesnya" diarsipkan sebagai
tidak terjawab, padahal jawabannya ada di `~/.claude.json` dan mengubah apa yang
diminta dari hulu.

`docs/roadmap.md` dan `done/mcp-titen-passthrough/spec.md` menyebut mekanisme
yang salah untuk passthrough MCP: `.mcp.json` milik direktori kerja lewat
`claude mcp add --transport http`. Tidak ada `.mcp.json` di direktori kerja mana
pun yang dipakai sesi itu, dan yang tercatat sebagai bukti passthrough adalah
kehadiran tool ditambah satu `titen_project_resolve`, yang dijawab store mana
pun.

## Ruang lingkup

`docs/integrasi-ekosistem.md` dan pasangan Inggrisnya, satu poin di
`docs/roadmap.md` Fase 3, dan dua tempat di `done/mcp-titen-passthrough/spec.md`.

## Yang tidak dikerjakan

- Tidak membalik keputusan passthrough MCP. Alasannya permukaan tulis — 12 dari
  18 tool menulis atau menghapus di luar scrubber, audit, dan budget `compile` —
  dan itu berdiri tanpa baris terakhir tabel pengukuran.
- Tidak menulis ulang riwayat `done/`. Koreksi ditambahkan sebagai koreksi
  bertanggal, bukan sebagai penghapusan kalimat yang pernah dipercaya.
- Tidak mengubah kode. Adapter `src/memory/titen.ts` sudah benar terhadap server
  hidup sejak `ae5ecdc`.
- Tidak mengejar `compile` yang memilih secara leksikal. Itu konfigurasi
  retrieval, bukan cacat, dan sudah tercatat sebagai catatan untuk klien.

## Acceptance criteria

- **AC-1** Kalimat status perbaikan hulu shall menyebut keadaan yang benar pada
  saat ditulis, dan bila sudah di-commit shall menyebut hash-nya.
- **AC-2** Angka berkas `titen.db` shall sama dengan hasil hitung ulang di
  mesinnya, dan shall menyatakan berapa yang berasal dari kerja hari itu.
- **AC-3** WHEN penyebab environment yang hilang sudah diperiksa, THEN catatan
  shall menyebut temuannya dan memindahkan poin "tidak ada sumbernya" ke batas
  yang benar-benar masih terbuka.
- **AC-4** `docs/roadmap.md` dan `done/mcp-titen-passthrough/spec.md` shall
  menyebut transport yang benar-benar terdaftar dan menyatakan bahwa passthrough
  teramati sebagai kehadiran tool, bukan sebagai pembacaan dari database yang
  dilayani.
- **AC-5** Keputusan menolak passthrough shall tetap berdiri, dengan alasan
  permukaan tulis yang tidak bergantung pada AC-4.
- **AC-6** Kedua bahasa shall membawa perubahan yang sama.
