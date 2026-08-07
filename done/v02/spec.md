# Spec — Caraka v0.2

**Slug:** `v02` · **Tanggal:** 7 Agustus 2026
**Standar:** [`standards/ears.md`](../../standards/ears.md)
**Fase roadmap:** 2 — "Install yang mulus"

---

## 1. Yang benar hari ini

Semua angka di bawah diukur di repositori ini pada 7 Agustus 2026, bukan dikutip dari dokumen.

**Alat.** `src/` berisi 1.468 baris di tujuh berkas. `src/cli.ts:256-259` melayani tiga subcommand: `init`, `doctor`, `start`. Tidak ada PID file, tidak ada `stop`, tidak ada `status`. Tidak ada rate limiter dan tidak ada batas durasi run di `src/core/gateway.ts`; satu-satunya timer adalah TTL approval 10 menit dan backoff `retry_after`.

**Bahasa alat.** Sekitar 41 string yang dilihat pengguna berbahasa Indonesia, tersebar di `src/cli.ts`, `src/core/gateway.ts`, `src/channels/telegram.ts`, dan `src/drivers/claude-acp.ts`. `README.md`, deskripsi npm, dan 9 dari 13 rute situs berbahasa Inggris. `src/config.ts:8-23` tidak punya field bahasa.

**Konfirmasi pairing.** `src/cli.ts:149` sudah menerima `y`, `ya`, dan `yes`; apa pun selain itu membatalkan. Permintaan "terima `y`, jangan wajibkan `ya`" **sudah terpenuhi di kode**. Yang belum ada adalah test yang menjaganya.

**Perintah Telegram.** `setMyCommands` tidak dipanggil di mana pun kecuali disebut di `docs/telegram-integration.md:88`. Menu perintah bot kosong. `src/core/gateway.ts:74-79` melayani `/stop`, `/status`, `/help`, `/start`, `/new`; slash command lain diteruskan ke Claude sebagai teks prompt, termasuk salah ketik.

**Yang dibuang dari ACP.** `src/core/gateway.ts:268-273` mengembalikan string kosong untuk setiap `sessionUpdate` selain `agent_message_chunk`. Dua belas jenis update lain — termasuk `available_commands_update`, `usage_update`, `config_option_update`, `tool_call` — masuk lalu hilang. `src/drivers/claude-acp.ts:51-54` mengirim `clientCapabilities: {}`.

**Tombol approval.** `src/core/gateway.ts:280-281` memilih opsi berdasarkan `kind` dan tidak pernah membaca `PermissionOption.name`; `:305` menulis label "Setujui sekali" untuk setiap keputusan, apa pun yang sebenarnya disetujui.

**Update Telegram.** `src/channels/telegram.ts:132` mengirim `allowed_updates: ["message", "callback_query"]`. `my_chat_member` tidak pernah tiba, sehingga jalur "bot diblokir user" tidak bisa dijalankan.

**Basis data.** `src/store/db.ts` punya tiga tabel: `sessions`, `approvals`, `audit`. Tidak ada `policy_grant`, tidak ada kolom mode, tidak ada tabel workspace. Tidak ada yang menegakkan kedaluwarsa apa pun.

**Situs.** Tiga belas rute, dua belas comp di `design/mockups/`, dan dua belas `document.body.scrollHeight` yang dipatok di `site/e2e/site.spec.ts:201`. Empat rute berbahasa Indonesia (`site/src/lib/site.ts:139,148,166,175`), sembilan berbahasa Inggris; tidak ada hreflang, tidak ada `x-default`, tidak ada pemilih bahasa. Tidak ada header CSP dan tidak ada `_headers`.

**Veil situs.** Hanya rute `/` yang punya veil pembuka (`site/src/pages/index.astro:17-31`). Teksnya `MEMBUKA GERBANG` — Indonesia, di halaman yang menyatakan `lang="en"`. Animasinya `ck-veil 2.6s` murni CSS (`site/src/styles/pages/landing.css:31`), tanpa state, jadi ia **main ulang di setiap muat halaman**. Karena `position: fixed`, veil tidak menyumbang tinggi; baseline `/` = 6390 tidak terpengaruh perubahan teksnya. `site/src/scripts/ck.js` dimuat sebagai modul, yaitu setelah parse — apa pun yang menyembunyikan veil harus berjalan lebih awal dari itu.

**Panduan instalasi.** Prompt copy-paste ada di urutan terakhir di kedua tempat: `docs/install-guide.md:102` (setelah jalur utama, verifikasi, start, approval, dan instalasi global) dan bagian 06 dari 07 di `/install` (`site/src/data/install.ts:16`).

---

## 2. Ruang lingkup

Enam pekerjaan, semuanya berlabuh ke pertanyaan Fase 2: bisakah orang lain memasangnya tanpa bantuan, lalu meninggalkannya berjalan tanpa berbohong soal apa yang dijaganya.

1. Veil situs berbahasa Inggris, dan dimainkan sekali per sesi tab.
2. Bahasa antarmuka alat: default Inggris, katalog `en`/`id`, dipilih sekali saat `init`.
3. Perintah Telegram terdaftar lewat `setMyCommands`, ditambah update ACP yang selama ini dibuang seperlunya untuk membuat perintah itu jujur.
4. Kontrol yang menjadi wajib begitu proses tidak diawasi: `stop`, `status`, PID file, rate limit, batas durasi run.
5. `caraka service --print` yang **mencetak** unit systemd/launchd/schtasks dan tidak memasang apa pun.
6. Jendela `trust` dari terminal dengan kedaluwarsa yang ditegakkan basis data, plus `/lock` dari chat. Ini adalah jawaban untuk permintaan "YOLO mode"; alasannya di §3.

Ditambah perbaikan dokumen di §4, yang bukan pekerjaan terpisah melainkan syarat agar keenam hal di atas tidak menambah kebohongan baru.

---

## 2b. Dua keputusan yang dibalik

Keduanya ditolak di draf pertama spec ini, dengan alasan yang ditulis panjang. Pemilik menimbang ulang dan memutuskan sebaliknya, dan keputusan itu diterima. Alasan penolakan aslinya tidak dihapus — ia tetap di bawah, karena sebagian besar isinya masih benar dan membentuk batas dari apa yang akhirnya dikirim.

### 2b.1 `bypassPermissions` sebagai tingkat kedua — dibatasi, bukan ditolak

Pemilik meminta YOLO bisa dinyalakan dari Telegram, dan setelah penolakan pertama ia menegaskannya lagi dengan alasan yang benar: `bypassPermissions` memang fitur Claude, di mesinnya sendiri. Keputusan itu diterima. Yang tidak diterima adalah menyamakan dua hal yang berbeda.

Ada dua mekanisme yang sama-sama menghasilkan "tidak perlu menekan setuju", dan hanya satu yang menyisakan Caraka di dalam lingkaran:

| | Caraka menerima `session/request_permission` | Daftar berisiko tinggi | Audit per aksi | `/lock` |
|---|---|---|---|---|
| Jendela trust Caraka (AC-6) | ya | tetap memicu kartu | ada | menutup seketika |
| `bypassPermissions` Claude | **tidak** | dilewati | tidak mungkin | tidak berpengaruh pada aksi berjalan |

Baris kedua bukan pilihan gaya. Adapter `claude-agent-acp` 0.63.0 meneruskan `allowDangerouslySkipPermissions` ke setiap sesi di mesin non-root; begitu mode itu terpasang, adapter menjawab izin secara lokal dan berhenti mengirim `session/request_permission` sama sekali. Caraka tidak menyetujui apa pun secara otomatis — ia **tidak pernah diberi tahu** bahwa ada keputusan. Docs Claude sendiri menulis mode itu *"offers no protection against prompt injection or unintended actions"* dan menyarankannya hanya di lingkungan terisolasi.

Karena itu keduanya dikirim, dengan jalur yang berbeda:

- **Tingkat satu, dari chat.** Jendela trust Caraka. Dibuka lewat `/yolo <durasi>`, dikonfirmasi dengan callback bertanda tangan sekali pakai — bukan teks chat — berlingkup satu workspace, wajib berdurasi, tertutup sendiri saat kedaluwarsa dan saat proses mulai ulang. Ini yang menjadi default `/yolo`, karena ia memberi pengalaman yang diminta tanpa membuang satu pun properti keamanan.
- **Tingkat dua, dari terminal.** `caraka trust <workspace> --bypass --for <durasi>`. Menyalakan mode Claude yang sebenarnya. Tetap dari terminal, bukan karena chat kurang aman untuk mengotorisasi, melainkan karena begitu mode itu menyala Caraka tidak punya apa pun lagi untuk ditegakkan — dan keputusan untuk melepas penjaganya sendiri pantas diambil di depan mesinnya.

Yang tetap dilarang, dan ini yang membuat sisanya bisa dipercaya: Caraka tidak pernah memilih opsi ber-`kind` `allow_always`, dan tidak pernah merender opsi izin milik `ExitPlanMode` sebagai tombol. Jalur itu akan menaruh tombol bypass satu ketukan di chat pribadi tanpa durasi, tanpa lingkup, dan tanpa jejak.

Audit untuk tingkat dua mencatat jendelanya, bukan isinya, dan mengatakannya apa adanya: dari kapan sampai kapan, oleh siapa, untuk workspace mana, dan bahwa keputusan izin selama jendela itu diambil agent. Berpura-pura mengawasi sesuatu yang tidak terlihat lebih buruk daripada mengakui tidak melihatnya.

### 2b.2 Grup — masuk lingkup lewat allowlist, dengan satu hal yang tidak bisa direkayasa hilang

Penolakan pertama bertumpu pada satu kalimat: kartu approval di grup terbaca semua anggota. Itu masih benar, dan tetap benar setelah perubahan ini. Yang berubah adalah penilaian atas siapa "semua anggota" itu.

Ancaman yang penting bukan pengungkapan, melainkan **persetujuan tak berwenang** — dan itu sudah tertutup. Callback approval terikat principal; `src/core/gateway.ts:357` menolak callback dari siapa pun di luar allowlist. Anggota grup yang menekan tombol tanpa berada di allowlist tidak menyetujui apa pun.

Yang tersisa murni pengungkapan: kartu approval, path berkas, diff, dan keluaran perintah terbaca setiap anggota grup. Ephemeral tidak menyelamatkan ini — ia hanya berlaku 15 detik setelah aksi yang memenuhi syarat, sedangkan kartu approval hidup sepuluh menit (`gateway.ts:283`). Menjadikan bot admin grup membuka ephemeral tanpa jendela itu, tetapi sekaligus mematikan privacy mode sehingga bot menerima setiap pesan di grup. Keduanya tidak bisa dipisahkan.

Jadi pengungkapan tidak direkayasa hilang. Ia dinyatakan: **memasukkan grup ke allowlist berarti memilih untuk memperlihatkan pekerjaan itu kepada anggotanya.** Kalimat itu wajib muncul saat pairing grup, bukan hanya di dokumen.

Yang dikirim:

- Allowlist grup terpisah dari allowlist pengirim. Sebuah pesan diproses hanya bila chat-nya di allowlist **dan** pengirimnya di allowlist. Dua daftar, dua keputusan.
- Pairing grup lewat `my_chat_member`: saat bot ditambahkan, gateway mengirim kode ke DM operator, dan konfirmasinya di DM — bukan di grup itu sendiri, supaya yang mengotorisasi terbukti orang yang sama dengan pemilik pairing DM.
- Privacy mode tetap **menyala**. Bot hanya menerima perintah dan balasan atas pesannya sendiri. Caraka tidak pernah meminta hak admin grup.
- Topic di grup dipakai bila tersedia, dengan mode linear sebagai jalur mundur. Prasyaratnya supergroup ber-flag forum dan bot admin dengan `can_manage_topics`; karena Caraka tidak meminta admin, topic di grup hanya berfungsi bila operator memberikannya sendiri. Bila tidak, mode linear — dan itu bukan kegagalan.

Yang tidak dikirim: bot sebagai admin grup, ephemeral sebagai kontrol yang diandalkan, dan output sensitif yang diperlakukan berbeda di grup dibanding DM. Kalau sesuatu terlalu sensitif untuk dilihat anggota grup, tempatnya bukan di grup.

## 3. Yang tidak dikerjakan

### 3.1 Bahasa selain Inggris dan Indonesia

Tionghoa dan Jepang tidak dikirim di v0.2, dan tidak dijadikan baris roadmap yang tampak seperti janji. Biayanya konkret: `site/scripts/gen-assets.mjs` memuat subset latin ~20KB dan `site/test/og-glyphs.test.js` menggagalkan build untuk karakter di luar subset itu, jadi satu kartu OG CJK menuntut font CJK berukuran megabyte di pipeline; dua belas kartu OG per locale; baseline tinggi per locale tanpa comp untuk mengukurnya; dan 55 string dirawat oleh orang yang tidak bisa membacanya. Kunci yang **hilang** gagal di `tsc` dan itu gratis. Kunci yang **basi** — pesan galat Jepang yang masih menjelaskan perilaku v0.1 — lolos typecheck dan terkirim, dan pemeliharanya justru satu-satunya orang yang tidak bisa menyadarinya.

`zh` juga bukan satu bahasa untuk keperluan pemeliharaan. Memilih `zh` polos berarti memilih satu aksara diam-diam dan mengeluarkan pembaca aksara satunya; memilih `zh-Hans` dan `zh-Hant` menggandakan pekerjaan dengan jujur. Keputusan itu diambil kalau ada yang memintanya, bukan sekarang.

Syarat masuk: satu permintaan nyata dari pengguna, dan satu orang yang bisa membaca bahasa itu untuk meninjau string basi.

### 3.2 i18n situs, rute terjemahan, dan pemilih bahasa

Tidak dikerjakan. Empat rute brand berbahasa Indonesia **bukan terjemahan** dari apa pun — tidak ada versi Inggris yang bisa dijadikan alternate. Google mengabaikan anotasi hreflang yang tidak saling menunjuk, jadi menambahkan hreflang hari ini menghasilkan markup yang benar-benar tidak berpengaruh. `<html lang>` sudah menyatakan bahasa tiap halaman dengan benar lewat `site/src/lib/site.ts:45`.

Menerjemahkan satu rute juga memutus satu-satunya pagar kesetiaan yang dipunyai situs: `site/e2e/site.spec.ts:201` memaku tinggi dua belas rute pada angka yang diukur terhadap comp-nya masing-masing, dan `site/scripts/compare-to-mockup.mjs` menampilkan hasil build di samping comp untuk dinilai mata. Rute `/id/...` tidak punya comp di sisi kanan. Pagar pertama gagal merah; pagar kedua merosot diam-diam, yang lebih buruk.

Syarat masuk: satu rute benar-benar ada dalam dua bahasa. Saat itu terjadi, yang dipasang adalah `i18n` di `astro.config.mjs` plus opsi `i18n` pada `@astrojs/sitemap` yang sudah terpasang — bukan Worker, bukan cookie, bukan pengalihan berbasis header. `output: 'static'` tanpa adapter berarti `Astro.preferredLocale` tidak tersedia, dan `_redirects` aset statis Cloudflare tidak bisa mengalihkan berdasarkan negara atau bahasa.

### 3.3 Deteksi bahasa per pesan

Tidak dibangun, dan janjinya dicabut dari dokumen (§4). Prosa Claude sudah mengikuti bahasa prompt karena itu perilaku Claude, bukan perilaku Caraka. Untuk ~55 string milik Caraka sendiri, deteksi berarti menebak dari masukan seperti `fix the build`, `npm test failing`, atau stack trace Java yang ditempel — kasus terburuk untuk setiap detektor. Kegagalan yang terlihat adalah dua perintah identik berturut-turut dijawab dalam dua bahasa berbeda. Untuk satu operator, nilai yang ia set sekali lebih dapat diprediksi.

### 3.4 Memasang service, dan "auto-start saat boot"

`caraka service` mencetak; ia tidak pernah menulis berkas, tidak pernah memanggil `systemctl`, `launchctl`, atau `schtasks`, dan paket tidak akan pernah punya hook `postinstall`. Yang juga tidak dikerjakan: unit systemd sistem, `/Library/LaunchDaemons`, `sc.exe create`, `schtasks /ru System`, dan kalimat `sudo` mana pun di keluaran Caraka sendiri. Semua itu menjalankan jembatan sebagai root atau SYSTEM, di luar sesi login yang memegang kredensial Claude — lebih berbahaya sekaligus lebih tidak berfungsi.

Di macOS, jawaban jujurnya adalah **mulai saat login**, bukan saat boot. Agent per-user di `~/Library/LaunchAgents` dimuat saat user login dan dimatikan saat logout; "saat boot" menuntut daemon root. Ini ditulis apa adanya, tidak disamarkan.

Template launchd dan schtasks tidak bisa diuji di mesin pengembang. Keduanya dikirim sebagai string literal tanpa percabangan, dan statusnya belum terverifikasi sampai ada penguji beta yang menjalankannya.

`loginctl enable-linger` bukan bagian dari keluaran unit. Ia adalah langkah opt-in terpisah dengan kalimatnya sendiri, karena di situlah profil risikonya berubah.

### 3.5 Perintah chat yang menunggu lapisan lain

`/mode`, `/model`, `/sessions`, `/resume`, `/switch`, `/ws`, `/pin`, `/unpin`, `/ingat`, `/lupakan`, `/memori`. Empat yang pertama menuntut Caraka membaca `configOptions` dari respons `session/new` dan aliran `config_option_update`; sisanya menunggu Fase 3 dan Fase 4. `/mode` juga tidak boleh mengeraskan nama mode milik Claude: id mode adalah string spesifik per agent (Codex memakai `read-only`/`agent`/`agent-full-access`, Gemini memakai nama lain), jadi ia harus dirender dari kawat kalau nanti dibuat.

### 3.6 `_session/steering`

Pesan yang dikirim saat run sedang berjalan masuk antrean Caraka dan diterapkan setelah hal yang hendak dikoreksinya selesai (`src/core/gateway.ts:82-100`). Adapter Claude menyediakan `_session/steering` yang menyisipkan pesan ke turn yang sedang berjalan. Ini celah kegunaan terbesar di permukaan perintah dan tidak butuh perintah baru — tetapi ia method ekstensi ber-prefiks underscore yang harus dideteksi per agent, dan v0.2 sudah membawa enam pekerjaan. Kandidat pertama untuk v0.3.

### 3.7 Menutup sesi lewat `closeForumTopic` di DM

Dihapus dari rencana, bukan ditunda. Lihat §4.

### 3.8 Sisa yang tetap di luar

`clientCapabilities` untuk `fs/*`, `terminal/*`, dan `elicitation`. Block terstruktur Rich Message, `sendRichMessageDraft`, dan streaming draft. Tombol Mini App atau `web_app` apa pun — keduanya menuntut origin HTTPS yang justru merupakan kelas risiko yang dihindari long-polling. Multi-workspace. Verb CLI `logs`, `pair`, `audit`, `session`, `config`, `ws`. Uninstall bersih (`roadmap.md:58`) tetap di Fase 2 tetapi bukan bagian spec ini.

---

## 4. Kontradiksi dengan `docs/` yang harus diperbaiki

Setiap baris di bawah adalah dokumen yang menyatakan sesuatu yang tidak didukung dokumentasi resmi atau tidak didukung kode. Perbaikannya masuk PR yang sama dengan pekerjaan yang menyentuhnya.

| Berkas | Baris | Yang tertulis | Yang benar |
|---|---|---|---|
| `telegram-integration.md` | 28 | "Menutup sesi \| `closeForumTopic`" | `closeForumTopic` dan `reopenForumTopic` didokumentasikan **hanya untuk supergroup**. Klausa "or a private chat with a user" ada di `createForumTopic`, `editForumTopic`, `deleteForumTopic`, dan `unpinAllForumTopicMessages` — tidak di keduanya. `editForumTopic` versi Bot API hanya mengekspos `name` dan `icon_custom_emoji_id`, tanpa flag `closed`. Satu-satunya alternatif di DM adalah `deleteForumTopic`, yang menghapus seluruh transkrip. |
| `roadmap.md` | 16 | Fase 0 merencanakan `closeForumTopic` di DM | Sama seperti di atas. Butir spike diubah menjadi `editForumTopic` + `icon_color`. |
| `telegram-integration.md` | 50 | "tidak ada `editRichMessage`" sebagai alasan tidak meng-edit pesan menjadi rich | Nama method itu memang tidak ada, tetapi kemampuannya ada: `editMessageText` menerima parameter `rich_message` sejak Bot API 10.1. Pola kirim-baru + hapus-lama boleh tetap dipakai, alasannya yang harus diganti. Apakah laporan lapangan aslinya masih tereproduksi belum diuji ulang. |
| `telegram-integration.md` | 30 | `RichBlockThinking` | Kelas yang dapat dikirim adalah `InputRichBlockThinking`; `RichBlockThinking` adalah sisi terima dan "can't be received in messages". |
| `telegram-integration.md` | 88 | perintah "didaftarkan lewat `setMyCommands`" dengan scope "private" | Tidak ada pemanggilan `setMyCommands` di `src/`, dan tidak ada scope bernama `private`. Nama yang benar `BotCommandScopeAllPrivateChats`. v0.2 memakai `BotCommandScopeChat` per operator (AC-3.1). |
| `telegram-integration.md` | 90-96 | kolom ketiga berjudul `is_ephemeral` berisi kalimat deskripsi | `is_ephemeral` adalah field boolean pada `BotCommand`. Judul kolom atau isinya salah; perbaikannya mengganti judul menjadi "Fungsi". |
| `telegram-integration.md` | 123 | "Bot diblokir user → tandai identity revoked" | Tidak dapat dijangkau: `my_chat_member` adalah satu-satunya sinyal blokir dan tidak ada di `allowed_updates` (`src/channels/telegram.ts:132`). AC-3.12 memperbaikinya di kode. |
| `telegram-integration.md` | 106 | "`setMyDefaultAdministratorRights` minimal; group privacy mode ON kecuali dibutuhkan" | Bertentangan dengan alur ephemeral di baris 32 dokumen yang sama. Bot admin grup selalu menerima seluruh pesan grup; privacy mode dan ephemeral tanpa jendela 15 detik tidak bisa dimiliki bersamaan. |
| `security.md` | 38, 58 | ephemeral sebagai kontrol yang selalu ada untuk output sensitif di grup | Berlaku hanya dalam 15 detik setelah aksi masuk yang memenuhi syarat, atau bila bot adalah admin. Kartu approval tak terminta tidak memenuhi keduanya. |
| `security.md` | 63 | "access whitelist granular untuk bot langsung di @BotFather" | Mekanisme API-nya nyata (`BotAccessSettings`, `getManagedBotAccessSettings`/`setManagedBotAccessSettings`, Bot API 10.0, 8 Mei 2026) dan tanggalnya cocok — tetapi keduanya terdokumentasi di bawah **Managed Bots** dan mengalamatkan bot lewat `user_id` bot terkelola. Apakah bot biasa buatan @BotFather punya tombol itu **belum diverifikasi**. Kalimatnya diberi tanda belum-terverifikasi sampai ada yang membuka @BotFather dan memeriksanya. |
| `security.md` | 126-133 | tabel rate limit (20 pesan/menit, run 30 menit) | Tidak ada di kode. AC-4.6 dan AC-4.7 membangunnya. |
| `security.md` | 151-153 | `caraka stop`, `pair revoke --all`, `audit` sebagai respons insiden | `src/cli.ts` melayani `init`, `doctor`, `start`. Saklar mati satu-satunya hari ini adalah Ctrl-C di terminal yang terlihat. AC-4.3 membangun `stop`; `pair revoke` dan `audit` tetap ditandai belum ada. |
| `frd.md` | 189 (FR-OPS-02) | P0: `start`, `stop`, `status`, `logs`, `doctor`, `pair`, `audit`, `session`, `config` | Tiga dari sembilan ada. v0.2 menambah dua. Sisanya ditandai "dispesifikasikan, belum di v0.2". |
| `frd.md` | 189-190 (FR-OPS-03), `techstack.md` 94 | install service launchd/systemd | Windows tidak disebut di keduanya, padahal CLI-nya tiga platform. Diperbaiki menjadi tiga template, dan kata "install" diganti "cetak". |
| `frd.md` | 207 (NFR-09), `brand.md` 256, `ui-ux.md` 16 | bahasa antarmuka dideteksi dari bahasa pesan | Tidak dibangun dan tidak akan (§3.5). Ketiganya ditulis ulang: prosa agent mengikuti bahasa user karena Claude melakukannya; chrome Caraka mengikuti `language` di config. |
| `ui-ux.md` | 62-73, 171-183 | dua belas perintah chat, dua belas verb CLI | Lima dan tiga terpasang. Setiap baris yang belum ada diberi penanda, seperti yang sudah dilakukan `roadmap.md`. |
| `erd.md` | 78-88, `security.md` §4 butir 3 | `policy_grant` dengan `expires_at` wajib, constraint level basis data | `src/store/db.ts` tidak punya tabel itu. AC-6 membangunnya; sampai mendarat, klaim "ditegakkan constraint" benar tentang desain dan salah tentang build. |
| `install-guide.md` | 136 | "rilis ini belum menyediakan service latar" | Tetap benar setelah v0.2: Caraka mencetak unit, tidak memasangnya. Kalimatnya diperjelas, tidak dihapus. |

---

## 5. Acceptance criteria

### AC-1 · Veil situs

- **AC-1.1** Situs shall menampilkan veil pembuka hanya pada rute `/`.
- **AC-1.2** Situs shall menuliskan label veil dalam bahasa Inggris, sesuai `lang` yang dinyatakan rute `/`.
- **AC-1.3** WHEN `/` dibuka pertama kali dalam satu sesi tab, situs shall memainkan animasi `ck-veil` penuh 2,6 detik.
- **AC-1.4** WHILE sesi tab sudah menandai veil pernah dimainkan, WHEN `/` dimuat lagi, situs shall menyembunyikan veil sebelum bingkai pertama dilukis.
- **AC-1.5** IF `sessionStorage` melempar atau tidak tersedia, THEN situs shall memainkan veil seperti kunjungan pertama.
- **AC-1.6** Perubahan veil shall tidak mengubah `document.body.scrollHeight` rute `/` dari 6390.
- **AC-1.7** `site/AGENTS.md` shall mencatat label veil sebagai penyimpangan sengaja dari `design/mockups/Caraka Landing.dc.html`, dengan alasannya.

### AC-2 · Bahasa antarmuka alat

- **AC-2.1** Alat shall memakai bahasa Inggris untuk setiap string yang dilihat pengguna bila tidak dikonfigurasi lain.
- **AC-2.2** `config.yaml` shall menerima field opsional `language` bernilai `en` atau `id`.
- **AC-2.3** WHERE `config.yaml` tidak memuat `language`, alat shall memakai `en` dan tetap memuat config lama tanpa menaikkan `version`.
- **AC-2.4** WHEN `caraka init` berjalan, wizard shall menawarkan pilihan bahasa dengan nilai bawaan dari `navigator.language`.
- **AC-2.5** IF `navigator.language` tidak tersedia atau tidak memetakan ke locale yang didukung, THEN wizard shall memakai `en` sebagai bawaan.
- **AC-2.6** IF katalog `id` kehilangan satu kunci yang ada di katalog `en`, THEN `npm run typecheck` shall gagal.
- **AC-2.7** Alat shall tidak menentukan bahasa keluarannya dari isi pesan masuk.
- **AC-2.8** Alat shall tidak membaca `User.language_code` Telegram saat runtime untuk memilih bahasa.
- **AC-2.9** WHEN wizard meminta konfirmasi pairing, ia shall menerima `y`, `ya`, dan `yes` tanpa memandang nilai `language`.
- **AC-2.10** IF jawaban konfirmasi pairing selain ketiga kata itu, termasuk baris kosong, THEN wizard shall membatalkan dan tidak menulis konfigurasi apa pun.

### AC-3 · Perintah Telegram

- **AC-3.1** WHEN gateway mulai, ia shall memanggil `setMyCommands` dengan `BotCommandScopeChat` untuk setiap id di `telegram.allowFrom`.
- **AC-3.2** Setiap nama perintah yang didaftarkan shall terdiri dari 1–32 karakter huruf kecil `a-z`, angka, dan garis bawah, dengan deskripsi 1–256 karakter.
- **AC-3.3** IF `setMyCommands` ditolak Telegram, THEN gateway shall tetap berjalan dan mencatat satu baris audit.
- **AC-3.4** WHEN `available_commands_update` diterima, gateway shall menyimpan daftar terakhir untuk sesi itu.
- **AC-3.5** WHEN sebuah pesan diawali `/` dan namanya bukan perintah gateway dan tidak ada di daftar perintah agent yang tersimpan, gateway shall menolaknya dengan pesan yang menyebut `/commands`, dan tidak meneruskannya sebagai prompt.
- **AC-3.6** WHERE daftar perintah agent belum pernah diterima untuk sesi itu, gateway shall meneruskan slash command tak dikenal ke agent apa adanya.
- **AC-3.7** WHEN `/commands` diterima, gateway shall mengirim daftar perintah agent yang tersimpan.
- **AC-3.8** WHEN `usage_update` diterima, gateway shall menyimpan `used`, `size`, dan `cost` terakhir untuk sesi itu.
- **AC-3.9** WHERE belum ada `usage_update` untuk sesi itu, WHEN `/usage` diterima, gateway shall menyatakan bahwa agent belum melaporkan pemakaian.
- **AC-3.10** Gateway shall menuliskan `PermissionOption.name` pada tombol approval, dipotong ke batas panjang tombol Telegram.
- **AC-3.11** IF sebuah `RequestPermissionResponse` akan memuat `optionId` bernilai `bypassPermissions`, `acceptEdits`, atau `auto`, atau memilih opsi ber-`kind` `allow_always`, THEN gateway shall menolak mengirimnya dan menjawab dengan opsi `reject_once`.
- **AC-3.12** Gateway shall mengirim `allowed_updates: ["message", "callback_query", "my_chat_member"]` pada setiap `getUpdates`.
- **AC-3.13** WHEN `my_chat_member` melaporkan bot diblokir principal, gateway shall menghentikan pengiriman ke chat itu dan mencatat audit.
- **AC-3.14** IF sebuah update bertipe yang tidak dikenali tiba, THEN gateway shall mengabaikannya dan melanjutkan polling.

### AC-4 · Kontrol saat tidak diawasi

- **AC-4.1** WHEN `caraka start` mulai, ia shall menulis PID-nya ke `~/.caraka/caraka.pid` dengan mode `0600`.
- **AC-4.2** WHEN gateway berhenti lewat SIGTERM atau SIGINT, ia shall menghapus PID file.
- **AC-4.3** WHEN `caraka stop` dijalankan, ia shall mengirim SIGTERM ke PID di file.
- **AC-4.4** IF PID di file tidak menunjuk proses hidup, THEN `caraka stop` shall menghapus file dan melaporkan bahwa gateway tidak berjalan.
- **AC-4.5** WHEN `caraka status` dijalankan, ia shall melaporkan keadaan proses, PID, workspace, dan username bot, tanpa token dan tanpa isi pesan.
- **AC-4.6** IF `caraka start` menemukan PID file yang menunjuk proses hidup, THEN ia shall berhenti dengan exit code 78 tanpa memulai poller kedua.
- **AC-4.7** IF Telegram mengembalikan galat 401 atau 409, THEN proses shall keluar dengan exit code 78.
- **AC-4.8** WHILE seorang pengirim sudah mengirim 20 pesan dalam 60 detik terakhir, gateway shall mengantre pesan berikutnya dan membalas satu kali bahwa batas tercapai.
- **AC-4.9** WHEN satu run melewati 30 menit, gateway shall mengirim `session/cancel`, menandai sesi `cancelled`, dan mencatat audit.
- **AC-4.10** WHEN gateway mulai, ia shall mengirim satu pesan ke operator yang menyebut host, workspace, dan versi.
- **AC-4.11** WHILE pesan startup sudah terkirim dalam 60 menit terakhir, gateway shall tidak mengirimnya lagi.

### AC-5 · Berkas service

- **AC-5.1** WHEN `caraka service --print systemd|launchd|schtasks` dijalankan, ia shall menulis unit ke stdout dan tidak membuat, mengubah, atau menghapus berkas apa pun.
- **AC-5.2** Keluaran shall memuat `process.execPath` dan path CLI absolut, bukan nama perintah yang bergantung pada PATH.
- **AC-5.3** Keluaran shall tidak memuat kata `sudo`.
- **AC-5.4** Keluaran systemd shall menargetkan `~/.config/systemd/user`, memuat `Restart=on-failure`, `RestartSec=5`, dan `RestartPreventExitStatus=78`.
- **AC-5.5** Keluaran launchd shall menargetkan `~/Library/LaunchAgents`, menyebut mode berkas `0600`, dan menyatakan bahwa ia mulai saat login, bukan saat boot.
- **AC-5.6** Keluaran schtasks shall memakai `/sc ONLOGON` dan shall tidak memuat `/ru System`.
- **AC-5.7** WHEN unit selesai dicetak, perintah shall mencetak langkah yang dijalankan operator sendiri, termasuk `loginctl enable-linger` sebagai langkah opsional terpisah dengan konsekuensinya dalam satu kalimat.
- **AC-5.8** IF path workspace atau path CLI tidak ada di disk, THEN perintah shall gagal dengan pesan dan tidak mencetak unit.
- **AC-5.9** `package.json` shall tidak memuat script `preinstall`, `install`, atau `postinstall`.

### AC-6 · Jendela trust

- **AC-6.1** WHEN `/yolo <durasi>` diterima dari principal di allowlist, gateway shall membalas satu kartu berkonfirmasi bertombol dan shall tidak mengubah state apa pun sebelum tombolnya ditekan.
- **AC-6.2** WHEN `caraka trust <workspace> --for <durasi>` dijalankan, ia shall menulis satu baris `policy_grant` dengan `granted_by = 'cli'` dan `expires_at` terisi.
- **AC-6.3** IF sebuah baris `policy_grant` bermode `trusted` ditulis tanpa `expires_at`, THEN basis data shall menolaknya lewat CHECK constraint.
- **AC-6.4** IF `--for` melebihi 60 menit, THEN perintah shall menolak dan tidak menulis baris.
- **AC-6.5** WHILE jendela trust terbuka untuk workspace itu, WHEN `session/request_permission` tiba untuk aksi yang tidak cocok dengan daftar berisiko tinggi `security.md` §5, gateway shall memilih opsi ber-`kind` `allow_once`, mengirim satu baris tanpa tombol yang menyebut tool dan targetnya, dan mencatat audit dengan `result` `auto`.
- **AC-6.6** WHILE jendela trust terbuka, WHEN permintaan cocok dengan daftar berisiko tinggi, gateway shall tetap mengirim kartu approval bertombol.
- **AC-6.7** WHEN `/lock` diterima dari principal di allowlist, gateway shall menutup jendela seketika dan mencatat audit.
- **AC-6.8** WHEN gateway mulai, ia shall menutup setiap jendela trust yang tersisa dari proses sebelumnya.
- **AC-6.9** Gateway shall tidak pernah memilih opsi ber-`kind` `allow_always`, baik di dalam maupun di luar jendela trust.
- **AC-6.10** WHEN tombol konfirmasi `/yolo` ditekan, gateway shall memverifikasi tanda tangan callback dan principal-nya, lalu menulis `policy_grant` dengan `granted_by = 'chat'` dan `expires_at` terisi.
- **AC-6.11** IF `/yolo` dipanggil tanpa durasi, THEN gateway shall menolak dan tidak menulis baris.
- **AC-6.12** IF sebuah pesan chat meminta memperpanjang jendela yang sedang terbuka, THEN gateway shall menolak; memperpanjang berarti menutup lalu membuka lagi, dan keduanya tercatat.
- **AC-6.13** WHEN `caraka trust <workspace> --bypass --for <durasi>` dijalankan dari terminal, ia shall menyalakan mode `bypassPermissions` Claude untuk workspace itu, mencatat pembukaan jendela di audit, dan mencetak satu kalimat bahwa keputusan izin selama jendela itu tidak akan terlihat oleh Caraka.
- **AC-6.14** Gateway shall tidak menyediakan jalur chat mana pun yang menyalakan `bypassPermissions`.
- **AC-6.15** WHEN jendela `--bypass` tertutup, gateway shall mencatat penutupannya dan shall tidak mengklaim telah mengaudit aksi apa pun di dalamnya.

### AC-7 · Topic dan prasyaratnya

- **AC-7.1** `caraka doctor` shall melaporkan `getMe.has_topics_enabled` dan menyebut Threaded Mode di @BotFather sebagai perbaikannya bila bernilai salah.
- **AC-7.2** `caraka doctor` shall melaporkan `getMe.allows_users_to_create_topics` dan menyebut opsi "Disallow users to create new threads" di @BotFather sebagai pengendalinya.
- **AC-7.3** WHERE `has_topics_enabled` bernilai salah, gateway shall memakai mode linear dan tidak memanggil `createForumTopic`.
- **AC-7.4** Gateway shall tidak memanggil `closeForumTopic` pada chat bertipe `private`.
- **AC-7.5** WHEN sebuah sesi selesai, gateway shall menandai keadaannya lewat `editForumTopic`, dan shall tidak memanggil `deleteForumTopic`.
- **AC-7.6** IF sebuah update datang dari chat bertipe `group`, `supergroup`, atau `channel`, THEN gateway shall menolaknya sebelum mencapai Claude dan mencatat audit.

### AC-7b · Grup

- **AC-7b.1** IF sebuah pesan tiba dari chat yang tidak ada di allowlist chat, THEN gateway shall mengabaikannya dan shall tidak meneruskannya ke agent.
- **AC-7b.2** IF sebuah pesan tiba dari chat di allowlist tetapi pengirimnya tidak di allowlist pengirim, THEN gateway shall mengabaikannya dan mencatat audit `denied`.
- **AC-7b.3** WHEN bot ditambahkan ke sebuah grup, gateway shall menerima `my_chat_member` dan mengirim permintaan konfirmasi ke DM operator, bukan ke grup itu.
- **AC-7b.4** WHEN konfirmasi grup ditekan di DM, gateway shall memverifikasi tanda tangan dan principal callback sebelum menulis chat itu ke allowlist.
- **AC-7b.5** Pesan konfirmasi grup shall menyatakan dalam satu kalimat bahwa setiap anggota grup akan melihat kartu approval, path, diff, dan keluaran perintah.
- **AC-7b.6** Gateway shall tidak pernah meminta hak admin grup, dan shall tidak mengandalkan pesan ephemeral sebagai kontrol keamanan.
- **AC-7b.7** WHERE grup adalah supergroup ber-forum dan bot punya `can_manage_topics`, gateway shall memakai satu topic per sesi; WHERE tidak, ia shall memakai mode linear dengan header sesi.
- **AC-7b.8** WHEN sebuah callback approval tiba dari principal yang tidak di allowlist, gateway shall menolaknya dan mencatat audit, tanpa memandang chat asalnya.

### AC-8 · Urutan panduan instalasi

- **AC-8.1** `docs/install-guide.md` shall menempatkan prompt copy-paste sebagai langkah pertama setelah tabel prasyarat.
- **AC-8.2** Halaman `/install` shall menempatkan bagian prompt sebelum bagian pemilihan jalur instalasi.
- **AC-8.3** Kedua tempat shall tetap menyatakan bahwa token diketik di terminal dan tidak pernah masuk percakapan agent.
- **AC-8.4** IF pengurutan ulang mengubah `document.body.scrollHeight` rute `/install`, THEN baseline di `site/e2e/site.spec.ts` shall diperbarui dan komentarnya shall menyatakan bahwa angka itu diukur dari keluaran situs, bukan dari comp.

### AC-9 · Dokumen

- **AC-9.1** Setiap baris di tabel §4 shall diperbaiki atau diberi penanda "dispesifikasikan, belum di v0.2" di berkas yang disebut.
- **AC-9.2** `security.md` shall memuat tabel dua tingkat dari §2b.1, dan shall menyatakan bahwa jendela trust tidak pernah dibuka oleh **teks** chat — melainkan oleh callback bertanda tangan sekali pakai yang terverifikasi principal-nya, sedangkan `bypassPermissions` Claude hanya dari terminal.
- **AC-9.3** `docs/security.md:63` shall menandai klaim access whitelist @BotFather sebagai belum terverifikasi sampai ada yang memeriksanya di @BotFather.
- **AC-9.4** Dokumen shall tidak menyatakan dukungan grup Telegram sebagai rencana yang sudah dirancang.

---

## 6. Selesai bila

Gerbang verifikasi hijau; `docs/` tidak lagi memuat satu pun baris di tabel §4 tanpa perbaikan atau penanda; `caraka service --print` menghasilkan tiga unit yang dapat ditempel; dan satu penguji beta menjalankan Caraka dari unit systemd yang dicetak, menutupnya dengan `caraka stop`, lalu melaporkan bahwa `caraka status` mengatakan hal yang benar di kedua keadaan.

Template launchd dan schtasks tidak masuk syarat selesai. Keduanya dikirim dengan status belum diuji, dan status itu ditulis di `install-guide.md`.

---

## 7. Yang belum terverifikasi

Dibawa apa adanya dari riset. Jangan menulisnya sebagai fakta di dokumen mana pun.

- Apakah @BotFather memunculkan access whitelist (`is_access_restricted` / `added_user_ids`) untuk bot biasa. Bot API mendokumentasikannya hanya lewat `getManagedBotAccessSettings` / `setManagedBotAccessSettings`.
- Apakah `closeForumTopic` benar-benar mengembalikan galat di chat pribadi. Yang terbukti hanya bahwa deskripsinya tidak memuat klausa yang dimiliki empat method sekerabat.
- Apakah `session/set_mode` ke `bypassPermissions` berhasil ujung ke ujung melawan instalasi Claude Code yang nyata. Jalur kodenya jelas; observasinya belum dijalankan. Satu smoke test sebelum perintah mode apa pun dikirim.
- Bagaimana Telegram memilih daftar `setMyCommands` terlokalisasi untuk seorang user — apakah `id-ID` jatuh ke daftar yang didaftarkan sebagai `id`. Perlu satu akun nyata.
- Apakah plist yang ditulis tangan di `~/Library/LaunchAgents` masih memunculkan notifikasi Background Item dan entri Login Items di macOS 26. Hanya sumber sekunder yang menyatakannya.
- Apakah `navigator.language` mengembalikan sesuatu yang berguna di Windows, dan di dalam unit systemd atau launchd tanpa `LANG`.
- Apakah laporan lapangan di balik `telegram-integration.md:50` masih tereproduksi setelah `rich_message` masuk ke `editMessageText`.
- Apakah dua belas baseline tinggi di `site/e2e/site.spec.ts` diukur sebelum atau sesudah naik ke Astro 7.

---

## 8. Sumber

Halaman yang diperiksa langsung untuk klaim API di dokumen ini.

**Telegram**

- `https://core.telegram.org/bots/api` — `createForumTopic`, `closeForumTopic`, `editForumTopic`, `message_thread_id`, `getMe`, `setMyCommands`, `BotCommand.is_ephemeral`, `receiver_user_id`, `sendRichMessage`, `sendRichMessageDraft`, `InlineKeyboardButton.style`, `BotAccessSettings`, `getUpdates`
- `https://core.telegram.org/bots/api-changelog` — `rich_message` pada `editMessageText` (10.1), Bot API 10.2 (14 Juli 2026)
- `https://core.telegram.org/bots` — Threaded Mode di @BotFather
- `https://core.telegram.org/bots/features` — privacy mode, `/setjoingroups`, Guest Mode, `language_code` yang bisa kosong
- `https://core.telegram.org/api/forum` — `bot_forum_can_manage_topics`, `channels.toggleForum`, `BOT_FORUM_CREATE_FORBIDDEN`
- `https://bugs.telegram.org/c/1772` — `language_code` absen pada `/start` deep link

**ACP dan Claude Code**

- `https://agentclientprotocol.com/protocol/v1/tool-calls` — `session/request_permission`, `PermissionOptionKind`
- `https://agentclientprotocol.com/protocol/v1/session-config-options` — `session/set_config_option`
- `https://agentclientprotocol.com/protocol/v1/slash-commands` — `available_commands_update`
- `https://agentclientprotocol.com/protocol/v1/cancellation` — `session/cancel` vs `$/cancel_request`
- `https://www.npmjs.com/package/@agentclientprotocol/sdk/v/1.3.0` — 13 varian `sessionUpdate`, `usage_update`
- `https://www.npmjs.com/package/@agentclientprotocol/claude-agent-acp/v/0.63.0` — `allowDangerouslySkipPermissions`, `buildAvailableModes()`, opsi `ExitPlanMode`, `_session/steering`
- `https://code.claude.com/docs/en/permission-modes` — `auto`, `acceptEdits`, `dontAsk`, `bypassPermissions`
- `https://code.claude.com/docs/en/authentication.md` — lokasi kredensial, login kedaluwarsa pada sesi tak berpengawas

**Service dan autostart**

- `https://man7.org/linux/man-pages/man5/systemd.unit.5.html` — jalur unit user
- `https://man7.org/linux/man-pages/man1/loginctl.1.html` — linger
- `https://github.com/systemd/systemd/blob/main/src/login/org.freedesktop.login1.policy` — `set-self-linger` tanpa autentikasi
- `https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html` — LaunchAgent per-user, mode berkas
- `https://keith.github.io/xcode-man-pages/launchd.plist.5.html` — `RunAtLoad`, `KeepAlive`, resolusi PATH
- `https://support.apple.com/guide/deployment/manage-login-items-background-tasks-mac-depdca572563/web` — Login Items macOS 26
- `https://learn.microsoft.com/en-us/windows/win32/taskschd/security-contexts-for-running-tasks` — task tanpa admin
- `https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/schtasks-create` — `/sc ONLOGON`, `/it`, `/np`
- `https://learn.microsoft.com/en-us/windows/wsl/systemd` — systemd di WSL tidak menjaga distro tetap hidup
- `https://docs.npmjs.com/cli/v11/using-npm/scripts` — lifecycle script pada `npm install -g`
- `https://pm2.keymetrics.io/docs/usage/startup/` — preseden mencetak perintah, bukan memasang
- `https://openclaw-openclaw.mintlify.app/cli/daemon` dan `https://docs.openclaw.ai/gateway` — pembanding terdekat, termasuk `RestartPreventExitStatus=78`

**Bahasa dan situs**

- `https://nodejs.org/api/intl.html` — full-ICU bawaan, `Intl.PluralRules`
- `https://nodejs.org/docs/latest/api/globals.html` — `navigator.language`, Stability 1.1
- `https://github.com/tc39/proposal-intl-messageformat/issues/49` — MF2 belum maju di TC39
- `https://docs.astro.build/en/guides/internationalization/` dan `https://docs.astro.build/en/guides/integrations-guide/sitemap/` — routing i18n dan hreflang sitemap
- `https://developers.cloudflare.com/workers/static-assets/redirects/` — `_redirects` tidak bisa mengalihkan per bahasa
- `https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites` — tautan balik hreflang wajib
- `https://www.w3.org/International/questions/qa-choosing-language-tags` — subtag aksara untuk `zh`
- `https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/` — 4,37 juta developer Indonesia
