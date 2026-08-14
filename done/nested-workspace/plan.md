# Plan — nested-workspace

**Spec:** [`spec/nested-workspace.md`](../spec/nested-workspace.md) · **Tanggal:** 14 Agustus 2026

## Langkah

1. `src/core/gateway.ts` — `overlapping()` menyempit menjadi satu arah, yang
   memuat workspace yang sudah ada. Komentarnya mencatat kenapa arah satunya
   dilepas, supaya tidak dipasang kembali oleh orang yang membaca namanya saja.
2. `src/core/gateway.ts` — `nestedIn()`, pembaca untuk arah yang tidak ditolak.
   Ia bukan penolakan; hasilnya dipakai teks kartu.
3. `src/core/gateway.ts` — teks kartu bercabang: `ws.addCardNested` bila
   bersarang, `ws.addCard` bila tidak.
4. `src/i18n.ts` — satu pasang kalimat di kedua katalog, menyebut workspace yang
   memuatnya dan konsekuensi dua scope.
5. `test/unit.test.ts` — test overlap yang sudah ada dipecah menjadi dua arah,
   dan fixture pelipatan huruf dipindah ke workspace yang lebih dalam supaya ia
   menguji arah yang memperluas dan bukan bentrokan slug.
6. `npm run verify`.

## Pemetaan AC → pembuktian

| AC | Pembuktian |
|---|---|
| AC-1 | unit *a proposed workspace is refused before its card*: `offer(root)` menyebut `overlaps the workspace utama` dan `markup` `undefined` |
| AC-2 | unit yang sama: `offer(join(configured, "src"))` mengembalikan `markup` yang ada |
| AC-3 | unit yang sama: teksnya cocok `/sits inside utama/` |
| AC-4 | unit yang sama: teksnya cocok `/second scope/` |
| AC-5 | unit yang sama: workspace `lipat` di `FOLD/inner`, usulan `fold` ditolak menyebut `lipat` |
| AC-6 | `tsc` menolak kunci yang hilang dari katalog `id`; keduanya ditulis di langkah 4 |

## Risiko

**Dua scope atas satu direktori sekarang bisa terjadi.** Itu memang yang
diizinkan, dan harganya nyata: `/lock` pada anak tidak menutup jendela induk
yang juga mencakupnya. Yang berubah adalah siapa yang memutuskan — kartu
menyebutnya sebelum ditekan, alih-alih aturan menolak atas nama orang yang tidak
pernah ditanya. `/lock` yang mencakup induk adalah pekerjaan tersendiri.

**Test hitungan penyapu ikut bergeser.** Usulan bersarang sekarang menambah
entri, jadi angka yang menghitung isi peta naik satu di dua tempat. Diubah
angkanya, bukan dilonggarkan assert-nya.

## Keluaran gerbang

```
clean: 290 tracked files, no credentials
ℹ tests 164
ℹ pass 164
ℹ fail 0
ℹ tests 99
ℹ pass 99
ℹ fail 0
```

Jumlahnya tidak bergerak dari 1.5.0: yang berubah isi test overlap yang sudah
ada, dipecah menjadi dua arah, bukan test baru. Yang membuktikan perubahannya
adalah bahwa arah bersarang sekarang menuntut `markup` yang ada di tempat
sebelumnya menuntut `undefined` — assert yang sama, harapan yang berlawanan.
