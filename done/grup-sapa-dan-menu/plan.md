# Plan — grup-sapa-dan-menu

**Spec:** `spec/grup-sapa-dan-menu.md` · **Tanggal:** 13 Agustus 2026

## Langkah

1. `src/core/channel.ts` — `InboundMessage` (`:58-64`) mendapat satu field
   opsional sesudah `text?`:

   ```ts
   /**
    * Whether this message was aimed at the bot: a mention, a reply to one of the
    * bot's own messages, or a command the channel routes to it. Left unset means
    * the channel cannot tell, and core answers rather than going quiet — the
    * absent half of that capability (`AGENTS.md`, graceful degradation).
    */
   addressed?: boolean;
   ```

   Tidak ada perubahan di `ChannelCaps`: tri-state inilah laporan kemampuannya.
   Cap kelima akan menyeret `channel.ts:17-21`, `docs/api.md` §4, dan
   FR-CHAN-02 ke dalam PR yang sama, dan ia gagal ke arah berbahaya — cap yang
   bilang "saya bisa melihat mention" ditambah satu jalur adapter yang lupa
   menyetel flag-nya membuat core diam total di jalur itu.

2. `src/core/channel.ts` — `getMe()` (`:253`) dihapus dari `interface Channel`.
   Ia tidak punya pemanggil di `src/core/`; pemanggil sungguhannya
   `src/cli.ts:391`, `src/cli.ts:661`, dan `readiness()` tiap adapter, semuanya
   pada kelas konkret, jadi ketiganya tetap bekerja. Komentar `channel.ts:37`
   ("Core reads the id, and the bot's own username once") diperbaiki: sesudah
   pekerjaan ini username bot dibaca adapter, dan core tidak pernah membacanya.

3. `src/channels/whatsapp.ts` — stub `getMe` (`:304-306`) dihapus. Ia ada hanya
   untuk memenuhi kontrak yang baru saja kehilangan field itu.

4. `src/core/gateway.ts` — di antara guard teks (`:383`) dan baris audit
   (`:384`), tiga klausa:

   ```ts
   const { threadId } = this.route(message);
   // A room is talking to Caraka only when it says so (FR-CHAN-09). A DM is
   // always aimed here, a thread holding a Caraka session belongs to Caraka,
   // and a channel that cannot tell reports nothing and is answered.
   const aimed =
     message.chat.type === "private" ||
     message.addressed !== false ||
     (threadId !== "" && this.store.sessionFor(chatId, threadId) !== undefined);
   ```

   Tiga klausa, bukan lima. `Boolean(message.message_thread_id)` **tidak**
   dipakai: setiap pesan di setiap topic forum membawanya, termasuk topic yang
   dibuat manusia untuk percakapan mereka sendiri, jadi klausa itu justru
   membuka gerbang pada satu-satunya konfigurasi yang menjadi alasan gerbang ini
   ditulis — satu pemanggilan driver per baris obrolan di dalam topic orang, di
   atas satu sesi yang dibuat baris pertama. Yang dimaksud adalah "thread yang
   dimiliki Caraka", dan bentuknya persis yang `routeTask` lakukan satu baris
   sesudahnya
   (`gateway.ts:438`, `if (threadId && session)`), termasuk syarat `threadId`
   tidak kosong: sesi di ruang linear disimpan pada `thread_id = ''`
   (`gateway.ts:783-793`), jadi tanpa syarat itu gerbang terbuka permanen di
   setiap ruang non-forum begitu ada satu sesi di sana.
   `this.pendingChoice.has(chatId)` juga tidak dipakai: ia jendela sepuluh menit
   yang dibuka oleh satu pesan ambigu (`gateway.ts:474-481`), dan ia melindungi
   kasus yang tidak bisa terjadi — `caps.buttons` bernilai false hanya di
   WhatsApp (`whatsapp.ts:173`), dan `whatsapp.ts:395-398` menolak setiap ruang
   sebelum core melihatnya.

5. `src/core/gateway.ts` — hasilnya dilipat ke baris audit yang sudah ada
   (`:384-389`): argumen hasil menjadi `aimed ? "accepted" : "ignored"`. Tidak
   ada baris audit baru dan tidak ada pemanggilan `audit` kedua.

6. `src/core/gateway.ts` — `:413` menjadi `else if (aimed) this.routeTask(message, text);`
   tanpa `else` penutup, dengan komentar yang menyebut kenapa gerbangnya di
   sini. Di bawah pemeriksaan kode approval (`:393`), karena di channel tanpa
   tombol kode di kartu adalah satu-satunya jalan sebuah keputusan bisa tiba
   (hard rule 2). Di bawah seluruh router perintah, karena `/stop`, `/lock`, dan
   `/status@bot` harus tetap bekerja di ruang yang tidak menyapa. Tidak di dalam
   `routeTask`: pemanggil satunya adalah `/new` (`:410`), dan `queueRun` di
   bawahnya juga dipanggil dari tombol workspace (`:517`). Menggerbangi keduanya
   berarti menggerbangi sebuah perintah dan sebuah tekanan tombol yang sudah lewat
   gerbang principal di `:1391`. Karena gerbangnya di bawah router, perintah yang
   tidak dikenal tetap dijawab `rejectCommand` (`:411-412`) walau ruangnya tidak
   menyapa — itu sebabnya AC-1.1, AC-1.2, dan AC-1.6 dibatasi pada pesan biasa.

7. `src/channels/telegram.ts` — `TelegramMessage` (`:27-33`) diperlebar dengan
   `entities?: Array<{ type: string; offset: number; length: number }>`,
   `reply_to_message?: TelegramMessage`, `forum_topic_created?: { name: string }`,
   dan `addressed?: boolean`. `is_topic_message` tidak dideklarasikan: pembeda
   yang dipakai adalah ada atau tidaknya `forum_topic_created`, dan field tanpa
   pembaca adalah janji yang tidak diperiksa siapa pun. `addressed` ikut ke tipe
   ini karena `Feed` di `test/e2e.test.ts:177-201` mendorong `TelegramUpdate`
   apa adanya, jadi tanpa field itu test tidak bisa menyusun kasusnya.

8. `src/channels/telegram.ts` — `start()` (`:134-136`) memanggil `getMe` sekali
   dan menyimpan dua nilai: `botName` (yang `readiness()` sekarang ambil sendiri
   di `:285-288`, jadi pemanggilan kedua itu hilang) dan
   `can_read_all_group_messages`. `TelegramUser` (`:11-18`) mendapat field
   terakhir itu. Kegagalan `getMe` di sini tidak menghentikan start: `botName`
   kosong berarti pelapor sapaan tidak melaporkan apa pun, dan `addressed` yang
   tidak diset membuat core menjawab.

9. `src/channels/telegram.ts` — satu method privat yang mengembalikan
   `boolean | undefined`, dipanggil dari `updates()` (`:183-186`) untuk pesan
   non-privat sebelum `yield`. Isinya dua pertanyaan. Pertama: ada entry di
   `entities` bertipe `mention` atau `bot_command` yang irisannya berakhir
   `@<botName>` tanpa memandang huruf besar-kecil — irisannya
   `text.slice(offset, offset + length)`, karena Bot API menyatakan offset dan
   length "in UTF-16 code units", satuan yang sama dengan string JavaScript,
   jadi tidak ada konversi dan `Buffer.byteLength` (yang dipakai di
   `gateway.ts:387` untuk hal lain) tidak boleh dipakai untuk ini. Kedua:
   `reply_to_message.from` adalah bot ini **dan** `reply_to_message` tidak
   membawa `forum_topic_created` — di dalam topic yang Caraka buat sendiri, tiap
   pesan tingkat pertama adalah balasan atas service message pembuat topic itu,
   yang pengirimnya Caraka. Di percakapan privat method ini tidak dipanggil:
   klausa `chat.type === "private"` di core sudah menutupnya, dan dua jawaban
   untuk satu pertanyaan adalah dua tempat untuk salah.

10. `src/channels/discord.ts` — `mentions?: WireUser[]` di `WireMessage`
    (`:85-91`), dan `onMessage` (`:656-663`) menyertakan
    `addressed: message.mentions.some((user) => user.id === this.appId)` hanya
    ketika `mentions` ada, memakai bentuk spread bersyarat yang sudah dipakai
    baris di atasnya (`exactOptionalPropertyTypes` menyala di `tsconfig.json`).
    Field yang absen berarti `addressed` tidak diset. Daftar penyunatan
    MESSAGE_CONTENT menyebut `content, embeds, attachments, components, poll`
    dan tidak menyebut `mentions`; itu kesimpulan dari daftar, bukan kutipan,
    jadi bentuknya dipilih supaya kesimpulan yang salah berujung pada perilaku
    hari ini alih-alih bot yang diam. Komentarnya menyebut `INTENTS` (`:30`),
    karena kesimpulan itu mati pada hari seseorang menambahkan `1 << 15`.

11. `src/channels/discord.ts` — `addressed: true` pada pesan yang disusun dari
    interaction (`:709-717`). Pesan itu dibangun dari empat field dan tidak
    membawa `mentions`, jadi tanpa baris ini ia lolos lewat jalur "channel tidak
    bisa tahu" (AC-1.4). Slash command adalah satu-satunya pesan Discord yang
    terbukti menyapa, dan memakai jalur degradasi untuk sesuatu yang sudah pasti
    menghabiskan jalur itu untuk hal yang salah.

12. `src/i18n.ts` — `discord.acknowledged` (`:110`, `:394`) ditulis ulang di
    kedua katalog supaya menyebut apa artinya kalau tidak ada balasan sesudahnya.
    Ack-nya ephemeral (`flags: 64`) dan Discord menutup jendela balasannya dalam
    hitungan detik, jadi ia tidak bisa menunggu core memutuskan; yang bisa
    diperbaiki kalimatnya, dan kalimat itu harus menyebut allowlist beserta apa
    yang harus dilakukan orang yang membacanya.

13. `src/core/gateway.ts` — `registerCommands` (`:320-337`): sumber loop
    `this.allowed` ditukar `this.allowedChats`, dan isi `try/catch/audit`
    diangkat menjadi `publishCommands(channel, chatId)` yang dipanggil dari
    loop itu. Detail audit `commands.register` mendapat `chatId` di sebelah
    `channel` dan `message`: hari ini id yang gagal disalurkan ke argumen keempat
    `store.audit` (`db.ts:491-497`), yaitu kolom `principal`, jadi baris kegagalan
    menyebut sebuah container di kolom yang dibaca orang sebagai pengirim.

14. `src/core/gateway.ts` — `confirmGroup` memanggil `publishCommands(channel, container)`
    sesudah `:1646`, sebelum baris audit `chat.pair`. Grup yang dipasangkan saat
    proses berjalan mendapat menunya tanpa restart, dan kegagalannya tercatat
    dengan bentuk yang sama seperti saat startup.

15. `src/i18n.ts` — `group.pairing` (`:85`, `:371`) mendapat satu klausa yang
    menyebut bahwa anggota grup akan melihat menu perintah Caraka beserta
    deskripsinya. Kalimat itu adalah kontrolnya (`docs/security.md` §4 butir 6),
    jadi ia tidak boleh hanya tinggal di plan.

16. `src/i18n.ts` dan `src/channels/telegram.ts` — satu kunci kesiapan kedua,
    `group.readyAll`, di kedua katalog, untuk keadaan privacy mode mati:
    setiap pesan di grup itu sampai ke bot, Caraka hanya menjawab yang menyapanya,
    dan yang lain dibaca lalu diabaikan. Placeholder-nya sama dengan
    `group.ready` (`{bot}`, `{topics}`), jadi `readiness()` hanya memilih kunci.
    `group.ready` sendiri tidak berubah: teksnya benar ketika privacy mode
    menyala, dan sesudah langkah 8 pilihan kuncinya dibuat dari jawaban `getMe`
    dan bukan dari asumsi.

17. Test. `test/unit.test.ts`: kasus adapter Telegram atas `updates()` dengan
    stub `fetch` yang menjawab `getMe` lalu `getUpdates` (bentuk `:1234-1250`),
    kasus adapter Discord lewat `discordStub()` dan `sockets[0].deliver(...)`
    (bentuk `:2511-2529`), dan assertion katalog yang ditulis tangan atas
    `group.pairing`, `group.ready`, `group.readyAll`, dan
    `discord.acknowledged` dalam bentuk `:1341-1348` — `tsc` menangkap kunci
    yang hilang dan tidak pernah menangkap kalimat yang salah.
    `test/e2e.test.ts`: `setMyCommands` di fake Telegram (`:292-295`) mulai
    mencatat id scope-nya, bukan hanya labelnya, dan kasus-kasus gerbang didorong
    lewat `feed.push` dengan `addressed` diset di pesannya.

18. Dokumen, dalam PR yang sama karena kodenya membuat kalimatnya salah:
    `docs/frd.md` FR-CHAN-09 (separuh yang terpasang dan separuh balasan yang
    belum), `docs/api.md` §4 (kontrak tanpa `getMe`, satu kalimat untuk
    `addressed` karena bagian itu menunjuk berkas alih-alih mencetak bentuk
    `InboundEvent`, dan baris `ChannelCaps` yang tercetak di sana masih menyebut
    tiga field sementara kodenya empat — AC-8.2 menuntut salinan itu sama dengan
    kodenya),
    `docs/security.md` T6b dan §4 butir 6 (menu perintah masuk daftar yang
    diungkapkan sebuah ruang), `docs/telegram-integration.md` §5 (sumber scope
    sekarang `allowChats` ∪ `allowFrom`, menggantikan "menu perintah hanya perlu
    terlihat oleh operator").

19. Gerbang: `npm run verify` dari akar (`scan:secrets`, `lint`, `typecheck`,
    `build`, `test`, `e2e`), keluarannya ditempel di bawah.

## Pemetaan AC → pembuktian

| AC | Pembuktian |
|---|---|
| AC-1.1 | e2e: pesan supergroup dengan `addressed: false` → `h.prompts` kosong dan tabel `sessions` tidak bertambah |
| AC-1.2 | e2e: kasus yang sama → panjang `h.sent` sebelum dan sesudah `settle` sama |
| AC-1.3 | e2e: `audits(h.store, "msg.in")` berisi satu baris dengan `result` `ignored` |
| AC-1.4 | e2e: pesan yang sama tanpa field `addressed` → `h.prompts` berisi teksnya |
| AC-1.5 | e2e: pesan DM dengan `addressed: false` → `h.prompts` berisi teksnya |
| AC-1.6 | e2e: dua workspace, pesan pertama menyapa memicu `askWorkspace`, pesan kedua `addressed: false` → `h.prompts` tetap kosong dan audit `msg.in` berbunyi `["accepted", "ignored"]` (pesan pertama menyapa, jadi barisnya `accepted` — plan versi pertama menulis "keduanya `ignored`", dan itu tidak mungkin) |
| AC-2.1 | e2e: harness `topics: true` **dan** pesan yang membawa `chat.is_forum: true`, sesi dibuat di sebuah topic lewat pesan menyapa, lalu `addressed: false` di `message_thread_id` yang sama → `h.prompts` bertambah. `is_forum` wajib: `topicsAvailable` menuntut jawaban container itu sendiri di ruang non-privat, jadi tanpa field itu harness `topics: true` tetap linear dan sesinya duduk di `thread_id = ''` |
| AC-2.2 | e2e: harness yang sama, `addressed: false` dengan `message_thread_id` yang tidak punya sesi → `h.prompts` kosong dan `h.calls` tidak bertambah `createForumTopic` (nama yang didorong fake `createTopic`, `e2e.test.ts:316-320`) |
| AC-2.3 | e2e: harness dengan `topics: false`, sesi linear dibuat lewat pesan menyapa, lalu `addressed: false` di ruang yang sama → `h.prompts` tetap satu entri |
| AC-3.1 | e2e: `onPrompt` menahan run, `/stop` dengan `addressed: false` di ruang itu → `h.sent` memuat `stop.cancelling` dan state sesi jadi `cancelled` |
| AC-3.2 | e2e: grant dibuka lewat `h.store.openGrant`, `/lock` dengan `addressed: false` → `h.sent` memuat `trust.closed` dan baris grant tertutup |
| AC-3.3 | e2e: harness `buttons: false` dengan ruang itu di `modes` sebagai `assisted`, permintaan izin menunggu dengan kode pendek di kartu, balasan `ok <kode>` dengan `addressed: false` di ruang itu → kolom `decision` di `approvals` terisi. Opt-in mode wajib: ruang yang tidak disebut `modes` berjalan `read-only`, dan permintaan tulis ditolak sebelum kartu digambar (§5 `docs/security.md`), jadi tanpa itu tidak ada kode untuk dibalas |
| AC-3.4 | e2e: `/status@caraka_test_bot` dengan `addressed: false` → `h.sent` memuat laporan status beserta teks kesiapan |
| AC-4.1 | unit: `updates()` atas pesan grup dengan entity `mention` yang mengeja username bot dalam huruf campur → `addressed` bernilai true |
| AC-4.2 | unit: entity `mention` mengeja `@bot_lain` → `addressed` bernilai false |
| AC-4.3 | unit: teks yang diawali emoji 4 byte lalu mention bot, offset dihitung dalam UTF-16 → `addressed` bernilai true; irisan berbasis byte gagal di kasus ini |
| AC-4.4 | unit: entity `bot_command` `/status@<bot>` → `addressed` bernilai true |
| AC-4.5 | unit: `reply_to_message.from` adalah bot ini → `addressed` bernilai true |
| AC-4.6 | unit: `reply_to_message` yang sama ditambah `forum_topic_created` → `addressed` tidak bernilai true |
| AC-4.7 | unit: pesan `chat.type: "private"` → field `addressed` tidak ada pada pesan yang di-`yield` |
| AC-4.8 | unit: stub `fetch` menolak `getMe`, lalu pesan grup bermention → `addressed` tidak ada pada pesan yang di-`yield` |
| AC-5.1 | unit: `sockets[0].deliver` MESSAGE_CREATE dengan `mentions` memuat app id → event yang di-`drain` membawa `addressed` bernilai true |
| AC-5.2 | unit: `mentions` berisi user lain → `addressed` bernilai false |
| AC-5.3 | unit: MESSAGE_CREATE tanpa field `mentions` → `addressed` tidak ada pada event |
| AC-5.4 | unit: INTERACTION_CREATE type 2 (bentuk `:2484-2497`) → pesan yang disusun membawa `addressed` bernilai true |
| AC-5.5 | unit: assertion katalog atas `discord.acknowledged` di `en` dan `id`, mencocokkan klausa allowlist |
| AC-6.1 | e2e: `harness({ allowChats: ["-1009990003"] })`, satu `settle` dulu karena `harness` tidak menunggu `gateway.run()` → `h.calls` memuat `setMyCommands:-1009990003` |
| AC-6.2 | e2e: harness yang sama → `h.calls` juga memuat `setMyCommands:42`, id principal |
| AC-6.3 | e2e: jalur pairing yang sudah ada (`my_chat_member` lalu callback konfirmasi bertanda tangan) dengan container itu **tidak** ada di `allowChats` saat start → `h.calls` memuat id container itu sesudah konfirmasi dan tidak memuatnya sebelum |
| AC-6.4 | e2e: opsi harness baru `commandsFailFor`, yang membuat fake `setMyCommands` melempar untuk satu id → `h.calls` tetap memuat id yang lain |
| AC-6.5 | e2e: kasus yang sama → `audits(h.store, "commands.register")` berisi satu baris `failed` yang detailnya membawa id yang gagal |
| AC-6.6 | unit: `discord.setMyCommands(gatewayCommands, id)` dua kali dengan id berbeda (bentuk `:2471-2482`) → tepat satu `PUT /applications/{appId}/commands` tercatat di stub |
| AC-6.7 | unit: `whatsapp.setMyCommands` mengembalikan `undefined` dan stub fetch tidak mencatat panggilan (bentuk `:3994`) |
| AC-7.1 | unit: assertion katalog atas `group.pairing` di `en` dan `id`, mencocokkan klausa menu perintah |
| AC-7.2 | unit: `start()` dengan stub `getMe` menjawab `can_read_all_group_messages: true`, lalu `readiness(false)` → teksnya cocok dengan `group.readyAll`, bukan `group.ready`. `readiness()` tidak lagi memanggil `getMe` sendiri (langkah 8), jadi jawabannya dibaca dari yang `start()` simpan |
| AC-7.3 | unit: stub `getMe` tanpa field itu → teksnya cocok dengan `group.ready` |
| AC-7.4 | typecheck: `id` bertipe `Record<MessageKey, string>`, jadi kunci yang hilang menggagalkan `tsc`; ditambah test kelengkapan katalog yang sudah ada |
| AC-7.5 | manual: baca baris T6b `docs/security.md`, ia menyebut menu perintah; `grep` untuk kata itu di baris tersebut |
| AC-7.6 | manual: baca `docs/telegram-integration.md` §5. Sumber scope yang baru tertulis (`allowChats` ∪ `allowFrom`, beserta alasannya), dan kalimat "hanya perlu terlihat oleh operator" tinggal sebagai alasan lama yang disebut sudah usang — bukan dihapus. Plan versi pertama menuntut kalimat itu hilang; dokumen ini mengoreksi dirinya dengan menyebut yang keliru, seperti dua koreksi yang sudah ada di bagian yang sama, dan kalimat yang dihapus tanpa jejak akan ditulis ulang orang lain nanti |
| AC-7.7 | manual: baca baris FR-CHAN-09 `docs/frd.md`, ia menyebut separuh yang terpasang dan separuh balasan yang belum |
| AC-8.1 | `grep -n getMe src/core/channel.ts` tidak menghasilkan apa pun, dan `npm run typecheck` hijau dengan stub WhatsApp yang sudah hilang |
| AC-8.2 | manual: baca `docs/api.md` §4 berdampingan dengan `src/core/channel.ts`; daftar method sama dan tanpa `getMe`, dan `ChannelCaps` yang tercetak menyebut keempat field yang ada di kode |
| AC-8.3 | diff pada `ChannelCaps` nol, dan test yang membaca `caps` tidak berubah |
| AC-8.4 | `npm test` menjalankan grep hard rule 1 di `test/unit.test.ts:2812-2834` apa adanya |

## Risiko

**N naik dan startup menunggu.** `registerCommands` menunggu tiap
`setMyCommands` berurutan, dan `run()` menunggunya sebelum `pump()`
(`gateway.ts:277` terhadap `:284`). `telegram.ts:164-169` tidak mengirim
`AbortSignal`, dan `telegram.ts:120-123` menidurkan `retry_after` lalu mengulang
dalam `for(;;)` tanpa batas percobaan. Hari ini N biasanya 1 karena wizard
menulis `allowChats: [principal]`; sesudah ini N adalah `allowFrom` ∪
`allowChats`. Satu 429 saat startup menunda setiap channel dan tidak bisa
dibatalkan dengan Ctrl-C. Tidak diperbaiki di sini — memindahkan pendaftaran ke
belakang `pump()` mengubah urutan startup dan itu pekerjaan lain — tetapi
pekerjaan inilah yang memperbesar N, jadi angkanya dicatat di sini dan bukan
ditemukan orang lain nanti.

**Id basi di `allowChats` sekarang berbiaya satu baris audit per start.** Grup
yang bot-nya sudah dikeluarkan menjawab 403 "bot is not a member of the
supergroup chat"; id basic group yang sudah bermigrasi menjawab 400 "group chat
was upgraded to a supergroup chat" beserta `parameters.migrate_to_chat_id`, dan
`telegram.ts:124-127` hanya menyimpan `description` dan `error_code`, jadi baris
audit menyebut masalahnya tanpa id penggantinya. Menu tidak terbit untuk id itu
dan gateway lanjut, yang memang perilaku yang sudah ada.

**Menu yang terbit belum berarti perintahnya tiba.** Dengan privacy mode
menyala, `/status` tanpa suffix hanya sampai kalau Caraka bot terakhir yang
bicara di grup itu, dan grup yang baru dipasangkan justru berada di keadaan itu.
Karena itu AC-6 diuji pada pemanggilan `setMyCommands`, bukan pada "menu bekerja
di grup", yang tidak bisa diuji terhadap platform.

**`mentions` di Discord adalah kesimpulan, bukan kutipan.** Daftar penyunatan
resmi menyebut lima field dan tidak menyebut `mentions`. Kalau kesimpulannya
salah, field itu tidak akan ada, `addressed` tidak diset, dan core menjawab
seperti hari ini. Arah kegagalannya dipilih, bukan kebetulan.

**Tabel audit tumbuh jadi daftar orang yang penasaran.** Menu yang terbit ke
seluruh anggota adalah undangan untuk menekannya, dan tekanan dari anggota di
luar allowlist menulis `msg.reject`/`denied` berisi id orang itu ke tabel yang
punya trigger `audit_no_update` dan `audit_no_delete` (`db.ts:111-116`).
Wewenangnya utuh — `gateway.ts:378-381` menjatuhkannya tanpa balasan dan tanpa
sesi — tetapi §10 `docs/security.md` tidak punya cerita retensi untuk
identifier orang yang tidak menyetujui apa pun. Dicatat, tidak diperbaiki di
sini.

**`msg.in` akan berkata `ignored` untuk perintah yang dijawab.** Hasil audit
dihitung dari `aimed` di langkah 5, di atas router, jadi `/status` atau
`/new` di ruang yang tidak menyapa tercatat `ignored` walau core menjawabnya dan
`/new` membuat sesi. Yang dibaca baris itu adalah "tidak diserahkan ke jalur
agent", dan untuk `/new` bahkan itu tidak tepat. Alternatifnya baris audit kedua
atau memindahkan `audit` ke bawah router, dan keduanya lebih besar daripada
ketidaktepatan yang mereka perbaiki; kalau pemilik menghendaki kata yang tepat,
itu pekerjaan sendiri.

**Refactor yang menaikkan gerbang ke atas router mematikan `/stop` di setiap
grup, dan tanpa AC-3 tidak ada test yang gagal.** Separuh approval-nya laten
hari ini, karena `caps.buttons` bernilai false hanya di WhatsApp dan tidak ada
ruang yang sampai ke sana. Justru itu alasan ia perlu test, bukan komentar.

**Ketergantungan urutan.** Perbaikan rute `/new` mendarat lebih dulu, supaya
perintah dipotong di satu tempat saja. Kalau ia belum mendarat, pekerjaan ini
tetap bisa dikerjakan: satu-satunya baris bersama adalah `gateway.ts:410`, di
dalam router, dan pekerjaan ini tidak menyentuhnya — `aimed` dihitung dari
`message`, bukan dari argumen kedua `routeTask`.

## Koreksi saat membangun

Nomor baris di seluruh plan ini ditulis terhadap pohon yang lebih tua; pekerjaan
lain mendarat lebih dulu dan menggesernya. Yang sebenarnya disentuh:
`dispatch` di `gateway.ts:412-467`, `registerCommands` di `:350`, `confirmGroup`
di `:1808`, `updates()` di `telegram.ts:200`. Bentuk perubahannya tidak berubah,
hanya letaknya.

Tiga baris tabel pemetaan salah dan sudah diperbaiki di tempatnya: AC-1.6
(pesan pertama yang menyapa tercatat `accepted`, bukan `ignored`), AC-2.1
(pesan uji wajib membawa `chat.is_forum: true`, karena `topicsAvailable`
menanyakan jawaban container dan bukan hanya `caps.threads`), dan AC-3.3 (ruang
uji wajib disebut di `modes` sebagai `assisted`, karena gerbang mode menolak
permintaan tulis di ruang `read-only` sebelum kartu berkode digambar).

`docs/security.en.md` ikut disunting, meski ruang lingkup spec hanya menyebut
`docs/security.md`: cermin bahasa Inggris memuat baris T6b dan §4 butir 6 yang
sama, dan cermin yang tidak ikut berubah adalah kalimat kontrol yang berbohong
dalam satu bahasa.

**Biaya baris, terukur.** `src/` 8.818 baris sebelum pekerjaan ini dan **8.925**
sesudahnya, net **+107** — dua kali perkiraan bruto ≈+57 dan net ≈+52 di spec.
Per berkas: `telegram.ts` +53, `gateway.ts` +27, `discord.ts` +16, `i18n.ts` +10,
`channel.ts` +5, `whatsapp.ts` −4. Yang tidak diperkirakan hampir seluruhnya
komentar: bacaan UTF-16 pada offset entity, dan bacaan bahwa service message
pembuat topic adalah pesan bot sendiri, dua hal yang sudah salah dibaca sebelum
ini. Angka 8.498 di spec adalah pohon sebelum beberapa pekerjaan lain mendarat;
plafon ~8.000 tidak digeser, dan utangnya sekarang ~925.

## Keluaran gerbang

`npm run verify` dari akar repositori, satu jalan dari `scan:secrets` sampai
`e2e`:

```
> caraka@1.2.0 verify
> npm run scan:secrets && npm run lint && npm run typecheck && npm run build && npm test && npm run e2e


> caraka@1.2.0 scan:secrets
> bash scripts/scan-secrets.sh

clean: 253 tracked files, no credentials

> caraka@1.2.0 lint
> oxlint src test scripts && oxfmt --check src test scripts bin package.json tsconfig.json

Checking formatting...

All matched files use the correct format.
Finished in 115ms on 33 files using 24 threads.
No config found, using defaults. Please add a config file or try `oxfmt --init` if needed.

> caraka@1.2.0 typecheck
> tsc -p tsconfig.json --noEmit


> caraka@1.2.0 build
> node -e "require('node:fs').rmSync('dist', { recursive: true, force: true })" && tsc -p tsconfig.json


> caraka@1.2.0 test
> node --import tsx --test test/unit.test.ts
```

Baris test yang dibeli pekerjaan ini, dari keluaran `npm test` yang sama:

```
✔ Telegram reports who a room message was aimed at, counting in UTF-16 (0.881523ms)
✔ a Telegram bot that does not know its own name reports nothing (0.312211ms)
✔ the Telegram readiness sentence is read off getMe, not assumed (0.423805ms)
✔ the group pairing card says what a group will see, in both catalogs (0.048188ms)
✔ both readiness sentences and the Discord ack say what silence means (0.047607ms)
✔ Discord reports a mention of the app, and reports nothing when the field is absent (0.280554ms)
ℹ tests 132
ℹ suites 0
ℹ pass 132
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 7842.233782
```

Lalu `npm run e2e`, dari keluaran yang sama:

```
> caraka@1.2.0 e2e
> node --import tsx --test test/e2e.test.ts

✔ a group is paired in the operator's DM, with the disclosure on the card (350.782187ms)
✔ an ordinary room message that did not name Caraka reaches no agent (605.752186ms)
✔ a workspace question waiting in the room does not open the gate (355.056367ms)
✔ a thread Caraka owns is Caraka's; a thread it does not own is left alone (655.641208ms)
✔ a linear room stays shut once it has a session, because the thread id is empty (456.789959ms)
✔ /stop and /lock work in a room that never named Caraka (670.456433ms)
✔ a card's code decides in a room that never named Caraka (496.865005ms)
✔ /status with the bot suffix is answered in a room that never named Caraka (273.962114ms)
✔ the command menu is published per container, and one refusal costs one line (308.865179ms)
ℹ tests 81
ℹ suites 0
ℹ pass 81
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 37822.403463
```

Yang dibuktikan angka itu: 132 unit dan 81 e2e hijau, termasuk grep hard rule 1
dan grep literal Indonesia yang membaca setiap berkas di `src/` (AC-8.4), dan
`typecheck` yang lolos dengan `id` bertipe `Record<MessageKey, string>` sesudah
satu kunci ditambahkan ke dua katalog (AC-7.4) dan sesudah `getMe` keluar dari
`interface Channel` beserta stub WhatsApp-nya (AC-8.1).

Empat pemeriksaan merah lebih dulu, dijalankan dengan mengembalikan satu klausa
ke bentuk yang salah dan menghitung yang gagal:

| Yang dirusak | Yang gagal |
|---|---|
| `else if (aimed)` dikembalikan ke `else`, dan `registerCommands` ke `this.allowed` | 5 e2e: keempat kasus gerbang plus kasus menu |
| klausa ketiga kehilangan syarat `threadId !== ""` | 1 e2e: ruang linear |
| klausa ketiga ditukar `Boolean(message.message_thread_id)` | 1 e2e: thread yang bukan milik Caraka |
| gerbang diangkat ke atas router (`if (!aimed) return;`) | 3 e2e: `/stop`+`/lock`, kode approval, `/status@bot` |

Baris terakhir itu adalah risiko yang ditulis di atas, dan sekarang ada test yang
gagal untuknya.
