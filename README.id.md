<p align="center">
  <img src="assets/banner.svg" width="100%" alt="caraka — kirim tugasnya, Caraka yang jalan">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/caraka"><img src="https://img.shields.io/npm/v/caraka?style=flat-square&labelColor=05080C&color=E2452C&label=npm" alt="npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/lisensi-MIT-8EEE98?style=flat-square&labelColor=05080C" alt="MIT"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%E2%89%A522-E2452C?style=flat-square&labelColor=05080C" alt="node >= 22"></a>
  <a href="https://agentclientprotocol.com"><img src="https://img.shields.io/badge/protokol-ACP-FF7A5E?style=flat-square&labelColor=05080C" alt="ACP"></a>
  <a href="docs/roadmap.md"><img src="https://img.shields.io/badge/status-v0.2-FFD67E?style=flat-square&labelColor=05080C" alt="v0.1 preview"></a>
</p>

<p align="center">
  <a href="https://caraka.dev"><b>caraka.dev</b></a> ·
  <a href="docs/blueprint.md">Blueprint</a> ·
  <a href="docs/install-guide.md">Pemasangan</a> ·
  <a href="docs/security.md">Model ancaman</a> ·
  <a href="docs/roadmap.md">Roadmap</a> ·
  <a href="README.md">🇬🇧 English</a>
</p>

> **v0.2.** Bisa dipakai di chat pribadi dan di grup yang masuk allowlist, dengan Claude Code lewat ACP. Bahasa Inggris dan Indonesia. `caraka service` mencetak berkas unit yang kamu pasang sendiri. Memori, lampiran, dan coding agent selain Claude Code belum ada di rilis ini.

---

## Apa ini

Coding agent hari ini terkunci di satu terminal, di satu mesin. Caraka adalah transport yang hilang — bridge tipis, bukan asisten baru.

Ia **tidak punya agent loop, tidak punya tool, tidak punya model provider, dan tidak punya marketplace plugin.** Coding agent-mu sudah punya semuanya, dan versinya lebih baik: sandbox sungguhan, konteks repo, diff review, kesadaran git. Caraka hanya menambahkan yang dibutuhkan chat — identitas, sesi, approval, dan audit.

<p align="center">
  <img src="assets/flow.svg" width="100%" alt="Telegram topic ke caraka ke coding agent">
</p>

<details>
<summary>Versi teks polos</summary>

```
        Telegram (chat pribadi = ruang kerja)
        ├── 📋 General                            ← kontrol
        ├── 🔵 toko-api · rate limit login   #a91  ← sesi = topic = "tab"
        ├── 🟡 toko-api · audit dependency   #a92  ← menunggu persetujuanmu
        └── 🟢 web · revisi hero             #a85  ← selesai, tertutup
                        │
                  ┌─────▼─────┐
                  │  caraka   │  identity · router · topics
                  │           │  policy · approval · audit
                  └─────┬─────┘
                        │ ACP (Agent Client Protocol)
                        ▼
        coding agent milik kamu — runtime, tools, sandbox, model
```

</details>

## Instalasi

Butuh Node.js 22+, Git, dan Claude Code yang sudah login.

```bash
claude auth status
npx caraka init
npx caraka doctor
npx caraka start
```

`init` memvalidasi token bot ke Telegram, menampilkan tautan pairing sekali pakai, meminta konfirmasi di terminal, lalu menyimpan token di luar `config.yaml` dalam berkas mode `0600`. Buat token bot lewat [@BotFather](https://t.me/BotFather). Jangan tempel token ke issue atau chat AI.

Aktifkan topic mode bot di BotFather bila ingin satu topic Telegram per sesi. Jika topic tidak tersedia, Caraka tetap jalan dalam mode linear dengan header sesi.

Instalasi global tidak wajib:

```bash
npm install --global caraka
caraka init
caraka start
```

### Minta Codex atau Claude membantu

Tempel prompt berikut ke salah satu coding agent. Ia menangani pemeriksaan lingkungan dan menjelaskan sisanya, dan ditulis supaya agent tidak pernah meminta token Telegram dikirim lewat chat.

```text
Pasang Caraka untuk repository di working directory saya saat ini.

Baca https://github.com/CarakaDev/caraka lebih dulu. Verifikasi Node.js 22
atau lebih baru, Git, Claude Code, dan `claude auth status`. Perbaiki hanya
prasyarat yang kurang tanpa mengubah repository saya. Jika Caraka sudah
dikonfigurasi, jalankan `npx caraka doctor`.

Untuk pairing Telegram, jangan pernah meminta saya menempel, membuka, atau
mengulang token bot lewat chat, output command, log, atau berkas yang akan
di-commit. Minta saya membuat bot lewat @BotFather, lalu berikan perintah ini
untuk saya jalankan sendiri di terminal lokal:

  npx caraka init --workspace "$PWD"

Tunggu saat saya memasukkan token secara privat dan menyetujui deep link
Telegram. Setelah saya mengonfirmasi init selesai, jalankan
`npx caraka doctor`, jelaskan check yang gagal, lalu mulai dengan
`npx caraka start`. Jangan mengaktifkan webhook, membuka port, memasang service,
atau mengubah konfigurasi model/provider milik Claude.
```

Beberapa klien coding agent bisa mempertahankan terminal interaktif untuk wizard. Jika klienmu tidak bisa, jalankan satu perintah `init` sendiri; agent dapat melanjutkan dengan `doctor` dan `start`. Batas ini menjaga token agar tidak masuk transkrip percakapan.

## Memakainya

Kirim teks biasa untuk memberi Claude tugas. Sisanya cukup empat perintah:

| | |
|---|---|
| `/new` | memulai sesi baru |
| `/status` | menampilkan keadaan sesi percakapan ini |
| `/stop` | membatalkan tugas yang berjalan |
| `/commands` | mendaftar perintah yang dilaporkan agent |
| `/usage` | melaporkan konteks dan biaya yang dilaporkan agent |
| `/yolo <durasi>` | membuka jendela trust Caraka selama durasi yang disebut |
| `/lock` | menutup jendela trust sekarang |
| `/help` | menjelaskan cara mengirim tugas |

Permintaan izin tampil sebagai tombol **Setujui sekali** dan **Tolak**. Setiap callback ditandatangani, terikat ke principal Telegram dan sesi, kedaluwarsa setelah sepuluh menit, serta hanya bisa dipakai sekali. Teks chat tidak pernah dibaca sebagai persetujuan.

## Kenapa bisa sekecil ini

Satu protokol mengerjakan bagian tersulitnya. [ACP](https://agentclientprotocol.com) adalah padanan LSP untuk coding agent: JSON-RPC 2.0 lewat stdio, dibuat Zed, di-co-lead JetBrains, dengan 28+ agent di registry-nya. Menulis **satu** klien ACP itulah yang menjaga pintu ke agent lain tetap terbuka — v0.1 menjalankan Claude Code, dan sisanya tinggal preset, bukan tulis ulang.

ACP juga sudah menyediakan `session/request_permission`, jadi sistem approval bukan sesuatu yang Caraka karang sendiri. Ia hanya merender permintaan izin milik protokol itu menjadi tombol di chat-mu.

## Sesi itu tab

Sejak 2026, bot Telegram bisa membuat forum topic **di chat pribadi, tanpa hak admin sama sekali.** Itu mengubah DM dengan bot-mu menjadi ruang kerja ber-tab, tanpa setup apa pun.

Satu sesi = satu topic. Caraka menamainya, menandai keadaannya lewat glif di nama (▸ jalan · ⏸ butuh kamu · ✓ selesai · ✗ gagal), lalu mengirim ringkasan penutup. Warna ikon dipilih saat topic dibuat — `editForumTopic` Telegram bisa mengubah nama dan emoji topic, tetapi tidak warnanya. Daftar topic menjadi papan status yang bisa dibaca sekilas tanpa membuka apa pun.

Bila topic tidak tersedia, Caraka jatuh ke mode linear dengan header sesi. Tidak ada yang gagal keras.

## Aman secara default

Caraka menghubungkan input tak tepercaya (chat) ke eksekusi kode di mesinmu. Karena itu ia sengaja dibuat membosankan sejak awal:

- Chat pribadi dan allowlist eksplisit bersifat **wajib** — gateway menolak jalan tanpa itu
- Tulis berkas dan jalankan perintah butuh persetujuan; persetujuan datang dari **callback bertanda tangan, sekali pakai, ber-TTL**, sehingga teks chat tidak pernah bisa menyetujui apa pun
- Telegram memakai long-polling. Caraka **tidak membuka port listener**
- Token bot dan key approval disimpan terpisah di `~/.caraka/secrets/` dengan mode `0600`
- Setiap pesan keluar dan entri audit melewati scrubber rahasia
- Tabel audit SQLite menolak update dan delete
- API key model tidak pernah disentuh — itu milik coding agent-mu

Baca [model ancaman](docs/security.md) sebelum menghubungkan repo sensitif.

## Filosofi

**Caraka** (ꦕꦫꦏ, Jawa: *utusan*) adalah kata pertama aksara Jawa, dari legenda dua abdi setia Aji Saka:

> ꦲꦤꦕꦫꦏ · *hana caraka* — ada dua utusan
> ꦢꦠꦱꦮꦭ · *data sawala* — mereka berselisih
> ꦥꦝꦗꦪꦚ · *padha jayanya* — sama kuatnya
> ꦩꦒꦧꦛꦔ · *maga bathanga* — keduanya menjadi bangkai

Keduanya patuh dengan sempurna. Keduanya benar menurut instruksi yang mereka pegang. Keduanya mati — bukan karena pengkhianatan, melainkan karena **kesetiaan tanpa konteks**: dua perintah yang bertabrakan, tidak ada cara memverifikasi, dan tidak ada manusia di antara keduanya pada saat yang menentukan.

Itulah sebabnya proyek ini punya approval dan jejak audit. Selengkapnya di [docs/brand.md](docs/brand.md).

## Yang belum ada di v0.1

Memori sudah dispesifikasikan dan belum dikirim. Saat tiba nanti ia memakai [Titen](https://titen.dev) — memori agent yang tidak pernah meratakan kesimpulan dengan buktinya, dengan ekstraksi claim yang deterministik dan tanpa model di dalam loop. Titen dan Caraka ditulis oleh orang yang sama: satu mengingat, satu diutus.

Grup, service latar, lampiran, dan coding agent selain Claude Code juga sudah dispesifikasikan dan belum dikirim. [roadmap.md](docs/roadmap.md) memuat urutannya dan gerbang yang bisa membatalkan fase berikutnya.

Dua di antaranya membawa syarat yang layak diketahui sebelum kamu menunggunya.

**Grup.** Saat dukungan grup mendarat, memasukkan grup ke allowlist berarti memilih untuk memperlihatkan pekerjaan itu kepada anggotanya: kartu approval, path berkas, diff, dan keluaran perintah akan terbaca setiap anggota grup. Balasan ephemeral Telegram tidak bisa menyembunyikannya — ia hanya berlaku 15 detik setelah aksi yang memenuhi syarat, atau bila bot adalah admin chat, dan Caraka tidak pernah meminta hak itu. Yang tetap tertutup adalah keputusannya: tombol approval hanya sah dari akun yang ada di allowlist, jadi anggota lain bisa membaca kartunya tanpa bisa menjawabnya.

**Service latar.** Caraka akan mencetak unit systemd, launchd, atau schtasks untuk kamu pasang sendiri. Ia tidak pernah memasangnya, tidak punya hook `postinstall`, dan tidak pernah mencetak kata `sudo`.

## Verifikasi dari source

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run e2e
npm run smoke   # butuh Claude Code yang sudah login
```

## Dokumentasi

| | |
|---|---|
| [install-guide.md](docs/install-guide.md) | Pemasangan, langkah demi langkah |
| [install-with-ai.md](docs/install-with-ai.md) | Prompt di atas, dan kenapa bentuknya begitu |
| [blueprint.md](docs/blueprint.md) | Ikhtisar satu halaman dan keputusan yang terkunci |
| [session-model.md](docs/session-model.md) | Sesi sebagai topic: siklus hidup, routing, kebersihan |
| [design.md](docs/design.md) | Arsitektur, interface, protokol |
| [security.md](docs/security.md) | Model ancaman dan kontrol |
| [roadmap.md](docs/roadmap.md) | Fase dan gerbang keputusan |
| [research/](docs/research/) | Delapan dokumen riset bersumber |

## Kontribusi

Lihat [CONTRIBUTING.md](CONTRIBUTING.md). Laporan kerentanan ke `security@caraka.dev` — lihat [SECURITY.md](SECURITY.md).

## Lisensi

MIT — lihat [LICENSE](LICENSE).

---

`halo@caraka.dev` · [caraka.dev](https://caraka.dev)
