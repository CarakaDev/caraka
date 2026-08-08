# PRD — Caraka

**Versi:** 0.2 · **Tanggal:** 7 Agustus 2026 · **Pemilik produk:** —
**Prasyarat baca:** `docs/blueprint.md`, `docs/research/ringkasan-temuan-dan-rekomendasi.md`

> **Arah terkunci:** channel pertama **Telegram** · agent pertama **Claude Code** · memory **Titen** · rilis **open source** · **satu operator**.

---

## 1. Latar belakang

Coding agent (Claude Code, Codex CLI, Cline, Cursor, Gemini CLI, Kilo, Windsurf, Kiro, Antigravity, dst.) sudah menjadi alat kerja harian developer. Semuanya punya satu batasan yang sama: **terikat pada satu terminal atau satu jendela IDE di satu mesin.**

Solusi yang ada (OpenClaw, Hermes) menyelesaikan masalah "agent di chat" dengan membangun **asisten pribadi lengkap** — agent runtime sendiri, 20+ tool, 22 channel, marketplace 56.000+ skill, companion app multi-platform. Untuk developer yang hanya ingin mengakses coding agent-nya dari HP, ini overkill: berat dipasang, banyak yang tidak terpakai, dan attack surface-nya besar.

Sementara itu, ekosistem sudah menyediakan jalan pintas yang belum dimanfaatkan untuk kasus ini: **ACP (Agent Client Protocol)** — standar JSON-RPC untuk berbicara ke coding agent apa pun, dengan 28+ agent terdaftar dan dukungan Zed, JetBrains, Google, dan AWS.

---

## 2. Masalah yang dipecahkan

| # | Masalah | Bukti / sumber |
|---|---|---|
| P1 | Coding agent tidak bisa diakses dari luar mesin | Sifat semua CLI/IDE agent |
| P2 | Run panjang berjalan tanpa visibilitas | Pengalaman umum pengguna agent |
| P3 | Tidak ada memori lintas sesi | Alasan keberadaan seluruh kategori memory layer (biaya konteks 10 juta token ≈ $5/panggilan pada harga 2026) |
| P3b | **Chat itu linear; kerja itu paralel.** Lima tugas dalam satu aliran chat = kekacauan. Di terminal ada tab; di chat tidak ada | Model kerja developer sehari-hari; dijawab oleh forum topic Telegram di private chat |
| P4 | Solusi eksisting terlalu berat & terlalu luas | OpenClaw dan Hermes adalah **asisten pribadi**, bukan alat membangun aplikasi. Standard Compute: *"OpenClaw is a personal agent; OpenCode is a coding agent — different tools for different jobs."* Eigent: keduanya "barely overlap". Menulis kode ada di daftar keterampilan mereka, tetapi bukan alasan produknya ada |
| P4b | Biaya token dibayar dua kali | Agent loop milik asisten pribadi membakar token di luar langganan coding agent yang sudah dibayar. Keluhan pengguna OpenClaw: *"if you want to use it like a personal assistant, the cost will skyrocket pretty fast"* |
| P4c | Setup yang menyiksa | Pengguna OpenClaw melaporkan *"installation is a nightmare. I remember spending hours to get it right"* |
| P5 | Ganti agent = ganti seluruh integrasi | Dijawab ACP: 1 client → 28+ agent |

---

## 3. Pengguna

### Persona utama — "Rio, indie developer, Jakarta"
Pakai Claude Code + Codex tiap hari. Punya 3–5 repo aktif. Sering dapat ide di jalan. Ingin bisa bilang "cek kenapa build gagal" dari WhatsApp sambil di ojek. **Tidak** ingin memasang asisten pribadi lengkap; ingin satu alat kecil yang jelas fungsinya.

### Persona sekunder — "Sarah, tech lead tim 6 orang"
Ingin tim bisa memicu tugas agent dari Discord dengan kontrol siapa boleh menyetujui apa. Peduli audit trail.

### Persona tersier — "Budi, freelancer"
Klien menghubungi lewat WhatsApp. Ingin cek status deploy/perbaikan cepat tanpa buka laptop.

### Bukan target
Tim enterprise yang butuh SSO/RBAC/compliance; pengguna non-teknis; orang yang mencari asisten pribadi umum. Kalau yang dibutuhkan adalah membereskan inbox, menjaga kalender, atau mengendalikan browser, jawabannya OpenClaw, dan Caraka tidak akan pernah menyainginya di pekerjaan itu.

---

## 4. Tujuan produk

| # | Tujuan | Metrik |
|---|---|---|
| G1 | Waktu dari install ke pesan pertama yang berhasil | **< 3 menit** |
| G2 | Cakupan coding agent | **≥ 15 agent** di v1.0 |
| G3 | Ringan | Paket < 15 MB · RAM idle < 80 MB · cold start < 2 dtk |
| G4 | Aman secara default | 0 insiden eksekusi tak disetujui pada beta |
| G5 | Kepercayaan | ≥ 70% pengguna beta memakai ≥ 3 hari/minggu setelah 1 bulan |
| G6 | Kesederhanaan kode | Inti ≤ 8.000 LOC — terpenuhi di v1.0 (7.880), **tidak terpenuhi** sejak v1.1 (8.349 pada 8 Agustus 2026) |

---

## 5. Non-goals (eksplisit)

1. Bukan agent runtime — tidak ada reasoning loop.
2. Tidak ada tool eksekusi sendiri (exec/fs/browser/PDF).
3. Tidak ada marketplace skill/plugin.
4. Tidak ada companion app, voice, kamera, canvas.
5. Tidak ada abstraksi model provider — itu urusan coding agent.
6. Tidak multi-tenant SaaS di v1.
7. Tidak menggantikan IDE atau code review.

> Aturan penjaga: setiap usulan fitur diuji dengan pertanyaan **"apakah coding agent sudah bisa melakukan ini?"** Kalau ya → tolak.

---

## 6. Ruang lingkup v1.0

### Harus ada (P0)
- **Channel:** **Telegram** (Bot API 10.2) — satu-satunya di v1.0
- **Sesi = topic:** bot membuat forum topic sendiri per tugas, mewarnai ikonnya sesuai status, dan menutupnya. Fallback mode linear bila topic tidak tersedia
- **Driver:** ACP (utama) + CLI (fallback), keduanya berbasis konfigurasi deklaratif
- **Agent tervalidasi:** **Claude Code** (utama), lalu Codex CLI, Gemini CLI, Cursor, Goose, Amp (± 6 diuji, sisanya lewat ACP Registry)
- **Rendering:** hasil sebagai Rich Message (tabel, code block, collapsible); progres sebagai pesan yang di-edit
- **Approval:** render `session/request_permission` jadi tombol berwarna; nonce + TTL; callback terikat principal, juga di grup
- **Kebijakan:** `read-only` / `assisted` / `trusted`
- **Memory:** provider `titen` (default, non-LLM) + `local` (fallback) + `none`
- **Audit log** append-only
- **Onboarding:** `npx caraka init` — nol sampai pesan pertama < 3 menit

### Sebaiknya ada (P1)
- Discord (+ thread + role-based approval)
- WhatsApp (provider `baileys` + `cloud-api`)
- MCP inbox untuk agent-di-IDE (Cline, Kilo, Windsurf, Kiro, Antigravity)
- Dashboard read-only lokal
- Memory provider `mcp` generik

### Bisa ditunda (P2)
- Signal (`signal-cli`)
- Multi-operator / tim (Titen Level 6)
- Cron sederhana
- Mini App sebagai dashboard
- Slack, Matrix

### Tidak akan (P3)
- Marketplace, mobile app, hosted SaaS

---

## 7. User stories utama

| ID | Sebagai… | Saya ingin… | Supaya… |
|---|---|---|---|
| US-01 | developer | mengirim tugas ke coding agent lewat Telegram | bisa mulai kerja dari mana saja |
| US-02 | developer | melihat progres agent secara live di chat | tahu run panjang tidak macet |
| US-03 | developer | menyetujui/menolak perubahan file lewat tombol | agent tidak mengubah kode tanpa izin |
| US-04 | developer | agent ingat keputusan proyek lintas sesi | tidak menjelaskan ulang tiap hari |
| US-05 | developer | berpindah antar repo dengan `@nama-repo` | satu chat melayani banyak proyek |
| US-06 | developer | mengganti coding agent tanpa mengubah setup | tidak terkunci vendor |
| US-07 | tech lead | membatasi siapa yang boleh menyetujui eksekusi | mengendalikan risiko tim |
| US-08 | developer | menghentikan run yang salah arah | tidak buang token/waktu |
| US-09 | developer | melihat audit siapa memicu apa | bisa menelusuri masalah |
| US-10 | developer | memasang dalam < 3 menit tanpa membaca dokumentasi | tidak menyerah di tengah setup |
| US-11 | developer | setiap tugas punya "tab" sendiri | lima pekerjaan paralel tidak saling menimpa di satu aliran chat |
| US-12 | developer | melihat status semua sesi tanpa membuka satu pun | tahu mana yang butuh perhatian dalam satu pandangan |
| US-13 | developer | melihat diff & hasil test terformat rapi di chat | tidak perlu membuka laptop untuk menilai perubahan |
| US-14 | developer | menelusuri kenapa agent "ingat" sesuatu | percaya pada memori, bukan menebaknya |

---

## 8. Asumsi & ketergantungan

| # | Asumsi | Risiko bila salah |
|---|---|---|
| A1 | ACP tetap stabil & adopsinya tumbuh | Beban pindah ke jalur CLI (mitigasi sudah ada) |
| A2 | User sudah memasang & mengautentikasi coding agent-nya | Onboarding harus mendeteksi & memandu |
| A3 | Titen (titen.dev, Apache-2.0, v0.7.0) stabil dipakai sebagai memory default | **Terverifikasi.** Risiko tersisa: pre-1.0 → API bisa berubah. Mitigasi: kunci versi + provider `local` sebagai fallback |
| A3b | Bot Telegram benar-benar dapat membuat topic di private chat tanpa hak admin | Diuji di Fase 0. Bila gagal → mode linear, dan seluruh UX ditinjau ulang |
| A4 | Risiko ban WhatsApp bisa ditekan dengan pola "hanya membalas" | Sediakan `cloud-api` sebagai jalan keluar |
| A5 | Satu operator per instalasi di v1 | Model data sudah menyiapkan `principal` untuk multi-user |

---

## 9. Kriteria sukses rilis

**v0.1 (dogfood):** bisa dipakai penulis sendiri selama 1 minggu tanpa membuka laptop untuk tugas kecil.
**v0.5 (beta tertutup):** 20 developer, ≥ 3 agent berbeda, 0 insiden eksekusi tak disetujui.
**v1.0 (publik):** G1–G6 terpenuhi; dokumentasi lengkap; 15+ agent tercakup.
