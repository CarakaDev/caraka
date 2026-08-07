# Riset: Channel chat — Indonesia, WhatsApp/Baileys, Telegram, Discord, Signal

**Tanggal riset:** 7 Agustus 2026
**Sumber:**
- voi.id / databoks Katadata / GoodStats — penetrasi aplikasi pesan di Indonesia
- gawai.mengerti.id — "Top 5 Aplikasi Chat Terpopuler Dunia 2026"
- github.com/openclaw/openclaw/issues/23093 — "WhatsApp Cloud API (official) as alternative to Baileys"
- whatsapp.checkleaked.cc/blog/what-is-baileys + /whatsapp-cloud-api-vs-unofficial
- blueticks.co/blog/best-whatsapp-mcp-servers
- blog.kraya-ai.com/whatsapp-automation-ban-risk
- gurusup.com/blog/evolution-api-whatsapp
- github.com/kobie3717/baileys-antiban
- OpenClaw docs: `channels/*`

---

## 1. Lanskap Indonesia

| Aplikasi | Pengguna Indonesia | Penetrasi | Relevansi untuk produk |
|---|---|---|---|
| **WhatsApp** | dominan mutlak; ±2,9 miliar pengguna global (2026) | ~90%+ | **Wajib.** "Hampir semua orang punya WhatsApp" |
| **Telegram** | 128,55 juta | 62,8% | **Default untuk developer.** Bot API resmi, gratis, tanpa risiko ban, dukungan file besar, inline keyboard |
| **Facebook Messenger** | 99,48 juta | 48,6% | Rendah untuk use case teknis |
| **LINE** | 81,27 juta | 39,7% | Menurun; masih ada basis loyal |
| **Discord** | signifikan di komunitas dev/gamer | — | **Cocok untuk tim & komunitas dev** — thread, code block, file, role-based access |
| **Signal** | kecil tapi vokal (privasi) | — | Opsional; segmen privacy-conscious |

**Kesimpulan prioritas channel:**
1. **Telegram** — MVP pertama (paling cepat, paling aman, UX terkaya untuk approval button)
2. **WhatsApp** — wajib untuk adopsi Indonesia, tapi dengan dua provider (lihat §2)
3. **Discord** — tim & komunitas
4. **Signal** — fase berikutnya (via `signal-cli`)
5. LINE / Slack / Matrix — hanya kalau diminta

---

## 2. WhatsApp: dua jalur, dua risiko

### Jalur A — Baileys (unofficial, WebSocket, TypeScript, MIT)

Reverse-engineer protokol WhatsApp Web multi-device. Login via QR sebagai *linked device*.

**Kelebihan:** gratis, setup 2 menit, akses penuh ke chat personal, tanpa verifikasi bisnis.

**Risiko (terdokumentasi kuat):**
- Melanggar ToS WhatsApp; risiko ban **nyata dan tidak dapat diprediksi**. Rentang laporan: dari beberapa hari sampai berbulan-bulan tanpa masalah, tanpa pola yang andal.
- Isu OpenClaw #23093 melaporkan pola konkret: session logout berulang, error 401, ban — terutama setelah reconnect atau saat bridge mengirim balasan. Isu terkait: "WhatsApp linking stuck at logging in", "can't link new devices at this time".
- Sinyal deteksi yang dilaporkan: **reply-ratio rendah (<10% = risiko tinggi)**, jarak contact-graph (mengirim ke orang asing), timing robotik, traffic dari IP datacenter/VPS.
- Estimasi umum untuk tooling protokol reverse-engineered: **2–8 minggu** sebelum terdeteksi bila perilaku memicu detektor. Satu analisis 600+ akun SMB India melaporkan 68% mengalami minimal satu ban dalam 12 bulan.
- "Anti-ban wrapper" & random delay hanya menyentuh sebagian sinyal — **tidak menjamin apa pun**.
- Maintainer Baileys sendiri menyatakan tidak mendukung penggunaan yang melanggar ToS dan secara eksplisit melarang bulk/automated messaging.

**Poin penting yang menguntungkan kita:** profil risiko use case kita adalah yang **paling rendah** di kategori ini — satu nomor, satu operator, hanya membalas percakapan yang sudah ada, tidak pernah menghubungi orang asing, volume rendah, reply-ratio ~100%. Sumber menyebut setup "hanya membaca dan membalas percakapan yang sudah ada" jauh lebih rendah risikonya dibanding menyebar pesan first-contact.

### Jalur B — WhatsApp Cloud API (resmi Meta)

**Kelebihan:** tidak ada ban, webhook-based (tanpa kerapuhan WebSocket), didukung Meta, fitur kaya (template, interactive message, media, read receipt).
**Biaya/kendala:** butuh verifikasi Meta Business (beberapa hari), harga per-pesan (±$0,005–0,08 tergantung negara & arah; sejak 1 Juli 2025 Meta pindah dari conversation-based ke **per-message pricing**, template Utility gratis di dalam jendela 24 jam, Marketing & Authentication selalu berbayar), nomor khusus (tidak bisa berbagi dengan WhatsApp pribadi), butuh endpoint webhook publik.

### Keputusan desain

Ikuti pola yang diusulkan di isu OpenClaw — **satu channel, dua provider yang bisa dipilih**:

```yaml
channels:
  whatsapp:
    provider: baileys | cloud-api
    # baileys:
    allowFrom: ["+628xxxxxxxxxx"]
    # cloud-api:
    phoneNumberId: "..."
    accessToken: "..."
    webhookVerifyToken: "..."
```

Plus mitigasi wajib yang kita paksakan di kode (bukan sekadar dokumentasi):
- Nomor terpisah (two-phone setup) — ditegaskan saat onboarding
- `allowFrom` **wajib diisi**; tanpa itu channel menolak start
- Hard rate limit outbound + jitter manusiawi
- **Tidak pernah** mengirim pesan first-contact
- Peringatan eksplisit + link ke dokumen risiko saat memilih provider `baileys`

Alternatif menengah (Evolution API, WAHA, Whapi.Cloud) **bukan** solusi risiko — semuanya memakai Baileys/whatsmeow di balik layar, jadi risiko banned identik; yang berbeda hanya siapa yang mengurus infrastruktur.

---

## 3. Telegram — channel default

Bot API resmi, gratis, tidak ada risiko ban, dan paling kaya untuk UX approval:
- **Inline keyboard** → tombol `[✅ Setujui] [❌ Tolak] [👁 Lihat diff]` untuk `session/request_permission` ACP
- `editMessageText` → update progres in-place tanpa spam chat
- Upload file sampai 2 GB → kirim diff/patch/log sebagai file
- `MarkdownV2` / `HTML` → code block dengan syntax highlight
- Topics/forum → satu topic per repo
- Webhook maupun long-polling

Catatan implementasi dari OpenClaw: mereka punya RFC khusus **"Telegram Outbound Sanitizer"** — MarkdownV2 Telegram sangat rewel soal escaping. Rencanakan sanitizer sejak awal, jangan belakangan.

Library: `grammY` (TypeScript, modern, dipakai OpenClaw) atau `telegraf`.

---

## 4. Discord

Bot resmi, gratis. Kekuatan: **thread per sesi**, code block, embed, file attachment, button/select menu untuk approval, dan **role-based permission** — satu-satunya channel yang secara natif mendukung skenario tim (siapa boleh approve `deploy`, siapa hanya boleh membaca).
Library: `discord.js`.

---

## 5. Signal

Tidak ada Bot API resmi. Jalur standar: **`signal-cli`** (JVM) atau `signal-cli-rest-api` (Docker) dalam mode daemon + JSON-RPC. Butuh nomor telepon terdaftar. Cocok untuk pengguna yang mengutamakan privasi; overhead operasional lebih tinggi (JVM + registrasi nomor). Prioritas fase 2.

---

## 6. Abstraksi channel yang direkomendasikan

Satu interface, semua channel:

```ts
interface Channel {
  id: "telegram" | "whatsapp" | "discord" | "signal";
  start(): Promise<void>;
  onMessage(cb: (m: InboundMessage) => void): void;
  send(chatId: string, msg: OutboundMessage): Promise<MessageRef>;
  edit?(ref: MessageRef, msg: OutboundMessage): Promise<void>;   // progres in-place
  askChoice?(chatId: string, q: string, opts: Choice[]): Promise<string>; // approval
  sendFile?(chatId: string, path: string, caption?: string): Promise<void>;
  setTyping?(chatId: string, on: boolean): Promise<void>;
}
```

Capability bersifat **opsional** — channel yang tidak punya tombol (Signal) jatuh ke fallback berbasis teks (`balas: ya / tidak`). Ini pola yang sama dengan `edit?` di atas: **degradasi anggun, bukan cabang kode per channel**.

Konvensi media mengikuti OpenClaw (sederhana dan terbukti): agent menuliskan baris `MEDIA:<path-atau-url>` sendirian di satu baris, gateway mengekstrak dan mengirimkannya sebagai lampiran.
