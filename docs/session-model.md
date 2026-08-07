# Session Model — "tab" untuk coding agent

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
                                          closeForumTopic + ringkasan akhir
```

| State | Warna ikon topic | Prefiks nama |
|---|---|---|
| `running` | 🔵 biru `7322096` | `▸ ` |
| `awaiting_approval` | 🟡 kuning `16766590` | `⏸ ` |
| `done` | 🟢 hijau `9367192` | `✓ ` |
| `failed` | 🩷 magenta `16749490` | `✗ ` |
| `cancelled` | 🟣 ungu `13338331` | `⊘ ` |

Warna diperbarui lewat `editForumTopic` di setiap transisi. **Daftar topic menjadi papan status yang bisa dibaca sekilas** — tanpa membuka satu pun percakapan.

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
| Pesan di **topic sesi** | Lanjutkan sesi itu. Tidak pernah membuat topic baru. |
| Pesan di topic sesi **yang sudah `done`** | `reopenForumTopic` + lanjutkan sesi yang sama (ACP `session/load`). |
| Pesan saat sesi `running` | Masuk antrean sesi tersebut, balas "diantrekan (#n)". |
| Perintah global (`/ws`, `/status`, `/memori`) | Selalu dijawab di General, dari topic mana pun ia dikirim. |

**Prinsip:** *sesi tidak pernah berpindah topic, dan topic tidak pernah dipakai ulang oleh sesi lain.* Ini yang membuat riwayat dapat dipercaya.

---

## 6. Kebersihan (housekeeping)

Tanpa aturan, daftar topic akan membengkak seperti tab browser.

| Aturan | Default |
|---|---|
| Tutup topic saat sesi `done`/`failed`/`cancelled` | ✅ langsung, setelah pesan ringkasan |
| Hapus topic yang `done` | setelah **7 hari** (dapat diatur; `0` = jangan pernah) |
| Batas sesi aktif bersamaan | **5** per operator — melebihi itu, tawarkan menutup yang terlama |
| Sesi `running` tanpa aktivitas | timeout 30 menit → `failed` + topic ditutup |
| Topic "General" | tidak pernah ditutup, tidak pernah dihapus |
| Sesi yang dipin (`/pin`) | dikecualikan dari auto-hapus |

Ringkasan penutup dikirim **sebelum** topic ditutup, sehingga baris terakhir topic selalu menjelaskan apa yang terjadi:

```
✓ Selesai · 1:12 · 2 file berubah · 18 test lulus
   Ringkasan disimpan ke memori (claim_f3963d7b)
```

---

## 7. Pemetaan lintas channel

| Konsep | Telegram (private) | Telegram (supergroup) | Discord | WhatsApp |
|---|---|---|---|---|
| Ruang kerja | chat privat dengan bot | supergroup forum | channel teks/forum | chat |
| Sesi | forum topic | forum topic | thread | — (linear) |
| Kontrol | topic General | topic General | channel induk | chat yang sama |
| Membuat | `createForumTopic` (tanpa admin) | butuh `can_manage_topics` | `CREATE_PUBLIC_THREADS` | — |
| Menutup | `closeForumTopic` | idem | `archived: true` | — |
| Batas | belum terdokumentasi | — | ±50 aktif/channel, 1.000/guild | — |
| Auto-arsip | manual (kita) | manual | dipaksa Discord (60/1440/4320/10080 mnt) | — |

**WhatsApp tidak punya konsep sesi ber-tab.** Degradasi anggun: setiap balasan diawali baris header `[toko-api · #a91]`, dan `/status` menampilkan daftar sesi aktif sebagai teks. Ini konsisten dengan prinsip "capability opsional, bukan cabang kode per channel".

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
