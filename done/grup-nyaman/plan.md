# Plan — grup-nyaman

**Spec:** `spec/grup-nyaman.md` · **Tanggal:** 14 Agustus 2026

Delapan belas langkah, dan urutannya tidak bebas. Langkah 1 sampai 4 memperbaiki
cacat yang sudah terkirim dan menjadi prasyarat bentuk baru: tanpa langkah 1
contoh pemilik sendiri mengirim judul sesi sebagai prompt, dan tanpa langkah 2
satu tekanan "ya" bisa menulis `config.yaml` yang gateway tidak bisa muat lagi.
Langkah 5 sampai 9 adalah fiturnya. Langkah 10 sampai 14 adalah penutupan topic.
Langkah 15 adalah `/help`. Langkah 16 sampai 18 adalah test, dokumen, gerbang.

## Langkah

### Prasyarat: empat cacat yang sudah terkirim

1. **`src/core/gateway.ts` — `create` lolos kartu.** Tambah `create: boolean` ke
   tipe `pendingWorkspaces` (`:131-141`), tulis nilainya di `offerWorkspace`, dan
   ganti `false` yang di-hardcode di `confirmWorkspace` (`:687`) dengan
   `request.create`. Komentarnya menyalin alasan yang sudah ada di
   `pendingChoice` (`:118-127`): sepuluh menit kemudian tekanan itu harus masih
   membuka sesi dan masih tidak memulai run. `offerWorkspace` menerima satu
   parameter baru, dan `workspaceForPath` meneruskannya dari `routeTask`, yang
   sudah memegang `create`.

2. **`src/core/gateway.ts` — slug dan tumpang-tindih ditolak sebelum kartu.** Di
   `offerWorkspace`, sesudah `basename` dan sebelum `approvalCallbacks`:

   ```ts
   // `basename(resolve("/"))` is the empty string, and `addAllowedWorkspace`
   // does not re-validate what it writes: one press on `@/` produces a
   // `config.yaml` whose `slug: z.string().min(1)` refuses to load, and before
   // the restart `workspaceOf` reads an empty slug as the first workspace, so a
   // session with cwd `/` borrows another workspace's grant (ADR-0010
   // consequence 1). The comparison is case-insensitive on every platform: on
   // APFS and NTFS two spellings are one directory and two grant keys, and on
   // Linux the refusal names `config.yaml` as the way through for a setup that
   // holds two directories differing only in case.
   if (!/^[\w.-]+$/.test(slug)) return this.reply(message, this.t("ws.slugBad", { path }));
   const lower = slug.toLowerCase();
   const clash = this.workspaces.find(
     (w) => w.slug.toLowerCase() === lower || w.path.toLowerCase() === path.toLowerCase(),
   );
   if (clash) return this.reply(message, this.t("ws.slugTaken", { slug: clash.slug, path: clash.path }));
   // The one part of the rooted-allowlist idea worth having. `~/Project` holds 89
   // repositories, so approving it is not meaningfully smaller than approving the
   // disk, and a `/yolo` on it would auto-approve every ordinary action under all
   // of them (ADR-0010, rejected alternative 1).
   const overlap = this.workspaces.find(
     (w) => insideWorkspace(w.path, path) || insideWorkspace(path, w.path),
   );
   if (overlap) return this.reply(message, this.t("ws.pathOverlap", { slug: overlap.slug, path: overlap.path }));
   ```

   `insideWorkspace` diimpor dari `src/core/security.ts`, tempat ia sudah ada
   (`:285`), dan pemakaian dua arahnya sudah benar karena ia mengembalikan true
   untuk root itu sendiri. `ws.slugTaken` yang lama tetap dipakai, hanya
   pemanggilnya yang berubah menjadi hasil pencarian tanpa peduli huruf.

3. **`src/core/gateway.ts` — dua peta yang menyapu sendiri.** Satu baris di atas
   `set` di `offerWorkspace` dan di `offerTrust`:

   ```ts
   for (const [id, entry] of this.pendingWorkspaces)
     if (entry.expiresAt < Date.now()) this.pendingWorkspaces.delete(id);
   ```

   `pendingChoice` tidak butuh apa pun: ia berkunci per chat dan entri barunya
   menimpa yang lama.

4. **`src/i18n.ts` dan `offerTrust` — kartu trust menyebut path.**
   `trust.card` menerima `{ minutes, workspace, path }` dan menyebut keduanya.
   Satu argumen di pemanggil (`:1860`), dua string di katalog. Ini yang membuat
   langkah 5 jujur bahkan untuk operator, yang ingatannya atas kartu sepuluh
   menit lalu adalah satu-satunya yang berdiri antara sebuah slug dan sebuah
   direktori.

### Bentuk path dari ruangan

5. **`src/core/gateway.ts` — `workspaceForPath` melepas uji `chat.type`.**
   Barisnya (`:609`) menjadi `if (principal !== this.operatorOf(chatId))`.
   Komentar di atas fungsi menyebut ADR-0011 dan klausa yang benar-benar dijaga
   ADR-0010 keputusan 1: siapa yang memilih string-nya. `ws.pathDmOnly` diganti
   nama menjadi `ws.pathOperatorOnly` dan kalimatnya berhenti menjanjikan DM:
   "A path names a workspace only when the first sender on this channel's
   allowlist writes it. Here a workspace is named by its slug:\n{list}".
   `{list}` tetap ada — `/ws` sudah mencetak daftar yang sama ke ruangan yang
   sama, jadi menghapusnya di sini adalah concern lain.

6. **`src/core/gateway.ts` — jawaban tanpa cabang ke ruangan, jawaban sebenarnya
   ke DM.** `offerWorkspace` mendapat satu percabangan container di puncaknya:

   ```ts
   // Three answers that can be told apart — the card, `ws.pathMissing`, and
   // `ws.slugTaken` naming a configured path — are the primitive `isdir(p)` for
   // any `p`. In the operator's own conversation the only reader is the one
   // person who can run `ls`; in a room the readers are every member who can see
   // it (`docs/security.md` T6b), so the room is told one sentence that branches
   // on nothing and the answer goes where the question can be answered.
   ```

   Di percakapan pribadi jalurnya persis seperti hari ini. Di container lain:
   `this.reply(message, this.t("ws.askedOperator"))` ke asal, dan kartu atau
   penolakan dikirim dengan pola `handleMembership` (`:1982-1990`) —
   `sendText(await this.directTo(channel, operator), …, "", confirmCard(callback), operator)`.
   `pendingWorkspaces.principal` diisi `this.operatorOf(chatId)`, bukan
   `String(message.from?.id)`, dengan komentar yang menyebut kenapa versi yang
   salah lolos setiap test: setelah langkah 5 keduanya orang yang sama.

7. **`src/core/gateway.ts` — `markWorkspace`, di samping `expandHome`.**

   ```ts
   /**
    * `/new <folder> <title>`: the folder is the first word when it is a path, and
    * `routeTask` reads a workspace token only behind `@`. Marking it here keeps
    * one reader of that token and confines the bare spelling to `/new` — free
    * text still needs the `@`, so an ordinary prompt that opens with
    * `/etc/hosts is broken` stays a prompt and does not become a workspace
    * nobody named.
    */
   export function markWorkspace(argument: string, home = homedir()) {
     const match = /^(\S+)(?:\s+([\s\S]*))?$/.exec(argument);
     const token = match?.[1];
     if (!token || token.startsWith("@") || !isAbsolute(expandHome(token, home))) return argument;
     // ponytail: the folder ends at the first space, so a directory whose own
     // name contains one is not addressable by this form. Upgrade is one
     // alternation in two regexes — `(?:"([^"]+)"|(\S+))` here and in
     // `routeTask`'s `at`.
     return `@${token} ${match[2] ?? ""}`.trim();
   }
   ```

   Pemanggilnya satu baris di `dispatch` (`:500`):
   `else if (command === "new") this.routeTask(message, markWorkspace(argument), true);`
   Tidak ada yang lain bergerak. `parseCommand` tidak disentuh,
   `/^@(\S+)(?:\s+|$)/` tidak disentuh, `workspaceForPath` tidak disentuh:
   `/new ~/Project/coret Coret` menjadi string `@~/Project/coret Coret`, ejaan
   yang sudah bekerja hari ini dan sudah punya test.

8. **`src/channels/telegram.ts` dan `src/channels/discord.ts` — mention di awal
   dipotong.** Sintaks mention adalah format wire, jadi ia dipotong di adapter
   dan core tidak pernah tahu bentuknya. Telegram, sesudah `addressed()` dihitung
   dan untuk setiap jenis chat:

   ```ts
   // `parseCommand` is anchored at `^/`, so `@caraka_bot /new …` never reaches
   // the router: the text falls to `routeTask`, whose `/^@(\S+)/` matches the
   // mention and answers "No workspace is called caraka_bot" — true today for
   // every message that opens with this bot's mention. Only offset 0 is cut, so
   // `fix @caraka_bot's parser` keeps its mention. Entity offsets are stale
   // afterwards and `addressed()` above is their only reader.
   ```

   Discord memotong `/^<@!?APP_ID>\s*/` dari `content` sebelum `emit`, dengan
   satu kalimat menyebut varian `<@!ID>` yang sudah usang tapi masih dikirim
   klien lama. Pesan yang setelah pemotongan tidak menyisakan apa pun jatuh di
   penjaga `gateway.ts:451` yang sudah ada, dan itu jawaban yang jujur untuk
   pesan yang tidak mengatakan apa-apa.

9. **`src/core/gateway.ts` — klausa ketiga `aimed` dihapus.** Tiga baris di
   `:461-464` menjadi dua, dan komentar di atasnya kehilangan kalimat "a thread
   holding a Caraka session belongs to Caraka" dan menggantinya dengan alasan
   penghapusannya: kepemilikan thread bukan hal yang sama dengan ditujukan
   kepada, dan `group.readyAll` sudah menjanjikan aturan yang lebih ketat kepada
   ruangan. `const { threadId } = this.route(message)` di `:457` ikut hilang: di
   `dispatch` ia hanya pernah dibaca klausa itu, dan `oxlint` akan menyebutnya
   kalau tertinggal. `chatId` tetap, ia dipakai kedua allowlist dan
   `channelOf`.

### Topic ditutup

10. **`src/core/channel.ts` — satu deklarasi opsional lagi.**

    ```ts
    /**
     * Close a finished session's thread. Optional because a channel may have no
     * such call: Telegram's `closeForumTopic` is documented for a forum
     * supergroup only, so a session whose topic lives in a private chat answers
     * with an error and the call site swallows it. `deleteForumTopic` is never
     * used anywhere — it takes the transcript with it.
     */
    finishThread?(chatId: string, threadId: string): Promise<unknown>;

    /**
     * Reopen the thread a finished session left closed, so a session that
     * continues is writable again. Called only on the transition that closed it,
     * because a bot gets a 400 for a no-op: `TOPIC_NOT_MODIFIED` is swallowed
     * for user accounts and not for bots.
     */
    resumeThread?(chatId: string, threadId: string): Promise<unknown>;
    ```

11. **`src/channels/telegram.ts` — dua method di samping `editTopic`.**

    ```ts
    // `closeForumTopic` is documented for a forum supergroup, and its own
    // description exempts the topic's creator from needing `can_manage_topics`
    // — which Caraka always is, because 1.3.1 stops it touching a thread it did
    // not open. In a private chat the method is undocumented and answers with an
    // error; the call site swallows it and the session still ends marked, the
    // way graceful degradation asks. `close` cannot ride on `editForumTopic`:
    // `TOPIC_CLOSE_SEPARATELY` refuses the flag beside any other, so a session
    // that is renamed and closed costs two calls.
    finishThread(chatId: string, threadId: string) {
      return this.call<boolean>("closeForumTopic", {
        chat_id: chatId,
        message_thread_id: Number(threadId),
      });
    }

    resumeThread(chatId: string, threadId: string) {
      return this.call<boolean>("reopenForumTopic", {
        chat_id: chatId,
        message_thread_id: Number(threadId),
      });
    }
    ```

    Komentar di atas `editTopic` (`:432-434`) berhenti mengatakan bahwa sesi
    selesai "never closed"; yang tetap benar dan tetap tertulis adalah bahwa
    `editForumTopic` hanya mengekspos `name` dan `icon_custom_emoji_id`.

12. **`src/channels/discord.ts` — `resumeThread` di samping `finishThread`.**
    `{ archived: false }` lewat `PATCH /channels/{id}`, pasangan dari
    `{ archived: true }` di `:361`. Ini juga menjawab pertanyaan yang belum
    pernah diajukan ke sisi Discord: apakah menulis ke thread yang ia arsipkan
    masih bekerja. Setelah langkah 14 jawabannya tidak lagi menjadi
    ketergantungan.

13. **`src/core/gateway.ts` — `setState` menutup dan membuka.** Komentar
    kepalanya (`:1276-1283`) ditulis ulang: kalimat "closeForumTopic is
    supergroups only — so a finished session is renamed, never closed or deleted"
    berhenti benar untuk grup dan tetap benar untuk DM. Isinya:

    ```ts
    private async setState(session: Session, state: string) {
      // Read before the write: the reopen must fire on the one transition that a
      // close preceded, and the object this method was handed goes stale after
      // the first call inside a run.
      const previous = this.store.sessionById(session.id)?.state;
      this.store.setState(session.id, state);
      …
      if (FINISHED.has(state)) await channel.finishThread?.(…).catch(() => undefined);
      // Never on running → awaiting_approval → running: `TOPIC_NOT_MODIFIED` is a
      // 400 for a bot, so an unconditional reopen would spend a failed call on
      // every state change, and a close/reopen ping-pong per inbound message is
      // the one shape that draws a flood wait.
      else if (state === "running" && FINISHED.has(previous ?? ""))
        await channel.resumeThread?.(…).catch(() => undefined);
    }
    ```

    `FINISHED` adalah satu `Set` di samping `STATE_GLYPH`, yang juga menggantikan
    `state === "done" || state === "failed" || state === "cancelled"` yang ada
    sekarang. Kedua panggilan tetap **di bawah** penjaga kepemilikan (`:1298`),
    yang disengaja dan dicatat di `done/topic-provenance/` serta
    `docs/security.md` §4 butir 9: menutup topic yang dibuka orang lain adalah
    perubahan yang tidak diminta di ruangan orang lain, sekelas dengan mengganti
    namanya.

14. **`src/core/gateway.ts` — ringkasan sebelum penutupan, di tiga jalur.**
    `docs/session-model.md` §6 sudah menuntutnya. `stopActive` (`:2054-2055`) dan
    `cancelForTime` (`:1268-1271`) menukar dua barisnya — nol baris bersih.
    Jalur gagal butuh empat: di `catch` `runTask`, laporan dikirim sebelum
    `setState(…, "failed")` dan kesalahannya tidak lagi dilempar ulang, dengan
    penjaga `this.stopping` yang sekarang dipegang `.catch` di `enqueue`
    (`:834`) supaya penutupan gateway tetap tidak mengirim laporan galat ke chat.
    Komentar menyebut bahwa yang ditutup bukan kerapian melainkan
    ketergantungan pada perilaku tanpa dokumen: sebuah kirim ke topic yang baru
    ditutup hanya berhasil karena Caraka pencipta topic itu, dan buktinya di
    TDLib, bukan di halaman Bot API.

### `/help`

15. **`src/i18n.ts` dan `src/core/gateway.ts` — dua badan, dipilih container.**
    `help.body` dihapus dari kedua katalog; `help.direct` dan `help.room` masuk
    ke keduanya. `MessageKey` adalah `keyof typeof en` dan `id` adalah
    `Record<MessageKey, string>`, jadi terjemahan yang hilang gagal di `tsc`
    sebelum sampai ke chat. Pemanggilnya (`:2083`):

    ```ts
    // Two answers, and the split is the container, never the channel (hard rule
    // 1): a room defaults to read-only, refuses the path form from anyone but the
    // operator, and shows every card to everyone in it, so the DM text is wrong
    // advice there. What the channel itself holds back is `readiness()`, the same
    // sentence `/status` appends above, so the per-channel half costs no catalog
    // key here.
    private async help(message: InboundMessage) {
      const { chatId } = this.route(message);
      if (message.chat.type === "private") return this.reply(message, this.t("help.direct"));
      return this.reply(message, `${this.t("help.room")}\n\n${await this.readiness(chatId)}`);
    }
    ```

    Teks Inggris, tanpa backtick dan tanpa asterisk karena `sendText` Telegram
    dipanggil tanpa `parse_mode` sementara Discord me-render string yang sama
    sebagai markdown:

    ```
    help.direct:
    Send a task as an ordinary message. This conversation is yours, so everything
    you write here reaches the coding agent:

      add a rate limit to the login route

    Where your chat app has topics, each task gets one of its own and the answer
    arrives there. When the session ends the topic is closed, not deleted, so the
    transcript stays readable.

    Pick the folder with @ in front. /ws lists the names:

      @toko-api fix the checkout 500

    A folder can also be named by its path, and I offer to add it:

      /new ~/Project/coret Coret

    When the agent wants to write a file or run a command, a card arrives. It is
    yours to decide, it works once, and it expires in ten minutes. No word you
    type decides anything.

    /new [folder] [title]  a fresh session, both optional
    /status           what this session is doing
    /stop             cancel the running task
    /ws               list the workspaces and their paths
    /switch <preset>  run this session on another agent
    /commands         what the agent itself offers
    /usage            context and cost so far
    /ingat <note>     save a note for this workspace
    /memori           list those notes
    /lupakan <id>     delete one of them
    /yolo 30m         open a trust window, 60 minutes at most
    /lock             close it now
    /help             this message

    The long version: caraka.dev/docs
    ```

    ```
    help.room:
    This is a room, so I answer only what is aimed at me — inside a session topic
    too. Everything else said here I leave alone: no session opens and nothing
    reaches the coding agent.

    Aim a message at me by naming me, by replying to one of my own messages, or
    with a command:

      @caraka_bot @toko-api fix the checkout 500

    A room starts read-only. I read the repository and answer questions; I refuse
    to write a file, run a command, or open a trust window until whoever runs
    Caraka opts this room in, in config.yaml on that computer.

    Everyone who can read this room reads what I put in it: the approval cards,
    the file paths, the diffs, and the command output. Adding the room chose that.

    A folder is named by its slug here; /ws lists them. Whoever runs Caraka can
    also name one by its path, and the question that writes it down is asked in
    their own conversation with me, never here.

    Commands: /new /status /stop /ws /switch /commands /usage /ingat /lupakan
    /memori /yolo /lock /help. Send /help in your own conversation with me for
    what each one does.

    The long version: caraka.dev/docs
    ```

    Bahasa Indonesia mengikuti klausa demi klausa, dan panjangnya diukur bukan
    ditebak: plafonnya 2000 karakter karena Discord memotong `content` di angka
    itu tanpa galat, dan yang paling ketat adalah `help.room` ditambah
    `group.readyAll` (495 di katalog id) ditambah `group.topicsOff` (221) —
    sekitar 710 karakter, jadi `help.room` harus di bawah 1.290 di kedua
    katalog. Draf Inggris di atas berada di sekitar 1.030.

### Test, dokumen, gerbang

16. **`test/unit.test.ts`** — tabel `markWorkspace` (satu `assert.equal` per baris
    tabel di spec, dengan `home` `"/home/rama"`, tanpa gateway, tanpa channel,
    tanpa filesystem), pemeriksaan plafon 2000 untuk keempat badan `/help` di
    kedua katalog, pemeriksaan bahwa `deleteForumTopic` tidak muncul di `src/`
    (pola yang sama dengan test `bypassPermissions` satu-pemanggil), dan tabel
    slug/tumpang-tindih.

    **Dikoreksi saat membangun.** Empat hal berbeda dari yang tertulis di atas.

    Pertama, nama `deleteForumTopic` dihapus dari komentar di `src/` juga, bukan
    hanya dari pemanggilan. AC-1.2 berbunyi "gagal bila nama method itu muncul di
    `src/`", dan tiga komentar memuatnya; test yang mencari `'"deleteForumTopic"'`
    seperti versi lama hanya menangkap satu ejaan pemanggilan. Ketiga komentar
    sekarang menyebut method itu secara deskriptif — "the call that removes a
    topic along with all its messages" — dan test-nya mencari nama telanjang di
    setiap berkas `.ts` di bawah `src/`, ditambah `message_thread_id: 1` untuk
    AC-1.8.

    Kedua, AC-1.1 dibuktikan di dua tempat, bukan satu. `h.calls` di harness e2e
    merekam `finishThread:<threadId>` dari channel palsu, jadi ia tidak bisa
    membuktikan nama method maupun bentuk parameternya. Nama dan kedua parameter
    dibuktikan di unit terhadap adapter sungguhan dengan fetcher stub; urutan,
    penjaga kepemilikan, dan ketiga state akhir dibuktikan di e2e.

    Ketiga, harness e2e mendapat dua perubahan kecil. `archives` menerima
    `"fails"` (channel yang punya panggilannya dan menolaknya, untuk AC-1.4) dan
    menyertakan `resumeThread`. Dan `sendText`/`sendResult` ikut mencatat ke
    `calls`, karena `sent` dan `calls` adalah dua array tanpa urutan di antaranya
    dan seluruh AC-1.5 adalah urutan itu.

    Keempat, AC-2.7 dibuktikan di unit lewat `workspaceOffer` yang dipanggil
    dengan `message.from` yang bukan operator. Rencana menyebut "e2e AC-2.5 adalah
    pembuktiannya", dan itu tidak cukup: sesudah langkah 5 router menolak pengirim
    bukan-operator sebelum `offerWorkspace`, jadi tidak ada jalur e2e di mana
    keduanya berbeda orang, dan sebuah test yang tidak bisa membedakan kedua versi
    field itu tidak membuktikan apa pun.

    Kasus e2e AC-5.2 dan AC-3.5 juga tidak memakai flag `addressed` yang ditulis
    tangan: satu helper baru, `viaAdapter`, menjalankan pesan-pesan itu melalui
    adapter Telegram sungguhan lebih dulu, sehingga yang memutuskan adalah kode
    yang dikirim dan bukan asumsi test tentangnya.

    **`test/e2e.test.ts`** — AC-2.1 lama di `:1301` dibalik: pesan tak menyapa di
    topic sesi Caraka tidak menghasilkan prompt, dan komentarnya menyebut
    `done/grup-sapa-dan-menu/spec.md` AC-2.1 yang digantikannya. AC-2.2 (`:1306`)
    dan AC-2.3 (`:1320`) tetap hijau apa adanya dan tidak disentuh —
    keduanya menjadi lebih kuat, bukan berubah. Kasus baru: penutupan pada tiga
    state, urutan kirim-lalu-tutup, buka-kembali hanya pada transisi yang benar,
    thread tak dimiliki yang tidak ditutup, bentuk path dari ruangan oleh
    operator, penolakan bentuk itu dari pengirim lain di allowlist, kartu yang
    tiba di DM dan bukan di ruangan, penekan yang salah ditolak `confirmed`,
    `create` yang lolos kartu, dan `/help` yang bercabang.

17. **Dokumen, dalam PR yang sama.** Ruang lingkup spec melewatkan tiga berkas yang
    ikut berhenti benar begitu penutupan mendarat, dan ketiganya diperbarui di sini:
    `docs/api.md` §4 ("`finishThread` absen di Telegram"), `docs/design.md`
    (kalimat yang sama beserta blok kontraknya), dan `docs/frd.md` FR-TOPIC-05 dan
    FR-TOPIC-06. FR-TOPIC-08 ikut, karena barisnya menjanjikan penghapusan otomatis
    topic `done` setelah tujuh hari lewat satu-satunya method yang membawa
    transkripnya — spec ini menolaknya, jadi barisnya menjadi penolakan alih-alih
    rencana. ADR-0011 baru dengan konteks, keputusan, dan
    konsekuensi — termasuk kalimat bahwa himpunan path yang
    `caraka trust <path> --bypass` mau terima ikut melebar, karena operator bisa
    menambah entri config dari chat. ADR-0010 mendapat satu baris
    "**Sebagian digantikan:**" bergaya ADR-0006, dan barisnya di
    `docs/adr/README.md` menyebutnya. `docs/session-model.md` §3 (ditutup di
    grup, tidak di DM), §5 (baris sesi `done`: apa yang terjadi pada pesan di
    topic yang sudah ditutup, dan bahwa anggota biasa tidak bisa lagi menulis di
    sana), §6 (baris "Tutup topic" berhenti menjadi desain);
    `docs/telegram-integration.md` §2; `docs/security.md` §4 butir 9 dan
    `docs/security.en.md` butir 9; `docs/frd.md` FR-CHAN-09; `README.md` dan
    `README.id.md` baris `/help`; `site/src/data/docs.ts` baris `/help` menjadi
    "Explain how to work here, with examples. The answer in a room is a different
    one: it says what a room refuses, what everyone in it can read, and what the
    channel does and does not deliver."

18. **Gerbang.** `npm run verify` dari akar (`scan:secrets` → `lint` →
    `typecheck` → `test` → `e2e` → build), lalu `cd site && npm run check &&
    npm run e2e` karena langkah 17 menyentuh `site/src/data/docs.ts`; baseline
    tinggi `/docs` (7403) diperiksa terhadap `dist/` segar dan diperbarui ke
    angka terukur bila bergeser. `src/` diukur ulang (`wc -l $(find src -name
    '*.ts')`) dan angkanya masuk ledger `AGENTS.md` beserta selisihnya terhadap
    perkiraan ~190.

## Pemetaan AC → pembuktian

| AC | Pembuktian |
|---|---|
| AC-1.1 | unit: adapter sungguhan dengan fetcher stub → method `closeForumTopic` dengan `chat_id` dan `message_thread_id` bernilai number; e2e: sesi selesai memanggil `finishThread` sekali, dan harness merekam thread id-nya (channel palsu tidak bisa membuktikan nama method) |
| AC-1.2 | unit: baca setiap berkas `.ts` di bawah `src/` dan gagal bila nama telanjang `deleteForumTopic` muncul — komentar termasuk, jadi ketiga komentar yang memuatnya diganti menjadi deskripsi |
| AC-1.3 | e2e: urutan `h.calls` — `editForumTopic` ber-glif `✓` mendahului `closeForumTopic` |
| AC-1.4 | e2e: channel palsu menolak `closeForumTopic`; baris `sessions.state` tetap `done`, `editForumTopic` tetap tercatat, `h.sent` tidak memuat galat |
| AC-1.5 | e2e ×3: `/stop`, timeout run, dan run yang gagal — `spokeBeforeClose` membaca satu daftar, karena harness sekarang mencatat kirim dan panggilan topic ke `calls` yang sama; ditambah satu test bahwa run yang gagal saat `stopping` tidak melaporkan apa pun (risiko di bawah), yang gagal kalau penjaganya dilepas |
| AC-1.6 | e2e: sesi di topic yang tidak ber-`topic.own.*` → tidak ada `closeForumTopic` maupun `reopenForumTopic`, dan satu baris audit `topic.skip` `unowned` |
| AC-1.7 | e2e: satu run penuh (`running` → `awaiting_approval` → `running` → `done`) tidak memanggil `reopenForumTopic`; pesan menyapa berikutnya di topic itu memanggilnya tepat sekali |
| AC-1.8 | e2e: pesan di General (tanpa `message_thread_id`) menyelesaikan sesinya tanpa satu pun panggilan close/reopen; unit: `Number("")` tidak pernah dikirim, penjaga `if (!session.threadId) return` diuji langsung |
| AC-1.9 | e2e Discord: `PATCH` `{archived:true}` saat selesai dan `{archived:false}` saat lanjut, dengan urutan `at` yang membuktikan pembukaan sesudah pengarsipan; tidak ada berkas bersama yang bercabang atas channel (test grep `channel.id` yang sudah ada) |
| AC-2.1 | e2e: operator menulis `/new@bot ~/<dir> Judul` di ruangan yang di allowlist → sesi lahir di ruangan itu pada workspace ber-path itu |
| AC-2.2 | e2e ×2: pengirim di allowlist yang bukan operator, satu di ruangan dan satu di DM-nya sendiri → balasan `ws.pathOperatorOnly` dan satu baris audit `ws.path` `denied`; tidak ada entri `pendingWorkspaces` yang lahir |
| AC-2.3 | e2e: `h.sent` memuat kartu pada chat id DM operator dan tidak memuat `inline_keyboard` apa pun pada chat id ruangan |
| AC-2.4 | e2e ×6 pada satu ruangan: direktori ada, tidak ada, path yang sebuah berkas, slug terpakai, slug ditolak, tumpang-tindih → `new Set` atas teks yang tiba di ruangan itu berukuran satu, dan keenam jawaban sebenarnya ada di chat id operator |
| AC-2.5 | e2e: pengirim ketiga di allowlist menekan tombol kartu → `answerCallback` menolak, audit `ws.add` `denied`, `config.yaml` tidak berubah |
| AC-2.6 | e2e: sesudah tekanan operator di DM, `createForumTopic` dipanggil pada chat id ruangan dan `sessions.chat_id` bernilai id ruangan |
| AC-2.7 | unit: `workspaceOffer` dipanggil dengan `message.from` bernilai `77`, dan entri peta yang lahir ber-`principal` `42`. Rencana semula menunjuk e2e AC-2.5, dan itu tidak cukup: sesudah langkah 5 router menolak pengirim bukan-operator sebelum fungsi ini, jadi tidak ada jalur e2e di mana kedua versi field itu berbeda |
| AC-3.1 | unit: tabel `markWorkspace`, baris `~/Project/coret Coret` dan `/etc Coret` |
| AC-3.2 | unit: baris `Project/coret Coret`, `coret Coret`, `fix src/auth.ts please` |
| AC-3.3 | unit: baris `@coret Coret` dan `@~/Project/coret Coret` kembali apa adanya |
| AC-3.4 | e2e: `~/Project/coret fix the bug` tanpa `/new` diteruskan sebagai prompt utuh |
| AC-3.5 | e2e Telegram ×4 lewat adapter sungguhan (`viaAdapter`): `@bot /new <dir> Judul` di grup, `@bot fix the login bug` di DM (yang sebelum ini menjawab "No workspace is called caraka_test_bot"), `fix @bot's parser` yang mempertahankan mention-nya, dan pesan berisi mention saja |
| AC-3.6 | e2e: `/new ~/<dir-baru> Coret` → kartu → ya → satu baris `sessions` berjudul `Coret`, dan `d.prompts` kosong |
| AC-3.7 | e2e: pesan berisi hanya `@bot` menghasilkan nol balasan dan nol baris `sessions` |
| AC-4.1 | unit: `offerWorkspace` atas `/` dan `/etc/../` menjawab `ws.slugBad` dan tidak memanggil `approvalCallbacks`; e2e: `config.yaml` sesudahnya tetap dimuat `loadConfig` |
| AC-4.2 | unit ×2: slug `Coret` terhadap `coret` yang ada, dan path `~/project` terhadap `~/Project` yang ada |
| AC-4.3 | unit ×3: usulan induk dan usulan anak dijawab `ws.pathOverlap`; usulan yang sama dengan sebuah workspace dijawab klausa di atasnya, `ws.slugTaken`, yang menyebut workspace dan path yang sama — keduanya menolak sebelum kartu dan keduanya menyebut apa yang ditabraknya |
| AC-4.4 | unit: kedua katalog memuat `{workspace}` lalu `{path}` di `trust.card`; e2e: kartu `/yolo` memuat path workspace yang di-`resolve` |
| AC-4.5 | unit: dua entri kedaluwarsa dipasang lewat `Date.now` yang digeser, entri berikutnya masuk, ukuran peta turun dari tiga menjadi dua — yang hidup tetap, yang mati hilang |
| AC-5.1 | e2e: `test/e2e.test.ts:1301` dibalik — pesan `addressed:false` di topic sesi Caraka, `h.prompts` tidak bertambah, audit `msg.in` `ignored` |
| AC-5.2 | e2e ×2 lewat adapter sungguhan (`viaAdapter`): balasan ke pesan progres Caraka melanjutkan sesi; balasan ke service message `forum_topic_created` tidak. Keputusan `addressed`-nya milik adapter, jadi test tidak menuliskannya sendiri |
| AC-5.3 | e2e yang sudah ada di `:1334` dan `:1369` tetap hijau tanpa disunting |
| AC-5.4 | baca `done/grup-sapa-dan-menu/spec.md`: AC-2.1 bertanda digantikan AC-5.1 spec ini; `grep -r requireMention src/` nol hasil |
| AC-6.1 | e2e ×2: `/help` di DM memuat kalimat pembuka `help.direct` dan tidak memuat `help.room`; `/help@bot` di ruangan memuat `help.room` diikuti kalimat kesiapan channel |
| AC-6.2 | unit: perulangan atas kedua katalog, `help.direct` < 2000 dan `help.room + 2 + max(ready…) + topicsOff` < 2000 |
| AC-6.3 | unit: `/[`*]/` tidak cocok pada keempat badan |
| AC-6.4 | unit: `help.direct` memuat `@toko-api`, `/new ~/`, `closed, not deleted`, `No word`, dan ketiga belas nama perintah |
| AC-6.5 | unit: `help.room` memuat `session topic`, `read-only`, `config.yaml`, `approval cards`, `slug`, dan `path` |
| AC-6.6 | `tsc` — `help.body` hilang dari `MessageKey` dan `id` wajib memuat kedua kunci baru |
| AC-7.1 | baca ADR-0011, penanda di ADR-0010, dan baris di `docs/adr/README.md` |
| AC-7.2 | baca `docs/session-model.md` §3 §5 §6 berdampingan dengan `setState` |
| AC-7.3 | baca `docs/telegram-integration.md` §2 |
| AC-7.4 | baca `docs/security.md` §4 butir 9 dan `docs/security.en.md` butir 9 |
| AC-7.5 | baca `docs/frd.md` FR-CHAN-09 |
| AC-7.6 | `grep -rn "supergroups \(only\|alone\)" src/` nol hasil — hari ini tiga: `channel.ts:331`, `gateway.ts:1279`, `telegram.ts:434` |
| AC-7.7 | `grep -n "/help" README.md README.id.md site/src/data/docs.ts` dan bandingkan dengan `help.direct`/`help.room` |
| AC-7.8 | baca ledger `AGENTS.md`: angka terukur, selisih terhadap ~190, pagu tetap ~8.000 |

## Risiko

**Hasil: yang paling mungkin salah memang jalur gagal, dan penjaganya diuji.**
Kalimat di bawah ditulis sebelum kodenya ada; yang ditambahkan sesudahnya adalah
satu test e2e, "a run that fails while the gateway is shutting down reports
nothing to the chat", yang gagal ketika `if (!this.stopping)` dilepas.

**Yang paling mungkin salah adalah `AC-1.5` pada jalur gagal.** Dua yang lain
menukar dua baris; yang ini mengubah siapa yang melaporkan galat run. Sesudahnya
`runTask` melaporkan sendiri dan tidak melempar ulang, sehingga `.catch` di
`enqueue` (`:834`) berhenti melihat kegagalan run dan tetap menjaga `createOnly`
dan pembatalan `delay`. Yang harus tetap hidup adalah penjaga `this.stopping`:
tanpanya, penutupan gateway mengirim laporan galat ke chat. Test-nya adalah run
yang gagal saat `stopping` bernilai true, dan `h.sent` yang tetap kosong.

**Hasil: +260 baris, di dalam rentang 220–320 dan di atas ~190.** Sebab yang
paragraf di bawah sebut ternyata benar dua arah: seam yang sudah ada memang yang
membuat angka ini tidak berlipat dua, dan sisa selisih terhadap ~190 hampir
seluruhnya komentar pada empat cacat yang sudah terkirim.

**Perkiraan `~190` baris kemungkinan besar rendah.** Lima perkiraan terakhir di
ledger masing-masing rendah dengan faktor 1,8 sampai 2,6, dan sebab yang ledger
sebut adalah harga seam. Di sini seam-nya sudah ada, jadi angka yang diharapkan
220–320. Kalau ternyata di atas 400, yang naik ke ledger tetap angka terukur, dan
alasannya ditulis di sini sebelum pindah ke `done/`.

**Penutupan mengubah apa yang bisa dilakukan anggota biasa di topic sesi.**
Sesudah sesi selesai, komposer di topic itu hilang untuk semua kecuali admin
ber-`can_manage_topics` dan pencipta topic. Itu bukan bug dan bukan sesuatu yang
implementasi bisa perlunak; ia trade yang spec ini catat dan pemilik pilih. Kalau
pada pemakaian ternyata diskusi pasca-mortem lebih berharga daripada topic yang
tertutup, yang dilepas adalah penutupan, bukan penggantian nama — glif tetap
menjadi papan statusnya, dan `docs/session-model.md` §6 yang harus berubah.

**Dua klaim Telegram tidak terverifikasi terhadap server sungguhan**, dan gerbang
ini tidak bisa memverifikasinya: harness memakai channel palsu. Yang pertama —
bot masih bisa `sendMessage` ke topic yang ia tutup sendiri — berhenti menjadi
ketergantungan setelah AC-1.5. Yang kedua — `description` persis untuk bot tanpa
`can_manage_topics` — tidak dipakai satu AC pun; `.catch(() => undefined)` di
`setState` tidak membaca isinya. Keduanya bisa diselesaikan dalam satu menit oleh
siapa pun yang punya forum supergroup uji, dan itu dicatat sebagai belum
dilakukan alih-alih diklaim.

**Baseline tinggi `/docs` bisa bergeser** karena satu baris tabel di
`site/src/data/docs.ts` menjadi lebih panjang. Angkanya diukur terhadap `dist/`
segar dan ditulis, tidak ditebak. Hasil: tidak bergeser, dan `site/e2e` lulus
113 test tanpa satu angka disunting.

**Satu hal yang sengaja tetap terbuka:** sesudah kartu disetujui,
`setMeta("ws.last.<chatId>")` membuat ruangan itu lengket ke workspace baru,
sehingga tugas berikutnya di ruangan itu yang tidak menyebut workspace berjalan
di sana. Itu perilaku yang sama dengan setiap workspace yang sudah ada di config,
dan yang memilihnya operator yang baru saja menekan tombolnya. Ia dinyatakan di
`help.room` dan di ADR-0011, bukan dikontrol.

## Keluaran gerbang

Dijalankan 14 Agustus 2026. Yang dipotong: baris `✔`/`✓` per test yang lulus,
dengan yang baru dan yang dibalik disisakan, dan blok `npm run assets` yang
`site` pretest cetak. Setiap baris perintah, setiap ringkasan, dan setiap hitungan
di bawah ditempel apa adanya dari satu jalannya masing-masing.

```
$ npm run verify

> caraka@1.4.2 verify
> npm run scan:secrets && npm run lint && npm run typecheck && npm run build && npm test && npm run e2e


> caraka@1.4.2 scan:secrets
> bash scripts/scan-secrets.sh

clean: 283 tracked files, no credentials

> caraka@1.4.2 lint
> oxlint src test scripts && oxfmt --check src test scripts bin package.json tsconfig.json

Checking formatting...

All matched files use the correct format.
Finished in 98ms on 34 files using 24 threads.
No config found, using defaults. Please add a config file or try `oxfmt --init` if needed.

> caraka@1.4.2 typecheck
> tsc -p tsconfig.json --noEmit


> caraka@1.4.2 build
> node -e "require('node:fs').rmSync('dist', { recursive: true, force: true })" && tsc -p tsconfig.json


> caraka@1.4.2 test
> node --import tsx --test test/unit.test.ts

… 164 baris ✔ dipotong; empat yang baru di antaranya …
✔ a topic is closed and reopened by name, and no file under src/ deletes one (3.544153ms)
✔ the four /help bodies fit, carry no markup, and say what each container refuses (0.262739ms)
✔ /new reads its first word as a folder only when that word is a path (0.135748ms)
✔ a proposed workspace is refused before its card, and the card is the operator's (50.528459ms)
ℹ tests 164
ℹ suites 0
ℹ pass 164
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 8703.706172

> caraka@1.4.2 e2e
> node --import tsx --test test/e2e.test.ts

… 99 baris ✔ dipotong; yang baru dan yang dibalik di antaranya …
✔ a session topic is no exception to the mention gate (1062.639756ms)
✔ /help answers one thing in a conversation and another in a room (418.590257ms)
✔ a thread that is not Caraka's is neither closed nor reopened (513.200888ms)
✔ a finished session is renamed and then closed, on each of the three end states (707.488052ms)
✔ the last line reaches the topic before the close does, on all three paths (1361.705066ms)
✔ a session in General is finished without a close, because it has no thread id (518.35305ms)
✔ this bot's own leading mention is cut before core, and only at offset 0 (356.550586ms)
✔ a run that fails while the gateway is shutting down reports nothing to the chat (347.202938ms)
✔ the path form is read from the operator anywhere, and from nobody else (962.250323ms)
✔ a path named in a room is answered in the operator's DM, and the room is told nothing else (1055.020049ms)
ℹ tests 99
ℹ suites 0
ℹ pass 99
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 48478.018204
```

```
$ cd site && npm run check

> caraka-site@0.0.1 check
> npm run lint && npm run typecheck && npm run test

> caraka-site@0.0.1 lint
> oxlint src scripts test


> caraka-site@0.0.1 typecheck
> astro check

15:12:15 [types] Generated 30ms
15:12:15 [check] Getting diagnostics for Astro files in /home/ramaaditya/Project/caraka/caraka/site...
Result (46 files):
- 0 errors
- 0 warnings
- 0 hints

> caraka-site@0.0.1 test
> vitest run

 Test Files  2 passed (2)
      Tests  29 passed (29)
```

```
$ cd site && npm run e2e

> caraka-site@0.0.1 e2e
> playwright test

Running 115 tests using 12 workers
… 113 baris ✓ dipotong …
  2 skipped
  113 passed (45.6s)
```

Baseline tinggi `/docs` tidak bergeser: satu baris tabel yang lebih panjang tidak
mengubah tinggi halaman yang diukur, dan `site/e2e` lulus tanpa satu angka
disunting.

```
$ find src -name "*.ts" | xargs wc -l | tail -1
  9928 total
```

**9.928 baris**, dari 9.668 saat pekerjaan ini mulai: **+260**, terhadap
perkiraan spec ~190 dan rentang 220–320 yang plan ini tulis. Rentangnya tepat,
angka tunggalnya tidak, dan sebab yang plan ini sebut — seam yang sudah ada —
memang yang membuatnya tidak berlipat dua. Angka terukur itu yang masuk ledger
`AGENTS.md`, beserta pembagian antara empat yang diminta dan empat cacat yang
sudah terkirim.

### Jalan kedua, sesudah tinjauan lawan

Empat temuan tinjauan diperbaiki di `src/core/gateway.ts` dan tiga pembuktian
ditambahkan, jadi gerbangnya dijalankan ulang seluruhnya. Yang dipotong sama
seperti di atas.

```
$ npm run verify

> caraka@1.4.2 verify
> npm run scan:secrets && npm run lint && npm run typecheck && npm run build && npm test && npm run e2e


> caraka@1.4.2 scan:secrets
> bash scripts/scan-secrets.sh

clean: 283 tracked files, no credentials

> caraka@1.4.2 lint
> oxlint src test scripts && oxfmt --check src test scripts bin package.json tsconfig.json

Checking formatting...

All matched files use the correct format.
Finished in 176ms on 34 files using 24 threads.
No config found, using defaults. Please add a config file or try `oxfmt --init` if needed.

> caraka@1.4.2 typecheck
> tsc -p tsconfig.json --noEmit


> caraka@1.4.2 build
> node -e "require('node:fs').rmSync('dist', { recursive: true, force: true })" && tsc -p tsconfig.json


> caraka@1.4.2 test
> node --import tsx --test test/unit.test.ts

… 164 baris ✔ dipotong; yang membawa lipatan huruf pada tumpang-tindih …
✔ a proposed workspace is refused before its card, and the card is the operator's (53.523207ms)
ℹ tests 164
ℹ suites 0
ℹ pass 164
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 9711.981002

> caraka@1.4.2 e2e
> node --import tsx --test test/e2e.test.ts

… 99 baris ✔ dipotong; dua yang tumbuh di antaranya …
✔ the last line reaches the topic before the close does, on all three paths (1370.535446ms)
✔ the card refuses before it is drawn, and every wrong press leaves the file alone (1995.005518ms)
ℹ tests 99
ℹ suites 0
ℹ pass 99
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 49010.935236
```

```
$ cd site && npm run check

> caraka-site@0.0.1 check
> npm run lint && npm run typecheck && npm run test

> caraka-site@0.0.1 lint
> oxlint src scripts test


> caraka-site@0.0.1 typecheck
> astro check

16:10:02 [types] Generated 98ms
16:10:02 [check] Getting diagnostics for Astro files in /home/ramaaditya/Project/caraka/caraka/site...
Result (48 files):
- 0 errors
- 0 warnings
- 0 hints

> caraka-site@0.0.1 test
> vitest run

 Test Files  2 passed (2)
      Tests  29 passed (29)
```

```
$ cd site && npm run e2e

> caraka-site@0.0.1 e2e
> playwright test

Running 118 tests using 12 workers
… 116 baris ✓ dipotong …
  2 skipped
  116 passed (1.0m)
```

Hitungan `site/` naik dari 115 menjadi 118 dan 46 berkas menjadi 48 karena rute
`/guide` mendarat lewat `panduan-situs` di antara dua jalan ini, bukan karena
sesuatu di sini.

```
$ find src -name "*.ts" | xargs wc -l | tail -1
  9971 total
```

**9.971 baris**, dari 9.668: **+303**, masih di dalam rentang 220–320 yang plan
ini tulis. Ke-43 baris terakhir adalah keempat perbaikan tinjauan: lipatan huruf
pada predikat tumpang-tindih, pembacaan keduanya saat kartu ditekan, penyapu
`pendingGroups`, dan laporan kegagalan yang sekarang tiba di topic sesinya.
Angka itu yang masuk ledger `AGENTS.md`.
