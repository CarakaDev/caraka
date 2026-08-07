# ADR-0004 — Persetujuan hanya lewat callback bertanda tangan

**Status:** Diterima · **Tanggal:** 7 Agustus 2026

## Konteks

Caraka menghubungkan input tak tepercaya, yaitu isi chat, ke eksekusi kode di mesin developer. Prompt injection langsung maupun tidak langsung adalah ancaman nyata, bukan teoretis.

Kalau persetujuan bisa datang sebagai teks, maka teks jahat bisa menyetujui dirinya sendiri.

## Keputusan

Persetujuan hanya sah lewat callback bertanda tangan, sekali pakai, ber-TTL, dan terikat pada `(principal, session, request)`. Teks chat biasa tidak pernah menjadi keputusan.

Mode `trusted` hanya bisa diaktifkan dari terminal lokal dan wajib kedaluwarsa, ditegakkan constraint basis data.

## Konsekuensi

Memutus seluruh kelas serangan prompt injection pada titik yang paling menentukan. Agent boleh dibohongi; konsekuensinya tetap butuh ketukan manusia.

Channel tanpa tombol memakai fallback kode pendek (`ok A7F3`), yang tetap terikat nonce.

`callback_data` Telegram maksimal 64 byte, jadi payload disimpan di basis data dan hanya id-nya yang dikirim, ditandatangani HMAC.

## Alternatif yang ditolak

**Balasan teks "ya".** Bisa dipalsukan oleh konten yang dibaca agent.

**Approval sekali untuk seluruh sesi.** Menghapus perlindungan justru pada run panjang yang paling berisiko.
