# Web Caraka dan koneksi jarak jauh

Tanggal: 21 September 2026. Status: disetujui untuk implementasi melalui percakapan.

Rama meminta web/Android untuk mengendalikan coding agent di laptop/server.
Rama menyetujui web/PWA lebih dulu, dengan bantuan setup Tailscale atau Cloudflare Tunnel.
Rama menyetujui mockup desktop dan HP, lalu meminta pekerjaan sampai deploy dan publikasi npm dengan persetujuan rilis akhir.
Caraka adalah produk open source untuk mesin dan akun milik setiap pengguna. `rama-tuf` hanya host pengembangan dan pengujian.

## Lingkup

Satu operator memakai browser desktop atau HP untuk memasangkan perangkat, memilih
workspace, mengirim tugas, membaca progres dan hasil, memberi persetujuan, serta
menghentikan tugas. Kanal web berjalan bersama kanal lama atau sendiri. Semua
eksekusi tetap melalui Gateway dan driver yang sudah ada.

UI memakai warna Caraka, Public Sans, JetBrains Mono, status dengan teks/ikon,
dan tata letak yang berubah menjadi satu panel pada HP. Sesi berada di rel kiri
pada desktop. Percakapan memakai ruang utama. Persetujuan hadir di percakapan
dengan tombol yang tetap terlihat. Pengaturan koneksi dan perangkat memakai dialog
atau panel tersendiri. Keadaan kosong mengarahkan pengguna ke tugas pertama.

Panduan setup dapat dijalankan coding agent. Login penyedia dan izin sistem tetap
berada pada pengguna. Perintah otomatis harus menunjukkan tindakan sebelum
mengubah koneksi. Konfigurasi yang sudah ada tidak ditimpa diam-diam.

## Yang tidak dikerjakan

Aplikasi Android native, banyak operator, layanan relay milik Caraka, terminal web,
editor kode, akses ke sesi kanal lain tanpa pemetaan identitas, dan publikasi npm
tanpa persetujuan rilis. Situs pemasaran tetap terpisah dari aplikasi lokal.

## Acceptance criteria

- **AC-1** WHEN pengguna menjalankan `caraka init web`, Caraka shall membuat konfigurasi web tanpa meminta akun chat.
- **AC-2** IF konfigurasi sudah ada, THEN setup shall mempertahankan kanal, workspace, dan secret yang sudah ada.
- **AC-3** WHEN kanal web berjalan, Caraka shall melayani UI pada loopback secara default.
- **AC-4** IF origin bukan HTTPS atau loopback, THEN Caraka shall menolak konfigurasi web.
- **AC-5** WHEN pengguna memasangkan perangkat dengan kode terminal, Caraka shall menerima kode sekali dalam lima menit.
- **AC-6** IF cookie tidak sah atau perangkat dicabut, THEN API privat shall menjawab 401.
- **AC-7** IF permintaan perubahan berasal dari origin lain, THEN API shall menolak sebelum mengubah data.
- **AC-8** WHEN perangkat baru dipasangkan, Caraka shall menyimpan hanya hash token perangkat.
- **AC-9** WHEN pengguna mengirim tugas ke workspace terdaftar, Gateway shall menjalankan driver workspace tersebut.
- **AC-10** WHEN pengguna membuka lagi sesi web, UI shall memulihkan percakapan lokal sesi tersebut.
- **AC-11** WHEN browser mengirim ulang ID pesan yang sama, Caraka shall menerima tugas tersebut paling banyak sekali.
- **AC-12** WHEN driver meminta persetujuan, UI shall menampilkan tombol yang berasal dari kartu Gateway.
- **AC-13** IF persetujuan sudah dipakai atau kedaluwarsa, THEN Gateway shall menolak keputusan ulang.
- **AC-14** WHEN pengguna menekan hentikan, Gateway shall menghentikan tugas pada sesi yang dipilih.
- **AC-15** WHEN pengguna mengunggah lampiran, Caraka shall memakai jalur lampiran Gateway yang sudah dibatasi.
- **AC-16** WHEN agent mengirim berkas hasil, UI shall menyediakan unduhan yang memerlukan autentikasi.
- **AC-17** WHEN koneksi browser terputus, UI shall menampilkan status terputus.
- **AC-18** WHEN koneksi kembali, UI shall memuat keadaan terbaru tanpa mengirim ulang tugas otomatis.
- **AC-19** WHERE browser mendukung instalasi PWA, UI shall menyediakan manifest dan aset instalasi yang sah.
- **AC-20** WHERE browser tidak mendukung instalasi PWA, UI shall tetap berfungsi sebagai web biasa.
- **AC-21** WHILE perangkat offline, UI shall menonaktifkan pengiriman tugas dan keputusan.
- **AC-22** Service worker shall menyimpan hanya aset aplikasi yang tidak memuat percakapan atau kredensial.
- **AC-23** WHERE Web Push tersedia dan pengguna memberi izin, Caraka shall mengirim pemberitahuan keputusan atau hasil baru.
- **AC-24** WHERE Web Push tidak tersedia, UI shall menjelaskan bahwa pemberitahuan latar belakang tidak aktif.
- **AC-25** WHEN pengguna memilih Tailscale, bantuan setup shall memeriksa pemasangan, login, Serve HTTPS, dan URL akhirnya.
- **AC-26** WHEN pengguna memilih Cloudflare, bantuan setup shall memakai tunnel permanen dan hostname yang dipilih pengguna.
- **AC-27** IF penyedia belum login atau biner belum terpasang, THEN bantuan setup shall memberi langkah berikutnya yang dapat dijalankan agent.
- **AC-28** WHEN agent menjalankan pemeriksaan koneksi, Caraka shall membedakan URL terjangkau, autentikasi aktif, dan verifikasi dari HP.
- **AC-29** IF perubahan koneksi belum diminta secara eksplisit, THEN perintah setup shall hanya menampilkan rencana.
- **AC-30** WHEN viewport berukuran 390×844 atau 1440×900, UI shall menampilkan pengiriman pesan dan navigasi sesi tanpa overflow horizontal.
- **AC-31** WHILE pengguna menavigasi dengan keyboard, UI shall menyediakan fokus yang terlihat dan label kontrol.
- **AC-32** WHEN service dimulai ulang, perangkat yang sah shall tetap dapat masuk tanpa memasangkan ulang.
- **AC-33** WHEN pengguna memasang Caraka pada mesin dan akun mereka, UI serta setup shall memakai konfigurasi dan keadaan mesin tersebut.
- **AC-34** IF sistem operasi atau penyedia membutuhkan langkah manual, THEN setup shall menjelaskan langkah yang sesuai tanpa mengklaim langkah tersebut sudah berhasil.

## Batas dan bukti

Lima menit mengikuti pairing yang sudah dipakai Caraka. Ukuran viewport adalah
target pengujian desain, bukan angka penggunaan pasar. Batas lampiran mengikuti
Gateway. Kode sumber awal berjumlah sekitar 11.200 baris dan sudah melewati batas
8.000; fitur ini tidak mengklaim menghapus utang itu. Tambahan web akan diukur.
Persetujuan bergantung pada kemampuan driver; jalur CLI tanpa permission hook
tetap tidak menjanjikan tombol persetujuan setiap tindakan.

## Keputusan arah

Permintaan ini mengubah larangan companion app pada blueprint lama. Produk tetap
satu operator dan tidak membangun runtime agent. PWA adalah kanal resmi baru.
Setup dan semua tes awal memakai direktori sementara. Pemasangan koneksi nyata
pada mesin pengguna menunggu pilihan mesin dan penyedia; implementasi wizard
tidak membuka instalasi lama ke internet.
