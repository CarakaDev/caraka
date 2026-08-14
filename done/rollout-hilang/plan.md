# Plan — rollout-hilang

**Spec:** [`../spec/rollout-hilang.md`](../spec/rollout-hilang.md)

## Langkah

1. **Fixture agen palsu** mendapat satu saklar, `FAKE_LOST_ROLLOUT`, yang meniru
   jawaban codex-cli 0.147.0 ketika rollout-nya hilang: gagal dengan menyebut id
   yang baru saja diserahkan.
2. **Dua tes merah**: yang satu menuntut pengulangan itu ada, yang satu menuntut
   pengulangan itu *tidak* terjadi untuk kegagalan lain. Yang kedua hijau sejak
   awal, dan itu memang gunanya — ia menjaga batasnya.
3. **Di `cli.ts`**, pada cabang `exit.code !== 0`: kalau giliran ini giliran
   lanjutan dan pesan galatnya memuat id yang kita kirim, id itu dibuang,
   `turns` dikembalikan ke nol, dan giliran itu dipanggil ulang. Nol giliran
   membuat panggilan berikutnya menjadi sesi baru, dan sekaligus membatasi ini
   pada satu pengulangan: `resume` tidak mungkin benar lagi.
4. **Satu kalimat baru** di kedua katalog, dikirim sebelum pengulangannya.

## Mengapa idnya yang jadi tanda

Sembilan preset berarti sembilan agen dengan sembilan kalimat galat. Menuliskan
polanya di YAML berarti menebak sembilan kalimat dan memeliharanya. Tetapi id
yang dikeluhkan agennya adalah id yang kita sendiri kirimkan satu proses yang
lalu — tidak ada yang perlu menuliskannya, dan tandanya bekerja untuk agen yang
belum ditulis siapa pun.

Lantainya delapan karakter. Fixture pertama memakai `t-1` dan tesnya merah karena
penjaga itu — tiga karakter memang bisa muncul di kalimat galat mana pun secara
kebetulan, yang persis alasan lantainya ada. Id codex sungguhan adalah UUID.

## Mengapa ia mengatakannya

Sesi baru tidak membawa giliran-giliran sebelumnya. Pengulangan yang diam akan
menjawab pertanyaan lanjutan tanpa riwayat yang membuatnya masuk akal, dan
jawaban yang salah dengan percaya diri lebih buruk daripada galat. Satu kalimat
dikirim di antara keduanya.

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
