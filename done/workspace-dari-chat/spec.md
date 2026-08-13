# Spec — workspace-dari-chat: menamai workspace baru dari DM operator

**Status:** aktif · **Tanggal:** 13 Agustus 2026

## Latar

Bolehkah sebuah folder yang tidak dinamai `config.yaml` menjadi workspace tanpa
operator berdiri di depan terminal? Pemilik memutuskan boleh, dengan dua batas:
bentuk path hanya diterima di percakapan pribadi antara Caraka dan operator
channel itu, dan path yang belum dikenal menaikkan kartu konfirmasi bertanda
tangan sekali-pakai yang dijawab di DM yang sama. Anggota grup tetap hanya bisa
menyebut workspace lewat slug. Tinjauan kode menyarankan menolak keempat opsi;
keputusan pemilik mengesampingkan saran itu, dan alasan kedua belah pihak
dicatat di `docs/adr/0010-workspace-dari-chat.md` supaya tidak diperdebatkan
lagi.

Hari ini tidak ada input chat yang bisa mencapai sebuah path. Regex routing
`gateway.ts:442` adalah `/^@([\w.-]+)(?:\s+|$)/` dan `/` tidak ada di kelas
karakternya, jadi `@/home/rama` jatuh menjadi teks prompt biasa; `/new` tidak
menerima argumen sama sekali. Membuka pintu itu memindahkan sebuah nilai yang
selama ini hanya ditulis tangan ke jalur yang bisa diketik, dan nilai itu
sedang dipakai sebagai kunci kapabilitas di empat tempat: `policy_grant.workspace`
(`gateway.ts:971`, `:1197`), string scope memori `workspace:<path>`
(`gateway.ts:1021` → `src/memory/local.ts:13-15`), `cwd` untuk `session/new` ACP,
dan `cwd` untuk `spawn`. Satu-satunya pemeriksaan atasnya adalah `isAbsolute`
(`src/config.ts:20` dan `:53`), yang dokumentasi Node sendiri sebut "not safe for
mitigating path traversals", dan tidak ada satu pun pemanggilan `resolve()`:
`workspaces()` (`src/config.ts:200-205`) mengembalikan string mentah dari YAML.
Dua ejaan satu direktori karena itu adalah dua kapabilitas. `isAbsolute('/srv/app/../../etc')`
bernilai true, dan `/srv/app/` serta `/srv/app` menghasilkan dua kunci grant dan
dua partisi memori yang tidak saling melihat. Kanonikalisasi di tempat path
menjadi kunci adalah prasyarat fitur ini, bukan penggantinya.

Empat celah harus tertutup sebelum satu baris fitur ditulis, karena masing-masing
mengubah "slug yang tidak dikenal" menjadi eskalasi:

1. `workspaceOf` (`gateway.ts:216-218`) menyelesaikan slug yang tidak ada di
   config menjadi `this.home`. Lewat `activeGrant(this.workspaceOf(session).path)`
   di `:1197`, sebuah sesi berslug asing mewarisi jendela trust workspace pertama
   dan setiap izin non-berisiko-tinggi di dalamnya disetujui otomatis dengan
   `grant` milik workspace lain di baris auditnya.
2. Daftar workspace dibangun sekali di konstruktor (`gateway.ts:116`, `:147`).
   Menulis `config.yaml` tanpa menambah entri ke proses yang berjalan
   menghasilkan workspace yang baru ada setelah restart, dan itu bukan yang
   dijanjikan kartu.
3. Tombol pemilih workspace tidak bertanda tangan, dan komentarnya
   (`gateway.ts:1403-1404`) menyebut alasannya: tombol itu hanya melakukan apa
   yang `@slug` sebagai teks chat sudah bisa lakukan. Alasan itu berdiri di atas
   asumsi bahwa setiap isi `this.workspaces` disetujui config, dan asumsi itu
   berakhir begitu daftarnya bisa tumbuh saat proses berjalan.
4. `docs/security.md:266` menjanjikan "path di luar workspace dianggap aksi
   berisiko tinggi". `isHighRisk` (`src/core/security.ts:242-261`) mencocokkan
   nama berkas terhadap daftar tetap di `:229-234` — `.ssh|.aws|.config`,
   `.env`, `.pem`, dan `id_*` — dan tidak punya aturan relatif-workspace sama
   sekali. Tanpa aturan itu, kartu yang ditawarkan fitur ini menyetujui sebuah
   root lalu tidak menahan apa pun di luarnya.

Tiga bug yang sudah hidup di area yang sama, ditemukan dengan dijalankan:

- `caraka trust /tmp --for 60 --bypass` menulis baris `policy_grant` bermode
  `trusted`, `granted_by = 'cli'`, `agent_mode = 'bypassPermissions'` untuk path
  yang tidak dinamai config mana pun, lalu mencetak bahwa jendelanya terbuka.
  `trustWorkspace` (`src/cli.ts:330-335`) hanya `resolve` argumen posisional
  pertama, `cli.ts:813` menulis barisnya, dan `cli.ts:832` mencetak keberhasilan
  tanpa syarat. Baris itu tidak berefek hari ini hanya karena `activeGrant`
  selalu dipanggil dengan path dari config — dan karena celah 1 di atas.
- `trustCommand` me-`resolve` path sementara gateway memakai string config apa
  adanya, jadi sebuah entri `path: /srv/app/` menghasilkan grant di bawah
  `/srv/app` yang `activeGrant('/srv/app/')` tidak akan pernah temukan.
  `caraka trust` diam-diam tidak melakukan apa pun untuk setiap path config yang
  ditulis dengan garis miring penutup atau `..`, dan tetap mencetak sukses.
- `/lock` menjawab `trust.notOpen` ketika ada jendela terbuka. `closeTrust`
  (`gateway.ts:1572-1578`) menempuh `workspaceForMessage` → `chatWorkspace`
  (`:223-229`), yang pada pemasangan multi-workspace tanpa sesi di route ini dan
  tanpa `ws.last.<chatId>` mengembalikan undefined, sehingga `closed = 0`.
  Reproduksinya: pemasangan dua workspace, `/yolo` dikonfirmasi di DM operator,
  lalu `/lock` diketik di topic General grup yang sudah dipasangkan.

Aturan keras 3 `AGENTS.md:60` berbunyi "`trusted` mode is terminal-only and must
expire. Enforced by a database constraint, not by convention." Separuh
terminal-only tidak diberlakukan apa pun dan sudah tidak benar sejak `/yolo`:
`db.ts:121` adalah `CHECK(granted_by IN ('config', 'cli', 'chat'))` yang secara
eksplisit mengizinkan `chat`, dan `gateway.ts:1553` menulis `grantedBy: "chat"`.
Satu-satunya yang dijamin constraint adalah kedaluwarsa
(`db.ts:127`, `CHECK(mode <> 'trusted' OR expires_at IS NOT NULL)`). Pekerjaan
ini mengubah teks aturannya, bukan constraint-nya: menambah CHECK ke tabel
STRICT yang sudah ada butuh membangun ulang tabelnya, yaitu ledger migrasi
bernomor yang komentar `ponytail:` di `db.ts:143` sengaja tunda. Yang benar-benar
terminal-only adalah `agent_mode = 'bypassPermissions'`, dan yang menahannya
adalah satu pemanggil di `cli.ts:818`, bukan SQL.

Harga pekerjaan ini: sekitar **+100 baris** di `src/`, di mana 14 di antaranya
adalah tujuh pasang kunci di `src/i18n.ts` (`const id: Record<MessageKey, string>`
membuat pasangan keduanya wajib saat typecheck). Pengukuran awal `src/` adalah
8.498 baris (`find src -name '*.ts' | xargs wc -l`), sama dengan angka yang
`AGENTS.md:21` catat, dan 498 baris di atas pagu ~8.000 sudah terutang sebelum
pekerjaan ini dimulai. Tidak ada penghapusan yang diambil di sini: kandidat yang
tersedia — pembantu fetch-dengan-retry bersama Discord/WhatsApp, `Channel.getMe()`
yang tidak punya pemanggil di `src/core/`, dua pemindaian PRAGMA kembar di
`db.ts`, tiga pembuka perintah memori yang sama — masing-masing milik concern
lain, dan satu PR yang memperbaiki bug sekaligus melakukan refactor adalah dua PR
(`AGENTS.md`). Angkanya dicatat, bukan pagunya digeser, persis seperti v1.1
mencatat +149. Angka terukur setelah pekerjaan selesai ditulis ke ledger
`AGENTS.md` sebagai bagian dari AC-10.3.

## Ruang lingkup

`src/config.ts` (kanonikalisasi di `workspaces()`, penulis entri workspace baru),
`src/cli.ts` (`trustCommand` menolak path yang bukan workspace), `src/core/gateway.ts`
(resolusi slug, cabang path di `routeTask`, kartu tambah-workspace, pemilih
workspace bertanda tangan, `/lock`), `src/core/security.ts` (purpose callback baru,
predikat containment, `isHighRisk` yang membaca root workspace), `src/i18n.ts`
(tujuh pasang kunci), `test/unit.test.ts`, `AGENTS.md` (aturan keras 3 dan
ledger), `docs/security.md` §7 dan `docs/security.en.md`,
`docs/troubleshooting.md` dan `docs/troubleshooting.en.md`, `docs/frd.md`
FR-SESS-02, dan `docs/adr/0010-workspace-dari-chat.md` beserta barisnya di
`docs/adr/README.md`.

## Yang tidak dikerjakan

- **Allowlist ber-root (opsi 1) ditolak.** Root yang berguna di mesin ini adalah
  `~/Project`, yang memuat 89 repositori langsung di bawahnya
  (`ls -d ~/Project/*/.git | wc -l`, 13 Agustus 2026), belum menghitung yang
  tersarang lebih dalam, jadi pemberiannya tidak berarti lebih kecil daripada
  seluruh disk. Ia juga butuh pemeriksaan yang berjalan atas
  keluaran `realpathSync`, dan `realpathSync` melempar ENOENT untuk path yang
  belum ada, jadi pemeriksaan itu tidak bisa berjalan saat config dimuat untuk
  path yang belum ter-mount. Dan `mount --bind /etc <root>/notes` menghasilkan
  path yang lulus setiap pemeriksaan userland tanpa symlink yang bisa dilihat.
- **`caraka ws add <path>` (opsi 4) ditolak.** `$EDITOR ~/.caraka/config.yaml`
  ditambah restart sudah merupakan perintah itu, dan pembungkus CLI atas suntingan
  YAML tiga baris adalah hal yang aturan pembuka `AGENTS.md` ada untuk menolak.
- Tidak mengeraskan TOCTOU antara pemeriksaan containment dan `spawn`. `cwd`
  pada `child_process.spawn` bertipe `<string> | <URL>` dan tidak menerima file
  descriptor, jadi `RESOLVE_BENEATH` tidak bisa mencapai syscall yang Caraka
  lakukan; dan siapa pun yang bisa menang balapan itu sudah memiliki uid yang
  memiliki `config.yaml` bermode 0600.
- Tidak menyatukan bentuk `workspace` tunggal dengan `workspaces[]`. Itu senilai
  sekitar empat baris dengan sembilan pemanggil di `cli.ts` dan sebuah transform
  alias `name`→`slug`, dan ia dikerjakan nanti supaya `doctor` bisa memeriksa
  setiap workspace, bukan sebagai pembayaran anggaran di sini.
- Tidak menambah CHECK apa pun ke `policy_grant`. Lihat Latar.
- Tidak menyentuh `/new`, yang sampai sekarang tidak bisa menyebut workspace mana
  pun karena `dispatch` (`gateway.ts:410`) meneruskan teks utuh termasuk kata
  `/new`, sehingga anchor `^@` di `:442` tidak pernah cocok. Itu bug pembaca
  miliknya sendiri, dan sudah punya spec sendiri di
  `spec/new-judul-workspace.md`.
- Tidak menghapus apa pun untuk membayar anggaran di PR ini.

## Acceptance criteria

### AC-1 · Path workspace dikanonikalisasi di tempat ia menjadi kunci

- **AC-1.1** WHEN config menamai path `/srv/app/` atau `/srv/app/../app`,
  `workspaces(config)` shall mengembalikan entri ber-`path` `/srv/app` untuk
  keduanya.
- **AC-1.2** IF sebuah entri `workspaces[]` atau `workspace` memuat path yang
  tidak absolut, THEN pemuatan config shall gagal dengan pesan yang menyebut
  nama field-nya.
- **AC-1.3** WHEN `caraka trust` diberi path sebuah workspace yang di config
  ditulis dengan garis miring penutup, `store.activeGrant` atas path dari
  `workspaces(config)` shall menemukan grant itu.

### AC-2 · `caraka trust` hanya untuk workspace yang dinamai config

- **AC-2.1** IF `caraka trust <path>` menamai path yang tidak ada di
  `workspaces(config)`, THEN perintah shall tidak menulis baris `policy_grant`.
- **AC-2.2** IF path itu ditolak, THEN pesannya shall menyebut path yang ditolak
  dan setiap path workspace yang ada.
- **AC-2.3** IF `caraka trust <path> --bypass` menamai path yang bukan workspace,
  THEN perintah shall tidak menulis baris ber-`agent_mode`
  `'bypassPermissions'`.
- **AC-2.4** IF `caraka trust <path>` menamai path yang tidak ada di
  `workspaces(config)`, THEN perintah shall keluar dengan status bukan nol.

### AC-3 · Slug yang tidak dikenal tidak lagi jatuh ke workspace pertama

- **AC-3.1** IF baris sesi menyebut slug workspace yang tidak ada di config,
  THEN gateway shall tidak menjalankan sesi itu pada workspace pertama.
- **AC-3.2** WHEN slug sesi kosong, seperti pada setiap baris yang ditulis
  sebelum v0.4, gateway shall menjalankannya pada workspace pertama.
- **AC-3.3** IF permintaan izin datang dari sesi yang slug-nya tidak ada di
  config, THEN gateway shall menaikkan kartu approval dan tidak memakai grant
  workspace mana pun.
- **AC-3.4** WHILE `ws.last.<chatId>` menyimpan slug yang tidak ada di config,
  gateway shall memperlakukan chat itu sebagai chat yang belum memilih
  workspace, termasuk pada pemasangan satu workspace.

### AC-4 · Path di luar root workspace adalah aksi berisiko tinggi

- **AC-4.1** WHEN permintaan izin menamai path yang berada di luar root
  workspace sesi itu, `isHighRisk` shall bernilai true.
- **AC-4.2** WHEN permintaan izin menamai path di dalam root workspace sesi itu,
  aturan ini shall tidak membuat `isHighRisk` bernilai true.
- **AC-4.3** WHEN sebuah path relatif muncul di permintaan izin, predikat
  containment shall menyelesaikannya terhadap root workspace lebih dulu.
- **AC-4.4** IF sebuah path berbentuk `<root>-secret`, THEN predikat containment
  shall menyatakannya di luar `<root>`.
- **AC-4.5** WHEN root workspace itu sendiri yang disebut, predikat containment
  shall menyatakannya di dalam.
- **AC-4.6** Baris "Batas direktori" di `docs/security.md` §7 dan padanannya di
  `docs/security.en.md` shall menyebut bahwa pemeriksaan berjalan atas keluaran
  `resolve()` dan tidak melihat symlink maupun bind mount.

### AC-5 · Setiap tombol yang menyentuh workspace bertanda tangan

- **AC-5.1** WHEN kartu pemilih workspace dikirim, setiap tombolnya shall
  membawa MAC yang terikat pada purpose-nya sendiri.
- **AC-5.2** IF payload pemilih workspace gagal verifikasi, THEN gateway shall
  menjawab `callback.invalid` dan tidak menulis `ws.last.<chatId>`.
- **AC-5.3** Payload kartu tambah-workspace shall memakai purpose yang berbeda
  dari purpose pemilih workspace.
- **AC-5.4** IF sebuah payload yang ditandatangani untuk satu purpose dikirim
  sebagai purpose lain, THEN verifikasi shall gagal.

### AC-6 · `/lock` tidak pernah melaporkan tertutup yang tidak ia tutup

- **AC-6.1** WHILE sebuah chat tidak bisa menyelesaikan satu workspace, WHEN
  `/lock` tiba, gateway shall menutup setiap jendela trust yang terbuka dan
  menyebut jumlahnya.
- **AC-6.2** IF tidak ada jendela trust terbuka sama sekali, THEN `/lock` shall
  menjawab `trust.notOpen`.
- **AC-6.3** WHEN sebuah chat menyelesaikan satu workspace, `/lock` shall
  menutup jendela workspace itu dan tidak menutup jendela workspace lain.

### AC-7 · Bentuk path hanya diterima di DM operator

- **AC-7.1** WHILE wadahnya percakapan pribadi dan pengirimnya operator channel
  itu, WHEN pesan dimulai dengan `@` diikuti sebuah path absolut, gateway shall
  memperlakukan token itu sebagai penunjuk workspace.
- **AC-7.2** IF pesan yang dimulai dengan `@` diikuti path absolut tiba di
  wadah yang bukan percakapan pribadi, THEN gateway shall menolaknya, menyebut
  bahwa bentuk path hanya berlaku di DM operator, dan tidak memulai apa pun.
- **AC-7.3** IF pesan yang sama tiba di percakapan pribadi dari pengirim yang
  bukan operator channel itu, THEN gateway shall menolaknya dengan pesan yang
  sama.
- **AC-7.4** WHEN path yang diberikan setelah dikanonikalisasi sama dengan path
  sebuah workspace di config, gateway shall merutekan tugasnya ke workspace itu
  tanpa kartu apa pun.
- **AC-7.5** IF token setelah `@` bukan path absolut dan bukan slug yang ada di
  config, THEN gateway shall menjawab `ws.unknown` dan tidak memulai apa pun.
- **AC-7.6** WHEN gateway menolak sebuah bentuk path, ia shall menulis satu
  baris audit yang menyebut penolakan itu.

### AC-8 · Kartu konfirmasi menulis workspace baru

- **AC-8.1** WHEN path yang dikanonikalisasi tidak dinamai config mana pun,
  gateway shall mengirim satu kartu konfirmasi bertanda tangan sekali-pakai ke
  DM operator yang menyebut path itu dan slug yang akan ditulis.
- **AC-8.2** IF path itu bukan direktori yang bisa ditemukan, THEN gateway shall
  menolak sebelum kartu dikirim dan menyebut path yang tidak ditemukan.
- **AC-8.3** IF slug yang akan ditulis sudah dipakai workspace lain di config,
  THEN gateway shall menolak dan menyebut slug yang bentrok.
- **AC-8.4** WHEN operator menekan ya, gateway shall menambahkan satu entri
  `workspaces[]` ke `config.yaml`.
- **AC-8.5** WHEN operator menekan ya, workspace baru shall bisa dipakai proses
  yang sedang berjalan tanpa restart.
- **AC-8.6** WHEN operator menekan ya dan kartu itu membawa tugas yang menunggu,
  gateway shall menjalankan tugas itu di workspace baru.
- **AC-8.7** IF operator menekan tidak, THEN gateway shall tidak mengubah
  `config.yaml`.
- **AC-8.8** IF kartu ditekan principal lain, ditekan dua kali, atau ditekan
  setelah sepuluh menit, THEN gateway shall menjawab `callback.invalid` dan
  tidak mengubah `config.yaml`.
- **AC-8.9** WHEN sebuah workspace ditulis dari chat, gateway shall menulis satu
  baris audit yang menyebut path dan slug-nya.
- **AC-8.10** WHEN sebuah workspace ditulis dari chat, `config.yaml` shall tetap
  bernilai `version: 1`.
- **AC-8.11** WHEN entri `workspaces[]` pertama ditulis dari chat ke config yang
  hanya punya `workspace` tunggal, workspace tunggal itu shall tetap menjadi
  entri pertama daftar.
- **AC-8.12** WHEN sebuah workspace ditulis dari chat, `config.yaml` shall tetap
  bermode 0600.

### AC-9 · Aturan keras 3 menyebut yang benar-benar diberlakukan

- **AC-9.1** `policy_grant` shall menolak baris `mode = 'trusted'` tanpa
  `expires_at`.
- **AC-9.2** `policy_grant` shall menerima baris `mode = 'trusted'` dengan
  `granted_by = 'chat'`.
- **AC-9.3** Aturan keras 3 di `AGENTS.md` shall menyebut kedaluwarsa sebagai
  satu-satunya yang dijamin constraint, dan menyebut bahwa batas terminal-only
  `bypassPermissions` dijaga oleh jumlah pemanggilnya.

### AC-10 · Katalog dan ledger

- **AC-10.1** Setiap kunci pesan baru shall ada di katalog `en` dan katalog `id`
  di `src/i18n.ts`.
- **AC-10.2** Kalimat penolakan bentuk path, badan kartu tambah-workspace, dan
  jawaban `/lock` yang menutup semua jendela shall menyebut di mana wewenang
  berada, di katalog `en` maupun di katalog `id`.
- **AC-10.3** `AGENTS.md` shall mencatat jumlah baris `src/` yang terukur
  setelah pekerjaan ini.
- **AC-10.4** `AGENTS.md` shall tetap menyebut pagu ~8.000 baris.
