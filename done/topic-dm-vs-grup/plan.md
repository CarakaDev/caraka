# Plan — topic-dm-vs-grup

**Spec:** [`spec/topic-dm-vs-grup.md`](../spec/topic-dm-vs-grup.md) · **Tanggal:** 14 Agustus 2026

## Langkah

1. `src/cli.ts:462` — argumen `topics` untuk `defaultConfig` berhenti membaca
   `bot.has_topics_enabled` dan menjadi `true`, dengan komentar yang menyebut
   definisi Bot API-nya supaya turunan itu tidak ditulis ulang oleh orang
   berikutnya yang melihat field bernama tepat.
2. `src/cli.ts` — dua baris `doctor` diberi nama wadah yang benar-benar mereka
   laporkan, dan pemulihannya menyebut bahwa topic grup tidak terpengaruh.
3. `test/unit.test.ts` — dua test baru.
4. `docs/session-model.md` dan `docs/telegram-integration.md` — kalimat yang
   menyamakan Threaded Mode dengan topic di grup.
5. `npm run verify`, lalu gerbang yang sama di `rama-tuf`.

## Pemetaan AC → pembuktian

| AC | Pembuktian |
|---|---|
| AC-1 | unit *a group's topics do not depend…*: `defaultConfig(...)` menulis `telegram.topics` `true`, dan test kedua memastikan pola `bot.has_topics_enabled === true,` tidak ada lagi di sumber |
| AC-2 | unit yang sama: nilai yang ditulis tidak bergantung pada apa pun yang dijawab `getMe` |
| AC-3 | unit yang sama: preferensi `true` menjadi `caps.threads` `true`, dan e2e *a topic gets its colour once and carries its state in the name* yang sudah ada membuktikan sebuah wadah ber-`is_forum` mendapat `createForumTopic` |
| AC-4 | unit yang sama: preferensi `false` menjadi `caps.threads` `false`, dan `topicsAvailable` menolak lebih dulu — gerbang itu sengaja tidak disentuh |
| AC-5 | e2e *a container that refuses a thread runs linear and is asked once* yang sudah ada, tidak diubah |
| AC-6 | unit *the doctor rows that read a private-chat field say so* |
| AC-7 | unit yang sama: pemulihannya memuat "a group's own topics are unaffected" |
| AC-8 | kedua baris itu dirakit di `src/cli.ts` dan bukan di katalog, sama seperti baris `doctor` lainnya; tidak ada kunci baru yang lahir |

## Risiko

**Sebuah DM tanpa mode topic sekarang dicoba sekali.** Dengan preferensi selalu
`true`, `createForumTopic` di DM yang Threaded Mode-nya mati akan ditolak. Itu
jalur yang sudah ada dan sudah diuji: `noteThreadsOff` menandai wadah itu pada
penolakan sungguhan yang pertama, memberi tahu pemiliknya sekali, dan sesi
berikutnya berjalan linear. Harganya satu panggilan API yang gagal per DM, sekali
seumur instalasi, dan `caraka doctor` menghapus penandanya kalau setelannya
berubah. Menukar itu dengan grup yang tidak pernah mendapat topic sama sekali
adalah tukar yang benar arahnya.

**Config yang sudah ada tidak ikut berubah.** `init` menulis sekali. Instalasi
yang sudah memuat `topics: false` tetap memuatnya sampai pemiliknya mengubah satu
baris, dan itu memang keputusannya. Yang berubah di sini apa yang ditulis `init`
berikutnya, dan baris `doctor` yang tidak lagi menyuruh orang ke setelan yang
salah.

**Anggaran.** +14 baris di `src/`, seluruhnya komentar dan penamaan ulang; satu
ekspresi berganti menjadi satu literal. `src/` 9.620 → 9.634.

## Keluaran gerbang

```
clean: 277 tracked files, no credentials
ℹ tests 160
ℹ pass 160
ℹ fail 0
ℹ tests 93
ℹ pass 93
ℹ fail 0
```

160 unit dari 158, yaitu dua test di atas. 93 e2e tidak bergeser: gerbang
`topicsAvailable` tidak disentuh, jadi setiap test yang menjaga mode linear dan
deteksi penolakan berjalan atas kode yang sama persis.

### Mesin kedua

Jalanan pertama di `rama-tuf` merah satu, dan yang merah bukan pekerjaan ini:
`approval callbacks reject forgery and preserve signed decision`. Ia membangun
callback palsunya dengan mengganti karakter terakhir tanda tangan menjadi `x`,
jadi pada run yang tanda tangannya memang berakhir `x`, "pemalsuan" itu string
aslinya dan verifikasi menerimanya dengan benar. Terukur **98 tabrakan dari
6.400 callback, 1,53%**, terhadap 1,56% yang diramalkan satu karakter dari
alfabet 64 simbol. Kodenya tidak pernah salah; test-nya yang salah, dan test
keamanan yang flaky terbaca sebagai lubang keamanan oleh orang yang menemukannya
berikutnya. Mutasinya sekarang dijamin berbeda dan diassert berbeda sebelum
dipakai. Itu test flaky kedua yang ditemukan mesin kedua dalam dua hari.

Sesudah perbaikan itu:

```
clean: 277 tracked files, no credentials
ℹ tests 160 · pass 160 · fail 0
ℹ tests 93  · pass 93  · fail 0
RESULT: gate green
```
