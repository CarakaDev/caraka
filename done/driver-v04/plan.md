# Plan — Fase 4: Membuktikan abstraksi driver (v0.4)

**Slug:** driver-v04 · **Tanggal:** 8 Agustus 2026 · **Spec:** `spec/driver-v04.md`

Urutan langkah mengikuti urutan yang disarankan brief riset fase ini: interface
dulu, gerbang dulu, keputusan skema sebelum loader, lalu workspace, perintah,
discovery, dan CI. Setiap langkah adalah satu commit (atau disebut lain di
langkahnya), dan setiap langkah meninggalkan gerbang verifikasi hijau.

Baris-baris yang dikutip diukur pada commit `044fdb2` (release 0.3.0). LOC
`src/` dasar: 3.377 (`wc -l`, 8 Agustus 2026) — gateway 1195, cli 508, db 372,
telegram 300, i18n 256, memory 217, security 169, config 127, claude-acp 121,
service 112.

## Langkah

### 1 · Interface `AgentDriver` dinamai — nol perubahan perilaku

Berkas: `src/core/driver.ts` (baru), `src/core/gateway.ts`,
`src/drivers/claude-acp.ts`, `src/cli.ts`, `test/e2e.test.ts`.

- Deklarasikan `AgentDriver` di `src/core/driver.ts` dari permukaan de-facto
  (`test/e2e.test.ts:94-122`, `:271-285`): `start()`, `session(existing, cwd)`,
  `prompt(sid, prompt, route)`, `setMode(sid, mode)`, `cancel(sid)`, `stop()`,
  dengan tipe route (`update`, `permission`).
- Promosikan tipe update dan izin yang dibaca core menjadi tipe `src/core`
  (subset di `gateway.ts:549-569` dan `:719-825`), hapus import
  `@agentclientprotocol/sdk` dari `gateway.ts:4-9`. `ClaudeAcp` memenuhi
  interface secara struktural — `implements AgentDriver`, tanpa terjemahan
  runtime.
- Ganti tipe parameter konstruktor `gateway.ts:91` menjadi `AgentDriver`;
  hapus kedua cast `as unknown as ClaudeAcp` di test.
- Perilaku tidak berubah; buktinya AC-1.2.

### 2 · Test gerbang AC-2.1, ditulis sebelum loader ada

Berkas: `test/e2e.test.ts` (atau `test/preset.test.ts` baru),
`test/fixtures/presets/dummy.yaml` (baru), `test/fixtures/bin/` (skrip stub
yang mencetak keluaran `json`/`jsonl`/`text` terekam).

- Test: muat preset dummy dari direktori preset yang ditunjuk test, jalankan
  satu giliran penuh Gateway → driver CLI → stub → balasan, lalu assert
  jawabannya sampai ke channel palsu.
- Test ini merah sampai langkah 3–4 selesai; ia adalah definisi selesai untuk
  keduanya, dan commit-nya mendahului commit loader supaya urutannya terbaca
  di riwayat.
- Bagian "diff tidak menyentuh `src/core/`" dibuktikan dengan
  `git diff --stat` pada commit yang menambah preset kedelapan (lihat langkah
  10) — bukan oleh assertion runtime.

### 3 · Skema preset + loader + tujuh preset

Berkas: `src/drivers/preset.ts` (baru), `presets/agents/*.yaml` (tujuh berkas
baru), `test/unit.test.ts`.

- Skema Zod per K1 dan K2 spec (K2 direvisi 8 Agustus 2026): hanya field yang
  dibaca loader dan driver CLI, plus blok `acp: {command, args[], env{}}`.
  YAML di-parse dengan paket `yaml` yang sudah terpasang
  (`docs/techstack.md:68-71`).
- Loader membaca direktori preset paket (dan direktori yang ditunjuk test),
  menolak berkas invalid dengan nama berkas + field (AC-3.2), memuat sisanya.
- Tujuh preset (FR-DRV-06 `docs/frd.md:122`):
  - `claude-code.yaml` — `driver: acp`, blok `acp:` memakai bin
    `claude-agent-acp` dari dependency terkunci (`package.json:49`); field CLI
    dari blok terverifikasi `docs/design.md:162-171`.
  - `codex.yaml` — verbatim `docs/api.md:16-28`, `--sandbox read-only`
    dipertahankan (`docs/security.md:221`).
  - `gemini.yaml`, `cursor.yaml`, `goose.yaml`, `amp.yaml` — `driver: acp`,
    command dari matriks riset (:29, :37, :39, :40), tiap flag yang belum diuji
    sendiri berkomentar `# belum diverifikasi` + sumber.
  - `aider.yaml` — `driver: cli`, seluruh flag ditandai belum diverifikasi
    (matriks :46).
- Unit test: skema menerima ketujuh preset nyata; menolak preset cacat dengan
  pesan yang menyebut field.

### 4 · Driver CLI generik

Berkas: `src/drivers/cli.ts` (baru), `test/unit.test.ts`,
`test/fixtures/` (rekaman keluaran per format).

- Satu implementasi dikendalikan preset: spawn (`node:child_process`,
  `docs/techstack.md:92` baris spawn), prompt via arg/stdin +
  `maxPromptArgChars`, parser `json`/`jsonl`/`text` (kontrak
  `docs/design.md:185`), ekstraksi `sessionIdFields[]`, substitusi
  `{sessionId}` pada `args`/`resumeArgs`, env scrub + `env` preset, SIGTERM →
  SIGKILL 5 detik, error stderr discrub.
- Kontrak `AgentDriver` dipenuhi: satu update teks per giliran (AC-4.9),
  `setMode` no-op (AC-4.10). Tanpa update `available_commands`/`usage` —
  `/commands` dan `/usage` sudah terdegradasi kosong, nol kode.
- Fixture: keluaran `jsonl` codex mengikuti format terdokumentasi (matriks
  :28: last agent message + `thread_id`); `json` mengikuti blok claude
  `docs/design.md:162-171`. Fixture ditandai sumbernya di komentar; bila
  binari nyata tersedia di mesin pengembang, rekaman asli menggantikan
  sintesis dan dicatat.
- Test langkah 2 berubah hijau di sini.

### 5 · Pemilihan driver + registry per sesi

Berkas: `src/core/gateway.ts`, `src/core/driver.ts`, `src/drivers/claude-acp.ts`
(spawn dari blok `acp:`), `src/cli.ts` (seam konstruksi), `src/i18n.ts`.

- Spawn `claude-acp.ts:32-38` diberi makan blok `acp:` preset; resolve
  `command` terhadap PATH + `node_modules/.bin` paket.
- Registry per sesi — dibangun 8 Agustus 2026 pada tinjauan pra-tutup, setelah
  temuan bahwa langkah ini sempat terlewat dan `/switch` menjanjikan pergantian
  yang tidak terjadi. Bentuknya: `driverRegistry` di `src/cli.ts` memegang satu
  driver hidup per pasangan (preset, rute paksa); gateway menerima fungsi
  `DriverFor` (`src/core/driver.ts`) dan memanggilnya per run dengan
  `session.agent` dan `workspaces[].driver` milik workspace sesi — tanpa satu
  pun `if (kind === "cli")` di core (AC-2.1 menjaga ini). Setiap driver yang
  pernah diambil dihentikan saat shutdown.
- Urutan pemilihan ACP → CLI → error i18n (AC-5.1–5.3), termasuk jatuh ke CLI
  saat adapter berhasil spawn tapi mati sebelum initialize; rute paksa
  per-workspace tidak pernah menyilang (AC-5.4–5.5).

### 6 · Workspace: config, kolom DB, `@slug`, antrean — satu commit

Berkas: `src/config.ts`, `src/store/db.ts`, `src/core/gateway.ts`,
`src/i18n.ts`, `test/unit.test.ts`, `test/e2e.test.ts`.

- Config: `workspaces[]` aditif, `version: 1` tetap (`config.ts:12`); singular
  diangkat jadi daftar satu elemen saat load (AC-6.1–6.2). Blok `agent:` lama
  (`config.ts:28-31`) tetap di-parse demi kompatibilitas; versi adapter kini
  dikunci `package.json:49`.
- Store: ALTER berpagar `PRAGMA table_info` untuk `sessions.workspace` dan
  `sessions.agent` (AC-6.3); tipe `Session` (`db.ts:5-13`), `createSession`
  (`:240-264`), `sessionFor`/`sessionById` (`:266-283`) ikut.
- Routing: parse `@slug` di `dispatch` (dekat `gateway.ts:186-187`), lengket
  via `ws.last.<chatId>` (`db.ts:224-238`), aturan
  `docs/session-model.md:96-101` (AC-6.4–6.10).
- Sebelas pembacaan `config.workspace` di gateway
  (`:150,388,420,532,572,735,922,932,971,992,1186`) beralih ke workspace
  sesi/chat, termasuk scope memori `:571-573` (AC-6.11); enam pembacaan di
  `src/cli.ts` (`:256-257,359,402,407,459,467`) memakai daftar workspace.
- Antrean: `queue` dan `queued` (`gateway.ts:80-81`) menjadi
  `Map<slug, …>`, `active` (`:83`) menjadi `Map<slug, {local, agentId,
  driver}>`; set `:423`, clear `:483`, `/stop` per workspace (`:1104-1131`),
  `stopNow` iterasi (`:1175-1194`); timeout run 30 menit per run (`:48`,
  `docs/design.md:278`) ikut pindah. Ack `queue.queued` diberi `(#n)` di kedua
  katalog (`i18n.ts:5`, `:126`). Rate limiter (`:252-263`) tetap per pengirim.
- E2e: dua workspace + dua driver palsu jalan paralel; antre hanya sesama
  workspace; `/stop` memilih benar.

### 7 · `/switch` dan `/ws`

Berkas: `src/core/gateway.ts`, `src/channels/telegram.ts` (daftar perintah),
`src/i18n.ts`, `test/e2e.test.ts`.

- `/switch <id preset>`: tulis `sessions.agent`, kosongkan `agentSessionId`
  (AC-8.1–8.2). Tidak ada string mode agent di kode maupun i18n (AC-8.3).
- `/ws`: daftar slug, dijawab di General (AC-8.4, pola jawaban General yang
  sudah ada di `sendMemoryReply` `gateway.ts:665-667`).

### 8 · Discovery + `init`/`doctor` — terbangun

Berkas: `src/discovery.ts` (baru), `src/cli.ts`, `src/i18n.ts`,
`test/unit.test.ts`.

- Pindai PATH tujuh binari (`docs/frd.md:20`), versi diprobe `--version` per
  binari yang ditemukan. Pembacaan ACP Registry JSON dicabut pada tinjauan
  pra-tutup 8 Agustus 2026: hasilnya tidak ditampilkan di mana pun, dan fetch
  3 detik di first run adalah harga tanpa pembeli (AC-9.2–9.3 dicabut di
  spec; pembacaannya kembali bersama baris doctor yang menampilkannya).
- Cache **berkas** `~/.caraka/discovery.json` berumur 24 jam — bukan
  `store.meta` seperti rencana awal, karena discovery berjalan di `init`
  sebelum database ada. PATH, jam, dan lokasi cache semuanya argumen (AC-9.1,
  AC-9.4–9.5); `doctor` refresh paksa mengabaikan umur cache (AC-9.6).
- `init`: dua pemeriksaan keras Claude (`--version` + login) diganti "minimal
  satu agent ditemukan" (AC-9.7–9.8); key i18n baru `agents.none` dari
  `docs/troubleshooting.md:37-38` di kedua katalog; `cli.claudeMissing` dan
  `cli.claudeLogin` dihapus karena pemanggilnya hilang.
- `doctor`: `agentChecks()` — satu baris per agent ditemukan, versinya di
  baris itu; baris login Claude hanya bila `claude` termasuk; agent yang tidak
  terpasang tidak digambar dan tidak memerahkan hasil; nol agent = satu baris
  merah berisi remedi (AC-9.9–9.11).

### 9 · Workflow CI pertama — terbangun, tanpa matriks smoke

Berkas: `.github/workflows/ci.yml` (baru).

- Job `verify`: empat perintah gerbang pada push/PR (AC-10.1),
  `timeout-minutes: 15`.
- Job `presets`: setiap `presets/agents/*.yaml` lewat loader + skema Zod
  (gagal validasi atau jumlah id ≠ jumlah berkas → merah), lalu test preset
  dan fixture parser via `--test-name-pattern` (AC-10.5).
- Matriks smoke per binari **tidak dibangun**: runner CI tidak punya satu pun
  agent maupun kredensialnya, dan komentar di workflow mengatakannya alih-alih
  memalsukan cakupan. Smoke hidup tetap `npm run smoke` per mesin;
  AC-10.2–10.4 diamendemen pada langkah dokumen bersama status ini.

### 10 · Dokumen, bukti gerbang fase, tutup

Berkas: `docs/api.md`, `docs/design.md`, `docs/security.md`, `docs/ui-ux.md`,
`docs/erd.md`, `docs/roadmap.md`, `CHANGELOG.md`, preset kedelapan sekali
pakai.

- Amandemen sesuai tabel di akhir spec (K1, K2, K3, status `/ws` `/switch`,
  run bersamaan, catatan erd, centang roadmap + catatan DoD manusia
  pasca-rilis, CHANGELOG 0.4.0).
- Bukti AC-2.1: tambah preset kedelapan di commit tersendiri, tempel
  `git diff --stat` yang memperlihatkan nol berkas `src/core/`, lalu commit
  itu dipertahankan atau preset percobaannya dicabut — dua-duanya sah, yang
  ditempel adalah stat-nya.
- Ukur ulang LOC `src/`, tempel di bagian Verifikasi (AC-2.2).

## Pemetaan AC → pembuktian

| AC | Cara pembuktian |
|---|---|
| AC-1.1 | e2e: kedua fake tanpa cast; typecheck lulus |
| AC-1.2 | keluaran `npm test` + `npm run e2e` pada commit langkah 1, ditempel |
| AC-1.3 | `grep -rn "@agentclientprotocol/sdk" src/core/` kosong, ditempel |
| AC-2.1 | `git diff --stat` commit preset kedelapan (langkah 10), ditempel |
| AC-2.2 | `wc -l` `src/` ditempel di Verifikasi |
| AC-3.1 | unit: skema menerima tujuh preset nyata |
| AC-3.2 | unit: preset cacat → error menyebut berkas + field, preset lain termuat |
| AC-3.3 | pemeriksaan manual: diff berkas vs `docs/design.md:162-183` dan `docs/api.md:16-28`, hasil ditulis di sini |
| AC-3.4 | unit: keempat berkas ber-`driver: acp` + blok `acp:` |
| AC-3.5 | `grep -L "belum diverifikasi" presets/agents/aider.yaml` gagal (marker ada); pemeriksaan manual flag lain |
| AC-4.1–4.2 | unit: spawn stub merekam argv, cwd, env |
| AC-4.3–4.5 | unit: arg vs stdin vs ambang `maxPromptArgChars` |
| AC-4.6–4.8 | unit: parser vs `test/fixtures/` per format |
| AC-4.9 | e2e langkah 2: update teks sampai ke channel palsu |
| AC-4.10 | unit: `setMode` resolve tanpa efek |
| AC-4.11–4.12 | unit: stub yang mengabaikan SIGTERM menerima SIGKILL setelah grace |
| AC-4.13 | unit: exit 1 + stderr → error discrub, tanpa stack trace di pesan |
| AC-5.1–5.3 | unit: `buildDriver` (command hilang → CLI) + registry (adapter mati saat initialize → CLI); keduanya digagalkan → error i18n |
| AC-5.4–5.5 | unit: config `workspaces[].driver` menimpa urutan otomatis; registry menolak menyilang rute paksa |
| AC-6.1–6.2 | unit: parse config lama & baru menghasilkan daftar setara |
| AC-6.3 | unit: buka file DB v0.3 → kolom hadir, data lama utuh |
| AC-6.4–6.10 | e2e: skenario routing per baris tabel `docs/session-model.md:96-101` |
| AC-6.11 | e2e dua-workspace: grant dan scope memori mengikuti workspace sesi; `grep "config.workspace" src/core/gateway.ts` menyisakan nol pembacaan per-run, ditempel |
| AC-7.1–7.3 | e2e dua-workspace paralel (langkah 6) |
| AC-7.4–7.5 | e2e: `/stop` memilih workspace; shutdown membatalkan semua |
| AC-7.6 | unit rate limiter yang ada tetap hijau |
| AC-8.1–8.2 | e2e: `/switch` valid dan invalid; jalur produksinya di test preset dummy — giliran setelah `/switch` benar berjalan di preset lain |
| AC-8.3 | `grep` string mode agent di `src/` + i18n kosong, ditempel |
| AC-8.4 | e2e: `/ws` dari topic dijawab thread kosong (General) |
| AC-9.1, AC-9.4–9.6 | unit: "discovery scans PATH…" — PATH palsu (direktori stub eksekusi), jam palsu; AC-9.2–9.3 dicabut di spec |
| AC-9.7–9.8 | unit: "init stops with the remedy…" — cache nol-agent → `main(["init"])` berhenti dengan `agents.none`; probe keras Claude terbukti absen dari sumber |
| AC-9.9–9.11 | unit: "doctor rows: one per discovered agent…" pada dua susunan agent |
| AC-10.1, AC-10.5 | workflow di `.github/workflows/ci.yml`; run pertamanya diverifikasi di GitHub saat push (belum bisa dari mesin ini) |
| AC-10.2–10.4 | tidak dibangun — tanpa agent di runner, matriks probe hanya menghasilkan skip; lihat langkah 9, amandemen spec di langkah 10 |

## Risiko

- **Gateway 1195 baris membengkak.** Estimasi tarikan brief ~700 baris untuk
  seluruh fase; headroom 4.623. Kalau langkah 6 mendorong gateway melewati
  ~1.500, pecah modul routing workspace ke berkas core terpisah — bukan
  menunda AC.
- **ALTER pada DB hidup.** Dijaga `PRAGMA table_info` dan diuji terhadap file
  DB v0.3 nyata; DEFAULT '' membuat baris lama tetap valid (baris lama = 
  workspace tunggal yang diangkat).
- **Command ACP gemini/cursor/goose/amp belum diuji di mesin ini.** Ditandai
  jujur di berkasnya (AC-3.5); CI probe membuat klaimnya bisa gugur di runner
  yang punya binarinya, bukan diklaim hijau di sini.
- **`/stop` dan grant per-workspace mengubah jalur approval.** Semua jalur
  yang disentuh punya test (aturan `AGENTS.md:69`); e2e approval yang ada
  wajib tetap hijau tanpa perubahan assertion di luar langkah 6.
- **Jalur CLI tanpa hook izin.** Persetujuan di rute ini jatuh ke rem
  agent-nya sendiri: sandbox codex (`--sandbox read-only`) dan konfirmasi
  bawaan aider (`--yes-always` dicabut dari presetnya — flag auto-setuju tanpa
  sandbox berarti eksekusi tanpa persetujuan siapa pun). Kebijakan lokal level
  prompt dari `docs/design.md:187` belum dibangun, dan field config yang
  menjanjikannya (`workspaces[].mode`) dicabut sampai gerbangnya ada.

## Verifikasi

Keempat perintah, keluarannya ditempel di sini per langkah sebelum pindah ke
`done/` (standar `standards/ears.md` Tahap 4):

```bash
npm run lint
npm run typecheck
npm test
npm run e2e
```

Ditambah dua pemeriksaan tanpa alat: tanpa rahasia di diff, prosa lolos
*Writing style* `AGENTS.md`. LOC `src/` pasca-merge dicatat di sini (AC-2.2,
dasar 3.377).

### Bukti — 8 Agustus 2026, langkah 8–9 + test AC tersisa

Keempat perintah dalam satu rantai, exit 0:

```
> caraka@0.3.0 lint
> oxlint src test scripts && oxfmt --check src test scripts bin package.json tsconfig.json
All matched files use the correct format.
Finished in 89ms on 24 files using 24 threads.

> caraka@0.3.0 typecheck
> tsc -p tsconfig.json --noEmit

> caraka@0.3.0 test
> node --import tsx --test test/unit.test.ts
ℹ tests 49
ℹ pass 49
ℹ fail 0
ℹ duration_ms 1824.330829

> caraka@0.3.0 e2e
> node --import tsx --test test/e2e.test.ts
ℹ tests 34
ℹ pass 34
ℹ fail 0
ℹ duration_ms 11946.627236
```

Grep bukti:

```
$ grep -rn "@agentclientprotocol/sdk" src/core/        # AC-1.3
(kosong)
$ grep -n "config.workspace" src/core/gateway.ts       # AC-6.11
(kosong)
```

LOC `src/` (AC-2.2): **4.272** dari anggaran 8.000 (dasar 3.377, +895) —
gateway 1438, cli 591, db 405, telegram 302, i18n 286, drivers/cli 180,
security 169, config 155, discovery 137, claude-acp 126, service 112, sisanya
preset/driver/memory.

Temuan selama gerbang: test e2e "a group is paired…" flaky satu banding 64 —
pemalsuan tanda tangan menambahkan huruf `x` konstan, yang kebetulan sama
dengan huruf terakhir tanda tangan base64url asli sehingga "pemalsuan" itu
terverifikasi dan grup benar-benar ter-pair. Diperbaiki dengan helper
`forged()` yang selalu mengubah huruf terakhir, dan harness kini menutup semua
gateway lewat `after()` supaya assertion yang gagal tidak meninggalkan loop
polling yang menggantung seluruh proses test.

Belum ditempel karena butuh langkah berikutnya: bukti AC-2.1 (`git diff
--stat` commit preset kedelapan, langkah 10) dan run pertama workflow di
GitHub (butuh push, menunggu pemilik).

### Bukti — 8 Agustus 2026, tinjauan pra-tutup

Blok Bukti sebelumnya menandai langkah 5 selesai; tinjauan menemukan registry
per sesi belum ada — satu driver global melayani semua sesi, `session.agent`
hanya ditulis, dan `switch.done` menjanjikan pergantian yang tidak terjadi.
Diperbaiki hari yang sama:

- Registry per sesi dibangun (`driverRegistry` di `src/cli.ts`, tipe
  `DriverFor` di `src/core/driver.ts`); gateway mengambil driver per run dari
  `session.agent` + `workspaces[].driver`, dan menghentikan semua driver yang
  pernah diambil saat shutdown. `/switch` kini benar mengganti preset giliran
  berikutnya, dibuktikan e2e preset dummy lewat jalur produksi.
- Adapter ACP yang spawn lalu mati sebelum initialize jatuh ke rute CLI preset
  yang sama (AC-5.2 sisi runtime), diuji unit; rute paksa tidak menyilang.
- Skema preset dipangkas ke field yang dibaca kode (K2 direvisi di spec);
  `sessionMode`/`systemPromptArg`/`modelArg`/`imageArg` dan kawannya keluar
  dari skema dan dari `claude-code.yaml` + `codex.yaml`.
- `workspaces[].mode` dicabut dari config: tervalidasi tapi tidak pernah
  dibaca, dan sebuah field yang tampak seperti kontrol keamanan tanpa gerbang
  di jalur run lebih berbahaya daripada tidak ada.
- `--yes-always` dicabut dari `aider.yaml`: driver CLI tidak memanggil hook
  izin, jadi auto-setuju tanpa sandbox berarti eksekusi tanpa persetujuan.
- Pembacaan ACP Registry dihapus dari discovery (AC-9.2–9.3 dicabut di spec):
  tidak ada pembacanya.

Keempat perintah, exit 0:

```
> caraka@0.3.0 lint
> oxlint src test scripts && oxfmt --check src test scripts bin package.json tsconfig.json
All matched files use the correct format.
Finished in 87ms on 24 files using 24 threads.

> caraka@0.3.0 typecheck
> tsc -p tsconfig.json --noEmit

> caraka@0.3.0 test
> node --import tsx --test test/unit.test.ts
ℹ tests 50
ℹ pass 50
ℹ fail 0

> caraka@0.3.0 e2e
> node --import tsx --test test/e2e.test.ts
ℹ tests 34
ℹ pass 34
ℹ fail 0
```

LOC `src/` (AC-2.2): **4.290** dari anggaran 8.000 — gateway 1461, cli 624,
db 405, telegram 302, i18n 286, drivers/cli 180, security 169, config 156,
claude-acp 126, service 112, discovery 99, preset 87, driver 66, sisanya
memory.

### Bukti — 8 Agustus 2026, gerbang penutup rilis 0.4.0

Dijalankan sekali lagi setelah seluruh suntingan langkah 10: dokumen
(`docs/roadmap.md`, `docs/api.md` §1 dan §5, `docs/security.md` §9,
`docs/ui-ux.md`, `docs/design.md` §2.3/§3/§4/§8, `docs/erd.md` aturan 4,
`docs/troubleshooting.md`), `CHANGELOG.md` 0.4.0, `package.json` 0.4.0,
`VERSION` di `src/cli.ts` dan default versi gateway, serta
`site/src/data/{status,landing}.ts`.

Satu amandemen bentuk bukti: AC-2.1 dulu dipetakan ke `git diff --stat` sebuah
*commit* preset kedelapan. Penutupan rilis ini dibatasi dua commit (fitur +
rilis), jadi buktinya diambil dari staging, bukan commit: preset kedelapan
ditulis, di-`git add` sendirian, stat-nya ditempel, lalu berkasnya dicabut.
Klaim yang dibuktikan sama persis — menambah agent adalah satu berkas, nol
berkas `src/core/` — dan separuh runtime-nya tetap dipegang test e2e
`one dummy preset YAML drives a full turn to the channel through the CLI
driver`.

```
$ git add presets/agents/dummy-eighth.yaml && git diff --cached --stat
 presets/agents/dummy-eighth.yaml | 7 +++++++
 1 file changed, 7 insertions(+)
$ node --import tsx -e '…loadPresets()…'
loaded: aider, amp, claude-code, codex, cursor, dummy-eighth, gemini, goose
errors: 0
```

Gerbang akar, keempat perintah exit 0, baris per-test dipangkas:

```
> caraka@0.4.0 lint
> oxlint src test scripts && oxfmt --check src test scripts bin package.json tsconfig.json
All matched files use the correct format.
Finished in 109ms on 24 files using 24 threads.

> caraka@0.4.0 typecheck
> tsc -p tsconfig.json --noEmit

> caraka@0.4.0 test
> node --import tsx --test test/unit.test.ts
ℹ tests 50
ℹ pass 50
ℹ fail 0

> caraka@0.4.0 e2e
> node --import tsx --test test/e2e.test.ts
ℹ tests 34
ℹ pass 34
ℹ fail 0
```

Gerbang situs, karena `status.ts`, `landing.ts`, dan satu baseline tinggi ikut
disentuh:

```
$ cd site && npm run check
oxlint: tanpa keluaran (0 masalah)
astro check: Result (44 files): 0 errors, 0 warnings, 0 hints
vitest: Test Files 2 passed (2) · Tests 26 passed (26)

$ npm run e2e
2 skipped
110 passed (46.1s)
```

Baseline `/status` di `site/e2e/site.spec.ts` bergeser 6160 → **6788**, diukur
dari run e2e Chromium 1440x900 setelah kartu 0.4.0 dan gerbang terbuka kelima
masuk; kartu 0.3.0 dulu tidak menggeser apa pun. Baris landing v0.4 (lima chip
"preset" dan kartu CLI yang kembali ke kata-kata comp-nya) tidak menggeser `/`.

LOC `src/` penutup (AC-2.2): **4.290** dari anggaran 8.000 — tidak berubah
dari tinjauan pra-tutup; suntingan sesudahnya hanya mengganti isi baris versi.

Dua pemeriksaan tanpa alat: tidak ada rahasia di diff (yang disentuh hanya
dokumen, katalog i18n, data situs, dan string versi), dan prosa diperiksa
terhadap *Writing style* `AGENTS.md`. Run pertama workflow CI di GitHub tetap
menunggu push oleh pemilik.
