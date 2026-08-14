# Spec — pangkas-berulang: satu lintasan penyederhanaan, tanpa perubahan perilaku

**Status:** selesai, belum dipindahkan ke `done/` · **Tanggal:** 14 Agustus 2026

## Latar

`AGENTS.md` mencatat `src/` di 9.634 baris terhadap plafon ~8.000, dan mencatat
hal itu berulang kali: `workspace-dari-chat`, `lampiran-chat`, dan
`titen-siap-pakai` masing-masing menutup catatannya dengan kalimat yang sama —
empat kandidat penghapusan sudah diverifikasi, tidak satu pun dikerjakan, karena
satu PR yang memperbaiki bug sekaligus melakukan refactor adalah dua PR
(`standards/ears.md` §5). Utangnya dibawa lewat beberapa rilis dengan alasan
yang benar setiap kali.

Ini PR yang kedua itu. Satu-satunya perkara di dalamnya adalah pengulangan yang
sudah terverifikasi: tidak ada fitur baru, tidak ada perbaikan bug, tidak ada
perilaku yang bergeser. Nilai sebelum dan sesudah diukur, bukan ditaksir, dan
angkanya masuk ke bagian complexity budget di `AGENTS.md`.

Enam pengulangan disebut di daftar kandidat. Yang keenam dibaca ulang lebih dulu
dan ternyata sudah dilipat pada lintasan sebelumnya, jadi lima yang dikerjakan.
Alasannya ada di "Yang tidak dikerjakan".

## Ruang lingkup

- `src/core/channel.ts` — satu helper `fetchWithRetry`, di sebelah
  `splitMarkdown`, `drainInbox`, dan `evict`.
- `src/channels/discord.ts` dan `src/channels/whatsapp.ts` — `call()` dan
  `graph()` memakai helper itu.
- `src/store/db.ts` — satu helper `columns(table)` untuk dua pemindaian
  `PRAGMA table_info(...)`.
- `src/core/gateway.ts` — satu `sessionOf(message)`, dan satu bingkai bersama
  untuk tiga perintah memori.
- `src/cli.ts` — satu fungsi untuk `loadConfig()` yang dibaca hanya demi bahasa.
- `AGENTS.md` — bagian complexity budget, dengan angka terukur.

## Yang tidak dikerjakan

- **Kandidat keenam ditolak.** `request.toolCall.title ?? request.toolCall.kind
  ?? this.t("permission.fallbackTitle")` disebut muncul tiga kali di
  `src/core/gateway.ts`. Ia muncul satu kali, sebagai `const tool` di
  `askPermission`, dan komentar di atasnya sudah mencatat bahwa tiga kalimat di
  bawahnya dulu mengeja fallback itu sendiri-sendiri. Pengulangannya sudah
  hilang; melipatnya lagi berarti menambah sesuatu, bukan mengurangi.
- **Telegram tidak ikut ke helper fetch.** `src/channels/telegram.ts` melaporkan
  penolakan di dalam badan JSON berstatus 200, bukan lewat status HTTP, jadi
  tidak satu pun cabang helper akan menyala untuknya. Menyeretnya masuk berarti
  menambahkan cabang "channel ini melapor lain" ke dalam helper.
- **Tidak menyentuh header otorisasi.** Token bot tetap dibangun di adapter.
  Helper tidak menerima, membaca, mencatat, atau merangkai `RequestInit`
  mana pun ke dalam pesan.
- **Tidak ada test yang diubah, dilemahkan, atau dihapus.** Gerbang lewat
  dengan test apa adanya, atau lintasan ini gagal.
- **Tidak ada komentar yang dihapus** yang mencatat kenapa sebuah bentuk salah,
  baris audit, atau apa pun di jalur keamanan. Termasuk komentar `ponytail:` di
  `db.ts` dan komentar indeks unik parsial di atas pemindaian kedua.
- **`status()`, `routeTask()`, dan `workspaceForMessage()` tidak ikut**
  `sessionOf`. Ketiganya masih memakai `chatId` atau `threadId` untuk hal lain,
  dan helper yang menyembunyikannya akan memaksa `route()` dibaca dua kali.
- **`Channel.getMe()` tidak dihapus.** `AGENTS.md` menyebutnya kandidat karena
  tidak ada pemanggil di `src/core/`, tapi ia punya pemanggil di
  `src/channels/discord.ts`, `src/channels/telegram.ts`, dan `src/cli.ts`. Itu
  bukan pengulangan, dan bukan kode mati.
- **Tidak membangun ledger migrasi bernomor.** Komentar `ponytail:` di `db.ts`
  menunda itu sampai ALTER ketiga; lintasan ini tidak menambah ALTER.
- **Tidak menyentuh `site/`, `docs/`, `design/`, `presets/`, `CHANGELOG.md`,
  atau `package.json`.**

## Acceptance criteria

### AC-1 · Gelung fetch-with-retry

- **AC-1.1** Sistem shall menyimpan satu-satunya salinan gelung "kirim, tunggu
  429, kirim lagi" di `src/core/channel.ts`.
- **AC-1.2** WHEN respons berstatus 429 membawa header `retry-after` berupa
  angka berhingga lebih besar dari nol, helper shall menunggu selama detik itu,
  dibatasi 60 detik, lalu mengulang permintaan yang sama.
- **AC-1.3** IF respons berstatus 429 tidak membawa header `retry-after` yang
  bisa dipakai, THEN helper shall memakai detik yang dikembalikan pemanggil, dan
  1 detik bila pemanggil tidak mengembalikan apa-apa.
- **AC-1.4** Helper shall menerima permintaan sebagai satu fungsi tanpa argumen
  milik adapter, dan shall tidak membaca, menyusun, mencatat, atau merangkai
  `RequestInit` mana pun ke dalam pesan yang dilemparnya.
- **AC-1.5** WHERE adapter menyuntikkan fungsi tidur sendiri, helper shall
  menunggu lewat fungsi itu dan bukan lewat timer miliknya.
- **AC-1.6** IF permintaan gagal sebelum ada respons, THEN helper shall
  melempar error buatan adapter yang membawa kalimat `channel.unreachable`.
- **AC-1.7** IF respons tidak ok dan bukan 429, THEN helper shall melempar error
  buatan adapter yang membawa kalimat `channel.refused`, badan respons, dan
  status HTTP-nya.
- **AC-1.8** WHEN Discord menjawab 204, adapter Discord shall mengembalikan
  `undefined` tanpa membaca badan respons.
- **AC-1.9** Helper shall tidak menerima, menyimpan, atau membandingkan
  `channel.id`; satu-satunya hal yang membedakan pemanggil di dalamnya adalah
  kalimat yang sudah diterjemahkan (hard rule 1).
- **AC-1.10** `src/channels/telegram.ts` shall tidak memanggil helper ini.

### AC-2 · Pemindaian PRAGMA

- **AC-2.1** WHEN `Store` dibuka pada berkas dari sebelum v0.4 maupun v0.6,
  sistem shall membaca daftar kolom lewat satu helper `columns(table)`.
- **AC-2.2** Kedua komentar di atas kedua pemindaian, termasuk komentar
  `ponytail:`, shall tetap apa adanya.
- **AC-2.3** Kolom yang ditambahkan dan indeks unik parsial yang dibuat shall
  persis sama dengan sebelumnya.

### AC-3 · Sesi dari sebuah pesan

- **AC-3.1** Enam pemanggil di `src/core/gateway.ts` yang hanya memerlukan sesi
  di sebuah rute shall memperolehnya lewat satu `sessionOf(message)`.
- **AC-3.2** WHERE pemanggil masih memakai `chatId` atau `threadId` untuk hal
  lain, sistem shall membiarkan pemanggil itu membaca `route(message)` sendiri.

### AC-4 · Bingkai tiga perintah memori

- **AC-4.1** IF tidak ada penyedia memori, THEN ketiga perintah memori shall
  menjawab `memory.off` dari satu tempat.
- **AC-4.2** IF penyedia memori melempar, THEN perintah yang berjalan shall
  menjawab `memory.failed` dari satu tempat.
- **AC-4.3** Pengiriman jawaban shall berada di luar `try`, supaya kegagalan
  pengiriman tidak dilaporkan sebagai kegagalan memori.
- **AC-4.4** Setiap perintah shall menghitung kalimatnya sendiri tanpa membaca
  cabang perintah lain.

### AC-5 · Config yang dibaca hanya demi bahasa

- **AC-5.1** WHEN `caraka fix` atau `caraka uninstall` berjalan, sistem shall
  membaca config untuk bahasa lewat satu fungsi.
- **AC-5.2** IF config tidak bisa dibaca, THEN fungsi itu shall mengembalikan
  null dan meninggalkan bahasa seperti apa adanya.

### AC-6 · Ukuran

- **AC-6.1** Sistem shall mencatat jumlah baris `src/` sebelum dan sesudah,
  keduanya terukur dengan `find src -name "*.ts" | xargs wc -l`.
- **AC-6.2** Bagian complexity budget di `AGENTS.md` shall menyebut hasil
  terukur itu, bukan taksiran.

### AC-7 · Perilaku tidak bergeser

- **AC-7.1** `npm run verify` shall hijau tanpa satu berkas test pun berubah.
