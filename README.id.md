<p align="center">
  <img src="assets/banner.svg" width="100%" alt="caraka — kirim tugasnya, Caraka yang jalan">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/caraka"><img src="https://img.shields.io/npm/v/caraka?style=flat-square&labelColor=05080C&color=E2452C&label=npm" alt="npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/lisensi-MIT-8EEE98?style=flat-square&labelColor=05080C" alt="MIT"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%E2%89%A522-E2452C?style=flat-square&labelColor=05080C" alt="node >= 22"></a>
  <a href="https://agentclientprotocol.com"><img src="https://img.shields.io/badge/protokol-ACP-FF7A5E?style=flat-square&labelColor=05080C" alt="ACP"></a>
  <a href="docs/roadmap.md"><img src="https://img.shields.io/badge/status-v1.5-FFD67E?style=flat-square&labelColor=05080C" alt="v1.5"></a>
</p>

<p align="center">
  <a href="https://caraka.dev"><b>caraka.dev</b></a> ·
  <a href="docs/blueprint.md">Blueprint</a> ·
  <a href="docs/install-guide.md">Pemasangan</a> ·
  <a href="docs/security.md">Model ancaman</a> ·
  <a href="docs/roadmap.md">Roadmap</a> ·
  <a href="README.md">🇬🇧 English</a>
</p>

> **v1.5, belum terbukti.** Telegram, Discord, dan WhatsApp sampai ke coding agent di mesinmu lewat satu kontrak yang sama, dengan sembilan preset agent, memori, lebih dari satu workspace, lampiran, dan dasbor read-only di loopback. Lima dari sembilan agent pernah menyelesaikan satu giliran di sini terhadap biner hidup, lewat enam jalur; tidak ada kredensial Discord maupun nomor WhatsApp yang pernah dipakai di sini, dan tidak satu pun gerbang lapangan pernah dijawab siapa pun, penulisnya termasuk. Registry menyajikan rilis yang berlaku.

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
        ├── ▸ toko-api · rate limit login   #a91  ← sesi = topic = "tab"
        ├── ⏸ toko-api · audit dependency   #a92  ← menunggu persetujuanmu
        └── ✓ web · revisi hero             #a85  ← selesai, ringkasan terkirim
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

### Minta coding agent memasangnya

Tempel prompt ini ke coding agent mana pun yang berjalan di komputer tempat repository berada. Ia memeriksa prasyarat, memasang yang kurang, dan ditulis supaya agent tidak pernah meminta token Telegram dikirim lewat chat.

```text
Pasang Caraka untuk repository di working directory saya saat ini.

Baca https://github.com/CarakaDev/caraka lebih dulu. Verifikasi Node.js 22 atau
lebih baru, Git, dan bahwa kamu sendiri sudah terpasang dan sudah login.
Perbaiki hanya prasyarat yang kurang tanpa mengubah repository saya.

Jangan pernah meminta saya menempel, membuka, atau mengulang token bot Telegram
lewat chat, output command, log, atau berkas yang akan di-commit. Minta saya
membuat bot lewat @BotFather, lalu berikan perintah ini untuk saya jalankan
sendiri di terminal lokal:

  npx caraka init --workspace "$PWD"

Setelah saya mengonfirmasi init selesai, jalankan `npx caraka doctor`, jelaskan
check yang gagal, lalu mulai dengan `npx caraka start`. Jangan mengaktifkan
webhook, membuka port, memasang service, atau mengubah konfigurasi model atau
provider milikmu sendiri.
```

Agent menarasikan setiap langkah dan menunggu persetujuanmu, jadi baca dulu apa yang ia usulkan sebelum kamu mengiyakan. Buat token bot lewat [@BotFather](https://t.me/BotFather), dan jangan tempel token itu ke issue atau chat AI.

Pemasangannya bisa dikerjakan coding agent mana pun. Yang kemudian dijalankan Caraka adalah satu dari tujuh agent yang punya preset di sini, sudah login, di atas Node.js 22+ dengan Git. Claude Code, Codex, aider, dan goose adalah yang pernah dijalankan di sini terhadap biner hidup.

Beberapa klien coding agent bisa mempertahankan terminal interaktif untuk wizard. Jika klienmu tidak bisa, jalankan satu perintah `init` sendiri; agent dapat melanjutkan dengan `doctor` dan `start`. Batas ini menjaga token agar tidak masuk transkrip percakapan.

### Atau jalankan perintahnya sendiri

Semua yang dikerjakan prompt itu bisa dijalankan manual:

```bash
claude auth status
npx caraka init
npx caraka doctor
npx caraka start
```

`init` memvalidasi token bot ke Telegram, menampilkan tautan pairing sekali pakai, meminta konfirmasi di terminal, lalu menyimpan token di luar `config.yaml` dalam berkas mode `0600`.

Sebuah grup mendapat satu topic per sesi bila grup itu forum dan Caraka punya hak kelola topic di sana. Percakapan pribadi butuh satu hal lagi, yaitu topic mode bot di BotFather, yang setelan terpisah dan hanya berlaku untuk percakapan pribadi. Bila topic tidak tersedia di salah satunya, Caraka tetap jalan dalam mode linear dengan header sesi.

Instalasi global tidak wajib:

```bash
npm install --global caraka
caraka init
caraka start
```

## Memakainya

Kirim teks biasa untuk memberi agent tugas. Sisanya empat belas perintah:

| | |
|---|---|
| `/new [folder] [judul]` | memulai sesi baru di percakapan ini, keduanya opsional. Kata pertama yang berbentuk path menamai foldernya |
| `/status` | menampilkan keadaan sesi percakapan ini |
| `/stop` | membatalkan tugas yang berjalan |
| `/ws` | mendaftar workspace beserta path-nya |
| `/switch <preset>` | menjalankan sesi ini di preset agent lain |
| `/commands` | mendaftar perintah yang dilaporkan agent |
| `/usage` | melaporkan konteks dan biaya yang dilaporkan agent |
| `/ingat <catatan>` | menyimpan catatan ke memori |
| `/lupakan <id>` | menghapus satu item memori lewat id-nya |
| `/memori` | menampilkan isi memori untuk workspace ini |
| `/yolo <durasi>` | membuka jendela trust Caraka selama durasi yang disebut |
| `/lock` | menutup jendela trust sekarang |
| `/close` | menutup topic sesi ini tanpa menghapusnya, jadi transkripnya tetap bisa dibaca |
| `/help` | menjelaskan cara bekerja di sini, dengan contoh. Di ruangan jawabannya berbeda: apa yang ruangan tolak, apa yang bisa dibaca semua anggotanya, dan apa yang channel-nya antar dan tidak antar |

Permintaan izin tampil sebagai tombol **Setujui sekali** dan **Tolak**. Setiap callback ditandatangani, terikat ke principal chat dan sesi, kedaluwarsa setelah sepuluh menit, serta hanya bisa dipakai sekali. Di channel yang sama sekali tidak punya tombol — WhatsApp — kartunya membawa kode empat karakter yang Caraka bangkitkan dan tidak dicetak di tempat lain, dipakai sekali lewat update database yang sama. Kata biasa tidak pernah menjadi keputusan di channel mana pun.

## Kenapa bisa sekecil ini

Satu protokol mengerjakan bagian tersulitnya. [ACP](https://agentclientprotocol.com) adalah padanan LSP untuk coding agent: JSON-RPC 2.0 lewat stdio, dibuat Zed, di-co-lead JetBrains, dengan 28+ agent di registry-nya. Menulis **satu** klien ACP itulah yang menjaga pintu ke agent lain tetap terbuka, dan menambah agent di jalur CLI cukup satu berkas YAML di `presets/agents/`, bukan perubahan di inti. Sembilan preset dikirim; empat di antaranya disalin dari riset dan belum pernah menyelesaikan satu giliran di sini, dan masing-masing menuliskannya di dalam berkasnya sendiri.

ACP juga sudah menyediakan `session/request_permission`, jadi sistem approval bukan sesuatu yang Caraka karang sendiri. Ia hanya merender permintaan izin milik protokol itu menjadi tombol di chat-mu.

## Sesi itu tab

Sejak 2026, bot Telegram bisa membuat forum topic **di chat pribadi, tanpa hak admin sama sekali.** Itu mengubah DM dengan bot-mu menjadi ruang kerja ber-tab, tanpa setup apa pun.

Satu sesi = satu topic. Caraka menamainya, menandai keadaannya lewat glif di nama (▸ jalan · ⏸ butuh kamu · ✓ selesai · ✗ gagal · ⊘ dibatalkan), lalu mengirim ringkasan penutup. Warna ikon dipilih saat topic dibuat — `editForumTopic` Telegram bisa mengubah nama dan emoji topic, tetapi tidak warnanya. Daftar topic menjadi papan status yang bisa dibaca sekilas tanpa membuka apa pun.

Discord memetakan sesi yang sama ke satu thread publik. WhatsApp tidak punya keduanya, jadi tugas yang sama berjalan di mode linear di belakang header `[workspace · #id]`, dan `/status` di sana menyebut lima sesi terbaru yang percakapan itu pegang. Bila topic tidak tersedia, Caraka jatuh ke mode linear dengan header sesi. Tidak ada yang gagal keras.

### Satu tugas, satu topic, di dalam grup

Seluruh resepnya satu baris:

```
/new@kopipagi_bot ~/Project/kopipagi.id Task Kopi Pagi
```

| Bagian | Artinya |
|---|---|
| `/new` | buka sesi baru |
| `@kopipagi_bot` | bot yang mana. Ini cara Telegram sendiri mengarahkan sebuah perintah garis miring, dan kamu membutuhkannya begitu ada lebih dari satu bot di grup itu |
| `~/Project/kopipagi.id` | folder di mesinmu tempat agent bekerja |
| `Task Kopi Pagi` | nama topic-nya |

Kata pertama dibaca sebagai folder **hanya** karena ia path absolut setelah `~/` dikembangkan. Kata pertama yang bukan path masuk ke judul — `/new perbaiki bug login` membuka sesi dengan nama itu, bukan folder bernama `perbaiki`. Judulnya dipotong di 72 karakter, karena itu yang muat di nama topic.

**Pertama kali kamu menyebut sebuah folder lewat path, Caraka tidak menjawab di grup.** Ia mengirim kartu konfirmasi ke percakapan pribadimu dengan bot itu, dan meninggalkan satu kalimat di grup yang menyebut di mana jawabannya diberikan. Tekan **Ya** di sana, lalu tiga hal terjadi sekaligus: entrinya ditulis ke `config.yaml`, topic-nya muncul di grup, dan sesinya terbuka dalam keadaan kosong — belum ada apa pun yang sampai ke coding agent, jadi pesan berikutnyalah tugas yang sebenarnya. Kartu itu kedaluwarsa dalam sepuluh menit, dan kartu yang kedaluwarsa membawa serta tugas yang menunggunya.

Kartu itu ada di japri dan bukan di grup karena dua alasan, dan masing-masing sudah cukup sendiri. Jawabannya bercabang atas isi diskmu — ada atau tidaknya direktori itu — yang kalau di grup ikut terbaca setiap anggota. Dan siapa pun di grup bisa menghabiskan tombol sebuah kartu sebelum kamu sempat melihatnya.

Menyebut folder lewat path adalah bentuk milik **operator**: akun pertama di `allowFrom` channel itu. Anggota allowlist lain menyebut folder lewat slug-nya, dan `/ws` menampilkan daftarnya. Setelah foldernya masuk, chat itu menempel padanya, jadi tugas berikutnya cukup `/new@kopipagi_bot Tugas lain`.

Caraka menolak sebelum menggambar kartu apa pun kalau path-nya bukan direktori, kalau segmen terakhirnya tidak bisa dipakai sebagai slug, kalau slug atau path itu sudah terpakai, atau kalau foldernya **memuat** workspace yang sudah ada — menyetujui `~/Project` tidak lebih kecil daripada menyetujui seluruh disk. Folder yang berada **di dalam** workspace yang sudah ada tetap mendapat kartu, dengan ongkosnya tertulis di situ: dua scope atas satu direktori berarti `/lock` pada salah satunya tidak menutup jendela trust yang lain, dan memori yang disimpan di bawah satu tidak muncul di bawah yang lain.

Empat hal harus benar sebelum sebuah topic bisa muncul sama sekali: grupnya ada di allowlist chat dalam `config.yaml`, `topics: true` berlaku untuk channel itu, grupnya sendiri sebuah forum, dan Caraka admin di sana dengan hak **Kelola topic**. Dua yang terakhir milik pemilik grup, bukan milik Caraka — ia membaca flag yang Telegram kirim dan tidak bisa menyalakannya. Kalau ada yang kurang, tidak ada yang gagal: sesinya berjalan linear di belakang header `[workspace · #id]`. Versi panjangnya, termasuk bunyi tiap penolakan, ada di [caraka.dev/guide](https://caraka.dev/guide).

## Aman secara default

Caraka menghubungkan input tak tepercaya (chat) ke eksekusi kode di mesinmu. Karena itu ia sengaja dibuat membosankan sejak awal:

- Chat pribadi dan allowlist eksplisit bersifat **wajib** — gateway menolak jalan tanpa itu
- Tulis berkas dan jalankan perintah butuh persetujuan; persetujuan adalah **rahasia sekali pakai ber-TTL** yang terikat ke principal, sesi, dan permintaan — callback bertanda tangan di channel yang punya tombol, kode di kartu bila tidak punya — sehingga teks chat tidak pernah bisa menyetujui apa pun
- Tidak ada yang dibuka ke internet atas inisiatif Caraka. Telegram ditarik lewat long-poll, Discord dan provider `baileys` WhatsApp memegang socket keluar, dan kedua listener bind `127.0.0.1` kecuali kamu menyuruh lain: `caraka dashboard` menyajikan halaman read-only dan hanya menjawab GET, dan sejak v0.6 penerima webhook WhatsApp Cloud API memeriksa `X-Hub-Signature-256` dengan perbandingan waktu-tetap, juga saat bind loopback
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

## Yang tidak diberikan v1.5

**Bukti bahwa ini bekerja untuk orang lain.** Setiap fase di [roadmap.md](docs/roadmap.md) membawa kode yang sudah dikirim, dan setiap fase masih memegang satu gerbang yang tidak bisa dijawab dari repositori: seminggu pemakaian harian, lima rekaman setup, uji A/B atas dua puluh tugas, dua puluh developer beta, empat belas hari di nomor WhatsApp sungguhan. Semuanya dipindah melewati rilisnya atas keputusan pemilik, dengan tanggalnya dicatat, bukan dicentang. Sampai di 1.0 berarti kodenya mendarat; ia tidak mengatakan apa pun soal pemakaian.

**Verifikasi hidup untuk sebagian besar permukaannya.** Lima dari sembilan preset pernah menyelesaikan satu giliran di sini terhadap biner hidup, lewat enam jalur — Claude Code di kedua jalurnya, Codex dan aider di CLI, goose dan opencode lewat ACP — dan run itulah yang membetulkan presetnya: dua di antaranya membawa bendera yang ditolak binernya. Tidak ada kredensial Discord hidup dan tidak ada nomor WhatsApp yang pernah dipakai: setiap pemeriksaan pada keduanya dijawab transport palsu. Empat preset sisanya menulis `belum diverifikasi` di dalam berkasnya sendiri — tiga berhenti di handshake ACP karena giliran penuhnya menuntut akun berbayar, dan yang keempat jalur CLI yang sign-in-nya satu URL OAuth Google dengan jendela enam puluh detik.

**MCP inbox untuk agent IDE.** Masih dispesifikasikan dan belum dibangun. Lampiran sudah mendarat di v1.3: foto sampai ke agent sebagai byte gambar di jalur ACP, atau lewat preset yang menyebut bendera gambarnya. Byte-nya mendarat di bawah home Caraka dengan mode 0700 dan nama yang dibangkitkan, tidak pernah di dalam workspace; apa pun di atas batas 20 MB milik Telegram ditolak sebelum satu byte diambil; dan prompt yang membawa lampiran tidak pernah mengambil auto-approve jendela trust. Di jalur CLI Claude Code ia turun menjadi satu kalimat yang menyebut apa yang datang, karena pembaca jalur itu menolak path di luar direktori proyek.

**Memori** sudah dikirim, di v0.3, lewat [Titen](https://titen.dev) — memori agent yang tidak pernah meratakan kesimpulan dengan buktinya, dengan ekstraksi claim yang deterministik dan tanpa model di dalam loop — atau lewat provider SQLite lokal, atau tidak sama sekali. Titen dan Caraka ditulis oleh orang yang sama: satu mengingat, satu diutus. Adapter Titen di sini baru pernah menjawab fetch yang dimock.

Tiga hal yang sudah dikirim membawa syarat yang layak diketahui.

**Grup.** Memasukkan grup ke allowlist berarti memilih untuk memperlihatkan pekerjaan itu kepada anggotanya: kartu approval, path berkas, diff, dan keluaran perintah akan terbaca setiap anggota grup. Balasan ephemeral Telegram tidak bisa menyembunyikannya — ia hanya berlaku 15 detik setelah aksi yang memenuhi syarat, atau bila bot adalah admin chat, dan Caraka tidak pernah meminta hak itu. Yang tetap tertutup adalah keputusannya: tombol approval hanya sah dari akun yang ada di allowlist pengirim, jadi anggota lain bisa membaca kartunya tanpa bisa menjawabnya.

Privacy mode tetap menyala, dan itu sebabnya pesan biasa di grup tidak pernah sampai ke bot. Sapa ia langsung — `/new@botmu …` — atau balas salah satu pesannya. Mematikannya, atau memberi hak admin yang dibutuhkan topic grup, membuat bot menerima setiap pesan di grup. Caraka tidak pernah meminta keduanya; `/status` di grup melaporkan mana yang sedang berlaku.

**WhatsApp.** Provider tidak resmi `baileys` menautkan akun sungguhan sebagai perangkat, dan WhatsApp memblokir akun yang berperilaku seperti otomasi. Caraka menjawab empat dari lima sinyal yang diketahui di level kode — `allowFrom` wajib, plafon dua belas pesan per menit bergulir, jeda acak antar-kirim, dan penolakan menulis lebih dulu ke nomor mana pun — dan yang kelima bukan miliknya untuk dijawab. Memilihnya menghentikan `start` sampai kamu menulis `acknowledgeRisk: true`. Baca [docs/whatsapp-risiko.md](docs/whatsapp-risiko.md) lebih dulu; kalau nomor itu penting bagimu, jawabannya di sana adalah Cloud API.

**Service latar.** `caraka service --print` mencetak unit systemd, launchd, atau schtasks ke stdout untuk kamu pasang sendiri. Caraka tidak pernah memasangnya, tidak punya hook `postinstall`, dan tidak pernah mencetak kata `sudo`.

## Verifikasi dari source

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run e2e
npm run smoke   # Claude Code harus login; langkah codex dilewati bila codex tidak terpasang
```

## Dokumentasi

| | |
|---|---|
| [install-guide.md](docs/install-guide.md) | Pemasangan, langkah demi langkah |
| [install-with-ai.md](docs/install-with-ai.md) | Prompt di atas, dan kenapa bentuknya begitu |
| [blueprint.md](docs/blueprint.md) | Ikhtisar satu halaman dan keputusan yang terkunci |
| [session-model.md](docs/session-model.md) | Sesi sebagai topic atau thread: siklus hidup, routing, kebersihan |
| [design.md](docs/design.md) | Arsitektur, interface, protokol |
| [security.md](docs/security.md) | Model ancaman, kontrol, dan checklist sebelum rilis |
| [whatsapp-risiko.md](docs/whatsapp-risiko.md) | Risiko ban, asal setiap angkanya, dan kapan Cloud API yang benar |
| [openclaw-vs-caraka.md](docs/openclaw-vs-caraka.md) | Kapan sebaiknya memakai OpenClaw |
| [roadmap.md](docs/roadmap.md) | Fase, gerbang keputusan, dan gerbang lapangan yang dipindah pasca-rilis |
| [research/](docs/research/) | Tiga belas dokumen riset bersumber |

## Kontribusi

Lihat [CONTRIBUTING.md](CONTRIBUTING.md). Laporan kerentanan ke `security@caraka.dev` — lihat [SECURITY.md](SECURITY.md).

## Lisensi

MIT — lihat [LICENSE](LICENSE).

---

`halo@caraka.dev` · [caraka.dev](https://caraka.dev)
