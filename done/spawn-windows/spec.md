# Spec — spawn-windows: satu `spawn` tanpa listener mematikan `caraka start`

**Status:** siap dikerjakan · **Tanggal:** 13 Agustus 2026

## Latar

Isu #5 melaporkan `npx caraka start` mati di Windows native saat men-spawn
`claude-agent-acp`, dengan errno `-4058`. Ada dua cacat bertumpuk di bawah
laporan itu, dan yang pertama tidak berhubungan dengan Windows.

`src/drivers/claude-acp.ts:60` adalah satu-satunya `spawn` di seluruh `src/`
tanpa listener `"error"`. Node menunda UV_ENOENT, UV_EACCES, UV_EAGAIN,
UV_EMFILE, dan UV_ENFILE ke `process.nextTick` sebagai event `"error"`, dan
event `"error"` pada EventEmitter yang tak punya satu pun listener dilempar,
dicetak, lalu mengakhiri proses. Adapter ACP mana pun yang gagal di-spawn, di
sistem operasi mana pun, karena itu mematikan `caraka start` sebelum penurunan
derajat di `src/cli.ts:95-102` sempat berjalan. Janji `AGENTS.md` bahwa "ACP
absent falls back to the CLI driver" tidak bisa dicapai lewat jalur ini.
`src/core/gateway.ts:281` memulai driver default saat start-up, jadi matinya
terjadi sesudah semua channel hidup, dan yang dilihat pemilik adalah crash
tanpa satu baris keterangan.

Cacat kedua yang memicunya di Windows: `src/drivers/preset.ts:84-92` memakai
`existsSync` sebagai wakil dari "bisa di-spawn". npm menulis tiga berkas per bin
di Windows lewat `cmd-shim` — `.ps1`, `.cmd`, dan satu skrip `#!/bin/sh` yang
namanya persis nama bin-nya. libuv hanya menambahkan `.com` dan `.exe`, dan
mencoba nama apa adanya hanya bila nama itu sudah memuat titik, jadi
`claude-agent-acp` dicari sebagai dua berkas yang tidak ada dan hasilnya
UV_ENOENT, `-4058` di cabang `_WIN32`. Yang dikembalikan `resolveCommand` adalah
skrip `sh` itu: path yang ada di disk dan tidak bisa dijalankan.

Komentar `ponytail:` di `preset.ts:82-83` menyuruh preset Windows menyebut shim
`.cmd`-nya sendiri. Jalan itu tertutup sejak rilis keamanan April 2024: `.bat`
dan `.cmd` tanpa `shell` ditolak dengan UV_EINVAL, perbaikan CVE-2024-27980, dan
penolakan itu ada di C++ sehingga berlaku untuk `spawn` maupun `spawnSync`.
Komentar itu ikut dihapus bersama cacatnya, karena jalan naik yang
dijanjikannya mustahil.

Turun ke route CLI bukan penurunan derajat yang bisa diterima di Windows.
`CliDriver.asksPermission` bernilai `false` (`src/drivers/cli.ts:95`), dan
`src/core/gateway.ts:850` menolak menjalankan run `read-only` di route seperti
itu dengan `policy.noSeam`; setiap ruangan default-nya `read-only`
(`src/core/security.ts:133`). Windows butuh route ACP-nya benar-benar jalan,
bukan gagal dengan sopan. Untuk adapter terkunci itu bisa dipenuhi tanpa satu
pun kode Windows: `src/drivers/claude-acp.ts:53-59` sudah menyelesaikannya
sebagai modul lewat `import.meta.resolve` dan menjalankannya dengan Node yang
sedang berjalan. Yang menyeretnya ke shim justru `src/cli.ts:63-74`, yang
mencari nama itu lewat `resolveCommand` — `node_modules/.bin` dulu, `PATH`
sesudahnya — lalu menyerahkan hasilnya ke `realpathSync` untuk sampai ke berkas
`.js` di belakangnya. Jalan itu hanya ada bila `node_modules/.bin`
berisi symlink, seperti di mesin ini
(`.bin/claude-agent-acp` → `../@agentclientprotocol/claude-agent-acp/dist/index.js`);
di Windows `cmd-shim` menulis berkas sungguhan, jadi `realpathSync` menjawab
path yang sama dan tes `.js`-nya gagal.

Cacat kedua juga membuat `caraka doctor` berbohong ke dua arah, karena
`src/discovery.ts:72-83` mengulang jalan `PATH` yang sama dengan pertanyaan yang
sama. Agent yang dipasang lewat npm memberi baris hijau tanpa versi, karena
`spawnSync`-nya gagal ke `result.error` sementara `src/discovery.ts:94` hanya
memeriksa `result.status`. Agent yang dipasang sebagai `claude.exe` tidak memberi
baris apa pun, sehingga doctor bisa mencetak `agents.none` dan menyuruh memasang
apa yang sudah terpasang.

Asersi libuv yang ikut dilaporkan di isu itu berada di `uv_async_send`, di bawah
invarian "never call uv_async_send to a closing or closed handle", jadi ia hanya
menyala di jalur pembatalan. Ia hilir dari cacat pertama dan tetap menjadi bug
Node, bukan bug di sini.

### Angka dan sumbernya

| Angka | Sumber |
|---|---|
| `-4058` = UV_ENOENT di Windows | `UV__ENOENT` di `libuv/include/uv/errno.h`, cabang yang berlaku saat `_WIN32` |
| hanya `.com` dan `.exe` yang dicari | `path_search_walk_ext`, `libuv/src/win/process.c` |
| tiga berkas per bin di Windows | `npm/cmd-shim` `lib/index.js` |
| `.cmd` tanpa `shell` ditolak UV_EINVAL | `IsWindowsBatchFile` di `node/src/util-inl.h`, dipanggil `src/process_wrap.cc` dan `src/spawn_sync.cc` (v24) |
| ENOENT dilaporkan asinkron, EINVAL sinkron | daftar lima errno di `node/lib/internal/child_process.js:421-425` |
| 8.498 baris `src/` | `find src -name '*.ts' \| xargs wc -l \| tail -1`, 13 Agustus 2026 |
| perkiraan bersih +25 sampai +35 baris, 13 di antaranya komentar | dihitung per berkas dari bentuk yang ditulis di plan (komentar 4 + 6 + 3), termasuk teks i18n yang membungkus jadi baris baru; diukur ulang di gerbang |

## Ruang lingkup

`src/drivers/claude-acp.ts` (listener `"error"`, spec default), `src/drivers/preset.ts`
(`resolveCommand` beserta penjaga win32-nya), `src/cli.ts` (`buildDriver` berhenti
memakai `realpathSync`), `src/discovery.ts` (`scanPath` memakai resolver yang
sama), `src/i18n.ts` (dua entri diubah teksnya di kedua katalog),
`test/unit.test.ts`, `scripts/smoke-cli.mjs`, `docs/api.md`,
`docs/integrasi-ekosistem.md` beserta pasangan Inggrisnya,
`docs/troubleshooting.md` beserta pasangan Inggrisnya, dan angka anggaran di
`AGENTS.md`.

Lima pekerjaan lain menunggu di `spec/`. Ini satu-satunya yang mematikan proses,
dan satu-satunya yang bisa membuat gerbang verifikasi tidak bisa dijalankan di
checkout Windows.

## Yang tidak dikerjakan

- **Tidak menambahkan `shell: true` di mana pun, dan penolakan itu dijaga
  test.** Dengan `shell` aktif, Node menyetel `windowsVerbatimArguments` sendiri
  untuk CMD dan escaping per-argumennya hilang (DEP0190), sementara
  `src/drivers/cli.ts:134` memasukkan isi pesan chat sebagai satu elemen argv.
  Pesan berisi `& calc` akan dijalankan sebagai perintah, dan `docs/security.md`
  T3 mencatat teks itu bisa datang tidak langsung dari README yang dibaca agent.
  Itu jalan eksekusi perintah dari jarak jauh, sekaligus melawan premis aturan
  keras 2 bahwa teks tidak pernah memberi wewenang apa pun.
- **Tidak menambahkan pemindaian PATHEXT.** PATHEXT milik cmd.exe, bukan milik
  pembuatan proses; `CreateProcessW` tidak pernah membacanya. Dari daftar
  default-nya hanya `.com` dan `.exe` yang bisa di-spawn tanpa shell, dan
  keduanya sudah dicari libuv.
- **Agent yang dipasang lewat `npm -g` di Windows native tetap tidak bisa
  dijalankan di route CLI.** Yang tertulis di `PATH` untuk agent seperti itu
  hanya ketiga shim, dan tidak ada cara yang aman menjalankan yang `.cmd`:
  komentar Node sendiri mengatakan argumen batch "sometimes cannot be
  unambiguously escaped", dan prompt adalah salah satu argumen itu. Yang
  dilakukan pekerjaan ini adalah membuat keadaan itu terbaca — `agents.none`
  menyebut jalan keluarnya (pasang `.exe`-nya, atau jalankan lewat WSL2, jalan
  Windows yang disebut NFR-06 di `docs/frd.md`) — bukan membuatnya jalan.
- **`src/drivers/cli.ts` tidak disentuh.** Ia men-spawn nama telanjang, dan
  untuk nama telanjang libuv memang menambahkan `.exe` sendiri, jadi agent yang
  terpasang sebagai `claude.exe` sudah jalan di route itu. Ia juga sudah punya
  listener `"error"` di `src/drivers/cli.ts:154`.
- **Doctor tidak mendapat baris untuk adapter ACP.** Yang diperbaiki adalah
  baris agent yang sudah ada supaya berhenti hijau untuk path yang tidak bisa
  dijalankan. Baris baru untuk adapter adalah fitur tersendiri.
- **Bit executable tidak diperiksa.** Berkas biasa yang tidak dapat dijalankan
  masih ikut ditemukan, dan gagal dengan EACCES lewat listener yang justru
  dipasang pekerjaan ini.
- **Asersi `uv_async_send` tidak dikejar.** Ia invarian internal libuv di jalur
  penutupan handle dan dilaporkan di `nodejs/node#64322`; userland tidak bisa
  memanggil `uv_async_send`. Satu-satunya tuas di sini adalah tidak masuk ke
  jalur abort, dan itulah yang dikerjakan cacat pertama.
- **Tidak ada penghapusan di luar jejak pekerjaan ini.** Ada penyederhanaan lain
  yang tersedia di `src/channels/` dan `src/core/`, dan menaruhnya di sini
  membuat satu PR yang memperbaiki bug sekaligus me-refactor, yang menurut
  `standards/ears.md` §5 adalah dua PR.
- **Tidak ada `npm publish`, tidak ada tag, tidak ada entri `CHANGELOG.md`.**
  Entri masuk bersama rilis yang membawanya, dan rilis butuh persetujuan
  pemilik.
- **Tidak ada pembuktian di mesin Windows sungguhan.** Gerbang berjalan di
  Linux; cabang `win32` dibuktikan lewat parameter platform.

## Acceptance criteria

### AC-1 · Spawn yang gagal tidak lagi mematikan proses

- **AC-1.1** IF `spawn` melaporkan kegagalan lewat event `"error"`, THEN
  `ClaudeAcp.start()` shall menolak dengan pesan `acp.start`.
- **AC-1.2** IF `spawn` melaporkan kegagalan lewat event `"error"`, THEN proses
  shall tetap hidup tanpa uncaught exception.
- **AC-1.3** WHERE sebuah preset membawa blok `acp:` dan perintah CLI, IF
  adapter ACP-nya gagal di-spawn, THEN `startDriver` shall mengembalikan
  `CliDriver`.
- **AC-1.4** WHERE route dipaksa `acp`, IF adapter gagal di-spawn, THEN galatnya
  shall diteruskan ke pemanggil tanpa route lain dicoba.
- **AC-1.5** WHEN adapter berhasil di-spawn lalu gagal menjawab `initialize`,
  `ClaudeAcp.start()` shall tetap menolak dengan pesan `acp.start`.

### AC-2 · Resolusi perintah yang hanya menerima yang bisa di-spawn

- **AC-2.1** WHERE platform adalah `win32`, `resolveCommand` shall hanya
  mengembalikan path yang berakhiran `.exe` atau `.com`, tanpa membedakan
  besar-kecil huruf.
- **AC-2.2** WHERE platform adalah `win32`, WHEN sebuah direktori di `PATH`
  memuat `foo`, `foo.cmd`, dan `foo.ps1` tanpa `foo.exe`, `resolveCommand("foo")`
  shall menjawab `null`.
- **AC-2.3** WHERE platform adalah `win32`, WHEN direktori yang sama juga memuat
  `foo.exe`, `resolveCommand("foo")` shall menjawab path `foo.exe` itu.
- **AC-2.4** WHERE platform bukan `win32`, WHEN sebuah direktori di `PATH`
  memuat `foo` tanpa ekstensi, `resolveCommand("foo")` shall menjawab path itu.
- **AC-2.5** IF kandidat yang ditemukan adalah direktori, THEN `resolveCommand`
  shall tidak mengembalikannya.
- **AC-2.6** Cabang `win32` shall bisa dibuktikan di mesin non-Windows tanpa
  mengubah `process.platform` atau `process.env.PATH` milik proses test.

### AC-3 · Adapter terkunci diselesaikan sebagai modul

- **AC-3.1** WHEN sebuah preset menyebut adapter terkunci `claude-agent-acp` dan
  tidak ada route yang dipaksa, `buildDriver` shall membangun `ClaudeAcp` yang
  menjalankan `process.execPath` dengan berkas entri modul adapter itu sebagai
  argumen pertama.
- **AC-3.2** Resolusi adapter terkunci shall tidak membaca `node_modules/.bin`
  maupun symlink.
- **AC-3.3** IF adapter terkunci tidak bisa diselesaikan sebagai modul, THEN
  `resolveCommand` shall menjawab `null` dan bukan melempar galat modul.
- **AC-3.4** WHEN sebuah preset menyebut perintah ACP selain adapter terkunci,
  `resolveCommand` shall tetap mencarinya di `PATH`.
- **AC-3.5** `preset.acp.args` dan `preset.acp.env` shall tetap ikut ke spawn
  adapter terkunci.
- **AC-3.6** `scripts/smoke-cli.mjs` shall membangun driver-nya lewat seam yang
  sama dengan produksi, sehingga yang di-spawn smoke sama dengan yang di-spawn
  `caraka start`.

### AC-4 · Penemuan agent memakai jawaban yang sama

- **AC-4.1** WHEN `discoverAgents` dan `resolveCommand` diberi `PATH` dan
  platform yang sama, jawaban keduanya untuk setiap nama di `knownBinaries`
  shall sama.
- **AC-4.2** WHERE platform adalah `win32`, WHEN `PATH` hanya memuat ketiga shim
  npm untuk `claude`, `discoverAgents` shall tidak melaporkan `claude`.
- **AC-4.3** WHERE platform adalah `win32`, WHEN `PATH` memuat `claude.exe`,
  `discoverAgents` shall melaporkan `claude` dengan path `.exe` itu.
- **AC-4.4** WHEN sebuah entri `PATH` memuat direktori yang bernama sama dengan
  salah satu `knownBinaries`, `discoverAgents` shall tidak melaporkannya.

### AC-5 · Jalur shell ditolak secara mekanis

- **AC-5.1** Tidak satu pun berkas di `src/` shall memuat opsi `shell` pada
  pemanggilan proses.
- **AC-5.2** WHEN gerbang unit dijalankan, sebuah test shall gagal bila salah
  satu berkas `src/**/*.ts` memuat opsi itu.

### AC-6 · Pesan yang dibaca operator

- **AC-6.1** `acp.start` shall menyebut kemungkinan perintah adapter gagal
  dijalankan, di kedua katalog.
- **AC-6.2** `agents.none` shall menyebut agent yang dipasang lewat `npm -g` di
  Windows beserta langkah yang mengatasinya, di kedua katalog.
- **AC-6.3** WHEN gerbang unit dijalankan, sebuah asersi tulisan tangan shall
  gagal bila salah satu dari kedua pesan itu kehilangan isi yang AC-6.1 dan
  AC-6.2 minta, di salah satu katalog.
- **AC-6.4** Pekerjaan ini shall tidak menambahkan `MessageKey` baru.

### AC-7 · Anggaran kompleksitas dan batas pembuktian

- **AC-7.1** WHEN pekerjaan ditutup, plan shall memuat keluaran
  `find src -name '*.ts' | xargs wc -l | tail -1` beserta selisihnya dari 8.498.
- **AC-7.2** IF angka itu di atas plafon ~8.000 di `AGENTS.md`, THEN plan dan
  `AGENTS.md` shall menyatakannya terlewati beserta apa yang membelinya.
- **AC-7.3** Keempat penghapusan yang menyertai pekerjaan ini shall benar-benar
  hilang dari `src/`: cabang `node_modules/.bin` beserta konstantanya,
  jalan `PATH` duplikat di `discovery.ts`, `realpathSync` di `cli.ts`, dan
  komentar `ponytail:` yang jalan naiknya mustahil.
- **AC-7.4** WHERE gerbang tidak bisa dijalankan di Windows sungguhan, plan
  shall menyebut batas itu beserta apa yang karenanya belum terbukti.
- **AC-7.5** Plafon di paragraf anggaran `AGENTS.md` shall tetap ~8.000 sesudah
  pekerjaan ini.

### AC-8 · Dokumen yang jadi salah karena perubahan ini

- **AC-8.1** `docs/api.md`, `docs/integrasi-ekosistem.md`, dan
  `docs/integrasi-ekosistem.en.md` shall berhenti menyatakan bahwa
  `node_modules/.bin` ikut dicari.
- **AC-8.2** `docs/troubleshooting.md` beserta pasangan Inggrisnya shall memuat
  satu entri yang menjelaskan kenapa agent yang dipasang lewat `npm -g` tidak
  bisa dijalankan di Windows native.
