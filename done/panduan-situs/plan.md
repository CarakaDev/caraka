# Plan — panduan-situs

**Spec:** `spec/panduan-situs.md` · **Tanggal:** 14 Agustus 2026

Sebelas langkah. Langkah 1 sampai 3 adalah halamannya, 4 sampai 6 membuatnya
bisa dijangkau, 7 dan 8 adalah test dan catatan penyimpangan, 9 adalah penunjuk
di dalam chat, 10 dan 11 adalah pengukuran dan gerbang. Urutannya mengikat di
satu titik: baseline tinggi tidak bisa diukur sebelum tautan-tautan langkah 4
sampai 6 masuk, karena tautan di footer bisa membuat barisnya melipat.

## Langkah

### Halaman

1. **`site/src/data/guide.ts`** — isi halaman, satu `chapters` dengan bentuk yang
   sama seperti `src/data/docs.ts` (`no`, `id`, `href`, `label`, `title`,
   `intro`, `term?`, `rows?`, `note?`), sehingga markup langkah 2 adalah markup
   `/docs`. Kepala berkas membawa komentar provenance bergaya
   `src/data/whatsapp-risk.ts`: rute ini tidak punya comp, bentuk dan
   stylesheet-nya milik comp `Caraka Docs.dc.html`, dan setiap klaim melacak ke
   `docs/` atau `src/`. Delapan bab, berurutan sebagai satu jalan:

   | # | id | Yang diajarkan | Sumber |
   |---|---|---|---|
   | 01 | `supply` | Yang pembaca sediakan sendiri | `docs/install-guide.md` §1, `src/data/install.ts` |
   | 02 | `pair` | Pairing DM dan pairing grup | `cli.pairSecret`, `handleMembership` (`gateway.ts:2111`) |
   | 03 | `topics` | Apakah topic muncul, dan apa yang memutuskannya | `topicsAvailable` (`:1118`), `forumChats` (`:2122`), `group.topicsOff` |
   | 04 | `aim` | Menujukan pesan, termasuk di dalam topic sesi | `addressed()` (`telegram.ts`), `aimed` (`gateway.ts`), `group.ready`, `group.readyAll` |
   | 05 | `session` | Memulai sesi dan menyebut folder | `parseCommand`, `routeTask`, `markWorkspace`, `gatewayCommands` |
   | 06 | `approve` | Kartu approval, kode, jendela trust | `permission.ttl`, `permission.ttlReply`, aturan keras 2 |
   | 07 | `refused` | Enam penolakan dan jalan keluarnya | `policy.readOnly`, `ws.*`, `policy.noTrust`, `trust.needButtons` |
   | 08 | `limits` | Yang halaman ini tidak janjikan | `site/AGENTS.md`, `spec/grup-nyaman.md` |

   Setiap bentuk perintah dicek terhadap kodenya, bukan terhadap prosa: `/new`
   membaca argumen pertama sebagai folder hanya ketika ia absolut sesudah `~/`
   dikembangkan (`markWorkspace`), dan `@slug` hanya dibaca di awal baris
   (`routeTask`'s `/^@(\S+)(?:\s+|$)/`).

2. **`site/src/pages/guide.astro`** — port bentuk `/docs`: bilah kemajuan,
   header tetap dengan chip `GUIDE`, blok kepala, bab bernomor dengan `term`,
   `rows`, dan `note`, rel kanan `[data-toc]`, footer. `import
   '../styles/pages/docs.css'` dan tidak ada berkas gaya baru. `MobileToc`
   dengan `breakpoint={1040}`, angka yang `docs.css` sendiri pakai di media
   query-nya. Komentar kepala menyebut preseden `/whatsapp-risk` dan alasan
   berbagi stylesheet.

3. **`site/src/lib/site.ts`** — `PageKey` `guide`, entri `PAGES` dengan `path`
   `/guide`, `lang` `en`, `title`, `description` di bawah ~160 karakter,
   `ogHeadline` dua bagian yang masing-masing sekitar 21 karakter, dan
   `ogKicker` `GUIDE`. Tanpa entri `CARDS` di `gen-assets.mjs`, jadi kartunya
   netral dan `ogHeadline` hanya menjadi `og:image:alt`.

### Bisa dijangkau

4. **`site/src/pages/index.astro` dan `site/src/data/landing.ts`** — `Guide`
   masuk ke `<nav data-navlinks>`, ke daftar `MobileMenu`, dan ke `footerLinks`.
   `NAV` di `site/src/lib/site.ts` ikut, karena komentarnya menyatakan ia
   menggambarkan header itu.
5. **`site/src/pages/docs.astro`** — `Guide` di header, di `MobileMenu`, dan di
   footer.
6. **`site/src/pages/install.astro`** — sama, dan di halaman ini tautannya paling
   penting: pembaca yang baru selesai memasang berada di situ.

### Test dan catatan

7. **`site/e2e/mobile.spec.ts`** — `/guide` masuk `NAVIGATED` dan `WITH_TOC`.
   Tabel rute, kartu OG, dan test kejujuran mengambil dari `PAGES`, jadi
   ketiganya menerima rute baru tanpa disunting.
8. **`site/AGENTS.md`** — dua tempat. Kalimat "One route has no mockup" menjadi
   dua rute, dengan `/guide` beserta stylesheet yang dipinjamnya dan alasannya.
   Dan satu paragraf di "Where the port leaves the mockup": header `/`, `/docs`,
   dan `/install` sekarang membawa satu tautan yang comp-nya tidak punya.

### Penunjuk di dalam chat

9. **`src/i18n.ts`** — "The long version: caraka.dev/docs" menjadi
   `caraka.dev/guide` di `help.direct` dan `help.room`, di kedua katalog. Empat
   string, satu karakter lebih panjang masing-masing; plafon 2000 karakter yang
   `test/unit.test.ts` periksa tidak terancam.

### Pengukuran dan gerbang

10. **Ukur.** `rm -rf dist && npm run build`, lalu baseline `/guide` dibaca di
    Chromium 1440x900 dan ditulis ke `EXPECTED`. Baseline `/`, `/docs`, dan
    `/install` dibaca ulang karena footer ketiganya bertambah satu tautan.
11. **Gerbang.** `npm run verify` dari akar karena langkah 9 menyentuh `src/`,
    lalu `cd site && npm run check` dan `npm run e2e`. Keluarannya ditempel apa
    adanya.

## Pemetaan AC → pembuktian

| AC | Pembuktian |
|---|---|
| AC-1.1 | e2e tabel rute (`site.spec.ts`) mengambil dari `PAGES`: status 200, `<title>` cocok, `html[lang]` `en`, canonical dan og:url menunjuk `/guide` |
| AC-1.2 | `grep "styles/pages" site/src/pages/guide.astro` menyebut `docs.css`; `ls site/src/styles/pages/` tanpa `guide.css` |
| AC-1.3 | e2e "the OG image each page points at actually exists" — `content-length` > 1000 untuk `/og/og-guide.png` |
| AC-1.4 | baca `site/AGENTS.md`: kalimat rute-tanpa-comp menyebut `/guide` dan `docs.css` |
| AC-1.5 | e2e ponsel "the sidebar the comps hide comes back as a disclosure" dengan `/guide` di `WITH_TOC`: teks `[data-toc] a` dan `.ck-toc-link` harus sama persis |
| AC-1.6 | e2e baseline tinggi terhadap `dist/` segar; angka yang bergeser ditulis, bukan ditebak |
| AC-1.7 | baca `site/e2e/mobile.spec.ts` |
| AC-2.1 | e2e ponsel "every navigated page offers a menu" membaca `header [data-navlinks] a` pada `/guide` sendiri; untuk ketiga halaman lain, `grep 'href="/guide"' site/src/pages/{index,docs,install}.astro` |
| AC-2.2 | e2e ponsel yang sama: setiap label nav desktop wajib ada di `.ck-menu-link`, jadi menu yang tertinggal membuatnya merah |
| AC-2.3 | `grep -c 'href="/guide"'` di ketiga berkas halaman dan di `src/data/landing.ts` |
| AC-2.4 | baca `NAV` di `site/src/lib/site.ts` berdampingan dengan `<nav>` di `index.astro` |
| AC-2.5 | `grep -c "caraka.dev/guide" src/i18n.ts` bernilai 4 dan `grep -c "caraka.dev/docs" src/i18n.ts` bernilai 0; `npm test` di akar tetap hijau, termasuk test plafon 2000 karakter |
| AC-3.1 | baca `dist/guide/index.html`: bab 01 menyebut @BotFather, Node 22+, Git, dan agent yang sudah masuk |
| AC-3.2 | `grep "five minutes" dist/guide/index.html` dan bandingkan dengan `cli.pairSecret` |
| AC-3.3 | baca bab 02 berdampingan dengan `handleMembership` (`gateway.ts:2126-2146`): kartu ke `directTo(channel, operator)`, penjaga `this.allows(chatId, event.from.id)` |
| AC-3.4 | baca bab 03 berdampingan dengan `topicsAvailable` (`:1122-1123`) dan `forumChats.set` (`:2122-2125`) |
| AC-3.5 | `grep "every message" dist/guide/index.html` dan bandingkan dengan `group.topicsOff` |
| AC-3.6 | baca bab 04 berdampingan dengan `addressed()` di `src/channels/telegram.ts` dan `aimed` di `gateway.ts` |
| AC-3.7 | baca bab 04 berdampingan dengan `group.ready` |
| AC-3.8 | tiap bentuk yang tercetak dijalankan lewat mata terhadap `markWorkspace` (`gateway.ts:108-116`), `parseCommand` (`:551`), dan `routeTask`'s `at` (`:578`); daftar perintah dibandingkan dengan `gatewayCommands` di `src/core/channel.ts` |
| AC-3.9 | baca bab 05 berdampingan dengan `workspaceForPath` (`:642-656`) dan `ws.askedOperator` |
| AC-3.10 | baca bab 06 berdampingan dengan `permission.ttl`, `permission.ttlReply`, dan `approval.codeInvalid` |
| AC-3.11 | baca bab 03 dan 07 berdampingan dengan `docs/session-model.md` §5 dan §6 |
| AC-3.12 | enam penolakan dihitung di bab 07 dan dicocokkan satu-satu dengan `policy.readOnly`, `ws.pathOperatorOnly`, `ws.pathMissing`, `ws.pathOverlap`, `ws.slugBad`, dan `policy.noTrust` |
| AC-4.1 | `grep -o "unproven" dist/guide/index.html`; dan tidak ada kata kematangan di sekitarnya |
| AC-4.2 | `grep -nE '\bv?[0-9]+\.[0-9]+(\.[0-9]+)?\b' site/src/data/guide.ts` menghasilkan satu baris, dan isinya `127.0.0.1`. Pola versi juga cocok dengan alamat, jadi yang dibaca hasilnya, bukan hitungannya |
| AC-4.3 | baca bab 08 berdampingan dengan `site/AGENTS.md` bagian Content dan `spec/grup-nyaman.md` "Yang tidak dikerjakan" butir terakhir |
| AC-4.4 | e2e "no page claims the software is finished" — pola terlarang atas `body.innerText` setiap rute di `PAGES` |
| AC-5.1 | keluaran ketiga perintah ditempel di bawah |
| AC-5.2 | keluaran `npm run verify` ditempel di bawah |
| AC-5.3 | angka baseline `/guide` ditulis di bawah, beserta ketiga rute yang footernya bertambah |

## Risiko

**Yang paling mungkin salah adalah bentuk perintah yang dicetak halaman ini.**
Prosa di `docs/` sudah pernah salah tentangnya: baris `/new [title] [@slug]` di
`site/src/data/docs.ts` menaruh judul di depan folder, sementara `routeTask`
membaca `@` hanya di awal baris. Karena itu setiap bentuk di halaman ini dibaca
terhadap `markWorkspace`, `parseCommand`, dan `routeTask`, bukan terhadap
kalimat mana pun yang sudah ditulis orang.

**Risiko kedua: satu tautan footer bisa menggeser tiga baseline.** Footer
`/docs` sudah membawa tujuh tautan di satu baris pada 1440px, dan yang kedelapan
bisa melipatnya. Angkanya diukur terhadap `dist/` segar, dan yang bergeser
ditulis apa adanya.

**Risiko ketiga: halaman yang panjangnya tidak dibatasi.** `/status` baru saja
dipangkas 9.817px karena setiap rilis menambah satu kartu, dan pelajarannya
ditulis di `site/AGENTS.md`: yang mahal bukan tinggi halaman melainkan daftar
yang tumbuh tanpa batas. Halaman ini punya delapan bab yang jumlahnya tidak
tumbuh seiring rilis, jadi ia tidak membawa mesin pertumbuhan yang sama.

**Yang tidak bisa diverifikasi gerbang ini** adalah apakah petunjuknya benar di
Telegram sungguhan. Suite `site/` merender HTML, dan suite akar memakai channel
palsu. Dua kalimat di bab 03 dan 07 bersandar pada perilaku yang
`spec/grup-nyaman.md` catat sebagai belum diuji terhadap forum supergroup
sungguhan, dan bab 08 menyebutnya alih-alih membiarkan pembaca menganggapnya
terbukti.

## Yang berubah saat membangun

Empat hal berbeda dari rencana di atas, dan keempatnya ditulis di sini alih-alih
dibiarkan menjadi selisih yang ditemukan orang lain.

**Pertama, `/docs` bergeser dan `/` tidak.** Risiko kedua menebak footer `/docs`
yang melipat, dan itu yang terjadi: +22px ke 7425, satu baris footer, karena
tautan kedelapan tidak muat di 1440px. Footer `/` dan `/install` menerima tautan
yang sama dan tidak bergerak — yang pertama karena `footerLinks` sudah melipat,
yang kedua karena barisnya baru berisi empat.

**Kedua, satu kalimat di bab 08 menggeser baseline halaman ini sendiri.**
Baseline pertama terukur 7200, lalu satu baris ditambahkan ke baris "Six of the
seven agent presets" untuk memisahkan dua klaim yang halaman ini pikul
berdampingan: `src/data/install.ts` menulis "four have answered a live binary
here" dan `site/AGENTS.md` menulis "six of the seven presets have never
completed a turn here". Keduanya benar dan mudah dibaca sebagai saling
bertentangan, jadi bab 08 sekarang menyebut selisihnya. Angka terukurnya
**7244**, dan itu yang masuk `EXPECTED`.

**Ketiga, `npm run scan:secrets` tidak membaca satu pun berkas pekerjaan ini.**
Pemindai membaca `git ls-files`, dan spec, plan, `guide.ts`, serta `guide.astro`
belum dilacak sampai commit. Angka "283 tracked files" di bawah karena itu bukan
pernyataan tentang keempat berkas baru. Keempatnya dijalankan terhadap pola yang
sama dengan tangan, dan bersih; yang membaca diff tetap orang.

**Keempat, `npm run e2e` merah sekali pada jalan pertama.** Yang gagal
`[webkit] motion › scroll progress advances` di `/`, sebuah rute yang pekerjaan
ini hanya sentuh header tetapnya. Dijalankan sendiri ia hijau (4,3s), dan dua
jalan penuh berikutnya hijau penuh. Ini dicatat sebagai flake di bawah beban
paralel, bukan sebagai hijau yang bersih sejak awal.

## Keluaran gerbang

Dijalankan 14 Agustus 2026. Yang dipotong ditandai; setiap baris perintah dan
setiap hitungan ditempel apa adanya dari satu jalannya masing-masing.

`npm run verify` dari akar repositori, karena langkah 9 menyentuh `src/i18n.ts`.
Baris `✔` per test dipotong; hitungannya tidak.

```
$ npm run verify

> caraka@1.4.2 verify
> npm run scan:secrets && npm run lint && npm run typecheck && npm run build && npm test && npm run e2e

> caraka@1.4.2 scan:secrets
> bash scripts/scan-secrets.sh
clean: 283 tracked files, no credentials

> caraka@1.4.2 lint
> oxlint src test scripts && oxfmt --check src test scripts bin package.json tsconfig.json
Checking formatting...
All matched files use the correct format.
Finished in 137ms on 34 files using 24 threads.
No config found, using defaults. Please add a config file or try `oxfmt --init` if needed.

> caraka@1.4.2 typecheck
> tsc -p tsconfig.json --noEmit

> caraka@1.4.2 build
> node -e "require('node:fs').rmSync('dist', { recursive: true, force: true })" && tsc -p tsconfig.json

> caraka@1.4.2 test
> node --import tsx --test test/unit.test.ts
… 164 baris ✔ dipotong …
ℹ tests 164
ℹ pass 164
ℹ fail 0

> caraka@1.4.2 e2e
> node --import tsx --test test/e2e.test.ts
… 99 baris ✔ dipotong …
ℹ tests 99
ℹ pass 99
ℹ fail 0
```

`cd site && npm run check`. Blok `npm run assets` yang `pretest` cetak dipotong
di tempat yang ditandai.

```
$ npm run check

> caraka-site@0.0.1 check
> npm run lint && npm run typecheck && npm run test

> caraka-site@0.0.1 lint
> oxlint src scripts test

> caraka-site@0.0.1 typecheck
> astro check

15:50:10 [types] Generated 37ms
15:50:10 [check] Getting diagnostics for Astro files in /home/ramaaditya/Project/caraka/caraka/site...
Result (48 files):
- 0 errors
- 0 warnings
- 0 hints

> caraka-site@0.0.1 pretest
> npm run assets
> caraka-site@0.0.1 assets
> node scripts/gen-assets.mjs
… 20 baris nama berkas dipotong; `og/og-guide.png  (neutral)` di antaranya …

> caraka-site@0.0.1 test
> vitest run

 Test Files  2 passed (2)
      Tests  29 passed (29)
   Start at  15:50:20
   Duration  158ms (transform 47ms, setup 0ms, import 83ms, tests 25ms, environment 0ms)
```

`rm -rf dist && npm run build`, lalu `npm run e2e` terhadap `dist/` itu.

```
$ rm -rf dist && npm run build
15:50:26 [build] ✓ Completed in 404ms.
15:50:26 [@astrojs/sitemap] `sitemap-index.xml` created at `dist`
15:50:26 [build] 15 page(s) built in 490ms
15:50:26 [build] Complete!

$ npm run e2e

> caraka-site@0.0.1 e2e
> playwright test

Running 118 tests using 12 workers
  ✓    6 [chromium] › e2e/site.spec.ts:14:5 › routes › /guide responds and is the page it claims to be (575ms)
  ✓   31 [firefox] › e2e/site.spec.ts:14:5 › routes › /guide responds and is the page it claims to be (2.3s)
  ✓   62 [webkit] › e2e/site.spec.ts:14:5 › routes › /guide responds and is the page it claims to be (1.4s)
… 113 baris ✓ dipotong …

  2 skipped
  116 passed (1.0m)
```

118 test, dari 115 sebelum pekerjaan ini: tiga tambahan itu satu rute baru di
tabel rute, dikali chromium, firefox, dan webkit. Test kartu OG, test veil, test
kejujuran, dan kedua test ponsel membaca `PAGES` atau daftar rutenya, jadi
mereka menerima `/guide` tanpa satu baris disunting selain `NAVIGATED` dan
`WITH_TOC`.

**Baseline tinggi**, Chromium 1440x900 terhadap `dist/` segar, dua kali dengan
`rm -rf dist && npm run build` di antaranya dan angka yang sama dua kali:

| Rute | Sebelum | Sesudah | Sebabnya |
|---|---|---|---|
| `/guide` | — | **7244** | rute baru |
| `/docs` | 7403 | **7425** | tautan kedelapan di footer melipat barisnya |
| `/` | 6595 | 6595 | tautan header tidak menyumbang tinggi, dan `footerLinks` sudah melipat |
| `/install` | 5465 | 5465 | footer-nya baru berisi empat tautan |
| sepuluh rute lain | — | tidak bergerak | tidak disentuh |

**Pembuktian yang bukan test.** Dijalankan terhadap `dist/` yang sama:

```
$ grep -n "styles/pages" site/src/pages/guide.astro
14:import '../styles/pages/docs.css'

$ ls site/src/styles/pages/ | grep -c guide.css
0

$ grep -c 'href="/guide"' site/src/pages/{index,docs,install}.astro
site/src/pages/index.astro:1     (nav; footernya lewat footerLinks)
site/src/pages/docs.astro:2
site/src/pages/install.astro:2

$ grep -c "caraka.dev/guide" src/i18n.ts
4
$ grep -c "caraka.dev/docs" src/i18n.ts
0

$ grep -o "unproven" site/dist/guide/index.html | wc -l
5

$ grep -nE '\bv?[0-9]+\.[0-9]+(\.[0-9]+)?\b' site/src/data/guide.ts
90:  … bind 127.0.0.1 unless you say otherwise.
```

Satu-satunya token berbentuk versi di `guide.ts` adalah alamat loopback, dan itu
bukan versi. AC-4.2 lolos.

Frasa yang dicari di `site/dist/guide/index.html`, satu kemunculan masing-masing
kecuali yang disebutkan: `@BotFather`, `Node 22`, `five minutes`, `pairing card
arrives in your own conversation`, `Manage topics` (2), `receives every message
in the group`, `privacy mode` (2), `session topic`, `folder comes first`,
`No word approves`, `closes its topic rather than deleting`, `read-only` (4).
