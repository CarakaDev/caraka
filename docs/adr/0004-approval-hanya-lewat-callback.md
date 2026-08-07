# ADR-0004 — Persetujuan hanya lewat callback bertanda tangan

**Status:** Diterima · **Tanggal:** 7 Agustus 2026

## Konteks

Caraka menghubungkan input tak tepercaya, yaitu isi chat, ke eksekusi kode di mesin developer. Prompt injection langsung maupun tidak langsung adalah ancaman nyata, bukan teoretis.

Kalau persetujuan bisa datang sebagai teks, maka teks jahat bisa menyetujui dirinya sendiri.

## Keputusan

Persetujuan hanya sah lewat callback bertanda tangan, sekali pakai, ber-TTL, dan terikat pada `(principal, session, request)`. Teks chat biasa tidak pernah menjadi keputusan.

### Amandemen 7 Agustus 2026 — dua tingkat, bukan satu

ADR ini semula menulis "mode `trusted` hanya bisa diaktifkan dari terminal lokal". Kalimat itu menggabungkan dua mekanisme yang berbeda. Pemilik memutuskan keduanya dikirim, lewat jalur yang berbeda (`spec/v02.md` §2b.1).

**Jendela trust Caraka.** Boleh dibuka dari chat, karena yang membukanya bukan teks melainkan callback bertanda tangan sekali pakai yang sudah diatur ADR ini. Caraka tetap menerima setiap `session/request_permission`, tetap mengirim kartu untuk aksi berisiko tinggi, tetap menulis audit per aksi, dan `/lock` menutupnya seketika. Wajib berdurasi, berlingkup satu workspace, dan tidak bertahan melewati restart.

**Mode `bypassPermissions` milik Claude.** Hanya dari terminal, lewat `caraka trust <workspace> --bypass --for <durasi>`. Adapter `claude-agent-acp` 0.63.0 menjawab izin secara lokal begitu mode itu menyala dan berhenti mengirim `session/request_permission`, jadi Caraka tidak auto-approve — ia tidak pernah diberi tahu ada keputusan. Tidak ada yang tersisa untuk ditegakkan, dan tidak ada yang bisa diaudit selain jendelanya.

Yang tidak berubah: `expires_at` wajib, ditegakkan constraint basis data, untuk keduanya.

## Konsekuensi

Memutus seluruh kelas serangan prompt injection pada titik yang paling menentukan. Agent boleh dibohongi; konsekuensinya tetap butuh ketukan manusia.

Channel tanpa tombol memakai fallback kode pendek (`ok A7F3`), yang tetap terikat nonce.

`callback_data` Telegram maksimal 64 byte, jadi payload disimpan di basis data dan hanya id-nya yang dikirim, ditandatangani HMAC.

## Alternatif yang ditolak

**Balasan teks "ya".** Bisa dipalsukan oleh konten yang dibaca agent.

**Approval sekali untuk seluruh sesi.** Menghapus perlindungan justru pada run panjang yang paling berisiko.
