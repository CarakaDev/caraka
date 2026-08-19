# Plan — rumah-kedua

**Spec:** [`../spec/rumah-kedua.md`](../spec/rumah-kedua.md)

## Langkah

1. **`cli.alreadyRunning` menerima `{home}`.** Nilainya `loaded.paths.root`,
   bukan `~/.caraka` sebagai teks tetap: kalau `CARAKA_HOME` sudah dipakai,
   kalimat yang menyebut path bawaan adalah kalimat yang salah persis pada
   pembaca yang paling butuh benar. Kalimatnya lalu menyebut variabelnya
   berikut satu contoh yang bisa disalin.
2. **Unit systemd menyebutnya.** Blok komentar "Steps you run yourself" adalah
   tempat orang membaca cara memasangnya, jadi di situ pula tempat membaca cara
   memasang yang kedua: satu unit bernama lain dengan satu baris
   `Environment=CARAKA_HOME=%h/.caraka-<name>`.
3. **Satu bagian baru di kedua panduan pasang**, tepat di bawah paragraf yang
   sudah menjelaskan PID dan exit code 78, karena di situlah pembaca berada
   ketika ia menemui tabrakannya. Isinya `init`, `start`, unit systemd, dan
   satu fakta yang akan ditemui berikutnya: satu token Telegram tidak bisa
   dipoll dua proses, dan yang kedua dijawab 409.
4. **Situs.** Catatan `CARAKA_HOME` di `/docs` menyebutkan untuk apa variabel
   itu ada, dan baris `npx caraka start` di tabel CLI menyebutkan bahwa
   penolakannya menyebut direktori datanya.

## Pemetaan pembuktian

| AC | Cara dibuktikan |
|---|---|
| AC-1.1, AC-1.2 | unit: katalog dibaca dan kalimatnya memuat `{home}` dan `CARAKA_HOME`; kalimatnya dibaca manual |
| AC-1.3 | tidak berubah: `process.exitCode = 78` di `src/cli.ts` tidak disentuh |
| AC-1.4 | unit: *every sentence …* katalog — kunci ada di kedua katalog dan tidak ada path bawaan di dalamnya |
| AC-2.1, AC-2.2 | manual: bagian *More than one instance on one machine* di kedua panduan |
| AC-2.3 | unit: *service --print prints one unit per platform* — assert baris `Environment=CARAKA_HOME=%h/.caraka-<name>` |
| AC-2.4 | manual: catatan environment di `site/src/data/docs.ts` |

## Risiko

Kalimat penolakan menjadi dua kalimat, dan ia dicetak ke stderr pada terminal
yang mungkin sempit. Yang menggantikannya bukan kalimat yang lebih pendek
melainkan pembaca yang membaca sumber paket terpasang untuk menemukan satu nama
variabel, yang persis dilakukan pelapor issue #13.

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
```

`site.spec.ts` yang mengukur tinggi dokumen merah lebih dulu, dan angkanya
dipakai apa adanya: `/docs` +88 ke 7607, `/guide` +47 ke 7830, `/status` −16 ke
8777. Ketiganya adalah prosa yang ditambahkan rilis ini, dan yang ketiga adalah
kartu 1.5.9 yang menggantikan kartu 1.5.4 yang lebih panjang. Sesudah angkanya
diperbarui, tes itu hijau.

Yang tidak hijau di setiap kali jalan adalah tiga tes lain, dan ketiganya diuji
sendiri-sendiri sebelum ditulis di sini:

| Tes | Kapan merah | Sendiri |
|---|---|---|
| `motion › scroll progress advances` (webkit) | dua kali, saat suite jalan 12 worker berbarengan dengan `npm run verify` | hijau |
| `no overflow › …` (mobile-safari, empat lebar) | sekali, 12 worker; tiap tes butuh ~20 dtk terhadap batas 30 dtk | hijau, 19–21 dtk |
| `header menu › the page behind it does not scroll` (mobile-chrome) | dua kali, 4 worker | hijau, `--repeat-each=3` dan bersama empat tes menu lainnya |

Ketiganya membaca keadaan sesudah penantian tetap — 600 md, 700 md, satu klik —
dan mesin yang jenuh melewati penantian itu. Berkas yang mereka uji
(`MobileMenu.astro`, `ck.js`, `mobile.spec.ts`, seluruh `styles/`) tidak
disentuh rilis ini: `git diff 1739c7c HEAD --` pada keempatnya kosong. CI
menjalankan suite yang sama di runner bersih, dan itu yang dipakai sebagai
jawaban terakhirnya.
