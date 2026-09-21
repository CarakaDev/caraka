# Panduan Web/PWA Caraka

Caraka Web/PWA memasangkan satu browser dengan komputer yang menjalankan Caraka. Tugas tetap berjalan pada komputer itu. Perangkat yang dipasangkan dapat membuat tugas, menjawab kartu izin, dan membaca hasil.

## Sebelum mulai

- Siapkan Node.js 22 atau lebih baru dan coding agent yang sudah masuk pada komputer.
- Pilih satu koneksi HTTPS. Gunakan Tailscale Serve untuk Tailnet pribadi atau Cloudflare Tunnel bernama untuk hostname yang Anda kendalikan.
- Siapkan telepon dan browser yang mendukung service worker serta Push API.

Jangan pakai Quick Tunnel. Quick Tunnel untuk pengembangan dan tidak mendukung SSE yang dipakai aplikasi web.

## Siapkan channel web

Di folder proyek yang terdaftar, jalankan:

    caraka init web --workspace /path/to/project --agent codex --language id
    caraka start

Perintah pertama membuat konfigurasi web loopback. Perintah kedua menjalankan gateway. Keduanya tidak memasang service latar belakang.

## Pilih koneksi

Mulai dari rencana. Rencana hanya membaca status provider dan tidak mengubah konfigurasi Caraka atau provider.

    caraka web connect tailscale
    caraka web connect cloudflare --hostname caraka.example.com --tunnel caraka-web

Untuk Tailscale, masuk dahulu bila perintah meminta login. Caraka memeriksa status Serve yang ada. Jika rute HTTPS sudah dipakai target lain, perbaiki rute itu dengan `tailscale serve status --json` sebelum menerapkan Caraka.

Untuk Cloudflare, lakukan login provider pada terminal Anda. Caraka mendukung alur CLI tunnel bernama dengan pengelolaan lokal. Cloudflare biasanya merekomendasikan tunnel yang dikelola dari jarak jauh. Caraka tidak menimpa DNS dan tidak memakai `--overwrite-dns`.

Terapkan hanya setelah Anda membaca rencana:

    caraka web connect tailscale --apply
    caraka web connect cloudflare --hostname caraka.example.com --tunnel caraka-web --apply

Jalur Cloudflare menyimpan kredensial tunnel dan konfigurasi ingress khusus di `secrets/cloudflared/`. Konfigurasi ingress berakhir dengan respons 404. Perintah hanya mencetak langkah service provider. Pasang service provider sendiri setelah meninjau perintahnya. Caraka tidak memasang daemon.

Perubahan origin hanya terjadi saat `--apply`. Field lain pada konfigurasi Caraka tetap ada. Saat origin berubah, pasangkan kembali browser pada origin baru.

## Periksa koneksi dan telepon

    caraka web connect tailscale --check

Pemeriksaan meminta `GET /health` pada origin lalu memastikan `GET /api/state` tanpa cookie mendapat 401. Pemeriksaan ini memakai timeout dan menolak redirect.

Hasil `Phone verification: manual` tetap normal. Buka origin dari telepon melalui koneksi yang dipilih, lalu jalankan `caraka web pair` pada komputer. Masukkan kode lima menit pada halaman pasangan. Fetch dari server tidak membuktikan telepon dapat membuka origin.

## Aktifkan notifikasi

Setelah pasangan berhasil, buka Devices & connection lalu pilih Enable notifications. Browser meminta izin saat tombol ditekan. Caraka menyimpan subscription pada perangkat yang diautentikasi dan menyimpan kunci VAPID hanya di `secrets/` dengan izin privat.

Notifikasi hanya memberi tahu bahwa aktivitas tugas memerlukan perhatian. Notifikasi tidak memuat prompt, nama workspace, path, token, atau hasil. Menekan notifikasi membuka origin saat ini. Kegagalan push tidak menghentikan tugas atau UI lokal.

Cabut perangkat pada Devices & connection atau jalankan:

    caraka web devices --revoke DEVICE_ID

Perangkat yang dicabut tidak lagi menerima push. Caraka juga menghapus subscription saat push service memberi 404 atau 410.

## Prompt untuk coding agent

Salin prompt ini ke coding agent Anda:

    Configure Caraka Web/PWA for this machine. First inspect the existing Caraka config.
    Do not change provider state until you show the output from a read-only plan.
    Use Tailscale Serve for a private tailnet, or a named Cloudflare Tunnel for a hostname I control.
    Do not use a Quick Tunnel or overwrite DNS. Apply only after I approve the plan.
    Start Caraka, run the connection check, and report health, anonymous API rejection, and phone verification separately.
    Do not install a Caraka service. Do not print secrets.

## Batas yang perlu diuji manual

Provider login, pemasangan service provider, DNS yang sudah dipakai, dan akses dari telepon memakai akun serta jaringan Anda. Test otomatis hanya membuktikan bentuk command, penolakan konflik, kontrak HTTP, dan penanganan subscription. Test otomatis bukan bukti tunnel atau telepon Anda aktif.

Lihat juga [kontrak API Web](web-api.md).
