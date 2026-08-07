# ADR-0001 — ACP sebagai jalur utama ke coding agent

**Status:** Diterima · **Tanggal:** 7 Agustus 2026

## Konteks

Ada 22+ coding agent yang relevan, masing-masing dengan cara pemanggilan berbeda. Menulis adapter per agent berarti pekerjaan yang tidak pernah selesai, karena agent baru muncul lebih cepat daripada kita bisa mengejarnya.

ACP (Agent Client Protocol) adalah JSON-RPC 2.0 di atas stdio, dibuat Zed, di-co-lead JetBrains, dengan registry yang hidup sejak Januari 2026 dan 28+ agent terdaftar.

## Keputusan

ACP menjadi jalur utama. Driver CLI deklaratif menjadi cadangan untuk agent tanpa ACP. MCP inbox menangani agent yang hidup di dalam IDE.

## Konsekuensi

Satu klien mencakup ±19 dari 22 agent, termasuk agent yang belum ada hari ini selama mereka mendaftar ke registry.

ACP juga membawa `session/request_permission`, jadi sistem approval tidak perlu dibangun sendiri. Ini menghapus satu subsistem penuh dari lingkup.

Risiko: versi protokol bisa berubah. Mitigasinya negosiasi versi di `initialize` dan menolak dengan pesan jelas bila di luar rentang dukungan.

## Alternatif yang ditolak

**Adapter per agent.** Pekerjaan tak berujung, dan setiap agent baru adalah utang.

**Hanya driver CLI.** Kehilangan streaming, permission hook, dan diff. OpenClaw sendiri memposisikan jalur CLI-nya sebagai jaring pengaman, bukan jalur utama.

**Menunggu standar lain muncul.** Tidak ada kandidat lain dengan dukungan vendor sekuat ini.
