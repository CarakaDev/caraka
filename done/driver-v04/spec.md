# Spec — Fase 4: Membuktikan abstraksi driver (v0.4)

**Slug:** driver-v04 · **Tanggal:** 8 Agustus 2026 · **Status:** aktif
**Induk:** `spec/v10.md` (kampanye v1.0, lingkup butir 4) · **Roadmap:** `docs/roadmap.md:92-102`

## Latar

Roadmap menutup Fase 4 dengan satu pertanyaan (`docs/roadmap.md:94`): apakah
lapisan driver benar-benar generik, atau cuma terlihat generik? Kode v0.3.0
menjawab "terlihat": satu driver (`src/drivers/claude-acp.ts`, 121 baris) dengan
spawn yang dikeraskan di `:32-38`, dipegang gateway sebagai tipe konkret
(`src/core/gateway.ts:91`), dibangun di satu tempat (`src/cli.ts:349`). Direktori
`presets/agents/` yang dijanjikan `AGENTS.md:57`, `docs/design.md:296`, dan
`docs/api.md:13` belum ada. Test e2e sudah membuktikan permukaan driver yang
sebenarnya dibutuhkan gateway — dua objek palsu di `test/e2e.test.ts:94-122` dan
`:271-285`, keduanya lolos lewat cast `as unknown as ClaudeAcp`.

Definition of done fase ini (`docs/roadmap.md:102`): menambah agent baru = satu
berkas YAML, tanpa menyentuh kode inti. Gerbangnya sudah tertulis sebagai
AC-4.1 di `spec/v10.md:77-78`, dan test untuk gerbang itu ditulis lebih dulu
dari loader-nya (lihat plan).

## Keputusan kontrak

Tiga keputusan yang mengikat lingkup ini. Amandemen dokumennya dikerjakan pada
langkah dokumen-dan-rilis di plan, bukan dicicil.

**K1 — Preset ACP memuat blok `acp: {command, args[], env{}}`.**
Tabel field `docs/api.md:30-47` hanya mengenal field jalur CLI; tidak ada satu
pun field spawn untuk `driver: acp`, padahal `claude-acp.ts:32-38` mengeraskan
spawn-nya sendiri. Bukti bahwa tiga field itu cukup: vscode-acp berbicara ke
sembilan agent berbeda hanya dengan config `{command, args, env}` per agent
(`docs/research/acp-protokol-universal-agentclientprotocol-jetbrains-morph.md:83`).
Bentuknya blok tersarang, bukan field datar, supaya field `command`/`args` CLI
di tabel api.md tetap berarti satu hal — satu preset boleh memuat kedua jalur,
dan FR-DRV-07 (`docs/frd.md:123`) memakai keduanya untuk jatuh dari ACP ke CLI.
Adapter Claude yang selama ini di-resolve lewat `import.meta.resolve` tersedia
sebagai bin `claude-agent-acp` dari dependency terkunci
(`package.json:49`, `@agentclientprotocol/claude-agent-acp` 0.63.0), jadi
preset `claude-code` bisa menyebutnya sebagai `command` biasa; driver ACP
me-resolve `command` terhadap PATH ditambah `node_modules/.bin` paket ini.
`docs/api.md` diamendemen pada langkah rilis.

**K2 — Skema Zod hanya memuat field yang dibaca kode.** (Direvisi 8 Agustus
2026 pada tinjauan pra-tutup; bentuk awalnya menyalin seluruh tabel
`docs/api.md:30-47` plus `sessionArg|sessionArgs[]` dari FR-DRV-05.) Sepuluh
field salinan itu tidak punya satu pun pembaca di `src/`, dan skema yang
menerima field tanpa pembaca menjanjikan perilaku yang tidak ada. Skema
dipangkas ke field yang dikonsumsi loader dan driver CLI — id, driver,
command, args, resumeArgs, input, maxPromptArgChars, output, resumeOutput,
sessionIdFields, env — plus blok `acp:` (K1). Tabel api.md diamendemen pada
langkah rilis: field selebihnya ditandai rencana, dan masing-masing masuk
skema saat ada driver yang membacanya.

**K3 — Interface `AgentDriver` = permukaan de-facto, bukan bentuk aspirasional.**
`docs/design.md:94-108` menggambar interface dengan `caps`, `onUpdate`,
`onPermission`, `onDone`. Gateway tidak membutuhkan satu pun dari itu; yang ia
butuhkan terbukti di `test/e2e.test.ts:94-122`: `start`, `session(existing,
cwd) → id`, `prompt(sid, prompt, route) → {stopReason}`, `setMode`, `cancel`,
`stop`, dengan route berisi `update` dan `permission`. Interface dinamai dari
permukaan itu dan tinggal di `src/core` (arah dependensi `channels → core ←
drivers`, `AGENTS.md:39`: driver mengimpor core, bukan sebaliknya). Bentuk
update dan permintaan izin yang dibaca core dipromosikan menjadi tipe milik
`src/core` — subset yang benar-benar dibaca hari ini (teks
`agent_message_chunk`, `available_commands_update`, `usage_update`,
`options[].{optionId,name,kind}`, `toolCall.*`; `src/core/gateway.ts:549-569`,
`:719-825`) — sehingga import tipe `@agentclientprotocol/sdk` di
`gateway.ts:4-9` hilang. Driver ACP memenuhinya secara struktural tanpa
terjemahan runtime; driver CLI memfabrikasi bentuk yang sama.
`docs/design.md` §2.3 dan `docs/api.md` §5 diamendemen mengikuti bentuk nyata.

## Lingkup

1. Interface `AgentDriver` dinamai di `src/core`, gateway dan kedua test palsu
   memakainya. Nol perubahan perilaku.
2. Test gerbang AC-4.1 (preset dummy → `src/core/` tak tersentuh), ditulis
   sebelum loader ada.
3. Loader preset + skema Zod (YAML, `docs/techstack.md:68-71`; config JS
   ditolak karena mengeksekusi kode) + tujuh preset FR-DRV-06
   (`docs/frd.md:122`).
4. Driver CLI generik satu implementasi dikendalikan tabel
   (`docs/design.md:158`), diuji terhadap fixture rekaman di `test/fixtures/`.
5. Pemilihan driver ACP → CLI → error yang menjelaskan, bisa dipaksa
   per-workspace (`docs/troubleshooting.md:45-49`).
6. Config `workspaces[]` aditif; kolom `workspace` dan `agent` di `sessions`;
   routing `@slug` dengan default lengket; antrean dan slot aktif per
   workspace.
7. `/switch` dan `/ws`.
8. Auto-discovery (pindai PATH + ACP Registry JSON + cache 24 jam), `init` dan
   `doctor` melepas persyaratan keras Claude.
9. Workflow CI pertama: gerbang verifikasi + matriks smoke jujur per preset.

Dua hal yang sudah gratis dan karena itu bukan lingkup: `/commands` dan
`/usage` sudah terdegradasi ke jawaban kosong saat driver tidak pernah
mengirim update-nya (`src/core/gateway.ts:225-249`), dan streaming sudah
toleran pada satu update per giliran (throttle 1500 md `:448`, hasil akhir
lewat `sendResult` `:464`).

## Yang tidak dikerjakan

- **Driver MCP inbox** (FR-DRV-08, P1) — fase berikutnya.
- **Smoke hidup terhadap agent yang tidak terpasang.** Matriks CI mem-probe
  binari; yang absen tercatat skip. Tidak ada hijau palsu.
- **Observasi DoD oleh manusia** ("menambah agent tanpa bertanya") — validasi
  pasca-rilis per keputusan pemilik 8 Agustus 2026 (`spec/v10.md`), dicatat di
  `docs/roadmap.md` seperti gerbang lapangan lain.
- **`npm publish`** — menunggu pemilik (`spec/v10.md:43`).
- **Pool proses ber-idle-shutdown 15 menit** (`docs/design.md:279`) — proses
  CLI keluar sendiri di akhir giliran; adapter ACP tetap satu anak proses
  seperti hari ini.
- **Penandaan run `interrupted` pasca-restart** (`docs/design.md:280`) —
  perilaku restart v0.3 bertahan.
- **Tabel `run` + unique partial index** (`docs/erd.md:256`) dan **batas 5 sesi
  aktif per principal** (`docs/erd.md:258`) — penegakan satu-run-per-workspace
  di level aplikasi (proses tunggal, Map per workspace); deviasi dicatat di
  amandemen erd.

## Acceptance criteria

Angka tanpa sumber docs diberi keterangan asalnya di butirnya.

### AC-1 · Interface `AgentDriver`

- **AC-1.1** Gateway shall menerima objek apa pun yang memenuhi interface
  `AgentDriver` milik `src/core` pada parameter driver konstruktornya
  (`src/core/gateway.ts:91`), sehingga kedua fake di `test/e2e.test.ts:94-122`
  dan `:271-285` lolos tanpa cast `as unknown as ClaudeAcp`.
- **AC-1.2** WHEN commit yang menamai interface diuji dengan `npm test` dan
  `npm run e2e`, seluruh test yang sudah ada shall lulus tanpa perubahan
  assertion.
- **AC-1.3** `src/core` shall membaca bentuk update dan permintaan izin dari
  tipe yang dideklarasikan di `src/core`, tanpa import dari
  `@agentclientprotocol/sdk` (yang hari ini ada di `src/core/gateway.ts:4-9`).

### AC-2 · Gerbang fase

- **AC-2.1** WHEN sebuah agent baru ditambahkan lewat satu berkas YAML di
  `presets/agents/`, diff shall tidak menyentuh `src/core/` (AC-4.1
  `spec/v10.md:77-78`; DoD `docs/roadmap.md:102`).
- **AC-2.2** WHEN fase ditutup, plan shall memuat LOC `src/` hasil `wc -l`
  dengan total di bawah 8.000 baris (anggaran `AGENTS.md:19`; dasar terukur
  8 Agustus 2026: 3.377).

### AC-3 · Skema preset dan preset bawaan

- **AC-3.1** WHEN loader membaca sebuah berkas `presets/agents/*.yaml`, ia
  shall memvalidasinya dengan skema Zod yang memuat field yang dibaca loader
  dan driver CLI (daftar di K2) dan blok `acp: {command, args[], env{}}` (K1).
- **AC-3.2** IF sebuah berkas preset gagal validasi, THEN loader shall menyebut
  nama berkas dan field yang gagal di pesannya dan tetap memuat preset lain.
- **AC-3.3** `claude-code.yaml` dan `codex.yaml` shall hanya memuat flag dari
  sumber terverifikasi (`docs/design.md:162-183` blok penuh, `docs/api.md:15-28`
  verbatim, matriks
  `docs/research/coding-agents-matriks-integrasi-multi-sumber.md:27-28`),
  termasuk `--sandbox read-only` codex yang berstatus kontrol keamanan
  (`docs/security.md:221`).
- **AC-3.4** `gemini.yaml`, `cursor.yaml`, `goose.yaml`, dan `amp.yaml` shall
  memakai `driver: acp` dengan blok `acp:` (matriks riset baris :29, :37, :39,
  :40).
- **AC-3.5** Setiap flag yang belum diuji sendiri shall ditandai komentar
  `# belum diverifikasi` beserta sumbernya di dalam berkas presetnya — seluruh
  flag `aider.yaml` termasuk (matriks :46; bar penerimaan `docs/api.md:49` dan
  `.github/ISSUE_TEMPLATE/agent_preset.yml:35-36`).

### AC-4 · Driver CLI generik

- **AC-4.1** WHEN giliran dijalankan pada jalur CLI, driver shall men-spawn
  `command` dengan `args` preset dan cwd path workspace sesi.
- **AC-4.2** Env proses agent shall merupakan env induk tanpa
  `CARAKA_TELEGRAM_TOKEN` (preseden `claudeEnvironment`,
  `src/drivers/claude-acp.ts:17-21`) ditambah `env` preset.
- **AC-4.3** WHERE `input` berisi `arg` atau absen, driver shall mengirim
  prompt sebagai argumen (`docs/api.md:37`).
- **AC-4.4** WHERE `input: stdin`, driver shall menulis prompt ke stdin proses.
- **AC-4.5** IF panjang prompt melebihi `maxPromptArgChars` pada `input: arg`,
  THEN driver shall berpindah ke stdin (`docs/api.md:38`).
- **AC-4.6** WHEN `output: json`, parser shall mengambil teks jawaban dan id
  sesi dari kunci pertama `sessionIdFields[]` yang hadir (kontrak
  `docs/design.md:185`), dibuktikan terhadap fixture di `test/fixtures/`.
- **AC-4.7** WHEN `output: jsonl`, parser shall mengambil pesan agent terakhir
  dan id thread dari aliran (kontrak yang sama, contoh nyata format codex di
  matriks riset :28), dibuktikan terhadap fixture.
- **AC-4.8** WHEN `output: text`, parser shall meneruskan stdout apa adanya.
- **AC-4.9** Driver CLI shall menerbitkan minimal satu update teks per giliran
  ke gateway (kontrak de-facto `test/e2e.test.ts:109-115`).
- **AC-4.10** `setMode` pada driver CLI shall berupa no-op yang resolve
  (preseden `src/drivers/claude-acp.ts:100-105`).
- **AC-4.11** WHEN cancel dipanggil pada run CLI, driver shall mengirim SIGTERM
  ke prosesnya (`docs/design.md:278`).
- **AC-4.12** IF proses masih hidup 5 detik setelah SIGTERM, THEN driver shall
  mengirim SIGKILL (urutan dari `docs/design.md:278`; angka 5 detik tidak ada
  di docs dan ditetapkan spec ini sebagai grace period, diuji unit).
- **AC-4.13** IF proses keluar dengan status bukan nol, THEN driver shall
  melempar error berisi potongan stderr yang sudah discrub, dan jawaban ke chat
  mengikuti jalur error yang ada — bukan stack trace (`AGENTS.md:65`).

### AC-5 · Pemilihan driver

- **AC-5.1** WHEN sesi dimulai dan preset agent-nya punya blok `acp:` yang
  berhasil spawn dan initialize, gateway shall memakai jalur ACP
  (ADR `docs/adr/0001-acp-sebagai-jalur-utama.md:13`).
- **AC-5.2** IF jalur ACP gagal dimulai dan preset yang sama memuat field CLI,
  THEN gateway shall jatuh ke driver CLI (FR-DRV-07 `docs/frd.md:123`;
  degradasi `AGENTS.md:20`).
- **AC-5.3** IF tidak ada jalur yang tersedia, THEN gateway shall menjawab
  dengan error yang menyebut agent, apa yang gagal, dan langkah berikutnya
  (FR-DRV-07).
- **AC-5.4** WHERE `workspaces[].driver` diisi (`docs/troubleshooting.md:45-49`
  — satu-satunya tempat bentuk paksa itu tertulis; field-nya `driver:`),
  pemilihan shall memakai jalur itu tanpa mencoba jalur lain.
- **AC-5.5** WHERE `workspaces[].driver` absen, pemilihan otomatis AC-5.1
  sampai AC-5.3 shall berlaku.

### AC-6 · Multi-workspace dan routing `@slug`

- **AC-6.1** Config shall menerima daftar `workspaces[]` `{slug, path, driver?,
  agent?}` secara aditif dengan `version` tetap `1` (`src/config.ts:12`;
  bentuk slug dan path mengikuti `docs/erd.md:54-64`).
- **AC-6.2** WHEN config hanya berisi `workspace` tunggal
  (`src/config.ts:15-18`), loader shall mengangkatnya menjadi daftar satu
  elemen dengan `name` sebagai slug, tanpa menulis ulang berkas.
- **AC-6.3** WHEN store dibuka pada database v0.3, ia shall menambah kolom
  `workspace` dan `agent` (TEXT NOT NULL DEFAULT '') ke `sessions` lewat ALTER
  yang dijaga `PRAGMA table_info` (skema hari ini tanpa keduanya
  `src/store/db.ts:52-63`; mekanisme migrasi bernomor yang dijanjikan
  `docs/techstack.md:25` belum ada).
- **AC-6.4** WHEN pesan berawalan `@<slug>` terdaftar tiba di luar topic sesi,
  gateway shall merutekan pesan itu ke workspace tersebut (FR-SESS-02
  `docs/frd.md:70`).
- **AC-6.5** WHEN routing `@<slug>` berhasil, gateway shall menyimpan slug itu
  sebagai default lengket chat pada meta key `ws.last.<chatId>`
  (`store.meta`/`setMeta`, `src/store/db.ts:224-238`; tanpa tabel baru).
- **AC-6.6** IF `@<slug>` tidak terdaftar, THEN gateway shall menjawab daftar
  slug yang ada dan tidak membuat sesi.
- **AC-6.7** WHERE pesan tanpa `@slug` dan default lengket ada, gateway shall
  memakai default lengket itu (`docs/session-model.md:97`).
- **AC-6.8** WHERE default lengket belum ada dan workspace terdaftar hanya
  satu, gateway shall memakainya tanpa bertanya.
- **AC-6.9** WHERE default lengket belum ada dan workspace lebih dari satu,
  gateway shall bertanya dengan tombol pilihan workspace
  (`docs/session-model.md:97`).
- **AC-6.10** Pesan di dalam topic sesi shall tetap berjalan pada workspace
  sesi itu; `@slug` di dalamnya tidak memindahkan sesi
  (`docs/session-model.md:98`).
- **AC-6.11** Setiap pembacaan workspace di gateway — header, cwd driver,
  jendela trust dan grant, scope memori, pengumuman start — shall berasal dari
  workspace sesi atau chat yang bersangkutan, bukan dari `config.workspace`
  global (sebelas pembacaan hari ini:
  `src/core/gateway.ts:150,388,420,532,572,735,922,932,971,992,1186`; scope
  memori `:571-573` datang dari pekerjaan memori v0.3, setelah brief riset
  fase ini disusun).

### AC-7 · Antrean per workspace

- **AC-7.1** Gateway shall menjalankan paling banyak satu run aktif per
  workspace (FR-SESS-04 `docs/frd.md:72`; hari ini satu rantai promise dan
  satu slot aktif global, `src/core/gateway.ts:80-83`).
- **AC-7.2** WHEN pesan tiba saat run aktif di workspace yang sama, gateway
  shall membalas ack antrean bernomor "diantrekan (#n)"
  (`docs/session-model.md:100`; string `queue.queued` hari ini tanpa nomor,
  `src/i18n.ts:5` dan `:126`).
- **AC-7.3** WHEN run aktif hanya ada di workspace lain, pesan untuk workspace
  yang bebas shall langsung berjalan tanpa mengantre.
- **AC-7.4** WHEN `/stop` dikirim, gateway shall membatalkan run milik
  workspace chat atau topic pengirimnya saja (hari ini `/stop` menghentikan
  slot global, `src/core/gateway.ts:1104-1131`).
- **AC-7.5** WHEN gateway shutdown, ia shall membatalkan setiap run aktif di
  semua workspace (`stopNow`, `src/core/gateway.ts:1175-1194`).
- **AC-7.6** WHILE batas 20 pesan per 60 detik per pengirim terlampaui
  (`src/core/gateway.ts:49-50`), gateway shall tetap menahan pesan pengirim itu
  lintas workspace.

### AC-8 · `/switch` dan `/ws`

- **AC-8.1** WHEN `/switch <id>` dengan id preset yang dimuat dikirim di topic
  sesi, gateway shall menulis agent itu pada sesi tersebut dan mengosongkan
  `agentSessionId`-nya (argumen = id preset, `docs/api.md:32`; scope
  `docs/ui-ux.md:72`).
- **AC-8.2** IF argumen `/switch` bukan id preset yang dimuat, THEN gateway
  shall menjawab daftar id preset yang tersedia.
- **AC-8.3** `/switch` dan `/mode` shall tidak memuat satu pun nama mode milik
  agent yang dikeraskan — id mode menunggu `configOptions` dari `session/new`
  dan `config_option_update` (`docs/ui-ux.md:79-81`).
- **AC-8.4** WHEN `/ws` dikirim dari topic mana pun, gateway shall menjawab
  daftar slug workspace di General (`docs/session-model.md:101`).

### AC-9 · Discovery, `init`, `doctor`

- **AC-9.1** WHEN discovery berjalan, ia shall memindai PATH untuk `claude`,
  `codex`, `gemini`, `cline`, `cursor-agent`, `goose`, `amp` (FR-SETUP-02
  `docs/frd.md:20`).
- **AC-9.2** (Dicabut 8 Agustus 2026, tinjauan pra-tutup: metadata registry
  yang dibaca tidak ditampilkan di mana pun, jadi pembacaannya adalah kode
  mati berharga satu fetch per first run. Pembacaan ACP Registry menyusul
  bersama baris doctor yang menampilkannya; `docs/design.md:151` diamendemen
  pada langkah rilis.)
- **AC-9.3** (Dicabut bersama AC-9.2 — tanpa pembacaan registry tidak ada
  kegagalan registry untuk didegradasi.)
- **AC-9.4** WHERE cache discovery berumur di bawah 24 jam
  (`docs/design.md:152`), pemanggil selain `doctor` shall memakai cache.
- **AC-9.5** WHERE cache berumur 24 jam atau lebih, atau belum pernah ada,
  pemanggil shall menjalankan discovery ulang dan memperbarui cache.
- **AC-9.6** WHEN `caraka doctor` dijalankan, discovery shall refresh paksa
  mengabaikan umur cache (`docs/design.md:152`).
- **AC-9.7** IF `caraka init` tidak menemukan satu pun agent, THEN ia shall
  berhenti dengan pesan "Tidak ada coding agent yang ditemukan" beserta langkah
  pemasangan (`docs/troubleshooting.md:37-38`; key i18n baru di kedua katalog
  `src/i18n.ts`).
- **AC-9.8** WHERE minimal satu agent ditemukan, `caraka init` shall berlanjut
  tanpa mensyaratkan Claude (persyaratan keras hari ini `src/cli.ts:135-136`).
- **AC-9.9** WHEN `caraka doctor` dijalankan, ia shall menampilkan satu baris
  per agent yang ditemukan beserta versi terdeteksinya (baris Claude yang
  dikeraskan hari ini `src/cli.ts:237-242`).
- **AC-9.10** WHERE `claude` termasuk yang ditemukan, `doctor` shall tetap
  menampilkan status login-nya (probe `src/cli.ts:27-35`).
- **AC-9.11** WHERE `claude` tidak ditemukan, baris login Claude shall absen
  dan tidak memerahkan hasil.

### AC-10 · CI

- **AC-10.1** WHEN push atau pull request tiba, workflow shall menjalankan
  `npm run lint`, `npm run typecheck`, `npm test`, dan `npm run e2e`
  (workflow pertama repositori; `.github/workflows/` belum ada).
- **AC-10.2** Matriks smoke shall memuat satu job per berkas di
  `presets/agents/` (`docs/roadmap.md:100`; `docs/techstack.md:112`).
- **AC-10.3** WHERE binari preset ada di runner, job smoke shall menjalankan
  spawn → prompt sederhana → assert balasan (`docs/techstack.md:112`; pola
  `scripts/smoke-claude.mjs`).
- **AC-10.4** WHERE binari preset absen di runner, job shall berakhir sebagai
  skip yang tercatat di ringkasan, bukan sebagai sukses.
- **AC-10.5** Test parser terhadap fixture `test/fixtures/` shall berjalan di
  gerbang unit tanpa membutuhkan satu pun binari agent.

## Dokumen yang diamendemen bersama fase ini

| Dokumen | Perubahan |
|---|---|
| `docs/api.md:30-47` | blok `acp:` (K1); field tanpa pembaca ditandai rencana, bukan skema (K2) |
| `docs/design.md:151` | pembacaan ACP Registry ditunda; discovery = pindai PATH + cache (AC-9.2 dicabut) |
| `docs/api.md:177-193`, `docs/design.md:93-118` | bentuk interface dan tipe update mengikuti permukaan nyata (K3) |
| `docs/security.md:249-256` | baris "run bersamaan" berubah status: dibangun fase ini |
| `docs/ui-ux.md:71-74` | `/ws`, `/switch` berubah status: terpasang |
| `docs/erd.md` | catatan deviasi: penegakan run-per-workspace level aplikasi |
| `docs/roadmap.md:96-102` | centang butir Fase 4 + catatan DoD manusia pasca-rilis |
| `CHANGELOG.md` | entri 0.4.0 |
