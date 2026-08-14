# Plan — close-bukan-otomatis

**Spec:** [`spec/close-bukan-otomatis.md`](../spec/close-bukan-otomatis.md) · **Tanggal:** 14 Agustus 2026

## Langkah

1. `src/core/gateway.ts`, `setState` — cabang penutupan dan cabang pembukaan
   dicabut, beserta pembacaan keadaan sebelumnya yang hanya dipakai pembukaan
   itu. Komentar di tempatnya mencatat kenapa, supaya tidak dipasang kembali.
2. `src/core/gateway.ts` — `closeSession`, di bawah penjaga kepemilikan yang sama
   dengan penggantian nama.
3. `src/core/channel.ts` — satu entri `close` di `gatewayCommands`.
4. `src/i18n.ts` — `close.done` dan `close.running` di kedua katalog, dan `/close`
   masuk kedua badan `/help` beserta kalimat yang menjelaskan kapan topic ditutup.
5. Test yang mengunci perilaku lama ditulis ulang ke kontrak baru, bukan dihapus.
6. `docs/session-model.md` §3, §6, dan tabel housekeeping.
7. `npm run verify`.

## Pemetaan AC → pembuktian

| AC | Pembuktian |
|---|---|
| AC-1 | e2e *a finished run is renamed and left open*: sesudah satu run, `h.calls` tidak memuat `finishThread` |
| AC-2 | e2e yang sama: `editForumTopic:▸ ship it` dan `editForumTopic:✓ ship it` keduanya ada |
| AC-3 | e2e yang sama, giliran kedua di topic itu: tidak ada `resumeThread` maupun `finishThread` |
| AC-4 | e2e yang sama: `/close` menghasilkan `finishThread:7001`, keadaan `done`, dan `spokeBeforeClose` memastikan baris penutup mendahului penutupan |
| AC-5 | e2e */close refuses while a task is still running*: jawabannya cocok `/still running/` dan tidak ada `finishThread` |
| AC-6 | e2e *a thread that is not Caraka's is neither closed nor reopened*: `/close` di thread tak bertanda tidak menutup |
| AC-7 | tercakup jalur linear yang sudah ada: `closeSession` menulis keadaan sebelum memeriksa thread |
| AC-8 | e2e yang sama dengan AC-4, harness `archives: "fails"`: keadaan `done` tertulis dan tidak ada pesan galat |
| AC-9 | unit *the four /help bodies…*: setiap entri `gatewayCommands` wajib muncul di kedua badan `/help` |
| AC-10 | `tsc` menolak kunci yang hilang dari katalog `id` |

## Risiko

**Topic tidak pernah tertutup sendiri lagi.** Itu memang yang diminta, dan
harganya daftar topic yang tumbuh sampai seseorang mengirim `/close`. Menutup
otomatis pada tebakan apa pun — `done`, idle, jumlah — adalah tebakan yang sama
yang baru saja dicabut, dalam bentuk lain.

**Sesudah `/close`, anggota biasa tidak bisa menulis di topic itu.** Itu memang
arti menutup di Telegram, dan sesi berikutnya dibuka dengan `/new`. Admin yang
ingin melanjutkan bisa membuka topic itu dari kliennya sendiri.

**Anggaran.** +72 baris di `src/`: satu perintah beserta penjaganya, dua pasang
kalimat, dan komentar yang mencatat kenapa penutupan otomatis dicabut. `src/`
9.971 → 10.043.

## Keluaran gerbang

```
clean: 292 tracked files, no credentials
ℹ tests 164
ℹ pass 164
ℹ fail 0
ℹ tests 100
ℹ pass 100
ℹ fail 0
```

100 e2e dari 99, yaitu test penolakan `/close` saat run berjalan. Empat test yang
mengunci perilaku lama ditulis ulang, bukan dihapus: yang dulu menuntut
`finishThread` sesudah `done` sekarang menuntut ketiadaannya, dan menuntut
`/close` yang menghasilkannya.
