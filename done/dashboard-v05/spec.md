# Spec — Fase 5: dasbor read-only lokal (v0.5)

**Slug:** dashboard-v05 · **Tanggal:** 8 Agustus 2026 · **Status:** aktif
**Induk:** `spec/v10.md` (kampanye v1.0, lingkup butir 5) · **Roadmap:** `docs/roadmap.md:113` dan `:115`
**Dasar nomor baris:** `v0.4.0`, commit `9494ec5`. Berkas `src/` dibaca dari
commit itu, bukan dari worktree, karena pekerjaan Discord sedang mengubah
`src/core/gateway.ts` di gelombang yang sama.

Discord adalah pekerjaan terpisah dengan spec dan plan sendiri. Berkas ini tidak
menyebut Discord sebagai lingkup, dan satu-satunya titik singgung keduanya
tercatat di *Yang tidak dikerjakan*.

## Latar

Roadmap Fase 5 memuat dua baris yang jatuh ke pekerjaan ini: dasbor read-only
lokal berbasis htmx (`docs/roadmap.md:113`) dan instrumentasi lokal opt-in
untuk waktu setup serta aktivasi, tanpa telemetri keluar (`:115`). Keduanya
adalah kebutuhan yang sama dilihat dari dua sisi: seseorang perlu membaca apa
yang sudah terjadi di mesinnya sendiri.

Pilihan tekniknya sudah dikunci sebelum spec ini: HTML statis ditambah `htmx`,
disajikan dari server HTTP bawaan Node, dengan alasan yang ditulis apa adanya
di `docs/techstack.md:98-104` — dasbor hanya read-only, dan React ditambah
bundler untuk empat tabel melanggar janji "satu paket, kecil". Kebutuhannya
sudah bernomor: FR-AUD-06 (`docs/frd.md:179`, P1) meminta dasbor web read-only
di `127.0.0.1`, dan FR-OPS-01 (`:187`) mewajibkan bind default `127.0.0.1`
dengan flag eksplisit plus peringatan untuk alamat lain.

Yang belum diputuskan siapa pun ada dua, dan spec ini memutuskannya di
*Keputusan kontrak*: bagaimana dasbor dijalankan (`docs/ui-ux.md:180-195`
tidak memuat satu pun barisnya) dan apakah ada auth.

Temuan yang membentuk seluruh lingkup: **datanya sudah ada**. Database memuat
`sessions`, `approvals`, `audit`, `policy_grant`, `meta`, dan `memory_local`
(`src/store/db.ts:58-122`). Audit bersifat append-only dan dijaga trigger
(`:93-98`), sudah mencatat `msg.in` (`src/core/gateway.ts:243-248`),
`run.start` dan `run.finish` (`:666-676`, `:712-718`), `approval.decide`
(`:1088`, `:1123`, `:1140`), serta `trust.open` (`:1230`). Riwayat run dan
kedua angka beta diturunkan dari baris-baris itu. Tabel `message`
(`docs/erd.md:153`), `run` (`:165`), dan `artifact` (`:195`) yang digambar ERD
tetap tidak dibangun, karena tampilan read-only bukan alasan menambah tabel.

Satu hal lagi yang sudah aman sejak awal: apa pun yang dirender dasbor sudah
melewati scrubber saat ditulis (`src/store/db.ts:397-398`), dan transcript
pesan tidak pernah dipersist — baris `msg.in` hanya menyimpan `bytes` dan
`sha256` (`src/core/gateway.ts:243-248`). Dasbor tidak bisa membocorkan yang
tidak pernah disimpan.

## Keputusan kontrak

Tujuh keputusan yang mengikat lingkup ini. Amandemen dokumennya dikerjakan
sekaligus pada langkah rilis di plan.

**K1 — Entry point adalah subperintah `caraka dashboard`, bukan flag pada
`start`.** Dasbor berjalan sebagai proses sendiri yang membuka database yang
sama. Tiga alasan, dan yang ketiga yang menentukan. Pertama, `caraka start`
tidak berubah sama sekali: tidak ada argumen baru, tidak ada socket baru di
proses yang memegang long-poll, dan tidak ada pertanyaan baru soal apa yang
harus terjadi kalau port dipakai orang lain saat gateway hendak jalan. Kedua,
`src/core/gateway.ts` sudah 1.461 baris dan pekerjaan ini menambahkan satu
baris ke sana, bukan sebuah server. Ketiga, dasbor tetap berguna justru saat
gateway mati — audit setelah crash adalah alasan utama seseorang membukanya,
dan flag pada `start` membuat itu mustahil. SQLite dalam mode WAL melayani
pembaca lintas proses; handle read-only diuji terhadap database yang sedang
dipegang penulis dan terhadap database yang penulisnya sudah tutup, keduanya
berhasil (pengukuran 8 Agustus 2026, dicatat di plan).

**K2 — Auth adalah loopback, dan tidak ada yang lain.** Tanpa token di URL,
tanpa cookie, tanpa session store. Token di URL memindahkan rahasia ke riwayat
shell dan scrollback terminal, harus disimpan atau dicetak ulang tiap kali, dan
tidak menutup ancaman yang sebenarnya: pengguna lokal lain yang bisa membaca
`~/.caraka/caraka.db` sudah punya seluruh isi dasbor tanpa perlu HTTP. Yang
memang dilebarkan dasbor: di mesin bersama, pengguna lokal yang **tidak** bisa
membaca berkas database tetap bisa mencapai `127.0.0.1` dan membaca dasbor
selama ia berjalan. Itu batas yang nyata, dan karena tidak ditutup, ia ditulis
sebagai butir baru di `docs/security.md` §12 "Yang kami TIDAK klaim", bukan
dibiarkan tersirat. Satu hal yang **tidak** dibiarkan sebagai batas: peramban.
Halaman web mana pun bisa mencapai port ini lewat nama yang diarahkan ke
127.0.0.1, jadi header `Host` diperiksa (AC-2.6) — kalau tidak, "auth adalah
loopback" berarti setiap tab yang dibuka operator ikut memegang auth itu.

**K3 — Read-only ditegakkan SQLite, bukan disiplin kode.** Handle database
dibuka dengan `new DatabaseSync(path, { readOnly: true })`; percobaan tulis
apa pun ditolak mesin database dengan `attempt to write a readonly database`
(diverifikasi 8 Agustus 2026 pada Node v24.18.0). Sebuah rute yang keliru
menulis akan gagal, bukan diam-diam berhasil. Method selain `GET` dan `HEAD`
dijawab 405 sebelum database disentuh.

**K4 — Satu tulisan baru, dan tempatnya di gateway.** Waktu setup butuh saat
mulai yang bertahan. Kunci `meta` `startup.notice` (`src/core/gateway.ts:205-207`)
tidak bisa dipakai: ia ditimpa pada tiap start setelah jendela debouncenya
lewat, jadi setelah restart pertama nilainya bukan lagi saat pemasangan. Karena
itu `run()` menulis satu baris audit `gateway.start`. Audit append-only, jadi
baris paling awal adalah saat mulai yang pertama dan tetap begitu selamanya.
Ini bukan kolektor dan bukan skema baru: satu baris di log yang sudah merekam
segalanya, dan sebuah log audit yang tidak mencatat bahwa prosesnya pernah
mulai memang lubang tersendiri (T11 `docs/security.md:46`). Dasbor sendiri
tidak menulis apa pun; baris `dashboard.start` di K5 ditulis subperintahnya
sebelum handle read-only dibuka.

**K5 — `--bind` mengikuti FR-OPS-01 apa adanya.** Bind default `127.0.0.1`
adalah kontrol wajib nomor 7 di `docs/security.md:65`, bukan preferensi. Tanpa
`--bind`, host listener adalah `127.0.0.1` harfiah, bukan `localhost` (yang
bergantung pada resolusi nama dan bisa jatuh ke `::1` atau ke entri `hosts`).
Dengan `--bind` berisi
alamat loopback, tidak ada peringatan. Dengan alamat lain, subperintah mencetak
peringatan besar dan menulis satu baris audit sebelum listener menerima koneksi
pertama (`docs/security.md:230`). Daftar alamat yang dihitung loopback sama
persis dengan yang sudah dipakai `doctor` untuk endpoint memori
(`src/cli.ts:384-391`), supaya satu produk tidak punya dua definisi loopback.

**K6 — Port default 7718.** Tidak ada port dasbor di `docs/`; angka ini
ditetapkan spec ini. Dipilih bersebelahan dengan Titen di `127.0.0.1:7717`
(`docs/security.md:233`, `src/config.ts:9`) supaya layanan lokal Caraka duduk
berdampingan, dan jauh di bawah rentang port ephemeral Linux yang mulai di
32768 (`/proc/sys/net/ipv4/ip_local_port_range`, terbaca `32768 60999` pada
mesin pengembangan, 8 Agustus 2026). `--port` menimpanya.

**K7 — htmx ikut di dalam paket.** Berkasnya di-vendor ke `assets/dashboard/`
dan disajikan dari `/assets/htmx.min.js`, bukan diambil dari CDN. Halaman
karenanya bekerja tanpa jaringan dan tidak pernah menghubungi origin pihak
ketiga, yang penting karena mesin yang menjalankan Caraka adalah mesin yang
memegang kode orang. Versi dan sha256 berkasnya dicatat di plan saat
di-vendor. Konsekuensi paket: `files` di `package.json:30-34` hari ini hanya
memuat `bin`, `dist`, dan `presets`, jadi direktori aset harus masuk ke sana
atau dasbor terbit tanpa htmx-nya.

## Lingkup

1. `src/core/status.ts`: peta glif dan warna status yang diekspor, dipakai
   gateway menggantikan `Gateway.GLYPH` privat (`src/core/gateway.ts:757-763`)
   dan dipakai dasbor. Nol perubahan perilaku pada gateway.
2. Satu baris audit `gateway.start` di `Gateway.run()` (K4).
3. `src/dashboard/`: server HTTP `node:http`, resolusi bind, handle database
   read-only, dan tujuh handler GET. Arah dependensi mengikuti aturan yang
   sudah ada — dasbor mengimpor `src/core` dan `src/store`, dan tidak ada
   satu pun berkas di `src/core` yang mengimpor dasbor.
4. Panel: sesi, riwayat run (diturunkan dari audit), approval, audit, policy
   grant, memori, dan beta.
5. Subperintah `caraka dashboard [--port n] [--bind addr]`, teksnya di kedua
   katalog `src/i18n.ts`.
6. Aset: shell HTML, satu berkas CSS, dan htmx yang di-vendor; `files` di
   `package.json` diperbarui.
7. Panel `/beta`: waktu setup dan aktivasi, dihitung dari audit, dengan bagian
   "bagikan angka ini" yang tertutup di keadaan awal.
8. Amandemen dokumen pada langkah rilis: `docs/ui-ux.md:5` dan §7,
   `docs/security.md:228-234` dan §12, `docs/adr/0006`, `docs/frd.md:179` dan
   `:188`, `docs/roadmap.md:113` dan `:115`, `docs/techstack.md:98-104`, peta
   repositori `AGENTS.md:24-37`, dan klaim permukaan produk di `site/`.

## Yang tidak dikerjakan

- **Jalur tulis apa pun di dasbor.** Tanpa tombol approve, tanpa `/stop`,
  tanpa menghapus memori, tanpa mengubah konfigurasi. Approval tetap hanya
  lewat callback bertanda tangan sekali pakai ber-TTL yang terikat
  `(principal, session, request)` (`AGENTS.md:54`, `docs/security.md:60`,
  AC-5.3 `spec/v10.md`), dan dasbor tidak menyentuh jalur itu sama sekali.
- **Server auth, session store, cookie, halaman login, token di URL.** Alasan
  di K2; batasnya masuk `docs/security.md` §12.
- **Akses jauh.** Tailscale, WireGuard, atau SSH tetap satu-satunya jalan
  (T7 `docs/security.md:42`). Dasbor tidak menyediakan tunnel, tidak
  menyarankan reverse proxy, dan tidak punya mode "publik".
- **Telemetri keluar, dalam bentuk apa pun** (`docs/security.md:234`,
  `spec/v10.md`). Modul dasbor tidak memuat satu pun panggilan jaringan
  keluar.
- **Tabel baru.** `run`, `message`, dan `artifact` di `docs/erd.md` tetap
  belum dibangun, dan tampilan read-only bukan alasan membangunnya.
- **Mini App.** Kandidat pasca-1.0 dengan syarat masuk "dasbor htmx terbukti
  kurang" (`docs/roadmap.md:156`, `site/src/data/status.ts:200`). Pekerjaan
  ini adalah hal yang harus terbukti kurang lebih dulu.
- **Discord.** Spec terpisah. Dasbor tidak boleh membaca `channel.id` untuk
  memutuskan apa pun; ia membaca kolom yang ada dan menampilkannya.
- **`caraka audit --since 24h`** (FR-AUD-04, `docs/frd.md:177`) tetap belum
  dibangun. Dasbor tidak menggantikannya, dan status FR-AUD-04 tidak berubah
  karena pekerjaan ini.
- **Rotasi dan retensi audit** (FR-AUD-05, `docs/frd.md:178`).
- **Grafik, agregasi lintas mesin, ekspor CSV, pencarian teks penuh.**
- **Bundler, framework, atau langkah build untuk halaman.** Halaman dikirim
  seperti tersimpan di paket.

## Acceptance criteria

Angka yang tidak punya sumber di `docs/` diberi keterangan asalnya di butirnya.

### AC-1 · Perintah, alamat, dan kegagalan start

- **AC-1.1** WHEN `caraka dashboard` dijalankan tanpa argumen, ia shall
  mendengarkan di `127.0.0.1` port 7718 dan mencetak URL-nya (port dari K6).
- **AC-1.2** WHEN `--port <n>` diberikan, subperintah shall mendengarkan di
  port itu.
- **AC-1.3** WHEN subperintah dijalankan tanpa `--bind`, `server.address().address`
  shall bernilai `127.0.0.1` (FR-OPS-01 `docs/frd.md:187`).
- **AC-1.4** WHERE `--bind` berisi alamat dari daftar loopback
  (`127.0.0.1`, `localhost`, `[::1]`, `::1`; daftar yang sama dipakai
  `src/cli.ts:384-391`), subperintah shall start tanpa peringatan.
- **AC-1.5** WHERE `--bind` berisi alamat di luar daftar itu, subperintah
  shall mencetak peringatan besar sebelum listener menerima koneksi pertama
  (`docs/security.md:230`).
- **AC-1.6** WHERE `--bind` berisi alamat di luar daftar itu, subperintah
  shall menulis satu baris audit `dashboard.start` ber-result `exposed` yang
  memuat alamatnya.
- **AC-1.7** WHERE host listener adalah loopback, subperintah shall menulis
  satu baris audit `dashboard.start` ber-result `loopback`.
- **AC-1.8** IF port yang diminta sudah dipakai, THEN subperintah shall
  berhenti dengan pesan yang menyebut portnya dan cara memilih port lain,
  tanpa stack trace (`AGENTS.md:65`).
- **AC-1.9** IF berkas database belum ada, THEN subperintah shall berhenti
  dengan pesan yang menyuruh menjalankan `caraka init` dan tidak membuat
  berkas database baru.
- **AC-1.10** WHILE gateway tidak berjalan, dasbor shall tetap menyajikan
  seluruh panel dari database (konsekuensi K1).

### AC-2 · Read-only

- **AC-2.1** Dasbor shall membuka database dengan `readOnly: true`, sehingga
  percobaan tulis ditolak SQLite dan bukan oleh konvensi (K3).
- **AC-2.2** IF sebuah request memakai method selain `GET` atau `HEAD`, THEN
  server shall menjawab 405 tanpa membuka query ke database.
- **AC-2.3** WHEN setiap rute diminta berurutan satu kali, jumlah baris
  `sessions`, `approvals`, `audit`, `policy_grant`, dan `memory_local` beserta
  seluruh isi `meta` shall identik sebelum dan sesudah.
- **AC-2.4** Setiap nilai yang berasal dari URL dan masuk ke query shall
  dikirim sebagai parameter terikat, tidak pernah dirangkai ke dalam string
  SQL.
- **AC-2.5** IF `?since` bernilai di luar `1h`, `24h`, `7d`, `all`, THEN
  server shall memakai `24h` dan tidak meneruskan nilai itu ke query.
- **AC-2.6** WHERE host listener adalah loopback, IF header `Host` sebuah
  request bukan literal alamat maupun `localhost`, THEN server shall menjawab
  403 sebelum rute dan sebelum query apa pun. Mengikat ke loopback menahan mesin
  lain, bukan peramban: sebuah halaman yang dikunjungi operator bisa mengarahkan
  namanya sendiri ke 127.0.0.1, lalu peramban memperlakukan dasbor sebagai origin
  halaman itu dan membiarkannya membaca setiap panel. Serangan itu butuh sebuah
  nama, jadi nama yang ditolak; literal alamat tidak bisa diarahkan ulang.
- **AC-2.7** WHERE `--bind` berisi alamat di luar daftar loopback, server shall
  menjawab request dengan nama apa pun di header `Host`. Jalur remote pada
  `docs/security.md` T7 (`:42`) lewat Tailscale atau WireGuard sampai sebagai
  nama, dan operator yang memilih flag itu sudah membaca peringatan AC-1.5.

### AC-3 · Isi panel

- **AC-3.1** WHEN `/` diminta, dasbor shall menampilkan setiap baris
  `sessions` dengan state, judul, workspace, agent, principal, dan waktu
  pembaruan (`src/store/db.ts:58-70`).
- **AC-3.2** WHEN `/runs` diminta, dasbor shall menampilkan riwayat run yang
  dipasangkan dari baris audit `run.start` dan `run.finish` pada `session_id`
  yang sama (`src/core/gateway.ts:666-676`, `:712-718`), tanpa tabel `run`.
- **AC-3.3** IF sebuah `run.start` tidak punya baris apa pun sesudahnya pada
  sesi yang sama, THEN barisnya shall ditandai `berjalan` dengan durasi
  kosong, karena database tidak bisa membedakan run yang masih jalan dari run
  yang prosesnya mati.
- **AC-3.4** WHEN `/approvals` diminta, dasbor shall menampilkan tiap baris
  `approvals` dengan satu kolom status yang membedakan menunggu, diizinkan,
  ditolak, dan kedaluwarsa, diturunkan dari `decision`, `used_at`, dan
  `expires_at` (`src/store/db.ts:81-82`, `:348-370`).
- **AC-3.5** WHEN `/audit` diminta, dasbor shall menampilkan baris `audit`
  terbaru lebih dulu, dibatasi jendela `?since`.
- **AC-3.6** WHEN `/audit` merender sebuah baris `msg.in`, dasbor shall
  menampilkan `bytes` dan `sha256` apa adanya dari kolom `details`, karena isi
  pesan tidak pernah disimpan (`src/core/gateway.ts:243-248`).
- **AC-3.7** WHEN `/policy` diminta, dasbor shall menandai sebuah
  `policy_grant` sebagai terbuka hanya bila `closed_at` kosong dan
  `expires_at` kosong atau masih di depan jam render, mengikuti `activeGrant`
  (`src/store/db.ts:220-231`).
- **AC-3.8** WHERE provider memori adalah `local`, `/memory` shall menampilkan
  isi `memory_local` per scope (`src/store/db.ts:116-122`).
- **AC-3.9** WHERE provider memori bukan `local`, `/memory` shall menyebut
  provider yang dipakai dan menyatakan bahwa isinya tidak berada di database
  ini.
- **AC-3.10** IF sebuah `run.start` disusul `run.start` lain pada sesi yang
  sama, THEN baris yang lebih dulu shall ditutup pada waktu start kedua dengan
  hasil `interrupted`, bukan dibiarkan terbaca `berjalan`. Start kedua
  membuktikan yang pertama sudah berakhir tanpa mengatakan bagaimana; jalur yang
  menghasilkannya adalah driver yang melempar di antara `run.start` dan
  `run.finish`.

### AC-4 · Status membawa glif dan warna

- **AC-4.1** Setiap baris berstatus shall membawa glif teksnya sebagai
  karakter di markup: `running` ▸, `awaiting_approval` ⏸, `done` ✓, `failed`
  ✗, `cancelled` ⊘ (`docs/brand.md:202-209`; sama dengan
  `src/core/gateway.ts:757-763`).
- **AC-4.2** State `idle` shall memakai glif `◌` dan nada n-500 `#7A848F`.
  `idle` tidak punya baris di tabel `docs/brand.md`; glifnya diambil dari
  string yang sudah dipakai produk (`src/i18n.ts:5-6`, `:9`) dan nadanya dari
  `docs/brand.md:188`.
- **AC-4.3** Warna status shall memakai nilai `docs/brand.md:204-208` apa
  adanya dan tidak memakai `#FB6F5F` (`:209`, alasannya `:211`).
- **AC-4.4** IF CSS gagal dimuat, THEN tabel shall tetap membedakan status,
  karena glif dan nama state ada di markup dan bukan di `::before`
  (`AGENTS.md:59`).
- **AC-4.5** Warna teks terhadap latar shall memakai pasangan yang rasio
  kontrasnya sudah diukur di `docs/brand.md:185-190`, tanpa pasangan baru yang
  belum diukur.

### AC-5 · htmx lokal dan degradasi tanpanya

- **AC-5.1** Server shall menyajikan htmx dari `/assets/htmx.min.js` yang
  isinya berasal dari berkas di dalam paket (K7).
- **AC-5.2** Halaman shall tidak memuat satu pun sub-resource dari origin
  selain listener itu sendiri, termasuk font.
- **AC-5.3** Setiap respons HTML shall membawa header
  `Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'`
  dan `X-Content-Type-Options: nosniff`.

  *Amandemen 8 Agustus 2026 saat implementasi.* Draf pertama butir ini tidak
  memuat `connect-src 'self'`. Tanpa direktif itu, `default-src 'none'` menutup
  XHR, dan XHR adalah cara htmx menukar panel — AC-5.4 dan AC-5.5 tidak akan
  pernah bisa lulus di peramban sungguhan. `'self'` adalah seluruh kelonggaran
  yang ditambahkan: origin yang sama, yaitu listener yang dijalankan operator
  sendiri, dan tidak ada satu pun host pihak ketiga yang menjadi terjangkau.
- **AC-5.4** WHERE htmx termuat, WHEN tautan navigasi ditekan, dasbor shall
  mengganti isi panel tanpa memuat ulang halaman.
- **AC-5.5** WHERE htmx termuat, dasbor shall meminta ulang panel yang terbuka
  setiap 10 detik. Angka 10 detik tidak ada di `docs/` dan ditetapkan spec ini;
  ia berada di bawah timeout long-poll 25 detik (`src/channels/telegram.ts:180`)
  sehingga panel tidak pernah tertinggal lebih dari satu siklus poll.
- **AC-5.6** WHERE htmx tidak termuat, setiap tautan navigasi shall tetap
  membuka panel yang sama sebagai halaman penuh.
- **AC-5.7** WHERE htmx tidak termuat, dasbor shall menampilkan keadaan pada
  saat halaman dimuat dan tidak memperbarui dirinya sendiri, sehingga angka
  yang terbaca selalu punya satu waktu yang jelas: waktu muat yang tercetak di
  kepala halaman.
- **AC-5.8** `npm pack --dry-run` shall menampilkan berkas htmx yang di-vendor
  (hari ini `files` hanya memuat `bin`, `dist`, `presets`;
  `package.json:30-34`).

### AC-6 · Keluaran bersih

- **AC-6.1** Setiap nilai dari database shall di-escape untuk HTML (`&`, `<`,
  `>`, `"`, `'`) sebelum masuk markup.
- **AC-6.2** Setiap respons, termasuk halaman kesalahan, shall melewati
  scrubber keluar sebelum dikirim (`AGENTS.md:56`; scrubber
  `src/core/security.ts:17-31`, di-seed dengan rahasia yang sama seperti
  `src/cli.ts:446`).
- **AC-6.3** WHEN sebuah judul sesi berisi `<script>`, halaman shall
  menampilkannya sebagai teks dan tidak mengeksekusinya.
- **AC-6.4** IF sebuah handler melempar, THEN server shall menjawab 500
  dengan satu kalimat dan tanpa stack trace (`AGENTS.md:65`).
- **AC-6.5** Setiap teks yang dibaca manusia di dasbor shall berasal dari
  `src/i18n.ts` dan hadir di kedua katalog (`src/i18n.ts:1-2`).

### AC-7 · Dua angka beta dan opt-in berbagi

- **AC-7.1** WHEN `Gateway.run()` mulai, gateway shall menulis satu baris
  audit `gateway.start` (K4).
- **AC-7.2** WHEN `/beta` diminta, dasbor shall menghitung waktu setup sebagai
  selisih antara baris audit `gateway.start` paling awal dan baris audit
  `msg.in` paling awal (sasaran median < 3 menit: `docs/brd.md:147`, G1
  `docs/prd.md:55`).
- **AC-7.3** IF tidak ada baris `gateway.start` yang mendahului `msg.in`
  paling awal, THEN `/beta` shall menampilkan waktu setup sebagai tidak
  diketahui dan menyebut alasannya, yaitu database yang dibuat sebelum v0.5.
- **AC-7.4** WHEN `/beta` diminta, dasbor shall menyatakan aktivasi terpenuhi
  hanya bila ada baris audit `run.finish` ber-result `end_turn` dengan `ts`
  tidak lebih dari 24 jam setelah baris `gateway.start` paling awal (definisi
  aktivasi `docs/brd.md:142`).
- **AC-7.5** WHEN `/beta` diminta, dasbor shall menyatakan bahwa `end_turn`
  adalah proksi untuk "pesan berhasil" pada definisi `docs/brd.md:142` dan
  menyebut aksi audit yang dibacanya.
- **AC-7.6** Modul dasbor shall tidak memuat satu pun panggilan jaringan
  keluar (`fetch`, `http.request`, `https.request`, `net.connect`, `WebSocket`)
  (`docs/security.md:234`).
- **AC-7.7** WHERE bagian "bagikan angka ini" dibuka pengguna, `/beta` shall
  menampilkan satu baris teks berisi versi, waktu setup dalam detik, dan
  aktivasi ya atau tidak.
- **AC-7.8** WHERE bagian itu tertutup, yang merupakan keadaan awalnya, kedua
  angka shall tetap tampil di panel — opt-in melekat pada membagikan angka,
  bukan pada menghitungnya.
- **AC-7.9** Baris bagikan shall tidak memuat hostname, nama atau path
  workspace, principal id, judul sesi, maupun isi audit.

### AC-8 · Dokumen yang berubah bersama kode

- **AC-8.1** `docs/ui-ux.md:5` shall menyebut dasbor lokal, sehingga permukaan
  produk tidak lagi tertulis chat dan terminal saja.
- **AC-8.2** `docs/ui-ux.md` §7 (`:180-195`) shall memuat baris
  `caraka dashboard [--port n] [--bind addr]` beserta statusnya.
- **AC-8.3** `docs/security.md:230` shall menyebut dasbor sebagai listener
  yang diatur baris bind itu.
- **AC-8.4** `docs/security.md:232` shall diubah sehingga kalimat "tidak ada
  webhook sama sekali" berdampingan dengan pernyataan bahwa satu listener
  loopback ada, dan klaimnya tetap benar untuk webhook.
- **AC-8.5** `docs/security.md` §12 shall memuat butir bahwa di mesin bersama
  siapa pun yang dapat mencapai `127.0.0.1` dapat membaca dasbor selama ia
  berjalan, dan batas sebenarnya adalah izin berkas database.
- **AC-8.6** `docs/adr/0006` shall memuat amendemen bertanggal (preseden
  `docs/adr/0004:15`) yang menyatakan konsekuensi `:19` tetap berlaku untuk
  channel dan tidak lagi berarti nol socket.
- **AC-8.7** FR-AUD-06 (`docs/frd.md:179`) shall menyebut perintahnya dan
  status terbangun.
- **AC-8.8** FR-OPS-02 (`docs/frd.md:188`) shall memuat `dashboard` di daftar
  perintah terpasang.
- **AC-8.9** `docs/roadmap.md:115` shall menyatakan bahwa opt-in berlaku untuk
  membagikan angka, bukan untuk mengumpulkannya.
- **AC-8.10** `docs/techstack.md` §9 (`:98-104`) shall menyatakan bahwa htmx
  di-vendor di dalam paket dan tidak diambil dari CDN.
- **AC-8.11** `AGENTS.md:24-37` shall memuat `src/dashboard/` pada peta
  repositori.
- **AC-8.12** Setiap tempat di `site/` yang menyebut permukaan produk shall
  cocok dengan `src/` pada commit yang sama (AC-1.3 `spec/v10.md`), dan
  `site/src/data/status.ts:200` shall tetap benar sebagai kandidat bersyarat.
