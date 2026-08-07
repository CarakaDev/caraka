# ADR-0003 — Satu sesi sama dengan satu forum topic

**Status:** Diterima · **Tanggal:** 7 Agustus 2026

## Konteks

Di terminal developer membuka tab. Chat memaksa lima pekerjaan paralel ke satu aliran linear, dan itu kacau.

Sejak 2026, bot Telegram bisa membuat forum topic di chat pribadi tanpa hak admin apa pun.

## Keputusan

Satu sesi sama dengan satu topic. Bot yang membuat, menamai, mewarnai ikonnya sesuai state, mengirim ringkasan penutup, lalu menutupnya.

## Konsekuensi

Daftar topic menjadi papan status yang bisa dibaca sekilas tanpa membuka apa pun. Nol setup bagi user, karena tidak butuh supergroup maupun hak admin.

Butuh housekeeping sejak awal: tutup saat selesai, hapus setelah tujuh hari, batas lima sesi aktif. Tanpa itu daftarnya membengkak seperti tab browser.

`createForumTopic` gagal diam-diam bila forum mode mati di supergroup, jadi deteksi kemampuan wajib dilakukan sekali saat startup.

## Alternatif yang ditolak

**Satu aliran dengan prefiks.** Tetap disediakan sebagai mode linear untuk channel tanpa thread, tapi bukan model utama.

**Satu chat per workspace.** Memaksa user mengelola banyak bot, dan tidak menyelesaikan paralelisme di dalam satu repo.
