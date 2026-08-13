# Plan — scrubber-token-url

**Spec:** [`spec/scrubber-token-url.md`](../spec/scrubber-token-url.md) · **Tanggal:** 13 Agustus 2026

## Langkah

1. Merah dulu. Sebelum pola disentuh, dua pembuktian ditulis dan dijalankan
   supaya keduanya gagal. Yang pertama, satu baris di `secretCorpus`
   (`test/unit.test.ts:115-140`, baris ke-16), memakai badan token yang sudah
   ada di baris "a Telegram bot token" dan membungkusnya sebagai URL `getFile`:
   `https://api.telegram.org/file/bot123456789:not-a-real-telegram-bot-token-value/photos/f.jpg`.
   Yang kedua, satu field di test baris audit (`test/unit.test.ts:3328`):
   `details` mendapat satu field `url` berisi
   `https://api.telegram.org/file/bot${FIXTURE_TOKEN}/photos/f.jpg`, dan
   `assert.equal(row.details.includes(FIXTURE_TOKEN), false)` yang sudah ada di
   test itu (`:3345`) mulai gagal. Hari ini assert itu lolos atas bentuk
   telanjang: `details` sampai ke scrubber sebagai JSON, jadi tanda kutip di
   depan digit pertama memenuhi `\b`. URL yang duduk di dalam sebuah nilai JSON
   tidak punya tanda kutip itu.
2. `src/core/security.ts:8` — `\b` di depan dilepas, jadi
   `/\d{6,12}:[A-Za-z0-9_-]{30,}\b/g`. Batas di belakang tetap: di dalam URL
   token diikuti `/`, jadi ia sudah cocok. Di atas baris itu enam baris
   komentar, karena orang berikutnya yang membacanya akan melepas batas pada
   pola yang lain. `AGENTS.md` menyebut komentar yang mencegah bentuk salah
   ditulis dua kali sebagai hal terakhir yang pantas dibeli dari anggaran ini:

   ```ts
   // No leading `\b`: nothing separates the `t` of `bot` from the first digit, so
   // `…/file/bot<token>/<path>` passed through whole until 13 August 2026. The four
   // patterns below keep theirs: drop the JWT one's and it eats
   // `apiKeyJsonSchemaLoader.helperUtils.serializerFunctions`, drop the vendor one's
   // and it eats any SCREAMING_CASE name containing `AKIA`, and the last one's
   // boundary only decides which `.env` names match, which is a different change.
   ```

   Komentar ini bahasa Inggris seperti seluruh isi `src/`, dan sengaja tidak
   memuat literal Indonesia: test *no Indonesian string survives outside the
   catalog* (`test/unit.test.ts:2256-2269`) membaca isi berkas, komentar
   termasuk. Contoh Indonesia untuk pola awalan vendor tinggal di `test/`, yang
   tidak dibaca test itu.
3. `test/unit.test.ts:145-154` — `survivesIntact` mendapat tiga baris, satu per
   pola yang batasnya benar-benar menahan teks biasa, supaya keputusan langkah 2
   punya penjaga dan bukan cuma komentar:
   `apiKeyJsonSchemaLoader.helperUtils.serializerFunctions`,
   `comMyVeryLongNamespaceThing.helper.andThenAnotherLongIdentifierName`, dan
   `MAKIANNYA_TIDAK_DICATAT_DI_SINI`. Ketiganya kembali byte demi byte hari ini
   dan harus tetap begitu.
4. `test/unit.test.ts:176` — satu assert untuk AC-4 di dalam test yang sudah
   ada: URL dengan id 16 digit, `…/bot8123456789012345:<badan>/getFile`, dan
   badan token sesudah titik dua tidak ada di keluaran. Yang tercetak adalah
   `bot8123[REDACTED]/getFile` — pola melahap dua belas digit terakhir, jadi
   assert-nya atas badan token dan bukan atas seluruh URL.
5. `docs/security.md` — satu kalimat di §6 sesudah paragraf token Discord
   (`:246`), mencatat bahwa bentuk Telegram hanya diredaksi pada batas kata
   sampai 13 Agustus 2026 dan bahwa URL unduhan menempelkannya pada kata `bot`.
   Lalu baris §13 (`:391`): "lima belas bentuk" menjadi enam belas, "delapan
   teks biasa" menjadi sebelas. Tabel pola di `:232-243` tidak berubah; ia
   menulis bentuknya sebagai `<6–12 digit>:<≥30 karakter>` tanpa menyebut batas,
   yang sesudah langkah 2 baru benar-benar akurat.
6. `npm run verify`: `scan:secrets` → `lint` → `typecheck` → `build` → `test` →
   `e2e`. Keluarannya ditempel di bawah.

## Pemetaan AC → pembuktian

| AC | Pembuktian |
|---|---|
| AC-1 | unit *the scrubber redacts every shape it claims…*: baris korpus ke-16 (URL `getFile`), `output.includes(value)` false dan `[REDACTED]` cocok. Gagal sebelum langkah 2 |
| AC-2 | unit, test yang sama: baris "a Telegram bot token" yang sudah ada, dibungkus `before … after`, tetap tergantikan |
| AC-3 | unit, test yang sama: sebelas baris `survivesIntact` dan empat baris `notByShape` dibandingkan dengan `assert.equal(scrub(value), value)` |
| AC-4 | unit, test yang sama: satu assert atas URL berid 16 digit, badan token tidak ada di keluaran |
| AC-5 | unit *the audit row store.audit writes is already scrubbed before it reaches disk* (`test/unit.test.ts:3328`): `details` membawa `url`, dan `row.details.includes(FIXTURE_TOKEN)` dibaca dari `SELECT … FROM audit`. Gagal sebelum langkah 2 |
| AC-6 | manual: hitung baris `secretCorpus`, `survivesIntact`, dan `notByShape`, lalu baca §13 `docs/security.md` berdampingan. Enam belas, sebelas, empat |
| AC-7 | `grep -n "13 Agustus 2026" docs/security.md` menunjuk ke §6, dan kalimatnya menyebut `bot<token>` |

## Risiko

**Pola melebar ke kiri, dan yang masuk sudah diukur.** Tanpa `\b`, pola cocok
untuk `<karakter kata><6–12 digit>:<≥30 karakter kata>`. Delapan belas bentuk
teks biasa diprobe pada 13 Agustus 2026 — delapan baris `survivesIntact`, empat
baris `notByShape`, ditambah digest `sha256:`, cap waktu ISO, id numerik panjang
diikuti titik dua dan spasi, `127.0.0.1:8787/dashboard`, rujukan issue GitHub,
dan satu baris base64 berakhir `=` diikuti titik dua — dan tidak satu pun
tergantikan. Bentuk yang memang tergantikan adalah
`run1754000000000:completed-after-42-seconds-of-work`: deret digit lebih dari 12
menempel pada kata, lalu titik dua, lalu tiga puluh empat karakter kata tanpa
spasi. Caraka tidak menulis bentuk itu: sepuluh tempat di `src/` yang menyambung
dua nilai dengan titik dua diperiksa pada 13 Agustus 2026, dan badan sesudah
titik dua tidak pernah mencapai tiga puluh karakter kata di satu pun. Yang
paling dekat adalah `${containerId}:${actor.id}` di
`src/channels/discord.ts:618`, dan sebuah snowflake Discord berhenti jauh di
bawah tiga puluh digit. Kalau bentuk itu datang dari stderr agent, harganya satu
`[REDACTED]` di baris log. Dicatat, bukan dijaga: menjaganya menuntut lookbehind
dan alasan kedua untuk membaca pola itu.

**Separuh id tetap terbaca, dan itu memang separuh yang bukan rahasia.** Id yang
lebih panjang dari 12 digit tercetak sebagian: 16 digit keluar sebagai
`bot8123[REDACTED]`, diukur 13 Agustus 2026 atas pola sesudah langkah 2. Id itu
adalah user id Telegram bot tersebut dan setiap pesan yang dikirimnya
mengungkapkannya; yang rahasia adalah badan sesudah titik dua, dan AC-4
menguncinya. Sebelum perubahan ini id sepanjang itu membuat seluruh token lolos,
jadi arah perubahannya satu arah.

**Fixture di repositori publik.** Baris korpus baru memakai badan yang sudah
ter-commit, `not-a-real-telegram-bot-token-value`, jadi tidak ada materi baru
yang berbentuk kredensial. `scripts/scan-secrets.sh` mengizinkan
`test/unit.test.ts` lewat `ALLOWLIST`, dan push protection GitHub membaca berkas
dan bukan maksudnya — itu sebabnya badan fixture ditulis dari kata-kata, dan
sebabnya baris baru tidak mengarang bentuk yang lebih realistis.

**+6 baris tanpa penghapusan.** Keenamnya komentar langkah 2; menghapus satu
karakter dari pola tidak mengubah jumlah baris, jadi `src/` 8.498 → 8.504.
Angkanya dicatat seperti `AGENTS.md` mencatat +149 pada 10 Agustus 2026.
`standards/ears.md` §5 menolak satu PR yang memperbaiki bug sekaligus merapikan,
jadi penghapusan yang ada di jangkauan (pemindaian PRAGMA kembar di
`src/store/db.ts:145-149` dan `:158-162`, dan pasangan `route`/`sessionFor` yang
berulang di `src/core/gateway.ts`) tinggal untuk pekerjaan yang memilikinya.

## Keluaran gerbang

Merah dulu, 13 Agustus 2026, sesudah langkah 1 dan sebelum langkah 2. Kedua
pembuktian gagal karena alasan yang benar dan bukan karena alasan lain:

```
$ node --import tsx --test --test-name-pattern "the scrubber redacts every shape|audit row store.audit writes" test/unit.test.ts

✖ the scrubber redacts every shape it claims, and leaves ordinary text byte-identical
  AssertionError [ERR_ASSERTION]: a Telegram bot token inside a getFile URL
    actual: true,
    expected: false,
✖ the audit row store.audit writes is already scrubbed before it reaches disk
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
    actual: true,
    expected: false,
ℹ pass 0
ℹ fail 2
```

Baris korpus melaporkan namanya sendiri, jadi yang gagal terbukti baris ke-16 dan
bukan salah satu dari lima belas yang sudah ada. Sesudah langkah 2, keduanya:

```
✔ the scrubber redacts every shape it claims, and leaves ordinary text byte-identical (1.513666ms)
✔ the audit row store.audit writes is already scrubbed before it reaches disk (53.635291ms)
ℹ pass 2
ℹ fail 0
```

Gerbang penuh (`npm run verify`) pada keadaan saat pekerjaan ini mendarat:

```
clean: 253 tracked files, no credentials
ℹ tests 113
ℹ pass 113
ℹ fail 0
ℹ tests 62
ℹ pass 62
ℹ fail 0
```

113 unit dan 62 e2e, tidak ada yang merah. Sebelas baris `survivesIntact` kembali
byte demi byte, yang membuktikan AC-3 dan sekaligus bahwa pelepasan batas tidak
melebar ke teks biasa. Hitungan korpus dibaca langsung dari berkas test dan
cocok dengan §13: enam belas, sebelas, empat.
