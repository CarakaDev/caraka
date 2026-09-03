# Plan — proses-tak-berakhir

**Spec:** [`spec.md`](spec.md)

## Bentuk perbaikannya

Dua driver menjalankan proses, dan keduanya sudah lewat satu fungsi:
`claudeEnvironment()` di `drivers/claude-acp.ts`, yang komentarnya sendiri
menyebut alasannya — "one filter closes both". Perbaikan ini memakai jalan yang
sama, jadi tidak ada jalur ketiga yang bisa lupa.

```ts
// drivers/claude-acp.ts
export function claudeEnvironment(source = process.env) {
  return { ...filtered, GIT_TERMINAL_PROMPT: "0" };
}

const ownGroup = process.platform !== "win32";

export function spawnAgent(command: string, args: string[], env, cwd?) {
  return spawn(command, args, { cwd, env, stdio: ["pipe", "pipe", "pipe"], detached: ownGroup });
}

export function endTree(child: ChildProcessWithoutNullStreams, signal: NodeJS.Signals) {
  if (child.pid === undefined) return;
  try {
    if (ownGroup) process.kill(-child.pid, signal);
    else child.kill(signal);
  } catch {
    // Grup yang sudah tidak ada bukan kegagalan (AC-2.4).
  }
}
```

`ownGroup` adalah satu konstanta, dibaca oleh
`spawnAgent` dan `endTree` sekaligus. Keduanya harus sepakat: satu proses yang
di-spawn tanpa grup sendiri lalu disinyalkan lewat pid negatif akan membunuh grup
Caraka sendiri. Menaruh keputusannya di satu tempat adalah yang mencegah itu.

`env` tetap argumen, bukan dibaca di dalam, karena `preset.env` harus ditulis
sesudah environment bersama supaya sebuah preset tetap menang (AC-1.4).

## Langkah

1. **Tiga test yang harus merah tanpa perbaikannya.** Stub agent menerima mode
   baru `FAKE_GRANDCHILD`, yang menjalankan satu proses cucu, menulis pid-nya ke
   sebuah berkas, lalu mengabaikan SIGTERM seperti mode `FAKE_IGNORE_TERM` yang
   sudah ada; stub ACP menerima `FAKE_ACP_CHILD` untuk hal yang sama.
   Keadaan merahnya diambil sesudah kodenya ada, dengan tiga baris perbaikan
   dibalikkan di worktree verifikasi — lihat bagian *Merah dulu* di bawah.
2. **`claudeEnvironment`, `spawnAgent`, `endTree`** di
   `src/drivers/claude-acp.ts`. `ClaudeAcp.start()` memakai `spawnAgent`, dan
   `ClaudeAcp.stop()` memakai `endTree(child, "SIGTERM")` (AC-2.5).
3. **`src/drivers/cli.ts`** memakai `spawnAgent` untuk run, lalu `endTree` dua
   kali di `cancel`: SIGTERM lebih dulu, SIGKILL sesudah `killGraceMs`
   (AC-2.1, AC-2.2). Penjaga `exitCode === null && signalCode === null` tetap,
   karena eskalasinya masih milik proses agent — yang berubah cuma jangkauan
   sinyalnya.
4. **`runner.timeoutMinutes`** di `src/config.ts`, satu objek opsional dengan
   satu kunci, `z.number().int().positive()`. Tidak ada batas atas: angkanya
   milik operator, dan menciptakan langit-langit di sini berarti menuliskan satu
   angka yang tidak punya sumber.
5. **`runLimitMs(config)`** di `src/config.ts`, satu pembaca di sebelah
   `workspaces()`, dan satu baris di `src/cli.ts` yang mengisi argumen gateway
   yang sekarang `undefined`. Pembacanya jadi fungsi terpisah supaya baris yang
   menentukan angkanya bisa diuji; bentuknya meneruskan `undefined` ketika
   kuncinya tidak ada, jadi angka 30 tetap berada di satu tempat saja —
   `RUN_LIMIT_MS` di gateway (AC-3.2).
6. **Tes untuk AC-2.4, AC-3.1, AC-3.2, AC-3.3.**
7. **Dokumen.** `docs/troubleshooting.md` §Coding agent dan pasangan Inggrisnya:
   satu entri baru untuk galat kredensial `git`, dan blok `runner:` yang sudah
   ada di sana tetap — ia baru benar hari ini. `docs/design.md:266` menuliskan
   grup prosesnya, karena baris itulah yang menjanjikan `SIGTERM` → `SIGKILL`.

## Pemetaan pembuktian

Rencana ini semula memakai `process.getpgid` untuk membaca grup proses anak.
Fungsi itu tidak ada di Node — yang ada `process.getgid`, dan `getpgid` bukan
bagian dari API-nya. Jadi AC-1.1 dibuktikan lewat perilakunya: satu cucu yang
hanya bisa mati bila sinyalnya mengenai grup. AC-1.2 tidak punya test, dan
sebabnya ditulis di baris itu.

| AC | Cara dibuktikan |
|---|---|
| AC-1.1 | Unit: cucu yang dijalankan agent mati saat run dibatalkan — hanya mungkin bila grupnya ada |
| AC-1.2 | Tidak diuji. Tidak ada mesin Windows di gerbang ini, dan kedua cabangnya membaca satu konstanta di satu berkas, yang justru dipilih supaya keduanya tidak bisa berbeda |
| AC-1.3 | Unit: `claudeEnvironment({}).GIT_TERMINAL_PROMPT === "0"`, dan sekali lagi pada proses yang benar-benar berjalan lewat `FAKE_RECORD` |
| AC-1.4 | Unit: run penuh lewat `CliDriver` dengan `env: { GIT_TERMINAL_PROMPT: "1" }`, dibaca dari `FAKE_RECORD` |
| AC-1.5 | Unit: dua tes yang sudah ada, diperbarui untuk kunci baru itu |
| AC-2.1 | Unit: tes SIGTERM → SIGKILL yang sudah ada tetap hijau |
| AC-2.2 | Unit: tes itu juga — stub-nya mengabaikan SIGTERM, jadi hanya eskalasi yang mengakhirinya |
| AC-2.3 | Unit: pid cucu dari `FAKE_GRANDCHILD`, dipoll dengan `process.kill(pid, 0)` sampai mati |
| AC-2.4 | Unit: `cancel` dipanggil dua kali; yang kedua tidak melempar |
| AC-2.5 | Unit: `ClaudeAcp.stop()` pada adapter palsu, lalu cucunya diperiksa sama seperti AC-2.3 |
| AC-3.1 | Unit: config dengan `runner.timeoutMinutes: 90` menghasilkan `runLimitMs` 5.400.000 |
| AC-3.2 | Unit: config tanpa `runner` meneruskan `undefined`; sisi gateway sudah dijaga harness e2e yang menjalankan `runLimitMs: 40` |
| AC-3.3 | Unit: `0`, `-5`, dan `1.5` ditolak `loadConfig` dengan pesan yang menyebut `timeoutMinutes` |
| AC-4.1 | Manual, dijalankan di `rama-tuf` lewat `spawnAgent` yang sudah dibangun, di dalam pty (`/dev/pts/1`) |
| AC-4.2 | Manual: kedua berkas troubleshooting dibaca |

## Yang bisa retak

- **Sebuah cucu yang mengandalkan grup proses Caraka.** Tidak ada yang diketahui,
  dan pipa stdio tidak berubah, jadi setiap agent yang berjalan hari ini tetap
  berjalan. Yang berubah adalah sinyal terminal, dan itu tercatat sebagai batas
  di spec.
- **`process.kill(-pid)` sesudah proses keluar** melempar `ESRCH`. Ditangkap.
  Tanpa itu, `stop()` pada driver yang sudah mati akan mengakhiri shutdown lebih
  awal.
- **`detached` dan tipe TypeScript.** `spawn` mengembalikan
  `ChildProcessWithoutNullStreams` karena `stdio` berupa tuple tiga `"pipe"`;
  `detached` tidak mengubah overload itu. Dibuktikan `npm run typecheck`.
- **Tes cucu bisa jadi flaky di mesin yang lambat.** Ia menunggu berkas pid ada
  lalu memoll sampai proses itu hilang, dengan batas waktu, bukan tidur satu
  angka tetap.

## Merah dulu

Dijalankan di `rama-tuf`, pada worktree commit ini, dengan tiga baris perbaikan
dibalikkan (`GIT_TERMINAL_PROMPT` dihapus, `detached: false`, `endTree` selalu
menyinyalkan proses saja):

```
✖ a spawned agent inherits nothing Caraka named to itself
  actual:   [ 'CLAUDE_CONFIG_DIR', 'PATH' ]
  expected: [ 'CLAUDE_CONFIG_DIR', 'GIT_TERMINAL_PROMPT', 'PATH' ]
✖ stopping the ACP route ends the adapter's tree
  AssertionError: the adapter's own child outlived the driver — true !== false
✖ cancelling a run ends what the agent started, not just the agent
  AssertionError: the agent's own child outlived the run
```

AC-3 tidak punya keadaan merah yang bisa dijalankan: `runner` tidak ada di
skema sebelum commit ini, jadi tidak ada tipe untuk dibaca test. Buktinya
statis — `git show HEAD~1:src/config.ts | grep -c runner` menjawab `0`, dan
itulah sebabnya angka di dokumen tidak pernah dipakai.

## Gejala yang dilaporkan, diukur dua kali

Di `rama-tuf`, satu terminal pengendali yang sama (`/dev/pts/1`), `git` tanpa
credential helper, repositori yang butuh kredensial:

```
sebelum (spawn seperti 1.5.9)   Cloning into '/tmp/proof15-before'...
                                Username for 'https://github.com':
                                >>> STILL WAITING AFTER 10s: the run hangs

sesudah (lewat spawnAgent)      Cloning into '/tmp/proof15-clone'...
                                fatal: could not read Username for
                                'https://github.com': terminal prompts disabled
                                >>> exit 128 after 467 ms
```

## Gate

```bash
ssh rama-tuf 'bash -lc "cd /tmp/caraka-15 && npm run verify"'
```

```
> caraka@1.5.9 scan:secrets
clean: 325 tracked files, no credentials
> caraka@1.5.9 lint          oxlint + oxfmt --check     (tanpa keluaran)
> caraka@1.5.9 typecheck     tsc -p tsconfig.json --noEmit
> caraka@1.5.9 build         tsc -p tsconfig.json
> caraka@1.5.9 test
ℹ tests 177
ℹ pass 177
ℹ fail 0
> caraka@1.5.9 e2e
ℹ tests 108
ℹ pass 108
ℹ fail 0
> caraka-site@0.0.1 test
 Test Files  2 passed (2)
      Tests  35 passed (35)
```

Dijalankan pada worktree `/tmp/caraka-15` di `rama-tuf`, bukan di mesin ini.
Nomor rilisnya masih `1.5.9` di keluaran itu karena versi dinaikkan pada commit
rilis, sesudah gerbang ini hijau.
