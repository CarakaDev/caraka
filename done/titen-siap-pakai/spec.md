# Spec — titen-siap-pakai: tawaran memori yang menyelesaikan pemasangannya

**Status:** selesai · **Tanggal:** 13 Agustus 2026

## Latar

`caraka init` menawarkan memasang Titen, dan siapa pun yang menjawab `y` di situ
sudah menyatakan mau memakai Titen. Yang ditinggalkan tawaran itu sekarang bukan
Titen yang siap dipakai, melainkan config yang menunjuk ke provider yang tidak
bisa dijangkau.

Penyebabnya satu baris, `src/cli.ts:444`:

```ts
if (install.status === 0) memoryProvider = "titen";
```

Status keluar installer dibaca sebagai bukti provider-nya bekerja. Terbukti bukan,
pada 13 Agustus 2026 di mesin ini: installer selesai dengan status 0, memasang
lewat `bun add` ke `~/.bun/bin`, dan **mencetak sendiri** bahwa `titen` tidak akan
resolve karena direktori itu tidak ada di `PATH`. Caraka tidak membaca kalimat
itu, hanya status keluarnya, lalu menulis `provider: titen`.

Keadaan sesudah `init` selesai, terukur:

```
config          provider: titen, endpoint 127.0.0.1:8787
titen di PATH   tidak ada  (~/.bun/bin/titen ada, direktorinya tidak di PATH)
port 8787       tidak menjawab
API key         belum pernah dibuat, CARAKA_TITEN_API_KEY tidak di-set
```

`caraka doctor` menangkapnya (`✗ Titen memory: run titen serve`), jadi keadaan ini
terlihat. Yang tidak wajar adalah `init` menghasilkannya sama sekali: empat hal
kurang, dan tiga di antaranya bisa Caraka selesaikan sendiri tanpa satu pun
perubahan di Titen.

Tiga temuan yang membentuk bentuk pekerjaan ini, ketiganya diukur terhadap Titen
0.7.4 sebelum dirancang:

- **`titen` tidak perlu ada di `PATH`.** Yang Caraka butuhkan adalah jalurnya,
  bukan perubahan pada profil shell orang lain. `~/.bun/bin/titen` ada, dan
  memanggilnya lewat jalur absolut bekerja.
- **`bootstrap` dan `serve` sama-sama default ke `titen.db` di direktori kerja.**
  Bootstrap di satu direktori lalu `serve` dari direktori lain adalah dua basis
  data: yang kedua dibuat kosong, dan setiap rute berkunci menjawab `401` yang
  terbaca persis seperti kunci salah. Direproduksi di dua direktori `mktemp -d`.
- **`bootstrap` kedua di store yang sudah ada tidak idempoten.** Ia melempar
  `SQLiteError: UNIQUE constraint failed: operator_accounts.username` beserta
  jejak tumpukan, **dan keluar dengan status 0**. Ia tidak membuat organisasi
  kedua, tapi status keluarnya tidak bisa dipakai untuk membedakan berhasil dari
  sudah-pernah. Maka pekerjaan ini tidak pernah menjalankan `bootstrap` di store
  yang sudah ada, alih-alih menangani kegagalannya.

Ketiganya sudah dilaporkan ke Titen sebagai isu terpisah dan tidak ditunggu:
tidak ada satu pun langkah di sini yang menuntut Titen berubah lebih dulu.

## Ruang lingkup

`src/cli.ts` (langkah memori di `init`, pembacaan kunci di `loadConfig`,
`startupSecrets`, pembentukan provider, satu baris pemulihan di `doctor`),
`src/config.ts` (satu jalur di `carakaPaths`), `src/i18n.ts` (kedua katalog),
`test/unit.test.ts`, lalu `docs/install-guide.md` beserta pasangan `.en`,
`docs/troubleshooting.md` beserta pasangan `.en`, `docs/frd.md` FR-SETUP, dan
daftar rahasia di `docs/security.md` §6 beserta pasangan `.en`.

## Yang tidak dikerjakan

- **Tidak menyentuh satu baris pun kode Titen.** Ketiga temuan di atas ada di
  repositori Titen dan diperbaiki di sana oleh pemiliknya. Pekerjaan ini berdiri
  utuh terhadap Titen 0.7.4 apa adanya.
- **Tidak menjalankan `titen serve` dan tidak memasang layanan.** Caraka tidak
  pernah memasang layanan latar (`caraka service --print` mencetak unit dan tidak
  menulis apa pun), dan menjadi pengawas proses adalah peran yang bukan miliknya.
  Yang dikerjakan adalah membuat langkah terakhir itu satu perintah yang benar,
  bukan menghilangkannya.
- **Tidak mengubah `PATH` pengguna, tidak menulis ke profil shell.** Caraka
  memanggil jalur absolut; kalau pengguna mau `titen` di tangannya sendiri, itu
  keputusannya.
- **Tidak membuat kunci di store yang sudah ada.** Bila store ada tapi Caraka
  tidak memegang kunci, ia menyebut satu perintah dan jatuh ke `local` alih-alih
  menebak organisasi mana yang harus dipakai.
- **Tidak menjanjikan recall bekerja.** Di bawah Titen sebuah observation belum
  terbaca kembali: `compile` memilih claim, claim hanya lahir dari
  `POST /v1/consolidations`, dan tidak ada di Caraka yang memanggilnya. Kalimat
  tawaran memori sudah mengatakan ini dan tetap mengatakannya. Pekerjaan ini
  membuat Titen tersambung, bukan membuatnya mengingat.
- **Tidak mengubah `local` sebagai jawaban ketika ada yang menolak tawaran.**

## Acceptance criteria

- **AC-1** WHEN penawaran memori diterima, Caraka shall menjalankan pemasang
  Titen yang disebut di kalimat penawaran itu.
- **AC-2** WHEN pemasangan selesai, Caraka shall menentukan jalur biner Titen
  tanpa membaca `PATH` sebagai satu-satunya sumber.
- **AC-3** IF biner Titen tidak ditemukan sesudah pemasangan, THEN Caraka shall
  menulis `provider: local` dan menyebut bahwa binernya tidak ditemukan.
- **AC-4** Caraka shall memakai satu jalur basis data tetap di bawah direktori
  rumahnya untuk setiap perintah Titen yang dijalankannya.
- **AC-5** WHEN Caraka menjalankan `titen bootstrap`, ia shall menyertakan jalur
  basis data itu secara eksplisit.
- **AC-6** IF basis data pada jalur itu sudah ada, THEN Caraka shall tidak
  menjalankan `titen bootstrap`.
- **AC-7** WHEN `titen bootstrap` mencetak sebuah kunci API, Caraka shall
  menyimpannya di berkas rahasianya sendiri dengan mode 0600.
- **AC-8** Caraka shall tidak pernah menuliskan kunci API Titen ke keluaran
  terminal, ke berkas config, atau ke baris audit.
- **AC-9** IF `titen bootstrap` selesai tanpa kunci yang bisa dibaca dari
  keluarannya, THEN Caraka shall menulis `provider: local` dan menyebut langkah
  yang gagal.
- **AC-10** Caraka shall menulis `provider: titen` hanya bila ia memegang sebuah
  kunci API Titen.
- **AC-11** WHEN Caraka membaca kunci Titen saat mulai, ia shall membaca variabel
  lingkungan lebih dulu dan berkas rahasianya bila variabel itu kosong.
- **AC-12** WHILE sebuah kunci Titen dipegang proses ini, scrubber keluaran shall
  memuat kunci itu sebagai rahasia yang diredaksi.
- **AC-13** WHEN `caraka uninstall` berjalan, berkas kunci Titen shall termasuk
  yang dihapus.
- **AC-14** WHEN pemasangan berhasil dan kunci tersimpan, Caraka shall menyebut
  satu perintah untuk menjalankan Titen yang memuat jalur basis data tetap itu.
- **AC-15** WHERE Titen sudah menjawab di endpoint yang dikonfigurasi saat `init`
  selesai, Caraka shall mengatakan memori hidup alih-alih menyebut perintah itu.
- **AC-16** IF pemasang Titen keluar dengan status bukan nol, THEN Caraka shall
  menulis `provider: local`.
- **AC-17** WHEN baris pemulihan memori `caraka doctor` menyebut cara
  menjalankan Titen, ia shall memuat jalur basis data tetap itu.
- **AC-18** Setiap kalimat baru yang dibaca orang shall ada di kedua katalog
  bahasa.
