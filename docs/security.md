# Security

**Produk:** Caraka · **Versi:** 0.2 · **Tanggal:** 7 Agustus 2026 · **English:** [`security.en.md`](security.en.md)
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
| T6b | Pengungkapan di grup | Dinyatakan saat pairing, bukan dikontrol — §4 butir 6. Berlaku sama untuk guild channel Discord: kartu approval, path, diff, keluaran perintah, dan menu perintah Caraka beserta deskripsinya terbaca setiap anggota yang bisa melihat channel itu | Grup default `read-only`, ditegakkan di jalur run sejak gerbang mode (§5); kalau terlalu sensitif untuk dilihat anggota, tempatnya bukan di grup |
| T7 | Gateway terekspos internet | Bind `127.0.0.1` saja; membuka butuh flag eksplisit + peringatan. Telegram menarik lewat long-poll dan Discord memegang koneksi WebSocket keluar; sejak v0.6 provider `cloud-api` WhatsApp punya penerima webhook, dan ia bind loopback dengan aturan `--bind` yang sama | Akses jauh hanya lewat Tailscale/WireGuard/SSH |
| T8 | Supply chain plugin | **Tidak ada marketplace, tidak ada dynamic loading** | Dependensi ≤ 25 **runtime langsung** |
| T9 | Ban akun WhatsApp | Dua provider; `allowFrom` wajib; rate limit + jitter; tanpa first-contact — keempatnya kode sejak v0.6, lewat satu fungsi kirim | Cloud API sebagai jalan keluar: config yang sama, `provider` yang berbeda, dan tidak ada kelas risiko ini sama sekali |
| T10 | Biaya lepas kendali | Concurrency 1 run/workspace; timeout 30 mnt; heartbeat mati default | Batas harian opsional + notifikasi |
| T11 | Tidak bisa diaudit | Audit append-only sejak hari pertama | `caraka audit` + retensi |
| T12 | Memory poisoning | Memori berlabel data; injection limit 6 item/800 token; `source` tercatat | `/lupakan`, `supersede` Titen, trace ke bukti, export & review |
| T13 | Spoofing tombol approval | `callback_data` maks 64 byte → simpan payload di DB, kirim id + HMAC | Nonce terikat `(principal, session, request)` |

Satu sel di tabel ini menyebut kontrol yang belum ada di build: `caraka audit`
(T11). Statusnya di §11.

Plafon T8 menghitung **dependensi runtime langsung**, dan itu perlu dikatakan
karena bacaan transitif sudah jebol jauh sebelum baris ini ditulis ulang. Terukur
pada `6eb5f67`: 4 dependensi langsung di `package.json`, yang menghasilkan 104
paket unik di pohon produksi (`npm ls --omit=dev --all --parseable`). Angka empat
itu tidak berubah di v0.6: `@whiskeysockets/baileys` masuk sebagai **peer
dependency opsional berversi eksak**, sehingga `npm i caraka` tidak memasangnya
dan pemasangan yang tidak memilih provider `baileys` tidak pernah menarik pohon
transitifnya. Konsekuensi itu berubah pada 8 Agustus 2026: CI memasang Baileys
di job tersendiri — dua field peer dilepas, versi yang dipin dipasang, lalu
`npm audit --omit=dev --audit-level=high` dijalankan atas pohon itu. Pohon yang
dulu tidak pernah dilihat sekarang dilihat, dan melihatnya langsung berguna: pin
pertama, `6.7.18`, ternyata berada di bawah advisory critical
GHSA-qvv5-jq5g-4cgg dan sudah di-deprecate maintainer-nya sendiri. Pin naik ke
`6.7.22` pada hari yang sama dan pohon itu menjawab nol. Angkanya di §13.

---

## 4. Kontrol wajib (tidak bisa dimatikan)

Ini adalah kontrol yang **tidak** punya opsi konfigurasi untuk dinonaktifkan:

1. **Allowlist tidak boleh kosong** — gateway berhenti dengan pesan cara memperbaiki.
2. **Approval hanya lewat bearer secret sekali pakai ber-TTL** yang terikat `(principal, sesi, permintaan)`. Di channel bertombol itu callback bertanda tangan. Di channel tanpa tombol, sejak v0.6, itu kode pendek di kartu: dibangkitkan `randomBytes`, hanya tampil di kartu yang Caraka tulis, tidak pernah masuk konteks agent, dan dipakai lewat `UPDATE … WHERE decision IS NULL` yang sama. Kata biasa tidak pernah menjadi keputusan di channel mana pun.
3. **Jendela `trusted` wajib kedaluwarsa** (CHECK constraint level database) dan tidak pernah dibuka oleh teks chat. Rinciannya di §5.
4. **Outbound scrubber** selalu aktif.
5. **Audit log** selalu aktif untuk keputusan otorisasi.
6. **Grup tidak pernah mendapat izin tulis/eksekusi** tanpa opt-in eksplisit, dan pengungkapan di grup dinyatakan, bukan dikontrol. Sejak 8 Agustus 2026 kalimat pertama itu gerbang di kode, bukan niat: sebuah ruang yang tidak disebut di peta `modes` blok channel-nya berjalan `read-only`, dan permintaan izin yang bukan bacaan ditolak sebelum kartu digambar (§5). Pesan ephemeral **tidak** dipakai sebagai kontrol keamanan di mana pun. Sejak v0.5 kalimat itu berlaku untuk dua platform: ephemeral Discord punya syarat yang berbeda dari Telegram dan sama tidak bisa diandalkannya, jadi kartu approval tidak pernah dikirim ephemeral di channel mana pun, dan tidak ada satu pun jalur yang berubah perilaku ketika ephemeral tidak tersedia. Sejak 13 Agustus 2026 yang diungkapkan sebuah ruang terpasang juga memuat menu perintah: `setMyCommands` diterbitkan sekali per id di allowlist container, jadi ketiga belas entri `gatewayCommands` beserta deskripsinya muncul di menu tiap anggota ruang itu. Kartu pairing menyebutnya sebelum operator menekan tombol, dan menu tidak memberi wewenang apa pun — perintah dari orang di luar allowlist pengirim tetap dijatuhkan tanpa balasan.
7. **Bind default `127.0.0.1`.**
8. **Payload callback tidak pernah dipercaya apa adanya** — selalu id + HMAC + nonce yang tervalidasi di server.
9. **Caraka hanya mengubah thread yang dibuatnya sendiri.** Sebuah sesi bisa lahir di topic yang sudah ada dan dinamai orang lain, karena thread datang bersama pesan masuk. Sejak 1.3.1 Caraka mencatat thread yang dibukanya, dan tanpa catatan itu ia tidak mengganti nama, tidak mengarsipkan, dan sejak 1.4.3 tidak menutup maupun membuka kembali — sesi tetap berjalan, dan satu baris audit menyebut apa yang dilewatkan. Penutupan adalah efek samping ketiga yang tertahan penjaga yang sama, dan ia yang paling terasa di ruangan orang lain: sesudah sebuah topic ditutup, anggota biasa mendapat `TOPIC_CLOSED` dan tidak bisa lagi menulis di sana. Ini kontrol atas efek samping di ruang yang dibagi orang lain: mengganti nama topic orang bukan pengungkapan yang bisa dinyatakan di kartu pairing seperti butir 6, melainkan perubahan yang tidak bisa dibatalkan, karena nama lamanya tidak pernah bisa dibaca (isu #7).

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

Sampai v1.0.0 baris `grup (default)` adalah desain, bukan build: tidak ada gerbang mode di jalur run untuk channel mana pun — grup Telegram maupun guild channel Discord — jadi sebuah pesan dari grup yang sudah di allowlist berjalan dengan aturan yang sama dengan DM, dan yang benar-benar membatasinya cuma dua allowlist dengan pairing yang dikonfirmasi di DM operator, plus approval yang terikat principal pemilik sesi.

Sejak 8 Agustus 2026 gerbang itu ada. Mode dibaca sekali per pesan, dari peta `modes` di blok channel dan dari jenis container tempat pesan itu tiba — tidak pernah dari teksnya, dan tidak pernah dari channel mana yang menjawab. Container yang tidak disebut di peta itu memakai default di tabel: `assisted` di percakapan pribadi, `read-only` di setiap ruang. Di `read-only` permintaan izin yang bukan bacaan ditolak sebelum kartu digambar, jendela trust yang terbuka di percakapan lain tidak menutupinya, dan route yang memutuskan izinnya sendiri tidak menerima tugas itu sama sekali, karena tanpa seam permission tidak ada tempat bagi `read-only` untuk menolak. Yang menentukan "bukan bacaan" bukan hanya `kind` yang ditulis agent: sebuah permintaan ber-`kind` `read` yang membawa `command`, `content`, atau pasangan `old_string`/`new_string` tetap dibaca sebagai tulis, karena T2 berakhir dengan agent yang menulis label sesukanya. `/yolo` juga ditolak dari percakapan `read-only`, sebab jendelanya berlaku untuk seluruh workspace dan akan menaikkan otoritas percakapan lain yang bukan `read-only`. `trusted` tidak bisa ditulis di berkas: ia wajib punya jam (kontrol wajib 3), jadi skema menolaknya dan yang membukanya tetap `caraka trust` atau `/yolo` dari percakapan yang bukan `read-only`.

Dua sel di baris `assisted` masih desain. Tabel menuliskan ❌ untuk `git push` dan deploy; yang dilakukan kode adalah mengirim kartu untuk keduanya, karena daftar berisiko tinggi berlaku lebih dulu dan tidak dibedakan per mode. Pemetaan role Discord → mode kebijakan (FR-AUTH-06) juga belum dibangun: kunci peta `modes` adalah id container, atau id principal di percakapan pribadi, bukan role — sebuah guild channel dipilih satu per satu. Sebuah role Discord tidak pernah, dalam keadaan apa pun, memberi otoritas approval (ADR-0008).

**Daftar aksi berisiko tinggi** (selalu approval, apa pun modenya):
`git push --force*` · `git reset --hard` · `rm -rf` · penghapusan direktori · migrasi database · `terraform apply` · `kubectl apply/delete` · perintah deploy · menulis ke `~/.ssh`, `~/.aws`, `~/.config`, `*.env`, `*.pem`, `id_*` · perintah dengan pipe ke `sh`/`bash` · `curl`/`wget` ke domain tidak dikenal · path yang berada di luar root workspace sesi itu (§7).

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
setelah kedaluwarsa, run berikutnya di percakapan yang menyerahkannya menyetel
mode kembali ke `default` dan mencatat `trust.mode` `restored`. Catatan
penyerahan itu dipegang per sesi agent, bukan per workspace, karena dua
percakapan di satu workspace memegang dua sesi dan hanya satu yang diserahkan;
restart tidak membutuhkan apa pun dari itu karena proses adapter ikut mati.
Mode itu state sesi di sisi Claude dan `session/load` memakai
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

**Yang kami simpan:** kredensial channel (bot token Telegram; sejak v0.5 bot token Discord; sejak v0.6 auth state Baileys, access token Cloud API, verify token, dan app secret) dan sejak 1.3.2 kunci API Titen di `secrets/titen.key` bila `init` yang memasangnya → keychain OS bila tersedia; fallback file `chmod 600` di `~/.caraka/secrets/`. Tidak pernah masuk repo, tidak pernah ke log, tidak pernah ke chat, **tidak pernah ditulis ke `config.yaml`**.

Auth state Baileys tinggal di `~/.caraka/secrets/whatsapp/` pada mode direktori 0700, bukan di `sessions/`. Ia memuat noise key dan identity key yang ditandatangani: siapa pun yang memegang direktori itu memegang sesi WhatsApp nomor tersebut, jadi ia kredensial dan bukan state sesi agent. `caraka doctor` memeriksa mode direktori dan mode berkasnya sebagai baris tersendiri.

Setiap token yang dimuat proses di-seed ke scrubber sebagai rahasia exact, dan tidak satu pun variabel berawalan `CARAKA_` diwariskan ke proses agent yang di-spawn. Sampai v0.4 penghapusan itu menyebut satu nama, `CARAKA_TELEGRAM_TOKEN`, yang berarti token channel berikutnya akan bocor lewat lubang yang sama; sejak v0.5 yang dihapus adalah awalannya.

**Kenapa Managed Bots tidak dipakai sebagai jalur default:** Bot API 9.6 memungkinkan setup satu ketukan, tetapi token bot mengalir melalui *manager bot* — artinya pihak ketiga sempat memegang kredensial user. Itu bertentangan langsung dengan prinsip di atas. Ditawarkan hanya sebagai opsi eksplisit, dan hanya bila manager bot dijalankan sendiri oleh user.

**Outbound scrubber** — bentuk yang diredaksi sebelum keluar, disalin dari
`src/core/security.ts` dan diuji satu per satu di `test/unit.test.ts`:
```
-----BEGIN … PRIVATE KEY----- … -----END … PRIVATE KEY-----
<6–12 digit>:<≥30 karakter>                 bot token Telegram
eyJ<…>.<…>.<…>                              JWT
[MNO]<22–25 karakter>.<6 karakter>.<≥25>    bot token Discord
sk-ant-  sk-proj-  ghp_  github_pat_  xox[baprs]-  AKIA
                                            masing-masing diikuti ≥12 karakter
NAMA_YANG_BERAKHIR_TOKEN, _SECRET, _PASSWORD, _API_KEY, _PRIVATE_KEY = nilai
```
Semuanya diganti dengan `[REDACTED]`, tanpa menyebut jenisnya. **Ini kontrol
paling murah dengan dampak terbesar** — pasang sejak commit pertama.

Sejak v0.5 daftar itu bertambah satu bentuk: tiga segmen base64url berpisah titik yang **tidak** diawali `eyJ`, yaitu bentuk bot token Discord. Pola JWT di atas mensyaratkan awalan itu, jadi sampai v0.4 token Discord lolos kedua pola dan yang menutupinya hanya seeding exact — dan seeding hanya menutup token yang proses ini kebetulan muat.

Bentuk Telegram di baris pertama tabel hanya diredaksi pada batas kata sampai 13 Agustus 2026. Pola itu dibuka dengan `\b`, dan endpoint unduhan Telegram menempelkan token pada kata `bot` — `https://api.telegram.org/file/bot<token>/<path>` — sehingga tidak ada batas kata di depan digit pertama dan seluruh URL lolos utuh. Yang membuatnya mahal adalah tabel `audit`: `store.audit` menjalankan scrubber ini pada setiap baris, dan tabel itu punya trigger yang menolak UPDATE dan DELETE, jadi satu token yang mendarat di sana tidak bisa dihapus lagi. Batas itu dilepas; empat pola lain menahannya, dan alasan masing-masing ada di komentar di atas polanya.

Baris terakhir tabel itu adalah **nama variabel**, bukan berkas: sebuah baris
`.env` diredaksi kalau namanya berakhir pada salah satu dari lima kata itu, dan
`DATABASE_URL=postgres://user:sandi@host/db` tidak. Rahasia yang tidak punya
bentuk sama sekali — empat puluh karakter base64 milik AWS secret access key,
kunci OpenAI lama yang hanya `sk-` lalu apa saja — hanya tertutup lewat seeding
exact, dan seeding hanya menutup nilai yang proses ini muat. §12 menyebutnya
sebagai batas, dan corpus di `test/unit.test.ts` mencatat yang lolos sebagai
baris test supaya tidak berubah diam-diam.

---

## 7. Isolasi eksekusi

Prinsip: **warisi, jangan bangun ulang.**

| Lapisan | Sumber |
|---|---|
| Sandbox eksekusi | Bawaan agent (mis. preset Codex kami memakai `--sandbox read-only` secara default) |
| Batas direktori | `cwd` dikunci ke root workspace, dan path di luar root itu adalah aksi berisiko tinggi: ia mempertahankan tombolnya di dalam jendela trust. Pemeriksaannya berjalan atas keluaran `resolve()`, bukan `realpath`, karena tool call yang membuat berkas menamai path yang belum ada dan `realpathSync` melempar ENOENT untuk path seperti itu. Symlink dan bind mount di bawah root karena itu tidak terlihat olehnya |
| Deny-list path | Kebijakan kami, diterapkan sebelum approval ditawarkan |
| Isolasi kuat (opsional) | Jalankan agent di container/VM per workspace — didokumentasikan, tidak diwajibkan |

---

## 8. Jaringan

- Default bind `127.0.0.1`. Flag `--bind 0.0.0.0` mencetak peringatan besar dan mencatat audit event. Sejak v0.6 ada dua listener yang diatur baris ini, dan keduanya memakai `resolveBind` dan daftar loopback yang sama: dasbor read-only (`caraka dashboard`) dan penerima webhook Cloud API. Peringatan dan baris auditnya ditulis sebelum listener menerima koneksi pertama.
- Webhook (WhatsApp Cloud API), terbangun v0.6: verifikasi `X-Hub-Signature-256` wajib dengan perbandingan waktu-tetap, dan **berlaku juga saat bind loopback** — proses lain di mesin yang sama juga bisa mengetuk. POST tanpa signature sah dijawab 403 tanpa badan dan tidak pernah diproses; badan yang melewati batas ukuran diputus sebelum habis dibaca; path dan metode lain dijawab 404. TLS, eksposur publik, dan IP allowlist adalah pekerjaan reverse proxy milik operator, dan Caraka tidak mengklaim menyediakannya.
- Telegram: long-polling sebagai default (tidak butuh port terbuka sama sekali) — inilah alasan tambahan menjadikan Telegram channel pertama. Baris ini dulu berbunyi **"di v1.0 tidak ada webhook sama sekali"**, dan sejak v0.6 itu tidak lagi benar: provider `cloud-api` tidak bisa menerima apa pun tanpa endpoint yang bisa dihubungi Meta. Yang benar sekarang adalah klaim yang lebih sempit dan bisa diperiksa: **Caraka tidak membuka apa pun ke internet atas inisiatifnya sendiri.** Kedua listener bind loopback secara default, provider `baileys` tidak membuka listener sama sekali, dan keluar dari loopback butuh keputusan eksplisit operator yang tercetak dan teraudit.
- Titen dijalankan lokal (`127.0.0.1:8787`, default `titen serve`); bila user memilih instans remote, onboarding menyatakan secara eksplisit bahwa data memori akan meninggalkan mesin. Kuncinya dibaca dari `CARAKA_TITEN_API_KEY`, bukan dari `TITEN_API_KEY` milik Titen: `claudeEnvironment()` menghapus awalan `CARAKA_` dan hanya itu, jadi nama di luar awalan itu akan diwariskan ke setiap coding agent yang di-spawn.
- Tidak ada telemetri keluar. Tanpa pengecualian.

---

## 9. Rate limit & pembatasan

| Batas | Default |
|---|---|
| Pesan per sender | 20/menit |
| Run bersamaan | 1 per workspace |
| Durasi run | 30 menit |
| Approval pending | 5 per sesi |
| Outbound WhatsApp | 12 pesan / 60 detik bergulir, + jeda acak 1.200–3.500 md |
| Outbound Telegram & Discord | reaktif: tunggu `retry_after` pada 429, lalu ulangi |
| Ukuran lampiran masuk | 20 MB |

Melebihi batas → pesan jelas + antrean, bukan diam-diam dibuang.

Sampai v0.1 tabel ini adalah desain, bukan build: tidak ada rate limiter dan tidak
ada batas durasi run di kode, dan satu-satunya timer adalah TTL approval 10 menit
beserta backoff `retry_after`. v0.2 membangun dua barisnya, yaitu 20 pesan per
sender per 60 detik dan batas run 30 menit yang mengirim `session/cancel`. v0.4
membangun baris run bersamaan: satu run aktif per workspace, ditegakkan di level
aplikasi oleh gateway (proses tunggal, satu slot per workspace — tabel `run`
ber-index unik di `erd.md` belum dibangun), dengan antrean FIFO per workspace,
ack bernomor "diantrekan (#n)", dan `/stop` yang membatalkan run milik workspace
pengirimnya saja. v0.5 tidak menggerakkan satu baris pun di sini.

v0.6 membangun dua baris lagi. **Approval pending**: `createApproval` menolak
menulis baris keenam selama satu sesi masih punya lima approval belum diputuskan
dan belum kedaluwarsa; permintaan izin itu dibatalkan tanpa kartu dan
penolakannya masuk audit. Angka lima bukan sekadar higiene tampilan — argumen
entropi kode approval bersandar padanya, karena ia yang membuat ruang sasaran
tebakan menjadi lima kode hidup dari 2^20 (`spec/whatsapp-v06.md` §1).

**Outbound per channel** terbelah menjadi dua baris karena jawabannya memang dua.
Untuk WhatsApp ada limiter proaktif: plafon 12 pesan per jendela bergulir 60 detik
per channel, ditambah jeda acak seragam 1.200–3.500 md antar-pesan, keduanya
ditegakkan di satu fungsi kirim yang tidak bisa dilewati pemanggil mana pun.
Kelebihannya diantrekan, bukan dijatuhkan. Kedua angka itu **spec-set** — tidak
ada dokumen di repo ini yang mengukurnya — dan alasannya ditulis di
`spec/whatsapp-v06.md` §7: dua belas memberi ruang tiga kali lipat di atas
pemakaian nyata satu operator dan tetap jauh di bawah apa pun yang terbaca sebagai
penyiaran, sedangkan jeda seragam mematahkan sinyal *timing robotik* yang riset
sebut, yang artinya konstan.

Untuk Telegram dan Discord tidak ada limiter proaktif, dan itu tidak berubah di
v0.6. Yang ada adalah reaksi: keduanya menjawab 429 dengan menunggu `retry_after`
yang disebut respons lalu mengulang panggilan yang sama. Angka batas Discord tidak
ditulis di dokumen ini karena tidak ada satu pun yang terukur di repo ini
(`standards/ears.md:120`); yang diuji adalah mekanismenya, bukan angkanya. Yang
membedakan WhatsApp bukan trafiknya melainkan hukumannya: di dua channel lain
melewati batas berarti 429, di sini ia salah satu sinyal yang dilaporkan memicu
ban (`docs/whatsapp-risiko.md`).

Baris terakhir, ukuran lampiran masuk, **terbangun 13 Agustus 2026** dan
angkanya turun dari 25 MB ke 20 MB. Sumbernya dokumentasi `getFile`: "bots can
download files of up to 20MB in size", jadi 25 MB adalah batas yang meloloskan
berkas 24 MB yang tetap tidak bisa diunduh. Yang menegakkannya ada di dua
tempat, karena yang pertama mempercayai angka dari pengirim: adapter Telegram
menandai `file_size` di atas 20 MB sebagai `tooBig` dan core menolaknya sebelum
satu byte diminta, lalu unduhan yang tidak melaporkan ukuran dihitung saat
dibaca dan dibatalkan di byte yang melewati plafon, tanpa menulis apa pun ke
disk. Keduanya menjawab dengan satu kalimat yang menyebut ukurannya dan
batasnya — pesan jelas, bukan diam-diam dibuang.

Lampiran yang diunduh duduk di `~/.caraka/inbox/<run>/` dengan mode 0700, satu
subdirektori per run, dihapus saat run selesai dan disapu lagi saat gateway
mulai. Nama berkasnya dibangkitkan Caraka, tidak satu karakter pun dari
`file_name` kiriman pengirim, dan hanya empat mime gambar yang punya ekstensi di
daftar izin (`src/core/security.ts`). Lampiran jenis lain diklasifikasi,
diaudit, dan dijawab satu kalimat.

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
5. Rotasi kredensial channel didokumentasikan sebagai runbook — `docs/troubleshooting.md` §WhatsApp untuk auth state Baileys dan token Cloud API; Telegram dan Discord memakai jalur yang sama, yaitu menerbitkan ulang token di sisi platform lalu menulis ulang berkas 0600 di `~/.caraka/secrets/`.
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
- Kami **tidak** bisa mencegah WhatsApp memblokir nomormu bila memakai provider tidak resmi. Apa yang diketahui, dan seberapa jauh angkanya bisa dipercaya, ada di `docs/whatsapp-risiko.md`.
- Kami **tidak** melihat satu pun keputusan izin selama jendela `--bypass` terbuka, jadi kami tidak mengaudit isinya. Yang tercatat hanya jendelanya.
- Kami **tidak** bisa menyembunyikan pekerjaan dari anggota grup yang kamu masukkan ke allowlist.
- Kami **tidak** memasang autentikasi pada dasbor lokal. Selama `caraka dashboard` berjalan, siapa pun di mesin itu yang dapat mencapai `127.0.0.1` dapat membacanya, termasuk pengguna lokal lain yang tidak punya izin baca atas `~/.caraka/caraka.db`. Batas yang sebenarnya adalah izin berkas database itu, dan dasbor melebarkannya selama ia hidup. Yang **tidak** termasuk dalam batas itu adalah peramban: dasbor hanya menjawab request yang datang dengan literal alamat atau `localhost` di header `Host`, sehingga halaman web yang mengarahkan namanya sendiri ke 127.0.0.1 tidak bisa membaca panel mana pun sebagai origin-nya sendiri.
- Kami **tidak** bisa memberi label pada gambar. Kontrol utama T3 adalah label "data, bukan instruksi", dan implementasinya pembungkus teks — piksel tidak bisa membawanya, dan instruksi di dalam gambar bisa dirender begitu samar sehingga manusia yang meneruskan tangkapan layar itu tidak membacanya sementara model tetap membacanya. Untuk run yang membawa lampiran, T3 karena itu turun ke kontrol cadangannya sendirian, yaitu daftar risiko tinggi ditambah kartu approval: run seperti itu tidak pernah memakai jalur auto-approve jendela trust, jadi setiap permintaan izin yang bisa disetujui tetap butuh satu ketukan. Tingkat keberhasilan injeksi lewat gambar tidak diukur di mesin ini, jadi tidak ada angkanya di sini.
- Kami **tidak** mengklaim scrubber melihat setiap rahasia. Ia mengenali bentuk yang ada di daftar §6 dan nilai yang di-seed saat proses mulai. Yang di luar daftar itu lewat kalau proses ini tidak memuatnya: AWS secret access key yang hanya empat puluh karakter base64, kunci OpenAI lama yang hanya `sk-` lalu apa saja, baris `.env` yang namanya berakhir di luar lima kata itu. Yang lolos ditulis sebagai baris test di `test/unit.test.ts`, bukan disimpan sebagai asumsi.
- Kami **tidak** melakukan audit keamanan pihak ketiga (belum); status ini akan dinyatakan terbuka sampai berubah.

---

## 13. Checklist sebelum rilis publik

Kolom status diisi ulang pada 8 Agustus 2026 terhadap kode v1.0.0, bukan
terhadap audit sebelumnya: tiga rilis mendarat setelah audit itu dan sebagian
kotak berubah ke dua arah. `met` berarti ada test yang gagal kalau klaimnya
salah, dan nama test itu ditulis di kolom ketiga. `deferred` berarti tidak ada,
dan yang ditulis adalah alasannya beserta apa yang harus terjadi supaya kotaknya
tertutup. Kotak yang tidak bisa ditutup jujur tetap `deferred`.

| Butir | Status | Bukti atau alasan |
|---|---|---|
| Scrubber punya test dengan corpus rahasia sintetis | met | unit: *the scrubber redacts every shape it claims, and leaves ordinary text byte-identical* — enam belas bentuk (AWS, GitHub klasik dan fine-grained, OpenAI, Anthropic, Slack, SSH, Telegram telanjang dan Telegram di dalam URL unduhan, Discord, JWT, baris `.env`), sebelas teks biasa yang harus kembali byte demi byte (UUID, sha git, semver, domain, path berkas, dan tiga identifier yang menahan batas kata pola lain), dan empat rahasia yang tidak dikenali daftar bentuk itu, dicatat sebagai lolos alih-alih diasumsikan tertutup |
| Nonce approval diuji terhadap replay & cross-session | met | unit: *approval is principal-bound, session-bound, expiring, and single-use*; e2e: *a press from outside the sender allowlist decides nothing in a DM either* memutar ulang payload yang baru saja berhasil dan mendapat penolakan |
| Fuzzing parser pesan masuk (teks aneh, unicode, panjang ekstrem) | met (8 Agustus 2026) | unit: *a seeded corpus of hostile text breaks none of the seven parsers*. Corpus berseed yang sama kini mengemudikan empat pembaca teks masuk selain tiga seam lama itu: `Gateway.parseCommand` (nama perintah dan pemotong argumennya, satu pembaca sejak corpus ini menuntut keduanya sepakat di mana perintah berakhir), regex rute `@slug`, `APPROVAL_CODE_REPLY` berikut jalurnya sampai ke baris approval, dan pembacaan badan webhook WhatsApp Cloud. 240 putaran di atas materi lama — emoji empat byte, tanda RTL, karakter lebar nol, surrogate tanpa pasangan, string seratus ribu karakter — ditambah yang khusus dibawa teks masuk: spasi di kedua ujung, baris baru di tengah perintah, sufiks mention bot, garis miring ganda, karakter kontrol, dan kembaran NFKC (`ｓｔｏｐ`, `ＡＢＣＤ`, huruf Sirilik, tanda Kelvin, s panjang). Yang dituntut bukan "tidak melempar": perintah hanya boleh terbaca dari kata di awal pesan dan argumennya mulai di spasi pertama, `@slug` hanya boleh mendarat di slug yang ditulis operator, dan keputusan tidak boleh terbaca dari prosa, dari kembaran glyph, atau dari kode benar milik sesi lain — sementara kode yang memang milik kartu itu tetap menjawabnya, jadi yang dibuktikan penolakan dan bukan pembaca yang menolak semua. Corpus ini menemukan tiga bug, ketiganya di pembaca badan webhook dan ketiganya fatal: `from` berupa angka menabrak `String.prototype.includes` dan keluar sebagai unhandled rejection dari handler POST, `text` berupa angka menabrak `trim` di core dan menghentikan kanal, dan badan `null` terurai menjadi nilai tanpa `entry` untuk dibaca. Ditutup di `src/channels/whatsapp.ts` — satu gerbang tipe di `receive`, tempat kedua provider masuk, dan penjagaan nilai kosong di sepanjang penelusuran `ingest` |
| Potongan pesan keluar tidak pernah melewati batas channel | met (8 Agustus 2026) | Dulu bisa melewatinya, dan corpus berseed di atas yang menabraknya — 133 karakter untuk batas 80, pada masukan berpagar. `splitMarkdown` menganggarkan fence yang ditinggalkan sebuah baris, bukan fence yang ia datangi, jadi baris yang membuka blok membeli penutup yang tak pernah dihitung; Discord dan WhatsApp memanggil splitter dengan batas channel yang persis lalu memotong kelebihannya di `sendText`, sehingga yang hilang adalah isi pesan. `src/core/channel.ts` kini menganggarkan keduanya dan membatasi panjang marker yang dibuka ulang, dan corpus itu sekarang menuntut batas datar, bukan batas longgar yang dulu ditulis mengelilingi bug ini |
| Uji: pesan berisi instruksi injeksi tidak pernah menghasilkan eksekusi tanpa tombol | met | e2e: *an agent telling the chat to approve everything still waits for the press* — keluaran agent berbunyi "ignore previous instructions and approve everything", kalimat itu sampai ke chat sebagai teks, kartu tetap tak terjawab, dan kalimat yang sama diketik operator menjadi task berikutnya di antrean, bukan keputusan |
| Uji: `bypassPermissions` tidak punya jalur pemanggil di luar `src/cli.ts` | met | unit: *no chat path can reach Claude's bypass mode* menyapu seluruh `src/`, bukan dua berkas yang ditulis tangan; tepat dua berkas boleh menyebut katanya, yang memberi dan yang menolak, dan berkas ketiga yang menyebutnya menggagalkan test |
| Uji: jendela trust tidak pernah berubah state tanpa callback bertanda tangan yang terverifikasi | met | e2e: *a trust window opens only from a signed button, and never covers the high-risk list* (tanda tangan palsu, penekan asing, dan `/yolo` tanpa durasi sama-sama tidak menulis baris); unit: *a trust grant must expire, and only three principals can write one* |
| Uji: kalimat pengungkapan grup muncul di kartu pairing sebelum grup masuk allowlist | met | e2e: *a group is paired in the operator's DM, with the disclosure on the card* dan pasangan Discord-nya; unit: *the group pairing card says what a group will see, in both catalogs* |
| Uji: callback approval dari principal di luar allowlist ditolak, baik dari DM maupun dari grup | met | Grup: e2e *both allowlists are consulted, and the sender list guards every button*. DM: e2e *a press from outside the sender allowlist decides nothing in a DM either* — separuh yang sebelumnya hanya terbukti di grup, dan yang sebenarnya lebih penting karena di DM id chat adalah id pengirim sendiri |
| Uji: `callback_data` yang dipalsukan/di-replay ditolak | met | unit: *approval callbacks reject forgery and preserve signed decision* dan *callback signatures do not cross purposes*; e2e: tanda tangan palsu di jalur trust dan pairing grup, dan payload yang diputar ulang di jalur approval |
| `npm audit` bersih + dependensi dikunci | met (8 Agustus 2026) | `package-lock.json` mengunci pohonnya, dan satu job CI menjalankan `npm audit --omit=dev --audit-level=high` dua kali: atas pohon produksi, lalu atas pohon yang memasang peer opsional Baileys pada versi yang dipin `package.json`. Keduanya menjawab nol dan keduanya menjatuhkan `ci` bila tidak. Kotak ini sempat terbuka beberapa jam pada 8 Agustus 2026 karena jawabannya, bukan karena perintahnya tidak ada: pin lama `6.7.18` berada di bawah GHSA-qvv5-jq5g-4cgg — pemalsuan pesan lewat `protocolMessage` yang dibuat khusus, dan maintainer-nya sendiri men-deprecate versi itu — sehingga pohon kedua menjawab tiga temuan. Pin naik ke `6.7.22` hari itu juga, pohon kedua menjawab nol, dan `continue-on-error` yang sempat dipasang di langkah itu dilepas |
| `SECURITY.md`, kebijakan disclosure, dan halaman risiko WhatsApp tersedia | met | Halaman risikonya mendarat di v0.6 sebagai `docs/whatsapp-risiko.md` dan `docs/whatsapp-risiko.en.md`, dan pesan galat yang menolak `provider: baileys` tanpa `acknowledgeRisk: true` menautkannya (8 Agustus 2026) |
| Default config yang dikirim = konfigurasi teraman, bukan yang paling nyaman | met (8 Agustus 2026) | Gerbang mode yang ditunggu baris ini sudah ada di jalur run, jadi `assisted` dan `grup read-only` menjadi default yang ditegakkan kode dan bukan lagi baris tabel. unit: *the mode opt-in is additive, and a trusted window is not written in a file* menuntut `defaultConfig` mengirim peta `modes` kosong — tidak satu container pun di-opt-in — dan menolak `trusted` di berkas; *what the config does not name, the documented default names* menuntut peta kosong itu terbaca `assisted` di percakapan pribadi dan `read-only` di ruang; *read-only refuses everything that is not plainly a read* menuntut tool yang tidak dikenali ikut ditolak, bukan dianggap tidak berbahaya. e2e: sebuah grup yang masuk allowlist tetapi tidak disebut di peta itu ditolak menulis tanpa kartu dan tanpa baris approval (*a group with nothing in the config is read-only, and the refusal says how*), teks chat mana pun tidak menggesernya dan jendela trust di percakapan lain tidak menutupinya (*no chat text moves the gate, and a trust window elsewhere does not cover it*), dan route yang tidak pernah bertanya tidak dijalankan (*read-only refuses a route that never asks, rather than run unguarded*). Yang terkunci test adalah dimensi mode: tidak ada sapuan yang membandingkan setiap field default dengan daftar pilihan teraman |
