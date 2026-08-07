# Riset: Caraka dibanding OpenClaw dan Hermes

**Tanggal riset:** 7 Agustus 2026
**Pertanyaan:** apakah benar OpenClaw dan Hermes adalah asisten pribadi yang *dipaksa* mengerjakan pembuatan aplikasi, sedangkan Caraka memang dibangun khusus untuk itu?
**Jawaban singkat:** benar, dan sumber industri menyatakannya dengan kalimat yang hampir sama persis.

**Sumber:** standardcompute.com/best-ai-agent/openclaw-vs-opencode · eigent.ai/blog/openclaw-vs-claude-code · skywork.ai (OpenCode vs OpenClaw) · composio.dev/content/openclaw-alternatives · vellum.ai/blog/best-openclaw-alternatives · sfailabs.com/guides/openclaw-alternatives · openclawlaunch.com/compare/opencode · sparkco.ai (OpenClaw vs Cursor Agent)

---

## 1. Kategorinya memang berbeda, dan itu sudah jadi konsensus

Kalimat paling ringkas datang dari Standard Compute:

> "OpenClaw is a personal agent; OpenCode is a coding agent — different tools for different jobs."

Eigent menyatakan hal yang sama untuk pasangan OpenClaw dan Claude Code: keduanya adalah "two fundamentally different visions of what AI assistants should do", dan **"they barely overlap"**. Mereka menambahkan peringatan yang relevan untuk kita: memilih alat yang salah untuk masalah yang sebenarnya akan membuang waktu.

Deskripsi OpenClaw dari Skywork memperjelas apa yang sebenarnya dijual:

> "a persistent, self-hosted personal AI assistant… It doesn't just write code; it clears your inbox, manages your calendar, and executes multi-step workflows autonomously in the background."

Menulis kode berada di daftar itu, tetapi bukan alasan produknya ada.

OpenClaw Launch, halaman resmi platform deployment-nya sendiri, menempatkan diri sebagai "for anyone who wants a personal AI assistant they can talk to from their phone", dan menempatkan agent coding di lajur lain: "It's in the same lane as Claude Code, Codex CLI, and Aider — a developer tool, not a chat product."

**Kesimpulan:** tesis Rama valid. OpenClaw dan Hermes menjual asisten pribadi yang salah satu keterampilannya kebetulan menulis kode. Caraka menjual satu hal: mengerjakan proyek dari mana saja lewat Telegram.

---

## 2. Angka yang memisahkan keduanya

Skywork mengukur distribusi penggunaan dan hasilnya tajam: **85% pemakaian OpenCode adalah software development**, sementara OpenClaw tersebar ke penggunaan pribadi. Chart yang sama mencatat OpenCode di 150 ribu star dengan 6,5 juta developer aktif bulanan, dan OpenClaw di 68 ribu star pada periode pengukuran itu.

Artinya kedua produk melayani orang yang berbeda, bukan bersaing memperebutkan orang yang sama.

---

## 3. Enam keluhan pengguna OpenClaw yang jadi peluang Caraka

Composio menulis ulasan setelah memakai OpenClaw sejak Januari untuk kebutuhan pribadi maupun profesional. Yang mereka sukai persis fitur yang juga kita bawa: akses jarak jauh dari Telegram, WhatsApp, iMessage. Yang membuat mereka mencari alternatif adalah empat hal berikut.

| Keluhan | Kutipan | Jawaban Caraka |
|---|---|---|
| **Setup menyiksa** | "installation is a nightmare. I remember spending hours to get it right." | `npx caraka init`, target di bawah tiga menit dan enam interaksi |
| **Plugin banyak, rasanya buruk** | "The Skills and Plugin ecosystem is vast, but the experience is horrible." | Tidak ada marketplace. Ekstensi hanya lewat preset YAML dan MCP yang dipasang sadar |
| **Biaya meledak** | "Agentic tasks consume a massive amount of tokens. And if you want to use it like a personal assistant, the cost will skyrocket pretty fast." | Kita tidak punya agent loop. Token dibakar oleh langganan coding agent yang sudah kamu bayar, bukan oleh lapisan tambahan |
| **Keamanan menyusul belakangan** | "The initial releases lacked any security hardening. The internet was filled with heated debates around it." | Allowlist wajib, approval bertanda tangan, scrubber, audit sejak commit pertama |
| **Patch tidak stabil** | "Every patch would make it worse. A fix for one thing would unfix the other." | Inti dibatasi ±8.000 baris, cukup kecil untuk dibaca satu orang dalam sehari. Lebih sedikit bagian bergerak adalah satu-satunya cara membuat patch bisa diprediksi |
| **Batasnya arsitektural** | "Not bugs, since the project ships fast and breaks fast in equal measure. The edges I hit were architectural." (Vellum, Agustus 2026) | Non-goals tertulis adalah pertahanannya. Setiap usulan fitur diuji: apakah coding agent sudah bisa melakukan ini? |

Keluhan biaya layak diperjelas karena inilah pembeda ekonomi yang paling nyata. Ketika OpenClaw menjalankan agent loop-nya sendiri, setiap heartbeat dan setiap giliran adalah token yang keluar dari kantong kamu di luar langganan coding agent. Caraka tidak punya loop, jadi tidak ada token kedua.

---

## 4. Posisi Caraka dalam satu tabel

| | OpenClaw | Hermes | **Caraka** |
|---|---|---|---|
| Kategori | asisten pribadi | framework agent | **jembatan chat ke coding agent** |
| Pekerjaan utama | inbox, kalender, browser, otomasi rumah tangga digital | orkestrasi agent | **mengerjakan repo** |
| Agent runtime | punya sendiri | punya sendiri | **milik kamu** |
| Tool eksekusi | 20+ | ada | **0** |
| Skill / plugin | marketplace besar | ada | **tidak ada** |
| Channel | 22 | via gateway | 1 di v1.0 |
| Menulis kode | salah satu keterampilan | salah satu keterampilan | **satu-satunya alasan produk ini ada** |
| Token di luar agent | ya, loop sendiri | ya | **tidak ada** |
| Waktu setup | dilaporkan berjam-jam | pip + venv | **target < 3 menit** |

---

## 5. Kalimat positioning yang bisa dipakai apa adanya

> OpenClaw adalah asisten pribadi yang juga bisa menulis kode.
> Caraka adalah coding agent kamu, yang sekarang bisa dihubungi.

Dan versi yang lebih panjang untuk halaman perbandingan:

> Kalau yang kamu inginkan adalah asisten yang membereskan inbox, menjaga kalender, dan sesekali menyentuh kode, pakai OpenClaw. Produknya matang di pekerjaan itu dan Caraka tidak akan pernah menyainginya.
> Kalau yang kamu inginkan adalah menyelesaikan pekerjaan di repo dari HP, tanpa memasang asisten baru dan tanpa membayar token dua kali, itu Caraka.

---

## 6. Yang tidak boleh kita klaim

Kejujuran di halaman perbandingan adalah strategi, bukan kesopanan. Tiga hal ini harus dinyatakan terbuka:

1. **OpenClaw lebih matang.** Ratusan ribu star, ribuan commit, komunitas besar. Caraka masih pra-alfa.
2. **OpenClaw mengerjakan hal yang Caraka tidak akan pernah kerjakan.** Kalender, inbox, browser, rumah pintar. Kalau itu yang dibutuhkan, jawabannya bukan Caraka.
3. **Sebagian keluhan yang dikutip di §3 berasal dari rilis awal 2026** dan mungkin sudah diperbaiki. Kutipan diberi tanggal supaya pembaca bisa menilai sendiri.

Artikel pembanding yang menyebut kelebihan lawan dengan jujur lebih dipercaya daripada yang tidak, dan produk ini dimenangkan lewat kepercayaan.
