# Plan — Wave 8: tutup semua v1.2

**Spec:** `spec/tutup-semua-v12.md` · **Tanggal:** 10 Agustus 2026

Wave ini ditulis mundur, seperti `done/tutup-celah-v11/plan.md`. Langkah di
bawah bukan rencana yang diikuti; mereka urutan yang benar-benar ditempuh,
dibaca ulang dari diff-nya. Satu bagiannya tidak ditulis mundur:
`spec/titen-hidup.md` dan `plan/titen-hidup.md` mendahului kodenya, dan
`done/mcp-titen-passthrough/spec.md` menutup sebuah keputusan sebelum ada kode
untuk ditutup.

## Langkah

### 1 — Titen hidup, dan adapter yang ditulis ulang terhadapnya

Dijalankan sebagai wave anak dengan spec dan plan sendiri. Titen 0.7.3 dipasang
di `rama-tuf`, tiap rute ditabrak dengan `curl` sampai berhenti menolak, lalu
`src/memory/titen.ts` ditulis ulang terhadap penolakan itu. Header berkasnya
memuat penolakan per field, konstanta endpoint pindah ke adapter dan diimpor
`src/config.ts`, kunci dibaca dari `CARAKA_TITEN_API_KEY`, dan baris doctor
pindah ke rute `/v1` berkredensial.

Berkas: `src/memory/titen.ts`, `src/config.ts`, `src/cli.ts`, `src/i18n.ts`,
`src/dashboard/server.ts`, `test/unit.test.ts`, `docs/design.md`, `docs/api.md`,
`docs/erd.md`, `docs/techstack.md`, `docs/troubleshooting.md`(+`.en`),
`docs/security.md`(+`.en`), `docs/session-model.md`, `AGENTS.md`.

Detail dan pembuktiannya di `done/titen-hidup/plan.md`.

### 2 — Empat agent terhadap biner hidup

`scripts/smoke-cli.mjs` menerima argumen rute kedua, yang membuat separuh CLI
dari preset dua-jalur `claude-code` bisa dijalankan untuk pertama kalinya.
`npm run smoke` naik dari dua jalan menjadi lima. Aider dan goose lulus dan
presetnya berubah karena dijalankan; amp, cursor, dan gemini berhenti di
handshake dan tetap menandai dirinya `belum diverifikasi`. Job `presets` di CI
mendapat satu pemeriksaan yang tidak bisa dinyatakan skema — sebuah preset harus
menyebut perintah untuk rute yang ia nyatakan — dan header workflow-nya memuat
alasan per agent kenapa smoke hidup tidak ada di runner.

Berkas: `presets/agents/{aider,amp,cursor,gemini,goose}.yaml`,
`scripts/smoke-cli.mjs`, `package.json`, `.github/workflows/ci.yml`.

### 3 — Dwibahasa yang dinyatakan, bukan diantre

`docs/install-flow.en.md` dan `docs/install-with-ai.en.md` lahir, jadi sembilan
dokumen punya pasangan. Tiga puluh enam sisanya mendapat satu baris `**English:**`
di kepalanya yang menyebut alasan mereka tinggal Indonesia dan mengarahkan
pembaca Inggris ke `README.md`. `README.md` dan `llms.txt` ikut disapu karena
keduanya menghitung agent.

Berkas: dua berkas `.en.md` baru, `docs/**/*.md`, `README.md`, `llms.txt`.

### 4 — MCP Titen: diukur, lalu ditolak

Sesi ACP lewat `ClaudeAcp` apa adanya sudah membawa ke-18 tool Titen, karena
adapter Claude membaca `.mcp.json` milik direktori kerja. Satu `claude mcp add`
di sisi pemilik memberi hasil yang sama dengan nol baris kode Caraka, dan 12
dari 18 tool itu menulis atau menghapus di luar scrubber. Ditutup sebagai
keputusan, tanpa kode.

Berkas: `done/mcp-titen-passthrough/spec.md`.

### 5 — Sapuan roadmap

Kotak Titen ditutup dengan angka dan caranya. Kotak topic dan Rich Messages
menyebut apa yang menutupnya. Sebelas kotak yang tetap terbuka masing-masing
membawa tanggal dan alasan. Kotak smoke CI pindah dari satu kalimat menjadi
alasan per agent. Baris dwibahasa menyatakan bahwa spesifikasi dan riset tinggal
Indonesia karena pilihan, dan `docs/roadmap.md` sendiri mendapat baris
`**English:**` yang sebelumnya luput.

Berkas: `docs/roadmap.md`.

### 6 — Dua kegagalan yang hanya muncul di mesin kedua

Gerbang dijalankan di `rama-tuf` dan dua test yang hijau di sini menjadi merah
di sana. Keduanya diperbaiki di akarnya, bukan ditandai flaky.

`activeGrant` di `src/store/db.ts` mengurutkan `created_at DESC` saja.
`openGrant` tidak menutup jendela yang digantikannya, jadi satu workspace bisa
memegang dua baris `trusted` terbuka, dan dua `/yolo` di dalam milidetik yang
sama seri. Pada seri SQLite bebas mengembalikan yang mana pun, dan kedua baris
bisa berbeda `principal` dan `agentMode` — jadi jendela yang berlaku dipilih
secara acak. `rowid` monoton per insert dan mematahkan seri ke arah yang
dimaksud jam. Satu kata SQL, ditambah komentar yang menjelaskan kenapa ia ada,
ditambah satu assert yang menyisipkan dua baris dengan `created_at` identik dan
menuntut yang terakhir menang.

Test *giving up raises the operator's sentence out of updates()* memasang
handler penolakannya sesudah tujuh `drop`, bukan sebelum. Tiap drop memulai
sebuah reconnect yang yield, jadi beberapa berjalan bersamaan dan yang keenam
bisa menyetel fatal saat loop masih berjalan — meninggalkan promise yang ditolak
tanpa pendengar, yang dilaporkan Node sebagai unhandled rejection. Kali ini
testnya yang salah, bukan kodenya, dan handler-nya dipindah ke atas.

Berkas: `src/store/db.ts`, `test/unit.test.ts`, `AGENTS.md`, `CHANGELOG.md`.

### 7 — Situs

Versi, kartu `1.2.0`, dan setiap kalimat yang dibuat salah oleh wave ini:
hitungan agent di `status.ts`, `landing.ts`, `ui-kit.ts`, `install.ts`; klaim
memori di `index.astro`; hitungan versi di `readme.ts`. Chip npm tetap melacak
registry dan karena itu membaca `1.1.2`. Kartu rilis lama dibiarkan apa adanya:
kalimat "Titen was never contacted" di kartu 1.1.0 benar pada 1.1.0.

Berkas: `site/src/data/{status,landing,ui-kit,install,readme}.ts`,
`site/src/pages/{index,docs,compare,install}.astro`,
`site/src/pages/brand/{readme,og}.astro`, `site/e2e/site.spec.ts`.

### 8 — Versi dan changelog

`npm version 1.2.0 --no-git-tag-version`. Bagian `[1.2.0]` ditulis dengan
kepala yang menyatakan bahwa judulnya bukan sebuah fitur, dan `Limited` yang
memuat empat hal yang tidak boleh ditemukan pembaca sesudah memasang.

Berkas: `package.json`, `package-lock.json`, `CHANGELOG.md`.

## Pemetaan pembuktian

| AC | Dibuktikan oleh |
|---|---|
| AC-1.1 | `docs/roadmap.md:20` — kotak tercentang, angka 4,9 md, dan kalimat metodenya |
| AC-1.2 | baris yang sama menyebut 2,3–4,3 detik yang dibuang dan sebabnya |
| AC-1.3 | `docs/roadmap.md:18` dan `:19` |
| AC-1.4 | `grep -n "^- \[ \]" docs/roadmap.md` — sebelas baris, tiap baris memuat sebuah tanggal |
| AC-1.5 | `docs/roadmap.md:107`, menunjuk `done/mcp-titen-passthrough/spec.md` |
| AC-1.6 | `docs/roadmap.md:167` — empat agent disebut dengan rutenya, tiga disebut dengan dinding akunnya |
| AC-1.7 | `docs/roadmap.md:166` — sembilan pasangan, dan tiga alasan tinggal Indonesia |
| AC-2.1 … AC-2.7 | `CHANGELOG.md` bagian `[1.2.0]`, tiap butir dibaca ulang terhadap kalimat AC-nya |
| AC-3.1 | `node -e "console.log(require('./package.json').version)"` → `1.2.0`; unit `caraka --version` membandingkan biner terbangun dengan manifest |
| AC-3.2 | `site/src/data/status.ts:23` |
| AC-3.3 | `npm view caraka version` → `1.1.2`, sama dengan chip di `site/src/data/readme.ts:18` |
| AC-4.1 | `grep -rn "only agent\|the one route\|Only Claude" site/src site/e2e` tidak menghasilkan kalimat berlaku |
| AC-4.2 | `grep -rn "mocked fetch" site/src` hanya menemukan kartu rilis 0.3.0 dan kontrol Discord yang masih benar |
| AC-4.3 | kartu `1.2.0` di `site/src/data/status.ts`, empat grup |
| AC-4.4 | kartu 1.1.0 masih memuat "Titen was never contacted" dan kartu 0.3.0 masih memuat "only ever answered a mocked fetch" |
| AC-4.5 | test *every route keeps the document height its mockup renders at*, `site/e2e/site.spec.ts` |
| AC-5.1 | keluaran di bawah, tiap perintah dibaca dari `$?` |
| AC-5.2 | dua perbaikan di langkah 6; delapan kali `npm test` berturut-turut di `rama-tuf` |
| AC-5.3 | bagian *Batas mesin kedua* di bawah |

## Risiko

- **Titen pra-1.0.** Adapter terikat 0.7.3. Yang mengurangi biayanya: tiap field
  punya catatan penolakannya, jadi versi berikutnya diperiksa terhadap daftar.
- **Satu run bukan bukti stabil.** Empat agent lulus sekali. Preset yang lulus
  hari ini bisa gagal pada rilis biner berikutnya, dan tidak ada CI yang
  menangkapnya.
- **Kartu rilis lama sebagai catatan.** Aturan "klaim salah tidak pernah
  dipertahankan demi kesetiaan" bertemu aturan bahwa changelog adalah arsip.
  Yang dipakai: kalimat di kartu rilis dibaca sebagai keadaan pada tanggal kartu
  itu, kalimat di luar kartu dibaca sebagai keadaan sekarang. Kalau kartu berhenti
  jelas sebagai kartu, aturan ini gagal diam-diam.
- **Baseline tinggi terikat mesin.** Ia mengukur perenderan font mesin ini.
  Bukan cacat baru, tetapi wave ini yang pertama kali membuktikannya.

## Verifikasi

Dijalankan 10 Agustus 2026 pada pohon yang ditutup, di dua mesin. Tiap perintah
dijalankan sendiri dan kode keluarnya dibaca dari `$?`.

### Mesin 1 — AMD Ryzen AI 9 HX 370, 24 thread, Node v24.18.0

```
$ npm run lint            → exit 0

> caraka@1.2.0 lint
> oxlint src test scripts && oxfmt --check src test scripts bin package.json tsconfig.json

Checking formatting...

All matched files use the correct format.
Finished in 114ms on 33 files using 24 threads.
No config found, using defaults. Please add a config file or try `oxfmt --init` if needed.

$ npm run typecheck       → exit 0

> caraka@1.2.0 typecheck
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
ℹ duration_ms 8099.198355

$ npm run e2e             → exit 0
ℹ tests 62
ℹ suites 0
ℹ pass 62
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 28455.369606

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
  113 passed (51.0s)
```

### Mesin 2 — `rama-tuf`, Fedora 44, 16 thread, 30 GB, Node v24.18.0

```
$ npm run lint            → exit 0

> caraka@1.2.0 lint
> oxlint src test scripts && oxfmt --check src test scripts bin package.json tsconfig.json

Found 0 warnings and 0 errors.
Finished in 25ms on 29 files with 96 rules using 16 threads.
Checking formatting...

All matched files use the correct format.
Finished in 57ms on 33 files using 16 threads.
No config found, using defaults. Please add a config file or try `oxfmt --init` if needed.

$ npm run typecheck       → exit 0

> caraka@1.2.0 typecheck
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
ℹ duration_ms 4090.937571

$ npm run e2e             → exit 0
ℹ tests 62
ℹ suites 0
ℹ pass 62
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 24996.696368

$ cd site && npm run check   → exit 0
Found 0 warnings and 0 errors.
- 0 errors
- 0 warnings
- 0 hints

 Test Files  2 passed (2)
      Tests  26 passed (26)
```

`npm test` dijalankan delapan kali berturut-turut di mesin ini sesudah kedua
perbaikan di langkah 6, dan keluar 0 kedelapan kalinya:

```
$ for i in 1 2 3 4 5 6 7 8; do npm test >/tmp/rt$i.log 2>&1; echo -n "run$i=$? "; done
run1=0 run2=0 run3=0 run4=0 run5=0 run6=0 run7=0 run8=0
```

Sebelum perbaikan itu, mesin yang sama menjawab `run3=1` dari lima, dan
`a trust grant must expire` gagal dua dari lima kali saat dijalankan sendiri.

### Batas mesin kedua — `site` e2e

`npm run e2e` di `site/` tidak bisa menjadi gerbang di `rama-tuf`, dan alasannya
dua-duanya milik mesin itu.

WebKit dan mobile-safari tidak bisa diluncurkan sama sekali: Playwright
melaporkan pustaka sistem yang hilang dan `npx playwright install --with-deps`
menuntut sudo, yang tidak tersedia tanpa kata sandi. Ketiga proyek yang bisa
diluncurkan — chromium, firefox, mobile-chrome — dijalankan sendiri dan menjawab
exit 1 pada dua test:

```
$ npx playwright test --project=chromium --project=firefox --project=mobile-chrome  → exit 1
  2 failed
  69 passed (27.5s)
```

Yang pertama adalah baseline tinggi, dan angkanya membuktikan bahwa yang berbeda
adalah mesinnya, bukan isinya. Ketiga belas rute datang **lebih pendek**, termasuk
rute yang wave ini tidak sentuh sama sekali:

```
"/: 6592 (comp renders at 6595)"              "/story: 5720 (comp renders at 5734)"
"/docs: 7307 (comp renders at 7314)"          "/brand: 10166 (comp renders at 10177)"
"/compare: 5924 (comp renders at 5931)"       "/brand/warna: 5260 (comp renders at 5264)"
"/install: 5458 (comp renders at 5465)"       "/brand/ui-kit: 9556 (comp renders at 9584)"
"/security: 6140 (comp renders at 6147)"      "/status: 13641 (comp renders at 13648)"
"/whatsapp-risk: 6849 (comp renders at 6857)" "/brand/readme: 5575 (comp renders at 5581)"
```

`/story`, `/brand`, `/brand/warna`, dan `/brand/ui-kit` tidak diedit wave ini
dan bergeser −14, −11, −4, dan −28. Selisih itu perenderan font Fedora, dan
baseline-nya sudah menyatakan mesinnya sejak v1.0 (`site/e2e/site.spec.ts`,
"Chromium at 1440x900"). Gerbang ini karena itu gerbang mesin ini, dan
melonggarkannya supaya mesin kedua hijau akan mencabut satu-satunya hal yang ia
periksa.

Yang kedua, *the page behind it does not scroll* di mobile-chrome, membaca
`overflow` yang dihitung pada elemen akar sesudah menu dibuka dan mendapat `""`
alih-alih `"hidden"`. Tidak ada di wave ini yang menyentuh header, panel menu,
atau `ck.js`, dan test yang sama hijau di mesin 1 di kelima proyeknya.

### Anggaran kompleksitas — terlewati

```
$ find src -name '*.ts' | xargs wc -l | tail -1
  8498 total
```

**8.498 baris.** 618 di atas 7.880 di `v1.0.0`, dan **498 di atas plafon ~8.000**
di `AGENTS.md`. 143 dari 149 baris wave ini adalah penulisan ulang adapter Titen
dan baris doctor berkredensial; enam sisanya komentar yang menjelaskan satu kata
SQL. Dicatat sebagai terlewati, bukan sebagai mendekati.

### Baseline tinggi situs

Diukur pada Chromium 1440x900 sesudah `rm -rf dist && npm run build`, dua kali,
sama persis dua-duanya.

| Rute | v1.1.2 | v1.2.0 | Sebab |
|---|---|---|---|
| `/status` | 12577 | 13648 | kartu `1.2.0` dengan empat grup; grup CHANGED sendirian empat butir |
| `/install` | 5440 | 5465 | hitungan agent naik dari satu menjadi empat pada satu kalimat |
| `/` | 6580 | 6595 | kartu ACP dan kartu CLI sama-sama menyebutkan agent yang terbukti |
| `/brand/readme` | 5557 | 5581 | chip status kartu repo dan blockquote papan |

`/docs`, `/compare`, `/security`, `/whatsapp-risk`, dan lima rute brand lain
tidak bergerak: suntingannya jatuh di dalam kalimat yang sudah ada.

### Dua pemeriksaan yang tidak dilakukan alat

- **Tanpa rahasia.** Kunci Titen berada di `~/.caraka-spike/titen.key` mode 600
  di `rama-tuf` dan tidak pernah masuk pohon ini. Skrip pengukuran latensi
  membacanya dari sana dan hidup di `/tmp` mesin itu, bukan di repositori.
  `git diff` untuk wave ini tidak memuat satu pun nilai berbentuk kredensial.
- **Tanpa AI slop.** Prosa diperiksa terhadap bagian *Writing style*
  `AGENTS.md`.

## Yang tetap tidak terpenuhi saat wave ditutup

- **Sebelas kotak roadmap masih terbuka.** Empat di antaranya tidak bisa
  ditutup dari repositori dengan usaha berapa pun: lima rekaman sesi setup, dua
  puluh developer beta, empat belas hari di nomor WhatsApp sungguhan, dan
  peluncuran.
- **Dua spike Fase 0.** Gelembung topic di DM dan uji ulang `editMessageText`
  butuh bot hidup dan orang yang menonton.
- **Konsolidasi Titen.** Sebuah observation masih tidak pernah muncul di
  `compile`.
- **Tiga preset berhenti di handshake.** amp, cursor, gemini.
- **Plafon LOC.** 498 baris di atas, dan lipatan yang membayarnya belum
  dikerjakan.
- **`npm publish` dan deploy.** Registry memegang 1.1.2. Keduanya milik pemilik
  dan tidak dijalankan di sini.
