# Plan — gambar-dari-agent

**Slug:** gambar-dari-agent · **Tanggal:** 15 Agustus 2026 · **Status:** selesai

## Langkah

1. `src/core/driver.ts`: `AgentContent` (text | image | selebihnya bertipe
   telanjang) dan `ToolCallContent`; `agent_message_chunk` memakai `AgentContent`,
   `tool_call` mendapat `content`, dan `tool_call_update` dideklarasikan. (AC-2)
2. `src/core/channel.ts`: `sendImage?` opsional pada `Channel` — byte, bukan
   path, karena batas workspace milik core dan adapter yang menerima path adalah
   primitif baca-berkas. (AC-5)
3. `src/channels/telegram.ts`: `call()` menerima `FormData` sehingga multipart
   ikut lewat loop yang sama — yang harus dibagi bukan encoding-nya melainkan
   cara Telegram melaporkan penolakan di dalam badan 200. `sendImage` memilih
   `sendPhoto` atau `sendAnimation` menurut mime, caption dipotong 1024. (AC-8)
4. `src/channels/discord.ts`: `sendImage` memakai bentuk multipart yang
   `sendFile` di file yang sama sudah pakai; caption menjadi badan pesan, dengan
   `allowed_mentions: { parse: [] }` supaya teks dari agent tidak bisa mem-ping
   ruangan.
5. `src/core/gateway.ts`: `blocksOf` membaca kedua sumber block, `imagesOf`
   mendekode base64 dan membuang yang kosong (AC-7), `sendImage` mengirim atau
   menjawab kalimat (AC-1, AC-4), `agentText` menulis penanda untuk jenis lain
   (AC-6), dan `closingLine` menghitung gambar (AC-3).
6. Dua kalimat i18n baru, dua bahasa.
7. Cabut klaim `MEDIA:` dari `frd.md` dan `api.md`, dan `files?` dari sketsa
   `OutboundMessage` di `design.md`.

## Verifikasi

```
npm run verify   → 171 unit, 107 e2e, 35 unit situs, semuanya hijau
```

Tiga test e2e baru, satu per klaim yang paling mudah salah: gambar dari
`agent_message_chunk` terkirim dan baris penutupnya menyebutnya; gambar dari
`tool_call_update` terkirim juga; dan channel tanpa method itu menjawab kalimat
alih-alih diam.

## Yang berubah dari rencana

Rancangan pertama menaruh penanda `[image]` ke dalam teks. Dibuang: gambarnya
dikirim sebagai dirinya sendiri, jadi penanda di teks cuma sampah. Yang
dibutuhkan bukan penanda melainkan hitungan, supaya baris penutup berhenti
berbohong — itulah `pictures` di `runTask`.

`sendPhoto` untuk semua mime juga dibuang: Telegram menolak animasi di method
itu, dan allowlist masuk sudah menerima `gif`.
