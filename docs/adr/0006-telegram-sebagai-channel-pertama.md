# ADR-0006 — Telegram sebagai channel pertama dan satu-satunya di v1.0

**English:** this document is Indonesian only, and stays that way because an accepted decision record is never rewritten. English documentation starts at [`../../README.md`](../../README.md).

**Status:** Diterima · **Tanggal:** 7 Agustus 2026
**Sebagian digantikan:** keputusan "satu-satunya channel di v1.0" digantikan [ADR-0008](0008-discord-sebagai-channel-kedua.md) pada 8 Agustus 2026. Alasan memilih Telegram lebih dulu, dan seluruh konsekuensinya, tetap berlaku.

## Konteks

WhatsApp punya jangkauan terluas di Indonesia, tetapi jalur tidak resminya membawa risiko ban yang nyata dan tidak dapat diprediksi.

Telegram punya Bot API resmi, dan sejak 2026 punya primitif yang tidak dimiliki platform lain: topic di chat pribadi, Rich Messages, dan ephemeral messages.

## Keputusan

Telegram menjadi satu-satunya channel di v1.0. WhatsApp dan Discord menyusul setelah produk terbukti berguna.

> **Digantikan 8 Agustus 2026 oleh [ADR-0008](0008-discord-sebagai-channel-kedua.md).** Discord mendarat di v0.5, lebih cepat dari yang direncanakan di sini, karena Fase 5 menanyakan apakah core benar-benar tidak tahu channel mana yang menjawab — dan pertanyaan itu tidak bisa dijawab oleh satu channel. WhatsApp tetap menunggu Fase 6.

## Konsekuensi

Tidak ada risiko ban, tidak ada verifikasi bisnis, tidak ada biaya per pesan.

Long-polling berarti gateway tetap bisa bind ke `127.0.0.1` tanpa port terbuka, tunnel, atau sertifikat. Seluruh kelas risiko "gateway terekspos internet" tidak berlaku di v1.0.

### Amandemen 8 Agustus 2026 — nol port terbuka, bukan nol socket

Konsekuensi di atas ditulis ketika satu-satunya alasan sebuah proses akan mendengarkan adalah menerima pesan channel. Untuk channel, kalimat itu tetap berlaku apa adanya: tidak ada webhook, tidak ada port yang harus dibuka ke internet, dan tidak ada sertifikat.

Sejak v0.5 ada satu socket di mesin, dan ia bukan channel. `caraka dashboard` (`spec/dashboard-v05.md`) mendengarkan di `127.0.0.1` dan hanya melayani GET. Ia tidak menerima satu pun byte dari platform mana pun, jadi permukaan yang ADR ini tutup tetap tertutup — yang berubah hanya kalimatnya, dari "tidak ada socket" menjadi "tidak ada port terbuka".

Pasar Indonesia yang memakai WhatsApp harus menunggu. Ini biaya yang diterima demi membuktikan produk lebih dulu.

Pustaka masih tertinggal dari Bot API 10.2, jadi method terbaru dipanggil lewat adapter HTTP tipis.

## Alternatif yang ditolak

**WhatsApp lebih dulu.** Risiko ban mengancam kelangsungan produk sebelum ia terbukti berguna.

**Empat channel sekaligus di v1.0.** Melipatgandakan permukaan sebelum satu pun terbukti.
