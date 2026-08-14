# ADR-0010 — Workspace baru dari chat: hanya bentuk path di DM operator, di belakang kartu bertanda tangan

**English:** this document is Indonesian only, and stays that way because an accepted decision record is never rewritten. English documentation starts at [`../../README.md`](../../README.md).

**Status:** Diterima · **Tanggal:** 13 Agustus 2026
**Sebagian digantikan:** keputusan 1, "hanya di percakapan pribadi antara Caraka dan operator", digantikan [ADR-0011](0011-workspace-dari-ruangan-oleh-operator.md) pada 14 Agustus 2026 menjadi "operator, di container mana pun yang Caraka layani". Yang klausa itu benar-benar jaga adalah siapa yang memilih string-nya, dan itu tetap operator. Keputusan 2 sampai 5 dan seluruh konsekuensi tetap berlaku.
**Memakai bentuk dari:** [ADR-0004](0004-approval-hanya-lewat-callback.md) — kartu bertanda tangan, sekali pakai, ber-TTL, terikat principal. Keputusan ini tidak mengubah ADR-0004; ia memakai mekanismenya untuk pertanyaan kedua.

## Konteks

Sampai v1.2 sebuah workspace hanya lahir di `config.yaml`, ditulis tangan atau
oleh wizard. Yang diminta: menamai folder dari chat, supaya operator tidak harus
berpindah ke terminal untuk satu repositori baru.

Tidak ada input chat yang bisa mencapai path hari ini, dan itu kebetulan bentuk
regex, bukan kontrol yang ditulis sengaja. `routeTask` mencocokkan
`/^@([\w.-]+)(?:\s+|$)/`, kelas karakternya tidak memuat `/`, jadi `@/home/rama`
menjadi teks prompt. `/new` tidak menerima argumen sama sekali.

Yang membuat pintu itu berat bukan panjang path, melainkan apa yang path itu
kunci. Ia dipakai sebagai `policy_grant.workspace`, sebagai string scope memori
`workspace:<path>`, sebagai `cwd` untuk `session/new` ACP, dan sebagai `cwd`
untuk `spawn`. Satu-satunya validasi atasnya adalah `isAbsolute`, yang
dokumentasi Node sendiri sebut "not safe for mitigating path traversals", dan
tidak ada satu pun `resolve()` di jalurnya. Setiap pelolosan di bawah ini
dijalankan, bukan dinalar:

`isAbsolute('/srv/app/../../etc')` bernilai true dan `workspaces()` mengembalikan
string itu apa adanya. `resolve(root, "escape")` tetap di bawah root sementara
`realpathSync` atas path yang sama mengembalikan `/etc`, jadi pemeriksaan yang
benar harus berjalan atas keluaran `realpath` — dan `realpathSync` melempar
ENOENT untuk path yang belum ada, jadi ia tidak bisa berjalan saat config dimuat.
`mount --bind /etc <root>/notes` menghasilkan bentuk yang sama tanpa symlink yang
bisa dilihat, dan tidak ada pemeriksaan userland yang melihatnya.
`'/home/r/Project-secret/x'.startsWith('/home/r/Project')` bernilai true, jadi
predikat `startsWith` telanjang adalah bug prefiks. `resolve` tidak melipat huruf
besar-kecil, jadi di APFS dan NTFS `/Users/x/Project` dan `/Users/x/project`
adalah satu direktori dan dua kunci grant. `path.isAbsolute('\\\\server')`
bernilai true, dan awalan `\\?\` melewati normalisasi Win32 sepenuhnya.
`resolve("/srv/app\n/etc/passwd")` tidak berubah, jadi newline ikut masuk ke
kunci grant dan ke satu baris JSON audit yang terbaca seperti dua baris.

Dan pintu terminal sudah terbuka. `caraka trust /tmp --for 60 --bypass` menulis
baris `policy_grant` bermode `trusted`, `granted_by = 'cli'`,
`agent_mode = 'bypassPermissions'` untuk path yang tidak dinamai config mana pun,
lalu mencetak bahwa jendelanya terbuka. Barisnya tidak berefek hanya karena
`activeGrant` selalu dipanggil dengan path dari config, dan karena `workspaceOf`
menyelesaikan slug asing menjadi workspace pertama.

Preseden untuk bentuk yang dipilih sudah ada di repositori: `addAllowedChat`
ditulis oleh `confirmGroup`, yang bertanya di DM operator dengan kartu
bertanda tangan sekali pakai, lalu menulis `config.yaml` lewat `atomicSecret`.
Grup dipasangkan begitu sejak v0.5.

## Keputusan

**1. Bentuk path hanya diterima di percakapan pribadi antara Caraka dan operator
channel itu.** Operator adalah entri pertama `allowFrom` channel tersebut.
Pesan berbentuk path yang tiba di ruangan mana pun, atau di DM pengirim
terdaftar yang bukan operator, ditolak dengan kalimat yang menyebut di mana
bentuk itu berlaku, dan ditulis satu baris audit. Anggota grup tetap menyebut
workspace lewat slug.

**2. Path yang belum dikenal menaikkan kartu konfirmasi bertanda tangan sekali
pakai di DM yang sama, dan ya menulisnya ke `config.yaml`.** Kartunya memakai
`approvalCallbacks` dengan purpose tersendiri, `confirmed()` yang memeriksa
tanda tangan, principal, sekali-pakai, dan sepuluh menit, lalu
`addAllowedWorkspace` yang menulis lewat `atomicSecret` 0600. Slug diturunkan
dari `basename` path, aturan yang sama dengan yang wizard pakai. Entri baru juga
masuk ke daftar workspace proses yang sedang berjalan, karena kartu yang
menjanjikan workspace baru lalu menuntut restart tidak menjanjikan apa pun.

**3. Path dikanonikalisasi di tempat ia menjadi kunci.** `workspaces()`
mengembalikan `resolve()` dari setiap path. Refine `isAbsolute` tetap, karena ia
yang menghasilkan pesan galat yang menyebut nama field. Setelah ini dua ejaan
satu direktori adalah satu kapabilitas.

**4. `caraka trust` menolak path yang tidak dinamai config.** Ini menutup satu
jalur yang membuat scope trust tanpa persetujuan config, dan sekaligus
memperbaiki `caraka trust` yang diam-diam tidak melakukan apa pun untuk setiap
path config bergaris miring penutup.

**5. Teks aturan keras 3 `AGENTS.md` diperbaiki, constraint-nya tidak.**
Aturannya berbunyi bahwa `trusted` terminal-only dan diberlakukan constraint
basis data. Separuh terminal-only tidak diberlakukan apa pun dan sudah tidak
benar sejak `/yolo`: `CHECK(granted_by IN ('config', 'cli', 'chat'))` mengizinkan
`chat` secara eksplisit dan gateway menulisnya. Yang dijamin constraint hanya
kedaluwarsa. Menambah CHECK ke tabel STRICT yang sudah ada butuh membangun ulang
tabelnya, yaitu ledger migrasi bernomor yang komentar `ponytail:` di
`src/store/db.ts` sengaja tunda; jadi yang berubah adalah kalimatnya, dan sebuah
test menyatakan pembagiannya. Yang benar-benar terminal-only adalah
`agent_mode = 'bypassPermissions'`, dan yang menahannya adalah jumlah
pemanggilnya, satu, di `src/cli.ts`.

## Konsekuensi

Empat prasyarat harus mendarat sebelum satu baris fitur ini ditulis, dan
keempatnya dicatat di sini supaya tidak dibuka lagi enam bulan kemudian oleh
orang yang tidak tahu jawabannya:

1. **`workspaceOf` berhenti menyelesaikan slug asing menjadi workspace
   pertama.** Slug kosong tetap berarti workspace pertama, karena itu jalur naik
   v0.4; slug yang tidak ada di config berarti tidak ada workspace. Tanpa ini,
   sesi berslug asing mewarisi jendela trust workspace pertama lewat
   `activeGrant(workspaceOf(session).path)` dan setiap izin non-berisiko-tinggi
   di dalamnya disetujui otomatis, teraudit dengan id grant milik workspace lain.
2. **Daftar workspace tidak lagi dianggap tetap setelah konstruktor.** Tipe
   tuple-nya sudah mengizinkan `push`; yang berubah adalah asumsi di sekitarnya.
   Peta antrean dan peta run aktif dibuat malas per slug, jadi keduanya tidak
   butuh pendaftaran.
3. **Tombol pemilih workspace bertanda tangan.** Pembenaran lamanya — tombol itu
   hanya melakukan apa yang `@slug` sebagai teks chat sudah bisa lakukan —
   berdiri di atas asumsi bahwa setiap isi daftar disetujui config, dan asumsi
   itu berakhir di keputusan 2.
4. **Aturan "path di luar workspace berisiko tinggi" dibangun.** `docs/security.md`
   §7 menjanjikannya sejak v1.0 dan `isHighRisk` tidak pernah punya aturan
   relatif-workspace. Tanpa aturan itu, kartu di keputusan 2 menyetujui sebuah
   root lalu tidak menahan apa pun di luarnya.

Yang tidak dijanjikan: containment terhadap symlink dan bind mount.
Pemeriksaannya berjalan atas keluaran `resolve()`, bukan `realpath`, karena tool
call yang membuat berkas menamai path yang belum ada dan `realpathSync`
melemparkan ENOENT untuk path seperti itu. Baris "Batas direktori"
`docs/security.md` §7 sekarang menyebut batas itu alih-alih menyiratkan
sebaliknya.

Pemasangan satu workspace menjadi multi-workspace pada penulisan pertama, jadi
setiap chat yang belum punya sticky mulai ditanya workspace mana. DM operator
tidak terkena karena penulisannya juga menempelkan sticky di chat itu.

`config.yaml` mendapat kunci `workspaces[]` yang tidak pernah ditulis wizard.
`version` tetap 1, mengikuti preseden `workspaces[]` yang memang aditif. Penulis
entri pertama harus mengangkat `workspace` tunggal menjadi entri pertama daftar,
karena `workspaces()` memilih `workspaces[]` dan mengabaikan singular
sepenuhnya — daftar satu elemen akan menghilangkan workspace asli.

Harganya sekitar 100 baris di `src/`, empat belas di antaranya tujuh pasang kunci
katalog, terhadap `src/` yang sudah 498 baris di atas pagu ~8.000 sebelum
pekerjaan ini dimulai. Tidak ada penghapusan yang mengiringinya: kandidat yang
tersedia masing-masing milik concern lain, dan satu PR yang memperbaiki bug
sekaligus melakukan refactor adalah dua PR. Angkanya dicatat di ledger
`AGENTS.md`, dan pagunya tidak digeser.

Perkiraan seratus baris itu ditulis sebelum kodenya ada. Angka terukur sesudahnya
adalah **+262 baris** (8.546 → 8.808), dan selisihnya hampir seluruhnya ada di
keempat prasyarat, bukan di fitur di atasnya. Yang masuk ledger adalah angka
terukur itu.

## Alternatif yang ditolak

**Allowlist ber-root: satu kunci config berisi root, dan setiap folder di
bawahnya boleh menjadi workspace.** Root yang berguna di mesin ini adalah
`~/Project`, yang memuat 89 repositori langsung di bawahnya
(`ls -d ~/Project/*/.git | wc -l`, 13 Agustus 2026) dan lebih banyak lagi yang
tersarang, jadi pemberiannya tidak berarti lebih kecil daripada seluruh disk. Ia
butuh predikat containment yang berjalan
atas keluaran `realpath`, dan `realpathSync` melempar ENOENT untuk path yang
belum ter-mount, jadi pemeriksaan itu tidak bisa berjalan saat config dimuat. Dan
bind mount melewatinya tanpa symlink yang bisa dilihat.

**`caraka ws add <path>`.** `$EDITOR ~/.caraka/config.yaml` ditambah restart
sudah merupakan perintah itu. Pembungkus CLI atas suntingan YAML tiga baris
adalah hal yang aturan pembuka `AGENTS.md` ada untuk menolak.

**Mengeraskan TOCTOU antara pemeriksaan containment dan `spawn`.** `cwd` pada
`child_process.spawn` bertipe `<string> | <URL>` dan tidak menerima file
descriptor, jadi `RESOLVE_BENEATH` dan keluarga syscall `*at` tidak bisa
mencapai panggilan yang Caraka lakukan tanpa kode native. Siapa pun yang bisa
menukar symlink di bawah uid operator juga bisa menulis ulang `config.yaml`, yang
`atomicSecret` tulis 0600 di dalam direktori 0700 milik uid yang sama. Hasil
yang sama, pekerjaan yang jauh lebih sedikit.

**Menyatukan bentuk `workspace` tunggal dengan `workspaces[]` sebagai pembayaran
anggaran.** Kedua bentuk berbeda satu nama field dan satu field opsional, tapi
setiap berkas yang pernah ditulis wizard memuat `name`, jadi penyatuannya butuh
transform alias yang seukuran pembaca enam baris yang ia hapus. Nilainya sekitar
empat baris, bukan seratus. Ia tetap layak dikerjakan nanti untuk alasan lain:
`doctor`, `status`, dan `uninstall` hanya pernah memeriksa `workspace` tunggal,
jadi entri `workspaces[]` yang menunjuk direktori yang tidak ada tidak
tertangkap di mana pun dan muncul sebagai ENOENT `spawn` yang dilaporkan sebagai
`driver.exit`.

**Menolak seluruhnya dan hanya mengirim perbaikan akar.** Ini yang disarankan
tinjauan kode: kanonikalisasi di `workspaces()` dan penjaga di `caraka trust`,
sekitar empat baris, tanpa kunci katalog baru, dengan alasan bahwa workspace
adalah pemberian kapabilitas dan tempat kapabilitas diberikan adalah
`config.yaml`. Pemilik memutuskan sebaliknya. Keempat prasyarat dan
kanonikalisasi dikerjakan di kedua jalan, jadi yang ditukar adalah seratus baris
terhadap anggaran yang sudah lewat, dengan imbalan operator yang tidak perlu
berpindah ke terminal untuk satu folder. Penukaran itu diambil sadar, dan
harganya tertulis di atas.
