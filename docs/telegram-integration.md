# Telegram Integration

**Produk:** Caraka · **Versi:** 0.1 · **Tanggal:** 7 Agustus 2026
**Status:** Telegram adalah **channel pertama dan channel referensi**.
**Riset pendukung:** `docs/research/telegram-bot-api-2026-core-telegram-botnews.md`

---

## 1. Kenapa Telegram lebih dulu

1. **Tanpa risiko ban** — Bot API resmi, gratis, tanpa verifikasi bisnis.
2. **Tanpa port terbuka** — long-polling berarti gateway tetap bisa `bind 127.0.0.1` tanpa tunnel apa pun.
3. **Topic di private chat** — memberi model sesi ber-tab tanpa setup apa pun dari user.
4. **Rich Messages** — code block, tabel, dan diff akhirnya bisa dirender native.
5. **Ephemeral Messages** — approval privat bahkan di dalam grup.
6. **Tombol berwarna** — approval yang tidak ambigu.

Target versi: **Bot API 10.2** dengan degradasi otomatis ke jalur lama bila server/pustaka belum mendukung.

---

## 2. Pemetaan fitur

| Kebutuhan produk | Fitur Telegram | Fallback |
|---|---|---|
| Sesi ber-tab | `createForumTopic` di private chat | mode linear + header `[ws · #id]` |
| Status sesi terlihat sekilas | `editForumTopic` warna ikon | prefiks di nama topic |
| Menutup sesi | `closeForumTopic` | pesan penutup saja |
| Hasil terstruktur (diff, tabel, test) | `sendRichMessage` + blocks | MarkdownV2 + file `.diff` |
| Streaming progres | `sendRichMessageDraft` + `RichBlockThinking` | `editMessageText` teks polos |
| Approval | `InlineKeyboardButton` + `style` + `icon_custom_emoji_id` | teks kode `ok A7F3` |
| Approval privat di grup | `receiver_user_id` (ephemeral) | grup tetap `read-only` |
| Lampiran keluar | `sendDocument` / `sendPhoto` | tautan file |
| Voice note masuk | unduh file → transcriber user (opsional) | tolak dengan pesan jelas |
| Lapisan izin kedua | access whitelist @BotFather | allowlist kita saja |

---

## 3. Rich Messages — aturan pemakaian

### Kapan pakai apa

| Fase | Method | Alasan |
|---|---|---|
| Ack (< 1 dtk) | `sendMessage` teks polos | tercepat, tanpa risiko format |
| Progres | `editMessageText` pada pesan ack | murah, tidak spam |
| Hasil akhir | **`sendRichMessage`** pesan baru | format kaya, code block native |
| Setelah hasil terkirim | `deleteMessage` pesan progres | menjaga topic bersih |

**Jangan** mencoba meng-`editMessageText` sebuah pesan menjadi rich message di tengah stream. Laporan implementasi nyata menunjukkan format rich hancur menjadi teks polos dengan penanda sintaks mentah, dan **tidak ada `editRichMessage`**. Pola kirim-baru + hapus-lama adalah perbaikan yang terbukti.

### Peta block yang kita pakai

| Isi | Block |
|---|---|
| Ringkasan hasil | paragraph |
| "Berkas yang berubah" | table (path · +/− · catatan) |
| Isi diff | code block dengan bahasa |
| Hasil test | task list (✓/✗ per suite) |
| Rencana agent | list bernomor |
| Penalaran agent saat streaming | **`RichBlockThinking`** |
| Log panjang | details / collapsible |
| Peringatan | blockquote |

Batas 32.768 karakter per pesan sudah cukup untuk hampir semua diff; di atas itu → kirim sebagai file dengan ringkasan tabel di pesan.

### Ketersediaan pustaka

Dukungan pustaka masih tertinggal dari API (`python-telegram-bot` masih membuka isu untuk 10.1). **Rencana:** panggil `sendRichMessage`/`sendRichMessageDraft`/method ephemeral **langsung lewat HTTP** di satu adapter tipis (`telegram/raw.ts`), dan ganti ke tipe pustaka resmi saat mendarat. Semua pemakaian melewati fungsi `richSend()` sendiri sehingga migrasi cukup satu file.

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
- Di grup: kartu dikirim dengan `receiver_user_id` = operator, sehingga **hanya operator yang melihatnya**. Anggota lain tidak melihat apa pun.
- `callback_query_id` dipakai untuk membalas penekanan tombol secara ephemeral.

---

## 5. Perintah bot

Didaftarkan lewat `setMyCommands`, dengan scope berbeda untuk private chat dan grup:

| Perintah | Scope | `is_ephemeral` |
|---|---|---|
| `/ws` | semua | ✅ di grup |
| `/new` | semua | — |
| `/stop` | semua | — |
| `/status` | semua | ✅ di grup |
| `/switch` | private | — |
| `/mode` | private | — |
| `/pin`, `/unpin` | private | — |
| `/ingat`, `/lupakan`, `/memori` | private | — |
| `/help` | semua | ✅ di grup |

`BotCommand.is_ephemeral` membuat balasan perintah di grup hanya terlihat oleh pemanggil — sangat berguna untuk `/status` yang bisa memuat nama repo.

---

## 6. Keamanan khusus Telegram

| Kontrol | Implementasi |
|---|---|
| Allowlist | milik kita (wajib) + **access whitelist @BotFather** (disarankan saat onboarding) |
| Privasi grup | `setMyDefaultAdministratorRights` minimal; group privacy mode ON kecuali dibutuhkan |
| Anti-spoof callback | nonce + HMAC pada `callback_data`; `callback_data` maks 64 byte → simpan payload di DB, kirim id-nya saja |
| Kebocoran di grup | ephemeral untuk semua output sensitif; grup tetap `read-only` secara default |
| Bot-to-bot | **dimatikan** di v1 (tidak diaktifkan di @BotFather) |
| Token | keychain OS / file `chmod 600`; tidak pernah masuk log atau chat |
| Webhook | tidak dipakai — long-polling menghilangkan seluruh kelas risiko ekspos port |

---

## 7. Batas & penanganan galat

| Situasi | Penanganan |
|---|---|
| 429 Too Many Requests | hormati `retry_after`, antre, backoff eksponensial |
| Edit terlalu sering | throttle update status ≥ 1,5 detik |
| Pesan > 32.768 karakter | potong di batas block, sisanya sebagai file |
| `createForumTopic` gagal diam-diam | deteksi kemampuan sekali di startup → `container.supports_threads = false` → mode linear |
| Bot diblokir user | tandai identity `revoked`, hentikan pengiriman, catat audit |
| `sendRichMessage` gagal | fallback otomatis ke MarkdownV2 (dan catat agar bisa diperbaiki) |
| Field baru tak dikenal di update | **abaikan, jangan drop update** |

---

## 8. Yang sengaja tidak dipakai di v1

Managed Bots (token melewati pihak ketiga), bot-to-bot communication, Mini App dashboard, guard bot, Stars/langganan, poll, Communities, business mode.

Semua tercatat sebagai kandidat di `roadmap.md`, bukan dilupakan — tetapi tidak satu pun dibutuhkan untuk membuat produk ini berguna.
