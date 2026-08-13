# Plan — lampiran-chat

**Spec:** [`spec/lampiran-chat.md`](../spec/lampiran-chat.md) · **Tanggal:** 13 Agustus 2026

## Langkah

1. **Prasyarat, sebelum satu baris ditulis.** `scrubber-token-url` mendarat lebih
   dulu; hari ini ia masih di `spec/` dan `plan/`, dan
   `security.ts:8` masih `/\b\d{6,12}:…/`, di mana `\b` di depan angka tidak pernah
   cocok di dalam `bot8123456789:AAH…` karena `t` dan `8` keduanya karakter
   kata, jadi URL unduhan lolos scrubber apa adanya. Setiap baris audit
   (`db.ts:498-509`) dan setiap error driver CLI (`drivers/cli.ts:161,166`)
   melewati scrubber itu, dan tabel audit punya trigger `audit_no_update` dan
   `audit_no_delete`. Pekerjaan ini juga mendarat **sesudah** perbaikan router
   `/new` dan gerbang sapaan grup: caption menjadi `message.text`, jadi ia masuk
   ke `parseCommand` dan ke `aimed`, dan menulisnya lebih dulu berarti menulisnya
   terhadap router yang sedang berubah.

2. **`src/core/channel.ts` — kontrak.** Dua tambahan di `InboundMessage` dan di
   `interface Channel`:

   Komentarnya dalam bahasa Inggris, seperti setiap komentar lain di `src/`:

   ```ts
   /**
    * What arrived that is not text. `kind` is a neutral word — `image`,
    * `document`, `audio`, `video`, `sticker`, `location` — and never a channel's
    * own field name; `docs/design.md` already chose those words. `tooBig` is set
    * by the adapter that knows its own download ceiling, so core refuses before a
    * byte is asked for without storing any channel's ceiling.
    */
   attachments?: Array<{ kind: string; mime?: string; size?: number; tooBig?: boolean }>;
   ```

   ```ts
   /**
    * Write attachment `index` of this message to `target`. Optional, the way
    * `finishThread?` and `direct?` declare a capability. The adapter downloads,
    * because a Telegram download URL carries the bot token. The argument is the
    * message object this adapter emitted, so it re-reads its own fields and no
    * file identifier crosses into core. Null means the adapter refused, and core
    * answers with one sentence.
    */
   fetchAttachment?(message: InboundMessage, index: number, target: string): Promise<string | null>;
   ```

   Di berkas yang sama, pasangan `target()`/`route()` di `discord.ts:241-247` dan
   di `whatsapp.ts:183-189` — identik kecuali nama kelasnya — menjadi satu
   pasangan helper beserta satu salinan komentarnya (−6).

3. **`src/core/gateway.ts:382-389` — penjaga dan baris audit.**

   ```ts
   const text = message.text?.trim();
   const attachments = message.attachments ?? [];
   if (!text && attachments.length === 0) return;
   // `aimed` and the result argument below belong to `grup-sapa-dan-menu`, which
   // lands first; its three clauses sit between this guard and this call.
   this.store.audit(
     "msg.in",
     aimed ? "accepted" : "ignored",
     {
       bytes: Buffer.byteLength(text ?? ""),
       sha256: createHash("sha256").update(text ?? "").digest("hex"),
       ...(attachments.length
         ? { attachments: attachments.map((a) => ({ kind: a.kind, mime: a.mime, size: a.size })) }
         : {}),
     },
     principal,
   );
   ```

   `map` menulis tiga properti, bukan menyalin entrinya, jadi `tooBig` dan apa
   pun yang adapter tambahkan nanti tidak pernah ikut ke baris audit. Urutan
   tidak berubah: penjaga tetap di bawah kedua allowlist dan tetap di atas baris
   audit, jalur kode approval, dan router. Argumen hasil `aimed ? … : …` disalin
   apa adanya dari `grup-sapa-dan-menu` langkah 5 — menuliskannya kembali sebagai
   `"accepted"` akan membatalkan gerbang sapaan tanpa satu test pun mengeluh.

4. **`src/channels/telegram.ts` — tipe, klasifikasi, dan satu-satunya pengunduh.**
   Satu tipe berkas
   bersama (`file_id`, `file_size?`, `mime_type?`,
   `width?`/`height?`) dipakai delapan slot berkas di `TelegramMessage`
   (`:27-33`), plus `caption?`.

   **Dikoreksi saat membangun.** `file_unique_id` tidak dideklarasikan: tidak ada
   yang membacanya, dan field tanpa pembaca adalah janji yang tidak diperiksa
   siapa pun (`docs/api.md` §5) — aturan yang sama yang membuat
   `is_topic_message` tidak ada di berkas ini. `caption_entities?` justru
   ditambahkan, dan `addressed()` membacanya sebagai pasangan `entities`: begitu
   caption menjadi `text`, foto ber-caption yang menyebut nama bot di sebuah ruang
   akan terbaca "tidak menyapa" dan hilang lagi, kali ini di gerbang sapaan
   alih-alih di penjaga teks. Offsetnya cocok karena caption sudah dipindahkan ke
   `text` lebih dulu. Dua baris, dan tanpa keduanya pekerjaan ini menutup satu
   lubang dan membuka satu lagi di sebelahnya. Slot kesembilan, `location`, punya bentuknya
   sendiri (`latitude`/`longitude`) dan tidak punya `file_id` sama sekali: ia
   diklasifikasi, diaudit, dan dijawab kalimat AC-1.10, tanpa pernah melewati
   jalur unduhan. Satu tabel slot → kata netral (AC-1.6), satu fungsi
   `attachmentsOf(message)` yang mengembalikan entri kontrak, dan di `updates()`
   pesan diperkaya sebelum `yield`: `text` jatuh ke `caption`, `attachments`
   diisi kalau ada. Foto dipilih dengan `width * height` terbesar, karena Bot API
   tidak menjanjikan urutan `photo[]`. `tooBig` diisi di sini, dibandingkan
   dengan plafon 20 MB milik berkas ini.

   Di kelas yang sama, `fetchAttachment` — satu-satunya implementasi di
   repositori ini. Ia memanggil `getFile` saat itu juga, mengalirkan badan
   respons ke `target` sambil menghitung byte, dan pada byte yang melewati 20 MB
   ia berhenti membaca dan mengembalikan null (AC-4.3).

   **Dikoreksi saat membangun.** Tidak ada berkas separuh yang perlu dihapus:
   badan respons dikumpulkan lebih dulu dan `writeFile` dipanggil sekali setelah
   pembacaan selesai, jadi unduhan yang melewati plafon tidak pernah menyentuh
   disk sama sekali. Memorinya terbatas pada plafon 20 MB yang sama, dan berkas
   gambar memang dibaca utuh lagi di rute ACP. URL `…/file/bot<token>/<file_path>`
   dibangun dan habis di dalam metode ini; yang keluar hanya path berkas atau
   null (AC-2.3).

5. **`src/channels/discord.ts` — klasifikasi saja.** `WireMessage` (`:85-91`)
   mendapat `attachments?: Array<{ content_type?: string; size?: number }>`,
   `:653` menjadi `if (!message.content && !message.attachments?.length) return;`,
   dan `onMessage()` (`:648-664`), yang menyusun objek pesan sebelum `emit()`,
   mengisi entri hanya ketika `message.guild_id` kosong. Alasannya
   ditulis sebagai komentar di sebelah `INTENTS` (`:30`): `attachments` ada di
   daftar redaksi MESSAGE_CONTENT secara verbatim, jadi menjawab untuk pesan
   guild berarti berbohong. Tidak ada `fetchAttachment` di kelas ini.

6. **`src/channels/whatsapp.ts` dan `whatsapp-baileys.ts` — caption dan jenis.**
   `receive()` mendapat parameter keempat opsional berisi entri lampiran, dan
   gerbang tipe di `:384-387` diperluas untuk menolaknya kalau bentuknya bukan
   array. `ingest()` (`:571-586`) membaca slot medianya — **dikoreksi saat
   membangun:** slotnya yang dibaca, bukan `message.type` di sebelahnya, karena
   caption dan mime memang ada di dalam slot itu, jadi satu pembacaan menjawab
   ketiga pertanyaan dan tidak ada field kedua yang bisa tidak sepakat dengan yang
   pertama. `textOf()`
   (`whatsapp-baileys.ts:88-90`) mendapat pasangan `kindOf()` yang membaca
   `imageMessage`, `videoMessage`, `audioMessage`, `documentMessage`, dan
   `stickerMessage`. Tidak ada `fetchAttachment` di kelas ini.

7. **`src/core/driver.ts` — kemampuan route.** `readonly acceptsFiles?: boolean;`
   dengan komentar seperti milik `asksPermission`, dan parameter keempat opsional
   `files?: string[]` pada `prompt()`. Core membacanya persis seperti ia membaca
   `asksPermission` di `gateway.ts:850`.

8. **`src/drivers/preset.ts`, `presets/agents/codex.yaml`, `src/drivers/cli.ts`.**
   Skema preset mendapat `imageArg: z.string().min(1).optional()` dan
   `imageMode: z.enum(["repeat", "join"]).default("repeat")` — dua kata itu, bukan
   dua kata baru, karena `imageMode: repeat|join` adalah bentuk yang sudah dicatat
   di `docs/research/coding-agents-matriks-integrasi-multi-sumber.md:88`. `codex.yaml`
   mendapat `imageArg: "-i"` beserta sumbernya di komentar
   (openai/codex#2085: codex butuh `--image/-i` dan tidak membaca gambar dari
   path di dalam prompt). `CliDriver` menyetel `acceptsFiles` dari
   `Boolean(preset.imageArg)` dan menyusun argv sesuai `imageMode`.
   `claude-code.yaml` sengaja tidak diberi flag apa pun, dengan alasan dan
   nomor issue-nya di komentar berkas itu (Batas yang diakui butir 1).

9. **`src/drivers/claude-acp.ts` — respons `initialize` disimpan.** `:81-84`
   menyimpan hasil `request` alih-alih membuangnya, dan
   `acceptsFiles = response.agentCapabilities?.promptCapabilities?.image === true`.
   Di `prompt()`, `files` yang ber-mime gambar dibaca dengan `readFile`, menjadi
   `{ type: "image", mimeType, data: base64 }` di depan blok teks. `uri` tidak
   pernah diisi: `claude-agent-acp` meneruskan `ImageContent.uri` yang berawalan
   `http` sebagai sumber gambar (`acp-agent.js:5366-5373`), yang berarti URL
   unduhan Telegram akan masuk ke konteks model.

10. **`src/config.ts` dan `src/cli.ts` — path.** `carakaPaths` mendapat
    `inbox: join(base, "inbox")` beserta komentar seperti milik `discovery`
    ("path yang tidak dituliskan siapa pun adalah path yang ditinggalkan
    uninstall"), dan `uninstallTargets` (`cli.ts:885-895`) mendapat
    `paths.inbox`. Bukan di bawah `secrets/`, yang isinya kredensial. `gateway.ts`
    sudah mengimpor `../config.js` untuk `channelBlocks` dan `workspaces`, jadi
    `carakaPaths` ikut ke impor yang sama dan arah dependensi tidak berubah; test
    menyetel `CARAKA_HOME`, yang sudah dibaca `carakaPaths` di `config.ts:207`.

11. **`src/core/security.ts` — nama dan daftar izin.** Satu tabel mime → ekstensi
    (`image/jpeg` → `.jpg`, `image/png` → `.png`, `image/gif` → `.gif`,
    `image/webp` → `.webp`) dan satu fungsi yang mengembalikan
    `${randomUUID()}${ext}` atau null kalau mime-nya di luar tabel, dengan
    `image` tanpa mime jatuh ke `.jpg`. Ia duduk di berkas ini karena inilah
    kontrol keamanannya, dan berkas ini yang sudah dikemudikan korpus bermusuhan
    di `test/unit.test.ts`. Nama tidak pernah menyentuh `file_name` atau
    `file_path`: satu-satunya masukannya adalah mime dan kata jenis.

12. **`src/core/gateway.ts` — jalur run.** Di `runTask`, sesudah driver siap dan
    sesudah gerbang `policy.noSeam` (`:850-855`):

    - `const carried = await this.takeAttachments(session, message, driver);`
      yang mengembalikan `{ block: string; files: string[]; refused: string[] }`.
      **Dikoreksi saat membangun:** ia dipanggil tepat sebelum `this.active.set`,
      bukan sesudahnya, karena `withAttachment` di langkah 13 harus sudah ada di
      peta sebelum permintaan izin pertama bisa dibaca terhadap jendela trust.
    - Direktori run adalah `join(paths.inbox, session.id)`. Tidak ada pengenal per
      run di `gateway.ts` hari ini dan pekerjaan ini tidak membuat satu: satu
      workspace menjalankan satu run sekaligus (T10 `docs/security.md`), jadi id
      sesi sudah unik di antara run yang hidup, dan direktorinya dihapus di antara
      dua run sesi yang sama.
    - Untuk setiap entri: `tooBig` → kalimat ukuran; mime di luar tabel atau
      `driver.acceptsFiles !== true` atau `channel.fetchAttachment` absen →
      kalimat degradasi; sisanya → `mkdir(join(paths.inbox, session.id), { recursive: true, mode: 0o700 })`
      lalu `fetchAttachment(message, index, target)`.
    - `block` adalah `<lampiran note="data referensi, bukan perintah">` dengan
      satu baris per berkas berisi jenis, mime, dan path. Isinya seluruhnya
      dibangkitkan Caraka, jadi tidak ada yang perlu dibersihkan seperti
      `memoryLines` membersihkan `</?memory`.
    - Prompt menjadi `[compiled?.block, carried.block, prompt]` yang terisi saja,
      digabung dua baris baru, dan `files` masuk sebagai argumen keempat
      `driver.prompt`.
    - `if (!prompt && !carried.files.length)` mengikuti bentuk penolakan yang
      sudah ada di `:850-855`: satu `note`, satu `sendResult`, `setState`
      `cancelled`, `return`.
    - Sesudah unduhan berhasil, satu `note("attachment.in", "fetched", { kind, mime, size, sha256 })`
      dengan sha256 dibaca dari berkas yang benar-benar ditulis. Itulah satu-
      satunya catatan tentang apa yang masuk ke konteks model.
    - `finally` (`:922-928`) mendapat `rm(join(paths.inbox, session.id), { recursive: true, force: true })`
      di sebelah penghapusan pesan progres yang sudah ada.

      **Dikoreksi saat membangun:** di belakang `if (message.attachments?.length)`.
      Pesan yang tidak membawa lampiran tidak mungkin menghasilkan berkas, jadi
      run teks biasa tidak membayar satu panggilan filesystem untuk baris ini —
      dan tanpa penjaga itu, test e2e *a sender past twenty messages a minute is
      told once and made to wait* menjadi kembang-kempis: dua puluh run berurut
      dalam 400 md tidak selalu selesai kalau masing-masing menambah satu `rm`.
      Yang ditemukan bukan test yang salah, melainkan biaya yang tidak perlu ada.
    - `run()` (`:258`) mendapat satu pembersihan sisa, dengan alasan yang sama
      seperti `closeGrants()`: run yang dijanjikan berkas itu sudah mati bersama
      prosesnya. Ia berjalan sebelum channel mana pun mulai polling, jadi ia tidak
      bisa menyentuh run yang hidup.

      **Dikoreksi saat membangun:** letaknya **sesudah** blok `closeGrants()`,
      bukan di sebelah `expireApprovals()`. Prolog `run()` seluruhnya sinkron
      sampai `channel.start`, dan empat test e2e bersandar padanya: mereka
      memanggil `store.openGrant` sesudah `harness()` kembali, yang hanya aman
      selama `closeGrants()` sudah berjalan saat itu. Satu `await` di depannya
      memindahkan `closeGrants()` ke belakang `openGrant` dan menutup jendela yang
      baru saja dibuka test itu.

13. **`src/core/gateway.ts:1197-1209` — jendela trust.** `this.active`
    (`:859`) sudah menyimpan satu catatan per workspace; ia mendapat
    `withAttachment: boolean`. Cabang auto-approve menjadi
    `if (grant && !isHighRisk(request) && !this.active.get(this.workspaceOf(session).slug)?.withAttachment)`.
    Di fungsi yang sama, tiga salinan
    `request.toolCall.title ?? request.toolCall.kind ?? this.t("permission.fallbackTitle")`
    (`:1187,1200,1252`) menjadi satu pembaca. Ketiganya ada di dalam
    `askPermission` (`:1158`), jadi satu `const` di atasnya cukup — dan ia
    menghapus pengulangan tanpa menghapus baris (±0), karena `const` itu memakai
    baris yang dihemat pemendekan `:1186-1187`.

14. **`src/i18n.ts` — dua kunci, dua katalog.** `attach.unsupported`
    (menyebut `{kind}` dan apa yang bisa dikirim sebagai gantinya) dan
    `attach.tooBig` (menyebut `{size}` dan batas 20 MB). Label blok lampiran
    tidak masuk katalog, mengikuti `gateway.ts:1058` yang menulis label memori
    langsung di kode.

15. **Dokumen, di PR yang sama.** `docs/security.md`: baris §9 menjadi 20 MB
    dengan sumbernya, paragraf "dispesifikasikan, belum dibangun"
    (`:332-334`) diperbarui, dan §12 mendapat satu baris tentang gambar yang
    tidak bisa diberi label. `docs/frd.md` FR-CHAN-04 menyebut bagian yang
    terbangun. `docs/design.md:58` kehilangan `path` dari bentuk `attachments`,
    karena path tidak pernah menyeberang sebagai bagian dari pesan.
    `docs/api.md` menerima `imageArg`/`imageMode` kembali ke tabel dan
    contoh MCP inbox `:79` berhenti menyebut `/tmp`.

16. **Test.** Unit di `test/unit.test.ts` untuk klasifikasi tiap adapter, nama
    berkas, daftar izin mime, batas ukuran, argv driver CLI, dan pembacaan
    `promptCapabilities`. **Ditambahkan saat membangun:**
    `test/fixtures/bin/fake-acp-agent.mjs`, sebuah agent ACP palsu setinggi 44
    baris yang menjawab `initialize` dengan atau tanpa `promptCapabilities.image`
    dan menulis setiap `session/prompt` yang diterimanya ke berkas. Tanpa itu
    AC-7.4 sampai AC-7.6 hanya bisa dibuktikan dengan menambal `connection`
    lewat cast, yang membuktikan pembacaan field dan bukan bahwa jawabannya
    benar-benar datang dari respons `initialize`. `test/e2e.test.ts` juga
    menyetel `CARAKA_HOME` sekali di tingkat berkas: setiap gateway di berkas itu
    menyapu inbox saat start, dan tanpa itu sapuan tersebut mengarah ke
    `~/.caraka/inbox` milik siapa pun yang menjalankan suite. E2E di `test/e2e.test.ts` memakai channel palsu dan
    driver palsu yang sudah ada di berkas itu, ditambah `CARAKA_HOME` di
    direktori temporer seperti `test/unit.test.ts:913-928`. Assertion katalog
    ditulis tangan dalam bentuk `test/unit.test.ts:1341-1348`, karena `tsc` hanya
    menangkap kunci yang hilang dan tidak pernah menangkap kalimat yang salah.

17. **Gerbang dan `AGENTS.md`.** `npm run verify` dari akar, keluarannya ditempel
    di bawah, lalu paragraf anggaran `AGENTS.md:19-21` mendapat angka terukur
    `src/` seperti v1.1 mencatat +149.

## Perkiraan baris per berkas

Kolom pertama adalah bagian klasifikasi — muatan non-teks berhenti hilang. Kolom
kedua bagian unduhan yang pemilik putuskan ikut dibangun. Empat berkas muncul di
kedua kolom karena keempatnya memang disentuh dua kali. Angka terukur
menggantikan seluruh tabel di bagian gerbang.

| Berkas | Klasifikasi | Unduhan |
|---|---|---|
| `src/core/channel.ts` | +10 | +10 |
| `src/core/gateway.ts` | +15 | +28 |
| `src/core/driver.ts` | — | +4 |
| `src/channels/telegram.ts` | +30 | +25 |
| `src/channels/discord.ts` | +8 | — |
| `src/channels/whatsapp.ts` | +12 | — |
| `src/channels/whatsapp-baileys.ts` | +10 | — |
| `src/config.ts` | — | +5 |
| `src/cli.ts` | — | +1 |
| `src/drivers/preset.ts` | — | +6 |
| `src/drivers/cli.ts` | — | +9 |
| `src/drivers/claude-acp.ts` | — | +14 |
| `src/i18n.ts` | +2 | +2 |
| **Jumlah** | **≈ +87** | **≈ +104** |

## Pemetaan AC → pembuktian

| AC | Pembuktian |
|---|---|
| AC-1.1 | unit: update Telegram berisi `photo` tanpa `caption` melewati `dispatch` dan menghasilkan satu baris `msg.in`; hari ini tidak ada baris sama sekali |
| AC-1.2 | unit: baca `details` baris `msg.in` itu — `attachments[0]` memuat `kind`, `mime`, `size` |
| AC-1.3 | unit: `JSON.stringify(details)` tidak memuat `file_id`, `file_path`, `api.telegram.org`, dan tidak memuat nilai `file_id` yang dipakai fixture |
| AC-1.4 | unit: update `new_chat_members` (tanpa teks, tanpa lampiran) menghasilkan nol pesan keluar dan nol baris `msg.in` |
| AC-1.5 | unit: foto ber-caption `perbaiki ini` menghasilkan prompt yang diawali caption itu |
| AC-1.6 | unit: sembilan update, satu per slot, dibandingkan dengan sembilan pasangan yang ditulis di AC-1.6; pasangannya diketik ulang di test, bukan dibaca dari kode |
| AC-1.7 | unit: `photo[]` yang urutannya dibalik tetap memilih elemen `width * height` terbesar |
| AC-1.8 | unit: pesan Discord dengan `attachments` dan `content` kosong di DM menghasilkan entri; pesan yang sama dengan `guild_id` terisi berhenti diam-diam — **dikoreksi:** ia berhenti di adapter dan tidak pernah menjadi event, karena sebuah pesan guild tidak boleh dijawab atas kekuatan field yang Caraka menolak membacanya. Satu `content_type` non-gambar di test yang sama, supaya kata netralnya ikut terbukti |
| AC-1.9 | unit: badan webhook Cloud API `type: "image"` dengan caption, dan `imageMessage` Baileys dengan caption, keduanya menghasilkan event dengan teks caption |
| AC-1.10 | e2e: channel palsu tanpa `fetchAttachment` mengirim satu lampiran; pesan keluar memuat kata jenisnya dan tidak memuat path |
| AC-1.11 | unit: assertion tangan dalam bentuk `test/unit.test.ts:1341` untuk `attach.unsupported` dan `attach.tooBig` di kedua katalog, plus `tsc` untuk kunci yang hilang |
| AC-1.12 | e2e: lampiran yang tidak bisa dibawa tanpa caption menghasilkan nol pemanggilan `driver.prompt` dan satu pesan keluar |
| AC-2.1 | e2e: channel palsu dengan `fetchAttachment` mencatat `target` yang diterimanya; assert path itu yang dibaca driver palsu |
| AC-2.2 | sama dengan AC-1.10 |
| AC-2.3 | unit: grep `src/core/` untuk `file_id`, `api.telegram.org`, dan `/file/bot` — nol, dalam bentuk test grep `test/unit.test.ts:2812-2833`. `file_path` **tidak** ikut digrep: `security.ts:256` dan `gateway.ts:1304` sudah membacanya sebagai nama field tool call agent, jadi grep-nya akan merah sejak baris pertama. Yang menutupnya `tsc`, karena tipe entri lampiran tidak punya slot untuk pengenal berkas. **Dikoreksi saat membangun:** yang digrep baris kode, bukan seluruh berkas — komentar `security.ts:9-14` menuliskan bentuk `…/file/bot<token>/<path>` karena URL itulah yang memperbaiki scrubber, dan komentar yang mencegah bentuk salah ditulis dua kali adalah hal terakhir yang boleh dibayar test ini |
| AC-2.4 | e2e: driver palsu dengan `acceptsFiles` tidak diisi; `fetchAttachment` channel palsu tidak pernah terpanggil |
| AC-3.1 | unit: `CARAKA_HOME` di direktori temporer, jalankan satu run berlampiran, assert `resolve(written).startsWith(resolve(inbox))` |
| AC-3.2 | unit: `statSync(dir).mode & 0o777` bernilai `0o700` untuk `inbox` dan untuk subdirektori run |
| AC-3.3 | unit: `carakaPaths()` memuat `inbox`, dan `uninstallTargets(paths)` memuat nilai itu |
| AC-3.4 | unit: `file_name` fixture `laporan-rahasia.png` tidak muncul di nama berkas yang ditulis; nama cocok dengan `/^[0-9a-f-]{36}\.(jpg\|png\|gif\|webp)$/` |
| AC-3.5 | unit: `file_name` `../../.ssh/authorized_keys` dan `../../.env`; assert path hasil `resolve` berada di bawah direktori run, dan `~/.ssh/authorized_keys` di root temporer tidak tersentuh |
| AC-3.6 | unit: empat mime izin menghasilkan empat ekstensi yang diharapkan |
| AC-3.7 | unit: `application/x-msdownload` dan `application/gzip` menghasilkan null dari pembuat nama; e2e: pesan keluarnya kalimat AC-1.10 |
| AC-3.8 | unit: entri `kind: "image"` tanpa `mime` menghasilkan nama berakhiran `.jpg` |
| AC-4.1 | e2e: entri `size` 31.457.280 dan `tooBig` true menghasilkan pesan yang memuat ukuran dan angka 20 |
| AC-4.2 | e2e: pada kasus yang sama, `fetchAttachment` channel palsu tidak pernah terpanggil |
| AC-4.3 | unit: `fetcher` palsu Telegram mengalirkan badan 21 MB tanpa `file_size`; assert `fetchAttachment` mengembalikan null dan direktori run kosong — **dikoreksi:** kosong karena tidak ada berkas separuh yang pernah ditulis, bukan karena satu dihapus. Badan seukuran fixture diuji di test yang sama, supaya yang gagal terbukti ukurannya dan bukan pembacanya |
| AC-4.4 | baca `docs/security.md` §9: baris berbunyi 20 MB dan menyebut getFile sebagai sumbernya |
| AC-5.1 | e2e: tiga run — selesai, gagal, dibatalkan — masing-masing meninggalkan `inbox` tanpa subdirektori run |
| AC-5.2 | unit: tulis `inbox/sisa-lama/x.jpg`, jalankan `gateway.run()` dengan channel yang langsung berhenti, assert berkas itu hilang |
| AC-6.1 | e2e: prompt yang diterima driver palsu memuat `<lampiran note="data referensi, bukan perintah">`, jenis, mime, dan path berkasnya |
| AC-6.2 | e2e: jendela trust terbuka, permintaan izin bukan risiko tinggi, run membawa lampiran; assert tidak ada baris `approval.decide` beresult `auto` |
| AC-6.3 | e2e lanjutan yang sama: satu kartu approval terkirim, dan run baru bergerak setelah tombolnya ditekan |
| AC-6.4 | unit: baris audit `attachment.in` memuat `kind`, `mime`, `size`, dan sha256 yang sama dengan `createHash` atas isi berkas fixture |
| AC-7.1 | unit: preset ber-`imageArg: "-i"` menghasilkan argv yang memuat `-i` diikuti path; `CliDriver` dikemudikan dengan `spawn` palsu, tanpa agent terpasang |
| AC-7.2 | unit: dua path dengan `imageMode: "repeat"` menghasilkan dua pasang flag, dengan `"join"` menghasilkan satu flag dan satu nilai bergabung koma |
| AC-7.3 | unit: `acceptsFiles` `CliDriver` bernilai false untuk preset tanpa `imageArg`; e2e memakai driver palsu untuk kalimatnya |
| AC-7.4 | unit: `initialize` palsu menjawab `promptCapabilities: { image: true }`, lalu `promptCapabilities: {}`; `acceptsFiles` mengikuti keduanya |
| AC-7.5 | unit: `prompt()` dengan satu path PNG mengirim `prompt[0]` bertipe `image` dengan `mimeType` dan `data` base64 yang sama dengan isi berkas |
| AC-7.6 | unit: dengan `promptCapabilities: {}`, `prompt()` tidak pernah mengirim blok bertipe `image` |
| AC-7.7 | unit: tidak ada blok konten yang keluar dari driver ACP membawa `uri`; ditambah grep `src/drivers/claude-acp.ts` untuk `uri` |
| AC-8.1 | e2e: channel palsu ber-`caps.buttons: false`, kartu approval terkirim, caption `ok <kode>` memutuskan sekali dan `driver.prompt` melanjutkan |
| AC-8.2 | e2e lanjutan yang sama: caption kedua dengan kode yang sama mendapat penolakan, dan tidak ada baris `approval.decide` kedua |
| AC-8.3 | unit: caption `/status` menghasilkan laporan status, bukan run |
| AC-9.1 | baca `docs/security.md` §12: baris menyebut gambar, label yang tidak mungkin, dan turunnya T3 ke kontrol cadangan |
| AC-9.2 | baca `docs/frd.md` FR-CHAN-04: gambar terbangun, dokumen dan voice note tidak, dengan alasannya |
| AC-9.3 | baca `docs/design.md`: bentuk `attachments` cocok dengan tipe di `src/core/channel.ts`, tanpa `path` |
| AC-9.4 | baca `docs/api.md` §1: dua baris tabel kembali, masing-masing menyebut berkas yang membacanya |
| AC-9.5 | baca contoh `inbox_pull` (`docs/api.md:75-81`): `attachments[0].path` tidak lagi di bawah direktori temporer sistem. `grep -n "/tmp/caraka" docs/api.md` menyisakan tepat satu baris, contoh `reply` di `:87` — lampiran keluar, yang bukan pekerjaan ini |
| AC-9.6 | baca `docs/security.md` §9 paragraf penutup: barisnya tidak lagi disebut belum dibangun |
| AC-10.1 | `find src -name '*.ts' \| xargs wc -l \| tail -1`, keluarannya ditempel di bagian gerbang |
| AC-10.2 | unit *the route pair Discord and WhatsApp both wrote out is now one pair* menggrep kedua adapter untuk `startsWith(\`${this.id}:\`)` dan mengemudikan `containerOf`/`routeOf` langsung; `grep -c 'permission.fallbackTitle' src/core/gateway.ts` bernilai satu; ditambah e2e Discord dan WhatsApp yang sudah ada, yang merah kalau pemindahan prefiksnya salah |
| AC-10.3 | baca `AGENTS.md` paragraf anggaran: angka terukur ada, plafon ~8.000 tetap tertulis |

## Risiko

**Caption memperluas apa yang bisa dicapai sebuah pesan.** Begitu caption
menjadi `message.text`, `caption_entities` bisa membawa `bot_command`, jadi `/new`
di dalam caption membuat sesi dan `ok A7F3` di dalam caption memutuskan approval
di channel tanpa tombol. Properti keamanannya tetap utuh — kodenya masih
`randomBytes` sisi server, sekali pakai, ber-TTL — tetapi permukaannya melebar di
area yang `AGENTS.md` wajibkan bertest, karena itu AC-8.1 sampai AC-8.3 ada dan
karena itu pekerjaan ini menunggu router `/new` selesai lebih dulu.

**Tautan getFile berlaku sekurangnya satu jam, dan run bisa mengantre lebih
lama.** `getFile` karena itu dipanggil di dalam `fetchAttachment`, tepat sebelum
unduhan, bukan saat klasifikasi. Run yang mengantre di belakang run 30 menit
tetap mendapat tautan segar.

**`tooBig` bergantung pada `file_size`, yang opsional.** Berkas yang tidak
melaporkan ukuran lolos AC-4.2 dan tertangkap AC-4.3, yang menghitung byte saat
membaca dan menghapus berkas separuh jadi. Dua jaring, karena yang pertama
mempercayai angka dari pengirim.

**Ekstensi ditebak dari mime.** Foto terkompresi Telegram tidak membawa mime,
jadi ia mendapat `.jpg`; kalau suatu hari yang datang PNG terkompresi,
ekstensinya salah dan byte-nya tetap benar. Asumsi itu ditulis sebagai komentar
beserta sumbernya di `security.ts`, bukan dibiarkan sebagai kebetulan.

**Pembersihan punya dua kebocoran yang diketahui.** `finally` tidak berjalan
kalau proses dibunuh, dan sapuan saat start yang menutupnya. Yang tidak tertutup
adalah proses kedua yang berjalan bersamaan dari `~/.caraka` yang sama: sapuan
start akan menghapus direktori run milik proses lain. Itu keadaan yang sudah
dilarang di tempat lain — `caraka uninstall` menolak berjalan saat gateway hidup,
dan `caraka.pid` ada untuk itu — jadi risikonya dicatat di sini, tidak dibayar
dengan penguncian baru.

**Anggaran tidak terbayar penuh.** ≈ +191 dikurangi satu penghapusan yang
benar-benar menghapus (−6), jadi ≈ +185 bersih, `src/` naik ke ≈ 8.683 dan
utangnya menjadi ≈ 683. Dedup kedua di langkah 13 tidak dihitung: ia menghapus
pengulangan, bukan baris. Angkanya dicatat, plafonnya tidak digeser, dan lima
penghapusan yang sudah terverifikasi (≈ −44) disebut di spec supaya PR berikutnya
punya jalan membayarnya tanpa mencari ulang.

**Terukur, dan perkiraan itu salah 2,6 kali.** Yang benar-benar mendarat +484,
bukan ≈ +185. Perkiraannya menghitung logika dan lupa deklarasi: sembilan slot
media Telegram, lima slot Cloud API, lima slot Baileys, dan `attachments`
Discord harus punya tipe sebelum ada yang bisa membacanya, dan setiap field yang
sengaja **tidak** ada di sana — `file_name`, `file_unique_id` — memerlukan
komentar yang menyebutkan kenapa. Angkanya, dan tempat selisihnya, dicatat di
paragraf anggaran `AGENTS.md`; plafonnya tetap ~8.000.

**Rute yang bekerja lebih sedikit daripada yang terlihat.** Dari tujuh preset,
gambar benar-benar sampai lewat rute ACP (adapter terkunci menjawab
`image: true`) dan lewat codex di rute CLI. Sisanya mendapat kalimat degradasi.
Itu bentuk yang diminta `standards/ears.md` §2.4, tetapi ia juga berarti fitur
ini terasa setengah jalan bagi pemakai aider atau Claude Code di rute CLI, dan
Batas yang diakui butir 1 adalah alasan yang harus dibaca sebelum ada yang
"memperbaikinya" dengan `--add-dir`.

## Keluaran gerbang

`src/` terukur **9.412 baris**, +487 terhadap 8.925 yang dipegang pohon kerja saat
pekerjaan ini mulai. Perkiraan di spec ≈ +185, jadi selisihnya 302, dan tempatnya
adalah deklarasi bentuk wire empat channel beserta komentar yang menyebut kenapa
sebuah field ada atau justru tidak ada — bukan logika. Angkanya dicatat di
paragraf anggaran `AGENTS.md`, plafon ~8.000 tidak digeser (AC-10.1, AC-10.3).

```
$ find src -name "*.ts" | xargs wc -l | tail -1
  9412 total
```

`npm run verify`, dari akar repositori. Enam perintah berurut; yang di bawah ini
keluaran yang benar-benar dicetak terminal, dipotong pada test yang ditulis
pekerjaan ini dan pada baris ringkasannya:

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
Finished in 115ms on 34 files using 24 threads.
No config found, using defaults. Please add a config file or try `oxfmt --init` if needed.

> caraka@1.2.0 typecheck
> tsc -p tsconfig.json --noEmit


> caraka@1.2.0 build
> node -e "require('node:fs').rmSync('dist', { recursive: true, force: true })" && tsc -p tsconfig.json


> caraka@1.2.0 test
> node --import tsx --test test/unit.test.ts

[...]
✔ a Telegram media message keeps its caption and names its kind (1.241798ms)
✔ a Telegram photo past twenty megabytes is marked rather than fetched (0.596059ms)
✔ a message that is only an attachment is authorised, audited, and answered (151.766374ms)
✔ the name an attachment is written under never comes from the sender (1.000708ms)
✔ a downloaded attachment lands under the run directory at 0700, named by Caraka (162.535594ms)
✔ a download that passes twenty megabytes is abandoned and writes nothing (23.06036ms)
✔ the gateway sweeps the inbox a dead process left behind (64.32484ms)
✔ no file identifier or download URL is written anywhere in core (1.701818ms)
✔ both sentences about an attachment are in both catalogs (0.139315ms)
✔ a CLI preset that names an image flag puts the paths in argv (72.469597ms)
✔ the ACP driver reads image support off initialize and sends bytes, never a URL (49.65224ms)
✔ the route pair Discord and WhatsApp both wrote out is now one pair (0.623379ms)
✔ Discord fills attachment entries in a direct message and nowhere else (120.377392ms)
✔ a WhatsApp caption is the text of its message, on both transports (1.278144ms)
ℹ tests 146
ℹ suites 0
ℹ pass 146
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 8641.273093

> caraka@1.2.0 e2e
> node --import tsx --test test/e2e.test.ts

[...]
✔ an attachment nothing can carry is answered in one sentence, and starts no run (347.04556ms)
✔ a mime outside the allowlist is refused before anything is fetched (203.184352ms)
✔ an attachment past the ceiling names its size and is never fetched (202.552679ms)
✔ a downloaded attachment reaches the agent as a path inside a labelled block (252.928161ms)
✔ a run that ends any of its three ways takes its attachment with it (652.450864ms)
✔ a run carrying an attachment is never decided by the trust window (666.675565ms)
✔ a caption decides a card once, on a channel that has no buttons (549.765955ms)
ℹ tests 88
ℹ suites 0
ℹ pass 88
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 40680.081184
```

Yang dibuktikannya: pemindai rahasia membaca 253 berkas terlacak dan tidak
menemukan kredensial, lint dan format bersih di 34 berkas, `tsc` lolos dua kali —
sekali `--noEmit`, sekali membangun `dist/` dari nol — dan 234 test hijau tanpa
satu pun gagal atau dilewati: 146 unit dan 88 e2e, empat belas dan tujuh di
antaranya ditulis untuk pekerjaan ini dan dinamai di tabel pemetaan di atas.
`npm run e2e` dijalankan enam kali berturut-turut sesudah koreksi `finally` di
langkah 12, dan 88 lolos di keenamnya; sebelum koreksi itu satu test rate limit
gagal di dua dari empat putaran. Empat test e2e lama yang bersandar pada prolog
sinkron `run()` juga termasuk, dan merahnya mereka itulah yang menemukan koreksi
letak sapuan start.
