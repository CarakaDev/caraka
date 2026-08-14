# Spec — topic-dm-vs-grup: satu flag DM berhenti mematikan topic di grup

**Status:** selesai · **Tanggal:** 14 Agustus 2026

## Latar

Sebuah supergroup forum yang topic-nya jelas hidup tidak pernah mendapat topic
dari Caraka, dan penyebabnya sebuah field yang tidak berbicara tentang grup sama
sekali.

`init` membaca `has_topics_enabled` dari `getMe` lalu menuliskannya sebagai
`telegram.topics` (`src/cli.ts:462`). Bot API mendefinisikan field itu sebagai
*"True, if the bot has forum topic mode enabled **in private chats**"* — sebuah
setelan DM. Nilai itu lalu menjadi `caps.threads`, dan `topicsAvailable`
memeriksanya lebih dulu untuk setiap wadah:

```ts
if (!this.channelOf(chatId).caps.threads) return false;   // mati di sini
if (message.chat.type === "private") return message.chat.is_forum !== false;
return message.chat.is_forum === true && this.forumChats.get(chatId) !== false;
```

Baris ketiga, satu-satunya yang berbicara tentang grup, tidak pernah tercapai
ketika Threaded Mode bot mati. Terukur pada 14 Agustus 2026 di instalasi ini:
`getMe` menjawab `has_topics_enabled: false`, config memuat `topics: false`, dan
sebuah grup forum dengan banyak topic tidak pernah mendapat satu pun dari Caraka.

Syarat topic di supergroup adalah grup itu forum dan bot punya
`can_manage_topics` di sana. Keduanya sudah diperiksa terpisah — `is_forum` dan
`forumChats` di baris ketiga. Setelan DM tidak termasuk syarat itu dan tidak
seharusnya ikut memutuskan.

Cabang DM sendiri tidak butuh flag itu untuk menjaga dirinya: Telegram menjawab
`is_forum` per chat, jadi sebuah DM yang tidak punya topic sudah tertahan oleh
baris keduanya sendiri. Dan kalau sebuah wadah tetap menolak, `noteThreadsOff`
menandainya pada penolakan sungguhan yang pertama dan sesi berikutnya berjalan
linear — degradasi yang sudah dibangun dan sudah diuji.

Baris `Topics` di `caraka doctor` berbagi kekeliruan yang sama: ia membaca flag
DM itu lalu menyuruh orang ke @BotFather, tanpa menyebut bahwa yang dibicarakan
percakapan pribadi. Baris itulah yang membuat pemilik instalasi ini diarahkan ke
setelan yang tidak ada hubungannya dengan grupnya.

## Ruang lingkup

`src/cli.ts` (apa yang `init` tulis ke `telegram.topics`, dan kalimat baris
`Topics` di `doctor`), `src/i18n.ts` bila kalimat itu ada di katalog,
`test/unit.test.ts`, `docs/session-model.md`, dan `docs/telegram-integration.md`.

## Yang tidak dikerjakan

- **Tidak menyentuh `topicsAvailable`.** Godaan pertama adalah memindahkan
  pemeriksaan `caps.threads` ke cabang `private` saja. Itu memperbaiki Telegram
  dan merusak Discord: di sana `discord.threads` adalah opt-out operator yang
  sungguhan, dan memindahkannya membuat sebuah guild channel tetap mendapat
  thread meskipun operatornya mematikannya. Yang salah bukan gerbangnya,
  melainkan nilai yang dimasukkan ke dalamnya.
- **Tidak mengubah arti `telegram.topics`.** Ia tetap preferensi operator
  "boleh atau tidak Caraka memakai topic", sejajar dengan `discord.threads`.
- **Tidak menulis ulang config yang sudah ada.** `init` menulis sekali; sebuah
  instalasi lama memuat `topics: false` dan tetap memuatnya sampai pemiliknya
  mengubahnya. Yang berubah di sini apa yang ditulis `init` berikutnya.
- **Tidak menambah pertanyaan baru di `init`.** Wizard sudah cukup panjang.

## Acceptance criteria

- **AC-1** WHEN `init` menulis config, ia shall menetapkan `telegram.topics`
  bernilai benar tanpa membaca `has_topics_enabled`.
- **AC-2** WHERE mode topic bot di percakapan pribadi mati, `init` shall tetap
  menulis `telegram.topics` bernilai benar.
- **AC-3** WHILE `telegram.topics` bernilai benar, WHEN sebuah pesan tiba di
  supergroup forum yang Caraka boleh kelola topic-nya, Caraka shall membuat
  topic untuk sesi baru.
- **AC-4** WHILE `telegram.topics` bernilai salah, WHEN sebuah pesan tiba di
  supergroup forum, Caraka shall tidak membuat topic.
- **AC-5** IF sebuah wadah menolak pembuatan topic, THEN Caraka shall menandai
  wadah itu dan menjalankan sesi berikutnya dalam mode linear.
- **AC-6** Baris `Topics` pada `caraka doctor` shall menyebut bahwa yang
  dilaporkannya percakapan pribadi.
- **AC-7** IF mode topic percakapan pribadi mati, THEN baris `Topics` shall
  tidak menyiratkan bahwa topic di grup ikut mati.
- **AC-8** Setiap kalimat baru yang dibaca orang shall ada di kedua katalog.
