# Spec — lampiran-masuk: dokumen sampai ke agent, dan gambar sampai di kedua rute

**Status:** rencana · **Tanggal:** 10 September 2026

## Latar

Pengirim melampirkan PDF dan Caraka menjawab bahwa ia tidak bisa menyerahkan
dokumen ke agent ini. Kalimat yang sama menjawab sebuah gambar setiap kali sesi
berjalan di rute CLI Claude Code. Dua gejala, satu sebab.

Penolakannya ditulis di satu baris. `takeAttachments` (`src/core/gateway.ts:1303`)
menulis lampiran ke `~/.caraka/inbox/<run>/` lalu menyebut path-nya di blok
`<lampiran>` yang ikut ke prompt (`:1341`). Sebelum satu byte diminta, `:1315`
membaca tiga syarat sekaligus:

```ts
if (!name || driver.acceptsFiles !== true || !channel.fetchAttachment) {
```

`name` datang dari `attachmentName` (`src/core/security.ts:72`), yang membaca
`ATTACHMENT_EXTENSIONS` (`:52`). Daftar itu memuat empat mime gambar dan tidak
ada yang lain, jadi sebuah PDF menerima `null` dan jatuh ke `attach.unsupported`
(`src/i18n.ts:17`, `:410`). Itu gejala pertama.

`driver.acceptsFiles` menutup gejala kedua. Di rute CLI nilainya
`Boolean(preset.imageArg)` (`src/drivers/cli.ts:111`), dan
`presets/agents/claude-code.yaml` sengaja tidak menulis `imageArg`. Komentar di
berkas itu menyebut alasannya: pada rute CLI, Read dilaporkan menjawab EPERM
untuk path di luar direktori proyek dan `additionalDirectories` dilaporkan tidak
menutupnya (anthropics/claude-code#29013), jadi memberi flag berarti mengirim
path yang akan ditolak.

Di bawah keduanya ada satu sebab yang sama: **inbox berada di luar workspace**.
`carakaPaths().inbox` adalah `~/.caraka/inbox` (`src/config.ts:246`, `:259-263`),
dan direktori kerja agent adalah `workspace.path` pada kedua rute —
`driver.session(agentId, workspace.path)` di `src/core/gateway.ts:1397`, yang di
rute ACP menjadi `cwd` pada `session/new` (`src/drivers/claude-acp.ts:185`) dan
di rute CLI menjadi `state.cwd` yang dipakai `spawnAgent` (`src/drivers/cli.ts:151`).
Path yang disebut blok `<lampiran>` karena itu selalu berada di luar direktori
proyek. Penyerahan lewat path tidak bekerja di satu rute pun hari ini, dan satu-
satunya rute yang benar-benar bisa membaca berkas adalah ACP, lewat blok konten
gambar (`src/drivers/claude-acp.ts:82-91`, `:193`).

Arah perbaikannya karena itu bukan di adapter mana pun. Ia di `takeAttachments`,
tempat setiap rute lewat.

### Tulis lampiran di dalam workspace

Sebuah berkas yang duduk di dalam direktori proyek adalah berkas yang boleh
dibuka tool berkas milik agent, di kedua rute, tanpa flag dan tanpa izin
tambahan. Itu menghapus EPERM sebagai sebab, dan dengan itu menghapus alasan
`claude-code.yaml` tidak punya jalan masuk gambar.

Yang tetap: penghapusan di `finally` (`src/core/gateway.ts:1500-1502`), mode 0700
pada direktori, mode 0600 pada berkas (`src/channels/telegram.ts:411`), dan nama
berkas yang dibangkitkan penuh oleh Caraka tanpa satu karakter pun dari pengirim.

**Namanya `<workspace>/.caraka-inbox/<run>/`.** Bukan `.caraka`: `~/.caraka`
sudah rumah produk ini, dan fitur berikutnya yang ingin konfigurasi per-workspace
akan mengambil nama itu — sementara direktori ini dihapus utuh setiap run
selesai. `.caraka-inbox` tidak punya pemilik lain.

Kalau nama itu sudah ada sebagai berkas, `mkdir` gagal dengan ENOTDIR dan
lampiran itu dijawab satu kalimat. Kalau ia sudah ada sebagai direktori, Caraka
memakainya dan menghapusnya utuh di akhir run. Tidak ada berkas penanda "ini
milik kami": penanda berarti satu berkas lagi untuk ditulis, diuji, dan salah
dibaca, sedangkan yang dibelinya cuma sebuah kasus yang belum pernah terjadi.
Konsekuensinya ditulis apa adanya di `docs/security.md`.

### `.gitignore` diperlukan, dan `finally` bukan seluruh jawabannya

Penghapusan di `finally` menjawab keadaan sesudah run. Ia tidak menjawab keadaan
**selama** run, dan selama run berkas itu duduk di dalam repositori yang sedang
dikerjakan agent. Agent yang menjalankan `git add -A && git commit` ikut
memasukkan lampiran chat ke riwayat repositori orang.

Yang menutupnya satu berkas: `<workspace>/.caraka-inbox/.gitignore` berisi `*`.
Diukur di mesin ini pada 10 September 2026 dengan git 2.43.0, pada repositori
kosong yang dibuat untuk pengukuran itu:

```
$ git status --short
(kosong)
$ git status --short --ignored
!! .caraka-inbox/
$ git check-ignore -v .caraka-inbox/run1/x.pdf
.caraka-inbox/.gitignore:1:*    .caraka-inbox/run1/x.pdf
$ git add -A && git status --short
(kosong)
```

Pola `*` mencakup `.gitignore` itu sendiri, jadi direktorinya tidak muncul sama
sekali. Berkas itu inert di workspace yang bukan repositori git, jadi tidak ada
cabang yang perlu ditulis untuk membedakannya.

Yang **tidak** disentuh adalah `.gitignore` milik workspace. Menambah baris ke
berkas yang dilacak git berarti Caraka mengubah berkas milik operator, dan
diffnya muncul di setiap `git status` sesudahnya.

### Daftar izin mime, dan pembaca tiap barisnya

Sesudah perubahan di atas, pembaca sebuah dokumen adalah tool berkas milik agent
itu sendiri. Yang ditambahkan karena itu adalah mime yang ekstensinya tidak
ambigu dan isinya bisa dibaca sebagai berkas biasa:

| mime | ekstensi | kenapa ia punya pembaca |
|---|---|---|
| `text/plain` | `.txt` | Kesembilan preset di `presets/agents/` adalah coding agent yang berjalan dengan cwd workspace dan pekerjaannya membaca berkas di sana. Teks biasa adalah satu-satunya bentuk yang pasti terbaca oleh kesembilannya. |
| `text/markdown` | `.md` | Sama, dan ini bentuk brief yang benar-benar dikirim orang. |
| `text/csv` | `.csv` | Sama. |
| `application/json` | `.json` | Sama. |
| `application/pdf` | `.pdf` | Bentuk laporan yang pemilik minta. Pembacanya belum terukur di sini; lihat **Batas yang diakui** butir 2. |

Yang **tidak** masuk, dan alasannya:

- **Mime yang ekstensinya dijalankan runtime** (`.sh`, `.js`, `.py`, `.ps1`).
  Berkas itu akan duduk di dalam workspace tempat agent bekerja, dan mode
  `read-only` menjaga tool call (`writesOrExecutes`, `src/core/security.ts:183`),
  bukan apa yang tergeletak di cwd. Sebuah skrip kiriman orang asing di direktori
  kerja agent adalah harga yang tidak sebanding dengan kemudahannya.
- **docx, xlsx, pptx.** Ketiganya kontainer zip. Tidak ada pembaca yang terbukti,
  dan tiap satu berarti satu baris ekstensi untuk sesuatu yang belum tentu
  terbaca.
- **`application/octet-stream`.** Ia tidak menyebut format apa pun, jadi tidak
  ada ekstensi yang bisa dipilih darinya tanpa membaca `file_name` kiriman
  pengirim — dan tidak membacanya adalah seluruh alasan `attachmentName` ada.

Plafon 20 MB tidak bergerak untuk dokumen. Angka itu milik `getFile`
("bots can download files of up to 20MB in size", `docs/security.md:337`), jadi
ia batas kemampuan adapter dan bukan kebijakan yang Caraka bisa naikkan.
Penegakannya sudah di dua tempat dan keduanya kind-agnostic:
`src/channels/telegram.ts:337` menandai `tooBig` dari `file_size`, dan `:408`
menghitung ulang byte saat dibaca.

### `acceptsFiles` menjaga penyerahan byte, bukan pengunduhan

`docs/api.md` menyebut `acceptsFiles` sebagai "apakah rute ini bisa menaruh
berkas di depan agent" (`src/core/driver.ts:101`), dan yang benar-benar
dijaganya adalah satu jalur: blok konten `image` di ACP
(`src/drivers/claude-acp.ts:193`) dan flag `-i` di codex
(`src/drivers/cli.ts:145-148`). Keduanya jalur **gambar**. `imageBlock`
menyusun mime-nya dari ekstensi berkas (`src/drivers/claude-acp.ts:85-88`), jadi
sebuah `.pdf` yang masuk ke sana akan dikirim sebagai `image/pdf`; dan
`imageArg` codex adalah `--image` (openai/codex#2085).

Karena itu satu lampiran mendapat tepat satu jalur penyerahan:

- Gambar, di rute yang `acceptsFiles`-nya true → byte atau flag, seperti hari
  ini, dan tidak ikut ke blok `<lampiran>`.
- Semua lampiran lain yang berhasil diunduh → satu baris path relatif di blok
  `<lampiran>`.

Aturan itu membuat array `files` yang menyeberang ke `driver.prompt`
(`src/core/gateway.ts:1468`) tetap berisi gambar saja tanpa mengubah tanda tangan
`prompt(sessionId, prompt, route, files?: string[])`. Gambar di rute CLI Claude
Code, yang hari ini dijawab kalimat degradasi, sampai lewat baris blok itu.

### Dua penjaga yang membaca `files` dan harus membaca hal lain

Keduanya benar hari ini hanya karena `files` dan "ada lampiran" adalah hal yang
sama. Sesudah perubahan ini keduanya berpisah, dan keduanya salah:

1. `withAttachment: carried.files.length > 0` (`:1408`) dibaca `:1954` untuk
   mematikan jalur auto-approve jendela trust. Sebuah PDF menghasilkan `files`
   kosong, jadi run yang membawa masukan tak terpercaya ke konteks model akan
   kembali memakai auto-approve. Itu regresi terhadap AC-6.2 `lampiran-chat` dan
   terhadap `docs/security.md:393`.
2. `if (!prompt && carried.files.length === 0)` (`:1414`) membatalkan run. Sebuah
   PDF tanpa caption menghasilkan `files` kosong dengan blok terisi, jadi run
   yang seharusnya jalan dibatalkan sebagai "tidak ada yang dijalankan".

### Yang menyapu sisa

Proses yang mati di antara `mkdir` dan `finally` meninggalkan
`<workspace>/.caraka-inbox/<run>/`. Sampai `caraka start` berikutnya, berkas itu
tinggal di proyek orang, tidak terlihat oleh `git status` karena `.gitignore` di
atas.

Yang menyapunya adalah sapuan yang sudah ada, diperlebar. `src/core/gateway.ts:357`
sudah menghapus `carakaPaths().inbox` sebelum satu channel pun polling; di
sebelahnya ditambahkan penghapusan `<path>/.caraka-inbox` untuk setiap workspace
di `this.workspaces` (`:181`). Baris `~/.caraka/inbox` tetap di tempatnya dan
tetap di `uninstallTargets` (`src/cli.ts:1061`): ia sekarang menyapu apa yang
ditinggalkan versi 1.5.x, dan menghapusnya berarti sisa itu tinggal selamanya di
mesin yang pernah menjalankannya.

`uninstallTargets` tidak diberi direktori workspace. Ia menerima `paths` saja,
dan memberinya daftar workspace berarti `caraka uninstall` menghapus sesuatu di
dalam repositori orang. Sapuan saat start sudah menutup kasusnya.

## Ruang lingkup

Core: `src/core/security.ts` (lima baris `ATTACHMENT_EXTENSIONS`),
`src/core/gateway.ts` (`takeAttachments` menerima workspace, direktori tujuan,
berkas `.gitignore`, pemisahan gambar dan blok, path relatif, baris audit
penolakan, dua penjaga di `:1408` dan `:1414`, target `rm` di `:1500`, sapuan
workspace di `:357`).

Kalimat: `src/i18n.ts`, satu kunci baru di kedua katalog dan satu kunci lama yang
kalimatnya menyempit ke sebab yang tersisa.

Preset: `presets/agents/claude-code.yaml`, komentar yang menyatakan pemakai jalur
CLI mendapat kalimat degradasi.

Dokumen yang bergerak di commit yang sama: `docs/security.md` §9 (letak, nama
direktori, daftar mime, dan konsekuensi `.caraka-inbox` yang dihapus utuh),
`docs/frd.md` FR-CHAN-04, `docs/api.md:83` (contoh path MCP inbox),
`docs/design.md:58` bila bentuk yang menyeberang berubah.

Test: `test/unit.test.ts` dan `test/e2e.test.ts`.

## Yang tidak dikerjakan

- **Transkripsi voice note.** FR-CHAN-04 menggantungkannya pada transcriber yang
  dikonfigurasi operator, dan tidak ada satu pun di repositori ini. `audio` tetap
  diklasifikasi, diaudit, dan dijawab satu kalimat.
- **Video dan sticker.** Tidak ada mime video di daftar izin dan tidak ada
  pembaca untuk satu pun di antara kesembilan preset. Sebuah `.mp4` 20 MB di
  dalam workspace hanya menambah berkas yang tidak dibaca siapa pun.
- **`location`.** Ia tidak punya berkas sama sekali (`src/channels/telegram.ts:163`),
  jadi tidak ada yang bisa diunduh dan kalimatnya tetap.
- **Unduhan di WhatsApp dan Discord.** Keduanya masih hanya mengklasifikasi dan
  tidak menyediakan `fetchAttachment`. Pekerjaan ini tidak mengubahnya; jawabannya
  tetap kalimat degradasi. Media Cloud API butuh dua langkah dengan bearer
  token-nya sendiri, Baileys mendekripsi sendiri, dan lampiran Discord di guild
  dikosongkan server.
- **`MEDIA:<path-atau-url>` dalam bentuk apa pun.** `docs/frd.md:42` mencabutnya
  pada 15 Agustus 2026. Tidak ada satu baris pun di core yang mengangkat path
  dari keluaran agent.
- **Menaikkan plafon 20 MB.** Ia batas `getFile`, bukan pilihan Caraka.
- **Membaca `file_name` pengirim untuk menebak ekstensi.** Nama berkas
  didefinisikan Bot API sebagai "as defined by the sender", dan tidak membacanya
  adalah alasan `attachmentName` ada.
- **Menambah baris ke `.gitignore` milik workspace.** Caraka tidak mengubah
  berkas yang dilacak repositori orang.
- **Direktori workspace di `uninstallTargets`.** Alasannya di **Yang menyapu
  sisa**.
- **Kebijakan retensi.** Lampiran hidup selama satu run dan disapu saat start,
  seperti hari ini.
- **Field `caps` atau field driver kelima.** `acceptsFiles` tetap satu-satunya,
  dan artinya menyempit ke apa yang memang dijaganya.

## Biaya

`src/` terukur **10.621 baris** pada 10 September 2026
(`find src -name '*.ts' | xargs wc -l`), 2.621 di atas pagu ~8.000. Pagu tidak
bergeser.

Perkiraannya **80–140 baris**, ditulis sebagai rentang karena ledger `AGENTS.md`
mencatat empat perkiraan tunggal yang meleset ke bawah dan satu rentang yang
tepat. Yang berulang kali kurang dihargai di sana adalah harga membuat sebuah
keputusan bisa dijangkau test. Di sini harga itu sebagian besar sudah dibayar:
`takeAttachments` sudah menerima `session` dan `driver`, `workspace` sudah ada di
pemanggilnya (`:1403`), harness di `test/unit.test.ts:5402` dan
`test/e2e.test.ts:335` sudah memalsukan `acceptsFiles` dan `fetchAttachment`, dan
keduanya sudah membuat direktori sementara. Yang belum dibayar adalah workspace
yang bisa ditulis di dalam test, dan itu satu opsi harness.

Pembagian kasarnya: ≈14 di `security.ts` beserta komentar daftar izinnya, ≈55 di
`gateway.ts`, ≈8 di `i18n.ts`, ≈4 komentar di `claude-acp.ts` yang menyebut kenapa
`files` tidak boleh berisi selain gambar.

Tidak ada penghapusan yang membayarnya, dan tidak ada yang dijanjikan.
`pangkas-berulang` sudah mengukur lima kandidat yang empat spec sebelumnya terus
janjikan pada −35 baris, bukan +400.

## Batas yang diakui

1. **Mime datang dari pengirim.** Bot API mendefinisikan `mime_type` sebagai "as
   defined by the sender", dan `classify` meneruskannya apa adanya
   (`src/channels/telegram.ts:333`). Sebuah PDF yang tiba sebagai
   `application/octet-stream` ditolak meski isinya PDF. Klien mana melaporkan
   apa tidak diukur di sini. Yang mengukurnya: kirim satu berkas yang sama dari
   Telegram Desktop, Android, dan iOS, lalu catat `mime_type` yang tiba di
   `classify`. Kalau hasilnya menunjukkan `application/octet-stream` sering,
   jawabannya bukan membaca `file_name` melainkan mengendus byte pertama berkas
   sesudah diunduh, dan itu pekerjaan lain.
2. **Pembaca PDF belum terukur di mesin ini.** Yang terbukti adalah path di dalam
   workspace boleh dibuka, bukan bahwa agent memahami isi PDF-nya. Tidak ada
   angka di `docs/` dan tidak ada satu pun yang diukur di sini, jadi tidak ada
   yang ditulis. Yang mengukurnya: satu PDF satu halaman berisi satu kalimat
   yang bisa ditanyakan kembali, dikirim ke claude-code rute ACP, claude-code
   rute CLI, dan codex, lalu dicatat apakah jawabannya mengutip kalimat itu.
   Hasilnya ditulis di `docs/frd.md` FR-CHAN-04. Kalau ketiganya gagal,
   `application/pdf` keluar dari daftar izin dan empat baris teks tetap tinggal.
3. **Lampiran berpindah ke dalam workspace, jadi `isHighRisk` berhenti
   menandainya.** Penjaga itu menandai path di luar `workspaceRoot`
   (`src/core/security.ts:325`), dan sesudah pekerjaan ini lampiran ada di
   dalamnya. Sebuah Read atas lampiran karena itu tidak lagi high-risk. Yang
   menahannya tetap AC-4.1: run yang membawa lampiran tidak pernah memakai jalur
   auto-approve, jadi permintaan izinnya tetap butuh ketukan.
4. **Label "data, bukan instruksi" tetap tidak bisa dipasang pada piksel**, dan
   sekarang juga tidak pada PDF: blok `<lampiran>` menyebut path, sedangkan yang
   dibaca model adalah isi berkas yang tidak lewat pembungkus mana pun.
   `docs/security.md:393` sudah mencatat keadaan ini untuk gambar; barisnya
   diperlebar ke dokumen di commit yang sama.
5. **Satu run per workspace adalah asumsi yang dipegang penghapusan.** `finally`
   menghapus `<workspace>/.caraka-inbox` utuh, dan itu aman hanya karena
   FR-SESS-04 membatasi satu run aktif per workspace. Kalau batas itu pernah
   dilonggarkan, penghapusan harus turun ke subdirektori run.

## Acceptance criteria

Kalimat penolakan yang disebut berulang di bawah adalah dua kalimat berbeda:
AC-2.6 untuk mime di luar daftar izin, dan kalimat `attach.unsupported` yang
sudah ada untuk lampiran yang tidak punya berkas atau tidak punya pengunduh.

### AC-1 · Berkas ditulis di dalam workspace

- **AC-1.1** WHEN sebuah lampiran diunduh, berkasnya shall berada di bawah
  `<workspace.path>/.caraka-inbox/<id sesi>/`.
- **AC-1.2** Direktori `.caraka-inbox` dan setiap subdirektori run shall dibuat
  dengan mode 0700.
- **AC-1.3** WHEN direktori `.caraka-inbox` dibuat, gateway shall menulis
  `.gitignore` berisi `*` di dalamnya.
- **AC-1.4** IF `<workspace.path>/.caraka-inbox` sudah ada sebagai berkas biasa,
  THEN gateway shall menjawab lampiran itu dengan kalimat `attach.unsupported`
  dan run shall tetap berjalan untuk teksnya.
- **AC-1.5** WHEN nama berkas dibangkitkan, ia shall tidak memuat satu karakter
  pun dari `file_name` atau `file_path` kiriman pengirim.
- **AC-1.6** IF `file_name` pengirim berbunyi `../../.ssh/authorized_keys`, THEN
  path yang ditulis shall tetap resolve di bawah `<workspace.path>/.caraka-inbox/`.
- **AC-1.7** Blok `<lampiran>` shall menyebut path setiap berkas relatif terhadap
  `workspace.path`.

### AC-2 · Daftar izin mime

- **AC-2.1** WHERE mime lampiran adalah `application/pdf`, `text/plain`,
  `text/markdown`, `text/csv`, atau `application/json`, `attachmentName` shall
  mengembalikan nama berekstensi `.pdf`, `.txt`, `.md`, `.csv`, atau `.json`.
- **AC-2.2** Empat mime gambar yang ada shall tetap di daftar dengan ekstensi
  yang sama.
- **AC-2.3** WHERE lampiran berjenis `image` datang tanpa mime, ekstensinya
  shall tetap `.jpg`.
- **AC-2.4** `ATTACHMENT_EXTENSIONS` shall tidak memuat satu pun ekstensi yang
  dijalankan runtime: `.sh`, `.js`, `.mjs`, `.cjs`, `.py`, `.rb`, `.ps1`, `.bat`,
  `.exe`.
- **AC-2.5** IF mime lampiran adalah `application/octet-stream`, THEN gateway
  shall menolaknya dengan kalimat AC-2.6.
- **AC-2.6** IF mime lampiran berada di luar daftar izin, THEN gateway shall
  mengirim satu kalimat yang menyebut mime itu dan cara lain memasukkan
  berkasnya.
- **AC-2.7** Setiap kunci pesan baru shall ada di katalog `en` dan katalog `id`
  `src/i18n.ts`.
- **AC-2.8** Kalimat `attach.unsupported` shall tidak lagi menyatakan bahwa
  Caraka tidak bisa menyerahkan sebuah dokumen ke agent.

### AC-3 · Satu jalur penyerahan per lampiran

- **AC-3.1** WHERE lampiran adalah gambar dan `driver.acceptsFiles` bernilai
  true, gateway shall menyerahkan path-nya lewat argumen `files` dan shall tidak
  menulis baris untuknya di blok `<lampiran>`.
- **AC-3.2** WHERE lampiran adalah gambar dan `driver.acceptsFiles` tidak
  bernilai true, gateway shall menulis satu baris untuknya di blok `<lampiran>`.
- **AC-3.3** Argumen `files` yang menyeberang ke `driver.prompt` shall tidak
  pernah memuat berkas yang mime-nya bukan gambar.
- **AC-3.4** WHERE lampiran bukan gambar dan berhasil diunduh, gateway shall
  menulis satu baris untuknya di blok `<lampiran>` yang menyebut jenis, mime, dan
  path relatifnya.
- **AC-3.5** `driver.acceptsFiles` shall tidak lagi menentukan apakah sebuah
  lampiran diunduh.
- **AC-3.6** WHERE channel tidak menyediakan `fetchAttachment`, gateway shall
  tidak mengunduh apa pun dan shall menjawab dengan kalimat
  `attach.unsupported`.

### AC-4 · Wewenang dan penjaga yang membaca lampiran

- **AC-4.1** WHILE sebuah run membawa lampiran apa pun yang sampai ke agent,
  permintaan izin shall tidak diputuskan oleh jendela trust, termasuk ketika
  argumen `files` kosong.
- **AC-4.2** WHEN sebuah pesan tanpa teks membawa dokumen yang berhasil diunduh,
  gateway shall menjalankan run itu alih-alih membatalkannya.
- **AC-4.3** WHEN sebuah pesan tanpa teks hanya membawa lampiran yang seluruhnya
  ditolak, gateway shall tidak memulai run.

### AC-5 · Batas ukuran

- **AC-5.1** IF ukuran lampiran yang dilaporkan melebihi 20 MB, THEN gateway
  shall menolaknya sebelum satu permintaan unduhan dikirim, untuk jenis apa pun.
- **AC-5.2** IF ukuran tidak dilaporkan dan badan unduhan melewati 20 MB di
  tengah pembacaan, THEN adapter shall membatalkan unduhan tanpa meninggalkan
  berkas separuh.
- **AC-5.3** Baris "Ukuran lampiran masuk" `docs/security.md` §9 shall tetap
  berbunyi 20 MB.

### AC-6 · Bersih setelah dipakai

- **AC-6.1** WHEN sebuah run selesai, gagal, atau dibatalkan, gateway shall
  menghapus `<workspace.path>/.caraka-inbox` beserta isinya.
- **AC-6.2** WHEN gateway mulai, ia shall menghapus `<path>/.caraka-inbox` untuk
  setiap workspace yang config sebut, sebelum satu channel pun polling.
- **AC-6.3** WHEN gateway mulai, ia shall tetap menghapus `~/.caraka/inbox` yang
  ditinggalkan versi sebelumnya.
- **AC-6.4** WHEN sebuah run tanpa lampiran selesai, gateway shall tidak
  melakukan satu pun panggilan penghapusan berkas untuk run itu.
- **AC-6.5** WHILE sebuah run berjalan di workspace yang berupa repositori git,
  `git status --short` di workspace itu shall tidak menyebut `.caraka-inbox`.

### AC-7 · Baris audit

- **AC-7.1** WHEN sebuah lampiran benar-benar diunduh, gateway shall menulis satu
  baris audit yang memuat jenis, mime, ukuran, sha256 isi berkasnya, dan slug
  workspace-nya.
- **AC-7.2** WHEN sebuah lampiran ditolak, gateway shall menulis satu baris audit
  yang memuat jenis, mime, dan alasannya sebagai satu dari: mime di luar daftar,
  melewati plafon, tidak ada pengunduh, tidak ada berkas, gagal ditulis.
- **AC-7.3** Baris audit lampiran shall tidak memuat `file_id`, `file_path`, URL
  unduhan, maupun `file_name` kiriman pengirim.

### AC-8 · Dokumen dan preset

- **AC-8.1** `docs/security.md` §9 shall menyebut letak baru lampiran, mode
  direktorinya, berkas `.gitignore` yang menyertainya, dan bahwa
  `.caraka-inbox` dihapus utuh setiap run selesai.
- **AC-8.2** `docs/security.md` §9 shall memuat daftar mime yang diizinkan
  sesudah pekerjaan ini, bukan "empat mime gambar".
- **AC-8.3** `docs/security.md` §12 shall menyebut bahwa dokumen, seperti gambar,
  tidak bisa membawa label data-bukan-perintah.
- **AC-8.4** `docs/frd.md` FR-CHAN-04 shall menyebut bagian yang terbangun pada
  tanggal ini dan bagian yang tetap terbuka.
- **AC-8.5** Contoh `attachments` di `docs/api.md:83` shall tidak lagi menyebut
  path di bawah `~/.caraka/inbox`.
- **AC-8.6** Komentar `presets/agents/claude-code.yaml` shall berhenti menyatakan
  bahwa pemakai jalur CLI mendapat kalimat degradasi untuk gambar.
- **AC-8.7** Berkas yang berubah shall tidak memuat satu pun path pribadi di luar
  `/home/ramaaditya`.

### AC-9 · Anggaran

- **AC-9.1** Jumlah baris `src/` sesudah pekerjaan ini shall diukur dengan
  `find src -name '*.ts' | xargs wc -l` dan angkanya ditempel di plan.
- **AC-9.2** Ledger `AGENTS.md` shall mencatat angka terukur itu, selisihnya
  terhadap rentang 80–140, dan pagu ~8.000 yang tidak bergeser.
- **AC-9.3** Tidak ada satu pun perbandingan `channel.id` baru di `src/core/`.
