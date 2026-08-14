# Spec — rollout-hilang: sesi tidak rusak permanen karena id yang sudah tidak ada

**Status:** selesai · **Tanggal:** 14 Agustus 2026

## Latar

Separuh kedua [issue #10]. Separuh pertamanya — pesan yang menyebut Claude pada
pemasangan yang menjalankan Codex — sudah selesai di 1.5.3 dan 1.5.4.

Yang tersisa: driver CLI menyimpan id sesi milik agennya di `state.external`, dan
memakainya untuk tiap giliran lanjutan lewat `resumeArgs`. Ketika rollout itu
sudah tidak ada di mesin — pembaruan, pembersihan, atau `HOME` yang berpindah —
Codex menjawab:

```
thread/resume failed: no rollout found for thread id …
```

`src/drivers/cli.ts` melemparkan galatnya dan **tidak menyentuh `state.external`**.
Jadi giliran berikutnya di sesi yang sama menyusun `resumeArgs` dengan id yang
sama, dan gagal dengan cara yang sama. Sesi itu rusak permanen sampai seseorang
menyadarinya dan mengirim `/new`; tidak ada satu pun kalimat yang menyarankan itu
adalah sebabnya.

Pelapornya menuliskan yang diharapkannya: bersihkan id basi itu dan coba sekali
lagi sebagai sesi baru, atau laporkan galat resume-nya dengan jujur. Keduanya
benar dan keduanya dikerjakan — yang kedua sudah, oleh 1.5.3.

## Ruang lingkup

`src/drivers/cli.ts`, `test/unit.test.ts`.

## Yang tidak dikerjakan

- **Bukan setiap kegagalan resume yang diulang.** Sebuah run yang gagal di
  tengah bisa saja sudah menulis berkas, dan mengulang prompt-nya akan
  menjalankan ulang efek itu. Yang diulang hanya kegagalan yang menyebut id yang
  baru saja kita serahkan — itulah agennya sendiri yang mengatakan id itu tidak
  ada, sebelum apa pun dikerjakan.
- **Tidak ada pola per-preset di YAML.** Menambah `resumeLostPattern` berarti
  sembilan berkas harus menebak kalimat galat sembilan agen. Id yang kita kirim
  ada di dalam kalimatnya, dan itu tanda yang tidak perlu ditulis siapa pun.
- **Tidak lebih dari sekali.** Sesi baru yang juga gagal adalah kegagalan yang
  sesungguhnya.

## Acceptance criteria

- **AC-1** IF sebuah giliran lanjutan gagal dan pesan galatnya menyebut id yang
  diserahkan ke agennya, THEN Caraka shall membuang id itu dan mengulang giliran
  tersebut satu kali sebagai sesi baru.
- **AC-2** WHEN pengulangan itu berhasil, jawabannya shall sampai ke pemanggilnya
  seperti giliran biasa, dan id sesi yang baru shall disimpan.
- **AC-3** IF pengulangan itu gagal juga, THEN galat yang dilaporkan shall galat
  dari percobaan kedua, dan tidak ada percobaan ketiga.
- **AC-4** IF sebuah giliran gagal tanpa menyebut id itu, THEN Caraka shall tidak
  mengulanginya.
- **AC-5** IF giliran itu bukan giliran lanjutan, THEN tidak ada pengulangan yang
  shall terjadi.
- **AC-6** WHEN pengulangan itu terjadi, Caraka shall mengatakannya: sesi yang
  baru tidak membawa giliran-giliran sebelumnya, dan jawaban yang diam-diam
  melupakannya lebih buruk daripada sebuah galat.
- **AC-7** WHERE id yang tersimpan lebih pendek dari delapan karakter, ia shall
  tidak dipakai sebagai tanda — sebuah id pendek bisa muncul dalam kalimat galat
  karena kebetulan.

[issue #10]: https://github.com/CarakaDev/caraka/issues/10
