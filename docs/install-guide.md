# Install Guide

**Produk:** Caraka · **Versi:** 1.0 · **Tanggal:** 7 Agustus 2026
**Riset pendukung:** `research/prasyarat-biaya-dan-jalur-gratis.md`
**Lihat juga:** `install-flow.md` untuk desain alur wizard-nya.

Dokumen ini menjawab pertanyaan yang paling sering muncul sebelum orang berani memasang: apa yang harus sudah ada di komputer saya, berapa biayanya, dan apa yang terjadi kalau saya belum punya apa-apa.

---

## 1. Yang Caraka butuhkan, dan yang tidak

Caraka berdiri di atas tiga hal yang tidak ia sediakan sendiri.

```
Node.js ≥ 22      runtime Caraka
coding agent      yang benar-benar mengerjakan kode
akses model       langganan atau API key milik agent itu
```

Caraka sendiri **gratis, MIT, dan tidak pernah meminta kartu.** Biaya yang mungkin muncul adalah biaya coding agent kamu, dan itu berlaku sama entah kamu memakai Caraka atau tidak. Kita tidak menjalankan model apa pun, jadi tidak ada token kedua.

Yang **tidak** dibutuhkan: Docker, database, akun cloud, domain, port terbuka, reverse proxy, sertifikat TLS.

---

## 2. Jalur tercepat

```bash
npx caraka init
```

Tanpa pemasangan global, tanpa clone repo. Wizard memeriksa lingkungan, menemukan agent kamu, membuat bot Telegram, memasangkan akun, lalu menjalankan gateway dan menunggu pesan pertama.

Bila lebih suka memasang permanen:

```bash
npm i -g caraka && caraka init
```

Bila lebih suka skrip:

```bash
# baca dulu sebelum menjalankan
curl -fsSL https://caraka.dev/install.sh | less

# lalu jalankan
curl -fsSL https://caraka.dev/install.sh | bash
```

---

## 3. Kalau komputer belum punya Node.js

`npx` datang bersama Node, jadi tanpa Node perintah pertama pun tidak jalan. Ini satu-satunya hal yang harus diselesaikan sebelum menyentuh Caraka.

Cek dulu:

```bash
node --version    # butuh v22.0.0 atau lebih baru
```

| Sistem | Perintah |
|---|---|
| macOS (Homebrew) | `brew install node` |
| macOS / Linux (fnm) | `curl -fsSL https://fnm.vercel.app/install \| bash` lalu `fnm install 22` |
| Ubuntu / Debian | `curl -fsSL https://deb.nodesource.com/setup_22.x \| sudo -E bash -`<br>`sudo apt install -y nodejs` |
| Fedora | `sudo dnf install nodejs22` |
| Arch | `sudo pacman -S nodejs npm` |
| Windows | `winget install OpenJS.NodeJS.LTS`, lalu jalankan Caraka di dalam WSL2 |
| Apa pun | unduh dari [nodejs.org](https://nodejs.org) |

Kenapa versi 22: `fetch` bawaan, test runner bawaan, dan dukungan LTS sampai 2027.

`install.sh` mendeteksi ketiadaan Node dan menawarkan memasangnya lewat fnm. Ia tidak pernah memasang tanpa menanyakan.

---

## 4. Kalau komputer belum punya coding agent

Ini jalan buntu yang paling mungkin ditemui, dan wizard berhenti di sini dengan jelas:

```
  ✗ Tidak ada coding agent yang ditemukan.

    Caraka memakai coding agent yang sudah kamu pasang.
    Ia tidak punya agent sendiri.

    Gratis        npm i -g @google/gemini-cli
    Berlangganan  npm i -g @anthropic-ai/claude-code
                  npm i -g @openai/codex
```

Pasang salah satu, autentikasi, lalu jalankan `caraka init` lagi.

| Agent | Pasang | Login | Verifikasi |
|---|---|---|---|
| Gemini CLI | `npm i -g @google/gemini-cli` | `gemini` lalu ikuti alur Google | `gemini --version` |
| Claude Code | `npm i -g @anthropic-ai/claude-code` | `claude login` | `claude --version` |
| Codex CLI | `npm i -g @openai/codex` | `codex login` | `codex --version` |

Sudah punya salah satunya? Wizard menemukannya sendiri dari `PATH`, mencocokkan versinya dengan ACP Registry, dan memilih yang mendukung ACP native lebih dulu. Kamu tinggal mengonfirmasi.

Punya lebih dari satu? Semuanya didaftarkan. Ganti kapan saja dengan `/switch <agent>` di chat, atau atur default per workspace di config.

---

## 5. Biaya

### Jalur nol rupiah

**Gemini CLI memberi 1.000 permintaan per hari tanpa biaya.** Itu jauh lebih dari cukup untuk pemakaian harian lewat chat. Catatan jujurnya: ia tidak menyamai model kelas atas untuk penalaran multi-berkas yang rumit.

Kalau kamu hanya ingin membuktikan bahwa Caraka berguna sebelum mengeluarkan uang, mulai dari sini.

### Claude Code

**Claude Code tidak tersedia di tier gratis Claude sama sekali.** Tier gratis hanya memberi chat di web dan aplikasi.

| Paket | Harga (Agustus 2026) |
|---|---|
| Free | tidak termasuk Claude Code |
| Pro | $20/bulan, $17 bila tahunan |
| Max 5x | $100/bulan |
| Max 20x | $200/bulan |
| Team | mulai $20/seat tahunan |
| API | $2/$10 per juta token sampai 31 Agustus 2026, lalu $3/$15 |

Dua hal yang mempengaruhi pemakaian lewat Caraka:

**Satu kolam per akun.** Claude Code, web, dan desktop menarik dari jatah yang sama. Sore penuh percakapan panjang mengurangi jatah coding minggu itu.

**Tidak ada kuota token yang diterbitkan.** Anthropic tidak menerbitkannya karena laju pemakaian bergantung pada ukuran konteks, model yang dipilih, dan seberapa banyak agent membaca sebelum bertindak.

**Maintainer open source:** program Claude for Open Source memberi enam bulan Max 20x gratis bagi yang memenuhi syarat.

### Codex CLI

CLI-nya gratis dan open source, dan ChatGPT Free menyertakan akses Codex terbatas. Ukurannya cukup untuk mencoba, bukan untuk bekerja.

| Paket | Harga (Agustus 2026) |
|---|---|
| Free | Codex terbatas |
| Go | $8/bulan |
| Plus | $20/bulan |
| Pro | $100/bulan (5x) atau $200/bulan (20x) |
| Business | $25/user/bulan |

Codex punya kredit top-up sekitar $0,04 per kredit, jadi bisa dilanjutkan setelah jatah habis. Claude berhenti keras sampai siklusnya berganti.

### Ringkasan pilihan

| Situasi | Pakai |
|---|---|
| Belum punya apa pun, ingin gratis | Gemini CLI |
| Sudah bayar ChatGPT | Codex CLI |
| Sudah bayar Claude Pro atau Max | Claude Code |
| Maintainer open source | ajukan Claude for Open Source |
| Tanpa langganan | Codex dengan kredit, atau API key bayar-per-token |

> Harga berubah. Angka di atas diverifikasi Agustus 2026 dari halaman harga vendor. Untuk keputusan pembelian, cek langsung ke sumbernya.

---

## 6. Anatomi `caraka.dev/install.sh`

Skrip curl-pipe-bash punya reputasi buruk yang sebagian layak. Skrip Caraka memenuhi delapan syarat berikut supaya bisa dipercaya.

| Syarat | Perilaku |
|---|---|
| Bisa dibaca dulu | Dokumentasi menampilkan `\| less` sebelum `\| bash` |
| Idempoten | Menjalankan ulang aman, tidak menggandakan apa pun |
| Tanpa `sudo` diam-diam | Bila butuh hak akses, berhenti dan menjelaskan |
| Deteksi Node | Menawarkan fnm bila belum ada, tidak memasang tanpa izin |
| Deteksi agent | Mencetak perintah pemasangan, tidak memasang sendiri |
| Transparan | Menyebut versi dan lokasi pemasangan sebelum menulis |
| `--dry-run` | Mencetak rencana tanpa mengubah sistem |
| `CARAKA_VERSION` | Memasang versi tertentu untuk lingkungan yang direproduksi |

```bash
CARAKA_VERSION=0.4.0 curl -fsSL https://caraka.dev/install.sh | bash -s -- --dry-run
```

---

## 7. Verifikasi dan perbaikan

```bash
caraka doctor
```

Memeriksa: biner agent dan versinya, kompatibilitas ACP, token bot lewat `getMe`, allowlist terisi, kemampuan topic per container, Titen terjangkau, izin filesystem workspace, versi skema basis data, koneksi long-polling.

Keluarannya read-only, deterministik, dan seluruh rahasia diredaksi. Aman ditempel ke issue.

```bash
caraka doctor --fix
```

Memperbaiki yang bisa diperbaiki otomatis: menyegarkan deteksi kemampuan, membetulkan izin berkas, memilih port bebas, memigrasi skema.

---

## 8. Kegagalan yang sudah direncanakan

Tidak satu pun dari ini berakhir dengan stack trace.

| Gejala | Sebab | Perbaikan |
|---|---|---|
| `command not found: npx` | Node belum ada | §3 |
| `Tidak ada coding agent` | belum terpasang | §4 |
| `token ditolak (401)` | token bot salah salin | salin ulang seluruhnya dari BotFather |
| Bot diam saja | belum tekan Start, atau diblokir | buka bot, tekan Start; cek whitelist @BotFather |
| Topic tidak terbuat | forum mode mati di supergroup | Caraka jatuh ke mode linear dan menjelaskannya sekali |
| `agent belum terautentikasi` | belum login | `claude login` / `codex login` / `gemini` |
| Port terpakai | proses lain | Caraka memilih port bebas berikutnya sendiri |
| Titen gagal dipasang | jaringan atau Bun | jatuh ke provider `local`, tetap jalan |
| Bukan repo git | direktori biasa | diperingatkan, tetap diizinkan |

---

## 9. Menghapus

```bash
caraka uninstall
```

```
  ✔ layanan latar dihapus
  ✔ token dihapus dari keychain
  ? hapus data (sesi, audit, memori lokal)? (y/N)
  ✔ selesai — repo dan konfigurasi coding agent kamu tidak disentuh
```

Mencoba produk ini harus murah dan bisa dibatalkan. Itu bagian dari kepercayaan.

---

## 10. Menjalankan di server

Caraka dirancang untuk mesin tempat kode kamu berada. Menjalankannya di VPS berarti repo kamu juga di sana.

```bash
ssh vps
git clone <repo> ~/dev/toko-api
npm i -g @anthropic-ai/claude-code && claude login
npx caraka init
caraka service install     # systemd
```

Gateway tetap bind ke `127.0.0.1`. Telegram memakai long-polling, jadi tidak ada port yang perlu dibuka dan tidak ada firewall yang perlu disentuh.
