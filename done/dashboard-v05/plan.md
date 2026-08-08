# Plan — Fase 5: dasbor read-only lokal (v0.5)

**Slug:** dashboard-v05 · **Tanggal:** 8 Agustus 2026 · **Spec:** `spec/dashboard-v05.md`
**Dasar nomor baris:** `v0.4.0`, commit `9494ec5`.

Urutannya dipilih supaya perubahan pada `src/core/gateway.ts` selesai di dua
langkah pertama dan tidak disentuh lagi. Berkas itu sudah 1.461 baris dan
pekerjaan Discord mendarat di gelombang yang sama; makin cepat sentuhannya
selesai, makin kecil konfliknya.

## Berkas yang disentuh

| Berkas | Perubahan |
|---|---|
| `src/core/status.ts` | baru — `STATE_GLYPH`, `STATE_COLOR` |
| `src/core/gateway.ts` | `Gateway.GLYPH` privat (`:757-763`) dipindah ke `status.ts`; satu baris audit `gateway.start` di `run()` (`:174`) |
| `src/dashboard/server.ts` | baru — `resolveBind`, `createDashboard`, rute |
| `src/dashboard/render.ts` | baru — escape, tabel, shell |
| `src/dashboard/queries.ts` | baru — pembacaan per panel, termasuk turunan run dan beta |
| `src/cli.ts` | subperintah `dashboard` di `main()` (`:604-622`), satu baris di `help()` (`:588-601`) |
| `src/i18n.ts` | kunci `dashboard.*` di kedua katalog |
| `assets/dashboard/htmx.min.js` | baru — di-vendor |
| `assets/dashboard/dashboard.css` | baru |
| `package.json` | `files` (`:30-34`) menerima `assets/dashboard` |
| `site/src/data/docs.ts` | baris `caraka dashboard` di referensi CLI (AC-8.12) |
| `test/unit.test.ts` | test dasbor |
| `test/e2e.test.ts` | satu test: gateway mati, seluruh panel terlayani |
| `docs/…`, `AGENTS.md`, `site/…` | langkah 10 |

Arah dependensi: `src/dashboard/` mengimpor `src/core` dan `src/store`. Tidak
ada berkas di `src/core` yang mengimpor `src/dashboard`.

## Langkah

### 1 · `src/core/status.ts` — nol perubahan perilaku

Ekspor `STATE_GLYPH` (lima state dari `docs/brand.md:204-208` plus `idle` →
`◌`, spec AC-4.2) dan `STATE_COLOR` (hex dari tabel yang sama, `idle` →
n-500 `#7A848F`). `Gateway.setState` (`src/core/gateway.ts:765-773`) membacanya
dari sana. `#FB6F5F` tidak ada di berkas itu sama sekali.

Gerbang langkah ini: `npm test` dan `npm run e2e` lulus tanpa satu assertion
pun diubah.

### 2 · Satu baris audit `gateway.start`

Di `Gateway.run()`, sebelum `deleteWebhook` (`src/core/gateway.ts:180`):
`this.store.audit("gateway.start", "started", { version: this.version })`.
Tanpa debounce, tanpa membaca `meta`. Audit append-only, jadi `MIN(ts)` atas
aksi itu adalah saat mulai pertama dan bertahan (spec K4).

### 3 · Kerangka server

`resolveBind(args)` murni: baca `--port` dan `--bind`, kembalikan
`{ host, port, exposed }`. Tanpa `--bind`, `host` selalu `"127.0.0.1"`
harfiah. Daftar loopback disalin dari `src/cli.ts:384-391` ke satu konstanta
yang dipakai keduanya.

`createDashboard({ dbPath, host, port, scrub, t })` membuka
`new DatabaseSync(dbPath, { readOnly: true })`, memasang router `switch` atas
`URL(req.url, base).pathname`, dan menolak method selain `GET`/`HEAD` dengan
405 sebelum query mana pun. Setiap respons HTML membawa header CSP dan
`nosniff` dari spec AC-5.3.

Baris pertama panel mencetak waktu render. Itu yang membuat halaman tanpa htmx
tetap jujur: tidak ada yang memperbaruinya, dan pembacanya tahu angka yang
dilihatnya berumur berapa (spec AC-5.7). *Koreksi saat implementasi:* draf ini
menaruhnya di kepala dokumen. Panel adalah yang ditukar sebuah poll, jadi jam di
luar panel akan terus mencetak saat tab dibuka sementara baris di bawahnya sudah
berganti — persis kebohongan yang butir ini ada untuk mencegah.

Tulisan audit `dashboard.start` terjadi di subperintah (langkah 8), lewat
`Store` biasa yang dibuka lalu ditutup sebelum handle read-only dibuka. Dasbor
sendiri tidak pernah memegang handle yang bisa menulis.

### 4 · Aset

Ambil `htmx.min.js` rilis resmi, simpan di `assets/dashboard/`, catat versi
dan `sha256sum`-nya di bagian Verifikasi. Tanpa langkah build, tanpa CDN.
`dashboard.css` memakai nada `docs/brand.md:185-190` dan warna status dari
`STATE_COLOR`, dengan stack font sistem monospace — tidak ada `@font-face` dan
tidak ada `@import`.

`package.json` `files` (`:30-34`) menerima `"assets/dashboard"`. Tanpa itu paket
terbit tanpa htmx-nya.

*Koreksi 8 Agustus 2026 saat implementasi.* Langkah ini semula menulis
`"assets"`. Direktori itu sudah berisi empat berkas pemasaran (`banner.svg`,
`flow.svg`, `org-avatar.png`, `org-banner.svg`, 36 KB) yang tidak dibaca satu
baris kode pun saat berjalan. Entri yang lebih sempit memenuhi AC-5.8 dan tidak
menambah apa pun ke tarball selain yang dipakai halaman.

```
ponytail: seluruh tugas htmx di sini adalah swap panel + poll 10 detik.
Kalau panel tidak pernah bertambah, `<meta http-equiv="refresh">` melakukan
hal yang sama tanpa berkas yang di-vendor. Keputusan htmx sudah dikunci di
docs/techstack.md:100; catatan ini yang dibaca ulang kalau panelnya tetap
tujuh setahun lagi.
```

### 5 · Panel dari tabel yang ada

`/` sesi, `/approvals`, `/audit`, `/policy`, `/memory`. Semua query memakai
parameter terikat dan `LIMIT` tetap.

```
ponytail: `/audit` mengambil N baris terakhir dengan LIMIT, tanpa paginasi.
Plafonnya: audit yang panjang hanya bisa dibaca sampai batas itu. Tambahkan
paginasi saat ada yang mengeluh, bukan sebelumnya.
```

`/memory` bercabang pada provider memori di config: `local` menampilkan
`memory_local`, selainnya menyebut provider dan menyatakan isinya tidak di
database ini.

### 6 · `/runs` diturunkan dari audit

Baca `run.start` dan `run.finish` terurut `ts`, pasangkan per `session_id`
secara berurutan. `run.start` tanpa pasangan sesudahnya ditandai `berjalan`
dengan durasi kosong. Tanpa tabel `run`.

### 7 · `/beta`

Dua angka. Waktu setup: `MIN(ts) WHERE action='gateway.start'` sampai
`MIN(ts) WHERE action='msg.in'`; bila yang pertama tidak ada atau tidak
mendahului yang kedua, nilainya tidak diketahui beserta alasannya. Aktivasi:
ada `run.finish` ber-`result='end_turn'` dengan `ts` ≤ mulai pertama + 24 jam.

Bagian bagikan adalah `<details>` tanpa atribut `open`. Isinya satu baris
`<pre>` berpola `caraka <versi> setup=<detik>s activation=<yes|no>`. Kedua
angka tetap tampil di panel meski `<details>` tertutup.

### 8 · Subperintah dan i18n

`caraka dashboard [--port n] [--bind addr]` di `main()` (`src/cli.ts:604-622`)
dan satu baris di `help()`. Urutannya: muat config → resolusi bind → buka
`Store` biasa → tulis `dashboard.start` (`loopback` atau `exposed`) → tutup →
kalau `exposed`, cetak peringatan besar → buka handle read-only → `listen` →
cetak URL.

Kegagalan yang punya pesan sendiri: berkas database tidak ada
(`cli.dashboardNoDatabase`), port dipakai (`cli.dashboardPortBusy`).

Kunci baru masuk ke katalog `en` dan `id`. `id` diketik terhadap `en`
(`src/i18n.ts:1-2`), jadi kunci yang tertinggal gagal di `typecheck`.

### 9 · Test

Satu fixture database di `test/`: sesi enam state, approval empat status,
audit yang memuat `gateway.start`, `msg.in`, pasangan `run.start`/`run.finish`,
satu `run.start` menggantung, satu grant terbuka dan dua tertutup (satu ditutup
tangan, satu lewat jam), dua baris memori. Judul sesi salah satunya berisi `<script>alert(1)</script>`, dan satu
baris audit disisipkan lewat `store.db.prepare` langsung supaya melewati
scrubber saat tulis — itu yang membuktikan scrubber keluar bekerja saat render.

Test integrasi memakai `--port 0` supaya tidak bertabrakan di CI, kecuali dua
test yang memang menguji port tertentu.

### 10 · Dokumen, rilis, tutup

Amandemen sesuai AC-8.1 sampai AC-8.12. Lalu gerbang verifikasi, LOC pasca-merge,
`npm pack --dry-run`, pindah ke `done/dashboard-v05/`.

`npm publish` tidak dijalankan (`spec/v10.md`).

## Pemetaan AC → pembuktian

| AC | Cara pembuktian |
|---|---|
| AC-1.1 | integrasi: start tanpa argumen → `address()` = `127.0.0.1:7718`; stdout memuat URL-nya |
| AC-1.2 | unit: `resolveBind(["--port","7719"])` → `{host:"127.0.0.1",port:7719}` |
| AC-1.3 | integrasi: start tanpa argumen → `server.address().address === "127.0.0.1"`; unit: `resolveBind([])`, `resolveBind(["--host","0.0.0.0"])`, `resolveBind(["0.0.0.0"])` ketiganya tetap `127.0.0.1` — tanpa `--bind` tidak ada bentuk argumen yang memindahkan host |
| AC-1.4 | unit: empat bentuk loopback → `exposed=false`, stdout tanpa peringatan, tanpa baris audit `exposed` |
| AC-1.5 | integrasi: `--bind 0.0.0.0` pada port 0 → stdout memuat peringatan, dan peringatan tercetak sebelum request pertama dilayani |
| AC-1.6 | unit: setelah `--bind 0.0.0.0`, baris `dashboard.start` ber-result `exposed` ada di `audit` dan `details` memuat alamatnya |
| AC-1.7 | unit: setelah start loopback, baris `dashboard.start` ber-result `loopback` ada |
| AC-1.8 | unit: port diikat lebih dulu oleh listener lain → pesan memuat nomor port; `assert(!/\n\s+at /.test(pesan))` |
| AC-1.9 | unit: direktori temp tanpa database → pesan memuat `caraka init`; `existsSync(dbPath)` tetap `false` |
| AC-1.10 | e2e: fixture database, tanpa gateway berjalan, tujuh rute dijawab 200 |
| AC-2.1 | unit: `INSERT` pada handle dasbor melempar `attempt to write a readonly database` |
| AC-2.2 | unit: `POST`, `PUT`, `PATCH`, `DELETE` → 405 |
| AC-2.3 | integrasi: `COUNT(*)` lima tabel + dump `meta` identik sebelum dan sesudah seluruh rute diminta |
| AC-2.4 | `grep -n "prepare(" src/dashboard/` — setiap SQL adalah literal tanpa interpolasi, keluaran ditempel |
| AC-2.5 | unit: `?since=' OR 1=1--` → 200, jendela 24 jam, jumlah baris sama dengan `?since=24h` |
| AC-2.6 | unit: request `node:http` dengan `Host: evil.example.com` → 403 tanpa isi baris audit; `127.0.0.1:<port>`, `localhost`, dan `[::1]` → 200 |
| AC-2.7 | unit: dasbor `--bind 0.0.0.0` menjawab 200 untuk `Host: caraka.tailnet.test` |
| AC-3.1 | unit: enam sesi fixture muncul dengan keenam kolomnya |
| AC-3.2 | unit: dua pasang `run.start`/`run.finish` → dua baris berdurasi benar |
| AC-3.3 | unit: `run.start` menggantung → status `berjalan`, sel durasi kosong |
| AC-3.4 | unit: empat approval fixture → empat status berbeda |
| AC-3.5 | unit: urutan `ts` menurun; `?since=1h` memotong baris yang lebih tua |
| AC-3.6 | unit: baris `msg.in` merender `bytes` dan `sha256`; markup tidak memuat teks pesan fixture |
| AC-3.7 | unit: grant terbuka vs tertutup vs kedaluwarsa → satu ditandai terbuka |
| AC-3.8 | unit: config `memory.provider="local"` → dua baris memori tampil |
| AC-3.9 | unit: config `memory.provider="titen"` → nama provider tampil, `memory_local` tidak dibaca |
| AC-3.10 | unit: dua `run.start` pada sesi yang sama → yang pertama berhasil `interrupted`, tepat satu baris `berjalan` di seluruh panel |
| AC-4.1 | unit: keenam glif hadir sebagai karakter di HTML sesi |
| AC-4.2 | unit: sesi `idle` merender `◌` di markup, dan `#7A848F` ada di `.state-idle` pada CSS. Hexnya tidak bisa berada di HTML: `style-src 'self'` pada AC-5.3 menutup atribut `style` sebaris, jadi warna hidup di stylesheet dan `STATE_COLOR` adalah sumbernya — test membandingkan keduanya, sehingga CSS yang diedit lepas dari `docs/brand.md` gagal |
| AC-4.3 | unit: kelima hex `docs/brand.md:204-208` hadir di CSS; `grep -c "FB6F5F" assets/dashboard/` = 0, ditempel |
| AC-4.4 | unit: nama state hadir sebagai teks di markup; `grep "::before" assets/dashboard/dashboard.css` tidak memuat glif |
| AC-4.5 | pemeriksaan manual: daftar pasangan warna yang dipakai vs tabel `docs/brand.md:185-190`, hasilnya ditulis di Verifikasi |
| AC-5.1 | unit: `GET /assets/htmx.min.js` → 200 dan body identik byte-per-byte dengan berkas paket |
| AC-5.2 | unit: regex atas HTML tiap rute tidak menemukan `src`/`href`/`url(` yang mengarah ke skema atau ke `//` |
| AC-5.3 | unit: kedua header hadir pada tiap respons HTML, dan nilai CSP dibandingkan tepat dengan konstanta `CSP`. Nilainya bertambah `connect-src 'self'` dibanding draf spec — amandemen dan alasannya ada di spec pada butir yang sama |
| AC-5.4 | unit: tiap anchor navigasi punya `hx-get` dan `hx-target`; pemeriksaan manual di peramban dicatat |
| AC-5.5 | unit: panel membawa `hx-trigger="every 10s"` |
| AC-5.6 | unit: tiap anchor punya `href` ke path yang sama, dan `GET` path itu mengembalikan dokumen penuh (memuat `<title>`) |
| AC-5.7 | unit: setiap respons HTML memuat waktu render, dan markup tidak memuat `http-equiv` maupun satu pun elemen `<script>` selain tag htmx — tanpa htmx, tidak ada yang bisa memperbarui halaman. Waktunya berada di baris pertama panel, bukan di kepala dokumen: panel adalah yang ditukar sebuah poll, dan jam di luarnya akan terus mencetak saat tab dibuka sementara baris di bawahnya sudah berganti |
| AC-5.8 | `npm pack --dry-run` ditempel, memuat `assets/dashboard/htmx.min.js` |
| AC-6.1 | unit: kelima karakter di-escape pada nilai fixture yang memuatnya |
| AC-6.2 | unit: baris audit yang disisipkan langsung (melewati scrub tulis) berisi string berbentuk token → respons memuat `[REDACTED]`, bukan tokennya; termasuk pada halaman 500 |
| AC-6.3 | unit: judul `<script>alert(1)</script>` → respons memuat `&lt;script&gt;` dan tidak memuat tag mentahnya |
| AC-6.4 | unit: handler distub melempar → 500, body satu kalimat, tanpa `\n    at ` |
| AC-6.5 | `grep -nP "\"[A-Z][a-z]{3,}" src/dashboard/` kosong selain kunci i18n, ditempel; `typecheck` menjaga kedua katalog |
| AC-7.1 | e2e: setelah `run()` mulai, `SELECT COUNT(*) FROM audit WHERE action='gateway.start'` = 1 |
| AC-7.2 | unit: fixture `gateway.start` t0 dan `msg.in` t0+95 dtk → panel menampilkan 95 detik |
| AC-7.3 | unit: fixture tanpa `gateway.start` → teks tidak diketahui beserta alasannya |
| AC-7.4 | unit tiga fixture: `run.finish` `end_turn` +1 jam → ya; +25 jam → tidak; `cancelled` +1 jam → tidak |
| AC-7.5 | unit: respons memuat kalimat proksi dan string `run.finish` |
| AC-7.6 | `grep -nE "fetch\(|http\.request|https\.request|net\.connect|WebSocket" src/dashboard/` kosong, ditempel |
| AC-7.7 | unit: `<details>` memuat satu `<pre>` yang cocok `^caraka \S+ setup=\d+s activation=(yes\|no)$` |
| AC-7.8 | unit: elemen `<details>` tidak punya atribut `open`; kedua angka hadir di luar elemen itu |
| AC-7.9 | unit: baris bagikan tidak memuat hostname mesin, path workspace fixture, principal id fixture, maupun judul sesi fixture |
| AC-8.1 | `grep -n "dasbor" docs/ui-ux.md` menemukan baris 5, ditempel |
| AC-8.2 | `grep -n "caraka dashboard" docs/ui-ux.md` di dalam blok §7, ditempel |
| AC-8.3, AC-8.4 | diff `docs/security.md` §8 ditinjau baris demi baris; `grep -n "loopback" docs/security.md` ditempel |
| AC-8.5 | `grep -n "127.0.0.1" docs/security.md` menemukan butir baru di §12, ditempel |
| AC-8.6 | `grep -n "Amandemen" docs/adr/0006*.md` menemukan judul bertanggal, ditempel |
| AC-8.7 | `grep -n "FR-AUD-06" docs/frd.md` memuat nama perintah dan status terbangun |
| AC-8.8 | `grep -n "FR-OPS-02" docs/frd.md` memuat `dashboard` di daftar terpasang |
| AC-8.9 | `docs/roadmap.md` baris instrumentasi dibaca ulang setelah diedit, dikutip di Verifikasi |
| AC-8.10 | `grep -n "vendor\|CDN" docs/techstack.md` di dalam §9, ditempel |
| AC-8.11 | `grep -n "src/dashboard" AGENTS.md`, ditempel |
| AC-8.12 | `grep -rn "chat dan terminal\|chat and terminal\|dashboard" site/src/data/` ditinjau; `site/src/data/status.ts:200` dibaca ulang dan dinyatakan masih benar. Referensi CLI di `site/src/data/docs.ts` tidak tertangkap grep itu dan tetap sebuah klaim permukaan produk, jadi barisnya ditambahkan; `cd site && npm run typecheck && npm run lint && npm test` dijalankan ulang |

## Risiko

1. **WAL dan handle read-only.** Diukur 8 Agustus 2026 pada Node v24.18.0: satu
   pembaca `readOnly: true` berhasil saat penulis masih memegang database, dan
   berhasil pula setelah penulis menutupnya bersih (berkas `-wal`/`-shm`
   hilang). Sisa risikonya: gateway yang dibunuh `SIGKILL` meninggalkan
   `-shm`, dan SQLite butuh menulisnya untuk membaca database WAL. Selama
   kedua proses berjalan sebagai pengguna yang sama, itu aman. Kalau suatu
   saat gateway dijalankan sebagai pengguna lain, asumsi ini patah dan harus
   diuji ulang.
2. **Port 7718 dipakai program lain.** Ditangani AC-1.8 dengan pesan yang
   menyebut `--port`. Bebas pada mesin pengembangan saat diperiksa 8 Agustus
   2026, yang bukan jaminan untuk mesin lain.
3. **Aset yang di-vendor di repo publik.** htmx masuk sebagai berkas, bukan
   dependensi. Yang menjaga: versi dan `sha256sum` dicatat di Verifikasi, dan
   berkasnya tidak pernah diedit tangan. Anggaran dependensi runtime tidak
   bergerak dari 4 (`docs/techstack.md:123` batas 25).
4. **`files` berubah, dan permukaan paket ikut berubah.** `npm pack --dry-run`
   diperiksa sebelum apa pun; `npm publish` tetap menunggu pemilik.
5. **Anggaran LOC.** `src/` hari ini 4.290 baris (`wc -l`, 8 Agustus 2026),
   batas 8.000 (`AGENTS.md:19`). Perkiraan pekerjaan ini 350–450 baris. Angka
   pasca-merge ditulis di Verifikasi.
6. **Dua item Fase 5 di gelombang yang sama.** PR ini menyentuh
   `src/core/gateway.ts` di dua tempat kecil (impor glif, satu baris audit).
   PR Discord me-rebase di atasnya, bukan sebaliknya, karena sentuhan dasbor
   selesai di langkah 2.
7. **Metrik beta buta terhadap pemasangan lama.** Database yang dibuat sebelum
   v0.5 tidak punya `gateway.start`, jadi waktu setupnya tidak diketahui
   selamanya. Ditangani AC-7.3 sebagai teks jujur, bukan sebagai angka
   tebakan.

## Verifikasi

Perintahnya `npm run verify` di akar (`package.json:46` =
`lint && typecheck && test && e2e && build`). `standards/ears.md:153-158` dan
`CLAUDE.md` menyebut susunan yang sedikit berbeda; `package.json` yang dipakai
sebagai kebenaran.

```bash
npm run verify
wc -l $(find src -name '*.ts')
npm pack --dry-run
sha256sum assets/dashboard/htmx.min.js
```

Ditambah dua pemeriksaan yang tidak dilakukan alat: tanpa rahasia di diff, dan
prosa yang lolos bagian *Writing style* `AGENTS.md`.

### Keluaran, 8 Agustus 2026 · Node v24.18.0

```
$ npm run verify
> npm run lint && npm run typecheck && npm test && npm run e2e && npm run build

> oxlint src test scripts && oxfmt --check src test scripts bin package.json tsconfig.json
Found 0 warnings and 0 errors.
Checking formatting...
All matched files use the correct format.

> tsc -p tsconfig.json --noEmit
(tanpa keluaran)

> node --import tsx --test test/unit.test.ts
ℹ tests 80
ℹ pass 80
ℹ fail 0

> node --import tsx --test test/e2e.test.ts
ℹ tests 41
ℹ pass 41
ℹ fail 0

> tsc -p tsconfig.json
(tanpa keluaran)
```

Empat belas test dasbor baru di `test/unit.test.ts`, dua di `test/e2e.test.ts`.
Tidak satu pun assertion yang sudah ada diubah (gerbang langkah 1).

```
$ sha256sum assets/dashboard/htmx.min.js
71ea67185bfa8c98c39d31717c6fce5d852370fcdfd129db4543774d3145c0de
```

htmx 2.0.10, diambil dari registry npm (`npm pack htmx.org@2.0.10`,
`dist.integrity sha512-kdeJe7ZVwaS6QMz/ebBIVtZdpwen6L0OQ5GOhPV9MKBb196TCZeZu4yA7ZIQsaLKv7EpXz+So7KSXNuHXhj7Cw==`),
51.238 byte, disalin apa adanya dan tidak pernah diedit tangan.

```
$ npm pack --dry-run
npm notice  3.4kB assets/dashboard/dashboard.css
npm notice 51.2kB assets/dashboard/htmx.min.js
npm notice unpacked size: 507.7 kB
npm notice total files: 68
```

`npm publish` tidak dijalankan.

#### Bukti grep

```
$ grep -n "prepare(" src/dashboard/
queries.ts:52,78,98,124,142,179,236,249 — delapan, semuanya literal template
tanpa satu pun `${`. Test "every SQL statement in the dashboard is a literal
with bound parameters" memeriksanya ulang di setiap jalannya.

$ grep -c "FB6F5F" assets/dashboard/*
dashboard.css:0
htmx.min.js:0

$ grep -nE "fetch\(|http\.request|https\.request|net\.connect|WebSocket" src/dashboard/ -r
(kosong)

$ grep -rnP '"[A-Z][a-z]{3,}' src/dashboard/
(kosong — nama header HTTP ditulis huruf kecil supaya grep ini tetap bersih)

$ grep -n "dasbor" docs/ui-ux.md
5: … Permukaannya adalah **chat**, **terminal**, dan sejak v0.5 satu **dasbor
   lokal read-only** di `127.0.0.1`.

$ grep -n "caraka dashboard" docs/ui-ux.md
185: caraka dashboard [--port n] [--bind addr]         # terpasang

$ grep -n "loopback" docs/security.md
232: … sejak v0.5 ia berdampingan dengan satu socket: dasbor read-only
     mendengarkan di loopback …

$ grep -n "127.0.0.1" docs/security.md   (butir §12 yang baru)
300: Kami **tidak** memasang autentikasi pada dasbor lokal …

$ grep -n "Amandemen" docs/adr/0006-telegram-sebagai-channel-pertama.md
21: ### Amandemen 8 Agustus 2026 — nol port terbuka, bukan nol socket

$ grep -n "src/dashboard" AGENTS.md
30: src/dashboard/   the read-only local page: server.ts queries.ts render.ts
41: … `src/dashboard/` sits on the same side as a channel …
```

`docs/roadmap.md` setelah diedit, baris 115: “Instrumentasi lokal: waktu setup
dan aktivasi, dihitung dari audit yang sudah ada, tanpa telemetri keluar. Opt-in
melekat pada **membagikan** angkanya, bukan pada mengumpulkannya — audit adalah
kontrol wajib dan tidak pernah opsional, jadi angkanya sudah ada di mesin
sebelum ada yang membukanya.” (AC-8.9)

#### AC-4.5 — pasangan warna yang dipakai

Diukur 8 Agustus 2026 dengan rumus WCAG 2.1 terhadap latar halaman `#05080C`.
Tiga nada pertama cocok persis dengan angka yang sudah tertulis di
`docs/brand.md`, yang membuat metode pengukurannya sama; enam sisanya adalah
warna semantik yang tabel itu tidak pernah mengukur, jadi angkanya dicatat di
sini dan di kepala `assets/dashboard/dashboard.css`.

| Pasangan | Rasio | Sumber |
|---|---|---|
| n-900 `#E9EDF2` teks utama | 17,07 | `docs/brand.md`, cocok |
| n-700 `#B2BCC6` teks pendukung | 10,42 | `docs/brand.md`, cocok |
| n-500 `#7A848F` metadata dan `idle` | 5,28 | `docs/brand.md`, cocok |
| `running` `#6FB9F0` | 9,44 | diukur di sini |
| `awaiting_approval` `#FFD67E` | 14,50 | diukur di sini |
| `done` `#8EEE98` | 14,17 | diukur di sini |
| `failed` `#FF93B2` | 9,62 | diukur di sini |
| `cancelled` `#CB86DB` | 7,62 | diukur di sini |

Tidak ada pasangan baru di luar daftar itu. Latar `#0C1116` hanya dipakai di
baris kepala tabel dan di `<pre>`, keduanya dengan n-700 (9,84) dan n-900
(16,13).

#### AC-5.4 — pemeriksaan manual

Belum dijalankan di peramban sungguhan. Yang sudah otomatis: setiap anchor
membawa `hx-get`, `hx-target="#panel"` dan `href` ke path yang sama; permintaan
ber-`HX-Request: true` dijawab dengan `<section id="panel-body">` tanpa
`<title>`; dan setiap panel membawa `hx-trigger="every 10s"`. Yang belum:
melihat swap itu terjadi di Chromium, Firefox, dan WebKit dengan CSP hidup.
Butir ini tetap terbuka sampai seseorang melakukannya dan menulis hasilnya di
sini.

#### LOC pasca-merge

```
$ wc -l $(find src -name '*.ts')
6.518 total (batas 8.000, AGENTS.md)
```

Sebelum pekerjaan ini `src/` berjumlah 5.559 baris, jadi dasbor menambah 959:
`src/dashboard/` 735, `src/i18n.ts` +144, `src/cli.ts` +43, `src/core/status.ts`
33, `src/core/gateway.ts` +4. Perkiraan di risiko 5 adalah 350–450 dan meleset
dua kali lipat. Sebabnya satu, dan bisa dilihat di angkanya: AC-6.5 menuntut
setiap kata yang dibaca manusia berasal dari `src/i18n.ts` dan hadir di kedua
katalog, dan 45 kunci dikali dua katalog adalah 144 baris yang tidak menghitung
satu pun perilaku. Sisa anggaran 1.482 baris.

#### Yang tidak dikerjakan dari plan ini

`doctor` tidak melaporkan apakah dasbor berjalan. Tidak ada AC yang memintanya,
dan sebuah baris doctor yang benar butuh probe ke port — `doctor` sudah menolak
membuat baris merah untuk hal yang bukan kesalahan, dan dasbor yang tidak
berjalan bukan kesalahan.

### Langkah 10 — dokumen dan penutupan rilis, 8 Agustus 2026

Amandemen AC-8.1 sampai AC-8.12 sudah ada di bagian *Bukti grep* di atas dan
tidak diulang. Yang ditambahkan saat penutupan rilis, di luar daftar itu:

- `docs/security.md` §3 baris T7 menyebut bahwa tidak ada channel yang
  mendengarkan, sehingga satu-satunya listener di mesin adalah dasbor. Baris itu
  dulu hanya bicara tentang gateway.
- `docs/techstack.md` §11 menyebut htmx sebagai satu berkas 51 KB di tarball,
  di luar tabel perkiraan ukuran yang tidak punya baris untuknya.
- `site/AGENTS.md` bagian *Content* ditulis ulang. Paragraf lamanya masih
  menjelaskan pratinjau v0.2 dan melarang menyiratkan memori dikirim — dua hal
  yang v0.3, v0.4, dan v0.5 sudah membuat salah, dan sebuah larangan yang salah
  akan menahan penulis berikutnya dari menulis yang benar. Yang menggantikannya
  menyebut apa yang v0.5 benar-benar dukung beserta batas tiap klaim, dan
  daftar yang masih tidak boleh disiratkan.
- `site/src/data/security.ts` mendapat dua butir *what we do not claim* baru:
  dasbor tanpa autentikasi, dan jalur Discord yang tak pernah menyentuh Discord
  sungguhan. Keduanya cermin `docs/security.md` §12.
- `site/scripts/gen-assets.mjs` dan `site/src/data/og.ts`: bilah fase pada
  kartu OG dulu menggambar 62% dan 48% untuk fase 1 dan 2. Angka itu gambar
  comp, bukan pengukuran, dan tidak ada dokumen yang mengukur pecahan sebuah
  fase. Bilahnya menjadi biner — penuh bila rilisnya terbit, kosong bila
  pekerjaannya belum mulai — dan cincin `live` pindah ke fase 5.

### Gerbang penutup — 8 Agustus 2026, rilis 0.5.0

Keluaran `npm run verify` akar, gerbang situs, baseline `/status` yang bergeser,
dan LOC `src/` pasca-merge sama untuk kedua bagian Fase 5 dan ditempel utuh di
`done/discord-v05/plan.md`. Yang khusus bagian ini:

```
$ npm pack --dry-run
npm notice  3.4kB assets/dashboard/dashboard.css
npm notice 51.2kB assets/dashboard/htmx.min.js
npm notice unpacked size: 587.1 kB
npm notice total files: 80

$ sha256sum assets/dashboard/htmx.min.js
71ea67185bfa8c98c39d31717c6fce5d852370fcdfd129db4543774d3145c0de
```

Sama persis dengan sha256 yang dicatat di langkah 4: berkasnya tidak pernah
diedit tangan. Tarball tumbuh dari 68 ke 80 berkas dan dari 507,7 kB ke 587,1 kB
karena `src/dashboard/` dan `src/channels/discord.ts` ikut ke `dist/`.

`src/dashboard/` sekarang **783 baris** (`server.ts` 409, `queries.ts` 260,
`render.ts` 114), naik dari 735 saat langkah 9 karena kunci i18n dan header
ditambah selama langkah 10. `src/core/status.ts` tetap 33.

AC-5.4 tetap terbuka: swap htmx belum pernah dilihat di peramban sungguhan
dengan CSP hidup. Itu satu baris di **Limited** CHANGELOG 0.5.0 dan satu gerbang
terbuka baru pada kartu Unreleased `site/src/data/status.ts`, bukan hanya
catatan di sini.

`npm publish` tidak dijalankan.
