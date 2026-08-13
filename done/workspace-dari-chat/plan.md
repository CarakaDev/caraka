# Plan — workspace-dari-chat

**Spec:** `spec/workspace-dari-chat.md` · **Tanggal:** 13 Agustus 2026

## Yang berubah dari plan ini saat dikerjakan

Ditulis lebih dulu, karena plan yang tidak lagi menggambarkan kode adalah plan
yang berbohong (`standards/ears.md` §3).

- **Tempat test.** Tabel di bawah menulis "Test unit" untuk semua pembuktian.
  Harness gateway hidup di `test/e2e.test.ts` (`harness()`, `heldDriver()`,
  `audits()`), jadi setiap AC yang butuh gateway berjalan ditulis di sana, dan
  yang bisa dibuktikan atas fungsi murni — `workspaces()`, `trustCommand`,
  `insideWorkspace`, `isHighRisk`, purpose callback, katalog, `openGrant` — di
  `test/unit.test.ts`. Kolom Pembuktian sudah disesuaikan dengan berkas dan judul
  test yang sebenarnya.
- **AC-1.2 tidak lewat `configSchema`.** Skema itu tidak diekspor, jadi
  pembuktiannya lewat `loadConfig()` dengan `assert.rejects(…, /workspaces\[\]\.path must be absolute/)`,
  yang menguji kalimat yang sama pada jalur yang sebenarnya dipakai.
- **AC-3.3 ternyata tidak bisa dicapai lagi, dan itu hasil yang lebih kuat.**
  Setelah langkah 3, sesi berslug asing tidak pernah memulai run: `routeTask`
  menjawab `ws.unknown`, dan `sessionFor` menolak memakai ulang baris seperti itu
  (`workspaceOf(existing)?.slug === workspace.slug` tidak pernah cocok), jadi
  setiap run memegang sesi berslug yang dinamai config. Kartu approval yang AC ini
  minta karena itu tidak bisa dinaikkan dari mana pun. Yang dibuktikan test adalah
  separuh yang penting: tidak ada baris audit `approval.decide`/`auto`, jadi tidak
  ada grant workspace lain yang diwarisi.
- **`closeGrants` mengembalikan `number | bigint`.** `{n}` di katalog menerima
  `string | number`, jadi `src/store/db.ts` membungkus `.changes` dengan `Number`
  — satu baris di store, bukan di gateway, karena keempat pemanggilnya membaca
  angka yang sama.
- **Bentuk `addAllowedWorkspace`.** Ia menerima `(config, entry: Workspace)`
  alih-alih `(config, slug, path)`; pemanggilnya sudah memegang entrinya.
- **Cabang path di `routeTask` menjadi satu pembantu.** `workspaceForPath`
  menjawab pengirimnya sendiri lalu mengembalikan undefined, sehingga `routeTask`
  tetap satu cabang `@` untuk slug maupun path, dan sticky serta `ws.sticky`
  ditulis di satu tempat untuk keduanya.
- **Satu fixture e2e yang sudah ada harus berubah.** Permintaan izin "ordinary
  work" di test `a trust window opens only from a signed button` menamai
  `/srv/app/src/index.ts` sementara harness-nya berjalan di direktori sementara,
  jadi AC-4.1 membuatnya berisiko tinggi dan ia berhenti auto-approve. Fixture-nya
  menjadi `src/index.ts`, yang juga bentuk yang tool call di dalam workspace
  benar-benar kirim. `test/unit.test.ts:1039` tetap tanpa suntingan, seperti
  langkah 4 perkirakan.
- **Assertion pemilih workspace yang lama sengaja dibuat merah dulu.**
  `["w:alpha", "w:beta"]` di test `an ambiguous chat is asked with buttons` gagal
  dengan dua payload bertanda tangan sebagai `actual`, lalu diganti menjadi
  pemeriksaan bentuk `^w:[A-Za-z0-9_-]{12}:a:[A-Za-z0-9_-]{16}$` plus satu press
  palsu.
- **AC-8.3 dibuktikan dengan satu direktori, bukan dua.** Direktori yang
  `basename`-nya sama dengan slug workspace di config sudah menghasilkan
  `ws.slugTaken`; dua direktori sementara berbasename sama membuktikan hal yang
  sama dengan satu langkah lebih banyak.
- **AC-8.8 kasus sepuluh menit menggeser `Date.now`** untuk satu pesan yang
  mencetak kartunya, karena TTL itu hidup di `pendingWorkspaces` yang privat dan
  tidak ada jalan lain ke sana dari test.
- **Satu penjaga yang tidak ada di plan.** Dua kartu bisa dicetak untuk satu path
  sebelum salah satunya ditekan, karena slug-nya masih bebas sampai ada press.
  `confirmWorkspace` karena itu memeriksa `workspaceBySlug(request.slug)` sekali
  lagi sesudah `confirmed()`, menjawab `callback.used`, dan menulis satu baris
  audit `ws.add`/`denied`. Tanpa itu press kedua menulis entri kedua ber-slug sama
  ke `config.yaml`. Diuji di `test/e2e.test.ts` di dalam test AC-8.8.
- **Angka anggaran.** Perkiraan ~100 baris salah. Terukur: 8.546 → 8.808,
  **+262**. Ledger `AGENTS.md` dan `docs/adr/0010` memuat angka terukur itu.
- **Tiga berkas di luar ruang lingkup spec ikut berubah**, dan semuanya karena
  kode ini membuat yang tertulis di sana salah: `src/store/db.ts` (`Number` di
  `closeGrants`), `test/e2e.test.ts` (harness gateway), dan tabel routing
  `docs/session-model.md` §5, yang sebelumnya tidak menyebut bentuk path maupun
  baris sesi berslug asing. Daftar aksi berisiko tinggi di `docs/security.md` §5
  dan padanan Inggrisnya juga mendapat satu butir, karena aturan baru itu bagian
  dari daftar yang sama.
- **`spawn-windows` sudah mendarat di checkout ini**, jadi syarat urutan di
  pembuka langkah di bawah sudah terpenuhi saat pekerjaan ini dimulai.

## Langkah

Empat langkah pertama menutup celah yang membuat "slug yang tidak dikenal"
menjadi eskalasi, dan fitur di langkah 7 baru boleh ditulis setelah keempatnya
hijau. Pekerjaan ini juga menunggu `spec/spawn-windows.md`
(`src/drivers/claude-acp.ts:60` tanpa listener `"error"`) mendarat lebih dulu,
karena keduanya menyentuh `src/cli.ts`, `src/i18n.ts`, `test/unit.test.ts`,
`docs/troubleshooting.md` beserta pasangan Inggrisnya, dan angka anggaran
`AGENTS.md`; angka terukur di langkah 12 baru berarti setelah spec itu tutup.
Gerbang di sini tidak butuh perbaikan itu: `npm run verify` tidak men-spawn
adapter sungguhan, dan spec itu membatasi klaim gerbangnya pada checkout
Windows.

1. **`src/config.ts` — kanonikalisasi di `workspaces()` (`:200-205`).** Daftar
   yang dikembalikan dipetakan melalui `resolve()` pada `path`, untuk cabang
   `workspaces[]` maupun untuk singular yang diangkat. Refine `isAbsolute` di
   `:20` dan `:53` tetap: ia yang menghasilkan pesan galat yang menyebut nama
   field, dan `resolve()` tidak akan pernah menolak apa pun. Satu komentar di
   atas `map` mencatat kenapa `isAbsolute` sendirian salah — kutipan dokumentasi
   Node "not safe for mitigating path traversals" dan fakta bahwa path ini
   dipakai sebagai `policy_grant.workspace`, string scope memori, `cwd` ACP, dan
   `cwd` `spawn`. Komentar itu ada supaya bentuk lama tidak ditulis ulang.

2. **`src/cli.ts` — `trustCommand` (`:802-833`) menolak path yang bukan
   workspace.** Setelah `trustWorkspace(args)` (`:805`), path dibandingkan
   terhadap `workspaces(loaded.config).map(w => w.path)`. Tidak cocok berarti
   `throw new Error(t("cli.trustNotWorkspace", { path, list }))`, yang ditangkap
   `main` (`cli.ts:1003-1010`) dan menghasilkan `process.exitCode = 1` — jalur
   yang sama dengan `cli.trustUsage` yang sudah ada, jadi tidak ada penanganan
   galat baru. Perbandingannya bekerja karena langkah 1: kedua sisi sekarang
   hasil `resolve()`. Pemeriksaan diletakkan sebelum `--bypass` dibaca (`:809`),
   jadi satu pemeriksaan menutup keempat AC di AC-2. `trustCommand` mendapat kata
   `export` yang belum ia punya, supaya AC-2.1 sampai AC-2.3 bisa memanggilnya
   langsung seperti test yang sudah ada memanggil `main` dan `trustWorkspace`
   (`test/unit.test.ts:37-54`). AC-2.4 tetap lewat `main`, karena
   `process.exitCode` disetel di `catch` milik `main`.

3. **`src/core/gateway.ts` — resolusi slug berhenti jatuh ke `home`.**
   `workspaceOf` (`:216-218`) mengembalikan `Workspace | undefined`: slug kosong
   tetap berarti workspace pertama, karena itulah jalur naik v0.4 yang
   komentarnya catat; slug tidak kosong yang tidak ada di config berarti
   undefined. `chatWorkspace` (`:223-229`) berhenti memakai `this.workspaces.length === 1
   ? this.home : undefined` ketika ada sticky: sticky yang tidak dikenal
   mengembalikan undefined, bukan `home` (AC-3.4). Lima pemanggil:
   - `:439` — cabang `threadId && session` menjawab `ws.unknown` dengan slug
     yang tersimpan di baris sesi, dan tidak menjalankan apa pun.
   - `:814` — `this.workspaceOf(existing)?.slug === workspace.slug`.
   - `:821` — `this.workspaceOf(session)?.slug ?? session.workspace`, jadi header
     tetap mencetak slug yang tertulis di baris sesi.
   - `:1197` — path diambil hanya bila workspace-nya ada; undefined berarti tidak
     ada grant, jadi kartu approval naik (AC-3.3), yang merupakan arah aman.
   - `:224` — meneruskan undefined ke empat pemanggil `workspaceForMessage`
     (`:1021`, `:1480`, `:1574`, `:1665`) yang semuanya sudah menanganinya.

   Kedua penjawab `ws.unknown` — cabang topic dan cabang `@slug` — memakai satu
   pembantu `unknownWorkspace(message, slug)`, karena kalimatnya sama dan
   `workspaceLines()` dipanggil di keduanya.

   `:1021` `memoryScopeFor` **tetap** memakai `?? this.home`. Itu sudah
   dipertimbangkan: scope memori bukan kunci kapabilitas yang bisa dieskalasi,
   dan tanpa fallback itu `/memori` di chat yang belum memilih workspace berhenti
   menjawab.

4. **`src/core/security.ts` — aturan path di luar workspace.** Satu predikat
   ekspor baru di dekat `isHighRisk`:

   ```
   insideWorkspace(root, target) → const rel = relative(root, resolve(root, target));
   rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))
   ```

   Predikat ini membaca `locations[]` maupun `rawInput` lewat daftar path yang
   sama yang `isHighRisk` sudah kumpulkan, jadi tidak ada jalur kedua.

   Bentuk `relative()` dipilih di atas `startsWith(root + sep)` karena ia
   menjawab root itu sendiri dan `<root>-secret` dengan satu ekspresi: pada
   mesin ini `'/home/r/Project-secret/x'.startsWith('/home/r/Project')` bernilai
   true sementara `relative` mengembalikan `../Project-secret/x`. `resolve(root, target)`
   di dalam menangani path relatif (AC-4.3). `isHighRisk` menerima parameter
   kedua opsional `workspaceRoot`, dan menambahkan satu klausa: sebuah path yang
   tidak `insideWorkspace` berisiko tinggi. Parameter itu opsional supaya
   `test/unit.test.ts:1006-1009` tetap sah tanpa disunting. Pemanggil
   satu-satunya di `src/` adalah `gateway.ts:1198`, yang sudah memegang
   workspace sesi itu dari langkah 3.

   Pemeriksaan ini berjalan atas keluaran `resolve()`, bukan `realpathSync`,
   karena `realpathSync` melempar ENOENT untuk path yang belum ada dan sebuah
   tool call yang membuat berkas menamai path yang belum ada. Symlink dan bind
   mount karena itu tidak terlihat. Baris "Batas direktori" di
   `docs/security.md` §7 (`:266`) dan padanannya di `docs/security.en.md`
   (`:263`) ditulis ulang untuk menyatakan itu, sekaligus berhenti menjanjikan
   aturan yang sebelumnya tidak ada implementasinya (AC-4.6).

5. **`src/core/security.ts` + `src/core/gateway.ts` — tombol workspace
   bertanda tangan.** `CallbackPurpose` (`security.ts:52`) menjadi
   `"c" | "t" | "g" | "w" | "a"`, dan `callbackPurpose` (`:108-111`) mengenali
   `w:` dan `a:`. Cabang awal `if (query.data?.startsWith("w:"))` di
   `gateway.ts:1405` dihapus beserta komentar pembenarannya, karena
   pembenaran itu berhenti benar begitu daftar workspace bisa tumbuh; purpose `w`
   sekarang dirutekan `callbackPurpose` seperti `t` dan `g`. Komentar
   penggantinya mencatat kenapa versi tanpa tanda tangan pernah cukup dan kenapa
   sekarang tidak. `askWorkspace` (`:474-501`) mencetak satu callback per
   workspace lewat `approvalCallbacks(this.approvalKey, "w")`, memakai hanya
   separuh `allow` sebagai `callback_data`, dan menyimpan `Map<callbackId, slug>`
   di entri `pendingChoice` yang sudah ada. `chooseWorkspace` (`:506-519`)
   memverifikasi dengan `verifyApprovalCallback(this.approvalKey, data, "w")`,
   mencari id itu di peta `choices` milik entri `pendingChoice` chat itu, lalu
   meneruskan pemeriksaan principal dan TTL yang sudah ia lakukan. Slug tidak lagi
   ikut di payload sama sekali: ia hidup di proses, dan payload hanya membawa id
   yang menunjuknya. Separuh `reject` tiap callback tidak dipakai; itu satu
   string terbuang per tombol dan nol cabang.

6. **`src/core/gateway.ts` — `/lock` (`closeTrust`, `:1572-1578`).**
   `closed` menjadi `workspace ? this.store.closeGrants(workspace.path) : this.store.closeGrants()`.
   `closeGrants()` tanpa argumen sudah berarti semua (`src/store/db.ts:272`) dan
   sudah dipakai `run()` (`:261`) saat restart, jadi tidak ada perilaku baru di
   store — satu perubahan di sana: nilai kembalinya dibungkus `Number`, karena
   `.changes` bertipe `number | bigint` dan `{n}` di katalog menerima
   `string | number`. Jawabannya bercabang tiga: satu workspace tertutup menjawab
   `trust.closed`, chat yang tidak bisa menyelesaikan workspace menjawab
   `trust.closedAll` dengan jumlahnya, dan nol menjawab `trust.notOpen`.

7. **`src/core/gateway.ts` — cabang path di `routeTask` (`:435-466`).** Regex
   `:442` menjadi `/^@(\S+)(?:\s+|$)/`, dan token itu diperiksa dengan
   `isAbsolute` sebelum dicari sebagai slug. Kedua cabang tidak bisa sama-sama
   cocok: `[\w.-]+` yang lama tidak pernah bisa absolut. Konsekuensi pelebaran
   yang disengaja: `@token` berbentuk lain, misalnya `@foo!bar`, yang dulu jatuh
   menjadi teks prompt sekarang dijawab `ws.unknown` (AC-7.5). Cabang path:
   - Bukan percakapan pribadi, atau pengirimnya bukan `this.operatorOf(chatId)`
     (yaitu `allowFrom[0]` channel itu) → satu baris audit `ws.path`/`denied`
     dan `ws.pathDmOnly` yang memuat daftar slug, lalu berhenti (AC-7.2, AC-7.3,
     AC-7.6).
   - `resolve(token)` sama dengan `path` sebuah workspace di config → tulis
     `ws.last.<chatId>` dan `queueRun`, tanpa kartu (AC-7.4).
   - Sisanya → `offerWorkspace(message, resolved, rest)`.

   Ketiga cabang itu berada di pembantu `workspaceForPath(message, token, rest)`,
   yang mengembalikan workspace yang sudah dinamai config atau undefined setelah ia
   sendiri menjawab pengirimnya. Dengan begitu `routeTask` tetap punya satu cabang
   `@`: penulisan `ws.last.<chatId>`, `ws.sticky` untuk pesan tanpa sisa, dan
   `queueRun` ditulis sekali untuk slug maupun path.

8. **`src/core/gateway.ts` + `src/config.ts` — kartu tambah-workspace.**
   - `offerWorkspace` menolak path yang bukan direktori dengan `ws.pathMissing`
     lewat `statSync(path, { throwIfNoEntry: false })?.isDirectory()`,
     menurunkan slug dari `basename(path)` — aturan yang sama dengan
     `defaultConfig` (`config.ts:345`) — dan menolak slug yang sudah dipakai
     dengan `ws.slugTaken`. Lalu ia mencetak `approvalCallbacks(this.approvalKey, "a")`,
     menyimpan `{ principal, path, slug, message, text, expiresAt }` di peta baru
     `pendingWorkspaces`, dan menjawab `ws.addCard` dengan `confirmCard(callback)`
     yang sudah ada.
   - `confirmWorkspace` memakai `confirmed(…, "a", this.pendingWorkspaces, "ws.add")`
     apa adanya; parameter `purpose` di `:1514` dilebarkan menjadi
     `"t" | "g" | "a"`. Pada ya: `this.workspaces.push(entry)`,
     `addAllowedWorkspace`, `setMeta("ws.last.<chatId>")`, satu baris audit
     `ws.add`/`granted` berisi path dan slug, `answerCallback(callback.confirmed)`,
     `ws.added` ke DM, dan `queueRun` bila `request.text` tidak kosong — pola
     yang sama dengan `chooseWorkspace:517`. Di depan semua itu, satu pemeriksaan
     `workspaceBySlug(request.slug)` menolak press kedua atas dua kartu yang
     dicetak untuk satu path yang sama.
   - `push` pada `[Workspace, ...Workspace[]]` lolos typecheck; diuji dengan
     `./node_modules/.bin/tsc --noEmit --strict --ignoreConfig` atas berkas
     contoh berisi `private readonly ws: [W, ...W[]]` dan `this.ws.push(w)`.
     Jadi tipe field `:116` tidak berubah, dan `readonly` tetap. Peta
     `queues` (`:119`) dan `active` (`:121`) dibuat malas — `enqueue` memakai
     `this.queues.get(slug) ?? {…}` (`:595`) dan `runTask` memakai
     `this.active.set` (`:859`) — jadi slug baru tidak butuh pendaftaran.
     Shutdown (`:1733`) melakukan iterasi atas array yang hidup, jadi ia ikut
     melihat workspace baru.
   - `addAllowedWorkspace(config, entry)` di `src/config.ts` — entrinya sudah
     dipegang pemanggilnya, jadi ia tidak dipecah menjadi dua argumen — sebelah
     `addAllowedChat` (`:354-365`), menulis `workspaces: [...workspaces(config), { slug, path }]`
     lewat `atomicSecret`. Bentuk `[...workspaces(config), …]` penting: pada
     config yang hanya punya `workspace` tunggal, menulis `workspaces[]`
     satu-elemen akan **menghilangkan** workspace asli, karena `workspaces()`
     memilih `workspaces[]` dan mengabaikan singular sepenuhnya (AC-8.11).
     `version` tidak disentuh (AC-8.10), dan `atomicSecret` (`config.ts:244-249`)
     menulis 0600 (AC-8.12).

9. **`AGENTS.md` aturan keras 3.** Teksnya menjadi pernyataan yang benar:
   `trusted` selalu kedaluwarsa dan itu diberlakukan constraint basis data;
   `bypassPermissions` terminal-only dan yang menahannya adalah satu pemanggil di
   `src/cli.ts:818`, bukan SQL. Constraint tidak ditambah — alasannya di spec
   Latar. Dua test menyatakan pembagian itu, termasuk satu yang **sengaja**
   berhasil membuka grant `granted_by = 'chat'`, supaya berkas test mencatat
   bahwa penjaga workspace hidup di kode dan bukan di skema.

10. **`src/i18n.ts` — tujuh pasang kunci, empat belas entri.** Katalog `en` dan
    `id`, ditulis dalam commit yang sama karena `const id: Record<MessageKey, string>`
    (`:293`) menggagalkan `tsc` untuk kunci yang hilang.

    | Kunci | Isi yang harus ada |
    |---|---|
    | `ws.pathDmOnly` | bentuk path hanya di DM operator, plus `{list}` slug yang bisa dipakai di sini |
    | `ws.pathMissing` | `{path}` tidak ditemukan sebagai direktori, dan apa yang harus dilakukan |
    | `ws.slugTaken` | `{slug}` sudah menunjuk `{path}` lain, tambahkan yang ini lewat `config.yaml` |
    | `ws.addCard` | `{path}`, `{slug}`, dan bahwa entrinya masuk `config.yaml` sampai dihapus tangan |
    | `ws.added` | `{slug}` menunjuk `{path}`, tugas di chat ini masuk ke sana |
    | `trust.closedAll` | chat ini tidak menyebut workspace, jadi `{n}` jendela ditutup |
    | `cli.trustNotWorkspace` | `{path}` bukan workspace di config, tidak ada jendela dibuka, `{list}` |

11. **Dokumen.** `docs/adr/0010-workspace-dari-chat.md` beserta barisnya di
    `docs/adr/README.md:20` sudah ditulis; yang belum:
    `docs/frd.md` FR-SESS-02 (`:72`) menyebut bentuk path
    dan batas DM operatornya; `docs/security.md` §7 baris "Batas direktori"
    beserta `docs/security.en.md` (langkah 4); satu gejala di
    `docs/troubleshooting.md` dan `docs/troubleshooting.en.md` untuk pergeseran
    scope memori di bagian Risiko. `docs/erd.md:100` sudah mencatat bahwa
    `policy_grant.workspace` tanpa FK adalah penyimpangan yang disengaja, jadi ia
    tidak berubah.

12. **Ukur dan catat.** `find src -name '*.ts' | xargs wc -l | tail -1` sebelum
    dan sesudah, lalu satu paragraf di ledger `AGENTS.md` dengan angka terukur
    dan apa yang dibelinya (AC-10.3). Pagu ~8.000 tidak digeser (AC-10.4).
    Perkiraan sebelum menulis kode adalah sekitar +100, dan angka yang masuk
    ledger adalah yang terukur, bukan perkiraan ini.

13. **Gerbang.** `npm run verify` dari akar, keluarannya ditempel di bawah.

## Pemetaan AC → pembuktian

| AC | Pembuktian |
|---|---|
| AC-1.1 | `test/unit.test.ts` · *a workspace path is canonicalised where it becomes a key*: `/srv/app/`, `/srv/app/../app` dan `/srv/./app` masing-masing `assert.equal(workspaces(config)[0].path, "/srv/app")`, dan singular yang diangkat diperiksa dengan cara yang sama |
| AC-1.2 | `test/unit.test.ts` · test yang sama: `loadConfig()` menolak `workspaces[0].path` relatif dengan pesan yang memuat `workspaces[].path must be absolute`, dan singular yang relatif dengan `workspace.path must be absolute`. Lewat `loadConfig` karena `configSchema` tidak diekspor |
| AC-1.3 | `test/unit.test.ts` · *caraka trust opens a window on a config workspace, and on nothing else*: config on disk bertulis `path: <root>/`, `trustCommand(["<root>/", "--for", "30"])`, lalu `activeGrant(workspaces(config)[0].path)?.grantedBy` bernilai `cli` |
| AC-2.1 | `test/unit.test.ts` · test yang sama: `assert.rejects(trustCommand(["/tmp", "--for", "60"]))`, lalu `activeGrant("/tmp")` undefined |
| AC-2.2 | `test/unit.test.ts` · test yang sama: pesan galat yang dilempar dicocokkan terhadap `/\/tmp is not a workspace/` dan terhadap path workspace yang ada |
| AC-2.3 | `test/unit.test.ts` · test yang sama: `trustCommand(["/tmp", "--for", "60", "--bypass"])` menolak, dan `SELECT workspace, agent_mode FROM policy_grant` hanya memuat baris workspace config ber-`agent_mode` null |
| AC-2.4 | `test/unit.test.ts` · test yang sama: `main(["trust", "/tmp", "--for", "60"])` lalu `process.exitCode` bernilai 1 |
| AC-3.1 | `test/e2e.test.ts` · *a session slug the config does not name runs nothing and inherits no window*: baris sesi berslug `hantu` di topic 7001 pada pemasangan dua workspace, pesan di topic itu dijawab `ws.unknown` dan `prompts` tetap kosong |
| AC-3.2 | `test/e2e.test.ts` · test yang sama: baris sesi dengan `workspace: ""` di topic 7002 berjalan, dan promptnya tiba di `agent-alpha`, yaitu workspace pertama |
| AC-3.3 | `test/e2e.test.ts` · test yang sama: dengan jendela terbuka pada workspace pertama, tidak ada baris audit `approval.decide`/`auto`. Kartunya tidak bisa dinaikkan karena sesi berslug asing tidak lagi memulai run sama sekali — lihat bagian *Yang berubah* di atas |
| AC-3.4 | `test/e2e.test.ts` · test yang sama, harness kedua: pemasangan **satu** workspace dengan `ws.last.42` berisi slug asing menjawab `ws.choose`, bukan menjalankan tugasnya di workspace itu |
| AC-4.1 | `test/unit.test.ts` · *a path outside the workspace root keeps its buttons, and one inside does not*: `isHighRisk({toolCall:{rawInput:{file_path:"/etc/hosts"}}}, "/srv/app")` true, dan `locations[]` diperiksa dengan cara yang sama |
| AC-4.2 | `test/unit.test.ts` · test yang sama: `file_path: "/srv/app/src/index.ts"` dengan root yang sama false |
| AC-4.3 | `test/unit.test.ts` · test yang sama: `file_path: "src/index.ts"` dengan root `/srv/app` false, dan `"../etc/x"` true |
| AC-4.4 | `test/unit.test.ts` · test yang sama: `insideWorkspace("/home/r/Project", "/home/r/Project-secret/x")` false |
| AC-4.5 | `test/unit.test.ts` · test yang sama: `insideWorkspace("/srv/app", "/srv/app")` true, juga dengan garis miring penutup dan lewat `..` |
| AC-4.6 | Pemeriksaan manual: baris "Batas direktori" `docs/security.md` §7 dan "Directory boundary" `docs/security.en.md` §7 keduanya menyebut `resolve()`, ENOENT `realpathSync`, symlink, dan bind mount |
| AC-5.1 | `test/e2e.test.ts` · *an ambiguous chat is asked with buttons, and the button routes like @slug*: setiap `callback_data` cocok `/^w:[A-Za-z0-9_-]{12}:a:[A-Za-z0-9_-]{16}$/`, dan teks tombolnya tetap `@alpha`/`@beta` |
| AC-5.2 | `test/e2e.test.ts` · test yang sama: press dengan payload yang satu karakter MAC-nya diubah (`forged()`) menjawab `callback.invalid`, `store.meta("ws.last.42")` tetap undefined, dan tidak ada prompt |
| AC-5.3 | `test/unit.test.ts` · *the two workspace purposes are signed, and neither one is the other*: `callbackPurpose(approvalCallbacks(key, "a").allow)` bernilai `"a"`, dan pemilih bernilai `"w"` |
| AC-5.4 | `test/unit.test.ts` · test yang sama: `verifyApprovalCallback(key, approvalCallbacks(key,"w").allow, "a")` null, sebaliknya juga null, dan purpose bawaan `c` juga null |
| AC-6.1 | `test/e2e.test.ts` · */lock never reports closed what it did not close*: dua workspace, dua grant terbuka, `/lock` dari ruangan berpasangan tanpa sesi dan tanpa `ws.last` menjawab `trust.closedAll` dengan `(2)`, dan `activeGrant` keduanya undefined |
| AC-6.2 | `test/e2e.test.ts` · test yang sama, langkah pertama: tanpa grant terbuka, `/lock` menjawab `trust.notOpen` |
| AC-6.3 | `test/e2e.test.ts` · test yang sama: dua grant terbuka, `/lock` dari chat yang sticky-nya workspace kedua menjawab `trust.closed`, menutup yang kedua, dan meninggalkan yang pertama |
| AC-7.1 | `test/e2e.test.ts` · *the path form is read in the operator's DM and refused everywhere else*: `@<path terkonfigurasi>/ do the thing` di DM operator menjalankan tugasnya di workspace itu |
| AC-7.2 | `test/e2e.test.ts` · test yang sama: pesan yang sama di ruangan berpasangan menjawab `ws.pathDmOnly` beserta daftar slug, dan tidak ada prompt baru |
| AC-7.3 | `test/e2e.test.ts` · test yang sama: pesan yang sama di percakapan pribadi `allowFrom[1]` menjawab `ws.pathDmOnly` |
| AC-7.4 | `test/e2e.test.ts` · test yang sama, langkah pertama: garis miring penutup merutekan ke workspace yang sama dan tidak ada satu pun pesan bermarkup, jadi tidak ada kartu |
| AC-7.5 | `test/e2e.test.ts` · test yang sama: `@bukan-slug` dan `@foo!bar` keduanya dijawab `ws.unknown` dan `prompts` tidak bertambah |
| AC-7.6 | `test/e2e.test.ts` · test yang sama: `audits(store, "ws.path")` tepat satu baris berhasil `denied` sesudah AC-7.2 |
| AC-8.1 | `test/e2e.test.ts` · *a path the config does not name is written by a signed card, or not at all*: satu pesan memuat path dan `workspace kelinci`, dengan dua tombol yang keduanya cocok `/^a:[A-Za-z0-9_-]{12}:[ar]:/`, dan tidak ada prompt sebelum press |
| AC-8.2 | `test/e2e.test.ts` · *the card refuses before it is drawn, and every wrong press leaves the file alone*: path yang tidak ada menjawab `ws.pathMissing` tanpa markup |
| AC-8.3 | `test/e2e.test.ts` · test yang sama: direktori yang `basename`-nya sama dengan slug workspace config menjawab `ws.slugTaken` tanpa markup |
| AC-8.4 | `test/e2e.test.ts` · *a path the config does not name is written…*: sesudah press ya, `parse(readFile(config))` memuat entri barunya |
| AC-8.5 | `test/e2e.test.ts` · test yang sama: pesan berikutnya `@kelinci again` di proses yang sama berjalan, tanpa memuat ulang config |
| AC-8.6 | `test/e2e.test.ts` · test yang sama: `prompts` bernilai `["agent-kelinci:do the thing"]`, yaitu tugas yang kartunya bawa |
| AC-8.7 | `test/e2e.test.ts` · *the card refuses before it is drawn…*: press tombol tolak menjawab `Rejected` dan `config.yaml` byte-identik dengan sebelum kartunya |
| AC-8.8 | `test/e2e.test.ts` · test yang sama, tiga kasus: press dari principal lain, press kedua atas id yang sama, dan kartu yang `Date.now`-nya digeser sebelas menit — ketiganya `callback.invalid` dan `config.yaml` byte-identik dengan keadaan sebelum press itu |
| AC-8.9 | `test/e2e.test.ts` · *a path the config does not name is written…*: `audits(store, "ws.add")` satu baris `granted` yang `details`-nya memuat `"path":"<path>"` dan `"slug":"kelinci"` |
| AC-8.10 | `test/e2e.test.ts` · test yang sama: `parse(config).version` tetap `1` |
| AC-8.11 | `test/e2e.test.ts` · test yang sama: config hanya bersingular `workspace`, dan sesudah ya `workspaces` bernilai `[{slug: basename(root), path: root}, {slug: "kelinci", path: fresh}]` |
| AC-8.12 | `test/e2e.test.ts` · test yang sama: `(await stat(config)).mode & 0o777` sama dengan `0o600` |
| AC-9.1 | `test/unit.test.ts` · *a trust grant must expire, and only three principals can write one*: INSERT `mode = 'trusted'` tanpa `expires_at` melempar `CHECK constraint failed` |
| AC-9.2 | `test/unit.test.ts` · test yang sama: `openGrant({mode:"trusted", grantedBy:"chat", expiresAt})` berhasil, dengan komentar yang menyatakan keberhasilan itu disengaja dan menunjuk di mana batas terminal-only sebenarnya dijaga |
| AC-9.3 | Pemeriksaan manual: aturan keras 3 `AGENTS.md` dibaca berdampingan dengan `db.ts:117-128` dan `cli.ts:818`; setiap klausa menyebut berkasnya |
| AC-10.1 | `npm run typecheck` di gerbang: `const id: Record<MessageKey, string>` menggagalkan `tsc` untuk kunci yang hilang, dan ketujuh pasangnya lolos |
| AC-10.2 | `test/unit.test.ts` · *the three sentences about a workspace say where the authority is, in both catalogs*, ditulis tangan dalam bentuk test kartu pairing: `ws.pathDmOnly`, `ws.addCard`, `trust.closedAll` dan `cli.trustNotWorkspace` dicocokkan satu per satu di `catalogs.en` dan `catalogs.id`, plus placeholder `{path}`, `{slug}`, `{n}` dan `{list}` |
| AC-10.3 | Keluaran `find src -name '*.ts' \| xargs wc -l \| tail -1` sebelum dan sesudah, ditempel di bagian Keluaran gerbang, dan paragraf ledger `AGENTS.md` memuat 8.808 |
| AC-10.4 | Pemeriksaan manual: `grep -n '~8,000' AGENTS.md` masih menunjuk baris pagu yang sama, dan diff bullet anggaran hanya menambah satu paragraf di depan yang lama |

## Risiko

**Pemasangan satu workspace berubah menjadi multi-workspace pada penulisan
pertama.** Setelah itu `chatWorkspace` tidak lagi punya jalan pintas
`workspaces.length === 1`, jadi setiap chat yang belum punya sticky mulai
ditanya "workspace mana". DM operator tidak terkena, karena langkah 8 menulis
`ws.last.<chatId>` untuk chat itu. Grup yang sudah dipasangkan akan ditanya satu
kali lalu menempel. Itu perilaku yang benar untuk pemasangan dua workspace dan
tetap perlu disebut, karena bagi operator ia muncul sebagai pertanyaan baru di
ruangan yang sebelumnya tidak pernah bertanya.

**`/lock` dari sebuah grup sekarang bisa menutup jendela workspace lain.**
Ketika chat tidak bisa menyelesaikan satu workspace, langkah 6 menutup semuanya.
Arahnya de-eskalasi, jadi ia tidak menaikkan wewenang siapa pun: yang paling
buruk yang bisa dilakukan anggota grup yang lolos daftar pengirim adalah
mencabut kenyamanan operator. Alternatifnya — menanyakan workspace mana seperti
`/yolo` — membuat sebuah perintah keselamatan gagal bertindak pada percobaan
pertama, karena tombol pemilih hanya menulis sticky dan tidak menutup apa pun.

**Kanonikalisasi mengubah kunci grant dan kunci scope memori pada pemasangan
yang path config-nya ditulis dengan garis miring penutup atau `..`.** Grant
terbuka tidak ikut terbawa: `run()` (`:261`) menutup setiap jendela saat proses
mulai, jadi tidak ada grant lama yang bisa kehilangan induknya. Yang benar-benar
bergeser adalah partisi `memory_local` untuk pemasangan seperti itu — memori
lama tetap di baris berscope ejaan lama dan tidak lagi terbaca. Tidak ada
migrasi yang ditulis untuk itu; yang ditulis adalah satu baris di
`docs/troubleshooting.md` dan `docs/troubleshooting.en.md` yang menyebut
gejalanya dan `UPDATE` satu baris yang memperbaikinya, karena membangun ledger
migrasi untuk satu bentuk config yang salah tulis lebih besar daripada
masalahnya.

**Pelebaran regex `@` mengubah pesan yang dulu jatuh menjadi prompt.** Sebuah
pesan yang dimulai `@` diikuti apa pun tanpa spasi sekarang dijawab
`ws.unknown`. Yang paling mungkin terkena adalah mention channel lain
(`@everyone`, `@here`) di awal pesan. Keduanya sudah dijawab `ws.unknown` hari
ini karena `[\w.-]+` mencocokkannya, jadi yang berubah hanya bentuk yang memuat
karakter di luar kelas itu.

**Symlink dan bind mount tidak terlihat oleh predikat containment.** Ini bukan
risiko yang bisa diperbaiki dengan lebih banyak kode di userland:
`mount --bind /etc <root>/notes` menghasilkan path yang lulus setiap pemeriksaan
string maupun `realpath`. Yang dilakukan pekerjaan ini adalah berhenti
menjanjikan sebaliknya di `docs/security.md` §7.

**Fitur ini menambah sekitar 100 baris ke `src/` yang sudah 498 baris di atas
pagunya, tanpa penghapusan yang membayarnya.** Keempat kandidat penghapusan yang
spec Latar sebut masing-masing milik concern lain, jadi PR berikutnya yang
menyentuh concern itu yang membayarnya. Berapa baris yang mereka kembalikan tidak
diukur di sini, jadi tidak ada angkanya.

## Keluaran gerbang

`find src -name '*.ts' | xargs wc -l | tail -1` sebelum pekerjaan ini:

```
  8546 total
```

Sesudah:

```
  8808 total
```

`npm run verify`, dari akar repositori, keenamnya berurut:

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
Finished in 106ms on 33 files using 24 threads.
No config found, using defaults. Please add a config file or try `oxfmt --init` if needed.

> caraka@1.2.0 typecheck
> tsc -p tsconfig.json --noEmit


> caraka@1.2.0 build
> node -e "require('node:fs').rmSync('dist', { recursive: true, force: true })" && tsc -p tsconfig.json


> caraka@1.2.0 test
> node --import tsx --test test/unit.test.ts
```

Unit, ekor keluarannya:

```
ℹ tests 126
ℹ suites 0
ℹ pass 126
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 7879.395526
```

E2E, ekor keluarannya:

```
ℹ tests 67
ℹ suites 0
ℹ pass 67
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 32002.750595
```

Dua belas baris yang menanggung AC di atas, dari keluaran yang sama:

```
✔ a workspace path is canonicalised where it becomes a key (7.814325ms)
✔ caraka trust opens a window on a config workspace, and on nothing else (58.093355ms)
✔ a path outside the workspace root keeps its buttons, and one inside does not (0.177315ms)
✔ the two workspace purposes are signed, and neither one is the other (0.296603ms)
✔ the three sentences about a workspace say where the authority is, in both catalogs (0.193884ms)
✔ a trust grant must expire, and only three principals can write one (55.036908ms)
✔ a session slug the config does not name runs nothing and inherits no window (583.061888ms)
✔ /lock never reports closed what it did not close (245.999867ms)
✔ the path form is read in the operator's DM and refused everywhere else (665.606463ms)
✔ a path the config does not name is written by a signed card, or not at all (461.090381ms)
✔ the card refuses before it is drawn, and every wrong press leaves the file alone (1543.037813ms)
✔ an ambiguous chat is asked with buttons, and the button routes like @slug (533.63897ms)
```

Yang dibuktikannya: keenam tahap gerbang hijau atas pohon yang memuat seluruh
perubahan ini — 126 test unit dan 67 test e2e lulus, nol gagal, dan `scan:secrets`
membaca 253 berkas terlacak tanpa temuan. `typecheck` yang hijau adalah AC-10.1:
`const id: Record<MessageKey, string>` menggagalkan `tsc` untuk kunci yang hilang,
jadi ketujuh pasang kunci ada di kedua katalog. Dua test yang mengubah harapan
lama — pemilih workspace yang sekarang bertanda tangan dan fixture izin yang
sekarang berada di dalam root workspace — ada di antara 67 itu, jadi keduanya
diperiksa dengan bentuk baru, bukan dilewati.

Pemeriksaan manual yang tidak dilakukan alat: baris "Batas direktori"
`docs/security.md` §7 dan "Directory boundary" `docs/security.en.md` §7 keduanya
menyebut `resolve()`, ENOENT `realpathSync`, symlink, dan bind mount (AC-4.6);
aturan keras 3 `AGENTS.md` menyebut constraint kedaluwarsa di `src/store/db.ts`
dan satu pemanggil `bypassPermissions` di `src/cli.ts` (AC-9.3); dan bullet
anggaran `AGENTS.md` tetap berbunyi "under ~8,000 lines" dengan satu paragraf baru
di depan paragraf `spawn-windows` (AC-10.4).
