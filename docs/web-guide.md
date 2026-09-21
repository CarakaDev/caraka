# Panduan Web/PWA Caraka

Caraka Web/PWA memasangkan satu browser dengan komputer yang menjalankan Caraka. Tugas berjalan pada komputer itu. Perangkat yang dipasangkan dapat membuat tugas, menjawab kartu izin, dan membaca hasil.

## Sebelum mulai

Pasang Node.js 22 atau lebih baru. Pasang Caraka pada terminal Anda:

    npm install --global caraka

Masuk ke coding agent pada komputer. Pilih satu koneksi HTTPS. Gunakan Tailscale Serve untuk Tailnet pribadi atau Cloudflare Tunnel bernama untuk hostname yang Anda kendalikan. Siapkan telepon dan browser yang mendukung service worker serta Push API.

Jangan pakai Quick Tunnel. Quick Tunnel untuk pengembangan dan tidak mendukung koneksi SSE aplikasi web.

## Siapkan channel web

Di folder proyek yang terdaftar, jalankan:

    caraka init web --workspace /path/to/project --agent codex --language id

Web init mempertahankan rute workspace yang sudah ada. Folder berbeda dengan nama sama mendapat slug berbeda, seperti app dan app-2. Init berulang untuk path yang sama tidak menambah entri.

Perintah ini membuat konfigurasi web loopback. Jangan mulai Caraka sebelum Anda menerapkan koneksi HTTPS.

## Pilih koneksi

Mulai dari rencana. Rencana hanya membaca status provider.

    caraka web connect tailscale
    caraka web connect cloudflare --hostname caraka.example.com --tunnel caraka-web

Masuk ke Tailscale bila diminta. Caraka memeriksa status Serve. Jika handler lain memakai rute HTTPS, periksa dengan `tailscale serve status --json`. Perbaiki rute tersebut sebelum menerapkan Caraka.

Masuk ke Cloudflare pada terminal Anda. Caraka mendukung alur CLI tunnel bernama dengan pengelolaan lokal. Cloudflare biasanya merekomendasikan tunnel yang dikelola dari jarak jauh. Caraka tidak menimpa DNS dan tidak memakai `--overwrite-dns`.

Pasang Tailscale sendiri pada Debian, Ubuntu, Fedora, RHEL, macOS, atau Windows. Rencana memberi perintah atau tautan provider untuk platform Anda. Pasang cloudflared sendiri. Pada Debian atau Ubuntu, pakai `cloudflare-main.gpg` dan repositori APT `any main`. Pada Fedora atau RHEL, pakai `cloudflared.repo`. Tinjau petunjuk provider sebelum menjalankannya.

Terapkan setelah Anda membaca rencana:

    caraka web connect tailscale --apply
    caraka web connect cloudflare --hostname caraka.example.com --tunnel caraka-web --apply

Jalur Cloudflare menyimpan kredensial tunnel baru dan konfigurasi ingress di `secrets/cloudflared/`. Konfigurasi ingress berakhir dengan respons 404. Jika Anda memakai tunnel bernama yang sudah ada, berikan file kredensialnya secara eksplisit:

    caraka web connect cloudflare --hostname caraka.example.com --tunnel existing-tunnel --credentials /path/to/tunnel.json --apply

Perintah hanya mencetak langkah service provider. Pasang service provider sendiri setelah meninjau perintahnya. Caraka tidak memasang daemon.

Mulai Caraka setelah `--apply` mengubah origin:

    caraka start

Jika Caraka sudah berjalan, hentikan lalu mulai lagi. Server web membaca origin saat mulai. Pasangkan browser lagi setelah origin berubah.

## Periksa koneksi dan telepon

    caraka web connect tailscale --check

Pemeriksaan meminta `GET /health` pada origin lalu memastikan `GET /api/state` tanpa cookie mendapat 401. Pemeriksaan ini memakai timeout dan menolak redirect.

Hasil `Phone verification: manual` tetap normal. Buka origin dari telepon melalui koneksi yang dipilih. Jalankan `caraka web pair` pada komputer. Masukkan kode lima menit pada halaman pasangan. Fetch dari server tidak membuktikan telepon dapat membuka origin.

## Aktifkan notifikasi

Setelah pasangan berhasil, buka Devices & connection lalu pilih Enable notifications. Browser meminta izin dari tombol itu. Caraka mengikat subscription pada perangkat yang diautentikasi. Caraka menyimpan kunci VAPID hanya di `secrets/` dengan izin privat. Notifikasi memerlukan origin HTTPS yang dikonfigurasi.

Notifikasi hanya memberi tahu bahwa aktivitas tugas memerlukan perhatian. Notifikasi tidak memuat prompt, nama workspace, path, token, atau hasil. Menekan notifikasi membuka origin saat ini. Kegagalan push tidak menghentikan tugas atau UI lokal.

Cabut perangkat pada Devices & connection atau jalankan:

    caraka web devices --revoke DEVICE_ID

Perangkat yang dicabut tidak lagi menerima push. Caraka juga menghapus subscription saat push service memberi 404 atau 410.

## Prompt untuk coding agent

Salin prompt ini ke coding agent Anda:

    Konfigurasikan Caraka Web/PWA untuk komputer ini. Periksa konfigurasi Caraka yang ada terlebih dahulu.
    Tampilkan rencana provider yang hanya membaca status sebelum mengubah status provider.
    Gunakan Tailscale Serve untuk Tailnet pribadi, atau Cloudflare Tunnel bernama untuk hostname yang saya kendalikan.
    Jangan pakai Quick Tunnel atau menimpa DNS. Terapkan hanya setelah saya menyetujui rencana.
    Mulai ulang Caraka setelah perubahan origin diterapkan. Jalankan pemeriksaan koneksi.
    Laporkan health, penolakan API anonim, dan verifikasi telepon secara terpisah.
    Jangan pasang service Caraka. Jangan cetak rahasia.

## Batas yang perlu diuji manual

Login provider, pemasangan service provider, DNS yang sudah dipakai, dan akses dari telepon memakai akun serta jaringan Anda. Test otomatis hanya membuktikan bentuk command, penolakan konflik, kontrak HTTP, dan penanganan subscription. Test otomatis bukan bukti tunnel atau telepon Anda aktif.

Lihat juga [kontrak API Web](web-api.md).
