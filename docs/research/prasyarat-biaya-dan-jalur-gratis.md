# Riset: Prasyarat, biaya, dan jalur gratis

**Tanggal riset:** 7 Agustus 2026
**Pertanyaan:** apa yang terjadi kalau komputer pengguna belum punya Node, belum punya coding agent, atau tidak mau berlangganan?
**Sumber:** claude.com/pricing via codeagentswarm.com dan suprmind.ai (diverifikasi Agustus 2026) · felloai.com/claude-code-pricing · inventivehq.com · ssdnodes.com · verdent.ai · codeagentswarm.com/en/guides/codex-plans-and-pricing

> Harga berubah. Setiap angka di bawah diberi tanggal, dan dokumentasi produk harus menautkan ke halaman harga vendor alih-alih menyalin angkanya.

---

## 1. Rantai prasyarat

Caraka berdiri di atas tiga hal yang tidak ia sediakan sendiri.

```
Node.js ≥ 22        →  runtime Caraka
coding agent        →  yang benar-benar mengerjakan kode
akses model         →  langganan atau API key milik agent itu
```

Ketiganya harus ada. Wizard `init` memeriksa satu per satu dan berhenti di titik pertama yang gagal, dengan perintah persis untuk memperbaikinya.

---

## 2. Kalau Node.js belum terpasang

`npx` datang bersama Node, jadi tanpa Node perintah pertama kita pun tidak bisa dijalankan. Ini satu-satunya prasyarat yang harus diselesaikan pengguna sebelum menyentuh Caraka.

| Sistem | Perintah |
|---|---|
| macOS | `brew install node` |
| macOS / Linux tanpa Homebrew | `curl -fsSL https://fnm.vercel.app/install \| bash` lalu `fnm install 22` |
| Ubuntu / Debian | `curl -fsSL https://deb.nodesource.com/setup_22.x \| sudo -E bash - && sudo apt install -y nodejs` |
| Windows | `winget install OpenJS.NodeJS.LTS` (jalankan Caraka di WSL2) |
| Semua | unduh dari nodejs.org |

Versi minimum 22 dipilih karena `fetch` bawaan, test runner bawaan, dan dukungan LTS sampai 2027.

**Konsekuensi untuk `install.sh`:** skrip di `caraka.dev/install.sh` harus mendeteksi ketiadaan Node dan menawarkan memasangnya lewat fnm, bukan gagal dengan `command not found`.

---

## 3. Kalau coding agent belum terpasang

Ini jalan buntu yang paling mungkin ditemui, dan wizard harus menanganinya dengan baik. Caraka tidak punya agent sendiri; tanpa salah satu dari berikut, tidak ada yang bisa dikerjakan.

| Agent | Pasang | Autentikasi |
|---|---|---|
| Claude Code | `npm i -g @anthropic-ai/claude-code` | `claude login` |
| Codex CLI | `npm i -g @openai/codex` | `codex login` |
| Gemini CLI | `npm i -g @google/gemini-cli` | `gemini` lalu login Google |

---

## 4. Biaya: tiga jalur, dan satu di antaranya gratis

### Jalur gratis: Gemini CLI

Gemini CLI memberi **1.000 permintaan per hari tanpa biaya**. Sumber yang mengutipnya menyebutnya alternatif terdekat bila anggaran ketat, dengan catatan jujur bahwa ia tidak menyamai model kelas atas untuk penalaran multi-berkas yang rumit.

Untuk Caraka ini penting: **ada jalur nol rupiah yang benar-benar bekerja.** Dokumentasi harus menyebutnya lebih dulu, bukan menyembunyikannya di bawah tabel harga.

### Claude Code (Agustus 2026)

Fakta yang paling sering salah dipahami: **Claude Code tidak tersedia di tier gratis sama sekali.** Tier gratis Claude hanya memberi chat di web, iOS, Android, dan desktop.

| Paket | Harga |
|---|---|
| Free | tidak termasuk Claude Code |
| Pro | $20/bulan ($17 bila tahunan) |
| Max 5x | $100/bulan |
| Max 20x | $200/bulan |
| Team | mulai $20/seat tahunan |
| API | $2/$10 per juta token (Sonnet 5) sampai 31 Agustus 2026, lalu $3/$15 |

Dua catatan yang berdampak pada pemakaian Caraka:

1. **Satu kolam per akun.** Claude Code, aplikasi web, dan desktop menarik dari jatah yang sama. Sore penuh percakapan panjang langsung mengurangi jatah coding minggu itu.
2. **Anthropic tidak menerbitkan kuota token untuk paket mana pun**, karena laju pemakaian bergantung pada ukuran konteks, model, dan seberapa banyak agent membaca sebelum bertindak.

**Untuk maintainer open source:** program Claude for Open Source memberi **enam bulan Max 20x gratis** bagi yang memenuhi syarat, senilai $1.200.

### Codex CLI (Agustus 2026)

CLI-nya gratis dan open source, dan **ChatGPT Free menyertakan akses Codex terbatas**. Sumbernya jujur soal ukurannya: cukup untuk mencoba, bukan untuk bekerja, dan kamu akan menyentuh batasnya di tugas nyata pertama.

| Paket | Harga |
|---|---|
| Free | Codex terbatas |
| Go | $8/bulan |
| Plus | $20/bulan |
| Pro | $100/bulan (5x) atau $200/bulan (20x) |
| Business | $25/user/bulan |

Perbedaan desain yang layak disebut di dokumentasi: **Codex punya kredit top-up (±$0,04 per kredit) sehingga bisa dilanjutkan setelah jatah habis**, sementara Claude berhenti keras sampai siklusnya berganti. Sumber yang sama juga mencatat bahwa Codex dan Claude menagih dari kolam yang terpisah, dan itu alasan lebih bagus untuk menjalankan keduanya daripada perbandingan benchmark mana pun.

---

## 5. Rekomendasi jalur untuk dokumentasi Caraka

| Situasi pengguna | Rekomendasi |
|---|---|
| Belum punya apa pun, ingin coba gratis | Gemini CLI, 1.000 permintaan/hari |
| Sudah bayar ChatGPT | Codex CLI, sudah termasuk |
| Sudah bayar Claude Pro/Max | Claude Code, sudah termasuk |
| Maintainer open source | ajukan Claude for Open Source, enam bulan Max 20x |
| Ingin tanpa langganan sama sekali | Codex CLI dengan kredit top-up, atau API key bayar-per-token |

**Yang harus dinyatakan terbuka di halaman install:** Caraka sendiri gratis dan tidak pernah meminta kartu. Biaya yang mungkin muncul adalah biaya coding agent kamu, dan itu berlaku sama entah kamu memakai Caraka atau tidak. Kita tidak menambah satu pun token di luar itu.

---

## 6. Yang perlu ada di `caraka.dev/install.sh`

Skrip curl-pipe-bash punya reputasi buruk yang sebagian layak. Supaya bisa dipercaya, skrip ini harus:

1. **Bisa dibaca sebelum dijalankan.** Dokumentasi menampilkan `curl -fsSL https://caraka.dev/install.sh | less` lebih dulu, bukan sebagai catatan kaki.
2. **Idempoten.** Menjalankan ulang aman dan tidak menggandakan apa pun.
3. **Tidak pernah `sudo` diam-diam.** Bila butuh hak akses, ia berhenti dan menjelaskan alasannya.
4. **Mendeteksi Node** dan menawarkan fnm bila belum ada.
5. **Mendeteksi coding agent** dan mencetak perintah pemasangan, tanpa memasang sendiri tanpa izin.
6. **Menyebut versi yang akan dipasang** dan lokasi pemasangannya sebelum menulis apa pun.
7. **Punya `--dry-run`** yang mencetak rencana tanpa mengubah sistem.
8. **Mendukung `CARAKA_VERSION`** untuk memasang versi tertentu, penting untuk lingkungan yang direproduksi.

Alternatif yang harus selalu tersedia berdampingan: `npm i -g caraka`, dan `npx caraka init` untuk memakai tanpa memasang.
