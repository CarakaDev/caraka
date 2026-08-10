# Riset: Model sesi sebagai topic/thread — Telegram vs Discord

**English:** this document is Indonesian only, and stays that way because it is research kept as provenance for a decision already made. English documentation starts at [`../../README.md`](../../README.md).

**Tanggal riset:** 7 Agustus 2026
**Pertanyaan riset:** *"Di terminal kerjanya pakai tab. Bisakah Telegram/Discord membuat channel/topic baru per sesi supaya lebih tertata?"*
**Jawaban singkat:** **Bisa — dan di Telegram bahkan lebih baik dari yang diharapkan.**

**Sumber:** core.telegram.org/bots/api-changelog · core.telegram.org/api/forum · gramio.dev (createForumTopic, closeForumTopic) · docs.discord.com/developers/topics/threads · docs.discord.food/topics/threads · discord/discord-api-docs discussion #6703 · discord.js ForumChannel · guide.pycord.dev/popular-topics/threads · mambahost.com Discord Thread Manager · peakbot.pro (auto-thread 2026) · withastro/discord-auto-threader · needle.gg

---

## 1. Telegram

### Kemampuan bot atas forum topic

| Method | Fungsi |
|---|---|
| `createForumTopic` | Buat topic; kembalikan objek `ForumTopic` berisi `message_thread_id` |
| `editForumTopic` | Ubah nama dan/atau ikon |
| `closeForumTopic` / `reopenForumTopic` | Tutup / buka kembali |
| `deleteForumTopic` | Hapus total |
| `unpinAllForumTopicMessages` | Bersihkan pin |
| `*GeneralForumTopic` (close/reopen/hide/unhide/edit) | Varian khusus topic "General" |

Pengiriman ke topic: semua method kirim menerima `message_thread_id`. Pesan masuk membawa `Message.message_thread_id` dan `Message.is_topic_message`.

### 🔑 Temuan yang mengubah desain

Changelog Bot API 2026 menambahkan:
- **"Allowed bots to create topics in private chats using the method `createForumTopic`."**
- "Allowed bots to prevent users from creating and deleting topics in private chats through a new setting in the @BotFather Mini App."
- Field baru `User.allows_users_to_create_topics`.

Dokumentasi klien (`core.telegram.org/api/forum`) memperjelas perilakunya: bila flag `bot_forum_can_manage_topics` aktif — dikendalikan opsi *"Disallow users to create new threads"* di @BotFather — klien grafis **harus** mencegah user mengirim pesan tanpa topic; sebelum mengirim, topic baru harus dibuat lebih dulu. UI "General" digantikan tampilan *"View as messages"* dengan gelembung permanen *"Type any message to create a new thread"*.

Sumber pihak ketiga menegaskan: **"In private chats, bots can always create topics without admin rights. This is useful for organizing per-user conversations."**

**Kesimpulan:** DM dengan bot bisa dijadikan ruang kerja ber-tab, **tanpa supergroup, tanpa hak admin, tanpa langkah setup tambahan bagi user.** Ini adalah hadiah desain untuk use case kita.

### Batasan yang harus dihormati

| Batasan | Konsekuensi |
|---|---|
| Di supergroup butuh forum mode aktif — **kalau tidak, method gagal diam-diam** | Wajib deteksi kemampuan di startup, jangan asumsi |
| Di supergroup butuh hak `can_manage_topics` secara eksplisit, meski bot sudah admin | `doctor` harus memeriksa hak ini spesifik |
| Bot bisa menutup topic **buatannya sendiri** tanpa `can_manage_topics` | Sesi kita selalu dibuat bot → penutupan selalu aman |
| Topic "General" tidak bisa ditutup dengan `closeForumTopic` | Pakai `closeGeneralForumTopic`; lebih baik: jangan pernah tutup General |
| Service message pembuatan topic tidak bisa dihapus | Daftar akan memuat baris sistem; terima saja, jangan lawan |
| `icon_color` hanya 6 nilai integer | Cukup untuk 5 state + 1 cadangan |
| `icon_custom_emoji_id` hanya dari `getForumTopicIconStickers` | Cache daftarnya saat startup |
| `message_thread_id` wajib disimpan | Masuk skema DB (`session.thread_ref`) |
| Menutup ≠ menghapus — isi tetap terbaca | Persis yang kita inginkan untuk riwayat |

---

## 2. Discord

### Kemampuan

- Thread dibuat dari pesan (`message.create_thread`) atau langsung di channel (`channel.create_thread`), tipe `public_thread`, `private_thread`, `news_thread`.
- **Forum channel** sebagai alternatif: menampilkan post sebagai galeri/daftar dengan judul wajib dan tag.
- Edit thread: `name`, `archived`, `locked`, `auto_archive_duration`, `rate_limit_per_user`.
- Izin: `MANAGE_THREADS` untuk hapus/lock; mengubah nama/arsip/durasi butuh `MANAGE_THREADS` **atau** menjadi pembuat thread. Private thread butuh `CREATE_PRIVATE_THREADS` + `MANAGE_THREADS`.

### Batasan yang lebih ketat daripada Telegram

| Batasan | Angka |
|---|---|
| `auto_archive_duration` — nilai sah | 60, 1440, 4320, 10080 menit |
| Auto-arsip **tidak dapat dimatikan** | thread pasti terarsip setelah periode tidak aktif |
| Thread aktif per guild | **1.000** |
| Thread aktif per channel (umum) | **±50** |
| Panjang nama | 1–100 karakter |
| Menandai `archived` secara programatik | **tetap** menghitung ke batas thread aktif |

Diskusi resmi Discord (#6703) mencatat bahwa tidak adanya cara menandai thread "inactive" secara programatik merusak bot migrasi chat, karena batas tercapai lebih cepat daripada setelan arsip terendah.

### Praktik terbaik komunitas (2026)

- **Selalu set `auto_archive_duration`** — tanpa itu sidebar penuh thread mati.
- Pilih **forum channel** bila yang diinginkan galeri terstruktur; **auto-thread di channel teks** bila ingin tetap terasa seperti feed chat.
- Pasang **satu pesan sticky** di channel induk yang menjelaskan aturan — mencegah sebagian besar kebingungan.
- Thread yang sepi akan otomatis keluar dari daftar aktif dan hidup lagi saat ada balasan, sehingga sidebar tetap terkelola.

---

## 3. Perbandingan langsung

| Aspek | Telegram topic (DM) | Discord thread |
|---|---|---|
| Setup untuk user | **nol** | buat server + undang bot + izin |
| Hak yang dibutuhkan bot | **tidak ada** | `CREATE_PUBLIC_THREADS`, `MANAGE_THREADS` |
| Kendali penuh atas arsip | ✅ manual | ❌ dipaksa auto-arsip |
| Batas jumlah | tidak terdokumentasi | 50/channel, 1.000/guild |
| Sinyal status visual | ✅ 6 warna ikon + custom emoji | ❌ (hanya nama) |
| Cocok untuk | **satu operator** | tim & komunitas |

**Keputusan:** Telegram menjadi implementasi referensi model sesi. Discord memetakan konsep yang sama ke thread dengan `auto_archive_duration: 10080`, dan **wajib** menghormati batas 50/1.000 dengan menutup sesi lama secara proaktif.

---

## 4. Anti-pola yang harus dihindari

1. **Membuat topic untuk setiap pesan.** Topic dibuat per *sesi/tugas*, bukan per pesan. Balasan lanjutan tetap di topic yang sama.
2. **Mengganti nama topic terus-menerus.** Nama yang berubah membuat daftar mustahil dipindai. Judul ditetapkan sekali, maksimal diperbaiki satu kali.
3. **Membiarkan topic menumpuk.** Butuh kebijakan tutup + hapus sejak hari pertama, bukan setelah user mengeluh.
4. **Mengasumsikan pembuatan topic berhasil.** Telegram gagal diam-diam bila forum mode mati; Discord melempar error saat batas tercapai. Selalu deteksi kemampuan dan sediakan mode linear.
5. **Memakai topic sebagai pengganti workspace.** Workspace adalah repo; topic adalah sesi. Satu workspace bisa punya banyak topic hidup sekaligus.
