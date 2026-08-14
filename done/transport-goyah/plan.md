# Plan — transport-goyah

**Spec:** [`../spec/transport-goyah.md`](../spec/transport-goyah.md)

## Langkah

1. **Tes merah dulu**, dua-duanya. Yang pertama menuntut `retrySend` yang belum
   ada. Yang kedua mereproduksi laporannya: pesan progres yang gagal terkirim,
   lalu keadaan sesinya dibaca. Merah berbunyi `STATE running`, dan galat yang
   dikirimnya sama kata demi kata dengan yang ditempel pelapornya.
2. **`retrySend`** di `core/channel.ts`: satu percobaan ulang, hanya untuk kiriman
   yang *dilempar*, tidak untuk yang dijawab. `fetchWithRetry` memanggilnya, jadi
   Discord dan WhatsApp mendapatkannya tanpa satu baris pun berubah di adapter
   mereka.
3. **Telegram memanggilnya sendiri**, karena ia tidak bisa lewat `fetchWithRetry`
   — lihat catatan di spec.
4. **Pesan progres pindah ke dalam `try`**, dan dua pembacanya diberi penjaga:
   `editText` yang menyunting baris itu, dan `deleteMessage` di `finally`.

## Yang retak lebih dulu, dan pelajarannya

Penjaga kegagalan kiriman di harness mula-mula dipasang di `sendText` yang salah
— ada tiga di berkas tes itu, dan yang kena adalah milik `viaAdapter`, yang
menunggu `while (!finalSent)`. Seluruh suite e2e karena itu menggantung sepuluh
menit sebelum dihentikan. Tes tunggalnya berjalan 768 ms sepanjang waktu itu;
yang menemukan letaknya adalah menjalankan satu tes, bukan menjalankan semuanya
lagi.

Percobaan pertama tesnya juga memakai penghitung — "gagalkan kiriman pertama" —
dan yang pertama ternyata pengumuman saat start, bukan baris progres. Sesinya
selesai `done` dan tesnya merah karena alasan yang salah. Yang benar adalah
menunjuk barisnya.

## Gate

```bash
npm run verify
```

```
clean: 305 tracked files, no credentials
ℹ pass 170   (unit)
ℹ fail 0
ℹ pass 103   (e2e)
ℹ fail 0
```
