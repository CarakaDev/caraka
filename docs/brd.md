# BRD — Business Requirements Document

**English:** this document is Indonesian only, and stays that way because it is internal specification. English documentation starts at [`../README.md`](../README.md).

**Produk:** Caraka · **Versi:** 0.2 · **Tanggal:** 7 Agustus 2026

> **Arah terkunci:** Telegram · Claude Code · Titen · **open source** · satu operator.

---

## 1. Ringkasan eksekutif

Caraka menjual satu hal: **akses jarak jauh ke coding agent yang sudah kamu bayar.**

Pasar coding agent sudah matang dan terfragmentasi — Claude Code, Codex, Cursor, Cline, Gemini CLI, Kilo, Windsurf, Kiro, Antigravity, dan puluhan lainnya. Fragmentasi ini biasanya jadi masalah integrasi. Kemunculan **ACP** (didukung Zed, JetBrains, Google, AWS; 28+ agent di registry per Januari 2026) mengubahnya menjadi peluang: satu produk kecil bisa melayani hampir seluruh pasar sekaligus.

Pemain eksisting (OpenClaw ±385k stars, Hermes) menyelesaikan masalah yang **berdekatan tapi berbeda**: mereka membangun asisten pribadi lengkap. Caraka tidak bersaing di sana; ia mengambil ceruk yang lebih sempit dan lebih dalam: **developer yang sudah punya coding agent dan hanya ingin transport.**

---

## 2. Peluang pasar

### Ukuran & sinyal

| Sinyal | Angka | Implikasi |
|---|---|---|
| Popularitas kategori "agent di chat" | OpenClaw ±385k ⭐, ±81k fork | Permintaan terbukti besar |
| Fragmentasi agent | 28+ agent di ACP Registry | Butuh lapisan netral |
| Adopsi standar | JetBrains co-lead, Google (Gemini CLI), AWS (Kiro), Zed | ACP bukan taruhan spekulatif |
| Pasar Indonesia | Telegram 128,55 juta (62,8%); WhatsApp praktis universal | Channel-first strategy jelas |
| Telegram jadi platform agent | Bot API 9.5–10.2 (2026) menambah topic di private chat, Rich Messages dengan streaming, ephemeral messages, dan Managed Bots | Platform pertama yang **memberi primitif untuk agent**, bukan sekadar bot — alasan kuat memilihnya lebih dulu |
| Memory open source lokal | Titen (Apache-2.0, deterministik tanpa LLM) | Menghapus komponen paling mahal dari lingkup kita, dan sejalan dengan ekosistem Indonesia |
| Biaya konteks | ±$5 per panggilan inference untuk konteks 10 juta token (harga 2026) | Memory layer punya nilai ekonomi nyata |

### Segmen

1. **Indie & freelance developer (utama)** — sensitif harga, cepat mengadopsi, aktif di WhatsApp/Telegram. Indonesia & Asia Tenggara adalah beachhead alami.
2. **Tim kecil (5–20 orang)** — butuh Discord + audit + kontrol approval.
3. **Konsultan/agency** — klien menghubungi lewat WhatsApp; status cepat bernilai tinggi.

---

## 3. Analisis kompetitif

| | OpenClaw | Hermes | Caraka |
|---|---|---|---|
| Kategori | Personal AI assistant | Agent framework (Python) | **Jembatan chat ⇄ coding agent** |
| Pekerjaan utama | inbox, kalender, browser, otomasi harian | orkestrasi agent | **mengerjakan repo** |
| Runtime | Punya sendiri | Punya sendiri | **Milik user** |
| Tool | 20+ | Ada | **0** |
| Channel | 22 | via gateway | 1 di v1.0 |
| Plugin | Marketplace besar | Ada | **Tidak ada** |
| Menulis kode | salah satu keterampilan | salah satu keterampilan | **satu-satunya alasan produk ini ada** |
| Token di luar agent | ya, agent loop sendiri | ya | **tidak ada** |
| Instalasi | dilaporkan berjam-jam | pip + venv, Linux/macOS/WSL2 | **`npx`, target < 3 menit** |
| Attack surface | Besar | Sedang | **Minimal (warisan sandbox agent)** |
| Target | Power user | Developer framework | **Developer pemakai coding agent** |

**Diferensiasi utama:** *"Bukan asisten baru untuk dipelajari. Ini agent yang sudah kamu pakai, cuma sekarang bisa dihubungi — dan setiap tugas punya tab-nya sendiri."*

Kategorinya memang berbeda, dan itu sudah menjadi konsensus industri. Standard Compute menuliskannya persis: *"OpenClaw is a personal agent; OpenCode is a coding agent — different tools for different jobs."* Eigent menyatakan OpenClaw dan Claude Code "barely overlap". Skywork mengukur 85% pemakaian OpenCode adalah software development, sementara OpenClaw tersebar ke penggunaan pribadi.

Empat keluhan pengguna OpenClaw yang menjadi peluang kita, semuanya terkutip di `research/perbandingan-openclaw-hermes-caraka.md`: setup yang dilaporkan memakan berjam-jam, pengalaman plugin yang buruk meski ekosistemnya besar, biaya token yang meledak karena agent loop sendiri, dan keamanan yang menyusul belakangan.

Biaya adalah pembeda ekonomi paling nyata. OpenClaw menjalankan agent loop-nya sendiri, jadi setiap heartbeat adalah token di luar langganan coding agent yang sudah kamu bayar. Caraka tidak punya loop, jadi tidak ada token kedua.

Diferensiasi kedua yang sulit ditiru: **model sesi ber-tab**. OpenClaw dan sejenisnya memperlakukan chat sebagai satu aliran karena mereka harus melayani 22 channel dengan kemampuan berbeda-beda. Kita bertaruh pada satu channel dan mengeksploitasi primitif terbaiknya sampai habis.

**Risiko kompetitif jujur:** OpenClaw bisa saja mempromosikan `cliBackends`/ACP-nya menjadi jalur utama. Pertahanan kita bukan fitur, melainkan **kesederhanaan dan fokus** — sesuatu yang sulit ditiru oleh proyek dengan 76.000+ commit dan 22 channel untuk dipelihara.

---

## 4. Proposisi nilai

| Untuk | Yang… | Caraka adalah… | Yang… | Berbeda dari… |
|---|---|---|---|---|
| Developer | sudah memakai coding agent tiap hari | bridge chat seberat beberapa megabyte | membuat agent itu bisa dihubungi dari HP, dengan approval & memori | OpenClaw, yang mengharuskan mengadopsi seluruh asisten baru |

---

## 5. Model bisnis

**Fase 1 — Open source (MIT), gratis, self-hosted. — KEPUTUSAN FINAL.**
Alasan: kategori ini dimenangkan lewat kepercayaan dan distribusi. Produk yang menjalankan perintah di mesin developer harus bisa dibaca kodenya. Basis kode yang kecil (≤ 8.000 LOC) menjadikan "bacalah sendiri" sebuah tawaran yang realistis, bukan basa-basi.

**Fase 2 — Monetisasi opsional (dievaluasi setelah 1.000 pengguna aktif):**

| Aliran | Bentuk | Catatan |
|---|---|---|
| **Relay terkelola** | Endpoint webhook + tunnel untuk WhatsApp Cloud API, tanpa user mengurus domain/TLS | Nilai jelas, biaya nyata |
| **Memory cloud** | Sinkronisasi memori antar mesin, backup, tim | Hanya bila terbukti diminta |
| **Team edition** | RBAC, SSO, audit terpusat | Segmen B2B kecil |
| **Sponsorship/donasi** | GitHub Sponsors | Konsisten dengan norma ekosistem |

**Yang tidak akan dilakukan:** menjual akses model (itu bisnis vendor agent), atau menahan fitur keamanan di balik paywall.

---

## 6. Strategi masuk pasar

1. **Dogfooding publik.** Bangun di depan umum; tunjukkan penulis memakainya sehari-hari.
2. **Beachhead Indonesia.** Dokumentasi bahasa Indonesia, WhatsApp sebagai warga kelas satu, konten di komunitas dev lokal.
3. **Distribusi lewat ekosistem agent.** Terdaftar sebagai klien di ekosistem ACP; kontribusi balik ke registry; hadir di daftar "MCP servers" untuk jalur IDE. Tambahan: **Titen ditulis oleh penulis yang sama** — Caraka (utusan) dan Titen (ingatan) dipasarkan sebagai dua proyek open source Jawa yang saling melengkapi, bukan sebagai produk dan dependensinya.
4. **Konten pembanding jujur.** Artikel "Kapan pakai OpenClaw, kapan pakai Caraka" — kejujuran menghasilkan kepercayaan lebih baik daripada klaim superioritas.
5. **Waktu-ke-nilai < 3 menit** sebagai fitur pemasaran utama — dan dibuktikan dengan rekaman layar, bukan klaim.

---

## 7. Kebutuhan bisnis (BR)

| ID | Kebutuhan | Alasan bisnis |
|---|---|---|
| BR-01 | Instalasi ke pesan pertama < 3 menit | Penentu konversi terbesar untuk developer tool |
| BR-01b | Sesi ber-tab otomatis, tanpa konfigurasi | Diferensiasi utama; juga alasan produk terasa "rapi" dibanding alternatif |
| BR-02 | Mendukung ≥ 15 coding agent saat rilis | Netralitas adalah proposisi nilai; vendor-lock membunuh cerita |
| BR-03 | WhatsApp sebagai channel kelas satu | Tanpa itu, pasar Indonesia tertutup |
| BR-04 | Aman secara default tanpa konfigurasi | Satu insiden publik akan mematikan kepercayaan kategori ini |
| BR-05 | Open source dengan lisensi permisif (MIT) | Prasyarat kepercayaan untuk perangkat lunak yang mengeksekusi kode — **sudah diputuskan** |
| BR-05b | Memori memakai komponen open source (Titen, Apache-2.0) yang datanya dapat diekspor | Tidak ada penyanderaan data; user dapat pergi kapan saja |
| BR-06 | Basis kode kecil & dapat dibaca satu orang dalam sehari | Diferensiasi utama + memungkinkan kontribusi |
| BR-07 | Dokumentasi dwibahasa (ID/EN) | Beachhead lokal + jangkauan global |
| BR-08 | Tidak menyimpan kredensial model user | Mengurangi tanggung jawab hukum & risiko |
| BR-09 | Jalur keluar dari Baileys (Cloud API) | Ketergantungan pada API tidak resmi adalah risiko eksistensial |
| BR-10 | Jejak audit lengkap | Prasyarat untuk segmen tim |

---

## 8. Risiko bisnis

| Risiko | Dampak | Kemungkinan | Mitigasi |
|---|---|---|---|
| WhatsApp memblokir jalur tidak resmi lebih agresif | Tinggi | Sedang | Cloud API sebagai provider setara; Telegram sebagai default |
| Insiden keamanan publik (agent merusak repo orang) | **Kritis** | Rendah–sedang | Default membosankan; approval wajib; audit; komunikasi risiko terbuka |
| ACP kehilangan momentum | Sedang | Rendah | Driver CLI menutupi; dukungan JetBrains/Google/AWS menurunkan risiko |
| Vendor agent merilis bridge chat resmi | Sedang | Sedang | Netralitas lintas-vendor tetap bernilai; jadilah lapisan yang mereka tidak mau bangun |
| Scope creep menjadi OpenClaw kedua | Tinggi | **Tinggi** | Non-goals tertulis; anggaran LOC; aturan "sudah bisa dilakukan agent? tolak" |
| Adopsi rendah karena terlalu niche | Sedang | Sedang | Ceruk sempit memang disengaja; ukur retensi, bukan jumlah unduhan |
| Ketergantungan pada Titen (pre-1.0) | Rendah | Rendah | Ditulis penulis yang sama → roadmap terkoordinasi; `MemoryProvider` tetap pluggable; Apache-2.0 + data dapat diekspor |

---

## 9. KPI

**Aktivasi:** % instalasi yang mengirim pesan berhasil dalam 24 jam pertama (target ≥ 60%)
**Retensi:** % pengguna aktif ≥ 3 hari/minggu pada D30 (target ≥ 70% dari beta)
**Kedalaman:** rata-rata run per pengguna per minggu (target ≥ 10)
**Cakupan:** jumlah agent unik yang benar-benar dipakai (target ≥ 8 di antara pengguna beta)
**Kepercayaan:** insiden eksekusi tanpa persetujuan = **0**
**Efisiensi:** median waktu setup (target < 3 menit)
**Kerapian:** rata-rata sesi aktif bersamaan per pengguna (bila selalu 1, model tab tidak terbukti bernilai — sinyal untuk menyederhanakan)
