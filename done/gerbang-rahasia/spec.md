# Spec — gerbang-rahasia: pemindai yang selalu merah dan tidak pernah dijalankan

**Status:** selesai · **Tanggal:** 10 Agustus 2026

## Latar

`scripts/scan-secrets.sh` ada sejak `e090f1b`. Empat hal salah dengannya
sekaligus, dan ketiganya yang pertama saling menutupi.

Ia keluar `1` pada pohon yang bersih. Pola kunci privat mengenai placeholder di
`test/unit.test.ts:131` dan `:135`, dan pola penugasan berkutip mengenai token
Discord dan Telegram palsu di `test/e2e.test.ts:2142` serta
`test/unit.test.ts:219`, `:2333`, `:2772`, `:3820`. Literal itu ada justru
karena suite scrubber membutuhkannya. Gerbang yang merah setiap hari adalah
gerbang yang keluarannya tidak dibaca siapa pun, dan hari ia merah karena alasan
sungguhan akan terlihat seperti hari Selasa.

Ia mengaku dijalankan di tempat yang tidak menjalankannya. Barisnya berbunyi
"Runs before every push, and in the verification gate", padahal `verify` di
`package.json` hanya lint, typecheck, test, e2e, build; `.github/workflows/ci.yml`
tidak punya langkahnya; `.git/hooks` hanya berisi contoh dan `core.hooksPath`
kosong; dan `AGENTS.md:50` justru mendaftar "no secrets in the diff" sebagai
salah satu dari "two checks no tool performs". Di repositori publik, klaim itu
lebih buruk daripada ketiadaannya.

`BANNED_FILES` berjangkar `^` pada path yang dicetak `git ls-files` relatif akar,
jadi cabang env dan npmrc hanya cocok di akar. Terukur terhadap regex aslinya:
`.env`, `deploy/prod.key`, dan `.npmrc` tertangkap; `site/.env`, `site/.env.local`,
dan `site/.npmrc` lolos. `site/` adalah tempat yang justru penting, karena
`site/.env.example` dilacak dan menyuruh kontributor menyalinnya ke `site/.env`
lalu mengisi `CLOUDFLARE_API_TOKEN`.

Tidak ada pola untuk kunci Titen, dan pola generiknya mewajibkan nilai berkutip.
Terukur: keenam pola tidak mengenai `CARAKA_TITEN_API_KEY=titen_sk_…` maupun
`CLOUDFLARE_API_TOKEN=v1.0-…`. Keduanya bentuk persis yang ditempel orang ke
berkas coret-coret saat menguji ke server hidup, dan repositori ini
berintegrasi dengan Titen (`src/memory/titen.ts`) dan menerbitkan lewat Cloudflare.

## Ruang lingkup

`scripts/scan-secrets.sh`, `package.json`, `.github/workflows/ci.yml`,
`AGENTS.md`, `standards/ears.md`.

## Yang tidak dikerjakan

- Tidak memindai riwayat. Yang diperiksa adalah apa yang dilacak sekarang.
- Tidak menambah dependensi pemindai. Pola tetap `grep -E` di satu berkas.
- Tidak menyentuh `site/` selain memastikan path di dalamnya ikut terpindai.
- Tidak menulis self-test untuk polanya. Pola adalah teks statis di berkas yang
  sama; menjaganya adalah membaca diff, bukan menambah kode.

## Acceptance criteria

- **AC-1** `bash scripts/scan-secrets.sh` shall keluar `0` pada pohon yang
  bersih.
- **AC-2** WHEN sebuah berkas env, npmrc, dev.vars, pem, key, atau p12 dilacak
  di subdirektori mana pun, THEN pemindai shall menyebutkan berkas itu dan
  keluar bukan nol; `*/.env.example` shall tetap dikecualikan.
- **AC-3** Pemindai shall mengenai `titen_sk_…` dan penugasan
  `NAMA_BESAR_TOKEN=nilai` tanpa kutip, tanpa mengenai penugasan variabel biasa
  di kode.
- **AC-4** `npm run verify` shall menjalankan pemindai lebih dulu daripada
  keempat perintah lain, dan job `verify` di CI shall memuat langkahnya.
- **AC-5** `AGENTS.md` dan `standards/ears.md` shall menyebut pemindai sebagai
  alat yang ada beserta batasnya, bukan sebagai pemeriksaan yang tidak dilakukan
  alat.
