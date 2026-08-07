# Troubleshooting

Gejala, sebab, perbaikan. Untuk pemasangan awal lihat `install-guide.md`.

Langkah pertama selalu sama:

```bash
caraka doctor
```

Keluarannya read-only, deterministik, dan seluruh rahasia diredaksi. Aman ditempel ke issue.

---

## Pemasangan

**`command not found: npx`**
Node.js belum terpasang. `install-guide.md` §3.

**`Unsupported engine` saat `npx caraka`**
Node terlalu lama. Butuh 22 atau lebih baru. Cek `node --version`.

**`EACCES` saat `npm i -g`**
npm memasang ke direktori sistem. Jangan pakai `sudo`. Pindahkan prefix npm ke home:
```bash
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

**Skrip install berhenti tanpa pesan**
Jalankan dengan `--dry-run` untuk melihat rencananya, atau baca dulu: `curl -fsSL https://caraka.dev/install.sh | less`.

---

## Coding agent

**`Tidak ada coding agent yang ditemukan`**
Belum terpasang, atau tidak ada di `PATH`. Pasang salah satu (`install-guide.md` §4), lalu `caraka doctor` untuk memastikan terdeteksi.

**Agent terdeteksi tapi setiap run gagal seketika**
Belum terautentikasi. Jalankan `claude login`, `codex login`, atau `gemini` sesuai agent-nya.

**`versi ACP tidak kompatibel`**
Adapter ACP lebih tua dari yang didukung. Perbarui agent-nya, atau paksa jalur CLI di config:
```yaml
workspaces:
  - slug: toko-api
    driver: cli
```

**Agent jalan di terminal tapi tidak lewat Caraka**
Biasanya `PATH` berbeda saat dijalankan sebagai layanan latar. Tulis path absolut di preset agent, atau jalankan gateway dari shell yang sama.

**Run berhenti di 30 menit**
Timeout bawaan. Naikkan bila memang wajar untuk tugasnya:
```yaml
runner:
  timeoutMinutes: 60
```

---

## Telegram

**Bot tidak membalas apa pun**
Berurutan: sudah tekan Start? Bot tidak diblokir? Nomor atau id kamu ada di `allowFrom`? Whitelist di @BotFather tidak menutup akunmu? `caraka doctor` memeriksa keempatnya.

**`token ditolak (401)`**
Token tersalin sebagian. Salin ulang seluruhnya dari BotFather, termasuk angka sebelum titik dua.

**Topic tidak pernah terbuat**
Di supergroup, forum mode mati atau bot tidak punya `can_manage_topics`. Method-nya gagal diam-diam, jadi Caraka mendeteksi sekali di startup lalu memakai mode linear. Aktifkan Topics di pengaturan grup, lalu jalankan `caraka doctor` lagi. Flag `--fix` **dispesifikasikan, belum di v0.2**.

**Pesan panjang terpotong di tengah code block**
Bug. Laporkan dengan keluaran `caraka doctor` dan panjang pesannya. Code block tidak boleh pernah terpotong.

**Format hasil berantakan, muncul tanda mentah**
`sendRichMessage` gagal dan fallback MarkdownV2 salah escape. Laporkan beserta teks aslinya.

**`429 Too Many Requests` berulang**
Terlalu banyak update status. Naikkan throttle:
```yaml
channels:
  telegram:
    editThrottleMs: 2500
```

---

## Approval

**Tombol ditekan tapi tidak terjadi apa-apa**
Nonce sudah kedaluwarsa, TTL bawaan 10 menit. Kartu yang kedaluwarsa otomatis menolak. Minta agent mengulang.

**Kartu approval muncul untuk operasi baca**
Bug. Mode `read-only` dan `assisted` tidak boleh meminta izin untuk membaca.

**Membuka jendela trust**
Dari chat, `/yolo <durasi>` menampilkan kartu berkonfirmasi; tombolnya yang membuka jendela, bukan teksnya. Dari terminal:
```bash
caraka trust toko-api --for 60m
```
Keduanya wajib berdurasi, maksimal 60 menit, dan tertutup sendiri saat kedaluwarsa maupun saat gateway mulai ulang. `/lock` menutupnya seketika.

**Mode `bypassPermissions` Claude tidak bisa dinyalakan dari chat**
Memang begitu, dan tidak akan diubah. Hanya `caraka trust <workspace> --bypass --for <durasi>` dari terminal. Selama jendela itu terbuka Claude berhenti meminta izin kepada Caraka, jadi Caraka tidak melihat keputusannya dan tidak mengauditnya; yang tercatat hanya jendelanya.

**Aksi berisiko tetap minta izin di mode `trusted`**
Juga memang begitu. Force-push, `rm -rf`, migrasi database, dan deploy selalu meminta konfirmasi.

---

## Memori

**`memory_degraded` di log**
`recall` melewati 500 ms lalu dilewati. Balasan tetap jalan. Cek Titen hidup: `curl 127.0.0.1:7717/health`.

**Titen tidak terjangkau**
Jalankan `titen serve`. Bila tidak dipakai, ganti provider:
```yaml
memory:
  provider: local   # atau none
```

**Agent mengingat sesuatu yang salah**
Runut dulu, jangan langsung hapus: `/memori` untuk melihat, lalu id claim-nya bisa dirunut ke bukti asalnya. `/lupakan <id>` bila memang salah.

---

## Gateway

**Port sudah terpakai**
Caraka memilih port bebas berikutnya sendiri. Bila ingin tetap, set `gateway.port`.

**Sesi hilang setelah restart**
Sesi persisten di SQLite. Bila hilang, basis datanya tidak terbaca. Cek `~/.caraka/caraka.db` dan izin berkasnya.

**Run ditandai `interrupted`**
Gateway berhenti saat run berjalan. Perubahan yang sudah disetujui tetap tersimpan. Mulai sesi baru dengan `/new`.

**Dua run berebut berkas yang sama**
Tidak boleh terjadi: satu run aktif per workspace dijaga unique partial index. Bila terjadi, itu bug yang serius. Laporkan dengan audit log.

---

## Melapor

Sertakan tiga hal:

```bash
caraka doctor          # sudah teredaksi, aman ditempel
caraka --version
caraka audit --since 1h
```

Ditambah sistem operasi, coding agent dan versinya, serta langkah persis untuk mengulang gejalanya.

Kerentanan keamanan tidak lewat issue publik. Kirim ke `security@caraka.dev`, lihat `SECURITY.md`.
