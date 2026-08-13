# Spec — scrubber-token-url: token bot di dalam URL lolos dari scrubber

**Status:** aktif · **Tanggal:** 13 Agustus 2026

## Latar

Pola token bot Telegram di `src/core/security.ts:8` adalah
`/\b\d{6,12}:[A-Za-z0-9_-]{30,}\b/g`. `\b` di depan menuntut batas kata sebelum
digit pertama, dan URL unduhan Bot API menempelkan token pada kata `bot`:
`t` dan `8` keduanya karakter kata, jadi tidak ada batas di sana dan pola itu
tidak pernah mulai cocok. Dijalankan apa adanya pada 13 Agustus 2026:

```
8123456789:AAHdq…                                         -> [REDACTED]
my token is 8123456789:AAHdq… ok                          -> [REDACTED]
https://api.telegram.org/file/bot8123456789:AAHdq…/x.jpg  -> tidak berubah
https://api.telegram.org/bot8123456789:AAHdq…/getFile     -> tidak berubah
```

Bentuk yang lolos justru bentuk yang paling banyak dibangun.
`src/channels/telegram.ts:108` menyusun setiap panggilan sebagai
`${this.base}/bot${this.token}/${method}`, dan `getFile` menjawab dengan
`file_path` yang hanya berguna sebagai separuh dari
`https://api.telegram.org/file/bot<token>/<file_path>`. Di dalam proses ini token
itu hampir selalu sampai ke scrubber sudah menempel pada `bot`.

Yang menutupinya sekarang hanya seeding exact. `src/cli.ts:718` membangun
scrubber dengan `createScrubber(startupSecrets(loaded))`, dan scrubber itulah
yang dipegang store, gateway, registry driver, dan memory Titen. `createScrubber`
menjalankan penggantian exact sebelum daftar pola (`security.ts:35-37`), jadi
token yang proses ini sendiri muat tetap tergantikan di mana pun ia berada,
termasuk di dalam URL. Daftar pola
adalah lapis yang menangkap token yang proses ini **tidak** muat: token bot lain
yang ditempel ke chat, atau token yang dibaca coding agent dari sebuah berkas
lalu dicetak ke stderr. `docs/security.md:246` sudah menuliskan batas itu untuk
token Discord dengan kalimat yang sama, "seeding hanya menutup token yang proses
ini kebetulan muat".

Konsekuensinya tidak bisa dibatalkan. `src/store/db.ts:507-508` menjalankan
scrubber atas `result` dan `details` setiap baris audit, dan tabel `audit`
memakai trigger `audit_no_update` dan `audit_no_delete` (`db.ts:111-116`), jadi
baris yang sudah membawa token tidak bisa diperbaiki dan tidak bisa dihapus.
`src/drivers/cli.ts:161,166` menjalankan scrubber yang sama atas setiap
kesalahan driver. Aturan keras 4 di `AGENTS.md` menuntut rahasia discrub sebelum
menyentuh disk atau chat; bentuk ini tidak discrub.

`spec/lampiran-chat.md:45` menyebut celah ini sebagai yang diperbaiki lebih dulu
di sini, jadi pekerjaan ini mendahului kode apa pun yang bisa menaruh URL unduhan
di sebuah baris audit.

## Ruang lingkup

Pola token bot Telegram di `src/core/security.ts`, korpus scrubber di
`test/unit.test.ts` beserta test baris audit yang sudah ada di sana, dan dua
tempat di `docs/security.md` yang menghitung korpus itu dan menjelaskan
daftarnya.

Anggaran kompleksitas di `AGENTS.md`: pekerjaan ini menambah baris `src/`, dan
angka terukurnya dicatat di plan. Tidak ada penghapusan yang ikut dalam
pekerjaan ini — `standards/ears.md` §5 menolak satu PR yang memperbaiki bug
sekaligus merapikan.

## Yang tidak dikerjakan

- Batas kata pada empat pola lain yang membawanya tidak dilepas. Diprobe pada
  13 Agustus 2026: tanpa batas itu pola JWT (`security.ts:9`) memakan
  `apiKeyJsonSchemaLoader.helperUtils.serializerFunctions`, pola token Discord
  (`:18`) memakan `comMyVeryLongNamespaceThing.helper.andThenAnotherLongIdentifierName`,
  dan pola awalan vendor (`:19`) memakan nama SCREAMING_CASE yang memuat `AKIA`.
  Ketiga kredensial itu tidak pernah menempel pada karakter kata di URL yang
  Caraka bentuk: JWT dan kunci vendor sampai ke scrubber sebagai nilai yang
  selalu didahului karakter bukan-kata, dan token Discord berjalan di header
  `Authorization`. Pola keempat, `NAMA=nilai` di `:21`, tidak memakan teks biasa
  tanpa batas itu; yang berubah adalah nama `.env` mana yang cocok sama sekali —
  `xDB_PASSWORD=hunter2` lolos hari ini dan berhenti lolos tanpa batas itu.
  Melebarkan cakupan itu perubahan lain, bukan perbaikan bug ini.
- `\d{6,12}` tidak dilebarkan. Panjang id bukan perkara pekerjaan ini, dan
  AC-4 mengunci bagian yang memang rahasia.
- Tidak ada bentuk baru yang masuk daftar. Empat rahasia yang sudah tercatat
  lolos di `notByShape` tetap tercatat lolos.
- `scripts/scan-secrets.sh` tidak disentuh. Pola Telegram-nya,
  `[0-9]{8,10}:AA[A-Za-z0-9_-]{33}`, tidak membawa batas kata sama sekali, jadi
  pemindai repositori tidak pernah punya celah ini.
- Tidak ada kode unduhan lampiran. Itu `spec/lampiran-chat.md`, dan pekerjaan
  ini yang mendahuluinya.
- Tidak ada perubahan katalog. `[REDACTED]` bukan string katalog dan tidak ada
  kalimat baru yang dilihat pengguna.

## Acceptance criteria

- **AC-1** WHEN scrubber menerima token bot Telegram yang menempel pada
  karakter kata di depannya, scrubber shall menggantinya dengan `[REDACTED]`.
- **AC-2** WHEN scrubber menerima token bot Telegram yang didahului karakter
  bukan-kata, scrubber shall menggantinya dengan `[REDACTED]`.
- **AC-3** Scrubber shall mengembalikan setiap baris korpus teks biasa di
  `test/unit.test.ts` tanpa mengubah satu byte pun.
- **AC-4** IF id sebelum titik dua lebih panjang dari 12 digit, THEN scrubber
  shall tetap menghapus badan token yang mengikuti titik dua itu.
- **AC-5** WHEN `store.audit` menerima detail yang memuat URL berisi token bot,
  baris audit yang tersimpan di database shall tidak memuat token itu.
- **AC-6** Baris di `docs/security.md` §13 yang menghitung korpus scrubber shall
  menyebut jumlah baris yang benar-benar ada di `test/unit.test.ts`.
- **AC-7** `docs/security.md` §6 shall mencatat bahwa bentuk token Telegram
  hanya diredaksi pada batas kata sampai 13 Agustus 2026.
