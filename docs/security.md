# Security

**Produk:** Caraka · **Versi:** 0.2 · **Tanggal:** 7 Agustus 2026
**Riset pendukung:** `docs/research/keamanan-agent-remote-arxiv-openclaw-acp.md`
**Sumber API:** klaim tentang method dan field Telegram diperiksa terhadap
`https://core.telegram.org/bots/api` pada 7 Agustus 2026.

---

## 1. Postur keamanan dalam satu paragraf

Caraka menghubungkan **input tak tepercaya** (chat) ke **eksekusi kode di mesin developer**. Itu kombinasi paling berbahaya dalam sistem agentic. Strategi kami bertumpu pada satu keunggulan struktural: **kami tidak menambah permukaan eksekusi baru** — semua eksekusi terjadi di dalam coding agent yang sudah punya sandbox, permission model, dan diff review sendiri. Tugas kami hanya menjaga tiga gerbang: **siapa** yang boleh bicara, **apa** yang boleh dijalankan, dan **apa** yang boleh keluar.

---

## 2. Trust boundary

```
  UNTRUSTED                     │  TRUSTED
  ──────────────────────────────┼──────────────────────────────
  isi pesan chat                │  config.yaml
  konten web/repo yang dibaca   │  keputusan lewat tombol bertanda
  isi memori yang di-recall     │  perintah dari terminal lokal
  output MCP pihak ketiga       │  allowlist principal
```

**Aturan tunggal yang menyatukan semuanya:** apa pun yang berasal dari kolom UNTRUSTED **tidak akan pernah** dapat mengubah kebijakan, menyetujui aksi, atau menaikkan hak.

---

## 3. Ancaman & kontrol

| # | Ancaman | Kontrol utama | Kontrol cadangan |
|---|---|---|---|
| T1 | Orang asing mengirim perintah | Allowlist wajib; gateway menolak start bila kosong | Pairing disetujui dari terminal, bukan chat |
| T2 | Prompt injection langsung | Approval berbasis tombol + nonce; teks tidak bisa menyetujui | Mode default `assisted` |
| T3 | Prompt injection tidak langsung (README/issue/web) | Konten eksternal & memori diberi label **data, bukan instruksi** | Aksi berisiko selalu minta konfirmasi walau mode `trusted` |
| T4 | Eksfiltrasi rahasia lewat balasan | **Outbound scrubber** wajib sebelum kirim & sebelum tulis disk | Deny-list path (`~/.ssh`, `~/.aws`, `*.env`, keychain) |
| T5 | Aksi destruktif | Daftar aksi berisiko tinggi (force push, `rm -rf`, migrasi, deploy) selalu butuh approval | Timeout run + `/stop` |
| T6 | Persetujuan tak berwenang di grup | Callback approval terikat principal; penekan di luar allowlist tidak menyetujui apa pun | Allowlist chat dan allowlist pengirim dievaluasi terpisah |
| T6b | Pengungkapan di grup | Dinyatakan saat pairing, bukan dikontrol — §4 butir 6. Berlaku sama untuk guild channel Discord: kartu approval, path, diff, dan keluaran perintah terbaca setiap anggota yang bisa melihat channel itu | Grup default `read-only` (belum terbangun, lihat §5); kalau terlalu sensitif untuk dilihat anggota, tempatnya bukan di grup |
| T7 | Gateway terekspos internet | Bind `127.0.0.1` saja; membuka butuh flag eksplisit + peringatan. Tidak ada channel yang mendengarkan: Telegram menarik lewat long-poll, Discord memegang koneksi WebSocket keluar | Akses jauh hanya lewat Tailscale/WireGuard/SSH |
| T8 | Supply chain plugin | **Tidak ada marketplace, tidak ada dynamic loading** | Dependensi ≤ 25, audit di CI |
| T9 | Ban akun WhatsApp | Dua provider; `allowFrom` wajib; rate limit + jitter; tanpa first-contact | Cloud API sebagai jalan keluar |
| T10 | Biaya lepas kendali | Concurrency 1 run/workspace; timeout 30 mnt; heartbeat mati default | Batas harian opsional + notifikasi |
| T11 | Tidak bisa diaudit | Audit append-only sejak hari pertama | `caraka audit` + retensi |
| T12 | Memory poisoning | Memori berlabel data; injection limit 6 item/800 token; `source` tercatat | `/lupakan`, `supersede` Titen, trace ke bukti, export & review |
| T13 | Spoofing tombol approval | `callback_data` maks 64 byte → simpan payload di DB, kirim id + HMAC | Nonce terikat `(principal, session, request)` |

Satu sel di tabel ini menyebut kontrol yang belum ada di build: `caraka audit`
(T11). Statusnya di §11.

---

## 4. Kontrol wajib (tidak bisa dimatikan)

Ini adalah kontrol yang **tidak** punya opsi konfigurasi untuk dinonaktifkan:

1. **Allowlist tidak boleh kosong** — gateway berhenti dengan pesan cara memperbaiki.
2. **Approval hanya lewat callback bertanda tangan** dengan nonce sekali pakai + TTL. Fallback teks (`ok A7F3`) juga terikat nonce.
3. **Jendela `trusted` wajib kedaluwarsa** (CHECK constraint level database) dan tidak pernah dibuka oleh teks chat. Rinciannya di §5.
4. **Outbound scrubber** selalu aktif.
5. **Audit log** selalu aktif untuk keputusan otorisasi.
6. **Grup tidak pernah mendapat izin tulis/eksekusi** tanpa opt-in eksplisit, dan pengungkapan di grup dinyatakan, bukan dikontrol. Pesan ephemeral **tidak** dipakai sebagai kontrol keamanan di mana pun. Sejak v0.5 kalimat itu berlaku untuk dua platform: ephemeral Discord punya syarat yang berbeda dari Telegram dan sama tidak bisa diandalkannya, jadi kartu approval tidak pernah dikirim ephemeral di channel mana pun, dan tidak ada satu pun jalur yang berubah perilaku ketika ephemeral tidak tersedia.
7. **Bind default `127.0.0.1`.**
8. **Payload callback tidak pernah dipercaya apa adanya** — selalu id + HMAC + nonce yang tervalidasi di server.

### Kenapa ephemeral tidak ada di daftar itu

Versi sebelumnya butir 6 berbunyi "output sensitif di grup selalu **ephemeral**",
dan T6 menyebutnya kontrol cadangan. Keduanya memperlakukan pesan ephemeral
sebagai sesuatu yang selalu tersedia. Bot API tidak menyediakannya begitu.

`receiver_user_id` berlaku "for group and supergroup chats only", dan halaman
*Ephemeral Messages* menulis bahwa bot biasa hanya boleh mengirimnya "within 15
seconds of the incoming eligible action", dengan `callback_query_id` atau
`reply_parameters.ephemeral_message_id` sebagai buktinya. Di luar jendela itu,
syaratnya bot menjadi administrator chat.

Kartu approval Caraka gagal di kedua syarat. Ia datang dari agent, bukan dari aksi
pengguna, dan ia hidup sepuluh menit (`src/core/gateway.ts:283`), empat puluh kali
lebih lama daripada jendelanya. Menjadikan bot admin grup akan
membuka jalur kedua, tetapi sekaligus mematikan privacy mode sehingga bot
menerima setiap pesan di grup. Caraka tidak meminta hak admin grup, jadi ephemeral
tidak tersedia dan tidak diandalkan.

Yang menggantikannya adalah kalimat, bukan mekanisme:

> Memasukkan grup ini ke allowlist berarti memilih untuk memperlihatkan pekerjaan
> itu kepada anggotanya: kartu approval, path berkas, diff, dan keluaran perintah
> akan terbaca setiap anggota grup.

Kalimat itu muncul saat pairing grup, di DM operator, sebelum grup ditulis ke
allowlist. Yang tetap tertutup adalah persetujuannya: callback approval terikat
principal dan `src/core/gateway.ts:357` menolak penekanan dari siapa pun di luar
allowlist, apa pun chat asalnya. Anggota grup bisa membaca kartunya; ia tidak bisa
memutuskannya.

Pairing grup berjalan lewat `my_chat_member`: saat bot ditambahkan, gateway
mengirim permintaan konfirmasi ke DM operator, bukan ke grup itu, supaya yang
mengotorisasi terbukti orang yang sama dengan pemilik pairing DM. Kalimat di atas
adalah isi permintaan itu.

### Access whitelist @BotFather — belum terverifikasi

Bot API 10.0 (8 Mei 2026) menambahkan `BotAccessSettings` dengan field
`is_access_restricted` dan `added_users`, beserta `getManagedBotAccessSettings`
dan `setManagedBotAccessSettings`. Keduanya mengambil `user_id` bot **terkelola**
dan terdokumentasi di bawah Managed Bots.

Apakah bot biasa buatan @BotFather memunculkan tombol yang sama **belum
terverifikasi**. Sampai ada yang membuka @BotFather dan memeriksanya, onboarding
tidak menyarankannya dan allowlist Caraka adalah satu-satunya lapisan yang
dijanjikan.

---

## 5. Model kebijakan

| Mode | Baca | Tulis | Eksekusi | Git push | Deploy/migrasi |
|---|---|---|---|---|---|
| `read-only` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `assisted` **(default DM)** | ✅ | ⚠️ approval | ⚠️ approval | ❌ | ❌ |
| `trusted` (jendela berdurasi, lihat di bawah) | ✅ | ✅ | ✅ | ⚠️ approval | ⚠️ approval |
| grup **(default)** | ✅ | ❌ | ❌ | ❌ | ❌ |

Baris `grup (default)` adalah desain, bukan build. Sampai v0.5 tidak ada gerbang mode di jalur run untuk channel mana pun — grup Telegram maupun guild channel Discord — jadi sebuah pesan dari grup yang sudah di allowlist berjalan dengan aturan yang sama dengan DM. Yang benar-benar membatasi sebuah grup hari ini adalah dua allowlist ditambah pairing yang dikonfirmasi di DM operator, dan approval yang terikat principal pemilik sesi. Karena gerbangnya belum ada, pemetaan role Discord → mode kebijakan (FR-AUTH-06) juga belum dibangun: memetakan sebuah role ke `read-only` sekarang berarti menjanjikan penolakan tulis yang tidak terjadi. Sebuah role Discord tidak pernah, dalam keadaan apa pun, memberi otoritas approval (ADR-0008).

**Daftar aksi berisiko tinggi** (selalu approval, apa pun modenya):
`git push --force*` · `git reset --hard` · `rm -rf` · penghapusan direktori · migrasi database · `terraform apply` · `kubectl apply/delete` · perintah deploy · menulis ke `~/.ssh`, `~/.aws`, `~/.config`, `*.env`, `*.pem`, `id_*` · perintah dengan pipe ke `sh`/`bash` · `curl`/`wget` ke domain tidak dikenal.

### Dua hal berbeda yang sama-sama berarti "tidak perlu menekan setuju"

Ini pembedaan yang paling mudah dikaburkan, dan mengaburkannya adalah cara
tercepat membuat dokumen ini berbohong.

| | Caraka menerima `session/request_permission` | Daftar berisiko tinggi | Audit per aksi | `/lock` |
|---|---|---|---|---|
| **Jendela trust Caraka** | ya | tetap memicu kartu | ada | menutup seketika |
| **`bypassPermissions` Claude** | **tidak** | dilewati | tidak mungkin | tidak berpengaruh pada aksi berjalan |

Baris kedua bukan pilihan desain kami. Adapter `claude-agent-acp` 0.63.0
meneruskan `allowDangerouslySkipPermissions` ke setiap sesi di mesin non-root;
begitu mode itu terpasang, adapter menjawab izin secara lokal dan berhenti
mengirim `session/request_permission` sama sekali. Caraka **tidak** menyetujui
apa pun secara otomatis di mode itu — ia tidak pernah diberi tahu bahwa ada
keputusan. Dokumentasi Claude sendiri menulis bahwa mode itu "offers no
protection against prompt injection or unintended actions" dan menyarankannya
hanya di lingkungan terisolasi.

**Jendela trust Caraka** (tingkat satu). Dibuka dari chat lewat `/yolo <durasi>`,
dan yang membukanya bukan teks itu melainkan **callback bertanda tangan sekali
pakai** yang terikat principal di allowlist. Selama jendela terbuka, Caraka tetap
menerima setiap `session/request_permission`, memilih opsi ber-`kind`
`allow_once` sendiri untuk aksi biasa, dan tetap mengirim kartu bertombol untuk
apa pun yang cocok dengan daftar berisiko tinggi di atas.

Yang berlaku pada jendela ini, dan tidak punya opsi konfigurasi untuk dimatikan:

- Ia tidak pernah dibuka oleh **teks** chat. Perintah `/yolo` hanya menampilkan
  kartu; state berubah setelah tanda tangan dan principal callback-nya terverifikasi.
- Ia tidak pernah menyetel mode agent ke `bypassPermissions`, `acceptEdits`, atau `auto`.
- Ia tidak pernah memilih opsi ber-`kind` `allow_always`, di dalam maupun di luar jendela.
- Ia tidak pernah melebihi batas durasi, dan durasi wajib disebut.
- Ia tidak bertahan melewati restart; gateway menutup setiap jendela sisa saat mulai.
- Ia tidak pernah menghilangkan satu baris audit pun. Aksi yang lolos tanpa kartu
  dicatat dengan `result` `auto`, bukan tidak dicatat.
- `/lock` dari chat menutupnya seketika.

**`bypassPermissions` Claude** (tingkat dua). Dinyalakan hanya dari terminal,
lewat `caraka trust <workspace> --bypass --for <durasi>`. Tidak ada jalur chat
mana pun yang menyalakannya. Alasannya bukan bahwa chat kurang aman untuk
mengotorisasi, karena approval lewat callback bertanda tangan justru aman.
Alasannya adalah bahwa begitu mode itu menyala Caraka tidak punya apa pun lagi
untuk ditegakkan, dan keputusan melepas penjaga sendiri pantas diambil di depan
mesinnya.

Audit untuk tingkat dua mencatat **jendelanya, bukan isinya**: dari kapan sampai
kapan, oleh siapa, untuk workspace mana, dan bahwa keputusan izin selama jendela
itu diambil agent tanpa terlihat Caraka. Berpura-pura mengawasi sesuatu yang
tidak terlihat lebih buruk daripada mengakui tidak melihatnya.

Jendela `--bypass` yang berakhir mengembalikan mode agent. Setelah `/lock` atau
setelah kedaluwarsa, run berikutnya menyetel mode kembali ke `default` dan
mencatat `trust.mode` `restored`; restart tidak membutuhkannya karena proses
adapter ikut mati. Mode itu state sesi di sisi Claude dan `session/load` memakai
sesi yang masih hidup apa adanya, jadi tanpa langkah tersebut jendela yang sudah
tertutup meninggalkan agent yang masih memutuskan sendiri.

Keduanya dikirim di v0.2. Yang menahan jalur ketiga adalah `src/core/gateway.ts`,
yang memilih hanya opsi ber-`kind` `allow_once` dan menolak setiap `optionId`
bernilai `bypassPermissions`, `acceptEdits`, atau `auto`. `ExitPlanMode` benar-benar
mengirim opsi bypass, dan mengirimnya pertama di daftar pada mesin non-root. Tanpa
penjaga itu, opsi tersebut akan menjadi tombol satu ketukan di chat pribadi.

---

## 6. Penanganan rahasia

**Yang tidak pernah kami sentuh:** API key model. Itu milik coding agent. Caraka tidak punya, tidak meminta, tidak menyimpan.

**Yang kami simpan:** kredensial channel (bot token Telegram dan, sejak v0.5, bot token Discord; nanti session Baileys / access token Cloud API) → keychain OS bila tersedia; fallback file `chmod 600` di `~/.caraka/secrets/`. Tidak pernah masuk repo, tidak pernah ke log, tidak pernah ke chat, **tidak pernah ditulis ke `config.yaml`**.

Setiap token yang dimuat proses di-seed ke scrubber sebagai rahasia exact, dan tidak satu pun variabel berawalan `CARAKA_` diwariskan ke proses agent yang di-spawn. Sampai v0.4 penghapusan itu menyebut satu nama, `CARAKA_TELEGRAM_TOKEN`, yang berarti token channel berikutnya akan bocor lewat lubang yang sama; sejak v0.5 yang dihapus adalah awalannya.

**Kenapa Managed Bots tidak dipakai sebagai jalur default:** Bot API 9.6 memungkinkan setup satu ketukan, tetapi token bot mengalir melalui *manager bot* — artinya pihak ketiga sempat memegang kredensial user. Itu bertentangan langsung dengan prinsip di atas. Ditawarkan hanya sebagai opsi eksplisit, dan hanya bila manager bot dijalankan sendiri oleh user.

**Outbound scrubber** — pola yang diredaksi sebelum keluar:
```
sk-[A-Za-z0-9]{20,}          ghp_[A-Za-z0-9]{36}      github_pat_[A-Za-z0-9_]{50,}
AKIA[0-9A-Z]{16}             xox[baprs]-[A-Za-z0-9-]+  eyJ[A-Za-z0-9_-]+\.[...]\.[...]
-----BEGIN [A-Z ]*PRIVATE KEY-----   .*
baris dalam file .env / .env.*
```
Sejak v0.5 daftar itu bertambah satu bentuk: tiga segmen base64url berpisah titik yang **tidak** diawali `eyJ`, yaitu bentuk bot token Discord. Pola JWT di atas mensyaratkan awalan itu, jadi sampai v0.4 token Discord lolos kedua pola dan yang menutupinya hanya seeding exact — dan seeding hanya menutup token yang proses ini kebetulan muat.
Diganti menjadi `[redacted:<jenis>]`. **Ini kontrol paling murah dengan dampak terbesar** — pasang sejak commit pertama.

---

## 7. Isolasi eksekusi

Prinsip: **warisi, jangan bangun ulang.**

| Lapisan | Sumber |
|---|---|
| Sandbox eksekusi | Bawaan agent (mis. preset Codex kami memakai `--sandbox read-only` secara default) |
| Batas direktori | `cwd` dikunci ke root workspace; path di luar workspace dianggap aksi berisiko tinggi |
| Deny-list path | Kebijakan kami, diterapkan sebelum approval ditawarkan |
| Isolasi kuat (opsional) | Jalankan agent di container/VM per workspace — didokumentasikan, tidak diwajibkan |

---

## 8. Jaringan

- Default bind `127.0.0.1`. Flag `--bind 0.0.0.0` mencetak peringatan besar dan mencatat audit event.
- Webhook (WhatsApp Cloud API): verifikasi `X-Hub-Signature-256` wajib; tolak request tanpa signature valid; reverse proxy dengan TLS.
- Telegram: long-polling sebagai default (tidak butuh port terbuka sama sekali) — inilah alasan tambahan menjadikan Telegram channel pertama. **Di v1.0 tidak ada webhook sama sekali**, sehingga seluruh kelas risiko "port terbuka ke internet" tidak berlaku.
- Titen dijalankan lokal (`127.0.0.1:7717`); bila user memilih instans remote, onboarding menyatakan secara eksplisit bahwa data memori akan meninggalkan mesin.
- Tidak ada telemetri keluar. Tanpa pengecualian.

---

## 9. Rate limit & pembatasan

| Batas | Default |
|---|---|
| Pesan per sender | 20/menit |
| Run bersamaan | 1 per workspace |
| Durasi run | 30 menit |
| Approval pending | 5 per sesi |
| Outbound per channel | mengikuti batas channel + jitter |
| Ukuran lampiran masuk | 25 MB |

Melebihi batas → pesan jelas + antrean, bukan diam-diam dibuang.

Sampai v0.1 tabel ini adalah desain, bukan build: tidak ada rate limiter dan tidak
ada batas durasi run di kode, dan satu-satunya timer adalah TTL approval 10 menit
beserta backoff `retry_after`. v0.2 membangun dua barisnya, yaitu 20 pesan per
sender per 60 detik dan batas run 30 menit yang mengirim `session/cancel`. v0.4
membangun baris run bersamaan: satu run aktif per workspace, ditegakkan di level
aplikasi oleh gateway (proses tunggal, satu slot per workspace — tabel `run`
ber-index unik di `erd.md` belum dibangun), dengan antrean FIFO per workspace,
ack bernomor "diantrekan (#n)", dan `/stop` yang membatalkan run milik workspace
pengirimnya saja. Tiga baris sisanya (approval pending, outbound per channel,
ukuran lampiran) **dispesifikasikan, belum dibangun**.

Baris "outbound per channel" tidak berubah statusnya di v0.5, dan ini perlu
dinyatakan karena channel kedua mudah dibaca sebagai kedatangannya. Tidak ada
limiter proaktif di sisi kita untuk channel mana pun. Yang ada adalah reaksi:
Telegram dan Discord sama-sama menjawab 429 dengan menunggu `retry_after` yang
disebut respons lalu mengulang panggilan yang sama. Angka batas Discord tidak
ditulis di dokumen ini karena tidak ada satu pun yang terukur di repo ini
(`standards/ears.md:120`); yang diuji adalah mekanismenya, bukan angkanya.

---

## 10. Privasi

- Semua data lokal. Tidak ada layanan cloud dalam jalur default.
- Transcript diredaksi sebelum disimpan; retensi default 90 hari, dapat diatur.
- Memori dapat diinspeksi (`/memori`), dihapus (`/lupakan`), diekspor, dan **dirunut ke buktinya** — setiap claim Titen menyebut observation asalnya (`GET /v1/claims/:id/evidence`), sehingga "kenapa agent tahu ini?" selalu punya jawaban.
- Titen menyimpan data secara lokal (Bun + SQLite) dan memakai format ekspor yang sama di semua mode — data dapat dibawa keluar kapan saja.
- `NOTES.md` per workspace sengaja berupa file teks biasa — user bisa membaca dan mengedit apa yang "diingat" sistem tentang proyeknya.
- Provider memory remote (Titen instans jauh / MCP) bersifat opt-in dan onboarding harus menyatakan bahwa data akan meninggalkan mesin.

---

## 11. Respons insiden

1. `caraka stop` mengirim SIGTERM ke PID di `~/.caraka/caraka.pid`.
2. `/lock` dari chat menutup jendela trust yang terbuka seketika.
3. `caraka pair revoke --all` mencabut seluruh identitas (**dispesifikasikan, belum di v0.2**).
4. Audit log memberi jejak lengkap: siapa, kapan, aksi apa, disetujui siapa. Membacanya lewat `caraka audit` **dispesifikasikan, belum di v0.2**; sampai ada, tabel `audit` dibaca langsung dari `~/.caraka/caraka.db`.
5. Rotasi kredensial channel didokumentasikan sebagai runbook.
6. `SECURITY.md` di repo dengan jalur pelaporan privat + target respons 72 jam.

Sampai v0.1, `src/cli.ts` melayani `init`, `doctor`, dan `start` saja, dan saklar
mati satu-satunya adalah `Ctrl-C` di terminal yang terlihat. Daftar di atas
menyebut tiga perintah yang tidak ada. v0.2 menambahkan `stop` dan `status`;
`logs`, `pair`, `audit`, `session`, dan `config` masih belum ada.

---

## 12. Yang kami TIDAK klaim

Kejujuran adalah bagian dari postur keamanan:

- Kami **tidak** menjamin agent tidak akan melakukan hal bodoh setelah kamu menyetujuinya.
- Kami **tidak** bisa mencegah prompt injection sepenuhnya — kami hanya memastikan konsekuensinya membutuhkan ketukan manusia.
- Kami **tidak** bisa mencegah WhatsApp memblokir nomormu bila memakai provider tidak resmi.
- Kami **tidak** melihat satu pun keputusan izin selama jendela `--bypass` terbuka, jadi kami tidak mengaudit isinya. Yang tercatat hanya jendelanya.
- Kami **tidak** bisa menyembunyikan pekerjaan dari anggota grup yang kamu masukkan ke allowlist.
- Kami **tidak** melakukan audit keamanan pihak ketiga (belum); status ini akan dinyatakan terbuka sampai berubah.

---

## 13. Checklist sebelum rilis publik

- [ ] Scrubber punya test dengan corpus rahasia sintetis
- [ ] Nonce approval diuji terhadap replay & cross-session
- [ ] Fuzzing parser pesan masuk (teks aneh, unicode, panjang ekstrem)
- [ ] Uji: pesan berisi instruksi injeksi tidak pernah menghasilkan eksekusi tanpa tombol
- [ ] Uji: `bypassPermissions` tidak punya jalur pemanggil di luar `src/cli.ts`
- [ ] Uji: jendela trust tidak pernah berubah state tanpa callback bertanda tangan yang terverifikasi
- [ ] Uji: kalimat pengungkapan grup muncul di kartu pairing sebelum grup masuk allowlist
- [ ] Uji: callback approval dari principal di luar allowlist ditolak, baik dari DM maupun dari grup
- [ ] Uji: `callback_data` yang dipalsukan/di-replay ditolak
- [ ] `npm audit` bersih + dependensi dikunci
- [ ] `SECURITY.md`, kebijakan disclosure, dan halaman risiko WhatsApp tersedia
- [ ] Default config yang dikirim = konfigurasi teraman, bukan yang paling nyaman
