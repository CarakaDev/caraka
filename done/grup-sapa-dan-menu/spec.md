# Spec — grup-sapa-dan-menu: pesan yang menyapa Caraka, dan menu perintah grup

**Status:** rencana · **Tanggal:** 13 Agustus 2026

## Latar

Dua kekurangan di ruang yang sama, bergerak ke arah berlawanan.

**Core tidak pernah bertanya apakah dirinya yang disapa.** `dispatch` mengenal
satu pengertian "ini sebuah ruang" — `message.chat.type !== "private"` — dan
memakainya untuk allowlist chat (`gateway.ts:377`) dan untuk mode kebijakan
(`security.ts:132-133`), tetapi tidak untuk pertanyaan ketiga. Baris terakhirnya
`else this.routeTask(message, text)` (`gateway.ts:413`) tanpa syarat apa pun, dan
`InboundMessage` (`channel.ts:58-64`) tidak punya slot untuk jawabannya, jadi
tidak ada adapter yang bisa menyediakannya walau mau. Requirement-nya sudah
tertulis sejak lama: `docs/frd.md:46`, FR-CHAN-09 P1, "Grup: default
`requireMention: true`".

Di Telegram kekurangan itu menagih paling keras justru pada konfigurasi yang
dituntut fitur grup Caraka sendiri. `createForumTopic` menuntut bot jadi
administrator dengan `can_manage_topics`, dan `gateway.ts:1593-1596` hanya
menyalakan `forumChats` ketika hak itu ada. Telegram: "Privacy mode is enabled by
default for all bots, except bots that were added to a group as admins (bot
admins always receive all messages)."¹ Jadi di grup tempat topic per sesi
bekerja, setiap baris obrolan tiba di `gateway.ts:413`. Baris di topic General
tidak membawa `message_thread_id`, `sessionFor` mencari pada `thread_id = ''` dan
tidak menemukan apa pun (`db.ts:337-349`), lalu `createSession`
(`gateway.ts:783-793`) membuka topic baru. N baris obrolan jadi N topic, N sesi,
dan N pemanggilan driver.

**Menu perintah terikat pada allowlist yang salah.** `registerCommands`
(`gateway.ts:320-337`) mengulang `this.allowed`, daftar pengirim, padahal yang
punya menu adalah container. `this.allowedChats` sudah memuat gabungan
`allowChats` dengan `allowFrom` (`gateway.ts:154`), jadi ia superset dan bukan
daftar lain. `registerCommands` juga berjalan sekali saja, di `run()`
(`gateway.ts:277`), sementara `confirmGroup` menambahkan container ke
`allowedChats` di `gateway.ts:1645` tanpa menerbitkan apa pun — grup Telegram
yang baru dipasangkan tidak punya menu sampai proses berikutnya. Ini keputusan
lama yang jadi usang: `docs/telegram-integration.md:152-153` mencatat alasannya,
"karena menu perintah hanya perlu terlihat oleh operator", dan pairing grup
datang sesudah kalimat itu ditulis.

**Kenapa satu pekerjaan.** Keduanya mengubah perilaku grup terpasang: yang satu
menerbitkan menu ke seluruh anggota, yang lain berhenti menjawab pesan yang bukan
untuk Caraka. Keduanya bertemu di `confirmGroup` (`gateway.ts:1633-1652`): di situ
pemanggilan menu yang hilang harus masuk, dan dari situ pula kalimat kesiapan yang
salah dikirim (`:1651`). Menerbitkan menu lebih dulu dan sendirian adalah keadaan
antara yang paling buruk yang tersedia: menu terlihat seluruh ruang, dan yang
menerima tekanannya adalah bot yang menjawab segalanya.

**Satu kalimat pengungkapan sedang berbohong.** `group.ready` (`i18n.ts:91` dan
`:374`) menjanjikan "An ordinary message in this group never reaches me. That is
Telegram, not a fault." Itu salah persis pada konfigurasi admin di atas. `getMe`
mengembalikan `can_read_all_group_messages`, "True, if privacy mode is disabled
for the bot"², `telegram.ts:11-18` tidak mendeklarasikan field itu, dan tidak ada
yang membacanya — padahal `readiness()` (`telegram.ts:284-293`) sudah memanggil
`getMe` untuk mengambil username. `docs/security.md` §4 butir 6 menjadikan
kalimat itu kontrolnya sendiri: pengungkapan di grup dinyatakan, bukan
dikontrol. Kalimat kontrol yang salah lebih buruk daripada tidak ada kalimat,
dan operator membacanya tepat pada saat memutuskan memasangkan grupnya.

Hal yang sama berlaku untuk menu. `botCommandScopeChat` adalah "A scope covering
all members of a chat"³, jadi menerbitkan ke id grup menaruh ketiga belas entri
`gatewayCommands` beserta deskripsinya ke menu setiap anggota, termasuk `/ws`
("List the workspaces and their paths") dan `/yolo` ("Open a Caraka trust window
for a stated duration"). Kalimat pairing (`i18n.ts:85`, `:371`) menyebut kartu
approval, path berkas, diff, dan keluaran perintah, dan tidak menyebut kosakata
perintah sama sekali.

**Discord sudah menjawab orang yang belum diizinkan.** `discord.ts:696-700`
membalas setiap slash command dengan `discord.acknowledged` ("Caraka has it.")
sebelum `emit()` menyerahkan apa pun ke core, jadi anggota guild di luar
allowlist diberi tahu bahwa Caraka menerimanya, lalu tidak mendengar apa-apa
lagi (`gateway.ts:378-381` menjatuhkannya tanpa balasan). Daftar perintah global
Discord sudah terlihat di setiap guild sejak v0.5, jadi ini sudah berjalan
sekarang dan bukan akibat pekerjaan ini. Ia ikut karena kalimatnya ada di
katalog yang sama dan diperiksa test yang sama.

Sumber: ¹ `https://core.telegram.org/bots/features#privacy-mode` ·
² `https://core.telegram.org/bots/api#user` ·
³ `https://core.telegram.org/tdlib/docs/classtd_1_1td__api_1_1bot_command_scope_chat.html`

## Ruang lingkup

`src/core/channel.ts` (satu field opsional di `InboundMessage`, dan `getMe`
keluar dari kontrak), `src/core/gateway.ts` (perhitungan sapaan, gerbangnya di
jalur agent, sumber loop `registerCommands`, penerbitan menu per container
termasuk saat pairing dikonfirmasi), `src/channels/telegram.ts` (field wire yang
kurang, `botName` dan `can_read_all_group_messages` dibaca di `start()`, pelapor
sapaan), `src/channels/discord.ts` (`mentions` di `WireMessage`, sapaan di dua
tempat), `src/channels/whatsapp.ts` (stub `getMe` dihapus), `src/i18n.ts`
(`group.pairing`, satu kunci kesiapan baru, `discord.acknowledged`, semuanya di
dua katalog), `test/unit.test.ts`, `test/e2e.test.ts`, dan empat dokumen yang
kalimatnya berubah karena kodenya berubah: `docs/frd.md` (FR-CHAN-09),
`docs/api.md` (bentuk `InboundMessage` dan kontrak di §4), `docs/security.md`
(T6b dan §4 butir 6), `docs/telegram-integration.md` §5.

**Biaya baris, dihitung jujur.** Perkiraan bruto di `src/` menjumlah **≈ +57**:
~+8 di `channel.ts`, ~+16 di `gateway.ts`, ~+22 di `telegram.ts`, ~+5 di
`discord.ts`, ~+6 di `i18n.ts` (satu kunci kesiapan di dua katalog, dan
`discord.acknowledged` yang tumbuh jadi dua baris per katalog). Yang membayar
hanya satu, dan ia berada di seam yang sama dengan pekerjaan ini:
`Channel.getMe()` (`channel.ts:253`) tidak punya pemanggil di `src/core/` —
pemanggil sungguhannya `src/cli.ts:391`, `src/cli.ts:661`, dan `readiness()` tiap
adapter, semuanya pada kelas konkret — jadi ia keluar dari kontrak dan stub
`whatsapp.ts:304-306` yang ada hanya untuk memenuhi kontrak ikut hilang, −5.
Net **≈ +52**. `src/` terukur 8.498 baris pada 13 Agustus 2026
(`find src -name '*.ts' | xargs wc -l | tail -1`, angka yang sama dengan
`AGENTS.md:21`), jadi utang terhadap plafon ~8.000 menjadi ~550. Angkanya
dicatat, plafonnya tidak digeser, seperti +149 di v1.1. Utangnya tidak dibayar di
sini: penghapusan yang bisa membayarnya adalah refactor, dan satu PR yang
memperbaiki bug sekaligus melakukan refactor adalah dua PR (`AGENTS.md`).

## Yang tidak dikerjakan

- Tidak ada field kelima di `ChannelCaps`. Tri-state pada pesan itulah laporan
  kemampuannya, `undefined` berarti channel tidak bisa tahu, dan §4 `docs/api.md`
  beserta FR-CHAN-02 tetap menyebut empat field yang punya pembaca. Cap yang
  menjanjikan lebih daripada yang benar-benar di-set adapter gagal ke arah
  berbahaya: bot yang diam total dan terbaca seperti mati.
- Tidak ada mode balasan per container, tidak ada perintah untuk mengubahnya, dan
  tidak ada entri katalog untuknya. Satu-satunya tempat penyimpanan yang tersedia
  adalah meta store, dan ia ditulis dari jalur chat itu sendiri (`gateway.ts:451`
  dari teks, `:515` dari tombol, `:772` dari kegagalan wire); `gateway.ts:189-194`
  menolak properti itu untuk gerbang mode dengan alasan yang sama persis.
- Tidak ada pembaca `text_mention`. Bot selalu punya username, jadi
  `text_mention` tidak bisa menyebut bot, dan ia satu-satunya tipe entity yang id
  sasarannya datang dari dalam badan pesan alih-alih dicocokkan dengan nama yang
  Caraka ambil sendiri.
- `is_topic_message` tidak dideklarasikan. Pembeda yang dipakai adalah ada atau
  tidaknya `forum_topic_created` pada `reply_to_message`, dan field tanpa pembaca
  adalah janji yang tidak diperiksa siapa pun (`docs/api.md` §4).
- WhatsApp tidak disentuh untuk sapaan. `whatsapp.ts:395-398` menolak setiap
  `from` yang memuat `@`, jadi tidak ada ruang yang sampai ke core dan `undefined`
  adalah jawaban yang benar. Lubang `group_id` Cloud API (`whatsapp.ts:571-586`),
  yang membuat pesan grup masuk sebagai percakapan privat, adalah pekerjaan
  sendiri.
- Tidak ada `deleteMyCommands` dan tidak ada jalur melepas pairing. Menu yang
  sudah terbit akan hidup lebih lama daripada entri allowlist yang
  membenarkannya; ia tidak memberi wewenang apa pun (`gateway.ts:378-381`) dan
  tetap pekerjaan sendiri.
- `parseCommand` (`gateway.ts:426`) tetap membuang `@suffix` tanpa
  membandingkannya, jadi `/ban@bot_lain` masih terbaca sebagai perintah Caraka.
  Akar yang sama — tidak ada yang bertanya siapa yang disapa — tetapi PR sendiri.
- `chatWorkspace` (`gateway.ts:223-229`), yang membuat `/lock` menjawab
  `trust.notOpen` sementara jendela trust terbuka di workspace lain, tidak
  diperbaiki di sini.
- Callback dan `my_chat_member` tidak digerbangi. Keduanya bercabang di
  `gateway.ts:359` dan `:363`, sebelum semua ini, dan penekanan tombol sudah
  terikat principal di `gateway.ts:1391`.
- Tidak ada string baru untuk pesan yang diabaikan. Bot yang menjawab "kamu tidak
  menyapa saya" di dalam grup adalah kebisingan yang justru mau dihilangkan
  gerbang ini.
- Antrean `setMyCommands` yang berjalan seri sebelum polling dimulai tidak
  dirapikan, dan `retry_after` yang diulang tanpa batas percobaan
  (`telegram.ts:120-123`) tetap tanpa `AbortSignal` di jalur ini, karena
  `setMyCommands` (`:164-169`) tidak mengirimkannya. Pekerjaan ini memperbesar N;
  risikonya dicatat di plan.

## Acceptance criteria

Di AC-1 dan AC-2, **pesan biasa** berarti pesan yang bukan perintah dan bukan
kode approval. Perintah dan kode punya AC-nya sendiri di AC-3, dan gerbang ini
tidak menyentuh keduanya.

### AC-1 · Gerbang sapaan di jalur agent

- **AC-1.1** WHEN sebuah pesan biasa tiba di container non-privat dengan
  `addressed` bernilai false, core shall tidak menyerahkannya ke agent, sehingga
  tidak ada sesi yang dibuat dan tidak ada driver yang dijalankan untuk pesan itu.
- **AC-1.2** WHEN sebuah pesan biasa tiba di container non-privat dengan
  `addressed` bernilai false, core shall tidak mengirim satu pesan pun ke
  container itu.
- **AC-1.3** WHEN sebuah pesan tiba di container non-privat dengan `addressed`
  bernilai false, core shall menulis satu baris audit `msg.in` dengan hasil
  `ignored`.
- **AC-1.4** WHERE channel tidak melaporkan jawaban sama sekali (`addressed`
  tidak diset), core shall menyerahkan pesan itu ke agent seperti sebelum
  pekerjaan ini.
- **AC-1.5** WHERE pesan tiba di percakapan privat, core shall menyerahkannya ke
  agent apa pun isi `addressed`.
- **AC-1.6** IF pertanyaan workspace sedang menunggu jawaban di ruang itu, THEN
  core shall tetap mengabaikan pesan biasa dengan `addressed` bernilai false.

### AC-2 · Thread yang dimiliki Caraka

- **AC-2.1** WHEN pesan biasa dengan `addressed` bernilai false tiba di thread
  yang punya sesi Caraka pada rute itu, core shall menyerahkannya ke agent.
- **AC-2.2** WHEN pesan biasa dengan `addressed` bernilai false tiba di thread
  yang tidak punya sesi Caraka pada rute itu, core shall mengabaikannya.
- **AC-2.3** IF ruang itu menjalankan sesinya linear, sehingga thread id-nya
  kosong, THEN core shall tetap mengabaikan pesan biasa dengan `addressed`
  bernilai false meskipun ruang itu sudah punya sesi.

### AC-3 · Urutan gerbang adalah sifat keselamatan

- **AC-3.1** WHEN `/stop` tiba di ruang dengan `addressed` bernilai false, core
  shall membatalkan run yang sedang berjalan.
- **AC-3.2** WHEN `/lock` tiba di ruang dengan `addressed` bernilai false, core
  shall menutup jendela trust yang terbuka.
- **AC-3.3** WHERE channel tidak punya tombol, WHEN teks berbentuk kode approval
  tiba di ruang dengan `addressed` bernilai false, core shall memutuskan
  permintaan izin yang menunggu.
- **AC-3.4** WHEN `/status@<bot>` tiba di ruang dengan `addressed` bernilai false,
  core shall menjawabnya.

### AC-4 · Telegram melaporkan siapa yang disapa

- **AC-4.1** WHEN pesan grup membawa entity `mention` yang irisannya berakhir
  dengan `@<username bot>` dalam kombinasi huruf besar-kecil apa pun, adapter
  Telegram shall melaporkan `addressed` bernilai true.
- **AC-4.2** WHEN pesan grup membawa entity `mention` yang menyebut username
  lain, adapter Telegram shall melaporkan `addressed` bernilai false.
- **AC-4.3** WHEN entity berada sesudah karakter di luar BMP, adapter Telegram
  shall mengiris teks dalam satuan UTF-16 code unit, sehingga mention yang sama
  tetap ditemukan.
- **AC-4.4** WHEN pesan grup membawa entity `bot_command` yang berakhir dengan
  `@<username bot>`, adapter Telegram shall melaporkan `addressed` bernilai true.
- **AC-4.5** WHEN pesan grup adalah balasan atas pesan bot itu sendiri, adapter
  Telegram shall melaporkan `addressed` bernilai true.
- **AC-4.6** IF `reply_to_message` membawa `forum_topic_created`, THEN adapter
  Telegram shall tidak melaporkan `addressed` bernilai true atas dasar balasan
  itu.
- **AC-4.7** WHERE pesan tiba di percakapan privat, adapter Telegram shall
  membiarkan `addressed` tidak diset.
- **AC-4.8** IF username bot belum terselesaikan, THEN adapter Telegram shall
  membiarkan `addressed` tidak diset.

### AC-5 · Discord

- **AC-5.1** WHEN pesan guild membawa `mentions` yang memuat app id, adapter
  Discord shall melaporkan `addressed` bernilai true.
- **AC-5.2** WHEN pesan guild membawa `mentions` tanpa app id di dalamnya,
  adapter Discord shall melaporkan `addressed` bernilai false.
- **AC-5.3** WHERE pesan wire tidak membawa field `mentions` sama sekali, adapter
  Discord shall membiarkan `addressed` tidak diset.
- **AC-5.4** WHEN sebuah slash command tiba sebagai interaction, adapter Discord
  shall melaporkan `addressed` bernilai true pada pesan yang disusunnya.
- **AC-5.5** WHEN adapter Discord membalas slash command sebelum core melihatnya,
  balasan itu shall menyebut bahwa diam sesudahnya berarti akun atau channel itu
  tidak ada di allowlist Caraka.

### AC-6 · Menu perintah container

- **AC-6.1** WHEN gateway mulai, ia shall memanggil `setMyCommands` untuk setiap
  id di allowlist container channel itu.
- **AC-6.2** WHEN gateway mulai, ia shall tetap memanggil `setMyCommands` untuk
  setiap id principal.
- **AC-6.3** WHEN pairing sebuah grup dikonfirmasi, gateway shall memanggil
  `setMyCommands` untuk container itu tanpa menunggu proses berikutnya.
- **AC-6.4** IF `setMyCommands` ditolak untuk satu id, THEN gateway shall tetap
  mendaftarkan id sisanya.
- **AC-6.5** IF `setMyCommands` ditolak untuk satu id, THEN gateway shall menulis
  satu baris audit `commands.register` dengan hasil `failed` yang detailnya
  membawa id itu.
- **AC-6.6** WHERE channel menerbitkan satu daftar perintah global, gateway shall
  menghasilkan tepat satu pemanggilan penerbitan meskipun allowlist berisi banyak
  id.
- **AC-6.7** WHERE channel tidak menerbitkan daftar perintah, gateway shall tidak
  mengirim apa pun ke wire untuk id mana pun di allowlist.

### AC-7 · Pengungkapan dan dokumen

- **AC-7.1** `group.pairing` di kedua katalog shall menyebut bahwa anggota grup
  akan melihat menu perintah Caraka.
- **AC-7.2** WHERE `getMe` menjawab `can_read_all_group_messages` bernilai true,
  laporan kesiapan Telegram shall menyatakan bahwa pesan biasa di grup itu sampai
  ke bot.
- **AC-7.3** WHERE `can_read_all_group_messages` tidak bernilai true, laporan
  kesiapan Telegram shall tetap memakai kalimat privacy mode yang berlaku
  sekarang.
- **AC-7.4** Setiap kunci yang ditambahkan atau diubah pekerjaan ini shall ada di
  katalog `en` dan `id`.
- **AC-7.5** `docs/security.md` T6b shall menyebut menu perintah di antara yang
  diungkapkan sebuah ruang terpasang.
- **AC-7.6** `docs/telegram-integration.md` §5 shall menyatakan sumber scope yang
  baru, menggantikan kalimat bahwa menu hanya perlu terlihat oleh operator.
- **AC-7.7** `docs/frd.md` FR-CHAN-09 shall menyatakan bagian mana dari
  requirement itu yang terpasang dan bagian mana yang belum.

### AC-8 · Kontrak dan anggaran

- **AC-8.1** Kontrak `Channel` shall tidak lagi mendeklarasikan `getMe`.
- **AC-8.2** Kontrak yang tercetak di `docs/api.md` §4 shall sama dengan
  `src/core/channel.ts` sesudah perubahan ini.
- **AC-8.3** `ChannelCaps` shall tetap berisi empat field.
- **AC-8.4** Test grep hard rule 1 shall tetap lolos: tidak ada `channel.id ===`
  dan tidak ada literal nama channel di berkas mana pun di `src/core/`.
