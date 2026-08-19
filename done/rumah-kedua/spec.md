# Spec — rumah-kedua: dua instance di satu host bertabrakan, dan tidak ada yang mengatakannya

**Status:** selesai · **Tanggal:** 19 Agustus 2026

## Latar

Dilaporkan dari luar sebagai [issue #13], dengan pembacaan sumber yang benar dan
solusi yang sudah diverifikasi sendiri oleh pelapornya. Ia ingin menjalankan
beberapa bot Caraka di satu VPS, masing-masing untuk folder berbeda. `caraka
start` yang kedua berhenti:

```
Caraka is already running (PID 3530114). Stop it with caraka stop.
```

Kalimat itu benar dan tidak berguna. Yang sedang berjalan bukan bot yang sedang
ia mulai, melainkan bot lain milik folder lain, dan tidak ada apa pun di layar
yang menunjukkan bahwa keduanya dianggap satu proses karena keduanya membaca
`~/.caraka`.

`CARAKA_HOME` sudah ada sejak `carakaPaths()` ditulis dan sudah menjawab
persoalan ini seluruhnya: config, database, `secrets/`, dan `caraka.pid`
semuanya turunan dari satu `base`. Pelapornya menemukannya dengan membaca
`config.js` di dalam paket yang terpasang. Yang tidak ada adalah satu baris pun
di dokumentasi yang menyebutkan bahwa variabel itu adalah cara menjalankan
instance kedua, dan satu kata pun di kalimat tabrakannya yang mengarah ke sana.

`docs/install-guide.md` menyebut `~/.caraka/caraka.pid` dan exit code 78 tanpa
menyebut bahwa jalur itu bisa dipindah. Situs menyebut `CARAKA_HOME` satu kali,
di catatan bawah blok konfigurasi `/docs`, sebagai "changes the local data
directory" — benar, dan tidak menjawab pertanyaan yang dibawa pelapor.

## Ruang lingkup

Kalimat tabrakannya, dan tempat yang menjelaskan cara menjalankan lebih dari
satu instance: panduan pasang dalam dua bahasa dan dua halaman situs yang sudah
menyebut `CARAKA_HOME` atau PID.

## Yang tidak dikerjakan

- **PID tidak dikunci per workspace.** Itu memindahkan satu tabrakan yang
  terlihat menjadi tiga yang tidak: dua proses yang berbagi satu `caraka.db`
  menulis sesi dan grant ke tabel yang sama, dua-duanya membaca `config.yaml`
  yang sama, dan `caraka uninstall` dari salah satunya menghapus rahasia
  keduanya. Kunci PID adalah satu-satunya hal yang saat ini mencegah itu, dan
  melonggarkannya tanpa memisahkan tiga berkas lainnya membuat kerusakan lebih
  sulit dilihat.
- **`init --workspace` tidak menulis `CARAKA_HOME` sendiri.** Ia harus
  menulisnya ke suatu tempat yang dibaca `start` berikutnya, dan satu-satunya
  tempat seperti itu adalah berkas di rumah yang belum dipilih. Yang dipakai
  pelapor — satu variabel lingkungan di depan perintah, atau satu baris
  `Environment=` di unit systemd — sudah bekerja dan sudah bisa dibaca orang.
- **Bukan manajer instance.** Tidak ada `caraka instances`, tidak ada daftar.

## Acceptance criteria

### AC-1 · Kalimat yang menunjukkan jalan keluar

- **AC-1.1** IF `caraka start` menemukan PID yang masih hidup, THEN ia shall
  menyebut direktori data yang dipakainya di dalam kalimat penolakan.
- **AC-1.2** IF `caraka start` menemukan PID yang masih hidup, THEN kalimatnya
  shall menyebut `CARAKA_HOME` sebagai cara menjalankan instance kedua.
- **AC-1.3** WHEN `caraka start` menolak karena PID hidup, ia shall tetap
  keluar dengan exit code 78.
- **AC-1.4** Kalimat AC-1.1 shall ada di kedua katalog bahasa dan shall tidak
  menuliskan sebuah path sebagai teks tetap.

### AC-2 · Dokumen yang menjawab pertanyaannya

- **AC-2.1** `docs/install-guide.md` dan `docs/install-guide.en.md` shall
  memuat langkah menjalankan instance kedua dengan `CARAKA_HOME` sendiri,
  termasuk `init`, `start`, dan `stop` yang menyebut rumah yang sama.
- **AC-2.2** Bagian AC-2.1 shall menyebut apa yang dibagi bersama bila rumahnya
  tidak dipisah: config, database, `secrets/`, dan PID.
- **AC-2.3** Unit systemd yang dicetak `caraka service --print systemd` shall
  disebut bersama baris `Environment=CARAKA_HOME=` yang membuatnya berlaku
  untuk satu instance.
- **AC-2.4** Halaman `/docs` di situs shall menyebut bahwa satu host dapat
  menjalankan lebih dari satu instance bila tiap instance punya `CARAKA_HOME`
  sendiri.
