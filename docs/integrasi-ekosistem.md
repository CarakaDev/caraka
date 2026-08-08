# Catatan integrasi: ACP dan Titen

**Produk:** Caraka `1.0.0` · **Tanggal:** 8 Agustus 2026 · **English:** [`integrasi-ekosistem.en.md`](integrasi-ekosistem.en.md)
**Riset pendukung:** `docs/research/acp-protokol-universal-agentclientprotocol-jetbrains-morph.md`, `docs/research/titen-memory-titen-dev-github.md`
**Untuk siapa:** maintainer ACP dan maintainer Titen.

Fase 7 di `docs/roadmap.md` meminta kontribusi balik ke dua proyek hulu yang dipakai Caraka. Catatan ini mengumpulkan apa yang ditemukan sampai rilis `1.0.0`. Berkas dan simbol disebut dengan namanya, bukan dengan nomor baris, supaya rujukannya tidak busuk saat kodenya bergeser.

Titen ditulis oleh orang yang sama dengan Caraka (`docs/research/titen-memory-titen-dev-github.md` §2). Bagian kedua karena itu datang dari pihak yang tidak netral dan sebaiknya dibaca dengan sadar begitu.

---

## ACP

Caraka adalah klien ACP: `@agentclientprotocol/sdk` 1.3.0 dengan adapter Claude terkunci di `@agentclientprotocol/claude-agent-acp` 0.63.0 (`package.json`). Permukaan yang dipakai ada di `src/drivers/claude-acp.ts`: `initialize`, `session/load`, `session/new`, `session/prompt`, `session/set_mode`, `session/cancel`, notifikasi `session/update`, dan permintaan `session/request_permission`.

Sejak `0.6` klien ini melayani tiga channel chat, dan salah satunya tidak punya tombol sama sekali. Itu tidak mengubah apa pun di sisi protokol, tetapi menjelaskan posisi klien di dua permintaan di bawah: jalur ACP adalah satu-satunya jalur Caraka yang punya hook izin, dan orang yang harus menjawabnya hampir tidak pernah sedang duduk di depan mesin yang menjalankan agent.

### Klien yang menolak setiap izin permanen

Caraka menjalankan agent di mesin pemiliknya dan mengendalikannya dari chat, jadi persetujuan harus tetap satu keputusan untuk satu tindakan. Aturan itu diberlakukan di dua tempat.

Yang pertama memilih apa yang boleh muncul sebagai tombol. `askPermission` di `src/core/gateway.ts` mencari opsi pertama ber-`kind` `allow_once` yang id-nya tidak ada di daftar ceding, dan bila tidak ada, permintaan dijawab `cancelled` tanpa pernah sampai ke chat. Komentar di atasnya merekam alasannya dari lapangan: ExitPlanMode benar-benar mengirim `bypassPermissions` sebagai opsi pertama pada mesin non-root.

Yang kedua adalah jaring terakhir sebelum jawaban dikirim. `guardPermission` di `src/core/security.ts` menukar setiap jawaban terpilih yang id-nya ada di `cedingOptionIds` (`bypassPermissions`, `acceptEdits`, `auto`, `dontAsk`) atau yang `kind`-nya `allow_always`, menjadi opsi ber-`kind` `reject_once` milik permintaan yang sama. Ketika permintaan tidak memuat opsi penolakan sekali pakai, jawabannya `cancelled`. Jalur trust window melewati gerbang yang sama, jadi kelonggaran waktu pun tidak bisa melahirkan izin permanen. Test `no permission response can cede standing permission` di `test/unit.test.ts` mengunci tabelnya, termasuk kasus permintaan yang hanya menawarkan `bypassPermissions` dan karena itu dijawab `cancelled`.

Daftar id itu ada karena `kind` saja tidak cukup. Di tabel test, `auto` berlabel `allow_once` dan tetap ditolak karena id-nya dikenal. Sebuah opsi yang menyandang label sekali pakai tetapi menyimpan izin akan lolos bila klien hanya membaca `kind`.

Yang muncul di kawat: agent menawarkan `allow_always` pada setiap permintaan, klien ini membuangnya pada setiap permintaan, dan kedua sisi membayar satu putaran penuh untuk opsi yang hasilnya sudah pasti. Ketika agent hanya menawarkan opsi yang menyimpan izin, hasilnya `cancelled` dan pemilik mesin tidak pernah melihat pertanyaannya.

### Permintaan 1: cara mengumumkan bahwa klien tidak akan pernah menyimpan izin

Protokol hari ini tidak punya kosakata untuk perilaku di atas. Klien bisa menolak `allow_always`, tetapi tidak bisa mengatakannya lebih dulu, sehingga agent tidak punya cara tahu bahwa opsi itu sia-sia.

Yang diminta: satu penanda kapabilitas klien yang berarti "klien ini tidak akan pernah menghormati izin yang berlaku terus". Tempatnya sudah ada, karena `initialize` mengirim `clientCapabilities` dan Caraka mengirimnya kosong. Penamaannya urusan hulu. Yang perlu disepakati adalah akibatnya pada agent: berhenti menawarkan opsi yang menyimpan izin, dan selalu sertakan satu opsi `allow_once` beserta satu `reject_once` supaya permintaan tetap bisa dijawab.

Nilainya untuk hulu berada di luar Caraka. Klien mana pun yang menjalankan agent atas nama orang yang sedang tidak di depan mesinnya punya alasan sama untuk menolak izin permanen, dan hari ini setiap klien seperti itu harus menebak sendiri daftar id seperti `cedingOptionIds`. Daftar yang ditebak akan selalu tertinggal dari agent yang menambah nama baru.

### Permintaan 2: bentuk spawn adapter ACP

Sampai `0.3`, cara Caraka menjalankan adapter dikeraskan di dalam kode driver; `ClaudeAcp.start()` masih mempertahankan jalur itu sebagai cadangan ketika tidak ada preset. Pekerjaan preset di `0.4` harus memindahkannya ke berkas konfigurasi, dan tidak ada bentuk standar untuk disalin. Keputusan K1 mencatat pencariannya dan mengakhirinya dengan bentuk buatan sendiri: blok bersarang `acp: {command, args[], env{}}` di dalam preset (`done/driver-v04/spec.md` K1, skemanya di `presetSchema` pada `src/drivers/preset.ts`, barisnya di `docs/api.md` §1). Bentuk bersarang dipilih supaya `command`/`args` datar tetap berarti jalur CLI, sehingga satu preset bisa memuat kedua jalur dan pemilihan otomatis bisa jatuh dari ACP ke CLI (`docs/frd.md` FR-DRV-07, contohnya `presets/agents/claude-code.yaml`).

Alasan tiga field itu cukup datang dari implementasi lain: vscode-acp berbicara ke sembilan agent berbeda hanya dengan `{command, args, env}` per agent (`docs/research/acp-protokol-universal-agentclientprotocol-jetbrains-morph.md` §5). Setiap preset ACP yang dikirim Caraka sekarang mengisinya, dan test `the seven shipped presets load, and every unverified flag says so` menolak preset amp, cursor, gemini, atau goose yang berjalur ACP tanpa `acp.command`.

Yang diminta: spesifikasi ACP menyebutkan bentuk baku untuk mendeskripsikan cara menjalankan adapter lokal, sekecil tiga field itu. Setiap klien yang menawarkan daftar agent hari ini menemukan ulang bentuk yang sama, dan setiap penemuan ulang membuat berkas konfigurasi agent tidak bisa dipindahkan antar klien. Dua hal kecil yang ikut perlu dinyatakan, karena keduanya kami putuskan sendiri tanpa rujukan:

- **Resolusi `command`.** Adapter yang dipasang sebagai dependency npm hanya ditemukan bila `node_modules/.bin` ikut dicari di samping `PATH`; itulah yang dikerjakan `resolveCommand` di `src/drivers/preset.ts`.
- **Semantik `env`.** Di Caraka isi `env` ditimpakan di atas environment induk, bukan menggantikannya, dan environment induk itu lebih dulu dibersihkan dari setiap variabel berawalan `CARAKA_` (`claudeEnvironment` di `src/drivers/claude-acp.ts`). Spesifikasi yang menyebutkan mana dari keduanya yang berlaku akan menghemat satu tebakan bagi klien berikutnya.

### Registry JSON sebagai sumber auto-discovery

Riset menempatkan registry sebagai sumber metadata versi dan distribusi yang bisa dibaca klien untuk menemukan agent tanpa konfigurasi manual (`docs/research/acp-protokol-universal-agentclientprotocol-jetbrains-morph.md` §3), dan FR-SETUP-02 memintanya (`docs/frd.md`).

Di `0.4` pembacaan itu tidak jadi dikirim, dan `0.6` belum mengubahnya. `src/discovery.ts` memindai `PATH` untuk tujuh biner yang dikenal, memprobe `--version`, lalu menyimpan hasilnya 24 jam. Komentar pembuka berkas itu menyatakan registry sengaja dibiarkan tidak dibaca, dan alasannya direkam sebagai pencabutan AC-9.2 dan AC-9.3 pada tinjauan pra-tutup: metadata yang dibaca tidak ditampilkan di mana pun, jadi pembacaannya adalah kode mati seharga satu fetch pada setiap first run (`done/driver-v04/spec.md`, `docs/design.md` §"Penemuan agent"). Ia kembali bersama baris `doctor` yang menampilkannya.

Catatan untuk hulu berasal dari alasan penundaan itu. Registry-nya tersedia; yang belum ada adalah jawaban atas pertanyaan yang dibawa klien lokal ke sana: dari biner yang sudah ada di mesin ini, mana yang berbicara ACP, dengan perintah apa ia dijalankan, dan versi adapter mana yang cocok dengan versi protokol yang kami dukung. Registry yang memuat pemetaan dari nama biner ke bentuk spawn dari Permintaan 2 akan mengubah pembacaannya menjadi sesuatu yang langsung berguna pada first run, dan pemindaian `PATH` di `src/discovery.ts` bisa berhenti menebak nama biner satu per satu.

### Risiko yang dicatat riset, dan posisinya di kode

Tabel risiko di `docs/research/acp-protokol-universal-agentclientprotocol-jetbrains-morph.md` §6 menyebut tiga hal yang masih relevan sesudah klien benar-benar dibangun.

**Negosiasi versi schema.** Mitigasi yang direncanakan adalah negosiasi di `initialize` dengan versi minimum yang dipatok. Yang dikirim lebih sederhana: `PROTOCOL_VERSION` dari SDK dipakai apa adanya, dan kegagalan `initialize` apa pun sebabnya ditangkap sebagai satu galat, adapter dimatikan, lalu run jatuh ke jalur CLI (`ClaudeAcp.start()`, test `an adapter that dies during initialize falls back to the preset's CLI route`). Klien tidak bisa membedakan versi protokol yang tidak cocok dari adapter yang rusak, sehingga pengguna tidak pernah diberi tahu mana yang terjadi. Galat yang membedakan keduanya harus datang dari protokol.

**Adapter pihak ketiga terlambat menyusul.** Mitigasi yang direncanakan bersandar pada registry sebagai sumber kebenaran versi, dan bagian sebelumnya sudah menjelaskan mengapa jalan itu belum ditempuh. Yang dikerjakan sekarang: satu adapter dikunci di `package.json`, sisanya ditulis di preset dan ditandai belum diverifikasi di dalam berkasnya.

**Belum ada standar auth lintas agent.** Mitigasi yang tercatat adalah kurasi registry pada agent yang mendukung `authenticate`. Klien ini tidak pernah memanggil `authenticate` sama sekali; satu-satunya jejak autentikasi di kode adalah komentar di `src/cli.ts` bahwa `initialize` bisa gagal karena agent belum terautentikasi, dan jawabannya adalah pindah ke jalur CLI. Untuk klien tanpa jendela editor, kurasi registry tidak membantu: yang dibutuhkan adalah cara agent mengatakan "saya butuh login" dalam bentuk yang bisa diteruskan ke chat.

---

## Titen

Caraka memakai Titen sebagai provider memori default lewat HTTP ke proses lokal (`src/memory/titen.ts`). Menulis adapter itu memaksa jawaban untuk pertanyaan yang tidak dijawab dokumentasi terbit, dan jawabannya ada di bawah.

### Pemetaan rute sebagaimana terkirim

Antarmuka `MemoryProvider` punya lima operasi (`docs/design.md` §13). Yang benar-benar dikirim adapter:

| Operasi | Metode dan jalur |
|---|---|
| `observe` | `POST /v1/observations` |
| `compile` | `POST /v1/context/compile` |
| `feedback` | `POST /v1/context/:id/feedback` |
| `trace` | `GET /v1/claims/:id/evidence` |
| `forget` | `DELETE /v1/observations/:id` |

Kelimanya dikunci oleh test `the titen adapter maps its five operations to the documented routes` di `test/unit.test.ts`. Empat baris pertama mengikuti tabel di `docs/research/titen-memory-titen-dev-github.md` §3, yang disalin dari `titen.dev/docs/api`. Pemetaan konseptualnya ada di dokumen yang sama (§7): transcript dan tool event Caraka menjadi observation, fakta dan keputusan menjadi claim, memori yang disuntik ke prompt menjadi context dengan budget eksplisit, dan `superseded_by` di ERD kami dihapus karena `supersede` sudah menjadi konsep kelas satu di Titen.

Satu hal yang tidak ada di tabel terbit dan hanya ketahuan dari jawaban sungguhan: hasil dibungkus `{ data }`. Adapter membaca `data` bila ada dan menerima badan telanjang bila tidak. Menyebutkan pembungkus itu di halaman API akan menghemat satu percobaan bagi klien berikutnya.

### Dua rute yang tidak ada di tabel terbit

Tabel lima operasi tidak menyebut cara menghapus apa pun. Kedua rute berikut ditemukan dengan membaca sumber Titen v0.7.0 pada 8 Agustus 2026, dan hasil pemeriksaannya tercatat di komentar pembuka `src/memory/titen.ts`.

`DELETE /v1/observations/:id` menghapus satu observation. Rute inilah yang dipakai `forget`, dan lewat itu perintah `/lupakan` di chat. Status 404 dibaca sebagai nol baris terhapus.

`POST /v1/claims/:id/revoke` mencabut claim. Adapter tidak memakainya, karena rute itu menuntut versi claim yang berlaku sekarang sementara id yang dibagikan `observe` adalah id observation. Akibatnya `forget` di Caraka hanya membersihkan observation, dan claim yang sudah terlanjur diturunkan dari observation itu tidak tersentuh. Ini pantas disebut di dokumentasi Titen: pengguna yang menghapus sebuah bukti masuk akal mengira kesimpulan yang berdiri di atasnya ikut hilang.

### Isu untuk hulu: penghapusan dengan filter tidak punya rute

**Yang diharapkan.** `MemoryProvider.forget` menerima id atau `Filter` berisi `scope` dan `kind` (`src/memory/index.ts`). Bentuk itu dirancang untuk permintaan seperti "lupakan semua catatan dari workspace ini", yang mengikuti scope yang sama dengan yang sudah diterima `POST /v1/context/compile`.

**Yang terjadi.** Titen v0.7.0 tidak punya rute hapus massal, jadi adapter mengembalikan nol tanpa mengirim permintaan apa pun. Test mengunci perilaku itu: sesudah `forget({ kind: "note" })`, jumlah permintaan yang tercatat tidak bertambah. Antarmuka menerima filter, lalu pemanggil menerima angka nol yang artinya sama dengan "tidak ada yang cocok". Provider `local` mengembalikan nol untuk filter dengan alasan berbeda (`src/memory/local.ts`), jadi tidak ada satu pun provider yang melayani setengah antarmuka ini. Satu-satunya pemanggil hari ini, `/lupakan`, selalu mengirim string.

**Bentuk perbaikannya.** Pilihan pertama, rute penghapusan yang menerima scope dan kind yang sama dengan yang sudah dipahami compile, mengembalikan jumlah rekaman terhapus, dan menyatakan apa yang terjadi pada claim yang mengutip observation yang dihapus. Pilihan kedua, bila penghapusan massal memang tidak diinginkan pada penyimpanan append-only, halaman API menyatakannya sebagai keputusan sehingga klien bisa menolak permintaan itu dengan jujur alih-alih mengembalikan nol. Keduanya menutup isu ini; yang tidak bisa diteruskan adalah keadaan sekarang, ketika satu-satunya cara mengetahuinya adalah membaca sumber.

### Batas keberlakuan catatan ini

Semua yang ditulis di bagian Titen berasal dari kode yang berbicara dengan fetch tiruan. Kalimat di catatan rilis `0.3.0` masih berlaku apa adanya, dan tidak ada rilis sesudahnya yang mengubahnya:

> The `titen` adapter has only ever answered a mocked fetch; no check in this repository talks to a live Titen. Its routes were read from the Titen v0.7.0 source, a pre-1.0 surface that can move, and `local` keeps working without it.

v0.7.0 adalah permukaan pra-1.0 (`docs/research/titen-memory-titen-dev-github.md` §2), dan risiko bahwa API-nya bergerak sudah dicatat sejak riset (§8). Rute di tabel atas karena itu adalah rekaman satu pemeriksaan pada satu tanggal, dan tidak mengikat Titen. Pemeriksaan pertama yang berbicara dengan Titen yang hidup bisa saja menggugurkan sebagian isi catatan ini, dan itu wajar.

Kedekatan penulis memotong ke dua arah. Rute yang tidak ada di dokumentasi ditemukan dengan membaca sumber, yang tidak akan dilakukan integrator lain, dan itu berarti dokumentasi Titen belum diuji oleh pemakai yang harus bertahan hanya dengan halaman API-nya.

---

## Yang tidak ditulis di sini, karena tidak ada sumbernya

- Angka apa pun dari Titen yang hidup. Tidak ada satu pemeriksaan pun di repositori ini yang menyentuh server Titen sungguhan.
- Bentuk JSON registry ACP. Riset menyebutnya sebagai prosa; tidak ada contoh berkasnya di repositori ini.
- Apakah hulu ACP sudah pernah membahas penanda "klien tidak menyimpan izin". Tidak ada berkas di repositori ini yang merekam pencarian isu hulu.
- Apakah Titen v0.7.0 punya hapus massal dengan nama lain. Yang tercatat hanya ketiadaannya.
- Bentuk badan galat Titen. Adapter hanya membaca status HTTP.
- Nilai `kind` opsi izin selain `allow_always`, `allow_once`, dan `reject_once`. Hanya ketiganya yang muncul di repositori ini.
- `POST /v1/consolidations`. Ada di tabel terbit Titen, tidak pernah diimplementasikan di sini, jadi tidak ada pengalaman untuk dilaporkan.
