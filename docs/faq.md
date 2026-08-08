# FAQ

Pertanyaan yang berulang sebelum orang berani memasang. Jawaban panjangnya ada di dokumen yang ditautkan.

---

## Dasar

**Caraka itu apa?**
Jembatan dari Telegram ke coding agent yang sudah terpasang di komputermu. Kamu kirim tugas dari chat, agent-mu yang mengerjakan, Caraka yang mengantar dan melapor.

**Bedanya dengan OpenClaw dan Hermes?**
Keduanya asisten pribadi yang salah satu keterampilannya menulis kode. Caraka hanya mengerjakan repo. Standard Compute meringkasnya: *"OpenClaw is a personal agent; OpenCode is a coding agent — different tools for different jobs."* Detail di `research/perbandingan-openclaw-hermes-caraka.md`.

**Kenapa namanya Caraka?**
Bahasa Jawa untuk utusan, dan kata pertama aksara Jawa. Legendanya tentang dua utusan yang mati karena instruksi yang bertabrakan tanpa konteks. Itu juga persis mode kegagalan agent otonom berizin. Selengkapnya di `brand.md`.

**Sudah bisa dipakai?**
Belum. Spesifikasinya lengkap dan terbuka, implementasinya baru dimulai. Paket npm saat ini hanya mengunci nama.

---

## Prasyarat dan biaya

**Kalau komputer belum ada Node.js?**
Pasang dulu, versi 22 atau lebih baru. Perintah per sistem operasi ada di `install-guide.md` §3. Tanpa Node, `npx` pun tidak ada.

**Kalau belum punya coding agent sama sekali?**
Pasang salah satu, lalu jalankan `caraka init` lagi. Yang gratis: `npm i -g @google/gemini-cli`, 1.000 permintaan per hari tanpa biaya.

**Caraka berbayar?**
Tidak. MIT, dan tidak pernah meminta kartu. Biaya yang mungkin muncul adalah biaya coding agent kamu, dan itu berlaku sama entah kamu memakai Caraka atau tidak.

**Berapa biaya coding agent-nya?**
Gemini CLI gratis di 1.000 permintaan/hari. Claude Code tidak ada di tier gratis sama sekali, mulai $20/bulan. Codex CLI gratis dengan akses terbatas di ChatGPT Free, berbayar mulai $8/bulan. Angka Agustus 2026, tabel lengkap di `install-guide.md` §5.

**Caraka menambah biaya token?**
Tidak. Kita tidak punya agent loop, jadi tidak ada token kedua. Ini pembeda paling nyata terhadap asisten pribadi yang menjalankan reasoning loop-nya sendiri.

**Perlu API key model?**
Tidak. Caraka tidak pernah meminta, menyimpan, atau mengirim API key model. Itu urusan coding agent kamu.

---

## Cara kerja

**Agent apa saja yang didukung?**
Lewat ACP: 28+ agent termasuk Claude Code, Codex, Gemini CLI, Cursor, Cline, Goose, Amp, Copilot CLI, Devin. Yang tanpa ACP lewat driver CLI. Yang hidup di dalam IDE lewat MCP inbox.

**Bisa pakai lebih dari satu agent?**
Bisa. Semuanya didaftarkan, ganti dengan `/switch <agent>` per workspace.

**Kenapa Telegram lebih dulu?**
Bot API resmi tanpa risiko ban, long-polling sehingga tidak ada port terbuka, dan satu-satunya platform yang mengizinkan bot membuat topic di chat pribadi tanpa hak admin. Itu yang membuat sesi ber-tab mungkin tanpa setup apa pun.

**Channel apa saja yang sudah jalan?**
Telegram dan, sejak v0.5, Discord: satu public thread per sesi di sebuah text channel, glif state di nama thread, dan kartu approval bertombol yang tetap terikat principal pemilik sesi. Sebuah role Discord tidak pernah memberi otoritas approval. Keduanya memakai interface `Channel` yang sama, dan core tidak tahu channel mana yang menjawab. WhatsApp menyusul di Fase 6, Signal setelahnya.

**Isi pesan biasa di Discord tidak sampai ke bot?**
Betul, dan itu disengaja. Caraka tidak meminta intent `MESSAGE_CONTENT` yang punya privilege, dengan alasan yang sama seperti privacy mode Telegram tetap menyala: bot ini tidak perlu membaca percakapan orang untuk mengerjakan tugas. Yang sampai adalah slash command dan tombol pada kartu yang Caraka kirim sendiri. Kalimat itu ditampilkan sekali di channel yang baru dipasangkan, bukan dikubur di sini.

**Kenapa satu sesi jadi satu topic?**
Di terminal kamu buka tab. Chat memaksa lima pekerjaan ke satu aliran. Topic mengembalikan model tab, dan warna ikonnya membuat daftar topic jadi papan status. Detail di `session-model.md`.

**Kalau topic tidak tersedia?**
Mode linear: setiap balasan berprefiks `[workspace · #id]`. Fungsinya sama, tampilannya lebih padat. Tidak ada yang gagal keras.

**Bisa jalan di VPS?**
Bisa, tapi repo kamu harus ada di sana juga. Caraka dirancang untuk mesin tempat kodenya berada. `install-guide.md` §10.

---

## Keamanan

**Agent bisa menghapus kodeku?**
Mode default `assisted`: setiap tulis berkas dan setiap perintah berhenti dan meminta persetujuan lewat tombol. Aksi berisiko tinggi seperti force-push dan `rm -rf` selalu minta konfirmasi, bahkan di mode `trusted`.

**Kalau ada yang mengirim perintah jahat ke bot?**
Allowlist wajib, dan gateway menolak jalan tanpa itu. Pengirim tak dikenal dibalas netral dan permintaannya dicatat. Persetujuan pairing hanya dari terminal.

**Prompt injection bagaimana?**
Persetujuan tidak pernah bisa datang dari teks chat, hanya dari callback bertanda tangan sekali pakai. Teks jahat tidak bisa menyetujui dirinya sendiri. Itu satu aturan yang memutus seluruh kelas serangan ini.

**Rahasiaku bisa bocor ke chat?**
Scrubber keluaran berjalan di setiap pesan dan setiap baris log, menyaring pola `sk-`, `ghp_`, `AKIA`, JWT, blok private key, dan isi `.env`.

**Port terbuka ke internet?**
Tidak. Bind ke `127.0.0.1`, dan Telegram memakai long-polling. Di v1.0 tidak ada webhook sama sekali.

---

## Memori

**Titen itu apa dan wajib?**
Memory agent open source yang memisahkan bukti, kesimpulan, dan konteks. Tidak wajib. Kalau tidak terpasang, Caraka jatuh ke provider `local` yang sengaja dangkal, atau matikan sepenuhnya.

**Memori butuh LLM?**
Tidak. Ekstraksi claim Titen deterministik, tanpa model di dalam loop.

**Bisa lihat apa yang diingat?**
`/memori` untuk daftar, `/lupakan <id>` untuk hapus, dan setiap claim bisa dirunut ke bukti asalnya.

**Kalau memori mati?**
Balasan tetap jalan. `recall` timeout 500 ms lalu lanjut tanpa memori. Memori boleh menurunkan kualitas jawaban, tidak boleh memblokirnya.

---

## Proyek

**Lisensinya?**
Kode MIT. Aset merek tidak: logo dan nama boleh dipakai untuk merujuk proyek ini, tidak untuk menyiratkan dukungan resmi. Fork wajib memakai nama sendiri.

**Bisa ikut berkontribusi?**
Bisa. Yang paling bernilai dan paling ringan: menambah preset agent, satu berkas YAML tanpa kode inti. Lihat `CONTRIBUTING.md`.

**Kenapa tidak ada marketplace plugin?**
Itu keputusan keamanan sekaligus keputusan kompleksitas. Pengguna OpenClaw melaporkan ekosistem plugin yang besar dengan pengalaman yang buruk, dan registry adalah permukaan supply chain. Ekstensi hanya lewat preset YAML dan MCP yang dipasang sadar.

**Bagaimana kalau saya butuh fitur X?**
Diuji dengan satu pertanyaan: apakah coding agent sudah bisa melakukannya? Kalau ya, jawabannya tidak.
