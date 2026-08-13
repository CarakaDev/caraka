# Spec — new-judul-workspace: `/new` membawa judulnya dan bisa memilih workspace

**Status:** dalam pengerjaan · **Tanggal:** 13 Agustus 2026

## Latar

Satu pesan dibaca kata perintahnya di dua tempat yang tidak sepakat.
`parseCommand` (`src/core/gateway.ts:425-428`) membuang `/cmd` dan `/cmd@bot`
lalu menyerahkan sisanya sebagai `argument`. `dispatch:410` tidak memakai
`argument` itu: ia meneruskan teks mentah ke `routeTask`, dan dua pembaca di
belakangnya menganggap kata perintah sudah hilang — anchor rute
`/^@([\w.-]+)(?:\s+|$)/` di `:442`, dan `title()` di `:732-740` yang mencoba
mengulang penguraian itu dengan regex yang lebih lemah.

Yang terjadi pada `/new Kerjaan Dummy`, ditelusuri di kode dan diperiksa di
node:

- `routeTask` menerima `"/new Kerjaan Dummy"`, jadi anchor `^@` tidak pernah
  cocok: `/^@([\w.-]+)(?:\s+|$)/.exec("/new @dummy")` → `null`. Cabang slug mati
  untuk perintah ini, dan `/new @dummy` bukan rute.
- `queueRun` (`:468-471`) membuang parameter `text`-nya di cabang create, dan
  `createOnly` (`:824-827`) memasang `t("session.untitled")` sebagai judul. Judul
  yang ditulis pengguna tidak punya tempat untuk sampai.
- Di chat dengan lebih dari satu workspace, `:462` mengosongkan teksnya
  (`create ? "" : text`) dan entri `pendingChoice` (`:96-99`) tidak punya field
  `create`. Sepuluh menit kemudian tombolnya ditekan, `:517` membaca
  `if (waiting.text)` yang bernilai salah, dan jawabannya hanya `ws.sticky`.
  `/new` di chat seperti itu tidak membuat sesi apa pun.
- `title()` mencocokkan `/^\/new\s*/i`, dan `\s*` boleh nol karakter, jadi
  `/newsletter draft` diberi judul `sletter draft`. Jalur itu hidup: perintah
  slash yang belum dikenal core diteruskan ke agent lewat `:411-413`, dan
  teksnya menjadi prompt sekaligus judul.

Satu hal lagi lewat pemotong yang sama dan sudah hidup hari ini lewat `runTask`.
`.slice(0, 72)` memotong per UTF-16 code unit, jadi potongannya bisa jatuh di
tengah pasangan surrogate:
`("a".repeat(71) + "😀").slice(0, 72)` berakhir di `\ud83d`. `JSON.stringify`
menulis separuh pasangan itu sebagai escape `\ud83d` (`telegram.ts:111`), jadi
badan permintaannya sah dan yang menolak `createForumTopic` ada di sisi Telegram:
sebuah string yang bukan UTF-8. Bunyi penolakannya tidak dicatat di sini karena
tidak ada yang membacanya — `catch` di `createSession` (`:790-793`) langsung
memanggil `noteThreadsOff`: meta `threads.<chatId>` menjadi `off`
untuk seluruh container, dan hanya `caraka doctor` yang membukanya lagi. Nama
topic sendiri boleh 1–128 karakter
([Bot API, `createForumTopic`](https://core.telegram.org/bots/api#createforumtopic)),
dan 72 ditambah glif dua karakter tidak pernah menyentuh batas itu — yang
menolak panggilan adalah bentuk byte-nya, bukan panjangnya.

Jadi `/new` harus membawa judul yang ditulis pengguna, dan harus bisa memilih
workspace lewat `@slug` maupun lewat tombol. Kedua pembaca itu harus sepakat
siapa yang membuang kata perintah.

## Ruang lingkup

`src/core/gateway.ts`: perute perintah di `dispatch`, `routeTask`, `queueRun`,
`askWorkspace`, `chooseWorkspace`, entri `pendingChoice`, `title()`, dan
`createOnly`. `src/core/channel.ts`: deskripsi perintah `new` yang didaftarkan ke
channel. Dokumen yang mendaftarkan `/new` sebagai perintah: `docs/frd.md`
(FR-SESS-03), `docs/ui-ux.md`, `docs/install-guide.md`,
`docs/install-guide.en.md`, `README.md`, dan `README.id.md`. Test:
`test/e2e.test.ts` (harness dan test baru) serta `test/unit.test.ts` (judul,
katalog, korpus fuzz).

Biaya anggaran: **+9 baris net di `src/`**, 8.498 menjadi 8.507. Angka awalnya
terukur (`find src -name '*.ts' | xargs wc -l`) dan sama dengan yang dicatat
`AGENTS.md:21`. Tujuh dari sembilan baris itu komentar, yang mencatat dua bentuk
salah: pemenggalan perintah kedua di `title()`, dan potongan 72 yang tidak
melihat pasangan surrogate. `AGENTS.md` menyebut komentar semacam itu hal
terakhir yang harus dibeli kembali dari anggaran. Baris kedelapan adalah field
`create` pada entri `pendingChoice`; baris kesembilan dibuat `oxfmt`, yang
memecah kondisi jawaban tombol menjadi dua baris begitu bentuk satu barisnya
melewati 100 kolom. Baris `.replace(/^\/new\s*/i, "")` yang dihapus membayar
potongan aman surrogate yang menggantikannya, jadi rantai di `title()` sendiri
tidak bergerak. Tidak ada penghapusan lain yang dipakai: penghapusan yang
tersedia di repositori ini semuanya refactor di berkas yang tidak disentuh
pekerjaan ini, dan `Channel.getMe()` sudah dipesan sebagai pembayaran gerbang
mention. Angkanya dicatat, sebagaimana `AGENTS.md` mencatat +149 pada 10 Agustus
2026, dan plafon tidak digeser. Jumlah terukurnya ditempel di plan sesudah
gerbang.

## Yang tidak dikerjakan

- Tidak memotong `@slug` yang berada di belakang teks. `/new Kerjaan @dummy`
  tetap berjudul `Kerjaan @dummy`; anchor rute hanya membaca depan pesan, dan
  slug di dalam judul tidak merutekan apa pun.
- Tidak mengubah presedensi topic sesi (`:431-434`, `:438-441`). Di dalam topic
  yang sudah punya sesi, `/new @slug <teks>` membuat sesi di workspace topic itu
  dan `@slug` ikut ke judulnya, karena cabang topic menjawab sebelum anchor rute
  dibaca. Karena itu setiap AC-2 menyebut "di luar topic sesi".
- Tidak mengganti nama topic yang sudah ada. `/new <judul>` di dalam topic yang
  sudah berisi sesi menulis judul ke baris sesi dan ke dasbor, sementara nama
  topic masih menampilkan judul sesi sebelumnya, karena `editTopic` hanya
  dipanggil dari `setState` (`:949-957`) dan `createOnly` berhenti di
  `sendToSession`. Perilaku itu sudah begitu sebelum perubahan ini.
- Tidak menutup sesi lama ketika sesi baru dibuat di route yang sama.
  `createOnly` memakai `force=true`, dua baris berbagi `(chat_id, thread_id)`,
  dan yang lebih baru menang lewat `ORDER BY updated_at DESC`.
- Tidak memasang gerbang mention. Itu pekerjaan `spec/grup-sapa-dan-menu.md`,
  yang memakai `if (threadId && session)` dan bukan `pendingChoice`
  (`plan/grup-sapa-dan-menu.md:62`), jadi entri yang disentuh di sini tidak ikut
  memutuskan siapa yang disapa.
- Tidak menambah kunci i18n. `session.untitled` sudah ada di kedua katalog
  (`src/i18n.ts:7` dan `:296`), dan daftar perintah di `help.body` tetap menulis
  nama perintah tanpa argumennya, sama seperti untuk `/switch` dan `/ingat`.
- Tidak mengubah batas 72 di core, 128 di `topicName`
  (`src/channels/telegram.ts:75`), atau 100 di `threadName`
  (`src/channels/discord.ts:36`).
- Tidak menambah field pada `ChannelCaps` dan tidak menambah metode pada
  `Channel`.
- Tidak menyentuh `src/channels/`. Discord sudah mendaftarkan opsi `argument`
  generik untuk setiap perintah (`src/channels/discord.ts:393`), jadi
  `/new <judul>` di sana tidak butuh pendaftaran ulang.
- Tidak memindahkan gerbang mana pun di `dispatch`. Pembacaan kode approval
  tetap di depan perute perintah.
- Tidak menyentuh caption, lampiran, atau `docs/session-model.md` §5, yang sudah
  menulis aturan `@workspace` tanpa mengecualikan pesan yang membawa perintah.

## Acceptance criteria

### AC-1 · Kata perintah dipenggal satu kali

- **AC-1.1** WHEN pesan `/new <teks>` masuk, gateway shall meneruskan ke perute
  hanya bagian pesan sesudah kata perintah.
- **AC-1.2** WHEN pesan `/new@<bot> <teks>` masuk, judul sesi shall tidak memuat
  `@<bot>`.
- **AC-1.3** WHEN pesan `/newsletter draft` diteruskan ke agent karena core belum
  tahu perintah apa yang dijawab agent itu, judul sesi shall `/newsletter draft`.
- **AC-1.4** Prompt yang sampai ke driver shall selalu berupa ekor dari pesan
  yang datang.
- **AC-1.5** WHEN `/new` diproses, gateway shall tidak mengirim prompt apa pun ke
  driver.

### AC-2 · `@slug` di depan `/new`

- **AC-2.1** WHEN `/new @slug <teks>` masuk di luar topic sesi pada chat dengan
  lebih dari satu workspace, gateway shall membuat sesi di workspace bernama
  `slug`.
- **AC-2.2** WHEN `/new @slug <teks>` masuk di luar topic sesi, gateway shall
  menulis `ws.last.<chatId>` ke `slug`.
- **AC-2.3** WHEN `/new @slug <teks>` masuk di luar topic sesi, judul sesi shall
  teks sesudah slug.
- **AC-2.4** IF `/new @slug` masuk di luar topic sesi tanpa teks di belakang
  slug, THEN judul sesi shall sama dengan `session.untitled`.
- **AC-2.5** IF slug pada `/new @slug` di luar topic sesi tidak ada di config,
  THEN gateway shall menjawab `ws.unknown`.
- **AC-2.6** IF slug pada `/new @slug` di luar topic sesi tidak ada di config,
  THEN gateway shall tidak membuat sesi.

### AC-3 · Jawaban tombol workspace

- **AC-3.1** WHILE sebuah `/new <teks>` menunggu jawaban tombol workspace, WHEN
  tombolnya ditekan, gateway shall membuat tepat satu sesi di workspace yang
  ditekan.
- **AC-3.2** WHILE sebuah `/new <teks>` menunggu jawaban tombol workspace, WHEN
  tombolnya ditekan, judul sesi shall teks itu.
- **AC-3.3** WHILE sebuah `/new <teks>` menunggu jawaban tombol workspace, WHEN
  tombolnya ditekan, gateway shall tidak mengirim prompt ke driver.
- **AC-3.4** WHILE sebuah `/yolo` menunggu jawaban tombol workspace, WHEN
  tombolnya ditekan, gateway shall tidak membuat sesi.
- **AC-3.5** WHILE sebuah `/yolo` menunggu jawaban tombol workspace, WHEN
  tombolnya ditekan, gateway shall menjawab `ws.sticky`.
- **AC-3.6** IF tombol workspace ditekan principal lain atau ditekan setelah
  entrinya kedaluwarsa, THEN gateway shall menjawab `callback.invalid`.
- **AC-3.7** IF tombol workspace ditekan principal lain atau ditekan setelah
  entrinya kedaluwarsa, THEN gateway shall tidak membuat sesi.

### AC-4 · Judul sesi

- **AC-4.1** WHEN `/new <teks>` masuk, judul sesi shall baris pertama teks itu.
- **AC-4.2** WHEN baris pertama teks `/new` lebih panjang dari 72 karakter, judul
  sesi shall 72 karakter pertamanya.
- **AC-4.3** IF `/new` datang tanpa teks, THEN judul sesi shall sama dengan
  `session.untitled` pada katalog bahasa yang aktif.
- **AC-4.4** IF potongan 72 jatuh di tengah pasangan surrogate, THEN judul shall
  tidak berakhir dengan setengah pasangan itu.
- **AC-4.5** WHERE container bisa menahan topic, WHEN sesi dibuat oleh
  `/new <teks>`, gateway shall memanggil `createTopic` dengan judul itu.
- **AC-4.6** WHERE container tidak bisa menahan topic, WHEN sesi dibuat oleh
  `/new <teks>`, sesi shall tetap terbentuk dengan judul itu pada barisnya.
- **AC-4.7** Deskripsi perintah `new` yang didaftarkan ke channel shall menyebut
  judul sebagai argumen opsional.

### AC-5 · Dokumen

- **AC-5.1** Setiap dokumen yang mendaftarkan `/new` sebagai perintah shall
  menuliskan judul opsionalnya, dalam bahasa dokumen itu.
