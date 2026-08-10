# Riset: Warna aksen untuk favicon & app icon

**English:** this document is Indonesian only, and stays that way because it is research kept as provenance for a decision already made. English documentation starts at [`../../README.md`](../../README.md).

**Tanggal riset:** 7 Agustus 2026
**Pertanyaan:** *"Warna apa yang paling cocok, dan menonjol kalau dipasang di bookmark dan icon app?"*
**Sumber:** opengraph-check.com/en/blog/favicon-size-browser-tab · ramotion.com/blog/what-is-favicon · think360studio.com · clickrank.ai · outreachmonks.com · weareaffective.com · amraandelma.com (Kantar BrandZ 2026, Interbrand 2026) · biznamelab.com/tech-brand-color-palette · tentackles.com · bynder.com/en/blog/the-most-and-least-used-colors-in-logos · desantisbreindel.com · createwithswift.com (WWDC24 app icon) · macrumors.com (iOS 18 dark icons)

---

## 1. Temuan yang menentukan

> **Warna aksen sekarang, `#6FB9F0`, hanya mencapai 1,91:1 terhadap bookmark bar mode terang Chrome.** Ambang praktisnya 3:1. Di mode terang, ikon Caraka melebur jadi bercak pucat.

Ini bukan soal selera. Ini kegagalan terukur di salah satu dari dua tempat ikon paling sering dilihat.

---

## 2. Tiga alasan bergerak dari biru

### 2.1 Biru adalah warna paling penuh sesak
Analisis frekuensi warna Kantar BrandZ 2026 atas 1.000 merek paling bernilai menempatkan biru di **37%**; audit Interbrand 2026 menyebut **41%**. Lebih dari 50% merek teknologi top-100 memakai biru sedang-ke-gelap atau hitam.

Konsekuensinya sudah disadari pasar: **23% merek biru menambahkan aksen koral, amber, atau lime dalam 18 bulan** untuk memisahkan diri. Sumber lain menyatakannya lebih tajam — biru bukan lagi pembeda dengan sendirinya, dan merek biru polos melebur di pasar yang sesak.

### 2.2 Telegram sendiri biru
Ikon Caraka akan hampir selalu duduk bersebelahan dengan Telegram — di bookmark bar, home screen, dan daftar aplikasi. Dua kotak biru bersebelahan adalah kegagalan pengenalan, bukan keselarasan.

### 2.3 Ukuran kecil menghukum warna pucat
Bookmark bar merender di ruang visual **±16px** dan menurunkan skala secara agresif; ikon yang bagus di 32px bisa kehilangan detail saat di-bookmark. Yang bertahan adalah **mark satu warna berkontras tinggi**. Panduan favicon secara konsisten memperingatkan agar menjauhi abu-abu dan warna sangat terang, karena tab chrome biasanya abu terang atau kebiruan.

---

## 3. Kriteria terukur

| Kriteria | Ambang | Alasan |
|---|---|---|
| Tile vs chrome **terang** (`#F1F3F4`) | ≥ 3:1 | bookmark bar & tab mode terang |
| Tile vs chrome **gelap** (`#292A2D`) | ≥ 3:1 | mode gelap; ikon bergaris gelap tipis bisa lenyap |
| Glyph vs tile | ≥ 4,5:1 | keterbacaan aksara di dalam kotak |
| Hindari | `#FFFFFF` dan `#000000` murni | putih lenyap di latar terang; hitam murni terasa keras di mode gelap |

---

## 4. Hasil pengukuran

| Kandidat | Hex | vs terang | vs gelap | glyph di void | Putusan |
|---|---|---|---|---|---|
| biru langit | `#6FB9F0` | **1,91** ✗ | 6,75 ✓ | 9,37 ✓ | gagal mode terang |
| kunyit | `#F0B429` | **1,67** ✗ | 7,70 ✓ | 10,69 ✓ | paling lemah di mode terang |
| **kesumba** | **`#E2452C`** | **3,68** ✓ | **3,50** ✓ | **4,86** ✓ | **lolos ketiganya** |
| jamrud | `#10B981` | **2,28** ✗ | 5,66 ✓ | 7,86 ✓ | gagal mode terang |
| nila | `#4F46E5` | 5,65 ✓ | **2,28** ✗ | **3,17** ✗ | gagal mode gelap |

**Pola yang muncul:** warna terlalu terang gagal di chrome putih, terlalu gelap gagal di chrome hitam. Hanya **warna jenuh bernada sedang** yang lolos keduanya — dan dari lima kandidat, hanya kesumba yang berada di jendela itu.

---

## 5. App icon — temuan terpisah

Sejak WWDC24, ikon iOS punya tiga varian: terang, gelap, dan tinted. **Varian gelap semuanya diberi latar hitam** agar menyatu dengan Dark Mode, dan sistem akan membuatkannya sendiri bila pengembang tidak menyediakan.

Konsekuensi untuk kita: **tile gelap `#07090D` adalah pilihan yang benar untuk app icon, apa pun aksennya** — ia sudah selaras di ketiga mode tanpa varian tambahan, dan tidak perlu melawan perilaku sistem. Yang harus menonjol adalah **glyph-nya**, bukan tile-nya.

Catatan tambahan: latar transparan disarankan untuk favicon agar menyatu di mode apa pun, tetapi Apple touch icon **tidak boleh transparan** — harus berlatar penuh.

---

## 6. Rekomendasi: Kesumba `#E2452C`

**Alasan terukur.** Satu-satunya kandidat yang lolos ambang di chrome terang dan gelap sekaligus, dengan glyph yang tetap terbaca di dalam tile.

**Alasan posisi.** Keluar dari 37–41% biru, dan tidak bertabrakan dengan Telegram yang akan selalu bersebelahan. Cukup jauh dari koral Anthropic (`#D97757`) — lebih merah, lebih jenuh, lebih gelap — sehingga tidak tertukar dengan agent yang dikendalikannya.

**Alasan makna.** *Kesumba* adalah nama Jawa-Melayu untuk merah *Bixa orellana*, pewarna merah tradisional. Warnanya sekelompok dengan cinnabar yang dipakai dalam manuskrip Jawa untuk **rubrikasi** — menandai kata terpenting dalam satu halaman. Itu persis peran warna aksen dalam produk ini: menandai apa yang harus diperhatikan.

**Alasan komposisi.** Aksen hangat di dalam void dingin membaca sebagai **gerbang yang menyala**. Biru di atas biru-hitam hanya membaca sebagai fiksi ilmiah generik — ini yang membuat versi biru terasa kurang hidup meski geraknya sama.

### Konsekuensi bila dipilih

| Berubah | Dari | Menjadi |
|---|---|---|
| Aksen merek | `#6FB9F0` | `#E2452C` |
| Status `failed` | `#FB6F5F` | `#FF93B2` (magenta ikon topic Telegram) — agar tidak bertabrakan dengan aksen merek |
| Status `running` | — | tetap `#6FB9F0` (ikon topic Telegram, tidak berubah) |
| `awaiting_approval` · `done` | — | tetap `#FFD67E` · `#8EEE98` |

Empat warna status tetap terikat pada warna ikon topic Telegram; hanya merah yang bergeser ke magenta karena aksen merek mengambil alih rentang merah.

---

## 7. Yang tetap berlaku apa pun warnanya

1. **Favicon adaptif.** Sediakan `icon.svg` dengan `prefers-color-scheme` di dalamnya: tile gelap di chrome terang, aksen-forward di chrome gelap. Ini menyelesaikan masalah dua mode secara struktural, bukan dengan kompromi satu warna.
2. **Uji di 16px sebelum finalisasi**, bukan di 512px.
3. **Satu sampai dua warna saja.** Audit Landor & Fitch 2026: 96% merek top-100 mempertahankan 1–2 warna logo, dan 88% rebranding terakhir justru **mengurangi** jumlah warna demi kompatibilitas mobile dan mode gelap.
4. **Aksara wajib dikonversi ke path** di semua aset ekspor.

---

## 8. Lanjutan: metode diferensial untuk seluruh sistem

Setelah kesumba dipilih, seluruh sistem disusun ulang dengan menguji **jarak perseptual ΔE OKLab** antar setiap pasangan warna — dalam penglihatan normal, deuteranopia, dan protanopia (matriks Viénot–Brettel–Mollon). Ambang: 15 aman, di bawah 10 berisiko.

### Temuan 1 — hue kedua dan ketiga tidak tersedia

Seluruh 360° roda warna disisir pada L=0,72 dengan chroma maksimum dalam gamut, mencari hue yang jaraknya jauh dari enam warna terkunci (kesumba + lima status). **Kandidat terbaik hanya mencapai ΔE 13,2** (hijau-kuning, H=130°); pasangan *secondary* + *tertiary* terbaik hanya mencapai skor 10,0.

**Kesimpulan:** ruang warna sudah penuh. Sistem memakai **satu hue merek**; *secondary* diambil dari netral dingin dan *tertiary* dari kesumba berchroma sangat rendah — bukan hue baru. Ini sejalan dengan audit Landor & Fitch 2026: 88% rebranding terakhir justru mengurangi jumlah warna.

### Temuan 2 — himpunan status Telegram gagal uji buta warna

| Mode | Pasangan terdekat | ΔE |
|---|---|---|
| Normal | `failed` ↔ `cancelled` | 11,8 |
| **Deuteranopia** | **`done` ↔ `cancelled`** | **2,5** |
| **Protanopia** | **`awaiting` ↔ `done`** | **3,8** |

Pada deuteranopia, hijau `done` dan ungu `cancelled` sama-sama luruh menjadi abu (`#BAB2B7` dan `#B5BAC6`) — praktis identik. Kuning `awaiting` dan magenta `failed` berjarak 5,0.

Ini **tidak dapat diperbaiki dengan memilih warna lebih baik**: Telegram hanya menerima enam nilai `icon_color`. Konsekuensinya adalah aturan desain wajib — **setiap status membawa glif teksnya** (▸ ⏸ ✓ ✗ ⊘). Prefiks bukan hiasan; ia satu-satunya sinyal yang bertahan untuk sekitar 8% pria.

### Temuan 3 — jarak ke tetangga

| Pasangan | ΔE | Catatan |
|---|---|---|
| kesumba ↔ Telegram biru | 34,5 | sangat aman |
| kesumba ↔ merah Telegram `#FB6F5F` | 9,9 | **terlalu dekat** → merah dikosongkan dari status |
| kesumba ↔ koral Claude `#D97757` | 9,1 | dapat diterima: bentuk, konteks, dan saturasi berbeda |
| kesumba ↔ merah npm | 5,6 | dekat, tetapi npm tidak pernah muncul di UI yang sama |

### Temuan 4 — kesumba 500 bukan warna teks

Di atas void, kesumba-500 hanya mencapai **4,89:1** — cukup untuk elemen besar, tidak untuk teks kecil. Teks dan tautan memakai **kesumba-400 `#FF7A5E`** (7,83:1, AAA).

> Sistem lengkap beserta ramp, token, dan bukti visual ada di **`Caraka Sistem Warna.dc.html`**.
