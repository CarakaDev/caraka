# Plan — kartu pairing yang bersih dan laporan kesiapan grup

## Keputusan yang menentukan bentuk diff

**Pembersihan keyboard naik ke percabangan, bukan ke setiap handler.** Laporan
awal hanya menyebut kartu pairing grup. Memperbaiki `confirmGroup` saja akan
meninggalkan `confirmTrust` rusak dengan cara yang persis sama, dan handler
callback keempat nanti akan melupakannya lagi. Satu pemanggilan di
`handleCallback` setelah pemeriksaan principal menutup ketiganya sekaligus,
dan pemanggilan lama di jalur approval jadi mubazir lalu dihapus.

Letaknya sesudah pemeriksaan allowlist dan bukan sebelumnya, karena itulah yang
membuat AC-2 benar: anggota grup yang menekan tombol tidak boleh menghapus
kartu yang bukan miliknya.

**Laporan kesiapan memakai `getMe`, di-cache sekali.** Nama bot dibutuhkan agar
`/new@<bot>` bisa disalin apa adanya. Ia tidak berubah selama proses hidup, jadi
satu field dan satu panggilan malas sudah cukup; kegagalan jaringan jatuh ke
`"caraka"` alih-alih menggagalkan pairing.

**`/status` memakai ulang fungsi yang sama.** Alternatifnya perintah baru
seperti `/check`, yang berarti satu baris lagi di `setMyCommands`, satu entri
lagi di dua katalog, dan satu hal lagi untuk diingat operator. `/status` sudah
merupakan pertanyaan "apa yang sedang terjadi"; di grup jawaban jujurnya
memang termasuk apa yang akan dan tidak akan Telegram kirimkan.

## Perubahan

| Berkas | Perubahan |
|---|---|
| `src/core/gateway.ts` | pembersihan keyboard terpusat di `handleCallback`; pembersihan lama di jalur approval dihapus; `groupReadiness()` baru; dipanggil setelah pairing dan dari `/status` non-privat; field `botName` |
| `src/i18n.ts` | `group.ready`, `group.topicsOn`, `group.topicsOff` di katalog `en` dan `id` |
| `test/e2e.test.ts` | stub `harness()` merekam `clearKeyboard` dan menyediakan `getMe`; satu tes baru |
| `README.md`, `README.id.md` | bagian "yang belum ada" masih menyebut grup dan service belum dikirim; keduanya sudah dikirim di v0.2 |

## Yang tidak dikerjakan

Mengubah privacy mode dari kode. Bot API tidak menyediakannya — `/setprivacy`
hanya ada di @BotFather — dan sekalipun tersedia, memperlebar apa yang bot baca
bukan keputusan yang boleh diambil sebuah bug fix.

## Verifikasi

```
npm run lint       All matched files use the correct format.
npm run typecheck   (tanpa keluaran)
npm test            26 pass, 0 fail
npm run e2e         15 pass, 0 fail
```

Tes baru gagal lebih dulu pada `clearKeyboard` sebelum diperbaiki, dan
kegagalan pertamanya berguna: patch stub pertama mengenai harness yang salah —
ada dua stub Telegram di berkas itu — sehingga tes menguji objek yang tidak
dipakai `harness()`. Itu jenis kegagalan yang tidak akan terlihat kalau tes
ditulis setelah kodenya hijau.

Tanda tangan callback pada tes memakai tanda tangan asli yang dikeluarkan
gateway, bukan buatan tangan; tanda tangan palsu ditolak sebelum jalur yang
diuji tercapai dan akan membuat assertion lolos tanpa membuktikan apa pun.
