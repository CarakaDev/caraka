# Plan — awal-dingin

**Spec:** [`../spec/awal-dingin.md`](../spec/awal-dingin.md)

## Langkah

1. **`RETRY_PAUSES_MS` menggantikan `RETRY_PAUSE_MS`** di `src/core/channel.ts`.
   Satu array, dan panjangnya yang menentukan jumlah percobaan: tiga percobaan,
   dua jeda. `retrySend` menjadi loop yang berhenti ketika `RETRY_PAUSES_MS[i]`
   habis, bukan ketika sebuah penghitung menyentuh angka yang ditulis di tempat
   lain — dua angka yang harus sepakat adalah satu suntingan dari tidak sepakat.
   `fetchWithRetry` memanggilnya, jadi Discord dan WhatsApp ikut tanpa satu
   baris pun berubah di adapternya.
2. **Satu `.catch` di `Telegram.start()`.** Bentuknya sama dengan `getMe` satu
   baris di bawahnya, dan komentarnya menyebut kenapa menelannya aman di sini:
   `updates()` sudah mengulang selamanya, dan webhook yang sungguh terpasang
   tetap terbaca sebagai 409.
3. **`init` menjelaskan dirinya.** `deleteWebhook` pertama tetap fatal —
   sesudahnya ada penantian pairing lima menit yang akan diam kalau kegagalan
   ini ditelan — tetapi kalimatnya berganti menjadi `cli.networkUnreachable`,
   yang menyebut bahwa token sudah diterima satu panggilan sebelumnya dan
   menyuruh mengulang `caraka init`.

## Pemetaan pembuktian

| AC | Cara dibuktikan |
|---|---|
| AC-1.1, AC-1.2, AC-1.3 | unit: *a transport that drops one request is tried again* — tiga percobaan, jeda `[500, 1500]`, galat percobaan ketiga yang keluar |
| AC-1.4 | unit: *an aborted request is not retried*, tidak berubah |
| AC-1.5 | unit: bagian AC-4 pada test yang sama, tidak berubah |
| AC-2.1 | unit: *a deleteWebhook that never left still starts the poller* — `start()` selesai, `getMe` tetap dipanggil, dan nama bot sampai ke kalimat readiness |
| AC-2.2 | tidak berubah dan tidak disentuh: `updates()` melempar 401 dan 409 apa adanya, dan `cli.start` sudah membacanya |
| AC-3.1, AC-3.2 | unit: *every sentence …* katalog — kunci baru ada di kedua katalog; kalimatnya dibaca manual di `src/i18n.ts` |

## Risiko

Tangga yang lebih panjang berarti transport yang benar-benar mati menahan satu
panggilan 2 detik, bukan 0,5 detik. Yang paling sering menunggu di ujung itu
adalah loop `updates()`, yang memang sudah tidur 2 detik di antara percobaan,
jadi siklus gagalnya menjadi sekitar 4 detik alih-alih 2,5. Itu harga untuk
proses yang tetap hidup sampai jaringannya datang.

Test AC-2.1 memakai jeda sungguhan dan karena itu berjalan 2 detik. Menyuntikkan
`sleep` ke `Telegram.call` berarti menambah parameter di jalur yang dilewati
setiap panggilan Telegram demi satu test; dua detik lebih murah.

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
