# ADR-0006 — Telegram sebagai channel pertama dan satu-satunya di v1.0

**Status:** Diterima · **Tanggal:** 7 Agustus 2026

## Konteks

WhatsApp punya jangkauan terluas di Indonesia, tetapi jalur tidak resminya membawa risiko ban yang nyata dan tidak dapat diprediksi.

Telegram punya Bot API resmi, dan sejak 2026 punya primitif yang tidak dimiliki platform lain: topic di chat pribadi, Rich Messages, dan ephemeral messages.

## Keputusan

Telegram menjadi satu-satunya channel di v1.0. WhatsApp dan Discord menyusul setelah produk terbukti berguna.

## Konsekuensi

Tidak ada risiko ban, tidak ada verifikasi bisnis, tidak ada biaya per pesan.

Long-polling berarti gateway tetap bisa bind ke `127.0.0.1` tanpa port terbuka, tunnel, atau sertifikat. Seluruh kelas risiko "gateway terekspos internet" tidak berlaku di v1.0.

Pasar Indonesia yang memakai WhatsApp harus menunggu. Ini biaya yang diterima demi membuktikan produk lebih dulu.

Pustaka masih tertinggal dari Bot API 10.2, jadi method terbaru dipanggil lewat adapter HTTP tipis.

## Alternatif yang ditolak

**WhatsApp lebih dulu.** Risiko ban mengancam kelangsungan produk sebelum ia terbukti berguna.

**Empat channel sekaligus di v1.0.** Melipatgandakan permukaan sebelum satu pun terbukti.
