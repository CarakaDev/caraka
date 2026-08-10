# Plan — gerbang-rahasia

**Spec:** `spec.md` di direktori ini · **Tanggal:** 10 Agustus 2026

## Langkah

1. Verifikasi keempat temuan sebelum menyentuh apa pun: jalankan pemindai apa
   adanya (`exit 1`, tujuh baris dari dua suite), baca `package.json#verify`,
   `.github/workflows/ci.yml`, `ls .git/hooks`, `git config core.hooksPath`,
   dan `AGENTS.md:50`; jalankan `BANNED_FILES` aslinya terhadap tujuh string
   path; jalankan keenam pola terhadap dua penugasan tanpa kutip.
2. `ALLOWLIST` menerima `test/(unit|e2e).test.ts` dan `(^|/)\.env\.example$`.
   Akar `.env.example` tidak ada di repositori ini; `site/.env.example` ada,
   dan pengecualiannya harus buta-path seperti larangannya.
3. `BANNED_FILES` menjadi buta-path untuk env, npmrc, dan dev.vars, dan
   berbasis ekstensi untuk pem, key, p12.
4. Dua pola baru: `titen_sk_…`, dan penugasan `SCREAMING_CASE=nilai` tanpa
   kutip. Bentuk huruf kecil tanpa kutip sengaja tidak diambil — itu cara kode
   biasa menugaskan variabel (`const token = options.token`), bukan cara nilai
   ditulis.
5. `scan:secrets` masuk `package.json` dan menjadi perintah pertama di
   `verify`; satu langkah di job `verify` CI, sebelum lint.
6. `AGENTS.md:50` dan `standards/ears.md` Tahap 4 menyebut alatnya beserta
   batasnya: ia membaca berkas terlacak, bukan diff, terhadap daftar bentuk
   yang tetap.

## Pemetaan AC → pembuktian

| AC | Pembuktian |
|---|---|
| AC-1 | `bash scripts/scan-secrets.sh; echo $?` → `0` |
| AC-2 | Dry run regex terhadap dua belas string path, termasuk `site/.env`, `site/.env.local`, `site/.npmrc`, `site/.dev.vars`, `site/.env.example` |
| AC-3 | Kedelapan pola dijalankan terhadap berkas probe berisi tiga kunci sintetis dan dua penugasan variabel kode |
| AC-4 | Keluaran `npm run verify` di bawah; diff `ci.yml` |
| AC-5 | Diff `AGENTS.md` dan `standards/ears.md` |

## Risiko

Melepas kewajiban kutip pada pola generik meledakkan positif palsu. Terukur:
versi pertama dengan kata kunci dua huruf besar-kecil mengenai tujuh baris kode
biasa dan satu baris `htmx.min.js`. Karena itu bentuk tanpa kutip dipersempit ke
`SCREAMING_CASE=` tanpa spasi di sekitar `=`, yang tidak mengenai satu pun dari
kedelapan baris itu dan tetap mengenai ketiga kunci sintetis.

Meng-allowlist dua suite penuh membuat rahasia sungguhan di dalamnya lolos. Itu
harga yang diambil dengan sadar: literal berbentuk kredensial harus ada di sana
supaya scrubber bisa dibuktikan, dan gerbang yang merah setiap hari lebih mahal
daripada dua berkas yang tidak dipindai.

## Keluaran gerbang

`bash scripts/scan-secrets.sh` sebelum perubahan. Tujuh baris kena, dari dua
pola, semuanya fixture scrubber. Keluarannya diringkas jadi tabel dan bukan
ditempel apa adanya, karena percobaan menempelkannya membuat pemindai yang
dipasang plan ini gagal atas plan ini — dua kali, sampai bentuk penugasannya
hilang dari prosa. Itu bukan cacat pemindai; ia memang tidak bisa membedakan
kutipan dari sumbernya.

| Pola yang menyala | Berkas dan baris | Apa yang ada di sana |
|---|---|---|
| kunci privat | `test/unit.test.ts:131`, `:135` | header OpenSSH dan RSA di sekitar teks `not a real key` |
| penugasan berkutip | `test/e2e.test.ts:2142`, `test/unit.test.ts:2333` | token Discord palsu |
| penugasan berkutip | `test/unit.test.ts:219`, `:2772` | token Telegram palsu |
| penugasan berkutip | `test/unit.test.ts:3820` | nilai default parameter `secret` di helper penandatangan |

`exit 1`, tujuh baris, dua pola, nol rahasia sungguhan.

Dry run `BANNED_FILES` sesudah perubahan, per string path:

```
CAUGHT  .env
CAUGHT  site/.env
CAUGHT  site/.env.local
CAUGHT  site/.npmrc
CAUGHT  site/.dev.vars
CAUGHT  deploy/prod.key
CAUGHT  secrets/a.pem
CAUGHT  certs/x.p12
pass    site/.env.example (skipped as example)
pass    .env.example (skipped as example)
pass    src/keyring.ts
pass    docs/keys.md
```

Kedelapan pola terhadap berkas probe di luar repositori, berisi tiga kunci
sintetis dan dua baris kode. Nilainya dielid dengan alasan yang sama seperti di
atas; yang penting adalah pola mana yang menyala.

| Baris probe | Pola yang menyala |
|---|---|
| `CARAKA_TITEN_API_KEY` disetel ke `titen_sk_` + 24 karakter | kunci Titen, dan `SCREAMING_CASE` tanpa kutip |
| `CLOUDFLARE_API_TOKEN` disetel ke `v1.0-` + 24 karakter | `SCREAMING_CASE` tanpa kutip |
| `export CARAKA_TELEGRAM_TOKEN` disetel ke 9 digit, titik dua, `AA` + 33 karakter | token Telegram, dan `SCREAMING_CASE` tanpa kutip |
| `const token = options.token;` | tidak ada |
| `this.secret = cfg.appSecret ?? "";` | tidak ada |

`npm run verify`, pada pohon yang sudah memuat perubahan ini dan koreksi
dokumen di `done/catatan-integrasi-titen/`:

```
> caraka@1.2.0 verify
> npm run scan:secrets && npm run lint && npm run typecheck && npm test && npm run e2e && npm run build

> caraka@1.2.0 scan:secrets
> bash scripts/scan-secrets.sh
clean: 251 tracked files, no credentials

> caraka@1.2.0 lint
> oxlint src test scripts && oxfmt --check src test scripts bin package.json tsconfig.json

> caraka@1.2.0 typecheck
> tsc -p tsconfig.json --noEmit

> caraka@1.2.0 test
ℹ tests 113
ℹ pass 113
ℹ fail 0

> caraka@1.2.0 e2e
ℹ tests 62
ℹ pass 62
ℹ fail 0

> caraka@1.2.0 build
exit 0
```

Satu pemeriksaan tanpa alat, karena tinggal satu: prosa dicek terhadap *Writing
style* di `AGENTS.md`. Yang kedua sekarang dijalankan alat, dan barisnya di atas.
