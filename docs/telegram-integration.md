# Telegram Integration

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
| Menandai sesi selesai | `editForumTopic` — lihat catatan di bawah | pesan penutup saja |
| Hasil terstruktur (diff, tabel, test) | `sendRichMessage` dengan input Markdown | teks polos yang sudah di-scrub dan dipecah |
| Streaming progres | `sendRichMessageDraft` + `InputRichBlockThinking` | `editMessageText` teks polos |
| Approval | `InlineKeyboardButton` | tolak permission bila callback tidak tersedia; teks tidak pernah menjadi approval |
| Approval di grup | kartu yang sama, terbaca seluruh anggota | kalimat pengungkapan saat pairing grup (§6) |
| Lampiran keluar | `sendDocument` / `sendPhoto` | tautan file |
| Voice note masuk | unduh file → transcriber user (opsional) | tolak dengan pesan jelas |
| Lapisan izin kedua | access whitelist @BotFather (**belum terverifikasi**, §6) | allowlist kita saja |

### Kenapa sesi di DM tidak ditutup dengan `closeForumTopic`

Versi sebelumnya dokumen ini memasangkan "menutup sesi" dengan `closeForumTopic`.
Itu salah. Deskripsi Bot API untuk `closeForumTopic` dan `reopenForumTopic`
berbunyi "in a forum supergroup chat" saja. Klausa "or a private chat with a
user" ada di `createForumTopic`, `editForumTopic`, `deleteForumTopic`, dan
`unpinAllForumTopicMessages`, dan tidak ada di keduanya. Topic di DM memang bisa
dibuat dan diubah, tetapi tidak ada method berdokumentasi yang menutupnya.

`editForumTopic` hanya mengekspos `name` dan `icon_custom_emoji_id`; tidak ada
flag `closed` yang bisa dipakai sebagai gantinya. Satu-satunya method yang
menghilangkan topic di DM adalah `deleteForumTopic`, dan ia menghapus seluruh
transkrip bersamanya.

**`icon_color` tidak bisa diubah setelah topic dibuat.** Parameter itu hanya ada
di `createForumTopic`; tabel parameter `editForumTopic` berisi `chat_id`,
`message_thread_id`, `name`, dan `icon_custom_emoji_id` saja. Beberapa dokumen di
repo ini menulis warna ikon sebagai penanda state yang berubah mengikuti sesi
(`frd.md` FR-TOPIC-03, `session-model.md` §, `ui-ux.md` §5). Itu tidak bisa
dilakukan lewat API yang sama: warna terkunci saat topic dibuat, dan yang masih
bisa berubah adalah nama topic dan custom emoji-nya. Model warna-per-state perlu
keputusan di spec, bukan penulisan ulang diam-diam di sini.

Karena itu sesi yang selesai ditandai lewat `editForumTopic` — nama dan ikonnya
berubah, topic-nya tetap terbuka dan tetap bisa dibaca. Caraka tidak memanggil
`closeForumTopic` pada chat bertipe `private`. Yang belum diuji: apakah Telegram
benar-benar mengembalikan galat bila dipanggil di sana, atau sekadar tidak
mendokumentasikannya.

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
`telegram.allowFrom`, karena menu perintah hanya perlu terlihat oleh operator.

Sampai v0.1, `setMyCommands` tidak dipanggil di mana pun di `src/` dan menu
perintah bot kosong meski dokumen ini menyatakan sebaliknya. v0.2 memanggilnya
saat gateway mulai; penolakan dari Telegram dicatat satu baris audit dan tidak
menghentikan gateway.

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
