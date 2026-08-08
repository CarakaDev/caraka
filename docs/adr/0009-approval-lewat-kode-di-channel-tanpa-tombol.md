# ADR-0009 — Approval lewat kode di channel tanpa tombol, dan dua provider WhatsApp

**Status:** Diterima · **Tanggal:** 8 Agustus 2026
**Melengkapi:** [ADR-0004](0004-approval-hanya-lewat-callback.md), yang sudah menyebut `ok A7F3` sebagai bentuk yang boleh dipakai bila sebuah channel tidak punya tombol. ADR-0004 tetap berlaku seluruhnya; ADR ini yang membangun bentuk itu.

## Konteks

WhatsApp tidak punya tombol callback pada kedua provider. Sampai v0.5 core menjawab keadaan itu dengan menolak izin: `caps.buttons` false berarti permintaan izin dibatalkan. Untuk sebuah channel yang menolak setiap izin, seluruh produk berhenti pada tool call pertama yang butuh persetujuan.

Aturan keras 2 `AGENTS.md` menulis "approval tidak pernah tiba sebagai teks chat". Kalimat itu ditulis untuk melarang satu hal tertentu: kata. Injeksi prompt bisa membuat agent menghasilkan `ya`, `setuju`, `approve`; ia tidak bisa menghasilkan nilai yang tidak pernah masuk konteksnya.

## Keputusan

### 1. Kode kartu adalah bearer secret sekelas callback bertanda tangan

Setiap kartu approval di channel tanpa tombol membawa satu kode 4 karakter dari alfabet 32 simbol — 2^20 — dibangkitkan `randomBytes` di sisi server, disimpan pada baris approval yang sama, dan ditampilkan hanya di kartu itu. Ia tidak pernah masuk baris audit, log, maupun prompt.

Pemakaiannya menempuh `UPDATE … WHERE decision IS NULL` yang sama dengan jalur tombol, terikat `(principal, sesi, permintaan)`, ber-TTL sepuluh menit, dan sekali pakai. Lima percobaan salah per (principal, sesi) menutup jalur kode selama pertanyaan itu masih menunggu; penghitungnya hanya berjalan selama ada yang menunggu, karena percakapan biasa bisa berbentuk seperti kode.

Channel yang **punya** tombol tidak diberi kode sama sekali. Keputusannya sudah dibawa callback bertanda tangan; kode kedua tidak memutuskan apa pun yang tidak bisa diputuskan yang pertama, dan ia akan duduk di transkrip yang bisa dibaca setiap anggota wadah itu.

Aturan keras 2 diamendemen menjadi "approval tidak pernah tiba sebagai teks yang tak terautentikasi". Yang ditolak tetap kata.

### 2. Baileys adalah peer dependency opsional, di satu berkas

`@whiskeysockets/baileys` tidak masuk `dependencies`. Ia peer opsional dengan versi dipin eksak, dan `src/channels/whatsapp-baileys.ts` satu-satunya berkas yang menyebutnya — dimuat lewat `await import()` dari cabang provider. Pemasangan yang hanya memakai Telegram tidak pernah mengunduhnya, dan provider `cloud-api` bekerja tanpa dependensi baru di atas `fetch` bawaan.

Konsekuensinya jujur: CI tidak pernah memasang Baileys, jadi perubahan API-nya tidak akan ketahuan dari repositori ini. Yang menahan hanya versi yang dipin dan pesan galat yang menyebut versi itu.

### 3. Webhook Cloud API mengikat loopback, dan alamat lain butuh flag

Provider `cloud-api` membuka satu listener `node:http` pada `127.0.0.1` kecuali `caraka start` diberi alamat lain, dan alamat di luar daftar loopback mencetak peringatan serta menulis satu baris audit sebelum socket menerima koneksi pertama. Setiap POST diperiksa terhadap `X-Hub-Signature-256` dengan perbandingan waktu-tetap, juga ketika listener mengikat loopback: proses lain di mesin yang sama bisa mengetuk semudah Meta.

Provider `baileys` tidak membuka listener apa pun. Socketnya keluar, seperti long-polling Telegram.

## Konsekuensi

`docs/frd.md` FR-CHAN-02 berhenti menulis bahwa izin ditolak ketika `caps.buttons` false. `done/discord-v05/spec.md` AC-2.5 menjamin perilaku lama; ini amendemen sadar, dan test yang mengunci perilaku itu diubah di commit yang sama.

Kode di kartu berarti siapa pun yang bisa membaca wadah itu bisa memutuskan izin — asalkan mereka juga lolos daftar pengirim. Itulah kenapa channel WhatsApp menolak pesan grup: pada protokol perangkat tertaut, pesan grup menyebut grup itu sendiri sebagai pengirim, jadi daftar pengirim berhenti menyebut orang.

Yang dibayar: satu kolom basis data, satu index unik parsial, dan satu peta penghitung di memori proses. Yang tidak dibayar: jalur kedua ke keputusan pada channel yang sudah punya satu.
