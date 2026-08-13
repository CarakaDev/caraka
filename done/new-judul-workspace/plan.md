# Plan — new-judul-workspace

**Spec:** `spec/new-judul-workspace.md` · **Tanggal:** 13 Agustus 2026

## Langkah

Dua PR, karena `AGENTS.md` meminta satu concern per PR. Langkah 1–7 adalah PR
pertama, perbaikan bug: perute tunggal, jawaban tombol, potongan judul yang aman.
Langkah 8–12 adalah PR kedua, fitur judul yang dibawa `/new`. Langkah 13 menutup
keduanya.

Nomor baris di bawah dibaca sebelum `workspace-dari-chat` mendarat di working
tree, dan sesudahnya tidak lagi menunjuk apa yang disebutnya. Yang berlaku saat
pekerjaan ini dikerjakan: `dispatch` di `:386` dengan cabang `new` di `:438`,
`parseCommand` di `:453`, `routeTask` di `:463`, `queueRun` di `:509`,
`askWorkspace` di `:614`, `chooseWorkspace` di `:652` dengan jawabannya di
`:667`, entri `pendingChoice` di `:101-110`, `title()` di `:882`, dan
`createOnly` di `:975`. Setiap langkah di bawah menyebut nama, bukan hanya
nomornya, jadi yang dibaca adalah namanya.

### PR 1 — perute tunggal, jawaban tombol, potongan yang aman

1. `src/core/gateway.ts`, cabang `new` di `dispatch` — `this.routeTask(message, text, true)`
   menjadi `this.routeTask(message, argument, true)`. Satu identifier: `argument`
   sudah dihitung oleh `parseCommand` di atasnya dan sampai sekarang dibuang.
2. `src/core/gateway.ts`, cabang slug di `routeTask` — `this.queueRun(message, rest || text, chosen, create)`
   menjadi `this.queueRun(message, rest, chosen, create)`. `|| text` mati selama
   `create` tidak bisa mencapai cabang slug; begitu bisa, ia memberi judul
   `@dummy` kepada `/new @dummy` (`at[0]` = `"@dummy"`, `rest` = `""`). `!create`
   di cabang sticky tetap di tempatnya: itulah yang membuat `/new @slug` tanpa teks
   membuat sesi, bukan hanya menempelkan sticky.
3. `src/core/gateway.ts` — `create` dibawa lewat `pendingChoice`.
   - Tipe entrinya mendapat `create: boolean`. Langkah ini ditulis ketika tipe itu
     masih satu baris dan field-nya masih bisa muat di dalam 100 kolom;
     `workspace-dari-chat` sudah memecahnya menjadi blok lima field, jadi field
     ini memakan satu baris sendiri. Itu selisih anggaran yang dicatat di langkah
     13: +10 terukur, bukan +9.
   - Komentar di atas entri itu bertambah satu baris: yang harus bertahan sepuluh
     menit adalah maksud create, bukan hanya teksnya.
   - `askWorkspace` mendapat parameter ketiga `create = false`, sehingga pemanggil
     kedua di `offerTrust` tidak disentuh, dan entri yang ditulisnya mendapat
     `create,`.
   - Cabang tanya di `routeTask` menjadi
     `this.askWorkspace(message, text, create)`. Teks tidak lagi dikosongkan untuk
     create.
   - Jawaban tombol di `chooseWorkspace` menjadi dua baris. Bentuk satu barisnya
     109 kolom, dan `oxfmt` memecah apa pun di atas 100:

     ```ts
     if (waiting.text || waiting.create)
       this.queueRun(waiting.message, waiting.text, chosen, waiting.create);
     ```

     Itu +1 baris, dan satu-satunya baris pekerjaan ini yang bukan komentar dan
     bukan field. `waiting.text` kosong hanya datang dari `/yolo`, dan cabang
     `else` yang menjawab `ws.sticky` tetap milik jalur itu.
4. `src/core/gateway.ts`, `title()` — `.replace(/^\/new\s*/i, "")` dihapus,
   `.replace(/[\uD800-\uDBFF]$/, "")` ditambahkan sesudah `.slice(0, 72)`, dan
   enam baris komentar mencatat kenapa keduanya begitu. Komentar dan nama test di
   repositori ini berbahasa Inggris, jadi yang masuk ke `src/` adalah:

   ```ts
   // The first line of the task, cut at 72. No command is stripped here: the
   // router already receives `argument` from `parseCommand`, and a second cut
   // would only ever find "/new" inside "/newsletter". The cut counts UTF-16
   // code units, so it can land inside a surrogate pair, and half a pair makes
   // `createForumTopic` refuse the call — which `noteThreadsOff` then reads as
   // a container that cannot hold topics.
   private title(text: string) {
     return (
       text
         .split("\n")[0]
         ?.trim()
         .slice(0, 72)
         .replace(/[\uD800-\uDBFF]$/, "") || this.t("session.untitled")
     );
   }
   ```

5. `test/e2e.test.ts` — `createTopic` di harness mencatat namanya dengan
   ``calls.push(`createForumTopic:${name}`)``, sejajar dengan `editTopic` di
   sebelahnya yang sudah begitu. Tiga assertion yang membandingkan token itu apa
   adanya membaca prefiksnya: satu menjadi
   `assert.ok(h.calls.some((call) => call.startsWith("createForumTopic")))`, dan
   dua lainnya menjadi bentuk `false` dari `some` yang sama, yang `oxfmt` pecah
   menjadi empat baris masing-masing. Alternatifnya array kedua pada harness; satu
   tempat untuk fakta ini dipilih karena dua tempat akan berbeda pendapat. Objek
   yang dikembalikan harness juga mendapat `gateway,` — satu baris, dan
   satu-satunya cara sebuah test bisa membuat entri `pendingChoice` kedaluwarsa
   tanpa menunggu sepuluh menit.
6. `test/unit.test.ts`, korpus fuzz — pass kedua pada perute. Pass itu tidak bisa
   ditaruh tepat sesudah `inner.routeTask(message, text)` seperti langkah ini
   semula menulis: `inner.dispatch({ message })` beberapa baris di bawahnya
   memanggil perute lagi dan mencatat ke daftar `routed` yang sama, jadi sebuah
   batas yang dibaca sebelum `dispatch` akan menandai run milik `dispatch` sebagai
   run pass create. Yang ditulis: `const fromMessage = routed.length` dan
   `inner.routeTask(message, argument, true)` diletakkan sesudah `dispatch` dan
   sebelum assertion sticky, lalu loop `routed` membaca `entries()` dan menuntut
   `(index < fromMessage ? text : argument).endsWith(run.text)`. Itu satu
   assertion, bukan dua: `argument` adalah ekor `text`, jadi bentuk create lebih
   ketat dan invarian ekor pesan yang lama tetap dijamin olehnya. Assertion sticky
   mendapat asal kedua yang sah: sebuah slug boleh datang dari `argument`, bukan
   hanya dari depan pesan. Cast `inner` mendapat `title(text: string): string`, dan
   tabel terkurasi mendapat tiga assertion nilai tetap untuk `title()`: `""`,
   `"x".repeat(80)`, dan `"a".repeat(71) + "😀"`. Ketiganya membuktikan langkah 4,
   jadi ketiganya PR 1.
7. Test baru di `test/e2e.test.ts`, memakai `harness()` dan `heldDriver()` yang
   sudah ada. Nama test dan komentar berbahasa Inggris seperti setiap test lain di
   repositori ini, dan masing-masing membuka dengan komentar yang menyebut id
   AC-nya, mengikuti konvensi yang sama:
   Baris sesi dibaca lewat satu pembantu, `sessionRows(store)`, karena kelima test
   `/new` menanyakan tiga hal yang sama: workspace, judul, dan ada tidaknya topic.
   - `"/new @slug opens the session in that workspace and sticks there"` — dua
     workspace, `/new @beta bikin catatan`, lalu baris sesi, `ws.last.42`, dan
     `d.prompts` diperiksa. Lalu `/new @nope x` untuk `ws.unknown` dengan jumlah
     sesi yang tidak bergerak, dan `/new @beta` tanpa teks untuk judul
     `session.untitled`. Urutannya itu, supaya jumlah sesi yang dibaca sesudah
     slug tak dikenal masih 1.
   - `"a workspace button still carries the intent of /new ten minutes later"` —
     dua workspace dan tiga tekan pada satu chat, dalam urutan ini karena tekan
     yang berhasil menulis `ws.last` dan membuat sesi, sesudahnya `chatWorkspace`
     tidak bertanya lagi dan entri kedua tidak akan ada: `/new Kerjaan`,
     `expiresAt` entrinya disetel ke `Date.now() - 1` lewat `h.gateway`, tekan
     `w:beta` dari 42 → ditolak, tabel `sessions` kosong. Penolakan tidak
     menghapus entrinya, jadi `/new Kerjaan` kedua menimpanya dengan TTL hidup;
     tekan dari 99 → ditolak, lalu tekan dari 42 → satu sesi. Jumlah sesi dan
     `d.prompts` diperiksa sesudah ketiganya. Harness-nya dipanggil dengan
     `allowFrom: ["42", "99"]`: langkah ini semula mengandaikan 99 dijawab
     `callback.invalid`, dan seorang pengirim di luar allowlist dijawab
     `callback.denied` di fork callback tanpa entri itu pernah dibaca. Yang
     dibuktikan AC-3.6 adalah penolakan oleh entrinya, jadi 99 harus lolos
     allowlist lebih dulu.
   - `"a workspace button for /yolo opens no session"` — dua workspace,
     `/yolo 30`, tekan `w:beta`, lalu jumlah sesi dan teks `ws.sticky`.
   - `"a slash command the agent has not claimed stays whole as the title"` —
     `/newsletter draft`, satu workspace, `topics: true`.

### PR 2 — judul yang dibawa `/new`

8. `src/core/gateway.ts`, `queueRun` — menyerahkan `text` ke `createOnly`:
   `create ? this.createOnly(message, workspace, text) : this.runTask(message, text, workspace)`.
9. `src/core/gateway.ts` — `createOnly(message, workspace, text: string)`
   memakai `this.title(text)` sebagai judul. Tidak ada logika baru: `title()`
   sudah membawa aturan baris pertama, potongan 72 yang aman, dan jatuhnya ke
   `session.untitled`.
10. `src/core/channel.ts`, `gatewayCommands` — deskripsi `new` menjadi
    `Start a fresh session in this conversation, title optional`. Lebih panjang
    dari itu berbiaya baris: di luar deskripsinya baris itu 38 kolom, jadi
    deskripsi di atas 62 karakter melewati 100 dan `oxfmt` memecah literal
    objeknya menjadi empat baris — diukur di probe yang sama, dengan
    `optionally with a title` yang membuatnya 105 kolom. Batas 1–256 karakter
    sudah dijaga test bentuk perintah di `test/unit.test.ts`.
11. Dokumen, satu baris masing-masing: `docs/frd.md` (FR-SESS-03),
    `docs/ui-ux.md`, `docs/install-guide.md`, `README.id.md` memakai
    `/new [judul]`; `docs/install-guide.en.md` dan `README.md` memakai
    `/new [title]`.
12. Test judul: satu test e2e
    `"/new carries its title to the session line and to the topic name"`
    dijalankan dua kali lewat `for (const topics of [true, false])`, dan nama
    test mendapat `, topics true` atau `, topics false` supaya runner menyebut
    yang gagal; satu test katalog `"an untitled session is named in both
    catalogs"` di sebelah test katalog pairing; dan assertion deskripsi `new` di
    dalam test bentuk perintah yang sudah ada.
13. Gerbang: `npm run verify` dari akar repositori, lalu
    `find src -name '*.ts' | xargs wc -l | tail -1`. Keluaran keduanya ditempel di
    bagian terakhir plan ini. Angka 8.507 yang ditulis di sini, dan angka 8.498
    yang dipakai spec sebagai dasar, dibaca sebelum `workspace-dari-chat` dan
    `spawn-windows` mendarat di working tree; yang berlaku adalah 8.808, dan yang
    ditulis di bawah adalah angka terukurnya.

## Pemetaan AC → pembuktian

| AC | PR | Pembuktian |
|---|---|---|
| AC-1.1 | 1 | Korpus fuzz, pass create (langkah 6): `argument.endsWith(run.text)` untuk setiap run yang tercatat |
| AC-1.2 | 2 | Test e2e judul, `topics: true`: `/new@caraka_test_bot Kerjaan` → `h.calls` memuat `createForumTopic:Kerjaan` |
| AC-1.3 | 1 | Test e2e `"a slash command the agent has not claimed…"`: `h.prompts` = `["/newsletter draft"]` — test ini memakai driver harness, yang mencatat prompt tanpa prefiks `sessionId` — dan `title` baris sesi = `/newsletter draft` |
| AC-1.4 | 1 | Assertion ekor di loop `routed` korpus fuzz, kini `(index < fromMessage ? text : argument).endsWith(run.text)`, dilewati run pass pesan dan run pass create |
| AC-1.5 | 1 | Test e2e `/new @slug…`: `assert.deepEqual(d.prompts, [])` sesudah `h.settle()` |
| AC-2.1 | 1 | Test e2e `/new @slug…`: `SELECT workspace FROM sessions` = `beta` |
| AC-2.2 | 1 | Test e2e yang sama: `SELECT value FROM meta WHERE key = 'ws.last.42'` = `beta` |
| AC-2.3 | 2 | Test e2e yang sama, sesudah langkah 9: `SELECT title FROM sessions` = `bikin catatan` |
| AC-2.4 | 2 | Test e2e yang sama, pesan `/new @beta` tanpa teks: `title` = `translator()("session.untitled")`, dan bukan `@beta` |
| AC-2.5 | 1 | Test e2e yang sama, `/new @nope x`: `h.sent.at(-1).text` memuat `translator()("ws.unknown", { slug: "nope", list: "" }).split("\n")[0]` |
| AC-2.6 | 1 | Test e2e yang sama: `SELECT count(*) FROM sessions` tetap 1 sesudah `/new @nope x`, yaitu sesi dari `/new @beta` sebelumnya |
| AC-3.1 | 1 | Test e2e jawaban tombol: `SELECT count(*) FROM sessions` = 1 dan `workspace` = `beta` sesudah tekan terakhir dari 42 |
| AC-3.2 | 2 | Test e2e yang sama, sesudah langkah 9: `title` = `Kerjaan` |
| AC-3.3 | 1 | Test e2e yang sama: `assert.deepEqual(d.prompts, [])` sesudah tekan — assertion ini yang gagal kalau `chooseWorkspace` masih menyerahkan `false` |
| AC-3.4 | 1 | Test e2e `/yolo` + tombol: `SELECT count(*) FROM sessions` = 0 |
| AC-3.5 | 1 | Test e2e yang sama: satu entri `h.sent` berakhir dengan `translator()("ws.sticky", { slug: "beta" })` |
| AC-3.6 | 1 | Test e2e jawaban tombol, dua tekan yang harus ditolak: dari 42 pada entri yang `expiresAt`-nya sudah disetel ke masa lalu, dan dari principal 99. Sesudah masing-masing, entri `sent` dengan `chatId` `callback` sama dengan `translator()("callback.invalid")` |
| AC-3.7 | 1 | Test e2e yang sama: `SELECT count(*) FROM sessions` = 0 sesudah tekan pada entri kedaluwarsa, dan masih 0 sesudah tekan dari 99 |
| AC-4.1 | 2 | Test e2e judul, `topics: false`: `SELECT title FROM sessions` = `bikin catatan` |
| AC-4.2 | 1 | Assertion `title()` di tabel terkurasi korpus: `inner.title("x".repeat(80))` panjangnya 72 |
| AC-4.3 | 1, 2 | Assertion `inner.title("")` = `catalogs.en["session.untitled"]` di tabel yang sama (PR 1) dan test `"an untitled session is named in both catalogs"` yang menyebut kedua isi katalog apa adanya (PR 2) |
| AC-4.4 | 1 | Assertion `title()` di tabel yang sama: `inner.title("a".repeat(71) + "😀")` panjangnya 71 dan `/[\uD800-\uDBFF]$/` tidak cocok padanya |
| AC-4.5 | 2 | Test e2e judul, `topics: true`: `h.calls` memuat `createForumTopic:bikin catatan` |
| AC-4.6 | 2 | Test e2e judul, `topics: false`: sesi ada, `thread_id` kosong, `title` = `bikin catatan` |
| AC-4.7 | 2 | Assertion unit di dalam test `"every registered Telegram command fits the Bot API shape"`: deskripsi entri `new` cocok dengan `/title/i` dan dengan `/optional/i` |
| AC-5.1 | 2 | Pemeriksaan manual: `rg -n '/new' docs/frd.md docs/ui-ux.md docs/install-guide.md docs/install-guide.en.md README.md README.id.md`, keenam baris di langkah 11 dibaca satu per satu. Yang bukan pendaftaran perintah dipastikan tidak tersentuh: `/newbot` di `install-guide*.md:16`, `session/new` di `docs/design.md:124`, `/new` yang ditawarkan FR-SESS-06 di `docs/frd.md:76`, dan `/new@botmu` di `README.md:183` serta `README.id.md:185` |

## Risiko

Jawaban tombol berubah dari tidak melakukan apa pun menjadi membuat sesi.
Sebelum perubahan, `/new` di chat dengan tombol dan lebih dari satu workspace
hanya menjawab `ws.sticky`. Yang tidak boleh terjadi adalah run: kalau `chooseWorkspace`
tetap menyerahkan `false` sebagai `create`, teks judul dikirim ke agent sebagai
prompt dan sebuah run mulai berjalan di workspace itu, memakai token dan bisa
menyentuh berkas. AC-3.3 adalah assertion yang gagal kalau itu terjadi, dan ia
harus hijau sebelum langkah 3 dianggap selesai. Diperiksa merah lebih dulu: dengan
jawaban tombol dikembalikan ke `if (waiting.text)`, test itu berhenti di
`the title was written to the session, never sent as a prompt`, dengan
`actual: [ 'agent-beta:Kerjaan' ]` melawan `expected: []`.

Korpus fuzz sudah menjalankan `dispatch` di dalam loop
(`test/unit.test.ts:714`), jadi begitu `/new` merute pada `argument`, sebuah
fragmen `/new` diikuti spasi dan `@main` bisa menulis `ws.last` sementara
pesannya tidak dimulai dengan `@main`, dan assertion sticky gagal. Seed-nya
tetap, jadi itu kejadian yang pasti atau tidak pernah; langkah 6 melebarkan
assertion itu lebih dulu dengan alasan tertulis, ketimbang menunggu satu run
merah menjelaskannya.

`title()` melayani dua jalur sesudah PR 2, `runTask` dan `createOnly`. Potongan
yang aman surrogate memperbaiki keduanya sekaligus, dan pintu yang hari ini bisa
mematikan topic untuk seluruh container adalah `runTask`, bukan `/new` — jadi
perbaikan itu masuk PR 1, bukan menunggu fiturnya.

Mengubah token yang dicatat `createTopic` menyentuh tiga test yang tidak
berhubungan dengan pekerjaan ini. Ketiganya hanya bertanya apakah topic pernah
dicoba, jadi `startsWith` menjawab pertanyaan yang sama; kalau salah satunya
ternyata bergantung pada kecocokan persis, harness mendapat array kedua dan
langkah 5 ditulis ulang di plan ini.

Satu spec menjadi dua PR. Kalau hanya PR 1 yang terbit, `/new @slug` bekerja dan
judulnya masih `session.untitled`. Keadaan tengah itu sah, dan tidak ada AC yang
menjanjikan sebaliknya: kolom PR di tabel di atas menyebut di mana setiap
assertion mendarat.

Pekerjaan lain menulis di baris yang sama. `plan/workspace-dari-chat.md:99-106`
menyusun ulang `askWorkspace` dan `chooseWorkspace`, dan menyimpan
`Map<callbackId, slug>` di entri `pendingChoice` yang juga dipakai langkah 3.
Yang terbit lebih dulu meninggalkan konflik untuk yang kedua, dan bentuknya bukan
konflik teks: sebuah field `create` yang hilang saat entri itu ditulis ulang
membuat AC-3.1 sampai AC-3.3 merah tanpa satu pun baris yang bertabrakan. Urutan
terbit dan pemilik entri itu diputuskan sebelum PR 1 dibuka, bukan saat rebase.

Yang terjadi: `workspace-dari-chat` mendarat lebih dulu, dan `create` ditambahkan
di atas entri yang sudah ditulis ulangnya, di sebelah `choices`. Karena itu nomor
baris di seluruh plan ini bergeser dan field-nya memakan satu baris.

## Keluaran gerbang

`npm run verify` dari akar repositori, hijau berurut dan keluar dengan 0:

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
Finished in 94ms on 33 files using 24 threads.
No config found, using defaults. Please add a config file or try `oxfmt --init` if needed.

> caraka@1.2.0 typecheck
> tsc -p tsconfig.json --noEmit


> caraka@1.2.0 build
> node -e "require('node:fs').rmSync('dist', { recursive: true, force: true })" && tsc -p tsconfig.json
```

`npm test`, dengan nama test dipotong dan hitungannya apa adanya:

```
> caraka@1.2.0 test
> node --import tsx --test test/unit.test.ts

…
ℹ tests 127
ℹ suites 0
ℹ pass 127
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 7603.896041
```

`npm run e2e`, sama:

```
> caraka@1.2.0 e2e
> node --import tsx --test test/e2e.test.ts

…
ℹ tests 73
ℹ suites 0
ℹ pass 73
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 33537.197771
```

Test `/new` di antaranya, sebagaimana runner menyebutnya — lima test, enam
baris, karena test judul dijalankan sekali per nilai `topics`:

```
✔ /new @slug opens the session in that workspace and sticks there (494.03545ms)
✔ a workspace button still carries the intent of /new ten minutes later (616.216468ms)
✔ a workspace button for /yolo opens no session (256.524034ms)
✔ a slash command the agent has not claimed stays whole as the title (243.996406ms)
✔ /new carries its title to the session line and to the topic name, topics true (195.760823ms)
✔ /new carries its title to the session line and to the topic name, topics false (195.91788ms)
```

Yang dibuktikannya: satu perute yang membaca `argument`, jawaban tombol yang
masih membuat sesi dan masih tidak mengirim prompt, judul yang sampai ke baris
sesi dan ke nama topic, dan potongan 72 yang tidak meninggalkan setengah pasangan
surrogate. Ketiga bentuk salah diperiksa merah lebih dulu, masing-masing dengan
satu baris kode dikembalikan ke bentuk lamanya: `if (waiting.text)` membuat
`actual: [ 'agent-beta:Kerjaan' ]` melawan `expected: []`,
`.replace(/^\/new\s*/i, "")` membuat `actual: [ 'sletter draft' ]` melawan
`expected: [ '/newsletter draft' ]` sekaligus `actual: 72` melawan `expected: 71`
di assertion surrogate, dan `this.routeTask(message, text, true)` membuat
`actual: []` melawan `expected: [ 'beta:bikin catatan' ]`.

`find src -name '*.ts' | xargs wc -l | tail -1`:

```
  8818 total
```

+10 terhadap 8.808, bukan +9 terhadap 8.498. Dasar 8.498 di spec dibaca sebelum
`workspace-dari-chat` dan `spawn-windows` mendarat, dan baris kesepuluh adalah
field `create: boolean` pada tipe entri `pendingChoice`: `workspace-dari-chat`
sudah memecah tipe itu menjadi blok lima field, jadi field ini memakan satu baris
sendiri di tempat yang semula masih punya sisa kolom. Tujuh dari sepuluh baris itu
komentar. Plafon ~8.000 di `AGENTS.md` tidak digeser, dan angka terukurnya dicatat
di sini.
