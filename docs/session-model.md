# Session Model — "tab" untuk coding agent

**English:** this document is Indonesian only, and stays that way because it is internal specification. English documentation starts at [`../README.md`](../README.md).

**Produk:** Caraka · **Versi:** 0.1 · **Tanggal:** 7 Agustus 2026
**Riset pendukung:** `docs/research/telegram-bot-api-2026-core-telegram-botnews.md`, `docs/research/sesi-topic-thread-telegram-discord.md`

---

## 1. Ide inti

Di terminal, developer tidak menjalankan semua pekerjaan di satu jendela. Mereka membuka **tab**: satu untuk server dev, satu untuk test, satu untuk agent yang sedang me-refactor. Setiap tab punya konteks, riwayat, dan nasibnya sendiri.

Chat, secara default, adalah kebalikannya: **satu aliran linear** tempat semuanya bertabrakan.

Caraka memulihkan model tab itu:

> **Satu sesi = satu topic (Telegram) = satu thread (Discord).**
> Bot membuatnya sendiri, memberinya nama, warna, dan ikon, lalu menutupnya ketika selesai.

Yang membuat ini mungkin: sejak 2026, **bot Telegram dapat membuat topic di private chat, selalu, tanpa hak admin apa pun**. Chat pribadi dengan bot berubah menjadi ruang kerja ber-tab.

---

## 2. Hierarki

```
Chat privat dengan bot  ──  RUANG KERJA
│
├── 📋 General ("Kontrol")        ← selalu ada, tidak pernah dihapus
│     perintah global, daftar workspace, status, memori
│
├── 🔵 toko-api · rate limit login          #a91   ← sesi aktif
├── 🟢 toko-api · fix checkout 500          #a88   ← selesai, tertutup
├── 🟣 web-landing · revisi hero            #a85   ← selesai, tertutup
└── 🟡 toko-api · audit dependency          #a92   ← menunggu approval
```

Di supergroup/Discord hierarkinya sama, hanya wadahnya berbeda.

---

## 3. Siklus hidup sesi

```
        pesan baru di General / mention
                    │
                    ▼
        ┌──────────────────────┐
        │  membuat topic baru  │  createForumTopic(name, icon_color, icon_custom_emoji_id)
        └──────────┬───────────┘
                   ▼
   spawning ──► running ──► awaiting_approval ──► running ──► done
                   │              │                            │
                   │              └── ditolak / timeout ────────┤
                   ├── /stop ──► cancelled                      │
                   └── error ──► failed                         │
                                                                ▼
                                          editForumTopic + ringkasan akhir
```

Sebuah run yang selesai ditandai lewat `editForumTopic` dan **topic-nya
dibiarkan terbuka**. `done` adalah keadaan yang ditinggalkan satu run, bukan
akhir sebuah sesi: pesan berikutnya melanjutkan sesi yang sama. Menutup pada
`done` — yang sempat terkirim di 1.5.0 dan dicabut di 1.5.2 — menutup topic
sesudah setiap giliran lalu membukanya lagi pada giliran berikutnya, menulis satu
service message `closed` dan satu `reopened` ke dalam transkrip tiap kali, dan
meninggalkan topic tertutup selagi sesinya masih hidup.

Caraka tidak punya kejadian yang berarti "sesi ini berakhir", jadi yang tahu yang
mengatakannya: `/close`. Perintah itu menandai sesi `done`, mengirim satu baris
penutup, lalu menutup topic lewat `closeForumTopic`, dalam urutan itu. Menutup tidak menghilangkan apa pun: ia satu
flag ditambah satu service message, dan transkripnya tetap terbaca. Di grup
haknya sudah dipegang, dan deskripsi method itu sendiri mengecualikan pencipta
topic — yang Caraka selalu, karena sejak 1.3.1 ia hanya menyentuh thread yang
dibukanya sendiri. Di DM `closeForumTopic` tidak didokumentasikan, jadi panggilan
itu dijawab galat dan galatnya ditelan: sesi tetap tertandai, dan itu paruh yang
absen dari kapabilitas yang sama. Alasan lengkapnya di
`telegram-integration.md` §2.

| State | Warna ikon topic | Prefiks nama |
|---|---|---|
| `running` | 🔵 biru `7322096` | `▸ ` |
| `awaiting_approval` | 🟡 kuning `16766590` | `⏸ ` |
| `done` | 🟢 hijau `9367192` | `✓ ` |
| `failed` | 🩷 magenta `16749490` | `✗ ` |
| `cancelled` | 🟣 ungu `13338331` | `⊘ ` |

Warna diperbarui lewat `editForumTopic` di setiap transisi. **Daftar topic menjadi papan status yang bisa dibaca sekilas** — tanpa membuka satu pun percakapan.

**Hanya untuk thread yang Caraka buat sendiri.** Sebuah sesi bisa lahir di topic yang sudah ada: `createSession` mengambil `message_thread_id` dari pesan yang masuk dan hanya memanggil `createForumTopic` kalau tidak ada. Topic seperti itu dibuat dan dinamai orang lain, jadi sejak 1.3.1 Caraka mencatat thread yang dibukanya sendiri dan menolak mengubah yang lain — tidak ada `editForumTopic`, dan di channel yang punya `finishThread` tidak ada pengarsipan. Sesi tetap berjalan penuh di sana dan tetap menjawab di thread itu; yang hilang cuma glifnya, dan satu baris audit `topic.skip` menyebut kenapa.

Kepemilikan disimpan per thread, bukan per sesi, sehingga sesi kedua yang lahir di topic yang sama lewat `/new` mewarisinya. Nama topic tidak pernah ikut disimpan: Bot API tidak punya method yang mengembalikannya, jadi tidak ada nama lama yang bisa Caraka klaim tahu — dan itu juga sebabnya nama yang sudah tertimpa oleh versi sebelum 1.3.1 tidak bisa dipulihkan. Basis data yang lahir sebelum rilis itu tidak memuat catatan kepemilikan sama sekali, jadi setiap thread di dalamnya terbaca bukan milik Caraka: sesi yang sudah punya topic berhenti memperbarui glifnya, dan topic yang dibuat sesudahnya berjalan seperti biasa.

> Catatan: `icon_color` hanya menerima 6 nilai integer yang telah ditentukan. Lima state di atas memakai lima di antaranya; **merah `16478047` sengaja dikosongkan** karena terlalu dekat dengan warna merek kesumba (ΔE 9,9) — lihat `brand.md` §6.

---

## 4. Penamaan sesi

Format: `<prefiks state> <workspace> · <judul tugas>`
Contoh: `▸ toko-api · rate limit login`

Judul tugas diambil berurutan:
1. Judul eksplisit dari user: `@toko-api #rate-limit tambahkan rate limit`
2. Ringkasan pesan pertama (maks 40 karakter, dipotong di batas kata)
3. Fallback: `sesi #a91`

Judul diperbarui **satu kali** setelah agent memberi respons pertama, bila agent menghasilkan judul yang lebih baik (ACP `session/update` sering memuat rencana/plan yang bisa dipakai). Setelah itu nama tidak berubah lagi — nama yang berpindah-pindah membuat daftar sulit dipindai.

---

## 5. Aturan routing

| Kondisi | Perilaku |
|---|---|
| Pesan di topic **General** dengan `@workspace` | Buat sesi baru di topic baru, balas di sana. Di General cukup tinggalkan satu baris tautan. |
| Pesan di topic **General** tanpa `@workspace` | Pakai workspace terakhir yang aktif. Bila belum ada → tanya (tombol pilih workspace). |
| Pesan di **topic sesi** | Lanjutkan sesi itu, dan tidak pernah membuat topic baru — tetapi hanya kalau pesan itu ditujukan kepada Caraka. Di ruangan, memegang sesi di sebuah topic bukan hal yang sama dengan disapa: sejak 1.4.3 setiap baris di topic sesi harus menyebut Caraka atau membalas salah satu pesannya, sama seperti di sisa ruangan (FR-CHAN-09). Di percakapan pribadi setiap pesan ditujukan ke Caraka menurut definisinya. |
| Pesan di topic sesi **yang sudah `done`** | Lanjutkan sesi yang sama (ACP `session/load`), kembalikan penanda state lewat `editForumTopic`, dan buka topic-nya kembali lewat `reopenForumTopic` — tepat pada transisi yang penutupan terjadi, karena `TOPIC_NOT_MODIFIED` adalah galat 400 untuk bot. Di grup, sampai pesan itu tiba, yang bisa menulis di topic tertutup hanya admin ber-`can_manage_topics` dan pencipta topic, jadi anggota biasa tidak bisa melanjutkannya dan tidak bisa berdiskusi di sana lagi. Itu yang dibayar untuk daftar topic yang tidak membengkak. Di DM tidak ada penutupan, jadi tidak ada yang perlu dibuka. |
| Pesan saat sesi `running` | Masuk antrean sesi tersebut, balas "diantrekan (#n)". |
| Perintah global (`/ws`, `/status`, `/memori`) | Selalu dijawab di General, dari topic mana pun ia dikirim. |
| Pesan dengan `@<path absolut>` atau `@~/<path>` dari operator channel, di container mana pun | Rutekan ke workspace ber-path itu. Path yang tidak dinamai config menaikkan kartu bertanda tangan sekali pakai yang menulis entrinya ke `config.yaml` (ADR-0010, ADR-0011). Kartunya selalu digambar di percakapan pribadi operator; container lain menerima satu kalimat tetap yang menyebut di mana jawabannya diberikan, dan kalimat itu tidak bercabang atas apa pun. |
| `/new <path> <judul>` dari operator channel | Sama seperti di atas, dengan `@` yang tidak perlu diketik. Argumen pertama dibaca sebagai folder hanya ketika ia absolut sesudah `~/` dikembangkan; kalau tidak, seluruh barisnya menjadi judul. |
| Pesan berbentuk path dari pengirim lain di allowlist | Tolak, sebutkan siapa yang boleh memakai bentuk itu, dan catat satu baris audit `ws.path` `denied` — sama di percakapan pribadi maupun di ruangan. Pengirim lain menyebut workspace lewat slug. |
| Baris sesi yang slug-nya tidak ada di config | Jangan jalankan apa pun; jawab dengan daftar workspace. Slug kosong, yaitu setiap baris sebelum v0.4, tetap berarti workspace pertama. |

Sejak 1.3.3 `~/` di depan token dibaca sebagai path yang berakar di direktori rumah pengguna yang menjalankan Caraka. Sebuah pesan chat tidak pernah melewati shell, jadi tidak ada yang mengembangkan tilde sebelum Caraka melihatnya, dan sebelum itu `@~/Project/Coret` dijawab sebagai nama workspace yang tidak dikenal. `~user/` sengaja tidak dikembangkan: rumah orang lain adalah tebakan tentang tata letak mesin. Sejak 1.4.3 aturan siapa yang boleh memakai bentuk path adalah operator channel itu, di container mana pun yang Caraka layani (ADR-0011).

**Prinsip:** *sesi tidak pernah berpindah topic, dan topic tidak pernah dipakai ulang oleh sesi lain.* Ini yang membuat riwayat dapat dipercaya.

### Agent mana yang menjalankan sebuah sesi

Tiga pertanyaan, dijawab berurutan, dan yang pertama menjawab menang:

1. **Agent yang disimpan baris sesi itu.** `/switch <agent>` menulis ke sana, dan pilihan terakhir seseorang mengalahkan berkas.
2. **`agent:` milik workspace sesi itu.** Setiap workspace boleh menyebut agennya sendiri, dan dua workspace dalam satu proses boleh menyebut agen yang berbeda.
3. **Agen bawaan produk,** `claude-code`. Ini yang berlaku pada pemasangan yang tidak menyebut agen di mana pun, dan itu mayoritasnya.

Baris sesi menyimpan `agent` sejak ia dibuat, disalin dari workspace-nya saat itu. Jadi sebuah sesi yang dibuat sebelum workspace-nya menyebut agennya menyimpan kosong, dan sampai 1.5.2 kosong itu langsung jatuh ke langkah 3 — sebuah pemasangan yang config-nya berbunyi `agent: codex` menjalankan Claude, dan gagal pada mesin yang tidak pernah memasang Claude ([issue #9]). Langkah 2 adalah yang hilang. Sejak 1.5.3 tidak ada baris yang ditulis ulang untuk itu; yang berubah adalah cara membacanya, jadi mengubah `agent:` workspace besok tetap berlaku untuk sesi lama juga.

Driver pemanasan yang dinyalakan saat start membaca urutan yang sama, dengan workspace pertama dan tanpa sesi, sehingga pemasangan yang tidak bisa menyalakan agennya gagal saat start dan bukan pada tugas pertama. Baris yang dicetak Caraka saat hidup menyebut agen yang sama itu, dengan id preset yang dipakai `caraka doctor`.

[issue #9]: https://github.com/CarakaDev/caraka/issues/9

**Satu pengecualian, di sisi agent.** Isolasi di atas berlaku untuk apa yang Caraka simpan. Agent yang menyimpan riwayatnya sendiri di direktori kerja tidak ikut terisolasi, karena setiap sesi pada satu workspace dijalankan dengan cwd yang sama. Aider adalah kasusnya: ia tidak punya id thread, resume-nya `--restore-chat-history` membaca `.aider.chat.history.md` dari cwd, jadi dua sesi Caraka pada workspace yang sama berbagi satu berkas dan giliran lanjutan salah satunya bisa memuat transcript yang lain (`presets/agents/aider.yaml`). Preset dengan id thread — Codex, Claude Code — tidak punya masalah ini.

---

## 6. Kebersihan (housekeeping)

Tanpa aturan, daftar topic akan membengkak seperti tab browser.

| Aturan | Default |
|---|---|
| Tutup topic saat sesi `done`/`failed`/`cancelled` | ✅ langsung, setelah pesan ringkasan. Terbangun sejak 1.4.3 di grup; di DM `closeForumTopic` tidak berdokumentasi, jadi sesi berhenti di penggantian nama |
| Hapus topic yang `done` | ❌ tidak dibangun, dan tidak akan: `deleteForumTopic` menghapus topic beserta seluruh pesannya. Yang dibangun adalah penutupan |
| Batas sesi aktif bersamaan | **5** per operator — melebihi itu, tawarkan menutup yang terlama |
| Sesi `running` tanpa aktivitas | timeout 30 menit → `cancelled`; topic tetap terbuka, `/close` yang menutupnya |
| Topic "General" | tidak pernah ditutup, tidak pernah dihapus |
| Sesi yang dipin (`/pin`) | dikecualikan dari auto-hapus |

Baris penutup `/close` dikirim **sebelum** topic ditutup, sehingga baris terakhir topic selalu menjelaskan apa yang terjadi. Urutan itu bagian dari fiturnya: kirim ke topic yang baru ditutup hanya berhasil karena Caraka pencipta topic itu, dan buktinya di sumber TDLib, bukan di halaman Bot API.

Yang juga diperbaiki bersama pencabutan itu: baris terakhir keempat jalur akhir — run sukses, `/stop`, timeout, dan run gagal — tiba di topic-nya sendiri. Sebelumnya laporan kegagalan mendarat di General, karena pesan yang memulai sebuah run tidak membawa `message_thread_id` ketika topic-nya baru dibuka untuk run itu.

```
✓ Selesai · 1:12 · 2 file berubah · 18 test lulus
   Ringkasan disimpan ke memori (claim_f3963d7b)
```

---

## 7. Pemetaan lintas channel

Kolom Discord terpasang sejak v0.5, kolom WhatsApp sejak v0.6.

| Konsep | Telegram (private) | Telegram (supergroup) | Discord | WhatsApp |
|---|---|---|---|---|
| Ruang kerja | chat privat dengan bot | supergroup forum | channel teks | chat satu lawan satu; grup ditolak di `receive()` |
| Sesi | forum topic | forum topic | public thread | — (linear) |
| Kontrol | topic General | topic General | channel induk | chat yang sama |
| Membuat | `createForumTopic` (tanpa admin) | butuh `can_manage_topics` | `CREATE_PUBLIC_THREADS` | — `createTopic` melempar error bernama |
| Menandai selesai | `editForumTopic` lalu `closeForumTopic`; di DM penutupannya dijawab galat dan galatnya ditelan | `editForumTopic` lalu `closeForumTopic`, ber-`can_manage_topics` atau sebagai pencipta topic | `archived: true`, sesudah ringkasan penutup | — glif state ikut di header setiap balasan |
| Batas | belum terdokumentasi | — | ±50 aktif/channel, 1.000/guild — tiba sebagai error, bukan disapu | — tidak ada wadah yang bisa habis |
| Auto-arsip | manual (kita) | manual | dipaksa Discord (60/1440/4320/10080 mnt); dipakai 10080 | — |

Channel forum Discord tidak didukung: ia mewajibkan judul dan tag per post dan tidak menyisakan channel induk sebagai tempat perintah global dijawab.

Mengarsipkan sebuah thread tidak membebaskan kuota — Discord tetap menghitung thread terarsip terhadap batas aktifnya. Karena itu tidak ada sapuan yang menutup sesi lama demi ruang: sesi yang selesai diarsipkan saat itu juga, dan ketika batasnya benar-benar tercapai, pembuatan thread berikutnya melempar error dan container itu jatuh ke mode linear (§9).

**WhatsApp tidak punya konsep sesi ber-tab.** Degradasi anggun, dan sejak v0.6 ia terbangun tanpa satu baris pun kode mode linear yang baru di core: channel mendeklarasikan `caps.threads: false`, dan `header()` yang sudah dipanggil di sembilan titik keluaran menulis `[toko-api · #a91]` di depan setiap balasan. `/status` di wadah tanpa thread mendaftar sesi yang sedang dipegang percakapan itu sebagai teks, dibatasi lima sesi terbaru supaya jawabannya tidak tumbuh bersama transkrip. Ini konsisten dengan prinsip "capability opsional, bukan cabang kode per channel".

---

## 8. Dampak pada model data

Tambahan pada tabel `session` (lihat `erd.md`):

| Kolom | Tipe | Ket |
|---|---|---|
| `container_id` | TEXT | chat/guild tempat sesi hidup |
| `thread_ref` | TEXT NULL | `message_thread_id` Telegram / thread id Discord |
| `thread_state` | TEXT | `open`\|`closed`\|`deleted` |
| `title` | TEXT | judul yang tampil di daftar |
| `icon_state` | TEXT | state terakhir yang sudah ditulis ke ikon (hindari edit berulang) |
| `pinned` | INTEGER | dikecualikan dari auto-hapus |
| `close_after` | INTEGER NULL | jadwal penghapusan topic |

Tabel baru `container`: memetakan `(channel, chat_id)` → tipe wadah (`dm`, `forum`, `guild_channel`), kemampuan (`supports_threads`), dan referensi topic General.

---

## 9. Mode fallback

Bila pembuatan topic gagal (forum mode mati di supergroup — dan Telegram **gagal diam-diam** dalam kasus ini, atau batas thread Discord tercapai):

1. Deteksi sekali di startup dan simpan `container.supports_threads = false`.
2. Jalankan **mode linear**: semua sesi di satu aliran, setiap balasan diawali header `[workspace · #id]`.
3. Beri tahu user satu kali, dengan langkah perbaikan yang tepat ("aktifkan Topics di pengaturan grup" / "arsipkan thread lama").
4. Deteksi ulang saat `doctor` dijalankan.

Tidak pernah gagal keras. Model tab adalah kemewahan, bukan prasyarat.
