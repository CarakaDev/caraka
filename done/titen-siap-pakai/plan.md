# Plan — titen-siap-pakai

**Spec:** [`spec/titen-siap-pakai.md`](../spec/titen-siap-pakai.md) · **Tanggal:** 13 Agustus 2026

## Bentuk yang dipilih

Empat hal kurang sesudah `y`, dan pembagiannya begini: tiga diselesaikan Caraka,
satu diserahkan dengan benar.

| Kurang | Siapa |
|---|---|
| `titen` tidak di `PATH` | Caraka — panggil jalur absolut, jangan ubah profil shell orang |
| belum `bootstrap`, tidak ada kunci | Caraka — jalankan sendiri, tangkap kuncinya |
| kunci tidak tersimpan di tempat yang Caraka baca | Caraka — `secrets/titen.key` 0600 |
| `titen serve` belum jalan | diserahkan — satu perintah yang benar, bukan pengawas proses |

Dua jalur tetap baru di `carakaPaths`: `titenDb` di `~/.caraka/titen.db` dan
`titenKey` di `~/.caraka/secrets/titen.key`. Yang pertama ada supaya `bootstrap`
Caraka dan `serve` yang disebutnya menunjuk basis data yang sama — tanpa itu,
default `titen.db` relatif direktori kerja membuat keduanya dua store dan setiap
rute menjawab `401`. Yang kedua supaya kunci tidak menuntut `export` manual;
`uninstallTargets` sudah memuat `paths.secrets` sebagai direktori, jadi berkasnya
ikut terhapus tanpa baris tambahan.

Kunci dibaca dengan pola yang sudah dipakai setiap token channel di
`loadConfig`: variabel lingkungan lebih dulu, berkas rahasia bila kosong. Nama
variabelnya tetap `CARAKA_TITEN_API_KEY`, dan awalan `CARAKA_` itu yang membuat
`claudeEnvironment()` melepasnya sebelum satu pun coding agent di-spawn.

## Langkah

1. `src/config.ts` — `carakaPaths` mendapat `titenDb` dan `titenKey`. Tidak ada
   yang lain di berkas ini.
2. `src/cli.ts` — `resolveTitenBinary()`: `$BUN_INSTALL/bin/titen`,
   `~/.bun/bin/titen`, lalu `resolveCommand("titen")` sebagai jalan terakhir.
   Mengembalikan jalur absolut atau `null`. Kandidat bun ada di depan karena
   itu yang dipakai pemasang Titen hari ini dan justru direktori yang tidak ada
   di `PATH`; `resolveCommand` menutup pemasangan lewat cara lain.
3. `src/cli.ts` — langkah memori di `init` ditulis ulang menjadi rantai yang
   setiap sambungannya bisa gagal ke `local`, berurutan:
   1. pemasang dijalankan seperti sekarang. Status bukan nol → `local` (AC-16).
   2. biner di-resolve. `null` → `local`, sebut binernya tidak ditemukan (AC-3).
   3. `titenDb` sudah ada → **tidak** bootstrap (AC-6). Kalau kunci juga tidak
      dipegang, sebut satu perintah dan `local`.
   4. `titen bootstrap --db <titenDb> --org <nama workspace>`, keluarannya
      ditangkap alih-alih diwariskan ke terminal, karena keluaran itu memuat
      kunci dan sebuah kata sandi sementara.
   5. kunci diambil dengan `/titen_sk_[A-Za-z0-9_-]+/`. Tidak ada → `local`,
      sebut langkah yang gagal (AC-9).
   6. `atomicSecret(paths.titenKey, key)` — fungsi itu sudah menulis 0600 dan
      memindahkan ke tempatnya (AC-7).
   7. `provider = "titen"` hanya di titik ini, sesudah kunci ada di disk (AC-10).
   8. `GET <endpoint>/healthz` dengan batas dua detik. Menjawab → katakan memori
      hidup (AC-15). Tidak → sebut `titen serve --db <titenDb>` (AC-14).
4. `src/cli.ts` — `loadConfig` membaca kunci lewat pembaca yang sudah ada,
   variabel lingkungan lalu berkas, dan hanya ketika provider-nya `titen`.
   `startupSecrets` menambahkannya ke daftar rahasia yang disemai ke scrubber
   (AC-11, AC-12).
5. `src/cli.ts` — pembentukan provider di `:725` meneruskan kunci itu sebagai
   argumen kelima `TitenMemory`. Dua argumen di tengahnya dilewati dengan
   `undefined` supaya nilai bawaannya berlaku; itu satu baris dan tidak mengubah
   tanda tangan konstruktor, yang dipakai satu test dengan kelima argumennya.
6. `src/cli.ts` — baris pemulihan memori di `doctor` (`:642`) menyebut
   `titen serve --db <titenDb>` (AC-17). Baris `export CARAKA_TITEN_API_KEY`
   tetap benar sebagai jalan kedua dan tidak dihapus.
7. `src/i18n.ts` — lima pasang kalimat di kedua katalog: biner tidak ditemukan,
   bootstrap tanpa kunci, store ada tanpa kunci, Titen siap dengan perintahnya,
   dan memori hidup. Kalimat penawaran memori tidak diubah: ia sudah menyebut
   bahwa pembacaan kembali masih kosong, dan itu masih benar.
8. `test/unit.test.ts` — test per baris tabel di bawah.
9. `docs/install-guide.md` dan `.en`: langkah memori sekarang menyelesaikan
   bootstrap dan penyimpanan kunci, dan yang tersisa satu perintah.
   `docs/troubleshooting.md` dan `.en`: baris memori mati menyebut jalur basis
   data tetap. `docs/frd.md` FR-SETUP-01e. `docs/security.md` §6 dan `.en`:
   `secrets/titen.key` masuk daftar berkas rahasia.
10. `npm run verify`, lalu gerbang yang sama di `rama-tuf`.

## Pemetaan AC → pembuktian

| AC | Pembuktian |
|---|---|
| AC-1 | unit: langkah memori dengan pemasang palsu tercatat dipanggil dengan perintah `curl … titen.dev/install.sh` yang sama seperti kalimat penawarannya |
| AC-2 | unit `resolveTitenBinary` dengan `PATH` kosong dan sebuah berkas di direktori bun palsu: jalurnya tetap ditemukan |
| AC-3 | unit: biner tidak ada di satu pun kandidat → config yang ditulis memuat `provider: local`, dan keluarannya menyebut biner |
| AC-4 | unit: `carakaPaths().titenDb` berada di bawah `carakaPaths().root` |
| AC-5 | unit: argumen yang diterima `bootstrap` palsu memuat `--db` dan nilainya sama dengan `carakaPaths().titenDb` |
| AC-6 | unit: `titenDb` dibuat lebih dulu sebagai berkas kosong → `bootstrap` tidak pernah dipanggil sama sekali |
| AC-7 | unit: sesudah bootstrap palsu mencetak kunci, `stat` berkas kunci memberi mode `0600` dan isinya kunci itu |
| AC-8 | unit: seluruh keluaran terminal yang tertangkap selama langkah memori tidak memuat kunci, dan `config.yaml` yang ditulis juga tidak |
| AC-9 | unit: bootstrap palsu yang tidak mencetak kunci → `provider: local` |
| AC-10 | unit, dua arah: dengan kunci → `titen`; setiap jalur gagal di atas → `local` |
| AC-11 | unit `loadConfig`: kunci hanya di berkas → terbaca; kunci di kedua tempat dengan nilai berbeda → yang dari lingkungan yang dipakai |
| AC-12 | unit: `startupSecrets` atas objek yang memuat kunci Titen mengembalikan daftar yang memuatnya, lalu `createScrubber` atas daftar itu meredaksi kunci itu di dalam sebuah kalimat |
| AC-13 | unit: `carakaPaths().titenKey` berada di bawah `carakaPaths().secrets`, dan `uninstallTargets` memuat `secrets` |
| AC-14 | unit: endpoint yang tidak menjawab → keluaran memuat `titen serve --db` beserta jalur basis datanya |
| AC-15 | unit: `/healthz` palsu yang menjawab 200 → keluaran mengatakan memori hidup dan tidak menyebut `titen serve` |
| AC-16 | unit: pemasang palsu berstatus 1 → `provider: local`, dan biner tidak pernah di-resolve |
| AC-17 | unit: baris memori `doctor` memuat `--db` beserta jalur basis datanya |
| AC-18 | unit: setiap kunci katalog baru ada di `en` dan di `id`, dalam bentuk yang sama dengan test dua-katalog yang sudah ada |

## Risiko

**Menangkap keluaran `bootstrap` alih-alih mewariskannya.** Langkah pemasangan
sekarang memakai `stdio: "inherit"` sehingga orang melihat apa yang terjadi.
Keluaran `bootstrap` tidak boleh diwarisi seperti itu: ia memuat kunci API dan
sebuah kata sandi sementara dashboard, dan keduanya tidak pantas tergeletak di
scrollback terminal. Jadi khusus perintah itu keluarannya ditangkap, dan yang
dicetak Caraka adalah kalimatnya sendiri. Pemasangnya sendiri tetap `inherit`,
karena di sana tidak ada rahasia dan orang memang perlu melihat unduhannya.

**Nama organisasi.** `--org` diisi nama workspace, yang sudah ada di config dan
stabil. Bukan hostname, karena hostname berubah dan nama organisasi tidak ikut
berubah dengannya.

**Store ada tapi kunci tidak.** Terjadi kalau seseorang pernah bootstrap sendiri
di jalur itu, atau menghapus berkas kuncinya. Caraka tidak menebak: `bootstrap`
kedua di store yang sama melempar `UNIQUE constraint failed` **dengan status
keluar 0**, jadi tidak ada cara membedakan berhasil dari sudah-pernah lewat
status, dan menjalankannya adalah jejak tumpukan di layar orang tanpa hasil.
Jalur pulihnya `titen key list` lalu `titen key create --org-id`, dan itu tidak
dibangun sekarang.
`ponytail: jatuh ke local dan sebut satu perintah; bangun jalur key create kalau
ada yang benar-benar mendarat di sini.`

**Recall tetap kosong, dan itu bukan yang diperbaiki di sini.** Di bawah Titen
sebuah observation belum terbaca kembali sampai ada yang menulis claim. Pekerjaan
ini membuat Titen tersambung dan `/ingat` benar-benar menyimpan; ia tidak membuat
`/memori` mengembalikan baris. Siapa pun yang membaca plan ini dan mengharapkan
yang kedua akan kecewa pada hal yang memang belum dibangun, jadi kalimat
penawaran memori tetap mengatakannya apa adanya.

**Anggaran.** Diperkirakan +55 baris di `src/`: rantai langkah memori beserta
lima cabang gagalnya, `resolveTitenBinary`, dua jalur di `carakaPaths`, satu
pembacaan kunci, dan sepuluh entri katalog. Tidak ada penghapusan yang membayarnya
di dalam satu perkara ini. `src/` 9.438 → sekitar 9.493, dicatat di `AGENTS.md`
seperti yang sebelumnya, dan plafonnya tidak digeser.

## Yang berubah dari plan ini saat dikerjakan

**Satu seam dibuang, dan itu memperkuat pembuktiannya.** Langkah 3.6 semula
menyuntikkan penulis berkas kunci supaya test tidak menulis ke disk. Yang
dilakukan justru sebaliknya: `paths` sudah disuntikkan, jadi test menulis ke akar
sementara dan `atomicSecret` yang sungguhan yang bekerja. AC-7 menuntut mode
0600, dan mode itu milik `atomicSecret`; menguji lewat tiruan berarti menguji
tiruannya. Enam seam, bukan tujuh.

**Baris pemulihan `doctor` juga membaca kunci dari berkas.** Tidak ada di plan,
dan ketahuan saat menyambungkan AC-11: `doctor` memanggil `titenApiKey()` yang
hanya membaca lingkungan, jadi sesudah pekerjaan ini ia akan merah dengan
`401` pada pemasangan yang justru bekerja — kunci ada di berkas dan gateway
membacanya. Sekarang `loaded.titenKey || titenApiKey()`, sumber yang sama dengan
yang dipakai gateway.

**Dua test untuk AC-11, bukan satu.** Sisi lain dari pembacaan itu perlu dijaga
juga: provider `local` tidak boleh mencari kunci sama sekali, karena `local`
adalah pilihan, bukan pemasangan dengan kredensial yang kurang.

## Keluaran gerbang

Sepuluh test baru, dijalankan sendiri lebih dulu:

```
✔ the memory offer installs, resolves, bootstraps once, and stores the key
✔ a store that already exists is never bootstrapped again
✔ every link that does not hold ends at local, and says which one
✔ a Titen already answering is said so, and asks for no command
✔ the Titen binary is found without PATH naming it
✔ the Titen key is a secret in every place Caraka keeps one
✔ the Titen key is read from the environment first and the secret file second
✔ a provider other than titen reads no memory key at all
✔ doctor's memory remedy names the store it pinned
✔ every sentence the Titen setup can print is in both catalogs
ℹ pass 10 · fail 0
```

Gerbang penuh, `npm run verify`:

```
clean: 271 tracked files, no credentials
ℹ tests 156
ℹ pass 156
ℹ fail 0
ℹ tests 92
ℹ pass 92
ℹ fail 0
```

156 unit dari 146 sebelumnya, yaitu kesepuluh test di atas. 92 e2e tidak
bergeser: pekerjaan ini tidak menyentuh satu pun jalur yang dilewati e2e.

**Biaya baris +160, terhadap perkiraan +55 di bagian Risiko.** Ini kekeliruan
perkiraan bertiga di rilis ini, dan pantas ditulis apa adanya. Ke mana
perginya, terukur per berkas: `src/cli.ts` +119, `src/i18n.ts` +21,
`src/config.ts` +20.

Yang tidak diperkirakan adalah harga sebuah fungsi yang bisa diuji tanpa
jaringan, tanpa pemasang, dan tanpa Titen sungguhan. Enam seam beserta tipe
opsinya dan nilai bawaannya sekitar 35 baris yang tidak memuat satu pun
keputusan — ia hanya membuat keputusan yang ada bisa dijalankan di dalam test.
Sekitar 20 baris lagi komentar yang mencatat tiga perilaku Titen 0.7.4 yang
membentuk rantai ini, masing-masing dengan cara ia diukur. Sisanya sepuluh entri
katalog dan dua jalur baru beserta alasan keduanya dipin.

Kalau seam-nya dibuang dan fungsinya memanggil `spawnSync` serta `fetch`
langsung, angkanya mendekati perkiraan semula — dan tidak ada satu pun dari
sepuluh test di atas yang bisa ditulis tanpa menjalankan pemasang sungguhan di
mesin siapa pun yang menjalankan gerbang. Itu bukan tukar yang layak diambil.

`src/` 9.438 → 9.598. Dicatat di `AGENTS.md`; plafon ~8.000 tidak digeser.

### Mesin kedua

`rama-tuf`, disinkron ke direktori tersendiri seperti sebelumnya:

```
host: ra-tuf · Linux 7.0.12-201.fc44.x86_64 · node v24.18.0 · npm 11.16.0
clean: 271 tracked files, no credentials
ℹ tests 156 · pass 156 · fail 0
ℹ tests 92  · pass 92  · fail 0
```

Sama dengan mesin pertama. Yang layak dicatat dari mesin itu: ia **punya** Titen
0.7.4 terpasang di `~/.bun/bin`, jadi kesepuluh test baru berjalan di mesin yang
benar-benar memuat biner itu dan tetap tidak pernah menyentuhnya — seluruh
rantainya dipalsukan lewat seam, dan satu-satunya yang nyata adalah tulisan kunci
ke akar sementara. Itu properti yang diinginkan: gerbang tidak boleh berubah
hasilnya karena sebuah mesin kebetulan punya Titen atau kebetulan tidak.
