# Plan — prosa-tertinggal

**Spec:** [`../spec/prosa-tertinggal.md`](../spec/prosa-tertinggal.md)

## Langkah

1. **`README.id.md`.** Dua kalimat penutup paragraf status dihapus dan diganti
   satu kalimat yang sama artinya dengan penutup `README.md`. Sisa paragraf
   tidak disentuh: ia sudah menyebut lampiran sebagai yang terkirim, yang
   membuat kalimat "lampiran masih belum ada" tiga baris kemudian saling
   bertentangan di dalam satu paragraf.
2. **Kedua panduan pasang.** Lampiran keluar dari daftar "belum tersedia".
   "Enam preset selain Claude Code" menjadi jumlah yang benar di dua tempat per
   berkas, dan penghitung yang mengikutinya ("ketiganya") ikut dibetulkan.
3. **Kedua `openclaw-vs-caraka`.** Tujuh preset menjadi sembilan; baris
   verifikasi hidup ditulis ulang dari `README.md`, yang sudah benar; kedua
   angka LOC diganti dengan pengukuran hari ini berikut tanggalnya.
4. **Situs.** Empat kalimat berhenti menyebut Claude sebagai teks tetap, dan
   judul bagian ACP berhenti menyebutnya sebagai satu-satunya rute — enam dari
   sembilan preset menyatakan blok `acp:`, dan klien ACP mengambil perintah
   spawn-nya dari preset yang terpilih. Kalimat `bypassPermissions` tetap
   menyebut Claude karena mode itu memang miliknya.

## Pemetaan pembuktian

| AC | Cara dibuktikan |
|---|---|
| AC-1.1, AC-1.2, AC-1.3 | manual: kedua paragraf pembuka README dibaca berdampingan |
| AC-2.1, AC-2.2 | manual: `grep -n "preset" docs/install-guide*.md`, dibandingkan dengan `ls presets/agents/ \| wc -l` |
| AC-3.1, AC-3.2 | manual: kedua berkas `openclaw-vs-caraka` |
| AC-3.3, AC-3.4 | manual: tiap angka LOC dicocokkan dengan pengukuran yang dicatat di `AGENTS.md` untuk rilis ini |
| AC-4.1, AC-4.2 | manual: `grep -n "Claude" site/src/data/{docs,security}.ts`, tiap kemunculan dibaca terhadap pertanyaan "apakah kalimat ini berlaku untuk agent lain" |

## Kenapa tidak ada test

Satu-satunya klaim di sini yang bisa dipatok mesin adalah jumlah preset, dan
mematoknya berarti menulis test yang membaca prosa dua bahasa untuk mencari
angka yang ditulis sebagai kata. Yang sudah dipatok adalah nomor versi, oleh
`site/test/fidelity.test.js`, dan itu dipatok karena ia salah dua kali berturut
sesudah `1.5.6` mencatat insidennya. Angka lain yang salah di sini salah sekali,
dengan tanggal, dan ditulis ulang dengan tanggal supaya kesalahan berikutnya
terbaca sebagai umur, bukan sebagai kebohongan.

## Gate

```bash
npm run verify
```

```
> caraka@1.5.9 scan:secrets
clean: 315 tracked files, no credentials

> caraka@1.5.9 lint
All matched files use the correct format.
Finished in 919ms on 34 files using 24 threads.

> caraka@1.5.9 typecheck
> tsc -p tsconfig.json --noEmit

> caraka@1.5.9 build
> tsc -p tsconfig.json

> caraka@1.5.9 test
ℹ tests 172
ℹ pass 172
ℹ fail 0

> caraka@1.5.9 e2e
ℹ tests 108
ℹ pass 108
ℹ fail 0

> caraka-site@0.0.1 test
 Test Files  2 passed (2)
      Tests  35 passed (35)
```

Situs, dijalankan dari `site/` sesuai `CLAUDE.md`:

```
npm run check   → lint, astro check, vitest — exit 0
npm run e2e     → 142 tes lintas chromium, firefox, webkit, dan dua profil telepon
                  140 passed · 2 skipped
```

`site.spec.ts` yang mengukur tinggi dokumen merah lebih dulu, dan angkanya
dipakai apa adanya: `/docs` +88 ke 7607, `/guide` +47 ke 7830, `/status` −16 ke
8777. Ketiganya adalah prosa yang ditambahkan rilis ini, dan yang ketiga adalah
kartu 1.5.9 yang menggantikan kartu 1.5.4 yang lebih panjang.

Satu tes lain, `motion › scroll progress advances` di webkit, merah dua kali
saat suite dijalankan berbarengan dengan proses lain di mesin ini dan hijau
setiap kali dijalankan sendiri, dengan maupun tanpa perubahan rilis ini
(`npx playwright test --project=webkit -g "scroll progress advances"`). Ia
menunggu 600 md sesudah menggulir lalu membaca `--ck-sp`; yang merah adalah
mesin yang sibuk, bukan halamannya.
