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
    path: /absolute/path/ke/toko-api
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

## WhatsApp

Baca `docs/whatsapp-risiko.md` lebih dulu bila kamu memakai provider `baileys`. Bagian ini soal memperbaiki, bukan soal memutuskan.

**Menautkan ulang perangkat**
Caraka tidak menggambar QR. Payload `qr` Baileys adalah bahan gambar dan tidak ada renderer di dalam paket ini, jadi yang dicetak adalah kode pairing delapan karakter. Saat perangkat belum tertaut, `caraka start` mencetak kode itu ke terminal:

```
This device is not linked yet. On the phone, open WhatsApp →
Linked devices → Link with phone number, and type:
<delapan karakter>
```

Kodenya berumur pendek. Kalau kadaluwarsa sebelum sempat diketik, hentikan Caraka dan jalankan lagi untuk mendapat kode baru. Kalau yang tercetak justru permintaan `number`, blok `whatsapp:` belum punya kunci itu:

```yaml
whatsapp:
  provider: baileys
  number: "628…"        # nomor yang ditautkan, terpisah dari nomor pribadi
  acknowledgeRisk: true
  allowFrom: ["628…"]
```

Menautkan ulang dari nol berarti membuang sesi lamanya:

```bash
caraka stop
rm -rf ~/.caraka/secrets/whatsapp/
caraka start
```

**`WhatsApp logged this device out`**
Caraka berhenti dan **tidak** menyambung ulang, dan itu disengaja: menyambung ulang berkali-kali sesudah logout adalah pola yang dilaporkan menghabiskan akun. Jangan otomatiskan percobaan ulang. Tautkan ulang lewat langkah di atas, dan bila logout terjadi berulang dalam hitungan hari, itu temuan — pindah ke `cloud-api`.

**Putus terus, atau `WhatsApp did not come back after 6 attempts`**
Backoff-nya 5 detik dikali dua dengan jitter, berplafon 300 detik, dan berhenti di percobaan keenam; sekitar lima menit. Sesudah itu Caraka menulis satu baris audit dan memberi tahu lewat channel lain yang terkonfigurasi. Berurutan:

1. Cek jaringan mesin ini dulu — putus di sisi kita terbaca sama dengan putus di sisi WhatsApp.
2. Cek ponselnya masih online dan perangkat tertaut masih terdaftar di WhatsApp → Linked devices.
3. Kalau perangkatnya sudah hilang dari daftar itu, ini logout, bukan gangguan jaringan. Ikuti butir di atasnya.
4. Jangan menjalankan Caraka berulang-ulang di loop shell. Yang tersisa dari percobaan keenam adalah keputusan, bukan percobaan ketujuh.

**Balasan tidak terkirim, log menyebut first contact**
Caraka tidak pernah menulis lebih dulu ke nomor yang belum pernah menulis kepadanya. Kirim satu pesan dari nomor itu, atau masukkan ke `allowFrom`. Ini bukan bug yang dilonggarkan: ia salah satu dari empat mitigasi ban yang berupa kode.

**Pesan dari grup tidak sampai**
Memang tidak akan sampai. Pesan grup menyebut grup itu sendiri sebagai pengirim, jadi setiap anggota akan tiba sebagai satu principal dan setiap anggota membaca kode approval di kartu yang sama. Hanya percakapan satu lawan satu yang jalan.

**Kartu approval muncul tanpa tombol**
Betul, WhatsApp tidak punya tombol callback. Balas `ok <kode>` atau `no <kode>` dengan kode yang ada di kartu. Lima kode salah dari satu pengirim menutup jalur kode untuk sesi itu sampai pertanyaannya diputuskan atau kedaluwarsa.

**Webhook Cloud API tidak pernah dipanggil Meta**
Penerimanya bind `127.0.0.1` secara default, jadi Meta tidak bisa menjangkaunya tanpa reverse proxy milikmu di depannya. Yang perlu dicocokkan: path di blok `whatsapp.webhook` sama dengan yang didaftarkan di app Meta, verify token sama persis, dan app secret yang dipakai Meta menandatangani `X-Hub-Signature-256` ada di `~/.caraka/secrets/whatsapp.appsecret`. Signature yang tidak sah dijawab 403 tanpa badan, termasuk saat bind loopback.

**Nomornya kena ban**
Hentikan gateway, jangan menyambung ulang, dan hapus `~/.caraka/secrets/whatsapp/`. Kami tidak punya jalur banding untuk direkomendasikan dan tidak akan mengarangnya. Keputusan berikutnya cuma dua: nomor lain yang kamu sanggup kehilangan, atau `cloud-api`, yang bekerja pada config yang sama dengan mengganti `provider` dan mengisi `phoneNumberId`.

**Rotasi kredensial**
Auth state Baileys: hentikan Caraka, hapus `~/.caraka/secrets/whatsapp/`, tautkan ulang. Access token, verify token, dan app secret Cloud API: terbitkan ulang di app Meta, lalu tulis ulang berkasnya di `~/.caraka/secrets/` — `whatsapp.token`, `whatsapp.verify`, `whatsapp.appsecret`, semuanya mode 0600 — atau berikan lewat `CARAKA_WHATSAPP_TOKEN`, `CARAKA_WHATSAPP_VERIFY_TOKEN`, dan `CARAKA_WHATSAPP_APP_SECRET`. Tidak satu pun boleh masuk `config.yaml`. `caraka doctor` memeriksa modenya.

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
