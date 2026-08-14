# Spec — nama-yang-bekerja: baris "sedang bekerja" menyebut yang bekerja

**Status:** selesai · **Tanggal:** 14 Agustus 2026

## Latar

Dua kalimat lagi menuliskan `Claude` sebagai teks tetap, dan keduanya dikirim ke
chat pada setiap tugas:

```
"run.working":  "◌ Claude is working…"   /  "◌ Claude sedang bekerja…"
"run.noOutput": "Claude finished without text output."
```

Ini cacat yang sama dengan [issue #9] dalam bentuk ketiga. Pemasangan yang
menjalankan codex membaca `Claude sedang bekerja…` pada tiap tugas, dan tidak
ada Claude di mesin itu. Perbaikan 1.5.3 membuat agen yang benar dipilih dan
membuat baris start-up menyebutnya; kedua kalimat ini luput karena keduanya ada
di jalur run, bukan di jalur pemilihan.

Nama yang benar sudah ada di tempat kalimat ini dikirim: `gateway.ts:1339`
berjarak sepuluh baris dari `agentFor(workspace, session)` yang memilih drivernya.

## Ruang lingkup

`src/i18n.ts` (dua katalog, dua kunci), `src/core/gateway.ts`, `test/unit.test.ts`.

## Yang tidak dikerjakan

- **Subjeknya tidak diganti menjadi `Caraka`.** Yang bekerja adalah agennya;
  Caraka mengantar. Baris yang berbunyi "Caraka sedang bekerja" akan mengklaim
  pekerjaan yang bukan miliknya, dan itu justru yang ditolak `docs/blueprint.md`
  §2: runtime bukan milik kita.
- **Tidak ada indikator mengetik.** Itu pekerjaan lain yang spec-nya sudah ada.

## Acceptance criteria

- **AC-1** WHEN Caraka mengabarkan bahwa sebuah tugas berjalan, kalimat itu
  shall menyebut id agen yang menjalankannya.
- **AC-2** WHEN sebuah run selesai tanpa keluaran teks, kalimat itu shall
  menyebut id agen yang sama.
- **AC-3** WHERE sesi maupun workspace tidak menyebut agen, kalimat itu shall
  menyebut agen bawaan produk, bukan kata kosong.
- **AC-4** IF sebuah katalog menuliskan nama agen sebagai teks tetap, THEN
  `npm test` shall merah.

[issue #9]: https://github.com/CarakaDev/caraka/issues/9
