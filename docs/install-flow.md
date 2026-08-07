# Install Flow

**Produk:** Caraka · **Versi:** 0.1 · **Tanggal:** 7 Agustus 2026
**Target:** dari nol sampai pesan pertama yang berhasil dalam **< 3 menit**, tanpa membaca dokumentasi.

---

## 1. Prinsip

1. **Deteksi, jangan tanya.** Setiap hal yang bisa ditemukan sendiri, ditemukan sendiri. User hanya mengonfirmasi.
2. **Satu perintah.** Tanpa Docker, tanpa clone repo, tanpa file config yang harus ditulis tangan.
3. **Verifikasi di setiap langkah.** Jangan pernah membiarkan user sampai ke akhir baru tahu ada yang salah.
4. **Aman secara default, tanpa pertanyaan keamanan.** Default sudah benar; user hanya diminta menyetujui, bukan memilih.
5. **Gagal dengan perbaikan.** Setiap kegagalan menyebutkan langkah persisnya, bukan pesan error mentah.
6. **Bisa diulang.** Menjalankan ulang `init` tidak merusak apa pun.

---

## 2. Jalur utama

```bash
npx caraka init
```

Satu perintah. Tanpa install global, tanpa sudo.

### Langkah 1 — Deteksi lingkungan (otomatis, ±2 detik)

```
  Caraka

  Memeriksa lingkungan…
    ✔ Node.js 22.14
    ✔ claude 2.4.1              agent · ACP ✓
    ○ codex                     tidak ditemukan
    ✔ git                       repo terdeteksi di direktori ini
    ○ titen                     memory · belum terpasang
```

Deteksi agent: pindai `PATH` untuk biner yang dikenal, lalu cocokkan dengan **ACP Registry JSON** untuk versi & kemampuan. Bila lebih dari satu ditemukan, agent dengan dukungan ACP native diprioritaskan.

**Kalau tidak ada agent sama sekali** → satu-satunya jalan buntu yang mungkin, dan harus ditangani dengan baik:

```
  ✗ Tidak ada coding agent yang ditemukan.

    Caraka memakai coding agent yang sudah kamu pasang —
    ia tidak punya agent sendiri.

    Pasang salah satu, lalu jalankan lagi:
      Claude Code   npm i -g @anthropic-ai/claude-code
      Codex CLI     npm i -g @openai/codex
      Gemini CLI    npm i -g @google/gemini-cli
```

### Langkah 2 — Workspace (1 pertanyaan)

```
  Workspace
    Terdeteksi repo git: ~/dev/toko-api
    Pakai ini? (Y/n) › Y
    Nama pendek › toko-api          ⏎ untuk menerima
```

Nama pendek diusulkan dari nama folder. Tambah workspace lain bisa nanti (`caraka ws add`) — jangan bebani setup pertama.

### Langkah 3 — Bot Telegram (bagian paling rawan, dibuat semulus mungkin)

```
  Telegram
    Sudah punya bot? (y/N) › N

    Buka tautan ini — BotFather akan terbuka dengan perintah siap kirim:
      https://t.me/BotFather?start=  ·  lalu ketik /newbot

    Tempel token di sini › ████████████████████████
      ✔ token valid — @toko_caraka_bot
```

Yang membuat ini mulus:
- Tautan `t.me` dibuka langsung dari terminal (klik/`open`), bukan instruksi "cari BotFather di Telegram".
- Token divalidasi **saat itu juga** via `getMe`; salah tempel ketahuan dalam satu detik.
- Nama bot yang disarankan diturunkan dari nama workspace.
- Token langsung masuk keychain OS; tidak pernah ditulis ke `config.yaml`.

### Langkah 4 — Pairing (tanpa mengetik apa pun)

```
  Siapa yang boleh memakai bot ini?

    Buka bot kamu dan tekan Start:
      https://t.me/toko_caraka_bot?start=pair_7Q2F

    ▸ menunggu…
      ✔ @rio (id 88123…)  — izinkan? (Y/n) › Y
```

Deep link `?start=pair_<kode>` membawa kode pairing otomatis — user cukup menekan **Start**. Tidak ada chat id yang harus dicari, tidak ada nomor yang harus disalin.

Setelah disetujui, wizard menawarkan lapisan kedua:

```
    Disarankan: kunci bot ini agar hanya kamu yang bisa mengirim pesan,
    langsung di Telegram (@BotFather → Bot Settings → Access whitelist).
    Buka sekarang? (Y/n)
```

### Langkah 5 — Memory (opsional, satu tombol)

```
  Memory — agar agent ingat keputusan proyek lintas sesi

    › Titen (disarankan)   open-source, lokal, tanpa LLM
      Lewati                bisa dinyalakan kapan saja

    Memasang Titen…
      $ curl -fsSL https://titen.dev/install.sh | bash
      ✔ titen 0.7.0
      $ titen bootstrap --org 'toko-api' && titen serve
      ✔ berjalan di http://127.0.0.1:7717
```

Bila gagal atau dilewati → provider `local` (SQLite + FTS5) dipakai diam-diam. **Tidak pernah menghalangi.**

### Langkah 6 — Selesai

```
  ✅ Siap.

     Bot        @toko_caraka_bot
     Workspace  toko-api  (~/dev/toko-api)
     Agent      claude · ACP
     Memory     titen (lokal)
     Mode       assisted — tulis & jalankan perlu persetujuan

     Buka Telegram dan kirim:
       "apa saja yang ada di src?"

     ▸ gateway berjalan · Ctrl-C untuk berhenti
```

Wizard **langsung menjalankan gateway** dan menunggu pesan pertama. Saat pesan pertama masuk, terminal menampilkannya — bukti hidup bahwa semuanya bekerja:

```
     ← @rio: apa saja yang ada di src?
     → sesi #a91 dibuat · topic "▸ toko-api · isi src"
     ✔ terkirim (2,4 dtk)

     Berhasil. Jalankan sebagai layanan latar? (Y/n) › Y
       ✔ terpasang (launchd) — otomatis jalan saat login
```

---

## 3. Anggaran waktu

| Langkah | Target | Interaksi user |
|---|---|---|
| Deteksi | 2 dtk | — |
| Workspace | 10 dtk | 2 × ⏎ |
| Bot Telegram | 60 dtk | buka tautan, tempel token |
| Pairing | 15 dtk | tekan Start, 1 × ⏎ |
| Memory | 30 dtk | 1 pilihan |
| Pesan pertama | 20 dtk | ketik 1 pesan |
| **Total** | **≈ 2,5 menit** | **6 interaksi** |

---

## 4. Menjalankan ulang & perbaikan

```bash
caraka init          # aman diulang; mendeteksi yang sudah ada
caraka doctor        # diagnosis lengkap, read-only, rahasia teredaksi
caraka doctor --fix  # perbaiki yang bisa diperbaiki otomatis
```

`doctor` memeriksa: biner agent + versi + kompatibilitas ACP · token bot valid (`getMe`) · allowlist terisi · kemampuan topic di setiap container · Titen dapat dijangkau · izin filesystem workspace · versi skema DB · konektivitas long-polling.

Keluarannya dirancang untuk **ditempel ke issue** — deterministik, tanpa warna saat di-pipe, dan seluruh rahasia diredaksi.

---

## 5. Jalur alternatif (didokumentasikan, bukan default)

| Jalur | Perintah | Kapan |
|---|---|---|
| Install global | `npm i -g caraka && caraka init` | pemakaian rutin |
| Non-interaktif | `caraka init --config ./na.yaml --yes` | otomasi / dotfiles |
| Docker | `docker run -v ~/dev:/work caraka` | server terpisah |
| Managed Bots (one-tap) | `caraka init --managed-bot` | hanya bila user menjalankan manager bot sendiri — **token melewati manager**, dan wizard menyatakan ini secara eksplisit |

---

## 6. Kegagalan yang direncanakan

| Kegagalan | Pesan & perbaikan |
|---|---|
| Tidak ada agent | daftar perintah install, keluar dengan kode 1 |
| Token bot salah | "token ditolak Telegram (401) — pastikan menyalin seluruhnya dari BotFather" |
| Bot tidak menerima pesan | "cek: sudah tekan Start? bot tidak diblokir? whitelist @BotFather tidak menutup akun kamu?" |
| Topic gagal dibuat | jalankan mode linear, jelaskan sekali, jangan gagal |
| Titen gagal dipasang | jatuh ke provider `local`, catat, lanjutkan |
| Port terpakai | pilih port bebas berikutnya secara otomatis |
| Agent tidak terautentikasi | tampilkan perintah login persis milik agent tersebut (mis. `claude login`) |
| Workspace bukan repo git | peringatkan (agent bekerja lebih baik dengan git) tetapi izinkan |

**Aturan:** tidak satu pun kegagalan di atas boleh berakhir dengan stack trace.

---

## 7. Uninstall

```bash
caraka uninstall
  ✔ layanan latar dihapus
  ✔ token dihapus dari keychain
  ? hapus data (sesi, audit, memori lokal)? (y/N)
  ✔ selesai — repo dan konfigurasi coding agent kamu tidak disentuh
```

Uninstall yang bersih dan jujur adalah bagian dari kepercayaan: user harus yakin bahwa mencoba produk ini murah dan reversibel.
