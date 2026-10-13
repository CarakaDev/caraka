# Plan — aplikasi Android Caraka

**Spec:** [`../../spec/android-app/spec.md`](../../spec/android-app/spec.md) · **Standar:** [`standards/ears.md`](../../standards/ears.md)

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
