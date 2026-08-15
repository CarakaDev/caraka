# Spec — gambar-dari-agent: gambar yang agent hasilkan sampai ke chat

**Slug:** gambar-dari-agent · **Tanggal:** 15 Agustus 2026 · **Status:** selesai

## Latar

Diminta pemilik: bisa kirim gambar lewat Caraka, dua arah, dan kompatibel
dengan agent mana pun.

**Arah masuk sudah selesai sejak 1.3.0** dan tidak disentuh di sini. Foto dari
Telegram sampai ke model sebagai ACP image content block (`imageBlock` di
`src/drivers/claude-acp.ts`), digerbangi `promptCapabilities.image` yang agent
umumkan saat `initialize`, atau lewat `-i <path>` pada preset yang menyebut
benderanya. Yang belum ada adalah arah sebaliknya.

**Arah keluar tidak ada sama sekali, dan bolongnya di tiga lapis:**

1. `src/core/driver.ts` menyatakan `content` sebagai `{ type: string; text: string }`.
   ACP mendefinisikan lima jenis block — text, image, audio, resource_link,
   resource — dan memakai union yang **sama** untuk kedua arah, jadi tipe inti
   ini adalah penyempitan yang tidak bisa menampung gambar.
2. `Gateway.agentText` mengembalikan `""` untuk block apa pun yang bukan teks,
   dan pemanggilnya `if (!text) return`. Block-nya hilang tanpa jejak: tidak
   di-stringify, tidak dicatat, tidak digalatkan.
3. `Channel` tidak punya method yang bisa menaruh byte di chat. `sendText`,
   `sendResult`, `editText` — semuanya menerima string.

Akibat yang bisa dilihat orang: sebuah giliran yang **hanya** menghasilkan
gambar melapor `run.noOutput` — *"{agent} selesai tanpa keluaran teks"* — jadi
yang meminta grafik diberi tahu tidak ada yang dihasilkan.

Ini bukan hipotetis. Adapter yang preset `claude-code.yaml` pin,
`@agentclientprotocol/claude-agent-acp` 0.63.0, **mengirim image block hari
ini** lewat `agent_message_chunk` maupun sebagai isi tool call; goose juga, di
jalur pesan hidupnya. Dua dari enam rute terverifikasi sudah membuang gambar.

**Jalur tool call hilang dua kali.** `tool_call` dideklarasikan hanya sebagai
`{toolCallId, title}` dan `tool_call_update` tidak dideklarasikan sama sekali,
padahal di situlah gambar paling sering lahir: agent yang menggambar grafik
menggambarnya di dalam sebuah tool.

**Tiga dokumen mengklaim fitur ini sudah ada.** `docs/frd.md` FR-CHAN-05
menyebut konvensi `MEDIA:<path-atau-url>` yang diekstrak core, `docs/api.md` §2
mengulanginya, dan `docs/design.md` §2.1 menggambar `OutboundMessage` dengan
`files?: {path}[]`. Tidak satu pun ada di `src/`.

## Lingkup

Gambar yang **agent kirim sebagai byte** sampai ke chat, di channel yang bisa
membawanya, dan disebut apa adanya di channel yang tidak bisa.

**Di luar lingkup, dengan alasannya:**

- **Konvensi `MEDIA:<path>` tidak dibangun, dan klaimnya dicabut.** Mengangkat
  path dari teks agent berarti membangun primitif baca-berkas yang dikendalikan
  masukan yang model ancaman proyek ini sendiri sebut tidak tepercaya
  (`docs/security.md` §9). Byte yang agent kirim sendiri tidak punya masalah
  itu: tidak ada yang dibaca dari disk pemilik.
- **WhatsApp tidak dapat `sendImage`.** Cloud API menuntut unggah-lalu-kirim
  dua panggilan, seam-nya menyatakan payload `string`, dan setiap tulisan harus
  lewat corong `emit()` yang memegang lima mitigasi ban. Tidak ada nomor yang
  pernah ditautkan ke kode ini, jadi membangunnya berarti mengirim yang belum
  pernah dijalankan siapa pun ke jalur yang bisa memblokir nomor orang.
- **Dasbor tidak menampilkan gambar.** CSP-nya `default-src 'none'` tanpa
  `img-src`; menampilkannya adalah perubahan keamanan, bukan perubahan render.

## Acceptance criteria

- **AC-1** — Ketika sebuah update membawa image content block, sistem **shall**
  mengirimkan byte-nya ke percakapan sesi itu sebagai pesan tersendiri.
- **AC-2** — Sistem **shall** membaca image block dari `agent_message_chunk`
  maupun dari isi `tool_call` dan `tool_call_update`.
- **AC-3** — Ketika sebuah giliran tidak menghasilkan teks tetapi menghasilkan
  gambar, baris penutupnya **shall** menyebut gambarnya, bukan `run.noOutput`.
- **AC-4** — Ketika channel tidak punya `sendImage`, sistem **shall** menjawab
  satu kalimat yang menyebut apa yang datang, dan **shall not** diam.
- **AC-5** — Sistem **shall** membaca ketiadaan method itu, bukan `channel.id`
  (hard rule 1).
- **AC-6** — Block bukan-teks yang bukan gambar **shall** muncul di transkrip
  sebagai satu penanda bertanda kurung, bukan hilang.
- **AC-7** — Block yang base64-nya tidak terurai menjadi byte apa pun
  **shall not** dikirim.
- **AC-8** — Caption **shall** dipotong pada batas channel, bukan membuat
  kirimannya ditolak.

## Yang tetap terbuka

Byte tidak bisa dilewatkan scrubber: `createScrubber` mengembalikan string, dan
rahasia yang tergambar menjadi piksel keluar sebagai piksel. `docs/security.md`
menuliskannya sebagai batas, bukan sebagai celah yang akan ditutup.

Chat yang dibaca satu ruangan dibaca semua anggotanya, gambar termasuk. Itu
konsekuensi memasukkan ruangan ke allowlist, dan sudah dinyatakan di sana.
