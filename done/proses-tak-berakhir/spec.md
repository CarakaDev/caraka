# Spec — proses-tak-berakhir: satu anak yang menunggu manusia menggantung mesin

**Status:** selesai · **Tanggal:** 3 September 2026

## Latar

Dilaporkan dari luar sebagai [issue #15], dari sebuah VPS Linux yang menjalankan
`caraka` 1.5.9. Pelapornya menyuruh bot melakukan `git clone` dari sebuah URL
GitHub. Runnya mulai, lalu tidak pernah selesai. Pemakaian CPU dan RAM naik, dan
satu-satunya yang mengembalikannya adalah **restart server** — restart Caraka
tidak cukup. Sesudah restart, perintah yang sama tetap tidak bisa jalan.

Tiga cacat. Dua yang pertama direproduksi di sini sebelum satu baris diubah;
yang ketiga adalah separuh [FR-DRV-09](../../docs/frd.md) yang belum pernah ada.

### 1. Anak yang dijalankan Caraka masih bisa menunggu manusia

`git` tidak membaca kredensial dari stdin. Ia membukanya dari `/dev/tty`, yaitu
terminal pengendali prosesnya, dan pipa di `stdio` tidak menutup jalan itu.
Caraka menjalankan agent dengan `stdio: ["pipe", "pipe", "pipe"]` tetapi tanpa
`detached`, jadi agent — dan setiap turunannya — mewarisi terminal pengendali
milik proses Caraka. Pada VPS itu Caraka dijalankan dari terminal (shell, `tmux`,
atau `screen`), jadi terminal itu ada.

Reproduksi, dengan `git` tanpa credential helper, di dalam sebuah pty:

```
ERR:Cloning into 't1'...
Username for 'https://github.com':
STILL RUNNING AFTER 8s -> HUNG
```

Prompt itu ditulis ke terminal yang tidak dibaca siapa pun. Tidak ada yang
mengetiknya, jadi `git` menunggu selamanya. Ini bukan cacat `git`: ini kelas
kegagalan yang sama untuk setiap program yang meminta jawaban manusia dari
terminal — `ssh` pada host key yang belum dikenal, `sudo`, `npm login`.

Sesudah restart perintahnya tetap gagal karena penyebabnya deterministik:
repositori itu butuh kredensial yang tidak ada di mesin itu.

### 2. Membatalkan run tidak menjangkau turunan agent

Batas run 30 menit di `core/gateway.ts` memang berjalan. Yang dilakukannya adalah
`driver.cancel(agentId)`, dan `cancel` mengirim sinyal ke **proses agent saja**:

```ts
child.kill("SIGTERM");
```

`git` yang menggantung bukan anak Caraka. Ia cucu, atau lebih jauh:
`caraka → claude → bash → git`. Sinyal ke proses agent tidak menyentuhnya, dan
karena `spawn` tanpa `detached` menaruh anak di grup proses milik Caraka, tidak
ada grup lain yang bisa disinyalkan. Diukur di sini, satu proses cucu di belakang
satu proses anak:

```
plain    : sleep 4242 masih hidup sesudah SIGKILL ke proses anak
detached : sleep 4343 mati bersama grupnya
```

Jadi setiap percobaan agent meninggalkan satu pohon proses yang tidak pernah
berakhir. Agent mencoba lagi, dan tumpukannya bertambah sepanjang run. Itulah
yang menahan CPU dan RAM, dan itulah kenapa restart Caraka tidak menolong:
proses-proses itu bukan anak Caraka lagi. Hanya restart mesin yang menyapunya.

`docs/frd.md` FR-DRV-09 menuntut "pembersihan proses anak saat gateway berhenti".
Yang ada memenuhi kalimat itu untuk proses anak dan tidak untuk apa pun di
belakangnya.

### 3. Batas run yang didokumentasikan tidak pernah dibaca

`docs/troubleshooting.md` §Coding agent dan pasangan Inggrisnya menyuruh operator
menaikkan batas run:

```yaml
runner:
  timeoutMinutes: 60
```

Tidak ada `runner` di skema config. Objek zod bawaan membuang kunci yang tidak
dikenalnya, jadi berkas itu tetap terbaca dan angka itu tidak pernah dipakai.
Operator yang mengikuti dokumen itu mengubah nol hal, tanpa satu pun peringatan.
FR-DRV-09 menulis "default 30 menit", dan kata *default* itu janji yang belum
pernah ditepati.

## Ruang lingkup

`src/drivers/claude-acp.ts`, `src/drivers/cli.ts`, `src/config.ts`, `src/cli.ts`,
`test/unit.test.ts`, `test/fixtures/bin/fake-agent.mjs`,
`docs/troubleshooting.md`, `docs/troubleshooting.en.md`, `docs/design.md`.

## Yang tidak dikerjakan

- **Tidak ada batas CPU atau RAM untuk agent.** `cgroup`, `ulimit`, dan `nice`
  adalah tugas operator dan unit systemd-nya. Caraka mencetak unit itu; ia tidak
  menulisnya.
- **Caraka tidak menjalankan `git`.** Yang menjalankannya adalah agent. Yang
  diperbaiki di sini adalah cara Caraka menjalankan agent, bukan sebuah
  pembungkus `git`.
- **`GIT_SSH_COMMAND` tidak disentuh.** Nilai itu milik operator, dan lubang yang
  ditutupnya sudah tertutup oleh grup proses sendiri: tanpa terminal pengendali,
  `ssh` gagal, bukan menunggu.
- **Tidak ada batas per-perintah.** Yang punya jam adalah run, bukan setiap
  perintah di dalamnya. Alat agent punya batasnya sendiri, dan menambah lapisan
  kedua berarti dua angka yang bisa saling bertentangan.
- **Windows tidak diuji.** Lihat batas di bawah.

## Batas yang dibayar

- **Di Windows pembatalan tidak berubah.** `detached` di Windows membuka jendela
  konsol dan tidak ada pid negatif untuk disinyalkan, jadi jalur itu tetap
  seperti sekarang: sinyal ke proses agent saja. `GIT_TERMINAL_PROMPT=0` tetap
  berlaku di sana, jadi separuh yang menyebabkan gantungnya tertutup; cucu yang
  menggantung karena sebab lain tetap hidup. Tidak ada mesin Windows yang
  menjalankan gerbang verifikasi ini, jadi tidak ada klaim untuk sana.
- **Ctrl-C tidak lagi sampai ke agent lewat terminal.** Grup proses sendiri
  berarti SIGINT dari terminal berhenti di Caraka. Yang mematikan agent adalah
  `gateway.stop()`, yang sudah membatalkan setiap run aktif dan menghentikan
  setiap driver sebelum proses keluar. Yang hilang adalah jalur kedua yang
  kebetulan ada; yang tersisa adalah jalur yang memang ditulis untuk itu.
- **Turunan yang membuat grupnya sendiri tetap lolos.** Sebuah cucu yang memanggil
  `setsid` keluar dari grup yang disinyalkan. Tidak ada yang mengejarnya, dan
  membaca `/proc` untuk mencarinya adalah kode yang lebih besar daripada bug yang
  ditutupnya.
- **Eskalasi ke SIGKILL masih membaca proses agent.** Kalau agent-nya sudah keluar
  sementara sebuah turunan mengabaikan SIGTERM, tidak ada SIGKILL yang menyusul:
  pid yang menamai grup itu sudah tidak dimiliki siapa pun, dan menyinyalkan
  nomor yang bisa dipakai ulang lebih berbahaya daripada turunan yang tertinggal.
- **Sebuah preset masih boleh menyalakan kembali prompt terminal.** `env:` di
  preset ditulis sesudah environment bersama, jadi ia menang. Itu disengaja: yang
  ditulis Caraka adalah bawaan, bukan pagar.
- **Batas run yang dinaikkan menahan workspace lebih lama.** Satu run aktif per
  workspace (FR-SESS-04), jadi `timeoutMinutes: 600` berarti satu run yang macet
  bisa memegang workspace-nya sepuluh jam. Angkanya milik operator; yang
  dikerjakan spec ini adalah membuatnya terbaca, bukan memilihnya.

## Acceptance criteria

### AC-1 · Anak tidak punya terminal untuk ditunggu

- **AC-1.1** WHERE sistemnya bukan Windows, WHEN Caraka menjalankan sebuah agent,
  Caraka shall menaruh proses itu di grup proses miliknya sendiri.
- **AC-1.2** WHERE sistemnya Windows, WHEN Caraka menjalankan sebuah agent,
  Caraka shall menjalankannya tanpa grup proses sendiri.
- **AC-1.3** WHEN Caraka menjalankan sebuah agent, environment agent itu shall
  memuat `GIT_TERMINAL_PROMPT` bernilai `0`.
- **AC-1.4** WHERE sebuah preset menulis `GIT_TERMINAL_PROMPT` sendiri, nilai
  preset itu shall menang atas nilai bawaan.
- **AC-1.5** WHEN Caraka menjalankan sebuah agent, environment agent itu shall
  tetap tidak memuat satu pun nama berawalan `CARAKA_`.

### AC-2 · Membatalkan run mengakhiri seluruh pohonnya

- **AC-2.1** WHERE sistemnya bukan Windows, WHEN sebuah run dibatalkan, Caraka
  shall mengirim SIGTERM ke seluruh grup proses agent itu.
- **AC-2.2** IF proses agent masih hidup sesudah masa tenggang 5 detik, THEN
  Caraka shall mengirim SIGKILL ke seluruh grup proses itu.
- **AC-2.3** WHEN sebuah run dibatalkan, proses turunan yang dijalankan agent
  shall berhenti bersama run itu.
- **AC-2.4** IF grup proses itu sudah tidak ada saat sinyal dikirim, THEN Caraka
  shall tidak melemparkan galat.
- **AC-2.5** WHEN driver ACP dihentikan, Caraka shall mengakhiri seluruh grup
  proses adapter itu, bukan proses adapternya saja.

### AC-3 · Batas run yang bisa diatur

- **AC-3.1** WHERE `runner.timeoutMinutes` ada di `config.yaml`, WHEN sebuah run
  dimulai, Caraka shall memakai nilai itu sebagai batas run.
- **AC-3.2** WHERE `runner.timeoutMinutes` tidak ada, WHEN sebuah run dimulai,
  Caraka shall memakai 30 menit.
- **AC-3.3** IF `runner.timeoutMinutes` bukan bilangan bulat positif, THEN
  `loadConfig` shall menolak berkas itu dan menyebut kuncinya.

### AC-4 · Yang dilihat orang yang melaporkannya

- **AC-4.1** IF `git` di dalam agent butuh kredensial yang tidak tersedia, THEN
  `git` shall selesai dengan galat yang menyebut sebabnya dan tidak menunggu
  masukan.
- **AC-4.2** `docs/troubleshooting.md` dan pasangan Inggrisnya shall menyebut
  galat itu, apa artinya, dan apa yang dilakukan operator untuk memperbaikinya.

[issue #15]: https://github.com/CarakaDev/caraka/issues/15
