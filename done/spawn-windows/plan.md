# Plan — spawn-windows

**Spec:** `spec/spawn-windows.md` · **Tanggal:** 13 Agustus 2026

## Langkah

1. **Reproduksi cacat pertama di Linux, sebelum menyentuh apa pun.** Satu
   berkas coret di luar repositori: `new ClaudeAcp(translator(), { command:
   "/nonexistent/caraka-adapter", args: [], env: {} }).start()` di dalam
   `try/catch`. Yang harus terlihat adalah proses mati dengan `Error: spawn …
   ENOENT` meski `catch`-nya ada, karena galatnya datang di tick berikutnya
   sebagai event, bukan sebagai lemparan. Kalau ternyata tertangkap `catch`,
   pembacaan spec salah dan spec diperbaiki dulu.

2. **`src/drivers/claude-acp.ts` — listener yang membuat `start()` menolak.**
   Hasil `spawn` disimpan ke variabel lokal dulu supaya listener terpasang di
   tick yang sama, lalu satu promise yang menolak dari event itu, diadu dengan
   `initialize` lewat `Promise.race`. `try/catch` di `:85-88` sudah mengubah
   apa pun yang menolak menjadi `t("acp.start")` dan sudah memanggil `stop()`,
   jadi tidak ada penanganan galat baru yang ditulis. Komentar empat baris
   mencatat kenapa listener itu ada: event `"error"` tanpa listener dilempar dan
   mengakhiri proses, dan `spawn` menunda ENOENT serta EACCES ke sana. Karena
   `Promise.race` memasang handler ke kedua promise, `"error"` yang datang
   sesudah `start()` selesai tetap punya pembaca dan tidak menjadi unhandled
   rejection.

3. **`src/drivers/claude-acp.ts` — spec default menyusut.** Blok `:53-59`
   menjadi satu pemanggilan `resolveCommand(lockedAdapter)`; hasil `null`
   melempar `t("acp.start")` di tempat, karena adapter yang bukan di disk adalah
   adapter yang tidak ada. `fileURLToPath` dan `import.meta.resolve` pindah ke
   `preset.ts` bersama langkah 4, sehingga resolusi adapter terkunci hidup di
   satu tempat. Keempat pemanggilnya mendapat jawaban yang sama: `buildDriver`,
   spec default ini, `scanPath`, dan smoke.

4. **`src/drivers/preset.ts` — `resolveCommand` menjawab "bisa di-spawn", bukan
   "ada".** Konstanta `packageBin` (`:49`), cabang `node_modules/.bin`
   (`:86-87`), dan komentar `ponytail:` (`:82-83`) dihapus. Yang masuk:
   - `lockedAdapter = "claude-agent-acp"`, nama yang `config.ts:128` sudah
     mengunci, di-resolve sebagai modul. Pemanggilan `resolve` itu dibungkus
     `try/catch` di dalam `resolveCommand`, bukan di dalam resolvernya, jadi
     dependensi yang tidak di disk dan resolver yang dititipkan test lalu
     melempar sama-sama menjawab `null`.
   - `isFile`, satu `statSync(candidate, { throwIfNoEntry: false })?.isFile()`,
     karena `existsSync` juga menjawab ya untuk direktori.
   - `spawnable(base, platform)`: di `win32`, kandidatnya `base` apa adanya bila
     sudah berakhiran `.exe`/`.com` (tanpa peduli besar-kecil huruf), dan
     `base.exe` lalu `base.com` bila belum; di platform lain kandidatnya hanya
     `base`. Komentar enam baris di atasnya mencatat empat fakta yang masing-
     masing sudah pernah membuat perbaikan yang salah ditulis: libuv hanya
     menambah `.com` dan `.exe`, Node menolak `.cmd` dengan EINVAL karena
     CVE-2024-27980, npm menulis tiga shim per bin, dan hasilnya `-4058`.
     Baris terakhirnya menyebut bahwa `shell` tidak boleh ditambahkan di sini
     dan bahwa ada test yang menyapu `src/` untuk opsi itu.
   - Tiga seam dengan default, dalam satu parameter objek mengikuti bentuk
     `discoverAgents`: `{ platform = process.platform, path = process.env.PATH ??
     "", resolve = resolveModule } = {}`. Ketiganya punya pembaca: `platform`
     dan `path` dibaca test win32 dan `scanPath`, `resolve` dibaca test yang
     membuktikan cabang dependensi hilang. Tanpa seam ketiga itu `catch`-nya
     tidak bisa dibuktikan sama sekali.

5. **`src/cli.ts` — `buildDriver` berhenti membatalkan hasilnya sendiri.**
   `realpathSync` hilang dari pemanggilan dan dari `import` di `:4`; tes
   `/\.[mc]?js$/` sekarang dijalankan langsung atas jawaban `resolveCommand`,
   yang untuk adapter terkunci adalah `dist/index.js` dan untuk empat preset
   lain adalah biner. Komentarnya kehilangan kata "symlink" dan menyisakan
   alasan yang masih benar: entri JS dijalankan Node yang sedang berjalan, yang
   juga tetap bekerja saat `PATH` tidak punya `node` (systemd).

6. **`src/discovery.ts` — satu jalan `PATH`, bukan dua.** Loop `PATH` di dalam
   `scanPath` (`:75-80`, enam baris) diganti satu pemanggilan
   `resolveCommand(binary, { platform, path: pathValue })`; `existsSync` dan
   `delimiter` keluar dari `import`; `discoverAgents` mendapat opsi
   `platform?` yang diteruskan ke
   `scanPath`. **Dikoreksi saat dikerjakan:** parameter `scanPath` tidak bisa
   ditulis `platform?: string`. `tsconfig.json` menyetel
   `exactOptionalPropertyTypes: true`, jadi `{ platform: options.platform }`
   yang bertipe `string | undefined` ditolak oleh `platform?: string` milik
   `resolveCommand` (TS2379). Yang dipakai adalah parameter berdefault,
   `platform: string = process.platform`, sehingga yang sampai ke
   `resolveCommand` selalu `string` dan `undefined` dari pemanggil memicu
   default-nya. Komentar tiga baris mencatat kenapa: doctor mencetak baris hijau
   untuk path yang tidak bisa dijalankan karena jalan ini menanyakan pertanyaan
   yang salah, satu berkas dari jalan driver yang menanyakan pertanyaan salah
   yang sama. `probeVersion` tidak disentuh — sesudah penjaga ini, path yang
   sampai ke sana sudah berupa berkas dengan ekstensi yang bisa di-spawn.

7. **`src/i18n.ts` — dua entri berubah teksnya, di kedua katalog, tanpa kunci
   baru.**
   - `acp.start` (`:136` / `:421`) berhenti menyebut satu sebab. `en`: "The ACP
     adapter did not start: its command failed to run, or the agent did not
     answer. Run `claude auth login` if it is signed out, then start Caraka
     again." `id`: "Adapter ACP tidak dapat dimulai: perintahnya gagal
     dijalankan, atau agent-nya tidak menjawab. Jalankan `claude auth login`
     kalau belum masuk, lalu jalankan Caraka lagi."
   - `agents.none` (`:147` / `:433`) berhenti menyebut dua sebab untuk keadaan
     yang punya tiga, lalu menyebut jalan keluar Windows. `en`: "No coding agent
     was found: none is installed, none is on PATH, or the one on PATH cannot be
     started from here. Install one (claude, codex, gemini, cline, cursor-agent,
     goose, amp), then run `caraka doctor` to confirm it is detected. On native
     Windows an agent installed with `npm -g` cannot be started this way: install
     its `.exe`, or run Caraka under WSL2." `id`: pasangannya, dengan pembuka
     "Tidak ada coding agent yang ditemukan:" dan penutup "Di Windows native,
     agent yang dipasang lewat `npm -g` tidak bisa dijalankan begini: pasang
     `.exe`-nya, atau jalankan Caraka lewat WSL2." Kedua pembuka dan kata
     `caraka doctor` dipertahankan karena test yang sudah ada mencocokkannya
     (`test/unit.test.ts:2220-2222`).

8. **`test/unit.test.ts` — delapan test, satu asersi lama diganti.**
   - Satu test untuk cacat pertama: `ClaudeAcp` dengan `command` absolut yang
     tidak ada → `assert.rejects(driver.start(), /ACP/)`. Test ini gagal hari ini
     dengan runner-nya ikut mati, dan itulah bentuk regresinya.
   - Satu test untuk penurunan derajat lewat jalur spawn: `mkdtemp` berisi
     satu berkas mode `0o644`, dipakai sebagai `acp.command` preset yang juga
     punya `command` CLI. `resolveCommand` menerimanya (ia berkas), `spawn`
     menolaknya dengan EACCES, dan `driverRegistry` harus menjawab `CliDriver`;
     dengan route dipaksa `acp`, ia harus menolak. Test `:2030` yang sudah ada
     (adapter mati saat `initialize`) tetap apa adanya sebagai pasangannya.
   - Satu test `resolveCommand` atas `mkdtemp` berisi `foo`, `foo.cmd`,
     `foo.ps1`, lalu `foo.exe`, ditambah pasangan `baz.CMD` dan `baz.EXE` untuk
     cabang tanpa peduli besar-kecil huruf, plus subdirektori bernama `bar`,
     dijalankan dengan `platform: "win32"` dan dengan `platform: "linux"`.
   - Satu test bahwa `resolveCommand(lockedAdapter)` menjawab berkas yang ada,
     berakhiran `dist/index.js`, di bawah `node_modules/@agentclientprotocol/`,
     dan bahwa dengan `resolve` yang melempar ia menjawab `null`. Ini yang
     mengganti asersi `:1987`, yang hari ini menegaskan kebenaran path
     `node_modules/.bin` — path yang di Windows justru tidak bisa dijalankan.
   - Satu test bahwa spec spawn preset `claude-code` yang dibangun `buildDriver`
     memakai `process.execPath` dengan entri modul itu sebagai argumen pertama,
     dan bahwa `args` serta `env` dari YAML ikut. Spec itu dibaca lewat cast
     `as unknown as`, bentuk yang sudah dipakai enam kali di berkas test ini
     (`:441`, `:452`, `:461`, `:558`, `:568`, `:2474`).
   - Satu test `discoverAgents` atas `mkdtemp` yang sama: ketiga shim `claude`
     dengan `platform: "win32"` tidak memberi baris, `claude.exe` memberi satu
     baris dengan path `.exe`, subdirektori bernama `codex` tidak memberi baris,
     dan untuk setiap nama `knownBinaries` jawabannya sama dengan jawaban
     `resolveCommand` atas `PATH` itu. `cacheFile` diarahkan ke temp dan
     `refresh: true`, seperti test discovery yang sudah ada di `:2151`.
   - Satu sapuan `src/**/*.ts` untuk opsi `shell`, dalam bentuk sapuan
     `bypassPermissions` di `:966-992`. Yang dicocokkan adalah bentuk opsinya
     (`/\bshell\s*:/`), bukan katanya: komentar baru di `preset.ts` menyebut kata
     itu dalam prosa, jadi sapuan kata telanjang akan merah karena komentarnya
     sendiri. Hari ini bentuk itu nol baris di `src/`, jadi sapuannya hijau sejak
     baris pertamanya ada.
   - Asersi kedua katalog untuk `acp.start` dan `agents.none`, dalam bentuk
     `:1341`. **Dikoreksi saat dikerjakan:** `:1341` ada di tengah test grant
     kebijakan, bukan asersi kedua katalog. Bentuk yang dimaksud ada di `:1370`,
     `the group pairing card says what a group will see, in both catalogs` — dua
     `assert.match` per katalog untuk yang berbeda antar bahasa, lalu satu loop
     `Object.values(catalogs)` untuk yang harus sama di keduanya. Itu yang
     diikuti.

9. **`scripts/smoke-cli.mjs` — pemanggil keempat berhenti buta.** Probe SKIP
   tetap `resolveCommand`; pembangunan driver-nya (`:56`) menjadi
   `buildDriver(preset, taken, translator(), (input) => String(input))`, jadi
   smoke men-spawn apa yang produksi men-spawn, termasuk indireksi Node yang
   `:56` hari ini lewati. `ClaudeAcp` dan `CliDriver` keluar dari `import`-nya.
   `scripts/smoke-claude.mjs` tidak disentuh: ia memakai cabang tanpa spec.

10. **Dokumen.** `docs/api.md` baris `acp` (`:44`) dan butir "Resolusi
    `command`" di bawah "Permintaan 2: bentuk spawn adapter ACP"
    (`docs/integrasi-ekosistem.md:47` dan pasangan Inggrisnya di baris yang
    sama) berhenti menyebut `node_modules/.bin` dan menyebut yang sekarang
    benar: adapter terkunci sebagai modul, perintah lain
    di `PATH`, dan di Windows hanya ekstensi yang bisa di-spawn. Satu entri baru
    di bagian "Coding agent" `docs/troubleshooting.md` beserta pasangannya:
    kenapa agent `npm -g` di Windows native tidak bisa dijalankan, dan dua jalan
    keluarnya.

11. **Gerbang dan anggaran.** `npm run verify` dari akar. Lalu
    `find src -name '*.ts' | xargs wc -l | tail -1` dan angkanya ditulis di
    bagian keluaran gerbang bersama selisihnya dari 8.498, dengan paragraf
    anggaran `AGENTS.md` diperbarui ke angka terukur dan alasan yang
    membelinya. Plafon ~8.000 tidak digeser.

## Pemetaan AC → pembuktian

| AC | Pembuktian |
|---|---|
| AC-1.1 | Unit: `ClaudeAcp` dengan `command` absolut yang tidak ada, `assert.rejects(start(), /ACP/)` |
| AC-1.2 | Test yang sama lolos hanya bila proses masih hidup untuk melaporkannya; sebelum perbaikan runner ikut mati, dan langkah 1 merekamnya |
| AC-1.3 | Unit: `driverRegistry` atas preset dengan `acp.command` = berkas mode `0o644` dan `command` CLI → `instanceof CliDriver` |
| AC-1.4 | Unit: preset yang sama dengan route dipaksa `acp` → `assert.rejects(…, /ACP/)` |
| AC-1.5 | Test `:2030` yang sudah ada (`node -e "process.exit(1)"`) tetap hijau tanpa diubah |
| AC-2.1 | Unit: `resolveCommand("baz.CMD", { platform: "win32", path: dir })` → `null`; `resolveCommand("baz.EXE", …)` di direktori yang sama → path `baz.EXE` itu |
| AC-2.2 | Unit: direktori berisi `foo`, `foo.cmd`, `foo.ps1` → `null` |
| AC-2.3 | Unit: `foo.exe` ditambahkan ke direktori yang sama → path `.exe` |
| AC-2.4 | Unit: direktori yang sama dengan `platform: "linux"` → path `foo` tanpa ekstensi |
| AC-2.5 | Unit: subdirektori `bar` di direktori itu → `resolveCommand("bar", …)` → `null` di kedua platform |
| AC-2.6 | Grep test yang sama: tidak ada penugasan ke `process.platform` atau `process.env.PATH` di dalamnya; ia lolos di runner Linux |
| AC-3.1 | Unit: spec spawn `buildDriver(presets.get("claude-code"), undefined, …)` dibaca lewat cast — `command === process.execPath`, `args[0]` cocok `/claude-agent-acp[\/\\]dist[\/\\]index\.js$/` dan `existsSync` |
| AC-3.2 | Grep: `realpathSync` dan `node_modules/.bin` tidak ada lagi di `src/`; `args[0]` test AC-3.1 memuat `node_modules/@agentclientprotocol/` |
| AC-3.3 | Unit: `resolveCommand(lockedAdapter, { resolve: () => { throw new Error("gone"); } })` → `null` |
| AC-3.4 | Test `:1981` yang sudah ada: `acp.command` = `process.execPath` tetap ACP, `no-such-command-caraka` jatuh ke CLI atau menolak |
| AC-3.5 | Unit: preset menyebut adapter terkunci dengan `args: ["--x"]` dan `env: { A: "1" }` → `args[1] === "--x"`, `env.A === "1"` |
| AC-3.6 | Baca diff `scripts/smoke-cli.mjs`, lalu `node scripts/smoke-cli.mjs claude-code` di mesin ini; keluarannya ditempel |
| AC-4.1 | Unit: untuk setiap nama `knownBinaries` atas `PATH` temp yang sama, `discoverAgents(...).agents` cocok dengan jawaban `resolveCommand` nama itu |
| AC-4.2 | Unit: temp berisi `claude`, `claude.cmd`, `claude.ps1`, `platform: "win32"` → tidak ada baris `claude` |
| AC-4.3 | Unit: `claude.exe` ditambahkan → satu baris `claude` dengan path `.exe` |
| AC-4.4 | Unit: subdirektori bernama `codex` → tidak dilaporkan |
| AC-5.1 | Sapuan `src/**/*.ts` di test unit atas pola `/\bshell\s*:/`; hari ini `grep -rnE '\bshell\s*:' src/` nol baris |
| AC-5.2 | Keluaran `npm test` memuat nama test sapuan itu |
| AC-6.1 | Asersi kedua katalog: `en` cocok `/failed to run/`, `id` cocok `/gagal dijalankan/` |
| AC-6.2 | Asersi kedua katalog: `en` cocok `/npm -g/` dan `/WSL2/`, `id` sama |
| AC-6.3 | Kedua asersi di atas ditulis di `test/unit.test.ts` dalam bentuk `:1341`; keluaran `npm test` memuat nama test-nya, dan menghapus salah satu pola dari katalog membuatnya merah |
| AC-6.4 | Baca diff `src/i18n.ts`: dua nilai berubah, tidak ada baris kunci baru; test kelengkapan katalog yang sudah ada tetap hijau |
| AC-7.1 | Keluaran `find src -name '*.ts' \| xargs wc -l \| tail -1` ditempel di bagian keluaran gerbang, dengan selisihnya dari 8.498 tertulis di baris sesudahnya |
| AC-7.2 | Angka itu dibandingkan dengan 8.000 di prosa yang sama; diff `AGENTS.md` menunjukkan angka terukur dan apa yang membelinya |
| AC-7.3 | `grep -rn "packageBin\|realpathSync\|no PATHEXT" src/` → nol baris; diff `src/discovery.ts` menunjukkan jalan `PATH`-nya hilang |
| AC-7.4 | Paragraf tertulis di bagian Risiko dan di keluaran gerbang, menyebut Windows tidak ada di gerbang dan apa yang karenanya belum terbukti |
| AC-7.5 | `grep -n "~8,000" AGENTS.md` sesudah pekerjaan: baris plafon yang sama dengan sebelum, dan diff paragraf anggaran hanya mengubah angka terukurnya |
| AC-8.1 | Diff `docs/api.md`, `docs/integrasi-ekosistem.md`, `docs/integrasi-ekosistem.en.md`; `grep -rn "node_modules/.bin" docs/` → dua baris, keduanya menyatakan bahwa berkas di sana **tidak** dipakai (dikoreksi dari "nol baris": lihat keluaran gerbang) |
| AC-8.2 | Diff `docs/troubleshooting.md` dan `docs/troubleshooting.en.md` |

## Risiko

Windows tidak ada di gerbang. Yang dibuktikan test adalah cabang `win32` lewat
parameter platform di mesin Linux: bahwa shim npm ditolak, bahwa `.exe`
diterima, dan bahwa `resolveCommand` mengembalikan hal yang sama dengan yang
dilaporkan `discoverAgents`. Yang tidak dibuktikan adalah bahwa `claude.exe`
sungguhan menjawab di mesin Windows sungguhan, dan bahwa adapter terkunci
dijalankan Node di sana tanpa keluhan baru. Aturannya sudah disalin dari
perilaku libuv apa adanya, dan lebih dari itu butuh mesin yang tidak ada di
sini. Isu #5 tetap dibuka sampai pelapornya mengonfirmasi.

Preset yang menyebut `claude-agent-acp` sekarang tidak akan pernah memakai
`claude-agent-acp` yang dipasang global di `PATH`, walau versinya lebih baru.
Itu disengaja: `config.ts:128-129` mengunci nama dan versi adapter, dan yang
dimaksud kunci itu adalah salinan yang dibawa paket ini. Yang hilang adalah cara
menimpanya tanpa menyunting `package.json`, dan tidak ada yang meminta cara itu.

`discovery.ts` sekarang mengimpor `drivers/preset.ts`. Arahnya aman: tidak ada
berkas di `src/core/` yang mengimpor keduanya, dan `preset.ts` hanya mengimpor
`i18n.ts`, jadi tidak ada lingkaran. Yang berubah adalah `discovery.ts` ikut
memuat parser preset saat doctor berjalan, dan itu sudah dimuat `cli.ts` di
proses yang sama.

Doctor bisa kehilangan baris di Linux untuk entri `PATH` yang sebenarnya bukan
berkas. Itu perbaikannya, bukan kerugiannya, tapi seseorang yang selama ini
melihat baris hijau untuk sebuah direktori akan melihatnya hilang tanpa
penjelasan. Kalau itu muncul di mesin ini saat gerbang dijalankan, kasusnya
ditulis di keluaran gerbang.

`Promise.race` memasang handler ke promise `"error"` walau `initialize` yang
menang, jadi `"error"` yang datang jauh sesudah `start()` tidak menjadi
unhandled rejection dan tidak mematikan proses. Kalau bacaan itu salah, yang
terlihat adalah gerbang mati saat test adapter yang mati di tengah jalan
berjalan, dan perbaikannya adalah listener yang mengubah galat menjadi keadaan
driver, bukan menghapus race-nya.

`agents.none` sekarang menyebut Windows di semua platform. Harganya satu kalimat
yang dibaca pengguna macOS dan Linux tanpa perlu, dan yang dibeli adalah pesan
yang menyebut sebab sungguhan bagi satu-satunya kelompok yang jalannya sengaja
dibiarkan mati.

## Keluaran gerbang

### Langkah 1, sebelum apa pun disentuh

`node --import tsx` atas berkas coret yang memanggil `ClaudeAcp` dengan
`command: "/nonexistent/caraka-adapter"` di dalam `try/catch`:

```
node:events:487
      throw er; // Unhandled 'error' event
      ^

Error: spawn /nonexistent/caraka-adapter ENOENT
    at ChildProcess._handle.onexit (node:internal/child_process:287:19)
    at onErrorNT (node:internal/child_process:508:16)
    at process.processTicksAndRejections (node:internal/process/task_queues:90:21)
Emitted 'error' event on ChildProcess instance at:
    at ChildProcess._handle.onexit (node:internal/child_process:293:12)
    at onErrorNT (node:internal/child_process:508:16)
    at process.processTicksAndRejections (node:internal/process/task_queues:90:21) {
  errno: -2,
  code: 'ENOENT',
```

Baris `REPRO: caught` tidak pernah tercetak dan proses keluar dengan 1. Bacaan
spec benar: galatnya datang di tick berikutnya sebagai event, jadi `catch` tidak
melihatnya. Satu probe kedua memastikan EACCES lewat jalan yang sama — `spawn`
atas berkas mode `0o644` mengembalikan tanpa melempar, lalu mencetak
`deferred event: EACCES`. Itu yang membuat test AC-1.3 benar-benar menguji
listener baru, bukan lemparan sinkron.

### `npm run verify`, dari `caraka/`

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
Finished in 114ms on 33 files using 24 threads.

> caraka@1.2.0 typecheck
> tsc -p tsconfig.json --noEmit


> caraka@1.2.0 build
> node -e "require('node:fs').rmSync('dist', { recursive: true, force: true })" && tsc -p tsconfig.json
```

Delapan test yang dibawa pekerjaan ini, dari keluaran `npm test` yang sama:

```
✔ an adapter that cannot be spawned rejects instead of ending the process (10.526623ms)
✔ an adapter that resolves but will not run falls to the preset's CLI route (9.189373ms)
✔ resolveCommand answers what can be spawned, and on Windows that excludes the npm shims (1.447572ms)
✔ the locked adapter resolves as a module, never through a bin shim (0.973644ms)
✔ the shipped Claude preset spawns the adapter entry through the running Node (3.434712ms)
✔ discovery reports what a driver could spawn, and on Windows the shims are not it (12.449274ms)
✔ the two spawn failures name their cause and their way out, in both catalogs (0.158831ms)
✔ no file under src/ passes shell to a process call (2.251113ms)
```

```
ℹ tests 121
ℹ suites 0
ℹ pass 121
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 7615.418769

> caraka@1.2.0 e2e
> node --import tsx --test test/e2e.test.ts

ℹ tests 62
ℹ suites 0
ℹ pass 62
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 28472.791071
```

121 unit dan 62 e2e hijau, nol merah. Unit naik dari 113 di HEAD
(`git show HEAD:test/unit.test.ts | grep -c '^test('`), jadi kedelapan test di
atas adalah tambahan dan bukan penamaan ulang; e2e tidak disentuh dan tetap 62.

### Smoke, AC-3.6

`node scripts/smoke-cli.mjs claude-code` dan pasangan route CLI-nya, terhadap
`dist/` yang baru dibangun gerbang:

```
claude-code acp smoke passed via /home/ramaaditya/Project/caraka/caraka/node_modules/@agentclientprotocol/claude-agent-acp/dist/index.js: answered "ready", reloaded through session/load, recalled 2129.
claude-code cli smoke passed via /home/ramaaditya/.local/bin/claude: answered "ready", resumed by `-p --output-format json --resume {sessionId}` in the workspace, recalled 8867.
codex cli smoke passed via /home/ramaaditya/.local/bin/codex: answered "ready", session id 019ff8ef-1e52-78f1-a507-6a63483126d9, recalled 6070.
SKIP aider: `aider` is not installed on this machine.
SKIP goose: `goose` is not installed on this machine.
```

Baris `via` untuk route ACP adalah berkas entri modul, bukan
`node_modules/.bin/claude-agent-acp`. Itu AC-3.2 dan AC-3.6 dalam satu baris:
smoke sekarang membangun driver-nya lewat `buildDriver`, dan yang di-spawn
adalah `dist/index.js` di bawah `@agentclientprotocol/`. `aider` dan `goose`
memang tidak terpasang di mesin ini (`command -v aider goose` kosong), jadi SKIP
bukan regresi dari resolver baru.

### Penghapusan, AC-7.3

```
$ grep -rn "packageBin\|realpathSync\|no PATHEXT" src/
$ grep -rnE "\bshell\s*:" src/
```

Keduanya nol baris. Jalan `PATH` duplikat di `src/discovery.ts` hilang di diff:
loop enam baris atas `existsSync` menjadi satu pemanggilan `resolveCommand`, dan
`existsSync` beserta `delimiter` keluar dari `import`-nya.

### Anggaran, AC-7.1 sampai AC-7.5

```
$ find src -name "*.ts" | xargs wc -l | tail -1
  8546 total
```

+48 dari 8.498. Enam dari 48 baris itu bukan milik pekerjaan ini: pohon kerja
ini sudah memuat `src/core/security.ts` yang disunting `scrubber-token-url`
sebelum pekerjaan ini dimulai, dan berkas itu tidak disentuh di sini
(`git diff --numstat -- src/` memberi `7 1` untuknya). Milik `spawn-windows`
adalah **+42**, jadi `src/` menjadi **8.540** saat item ini mendarat sendirian,
dan itulah angka yang ditulis di paragraf anggaran `AGENTS.md`.

Perkiraan spec adalah +25 sampai +35 dengan 13 baris komentar. Yang terukur
lebih besar: 26 baris komentar masuk dan 8 keluar, jadi +18 bersih komentar dan
+24 kode. Yang membeli selisihnya adalah tiga hal yang tidak dihitung per baris
di spec: tanda tangan `resolveCommand` dengan tiga seam ber-default menjadi
tujuh baris setelah `oxfmt` memecahnya, `spawnable` berdiri sebagai fungsi
bernama supaya cabang absolut dan cabang `PATH` memakai aturan yang sama, dan
komentar `spawnable` memuat tujuh baris alih-alih enam karena keempat fakta itu
tidak muat dalam enam. Plafon tidak digeser: `grep -n "~8,000" AGENTS.md` masih
memberi baris plafon yang sama, dan yang berubah di paragraf anggaran hanya
angka terukur beserta apa yang membelinya.

### Dokumen, AC-8.1

```
$ grep -rn "node_modules/.bin" docs/
docs/integrasi-ekosistem.en.md:47:- **Resolving `command`.** An adapter installed as an npm dependency is resolved as a module rather than through what npm writes for it in `node_modules/.bin`: on Windows what is written there is a shim that cannot be spawned. Any other command is looked up on `PATH`, and on Windows only a candidate ending `.exe` or `.com` is accepted, because those are the only extensions libuv appends while walking `PATH`. `resolveCommand` in `src/drivers/preset.ts` does both.
docs/integrasi-ekosistem.md:47:- **Resolusi `command`.** Adapter yang dipasang sebagai dependency npm diselesaikan sebagai modul, bukan lewat berkas yang ditulis npm di `node_modules/.bin`: yang ditulis di sana pada Windows adalah shim yang tidak bisa di-spawn. Perintah lain dicari di `PATH`, dan di Windows hanya kandidat berakhiran `.exe` atau `.com` yang diterima, karena hanya itu yang ditambahkan libuv saat menelusuri `PATH`. Keduanya dikerjakan `resolveCommand` di `src/drivers/preset.ts`.
```

Baris pembuktian AC-8.1 di plan ini minta nol baris, dan itu yang dikoreksi:
kedua butir masih menyebut `node_modules/.bin`, justru untuk menyatakan bahwa ia
tidak dipakai. Yang diminta AC-8.1 adalah dokumen berhenti *menyatakan* bahwa
direktori itu ikut dicari, dan itu terpenuhi; grep-ke-nol adalah pembuktian
plan yang terlalu ketat untuk kalimat yang ditulis. `docs/api.md` tidak lagi
menyebutnya sama sekali.

### Batas pembuktian, AC-7.4

Gerbang berjalan di Linux 7.0.0-28-generic dengan Node v24.18.0. Tidak ada
Windows di sini, jadi yang terbukti adalah cabang `win32` lewat parameter
`platform`: shim npm ditolak, `.exe` diterima tanpa peduli besar-kecil huruf,
direktori bernama sama dengan sebuah biner tidak dilaporkan, dan jawaban
`discoverAgents` sama dengan jawaban `resolveCommand` untuk setiap nama di
`knownBinaries`. Yang belum terbukti: bahwa `claude.exe` sungguhan menjawab di
Windows sungguhan, bahwa adapter terkunci dijalankan Node di sana tanpa keluhan
baru, dan bahwa `-4058` benar-benar hilang bagi pelapor isu #5. Isu #5 tetap
dibuka sampai pelapornya mengonfirmasi.

Satu hal di bagian Risiko terjawab dan tidak perlu ditunggu: doctor tidak
kehilangan baris di mesin ini. Jalan `existsSync` lama dan jalan
`resolveCommand` baru atas `PATH` sungguhan mesin ini memberi dua baris yang
sama, `claude` dan `codex` di `~/.local/bin`, dengan selisih kosong.

### Mesin kedua, 13 Agustus 2026

Gerbang dijalankan ulang di `rama-tuf` — Fedora 44, 16 thread, Node 24.18.0 —
dari salinan yang disinkron ke direktori tersendiri, karena checkout lama di
mesin itu tertinggal sebelas commit dan kotor. Angkanya identik dengan mesin
ini, yang menutup kelas kegagalan yang menemukan tie-break `activeGrant` di
v1.2: sebuah test yang lolos di satu mesin karena marginnya satu milidetik.

```
host: ra-tuf · Linux 7.0.12-201.fc44.x86_64 · node v24.18.0 · npm 11.16.0
clean: 253 tracked files, no credentials
ℹ tests 146 · pass 146 · fail 0
ℹ tests 88  · pass 88  · fail 0
RESULT: gate green
```

Lalu `npm run smoke`, satu-satunya perintah gerbang yang CI tidak bisa
menjalankan, karena ia menuntut biner agent sungguhan. Hasilnya jujur satu dari
empat, dan yang satu itu yang penting bagi pekerjaan ini:

```
smoke-cli.mjs claude-code cli   PASS — answered "ready", resumed by
                                `-p --output-format json --resume {sessionId}`,
                                recalled 1154, via ~/.local/bin/claude
smoke-claude.mjs                FAIL — assertion strictEqual atas teks model;
                                keluarannya `CARAKA_ACP_LOAD_OK` diikuti catatan
                                otorisasi MCP milik instalasi Claude Code di
                                mesin itu
smoke-cli.mjs aider             TIMEOUT 300 s — aider menunggu model yang tidak
                                dikonfigurasi di mesin itu
smoke-cli.mjs goose             FAIL — goose menjawab daftar fungsi, bukan
                                angka yang diminta
```

Yang dibuktikan: rute CLI `claude-code` berjalan lewat `resolveCommand` yang
ditulis ulang di pekerjaan ini, menyelesaikan satu turn, dan melanjutkannya.
Yang **tidak** dibuktikan, dan tidak diklaim: tiga sisanya. Ketiga kegagalan itu
kondisi mesin, bukan regresi — `smoke-claude.mjs` membandingkan teks model
dengan `strictEqual` dan instalasi di sana menempelkan catatan MCP di belakang
jawabannya, aider tidak punya model, dan goose menjawab di luar tugas dengan
provider yang ada di sana. Pola ketiga itu sudah tercatat di CHANGELOG v1.2.0
untuk goose. Tidak satu pun dari ketiganya menyentuh baris yang diubah di sini,
dan tidak satu pun boleh dibaca sebagai lampu hijau.
