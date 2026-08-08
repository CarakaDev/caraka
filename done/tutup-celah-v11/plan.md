# Plan — Wave 7: tutup celah v1.1

**Spec:** `spec/tutup-celah-v11.md` · **Tanggal:** 8 Agustus 2026

Wave ini ditulis mundur. Pekerjaannya datang sebagai satu instruksi, dikerjakan
langsung, dan dokumen ini menyusul untuk mencatat bagaimana tiap AC dibuktikan
di pohon yang sama. Langkah-langkah di bawah karena itu bukan rencana yang
diikuti; mereka adalah urutan yang benar-benar ditempuh kode, dibaca ulang dari
diff-nya. `standards/ears.md` §4 tetap menyatakan arah yang benar, dan wave
berikutnya kembali ke sana.

## Langkah

### 1 — Resolver mode, di `src/core/security.ts`

Tiga nama dari `docs/security.md` §5 sebagai `POLICY_MODES`, satu fungsi murni
`resolvePolicyMode(modes, container, principal, isPrivate)`, dan satu predikat
`writesOrExecutes(request)`. Keduanya di core dan tidak menyentuh channel: peta
yang dikirim ke resolver sudah milik satu channel, jadi id tidak pernah dibaca
lintas channel dan hard rule 1 tidak punya tempat untuk dilanggar.

`writesOrExecutes` tidak memercayai `kind` sendirian. `readingKinds` berisi
empat label yang hanya mengamati; label lain, termasuk tidak ada label, dibaca
sebagai tulis. Sesudah label lolos, payload diperiksa terhadap enam field yang
tidak pernah dibawa sebuah bacaan. Alasannya ditulis di berkasnya: T1 dan T2 di
§2 sama-sama berakhir dengan agent yang menulis label sesukanya.

Berkas: `src/core/security.ts`.

### 2 — Gerbang di jalur run, di `src/core/gateway.ts`

Satu peta keempat di gateway (`modes`), sejajar dengan dua allowlist dan peta
operator yang sudah ada, diisi dari `channelBlocks`. Satu method privat
`policyMode(message)` yang memanggil resolver, dan tiga titik penolakan:

- `runTask`, sebelum sesi agent dibuka, untuk route yang tidak menyerahkan izin.
- `askPermission`, di depan jendela trust dan di depan kartu.
- `offerTrust`, di depan kartu `/yolo`.

Ketiganya menulis `policy.deny` ke audit dan mengirim satu kalimat yang menyebut
jalan keluarnya. Tidak satu pun menggantikan bagian dari jalur approval:
`isHighRisk` tetap berlaku di semua mode lain.

Satu perbaikan ikut di sini karena gerbangnya membongkarnya: catatan penyerahan
mode agent (`cededModes`) dulu berkunci path workspace, padahal dua percakapan
di satu workspace memegang dua sesi agent. Kuncinya sekarang
`workspacePath\0agentId`. Tanpa itu, run `read-only` yang lewat
`applyGrantedMode` akan mengonsumsi catatan percakapan lain dan meninggalkan
sesi yang benar-benar diserahkan tanpa pemulihan.

Berkas: `src/core/gateway.ts`, `src/core/driver.ts` (field `asksPermission`).

### 3 — Peta `modes` di config, dan `trusted` yang ditolak berkas

`allowlists.modes` sebagai `z.record` opsional, dengan refinement yang menolak
`trusted` beserta pesan yang menyebut `caraka trust`. Alasannya hard rule 3:
jendela `trusted` wajib punya jam, dan nilai di berkas tidak punya jam. Peta itu
masuk `ChannelBlock` supaya core membacanya lewat jalan yang sama dengan dua
allowlist. `defaultConfig` menulis `modes: {}` — berkas yang dikirim tidak
meng-opt-in apa pun.

`carakaPaths` menambah dua nama, `secrets` dan `discovery`, karena dua perintah
baru memerlukannya dengan nama.

Berkas: `src/config.ts`.

### 4 — `asksPermission` sebagai klaim preset, bukan klaim kelas

`ClaudeAcp` melayani setiap preset ber-blok `acp:`, dan sebagian besar preset itu
bertanda belum diverifikasi. Jadi klaim "adapter ini benar-benar mengirim
`session/request_permission`" ditaruh di preset (`acp.asksPermission`, default
`false`), bukan di kelasnya. Hanya `claude-code.yaml` yang menulisnya, karena
hanya adapter itu yang pernah diamati di mesin ini. `CliDriver` mendeklarasikan
`false` secara tetap: jalur itu tidak punya hook izin sama sekali.

Berkas: `src/drivers/preset.ts`, `src/drivers/claude-acp.ts`,
`src/drivers/cli.ts`, `src/cli.ts` (`buildDriver`), `presets/agents/claude-code.yaml`.

### 5 — Deep link pairing sebagai bearer secret

`pairingCode(now, ttlMs)` menggantikan tiga baris inline di `init`. Yang berubah
bukan panjangnya, melainkan siapa yang memegang tiga properti: 72 bit dari
`randomBytes`, satu jawaban, dan tenggat yang ditegakkan sendiri alih-alih
menumpang `AbortController` poll yang kebetulan sedang jalan. Perbandingannya
`timingSafeEqual` karena payload datang dari jaringan.

Tidak ada tanda tangan, dan alasannya ditulis di header fungsinya: HMAC
mengautentikasi nilai yang pergi lalu kembali ke verifier yang tidak
menyimpannya; kode ini tidak pernah meninggalkan proses yang akan memeriksanya.
Satu baris i18n baru, `cli.pairSecret`, mencetak arti tautan itu sebelum ada yang
meneruskannya.

Berkas: `src/cli.ts`, `src/i18n.ts`.

### 6 — `doctor --fix`

`doctorFix(paths, config, t)` mengembalikan `{ fixed, refused }`, dan `doctor`
menjalankannya lebih dulu supaya baris pemeriksaan melaporkan keadaan sesudahnya.
Yang boleh disentuh dibatasi ke tiga nilai yang `docs/install-flow.md` §4 tulis
jawabannya: direktori 0700, berkas 0600, dan PID file yang menyebut proses mati.
Database dan cache discovery sengaja absen — tidak satu pun pernah dijanjikan
mode, dan perbaikan untuk nilai yang tidak pernah ditulis siapa pun adalah
pendapat.

Bit milik pemilik dibiarkan: hanya `& 0o077` yang dihitung drift. Di Windows
tidak ada `chmod` sama sekali, karena `privateFile` sudah membaca platform itu
sebagai privat dan sebuah `chmod` di sana akan melaporkan perbaikan yang tidak
terjadi.

Berkas: `src/cli.ts`, `src/i18n.ts`.

### 7 — `uninstall`

`uninstallTargets(paths)` menyebut tujuh path. Dua sidecar SQLite ikut karena
`caraka.db-wal` memegang ekor sesi terakhir; menghapus database dan
meninggalkannya berarti ekor itu tetap terbaca. `~/.caraka` sendiri tidak ada di
daftar: ia dihapus lewat `rmdir` yang gagal diam-diam bila tidak kosong.

Gateway hidup menghentikan perintah di exit 78 sebelum satu berkas pun dihapus.
Konfirmasi menuntut kata `uninstall` utuh — `y` untuk hal yang bisa dibatalkan,
dan ini bukan salah satunya. Penolakan keluar 1 supaya `caraka uninstall && …`
tidak membacanya sebagai penghapusan.

Keduanya, `uninstall` dan `doctor --fix`, tidak didaftarkan sebagai perintah
chat. Satu menulis ke disk, satu menghapus instalasi; keduanya keputusan yang
hard rule 2 tahan di depan mesin.

Berkas: `src/cli.ts`, `src/i18n.ts`.

### 8 — Smoke jalur CLI, dan sebab kegagalan dari mulut agent

`scripts/smoke-cli.mjs <preset>` (default `codex`): preset asli lewat loader
asli, `CliDriver` asli, biner asli, workspace temp kosong. Dua giliran, dengan
satu angka acak yang hanya muncul di prompt pertama, supaya giliran kedua
membuktikan resume dan bukan gema. Biner yang tidak terpasang keluar nol dan
mencetak SKIP; biner yang terpasang tetapi tidak menjawab adalah kegagalan.

`failureReason(stdout)` ada karena smoke itu pertama kali gagal dengan sebab yang
salah. `codex` menulis alasannya ke stdout terstruktur yang diminta
(`{"type":"error","message":…}`) sementara stderr membawa catatan progres, jadi
baris stderr terakhir menamai sebab yang keliru sesering yang benar. Fixture
test-nya direkam dari `codex exec --json` yang sungguhan pada 8 Agustus 2026.

Berkas: `scripts/smoke-cli.mjs`, `src/drivers/cli.ts`, `package.json` (script
`smoke`).

### 9 — Job `audit` di CI

Dua langkah. Pohon produksi diaudit langsung dari lockfile, tanpa `npm ci` di
depannya. Pohon kedua memasang peer opsional Baileys pada versi yang dibaca dari
`package.json` — bukan versi yang ditulis ulang di workflow, supaya bump pin ikut
memindahkan langkah ini.

Langkah kedua gagal, dan kegagalannya bukan sesuatu yang bisa diperbaiki pull
request siapa pun hari ini: `@whiskeysockets/baileys@6.7.18` sendiri berada di
bawah GHSA-qvv5-jq5g-4cgg. Pilihannya menggantung `ci` merah permanen atau
melapor tanpa menjatuhkan. Yang dipilih `continue-on-error`, dengan alasannya dan
syarat pencabutannya ditulis di komentar di sebelahnya, karena check merah
permanen adalah check yang orang belajar abaikan.

Berkas: `.github/workflows/ci.yml`.

### 10 — Dokumen

Dua baris §13 dibaca ulang. Baris default-teraman naik ke `met` dan menyebut enam
test yang menjaganya. Baris `npm audit` tetap `deferred`, tetapi alasan lamanya
diganti alasan baru: perintahnya sekarang ada dan jawabannyalah yang membuka
kotak itu.

Fase 2 `docs/roadmap.md` disapu terhadap kode. Empat kotak yang sudah punya kode
sejak v0.2–v0.4 dicentang dan menyebut kode yang menjawabnya; tiga kotak yang
wave ini bangun dicentang dan menyebut nama test-nya; pembacaan ACP Registry
keluar sebagai baris sendiri bertanda ditarik dengan tanggal dan alasannya. Fase
0 tidak berubah statusnya — ketiga kotaknya tetap terbuka — tetapi masing-masing
sekarang menyebut apa yang menahannya.

Berkas: `docs/security.md`, `docs/security.en.md`, `docs/roadmap.md`,
`docs/api.md`, `README.md`, `README.id.md`.

### 11 — Situs

Versi di `site/src/data/` naik ke 1.1 di enam berkas, dan `status.ts` mendapat
kartu `1.1.0` dengan tiga kelompok. Yang substantif bukan angkanya: setiap
kalimat yang menyatakan tidak ada gerbang mode di jalur run dicabut, tabel mode
di halaman keamanan dipecah menjadi dua baris grup karena opt-in itulah isinya,
dan daftar perintah di halaman dokumentasi berhenti menulis bahwa `doctor --fix`
dan `uninstall` tidak ada.

Daftar agent di `landing.ts` **tidak** berubah. Codex tetap `preset`: smoke-nya
mengemudikan biner sungguhan, yang lebih dari transkripsi, dan belum pernah
menyelesaikan satu giliran. "verified" adalah klaim yang didapat dengan
menjawab.

Chip npm di `readme.ts` naik ke `v1.0.0` karena ia melacak registry dan pemilik
sudah menerbitkan 1.0.0 (`npm view caraka version`, 8 Agustus 2026). Ia tetap
tertinggal di belakang 1.1.0 dengan sengaja, dan komentarnya mengatakan sampai
kapan.

Tiga berkas di luar `site/src/data/` ikut disentuh karena masing-masing memuat
satu kalimat yang wave ini membuatnya salah, bukan sekadar usang:
`src/pages/security.astro` ("Caraka has one policy mode of its own"),
`src/pages/install.astro` ("Doctor is read-only"), dan dua halaman yang menulis
bahwa Claude Code adalah satu-satunya agent yang pernah dijalankan terhadap biner
hidup. `site/AGENTS.md` juga: daftar "never to be implied"-nya masih melarang
menyebut gerbang mode yang sekarang ada.

Berkas: `site/src/data/{status,landing,readme,compare,security,docs,install,ui-kit}.ts`,
`site/src/pages/{security,install,docs}.astro`, `site/src/pages/brand/readme.astro`,
`site/AGENTS.md`, `site/e2e/site.spec.ts`.

### 12 — Versi dan CHANGELOG

`package.json` dan `VERSION` di `src/cli.ts` ke `1.1.0`. Entri `[1.1.0]` dengan
bagian *Limited* yang menyebut empat hal yang tidak boleh ditemukan sendiri oleh
pembaca sesudah memasang, dan satu hal yang melanggar aturan rumah: `src/`
melewati plafonnya.

## Pemetaan pembuktian

| AC | Bukti |
|---|---|
| AC-1.1 | pembacaan `Gateway.policyMode`; unit: *what the config does not name, the documented default names* |
| AC-1.2 | unit: *what the config does not name, the documented default names* |
| AC-1.3 | unit: kasus DM Discord di test yang sama — id percakapan bukan id orangnya |
| AC-1.4 | e2e: *no chat text moves the gate, and a trust window elsewhere does not cover it* |
| AC-1.5 | test grep hard rule 1 yang sudah ada, tetap hijau; peta `modes` berkunci `ChannelId` seperti dua allowlist |
| AC-1.6 | e2e: *a group with nothing in the config is read-only, and the refusal says how* |
| AC-1.7 | e2e yang sama memeriksa isi kalimatnya |
| AC-1.8 | e2e yang sama memeriksa baris `policy.deny` |
| AC-1.9 | unit: *read-only refuses everything that is not plainly a read* |
| AC-1.10 | unit yang sama, cabang kind tidak dikenali |
| AC-1.11 | e2e: */yolo from a read-only room opens nothing, and the DM still draws its card* |
| AC-1.12 | e2e: *read-only refuses a route that never asks, rather than run unguarded* |
| AC-1.13 | e2e: *a read-only run does not consume the cede record of another conversation* |
| AC-2.1 | unit: *the mode opt-in is additive, and a trusted window is not written in a file* |
| AC-2.2 | unit yang sama, cabang `trusted` ditolak |
| AC-2.3 | unit yang sama atas `defaultConfig` |
| AC-2.4 | unit yang sama, config tanpa kunci `modes` |
| AC-3.1 | unit: *the pairing code answers once, dies on its own clock, and refuses a wrong code* — bentuk tautannya di-regex |
| AC-3.2 | manual: `cli.pairSecret` di kedua katalog, dicetak `init` tepat di bawah tautan |
| AC-3.3 | unit yang sama, pemakaian kedua ditolak |
| AC-3.4 | unit yang sama, jam disuntik lewat parameter `now` |
| AC-3.5 | pembacaan `pairingCode.claim`: `timingSafeEqual` dengan penjagaan panjang di depannya |
| AC-3.6 | unit yang sama: kode salah ditolak, kode benar sesudahnya diterima |
| AC-4.1 | pembacaan `doctor(args)`: pass `--fix` berjalan sebelum `checks` disusun |
| AC-4.2 | unit: *doctor --fix repairs what drifted and names what it will not decide* |
| AC-4.3 | unit yang sama |
| AC-4.4 | unit yang sama, direktori dibuat 0700 |
| AC-4.5 | unit yang sama, PID mati |
| AC-4.6 | unit yang sama, PID hidup dibiarkan |
| AC-4.7 | unit yang sama memeriksa isi `refused` |
| AC-4.8 | pembacaan `doctorFix`: `posix` menjaga setiap `chmod` |
| AC-4.9 | pembacaan: setiap cabang `stat`, `chmod`, `mkdir`, atau unlink; tidak ada penulisan secret dan tidak ada listener |
| AC-5.1 | unit: *uninstall lists only what Caraka wrote and takes the whole word* |
| AC-5.2 | unit yang sama atas `uninstallTargets` |
| AC-5.3 | unit yang sama atas `uninstallConfirmed` |
| AC-5.4 | pembacaan `uninstallCommand`: `process.exitCode = 1` di cabang penolakan |
| AC-5.5 | pembacaan: `livePid` diperiksa sebelum daftar disusun, exit 78 |
| AC-5.6 | pembacaan: `rmdir` tanpa `recursive`, gagal diam-diam bila tidak kosong |
| AC-5.7 | manual: `cli.uninstallKeeps` di kedua katalog |
| AC-5.8 | pembacaan router `main`: keduanya hanya di router terminal, tidak ada di daftar perintah chat |
| AC-6.1 | `package.json` script `smoke` |
| AC-6.2 | pembacaan `scripts/smoke-cli.mjs`: `resolveCommand` null → `process.exit(0)` dengan SKIP |
| AC-6.3 | dijalankan: keluarannya di bawah, keluar 1 dengan kalimat codex sendiri |
| AC-6.4 | unit: *a failed run is reported in the agent's own words, not the last stderr line* |
| AC-6.5 | pembacaan: `loadPresets`, `CliDriver`, `resolveCommand` semuanya dari `dist/`, tanpa stub |
| AC-7.1 | `.github/workflows/ci.yml`, job `audit`, langkah pertama |
| AC-7.2 | job yang sama, langkah kedua |
| AC-7.3 | langkah itu membaca versi lewat `node -p` atas `package.json` |
| AC-7.4 | `continue-on-error: true` dengan komentar yang menyebut GHSA-qvv5-jq5g-4cgg dan syarat pencabutannya |
| AC-8.1 | manual: dua baris §13 yang berubah, keduanya bertanggal 8 Agustus 2026 |
| AC-8.2 | manual: baris default-teraman menyebut enam judul test yang ada di `test/` |
| AC-8.3 | manual: §5 paragraf kedua dan ketiga |
| AC-8.4 | manual: diff `docs/security.md` dan `docs/security.en.md` dibaca berdampingan |
| AC-8.5 | manual: tujuh kotak Fase 2 tercentang, masing-masing menyebut fungsi atau berkasnya |
| AC-8.6 | manual: tiga kotak Fase 0 dan satu kotak Fase 2 yang terbuka, masing-masing bertanggal |
| AC-8.7 | manual: baris ACP Registry ada, bertanda dicabut, dengan tanggal dan alasan |
| AC-8.8 | manual: baris `acp` di tabel `docs/api.md` |
| AC-9.1 | grep versi di `site/src/data/`; `npm run check` dan `npm run e2e` situs hijau |
| AC-9.2 | manual: kartu `1.1.0` di `status.ts` |
| AC-9.3 | manual: empat butir *LIMITED* pertama kartu itu |
| AC-9.4 | `npm view caraka version` → `1.0.0`, 8 Agustus 2026; chip membaca angka itu, komentarnya menyebut lag-nya |
| AC-9.5 | grep `no policy-mode gate` di `site/src` dan `site/AGENTS.md`: satu hasil, dan ia ada di dalam kartu rilis 0.5.0 |
| AC-9.6 | manual: `landing.ts` `agents` tidak berubah, Codex tetap `preset` |
| AC-9.7 | manual: setiap nilai yang bergerak membawa komentar comp yang diperbarui — `status.ts`, `landing.ts`, `readme.ts`, `compare.ts`, `security.ts`, `docs.ts`, `install.ts`, `ui-kit.ts` |
| AC-9.8 | diukur dua kali atas `rm -rf dist && npm run build`, sama persis; angkanya di bawah |
| AC-10.1 | `node -p` atas `package.json`, grep `VERSION` di `src/cli.ts` |
| AC-10.2 | manual: `CHANGELOG.md` entri `[1.1.0] — 2026-08-08` |
| AC-10.3 | manual: empat butir *Limited* bercetak tebal |
| AC-10.4 | manual: butir `src/` 8.422 baris di *Limited* |
| AC-10.5 | tidak ada `npm publish`, `git tag`, atau `npm run deploy` di log wave ini |
| AC-11.1 | perintah dan keluarannya di bawah |
| AC-11.2 | plan dan CHANGELOG sama-sama menyatakannya terlewati |
| AC-12.1 | kode keluar dan keluaran di bawah |
| AC-12.2 | kode keluar dan keluaran di bawah |
| AC-12.3 | tiap perintah dijalankan sendiri dan kode keluarnya dibaca dari `$?`, bukan dari potongan akhir keluarannya |

## Risiko

- **Gerbang yang menolak terlalu banyak lebih mudah dimaafkan daripada gerbang
  yang menolak terlalu sedikit, dan keduanya salah.** `writesOrExecutes` menolak
  tool yang tidak dikenali. Itu berarti sebuah agent dengan nama tool di luar
  empat label bacaan tidak bisa membaca apa pun di ruang read-only, dan
  operatornya akan menyimpulkan gerbangnya rusak. Yang dipilih tetap menolak:
  daftar yang salah longgar adalah tulis yang lolos, dan daftar yang salah ketat
  adalah keluhan.
- **Default yang berubah adalah perubahan perilaku pada instalasi yang sudah
  jalan.** Grup yang selama ini menulis akan berhenti menulis sesudah upgrade,
  tanpa ada yang mengubah config. Itu disengaja dan itu arah yang benar, tetapi
  ia minor bump yang mengubah perilaku, dan yang menahan salah paham cuma prosa:
  kalimat penolakannya menyebut baris config yang mengembalikannya, dan CHANGELOG
  menaruhnya di butir pertama *Added*.
- **Kode pairing tanpa tanda tangan.** Keputusan ini benar selama kodenya tidak
  pernah meninggalkan proses yang memeriksanya. Kalau suatu hari pairing dipecah
  ke proses lain — daemon, atau wizard yang menyerahkan ke gateway — properti itu
  hilang dan HMAC jadi wajib. Alasannya ditulis di header fungsi supaya yang
  memindahkannya membacanya lebih dulu.
- **`doctor --fix` menulis ke disk di perintah yang selama ini read-only.** Yang
  menahannya adalah daftar tertutup: hanya tiga jenis drift yang punya nilai
  benar tertulis, dan segala yang butuh keputusan keluar lewat `refused`.
  Godaan berikutnya adalah menambah satu perbaikan "yang jelas" ke daftar itu;
  yang jelas bagi penulisnya belum tentu tertulis di mana pun.
- **`uninstall` tidak bisa dibatalkan.** Konfirmasi satu kata utuh, daftar path
  dicetak lebih dulu, dan `~/.caraka` hanya hilang kalau kosong. Yang tetap
  tidak ada: tidak ada backup, dan tidak ada `--dry-run`.
- **Smoke yang gagal karena kuota terlihat sama dengan smoke yang gagal karena
  bug.** Yang membedakan cuma kalimat yang dicetaknya, dan itulah kenapa
  `failureReason` ada. Selama kuota belum pulih, `npm run smoke` merah di mesin
  ini, dan tidak boleh dibaca sebagai regresi.
- **Plafon kompleksitas terlewati.** 8.422 baris terhadap ~8.000. Wave ini
  membangun fitur dan tidak membayar lipatannya. Risiko sebenarnya bukan
  angkanya, melainkan bahwa plafon yang dilewati sekali tanpa konsekuensi berhenti
  menjadi plafon.

## Verifikasi

Dijalankan 8 Agustus 2026 pada pohon yang ditutup. Tiap perintah dijalankan
sendiri dan kode keluarnya dibaca dari `$?`.

```
$ npm run lint            → exit 0

> caraka@1.1.0 lint
> oxlint src test scripts && oxfmt --check src test scripts bin package.json tsconfig.json

Checking formatting...

All matched files use the correct format.
Finished in 349ms on 33 files using 24 threads.
No config found, using defaults. Please add a config file or try `oxfmt --init` if needed.

$ npm run typecheck       → exit 0

> caraka@1.1.0 typecheck
> tsc -p tsconfig.json --noEmit

(tanpa keluaran)

$ npm test                → exit 0
ℹ tests 113
ℹ suites 0
ℹ pass 113
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 11333.583485

$ npm run e2e             → exit 0
ℹ tests 62
ℹ suites 0
ℹ pass 62
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 31702.217994
```

104 test unit di `v1.0.0` menjadi 113, dan 56 e2e menjadi 62.

```
$ cd site && npm run check   → exit 0
- 0 errors
- 0 warnings
- 0 hints

> caraka-site@0.0.1 test
> vitest run

 Test Files  2 passed (2)
      Tests  26 passed (26)

$ cd site && npm run e2e     → exit 0
  2 skipped
  113 passed (1.4m)
```

Ditambah dua pemeriksaan yang tidak dilakukan alat: tanpa rahasia di diff, dan
prosa yang lolos bagian *Writing style* `AGENTS.md`.

### Anggaran kompleksitas — terlewati

```
$ find src -name '*.ts' | xargs wc -l | tail -1
  8422 total
```

**AC-11.1: 8.422 baris.** 542 di atas 7.880 di `v1.0.0`, dan **422 di atas
plafon ~8.000** di `AGENTS.md:19`. Aturannya meminta sebuah fitur baru menghapus
sesuatu atau tetap di bawah plafon; wave ini tidak melakukan keduanya. Ini
dicatat sebagai terlewati, bukan sebagai mendekati, dan lipatan yang membayarnya
adalah pekerjaan tersendiri yang belum dikerjakan.

### Baseline tinggi situs

Diukur pada Chromium 1440x900 sesudah `rm -rf dist && npm run build`, dua kali,
sama persis dua-duanya:

| Rute | v1.0 | v1.1 | Sebab |
|---|---|---|---|
| `/status` | 10813 | 12035 | kartu `1.1.0`, tiga kelompok |
| `/docs` | 6805 | 7314 | baris mode kebijakan, dua baris contoh config, dua verb CLI |
| `/security` | 5901 | 6147 | baris kelima tabel mode, satu kontrol wajib, satu butir in-scope |
| `/install` | 5364 | 5440 | dua baris transkrip comp yang kembali |
| `/brand/readme` | 5533 | 5557 | gerbang mode di kartu repo |

`/` dan `/compare` tidak bergerak: perubahannya masuk ke sel dan chip yang sudah
ada.

### Smoke jalur CLI — dijalankan, dan merah

```
$ node scripts/smoke-cli.mjs codex    → exit 1
FAIL codex via /home/ramaaditya/.local/bin/codex: codex stopped with an error.
You've hit your usage limit.
```

Biner ada, preset memuat, driver memanggilnya, dan yang kembali adalah kalimat
codex sendiri lewat `failureReason` — bukan baris stderr terakhir. Itu bukti
untuk AC-6.3 dan AC-6.4, dan bukan bukti bahwa codex bekerja. Tidak ada satu pun
giliran yang selesai, jadi jumlah agent yang terbukti terhadap biner hidup tetap
satu.

## Yang tetap tidak terpenuhi saat wave ditutup

- **Plafon kompleksitas.** 8.422 terhadap ~8.000. Terlewati, tertulis, belum
  dibayar.
- **Codex belum terbukti.** Smoke-nya ada dan mencapai biner sungguhnya; setiap
  jalannya pada 8 Agustus 2026 berhenti di kuota habis. Sasaran G2 `docs/prd.md`
  (≥ 15 agent) tidak bergerak.
- **Titen tidak pernah dihubungi.** Tidak terpasang di mesin ini, tidak ada yang
  menjawab di `127.0.0.1:7717`. `titen bootstrap`, `titen serve`, dan latensi
  compile tetap kotak terbuka di Fase 0.
- **Spike Rich Messages tetap terbuka.** Block terstruktur,
  `sendRichMessageDraft`, dan uji ulang `editMessageText` ber-`rich_message`
  butuh bot hidup dan orang yang mengetik.
- **Gelembung klien topic di DM belum pernah direkam.** Kode-nya ada; bukti
  visualnya tidak.
- **Sembilan gerbang lapangan masih terbuka**, semuanya sama seperti di 1.0.0.
- **Baris `npm audit` §13 tetap `deferred`.** Perintahnya ada sekarang;
  jawabannya yang menahan. Tertutup saat pin Baileys lewat dari
  GHSA-qvv5-jq5g-4cgg dan `continue-on-error` dilepas.
- **Dua sel `assisted` di tabel §5 masih desain.** `git push` dan deploy tetap
  mengirim kartu, karena daftar berisiko tinggi berlaku lebih dulu.
- **Pemetaan role Discord → mode (FR-AUTH-06) belum dibangun.**
- **Permukaan situs di luar `site/src/data/` yang menyebut versi belum disapu.**
  `site/src/lib/site.ts` (empat meta description dan satu kicker OG),
  `site/scripts/gen-assets.mjs`, dan prosa `v1.0` di `src/pages/index.astro`,
  `status.astro`, `story.astro`, `compare.astro`, `install.astro`,
  `security.astro`, `brand/index.astro`, dan `brand/ui-kit.astro`. Tidak satu pun
  dari itu salah — masing-masing menyebut v1.0 sebagai rilis yang memang terjadi
  — tetapi semuanya usang, dan sapuan tangan yang `site/AGENTS.md` minta belum
  dijalankan untuk 1.1.
- **`npm publish` tidak dijalankan, tag `1.1.0` tidak dibuat, dan `caraka.dev`
  tidak di-deploy.** Ketiganya milik pemilik. Registry memegang `1.0.0`.
