# Telegram Integration

**English:** this document is Indonesian only, and stays that way because it is internal specification. English documentation starts at [`../README.md`](../README.md).

**Produk:** Caraka · **Versi:** 0.2 · **Tanggal:** 7 Agustus 2026
**Status:** Telegram adalah **channel pertama dan channel referensi**.
**Riset pendukung:** `docs/research/telegram-bot-api-2026-core-telegram-botnews.md`
**Sumber API:** setiap klaim method dan field di halaman ini diperiksa terhadap
`https://core.telegram.org/bots/api` pada 7 Agustus 2026.

---

## 1. Kenapa Telegram lebih dulu

1. **Tanpa risiko ban** — Bot API resmi, gratis, tanpa verifikasi bisnis.
2. **Tanpa port terbuka** — long-polling berarti gateway tetap bisa `bind 127.0.0.1` tanpa tunnel apa pun.
3. **Topic di private chat** — memberi model sesi ber-tab tanpa setup apa pun dari user.
4. **Rich Messages** — code block, tabel, dan diff akhirnya bisa dirender native.
5. **Tombol berwarna** — approval yang tidak ambigu.

Target versi: **Bot API 10.2** dengan degradasi otomatis ke jalur lama bila server/pustaka belum mendukung.

---

## 2. Pemetaan fitur

| Kebutuhan produk | Fitur Telegram | Fallback |
|---|---|---|
| Sesi ber-tab | `createForumTopic` di private chat | mode linear + header `[ws · #id]` |
| Status sesi terlihat sekilas | `editForumTopic` (`name`, `icon_custom_emoji_id`) | prefiks di nama topic |
| Menandai sesi selesai | `editForumTopic` lalu `closeForumTopic` — lihat catatan di bawah | pesan penutup saja |
| Hasil terstruktur (diff, tabel, test) | `sendRichMessage` dengan input Markdown | teks polos yang sudah di-scrub dan dipecah |
| Streaming progres | `sendRichMessageDraft` + `InputRichBlockThinking` | `editMessageText` teks polos |
| Approval | `InlineKeyboardButton` | tolak permission bila callback tidak tersedia; teks tidak pernah menjadi approval |
| Approval di grup | kartu yang sama, terbaca seluruh anggota | kalimat pengungkapan saat pairing grup (§6) |
| Lampiran keluar | `sendDocument` / `sendPhoto` | tautan file |
| Voice note masuk | unduh file → transcriber user (opsional) | tolak dengan pesan jelas |
| Lapisan izin kedua | access whitelist @BotFather (**belum terverifikasi**, §6) | allowlist kita saja |

### Sesi ditutup di grup, dan tidak ditutup di DM

Deskripsi Bot API untuk `closeForumTopic` dan `reopenForumTopic` berbunyi "in a
forum supergroup chat" saja. Klausa "or a private chat with a user" ada di
`createForumTopic`, `editForumTopic`, `deleteForumTopic`, dan
`unpinAllForumTopicMessages`, dan tidak ada di keduanya. Topic di DM memang bisa
dibuat dan diubah, tetapi tidak ada method berdokumentasi yang menutupnya, dan
sesi di sana berhenti di penggantian nama.

Versi sebelumnya dokumen ini menyimpulkan dari situ bahwa grup pun tidak bisa.
Itu salah, dan sejak 1.4.3 diperbaiki. Di grup haknya sudah dipegang:
`can_manage_topics` didefinisikan sebagai "allowed to create, rename, close, and
reopen forum topics", dan `gateway.ts` hanya menyalakan `forumChats` untuk grup
ketika hak itu ada. Deskripsi kedua method juga memuat pengecualian "unless it is
the creator of the topic", dan sejak 1.3.1 Caraka hanya menyentuh thread yang
dibukanya sendiri, jadi ia selalu pencipta topic yang akan ditutupnya.

Menutup tidak menghilangkan apa pun: ia `messages.editForumTopic` dengan flag
`closed` saja, ditambah satu service message `forum_topic_closed`. Yang
menghapus transkrip adalah method sebelahnya, yang menghapus topic "along with
all its messages", dan repositori ini tidak menyebut namanya di `src/` sama
sekali — satu test gagal kalau nama itu muncul.

Dua hal yang ikut mengikat. Penutupan dan penggantian nama adalah dua panggilan:
`TOPIC_CLOSE_SEPARATELY` menyatakan flag `close` tidak boleh dikirim bersama flag
lain, jadi `editForumTopic` tidak bisa membawa keduanya. Dan `reopenForumTopic`
dipanggil tepat pada transisi yang penutupan terjadi — dari
`done`/`failed`/`cancelled` kembali ke `running` — karena `TOPIC_NOT_MODIFIED`
adalah galat 400 untuk bot, sehingga penutupan-pembukaan per pesan masuk adalah
bentuk yang menarik flood wait.

Sesudah sebuah topic ditutup, yang masih bisa menulis di dalamnya hanya admin
ber-`can_manage_topics` dan pencipta topic; anggota biasa mendapat
`TOPIC_CLOSED`. Itu konsekuensi yang dipilih sadar, dan `session-model.md` §5
mencatatnya alih-alih membiarkan tabelnya berbohong.

`closeGeneralForumTopic` dan keluarganya tidak dipakai, dan `message_thread_id`
bernilai `1` tidak pernah dikirim: `ForumTopicId::general()` bernilai 1, jadi
`closeForumTopic` dengan 1 kemungkinan besar benar-benar menutup General. Pesan di
General tidak membawa `message_thread_id`, sehingga `session.threadId` kosong dan
`setState` sudah kembali lebih dulu.

**`icon_color` tidak bisa diubah setelah topic dibuat.** Parameter itu hanya ada
di `createForumTopic`; tabel parameter `editForumTopic` berisi `chat_id`,
`message_thread_id`, `name`, dan `icon_custom_emoji_id` saja. Beberapa dokumen di
repo ini menulis warna ikon sebagai penanda state yang berubah mengikuti sesi
(`frd.md` FR-TOPIC-03, `session-model.md` §, `ui-ux.md` §5). Itu tidak bisa
dilakukan lewat API yang sama: warna terkunci saat topic dibuat, dan yang masih
bisa berubah adalah nama topic dan custom emoji-nya. Model warna-per-state perlu
keputusan di spec, bukan penulisan ulang diam-diam di sini.

Karena itu urutannya penggantian nama lalu penutupan, dan ringkasan penutup
dikirim sebelum keduanya. Yang belum diuji terhadap server sungguhan: apakah
Telegram benar-benar mengembalikan galat untuk `closeForumTopic` di chat bertipe
`private`, atau sekadar tidak mendokumentasikannya. Jawabannya tidak dijadikan
dasar perilaku apa pun — `.catch(() => undefined)` di `setState` tidak membaca
isinya, dan sesi tetap tertandai.

---

## 3. Rich Messages — aturan pemakaian

### Kapan pakai apa

| Fase | Method | Alasan |
|---|---|---|
| Ack (< 1 dtk) | `sendMessage` teks polos | tercepat, tanpa risiko format |
| Progres | `editMessageText` pada pesan ack | murah, tidak spam |
| Hasil akhir | **`sendRichMessage`** pesan baru | format kaya, code block native |
| Setelah hasil terkirim | `deleteMessage` pesan progres | menjaga topic bersih |

Pola kirim-baru + hapus-lama dipakai untuk hasil akhir. Alasan yang dulu ditulis
di sini sudah tidak berlaku dan diganti, bukan dipertahankan.

Yang lama: "tidak ada `editRichMessage`". Method dengan nama itu memang tidak
pernah ada, tetapi kemampuannya sudah ada. Bot API 10.1 (11 Juni 2026)
menambahkan parameter `rich_message` bertipe `InputRichMessage` pada
`editMessageText`, dan deskripsi method itu sekarang berbunyi "edit text, rich
and game messages". Sebuah pesan **bisa** di-edit menjadi rich message.

Yang tersisa sebagai alasan: laporan lapangan bahwa format rich hancur menjadi
teks polos dengan penanda sintaks mentah saat di-edit di tengah stream. Laporan
itu mendahului `rich_message` dan **belum diuji ulang** setelahnya. Sampai ada
yang mengujinya, pola kirim-baru + hapus-lama tetap dipakai karena ia sudah
bekerja, bukan karena API melarang yang lain.

v0.1 mengirim `InputRichMessage.markdown`. Keluaran panjang dipecah pada batas
baris sambil menutup dan membuka kembali code fence. Block terstruktur dan
lampiran diff tetap berada di roadmap.

### Ketersediaan pustaka

Dukungan pustaka masih tertinggal dari API. v0.1 memanggil Bot API langsung
lewat `src/channels/telegram.ts`. Migrasi tipe nanti tetap terpusat di satu
berkas.

**Aturan wajib:** jangan pernah menolak/menjatuhkan update yang memuat field tak dikenal — ini penyebab kerusakan paling umum saat versi Bot API naik.

---

## 4. Approval

```
⚠️  Butuh izin                                    [topic: ▸ toko-api · rate limit]

   Tulis berkas
   src/plugins/rate-limit.ts   (baru · 28 baris)

   Berlaku 10 menit · kode A7F3

   [ ✅ Setujui ]   [ 👁 Lihat isi ]   [ ❌ Tolak ]
       hijau            netral            merah
```

- Warna tombol memakai field `style` pada `InlineKeyboardButton`; ikon memakai `icon_custom_emoji_id` bila pemilik bot punya Premium — keduanya **peningkatan opsional**, bukan syarat.
- `callback_data` memuat `approval_id` + nonce sekali pakai. Payload divalidasi terhadap `(principal, session, request)`; nonce kedaluwarsa 10 menit.
- Callback approval terikat principal. `src/core/gateway.ts:357` menolak callback dari siapa pun di luar allowlist, apa pun chat asalnya. Anggota grup yang menekan tombol tanpa berada di allowlist tidak menyetujui apa pun.
- Kartu approval berlaku sepuluh menit (`src/core/gateway.ts:283`). Angka itu yang membuat pesan ephemeral tidak bisa dipakai untuk menyembunyikannya; lihat §6.
- v0.1 menolak setiap update non-private sebelum mencapai Claude. v0.2 memproses sebuah pesan hanya bila chat-nya ada di allowlist chat **dan** pengirimnya ada di allowlist pengirim. Dua daftar, dua keputusan.

---

## 5. Perintah bot

| Perintah | Scope | Fungsi |
|---|---|---|
| `/new` | `BotCommandScopeChat` | mulai sesi baru |
| `/stop` | `BotCommandScopeChat` | kirim `session/cancel` |
| `/status` | `BotCommandScopeChat` | tampilkan state sesi |
| `/help` | `BotCommandScopeChat` | tampilkan command |

Dua koreksi terhadap versi sebelumnya tabel ini.

Kolom ketiga dulu berjudul `is_ephemeral` tetapi berisi kalimat fungsi. `is_ephemeral`
adalah field boolean opsional pada `BotCommand` yang menyatakan bahwa perintah itu
mengirim pesan ephemeral. Caraka tidak mengirim satu pun perintah ephemeral, jadi
field itu tidak dipakai dan judul kolomnya diganti.

Kolom scope dulu berisi `private`. Tidak ada scope bernama itu. Bot API punya tujuh:
`BotCommandScopeDefault`, `BotCommandScopeAllPrivateChats`, `BotCommandScopeAllGroupChats`,
`BotCommandScopeAllChatAdministrators`, `BotCommandScopeChat`, `BotCommandScopeChatAdministrators`,
`BotCommandScopeChatMember`. v0.2 memakai `BotCommandScopeChat` sekali per id di
`telegram.allowFrom`.

Sumber id itu berubah pada 13 Agustus 2026: yang punya menu adalah container,
bukan pengirim, jadi yang diulang sekarang adalah allowlist container —
`telegram.allowChats` ∪ `telegram.allowFrom`, gabungan yang sudah dipegang
`Gateway` sejak v0.4 karena id DM Telegram adalah id pengirimnya sendiri. Alasan
lama, bahwa menu perintah hanya perlu terlihat oleh operator, ditulis sebelum
pairing grup ada. `BotCommandScopeChat` adalah scope yang mencakup seluruh
anggota sebuah chat, jadi menerbitkan ke id grup menaruh ketiga belas entri
beserta deskripsinya di menu setiap anggota; kartu pairing menyebutnya, dan
`docs/security.md` §4 butir 6 mencatatnya sebagai bagian dari pengungkapan.

Sampai v0.1, `setMyCommands` tidak dipanggil di mana pun di `src/` dan menu
perintah bot kosong meski dokumen ini menyatakan sebaliknya. v0.2 memanggilnya
saat gateway mulai; penolakan dari Telegram dicatat satu baris audit dan tidak
menghentikan gateway. Sejak 13 Agustus 2026 pemanggilan itu juga terjadi saat
pairing sebuah grup dikonfirmasi, jadi grup yang dipasangkan sambil proses
berjalan tidak menunggu restart untuk punya menu.

---

## 6. Keamanan khusus Telegram

| Kontrol | Implementasi |
|---|---|
| Allowlist | milik kita (wajib): satu daftar chat, satu daftar pengirim, keduanya harus cocok |
| Privasi grup | privacy mode tetap **ON**; Caraka tidak pernah meminta hak admin grup |
| Anti-spoof callback | nonce + HMAC pada `callback_data`; `callback_data` maks 64 byte → simpan payload di DB, kirim id-nya saja |
| Pengungkapan di grup | dinyatakan saat pairing, bukan direkayasa hilang |
| Bot-to-bot | **dimatikan** di v1 (tidak diaktifkan di @BotFather) |
| Token | keychain OS / file `chmod 600`; tidak pernah masuk log atau chat |
| Webhook | tidak dipakai — long-polling menghilangkan seluruh kelas risiko ekspos port |

### Ephemeral bukan kontrol keamanan di sini

Versi sebelumnya dokumen ini menulis "ephemeral untuk semua output sensitif".
Itu memperlakukan pesan ephemeral sebagai sesuatu yang selalu tersedia. Bot API
memberi dua syarat, dan approval Caraka tidak memenuhi keduanya.

Halaman *Ephemeral Messages* menulis bahwa `receiver_user_id` berlaku "for group
and supergroup chats only", lalu: "Any bot can send an ephemeral message to a user
within 15 seconds of the incoming eligible action", dengan `callback_query_id`
atau `reply_parameters.ephemeral_message_id` sebagai bukti aksi itu. Di luar
jendela 15 detik, hanya bot yang menjadi administrator chat yang boleh
mengirimnya kapan saja.

Kartu approval Caraka tidak diminta oleh aksi pengguna — ia datang dari agent, dan
berlaku sepuluh menit. Jendela 15 detik tidak menjangkaunya. Jalur satunya adalah
menjadikan bot admin grup, dan itu mematikan privacy mode sehingga bot menerima
setiap pesan di grup. Keduanya tidak bisa dimiliki bersamaan, dan yang dilepas
adalah ephemeral.

Baris 106 versi lama menyarankan `setMyDefaultAdministratorRights` sekaligus
privacy mode ON, sambil mengandalkan ephemeral di baris 32. Ketiganya tidak bisa
benar bersama-sama; yang dipertahankan adalah privacy mode.

Jadi pengungkapan tidak disembunyikan, ia dinyatakan. Kalimat yang wajib muncul
saat pairing grup:

> Memasukkan grup ini ke allowlist berarti memilih untuk memperlihatkan pekerjaan
> itu kepada anggotanya: kartu approval, path berkas, diff, dan keluaran perintah
> akan terbaca setiap anggota grup.

Yang tetap tertutup adalah persetujuan, bukan penglihatan. Callback approval
terikat principal, jadi anggota grup di luar allowlist tidak bisa menyetujui
apa pun (§4).

### Access whitelist @BotFather — belum terverifikasi

Bot API 10.0 (8 Mei 2026) menambahkan `BotAccessSettings` beserta
`getManagedBotAccessSettings` dan `setManagedBotAccessSettings`. Keduanya
mengalamatkan bot lewat `user_id` bot **terkelola**, dan terdokumentasi di bawah
Managed Bots. Apakah bot biasa buatan @BotFather punya tombol yang sama
**belum terverifikasi**; tidak ada yang membuka @BotFather dan memeriksanya.
Sampai itu terjadi, allowlist Caraka adalah satu-satunya lapisan yang dijanjikan.

---

## 7. Batas & penanganan galat

| Situasi | Penanganan |
|---|---|
| 429 Too Many Requests | hormati `retry_after`, lalu ulangi request |
| Edit terlalu sering | throttle update status ≥ 1,5 detik |
| Pesan > 32.768 karakter | pecah di batas baris dan jaga code fence seimbang |
| `createForumTopic` gagal diam-diam | deteksi kemampuan sekali di startup → `container.supports_threads = false` → mode linear |
| Bot diblokir user | hentikan pengiriman ke chat itu, catat audit `chat.blocked` |
| `sendRichMessage` gagal | fallback otomatis ke teks polos yang sudah di-scrub |
| Field baru tak dikenal di update | **abaikan, jangan drop update** |

Baris "bot diblokir user" tidak dapat dijangkau sampai v0.1. `my_chat_member`
adalah satu-satunya sinyal blokir, dan `getUpdates` waktu itu mengirim
`allowed_updates: ["message", "callback_query"]`, sehingga update itu tidak pernah
tiba dan baris ini menjanjikan penanganan yang tidak bisa berjalan. v0.2
menambahkan `my_chat_member` ke daftar (`src/channels/telegram.ts:181`) dan
menangani status `kicked` serta `left`.

---

## 8. Yang sengaja tidak dipakai di v1

Managed Bots (token melewati pihak ketiga), bot-to-bot communication, Mini App dashboard, guard bot, Stars/langganan, poll, Communities, business mode.

Semua tercatat sebagai kandidat di `roadmap.md`, bukan dilupakan — tetapi tidak satu pun dibutuhkan untuk membuat produk ini berguna.
