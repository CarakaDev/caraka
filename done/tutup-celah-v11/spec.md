# Spec — Wave 7: tutup celah v1.1

**Slug:** tutup-celah-v11 · **Tanggal:** 8 Agustus 2026 · **Status:** aktif

## Urutannya tidak seperti yang diminta standar

Dokumen ini ditulis **sesudah** kodenya ada. Pekerjaan wave ini datang sebagai
satu instruksi tunggal dari pemilik, dikerjakan langsung, dan `spec/` maupun
`plan/` baru dibuka ketika waktunya menutup. Itu bukan aturan rumah:
`standards/ears.md` §4 menyatakan satu arah, `CLAUDE.md` menyebut alasannya —
acceptance criteria yang ditulis belakangan selalu jadi kriteria yang kebetulan
dipenuhi kode.

Yang dilakukan dokumen ini karena itu bukan berpura-pura ditulis lebih dulu. Ia
**mencatat kriteria yang dipakai untuk menahan pekerjaan itu**: tiap AC di bawah
punya pembuktian di `plan/tutup-celah-v11.md`, dan tiap pembuktian menunjuk test
atau perintah yang ada di pohon yang sama. AC yang tidak bisa gagal tidak
ditulis, dan yang tidak terpenuhi disebut apa adanya di bagian penutup plan,
bukan dihilangkan supaya tabelnya rapi.

## Latar

`v1.0.0` terbit dengan tiga belas baris checklist keamanan dan dua di antaranya
`deferred`. Dua-duanya menunggu hal yang sama, dan hal itu tidak pernah ada
sejak spesifikasi ditulis: **gerbang mode kebijakan di jalur run**.
`docs/security.md` §5 sudah menggambar baris `grup (default)` dengan empat tanda
silang sejak v0.2, tetapi tidak ada satu pun channel yang menegakkannya. Sebuah
grup yang sudah masuk allowlist berjalan dengan aturan DM tempat ia dipasangkan,
jadi kalimat "grup tidak pernah mendapat izin tulis/eksekusi tanpa opt-in
eksplisit" di §4 kontrol 6 adalah niat, bukan kode. Dokumen yang menjanjikan
penolakan yang tidak terjadi lebih berbahaya daripada dokumen yang diam.

Fase 2 `docs/roadmap.md` punya masalah yang berbeda dan sama merugikannya. Tujuh
kotaknya semua kosong, padahal empat di antaranya sudah punya kode sejak v0.2
sampai v0.4. Roadmap yang menyebut pekerjaan belum dikerjakan padahal sudah,
membuat orang berikutnya membangunnya dua kali. Tiga kotak sisanya memang belum
pernah dibangun: deep link pairing, `doctor --fix`, dan uninstall bersih.

Baris `npm audit` juga `deferred`, dengan dua alasan: tidak ada langkah CI yang
mengulanginya, dan pohon yang diaudit tidak pernah memuat Baileys.

Dua batas dari wave sebelumnya tetap berlaku dan diulang di sini:

1. **Gerbang lapangan tidak dipalsukan.** Sembilan gerbang di `docs/roadmap.md`
   butuh manusia di luar repositori ini. Gerbang di jalur run bukan salah
   satunya, dan tidak menggantikan satu pun.
2. **`npm publish` dan deploy milik pemilik.** Registry memegang `1.0.0`; wave
   ini berhenti sebelum perintah berikutnya.

## Lingkup

1. Gerbang mode kebijakan di jalur run, dengan tiga mode yang sudah disebut
   `docs/security.md` §5 dan tanpa mode keempat.
2. Peta `modes` per blok channel di `config.yaml`, beserta penolakan menulis
   `trusted` di berkas.
3. Deep link pairing sebagai bearer secret dengan batas waktunya sendiri.
4. `caraka doctor --fix`.
5. `caraka uninstall`.
6. Smoke hidup untuk satu preset jalur CLI, dan sebab kegagalan yang dibaca dari
   keluaran agent sendiri.
7. Job CI yang menjalankan `npm audit` atas dua pohon.
8. Dokumen yang terpengaruh: checklist §13, `docs/security.md` §3/§4/§5/§12,
   pasangan Inggrisnya, Fase 0 dan Fase 2 `docs/roadmap.md`, tabel preset
   `docs/api.md`, dan baris `npm run smoke` di kedua README.
9. Situs: versi di setiap permukaan `site/src/data/`, kartu rilis `1.1.0`, dan
   setiap kalimat tentang cakupan agent atau default grup yang wave ini
   membuatnya salah.
10. `package.json`, `VERSION` di `src/cli.ts`, dan entri `[1.1.0]` di
    `CHANGELOG.md`.

## Yang tidak dikerjakan

- Menjalankan `npm publish`, membuat tag `1.1.0`, dan deploy `caraka.dev`.
- Menjawab satu pun gerbang lapangan.
- Pemetaan role Discord → mode kebijakan (FR-AUTH-06). Kunci peta `modes` adalah
  container, atau principal di percakapan pribadi; role tidak pernah jadi kunci.
- Membedakan daftar aksi berisiko tinggi per mode. Dua sel `assisted` di tabel §5
  tetap desain.
- Menaikkan pin `@whiskeysockets/baileys` melewati GHSA-qvv5-jq5g-4cgg. Wave ini
  menjalankan auditnya dan mencatat jawabannya.
- Melipat ulang `src/` untuk membayar baris yang ditambah wave ini.
- Menghubungi hulu ACP dan Titen, memasang Titen, atau mengukur latensi compile.
- Spike Rich Messages dan gelembung klien Telegram di DM.
- `caraka init discord`, `caraka init whatsapp`, dan preset baru.

## Acceptance criteria

### AC-1 · Gerbang mode kebijakan

- **AC-1.1** WHEN sebuah pesan masuk diproses, gateway shall menentukan modenya
  dari peta `modes` blok channel-nya dan dari jenis container pesan itu.
- **AC-1.2** IF peta `modes` tidak menyebut container pesan itu, THEN gateway
  shall memakai `assisted` di percakapan pribadi dan `read-only` di ruang.
- **AC-1.3** WHERE percakapannya pribadi, gateway shall menerima id principal
  sebagai kunci peta selain id container.
- **AC-1.4** WHILE sebuah pesan diproses, gateway shall tidak membaca modenya
  dari teks pesan mana pun.
- **AC-1.5** Gateway shall tidak membandingkan `channel.id` untuk menentukan
  mode.
- **AC-1.6** WHILE sebuah run berjalan `read-only`, WHEN agent meminta izin
  untuk menulis atau mengeksekusi, gateway shall menolak permintaan itu tanpa
  mengirim kartu approval.
- **AC-1.7** WHEN penolakan AC-1.6 terjadi, gateway shall mengirim satu pesan
  yang menyebut baris config yang akan mengizinkannya.
- **AC-1.8** WHEN penolakan AC-1.6 terjadi, gateway shall menulis baris audit
  `policy.deny`.
- **AC-1.9** IF sebuah permintaan izin ber-`kind` bacaan tetapi payload-nya
  memuat `command`, `content`, `edits`, `patch`, atau pasangan
  `old_string`/`new_string`, THEN gerbang shall memperlakukannya sebagai tulis.
- **AC-1.10** IF `kind` sebuah permintaan izin tidak dikenali, THEN gerbang shall
  memperlakukannya sebagai tulis.
- **AC-1.11** WHILE sebuah percakapan berjalan `read-only`, WHEN `/yolo`
  dikirim dari percakapan itu, gateway shall menolak membuka jendela dan
  menjelaskan bahwa jendela berlaku untuk seluruh workspace.
- **AC-1.12** WHILE sebuah run akan berjalan `read-only`, IF route workspace itu
  tidak menyerahkan keputusan izin ke core, THEN gateway shall tidak memulai run
  itu dan menyatakan alasannya.
- **AC-1.13** WHILE sebuah percakapan berjalan `read-only`, WHERE ada jendela
  trust aktif atas workspace-nya, gateway shall tidak menyerahkan mode agent.

### AC-2 · Peta `modes` di config

- **AC-2.1** Skema config shall menerima peta `modes` opsional di tiap blok
  channel, dengan nilai dari tiga nama di `docs/security.md` §5.
- **AC-2.2** IF sebuah entri `modes` bernilai `trusted`, THEN pemuatan config
  shall gagal dengan pesan yang menyebut `caraka trust`.
- **AC-2.3** Config yang ditulis `caraka init` shall memuat peta `modes` kosong.
- **AC-2.4** WHEN sebuah config dari rilis sebelum v1.1 dimuat, pemuatan shall
  berhasil dan peta `modes`-nya shall terbaca kosong.

### AC-3 · Deep link pairing

- **AC-3.1** WHEN wizard membuka pairing, ia shall mencetak tautan
  `https://t.me/<bot>?start=pair_<payload>` dengan payload dari `randomBytes`.
- **AC-3.2** WHEN wizard mencetak tautan itu, ia shall mencetak satu baris yang
  menyatakan bahwa siapa pun yang membukanya lebih dulu akan terpasang.
- **AC-3.3** WHEN sebuah pesan membawa payload yang benar, kode shall menerimanya
  satu kali dan menolak pemakaian kedua.
- **AC-3.4** WHILE waktu berjalan melewati batas 5 menit, kode shall menolak
  payload yang benar sekalipun.
- **AC-3.5** WHEN sebuah teks dibandingkan dengan payload, perbandingannya shall
  konstan terhadap waktu.
- **AC-3.6** IF sebuah pesan membawa payload yang salah, THEN kode shall
  menolaknya dan tetap bisa dipakai oleh pesan berikutnya yang benar.

### AC-4 · `caraka doctor --fix`

- **AC-4.1** WHEN `caraka doctor --fix` dijalankan, ia shall menjalankan pass
  perbaikan sebelum baris pemeriksaan dicetak.
- **AC-4.2** WHERE sebuah direktori milik Caraka tidak bermode 0700, `--fix`
  shall mengembalikannya ke 0700 dan mencetak mode sebelum dan sesudahnya.
- **AC-4.3** WHERE sebuah berkas rahasia tidak bermode 0600, `--fix` shall
  mengembalikannya ke 0600.
- **AC-4.4** IF sebuah direktori yang seharusnya ada tidak ada, THEN `--fix`
  shall membuatnya dengan mode 0700.
- **AC-4.5** IF berkas PID menyebut proses yang tidak berjalan, THEN `--fix`
  shall menghapusnya.
- **AC-4.6** IF berkas PID menyebut proses yang masih hidup, THEN `--fix` shall
  membiarkannya.
- **AC-4.7** IF config tidak terbaca, workspace hilang, atau sebuah allowlist
  kosong, THEN `--fix` shall mencetaknya sebagai dibiarkan beserta alasannya dan
  tidak mengubah apa pun.
- **AC-4.8** WHERE platformnya Windows, `--fix` shall tidak mengubah mode berkas
  apa pun.
- **AC-4.9** `--fix` shall tidak menulis kredensial dan tidak membuka socket.

### AC-5 · `caraka uninstall`

- **AC-5.1** WHEN `caraka uninstall` dijalankan, ia shall mencetak setiap path
  yang akan dihapus sebelum meminta konfirmasi.
- **AC-5.2** Daftar itu shall memuat berkas config, database beserta `-wal` dan
  `-shm`, cache discovery, berkas PID, dan direktori `secrets`.
- **AC-5.3** WHEN konfirmasi diminta, perintah shall hanya menerima kata
  `uninstall` yang diketik utuh.
- **AC-5.4** IF konfirmasi tidak diberikan, THEN perintah shall keluar dengan
  kode selain nol dan tidak menghapus apa pun.
- **AC-5.5** IF gateway sedang berjalan, THEN perintah shall keluar dengan kode
  78 sebelum satu berkas pun dihapus.
- **AC-5.6** WHEN penghapusan selesai, perintah shall menghapus `~/.caraka`
  hanya bila direktori itu kosong.
- **AC-5.7** WHEN daftar dicetak, perintah shall menyebut bot Telegram dan isi
  workspace sebagai hal yang tidak dihapusnya.
- **AC-5.8** `uninstall` dan `doctor --fix` shall tidak terdaftar sebagai
  perintah chat di channel mana pun.

### AC-6 · Smoke jalur CLI

- **AC-6.1** WHEN `npm run smoke` dijalankan, ia shall menjalankan smoke jalur
  CLI sesudah smoke Claude.
- **AC-6.2** IF biner preset tidak terpasang, THEN smoke itu shall keluar nol
  dan menyatakan bahwa ia dilewati.
- **AC-6.3** IF biner terpasang tetapi tidak menyelesaikan giliran, THEN smoke
  shall keluar tidak nol dan mencetak sebab yang ditulis agent itu sendiri.
- **AC-6.4** WHEN sebuah run CLI gagal, driver shall mengambil pesan galat dari
  stdout terstruktur agent bila ada, dan jatuh ke stderr bila tidak.
- **AC-6.5** Smoke itu shall memakai preset, loader, driver, dan biner yang
  sebenarnya, tanpa stub.

### AC-7 · Audit dependensi di CI

- **AC-7.1** WHEN sebuah push atau pull request berjalan, CI shall menjalankan
  `npm audit --omit=dev --audit-level=high` atas pohon produksi.
- **AC-7.2** WHEN job itu berjalan, ia shall menjalankan audit yang sama atas
  pohon yang memasang peer opsional Baileys.
- **AC-7.3** WHEN langkah Baileys memasang peer itu, versinya shall dibaca dari
  `package.json` dan tidak ditulis ulang di workflow.
- **AC-7.4** IF langkah Baileys gagal karena advisory yang tidak bisa ditutup
  hari ini, THEN langkah itu shall melapor tanpa menjatuhkan workflow, dan
  alasannya shall tertulis di workflow beserta syarat pencabutannya.

### AC-8 · Dokumen

- **AC-8.1** WHEN sebuah baris checklist §13 berubah status, baris itu shall
  menyebut tanggalnya dan bukti barunya.
- **AC-8.2** WHERE sebuah baris §13 berstatus `met`, baris itu shall menyebut
  nama test yang gagal bila klaimnya berhenti benar.
- **AC-8.3** `docs/security.md` §5 shall menyatakan bahwa gerbang mode ada di
  jalur run, dan shall tetap menyatakan bagian tabel yang masih desain.
- **AC-8.4** `docs/security.md` dan `docs/security.en.md` shall menyatakan hal
  yang sama pada setiap bagian yang wave ini ubah.
- **AC-8.5** WHERE sebuah kotak `docs/roadmap.md` sudah punya kode di pohon ini,
  kotak itu shall tercentang dan menyebut kode yang menjawabnya.
- **AC-8.6** WHERE sebuah kotak tetap terbuka, kotak itu shall menyebut apa yang
  menahannya dan tanggal pembacaannya.
- **AC-8.7** IF sebuah butir roadmap ditarik, THEN butir itu shall tetap ada,
  ditandai ditarik, dengan tanggal dan alasannya.
- **AC-8.8** `docs/api.md` shall memuat `asksPermission` di tabel blok `acp`
  beserta defaultnya.

### AC-9 · Situs

- **AC-9.1** Setiap permukaan di `site/src/data/` yang menyebut versi berjalan
  shall membaca 1.1.
- **AC-9.2** `site/src/data/status.ts` shall memuat kartu rilis `1.1.0`.
- **AC-9.3** Bagian *Limited* kartu itu shall menyatakan bahwa Titen tidak
  pernah dihubungi, bahwa spike Rich Messages masih terbuka, bahwa setiap
  gerbang lapangan masih terbuka, dan berapa agent yang terbukti terhadap biner
  hidup.
- **AC-9.4** Chip npm di `site/src/data/readme.ts` shall membaca versi yang ada
  di registry, dan komentarnya shall menyebut kenapa ia tertinggal.
- **AC-9.5** Di luar kartu riwayat rilis, situs shall tidak memuat kalimat yang
  menyatakan bahwa tidak ada gerbang mode di jalur run. Kartu rilis lama tetap
  apa adanya: ia mencatat apa yang benar pada rilisnya, seperti kartu 0.6.0
  mencatat 7.996 baris.
- **AC-9.6** Situs shall tidak menyatakan sebuah agent terbukti hidup bila ia
  belum pernah menyelesaikan satu giliran.
- **AC-9.7** WHERE sebuah nilai di `site/src/data/` meninggalkan comp-nya,
  komentar di atasnya shall menyebut baris comp yang ditinggalkan dan kode yang
  membuatnya salah.
- **AC-9.8** WHEN sebuah baseline tinggi di `site/e2e/site.spec.ts` berubah,
  angka barunya shall berasal dari pengukuran atas build bersih, bukan dari
  perkiraan.

### AC-10 · Rilis

- **AC-10.1** `package.json` shall membaca `1.1.0`, dan `VERSION` di
  `src/cli.ts` shall membaca angka yang sama.
- **AC-10.2** `CHANGELOG.md` shall memuat entri `[1.1.0]` bertanggal.
- **AC-10.3** Bagian *Limited* entri itu shall menyatakan keempat hal di AC-9.3.
- **AC-10.4** IF sebuah batas yang ditemukan wave ini melanggar aturan di
  `AGENTS.md`, THEN entri itu shall menyatakannya beserta angkanya.
- **AC-10.5** IF persetujuan pemilik belum ada, THEN tidak ada `npm publish`,
  tidak ada tag `1.1.0`, dan tidak ada deploy yang dijalankan.

### AC-11 · Anggaran kompleksitas

- **AC-11.1** WHEN wave ditutup, `find src -name '*.ts' | xargs wc -l` shall
  dibaca dan angkanya ditulis di plan.
- **AC-11.2** IF angka itu melewati plafon ~8.000 di `AGENTS.md`, THEN plan dan
  `CHANGELOG.md` shall menyatakannya sebagai terlewati, bukan sebagai mendekati.

### AC-12 · Gerbang verifikasi

- **AC-12.1** WHEN `npm run lint`, `npm run typecheck`, `npm test`, dan
  `npm run e2e` dijalankan di akar, keempatnya shall keluar dengan kode 0 dan
  keluarannya ditempel di plan.
- **AC-12.2** WHEN `npm run check` dan `npm run e2e` dijalankan di `site/`,
  keduanya shall keluar dengan kode 0 dan keluarannya ditempel di plan.
- **AC-12.3** WHEN gerbang dilaporkan, yang dilaporkan shall kode keluar tiap
  perintah, bukan potongan akhir keluarannya.
