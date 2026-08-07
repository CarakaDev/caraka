# Plan — Caraka v0.2

**Slug:** `v02` · **Tanggal:** 7 Agustus 2026
**Spec:** [`spec.md`](spec.md) · **Standar:** [`standards/ears.md`](../../standards/ears.md)

---

## 1. Bentuk yang dipilih

Tidak ada dependency baru. Enam pekerjaan spec dikerjakan dengan yang sudah ada:
`node:sqlite` untuk `policy_grant`, `node:crypto` untuk tanda tangan callback yang
sudah dipakai approval, `fetch` bawaan untuk `setMyCommands`, dan `node:test`
untuk seluruh pembuktian di sisi alat.

Dua berkas baru di `src/`, karena keduanya bukan logika melainkan data: `src/i18n.ts`
memuat dua katalog string, dan `src/service.ts` memuat tiga template unit sebagai
string literal. Sisanya masuk ke modul yang sudah memiliki perilakunya. Jendela
trust tinggal di `gateway.ts` bersama approval, karena keduanya membaca
`session/request_permission` yang sama dan memisahkannya berarti dua tempat
membaca satu aliran.

Katalog dipasang sebagai `const en = { … } as const` dan
`const id: Record<keyof typeof en, string> = { … }`. Kunci yang hilang gagal di
`tsc` tanpa satu baris kode pemeriksa (AC-2.6).

## 2. Tiga aliran dan kepemilikan berkas

Kepemilikan terpisah penuh. Satu berkas hanya disentuh satu aliran, tanpa kecuali.

| Aliran | Berkas | AC |
|---|---|---|
| **tool** | `src/**`, `test/**`, `package.json` | AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-7b |
| **site** | `site/**` | AC-1, AC-8.2, AC-8.4, dan kalimat token AC-8.3 di `/install` |
| **docs** | `docs/**`, `README.md`, `README.id.md` | AC-8.1, kalimat token AC-8.3 di panduan, AC-9 |

Dua catatan tentang pembagian itu.

**AC-8.2 dan AC-8.4 dikerjakan aliran site, bukan docs.** Keduanya mengubah
`site/src/data/install.ts` dan baseline di `site/e2e/site.spec.ts`, dan berkas
`site/**` hanya boleh disentuh satu aliran. Aliran docs tetap memiliki *urutan*
dan kata-katanya lewat `docs/install-guide.md`; aliran site menyalin urutan itu ke
halaman. Yang mengikat: docs mendarat lebih dulu, site menyusul.

**Titen MCP tidak ada di plan ini.** `spec/v02.md` tidak memuat satu pun AC
tentangnya, dan §3.8 menaruh memori di Fase 3 dan Fase 4. Aturan §5 standar
berlaku dua arah: AC tanpa pembuktian kembali ke spec, dan pekerjaan tanpa AC
tidak masuk plan. Titik pemasangannya kalau nanti dispesifikasikan adalah
`mcpServers: []` di `src/drivers/claude-acp.ts:70,78`, dan berkas itu milik
aliran tool.

## 3. Urutan yang mengikat

Empat urutan berikut bukan preferensi. Melanggarnya menghasilkan build yang
berbohong atau tombol yang seharusnya tidak pernah ada.

1. **Filter opsi izin mendarat sebelum apa pun yang mengubah cara opsi
   dirender.** `gateway.ts:280` hari ini memilih hanya opsi ber-`kind`
   `allow_once`, dan satu baris itulah yang menahan opsi `bypassPermissions` —
   yang benar-benar dikirim `ExitPlanMode`, dan dikirim pertama di daftar pada
   mesin non-root — menjadi tombol satu ketukan di chat pribadi. Baris itu tetap.
   Langkah T1 menambahkan penjaga di sisi keluar (AC-3.11, AC-6.9), dan baru
   setelah T1 hijau, T3 boleh menuliskan `PermissionOption.name` ke tombol
   (AC-3.10). Urutan sebaliknya berarti ada satu commit yang merender nama opsi
   sebelum ada yang menolak opsi salah.
2. **`/yolo` membuka jendela trust Caraka, tidak pernah mode bypass Claude.**
   Jalur chat berakhir di `policy_grant` (AC-6.10). Mode `bypassPermissions`
   hanya punya satu pemanggil, yaitu `caraka trust --bypass` di terminal
   (AC-6.13), dan AC-6.14 diuji sebagai ketiadaan jalur, bukan sebagai niat.
   Alasannya faktual: begitu mode itu menyala, adapter menjawab izin secara lokal
   dan berhenti mengirim `session/request_permission`. Caraka tidak
   auto-approve, ia tidak pernah diberi tahu. Setiap kalimat yang ditulis
   tentang mode itu mengatakan hal tersebut.
3. **Skema `policy_grant` mendarat sebelum tulisan mana pun tentangnya.**
   CHECK constraint adalah sumber kebenaran untuk `granted_by` dan `expires_at`;
   `docs/erd.md` menyalin, bukan mendefinisikan. Rinciannya di §7.
4. **Baris §4 yang menggambarkan kode baru mendarat setelah kodenya.** Aliran
   docs boleh langsung mengerjakan baris koreksi murni (`closeForumTopic`,
   `RichBlockThinking`, `is_ephemeral`, scope `setMyCommands`, ephemeral di
   `security.md`). Baris yang menjanjikan perilaku — rate limit, `stop`/`status`,
   `policy_grant` — menunggu T4 dan T6 hijau, atau ia menjadi kebohongan baru
   dengan tanggal yang lebih muda.

Di dalam aliran tool urutannya: T1 → T2 → T3 → {T4, T5} → T6 → T7. T4 dan T5
tidak saling menyentuh berkas dan boleh paralel.

## 4. Langkah

### Aliran tool

| # | Langkah | Berkas | AC |
|---|---|---|---|
| T1 | Penjaga opsi izin. Tolak `optionId` bernilai `bypassPermissions`, `acceptEdits`, `auto`, dan setiap opsi ber-`kind` `allow_always`, di dalam maupun di luar jendela trust; jawab dengan `reject_once`. | `src/core/gateway.ts`, `test/unit.test.ts` | 3.11, 6.9 |
| T2 | Bahasa antarmuka. Dua katalog, field `language` opsional di schema, pemetaan `navigator.language`, pilihan sekali saat `init`. ~41 string pindah ke katalog. | `src/i18n.ts` (baru), `src/config.ts`, `src/cli.ts`, `src/core/gateway.ts`, `src/channels/telegram.ts`, `src/drivers/claude-acp.ts` | 2.1–2.10 |
| T3 | Permukaan perintah. `setMyCommands` per operator, penampung `available_commands_update` dan `usage_update`, `/commands` dan `/usage`, penolakan slash tak dikenal, `allowed_updates` bertambah `my_chat_member`, label tombol dari `PermissionOption.name`. | `src/core/gateway.ts`, `src/channels/telegram.ts` | 3.1–3.10, 3.12–3.14 |
| T4 | Kontrol tak diawasi. PID file `0600`, `stop`, `status`, exit 78 untuk PID hidup dan galat 401/409, rate limit 20/60 detik, batas run 30 menit, pesan startup dengan jeda 60 menit. | `src/cli.ts`, `src/core/gateway.ts`, `src/store/db.ts` | 4.1–4.11 |
| T5 | `caraka service --print`. Tiga template sebagai string literal tanpa percabangan, plus langkah manual dan `loginctl enable-linger` terpisah. | `src/service.ts` (baru), `src/cli.ts`, `package.json` | 5.1–5.9 |
| T6 | Jendela trust. Tabel `policy_grant` dengan CHECK, `caraka trust`, `/yolo` berkartu konfirmasi bertanda tangan, `/lock`, pembersihan saat start, jalur `--bypass` khusus terminal. | `src/store/db.ts`, `src/core/gateway.ts`, `src/cli.ts`, `src/core/security.ts` | 6.1–6.15 |
| T7 | Grup dan topic. Allowlist chat terpisah dari allowlist pengirim, pairing grup lewat `my_chat_member` dengan konfirmasi di DM, kalimat pengungkapan, topic bila `can_manage_topics` ada, `doctor` melaporkan dua flag `getMe`. | `src/core/gateway.ts`, `src/channels/telegram.ts`, `src/config.ts`, `src/cli.ts` | 7.1–7.5, 7b.1–7b.8 |

### Aliran site

| # | Langkah | Berkas | AC |
|---|---|---|---|
| S1 | Veil berbahasa Inggris, sekali per sesi tab. Script inline di `<head>` membaca `sessionStorage` dan menandai `<html>` sebelum markup veil diparse; CSS menyembunyikan veil pada tanda itu; `try/catch` mengembalikannya ke perilaku kunjungan pertama. | `site/src/layouts/Base.astro`, `site/src/pages/index.astro`, `site/src/styles/pages/landing.css`, `site/AGENTS.md` | 1.1–1.7 |
| S2 | Urutan `/install`. Bagian prompt naik ke atas pemilihan jalur, kalimat token tetap, baseline tinggi diperbarui bila berubah. | `site/src/data/install.ts`, `site/e2e/site.spec.ts`, `site/test/` | 8.2, 8.3, 8.4 |

### Aliran docs

| # | Langkah | Berkas | AC |
|---|---|---|---|
| D1 | Koreksi murni tabel §4, sepuluh baris yang tidak menunggu kode. | `docs/telegram-integration.md`, `docs/security.md`, `docs/roadmap.md`, `docs/frd.md`, `docs/techstack.md`, `docs/brand.md`, `docs/ui-ux.md` | 9.1 sebagian, 9.3 |
| D2 | Baris §4 yang menunggu kode, ditulis setelah T4 dan T6 hijau, termasuk `granted_by` di ERD. | `docs/security.md`, `docs/frd.md`, `docs/erd.md`, `docs/install-guide.md` | 9.1 sisanya, 9.2 |
| D3 | Grup: kalimat pengungkapan dan perlakuan sebagai perilaku terkirim, bukan rancangan. | `docs/security.md`, `docs/telegram-integration.md`, `README.md`, `README.id.md` | 9.4 |
| D4 | Urutan panduan instalasi. Prompt copy-paste naik ke tepat setelah tabel prasyarat. | `docs/install-guide.md` | 8.1, 8.3 |

---

## 5. Pembuktian tiap AC

Tiga jenis: **unit** = `npm test`, **e2e** = `npm run e2e` (harness fake Telegram
dan fake ACP di `test/e2e.test.ts`, atau Playwright di `site/e2e/`), **manual** =
langkah tertulis yang dijalankan orang dan keluarannya ditempel di §8.

### AC-1 · Veil situs

| AC | Cara | Bukti |
|---|---|---|
| 1.1 | e2e | Veil ada di `/`, tidak ada di sebelas rute lain. |
| 1.2 | e2e + unit | Teks label sama dengan konstanta veil; vitest menolak karakter non-ASCII pada konstanta itu; `<html lang>` rute `/` tetap `en`. |
| 1.3 | e2e | Konteks baru: veil terlihat, `animationDuration` terbaca `2.6s`, veil hilang setelahnya. |
| 1.4 | e2e + unit | Muat kedua di konteks yang sama, `goto` dengan `waitUntil: 'commit'`, veil sudah `display: none`; vitest atas HTML hasil build memastikan script inline berada di `<head>` sebelum markup veil. Pembuktiannya struktural plus observasi paling awal yang bisa diambil Playwright, bukan pengukuran waktu lukis. |
| 1.5 | e2e | `addInitScript` membuat `sessionStorage` melempar; veil tetap dimainkan penuh. |
| 1.6 | e2e | Baseline tinggi `/` di `site/e2e/site.spec.ts` tetap 6390. |
| 1.7 | unit | vitest memastikan `site/AGENTS.md` memuat label veil dan kata "mockup"; catatan penyimpangan tidak bisa hilang diam-diam. |

### AC-2 · Bahasa antarmuka alat

| AC | Cara | Bukti |
|---|---|---|
| 2.1 | unit | `t()` tanpa `language` mengembalikan katalog `en`; satu test menyisir `src/` dan gagal bila ada literal non-ASCII yang dilihat pengguna di luar `src/i18n.ts`. |
| 2.2 | unit | Schema menerima `en` dan `id`, menolak `fr`. |
| 2.3 | unit | YAML v0.1 tanpa `language` tetap terparse, `version` tetap 1, bahasa terpilih `en`. |
| 2.4 | unit + manual | `defaultLanguage()` diuji langsung; manual: jalankan `caraka init` pada shell ber-`LANG=id_ID.UTF-8`, catat nilai bawaan yang ditawarkan wizard. |
| 2.5 | unit | `defaultLanguage(undefined)` dan `defaultLanguage('fr-FR')` sama-sama `en`. |
| 2.6 | manual | Hapus satu kunci dari katalog `id`, jalankan `npm run typecheck`, tempel galatnya, kembalikan kunci. |
| 2.7 | unit | Gateway ber-`language: 'en'` menjawab prompt berbahasa Indonesia dengan chrome Inggris. |
| 2.8 | unit | Pencarian `language_code` di `src/` mengembalikan nol hasil. |
| 2.9 | unit | Predikat konfirmasi menerima `y`, `ya`, `yes` pada kedua nilai `language`. |
| 2.10 | unit | Baris kosong, `n`, dan `yep` membatalkan; tidak ada berkas config yang tertulis setelahnya. |

### AC-3 · Perintah Telegram

| AC | Cara | Bukti |
|---|---|---|
| 3.1 | unit | Fetch mock mencatat satu `setMyCommands` ber-`BotCommandScopeChat` per id di `allowFrom`. |
| 3.2 | unit | Setiap nama di tabel perintah cocok `/^[a-z0-9_]{1,32}$/`, setiap deskripsi 1–256 karakter. |
| 3.3 | unit | `setMyCommands` dijawab `ok: false`; gateway tetap melayani pesan berikutnya dan satu baris audit tertulis. |
| 3.4 | e2e | Fake ACP mengirim `available_commands_update`; `/commands` kemudian menampilkan isinya. |
| 3.5 | e2e | `/frobnicate` dengan daftar tersimpan dibalas pesan yang menyebut `/commands`; fake ACP tidak menerima prompt apa pun. |
| 3.6 | e2e | Tanpa daftar tersimpan, `/frobnicate` sampai ke fake ACP apa adanya. |
| 3.7 | e2e | Balasan `/commands` memuat setiap nama yang tersimpan. |
| 3.8 | e2e | `usage_update` tersimpan; `/usage` menyebut `used`, `size`, `cost`. |
| 3.9 | e2e | Tanpa `usage_update`, `/usage` menyatakan agent belum melapor. |
| 3.10 | unit | Teks tombol sama dengan `PermissionOption.name`, dipotong pada batas terukur. **Angkanya belum bersumber** — lihat §6. |
| 3.11 | unit | Tabel kasus: opsi `bypassPermissions`, `acceptEdits`, `auto`, dan `allow_always` masing-masing menghasilkan `reject_once`; tidak ada `outcome: selected` dengan keempat nilai itu. |
| 3.12 | unit | Parameter `getUpdates` memuat ketiga jenis update. |
| 3.13 | e2e | `my_chat_member` berstatus diblokir menghentikan pengiriman ke chat itu dan menulis audit. |
| 3.14 | unit | Update hanya berisi field tak dikenal diabaikan, generator lanjut ke update berikutnya. |

### AC-4 · Kontrol saat tidak diawasi

| AC | Cara | Bukti |
|---|---|---|
| 4.1 | unit | PID file ada, isinya PID proses, mode `0600` (pemeriksaan mode dilewati di win32 seperti `privateFile`). |
| 4.2 | unit | Handler SIGTERM dan SIGINT menghapus berkas. |
| 4.3 | unit | `caraka stop` memanggil `process.kill(pid, 'SIGTERM')` sekali. |
| 4.4 | unit | PID mati (`kill(pid, 0)` melempar ESRCH): berkas terhapus, pesan "tidak berjalan". |
| 4.5 | unit | Keluaran `status` memuat state, PID, workspace, username bot, dan tidak memuat substring token. |
| 4.6 | unit | PID hidup: `process.exitCode === 78`, `getUpdates` tidak pernah dipanggil. |
| 4.7 | unit | Telegram membalas 401, lalu 409: keduanya `process.exitCode === 78`. |
| 4.8 | e2e | 21 pesan dalam 60 detik jam palsu: pesan ke-21 masuk antrean, tepat satu balasan batas. |
| 4.9 | e2e | Fake ACP menahan prompt, jam maju 30 menit: `session/cancel` terkirim, state `cancelled`, audit tertulis. |
| 4.10 | e2e | Satu pesan startup memuat host, workspace, versi. |
| 4.11 | e2e | Restart kedua dalam 60 menit tidak mengirim pesan startup lagi. |

### AC-5 · Berkas service

| AC | Cara | Bukti |
|---|---|---|
| 5.1 | unit | stdout tidak kosong; daftar rekursif HOME sementara dan cwd identik sebelum dan sesudah perintah. |
| 5.2 | unit | Keluaran memuat `process.execPath` dan path CLI absolut yang ada di disk. |
| 5.3 | unit | Ketiga keluaran tidak memuat `sudo`. |
| 5.4 | unit | Keluaran systemd memuat `~/.config/systemd/user`, `Restart=on-failure`, `RestartSec=5`, `RestartPreventExitStatus=78`. |
| 5.5 | unit | Keluaran launchd memuat `~/Library/LaunchAgents`, `0600`, dan kalimat mulai-saat-login. |
| 5.6 | unit | Keluaran schtasks memuat `/sc ONLOGON` dan tidak memuat `/ru System`. |
| 5.7 | unit | Blok langkah manual memuat `loginctl enable-linger` bertanda opsional dengan satu kalimat konsekuensi. |
| 5.8 | unit | Workspace atau path CLI tidak ada: perintah melempar, stdout kosong. |
| 5.9 | unit | `package.json` tidak punya `preinstall`, `install`, `postinstall`. |

Ketiga template dikirim belum diuji di macOS dan Windows, sesuai §3.4 dan §6 spec.
Test di atas membuktikan isi string, bukan bahwa OS-nya menerima.

### AC-6 · Jendela trust

| AC | Cara | Bukti |
|---|---|---|
| 6.1 | e2e | `/yolo 30m` menghasilkan satu kartu bertombol; `SELECT count(*) FROM policy_grant` tetap nol sebelum tombol ditekan. |
| 6.2 | unit | `caraka trust <ws> --for 30m` menulis satu baris `granted_by = 'cli'` dengan `expires_at` terisi. |
| 6.3 | unit | INSERT langsung bermode `trusted` tanpa `expires_at` melempar constraint SQLite. |
| 6.4 | unit | `--for 61m` ditolak, nol baris. |
| 6.5 | e2e | Jendela terbuka, permintaan biasa: `allow_once` terpilih, satu baris tanpa tombol menyebut tool dan target, audit `result = 'auto'`. |
| 6.6 | e2e | Jendela terbuka, permintaan cocok daftar berisiko tinggi `security.md` §5: kartu bertombol tetap terkirim. |
| 6.7 | e2e | `/lock` menutup jendela; permintaan berikutnya kembali berkartu; audit tertulis. |
| 6.8 | unit | Baris terbuka dari proses sebelumnya tertutup saat gateway mulai. |
| 6.9 | unit | Berbagi tabel kasus AC-3.11, dijalankan sekali di luar jendela dan sekali di dalam. |
| 6.10 | e2e | Tanda tangan palsu ditolak; callback dari principal lain ditolak; penekanan sah menulis `granted_by = 'chat'` dengan `expires_at` terisi. |
| 6.11 | e2e | `/yolo` tanpa durasi ditolak, nol baris. |
| 6.12 | e2e | `/yolo 10m` saat jendela terbuka ditolak; tutup lalu buka menghasilkan dua baris audit. |
| 6.13 | unit + manual | Fake ACP menerima `session/set_mode` bernilai `bypassPermissions`; audit memuat baris pembukaan; stdout memuat kalimat bahwa keputusan izin di jendela itu tidak terlihat Caraka. Manual: satu smoke terhadap Claude Code terpasang sebelum perintah mode apa pun dikirim (spec §7). |
| 6.14 | unit | Pencarian statis: fungsi bypass hanya dirujuk dari `src/cli.ts`; nol rujukan dari `gateway.ts` dan `telegram.ts`. |
| 6.15 | unit | Saat jendela `--bypass` tertutup, ada satu baris audit penutupan dan nol baris audit per aksi untuk rentang itu. |

### AC-7 · Topic dan prasyaratnya

| AC | Cara | Bukti |
|---|---|---|
| 7.1 | unit | `doctor` dengan `has_topics_enabled: false` mencetak baris yang menyebut Threaded Mode. |
| 7.2 | unit | `doctor` mencetak `allows_users_to_create_topics` dan nama opsi @BotFather. |
| 7.3 | e2e | Topic mati: mode linear, `createForumTopic` tidak pernah dipanggil. |
| 7.4 | e2e | Sepanjang sesi DM, mock Telegram tidak pernah menerima `closeForumTopic`. |
| 7.5 | e2e | Sesi selesai memanggil `editForumTopic`; `deleteForumTopic` nol kali. |
| 7.6 | — | **Kembali ke spec.** Lihat §6. |

### AC-7b · Grup

| AC | Cara | Bukti |
|---|---|---|
| 7b.1 | e2e | Pesan dari chat di luar allowlist chat tidak sampai ke fake ACP. |
| 7b.2 | e2e | Chat di allowlist, pengirim di luar allowlist pengirim: diabaikan, audit `denied`. |
| 7b.3 | e2e | `my_chat_member` penambahan bot mengirim konfirmasi ke chat id operator, bukan ke chat id grup. |
| 7b.4 | e2e | Tanda tangan palsu dan principal salah sama-sama ditolak; allowlist chat tidak berubah. |
| 7b.5 | unit | Teks konfirmasi grup memuat kalimat pengungkapan pada katalog `en` dan `id`. |
| 7b.6 | unit | Nol pemanggilan method hak admin di seluruh suite; nol rujukan `is_ephemeral` sebagai kontrol. |
| 7b.7 | e2e | Supergroup forum dengan `can_manage_topics`: satu topic per sesi. Tanpanya: mode linear dengan header sesi. |
| 7b.8 | e2e | Callback approval dari principal di luar allowlist ditolak dan diaudit, baik dari DM maupun dari grup. Ini mengunci perilaku `gateway.ts:357` yang sudah ada, karena seluruh dukungan grup bertumpu padanya. |

### AC-8 · Urutan panduan instalasi

| AC | Cara | Bukti |
|---|---|---|
| 8.1 | manual | Buka `docs/install-guide.md`, catat nomor baris tabel prasyarat dan heading prompt; heading prompt harus tepat setelahnya, sebelum heading jalur instalasi. |
| 8.2 | unit | vitest atas `site/src/data/install.ts`: indeks bagian prompt lebih kecil daripada indeks bagian pemilihan jalur, di `toc` maupun di urutan render. |
| 8.3 | unit + manual | vitest memastikan copy `/install` memuat kalimat token; manual memastikan kalimat yang sama ada di panduan. |
| 8.4 | e2e | Jalankan ulang pemeriksaan tinggi; bila `/install` bergeser dari 5047, baseline diperbarui dan komentarnya menyatakan angka itu diukur dari keluaran situs, bukan dari comp. |

### AC-9 · Dokumen

| AC | Cara | Bukti |
|---|---|---|
| 9.1 | manual | Tabel §4 spec dipakai sebagai daftar periksa. Tiap baris ditandai selesai dengan `berkas:baris` hasil perbaikan, atau dengan kalimat penanda "dispesifikasikan, belum di v0.2" yang dikutip apa adanya. Enam belas baris, enam belas centang. |
| 9.2 | manual | Baca paragraf jendela trust di `docs/security.md`; keenam pernyataan AC-9.2 harus ada, dan kalimat mode `--bypass` harus menyatakan bahwa Caraka tidak melihat keputusannya. |
| 9.3 | manual | `docs/security.md:63` membawa penanda belum-terverifikasi. |
| 9.4 | manual | Cari `grup` di `docs/` dan kedua README; setiap kalimat menggambarkan perilaku yang benar-benar dikirim AC-7b, atau ditandai belum ada. Rumusan AC ini mendahului §2b.2 — lihat §6. |

---

## 6. AC yang dikembalikan ke spec

Tiga hal tidak bisa dibuktikan apa adanya. Ketiganya kecil dan tidak menyentuh
keputusan §2b.

**AC-7.6 bertabrakan dengan AC-7b.1.** Yang satu menolak setiap update dari chat
bertipe `group`, `supergroup`, atau `channel`; yang lain memproses pesan dari
grup yang ada di allowlist chat. Keduanya bisa diuji sendiri-sendiri dan tidak
bisa lulus bersama. AC-7.6 adalah aturan sebelum pembalikan §2b.2 dan perlu satu
kalimat baru: menolak update dari chat bertipe `channel`, dan dari `group` atau
`supergroup` yang **tidak ada di allowlist chat**. Sampai kalimat itu ada di
spec, AC-7.6 tidak masuk plan dan T7 dibangun terhadap AC-7b.

**Batas panjang tombol di AC-3.10 tidak punya sumber.** Standar §3 melarang angka
tanpa sumber, dan Bot API tidak menerbitkan batas teks `InlineKeyboardButton`.
Ukur sekali terhadap bot nyata dengan menaikkan panjang label sampai `sendMessage`
ditolak, catat angkanya di spec, baru test memakainya. Sampai itu terjadi,
implementasi memotong pada 64 karakter dan test menyebutnya sementara.

**AC-9.4 dirumuskan sebelum §2b.2.** Setelah AC-7b, grup bukan lagi rancangan
melainkan perilaku terkirim, jadi larangan "menyatakan sebagai rencana yang sudah
dirancang" berlaku ke arah yang berbeda. Yang dimaksudkan tetap terbaca dan tetap
bisa gagal: dokumen menggambarkan apa yang dikirim, bukan apa yang direncanakan.
Satu kalimat perbaikan di spec cukup, dan pembalikan §2b.2 tidak disentuh.

---

## 7. Risiko

**`docs/erd.md` dan skema tidak boleh saling mendahului.** Hari ini ERD baris
78–88 membatasi `policy_grant.granted_by` ke `config|cli` dan memberinya anotasi
"**tidak pernah** `chat`". AC-6.10 menulis `chat`. Dua aliran memegang dua
setengahnya: tool memiliki CHECK constraint di `src/store/db.ts`, docs memiliki
tabel dan anotasi di `docs/erd.md`.

Yang menjaga keduanya sama:

1. Skema mendarat lebih dulu (T6), dengan `CHECK(granted_by IN ('config','cli','chat'))`.
2. Test T6 mengunci keduanya: `chat` diterima, nilai di luar ketiganya ditolak,
   dan `trusted` tanpa `expires_at` ditolak. Kalau dokumen nanti melenceng, test
   tetap menyimpan kebenarannya.
3. Aliran docs menyalin teks constraint dari `db.ts` apa adanya ke ERD, dan
   mengganti anotasi lama dengan aturan yang sebenarnya: `chat` sah hanya lewat
   callback bertanda tangan sekali pakai AC-6.10, dan `expires_at` tetap wajib.
4. D2 tidak dimulai sebelum T6 hijau, dan langkah manual AC-9.1 memasukkan
   pencarian `granted_by` di seluruh `docs/` sebagai baris periksa tersendiri.

Baris "tidak pernah chat" bukan sekadar dokumentasi basi. Ia dulu satu-satunya
tempat larangan itu tertulis, dan menghapusnya tanpa menaruh batas baru di
sebelahnya menghilangkan alasannya. Batas barunya adalah tanda tangan callback,
lingkup satu workspace, dan `expires_at` wajib.

**Sisanya, lebih pendek.**

- Script inline di `<head>` adalah satu-satunya hal yang bisa mendahului lukisan
  pertama. Situs belum punya header CSP maupun `_headers`; kalau CSP dipasang
  nanti, script itu butuh hash dan AC-1.4 gagal diam-diam. Dicatat di
  `site/AGENTS.md` bersama catatan penyimpangan label.
- Katalog bahasa menyentuh hampir setiap berkas `src/`. T2 mendarat sebelum T3
  sampai T7 supaya langkah berikutnya menambah kunci, bukan menulis ulang string
  yang sudah dipindahkan.
- Kartu approval hidup sepuluh menit (`gateway.ts:283`) dan balasan ephemeral
  Telegram hanya berlaku 15 detik setelah aksi yang memenuhi syarat. Keduanya
  tidak bisa disusun menjadi satu kontrol, jadi ephemeral tidak dipakai sebagai
  kontrol di mana pun (AC-7b.6), dan kalimat pengungkapan AC-7b.5 yang
  menggantikannya.
- Jam palsu untuk AC-4.8, AC-4.9, dan AC-4.11 memakai `t.mock.timers` bawaan
  `node:test`. Kalau ada timer yang lolos dari mock, gejalanya test lambat, bukan
  test merah; batasi mock ke `setTimeout` dan `Date`.
- `gateway.ts` tumbuh dari 507 baris. Anggaran kompleksitas `AGENTS.md` adalah
  ~8.000 baris untuk core dan masih longgar, tetapi kalau T6 dan T7 mendorongnya
  melewati ~900 baris, yang dipisah adalah jendela trust ke `src/core/trust.ts`,
  bukan sebuah lapisan abstraksi baru.

---

## 8. Keluaran verifikasi

Belum dijalankan. Diisi sebelum pekerjaan ditutup, dengan keluaran perintah apa
adanya.

```bash
npm run lint && npm run typecheck && npm test && npm run e2e && npm run build
cd site && npm run check && npm run e2e
npm run smoke      # butuh Claude Code terpasang dan sudah login
```

Ditambah dua pemeriksaan yang tidak dilakukan alat: tidak ada rahasia di diff,
dan prosa diperiksa terhadap bagian *Writing style* di `AGENTS.md`.

Syarat selesai spec §6 menambahkan satu langkah manusia: satu penguji beta
menjalankan Caraka dari unit systemd yang dicetak, menutupnya dengan
`caraka stop`, lalu melaporkan bahwa `caraka status` mengatakan hal yang benar di
kedua keadaan.
