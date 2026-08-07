# Alur instalasi v0.1

**Tanggal:** 7 Agustus 2026
**Command:** `npx caraka init [--workspace PATH]`

## Kontrak wizard

- Temukan sendiri nilai yang dapat ditemukan: versi runtime, workspace, biner Git, biner Claude, dan status login.
- Token tidak boleh muncul di layar, config YAML, log, chat, atau pesan galat.
- Setiap kegagalan menyebutkan tindakan berikutnya tanpa stack trace.
- Pairing baru ditulis setelah user menekan Start dan mengonfirmasi identitas di terminal.
- Menjalankan ulang `init` mengganti config setelah pairing baru berhasil; kegagalan sebelum itu tidak menulis token baru.

## Urutan

### 1. Pemeriksaan lokal

```text
Node.js 22+  → wajib
Git          → wajib
Claude Code  → wajib
Claude login → wajib
workspace    → direktori absolut
```

Perbaikan yang ditampilkan:

```text
Git tidak ditemukan. Pasang Git, lalu jalankan init lagi.
Claude Code tidak ditemukan. Pasang Claude Code, lalu jalankan init lagi.
Claude Code belum login. Jalankan `claude auth login`, lalu ulangi init.
```

Wizard tidak memasang dependency sistem atau mengubah konfigurasi Claude.

### 2. Token Telegram

Prompt terminal memakai raw mode sehingga karakter tidak dicetak:

```text
Token bot dari @BotFather (tidak ditampilkan):
```

`CARAKA_TELEGRAM_TOKEN` dapat dipakai oleh otomasi terkontrol. Nilainya tetap disimpan ke berkas secret, tidak ke YAML.

Caraka memanggil `getMe`. Token yang ditolak tidak disimpan. Setelah valid, `deleteWebhook` dipanggil dengan `drop_pending_updates=false` karena runtime memakai long-polling.

### 3. Pairing

Wizard membuat kode acak dan menampilkan:

```text
https://t.me/<bot>?start=pair_<kode>
```

Ia menunggu update private chat selama lima menit. Update lain diabaikan. Setelah payload cocok:

```text
Izinkan @user (ID 123…) mengirim tugas? Ketik ya:
```

Hanya jawaban literal `ya` yang menyimpan config. ID Telegram disimpan sebagai string agar tidak kehilangan presisi.

### 4. Penyimpanan

```text
~/.caraka/                         0700
├── config.yaml                    0600
├── caraka.db
└── secrets/                       0700
    ├── telegram.token             0600
    └── approval.key               0600
```

Penulisan config dan secret memakai berkas sementara lalu rename. Approval key dibuat dari 32 byte acak dan tidak diganti bila sudah ada.

### 5. Ringkasan

Wizard menampilkan bot, workspace, mode topic atau linear, model keamanan, dan perintah:

```bash
npx caraka start
```

Token tidak pernah dicetak ulang.

## Doctor

`npx caraka doctor` bersifat read-only. Ia tidak memperbaiki permission, memigrasi config, menghapus webhook, atau memulai Claude. Check jaringan satu-satunya adalah `getMe`.

## Jalur coding agent

Codex atau Claude boleh menjalankan pemeriksaan lokal. Token tidak boleh diminta lewat percakapan. Jalur aman yang berlaku di semua klien adalah:

1. Agent memeriksa prasyarat.
2. User menjalankan `npx caraka init --workspace "$PWD"` di terminal lokal.
3. User memasukkan token dan menyelesaikan pairing.
4. Agent melanjutkan dengan `npx caraka doctor` dan `npx caraka start`.

Prompt siap-tempel berada di [install-with-ai.md](install-with-ai.md).

## Keluar dan shutdown

`SIGINT` atau `SIGTERM` menghentikan polling, membatalkan permission ACP yang tertunda, mengirim cancel untuk sesi aktif, menutup adapter Claude, lalu menutup SQLite. Tidak ada service yang dipasang oleh v0.1.
