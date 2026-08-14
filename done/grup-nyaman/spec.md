# Spec — grup-nyaman: topic sesi ditutup, folder disebut dari ruangan, dan ruangan yang tidak menjadi prompt

**Status:** rencana · **Tanggal:** 14 Agustus 2026

## Latar

Empat permintaan tentang satu tempat: grup tempat sebuah tim melihat pekerjaan
Caraka berjalan. Ketiganya bergerak ke arah yang sama kecuali pada satu titik,
dan titik itu ditulis di bawah alih-alih dibulatkan.

### 1. Sesi yang selesai berhenti di penggantian nama, padahal desainnya menutup

`docs/session-model.md` §6 sudah menuliskannya sejak v0.1: "Tutup topic saat sesi
`done`/`failed`/`cancelled` — ✅ langsung, setelah pesan ringkasan", dan
ADR-0003 konsekuensi 2 menyebut hal yang sama, "tutup saat selesai". Yang
mundur adalah kodenya. `src/channels/telegram.ts` tidak punya `finishThread`
sama sekali; `Channel.finishThread?()` opsional (`src/core/channel.ts:336`) dan
Discord mengisinya dengan `{archived: true}` (`src/channels/discord.ts:361`),
sedangkan sesi Telegram diganti nama dengan glif lalu dibiarkan terbuka.

Alasan mundurnya benar untuk separuh kasus dan salah untuk separuhnya. Deskripsi
Bot API `closeForumTopic` berbunyi "in a forum supergroup chat" saja; klausa "or
a private chat with a user" ada di `createForumTopic`, `editForumTopic`,
`deleteForumTopic`, dan `unpinAllForumTopicMessages`, dan tidak ada di
`closeForumTopic` maupun `reopenForumTopic`
([bots/api#closeforumtopic](https://core.telegram.org/bots/api#closeforumtopic)).
Jadi topic di DM tidak punya cara berdokumentasi untuk ditutup — itu tetap benar
dan tetap tertulis di `docs/telegram-integration.md` §2. Yang salah adalah
menyimpulkan bahwa grup pun tidak bisa. Grup bisa, dan haknya sudah dipegang:
`can_manage_topics` didefinisikan sebagai "allowed to **create, rename, close,
and reopen** forum topics"
([#chatmemberadministrator](https://core.telegram.org/bots/api#chatmemberadministrator)),
dan `gateway.ts` hanya menyalakan `forumChats` untuk grup ketika hak itu ada.
Deskripsi kedua method juga memuat pengecualian "unless it is the creator of the
topic", dan sejak 1.3.1 Caraka hanya menyentuh thread yang dibukanya sendiri
(`done/topic-provenance/`), jadi ia selalu pencipta topic yang akan ditutupnya.

Menutup tidak menghilangkan apa pun. Ia `messages.editForumTopic` dengan flag
`closed` saja, ditambah satu service message `forum_topic_closed`
([#forumtopicclosed](https://core.telegram.org/bots/api#forumtopicclosed)).
Yang menghapus transkrip adalah `deleteForumTopic`, "delete a forum topic
**along with all its messages**"
([#deleteforumtopic](https://core.telegram.org/bots/api#deleteforumtopic)), dan
itu yang repositori ini hindari sejak awal. Permintaan pemilik menyebutnya
persis: ditutup, bukan dihapus.

**Yang harus disebut, karena ia menagih dua permintaan sekaligus.**
[api/forum](https://core.telegram.org/api/forum) menulis bahwa topic yang
ditutup "preventing further messages from being sent to the topic", dan
`messages.sendMessage` ke dalamnya menjawab `TOPIC_CLOSED`, "This topic was
closed, you can't send messages to it anymore"
([api/errors.json](https://core.telegram.org/api/errors.json), 400 dan 406).
Yang masih bisa menulis di sana hanya admin ber-`can_manage_topics` dan pencipta
topic. Jadi permintaan 3 — "orang juga berdiskusi di topic itu" — berhenti
berlaku begitu sesi selesai: setelah ditutup, anggota biasa tidak bisa lagi
menulis di topic itu, bukan sekadar "diabaikan Caraka". Kedua permintaan tidak
bertabrakan dalam waktu (diskusi terjadi selama sesi berjalan, penutupan terjadi
sesudah), tetapi diskusi *pasca-mortem* di topic sesi memang hilang. Ini bukan
sesuatu yang bisa dibuat tidak ada oleh implementasi; ia trade yang harus
dipilih sadar. Spec ini membangun penutupan karena itu yang diminta dan itu yang
desainnya sendiri sudah tulis, dan mencatat konsekuensinya di
`docs/session-model.md` §5 alih-alih membiarkan tabel itu berbohong.

**Urutan kirim-lalu-tutup adalah bagian dari fitur, bukan kerapian.** §6 sudah
menulis "Ringkasan penutup dikirim **sebelum** topic ditutup". Jalur sukses
`runTask` sudah begitu (`gateway.ts:1233-1240`, dengan komentarnya). Tiga jalur
lain tidak: `/stop` memanggil `setState(…, "cancelled")` lalu `sendToSession`
(`:2054-2055`), timeout run melakukan hal yang sama (`:1268-1271`), dan
kegagalan menulis `setState(…, "failed")` lalu `throw` yang berakhir di
`reportError` lewat `enqueue`-nya (`:834`). Di Discord ketiganya sudah menulis ke
thread yang baru diarsipkan; di Telegram ketiganya akan menulis ke topic yang
baru ditutup, dan itu hanya berhasil karena Caraka pencipta topic-nya — bukti
implementasinya ada di TDLib (`ForumTopicManager.cpp`, `can_send_message_to_forum_topic`),
bukan di halaman Bot API. Menggantungkan tiga pesan pada perilaku tanpa dokumen
adalah harga yang tidak perlu dibayar ketika menukar dua baris menutupnya.

**Membuka kembali.** `docs/session-model.md` §5 menyatakan pesan di topic yang
sesinya sudah `done` melanjutkan sesi yang sama, dengan alasan "Topic di DM tidak
pernah ditutup, jadi tidak ada yang perlu dibuka kembali". Di grup alasan itu
habis. Karena `ForumTopic` tidak punya field `is_closed` dan Bot API tidak punya
`getForumTopic` sama sekali
([#forumtopic](https://core.telegram.org/bots/api#forumtopic)), Caraka tidak bisa
menanyakan keadaan topic; yang ia tahu adalah transisi state yang ia sendiri
tulis. Maka `reopenForumTopic` dipanggil tepat pada transisi yang penutupan
terjadi — dari `done`/`failed`/`cancelled` kembali ke `running` — dan tidak pada
`running` → `awaiting_approval` → `running`, karena `TOPIC_NOT_MODIFIED` adalah
galat 400 untuk bot ([method/messages.editForumTopic](https://core.telegram.org/method/messages.editForumTopic))
dan ping-pong tutup-buka per pesan masuk adalah bentuk yang harus dihindari.
`closeForumTopic` dan `reopenForumTopic` juga tidak bisa digabung ke
`editForumTopic`: `TOPIC_CLOSE_SEPARATELY` menyatakan flag `close` tidak boleh
dikirim bersama flag lain, jadi ganti nama dan buka adalah dua panggilan.

### 2. Menyebut folder dari grup membalik keputusan 1 ADR-0010, dan itu perlu ADR sendiri

Yang diminta: `/new@bot ~/Project/coret Coret` atau `@bot /new ~/Project/coret
Coret` dari grup — perintah, folder, nama, dalam satu pesan.

Bentuk path sudah bekerja hari ini di DM operator: `/new @~/Project/coret Coret`
melewati `parseCommand`, `routeTask`'s `/^@(\S+)(?:\s+|$)/`, `expandHome`,
`isAbsolute`, lalu `workspaceForPath` (`gateway.ts:606-620`). Yang berbeda pada
permintaan pemilik hanya dua: `@` tidak diketik, dan pesannya dari grup.

Yang pertama tidak menggeser batas apa pun. Token itu sudah dibaca sebagai path
ketika ia berbentuk path; membuat sigil-nya opsional **khusus argumen pertama
`/new`** hanya mengubah karakter apa yang mencapai `expandHome`. `@` tetap wajib
di teks bebas, dan itulah yang menjaga `/etc/hosts is broken, fix it` tetap
sebuah prompt.

Yang kedua adalah keputusan keamanan. ADR-0010 keputusan 1 menolak bentuk path di
ruangan mana pun dengan alasan yang tertulis: "whoever can post in a paired group
would otherwise choose what directory the coding agent runs against". Yang
dijaga kalimat itu bukan siapa yang menyetujui — penekan di luar allowlist sudah
ditolak `handleCallback`, dan `confirmed()` menolak penekan yang salah di dalam
allowlist — melainkan **siapa yang memilih string-nya**. Path itu menjadi kunci
di empat tempat: `policy_grant.workspace`, scope memori `workspace:<path>`, `cwd`
untuk `session/new`, dan `cwd` untuk `spawn`.

Membuka bentuk itu untuk setiap pengirim di allowlist akan menyerahkan lebih dari
satu direktori. `createSession` (`gateway.ts:1052`) menulis
`principal: String(message.from?.id)`, yaitu peminta, dan `Store.decide`
(`db.ts:436`) menolak setiap penekanan yang principal-nya bukan itu. Jadi
operator akan menekan sekali, dan sesudahnya peminta memegang direktori pilihannya
**dan** satu-satunya wewenang menjawab kartu izin di dalamnya. Itu bukan "hanya
operator yang memberi".

Maka yang dibangun adalah bentuk yang lebih sempit dari yang diminta dalam satu
hal dan tepat seperti yang diminta dalam hal lain: **bentuk path diterima di
container mana pun yang Caraka layani, dari operator channel itu saja**. Operator
memilih string-nya dan operator menekannya, jadi klausa yang benar-benar dijaga
keputusan 1 tetap utuh; yang dilepas adalah kerahasiaan path terhadap ruangan,
yang `docs/security.md` T6b sudah menyatakan bukan kerahasiaan, dan yang
penolakan hari ini sendiri sudah bocorkan karena `ws.pathDmOnly` mencetak
`workspaceLines()` — `@slug · /path/absolut` untuk setiap workspace — ke dalam
ruangan itu. Contoh pemilik adalah dirinya sendiri mengetik di grupnya sendiri,
dan bentuk ini melayaninya. ADR-0010 keputusan 1 diamandemen lewat ADR-0011,
mengikuti preseden ADR-0006 → ADR-0008.

**Kartunya tetap naik di DM operator, dan itu memikul beban.**
`handleCallback` (`gateway.ts:1762-1765`) membersihkan keyboard untuk **setiap**
penekan di allowlist, sebelum percabangan purpose, dan itu disengaja. Maka kartu
yang duduk di ruangan bersama bisa dilucuti tombolnya oleh anggota lain sebelum
operator melihatnya. Itu gangguan, bukan eskalasi, dan cukup menjadi alasan kartu
tidak pernah digambar di ruangan.

**Jawaban ke ruangan tidak boleh membedakan apa pun.** `offerWorkspace`
(`gateway.ts:629-644`) bercabang atas `statSync(...)?.isDirectory()` dan
menghasilkan tiga jawaban yang bisa dibedakan: kartu (direktori ada),
`ws.pathMissing` (tidak ada, atau bukan direktori), `ws.slugTaken` (ada dan
slug-nya terpakai — sekaligus menyebut path workspace yang sudah terdaftar). Itu
primitif `isdir(p)` untuk `p` apa pun. Di DM operator pembacanya satu orang yang
bisa menjalankan `ls`; di ruangan pembacanya setiap anggota yang bisa melihat
ruangan itu, dan T6b menyatakan jumlah itu lebih besar daripada allowlist
pengirim. Maka di container yang bukan DM operator, ruangan menerima satu
kalimat tetap yang menyebut di mana jawabannya diberikan, tanpa cabang, dan
jawaban sebenarnya dikirim ke DM operator.

**Empat cacat yang sudah terkirim dan menghalangi jalan.** Ketiga yang pertama
adalah bug pada kode yang sudah berjalan, dan keempat adalah kartu yang menyebut
terlalu sedikit:

- `pendingWorkspaces` (`gateway.ts:131-141`) tidak punya field `create`, dan
  `confirmWorkspace` memanggil `queueRun(request.message, request.text, entry,
  false)` (`:687`). Jadi contoh pemilik sendiri —
  `/new ~/Project/coret Coret` atas folder yang belum ada di config → kartu →
  ya — mengirim `Coret` ke coding agent **sebagai prompt** alih-alih membuka
  sesi bernama Coret. `pendingChoice` (`:118-127`) punya field itu dan
  komentarnya menyebut alasannya: "`create` is what `/new` has to survive on".
- Slug tidak divalidasi sebelum kartu. `basename(resolve("/"))` bernilai `""`
  (dijalankan), `addAllowedWorkspace` (`config.ts:222`) tidak memvalidasi ulang,
  dan `workspaceEntry.slug` adalah `z.string().min(1)` (`config.ts:19`) — jadi
  satu tekanan "ya" atas `@/` menulis `config.yaml` yang `loadConfig` **tidak
  bisa muat lagi**, dan sebelum restart `workspaceOf` (`gateway.ts:264-266`)
  membaca slug kosong sebagai *workspace pertama*, sehingga sesi ber-`cwd` `/`
  membaca grant dan root berisiko-tinggi milik workspace lain. Itu konsekuensi 1
  ADR-0010 kembali terbuka lewat lubang di `basename`. Kelas yang sama menampung
  slug homoglif: `workspaceBySlug` (`:258`) membandingkan dengan `===`, jadi
  `Сoret` ber-Es Kiril lolos `ws.slugTaken` dan tidak bisa dibedakan dari
  `Coret` di `/ws` maupun di kartu trust; dan `resolve` tidak melipat huruf, jadi
  di APFS dan NTFS `~/Project` dan `~/project` adalah satu direktori dan dua
  kunci grant.
- Tidak ada yang menyapu `pendingWorkspaces` dan `pendingTrust`. Keduanya
  di-`set` di satu tempat dan dihapus hanya di dalam `confirmed()`; `expiresAt`
  cuma dibaca saat ditekan. Jalur path juga tidak pernah mencapai `enqueue`,
  jadi ia tidak memakai anggaran `rateDelay` sama sekali dan batas 20/menit di
  `docs/security.md` §9 tidak berlaku atasnya.
- `trust.card` menyebut slug dan tidak pernah path: "Open a Caraka trust window
  for {minutes} minutes on **Coret**?" Sepuluh menit sebelumnya kartu tambah
  menyebut path. Setelah keputusan ini, direktori yang dinamai bisa berada di
  luar apa yang operator ingat, dan satu argumen menutupnya.

Dan satu penolakan yang harus ikut dibangun karena ia satu-satunya bagian dari
gagasan "allowlist ber-root" yang layak dimiliki: **path yang memuat atau berada
di dalam workspace yang sudah ada ditolak.** Tanpa itu, `~/Project` bisa
diusulkan, slug `Project` bebas, kartunya ditekan, dan `/yolo @Project` menyetujui
otomatis setiap aksi bukan-berisiko-tinggi di seluruh 89 repositori yang ADR-0010
sendiri hitung — persis alternatif yang ADR itu tolak dengan pengukuran, tiba
sebagai satu pesan chat. `insideWorkspace` (`security.ts:285`) sudah ada dan
dipakai dua arah.

### 3. Setiap baris di topic sesi hari ini adalah sebuah prompt

Klausa ketiga `aimed` (`gateway.ts:461-464`) berbunyi
`(threadId !== "" && this.store.sessionFor(chatId, threadId) !== undefined)`.
Efeknya: begitu Caraka memegang sesi di sebuah topic, setiap pesan di topic itu
diperlakukan sebagai ditujukan kepadanya. Itu yang diminta pemilik untuk
dihilangkan, dan tiga hal membuat penghilangannya bukan sekadar preferensi.

**Di grup tempat topic bekerja tidak ada gerbang platform sama sekali.**
`createForumTopic` menuntut bot menjadi administrator ber-`can_manage_topics`,
dan Telegram: "Privacy mode is enabled by default for all bots, **except bots
that were added to a group as admins** (bot admins always receive all messages)"
([bots/features](https://core.telegram.org/bots/features)). `done/grup-sapa-dan-menu/spec.md:19-28`
sudah mencatatnya. Jadi gerbangnya kode Caraka atau tidak ada.

**Kalimat yang Caraka sendiri kirim saat pairing sudah menjanjikan aturan yang
lebih ketat.** `group.readyAll` (`i18n.ts:120`), yang ditampilkan tepat pada
konfigurasi admin di atas: "Everything else is read and left alone: no session is
opened, and nothing reaches the coding agent." Di dalam topic sesi kalimat itu
hari ini tidak benar. `docs/frd.md` FR-CHAN-09 juga mencatat keputusan terkunci:
"Tidak ada opsi `requireMention` untuk dimatikan."

**Klausa itu bahkan tidak menguji apa yang orang duga.** Ia menguji `sessionFor`,
bukan kepemilikan thread. Jadi sesi yang dibuat dengan `/new` di dalam topic yang
*dibuka dan dinamai orang lain* juga membuka topic itu untuk teks biasa, padahal
kepemilikan sudah dicatat (`topic.own.<chatId>.<threadId>`, `gateway.ts:1015-1025`).

Setelah klausa itu dihapus, jalan masuk ke topic sesi tetap dua dan keduanya satu
gerakan: menyebut `@bot`, atau membalas salah satu pesan Caraka. `addressed()`
(`telegram.ts:335-340`) sudah menghitung balasan itu, dan sudah mengecualikan
balasan ke service message pembuat topic — yang penting, karena di topic yang
Caraka buka setiap pesan tingkat pertama secara teknis adalah balasan ke service
message itu, dan tanpa pengecualian tersebut klausa 3 akan hidup kembali lewat
pintu lain. Caraka selalu mengirim pesan progres segera setelah membuka topic,
jadi selalu ada pesan untuk dibalas.

Perubahan ini hanya menyentuh forum topic Telegram. `route()` membaca
`message.message_thread_id`; adapter Discord menyetel field itu hanya pada
interaction (`discord.ts:707`, `:731`) yang selalu membawa `addressed: true`
(`:735`), sedangkan `MESSAGE_CREATE` biasa di dalam thread Discord tiba dengan id
thread sebagai `chat.id` dan tanpa `message_thread_id`; dan WhatsApp menolak
container bukan-privat (`whatsapp.ts:425-428`).

Tiga alternatif ditolak dan alasannya ada di "Yang tidak dikerjakan": saklar
per-topic lewat perintah, kunci `requireMention` di `config.yaml`, dan
mempertahankan klausa 3 dengan tambahan pemeriksaan kepemilikan.

### 4. `/help` memberi nasihat yang salah di ruangan

`help.body` (`i18n.ts:49`) berbunyi "Send a task as an ordinary message" dan
dikirim sama di kedua tempat. Di grup Telegram pesan biasa memang tidak pernah
tiba (privacy mode) atau tiba lalu diabaikan (setelah bagian 3), dan di ruangan
mana pun tulis dan eksekusi ditolak sebelum kartu digambar karena ruangan mulai
`read-only` (`docs/security.md` §5). Lima hal berbeda di antara dua container:
apakah pesan biasa tiba, mode kebijakan default, apakah bentuk path diterima,
apakah `/yolo` bekerja, dan siapa yang membaca kartu approval. Satu badan teks
tidak bisa benar di keduanya.

Percabangannya bukan pelanggaran aturan keras 1 dan bukan hal baru: `/status`
(`gateway.ts:2079`) sudah bercabang atas `message.chat.type === "private"` dan
menambahkan `readiness(chatId)` di ruangan. `/help` memakai penambahan yang sama,
sehingga separuh per-channel dari jawaban ruangan tidak memerlukan satu pun kunci
katalog baru dan tetap benar ketika channel keempat mendarat.

Dua batas mengikat teksnya. Panjang: Discord memotong `content` di 2000 karakter
tanpa galat (`discord.ts:267`, `MESSAGE_LIMIT = 2000`, dan hanya `sendResult`
yang memecah), jadi 2000 adalah plafon untuk keempat string. Format: `sendText`
Telegram dipanggil tanpa `parse_mode` (`telegram.ts:373`), jadi backtick dan
asterisk tiba apa adanya di Telegram sementara Discord me-render string yang
sama sebagai markdown — `help.body` hari ini memuat backtick dan
memperlihatkannya. Satu string tidak bisa membawa dua render, jadi ia tidak
membawa apa pun: indentasi dan tanda baca saja.

### Kenapa satu pekerjaan

Keempatnya mengubah perilaku satu ruangan, dan tiga di antaranya bertemu di satu
titik yang sama. Menutup topic tanpa menyempitkan gerbang sapaan menghasilkan
ruangan yang tiap barisnya prompt sampai topic-nya tertutup untuk semua orang.
Menyempitkan gerbang tanpa memperbaiki `/help` menghasilkan pesan yang hilang
tanpa penjelasan, dengan `/help` yang justru menyarankan cara yang tidak bekerja.
Membuka bentuk path dari ruangan tanpa `create` yang lolos kartu membuat contoh
pemilik sendiri mengirim judul sesi sebagai prompt. Dan `/help` adalah satu-satunya
permukaan yang menjelaskan ketiganya kepada orang yang menemukan `/help` di menu
perintah tanpa pernah melihat kartu pairing (`docs/security.md` §4 butir 6).

## Ruang lingkup

`src/core/channel.ts` (deklarasi `resumeThread?`, komentar `finishThread?`),
`src/core/gateway.ts` (`markWorkspace` dan pemanggilnya di cabang `/new`,
klausa ketiga `aimed`, `setState`, urutan kirim-lalu-state di `/stop`,
`cancelForTime`, dan jalur gagal `runTask`, `workspaceForPath`, `offerWorkspace`,
`confirmWorkspace`, `offerTrust`, `help`), `src/channels/telegram.ts`
(`finishThread`, `resumeThread`, pemotong mention di awal teks),
`src/channels/discord.ts` (`resumeThread`, pemotong mention), `src/i18n.ts`
(`help.direct`, `help.room`, penghapusan `help.body`, penamaan ulang
`ws.pathDmOnly`, `ws.slugBad`, `ws.pathOverlap`, `ws.askedOperator`, argumen
`path` di `trust.card`), `test/unit.test.ts`, `test/e2e.test.ts`, `AGENTS.md`
(ledger anggaran), `README.md` dan `README.id.md` (baris `/help`),
`docs/adr/0011-workspace-dari-ruangan-oleh-operator.md` (baru) beserta penanda
di `docs/adr/0010-workspace-dari-chat.md` dan barisnya di `docs/adr/README.md`,
`docs/session-model.md` §3 §5 §6, `docs/telegram-integration.md` §2,
`docs/security.md` §4 butir 9 dan `docs/security.en.md` butir 9,
`docs/frd.md` FR-CHAN-09, dan `site/src/data/docs.ts` (baris `/help`) beserta
baseline tinggi `/docs` bila bergeser.

## Yang tidak dikerjakan

- **Halaman `/guide` di caraka.dev tidak ikut mendarat, dan itu separuh dari
  permintaan 4.** Alasannya ukuran dan gerbang, bukan nilai: rutenya butuh
  `site/src/pages/guide.astro` dan `site/src/data/guide.ts` sebesar
  `/whatsapp-risk` (286 + 155 baris), satu `PageKey` dan satu entri `PAGES`, dan
  baseline baru di tiga berkas test (`site/e2e/site.spec.ts` `EXPECTED`,
  `site/e2e/mobile.spec.ts` `NAVIGATED` dan `WITH_TOC`) — sekitar 500 baris di
  pohon lain, dengan gerbang verifikasinya sendiri, tanpa satu baris kode yang
  dibagi dengan pekerjaan di atas. Dan isinya adalah deskripsi perilaku yang spec
  ini baru ubah: `site/AGENTS.md` menuntut setiap klaim halaman melacak ke
  `docs/` atau `src/`, dan dokumen-dokumen itu baru benar setelah gerbang
  pekerjaan ini hijau. Halaman itu mendapat spec sendiri, `panduan-situs`, dengan
  bentuk yang sudah diputuskan: rute `/guide`, tanpa comp, mengimpor
  `src/styles/pages/docs.css` alih-alih menyalinnya, dengan komentar provenance
  bergaya `src/data/whatsapp-risk.ts` — aturan yang sama yang `site/AGENTS.md`
  catat untuk `/whatsapp-risk`. Sampai halaman itu ada, "versi panjang" di
  `/help` menunjuk `caraka.dev/docs`, yang sudah ada, bukan URL yang belum.
- **Bentuk path tidak dibuka untuk pengirim di allowlist yang bukan operator.**
  Bukan karena approval-nya lemah — kartu bertanda tangan tetap menahan — tetapi
  karena `createSession` (`gateway.ts:1052`) menjadikan peminta sebagai
  `session.principal` dan `db.ts:436` lalu menjadikan peminta satu-satunya yang
  bisa menjawab kartu izin sesi itu. Operator akan menyerahkan satu direktori
  pilihan orang lain **dan** wewenang approval di dalamnya dalam satu tekanan.
- **Tidak ada kunci config berisi root yang boleh menjadi workspace.** Ditolak
  dengan pengukuran di ADR-0010, dan tidak ada yang berubah: root yang berguna di
  mesin ini memuat 89 repositori, pemberiannya tidak lebih kecil daripada seluruh
  disk, containment-nya butuh predikat atas keluaran `realpath` yang tidak bisa
  berjalan saat config dimuat, dan `mount --bind` melewatinya tanpa symlink yang
  bisa dilihat.
- **Tidak ada jalur di mana teks chat sendiri menulis entri workspace**, termasuk
  bentuk grup dengan konfirmasi berupa kata. Aturan keras 2.
- **Tidak ada tombol "percayai workspace ini" di kartu tambah**, dan tidak ada
  penggabungan `ws.add` dengan `openGrant`. Dua pemberian kapabilitas, dua
  keputusan, dua momen.
- **Penjaga keanggotaan-config di `caraka trust` (`cli.ts:955`) tidak dilebarkan**,
  untuk alasan apa pun, di pekerjaan ini. Yang berubah karena keputusan ini adalah
  himpunan path yang `caraka trust <path> --bypass` mau terima, karena operator
  bisa menambah entri config dari chat; itu masih menuntut terminal dan operator
  mengetikkan path-nya, dan itu dicatat di ADR-0011 alih-alih dibiarkan sebagai
  kalimat "chat tidak pernah mencapai `bypassPermissions`" yang berhenti lengkap.
- **Kartu workspace tidak pernah digambar di ruangan bersama.**
  `handleCallback:1763` melucuti keyboard-nya untuk setiap penekan di allowlist.
- **Privacy mode Telegram tidak dipakai sebagai kontrol di satu AC pun.** Ia juga
  mengantar "General commands (e.g. /start) if the bot was the last bot to send a
  message to the group", router perintah berjalan di atas gerbang `aimed`, dan
  pengaturannya bisa diubah dari sisi grup. Ia menentukan bentuk mana yang
  *deterministik* untuk didahulukan di `/help`, bukan batas mana pun.
- **`deleteForumTopic` tidak dipanggil di mana pun**, dan penghapusan otomatis
  topic `done` setelah tujuh hari yang `docs/session-model.md` §6 sebut tetap
  tidak dibangun. Yang diminta adalah ditutup, bukan dihapus.
- **`closeGeneralForumTopic` dan keluarganya tidak dipakai, dan
  `message_thread_id` bernilai `1` tidak pernah dikirim.** `ForumTopicId::general()`
  bernilai 1, `Client::get_forum_topic_id` hanya menolak yang negatif, jadi
  `closeForumTopic` dengan 1 kemungkinan besar benar-benar menutup General.
  Pesan di General tidak membawa `message_thread_id`, sehingga `session.threadId`
  kosong dan `setState` sudah kembali lebih dulu — yang ditambahkan adalah AC yang
  gagal kalau itu berubah, bukan penjaga baru.
- **Saklar mode-jawab per topic lewat perintah (`/quiet` · `/listen`) tidak
  dibangun.** Ia bisa dibangun aman — ia tidak mengubah kebijakan, tidak
  menyetujui aksi, dan tidak menaikkan hak, jadi ia tidak tertahan aturan tunggal
  `docs/security.md` §2, dan tidak menghasilkan efek yang pemakainya tidak bisa
  hasilkan dengan mengetik `@bot` tiap baris. Yang menahannya harga: satu
  perintah, satu kunci `meta`, satu siklus hidup, satu entri `/help`, dan test —
  untuk mengembalikan perilaku yang baru saja diminta hilang, tanpa satu orang
  yang memintanya. Kalau nanti diminta, bentuknya: kunci di `meta` bersandar pada
  `topic.own.*` sehingga hanya bisa disetel di dalam topic yang Caraka buka,
  default `mention`, dibersihkan saat sesi tertutup.
- **Tidak ada kunci `requireMention` di `config.yaml`.** Ia hanya bisa dikunci per
  container, jadi ia tidak bisa menyatakan "topic sesi terbuka, sisa grup tidak"
  — perbedaan yang justru diminta — dan `docs/frd.md` FR-CHAN-09 sudah menolak
  saklar mati untuknya.
- **Klausa 3 tidak dipersempit menjadi pemeriksaan kepemilikan thread.** Itu
  lubang yang lebih kecil, bukan lubang yang tertutup, dan yang salah pada bentuk
  itu tetap berlaku: sebuah kalimat sampingan memulai run atas workspace nyata,
  dan kartu pairing tetap berbohong.
- **`resumeThread` tidak dipanggil untuk memulihkan topic yang ditutup manusia.**
  `ForumTopic` tidak punya `is_closed` dan Bot API tidak punya `getForumTopic`,
  jadi satu-satunya cara mengetahuinya adalah service message
  `forum_topic_closed`/`forum_topic_reopened`, dan mengikutinya berarti menyimpan
  keadaan topic milik orang lain. Yang dilacak Caraka tetap transisi state yang ia
  tulis sendiri.
- **Anggaran laju tidak ditambahkan ke cabang path.** Ia melewati `rateDelay`,
  dan itu tetap benar; setelah keputusan operator-saja, satu-satunya pengirim yang
  bisa mencapainya adalah operator, jadi banjirnya menimpa diri sendiri. Yang
  dibangun adalah penyapu kedaluwarsa, bukan penghitung.
- **Folder yang namanya memuat spasi tidak bisa disebut** di bentuk baru:
  foldernya berakhir di spasi pertama dan tidak bisa dikutip. Salah-pisahnya
  tidak pernah senyap — kartu atau `ws.pathMissing` mencetak path yang benar-benar
  dibaca. Satu komentar `ponytail:` menyebut plafon dan jalan naiknya, yaitu satu
  alternasi `(?:"([^"]+)"|(\S+))` di dua regex.
- **Path relatif tidak pernah menjadi folder**, dan kata polos yang kebetulan
  sebuah slug tetap menjadi judul. Path relatif akan diselesaikan terhadap cwd
  proses gateway, yaitu tempat `caraka start` kebetulan dijalankan, dan membaca
  kata pertama terhadap daftar slug akan mengubah arti pesan yang sudah ada pada
  hari seseorang menambahkan workspace bernama sama.
- **Tidak ada penghapusan yang membayar anggaran di sini.** `pangkas-berulang`
  (14 Agustus 2026) sudah mengukur lima kandidat yang empat spec sebelumnya
  janjikan dan menemukan nilainya −35 baris, bukan +400; spec kelima tidak
  menuliskannya lagi.
- **Dua klaim Telegram tetap tidak terverifikasi terhadap server sungguhan** dan
  tidak dijadikan dasar satu AC pun: bahwa bot masih bisa `sendMessage` ke topic
  yang ia tutup sendiri, dan `description` persis yang diterima bot tanpa
  `can_manage_topics`. Keduanya bersandar pada sumber TDLib, dicatat sebagai
  begitu, dan urutan kirim-lalu-tutup di AC-1.5 membuat yang pertama tidak lagi
  menjadi ketergantungan.

## Acceptance criteria

### AC-1 · Topic sesi ditutup, bukan dihapus

- **AC-1.1** WHEN sebuah sesi mencapai `done`, `failed`, atau `cancelled` dan
  thread-nya tercatat milik Caraka, adapter Telegram shall memanggil
  `closeForumTopic` dengan `chat_id` dan `message_thread_id` sesi itu.
- **AC-1.2** Adapter Telegram shall tidak pernah memanggil `deleteForumTopic`,
  dan sebuah test shall gagal bila nama method itu muncul di `src/`.
- **AC-1.3** WHEN topic ditutup, penggantian nama ber-glif shall tetap terjadi
  lebih dulu, sehingga nama topic tetap terbaca sebagai papan status.
- **AC-1.4** IF `closeForumTopic` menjawab galat, THEN state sesi shall tetap
  tertulis, penggantian nama shall tetap terjadi, dan tidak ada galat yang
  mencapai chat.
- **AC-1.5** WHEN sesi berakhir lewat `/stop`, lewat timeout run, atau lewat
  kegagalan, pesan terakhir ke topic itu shall terkirim sebelum `setState`
  menutupnya.
- **AC-1.6** WHERE thread tidak tercatat dibuka Caraka, gateway shall tidak
  memanggil `finishThread` maupun `resumeThread`, dan shall menulis satu baris
  audit `topic.skip` `unowned`.
- **AC-1.7** WHEN state sesi berpindah dari `done`, `failed`, atau `cancelled` ke
  `running`, gateway shall memanggil `resumeThread` sekali; WHILE state berpindah
  `running` → `awaiting_approval` → `running`, gateway shall tidak memanggilnya.
- **AC-1.8** Gateway shall tidak pernah mengirim `message_thread_id` bernilai `1`
  ke `closeForumTopic` atau `reopenForumTopic`, dan pesan di topic General shall
  tetap keluar dari `setState` pada penjaga `threadId` kosong.
- **AC-1.9** Adapter Discord shall menutup dengan `{archived: true}` dan membuka
  dengan `{archived: false}`, tanpa perubahan pada satu pun jalur bersama.

### AC-2 · Bentuk path dari ruangan, operator saja, kartu di DM

- **AC-2.1** WHEN operator sebuah channel menulis token berbentuk path di
  container mana pun yang channel itu layani, gateway shall merutekan tugas itu
  ke workspace ber-path tersebut.
- **AC-2.2** IF pengirimnya bukan operator channel itu, THEN gateway shall
  menolak dengan kalimat yang menyebut siapa yang boleh memakai bentuk itu, shall
  menulis satu baris audit `ws.path` `denied`, dan shall berlaku sama di
  percakapan pribadi maupun di ruangan.
- **AC-2.3** WHERE container asalnya bukan percakapan pribadi antara Caraka dan
  operator, kartu tambah-workspace shall dikirim ke percakapan pribadi itu dan
  shall tidak dikirim ke container asal.
- **AC-2.4** WHERE container asalnya bukan percakapan pribadi operator, satu-satunya
  hal yang Caraka kirim ke container itu shall satu kalimat tetap yang menyebut
  di mana jawabannya diberikan — sama untuk direktori yang ada, yang tidak ada,
  yang bukan direktori, slug yang terpakai, slug yang ditolak, dan path yang
  tumpang-tindih.
- **AC-2.5** IF kartu itu ditekan principal selain operator channel tersebut,
  THEN `confirmed()` shall menolaknya dan shall menulis `ws.add` `denied`.
- **AC-2.6** WHEN kartu itu disetujui, sesi shall lahir di container asal pesan,
  bukan di percakapan pribadi tempat kartunya dijawab.
- **AC-2.7** Entri `pendingWorkspaces` shall menyimpan operator sebagai
  `principal`, dibaca dari `operatorOf(chatId)` dan tidak dari `message.from`.

### AC-3 · `/new <folder> <judul>` dalam satu pesan

- **AC-3.1** WHEN argumen pertama `/new` berbentuk absolut setelah `~/`
  dikembangkan, gateway shall membacanya sebagai folder dan sisa barisnya sebagai
  judul.
- **AC-3.2** IF argumen pertama `/new` tidak absolut, THEN seluruh baris shall
  menjadi judul, termasuk ketika ia memuat garis miring dan ketika ia kebetulan
  sebuah slug workspace.
- **AC-3.3** WHERE argumen pertama sudah dimulai `@`, gateway shall meneruskan
  argumen itu tanpa perubahan.
- **AC-3.4** Di luar `/new`, sebuah token shall hanya dibaca sebagai workspace
  ketika ia dimulai `@`, sehingga baris yang dibuka path absolut tetap sebuah
  prompt.
- **AC-3.5** WHEN mention bot ini berada di offset 0 sebuah pesan, adapter shall
  memotongnya sebelum teks mencapai core, di container mana pun, dan shall
  memotongnya hanya di offset 0.
- **AC-3.6** WHEN `/new <path-baru> <judul>` disetujui lewat kartu, hasilnya shall
  sebuah sesi berjudul itu tanpa satu prompt pun dikirim ke driver.
- **AC-3.7** IF pesan hanya berisi mention bot ini dan tidak ada teks lain, THEN
  ia shall dijatuhkan tanpa balasan.

### AC-4 · Empat cacat yang sudah terkirim

- **AC-4.1** IF slug yang diturunkan dari `basename` tidak cocok `/^[\w.-]+$/`,
  THEN gateway shall menolak sebelum kartu digambar, dan `@/` shall tidak pernah
  menghasilkan entri `config.yaml` yang `loadConfig` menolak.
- **AC-4.2** IF slug yang diusulkan sama dengan slug yang ada tanpa membedakan
  huruf besar-kecil, atau path yang diusulkan sama dengan path yang ada tanpa
  membedakan huruf besar-kecil, THEN gateway shall menolak dan menyebut yang
  sudah ada.
- **AC-4.3** IF path yang diusulkan memuat, berada di dalam, atau sama dengan
  path workspace yang sudah ada, THEN gateway shall menolak dan menyebut
  workspace yang bertumpang-tindih dengannya.
- **AC-4.4** `trust.card` shall menyebut path workspace di samping slug-nya, di
  kedua katalog.
- **AC-4.5** WHEN sebuah entri masuk ke `pendingWorkspaces` atau `pendingTrust`,
  entri yang `expiresAt`-nya sudah lewat shall dibuang.

### AC-5 · Topic sesi bukan pengecualian gerbang sapaan

- **AC-5.1** IF pesan biasa ber-`addressed` false tiba di thread yang memegang
  sesi Caraka, THEN core shall tidak menyerahkannya ke jalur agent dan shall
  menulis `msg.in` `ignored`.
- **AC-5.2** WHEN pesan itu membalas salah satu pesan Caraka sendiri, core shall
  menjalankannya sebagai lanjutan sesi itu; WHEN ia membalas service message
  pembuat topic, core shall tidak.
- **AC-5.3** WHEN `/stop`, `/lock`, `/status@<bot>`, atau balasan berbentuk kode
  approval tiba di ruangan tanpa menyapa, core shall tetap menjawabnya —
  gerbangnya tetap cabang terakhir `dispatch`, di bawah pemeriksaan kode dan di
  bawah seluruh router.
- **AC-5.4** `done/grup-sapa-dan-menu/spec.md` AC-2.1 shall ditandai digantikan
  oleh AC-5.1, dan shall tidak ada opsi konfigurasi untuk mematikan gerbang itu.

### AC-6 · `/help` yang bisa dibaca manusia

- **AC-6.1** WHERE container adalah percakapan pribadi, `/help` shall menjawab
  `help.direct`; WHERE bukan, ia shall menjawab `help.room` diikuti
  `readiness(chatId)` yang sama dengan yang `/status` tambahkan.
- **AC-6.2** `help.direct` shall lebih pendek dari 2000 karakter, dan `help.room`
  ditambah kalimat kesiapan terpanjang yang tersedia shall lebih pendek dari 2000
  karakter, di kedua katalog.
- **AC-6.3** Keempat badan itu shall tidak memuat backtick maupun asterisk.
- **AC-6.4** `help.direct` shall memuat contoh tugas biasa, contoh `@slug`,
  contoh bentuk path, kalimat bahwa tiap tugas mendapat topic sendiri dan
  topic itu ditutup — bukan dihapus — saat sesi berakhir, kalimat bahwa tidak ada
  kata yang bisa menyetujui apa pun, dan satu baris per perintah gateway.
- **AC-6.5** `help.room` shall memuat: bahwa hanya yang ditujukan kepada Caraka
  dijawab, **termasuk di dalam topic sesi**; bagaimana menujukannya; bahwa
  ruangan mulai `read-only` sampai seseorang memasukkannya di `config.yaml`;
  bahwa setiap yang bisa membaca ruangan membaca kartu approval, path, diff, dan
  keluaran perintah; dan bahwa folder di sana disebut lewat slug, sementara
  operator boleh menyebut path dan pertanyaan yang menuliskannya diajukan di
  percakapan pribadinya.
- **AC-6.6** `help.body` shall dihapus dari kedua katalog, dan `help.direct`
  serta `help.room` shall ada di keduanya sehingga `tsc` gagal bila satu
  terjemahan hilang.

### AC-7 · Dokumen, kontrak, dan ledger

- **AC-7.1** ADR-0011 shall mencatat bahwa bentuk path diterima di container mana
  pun dari operator, bahwa yang dijaga keputusan 1 ADR-0010 adalah siapa yang
  memilih string-nya, dan bahwa himpunan path yang `caraka trust --bypass` mau
  terima ikut melebar; ADR-0010 shall mendapat penanda "Sebagian digantikan"
  bergaya ADR-0006, dan `docs/adr/README.md` shall menyebutnya.
- **AC-7.2** `docs/session-model.md` §3, §5, dan §6 shall setuju dengan kode:
  ditutup di grup, tidak ditutup di DM, ringkasan sebelum penutupan, dan apa yang
  terjadi pada pesan di topic sesi yang sudah selesai.
- **AC-7.3** `docs/telegram-integration.md` §2 shall menyebut penutupan di grup
  beserta pengecualian pencipta topic, dan shall mempertahankan alasan DM tidak
  ditutup.
- **AC-7.4** `docs/security.md` §4 butir 9 dan `docs/security.en.md` butir 9
  shall menyebut penutupan sebagai efek samping ketiga yang tertahan penjaga
  kepemilikan.
- **AC-7.5** `docs/frd.md` FR-CHAN-09 shall mencatat bahwa gerbang sapaan berlaku
  di dalam topic sesi juga.
- **AC-7.6** Tidak ada komentar di `src/core/channel.ts`, `src/core/gateway.ts`,
  atau `src/channels/telegram.ts` yang shall menyatakan Telegram tidak punya cara
  menutup topic.
- **AC-7.7** Baris `/help` di `README.md`, `README.id.md`, dan
  `site/src/data/docs.ts` shall menyebut apa yang `/help` benar-benar jawab,
  termasuk bahwa jawaban di ruangan berbeda.
- **AC-7.8** Ledger anggaran `AGENTS.md` shall memuat angka terukur `src/`
  sesudah pekerjaan ini, selisihnya terhadap perkiraan di plan, dan pagunya shall
  tetap ~8.000.

## Harga

Perkiraan **~190 baris** di `src/`, terhadap `src/` yang mengukur **9.668 baris**
pada 14 Agustus 2026, 1.668 di atas pagu ~8.000. Tidak ada penghapusan yang
mengiringinya, dan tidak ada yang dijanjikan: `pangkas-berulang` sudah mengukur
kelima kandidat yang empat spec sebelumnya janjikan dan menemukan nilainya −35
baris.

Perkiraan itu ditulis sebelum kodenya ada, dan ledger `AGENTS.md` mencatat lima
perkiraan terakhir masing-masing rendah: 12 → 22, 55 → 160, 185 → 487,
100 → 262, 12 → 26. Sebab yang ledger sebut adalah harga membuat sebuah keputusan
bisa dicapai dari test, yaitu seam yang disuntikkan. Di sini seam itu sudah ada —
`markWorkspace` murni dengan `home` yang sudah menjadi parameter (kasus murah
`path-tilde`), `directTo` sudah ada, dan harness test sudah merekam pemanggilan
method channel — jadi angka yang pantas diharapkan **220 sampai 320**, bukan
kelipatan dua sampai tiga. Yang masuk ledger adalah angka terukur, apa pun
hasilnya.

Di `site/` pekerjaan ini menyentuh satu baris data dan mungkin satu baseline
tinggi. Sekitar 500 baris `site/` untuk halaman `/guide` tidak dihitung di sini
karena tidak dikerjakan di sini.
