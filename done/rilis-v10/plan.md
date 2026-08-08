# Plan — Wave 6: rilis publik v1.0

**Spec:** `spec/rilis-v10.md` · **Tanggal:** 8 Agustus 2026

Wave ini tidak menambah kemampuan. Ia menutup empat baris Fase 7 yang berupa
teks dan bukti, membuat ruang di bawah plafon kompleksitas supaya teks itu muat,
lalu menaikkan versi. Urutannya dipilih supaya tiap langkah bisa gagal sendiri:
pengukuran lebih dulu karena dokumen bergantung padanya, penyederhanaan sebelum
penulisan karena ia yang menyentuh `src/`, dan penaikan versi paling akhir.

## Langkah

### 1 — Ukur, sebelum ada dokumen yang mengutip angka

`/usr/bin/time -v` untuk waktu dinding dan puncak RSS, `VmRSS` di
`/proc/<pid>/status` tiap 500 md untuk RAM diam, `npm pack --json` sesudah
`npm run build` untuk tarball, dan `npm install <tgz> --omit=dev` ke direktori
kosong untuk pohon terpasang. Setiap bacaan diulang beberapa kali dan yang
ditulis adalah rentangnya, bukan yang paling bagus.

Berkas: `docs/roadmap.md` (bagian pengukuran baru di Fase 1),
`docs/techstack.md` §8 (tabel perkiraan diganti tabel terukur).

### 2 — Penyederhanaan `src/`

`src/` berhenti di 7.996 baris pada `v0.6.0`. Yang dilipat adalah pengulangan
yang sudah ada, bukan abstraksi baru: helper bernama di gateway, dasbor, store,
config loader, dan dua channel push. Tidak ada test yang diubah untuk
mengakomodasinya — kalau sebuah lipatan butuh test diubah, ia bukan lipatan.

Berkas: `src/core/gateway.ts`, `src/core/channel.ts`, `src/dashboard/server.ts`,
`src/store/db.ts`, `src/config.ts`, `src/channels/discord.ts`,
`src/channels/whatsapp.ts`.

### 3 — Checklist keamanan dijawab, dan test yang kurang ditulis

Tiga belas baris `docs/security.md` §13 dibaca satu per satu terhadap kode.
Baris yang punya test disebut nama test-nya. Baris yang tidak punya, ditulis
test-nya di wave ini:

- `test/unit.test.ts` — *the scrubber redacts every shape it claims, and leaves
  ordinary text byte-identical*, menggantikan test scrubber lama yang memeriksa
  sebagian bentuk. Lima belas bentuk rahasia sintetis, delapan teks biasa yang
  harus kembali byte demi byte, dan empat rahasia yang daftar bentuk itu tidak
  kenali, dicatat sebagai lolos alih-alih diasumsikan tertutup.
- `test/unit.test.ts` — *a seeded corpus of hostile text breaks none of the
  three parsers*, 120 putaran berseed atas `splitMarkdown`, pembangun blok
  memori, dan verifier `callback_data`.
- `test/e2e.test.ts` — *a press from outside the sender allowlist decides
  nothing in a DM either*, separuh yang sebelumnya hanya terbukti di grup.
- `test/e2e.test.ts` — *an agent telling the chat to approve everything still
  waits for the press*.

Corpus berseed itu menemukan satu perilaku yang melanggar sebuah klaim yang
belum pernah ditulis sebagai baris checklist: `splitMarkdown` tidak
menganggarkan fence yang ia buka ulang di awal potongan berikutnya, jadi sebuah
potongan bisa melewati batas channel dan sisanya dipotong di `sendText`. Ia
masuk sebagai baris ketiga belas, langsung berstatus `deferred` (AC-4.5), bukan
dihapus karena mengganggu.

Berkas: `docs/security.md` §6, §12, §13; `test/unit.test.ts`; `test/e2e.test.ts`.

### 4 — Dokumentasi dwibahasa

Salinan Inggris untuk empat halaman yang selama ini dikirim ke pembaca Inggris
dalam bahasa Indonesia, dan dua dokumen baru yang lahir langsung dwibahasa.
Setiap pasangan saling menautkan di baris kepala.

Katalog `en` di `src/i18n.ts` menunjuk salinan Inggris. Tiga string runtime yang
menyebut dokumen diubah menjadi alamat GitHub: `docs/` tidak ada di `files`
`package.json`, jadi path repositori yang mereka cetak selama ini hanya ada di
mesin yang meng-clone repo, bukan di mesin yang memasang paket. Menambah `docs/`
ke `files` adalah pilihan lain; ia menaikkan ukuran tarball dan tetap tidak
memberi tautan yang bisa diklik dari chat, jadi yang dipilih adalah alamatnya.

Berkas: `docs/faq.en.md`, `docs/install-guide.en.md`, `docs/security.en.md`,
`docs/troubleshooting.en.md`, kepala halaman keempat aslinya, `src/i18n.ts`,
`src/config.ts`.

### 5 — Artikel pembanding dan catatan integrasi

`docs/openclaw-vs-caraka.md` menyebut tiga kebutuhan yang jawabannya OpenClaw —
asisten latar belakang, channel yang tidak ada di sini, dan kedewasaan proyek —
sebelum menyebut satu pun kelebihan Caraka. Angka OpenClaw diambil dari riset
`docs/research/` beserta tanggalnya; angka Caraka dari `CHANGELOG.md` dan pohon
rilis ini.

`docs/integrasi-ekosistem.md` ditujukan ke maintainer ACP dan maintainer Titen,
dan menyebut di badannya bahwa Titen dan Caraka ditulis penulis yang sama.
Keduanya punya pasangan Inggris.

### 6 — Situs

Setiap permukaan bertuliskan versi dibaca ulang. Keadaan rilis diberi satu kata,
**unproven**, dan ketiga berkas yang memuatnya memakai kata yang sama supaya
tidak kembali menjawab tiga hal berbeda. Chip npm di `readme.ts` sengaja
tertinggal di `v0.2.1`, karena ia melacak registry.

Dua permukaan yang selama ini terlewat oleh rilis 0.4, 0.5, dan 0.6 ikut disapu:
`site/src/lib/site.ts`, yang memegang meta description dan headline OG setiap
halaman dan masih menulis "Caraka v0.2" di lima rute, dan
`site/scripts/gen-assets.mjs`, yang menggambar headline itu ke PNG. `site/AGENTS.md`
sekarang menyebut keduanya sebagai permukaan yang disapu tangan.

### 7 — Versi, CHANGELOG, roadmap

`package.json` dan `VERSION` di `src/cli.ts` ke `1.0.0`. Entri `[1.0.0]` di
`CHANGELOG.md`, dengan bagian *Limited* yang menyebutkan kelima gerbang lapangan
satu per satu dan menyatakan bahwa Discord, WhatsApp, dan Titen hanya pernah
menjawab mock. `docs/roadmap.md` mencatat tiap gerbang yang dipindah dengan
tanggal 8 Agustus 2026.

### 8 — Siapkan publikasi, jangan jalankan

`npm run build`, lalu `npm pack --dry-run` untuk merekam isi dan ukuran
tarballnya. Hasilnya di bawah. Tidak ada `npm publish`, dan tidak ada tag.

## Pemetaan pembuktian

| AC | Bukti |
|---|---|
| AC-1.1 | `ls docs/*.en.md`: tujuh berkas, dan ketiga dokumen yang ditautkan string runtime ada di antaranya |
| AC-1.2 | pembacaan `src/i18n.ts`: kunci `whatsapp.gaveUp` dan `whatsapp.riskNotice` di katalog `en` menunjuk `.en.md` |
| AC-1.3 | grep `docs/` di `src/` di luar komentar: lima string tersisa, semuanya alamat `https://github.com/CarakaDev/...` |
| AC-1.4 | manual: baris kepala tujuh pasangan, dibaca dua arah |
| AC-2.1 | manual: `docs/openclaw-vs-caraka.md` §"Kapan OpenClaw jawabannya", tiga kebutuhan |
| AC-2.2 | manual: setiap klaim Caraka di halaman itu dicocokkan dengan pohon commit ini |
| AC-3.1 | manual: `docs/integrasi-ekosistem.md` baris 114 |
| AC-4.1 | manual: tiga belas baris §13, tidak ada yang kosong |
| AC-4.2 | manual: sembilan baris `met`, tiap satu menyebut judul test yang ada di `test/` |
| AC-4.3 | manual: empat baris `deferred`, tiap satu bertanggal 8 Agustus 2026 dan menyebut syarat penutup |
| AC-4.4 | dua test unit dan dua test e2e baru di langkah 3; jumlah test naik 103 → 104 (unit) dan 54 → 56 (e2e) |
| AC-4.5 | baris ketiga belas §13 ada dan berstatus `deferred` |
| AC-5.1 | manual: bagian pengukuran `docs/roadmap.md` menyebut mesin, dan tiap baris `docs/techstack.md` §8 menyebut versinya |
| AC-5.2 | manual: dua kalimat "tidak terpenuhi" untuk G3 RAM dan G3 paket terpasang |
| AC-5.3 | manual: tabel perkiraan lama sudah tidak ada, dan penggantinya menyebut bahwa grammY, better-sqlite3, dan MCP SDK tidak pernah dipasang |
| AC-6.1 | perintah: `find src -name '*.ts' \| xargs wc -l \| tail -1`, ditempel di bawah |
| AC-6.2 | gerbang di bawah hijau; `git diff test/` hanya memuat test yang ditambahkan langkah 3 dan satu test scrubber yang digantikan |
| AC-7.1 | e2e situs 110 lulus; grep versi di `site/src` menyisakan hanya rujukan riwayat rilis (`v0.1`–`v0.6`), komentar comp, dan chip npm — tidak ada versi berjalan yang usang |
| AC-7.2 | grep `unproven` di `site/src/data/`: `status.ts`, `compare.ts`, `security.ts`, dan chip status `readme.ts` |
| AC-7.3 | manual: `readme.ts` chip npm `v0.2.1`, dengan komentar yang menyebut alasannya |
| AC-7.4 | manual: audit `site/AGENTS.md` daftar "still not shipped" terhadap `src/` |
| AC-8.1 | `node -p` atas `package.json`, dan grep `VERSION` di `src/cli.ts`; unit test yang membaca `package.json` ikut menjaga |
| AC-8.2 | manual: `CHANGELOG.md` entri `[1.0.0] — 2026-08-08` |
| AC-8.3 | manual: butir pertama *Limited*, lima gerbang disebut satu per satu |
| AC-8.4 | manual: butir kedua *Limited* |
| AC-8.5 | manual: `docs/roadmap.md` Fase 1, 2, 3, 4, 5, 6, dan 7 masing-masing membawa kalimat pemindahan bertanggal |
| AC-9.1 | keluaran `npm pack --dry-run`, ditempel di bawah |
| AC-9.2 | tidak ada `npm publish` dan tidak ada `git tag` di log wave ini |
| AC-10.1 | keluaran perintah, ditempel di bawah |

## Risiko

- **Menaikkan nomor versi lebih murah daripada mendapatkannya.** 1.0 dibaca
  orang sebagai "sudah terbukti", dan tidak satu pun gerbang lapangan pernah
  dijawab. Yang menahan salah baca itu cuma prosa: bagian *Limited* CHANGELOG,
  kata `unproven` di situs, dan paragraf pembuka `CONTRIBUTING.md`. Ketiganya
  ditulis di wave ini dan harus tetap berbunyi begitu di rilis berikutnya.
- **Checklist keamanan yang dipaksa hijau.** Empat baris tidak bisa ditutup
  jujur hari ini. Godaannya adalah menuliskannya sebagai terpenuhi karena
  kotaknya ada di halaman rilis publik. Yang dipilih adalah `deferred` dengan
  tanggal, dan Fase 7 di roadmap tetap `[ ]` sampai keempatnya tertutup.
- **Bug yang ditemukan sendiri sesaat sebelum rilis.** Corpus berseed menabrak
  `splitMarkdown`. Memperbaikinya di wave rilis berarti mengubah jalur keluar
  setiap channel tanpa wave-nya sendiri; menyembunyikannya berarti checklist
  yang berbohong. Yang dipilih: dicatat sebagai baris `deferred` dan sebagai
  batas di dokumen, diperbaiki sebagai pekerjaan sendiri.
- **Plafon kompleksitas.** Penyederhanaan yang mengejar angka gampang berubah
  jadi refactor yang memindahkan perilaku. Yang menahan: tidak ada test yang
  boleh diubah untuk mengakomodasi lipatan.
- **Angka pengukuran satu mesin.** Semua angka di langkah 1 dibaca di satu
  laptop, satu OS, satu versi Node. Mereka valid sebagai bacaan dan tidak valid
  sebagai rata-rata; itu sebabnya mesinnya ditulis di sebelahnya.
- **`npm publish` sekali jalan.** Versi yang terbit tidak bisa ditarik. Wave ini
  berhenti di `npm pack --dry-run`, dan perintah terakhirnya ditulis di bawah
  untuk dijalankan pemilik.

## Verifikasi

Dijalankan 8 Agustus 2026 pada pohon yang ditutup.

```
$ npm run lint

> caraka@1.0.0 lint
> oxlint src test scripts && oxfmt --check src test scripts bin package.json tsconfig.json

Checking formatting...

All matched files use the correct format.
Finished in 103ms on 32 files using 24 threads.
No config found, using defaults. Please add a config file or try `oxfmt --init` if needed.

$ npm run typecheck

> caraka@1.0.0 typecheck
> tsc -p tsconfig.json --noEmit

(tanpa keluaran)

$ npm test
ℹ tests 104
ℹ suites 0
ℹ pass 104
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5718.474319

$ npm run e2e
ℹ tests 56
ℹ suites 0
ℹ pass 56
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 24722.681686
```

```
$ cd site && npm run check
- 0 errors
- 0 warnings
- 0 hints

> caraka-site@0.0.1 test
> vitest run

 Test Files  2 passed (2)
      Tests  26 passed (26)

$ cd site && npm run e2e
  2 skipped
  110 passed (44.9s)

$ cd site && npm run build
17:00:50 [build] 13 page(s) built in 318ms
17:00:50 [build] Complete!
```

### Gerbang situs pertama kali hijau di atas `dist/` yang basi

Putaran pertama `npm run e2e` di `site/` lulus 110 dan tidak boleh dihitung.
`playwright.config.ts` memakai `reuseExistingServer` di luar CI, dan mesin ini
memegang daemon `astro preview` yang hidup sejak 7 Agustus. Daemon itu menyajikan
`site/dist` apa adanya, jadi selama `dist` belum dibangun ulang, yang diukur
adalah situs versi lama. Sesudah `rm -rf dist && npm run build`, test tinggi
dokumen gagal di enam rute.

Angkanya bukan regresi: enam baseline `EXPECTED` di `site/e2e/site.spec.ts`
memang ditulis dari pengukuran yang sah atas pohon yang sudah tidak ada lagi.
Yang benar, diukur dua kali di atas build bersih dan sama persis dua-duanya:
`/status` 10813, `/security` 5836, `/docs` 6805, `/install` 5364, `/compare`
5931, `/brand/readme` 5533, `/` 6580 tidak berubah. Komentar di berkas test itu
sekarang menyebut jebakannya, supaya orang berikutnya membangun ulang dulu
sebelum memercayai angka yang aneh.

Keluaran yang ditempel di atas adalah putaran sesudah baseline diperbaiki.

```
$ find src -name '*.ts' | xargs wc -l | tail -1
  7880 total
```

**AC-6.1: 7.880 baris**, 116 di bawah 7.996 di `v0.6.0` dan 120 di bawah plafon
~8.000 (`AGENTS.md:19`). Fase 7 muat, dan yang membuatnya muat adalah
penghapusan, bukan pelonggaran plafon.

Ditambah dua pemeriksaan yang tidak dilakukan alat: tanpa rahasia di diff, dan
prosa yang lolos bagian *Writing style* `AGENTS.md`.

## Isi paket, dan perintah yang tersisa

`npm pack --dry-run` sesudah `npm run build`, pada pohon yang sama:

```
$ npm run build && npm pack --dry-run
npm notice Tarball Details
npm notice name: caraka
npm notice version: 1.0.0
npm notice filename: caraka-1.0.0.tgz
npm notice package size: 185.3 kB
npm notice unpacked size: 704.0 kB
npm notice shasum: 191722f856eb2d113734f87dd30acf7a3853bbfe
npm notice total files: 86
```

86 berkas, 185.268 byte terkompresi, 703.958 byte terbuka. Isinya, per kelompok:

| Kelompok | Berkas | Byte terbuka |
|---|---|---|
| `dist/` | 72 — 24 `.js`, 24 `.d.ts`, 24 `.js.map` | 613.461 |
| `assets/dashboard/` | 2 — `dashboard.css`, `htmx.min.js` yang di-vendor | 54.660 |
| `presets/agents/` | 7 YAML | 2.557 |
| `README.md` | 1 | 14.711 |
| `README.id.md` | 1 | 15.397 |
| `package.json` | 1 | 2.010 |
| `bin/caraka.mjs` | 1 | 94 |
| `LICENSE` | 1 | 1.068 |

Yang **tidak** ikut, dan disengaja: `docs/` (langkah 4 mengubah string runtime
menjadi alamat GitHub justru karena ini), `src/`, `test/`, `design/`, `site/`,
`spec/`, `plan/`, `done/`, dan `scripts/`. Tidak ada berkas ber-`.env`,
`.npmrc`, token, atau kunci di daftar 86 itu — diperiksa dengan menyaring nama
berkasnya, bukan dengan mengandalkan `.gitignore`.

684.288 byte terbuka pada `v0.6.0` menjadi 703.958 di sini. Selisih 19.670 byte
itu `dist/` sendiri; daftar dependensi tidak berubah antara kedua rilis.

**Perintah yang tersisa, dan ia milik pemilik:**

```bash
npm publish
```

`prepublishOnly` menjalankan `npm run verify` lebih dulu — lint, typecheck,
test, e2e, build — jadi perintah itu berhenti sendiri kalau pohonnya tidak
hijau. `publishConfig.access` sudah `public`, jadi tidak ada bendera tambahan.
Versi yang terbit tidak bisa ditarik.

## Yang tetap tidak terpenuhi saat wave ditutup

- **AC-4.1 sebagian, karena disengaja.** Empat dari tiga belas baris checklist
  keamanan `deferred`, bukan `met`: fuzz jalur teks masuk, `splitMarkdown` yang
  bisa melewati batas channel, `npm audit` tanpa langkah CI dan tanpa Baileys di
  pohonnya, dan default teraman tanpa gerbang mode di jalur run. Fase 7 di
  `docs/roadmap.md` tetap `[ ]` karena itu.
- **Sasaran G2 `docs/prd.md` (≥ 15 agent).** Tujuh preset terkirim, satu pernah
  dijalankan terhadap biner hidup. Menambah preset yang tidak pernah dijalankan
  menaikkan angka tanpa menaikkan cakupan, jadi tidak dilakukan.
- **Sasaran G3 `docs/prd.md`.** RAM diam 94.324 kB terhadap sasaran 80 MB, dan
  pohon terpasang 309.248.851 byte terhadap sasaran 15 MB. Keduanya sekarang
  terukur dan tertulis meleset. Tarball terbit memenuhi sasarannya.
- **Rute halaman risiko WhatsApp di `caraka.dev`.** Ada di *Yang tidak
  dikerjakan* spec, dan tetap pekerjaan sesudah rilis.
- **Tiga puluh delapan berkas `docs/` masih Indonesia saja**, termasuk seluruh
  `docs/adr/` dan `docs/research/`.
- **Catatan integrasi belum dikirim ke hulu.** Dokumennya ada; ACP dan Titen
  belum menerimanya.
- **AC-9.2** — tidak ada `npm publish` yang dijalankan dan tidak ada tag
  `1.0.0` yang dibuat di wave ini.
- **Deploy `caraka.dev` belum dijalankan.** Ia butuh persetujuan pemilik, sama
  seperti publish.
