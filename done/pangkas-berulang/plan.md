# Plan — pangkas-berulang

**Spec:** `spec/pangkas-berulang.md` · **Tanggal:** 14 Agustus 2026

## Langkah

1. **Ukur dulu.** `find src -name "*.ts" | xargs wc -l` sebelum apa pun disentuh.
   Angkanya masuk ke bagian *Ukuran* di bawah.

2. **`src/core/channel.ts` — `fetchWithRetry`.** Satu fungsi diekspor di bawah
   `evict`, di antara helper yang sudah dipakai setiap channel dan tidak ada
   yang membutuhkannya berbeda. Bentuknya:

   - `send: () => Promise<Response>` — permintaan milik adapter, utuh. Header
     otorisasi dibangun di dalam closure itu dan tidak pernah keluar darinya.
     Helper tidak punya parameter `init`, jadi tidak ada yang bisa dibacanya.
   - `sleep: (ms: number) => Promise<unknown>` — Discord menyerahkan `delay`
     Node, WhatsApp menyerahkan `this.sleep` yang sudah jadi seam test-nya.
   - `fail: (sentence: string, status?: number) => Error` — kelas error tetap
     milik adapter, jadi `DiscordError` tetap `DiscordError`.
   - `unreachable` dan `refused` — dua kalimat yang sudah diterjemahkan.
     Keduanya sudah dibagi lewat `channel.unreachable` dan `channel.refused` di
     `src/i18n.ts` dan hanya berbeda pada nama channel yang diserahkan
     pemanggil, jadi helper tidak pernah tahu channel mana yang memanggil.
   - `retryAfter?: (response: Response) => Promise<number | undefined>` —
     cadangan tingkat badan. Hanya Discord menyerahkannya, karena hanya Discord
     yang menaruh `retry_after` di badan ketika headernya hilang.

   Yang dikembalikan adalah `Response`, bukan badan yang sudah diurai: 204
   milik Discord dan tidak ada padanannya di WhatsApp, jadi pembacaan badan
   tetap di adapter.

3. **`src/channels/discord.ts` — `call()` memakai helper.** Header
   `authorization: Bot ${this.token}`, penyebaran `init`, cabang 204, dan
   pembacaan `retry_after` dari badan semuanya tetap di berkas ini. Komentar
   "The wait comes off the response, never off a number written down here"
   ikut pindah ke tempat angka itu sekarang dibaca.

4. **`src/channels/whatsapp.ts` — `graph()` memakai helper.** Header
   `authorization: Bearer …`, `this.sleep`, dan `WhatsAppError` tetap di sini.
   Tidak ada `retryAfter`: Cloud API tidak menaruh angka di badan, dan
   cadangan 1 detik di helper adalah angka yang sama dengan sebelumnya.

5. **`src/store/db.ts` — `columns(table)`.** Satu metode privat mengembalikan
   `Set<string>`. Dua komentar di atas kedua pemindaian tidak disentuh sama
   sekali; keduanya mencatat kenapa migrasinya berbentuk begitu, dan yang
   `ponytail:` juga mencatat kapan ledger bernomor harus dibangun.

6. **`src/core/gateway.ts` — `sessionOf(message)`.** Namanya bukan `sessionFor`
   karena `sessionFor(message, title, workspace)` sudah ada di berkas ini dan
   artinya lain: yang lama membuat sesi bila belum ada. Enam pemanggil yang
   hanya butuh sesinya: `switchAgent`, `knownAgentCommand`, `listCommands`,
   `reportUsage`, `sessionFor` sendiri, dan `decideByCode`. Tiga yang tidak
   ikut — `workspaceForMessage`, `routeTask`, `status` — masih memakai `chatId`
   atau `threadId` sesudahnya.

7. **`src/core/gateway.ts` — bingkai memori.** `withMemory(message, body)`
   memegang gerbang "tidak ada penyedia" dan `catch`; tiga perintah tinggal
   mengembalikan kalimatnya. `sendGeneral` dipanggil di luar `try`, sama
   seperti sekarang: pada bentuk yang ada, `return this.sendGeneral(...)` di
   dalam `try` tidak pernah tertangkap `catch` di bawahnya — sebuah `return`
   dari promise di dalam `try` tidak melewati `catch` blok itu — jadi
   memindahkannya ke luar mempertahankan perilaku dan bukan mengubahnya.
   Penyedia diserahkan sebagai argumen supaya penyempitan tipe tidak hilang di
   dalam closure.

8. **`src/cli.ts` — `configForLanguage()`.** Satu fungsi modul, dipakai `caraka
   fix` dan `caraka uninstall`. `.catch(() => null)` dipertahankan apa adanya,
   bukan ditukar bentuk dua-argumen `then`: yang kedua tidak menangkap error
   dari callback pertama, dan menukarnya adalah perubahan perilaku sekecil apa
   pun peluangnya menyala.

9. **Ukur lagi**, lalu tulis bagian complexity budget di `AGENTS.md` dengan
   hasilnya, dalam suara paragraf yang sudah ada di sana.

10. **Gerbang.** `npm run verify` dari akar repositori. Keluarannya ditempel apa
    adanya.

## Pemetaan AC → pembuktian

| AC | Pembuktian |
|---|---|
| AC-1.1 | `grep -c "status === 429" src/channels/*.ts src/core/channel.ts`: satu di `core/channel.ts`, nol di `channels/discord.ts` dan `channels/whatsapp.ts` |
| AC-1.2 | Test unit "Discord waits out a 429 from the response and repeats the same call" (`test/unit.test.ts`): header `retry-after: 0.05`, dua panggilan ke `/users/@me`, dan jarak waktu ≥ 45 md |
| AC-1.3 | Test e2e "a Discord slash command opens a thread…" lewat `force429()` (`test/e2e.test.ts`): header ada, jadi cabang cadangan tidak diuji di sana. Cabang badan Discord dan cadangan 1 detik **tidak punya test**; keduanya dibaca berdampingan terhadap versi lama, ekspresi demi ekspresi, dan disebut apa adanya di *Yang tidak terbukti oleh test* |
| AC-1.4 | Bacaan tanda tangan `fetchWithRetry`: tidak ada parameter `init`, tidak ada `JSON.stringify`, tidak ada `log`. `grep -n "authorization" src/core/channel.ts` kosong |
| AC-1.5 | Bacaan: `sleep` diteruskan Discord sebagai `delay` Node dan WhatsApp sebagai `this.sleep`, dan test 429 Discord membuktikan tundaannya benar-benar dijalankan (≥ 45 md). Seam WhatsApp sendiri **tidak punya test** di jalur ini |
| AC-1.6 | **Tidak ada test.** Tidak ada satu pun test yang membuat `fetch` melempar sebelum ada respons; `channel.unreachable` hanya disentuh test bentuk katalog (`test/unit.test.ts:3454`). Dibaca berdampingan |
| AC-1.7 | Test unit `assert.rejects(discord.createTopic(…), /Discord refused/)` (`test/unit.test.ts:3223`), lewat respons 403 di harness |
| AC-1.8 | **Tidak ada test.** Harness Discord punya `json(value, status = 204)` tapi tidak satu pemanggil pun memakai argumen status, jadi 204 tidak pernah keluar di suite. Cabangnya dipindahkan utuh dan tidak disentuh |
| AC-1.9 | `grep -n "channel.id\|\.id ===" src/core/channel.ts` di `fetchWithRetry`: kosong. Test hard-rule-1 yang sudah ada tetap hijau |
| AC-1.10 | `grep -n "fetchWithRetry" src/channels/telegram.ts`: kosong |
| AC-2.1 | Test unit yang membuka `Store` pada berkas lama (migrasi kolom) tetap hijau; `grep -c "PRAGMA table_info" src/store/db.ts` = 1 |
| AC-2.2 | Baca `src/store/db.ts` berdampingan dengan `git diff`: kedua blok komentar nol perubahan |
| AC-2.3 | `git diff src/store/db.ts`: baris `ALTER TABLE` dan `CREATE UNIQUE INDEX` tidak berubah |
| AC-3.1 | `grep -c "this.store.sessionFor(chatId, threadId)" src/core/gateway.ts` turun dari 11 ke 6, yaitu enam pemanggil hilang dan helper-nya sendiri masuk; suite e2e `/switch`, `/commands`, `/usage`, dan kartu kode pendek tetap hijau |
| AC-3.2 | Baca ketiga pemanggil yang tidak ikut: masing-masing masih membaca `chatId` atau `threadId` di baris berikutnya |
| AC-4.1 | Test e2e "without a provider the commands say memory is off and the prompt is untouched" |
| AC-4.2 | **Tidak ada test.** `memory.failed` tidak muncul di `test/`; bingkainya dibaca berdampingan dan disebut di *Yang tidak terbukti oleh test* |
| AC-4.3 | Bacaan struktur: `sendGeneral` satu kali, di bawah `try`/`catch`, bukan di dalamnya |
| AC-4.4 | Bacaan ketiga badan: tidak ada percabangan atas nama perintah |
| AC-5.1 | `grep -c "loadConfig()$" src/cli.ts` = 1, dan bacaan kedua pemanggil |
| AC-5.2 | **Tidak ada test.** Test yang ada memanggil `doctorFix()` langsung sebagai fungsi (`test/unit.test.ts:4971`), bukan lewat perintah `doctor`, jadi empat baris itu tidak pernah dijalankan suite. Tersalin verbatim |
| AC-6.1 | Dua keluaran `wc -l` di bagian *Ukuran* |
| AC-6.2 | Baca paragraf baru di `AGENTS.md` |
| AC-7.1 | `git status --short test/` kosong, dan keluaran `npm run verify` di bawah |

## Risiko

**Yang paling mahal adalah langkah 2 sampai 4.** Gelung itu ada di jalur yang
memegang token bot. Tiga hal yang bisa salah, dan cara masing-masing ditutup:

- Token bocor ke pesan error. Ditutup dengan bentuk helper: tidak ada parameter
  yang bisa memuat header, jadi tidak ada yang bisa dirangkai. `send` adalah
  closure buta dari sisi helper.
- Discord kehilangan cadangan `retry_after` di badan dan menunggu 1 detik di
  tempat Discord meminta lebih. Ditutup dengan `retryAfter` yang tetap
  diserahkan Discord dan dibaca sebelum cadangan 1 detik dipakai.
- Discord kehilangan cabang 204 dan `JSON.parse` badan kosong. Ditutup dengan
  mengembalikan `Response` mentah, jadi cabang itu tetap di adapter.

Satu hal berubah waktunya, bukan hasilnya. Dulu `this.t("channel.unreachable")`
hanya dipanggil di dalam `catch` dan `this.t("channel.refused")` hanya di cabang
`!ok`; sekarang keduanya dihitung sebelum permintaan dikirim, karena helper
menerimanya sebagai kalimat jadi. `translator()` mengembalikan closure murni —
satu lookup katalog dan satu `replace`, tanpa I/O dan tanpa efek samping — jadi
yang bertambah adalah dua pembentukan string per permintaan REST dan bukan
perilaku. Keduanya juga ada di kedua katalog, dan sebuah test sudah memeriksa
bentuk `channel.unreachable`, jadi tidak ada kunci hilang yang bisa melempar
lebih awal karena perpindahan ini.

Satu hal lagi berubah, dan arahnya mengurangi pekerjaan. Versi lama Discord
selalu membaca badan respons 429 — `await response.json()` dijalankan sebelum
header diperiksa — lalu membuang hasilnya kalau headernya ternyata sah. Sekarang
badan hanya dibaca ketika headernya tidak bisa dipakai, karena helper memanggil
`retryAfter` di cabang itu saja. Responsnya dibuang setelah itu di kedua versi,
jadi tidak ada yang bisa mengamati bedanya; urutan bacanya tetap header dulu.
Dicatat di sini supaya klaim "perilaku identik" di atas berarti apa yang
diperiksa, bukan apa yang diharapkan.

Risiko kedua: lipatan yang tidak membayar. Beberapa di antaranya menukar baris
berulang dengan baris helper hampir satu banding satu. Angka terukur di bawah
adalah jawabannya, dan kalau sebuah lipatan ternyata menambah baris tanpa
menghapus pengulangan, ia dibatalkan, bukan dibela dengan prosa.

## Ukuran

```
$ find src -name "*.ts" | xargs wc -l | grep total
  9633 total      # sebelum
  9668 total      # sesudah
```

**Lintasan ini menambah 35 baris, bukan mengembalikannya.** Dua puluh empat
berkas, tidak ada yang ditambah atau dihapus. Angkanya ditulis apa adanya
karena itulah hasil yang diukur, dan risiko kedua di atas — "lipatan yang tidak
membayar" — ternyata berlaku untuk empat dari lima lipatan.

Per lipatan, dari `git diff --numstat`:

| Lipatan | Berkas | Bersih |
|---|---|---|
| `fetchWithRetry` | `core/channel.ts` +47, `channels/discord.ts` −13, `channels/whatsapp.ts` −11 | **+23** |
| `columns(table)` | `store/db.ts` +10 −10 | **0** |
| `sessionOf` | `core/gateway.ts` | **+2** |
| bingkai memori | `core/gateway.ts` (blok 53 baris jadi 58) | **+5** |
| `configForLanguage` | `cli.ts` | **+5** |

Kenapa, dan bentuknya sama di keempatnya: badan yang dibagi hanya empat sampai
dua puluh baris, sementara yang memisahkan kedua salinan — kelas error, jam
yang disuntikkan, kalimat yang sudah diterjemahkan, cadangan `retry_after`
milik Discord — lebih mahal sebagai parameter daripada sebagai salinan. Sebuah
deklarasi fungsi sendiri sudah tiga baris yang tidak dipunyai versi sebaris.

Empat spec sebelumnya menutup catatannya dengan kalimat yang sama: penghapusan
terverifikasi sedang menunggu, dan yang menahannya hanya aturan satu perkara
per PR. Aturan itu benar; taksiran nilainya tidak. Kandidat-kandidat itu tidak
pernah bernilai 400 baris.

Yang dibayar lipatan pertama bukan baris: gelung yang memegang token bot
sekarang satu, bukan dua, dan salinan yang dihapus (`graph()` di WhatsApp) tidak
pernah punya satu test pun seumur hidupnya. Itu alasan lipatan itu tetap
dikerjakan meski berharga +23; empat lainnya dikerjakan karena pengulangannya
memang nyata dan verbatim, dan biayanya di bawah enam baris masing-masing.

## Yang tidak terbukti oleh test

Gerbang yang hijau perlu, dan tidak cukup. Lima hal di lintasan ini tidak punya
test yang menyentuhnya. Menyebutnya lebih murah daripada mengklaim perlindungan
yang tidak ada:

1. **`graph()` di `src/channels/whatsapp.ts` tidak punya test sama sekali.**
   Setiap test WhatsApp menyuntikkan `transport` atau memakai jalur Baileys,
   jadi tidak satu pun permintaan HTTP Cloud API pernah dijalankan di suite
   ini. Yang membuat pembacaan berdampingan bisa dipercaya di sini justru
   lipatannya: setelah ini, cabang 429, cabang `!ok`, dan cabang `catch` bukan
   lagi kode WhatsApp, melainkan kode yang sama yang dijalankan test Discord.
   Ini satu-satunya alasan lipatan pertama tetap dikerjakan meski berharga +23
   baris.
2. **Cadangan `retry_after` tingkat badan milik Discord tidak punya test.** Test
   429 yang ada selalu mengirim header, jadi cabang cadangan tidak pernah
   dimasuki. Ia dipindahkan sebagai satu ekspresi, dari dalam gelung ke closure
   `retryAfter`, dengan urutan baca yang sama: header dulu, badan sesudahnya,
   1 detik terakhir.
3. **Cabang 204 Discord tidak punya test.** Harness e2e menyediakan
   `json(value, status = 204)`, dan tidak ada pemanggil yang mengisi argumen
   kedua. Cabangnya pindah dari dalam gelung ke bawahnya, tanpa disentuh.
4. **`channel.unreachable` tidak punya test perilaku.** Tidak ada test yang
   membuat `fetch` melempar sebelum ada respons. Yang ada hanya test bentuk
   katalog, yang memeriksa bahwa kalimatnya memuat `{channel}`.
5. **`memory.failed` tidak muncul di `test/` sama sekali.** Ketiga `catch`
   perintah memori tidak pernah dimasuki suite. Yang berubah hanyalah bahwa
   ketiganya sekarang satu `catch`, dan bahwa `sendGeneral` sekarang tertulis
   di luar `try` alih-alih hanya berperilaku begitu.

`caraka doctor --fix` dan `caraka uninstall` juga tidak menjalankan empat baris
`loadConfig()` itu di suite mana pun: yang diuji adalah `doctorFix()` sebagai
fungsi, bukan perintahnya. Keduanya di luar jalur keamanan dan tersalin
verbatim.

Satu catatan tentang bentuk yang berubah tanpa perilaku ikut berubah. Pada
versi lama, `return this.sendGeneral(...)` berada di dalam `try`, dan penolakan
promise yang dikembalikan lewat `return` di dalam `try` tidak pernah melewati
`catch` blok itu — hanya `return await` yang melewatinya. Jadi memindahkan
pengiriman ke luar `try` menuliskan perilaku yang sudah berlaku, bukan
menggantinya. Ini diperiksa dengan membaca ketiga versi lama berdampingan,
bukan dengan test, karena tidak ada test yang membuat `sendGeneral` gagal.

## Keluaran gerbang

`npm run verify`, dari akar repositori, keluar dengan status 0. Enam tahap;
`tsc` dan `oxlint` diam saat lulus, jadi baris kosong di bawah keduanya adalah
keluarannya, bukan potongan.

```
> caraka@1.4.1 verify
> npm run scan:secrets && npm run lint && npm run typecheck && npm run build && npm test && npm run e2e


> caraka@1.4.1 scan:secrets
> bash scripts/scan-secrets.sh

clean: 279 tracked files, no credentials

> caraka@1.4.1 lint
> oxlint src test scripts && oxfmt --check src test scripts bin package.json tsconfig.json

Checking formatting...

All matched files use the correct format.
Finished in 111ms on 34 files using 24 threads.
No config found, using defaults. Please add a config file or try `oxfmt --init` if needed.

> caraka@1.4.1 typecheck
> tsc -p tsconfig.json --noEmit


> caraka@1.4.1 build
> node -e "require('node:fs').rmSync('dist', { recursive: true, force: true })" && tsc -p tsconfig.json


> caraka@1.4.1 test
> node --import tsx --test test/unit.test.ts

ℹ tests 160
ℹ suites 0
ℹ pass 160
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 8530.740583

> caraka@1.4.1 e2e
> node --import tsx --test test/e2e.test.ts

ℹ tests 93
ℹ suites 0
ℹ pass 93
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 45208.925777
```

253 test lulus, nol gagal, nol dilewati. 160 baris nama test unit dan 92 baris
nama test e2e dipotong dari kutipan di atas; tallynya utuh apa adanya.

`git status --short test/` kosong: tidak ada berkas test yang berubah (AC-7.1).

Pemeriksaan AC yang tidak lewat test, dijalankan setelah gerbang:

```
$ grep -c "status === 429" src/core/channel.ts src/channels/discord.ts src/channels/whatsapp.ts
src/core/channel.ts:1
src/channels/discord.ts:0
src/channels/whatsapp.ts:0

$ grep -cE "authorization|Bearer|channel\.id|JSON.stringify" src/core/channel.ts
1

$ grep -nE "authorization|Bearer|channel\.id|JSON.stringify" src/core/channel.ts
170: * closure this function cannot see into, so the authorization header — a bot

$ grep -c "fetchWithRetry" src/channels/telegram.ts
0

$ grep -c "PRAGMA table_info" src/store/db.ts
1

$ grep -c "this.store.sessionFor(chatId, threadId)" src/core/gateway.ts
6

$ grep -c "loadConfig()$" src/cli.ts
1
```

Satu-satunya kecocokan di `src/core/channel.ts` adalah kata `authorization` di
dalam komentar yang menerangkan kenapa header itu tidak boleh sampai ke sana.
Enam sisa `sessionFor(chatId, threadId)` di `gateway.ts` adalah helper-nya
sendiri ditambah lima pemanggil yang memang masih memakai idnya, turun dari 11.
