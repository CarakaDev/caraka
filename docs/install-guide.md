# Panduan instalasi Caraka

**Tanggal:** 7 Agustus 2026 · **English:** [`install-guide.en.md`](install-guide.en.md)
**Lingkup panduan ini:** Telegram pribadi → Claude Code, satu operator, satu workspace. Discord, WhatsApp, enam preset lainnya, dan `workspaces[]` sama-sama terkirim di v1.0, tetapi semuanya ditulis tangan ke `config.yaml`; wizard `init` hanya memasang jalur di atas.

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

## Jalur tercepat: suruh coding agent yang memasangnya

Kalau ada coding agent yang berjalan di komputer tempat repository berada,
tempel prompt ini ke sana. Ia memeriksa prasyarat, memasang yang kurang, lalu
menyerahkan bagian token kembali kepadamu.

```text
Pasang Caraka untuk repository di working directory saya saat ini.

Baca https://github.com/CarakaDev/caraka lebih dulu. Verifikasi Node.js 22 atau
lebih baru, Git, dan bahwa kamu sendiri sudah terpasang dan sudah login.
Perbaiki hanya prasyarat yang kurang tanpa mengubah repository saya.

Jangan pernah meminta saya menempel, membuka, atau mengulang token bot Telegram
lewat chat, output command, log, atau berkas yang akan di-commit. Minta saya
membuat bot lewat @BotFather, lalu berikan perintah ini untuk saya jalankan
sendiri di terminal lokal:

  npx caraka init --workspace "$PWD"

Setelah saya mengonfirmasi init selesai, jalankan `npx caraka doctor`, jelaskan
check yang gagal, lalu mulai dengan `npx caraka start`. Jangan mengaktifkan
webhook, membuka port, memasang service, atau mengubah konfigurasi model atau
provider milikmu sendiri.
```

**Token tetap diketik di terminalmu sendiri dan tidak pernah masuk ke percakapan
agent.** Wizard menyembunyikan input dan menulis token langsung ke
`~/.caraka/secrets/telegram.token`. Transkrip chat, tool log, dan histori terminal
bisa disimpan oleh klien coding agent, jadi memindahkan token lewat chat
menghilangkan perlindungan itu. Prompt di atas melarangnya secara eksplisit.

Versi Inggris prompt ini beserta alasan lengkapnya ada di
[prompt instalasi untuk coding agent](install-with-ai.md).

## Jalur manual

Semua yang dilakukan prompt di atas bisa dijalankan sendiri. Masuk ke repository
yang ingin dikerjakan Claude, lalu jalankan:

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

Biarkan proses hidup di terminal. Caraka memakai long-polling dan tidak membuka listener jaringan. Hentikan dengan `Ctrl-C`, atau dari terminal lain:

```bash
npx caraka status
npx caraka stop
```

`start` menulis PID-nya ke `~/.caraka/caraka.pid` dengan mode `0600` dan menghapusnya saat berhenti. Menjalankan `start` kedua kali saat yang pertama masih hidup berhenti dengan exit code `78` tanpa memulai poller kedua.

Di Telegram:

```text
/new [judul] mulai sesi baru, judul opsional
/status      lihat keadaan sesi
/stop        batalkan tugas aktif
/commands    daftar perintah yang dilaporkan Claude
/usage       pemakaian terakhir yang dilaporkan Claude
/yolo 30m    tawarkan jendela trust berdurasi
/lock        tutup jendela trust seketika
/help        tampilkan bantuan
```

Pesan selain command diteruskan ke Claude apa adanya. Jika topic mode bot aktif di BotFather, sesi baru mendapat topic. Kegagalan membuat topic tidak menghentikan gateway; balasan memakai header `[workspace · #id]`.

## Approval

Saat adapter ACP meminta izin tool, Caraka menampilkan tombol **Setujui sekali** dan **Tolak**. Callback berisi ID acak dan HMAC, terikat ke operator serta sesi, berlaku sepuluh menit, lalu tidak dapat dipakai ulang.

Caraka tidak menerima kata seperti `ya`, `allow`, atau `setuju` sebagai approval. Pesan seperti itu tetap diperlakukan sebagai prompt biasa.

`/yolo <durasi>` menawarkan jendela di mana aksi biasa berjalan tanpa kartu. Perintah itu sendiri tidak mengubah apa pun; yang membukanya adalah tombol konfirmasinya, dan tombol itu diverifikasi seperti approval lain. Selama jendela terbuka, aksi berisiko tinggi tetap memunculkan kartu, setiap aksi tetap masuk audit, dan `/lock` menutupnya seketika. Jendela tertutup sendiri saat kedaluwarsa dan saat gateway mulai ulang.

Mode `bypassPermissions` milik Claude adalah hal yang berbeda dan hanya bisa dinyalakan dari terminal:

```bash
npx caraka trust /path/ke/repository --bypass --for 30m
```

Selama jendela itu terbuka Claude berhenti meminta izin kepada Caraka, jadi Caraka tidak melihat satu pun keputusan dan tidak bisa mengauditnya. Yang tercatat hanya jendelanya. Tanpa `--bypass`, perintah yang sama membuka jendela trust Caraka, yang tetap melihat setiap permintaan.

## Instalasi global

Pilih ini bila tidak ingin menulis `npx` setiap kali:

```bash
npm install --global caraka
caraka init
caraka doctor
caraka start
```

Kedua jalur memakai config yang sama di `~/.caraka`.

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
| Topic tidak muncul di percakapan pribadi | aktifkan topic mode bot di BotFather; setelan itu tidak berlaku untuk grup |
| Topic tidak muncul di grup | pastikan grupnya forum dan Caraka punya hak kelola topic di sana; `telegram.topics` di config harus `true` |
| Claude gagal melanjutkan sesi lama | Caraka otomatis membuat sesi ACP pengganti |

Lihat [troubleshooting.md](troubleshooting.md) untuk diagnosis lain.

## Hapus

Hentikan gateway. Jika memasang global:

```bash
npm uninstall --global caraka
```

Pemakaian lewat `npx` tidak membuat instalasi global. Config dan audit sengaja tidak dihapus otomatis. Setelah memastikan data itu tidak dibutuhkan, hapus direktori `~/.caraka` sendiri. Repository dan konfigurasi Claude tidak pernah disentuh oleh penghapusan paket.

## Batas rilis ini

Belum tersedia: banyak operator, lampiran, dan inbox MCP. Yang terkirim tetapi belum pernah diverifikasi hidup: Discord, WhatsApp, dan enam preset selain Claude Code — setiap pemeriksaan pada ketiganya dijawab transport palsu atau berkas preset yang belum pernah dijalankan di sini. Memori hadir sejak v0.3: provider `local` bekerja tanpa apa pun, Titen ditawarkan saat `init`. Batas itu dicatat agar instalasi tidak menjanjikan fitur roadmap sebagai fitur yang sudah tersedia.

**Service latar.** Rilis ini tidak memasang service, dan Caraka tidak akan pernah memasangnya sendiri. Paket tidak punya hook `postinstall` dan keluaran Caraka tidak pernah memuat kata `sudo`. Yang ada adalah `caraka service --print systemd|launchd|schtasks`, yang **mencetak** unit ke stdout untuk kamu pasang sendiri, lalu mencetak langkah manualnya.

Template launchd dan schtasks dikirim dengan status **belum diuji**; keduanya tidak dapat dijalankan di mesin pengembang. Di macOS, jawaban jujurnya adalah mulai saat login, bukan saat boot: agent per-user di `~/Library/LaunchAgents` dimuat saat user login dan berhenti saat logout. `loginctl enable-linger` di Linux adalah langkah opt-in terpisah, karena di situlah profil risikonya berubah.

**Kalau kamu memasukkan grup Telegram ke allowlist.** Satu hal tidak bisa direkayasa hilang, jadi ia dinyatakan di sini dan diulang saat pairing:

> Memasukkan grup ke allowlist berarti memilih untuk memperlihatkan pekerjaan itu kepada anggotanya: kartu approval, path berkas, diff, dan keluaran perintah akan terbaca setiap anggota grup.

Yang tetap tertutup adalah persetujuannya. Tombol approval hanya sah dari akun yang ada di allowlist, jadi anggota grup lain bisa membaca kartunya tanpa bisa memutuskannya. Kalau sesuatu terlalu sensitif untuk dilihat anggota grup, tempatnya bukan di grup.
