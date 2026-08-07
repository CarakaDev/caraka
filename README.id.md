# ꦕꦫꦏ caraka

**Kirim tugasnya. Caraka yang jalan.**

Caraka menyambungkan Telegram ke coding agent yang sudah terpasang di komputermu. Setiap tugas hidup di topic-nya sendiri — seperti tab di terminal — lengkap dengan approval, progres yang mengalir, dan ingatan yang bisa menjelaskan dirinya.

🇬🇧 [Read in English](README.md)

> **Status: pra-alfa.** Spesifikasinya sudah lengkap dan terbuka; implementasinya baru dimulai. Belum ada yang berguna untuk dipasang. Paket npm saat ini hanya mengunci nama. Ikuti [roadmap](docs/roadmap.md) — Fase 0 adalah spike teknis, bukan rilis.

---

## Apa ini

Coding agent hari ini terkunci di satu terminal, di satu mesin. Caraka adalah transport yang hilang — bridge tipis, bukan asisten baru.

Ia **tidak punya agent loop, tidak punya tool, tidak punya model provider, dan tidak punya marketplace plugin.** Coding agent-mu sudah punya semuanya, dan versinya lebih baik: sandbox sungguhan, konteks repo, diff review, kesadaran git. Caraka hanya menambahkan yang dibutuhkan chat — identitas, sesi, approval, memori, dan audit.

```
        Telegram (chat pribadi = ruang kerja)
        ├── 📋 General                            ← kontrol
        ├── 🔵 toko-api · rate limit login   #a91  ← sesi = topic = "tab"
        ├── 🟡 toko-api · audit dependency   #a92  ← menunggu persetujuanmu
        └── 🟢 web · revisi hero             #a85  ← selesai, tertutup
                        │
                  ┌─────▼─────┐
                  │  caraka   │  identity · router · topics
                  │           │  policy · approval · memory · audit
                  └─────┬─────┘
                        │ ACP (Agent Client Protocol)
                        ▼
        coding agent milik kamu — runtime, tools, sandbox, model
```

## Kenapa bisa sekecil ini

Satu protokol mengerjakan bagian tersulitnya. [ACP](https://agentclientprotocol.com) adalah padanan LSP untuk coding agent: JSON-RPC 2.0 lewat stdio, dibuat Zed, di-co-lead JetBrains, dengan 28+ agent di registry-nya. Menulis **satu** klien ACP mencakup hampir semuanya — termasuk agent yang belum lahir.

ACP juga sudah menyediakan `session/request_permission`, jadi sistem approval bukan sesuatu yang Caraka karang sendiri. Ia hanya merender permintaan izin milik protokol itu menjadi tombol di chat-mu.

## Sesi itu tab

Sejak 2026, bot Telegram bisa membuat forum topic **di chat pribadi, tanpa hak admin sama sekali.** Itu mengubah DM dengan bot-mu menjadi ruang kerja ber-tab, tanpa setup apa pun.

Satu sesi = satu topic. Caraka menamainya, mewarnai ikonnya sesuai keadaan (🔵 jalan · 🟡 butuh kamu · 🟢 selesai · 🔴 gagal), mengirim ringkasan penutup, lalu menutupnya. Daftar topic menjadi papan status yang bisa dibaca sekilas tanpa membuka apa pun.

Bila topic tidak tersedia, Caraka jatuh ke mode linear dengan header `[workspace · #id]`. Tidak ada yang gagal keras.

## Ingatan yang bisa menjelaskan dirinya

Caraka memakai [Titen](https://titen.dev) — memori agent open source yang tidak pernah meratakan kesimpulan dengan buktinya. Observation membawa content hash, claim menyebut observation asalnya, dan context mencatat persis apa yang diserahkan ke agent serta apa yang dipotong budget.

Ekstraksi claim bersifat **deterministik — tanpa model di dalam loop.** Memori bekerja tanpa LLM secara default. Setiap claim dapat dirunut ke sumbernya, sehingga *"kenapa dia tahu itu?"* selalu punya jawaban.

Titen dan Caraka ditulis oleh orang yang sama. Dua proyek bernama Jawa: satu mengingat, satu diutus.

## Aman secara default

Caraka menghubungkan input tak tepercaya (chat) ke eksekusi kode di mesinmu. Karena itu ia sengaja dibuat membosankan sejak awal:

- Allowlist **wajib** — gateway menolak jalan tanpa itu
- Mode default `assisted`: tulis berkas dan jalankan perintah butuh persetujuan
- Persetujuan datang dari **callback bertanda tangan, sekali pakai, ber-TTL** — teks chat tidak pernah bisa menyetujui apa pun
- Grup bersifat read-only; keluaran sensitif dikirim sebagai pesan ephemeral yang hanya terlihat olehmu
- Bind ke `127.0.0.1`; Telegram memakai long-polling, jadi tidak ada port yang pernah terbuka
- Rahasia diredaksi dari setiap pesan keluar dan setiap baris log
- API key model tidak pernah disentuh — itu milik coding agent-mu

Baca [model ancaman](docs/security.md) sebelum menyambungkan apa pun.

## Filosofi

**Caraka** (ꦕꦫꦏ, Jawa: *utusan*) adalah kata pertama aksara Jawa, dari legenda dua abdi setia Aji Saka:

> ꦲꦤꦕꦫꦏ · *hana caraka* — ada dua utusan
> ꦢꦠꦱꦮꦭ · *data sawala* — mereka berselisih
> ꦥꦝꦗꦪꦚ · *padha jayanya* — sama kuatnya
> ꦩꦒꦧꦛꦔ · *maga bathanga* — keduanya menjadi bangkai

Keduanya patuh dengan sempurna. Keduanya benar menurut instruksi yang mereka pegang. Keduanya mati — bukan karena pengkhianatan, melainkan karena **kesetiaan tanpa konteks**: dua perintah yang bertabrakan, tidak ada cara memverifikasi, dan tidak ada manusia di antara keduanya pada saat yang menentukan.

Itulah sebabnya proyek ini punya approval, memori berprovenance, dan jejak audit. Selengkapnya di [docs/brand.md](docs/brand.md).

## Dokumentasi

| | |
|---|---|
| [blueprint.md](docs/blueprint.md) | Ikhtisar satu halaman dan keputusan yang terkunci |
| [session-model.md](docs/session-model.md) | Sesi sebagai topic: siklus hidup, routing, kebersihan |
| [design.md](docs/design.md) | Arsitektur, interface, protokol |
| [security.md](docs/security.md) | Model ancaman dan kontrol |
| [install-flow.md](docs/install-flow.md) | Setup di bawah tiga menit |
| [roadmap.md](docs/roadmap.md) | Fase dan gerbang keputusan |
| [research/](docs/research/) | Delapan dokumen riset bersumber |

## Kontribusi

Lihat [CONTRIBUTING.md](CONTRIBUTING.md). Laporan kerentanan ke `security@caraka.dev` — lihat [SECURITY.md](SECURITY.md).

## Lisensi

MIT — lihat [LICENSE](LICENSE).

---

`halo@caraka.dev` · [caraka.dev](https://caraka.dev)
