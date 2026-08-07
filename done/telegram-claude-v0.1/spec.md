# Spec — Telegram ke Claude Code v0.1

**Slug:** `telegram-claude-v0.1` · **Tanggal:** 7 Agustus 2026
**Standar:** [`standards/ears.md`](../../standards/ears.md)

---

## 1. Latar

Paket npm `caraka@0.0.0` saat ini hanya mencetak pesan pra-alfa. Rilis pertama
harus membuktikan satu alur penuh: seorang operator memasang Caraka, memasangkan
bot Telegram, mengirim tugas dari chat pribadi, lalu menerima keluaran Claude
Code. Caraka tetap bridge. Runtime, model, tool, dan sandbox tetap milik Claude
Code.

Bot API 10.2 sudah menyediakan topic di chat pribadi, Rich Messages, dan draft
streaming. SDK ACP TypeScript v1 serta adapter Claude resmi sudah menyediakan
streaming dan permission request. Rilis ini memakai kontrak stabil ACP v1; ACP v2
masih eksperimental dan tidak dibutuhkan.

## 2. Ruang lingkup

- Satu operator, satu bot Telegram, satu workspace, dan Claude Code lewat ACP.
- Chat pribadi saja. Pesan grup diabaikan.
- Topic dipakai bila diaktifkan lewat BotFather; mode linear menjadi fallback.
- Instalasi interaktif, diagnosis read-only, gateway long-polling, sesi persisten,
  streaming, pembatalan, approval, rich result, scrubber, dan audit.
- Dokumentasi instalasi lewat command serta prompt yang bisa ditempel ke Codex
  atau Claude Code.
- Paket npm publik dan situs `caraka.dev` diperbarui dari commit yang sama.

## 3. Yang tidak dikerjakan

- Tidak ada memory, banyak workspace, grup, service manager, dashboard, CLI
  fallback, attachment, atau agent selain Claude Code pada rilis ini.
- Tidak ada webhook atau server yang mendengarkan port.
- Tidak ada keychain native. Token disimpan di berkas rahasia mode `0600`; keychain
  ditambahkan saat ada kebutuhan lintas platform yang terukur.
- Tidak ada approval `allow_always` dari chat. Telegram hanya boleh memilih izin
  sekali atau menolak sekali.

## 4. Acceptance criteria

### AC-1 · Instalasi

- **AC-1.1** WHEN operator menjalankan `npx caraka init`, Caraka shall mendeteksi
  Node.js, Git, Claude Code, dan workspace aktif sebelum menanyakan nilai yang
  tidak dapat ditemukan sendiri.
- **AC-1.2** WHEN operator memasukkan token Telegram, Caraka shall memvalidasinya
  lewat `getMe` sebelum menyimpan konfigurasi.
- **AC-1.3** WHEN token valid, Caraka shall menyimpannya di luar `config.yaml`
  dalam berkas mode `0600`.
- **AC-1.4** WHEN operator membuka deep link pairing dan menekan Start, Caraka
  shall meminta konfirmasi di terminal sebelum memasukkan Telegram user ID ke
  allowlist.
- **AC-1.5** IF Claude Code tidak ditemukan atau belum terautentikasi, THEN Caraka
  shall menyebutkan perintah perbaikan tanpa mencetak stack trace.
- **AC-1.6** WHEN `init` selesai, Caraka shall menampilkan perintah start, identitas
  bot, workspace, status topic, dan mode keamanan tanpa menampilkan token.

### AC-2 · Gerbang identitas

- **AC-2.1** Caraka shall menolak start bila allowlist kosong.
- **AC-2.2** WHEN sebuah update berasal dari chat grup atau sender di luar
  allowlist, Caraka shall tidak meneruskannya ke Claude Code.
- **AC-2.3** WHEN callback approval berasal dari principal selain pemilik sesi,
  Caraka shall menolaknya dan mencatat hasilnya.

### AC-3 · Telegram

- **AC-3.1** WHILE gateway hidup, Caraka shall menerima update Telegram dengan
  long-polling dan tidak membuka listener jaringan.
- **AC-3.2** WHEN Telegram membalas `429`, Caraka shall menunggu `retry_after`
  sebelum mencoba lagi.
- **AC-3.3** WHERE bot mengiklankan `has_topics_enabled`, Caraka shall membuat satu
  topic untuk setiap sesi baru dan menyimpan `message_thread_id`-nya.
- **AC-3.4** IF topic tidak tersedia atau sebuah operasi topic gagal, THEN Caraka
  shall melanjutkan dalam mode linear dengan header `[workspace · #session]`.
- **AC-3.5** WHEN sebuah update memuat field yang tidak dikenal, Caraka shall tetap
  memproses bagian update yang dikenal.

### AC-4 · Claude Code lewat ACP

- **AC-4.1** WHEN gateway mulai, Caraka shall menjalankan adapter Claude ACP resmi
  sebagai subprocess dan menegosiasikan versi stabil SDK ACP.
- **AC-4.2** WHEN pesan tugas diterima, Caraka shall membuat atau memuat sesi ACP
  dengan `cwd` absolut milik workspace lalu mengirim prompt pengguna apa adanya.
- **AC-4.3** WHILE Claude mengirim `agent_message_chunk`, Caraka shall memperbarui
  pesan progres paling sering sekali tiap 1,5 detik.
- **AC-4.4** WHEN proses ACP berhenti, timeout, atau menolak prompt, Caraka shall
  mengirim pesan yang menyebutkan tindakan berikutnya tanpa stack trace.
- **AC-4.5** WHEN operator mengirim `/stop`, Caraka shall mengirim
  `session/cancel` untuk sesi aktif.
- **AC-4.6** WHEN gateway dimulai ulang dan thread yang dikenal menerima pesan,
  Caraka shall memuat `agent_session_id` yang tersimpan sebelum melanjutkan.

### AC-5 · Approval

- **AC-5.1** WHEN ACP meminta permission, Caraka shall mengirim tombol izin sekali
  dan tolak sekali yang terikat pada `(principal, session, tool call)`.
- **AC-5.2** Setiap callback approval shall memuat id acak dan HMAC, berumur paling
  lama 10 menit, serta dapat dipakai tepat satu kali.
- **AC-5.3** IF callback dipalsukan, kedaluwarsa, dipakai ulang, atau lintas sesi,
  THEN Caraka shall menolaknya tanpa meneruskan keputusan ke agent.
- **AC-5.4** Caraka shall never menerima teks chat sebagai keputusan approval.
- **AC-5.5** WHEN gateway berhenti dengan approval tertunda, Caraka shall
  membatalkan permission request tersebut.

### AC-6 · Keluaran dan rahasia

- **AC-6.1** Caraka shall menjalankan scrubber sebelum setiap pesan Telegram dan
  setiap baris audit menyentuh disk.
- **AC-6.2** WHEN keluaran akhir tersedia, Caraka shall mencoba
  `sendRichMessage` dengan Markdown rich.
- **AC-6.3** IF `sendRichMessage` ditolak, THEN Caraka shall mengirim teks polos
  yang sudah di-scrub.
- **AC-6.4** IF keluaran melebihi batas Telegram, THEN Caraka shall memecahnya di
  batas baris tanpa memotong code fence terbuka.
- **AC-6.5** Audit shall mencatat inbound, outbound, run, approval, dan error tanpa
  token Telegram, API key, JWT, private key, atau isi berkas `.env`.

### AC-7 · Operasional

- **AC-7.1** WHEN operator menjalankan `caraka doctor`, Caraka shall memeriksa
  versi Node, config, mode berkas rahasia, workspace, Claude, token Telegram, dan
  allowlist tanpa mengubah state.
- **AC-7.2** WHEN proses menerima `SIGINT` atau `SIGTERM`, Caraka shall menghentikan
  polling, membatalkan approval tertunda, menutup database, dan mematikan proses
  ACP.
- **AC-7.3** Paket npm shall memuat hanya build runtime, preset yang diperlukan,
  README, lisensi, dan metadata paket.

### AC-8 · Dokumentasi dan rilis

- **AC-8.1** README Inggris, README Indonesia, install guide, dan halaman
  `/install` shall menyediakan jalur `npx caraka init`.
- **AC-8.2** Dokumentasi instalasi shall menyediakan prompt siap-tempel untuk
  Codex dan Claude Code yang tidak meminta pengguna menaruh token di prompt.
- **AC-8.3** WHEN seluruh gate lokal hijau, paket `caraka` shall diterbitkan ke npm
  dengan versi SemVer non-placeholder.
- **AC-8.4** WHEN paket npm dapat dipasang dari registry, situs shall di-deploy dan
  tautan instalasinya shall menunjuk versi yang terbit.
- **AC-8.5** WHEN deploy selesai, pemeriksaan produksi shall membuktikan halaman
  utama, `/install`, paket npm, dan tarball instalasi dapat diakses.

## 5. Selesai bila

Alur mock Telegram lulus end-to-end, adapter ACP lulus smoke terhadap Claude Code
yang terpasang, seluruh gate repo hijau, paket dapat dipasang dari npm, dan situs
produksi menyajikan instruksi command serta prompt yang sama.
