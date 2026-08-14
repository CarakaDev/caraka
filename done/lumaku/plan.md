# Plan — lumaku

**Spec:** [`../spec/lumaku.md`](../spec/lumaku.md)

## Langkah

1. `run.working` di kedua katalog menjadi `◌ Caraka → {agent} · lumaku…`. Satu
   kunci, dua baris, tidak ada kode yang berubah — `{agent}` sudah diisi
   `nama-yang-bekerja` sejam sebelumnya.
2. Satu fixture di `test/e2e.test.ts` yang menyalin baris itu sebagai teks
   dibuat membaca katalognya. Fixture itu hanya perlu "sesuatu yang pernah
   dikatakan Caraka", dan salinan teksnya basi setiap kali barisnya diubah —
   sudah basi sekali hari ini, satu jam yang lalu.
3. `CHANGELOG.md` dan kartu rilis di situs menuliskan kata dan alasannya.

## Yang tidak berubah

Kartu izin dan laporan gagal. Panah berarti "dibawa dari, ke"; yang meminta izin
dan yang gagal adalah agennya, dan panah di sana akan mengklaim keduanya milik
Caraka. Itu batas yang sama yang dipegang `docs/blueprint.md` §2.

## Gate

```bash
npm run verify
```

```
clean: 303 tracked files, no credentials
ℹ pass 166   (unit)
ℹ fail 0
ℹ pass 102   (e2e)
ℹ fail 0
```
