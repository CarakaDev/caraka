# ADR-0005 — Titen sebagai provider memori default

**Status:** Diterima · **Tanggal:** 7 Agustus 2026

## Konteks

Memori lintas sesi dibutuhkan supaya agent tidak memulai dari nol setiap hari. Membangunnya sendiri berarti embedding lokal, skoring hybrid, dedup, TTL, dan penanganan fakta usang.

Titen sudah mengerjakan semuanya, open source Apache-2.0, dan ekstraksi claim-nya deterministik tanpa model di dalam loop.

## Keputusan

Titen menjadi provider default, dijalankan lokal. Provider `local` (SQLite + FTS5, tanpa embedding) menjadi cadangan dangkal. Provider `none` mematikan memori sepenuhnya.

## Konsekuensi

Ratusan baris kode keluar dari lingkup kita. Skoring, dedup, TTL, dan pemotongan budget menjadi parameter, bukan implementasi.

Observation, claim, dan context tidak pernah diratakan, jadi pertanyaan "kenapa agent tahu ini" selalu punya jawaban.

Titen berjalan sebagai proses terpisah di runtime Bun, sementara gateway tetap Node. Tidak ada percampuran runtime.

Risiko pre-1.0 diturunkan oleh fakta bahwa penulisnya sama, jadi perubahan API bisa direncanakan.

## Alternatif yang ditolak

**Membangun sendiri.** Ratusan baris untuk menyamai sesuatu yang sudah ada dan lebih baik.

**Mem0, Zep, Letta.** Cloud-first atau butuh LLM di jalur tulis, keduanya bertentangan dengan syarat non-LLM.
