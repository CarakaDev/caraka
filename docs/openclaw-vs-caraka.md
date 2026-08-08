# Kapan pakai OpenClaw, kapan pakai Caraka

**Produk:** Caraka `1.0.0` · **Tanggal:** 8 Agustus 2026 · **English:** [`openclaw-vs-caraka.en.md`](openclaw-vs-caraka.en.md)
**Riset pendukung:** `docs/research/openclaw-arsitektur-openclaw-github-docs.md`, `docs/research/perbandingan-openclaw-hermes-caraka.md`, `docs/research/ringkasan-temuan-dan-rekomendasi.md`
**Untuk siapa:** orang yang sedang memilih di antara keduanya, sebelum memasang salah satunya.

Kalau yang kamu inginkan adalah asisten yang membereskan inbox, menjaga kalender, dan sesekali menyentuh kode, pakai OpenClaw. Produknya matang di pekerjaan itu dan Caraka tidak akan pernah menyainginya. Kalau yang kamu inginkan adalah menyelesaikan pekerjaan di repo dari HP, lewat coding agent yang sudah terpasang di mesinmu, tanpa memasang asisten baru dan tanpa membayar token dua kali, itu Caraka.

Angka OpenClaw di halaman ini berasal dari riset 7 Agustus 2026 di `docs/research/`, lengkap dengan sumber dan tanggalnya di sana. Angka Caraka berasal dari `CHANGELOG.md` dan pohon kode rilis `1.0.0`.

---

## Pekerjaannya berbeda

Standard Compute merangkum kategorinya dalam satu kalimat: *"OpenClaw is a personal agent; OpenCode is a coding agent — different tools for different jobs."* Eigent, membandingkan OpenClaw dengan Claude Code, sampai pada penilaian yang sama: keduanya *"barely overlap"*, dan memilih alat yang salah untuk masalah yang sebenarnya hanya membuang waktu.

OpenClaw adalah personal AI assistant self-hosted dengan lisensi MIT dan runtime Node.js. Ia membawa agent runtime dengan reasoning loop-nya sendiri, tool layer sendiri yang berjalan di host (exec, filesystem, browser, PDF), marketplace ClawHub dengan 56.000+ skill, 22 channel chat, dan companion app untuk iOS, Android, dan macOS. Skywork menggambarkan produknya: *"It doesn't just write code; it clears your inbox, manages your calendar, and executes multi-step workflows autonomously in the background."* Menulis kode ada di daftar itu, tetapi bukan alasan produknya ada.

Caraka mengerjakan satu hal: menyambungkan chat ke coding agent yang sudah terpasang di komputermu. Ia tidak punya reasoning loop, tidak punya tool eksekusi, tidak punya model provider, dan tidak punya marketplace, dan itu disengaja, karena coding agent-mu sudah punya semuanya, lengkap dengan sandbox, konteks repo, dan diff review. Yang ditambahkan Caraka hanyalah yang dibutuhkan chat: identitas, sesi, persetujuan, dan audit.

## Kapan OpenClaw jawabannya

**Kamu ingin asisten yang bekerja sendiri di latar belakang.** Heartbeat OpenClaw memeriksa keadaan secara proaktif, default tiap 30 menit, dan ada cron job, browser automation, serta voice. Itu kemampuan yang memang milik sebuah asisten, dan Caraka menyatakannya sebagai non-goal permanen. Bahkan cron sederhana pun hanya kandidat pasca-1.0 di `docs/roadmap.md`, dan heartbeat berbasis agent ditolak di sana dengan alasan mahal dan berisik.

**Kamu butuh channel yang tidak ada di Caraka.** OpenClaw mendukung 22 channel, di antaranya iMessage, Signal, Slack, dan Microsoft Teams. Caraka `1.0.0` punya tiga: Telegram, Discord, dan WhatsApp. Signal baru kandidat pasca-1.0 dan syarat masuknya adalah 20 permintaan nyata; iMessage tidak ada di daftar mana pun. Merekomendasikan Caraka kepada orang yang butuh iMessage hari ini berarti merekomendasikan sesuatu yang tidak ada.

**Kamu menimbang kedewasaan proyek.** Per Agustus 2026 OpenClaw tercatat sekitar 385 ribu star, 81 ribu fork, dan 76.834 commit, dengan platform deployment resminya sendiri (OpenClaw Launch) dan komunitas yang jauh lebih besar. Caraka ada di `1.0.0`, dan seluruh riwayat rilisnya dari `0.0.0` sampai `1.0.0` muat di dua hari kalender, 7 dan 8 Agustus 2026.

Daftar apa yang belum terbukti di Caraka lebih berguna daripada nomor versinya, dan semuanya tertulis di bagian **Limited** tiap rilis:

- Verifikasi hidup baru menyentuh Claude Code. Tujuh preset agent dikirim, tetapi perintah ACP untuk gemini, cursor, goose, dan amp serta seluruh flag aider disalin dari riset dan ditandai `# belum diverifikasi` di dalam berkasnya. Flag codex disalin apa adanya dari blok yang terdokumentasi dan belum pernah dijalankan di sini.
- Setiap pemeriksaan Discord menjawab `fetch` dan `WebSocket` tiruan, jadi bentuk payload sungguhan dan perilaku 429 sungguhan belum terbukti.
- Tidak ada nomor WhatsApp hidup yang pernah ditautkan ke kode ini, dan tidak ada webhook Cloud API hidup yang pernah diterima.
- Adapter memori Titen sejauh ini hanya menjawab fetch tiruan; rutenya dibaca dari sumber Titen v0.7.0, permukaan pra-1.0 yang bisa bergerak.
- Gerbang beta fase 5 masih terbuka. Dua puluh developer beta belum direkrut, jadi kedua angka Definition of Done-nya belum bisa dijawab oleh siapa pun selain pemakainya.
- Inti sudah melewati plafonnya sendiri: 8.349 baris terhadap ~8.000 yang ditulis di `AGENTS.md`. v1.0 menyentuh batas itu pada 7.880; v1.1 menambah gate policy-mode dan tiga perintah, lalu melewatinya. Satu pass penyederhanaan mengembalikan 73 baris dan berhenti di situ karena pemindaian blok ternormalisasi tidak lagi menemukan pengulangan — sisanya butuh fitur dibuang atau komentar dipangkas, dan keduanya ditolak.

**Kamu butuh WhatsApp di nomor yang penting.** Provider `baileys` Caraka memakai jalur tidak resmi, dan halaman risikonya sendiri (`docs/whatsapp-risiko.md`) ditulis supaya kamu bisa memutuskan tidak memakainya. Uji lapangan 14 hari yang menjadi gerbang fase 6 belum dijalankan. Rekomendasi yang berlaku hari ini adalah `cloud-api`, jalur resmi Meta.

## Kalau coding agent-mu sudah ada di mesin

OpenClaw sebenarnya sudah bisa memakai CLI coding agent sebagai backend model, dan dokumentasinya jujur tentang posisi jalur itu: *"Tools are disabled (no tool calls). Text in → text out… Designed as a safety net rather than a primary path."* Untuk asisten yang membawa tool layer-nya sendiri, penempatan itu masuk akal, karena tool si coding agent memang tidak dibutuhkan di sana.

Bagi Caraka jalur itu justru seluruh produknya. Lewat ACP, protokol JSON-RPC yang dibuat Zed dan di-co-lead JetBrains dengan 28+ agent di registry-nya, coding agent tetap memegang tool, sandbox, dan konteks repo miliknya sendiri, dan permintaan izinnya (`session/request_permission`) dirender menjadi tombol di chat. Sejak `0.4` jalur itu berhenti berbentuk Claude: tujuh preset dikirim sebagai berkas YAML, driver CLI generik menjalankan agent yang belum bicara ACP, dan pemilihan jatuh dari ACP ke CLI ketika adapternya tidak ada di mesin. Satu test memuat preset dari satu berkas YAML dan membuktikan satu giliran penuh sampai ke chat tanpa `src/core/` disentuh.

Yang tidak ikut turun ke jalur CLI adalah hook izinnya. ACP mengirim `session/request_permission` dan Caraka merendernya menjadi kartu; driver CLI tidak punya padanan, jadi di jalur itu satu-satunya rem adalah rem milik agent sendiri. Preset codex karena itu mempertahankan `--sandbox read-only` sebagai kontrol keamanan, dan `--yes-always` dibuang dari preset aider, karena auto-setuju tanpa sandbox berarti eksekusi tanpa persetujuan siapa pun.

Dari sembilan lapisan besar OpenClaw, riset yang mendasari Caraka menemukan hanya tiga yang dibutuhkan untuk use case ini: gateway dan sesi, adapter channel, dan driver ke agent. Enam sisanya sudah disediakan coding agent yang kamu pakai setiap hari.

Perbedaan itu terasa di tagihan. Loop milik OpenClaw membakar token di luar langganan coding agent-mu, dan tiap heartbeat adalah satu giliran agent penuh. Composio, yang memakai OpenClaw sejak Januari 2026, menulis: *"Agentic tasks consume a massive amount of tokens. And if you want to use it like a personal assistant, the cost will skyrocket pretty fast."* Keluhan itu berasal dari rilis awal 2026 dan mungkin sudah membaik; tanggalnya disebut supaya kamu menilai sendiri. Caraka tidak punya loop, jadi token hanya terbakar di langganan yang memang sudah kamu bayar.

Soal bobot mesin, angka Caraka adalah sasaran yang dinyatakan di `docs/prd.md`: paket < 15 MB, RAM idle < 80 MB, cold start < 2 detik, inti ≤ 8.000 baris. Butir pengukuran RAM dan cold start di Fase 0 roadmap belum dicentang, jadi tiga angka pertama belum berhak disebut hasil. Yang sudah terukur hanya yang terakhir, dan angkanya 7.996.

## Persetujuan dan permukaan serangan

README OpenClaw sendiri yang paling jelas soal ini: *"Treat inbound messages as untrusted input"*, dan *"Tools run on the host for the main session unless you configure sandboxing."* Pairing untuk pengirim tak dikenal disetujui lewat CLI, dan pengguna diwajibkan membaca security guide, exposure runbook, dan sandboxing guide sebelum membuka Gateway. Paper penetration test terhadapnya (arXiv 2605.27042) mencatat deployment tipikal mengaktifkan shell execution, akses filesystem, dan network I/O keluar secara default. Itu konsekuensi wajar dari asisten yang memiliki tool-nya sendiri: mengamankannya adalah pekerjaan konfigurasi pemiliknya, dan guide resminya memberi resep yang benar, termasuk allowlist pengirim, nomor WhatsApp terpisah, dan heartbeat dimatikan sampai percaya.

Caraka mengambil posisi struktural yang berbeda. Ia tidak menambah permukaan eksekusi, karena semua eksekusi terjadi di dalam coding agent yang sudah punya sandbox dan permission model sendiri. Yang ia jaga adalah tiga gerbang: siapa yang boleh bicara, apa yang boleh dijalankan, apa yang boleh keluar.

Allowlist wajib, dan gateway menolak start ketika sebuah channel yang dikonfigurasi punya allowlist kosong, sambil menyebut channel yang mana. Di jalur ACP persetujuan hanya lewat callback bertanda tangan, sekali pakai, terikat ke principal dan sesi, kedaluwarsa sepuluh menit.

Sejak `0.6` ada bentuk kedua, karena WhatsApp tidak punya tombol. Kartu approval membawa kode empat karakter yang dibuat dari `randomBytes` di sisi server, tercetak di kartu itu dan tidak di tempat lain, tidak pernah masuk ke konteks agent maupun ke baris audit, dan dibelanjakan lewat `UPDATE … WHERE decision IS NULL` yang sama dengan jalur tombol. Yang ditolak adalah katanya: `yes` diperlakukan sebagai tugas, bukan keputusan, dan pesan berbentuk kode tidak pernah diteruskan ke agent entah cocok atau tidak. Aturan keras di `AGENTS.md` diamendemen bersama perubahan itu, dari "persetujuan tidak pernah datang sebagai teks" menjadi "persetujuan tidak pernah datang sebagai teks yang tidak terautentikasi", yang memang yang dijaga sejak awal. Channel yang punya tombol tidak diberi kode sama sekali.

Jendela trust dari chat maksimum enam puluh menit dan tertutup oleh `/lock`, kedaluwarsa, atau restart. `bypassPermissions` milik Claude hanya bisa dinyalakan dari terminal. Setiap pesan keluar melewati scrubber rahasia, dan tabel auditnya menolak update dan delete.

Soal port, klaim yang bisa diperiksa lebih sempit daripada "tidak ada port terbuka": **Caraka tidak membuka apa pun ke internet atas inisiatifnya sendiri.** Telegram ditarik lewat long-polling dan Discord memegang koneksi WebSocket keluar, jadi keduanya tidak butuh port masuk. Dua listener memang ada sejak `0.5` dan `0.6`, yaitu dasbor read-only dan penerima webhook WhatsApp Cloud API. Keduanya bind ke `127.0.0.1` kecuali operator memberi alamat lain, yang mencetak peringatan dan menulis baris audit sebelum koneksi pertama diterima. Webhook menuntut `X-Hub-Signature-256` dengan perbandingan waktu-tetap, berlaku juga di loopback, karena proses lain di mesin yang sama juga bisa mengetuk. Provider `baileys` tidak membuka listener sama sekali.

Batasnya tertulis di `docs/security.md` §12 dan tidak dihaluskan di sini. Caraka tidak bisa mencegah prompt injection sepenuhnya; yang ia pastikan hanyalah bahwa konsekuensinya membutuhkan ketukan manusia. Selama jendela `--bypass` terbuka ia tidak melihat satu pun keputusan izin, jadi yang diaudit hanyalah jendelanya. Dasbor lokal sengaja tidak berautentikasi, sehingga selama ia hidup, siapa pun di mesin itu yang bisa mencapai `127.0.0.1` bisa membacanya, termasuk pengguna lokal yang tidak punya izin baca atas berkas databasenya. Dan Caraka tidak bisa mencegah WhatsApp memblokir nomormu bila kamu memakai provider tidak resmi.

## Satu tabel

| | OpenClaw | Caraka `1.0.0` |
|---|---|---|
| Kategori | asisten pribadi self-hosted | jembatan chat ke coding agent terpasang |
| Agent runtime | reasoning loop sendiri | milik coding agent-mu |
| Tool eksekusi | exec, filesystem, browser, PDF, di host by default | tidak ada |
| Skill / plugin | ClawHub, 56.000+ skill | tanpa marketplace |
| Channel hari ini | 22 | 3 (Telegram, Discord, WhatsApp) |
| Jalur coding-agent CLI | fallback text-only; `openclaw acp` ada | jalur utama: ACP, jatuh ke driver CLI generik |
| Hook izin | model izin dan sandbox-nya sendiri | ada di jalur ACP; jalur CLI bersandar pada rem agent |
| Agent yang dikirim | ClawHub + registry | 7 preset YAML, satu tervalidasi hidup (Claude Code) |
| Token di luar coding agent | ada: loop sendiri + heartbeat | tidak ada loop |
| Status per Agustus 2026 | ±385 rb star, 76.834 commit | `1.0.0`, riwayat rilis dua hari |

## Pakai keduanya

Dua produk ini sama-sama self-hosted, sama-sama dirancang untuk satu operator, dan menurut sumber industrinya sendiri nyaris tidak bersinggungan. Kebutuhanmu boleh jadi mencakup keduanya: asisten untuk inbox dan kalender, dan kendali jarak jauh untuk coding agent yang mengerjakan repomu. *Different tools for different jobs* berlaku dua arah, dan kalimat itu sama sekali tidak mengharuskanmu memilih satu.

Kalau masih ragu, lihat pekerjaan yang ingin kamu serahkan minggu ini. Kalau isinya inbox, kalender, dan otomasi latar belakang, pasang OpenClaw. Kalau isinya repo, dan coding agent-mu sudah login di terminal, pasang Caraka.
