# Plan — berkas-keluar

**Spec:** `spec/berkas-keluar.md` · **Tanggal:** 10 September 2026

Dua belas langkah. Satu sampai delapan adalah kodenya, dan urutannya terikat:
kontraknya lebih dulu, lalu tabel dan pembaca nama di `core/security.ts`, lalu
satu-satunya pemanggil di `core/gateway.ts`, lalu kalimatnya, baru empat adapter
yang tidak saling menyentuh. Sembilan dan sepuluh test, sebelas dokumen, dua
belas gerbang.

Nomor baris di plan ini menunjuk pohon kerja pada `feat/berkas-dan-status`
sebelum langkah satu. Setiap anchor dibaca ulang sebelum disunting.

## Langkah

### 1. `src/core/channel.ts` — `sendImage?` menjadi `sendAttachment?`

Ganti method di `:410` beserta seluruh komentarnya. Nama argumennya `file`,
bukan `image`, karena sebuah PDF lewat di sini sekarang.

```ts
  /**
   * Put one file in the chat. Optional, the way `fetchAttachment?` and
   * `finishThread?` declare a capability rather than a branch — a channel that
   * cannot do it does not implement it, and core reads the absence rather than
   * reading `channel.id` (hard rule 1).
   *
   * `bytes` and not a path: the workspace boundary is core's to enforce, and an
   * adapter that took a path would be a file-read primitive reachable from agent
   * output. The caption is text core has already scrubbed; the bytes are not
   * scrubbable and never will be — a secret rendered into a picture leaves as a
   * picture, and `docs/security.md` §12 says so rather than pretending otherwise.
   *
   * The mime picks the wire method and the adapter picks it, so core names none
   * of them. Every limit is the channel's own and is checked there: Telegram
   * documents 10 MB on `sendPhoto` and 50 MB on the other two, Discord "20 MiB
   * for all users, but may be higher for users depending on their Nitro status
   * or by the server's Boost Tier" (docs.discord.com/developers/reference), and
   * the Cloud API 5 MB for a JPEG or a PNG against 100 MB for a document. The
   * caption is truncated rather than the send refused.
   */
  sendAttachment?(
    chatId: string,
    file: { bytes: Buffer; mimeType: string; name: string },
    caption?: string,
    threadId?: string,
  ): Promise<MessageRef | undefined>;
```

Tidak ada field `caps` kelima. Komentar keempat field di `:34` sudah menyebut
pembacanya masing-masing, dan `docs/api.md:197` sudah menolak `files` sebagai
field tanpa pembaca.

### 2. `src/core/security.ts` — tabel mime keluar dan pembaca namanya

Di bawah `attachmentName` (`:72`), dan `extname` masuk ke daftar impor
`node:path` di `:2`:

```ts
// Extension → the mime it is sent under. Nine pairs and no more: the four images
// the inbound allowlist already carries, and five text-shaped documents every
// channel here documents a slot for. No archive and no Office file — an archive
// is the cheapest exfiltration wrapper there is, and no agent in this repository
// produces a `.docx` (`spec/berkas-keluar.md`).
const OUTBOUND_MIMES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".csv": "text/csv",
};

/** The sendable extensions in one string, so the table and the sentence that
 * lists them cannot drift apart. */
export const OUTBOUND_KINDS = Object.keys(OUTBOUND_MIMES).join(" ");

/**
 * The mime one outbound file is sent under, read off its extension and off
 * nothing else. Null means the extension is outside the table, and core answers
 * with one sentence rather than opening the file.
 *
 * No magic byte is read. A second table that reads the bytes can disagree with
 * this one, and the question then becomes which of the two is right. An
 * extension that lies produces a wrong mime and a refusal from the channel,
 * which is a sentence of its own.
 *
 * A separator cannot appear in a `readdir` entry name. The check is here anyway,
 * because this is the function that decides a name reaches a chat, and the cost
 * of being wrong is somebody's path in somebody's conversation.
 */
export function outboundMime(name: string) {
  if (name.includes("/") || name.includes("\\")) return null;
  return OUTBOUND_MIMES[extname(name).toLowerCase()] ?? null;
}
```

`ATTACHMENT_EXTENSIONS` (`:52`) tidak disentuh. Ia memetakan mime ke ekstensi
untuk nama yang Caraka tulis sendiri di jalur masuk; yang di atas memetakan arah
sebaliknya untuk nama yang agent tulis. Menggabungkan keduanya berarti satu tabel
yang harus dibaca dua arah dengan dua daftar izin berbeda.

### 3. `src/core/gateway.ts` — direktori keluar, pembacanya, dan pengirimnya

Impor `readdir`, `stat`, dan `writeFile` masuk ke baris `node:fs/promises`
(`:3`), lalu `outboundMime` dan `OUTBOUND_KINDS` ke blok impor `./security.js`
(`:38`).

Dua konstanta di samping `RUN_LIMIT_MS` (`:75`):

```ts
// The outbox sits inside the workspace, not under `~/.caraka` where the inbox
// sits, because the CLI route cannot reach outside the project directory: Read
// is reported to answer EPERM there and `additionalDirectories` is reported not
// to close it (`presets/agents/claude-code.yaml:14`, anthropics/claude-code#29013).
// A tool that writes stands at the same boundary, so an outbox under
// `~/.caraka` would be born dead on the most used route.
//
// `.caraka-keluar` and not `.caraka/keluar`: a workspace may be the home
// directory, and `<home>/.caraka` is the directory that holds `caraka.db` and
// `secrets/`.
const OUTBOX_DIR = ".caraka-keluar";
// Core's own ceiling, because core reads the file into a Buffer before any
// adapter sees it. The same 20 MiB the inbound path uses (`docs/security.md`
// §9), so §9 keeps one number and one sentence. Spec-set: no vendor document
// stands behind it.
const OUTBOX_LIMIT = 20 * 1024 * 1024;
```

Direktorinya dibuat, dan sisa run yang mati disapu di sebelahnya:

```ts
  /**
   * This run's outbox, empty, with every other run's leftovers removed beside
   * it. One directory per run and never a shared one: two runs in one workspace
   * are refused by FR-SESS-04, but a run that crashed and a run that starts are
   * not the same run, and the second must not inherit the first one's files.
   *
   * This is the whole of the sweep. `start()` scans no workspace for a leftover
   * outbox: it holds no workspace it is not about to run in, and a boot that
   * walked every configured path would be reading directories nobody is waiting
   * on.
   *
   * `.gitignore` holding `*` goes in at creation, so `git status` in the user's
   * own repository stays quiet while the run lasts. The file never leaves: a
   * name that starts with a dot is skipped below.
   */
  private async openOutbox(workspace: Workspace, session: Session) {
    const root = join(workspace.path, OUTBOX_DIR);
    await rm(root, { recursive: true, force: true }).catch(() => undefined);
    const directory = join(root, session.id);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(join(directory, ".gitignore"), "*\n", { mode: 0o600 });
    return directory;
  }
```

Dibaca sekali, sesudah giliran agent berakhir:

```ts
  /**
   * Everything this run left in its outbox, one file per message, and the
   * directory read exactly once. There is no in-band signal for a file that is
   * still being written, and a write-then-rename convention would be a protocol
   * imposed on the agent, so the read waits for the turn to end instead.
   *
   * `withFileTypes` carries `lstat` semantics, so a symlink answers false to
   * `isFile()` and is never opened. That is what closes
   * `.caraka-keluar/x -> ~/.ssh/id_ed25519`; `insideWorkspace` cannot, because
   * it runs on `resolve()` output and is blind to a link (`docs/security.md` §7).
   *
   * Every reason to refuse is read before a byte is asked for, the way
   * `takeAttachments` reads its own: the extension decides the mime, `stat`
   * decides the size, and only a file that passed both is opened. The count that
   * comes back is images, because that is what the closing line is about.
   */
  private async emptyOutbox(session: Session, directory: string) {
    let images = 0;
    const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      // Names Caraka wrote itself, `.gitignore` among them. No sentence: the
      // person in the chat did not ask about a file they cannot see.
      if (entry.name.startsWith(".")) continue;
      // The name reaches the chat, so it goes through the outbound scrubber like
      // every other string. The extension is read off the entry rather than off
      // the scrubbed copy, so a redaction inside a name cannot change what the
      // file is.
      const name = this.scrub(entry.name);
      const mime = entry.isFile() ? outboundMime(entry.name) : null;
      if (!mime) {
        await this.refuseFile(session, name, this.t("attach.outType", { name, kinds: OUTBOUND_KINDS }));
        continue;
      }
      const path = join(directory, entry.name);
      const size = await stat(path).then((it) => it.size).catch(() => Infinity);
      if (size > OUTBOX_LIMIT) {
        await this.refuseFile(
          session,
          name,
          this.t("attach.outTooBig", { name, size: String(Math.round(size / 1_048_576)) }),
        );
        continue;
      }
      const bytes = await readFile(path);
      if (await this.sendAttachment(session, { bytes, mimeType: mime, name }))
        images += mime.startsWith("image/") ? 1 : 0;
    }
    return images;
  }

  /** One refused entry: the audit row first, then the sentence, and no bytes in
   * between. The row carries the name and no sha256, because nothing was read. */
  private async refuseFile(session: Session, name: string, sentence: string) {
    this.note(session, "attachment.out", "refused", { name });
    await this.sendToSession(session, `${this.header(session)}${sentence}`);
  }
```

`Gateway.sendImage` (`:1703`) menjadi pengirim berkas. Yang ditambahkan di
dalamnya satu kalimat saat channel menolak, dan sha256 hanya pada jalur yang
byte-nya benar-benar keluar:

```ts
  /**
   * One file, into the session's own conversation. A channel that cannot carry
   * one does not implement the method, and the answer is a sentence naming what
   * arrived rather than silence — the same degradation the inbound path gives a
   * file it cannot forward.
   */
  private async sendAttachment(
    session: Session,
    file: { bytes: Buffer; mimeType: string; name: string },
  ) {
    const channel = this.channelOf(session.chatId);
    if (!channel.sendAttachment) {
      await this.sendToSession(
        session,
        `${this.header(session)}${this.t("attach.outUnsupported", { agent: this.agentOf(session), mime: file.mimeType })}`,
      );
      return false;
    }
    const sent = await channel
      .sendAttachment(session.chatId, file, "", session.threadId)
      .catch(() => undefined);
    if (!sent)
      await this.sendToSession(
        session,
        `${this.header(session)}${this.t("attach.outRefused", { name: file.name })}`,
      );
    this.note(session, "attachment.out", sent ? "sent" : "failed", {
      name: file.name,
      mime: file.mimeType,
      size: file.bytes.byteLength,
      // Only where the bytes left. A refusal has nothing to hash and says
      // nothing, so the row cannot be read as evidence a file went out.
      ...(sent ? { sha256: createHash("sha256").update(file.bytes).digest("hex") } : {}),
    });
    return sent !== undefined;
  }
```

Pemanggil di `:1440` mengikuti namanya:

```ts
            for (const image of Gateway.imagesOf(notification))
              if (await this.sendAttachment(session, image)) pictures += 1;
```

`takeAttachments` (`:1303`) mendapat satu parameter dan satu baris. Blok berlabel
tetap satu, dan namanya tetap tepat: yang berubah adalah blok itu sekarang juga
memuat tempat berkas keluar diambil.

```ts
  private async takeAttachments(
    session: Session,
    message: InboundMessage,
    driver: AgentDriver,
    outbox: string,
  ) {
```

dan di atas `return`, sesudah loop lampiran:

```ts
    // The one line that says where a file the agent wants delivered goes. A
    // name, not an instruction: the block is labelled reference data, and core
    // reads the directory whether or not the agent read the line.
    lines.push(`- direktori keluar, berkas di sini dikirim ke chat sesudah giliran ini: ${outbox}`);
```

Di `runTask` (`:1352`), `outbox` dideklarasikan di samping `compiled` supaya
`finally` bisa membacanya:

```ts
    let outbox = "";
```

lalu, menggantikan baris `const carried = await this.takeAttachments(session, message, driver);`
di `:1403`:

```ts
      // Created before the block is built, because its name goes inside the
      // block. Both calls run before the run goes on the map, so a run that
      // carries a file is on the map as such before the first permission
      // question can be read against a trust window.
      outbox = await this.openOutbox(workspace, session);
      const carried = await this.takeAttachments(session, message, driver, outbox);
```

Guard "tidak ada prompt" di `:1414` tidak berubah: sebuah run yang seluruh
pesannya lampiran yang tidak bisa dibawa tetap berakhir `cancelled`, dan
direktori keluarnya dihapus oleh `finally`.

Pembacaan direktori tepat sesudah `driver.prompt` kembali, sebelum `sendResult`,
karena hitungannya masuk ke `closingLine`:

```ts
      pictures += await this.emptyOutbox(session, outbox);
```

Satu baris di `finally` yang sudah ada, di samping penghapusan inbox:

```ts
      // The outbox goes with the run whether it finished, failed, or was
      // cancelled. `outbox` is empty for a run that failed before it existed,
      // and `join("", …)` is never reached because of it.
      if (outbox) await rm(outbox, { recursive: true, force: true }).catch(() => undefined);
```

`start()` (`:357`) tidak berubah. Penghapusan inbox di sana tetap satu baris, dan
tidak ada pemindaian workspace yang ditambahkan.

### 4. `src/i18n.ts` — tiga kunci, dua katalog

Di bawah `attach.outUnsupported` (`:27`), katalog `en`:

```ts
  // The three outbound refusals. Each one names the file the person asked for
  // and nothing else: not the directory it was read from, not the method that
  // would have carried it, not a limit belonging to a channel they did not pick.
  "attach.outType": "Caraka did not send {name}; it can send {kinds}.",
  "attach.outTooBig": "Caraka did not send {name}; it is {size} MB and at most 20 MB goes out.",
  "attach.outRefused": "{name} was produced, and this channel did not accept it.",
```

Katalog `id`, di bawah `:414`:

```ts
  "attach.outType": "Caraka tidak mengirim {name}; yang bisa dikirim {kinds}.",
  "attach.outTooBig": "Caraka tidak mengirim {name}; ukurannya {size} MB dan yang keluar paling banyak 20 MB.",
  "attach.outRefused": "{name} sudah dihasilkan, dan channel ini tidak menerimanya.",
```

`attach.outUnsupported` tidak diubah. Ia sudah menjawab channel tanpa method dan
sudah punya test.

### 5. `src/channels/telegram.ts` — tiga method, mime yang memilih

Dua konstanta di samping `DOWNLOAD_LIMIT` (`:128`):

```ts
// sendPhoto: "The photo must be at most 10 MB in size." Read as decimal, which
// is the smaller of the two readings and therefore the safe one: a file between
// 10,000,000 and 10,485,760 bytes goes as a document rather than being handed to
// a method that may refuse it.
const PHOTO_LIMIT = 10 * 1_000_000;
// Form field → method, so the field name and the endpoint cannot drift apart.
const SEND_METHOD = {
  photo: "sendPhoto",
  animation: "sendAnimation",
  document: "sendDocument",
} as const;
```

`sendImage` (`:434`) menjadi:

```ts
  /**
   * `sendPhoto` for a still, `sendAnimation` for a GIF, `sendDocument` for
   * everything else, and the mime is the whole of the decision. A JPEG or a PNG
   * past the photo ceiling goes as a document rather than being refused: the
   * picture then arrives behind one tap instead of not arriving.
   *
   * The caption is cut at 1024, which is Telegram's number for all three methods
   * and not this project's — the alternative is a refusal, and losing the tail of
   * a sentence is smaller than losing the file it describes.
   */
  async sendAttachment(
    chatId: string,
    file: { bytes: Buffer; mimeType: string; name: string },
    caption = "",
    threadId = "",
  ) {
    const still = file.mimeType === "image/jpeg" || file.mimeType === "image/png";
    const slot =
      still && file.bytes.byteLength <= PHOTO_LIMIT
        ? "photo"
        : file.mimeType === "image/gif"
          ? "animation"
          : "document";
    const form = new FormData();
    form.append("chat_id", chatId);
    if (threadId) form.append("message_thread_id", threadId);
    if (caption) form.append("caption", caption.slice(0, 1024));
    form.append(slot, new Blob([new Uint8Array(file.bytes)], { type: file.mimeType }), file.name);
    return this.call<TelegramMessage>(SEND_METHOD[slot], form);
  }
```

`image/webp` jatuh ke `sendDocument`. Halaman `sendPhoto` tidak menyebut webp di
antara yang diterimanya, dan sebuah sticker bukan yang agent hasilkan.

### 6. `src/channels/discord.ts` — nama, mime dari argumen, dan satu penolakan

Konstanta di samping `MESSAGE_LIMIT`:

```ts
// "The default limit is 20 MiB for all users, but may be higher for users
// depending on their Nitro status or by the server's Boost Tier"
// (docs.discord.com/developers/reference). The default is the number a bot can
// count on; the higher tier is a thing this file cannot read. A file past it is
// refused before the request, so a rejected multipart body is never uploaded.
const UPLOAD_LIMIT = 20 * 1024 * 1024;
```

`sendImage` (`:317`) berganti nama menjadi `sendAttachment`, argumennya `file`,
tipe kembaliannya `Promise<MessageRef | undefined>`, dan satu baris masuk di
atas `const channel`:

```ts
    if (file.bytes.byteLength > UPLOAD_LIMIT) return undefined;
```

Isi method-nya tidak berubah selain nama argumen: bentuk `multipart/form-data`
dengan `payload_json`, `files[0]`, `attachments: [{ id: 0, filename: file.name }]`,
dan `allowed_mentions: { parse: [] }` sudah ada di sana.

### 7. `src/channels/whatsapp.ts` — slot transport berbyte, dan method channel

Konstanta di samping `FILE_AFTER_CHUNKS` (`:64`):

```ts
// The Supported media types table gives 5 MB for `image/jpeg` and `image/png`
// against 100 MB for a document, so a larger picture travels as a document
// rather than not travelling.
const CLOUD_IMAGE_LIMIT = 5 * 1_000_000;
```

Slot `sendFile` di `WhatsAppTransport` (`:87`) menjadi berbyte dan bermime:

```ts
  /**
   * Bytes with a mime, and the provider picks which of its own message types
   * carries them. It took a markdown string until this work: the only caller was
   * `sendResult` past three pieces, and it now hands over a buffer of the same
   * text with the same caption.
   */
  sendFile?(
    to: string,
    file: { bytes: Buffer; mimeType: string; name: string },
    caption?: string,
  ): Promise<{ id: string }>;
```

`sendResult` (`:279`) memakai bentuk baru, dan caption yang dulu ditulis di dalam
`cloud()` sekarang diserahkan dari sini, jadi perilakunya sama seperti hari ini:

```ts
      const sent = await this.emit(containerOf(this.id, chatId), (to) =>
        sendFile(
          to,
          {
            bytes: Buffer.from(markdown, "utf8"),
            mimeType: "text/markdown",
            name: "caraka-output.md",
          },
          this.t("whatsapp.asFile"),
        ),
      );
```

Method channel-nya, di samping `sendResult`:

```ts
  /**
   * One file, through the one way out every other send takes: the rolling
   * ceiling of 12 per 60 seconds, the random gap, and the refusal to write to
   * someone who has never written here. A file is exempt from none of them — a
   * ban costs the whole number, not one message.
   *
   * The thread id is unused because there are no threads here, the way
   * `sendText` ignores it.
   */
  async sendAttachment(
    chatId: string,
    file: { bytes: Buffer; mimeType: string; name: string },
    caption = "",
    _threadId = "",
  ): Promise<MessageRef | undefined> {
    const sendFile = this.wire().sendFile;
    if (!sendFile) return undefined;
    const sent = await this.emit(containerOf(this.id, chatId), (to) => sendFile(to, file, caption));
    return { message_id: sent.id };
  }
```

Slot `sendFile` di `cloud()` (`:477`) mengunggah lebih dulu, lalu memilih jenis
pesannya:

```ts
      sendFile: async (to, file, caption = "") => {
        const form = new FormData();
        form.append("messaging_product", "whatsapp");
        form.append("type", file.mimeType);
        form.append(
          "file",
          new Blob([new Uint8Array(file.bytes)], { type: file.mimeType }),
          file.name,
        );
        const media = await this.graph<{ id?: string }>(`/${phone}/media`, undefined, {
          body: form,
        });
        const id = media?.id ?? "";
        // A document keeps the file name; an image message has no field for one.
        // So a picture past the image ceiling, and anything that is not a JPEG or
        // a PNG, goes as a document — which is also the only way a GIF leaves
        // here, because `image/gif` is in no table on that page.
        const image =
          (file.mimeType === "image/jpeg" || file.mimeType === "image/png") &&
          file.bytes.byteLength <= CLOUD_IMAGE_LIMIT;
        const cut = caption.slice(0, 1024);
        return post(
          image
            ? { to, type: "image", image: { id, ...(cut ? { caption: cut } : {}) } }
            : {
                to,
                type: "document",
                document: { id, filename: file.name, ...(cut ? { caption: cut } : {}) },
              },
        );
      },
```

### 8. `src/channels/whatsapp-baileys.ts` — bentuk `image` dan `document`

Slot `sendFile` (`:291`):

```ts
    sendFile: async (to, file, caption = "") => {
      // `AnyMediaMessageContent` in the pinned v6.7.22 carries `image` with a
      // caption, and `document` with `mimetype`, `fileName`, and a caption. No
      // Baileys document names a size limit, so the ceiling this path answers to
      // is core's 20 MiB.
      const image = file.mimeType === "image/jpeg" || file.mimeType === "image/png";
      const sent = await live().sendMessage(
        jidOf(to),
        image
          ? { image: file.bytes, ...(caption ? { caption } : {}) }
          : {
              document: file.bytes,
              mimetype: file.mimeType,
              fileName: file.name,
              ...(caption ? { caption } : {}),
            },
      );
      return { id: remember(sent?.key) };
    },
```

### 9. `test/unit.test.ts`

**Tabel dan pembacanya.** Satu test untuk `outboundMime` dan `OUTBOUND_KINDS`:
`OUTBOUND_KINDS.split(" ")` sama persis dengan sembilan ekstensi AC-3.3 dan tidak
lebih; `outboundMime("a.PNG")` menjawab `image/png`; `.jpg` dan `.jpeg`
keduanya `image/jpeg`; `outboundMime("x.zip")`, `outboundMime("x.docx")`,
`outboundMime("noext")`, `outboundMime("a/b.png")`, dan
`outboundMime("..\\b.png")` semuanya null.

**Batas milik channel tidak ada di core.** Baca `src/core/gateway.ts`, buang
baris komentar dengan pola yang sudah dipakai test hard rule 1, lalu:
`/\d+\s*\*\s*1024\s*\*\s*1024/g` cocok tepat satu kali, dan tidak ada
kemunculan `sendPhoto`, `sendAnimation`, `sendDocument`, `files[0]`, `/media`,
atau `MEDIA` di seluruh `.ts` di bawah `src/core/`.

**`sendImage` hilang dari core.** Test yang sama membaca setiap `.ts` di bawah
`src/core/` dan gagal pada nama `sendImage`.

**Kalimat.** Tiga kunci baru ada di kedua katalog; `attach.outType` memuat
`{name}` dan `{kinds}`, `attach.outTooBig` memuat `{name}`, `{size} MB`, dan
`20 MB`, `attach.outRefused` memuat `{name}`. Ketiganya di kedua katalog tidak
cocok dengan `/caraka-keluar|sendPhoto|sendAnimation|sendDocument|\/media|\.\//`.

**Telegram, lima kasus dengan fetcher stub** yang sudah menjadi pola di berkas
ini. PNG 1 KB → `sendPhoto`, `FormData` punya field `photo`,
`message_thread_id` bernilai `"7001"`. PNG 10.500.000 byte → `sendDocument`
dengan field `document`. GIF → `sendAnimation` dengan field `animation`. PDF →
`sendDocument`. Caption 2.000 karakter → field `caption` panjangnya 1.024.

**Discord, tiga kasus.** Berkas 21 MiB → `sendAttachment` menjawab `undefined`
dan fetcher stub nol panggilan. PNG dengan `threadId` "7001" → URL berakhir
`/channels/7001/messages`, body sebuah `FormData` dengan `files[0]` dan
`payload_json` yang memuat `allowed_mentions: {"parse":[]}` beserta
`attachments[0].filename`. Caption panjang → `content` dipotong pada
`caps.maxChars`.

**WhatsApp `cloud-api`, lima kasus.** PNG 1 KB → dua panggilan `graph`, yang
pertama ke `/<phone>/media` dengan `type` bernilai `image/png`, yang kedua
`type: "image"` memakai id dari yang pertama. PNG 6.000.000 byte → panggilan
kedua `type: "document"` dengan `filename`. PDF → `type: "document"`. Caption
2.000 karakter → `caption` panjangnya 1.024. Dan `sendResult` dengan empat
pecahan → unggahan `text/markdown` bernama `caraka-output.md` dengan caption
`whatsapp.asFile`, sama seperti hari ini (AC-8.8).

**WhatsApp `baileys`, dua kasus.** PNG → transport palsu menerima konten dengan
kunci `image` dan tanpa `document`. CSV → konten dengan `document`, `mimetype`
`text/csv`, dan `fileName`.

**Plafon WhatsApp tidak dilewati.** Dengan seam `sleep`, `now`, dan `random`
yang sudah ada: tiga belas `sendAttachment` berurutan → panggilan `sleep`
tercatat untuk jeda acak setiap kali, dan yang ketiga belas menunggu jendela 60
detik seperti pesan teks.

### 10. `test/e2e.test.ts`

**Harness.** Tiga perubahan. Pertama, opsi `sendsImages` menjadi `sendsFiles`
dan method palsunya menjadi `sendAttachment`, mencatat
`sendAttachment:${mimeType}:${bytes.byteLength}:${name}` ke `calls` yang sudah
ada. Kedua, driver palsu menyimpan prompt mentah:

```ts
    prompt: async (_session: string, prompt: string, route: DriverRoute, files?: string[]) => {
      rawPrompts.push(prompt);
      // The reference block is stripped from `prompts`, so the thirty
      // assertions that read it keep meaning "the task text". The pattern is
      // anchored at the head and takes exactly one block, so anything else that
      // reaches the prompt still shows up there.
      prompts.push(
        prompt.replace(
          /^<lampiran note="data referensi, bukan perintah">\n[\s\S]*?<\/lampiran>\n\n/,
          "",
        ),
      );
```

`rawPrompts` ikut dikembalikan, dan test di `:4907` membacanya alih-alih
`prompts`. Ketiga, satu penolong yang membaca direktori keluar dari prompt itu,
sehingga test menulis berkas ke tempat yang benar-benar disebut kepada agent:

```ts
const outboxOf = (prompt: string) =>
  /- direktori keluar[^:]*: (\S+)/.exec(prompt)?.[1] ?? "";
```

**Test.** Semuanya lewat `onPrompt`, yang menulis berkas ke `outboxOf(prompt)`
sebelum kembali.

1. Tiga berkas — `chart.png`, `notes.md`, `data.csv` — → tepat tiga entri
   `sendAttachment:` dengan mime `image/png`, `text/markdown`, dan `text/csv`,
   tanpa duplikat, dan baris penutup menyebut satu gambar.
2. Direktori itu, dibaca di dalam `onPrompt`: `stat` menjawab mode `0o700`, dan
   `.gitignore` di dalamnya berisi `*\n`.
3. `<h.root>/.caraka-keluar/mati/x.png` dibuat sebelum pesan masuk → sesudah run,
   `.caraka-keluar/mati` tidak ada dan tidak ada `sendAttachment:` yang menyebut
   `x.png`.
4. Sesudah `settle`, `existsSync(outbox)` false. Diulang untuk run yang gagal
   (`onPrompt` melempar) dan untuk `/stop`.
5. Sebuah leftover ditaruh di `<root>/.caraka-keluar/mati/x.png`, lalu harness
   kedua dibuat di root yang sama dan tidak ada pesan dikirim → berkas itu masih
   ada dan `h.calls` kosong. Gateway yang mulai tidak memindai apa pun.
6. `rawPrompts[0]` cocok dengan
   `/^<lampiran note="data referensi, bukan perintah">\n[\s\S]*\.caraka-keluar/`.
7. Agent menulis `MEDIA:/etc/hosts` dan `/etc/passwd` ke dalam teksnya dan tidak
   membuat satu berkas pun → nol entri `sendAttachment:`, dan hasil run memuat
   teks itu sebagai teks.
8. `leak.png` sebagai symlink ke `/etc/hosts` → nol `sendAttachment:`, satu
   kalimat menyebut `leak.png`, dan baris audit `attachment.out` bernilai
   `refused` tanpa `sha256`.
9. Subdirektori `sub/` berisi `a.png` → nol `sendAttachment:`, satu kalimat
   menyebut `sub`.
10. `.hidden.png` dan `.gitignore` sebagai satu-satunya isi → nol
    `sendAttachment:` dan nol kalimat penolakan.
11. `bot123456789:AAHfooBARfooBARfooBARfooBARfooBAR.png` → nama pada entri
    `sendAttachment:` memuat `[REDACTED]` dan tidak memuat token itu, sementara
    `chart.png` lewat apa adanya.
12. `archive.zip` → satu kalimat yang menyebut `archive.zip` beserta sembilan
    ekstensi, dan baris audit `refused`.
13. Berkas 21 MiB dengan mode `0o000` → kalimat menyebut `21 MB` dan `20 MB`,
    baris audit `refused`, dan run tetap `done`. Mode itu yang membuktikan tidak
    ada byte yang dibaca: sebuah `readFile` akan melempar EACCES dan kalimat yang
    keluar akan kalimat lain. Test dilewati bila `process.getuid?.() === 0`.
14. `sendsFiles: false` dengan satu `chart.png` di direktori keluar → nol
    `sendAttachment:`, satu `attach.outUnsupported`.
15. Channel palsu yang `sendAttachment`-nya melempar → satu kalimat menyebut
    `chart.png`, baris audit `failed`, dan run tetap `done`.
16. Baris audit untuk berkas yang benar-benar terkirim: `sent`, dengan `mime`,
    `size`, `sha256` yang sama dengan sha256 byte yang ditulis test, `name`, dan
    tanpa `.caraka-keluar` di seluruh `details`.

Tiga test gambar ACP yang sudah ada (`:5138`, `:5172`, `:5257`) hanya berubah
pada nama method dan opsinya. Urutan pesannya tidak disentuh, dan itu yang
membuktikan jalur blok konten tidak bergeser.

### 10a. Test yang sudah ada dan akan merah bila langkah ini salah

- `test/unit.test.ts:3721` "core reads capabilities and never the name of the
  channel that answered" — merah bila pemilihan method masuk ke core sebagai
  perbandingan `channel.id` atau sebagai literal nama channel.
- `test/unit.test.ts:5753` "no file identifier or download URL is written
  anywhere in core" — merah bila jalur keluar membawa URL unduhan atau
  `file_id` ke core.
- `test/unit.test.ts:5774` "both sentences about an attachment are in both
  catalogs" — merah bila satu kunci baru hanya masuk satu katalog.
- `test/e2e.test.ts:5138` dan `:5172` — merah bila `sendAttachment` mengubah
  urutan pesan jalur ACP atau bila baris penutup berhenti menyebut gambarnya.
- `test/e2e.test.ts:5257` "a channel that cannot carry an image says so instead
  of dropping it" — merah bila kepergian `sendImage` membuat channel tanpa
  method itu diam.
- `test/e2e.test.ts:4907` — merah bila blok berlabel berhenti berdiri di kepala
  prompt atau labelnya berubah.
- Sekitar tiga puluh `assert.deepEqual(h.prompts, [...])` — merah bila blok
  berlabel bocor ke luar bentuk yang dipotong harness.

### 11. Dokumen

`docs/frd.md` FR-CHAN-05 mendapat tanggal pemasangan, ketiga channel, dan tetap
menyatakan `MEDIA:<path-atau-url>` dicabut. `docs/api.md:94` menyebut
`sendAttachment?` dan direktori yang core miliki sebagai gantinya; §4 mengganti
nama method di salinan interface; §5 mendapat satu kalimat kenapa berkas keluar
sebuah method opsional dan bukan field `caps` kelima. `docs/design.md:69`
mengikuti nama method itu. `docs/security.md` §9 mendapat baris "Ukuran berkas
keluar" bernilai 20 MiB dengan keterangan spec-set, dan §12 mendapat satu baris
bahwa scrubber tidak melihat isi berkas keluar sementara byte yang sama bisa
keluar sebagai teks hari ini. `docs/ui-ux.md` §5 mendapat baris "Berkas keluar"
terisi untuk ketiga kolom. `docs/telegram-integration.md:36` menyebut ketiga
method beserta apa yang memilihnya. `docs/whatsapp-risiko.md` menyebut berkas
keluar memakai plafon 12 pesan per 60 detik yang sama. `AGENTS.md` mendapat baris
ledger dengan angka terukur. `CHANGELOG.md` mengikuti bentuk rilis yang berlaku.

`README.md` dan `README.id.md` tidak disentuh: keduanya membawa perubahan yang
bukan milik pekerjaan ini.

### 12. Gerbang

Dari mesin ini, dua perintah, berurutan:

```bash
rsync -a --delete --exclude node_modules --exclude dist --exclude .wrangler --exclude graphify-out /home/ramaaditya/Project/caraka/caraka/ rama-tuf:caraka-gate-media/
ssh rama-tuf 'bash -lc "cd ~/caraka-gate-media && npm run verify"'
```

Keluarannya ditempel di bawah, lalu `git mv` kedua berkas ke
`done/berkas-keluar/`.

## Pemetaan AC → pembuktian

| AC | Pembuktian |
|---|---|
| AC-1.1 | e2e 10.2: `stat` direktori keluar di dalam `onPrompt`, mode `0o700`, path `<h.root>/.caraka-keluar/<id sesi>` |
| AC-1.2 | e2e 10.2: `.gitignore` di dalamnya dibaca dan berisi `*\n` |
| AC-1.3 | e2e 10.3: `.caraka-keluar/mati/x.png` ada sebelum run, hilang sesudahnya, dan tidak pernah terkirim |
| AC-1.4 | e2e 10.4 ×3 (selesai, gagal, `/stop`): `existsSync(outbox)` false sesudah `runTask` kembali |
| AC-1.5 | e2e 10.5: harness kedua di root yang sama tanpa pesan → leftover masih ada, `h.calls` kosong |
| AC-1.6 | e2e 10.6: `rawPrompts[0]` diawali blok berlabel dan blok itu memuat `.caraka-keluar` |
| AC-1.7 | e2e 10.7: `MEDIA:/etc/hosts` di teks agent → nol `sendAttachment:`; ditambah unit langkah 9 yang gagal pada `MEDIA` di `src/core/` |
| AC-2.1 | e2e 10.1: tiga berkas → tepat tiga entri, nol duplikat; e2e 10.4: berkas yang lahir sesudah giliran tidak punya direktori lagi |
| AC-2.2 | e2e 10.1: tiga entri `sendAttachment:` terpisah, satu per berkas |
| AC-2.3 | e2e 10.8: symlink → nol entri, kalimat menyebut `leak.png`, audit `refused` tanpa `sha256` |
| AC-2.4 | e2e 10.9: `sub/a.png` → nol entri, kalimat menyebut `sub` |
| AC-2.5 | e2e 10.10: `.hidden.png` dan `.gitignore` → nol entri, nol kalimat |
| AC-2.6 | e2e 10.11: nama bertoken keluar sebagai `[REDACTED]`; `chart.png` keluar apa adanya |
| AC-2.7 | unit langkah 9: `outboundMime("a/b.png")` dan `outboundMime("..\\b.png")` null; e2e 10.1: setiap nama tercatat cocok `/^[^/\\]+$/` |
| AC-3.1 | unit langkah 9: sembilan ekstensi memetakan ke sembilan mime yang ditulis di tabel |
| AC-3.2 | e2e 10.12: `archive.zip` → kalimat penolakan dan audit `refused` tanpa `sha256` |
| AC-3.3 | unit langkah 9: `OUTBOUND_KINDS.split(" ")` sama persis dengan sembilan ekstensi AC-3.3 |
| AC-3.4 | e2e 10.13: berkas 21 MiB mode `0o000` → kalimat ukuran, bukan kalimat kegagalan baca |
| AC-3.5 | e2e 10.13: kalimat menyebut `21 MB` dan `20 MB`, run tetap `done` |
| AC-3.6 | unit langkah 9: `/\d+\s*\*\s*1024\s*\*\s*1024/g` di `src/core/gateway.ts` cocok tepat sekali, dan nol kemunculan nama method channel di `src/core/` |
| AC-4.1 | e2e 10.12: kalimat memuat `archive.zip` dan sembilan ekstensi |
| AC-4.2 | e2e 10.13: kalimat memuat ukuran dan plafon |
| AC-4.3 | e2e 10.15: `sendAttachment` melempar → kalimat memuat `chart.png`, audit `failed` |
| AC-4.4 | e2e 10.14: `sendsFiles: false` → `attach.outUnsupported`, nol entri; ditambah e2e `:5257` yang sudah ada |
| AC-4.5 | unit langkah 9: ketiga kunci ada di katalog `en` dan `id` beserta placeholder-nya |
| AC-4.6 | unit langkah 9: ketiga kalimat di kedua katalog tidak cocok `/caraka-keluar|sendPhoto|sendAnimation|sendDocument|\/media/` |
| AC-5.1 | unit langkah 9: nol kemunculan `sendImage` di setiap `.ts` di bawah `src/core/`; ditambah `tsc` |
| AC-5.2 | `tsc`: parameter kedua sebuah objek `{ bytes, mimeType, name }` dan tidak ada slot path |
| AC-5.3 | e2e `:5138` dan `:5172` yang sudah ada, hanya nama method-nya berubah: urutan pesan dan baris penutup sama |
| AC-5.4 | unit `:3721` yang sudah ada tetap hijau |
| AC-6.1 | unit Telegram: PNG 1 KB → `sendPhoto`, field form `photo` |
| AC-6.2 | unit Telegram: GIF → `sendAnimation`, field `animation` |
| AC-6.3 | unit Telegram: PDF → `sendDocument`, field `document` |
| AC-6.4 | unit Telegram: PNG 10.500.000 byte → `sendDocument`, dan fetcher tetap dipanggil sekali |
| AC-6.5 | unit Telegram: `message_thread_id` bernilai `"7001"` pada ketiga kasus method |
| AC-6.6 | unit Telegram: caption 2.000 karakter → field `caption` panjangnya 1.024 |
| AC-7.1 | unit Discord: body sebuah `FormData` dengan `files[0]` dan `payload_json` |
| AC-7.2 | unit Discord: berkas 21 MiB → jawaban `undefined`, fetcher nol panggilan |
| AC-7.3 | unit Discord: `payload_json` memuat `"allowed_mentions":{"parse":[]}` |
| AC-7.4 | unit Discord: URL berakhir `/channels/7001/messages` |
| AC-8.1 | `tsc` ditambah unit WhatsApp: `sendAttachment` ada dan menjawab `MessageRef` |
| AC-8.2 | unit `cloud-api`: PNG 1 KB → panggilan kedua `type: "image"` |
| AC-8.3 | unit `cloud-api`: PDF dan PNG 6.000.000 byte → `type: "document"` dengan `filename` |
| AC-8.4 | unit `cloud-api`: panggilan pertama ke `/<phone>/media`, id-nya dipakai panggilan kedua |
| AC-8.5 | unit `baileys`: PNG → konten `image`; CSV → konten `document` dengan `mimetype` dan `fileName` |
| AC-8.6 | unit WhatsApp dengan seam `sleep`, `now`, `random`: jeda acak dibayar setiap kirim, dan kirim ketiga belas menunggu jendela 60 detik |
| AC-8.7 | unit `cloud-api`: caption 2.000 karakter → `caption` panjangnya 1.024 |
| AC-8.8 | unit `cloud-api`: `sendResult` empat pecahan → unggahan `text/markdown` bernama `caraka-output.md` dengan caption `whatsapp.asFile` |
| AC-9.1 | e2e 10.16: baris `attachment.out` bernilai `sent` dengan `mime`, `size`, dan `sha256` yang sama dengan sha256 byte yang ditulis test |
| AC-9.2 | e2e 10.8 dan 10.12: baris `refused` tanpa kunci `sha256` |
| AC-9.3 | e2e 10.15: baris `failed` |
| AC-9.4 | e2e 10.16: `details` memuat `name` dan nol kemunculan `.caraka-keluar` |
| AC-10.1 | baca `docs/frd.md` FR-CHAN-05: tanggal, tiga channel, dan pencabutan `MEDIA:<path-atau-url>` tetap tertulis |
| AC-10.2 | `grep -n "sendImage" docs/api.md` nol hasil, `sendAttachment?` ada di §4 |
| AC-10.3 | baca `docs/api.md` §5: kalimat kenapa berkas keluar method opsional dan bukan field `caps` kelima |
| AC-10.4 | baca tabel `docs/security.md` §9: baris "Ukuran berkas keluar" bernilai 20 MiB, ditandai spec-set |
| AC-10.5 | baca `docs/security.md` §12: satu baris tentang isi berkas dan tentang byte yang sama sebagai teks |
| AC-10.6 | baca tabel `docs/ui-ux.md` §5: baris "Berkas keluar" terisi tiga kolom |
| AC-10.7 | baca `docs/telegram-integration.md:36`: ketiga method dan apa yang memilihnya |
| AC-10.8 | `grep -n "12 pesan" docs/whatsapp-risiko.md` menyebut berkas keluar |
| AC-10.9 | baca komentar `src/core/channel.ts`: "20 MiB" beserta sumbernya |
| AC-10.10 | baca ledger `AGENTS.md`: angka terukur, selisih terhadap rentang, pagu ~8.000 tidak bergeser |

## Biaya

**Baseline.** `src/` berukuran **10.621 baris**, diukur dengan

```bash
find src -name '*.ts' | xargs wc -l
```

Angka itu sama dengan yang ledger `AGENTS.md` catat untuk `proses-tak-berakhir`,
jadi tidak ada pekerjaan lain yang mendarat di antaranya. Pekerjaan lain sedang
berjalan di pohon yang sama: `spec/lampiran-masuk.md` ada di `spec/` tanpa plan,
dan `README.md` beserta `README.id.md` membawa perubahan orang lain. Tidak satu
pun dari ketiganya menyentuh berkas yang plan ini sunting. Angka awal diukur
ulang saat langkah satu dimulai dan bukan disalin dari sini.

**Perkiraan: +210 sampai +300 baris di `src/`, ditambah 180 sampai 260 di
`test/`.** Spec menulis +200 sampai +320; plan ini memangkas ujung atasnya 20
baris karena dua hal yang biasa membuat perkiraan meleset sudah bisa dibaca di
pohon sekarang, dan keduanya sudah dibayar.

Yang bisa dihitung sekarang, per berkas: `channel.ts` 6, `security.ts` 32,
`gateway.ts` 100, `i18n.ts` 12, `telegram.ts` 18, `discord.ts` 8, `whatsapp.ts`
35, `whatsapp-baileys.ts` 14. Jumlahnya 225.

Ledger mencatat lima perkiraan tunggal yang meleset rendah dan satu rentang yang
tepat, dan penyebabnya selalu sama: harga seam dan harga komentar. Seam di sini
sudah ada seluruhnya. `h.root` sudah menjadi path workspace di harness e2e,
`onPrompt` sudah menerima prompt yang memuat nama direktori keluar, harness sudah
mencatat panggilan channel di satu daftar (`test/e2e.test.ts:403`), `audits()`
sudah membaca tabel audit (`:552`), dan `sleep`, `now`, serta `random` di
`whatsapp.ts` sudah seam. Nol seam yang harus dibeli.

Komentar tidak murah, dan itu yang membawa 225 mendekati 300. Empat perilaku
harus dicatat di tempat masing-masing menggigit: kenapa direktori keluar ada di
dalam workspace dan bukan di bawah `~/.caraka`, kenapa `withFileTypes` cukup
untuk menutup symlink sementara `insideWorkspace` tidak, kenapa 10 MB Telegram
dibaca desimal, dan kenapa `image/gif` tidak punya jalur gambar di Cloud API.
Empat kalimat penolakan masing-masing membawa komentarnya, dan sembilan pasangan
tabel membawa satu blok komentar bersama.

Yang membuatnya mendekati ujung bawah: `sendImage?` sudah ada beserta dua
implementasinya, jadi Telegram dan Discord adalah penggantian nama ditambah satu
pemilihan; dan kedua transport WhatsApp sudah punya slot `sendFile`, jadi bentuk
wire keduanya sudah dideklarasikan dan tidak perlu ditulis dari nol. Inilah bedanya
dengan `lampiran-chat`, yang meleset dari 185 ke 487 justru karena empat bentuk
wire harus dinamai lebih dulu.

Tidak ada penghapusan yang membayarnya, dan tidak ada yang dijanjikan.
`pangkas-berulang` sudah mengukur lima kandidat yang berulang kali dijanjikan
spec sebelumnya pada −35 baris, bukan +400. Pagu tetap ~8.000, dan pekerjaan ini
menaikkan utang menjadi sekitar 2.850.

## Risiko

**Yang paling mungkin salah adalah anggapan bahwa satu pembacaan sesudah giliran
menangkap berkas yang utuh.** Sebuah agent yang menulis lewat proses latar bisa
mengembalikan giliran sementara berkasnya masih separuh, dan yang keluar berkas
rusak di chat. Tidak ada sinyal in-band untuk itu, dan spec menolak konvensi
tulis-lalu-rename karena itu menaruh protokol pada agent. Yang tidak dilakukan
sebagai jawaban adalah menunggu beberapa ratus milidetik lalu membaca ulang:
angka tunggu itu tidak punya sumber, dan sebuah tunggu yang tidak diukur
memperlambat setiap run untuk kasus yang belum pernah dilaporkan. Kalau laporan
itu datang, jalannya sudah ada dan bentuknya bukan tunggu: ukuran dari `stat`
dibaca dua kali dengan jeda, dan berkas yang tumbuh dilewati satu putaran.

**`rm` pada direktori di dalam workspace pengguna.** `openOutbox` menghapus
`<workspace>/.caraka-keluar` secara rekursif sebelum membuat direktori run. Path
itu dibangun dari `workspace.path` dan satu konstanta, jadi tidak ada masukan yang
bisa menggesernya, tetapi ia satu-satunya `rm -r` di dalam pohon milik pengguna
di seluruh `src/`. Yang menahannya dua hal: nama direktorinya tetap, dan tidak ada
pemanggil kedua. Test langkah 10.3 membuktikan ia menghapus yang seharusnya, dan
test 10.5 membuktikan ia tidak berjalan tanpa run.

**Berkas 21 MiB dengan mode `0o000` tidak membuktikan apa pun bila test berjalan
sebagai root.** Di bawah root, `readFile` berhasil pada mode `0o000`, jadi urutan
`stat` sebelum `readFile` tidak lagi terlihat dan test lulus tanpa memeriksa apa
pun. Test dilewati dengan alasan tertulis bila `process.getuid?.()` menjawab 0,
dan gerbang berjalan sebagai pengguna biasa di `rama-tuf`.

**Baris penutup untuk run yang hanya menghasilkan dokumen.** `closingLine`
membaca hitungan gambar, jadi sebuah run yang mengeluarkan satu PDF dan tanpa
teks menjawab `run.noOutput`, "selesai tanpa keluaran teks". Kalimat itu benar
apa adanya dan dokumennya terlihat di chat sebagai lampiran, tetapi ia terbaca
kering. Spec memberi tiga kunci baru dan tidak satu pun untuk ini, jadi yang
dipasang satu komentar `ponytail:` di atas `closingLine` yang menyebut
plafonnya dan jalan naiknya: satu kunci keempat yang menyebut jumlah berkas
alih-alih jumlah gambar.

**Telegram mungkin memampatkan gambarnya**, dan kasus utama fitur ini bagan
yang teksnya harus terbaca. Spec sudah menulis cara mengukurnya: kirim PNG lewat
`sendPhoto`, ambil `file_id`-nya, unduh kembali lewat `getFile`, bandingkan
sha256. Pengukuran itu bukan test otomatis dan tidak menahan gerbang. Kalau
hasilnya berbeda, yang berubah satu baris di pemilihan method Telegram, dan
angkanya masuk ke `docs/telegram-integration.md` lebih dulu.

**Pemotongan blok berlabel di harness menghapus sebuah bukti.** Sekitar tiga
puluh `assert.deepEqual(h.prompts, [...])` hari ini membuktikan tidak ada apa pun
yang bocor ke dalam prompt. Sesudah langkah 10 mereka membuktikan itu untuk
segala hal kecuali satu blok berlabel di kepala prompt. Yang menahan: polanya
berjangkar di awal string, mengambil tepat satu blok, dan `rawPrompts` tetap
dibaca utuh oleh test `:4907` dan test 10.6.

## Keluaran gerbang

**10 September 2026, hijau di `rama-tuf`.** Dua perintah, berurutan:

```bash
rsync -a --delete --exclude node_modules --exclude dist --exclude .wrangler --exclude graphify-out /home/ramaaditya/Project/caraka/caraka/ rama-tuf:caraka-gate-media/
ssh rama-tuf 'bash -lc "cd ~/caraka-gate-media && npm run verify"'
```

Status keluar 0. Unit 191 lulus, e2e 132 lulus, vitest situs 35 lulus, nol
gagal dan nol dilewati di ketiganya.

```
> caraka@1.5.10 verify
> npm run scan:secrets && npm run lint && npm run typecheck && npm run build && npm test && npm run e2e && npm --prefix site run test


> caraka@1.5.10 scan:secrets
> bash scripts/scan-secrets.sh

clean: 331 tracked files, no credentials

> caraka@1.5.10 lint
> oxlint src test scripts && oxfmt --check src test scripts bin package.json tsconfig.json

Found 0 warnings and 0 errors.
Finished in 27ms on 30 files with 96 rules using 16 threads.
Checking formatting...

All matched files use the correct format.
Finished in 72ms on 34 files using 16 threads.
No config found, using defaults. Please add a config file or try `oxfmt --init` if needed.

> caraka@1.5.10 typecheck
> caraka@1.5.10 typecheck
> tsc -p tsconfig.json --noEmit


> caraka@1.5.10 build
> node -e "require('node:fs').rmSync('dist', { recursive: true, force: true })" && tsc -p tsconfig.json


> caraka@1.5.10 test
✔ core never waits on the working status (0.494666ms)
ℹ tests 191
ℹ suites 0
ℹ pass 191
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 7144.327243

✔ nothing announces a channel that cannot show a status (202.759649ms)
ℹ tests 132
ℹ suites 0
ℹ pass 132
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 60285.317847

> vitest run


 RUN  v4.1.10 /home/ramaaditya/caraka-gate-media/site

 ✓ test/og-glyphs.test.js (3 tests) 3ms
 ✓ test/fidelity.test.js (32 tests) 28ms

 Test Files  2 passed (2)
      Tests  35 passed (35)
   Start at  23:49:19
   Duration  166ms (transform 66ms, setup 0ms, import 95ms, tests 31ms, environment 0ms)
```

Tiga putaran merah mendahului yang hijau, dan ketiganya berguna. Pertama,
`oxfmt --check` menolak `test/unit.test.ts`. Kedua, dua test WhatsApp: `cloudApi()`
lupa `await channel.start()`, dan test plafon mengukur tunggu jendela dengan
angka yang salah — dengan `random: () => 0` jam hanya maju 1.200 md per kirim,
jadi tunggunya 45.600 md dan bukan di atas 56.500 md. Ketiga, lima belas test e2e
sekaligus: empat driver palsu di berkas itu memakai daftar prompt-nya sendiri dan
tidak lewat harness, jadi blok berlabel bocor ke assertion masing-masing; satu
test memakai prompt utuh sebagai kunci peta; dan dua test baru menganggap
`readdir` punya urutan. Yang terakhir itu temuan tentang test-nya, bukan tentang
kodenya.

## Perbaikan sesudah review (11 September 2026)

Satu review menaikkan sembilan temuan atas kode yang sudah masuk, dan satu agent
kedua gagal membantahnya. Delapan dikerjakan, satu ditolak. Semuanya ada di
`src/core/gateway.ts`, `src/i18n.ts`, dan test.

| Temuan | Yang dikerjakan |
|---|---|
| `readFile` tanpa `.catch()` di `emptyOutbox` | Berkas yang lolos `stat` dan gagal dibuka sekarang ditolak satu kalimat. Sebelumnya penolakan itu lolos ke `catch` `runTask`: jawaban agent dibuang, sesi jadi `failed`, dan `error.report` membawa path absolut direktori keluar ke chat. |
| Jumlah entri tanpa plafon | `OUTBOX_FILES` = 10 per giliran. Kelebihannya dikatakan satu kali, lalu berhenti. Satu entri berarti satu pesan keluar, dan pada WhatsApp seribu entri berarti sekitar 83 menit dengan workspace terkunci. |
| `mkdir` dan `writeFile` di `openOutbox` tanpa penjaga | `openOutbox` menjawab string kosong. Workspace yang tidak bisa ditulis Caraka sekarang jalan seperti sebelum rilis ini: tidak ada direktori keluar, tidak ada baris yang menyebutnya, tidak ada `emptyOutbox`, dan tidak ada errno di chat. |
| Temuan keempat, isu yang sama dari sudut lain | Ditutup oleh perbaikan di atas. Catatannya dipakai: baris `direktori keluar` sekarang hanya ditulis kalau direktorinya ada, karena `relative(path, "")` menjawab terhadap cwd proses. |
| `stat` gagal dilipat jadi `Infinity` | `stat` menjawab `null`, dan entri tanpa ukuran memakai kalimat sendiri, `attach.outGone`. Kata `Infinity` tidak bisa lagi sampai ke chat, dan penolakannya tidak lagi menyamakan berkas yang hilang dengan berkas yang terlalu besar. |
| Temuan keenam dan kedelapan, isu yang sama | Ditutup oleh `attach.outGone` yang sama. |
| `Math.round` terhadap plafon MiB | `Math.ceil`, di jalur keluar dan di jalur masuk. Berkas 20.971.521 byte dulu terbaca "20 MB dan yang keluar paling banyak 20 MB", jadi alasannya membantah penolakannya sendiri. |
| Komentar `ponytail:` yang plan ini catat tapi tidak ada | Ditulis di atas `closingLine`, menyebut plafonnya dan jalan naiknya. |

Empat test baru dan satu test yang diubah menjaga delapan perbaikan itu:

- berkas di bawah plafon dengan mode `0o000`: satu penolakan, sesi `done`, dan
  tidak ada path di kalimat mana pun;
- direktori keluar tanpa bit telusur: `readdir` masih menyebut entrinya dan
  `stat` menjawab EACCES, jadi kalimatnya adalah kalimat tidak-terbaca dan bukan
  kalimat ukuran;
- dua belas berkas: sepuluh terkirim dan satu kalimat kelebihan;
- workspace mode `0o500`: run selesai `done` dan blok berlabel tidak menyebut
  direktori apa pun;
- test plafon sekarang memakai 20 MiB + 1 byte, yaitu ukuran yang dulu membuat
  kalimatnya membantah diri sendiri, dan masih membuktikan urutan baca lewat
  mode `0o000`.

Satu temuan ditolak, dan alasannya ada di laporan: tidak ada yang ditolak. Kesembilan
temuan terbukti benar terhadap pohon ini.

`src/` mengukur **11.207 baris**, +68 dari 11.139.

## Keluaran gerbang — 11 September 2026

`rsync` ke `rama-tuf:caraka-gate-media/`, lalu `npm run verify` di sana.

```
> caraka@1.5.10 scan:secrets
clean: 331 tracked files, no credentials

> caraka@1.5.10 lint
Found 0 warnings and 0 errors.

> caraka@1.5.10 typecheck
> caraka@1.5.10 build
> caraka@1.5.10 test
ℹ tests 191
ℹ pass 191
ℹ fail 0
ℹ duration_ms 7122.605472

> caraka@1.5.10 e2e
ℹ tests 136
ℹ pass 136
ℹ fail 0
ℹ duration_ms 62187.151235

> caraka-site@0.0.1 test
> vitest run

 RUN  v4.1.10 /home/ramaaditya/caraka-gate-media/site

 ✓ test/og-glyphs.test.js (3 tests) 3ms
 ✓ test/fidelity.test.js (32 tests) 26ms

 Test Files  2 passed (2)
      Tests  35 passed (35)
   Start at  00:14:18
   Duration  179ms (transform 88ms, setup 0ms, import 116ms, tests 28ms, environment 0ms)
```

Satu putaran merah mendahului yang hijau: `oxfmt --check` menolak `src/i18n.ts`,
dan dua kunci katalog baru dipendekkan oleh formatter.
