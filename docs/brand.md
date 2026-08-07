# Brand — Caraka

**Versi:** 1.0 · **Tanggal:** 7 Agustus 2026
**Berkas pendamping:** `Caraka Brandkit.dc.html` — logo book lengkap (anatomi, animasi, invert, favicon, ruang aman, larangan, daftar aset) · `Caraka Sistem Warna.dc.html` — sistem warna lengkap (ramp OKLCH, token, uji diferensial).

---

## 1. Nama

# ꦕꦫꦏ

**Caraka** · /tʃa.ˈra.ka/ · *ca-ra-ka*

Bahasa Jawa (dari Sanskerta *cāraka*): **utusan** — orang yang dikirim membawa pesan dan menjalankan perintah.

Domain `caraka.dev` · paket `caraka` · perintah `caraka`

---

## 2. Kenapa nama ini

Tiga hal bertemu di satu kata:

**Artinya persis "agent".** Caraka bukan pelayan dan bukan alat — ia utusan: seseorang yang dipercaya membawa maksudmu ke tempat lain, lalu kembali melapor. Itu definisi produk ini.

**Ia adalah baris pertama aksara Jawa.** Urutan huruf Jawa dibaca sebagai satu bait, dan bait itu dimulai dengan kata ini:

> **ꦲꦤꦕꦫꦏ** · *hana caraka* — ada dua utusan
> **ꦢꦠꦱꦮꦭ** · *data sawala* — mereka berselisih
> **ꦥꦝꦗꦪꦚ** · *padha jayanya* — sama kuatnya
> **ꦩꦒꦧꦛꦔ** · *maga bathanga* — keduanya menjadi bangkai

**Ceritanya adalah cerita produk ini.**

---

## 3. Filosofi brand

Dalam legenda Aji Saka, dua abdi setia — Dora dan Sembada — menerima perintah dari tuan yang sama, di waktu yang berbeda.

Sembada diberi pusaka untuk dijaga, dengan pesan: **jangan serahkan kepada siapa pun kecuali aku sendiri.**
Belakangan Dora dikirim untuk mengambil pusaka itu, membawa pesan: **ambil dan bawa kembali.**

Keduanya menjalankan perintah dengan sempurna. Keduanya benar menurut instruksi yang mereka pegang. Keduanya sama kuat.
Keduanya mati.

Yang membunuh mereka bukan pengkhianatan. Yang membunuh mereka adalah **kesetiaan tanpa konteks**: dua instruksi yang bertabrakan, tidak ada cara memverifikasi, dan tidak ada manusia di antara keduanya pada saat yang menentukan.

> **Kesetiaan tanpa konteks itu berbahaya.**

Itulah kenapa produk ini dibangun seperti ini — dan setiap keputusan arsitekturnya adalah jawaban atas satu baris dalam cerita itu:

| Baris cerita | Jawaban Caraka |
|---|---|
| *hana caraka* — utusan yang menjalankan perintah | Caraka tidak berpikir sendiri. Ia membawa maksudmu ke coding agent yang sudah kamu percaya, dan kembali melapor |
| *data sawala* — instruksi yang bertabrakan | **Memori dengan provenance** (Titen): setiap keputusan menyebut buktinya, fakta lama ditandai digantikan, perselisihan tetap tercatat sebagai perselisihan |
| tidak ada yang bisa bertanya | **Approval**: setiap tindakan berkonsekuensi berhenti dan bertanya kepada manusia, lewat ketukan — bukan lewat teks yang bisa dipalsukan |
| tidak ada yang tahu apa yang terjadi | **Audit append-only**: siapa menyuruh apa, kapan, disetujui siapa, hasilnya apa |
| *maga bathanga* — kerja yang berakhir sia-sia | **Sesi ber-tab**: setiap tugas punya ruangnya sendiri, statusnya terlihat, dan penutupnya selalu menjelaskan apa yang terjadi |

Aji Saka menciptakan dua puluh aksara untuk mengenang mereka. Kita memakai kata pertamanya untuk memastikan ceritanya tidak terulang.

---

## 4. Metafora: pekerja yang jalan sendiri

Caraka **berjalan sendiri, tetapi tidak pernah sendirian.**

- Ia berangkat begitu kamu kirim tugas — kamu tidak perlu menungguinya.
- Ia melapor sepanjang jalan, bukan hanya di akhir.
- Ia berhenti dan bertanya ketika taruhannya nyata.
- Ia pulang membawa hasil, bukan alasan.

Yang **tidak** kita klaim: otonom penuh, "AI yang mengurus semuanya", asisten yang punya kehendak sendiri. Caraka adalah utusan — kehendaknya kehendakmu.

---

## 4b. Caraka dan Titen — dua proyek, satu cerita

Caraka dan **Titen** ditulis oleh orang yang sama (Rama Aditya, `RamaAditya49`). Keduanya open source, keduanya bernama Jawa, dan keduanya menjawab separuh dari masalah yang sama:

| | Arti | Perannya |
|---|---|---|
| **Titen** (*niteni*) | memperhatikan, lalu menyimpan apa yang diperhatikan | **ingatan** yang bisa menjelaskan dirinya |
| **Caraka** (ꦕꦫꦏ) | utusan yang dikirim membawa pesan | **utusan** yang menjalankan tugas |

Utusan tanpa ingatan mengulang kesalahan yang sama. Ingatan tanpa utusan tidak mengerjakan apa pun. Legenda hanacaraka menjelaskan kenapa keduanya harus ada bersama: dua utusan mati bukan karena tidak setia, tetapi karena tidak ada yang mengingat konteksnya.

Konsekuensi praktisnya: Titen **bukan ketergantungan pihak ketiga** bagi Caraka. Roadmap keduanya dipegang orang yang sama, dan integrasinya dapat dirancang bersama alih-alih ditebak dari luar.

Konsekuensi penempatan: **Titen tetap di `RamaAditya49/titen`** — sudah punya jejak dan tautan; memindahkannya merusak lebih banyak daripada untungnya. Cukup saling tautkan di README keduanya, dan sebut hubungan ini sekali di halaman filosofi — tidak lebih.

---

## 5. Tagline

**Utama (ID):** *Kirim tugasnya. Caraka yang jalan.*
**Utama (EN):** *Send the task. Caraka runs it.*

**Pendamping:**
- *Coding agent-mu, sekarang bisa diutus.*
- *Satu pesan, satu tab, satu hasil.*
- *Kesetiaan tanpa konteks itu berbahaya — makanya Caraka membawa konteksnya.* (untuk halaman keamanan)

**Deskripsi satu baris (npm / GitHub):**
> Caraka menyambungkan Telegram ke coding agent yang sudah terpasang di komputermu — setiap tugas hidup di topic-nya sendiri, dengan approval dan memori.

---

## 6. Identitas visual

> Ringkasan. Spesifikasi lengkap — anatomi, tabel gerak, semua varian, ruang aman, larangan, daftar aset — ada di **`Caraka Brandkit.dc.html`**.

### Lambang

Dua lingkaran identik bersinggungan membentuk **∞**, dengan aksara **ꦕ** (*ca*) di persilangannya.

Maknanya harfiah: *hana caraka* — **dua** utusan, menyeberang bolak-balik tanpa henti. Bentuknya adalah kalimatnya.

Konstruksi memakai satu unit, diameter lingkaran **d**: jarak antar pusat = d, lebar total = 2d, tinggi = d, aksara diset pada 0,59d.

### Versi

| Versi | Dipakai di |
|---|---|
| **Animasi** — busur berputar beda arah, dua utusan mengorbit, cahaya mekar | hero situs, splash `caraka init`, video |
| **Statis** — dua cincin + ꦕ | 95% tempat: README, dokumen, header, cetak |
| **Mark padat** — ꦕ di kotak berwarna, tanpa cincin | di bawah 48px: favicon, avatar, badge |
| **Lockup** — mark + `caraka` | mendatar, bertumpuk, atau wordmark ꦕꦫꦏ penuh |

Empat varian warna, berurutan prioritas: aksen di gelap → aksen di terang → monokrom terang → monokrom gelap.

### Koreksi optis — wajib

Font aksara Jawa menyediakan ruang sandhangan di atas dan pasangan di bawah. ꦕ tidak memakai keduanya, jadi glyph-nya duduk di atas titik tengah kotak.

```css
line-height: 1;
transform: translateY(17.5%);
```

Angka ini **terukur, bukan dikira**: pada 100px, tinta membentang 55px di atas garis dasar dan 0px di bawahnya, sedangkan kotak font membentang 112/92 — pusat tinta jatuh 17,5px di atas pusat kotak.

### Warna

> Sistem lengkap — ramp OKLCH, token, dan uji diferensial — ada di **`Caraka Sistem Warna.dc.html`**.

Prinsipnya satu kalimat: **satu hue merek, sisanya nada.**

Ini bukan pilihan gaya, melainkan hasil pengukuran. Seluruh 360° roda warna disisir untuk mencari hue *secondary* dan *tertiary*; kandidat terbaik hanya mencapai ΔE 13,2 — di bawah ambang aman 15. Enam warna status Telegram sudah memenuhi ruang warna, jadi hue baru apa pun pasti bertabrakan dengan salah satunya.

#### Primary — Kesumba

| Nada | Nilai | Tugas |
|---|---|---|
| kesumba-400 | `#FF7A5E` | **teks & tautan di latar gelap** · 7,83:1 (AAA) |
| kesumba-500 | `#E2452C` | **warna merek** · lambang · tombol utama |
| kesumba-600 | `#C02F17` | hover |
| kesumba-900/950 | `#492019` / `#2B1612` | permukaan bernada di latar gelap |

Ramp penuh 50–950 dibangun di OKLCH pada hue tetap **31,8°**, lightness berjarak perseptual seragam, chroma meruncing di kedua ujung.

**Aturan keras:** kesumba-500 **tidak boleh dipakai untuk teks** — hanya 4,89:1 di atas void. Untuk teks pakai kesumba-400.

#### Secondary — netral dingin

Membawa 90% permukaan. Hue dikunci di **250°**, chroma 0,005–0,020 — cukup untuk terasa dingin dan teknis, terlalu rendah untuk bersaing dengan kesumba.

| Nada | Nilai | Tugas |
|---|---|---|
| n-000 | `#05080C` | latar terdalam |
| n-050 | `#0C1116` | panel, kartu |
| n-100 / n-200 | `#171C22` / `#292E35` | batas |
| n-500 | `#7A848F` | label, metadata · 5,28:1 (AA) |
| n-700 | `#B2BCC6` | teks pendukung · 10,42:1 |
| n-900 | `#E9EDF2` | teks utama · 17,07:1 |

#### Tertiary — permukaan bernada kesumba

Bukan hue ketiga: kesumba pada chroma sangat rendah, untuk permukaan yang harus terasa milik merek tanpa berteriak.

`surface-active #12100F` · `surface-raised #1E1614` · `border-brand #2B1612` · `overlay-brand #492019`

#### Semantik — terkunci pada Telegram

Telegram hanya menerima enam nilai `icon_color`. Memakai warna lain memutus hubungan antara daftar topic dan dasbor, jadi keenamnya diadopsi apa adanya.

| Status | Nilai | Desimal | Glif |
|---|---|---|---|
| `running` | `#6FB9F0` biru | 7322096 | ▸ |
| `awaiting_approval` | `#FFD67E` kuning | 16766590 | ⏸ |
| `done` | `#8EEE98` hijau | 9367192 | ✓ |
| `failed` | `#FF93B2` magenta | 16749490 | ✗ |
| `cancelled` | `#CB86DB` ungu | 13338331 | ⊘ |
| — | ~~`#FB6F5F` merah~~ | 16478047 | **dikosongkan** |

Merah Telegram sengaja tidak dipakai: jaraknya ke kesumba hanya ΔE 9,9, dan pengguna akan bingung membedakan "merek" dari "gagal".

#### ⚠️ Warna tidak pernah menjadi satu-satunya sinyal

Diuji dengan simulasi buta warna, himpunan status Telegram **gagal**:

- Deuteranopia: `done` ↔ `cancelled` = **ΔE 2,5** (praktis identik) · `awaiting` ↔ `failed` = 5,0
- Protanopia: `awaiting` ↔ `done` = **ΔE 3,8** · empat pasangan di bawah ambang

Ini tidak bisa diperbaiki dengan memilih warna lebih baik — API hanya menerima enam nilai itu. Karena itu **setiap status wajib membawa glif teksnya** (▸ ⏸ ✓ ✗ ⊘) di nama topic. Prefiks bukan hiasan; ia satu-satunya sinyal yang bertahan untuk sekitar 8% pria.

### Tipografi

| Peran | Font |
|---|---|
| Aksara | **Noto Sans Javanese** — satu-satunya yang andal lintas platform |
| Wordmark, CLI, kode, angka | **JetBrains Mono** — tracking 0,2em (lockup) / 0,36em (bertumpuk) |
| Teks & dokumentasi | **Public Sans** — netral, tidak bersaing dengan aksara |

Wordmark latin selalu **huruf kecil**, sama seperti perintah CLI-nya.

### Dua aturan produksi yang tidak bisa ditawar

1. **Aksara wajib dikonversi ke path** di semua aset ekspor (SVG, PNG, ICO). SVG dengan `<text>` akan tampil sebagai kotak tofu di sistem tanpa Noto Sans Javanese.
2. **Aksara yang dirender sebagai teks hidup** (terminal, README, judul HTML) wajib didampingi kata `caraka` di baris yang sama, dan punya cadangan huruf **c** huruf kecil JetBrains Mono.

### Lisensi aset

Kode Caraka berlisensi MIT. **Aset merek tidak.** Logo dan nama boleh dipakai untuk merujuk proyek ini — artikel, daftar perkakas, integrasi — tetapi tidak untuk menyiratkan dukungan resmi, dan tidak sebagai logo produk turunan. Fork wajib memakai nama dan lambangnya sendiri.

---

## 7. Nada bahasa

Caraka berbicara seperti utusan yang kompeten: **singkat, spesifik, dan tidak pernah berpura-pura tahu.**

| Lakukan | Jangan |
|---|---|
| "18 test lulus, 2 berkas berubah" | "Selesai! 🎉" |
| "Test tidak saya jalankan — tidak ada skrip test di package.json" | diam-diam melewatkannya |
| "Butuh izin: tulis `src/auth.ts`" | "Boleh saya lanjut?" |
| "Gagal: timeout 30 menit. Perubahan yang disetujui tetap tersimpan." | melempar stack trace |

- Tanpa persona buatan, tanpa nama panggilan, tanpa basa-basi. Ini alat, bukan teman.
- Emoji hanya sebagai penanda status (▸ ⏸ ✓ ✗ ⊘ dan lima warna topic).
- Bilingual otomatis: balas dalam bahasa yang dipakai user. Dokumentasi ID dan EN setara, bukan terjemahan setengah.
- Rujukan budaya dipakai **satu kali di tempat yang tepat** (README, halaman filosofi) — tidak ditaburkan ke seluruh antarmuka.

---

## 8. Penamaan teknis

| Hal | Nilai |
|---|---|
| Paket npm | `caraka` |
| Perintah CLI | `caraka` (alias `crk`) |
| Direktori konfigurasi | `~/.caraka/` |
| Basis data | `~/.caraka/caraka.db` |
| Prefiks env | `CARAKA_*` |
| Nama bot yang disarankan wizard | `<workspace>_caraka_bot` |
| Repo | `CarakaDev/caraka` |
| Domain | `caraka.dev` |
| Kontak | `halo@caraka.dev` · `security@caraka.dev` |
| Id sesi | `#a91` (8 karakter pertama ULID) |

---

## 8b. Checklist namespace

**Aturan:** cek **ketiganya sekaligus sebelum mengambil satu pun** — tetapi jangan perlakukan sama. Ketiganya berbeda bobot:

1. **npm** paling kritis. Nama paket muncul di setiap perintah install (`npx caraka init`). Kalau ini bentrok, nama produk perlu ditimbang ulang.
2. **Domain** kedua. Muncul di dokumentasi dan pemasaran.
3. **GitHub org paling longgar.** Orang sampai ke repo lewat domain dan lewat npm, bukan dengan menebak URL org. `github.com/CarakaDev/caraka` sama sekali tidak melemahkan brand.

> **Status per 7 Agustus 2026:** domain `caraka.dev` ✅ terdaftar · npm `caraka` ✅ bebas · org GitHub ✅ `github.com/CarakaDev` · email ✅ `halo@` dan `security@` aktif. **Nama terkunci di semua namespace.** Nama org memakai `CarakaDev` karena `caraka` sudah dipakai pihak lain — ini namespace dengan bobot paling longgar, dan repo tetap bernama `caraka`.

Catatan: bila org yang memakai nama itu ternyata kosong/tidak aktif, GitHub punya jalur pelepasan nama lewat Support. Prosesnya lambat dan tidak dijamin — ajukan kalau mau, tapi jangan menunda peluncuran karenanya.

| # | Namespace | Target | Cadangan bila bentrok |
|---|---|---|---|
| 1 | Domain | ✅ **`caraka.dev` terdaftar** (7 Agu 2026) | — |
| 2 | npm | ✅ **`caraka` bebas** (diverifikasi 7 Agu 2026, `npm view caraka` → 404) | scope `@caraka/cli` · `caraka-dev` |
| 3 | GitHub org | ✅ **`CarakaDev` dibuat** (7 Agu 2026) → repo `CarakaDev/caraka`. `caraka` sudah dipakai orang lain | `RamaAditya49/caraka` (sekeluarga dengan `RamaAditya49/titen`) |
| 4 | Telegram | `@caraka` (opsional, untuk bot demo/docs) | `@carakadev` |
| 5 | X / handle sosial | `@carakadev` | — |

**Langkah setelah ketiganya aman:**

1. Buat org GitHub `CarakaDev` — kosong, satu anggota. Tidak perlu tim, tidak perlu "foundation". ✅
2. Kembangkan langsung di `CarakaDev/caraka`, bukan di repo personal. Repo di bawah org lebih dipercaya untuk perangkat lunak yang mengeksekusi perintah di mesin orang lain — dan kepercayaan adalah seluruh strategi go-to-market produk ini.
3. Publish `caraka@0.0.0` ke npm dengan README satu paragraf. Ini mengunci nama paket sebelum orang lain, dan bukan squatting selama memang akan dipakai.
4. Arahkan `caraka.dev` ke halaman satu layar: wordmark ꦕꦫꦏ, tagline, satu perintah install, tautan repo.

### Alamat email

| Alamat | Untuk |
|---|---|
| `halo@caraka.dev` | kontak utama: org GitHub, README, situs |
| `security@caraka.dev` | `SECURITY.md` — wajib untuk perangkat lunak yang mengeksekusi perintah di mesin orang |
| catch-all → inbox pribadi | menangkap surat yang salah tebak |

`halo` dipilih alih-alih `hello` dengan alasan yang sama seperti pemilihan nama: dipahami di mana-mana, tetapi ejaannya menandakan asal proyek tanpa perlu menjelaskan apa pun. `utusan@caraka.dev` boleh dibuat sebagai alias, **tidak** sebagai alamat utama — alamat kontak harus bisa ditebak orang.

Setup: Cloudflare Email Routing (gratis, hanya menerima) + relay SMTP untuk membalas *dari* alamat tersebut, atau Zoho Mail untuk dua arah sekaligus. Ingat bahwa email kontak org GitHub **tampil publik** — karena itu pakai alias per fungsi, bukan email pribadi.

**Yang tidak perlu sekarang:** tim, foundation, badan hukum, atau struktur organisasi apa pun. OpenClaw baru menjadi foundation setelah ratusan ribu star — itu konsekuensi, bukan titik mulai. Org berisi satu orang dan satu repo adalah hal yang wajar.

**Kalau `caraka` bentrok di npm:** tidak terjadi — sudah diverifikasi bebas. Bila suatu saat nama harus diganti, kandidat dari ronde riset yang sama, dengan medan makna yang sama — **Cantrik** (murid yang melayani guru), **Tandang** (*tandang gawe*, langsung turun bekerja), **Obah** (bergerak, bertindak). Filosofi di §3 melekat pada legenda hanacaraka; bila nama berubah, bagian itu ikut ditulis ulang.

---

## 9. Yang harus dihindari

- Menulis "CARAKA" kapital penuh di luar judul — nama ini bukan akronim.
- Menerjemahkan nama ("The Messenger") di materi resmi. Namanya Caraka.
- Memakai wayang, keris, atau ornamen batik sebagai dekorasi visual. Ceritanya dibawa oleh **kata dan aksara**, bukan oleh klise visual.
- Menjanjikan otonomi penuh. Seluruh filosofi brand ini justru menolak itu.
- Menceritakan legenda tanpa pelajarannya. Kisah dua utusan yang mati bukan hiasan — ia alasan keberadaan approval dan memori.
