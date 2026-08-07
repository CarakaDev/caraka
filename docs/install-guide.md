# Panduan instalasi Caraka v0.1

**Tanggal:** 7 Agustus 2026
**Lingkup rilis:** Telegram pribadi → Claude Code, satu operator, satu workspace

## Prasyarat

Caraka memakai software yang sudah ada di komputermu:

| Kebutuhan | Cek | Perbaikan |
|---|---|---|
| Node.js 22+ | `node --version` | pasang Node LTS dari [nodejs.org](https://nodejs.org) |
| Git | `git --version` | pasang Git untuk sistem operasimu |
| Claude Code | `claude --version` | `npm install --global @anthropic-ai/claude-code` |
| Login Claude | `claude auth status` | `claude auth login` |
| Bot Telegram | token dari BotFather | buka [@BotFather](https://t.me/BotFather), lalu jalankan `/newbot` |

Docker, akun cloud, domain, webhook, dan port terbuka tidak dibutuhkan.

## Jalur utama

Masuk ke repository yang ingin dikerjakan Claude, lalu jalankan:

```bash
cd /path/ke/repository
npx caraka init
```

Workspace lain dapat disebutkan secara eksplisit:

```bash
npx caraka init --workspace /path/ke/repository
```

Wizard melakukan urutan berikut:

1. Memeriksa Node.js, Git, Claude Code, status login, dan direktori workspace.
2. Meminta token BotFather tanpa menampilkannya di terminal.
3. Memvalidasi token dengan `getMe` dan mematikan webhook lama agar long-polling dapat dipakai.
4. Menampilkan deep link pairing satu kali. Tekan **Start** di Telegram.
5. Meminta konfirmasi identitas Telegram di terminal sebelum menulis allowlist.

Token baru ditulis setelah pairing disetujui. Lokasinya:

```text
~/.caraka/config.yaml
~/.caraka/secrets/telegram.token
~/.caraka/secrets/approval.key
~/.caraka/caraka.db
```

Direktori rahasia memakai mode `0700`; config, token, dan key memakai `0600`. Token tidak berada di `config.yaml`.

## Verifikasi

```bash
npx caraka doctor
```

`doctor` hanya membaca state. Ia memeriksa versi Node, Git, Claude Code, login Claude, config, workspace, mode berkas rahasia, allowlist, dan token lewat Telegram. Keluaran tidak memuat token atau data akun Claude.

Check yang gagal menyebutkan tindakan berikutnya. `doctor` keluar dengan kode `1` bila ada masalah.

## Jalankan gateway

```bash
npx caraka start
```

Biarkan proses hidup di terminal. Caraka memakai long-polling dan tidak membuka listener jaringan. Hentikan dengan `Ctrl-C`; proses akan membatalkan approval tertunda, menutup ACP, lalu menutup SQLite.

Di Telegram:

```text
/new      mulai sesi baru
/status   lihat keadaan sesi
/stop     batalkan tugas aktif
/help     tampilkan bantuan
```

Pesan selain command diteruskan ke Claude apa adanya. Jika topic mode bot aktif di BotFather, sesi baru mendapat topic. Kegagalan membuat topic tidak menghentikan gateway; balasan memakai header `[workspace · #id]`.

## Approval

Saat adapter ACP meminta izin tool, Caraka menampilkan tombol **Setujui sekali** dan **Tolak**. Callback berisi ID acak dan HMAC, terikat ke operator serta sesi, berlaku sepuluh menit, lalu tidak dapat dipakai ulang.

Caraka tidak menerima kata seperti `ya`, `allow`, atau `setuju` sebagai approval. Pesan seperti itu tetap diperlakukan sebagai prompt biasa.

## Instalasi global

Pilih ini bila tidak ingin menulis `npx` setiap kali:

```bash
npm install --global caraka
caraka init
caraka doctor
caraka start
```

Kedua jalur memakai config yang sama di `~/.caraka`.

## Minta bantuan Codex atau Claude

Buka [prompt instalasi untuk coding agent](install-with-ai.md), lalu tempel prompt tersebut ke Codex atau Claude. Prompt sengaja melarang agent meminta token lewat chat.

Coding agent dapat memeriksa prasyarat, memasang paket, menjalankan `doctor`, dan memulai gateway. Bagian token tetap dilakukan di terminal lokal. Jika klien agent mendukung terminal interaktif yang dapat diambil alih user, wizard boleh dijalankan di sana.

## Masalah umum

| Gejala | Tindakan |
|---|---|
| `npx: command not found` | pasang Node.js 22 atau lebih baru |
| Claude tidak ditemukan | pasang Claude Code dan buka terminal baru |
| Claude belum login | jalankan `claude auth login` |
| Token ditolak | buat atau salin ulang token lengkap dari BotFather |
| Pairing habis waktu | jalankan `npx caraka init` lagi, lalu tekan Start dalam lima menit |
| Bot diam | pastikan `npx caraka start` masih hidup dan `doctor` hijau |
| Telegram melaporkan conflict | hentikan proses bot lain yang memakai token yang sama |
| Topic tidak muncul | aktifkan topic mode di BotFather atau gunakan mode linear |
| Claude gagal melanjutkan sesi lama | Caraka otomatis membuat sesi ACP pengganti |

Lihat [troubleshooting.md](troubleshooting.md) untuk diagnosis lain.

## Hapus

Hentikan gateway. Jika memasang global:

```bash
npm uninstall --global caraka
```

Pemakaian lewat `npx` tidak membuat instalasi global. Config dan audit sengaja tidak dihapus otomatis. Setelah memastikan data itu tidak dibutuhkan, hapus direktori `~/.caraka` sendiri. Repository dan konfigurasi Claude tidak pernah disentuh oleh penghapusan paket.

## Batas v0.1

Rilis ini belum menyediakan service latar, grup Telegram, banyak operator, banyak workspace, lampiran, memori, atau agent selain Claude Code. Batas itu dicatat agar instalasi tidak menjanjikan fitur roadmap sebagai fitur yang sudah tersedia.
