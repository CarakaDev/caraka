# Riset: Telegram Bot API 2026 (9.5 → 10.2) — fitur yang mengubah desain kita

**English:** this document is Indonesian only, and stays that way because it is research kept as provenance for a decision already made. English documentation starts at [`../../README.md`](../../README.md).

**Tanggal riset:** 7 Agustus 2026
**Sumber:**
- https://core.telegram.org/bots/api-changelog (rilis 3 Apr, 8 Mei, 11 Jun, 14 Jul 2026)
- https://core.telegram.org/api/forum (dokumentasi forum topics)
- https://t.me/s/botnews (@BotNews)
- https://gramio.dev/telegram/methods/createforumtopic & /closeforumtopic
- github.com/python-telegram-bot/python-telegram-bot#5261 · github.com/vendelieu/telegram-bot CHANGELOG
- github.com/openclaw/openclaw#92258 · github.com/NousResearch/hermes-agent#44428, #46009, #64497
- aihola.com/article/telegram-managed-bots-api · zeroclaws.io/blog/telegram-bot-api-2026-ai-agent-developers-guide
- releasebot.io/updates/telegram

> **Kesimpulan singkat:** Telegram di 2026 berubah dari "platform bot" menjadi **platform agent**. Empat fitur — *topics di private chat*, *Rich Messages*, *Ephemeral Messages*, dan *Managed Bots* — masing-masing menyelesaikan satu masalah desain yang sebelumnya kita tandai sebagai kompromi.

---

## 1. Forum Topics — dan yang paling penting: **di private chat**

### Fakta

- Method: `createForumTopic`, `editForumTopic`, `closeForumTopic`, `reopenForumTopic`, `deleteForumTopic`, `unpinAllForumTopicMessages`, plus varian `*GeneralForumTopic` untuk topic "General".
- `Message.message_thread_id` + `Message.is_topic_message` menandai pesan milik sebuah topic. Semua method kirim (`sendMessage`, `sendPhoto`, dst.) menerima `message_thread_id`.
- Service message pembuatan topic **tidak bisa dihapus** dengan `deleteMessage`.
- Di supergroup: butuh hak admin `can_manage_topics`, dan forum mode harus aktif — **kalau tidak, method gagal diam-diam (silent fail)**. Bot boleh menutup topic yang ia buat sendiri tanpa `can_manage_topics`; untuk topic buatan orang lain, hak itu wajib.
- `icon_color` hanya menerima 6 nilai: `7322096` biru, `16766590` kuning, `13338331` ungu, `9367192` hijau, `16749490` merah muda, `16478047` merah. `icon_custom_emoji_id` hanya menerima nilai dari `getForumTopicIconStickers`.
- Nilai `message_thread_id` dari objek `ForumTopic` yang dikembalikan **wajib disimpan** — dibutuhkan untuk mengirim, menutup, atau menghapus topic itu nanti.

### 🔑 Temuan utama

> **Bot sekarang bisa membuat topic di private chat, selalu, tanpa hak admin apa pun.**

Perubahan changelog yang relevan:
- "Allowed bots to create topics in private chats using the method `createForumTopic`."
- "Allowed bots to prevent users from creating and deleting topics in private chats through a new setting in the @BotFather Mini App."
- "Added the field `allows_users_to_create_topics` to the class `User`."

Dokumentasi MTProto (`core.telegram.org/api/forum`) menjelaskan perilaku klien: bila flag `bot_forum_can_manage_topics` bot diset (dikendalikan opsi *"Disallow users to create new threads"* di @BotFather), klien grafis **harus mencegah user mengirim pesan tanpa topic** — sebelum mengirim, klien wajib membuat topic baru dulu. UI topic "General" diganti menjadi *"View as messages"*, dengan gelembung permanen di bawah: *"Type any message to create a new thread"*.

**Artinya untuk kita:** chat pribadi dengan bot bisa dijadikan **workspace ber-tab persis seperti terminal**. Setiap sesi/tugas = satu topic. Tidak butuh supergroup, tidak butuh setup admin, tidak butuh user mengerti apa pun. Ini persis model mental yang diminta.

### Perbandingan dengan Discord

| | Telegram topic (private chat) | Telegram topic (supergroup forum) | Discord thread | Discord forum channel |
|---|---|---|---|---|
| Bot boleh membuat | ✅ selalu, tanpa admin | ⚠️ butuh `can_manage_topics` + forum mode | ✅ butuh `CREATE_PUBLIC_THREADS` | ✅ |
| Auto-arsip | ❌ manual (`closeForumTopic`) | ❌ manual | ✅ paksa: 60 / 1440 / 4320 / 10080 menit | ✅ |
| Batas aktif | tidak terdokumentasi | — | **±50 aktif per channel, 1.000 per guild** | sama |
| Tutup ≠ hapus | ✅ isi tetap terbaca | ✅ | arsip tetap dapat dicari | ✅ |
| Panjang nama | — | — | 1–100 karakter | 1–100 |
| Ikon/warna | ✅ 6 warna + custom emoji | ✅ | ❌ | tag |

Catatan Discord: thread **selalu** terarsip otomatis setelah periode tidak aktif dan itu tidak bisa dimatikan; menandai thread `archived` secara programatik **tetap** menghitung ke batas thread aktif. Praktik terbaik yang direkomendasikan komunitas: selalu set `auto_archive_duration`, dan pertimbangkan **forum channel** bila yang diinginkan adalah galeri terstruktur, bukan feed.

**Keputusan desain:** Telegram = model utama (private-chat topics). Discord = pemetaan setara ke thread, dengan `auto_archive_duration: 10080` (7 hari) dan sadar batas 50/1.000.

---

## 2. Rich Messages (Bot API 10.1 — 11 Juni 2026)

Fitur paling relevan untuk menampilkan output coding agent.

- Method baru: **`sendRichMessage`** dan **`sendRichMessageDraft`** (streaming pesan rich parsial — "seperti ChatGPT mengetik").
- Kelas: `RichMessage`, `RichBlock`, `InputRichMessage` (+ field `blocks`, `media`), `InputRichMessageContent`, `InputRichBlockListItem`, `RichBlockCaption`, `RichBlockTableCell`.
- `editMessageText` menerima parameter `rich_message`.
- Cakupan: **21 subtipe block** dan **25 subtipe rich text**. Block yang tersedia mencakup heading multi-level, paragraf, divider, list & task list (dengan numerasi kustom), tabel, blockquote, **code block**, math/LaTeX, details/collapsible, footnote, media block, kolase, slideshow, peta, dan **`RichBlockThinking`** — block yang secara eksplisit dirancang untuk kasus streaming AI.
- Batas panjang naik drastis: hingga **32.768 karakter** dalam satu pesan, dengan "Show More".
- Bot dapat memakai custom emoji di pesan langsung bila pemilik bot punya Telegram Premium.

### ⚠️ Jebakan yang sudah ditemukan orang lain

**Tidak ada `editRichMessage`.** Laporan implementasi nyata (Hermes #46009) menunjukkan `editMessageText` pada pesan yang sedang di-stream **merusak format rich** — semuanya jatuh ke teks polos dengan penanda sintaks mentah. Pola yang mereka pakai sebagai perbaikan: saat finalisasi, **kirim pesan rich baru** lalu **hapus preview lama**, dengan fallback ke jalur MarkdownV2 bila `sendRichMessage` gagal.

**Implikasi untuk kita:** desain "satu pesan status hidup yang di-edit" tetap dipakai untuk fase *progres* (teks polos/MarkdownV2 murah), tetapi **hasil akhir dikirim sebagai Rich Message baru**, lalu pesan progres dihapus. Ini juga menghapus kebutuhan "sanitizer MarkdownV2" yang rumit untuk output akhir — meski tetap diperlukan sebagai fallback.

**Dampak terbesar:** diff, tabel hasil test, dan code block akhirnya bisa dirender **native** di Telegram, bukan dilempar sebagai file `.txt`.

---

## 3. Ephemeral Messages (Bot API 10.2 — 14 Juli 2026)

> "Introduced support for Ephemeral Messages, allowing bots to send group messages and receive commands that are visible only to a specific user and the bot."

Permukaan API:
- Parameter `receiver_user_id` dan `callback_query_id` pada `sendMessage`, `sendPhoto`, `sendDocument`, `sendAnimation`, `sendAudio`, `sendLivePhoto`, `sendSticker`, `sendVideo`, `sendVideoNote`, `sendVoice`, `sendContact`, `sendLocation`, `sendVenue`.
- `Message.receiver_user`, `Message.ephemeral_message_id`; `BotCommand.is_ephemeral`.
- `ReplyParameters.ephemeral_message_id` (dan `message_id` menjadi opsional bila ini ada).
- Method edit/hapus khusus: `editEphemeralMessageText`, `editEphemeralMessageMedia`, `editEphemeralMessageCaption`, `editEphemeralMessageReplyMarkup`, `deleteEphemeralMessage`.

**Implikasi keamanan — besar.** Sebelumnya, dokumen `security.md` kita menetapkan grup selalu `read-only` karena balasan agent bisa membocorkan isi repo ke semua anggota. Dengan ephemeral messages, **kartu approval dan output sensitif bisa dikirim hanya kepada operator** meski percakapan terjadi di grup. Grup tetap default `read-only`, tetapi sekarang ada jalur aman untuk menaikkannya.

---

## 4. Managed Bots (Bot API 9.6 — 3 April 2026)

Bot induk dapat membuat dan mengendalikan bot anak lewat satu deep link, menghapus alur manual salin-token dari @BotFather:

- Bot mengaktifkan *Bot Management Mode* lewat @BotFather Mini App → flag `can_manage_bots`.
- Link berbentuk `https://t.me/newbot/{manager_bot}/{suggested_username}` membuka layar pembuatan bot yang sudah terisi.
- Setelah user menekan konfirmasi, manager mendapatkan token lewat method baru **`getManagedBotToken`**.

**Implikasi untuk alur install:** ini adalah kandidat "one-tap setup" — tidak ada lagi instruksi *"buka @BotFather, ketik /newbot, salin token, tempel di terminal"*.

**Tapi ada harga yang harus jujur disebut:** token bot mengalir melalui manager bot. Untuk produk self-hosted single-operator, itu berarti **pihak ketiga (kita) sempat memegang token bot user** — bertentangan langsung dengan prinsip "tidak menyimpan kredensial user". Sumber yang meliput fitur ini juga menyoroti kekhawatiran penyalahgunaan: mekanisme membuat banyak bot lewat satu link adalah hal yang akan diprobing penipu sejak hari pertama.

**Keputusan:** jalur default tetap BotFather manual (nol kepercayaan pihak ketiga), tetapi kita optimalkan agar tetap terasa mulus (lihat `docs/install-flow.md`). Managed Bots ditawarkan sebagai **opsi eksplisit** dengan penjelasan trade-off, dan hanya bila manager bot-nya dijalankan sendiri oleh user.

---

## 5. Fitur lain yang relevan

| Fitur | Rilis | Kegunaan untuk kita |
|---|---|---|
| **Access whitelist via @BotFather** | 8 Mei 2026 | User dapat menetapkan whitelist akses granular untuk bot-nya langsung di Telegram. **Lapisan pertahanan kedua** di luar allowlist kita — bot bahkan tidak menerima update dari orang asing. |
| **Bot-to-bot communication** | 2026 | Diizinkan di konteks tertentu (grup & business mode), diaktifkan via @BotFather. Membuka jalur multi-agent nanti; **tidak dipakai di v1**. |
| `style` + `icon_custom_emoji_id` pada `InlineKeyboardButton` | 2026 | Tombol approval bisa **berwarna** (hijau Setujui / merah Tolak) dan berikon. UX approval jauh lebih jelas. |
| **Communities** (`Community`, `CommunityChatAdded/Removed`, `ChatFullInfo.community`) | 10.2 | Menautkan beberapa chat. Relevan untuk skenario tim, bukan v1. |
| Guard bots (`ChatFullInfo.guard_bot`, `answerChatJoinRequestQuery`, `sendChatJoinRequestWebApp`) | 10.1 | Penyaringan anggota grup. Tidak dipakai v1. |
| `InputMediaVoiceNote`, poll dengan link/media/lokasi/waktu | 10.1–10.2 | Voice note keluar; poll bukan prioritas. |
| Mini Apps: fullscreen, home-screen shortcut, langganan | 8.0 | **Kandidat kuat untuk dashboard** — Mini App bisa jadi pengganti dashboard web lokal. Catatan keamanan: sejak 20 Juli 2026 method Mini App diblokir dari origin berbeda secara otomatis. |
| `Update.subscription` / `BotSubscriptionUpdated`, Stars | 8.0–10.2 | Jalur monetisasi bila suatu saat dibutuhkan. |

---

## 6. Versi & pustaka

- Versi terbaru per riset: **Bot API 10.2 (14 Juli 2026)**; 10.1 (11 Juni 2026); 9.6 (3 April 2026); 9.5 (31 Maret 2026).
- Dukungan pustaka masih menyusul: `python-telegram-bot` membuka isu "Full Support for Bot API 10.1" (belum lengkap). `vendelieu/telegram-bot` (Kotlin) sudah mengklaim cakupan 10.1 **dan** 10.2.
- **Rekomendasi:** pakai `grammY` (TypeScript) untuk struktur & middleware, tetapi **panggil method terbaru secara langsung lewat `bot.api.raw`/`fetch`** bila pustaka belum mengekspos tipe untuk `sendRichMessage`/ephemeral. Jangan menunggu pustaka. Bungkus di satu adapter tipis supaya mudah diganti saat tipe resmi mendarat.
- Wajib: **jangan pernah menolak update yang memuat field tak dikenal.** Isu implementasi nyata mencatat ini sebagai risiko utama saat versi API naik.

---

## 7. Ringkasan dampak pada desain

| Fitur Telegram | Menghapus kompromi lama |
|---|---|
| Topic di private chat | "satu chat = satu aliran kacau" → **sesi ber-tab seperti terminal** |
| `sendRichMessage` + blocks | "diff panjang dikirim sebagai file .txt" → **tabel & code block native** |
| `sendRichMessageDraft` + `RichBlockThinking` | "status hidup pakai edit teks polos" → **streaming rich native** |
| Ephemeral messages | "grup selalu read-only karena bocor" → **approval privat di dalam grup** |
| Tombol berwarna + ikon | "tombol approval seragam & ambigu" → **hijau/merah jelas** |
| BotFather access whitelist | allowlist kita = satu-satunya lapisan → **dua lapisan** |
| Managed Bots | "salin-tempel token" → opsi one-tap (dengan trade-off yang disebut jujur) |
