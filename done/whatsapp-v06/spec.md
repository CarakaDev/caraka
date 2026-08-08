# Spec — Fase 6: WhatsApp sebagai channel ketiga (v0.6)

**Slug:** whatsapp-v06 · **Tanggal:** 8 Agustus 2026 · **Status:** aktif
**Induk:** `spec/v10.md` (kampanye v1.0, lingkup butir 6) · **Roadmap:** `docs/roadmap.md:123`

Baris yang dikutip diukur pada commit `6eb5f67` (release 0.5.0). Angka yang tidak
punya sumber di `docs/` ditandai **spec-set** dan alasannya ditulis di §7.

## Latar

Fase 6 menanyakan satu hal (`docs/roadmap.md:125`): bisakah kita menyediakan
WhatsApp tanpa membakar nomor pengguna. Enam butirnya (`:127-132`) adalah dua
provider, mode linear, fallback approval kode, rate limit dan larangan
first-contact di level kode, alur peringatan risiko, dan uji lapangan 14 hari.

Yang dulu menghalangi sudah tidak ada. Seam `Channel` mendarat di v0.5
(`src/core/channel.ts:152`), Discord memakainya (`src/channels/discord.ts:198`),
dan gateway memegang daftar channel yang tidak pernah dibandingkan namanya
(`AGENTS.md:55`). WhatsApp karena itu bukan abstraksi baru. Ia implementasi
ketiga dari kontrak yang sudah dipakai dua channel, dan sebagian besar
perilakunya sudah ada:

- **Mode linear gratis.** `header()` (`src/core/gateway.ts:739-743`) menulis
  `[ws · #id]` untuk setiap sesi tanpa `threadId`, dan sudah dipanggil di
  sembilan titik keluaran. Channel dengan `caps.threads: false` mendapatkannya
  tanpa satu baris pun kode core baru.
- **Pemecahan markdown sudah bersama.** `splitMarkdown()`
  (`src/core/channel.ts:102`) memotong di batas pagar dan membuka kembali pagar
  yang terpotong.
- **Allowlist ganda sudah wajib.** `allowFrom` bertipe `.min(1)` di skema
  (`src/config.ts:26`), jadi channel tanpa `allowFrom` sudah menolak start hari
  ini (FR-SETUP-05, `docs/frd.md:23`).
- **Scrubber sudah menjadi corong.** Setiap outbound core melewati
  `this.scrub()` sebelum menyentuh channel (`src/core/gateway.ts:621`, `:635`).

Yang benar-benar baru di wave ini ada empat: transport WhatsApp untuk dua
provider, approval tanpa tombol, batas outbound yang belum pernah dibangun untuk
channel mana pun (`docs/security.md:251`, `:265`), dan postur ban.

### Postur ban, dan kenapa ia menentukan bentuk kode

Baileys adalah hasil reverse-engineering protokol WhatsApp Web multi-device;
login lewat QR sebagai *linked device*
(`docs/research/channel-chat-indonesia-baileys-telegram-multi-sumber.md:41`).
Risiko ban **nyata dan tidak dapat diprediksi** (`:46`). Isu OpenClaw #23093
melaporkan pola konkret: session logout berulang, 401, lalu ban, terutama
sesudah reconnect atau saat bridge mengirim balasan (`:47`). Sinyal deteksi yang
dilaporkan adalah reply-ratio rendah, jarak contact-graph, timing robotik, dan
IP datacenter (`:48`). Estimasi umum 2–8 minggu bila perilaku memicu detektor;
satu analisis 600+ akun SMB India melaporkan 68% kena minimal satu ban dalam 12
bulan (`:49`). Wrapper anti-ban tidak menjamin apa pun (`:50`).

Yang menguntungkan kita adalah profil pemakaian, bukan trik: satu nomor, satu
operator, hanya membalas percakapan yang sudah ada, tidak pernah menghubungi
orang asing, volume rendah, reply-ratio mendekati 100% (`:53`). Karena itu lima
mitigasi di riset (`:76-81`) dan di `docs/security.md:44` (T9) harus berupa kode
yang bisa gagal, bukan kalimat di dokumen. Itulah AC-8.

---

## 1. Keputusan — approval lewat kode, dan rekonsiliasi empat dokumen

### Kontradiksinya nyata dan keduanya P0

| Membaca "tidak pernah teks" | Membaca "ada fallback kode" |
|---|---|
| `AGENTS.md:56` aturan keras 2 | `docs/security.md:60` kontrol wajib 2: "Fallback teks (`ok A7F3`) juga terikat nonce" |
| `docs/frd.md:37` FR-CHAN-02 (P0): "Permission ditolak bila `caps.buttons` bernilai false; approval tidak pernah berpindah ke teks chat" | `docs/design.md:252`: "kecuali fallback kode `ok A7F3`, yang juga terikat nonce" |
| `spec/v10.md` AC-5.3 | `docs/adr/0004:29`: channel tanpa tombol memakai kode pendek, tetap terikat nonce |
| `src/core/gateway.ts:1105-1114` sudah menegakkannya: izin dibatalkan dan diaudit `unsupported` | `docs/frd.md:137` FR-APPR-04 (P0); `docs/ui-ux.md:165`; `docs/erd.md:191` kolom `short_code` |

Diam bukan pilihan: satu channel tanpa tombol akan mendarat di wave ini, dan
kode hari ini menolak setiap permintaan izin dari channel seperti itu. Dibiarkan
apa adanya, WhatsApp menjadi channel tempat agent tidak pernah bisa meminta izin
apa pun, dan tidak ada yang pernah memutuskan itu.

### Yang memutuskan bukan kata "ok"

Artefak pemutusnya adalah `A7F3`, bukan `ok`. Kode itu:

- dibangkitkan server-side dari `randomBytes`, tidak tertebak;
- **hanya tampil di dalam kartu approval** yang Caraka tulis ke operator;
- terikat `(principal, session, request)` dan berumur TTL yang sama, 10 menit
  (`src/core/gateway.ts:1143`);
- sekali pakai lewat `UPDATE ... WHERE decision IS NULL` yang sama dengan jalur
  tombol (`src/store/db.ts:368`).

Itu bearer secret yang sama dengan yang dibawa `callback_data` bertanda tangan,
diangkut lewat satu-satunya transport yang dipunyai channel ini. Prompt
injection bisa memproduksi kata "ya" — dan itulah tepatnya yang ditolak
`docs/adr/0004:35`. Ia tidak bisa memproduksi `A7F3`, karena ia tidak pernah
melihatnya: kartu approval adalah keluaran Caraka ke operator, dan keluaran
Caraka tidak pernah masuk ke konteks agent.

**Pembacaan yang mengikat: "teks" dalam aturan keras 2 berarti teks yang tak
terautentikasi.** Aturan itu diamendemen supaya mengatakan yang sebenarnya
dijaga, dan FR-CHAN-02 mengikutinya (AC-12.1). `spec/v10.md` AC-5.3 butuh
carve-out yang sama; ia spec induk yang masih in-flight, jadi ia diperbarui di
PR yang sama (`AGENTS.md:81`).

### Bentuk yang dipilih: kolom `short_code`, bukan truncasi HMAC

Dua bentuk mungkin. Truncasi HMAC atas id approval tidak butuh perubahan skema,
tetapi verifikasinya harus memindai setiap approval pending untuk pasangan
`(principal, sesi)` dan menghitung ulang MAC untuk masing-masing. Kolom
`short_code` sudah dispesifikasikan di `docs/erd.md:191`, membuat verifikasi
menjadi satu pernyataan berindeks, dan membuat kodenya material acak yang berdiri
sendiri, bukan potongan sebuah MAC.

Dipilih: **kolom `short_code`**, ditambahkan lewat `ALTER TABLE` yang dijaga
`PRAGMA`, mengikuti pola yang sudah ada di `src/store/db.ts:125-136`. Prefiks
purpose HMAC (`c`/`t`/`g`, `src/core/security.ts:52`) tidak dipakai untuk kode:
kode tidak ditandatangani, ia dicari, dan pengikatannya ditegakkan oleh klausa
`WHERE` yang sama dengan `resolveApproval` (`src/store/db.ts:355-370`).

### Kenapa 2^20, dan apa yang membatasi ruang tebakan

Alfabet 32 simbol (A–Z tanpa `I` dan `O`, ditambah 2–9) × 4 karakter =
**1.048.576 kemungkinan**. Bentuk empat karakter dipertahankan karena itulah yang
dijanjikan `docs/ui-ux.md:165` dan yang bisa diketik di ponsel; `A7F3` tetap sah
di alfabet ini.

Ruang tebakan dibatasi tiga hal, dan hanya satu di antaranya sudah ada:

1. **Pengirim harus lolos allowlist lebih dulu.** Jalur kode memakai pemeriksaan
   yang persis sama dengan jalur tombol (`src/core/gateway.ts:322` untuk pesan,
   `:1231` untuk callback). Orang di luar `allowFrom` tidak pernah sampai ke
   parser kode. Sudah ada hari ini.
2. **Lima approval pending per sesi** (`docs/security.md:250`). Baris itu
   **dispesifikasikan, belum dibangun** (`docs/security.md:265`), dan wave ini
   membangunnya (AC-4.3) justru karena argumen entropi bersandar padanya: dengan
   maksimum lima kode hidup sekaligus, ruang sasaran adalah 5 dari 1.048.576.
3. **Lima percobaan salah per (principal, sesi) per TTL** (AC-4.1, spec-set).
   Peluang salah satu dari lima kode hidup tertebak dalam lima percobaan
   ≈ 25/1.048.576, sekitar 1 banding 42.000, dan TTL 10 menit menutup jendelanya.

Satu properti tambahan yang harus ditegakkan: pesan berbentuk kode **tidak
pernah diteruskan ke agent**, cocok maupun tidak (AC-3.5, AC-3.10). Tanpa itu,
kode yang salah ketik menjadi prompt, dan bentuk kodenya bocor ke konteks agent.

---

## 2. Keputusan — dependensi

`docs/techstack.md:57` memilih `@whiskeysockets/baileys` untuk jalur tidak
resmi dan `:58` memilih Graph API langsung lewat `fetch`, tanpa SDK, untuk jalur
resmi. Yang perlu diputuskan adalah bagaimana keduanya hidup berdampingan dengan
plafon dependensi (`docs/security.md:43`, T8) dan target ukuran paket
(`docs/frd.md:203`, NFR-05).

**Cloud API tidak butuh dependensi.** `POST /{phoneNumberId}/messages`, unduh
dan unggah media, serta webhook adalah HTTP biasa. Preseden persisnya adalah
Discord di v0.5: REST lewat `fetch` bawaan dan `WebSocket` global, nol dependensi
baru.

**Baileys tidak bisa diperlakukan begitu.** Protokol multi-device memakai Noise
handshake dan Signal (libsignal) untuk pertukaran kunci, ditambah protobuf.
Menuliskannya sendiri berarti ribuan baris kriptografi di dalam anggaran core
~8.000 baris (`AGENTS.md:19`); itu bukan penghematan dependensi, itu penulisan
ulang pustaka kriptografi.

**Keputusan:** baileys menjadi **peer dependency opsional dengan versi eksak**
(`peerDependenciesMeta.optional: true`), bukan `dependencies` dan bukan
`optionalDependencies`. Alasannya mekanis: npm memasang `optionalDependencies`
secara default, sehingga setiap pemasangan Telegram-saja tetap menyeret pohon
transitif Baileys; peer opsional tidak dipasang otomatis. Modulnya dimuat lewat
`await import()` di balik switch provider (`docs/techstack.md:138`), mengikuti
preseden `src/cli.ts:151-153`, dan ketiadaannya menghasilkan pesan yang menyebut
perintah pemasangan persis (AC-5.5).

**Plafon ≤ 25 menghitung dependensi runtime langsung, dan `docs/security.md:43`
harus mengatakannya.** Bukan pilihan retoris; bacaan transitif sudah jebol hari
ini, tanpa satu baris pun kode WhatsApp. Terukur pada `6eb5f67`:

| Ukuran | Nilai | Perintah |
|---|---|---|
| Dependensi runtime langsung | 4 | `package.json` |
| Paket unik di pohon produksi | 104 | `npm ls --omit=dev --all --parseable \| sed 's\|.*/node_modules/\|\|' \| sort -u \| wc -l` |
| Tarball paket | 154.336 byte | `npm pack --dry-run --json` |
| Paket terbuka | 587.086 byte | `npm pack --dry-run --json` |

Empat dependensi langsung menghasilkan 104 paket. Plafon 25 yang dibaca
transitif berarti repo ini melanggarnya empat kali lipat sejak sebelum wave ini
dimulai. NFR-05 (<15 MB) diukur pada paket yang diterbitkan, dan keputusan peer
opsional adalah yang menjaga angka itu tetap benar untuk pemasangan yang tidak
memilih baileys.

---

## 3. Keputusan — webhook

`docs/security.md:237` menulis "Di v1.0 tidak ada webhook sama sekali" dan
`docs/frd.md:187` (FR-OPS-01) mengikat bind ke `127.0.0.1`. Cloud API butuh
endpoint yang bisa dihubungi Meta. Kalimat itu sudah pernah diamendemen sekali
untuk dasbor read-only di v0.5, dan bentuk amendemennya adalah preseden yang
dipakai di sini.

**Keputusan (mengambil bacaan brief, dengan dua pengetatan):**

1. Provider `baileys` mendarat **tanpa listener apa pun**. Socket keluar, seperti
   long-polling Telegram.
2. Provider `cloud-api` mendarat lengkap dengan penerima webhook-nya, karena
   tanpa jalur masuk ia bukan bridge; menunda inbound berarti mengirim satu-satunya
   provider yang bisa kena ban dan menahan jalan keluarnya (`docs/security.md:44`,
   kolom "Cloud API sebagai jalan keluar").
3. Listener itu **bind `127.0.0.1` secara default**, dan alamat lain hanya lewat
   flag eksplisit yang mencetak peringatan dan menulis audit sebelum koneksi
   pertama diterima. Mekanismenya sudah ada dan tidak ditulis ulang: `resolveBind`
   dan `LOOPBACK_HOSTS` (`src/dashboard/server.ts:385-407`) sudah dipakai
   `src/cli.ts:663-665` untuk dasbor. Host dan port sampai ke channel sebagai
   opsi dari `src/cli.ts`, sehingga `src/channels/` tidak pernah mengimpor
   `src/dashboard/` (`AGENTS.md:41`).
4. **Pengetatan 1:** verifikasi `X-Hub-Signature-256` wajib (`docs/security.md:236`),
   dengan perbandingan waktu-tetap, dan berlaku juga saat bind loopback. Loopback
   bukan zona percaya; proses lain di mesin yang sama juga bisa mengetuk.
5. **Pengetatan 2:** TLS, eksposur publik, dan IP allowlist adalah pekerjaan
   reverse proxy milik operator
   (`docs/research/keamanan-agent-remote-arxiv-openclaw-acp.md:80`), dan Caraka
   mengatakannya di dokumen, tidak mengklaim menyediakannya.

`docs/security.md:237` diamendemen menjadi pernyataan yang benar: Caraka tidak
membuka apa pun ke internet sendiri; satu listener dasbor dan satu listener
webhook keduanya loopback secara default, dan keduanya butuh keputusan eksplisit
operator untuk keluar dari sana.

---

## 4. Keputusan — direktori sesi

`docs/security.md:202` menyebut session Baileys sebagai kredensial channel:
keychain OS bila tersedia, fallback berkas `chmod 600` di `~/.caraka/secrets/`,
tidak pernah ke `config.yaml`. `docs/design.md:41` menyebut `sessions/` dalam
daftar state lokal.

**Keputusan: `~/.caraka/secrets/whatsapp/` menang.** Auth state Baileys memuat
noise key dan identity key yang ditandatangani; siapa pun yang memegang direktori
itu memegang sesi WhatsApp nomor tersebut. Itu kredensial, bukan state sesi
agent, dan `docs/security.md:202` sudah menamainya. Preseden mode sudah ada di
`src/config.ts:157-163`: `secrets/` dibuat 0700, berkas ditulis 0600 lewat
`atomicSecret` (`:150-155`), dan `privateFile()` (`:196-199`) sudah dipakai
`caraka doctor` untuk memeriksanya. `docs/design.md:41` diamendemen supaya
`sessions/` tidak terbaca sebagai tempat kredensial.

---

## 5. Keputusan — di mana first-contact ditolak

Filter masuk tidak bisa menegakkannya. `allowFrom` dan `allowChats` hanya bisa
menolak pesan yang **sudah datang**; first-contact justru pengiriman ke pihak
yang tidak pernah menulis. Satu-satunya tempat yang melihat semua calon penerima
adalah sisi kirim.

Pilihannya dua: corong kirim core (`sendText` `src/core/gateway.ts:610-630`, yang
sudah memegang `blockedChats` di `:620`), atau fungsi kirim milik channel.

**Keputusan: fungsi kirim milik channel WhatsApp.** Aturan ini kebijakan sebuah
channel, bukan kebijakan core; menaruhnya di core berarti core memegang konsep
yang hanya berlaku untuk satu channel, dan itu pelanggaran aturan keras 1 dalam
bentuk yang tidak tertangkap grep. Selain itu aturan yang sama di core akan
memutus pemberitahuan startup ke operator di semua channel
(`src/core/gateway.ts:278-295`), yang menurut definisi ini adalah first-contact.

Konsekuensi yang harus dijaga sebagai AC: channel tidak boleh punya jalur tulis
ke transport di luar fungsi itu (AC-8.8), dan riwayat masuk dihitung dari pesan
yang benar-benar diterima proses ini, bukan dari daftar kontak WhatsApp
(AC-8.9). Scrubber tidak terlewat: setiap outbound core sudah discrub sebelum
memanggil channel (`src/core/gateway.ts:621`, `:635`), jadi penjagaan di sisi
channel berada **sesudah** scrubber, bukan menggantikannya.

---

## 6. Keputusan — caps yang dideklarasikan

`docs/api.md:196`: mendeklarasikan caps yang tidak dimiliki lebih buruk daripada
mendeklarasikan sedikit. `docs/api.md:188` mencatat `edit`, `files`, `typing`,
`rich`, dan `ephemeral` sebagai rencana karena tidak punya pembaca.

Wave ini menambahkan **satu** field, `edit`, karena wave ini juga menulis
pembacanya: jalur progres di `src/core/gateway.ts:805-825` mengedit satu pesan
dan Cloud API tidak punya endpoint edit. Setelah wave ini `ChannelCaps` berisi
empat field, masing-masing dengan pembaca:

| Cap | Pembaca | WhatsApp |
|---|---|---|
| `threads` | `topicsAvailable()` `src/core/gateway.ts:679` | `false` (kedua provider) |
| `buttons` | kartu approval `src/core/gateway.ts:1105` | `false` (kedua provider) |
| `edit` | jalur progres `src/core/gateway.ts:805-825` (**baru**) | `true` baileys, `false` cloud-api |
| `maxChars` | ekor buffer progres `src/core/gateway.ts:814` | 4.096 |

`rich`, `files`, `typing`, dan `ephemeral` **tetap tidak dideklarasikan.**
WhatsApp memang bisa mengirim berkas, dan hasil panjang memang dikirim sebagai
satu berkas (`docs/ui-ux.md:168`), tetapi keputusan itu diambil di dalam channel
persis seperti `FILE_AFTER_CHUNKS` di Discord (`src/channels/discord.ts:40`,
`:288`); core tidak menanyakannya, jadi sebuah cap untuk itu adalah janji tanpa
pemeriksa. Konvensi lampiran `MEDIA:<path>` (`docs/frd.md:40`) yang akan menjadi
pembaca sesungguhnya belum dibangun untuk channel mana pun dan bukan pekerjaan
wave ini (§Yang tidak dikerjakan).

Nama provider: **`cloud-api`**, mengikuti `docs/frd.md:38` (P0) dan draft config
riset (`:64-74`). `docs/design.md:272` yang menulis `cloud` diamendemen.

---

## 7. Keputusan — angka

Satu angka punya sumber. Sisanya ditetapkan di sini, dan setiap baris spec-set
membawa alasannya. Aturan `standards/ears.md` §3 dipatuhi dengan menandai, bukan
dengan menulis tebakan seperti fakta.

| Nilai | Angka | Status |
|---|---|---|
| Jarak minimum antar-update progres | 30 detik | **bersumber**: `docs/ui-ux.md:166` |
| TTL approval | 10 menit | **bersumber**: `src/core/gateway.ts:1143`, `docs/ui-ux.md:132` |
| Approval pending per sesi | 5 | **bersumber**: `docs/security.md:250` (dispesifikasikan sejak awal, dibangun di wave ini) |
| Plafon outbound | 12 pesan / 60 detik bergulir, per channel | spec-set |
| Jeda antar-outbound | acak seragam 1.200–3.500 md | spec-set |
| Entropi kode approval | 4 karakter × alfabet 32 simbol = 2^20 | spec-set |
| Percobaan kode salah | 5 per (principal, sesi) per TTL | spec-set |
| Backoff reconnect awal | 5 detik | spec-set |
| Faktor backoff | 2, dengan jitter penuh | spec-set |
| Plafon backoff | 300 detik | spec-set |
| Menyerah sesudah | 6 kegagalan berturut-turut | spec-set |
| Sambungan dianggap pulih sesudah | 60 detik terbuka | spec-set |
| Sesi yang didaftar `/status` di wadah linear | 5 terbaru | spec-set |
| `maxChars` | 4.096 | spec-set |

**12 pesan per 60 detik.** Satu run mengirim ack, kadang satu kartu approval, dan
satu hasil. Operator tunggal yang membalas percakapan yang sudah ada tidak
menghasilkan lebih dari beberapa pesan per menit. Dua belas memberi ruang tiga
kali lipat di atas pemakaian nyata dan tetap jauh di bawah apa pun yang terbaca
sebagai penyiaran. Bentuknya menyalin `rateDelay()`
(`src/core/gateway.ts:552-562`): jendela bergulir 60 detik, kelebihan
**diantrekan**, bukan dijatuhkan (`docs/security.md:249`).

**Jeda 1.200–3.500 md, seragam.** Sinyal yang disebut riset (`:48`) adalah timing
*robotik*, artinya konstan. Distribusi seragam sudah mematahkannya dan berharga
satu baris; distribusi normal tidak membeli apa pun yang bisa diukur di repo ini.
Batas bawah 1,2 detik menjaga dua pesan tidak pernah keluar dalam satu tick.

**Backoff 5 detik, ×2, plafon 300 detik, menyerah di percobaan keenam.** Discord
memakai plafon 30 detik (`src/channels/discord.ts:41`) karena di sana reconnect
hanya merepotkan. Di sini reconnect adalah pemicu ban yang dilaporkan (`:47`),
jadi plafonnya sepuluh kali lipat dan percobaannya berhingga. Enam percobaan
menghabiskan sekitar lima menit; sesudah itu, mencoba lagi bukan pemulihan
melainkan pengulangan pola yang persis dilaporkan isu #23093.

**Pulih sesudah 60 detik terbuka.** Penghitung enam percobaan hanya berarti bila
ia tidak direset oleh sambungan yang langsung putus lagi. Tanpa jendela ini,
tautan yang berkedip — tersambung, terautentikasi, jatuh — mengembalikan
penghitung ke nol setiap siklus, plafonnya tidak pernah tiba, dan jeda tetap di
5 detik selamanya: persis pola reconnect yang plafon itu ada untuk mencegah.
Enam puluh detik cukup panjang untuk memisahkan sambungan yang jadi dari
sambungan yang gagal, dan cukup pendek untuk tidak menghukum putus yang wajar.

**Lima sesi di `/status`.** Wadah tanpa thread mengumpulkan satu sesi per tugas,
jadi jawaban yang mendaftar semuanya tumbuh bersama transkrip. Lima adalah
jumlah yang masih terbaca dalam satu pesan dan cukup untuk menjawab "yang
tadi mana".

**`maxChars` 4.096.** Batas body pesan teks Cloud API. Tidak ada dokumen di repo
ini yang memuatnya, jadi ia ditandai spec-set; baileys memakai angka yang sama
sebagai irisan jujur dua provider. `docs/ui-ux.md:167` yang menulis "praktis
pendek" diganti angka ini.

---

## Lingkup

1. `src/channels/whatsapp.ts` — implementasi `Channel` ketiga, dua provider di
   balik satu `id`, transport Cloud API di atas `fetch`.
2. `src/channels/whatsapp-baileys.ts` — satu-satunya berkas yang mengimpor
   `@whiskeysockets/baileys`, dimuat lewat `await import()`. Ia terpisah supaya
   `import()` benar-benar malas.
3. `caps.edit` di `src/core/channel.ts` dan pembacanya di jalur progres.
4. Approval lewat kode di `src/core/gateway.ts` dan kolom `short_code` di
   `src/store/db.ts`, dengan batas percobaan dan plafon lima approval pending.
5. Blok config `whatsapp:`, rahasia di `~/.caraka/secrets/`, `caraka init
   whatsapp`, baris `caraka doctor`.
6. Penerima webhook Cloud API, loopback secara default.
7. Lima mitigasi ban sebagai kode yang bisa gagal.
8. `docs/whatsapp-risiko.md` (baru), amendemen dokumen di §AC-12, runbook
   `docs/troubleshooting.md`.

## Yang tidak dikerjakan

- **Grup WhatsApp.** Protokol perangkat tertaut menyebut grup itu sendiri
  sebagai pengirim, jadi setiap anggota tiba sebagai satu principal dan setiap
  anggota membaca kode approval di kartu yang sama. Memisahkan wadah dari
  pengirim (`key.participant`) bisa dilakukan, tetapi ia butuh model dua daftar
  yang punya pembuktian sendiri. Sampai itu ada, `receive()` menolak jid yang
  bukan satu lawan satu, `allowChats` tidak ada di blok config, dan tidak ada
  kalimat di mana pun yang menjanjikan grup.
- **`caraka init whatsapp`** (langkah 8 plan). Wizard-nya tidak dibangun di wave
  ini, jadi **AC-8.3, AC-8.10, dan AC-10.6 belum terpenuhi** dan tidak boleh
  dianggap tertutup. Gerbang risiko yang ada adalah `superRefine` di
  `src/config.ts` — `acknowledgeRisk: true` ditulis tangan, bukan diketik
  sesudah membaca peringatan — ditambah `whatsapp.riskNotice` yang dicetak
  setiap `caraka start`. Kredensial Cloud API ditulis tangan ke
  `~/.caraka/secrets/`, tanpa panggilan verifikasi.
- **Bulk messaging dalam bentuk apa pun.** Maintainer Baileys melarangnya
  (`riset:51`) dan tidak ada permukaan di Caraka yang memintanya.
- **First contact.** Tidak ada perintah, tidak ada config, tidak ada jalur kode
  yang bisa memulai percakapan baru.
- **Uji lapangan 14 hari** (`docs/roadmap.md:132`, DoD `:134`). Bukti manusia,
  dipindah pasca-rilis oleh `spec/v10.md` dengan tanggal keputusan 8 Agustus
  2026. Kotaknya **tidak dicentang**, dan `site/src/data/status.ts` harus cocok.
- **`npm publish`.** Menunggu pemilik (`spec/v10.md` AC-7.3).
- **Konvensi lampiran `MEDIA:<path>`** (`docs/frd.md:40`). Belum ada untuk
  channel mana pun; membangunnya menyentuh Telegram dan Discord sekaligus, jadi
  ia pekerjaan sendiri (`AGENTS.md:81`).
- **Template Cloud API, jendela 24 jam, dan biaya per pesan.** Caraka membalas
  percakapan yang sudah ada; template hanya diperlukan untuk memulai
  percakapan, yang tidak pernah kita lakukan.
- **Keychain OS.** `docs/security.md:202` menyebutnya "bila tersedia"; berkas
  0600 adalah fallback yang sudah dipakai dua channel.
- **Halaman risiko di situs.** Dokumennya ditulis di wave ini; halaman
  `caraka.dev` masuk Fase 7 bersama dokumentasi dwibahasa
  (`docs/roadmap.md:141`).

---

## Acceptance criteria

### AC-1 · Channel ketiga di kontrak yang sudah ada

- **AC-1.1** Channel WhatsApp shall mengimplementasikan `Channel`
  (`src/core/channel.ts:152`) tanpa menambah satu pun method pada interface.
- **AC-1.2** `src/core/` shall tidak memuat perbandingan atas `channel.id`
  maupun literal `"whatsapp"`.
- **AC-1.3** WHERE `caps.threads` bernilai false, setiap balasan shall diawali
  header `[ws · #id]` yang dihasilkan `header()` (`src/core/gateway.ts:739-743`),
  tanpa kode mode linear yang baru di core.
- **AC-1.4** WHERE `caps.threads` bernilai true, gateway shall tetap membuka satu
  thread per sesi dan tetap mengirim balasan tanpa header, seperti sebelum wave
  ini.
- **AC-1.5** IF `createTopic` dipanggil pada channel WhatsApp, THEN channel shall
  melempar error bernama yang menyebut bahwa WhatsApp tidak punya thread.
- **AC-1.6** WHERE blok `whatsapp:` ada di config, `caraka start` shall memuat
  modul channelnya.
- **AC-1.7** WHERE blok `whatsapp:` tidak ada, `caraka start` shall tidak memuat
  satu baris pun dari modul itu.
- **AC-1.8** WHERE `caps.threads` bernilai false dan sebuah wadah memuat lebih
  dari satu sesi aktif, `/status` shall mendaftar seluruh sesi itu sebagai teks
  (`docs/session-model.md:147`).
- **AC-1.9** WHERE `caps.threads` bernilai true, `/status` shall tetap melaporkan
  satu sesi milik thread tempat ia dipanggil.
- **AC-1.10** Sesi WhatsApp shall disimpan dengan `chat_id` ber-namespace
  channel, seperti Discord, sehingga rute Telegram lama tetap resolve.

### AC-2 · Caps jujur dan `caps.edit`

- **AC-2.1** `ChannelCaps` shall memuat tepat empat field (`threads`, `buttons`,
  `edit`, `maxChars`), dan setiap field shall punya pembaca di `src/core/`.
- **AC-2.2** `caps.threads` dan `caps.buttons` channel WhatsApp shall bernilai
  false untuk kedua provider.
- **AC-2.3** `caps.edit` shall bernilai true untuk provider `baileys` dan false
  untuk provider `cloud-api`.
- **AC-2.4** WHERE `caps.edit` bernilai false, gateway shall tidak memanggil
  `editText` sama sekali dan tidak mengirim pesan progres tambahan sesudah ack
  pertama.
- **AC-2.5** WHERE `caps.edit` bernilai true, channel WhatsApp shall mengabaikan
  permintaan edit yang datang kurang dari 30 detik sesudah edit terakhir pada
  pesan yang sama, dan menyelesaikannya tanpa panggilan keluar
  (`docs/ui-ux.md:166`).
- **AC-2.6** `caps` shall tidak memuat `rich`, `files`, `typing`, atau
  `ephemeral` (`docs/api.md:196`).
- **AC-2.7** `caps.maxChars` channel WhatsApp shall bernilai 4.096, dan
  pemecahan hasil shall memakai `splitMarkdown` (`src/core/channel.ts:102`).
- **AC-2.8** WHEN sebuah hasil melebihi tiga pecahan, channel shall mengirimnya
  sebagai satu berkas `.md` (`docs/ui-ux.md:168`).
- **AC-2.9** Setiap pecahan shall punya jumlah pagar code block genap.

### AC-3 · Approval lewat kode sekali pakai

- **AC-3.1** WHERE `caps.buttons` bernilai false, gateway shall membangkitkan
  satu kode untuk setiap permintaan izin, menyimpannya pada baris approval yang
  sama, dan menampilkannya hanya di dalam kartu approval.
- **AC-3.2** WHERE `caps.buttons` bernilai true, gateway shall tidak
  membangkitkan kode dan tidak menampilkan kode di kartu mana pun.
- **AC-3.3** Kode shall dibangkitkan dari `randomBytes` sebagai 4 karakter dari
  alfabet 32 simbol yang tidak memuat `I`, `O`, `0`, dan `1`.
- **AC-3.4** Kode shall unik di antara approval yang belum diputuskan pada sesi
  yang sama.
- **AC-3.5** WHEN pesan `ok <kode>` atau `no <kode>` tiba di wadah sebuah channel
  tanpa tombol, gateway shall memutuskan approval yang terikat `(principal
  pengirim, sesi wadah itu, kode)` dan shall tidak meneruskan pesan itu ke agent.
- **AC-3.6** IF kode benar tetapi pengirimnya bukan principal pemilik approval,
  THEN gateway shall menolak, menulis satu baris audit, dan tidak memutuskan
  apa pun.
- **AC-3.7** IF kode benar tetapi tiba di wadah yang bukan wadah sesi pemilik
  approval, THEN gateway shall menolaknya.
- **AC-3.8** Pemakaian kode shall lewat `UPDATE ... WHERE decision IS NULL` yang
  sama dengan jalur tombol (`src/store/db.ts:368`), sehingga pemakaian kedua
  ditolak.
- **AC-3.9** IF kode dipakai sesudah TTL 10 menit lewat, THEN gateway shall
  menolaknya dan approval tetap berakhir sebagai kedaluwarsa.
- **AC-3.10** WHEN pesan berbentuk kode tiba tetapi tidak cocok dengan approval
  mana pun, gateway shall menjawab bahwa kode tidak berlaku dan tetap tidak
  meneruskan pesan itu ke agent.
- **AC-3.11** Dua approval pending pada sesi yang sama shall punya kode berbeda,
  dan kode salah satunya shall tidak memutuskan yang lain.
- **AC-3.12** Kode shall tidak pernah muncul di baris audit, di log, maupun di
  prompt yang dikirim ke agent.
- **AC-3.13** WHERE `caps.buttons` bernilai false, kartu approval shall menyebut
  kedua bentuk balasan dan masa berlakunya.
- **AC-3.14** WHERE `caps.buttons` bernilai true, pesan berbentuk kode shall
  diperlakukan sebagai teks biasa dan diteruskan ke agent seperti sebelumnya.

### AC-4 · Batas percobaan dan plafon approval pending

- **AC-4.1** IF lima kode salah diterima dari satu principal untuk satu sesi di
  dalam satu TTL, THEN gateway shall berhenti menerima kode untuk sesi itu sampai
  approval yang tertunda diputuskan atau kedaluwarsa.
- **AC-4.2** Setiap kode salah shall menulis satu baris audit yang menyebut
  principal dan sesinya.
- **AC-4.3** IF sebuah sesi sudah punya lima approval yang belum diputuskan,
  THEN permintaan izin keenam shall ditolak tanpa kartu dan penolakannya tercatat
  di audit (`docs/security.md:250`).
- **AC-4.4** Percobaan yang gagal shall tidak memperpanjang TTL approval.
- **AC-4.5** WHEN batas percobaan tercapai, gateway shall mengatakannya di chat
  satu kali, bukan pada setiap pesan berikutnya.

### AC-5 · Dependensi

- **AC-5.1** `dependencies` di `package.json` shall tetap berisi empat entri.
- **AC-5.2** `@whiskeysockets/baileys` shall tercantum sebagai peer dependency
  opsional dengan versi eksak, sehingga `npm i caraka` tidak memasangnya.
- **AC-5.3** Provider `cloud-api` shall bekerja tanpa dependensi baru, memakai
  `fetch` bawaan.
- **AC-5.4** Modul baileys shall hanya di-`import()` bila provider `baileys`
  terpilih.
- **AC-5.5** IF provider `baileys` terpilih dan modulnya tidak terpasang, THEN
  `caraka start` shall berhenti dengan pesan yang memuat perintah pemasangan
  persis beserta versi yang dipin, dan tanpa stack trace.
- **AC-5.6** `docs/security.md:43` shall menyatakan bahwa plafon 25 menghitung
  dependensi runtime langsung, dengan angka terukur pada `6eb5f67`: 4 langsung,
  104 paket di pohon produksi.
- **AC-5.7** `npm pack --dry-run` shall melaporkan paket terbuka di bawah 15 MB
  (`docs/frd.md:203`).

### AC-6 · Webhook Cloud API

- **AC-6.1** WHERE provider `baileys` dipilih, Caraka shall tidak membuka
  listener apa pun.
- **AC-6.2** WHERE provider `cloud-api` dipilih, listener webhook shall bind
  `127.0.0.1` bila tidak ada flag yang menyebut alamat lain
  (`docs/frd.md:187`).
- **AC-6.3** WHEN flag bind menamai alamat di luar daftar loopback, `caraka
  start` shall mencetak peringatan dan menulis satu baris audit sebelum listener
  menerima koneksi pertama.
- **AC-6.4** IF sebuah POST tiba tanpa `X-Hub-Signature-256` yang sah, THEN
  listener shall menjawab 403 tanpa badan dan tidak memproses isinya
  (`docs/security.md:236`).
- **AC-6.5** Perbandingan signature shall memakai perbandingan waktu-tetap.
- **AC-6.6** AC-6.4 shall berlaku juga saat listener bind loopback.
- **AC-6.7** WHEN GET handshake tiba dengan `hub.verify_token` yang cocok,
  listener shall mengembalikan `hub.challenge` apa adanya; IF tidak cocok, THEN
  ia shall menjawab 403.
- **AC-6.8** Listener shall menjawab 404 untuk path dan metode lain, dan tidak
  menyajikan berkas apa pun.
- **AC-6.9** Listener shall menolak badan request yang melebihi batas ukuran dan
  tidak pernah membaca badan tak terbatas ke memori.
- **AC-6.10** `docs/security.md:237` shall diamendemen sehingga kalimat "Di v1.0
  tidak ada webhook sama sekali" diganti oleh keadaan yang sebenarnya.

### AC-7 · Kredensial dan direktori sesi

- **AC-7.1** Auth state baileys shall disimpan di `~/.caraka/secrets/whatsapp/`
  dengan mode direktori 0700 dan mode berkas 0600.
- **AC-7.2** Access token Cloud API dan webhook verify token shall dibaca dari
  env atau dari berkas 0600 di `~/.caraka/secrets/`, dan shall tidak pernah
  ditulis ke `config.yaml` (`docs/security.md:202`).
- **AC-7.3** WHEN `caraka doctor` dijalankan, ia shall memeriksa mode direktori
  dan berkas rahasia WhatsApp dan melaporkannya sebagai baris tersendiri.
- **AC-7.4** Access token dan verify token yang dimuat proses shall di-seed ke
  scrubber sebagai rahasia exact.
- **AC-7.5** Kode pairing shall hanya ditulis ke stdout proses, dan shall tidak
  pernah dikirim ke chat mana pun. *Diamendemen 8 Agustus 2026:* kalimat ini
  dulu menyebut QR di terminal `caraka init whatsapp`. Payload `qr` Baileys
  adalah bahan gambar QR, dan tidak ada renderer di repositori ini maupun ruang
  untuk dependensi yang jadi renderer, jadi yang dipakai adalah
  `requestPairingCode` — delapan karakter yang bisa diketik. `caraka init
  whatsapp` sendiri belum dibangun (lihat *Yang tidak dikerjakan*), jadi kode itu
  dicetak oleh `caraka start` saat perangkat belum tertaut.
- **AC-7.6** `docs/design.md:41` shall diamendemen sehingga `sessions/` tidak
  terbaca sebagai tempat kredensial.

### AC-8 · Lima mitigasi ban sebagai kode

- **AC-8.1** IF blok `whatsapp:` punya `allowFrom` kosong, THEN `caraka start`
  shall berhenti dengan pesan yang menyebut `whatsapp` dan cara memperbaikinya
  (`docs/frd.md:23`).
- **AC-8.2** IF provider `baileys` dipilih dan `acknowledgeRisk` bukan `true`,
  THEN `caraka start` shall berhenti dengan pesan yang menautkan
  `docs/whatsapp-risiko.md` (`docs/frd.md:24`).
- **AC-8.3** WHEN `caraka init whatsapp` memilih `baileys`, wizard shall
  menampilkan peringatan nomor terpisah dan risiko ban, dan shall menulis
  `acknowledgeRisk: true` hanya sesudah operator mengetik konfirmasi.
- **AC-8.4** Outbound WhatsApp shall dibatasi 12 pesan per jendela bergulir 60
  detik per channel, dan kelebihannya diantrekan, bukan dijatuhkan.
- **AC-8.5** Antara dua outbound WhatsApp shall ada jeda acak seragam
  1.200–3.500 md.
- **AC-8.6** IF penerima sebuah outbound tidak punya riwayat pesan masuk dan
  tidak ada di `allowFrom`, THEN channel shall menolak mengirim, melempar error
  bernama, dan menulis satu baris audit.
- **AC-8.7** WHERE penerima ada di `allowFrom`, channel shall mengirim meski
  belum ada riwayat masuk, sehingga pemberitahuan startup ke operator tetap jalan
  (`src/core/gateway.ts:278-295`).
- **AC-8.8** Channel WhatsApp shall tidak punya jalur tulis ke transport di luar
  satu fungsi kirim, dan fungsi itu shall menegakkan AC-8.4 sampai AC-8.6.
- **AC-8.9** Riwayat masuk pada AC-8.6 shall berasal dari pesan yang benar-benar
  diterima proses ini, bukan dari daftar kontak WhatsApp.
- **AC-8.10** `caraka init whatsapp` shall menyatakan bahwa nomor yang dipakai
  harus terpisah dari nomor pribadi.

### AC-9 · Reconnect dengan plafon dan cabang menyerah

- **AC-9.1** IF koneksi baileys tertutup dengan alasan yang bisa dipulihkan,
  THEN channel shall menyambung ulang dengan tunda 5 detik × 2^n berjitter penuh,
  berplafon 300 detik (`docs/frd.md:47`).
- **AC-9.2** IF enam percobaan berturut-turut gagal, THEN channel shall berhenti
  mencoba, menulis satu baris audit, dan memberi tahu operator lewat channel lain
  yang terkonfigurasi.
- **AC-9.3** WHERE tidak ada channel lain, kegagalan pada AC-9.2 shall muncul di
  `caraka doctor` dan di log, dan proses shall tidak berakhir tanpa pesan.
- **AC-9.4** IF WhatsApp menjawab logged-out atau 401, THEN channel shall tidak
  menyambung ulang sama sekali, dan pesannya shall menyebut cara menautkan ulang
  yang benar-benar ada (`riset:47`). *Diamendemen 8 Agustus 2026:* kalimat ini
  dulu menyebut `caraka init whatsapp`. Perintah itu belum ada, dan `caraka init`
  dengan argumen apa pun menjalankan wizard Telegram yang menimpa `config.yaml`,
  jadi menyebutnya adalah saran yang merusak. Pesannya sekarang menyebut
  menghapus `~/.caraka/secrets/whatsapp/` lalu menjalankan Caraka lagi.
- **AC-9.5** Setiap percobaan sambung ulang shall menulis satu baris audit yang
  menyebut nomor percobaannya.
- **AC-9.6** Sambungan ulang shall tidak mengirim pesan apa pun ke chat mana pun
  atas inisiatifnya sendiri.
- **AC-9.7** `docs/troubleshooting.md` shall memuat runbook relink QR, disconnect
  berulang, dan akun terkena ban, ditambah rotasi kredensial
  (`docs/security.md` §11 butir 5).

### AC-10 · Config dan dua provider di satu channel

- **AC-10.1** Config shall menerima blok `whatsapp:` opsional secara aditif,
  dengan `version` tetap 1, dan berkas v0.5 tanpa blok itu tetap lolos skema.
- **AC-10.2** Blok `whatsapp:` shall memakai `allowFrom` `.min(1)` seperti
  channel lain, dan shall tidak punya `allowChats`. *Diamendemen 8 Agustus
  2026:* channel ini menolak pesan grup di `receive()`, jadi tidak ada wadah
  yang bisa digerbangi daftar kedua, dan kunci yang tidak dibaca siapa pun
  adalah janji yang tidak ditepati.
- **AC-10.7** WHERE provider `baileys` dipilih dan perangkat belum tertaut,
  `caraka start` shall memakai `whatsapp.number` sebagai nomor yang ditautkan;
  IF kunci itu kosong, THEN ia shall mengatakan kunci mana yang kurang dan tidak
  mencetak apa pun yang menyerupai kredensial.
- **AC-10.3** Nama provider yang diterima shall `baileys` dan `cloud-api`, dan
  bukan `cloud`.
- **AC-10.4** IF provider `cloud-api` dipilih tanpa `phoneNumberId`, THEN
  `caraka start` shall berhenti dan menyebut kunci yang kurang.
- **AC-10.5** Perilaku core shall identik untuk kedua provider kecuali pada apa
  yang dibedakan `caps.edit` (`docs/frd.md:38`).
- **AC-10.6** WHEN `caraka init whatsapp` dijalankan untuk `cloud-api`, ia shall
  memverifikasi kredensial lewat satu panggilan baca sebelum menulis config.

### AC-11 · Angka yang bisa ditelusuri

- **AC-11.1** Setiap angka pada spec ini shall punya baris di tabel §7 yang
  menyebut sumbernya atau menandainya spec-set.
- **AC-11.2** Setiap angka spec-set shall muncul di kode sebagai satu konstanta
  bernama yang komentarnya menyebut spec ini.
- **AC-11.3** `docs/security.md` §9 shall berhenti menulis "outbound per channel:
  mengikuti batas channel + jitter" sebagai rencana, dan memuat angka yang
  benar-benar dibangun beserta channel mana yang memakainya.

### AC-12 · Dokumen, rilis, dan gerbang yang tidak dicentang

- **AC-12.1** PR yang sama shall mengamendemen aturan keras 2 di `AGENTS.md:56`
  menjadi "approval tidak pernah tiba sebagai teks yang tak terautentikasi",
  dengan kalimat yang menyebut kode kartu sebagai bearer secret yang sama dengan
  callback bertanda tangan.
- **AC-12.2** PR yang sama shall mengamendemen `docs/frd.md:37` (FR-CHAN-02)
  supaya tidak lagi menulis bahwa izin ditolak ketika `caps.buttons` false.
- **AC-12.3** PR yang sama shall memperbarui `spec/v10.md` AC-5.3 dengan
  carve-out yang sama, karena ia spec induk yang masih berjalan.
- **AC-12.4** PR yang sama shall mengamendemen: `docs/frd.md:34` (FR-CHAN-01),
  `docs/security.md:43` (T8), `:44` (T9), `:237`, `:251`, `:265-273`, `:330`,
  `docs/design.md:41`, `:252`, `:272`, `docs/session-model.md:131-147`,
  `docs/ui-ux.md:158-168`, `docs/erd.md:191`, `docs/api.md:188`,
  `docs/techstack.md:57-58`, `docs/faq.md:57`, `docs/adr/0006:14`,
  `docs/roadmap.md:127-131`, `AGENTS.md:26`, `site/src/data/security.ts:100-101`,
  dan `site/src/data/status.ts:77-78`.
- **AC-12.5** `docs/whatsapp-risiko.md` shall ada, memuat base rate ban yang
  dikutip riset beserta sumbernya, dan ditautkan dari pesan galat AC-8.2.
- **AC-12.6** ADR baru shall mencatat keputusan §1 (kode sebagai bearer secret),
  §2 (baileys sebagai peer opsional), dan §3 (webhook loopback di balik flag).
- **AC-12.7** `docs/roadmap.md:132` (uji lapangan 14 hari) shall tetap tidak
  tercentang, dan `site/src/data/status.ts` shall menyatakan hal yang sama.
- **AC-12.8** CHANGELOG 0.6.0 shall menyatakan bahwa jalur WhatsApp tidak pernah
  dijalankan terhadap layanan hidup di CI, mengikuti preseden "printed untested"
  di 0.2.0.
- **AC-12.9** WHEN wave ditutup, plan shall memuat LOC `src/` hasil `wc -l`
  beserta jaraknya ke plafon ~8.000 (`AGENTS.md:19`).
- **AC-12.10** IF persetujuan pemilik belum ada, THEN tidak ada `npm publish`
  yang dijalankan.
