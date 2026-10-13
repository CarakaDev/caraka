# Plan — aplikasi Android Caraka

**Spec:** [`spec.md`](../../spec/android-app/spec.md) · **Standar:** [`standards/ears.md`](../../standards/ears.md)

## 1. Bentuk

```
android/
  settings.gradle.kts  build.gradle.kts  gradle/libs.versions.toml  gradlew
  app/src/main/java/dev/caraka/android/
    data/      PairLink.kt  CarakaApi.kt  EventStream.kt  SecureStore.kt  Models.kt
    ui/theme/  warna, tipografi (Public Sans, JetBrains Mono), bentuk
    ui/        Splash  Connect  Rooms  Chat  Approval  Viewer  Devices
  app/src/demo/  repositori data contoh untuk tangkapan layar
  app/src/test/  PairLinkTest  CarakaApiTest (MockWebServer)  StatusTest
```

## 2. Keputusan

| Hal | Pilihan | Alasan |
|---|---|---|
| HTTP | OkHttp 5 + okhttp-sse | SSE `/api/events` dan cookie dalam satu klien |
| JSON | kotlinx.serialization | tanpa refleksi, cocok dengan R8 |
| Cookie | CookieJar sendiri, disimpan terenkripsi Keystore AES-GCM | satu cookie, satu origin |
| Header `Origin` | interceptor, nilai = origin tersimpan | server menolak tanpa Origin persis |
| QR | Google code scanner | tanpa izin kamera |
| Gambar | Coil 3 lewat OkHttp yang sama | unduhan memakai cookie |
| PDF | `android.graphics.pdf.PdfRenderer` | bawaan, tanpa dependensi |
| Audio/video | Media3 ExoPlayer | satu pemutar untuk keduanya |
| Markdown | renderer Compose ringan | toggle Tampilan/Sumber |

## 3. Build dan gate

Build berjalan di `rama-tuf`, di direktori baru `~/caraka-gate-android/` (rsync). Checkout `~/Project/caraka` di sana basi dan tidak disentuh.

```bash
systemd-run --user --scope -q -p MemoryMax=8G -p MemorySwapMax=0 \
  ./gradlew --no-daemon :app:testProdDebugUnitTest :app:lintProdRelease :app:bundleProdRelease
```

Kunci upload dibuat sekali di `rama-tuf:~/.caraka-android-keys/` (mode 600) dan tidak pernah masuk repositori.

## 4. Hasil gate

Dijalankan di `rama-tuf` (JDK 17, AGP 9.4.1, Gradle 9.8.0, compileSdk 37, targetSdk 37), 13 Oktober 2026.

```text
./gradlew --no-daemon :app:testProdDebugUnitTest :app:lintProdRelease :app:bundleProdRelease :app:assembleDemoDebug :app:assembleProdDebug
```

- Unit test: 38 lulus, 0 gagal (CarakaApiTest 20, PairLinkTest 10, StatusTest 5, MarkdownParserTest 3).
- Lint `prodRelease`: 0 error, 10 warning (versi baru tersedia, ikon vektor, KTX).
- AAB `prodRelease` ditandatangani dengan kunci upload; `jarsigner -verify` menjawab "jar verified".

```text
> Task :app:packageDemoDebug
> Task :app:createDemoDebugApkListingFileRedirect UP-TO-DATE
> Task :app:assembleDemoDebug
> Task :app:mergeProdDebugJavaResource UP-TO-DATE
> Task :app:dexBuilderProdDebug
> Task :app:mergeProjectDexProdDebug
> Task :app:packageProdDebug
> Task :app:createProdDebugApkListingFileRedirect UP-TO-DATE
> Task :app:assembleProdDebug
> Task :app:lintAnalyzeProdRelease
> Task :app:lintVitalAnalyzeProdRelease
> Task :app:minifyProdReleaseWithR8
> Task :app:lintVitalReportProdRelease SKIPPED
> Task :app:lintVitalProdRelease SKIPPED

> Task :app:lintReportProdRelease
Wrote HTML report to file:///home/ramaaditya/caraka-gate-android/app/build/reports/lint-results-prodRelease.html
Wrote SARIF report to file:///home/ramaaditya/caraka-gate-android/app/build/reports/lint-results-prodRelease.sarif

> Task :app:lintProdRelease
> Task :app:buildProdReleasePreBundle
> Task :app:mergeProdReleaseComposeMapping
> Task :app:compileProdReleaseArtProfile
> Task :app:packageProdReleaseBundle
> Task :app:signProdReleaseBundle
> Task :app:produceProdReleaseBundleIdeListingFile
> Task :app:createProdReleaseBundleListingFileRedirect
> Task :app:bundleProdRelease

[Incubating] Problems report is available at: file:///home/ramaaditya/caraka-gate-android/build/reports/problems/problems-report.html

Deprecated Gradle features were used in this build, making it incompatible with Gradle 10.

You can use '--warning-mode all' to show the individual deprecation warnings and determine if they come from your own scripts or plugins.

For more on this, please refer to https://docs.gradle.org/9.8.0/userguide/command_line_interface.html#sec:command_line_warnings in the Gradle documentation.

BUILD SUCCESSFUL in 1m 31s
136 actionable tasks: 30 executed, 106 up-to-date
Consider enabling configuration cache to speed up this build: https://docs.gradle.org/9.8.0/userguide/configuration_cache_enabling.html
```

## 5. QA emulator

Dijalankan di `rama-tuf`, 13 Oktober 2026. Emulator x86_64 Pixel 6 (1080x2400) dengan image Android 35. Image Android 36 tidak dipakai: `surfaceflinger` mati berulang di emulator tanpa GPU. Server Caraka lokal 1.6.1 di `127.0.0.1:7720`, agent `claude-code`, `adb reverse` untuk port itu.

### Bug yang ditemukan dan diperbaiki

| Berkas | Perbaikan |
|---|---|
| `ui/theme/Theme.kt` | Font Public Sans dan JetBrains Mono adalah font variabel. Tanpa sumbu bobot, semua teks tampil tipis. Sekarang tiap bobot memakai `FontVariation`. |
| `ui/Components.kt`, `ui/Chat.kt` | Glyph jeda berubah jadi emoji berwarna. Sekarang `glyphText()` menambah U+FE0E. Ada `GlyphTextTest`. |
| `ui/Chat.kt` | Header percakapan terlalu rapat, cincin denyut menimpa judul dan label status. Jarak ditambah. |
| `ui/Chat.kt` | Daftar pesan terbuka di awal setelah penampil ditutup. Sekarang selalu terbuka di pesan terbaru. |
| `ui/Chat.kt` | Pesan panjang yang tumbuh menampilkan awalnya, bukan ujungnya. Gulir memakai offset besar. |
| `ui/Connect.kt`, `ui/Components.kt` | Tombol Enter di keyboard tidak menyambungkan. Kolom kode sekarang memakai aksi Go, kolom alamat memakai Next. |
| `ui/Rooms.kt` | Nama perangkat panjang memotong kata "connected" dan menabrak tombol. Nama dipotong, label status tetap utuh. |
| `ui/Markdown.kt` | Titik daftar terlalu kecil. Ukuran naik ke 20 sp. |
| `demo/DemoRepository.kt` | Waktu data demo memakai jam asli. Sekarang berpusat di pukul 12:00 hari ini. Ada pesan yang tumbuh untuk caret dan titik mengetik. |
| `demo/assets/demo/diagram.png` | Gambar demo hanya gradasi. Diganti diagram arsitektur. |

### Alur nyata (build `prod` debug, server lokal)

| Langkah | Hasil |
|---|---|
| Pair lewat alamat dan kode | Berhasil. Kode kedaluwarsa menampilkan kalimat "Pairing failed. Run caraka web pair for a new code". |
| Kirim "Reply with the word pong" | Jawaban "pong" tiba, status berubah ke Done. |
| Teks tumbuh dan Stop | Esai panjang tumbuh dengan caret. Stop mengubah status ke Cancelled. |
| Unggah berkas | `qa-note.md` terunggah. Agent membaca isinya. Penampil Markdown membuka berkas lewat cookie perangkat. |
| Kartu izin | Tidak bisa dipicu. Server mengizinkan tulis dan hapus tanpa bertanya, juga di luar workspace. Kartu izin hanya diuji di build demo (tombol, perubahan status). |
| Putuskan | Kembali ke layar Sambungkan. Server menandai perangkat sebagai dicabut. |

Catatan sisi server (tidak diubah): jawaban agent memakai awalan `[ws · #ff3d]`, dan tiap jawaban disusul pesan kedua yang mengulang jawaban plus "Memory saved: ...".

### Tangkapan layar

Build `demo`, 1080x2400, di `scratchpad/store/raw/`: `01-splash` sampai `09-devices`. Bilah status emulator terpotong (artefak emulator, juga di aplikasi Settings). Berkas diberi bilah status bersih (12:00, wifi, baterai penuh) lewat skrip PIL, tanpa tombol navigasi.

### Gate akhir

`:app:testProdDebugUnitTest :app:lintProdRelease :app:bundleProdRelease :app:assembleDemoDebug :app:assembleProdDebug`: BUILD SUCCESSFUL. 40 test, 0 gagal. Tidak ada FATAL EXCEPTION aplikasi di logcat.

## 6. Rilis

13 Oktober 2026: aplikasi `dev.caraka.android` 1.0.0 (versionCode 1) dikirim ke review Google Play, track Production, 178 negara. Listing memakai 7 tangkapan layar dan feature graphic yang diberi label "dibuat dengan AI". Mode demo disediakan agar peninjau bisa membuka semua layar tanpa server.

## 7. Perbaikan rekomendasi Play (1.0.1)

Play Console memberi empat rekomendasi untuk rilis 1.0.0. Rilis 1.0.1 (versionCode 2) memperbaikinya.

| Rekomendasi | Penyebab | Perbaikan |
|---|---|---|
| `androidx.fragment` lama | `play-services-code-scanner` membawa `play-services-base`, yang memakai `fragment:1.0.0` | Tambah `androidx.fragment:fragment:1.9.1` sebagai dependensi langsung |
| Edge-to-edge tidak tampil untuk semua pengguna | `enableEdgeToEdge()` dipanggil setelah `super.onCreate` | Panggil sebelum `super.onCreate` |
| API edge-to-edge usang | Tema memakai `android:statusBarColor` dan `android:navigationBarColor` | Hapus dua atribut itu. Bilah transparan hanya lewat `enableEdgeToEdge()` |
| Batasan orientasi dan ukuran | Manifest gabungan memuat `screenOrientation="portrait"` pada `GmsBarcodeScanningDelegateActivity` | Manifest kita menghapus atribut itu dan menambah `resizeableActivity="true"` |
