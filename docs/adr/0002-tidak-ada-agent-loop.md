# ADR-0002 — Tidak ada agent loop, tool, atau marketplace

**Status:** Diterima · **Tanggal:** 7 Agustus 2026

## Konteks

Analisis sembilan lapisan OpenClaw menunjukkan hanya tiga yang relevan untuk kasus pakai kita. Enam sisanya sudah disediakan coding agent, dengan kualitas lebih tinggi: sandbox bawaan, konteks repo, diff review, kesadaran git.

Pengguna OpenClaw melaporkan biaya token yang meledak karena agent loop-nya sendiri, dan pengalaman plugin yang buruk meski ekosistemnya besar.

## Keputusan

Caraka tidak punya reasoning loop, tool eksekusi, abstraksi model provider, maupun marketplace plugin. Ekstensi hanya lewat preset YAML deklaratif dan MCP server yang dipasang user secara sadar.

## Konsekuensi

Tidak ada token kedua. Semua biaya jatuh ke langganan coding agent yang sudah dibayar.

Permukaan serangan minimal, karena kita mewarisi sandbox agent alih-alih menambah permukaan eksekusi baru.

Inti bisa dijaga di bawah ±8.000 baris, cukup kecil untuk dibaca satu orang dalam sehari.

Konsekuensi yang tidak nyaman: setiap permintaan fitur diuji dengan satu pertanyaan, apakah coding agent sudah bisa melakukannya. Banyak permintaan yang masuk akal akan ditolak.

## Alternatif yang ditolak

**Tool minimal saja.** Tidak ada garis alami di mana "minimal" berhenti. Nol adalah satu-satunya batas yang bisa dipertahankan.

**Marketplace dengan kurasi.** Registry tetap permukaan supply chain, dan kurasi butuh orang yang belum ada.
