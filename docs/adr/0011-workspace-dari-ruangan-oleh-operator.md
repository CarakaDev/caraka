# ADR-0011 — Bentuk path dari container mana pun, dari operator saja, dengan kartunya di DM

**English:** this document is Indonesian only, and stays that way because an accepted decision record is never rewritten. English documentation starts at [`../../README.md`](../../README.md).

**Status:** Diterima · **Tanggal:** 14 Agustus 2026
**Mengamandemen:** [ADR-0010](0010-workspace-dari-chat.md) keputusan 1. Keputusan 2 sampai 5 ADR itu tidak berubah, dan seluruh konsekuensinya tetap berlaku. Bentuknya mengikuti preseden [ADR-0006](0006-telegram-sebagai-channel-pertama.md) → [ADR-0008](0008-discord-sebagai-channel-kedua.md): satu klausa digantikan, sisanya berdiri.

## Konteks

Yang diminta pemilik: `/new ~/Project/coret Coret` dari grupnya sendiri —
perintah, folder, nama, dalam satu pesan. Bentuk path sudah bekerja di DM
operator sejak 1.4.0; yang berbeda hanya dua hal, bahwa `@` tidak diketik dan
bahwa pesannya dari ruangan.

Yang pertama tidak menggeser batas apa pun. Token itu sudah dibaca sebagai path
ketika ia berbentuk path, jadi membuat sigilnya opsional khusus argumen pertama
`/new` hanya mengubah karakter apa yang mencapai `expandHome`. Di teks bebas `@`
tetap wajib, dan itulah yang menjaga `/etc/hosts is broken, fix it` tetap sebuah
prompt.

Yang kedua adalah keputusan keamanan, dan ADR-0010 keputusan 1 menolaknya dengan
alasan yang tertulis: "whoever can post in a paired group would otherwise choose
what directory the coding agent runs against."

Membaca ulang kalimat itu terhadap kodenya menunjukkan apa yang ia benar-benar
jaga. Bukan siapa yang menyetujui: penekan di luar allowlist sudah ditolak
`handleCallback`, dan `confirmed()` menolak penekan yang salah di dalam
allowlist. Yang ia jaga adalah **siapa yang memilih string-nya**, dan alasannya
ada di empat tempat path itu menjadi kunci — `policy_grant.workspace`, scope
memori `workspace:<path>`, `cwd` untuk `session/new`, dan `cwd` untuk `spawn`.

Membuka bentuk itu untuk setiap pengirim di allowlist menyerahkan lebih dari satu
direktori. `createSession` menulis `principal: String(message.from?.id)`, yaitu
peminta, dan `Store.decide` menolak setiap penekanan yang principal-nya bukan
itu. Jadi operator akan menekan sekali, dan sesudahnya peminta memegang
direktori pilihannya **dan** satu-satunya wewenang menjawab kartu izin di
dalamnya.

Kerahasiaan path terhadap ruangan tidak termasuk yang dijaga: `docs/security.md`
T6b sudah menyatakan bukan, dan penolakan versi sebelumnya sendiri sudah
bocorkan, karena ia mencetak `@slug · /path/absolut` untuk setiap workspace ke
dalam ruangan itu.

## Keputusan

**1. Bentuk path diterima di container mana pun yang Caraka layani, dari
operator channel itu saja.** Operator tetap entri pertama `allowFrom` channel
tersebut. Pengirim di allowlist yang bukan operator ditolak dengan kalimat yang
menyebut siapa yang boleh memakai bentuk itu, dan satu baris audit `ws.path`
`denied`, sama di percakapan pribadi maupun di ruangan. Operator memilih
string-nya dan operator menekan kartunya, jadi klausa yang benar-benar dijaga
ADR-0010 keputusan 1 tetap utuh.

**2. Kartu tambah-workspace hanya digambar di percakapan pribadi operator, dan
ruangan menerima satu kalimat tetap.** Dua alasan, dan keduanya berdiri sendiri.
`handleCallback` membersihkan keyboard untuk setiap penekan di allowlist sebelum
percabangan purpose, jadi kartu yang duduk di ruangan bersama bisa dilucuti
tombolnya oleh anggota lain sebelum operator melihatnya — gangguan, bukan
eskalasi, dan cukup. Dan jawaban yang bercabang atas keadaan filesystem adalah
primitif `isdir(p)` untuk `p` apa pun: kartu berarti direktori ada, satu kalimat
berarti tidak, kalimat lain berarti slug-nya terpakai. Di DM operator pembacanya
satu orang yang bisa menjalankan `ls`; di ruangan pembacanya setiap anggota, dan
T6b menyatakan jumlah itu lebih besar daripada allowlist pengirim. Maka ruangan
menerima satu kalimat yang menyebut di mana jawabannya diberikan, tanpa cabang.

**3. Argumen pertama `/new` dibaca sebagai folder ketika ia absolut sesudah `~/`
dikembangkan.** Satu fungsi murni, `markWorkspace`, menandai token itu dengan
`@` dan menyerahkan sisanya sebagai judul, jadi yang membaca token workspace
tetap satu tempat dan ejaan telanjang terkurung di `/new`. Path relatif tidak
pernah menjadi folder, dan kata polos yang kebetulan sebuah slug tetap menjadi
judul.

**4. Sebuah path ditolak sebelum kartunya digambar** ketika slug turunan
`basename`-nya bukan slug yang sah, ketika slug atau path-nya sama dengan yang
sudah ada tanpa membedakan huruf besar-kecil, atau ketika ia memuat, berada di
dalam, atau sama dengan workspace yang sudah ada. Yang terakhir adalah
satu-satunya bagian dari gagasan "allowlist ber-root" yang layak dimiliki:
`~/Project` memuat 89 repositori, jadi menyetujuinya tidak lebih kecil daripada
menyetujui seluruh disk, dan satu `/yolo` di atasnya akan menyetujui otomatis
setiap aksi bukan-berisiko-tinggi di bawah semuanya — persis alternatif yang
ADR-0010 tolak dengan pengukuran, tiba sebagai satu pesan chat.

## Konsekuensi

**Himpunan path yang `caraka trust <path> --bypass` mau terima ikut melebar.**
ADR-0010 keputusan 4 menolak path yang tidak dinamai config, dan yang dinamai
config sekarang bisa ditambah dari chat. Penjaganya tidak dilebarkan dan tidak
diubah: `caraka trust --bypass` tetap menuntut terminal dan tetap menuntut
operator mengetikkan path-nya sendiri. Yang berubah adalah bahwa satu entri
config bisa lahir dari kartu di DM, jadi kalimat "chat tidak pernah mencapai
`bypassPermissions`" berhenti lengkap dan yang lengkap adalah kalimat ini.

**Ruangan yang menyetujui sebuah workspace menjadi lengket padanya.** Sesudah
kartu disetujui, `setMeta("ws.last.<chatId>")` membuat tugas berikutnya di
ruangan itu yang tidak menyebut workspace berjalan di sana. Itu perilaku yang
sama dengan setiap workspace yang sudah ada di config, dan yang memilihnya
operator yang baru saja menekan tombolnya. Ia dinyatakan di `help.room`, bukan
dikontrol.

**Empat cacat pada kode yang sudah terkirim ikut diperbaiki**, karena ketiga yang
pertama menghalangi bentuk ini dan yang keempat lahir darinya:
`pendingWorkspaces` menyimpan operator sebagai `principal` alih-alih peminta —
tidak terlihat selama bentuknya DM-operator-saja, dan hidup begitu ruangan bisa
bertanya; `create` ikut menyeberangi kartu, jadi contoh pemilik sendiri membuka
sesi bernama `Coret` alih-alih mengirim `Coret` ke coding agent sebagai prompt;
`basename` yang bukan slug sah ditolak sebelum kartu, karena `@/` menulis
`config.yaml` yang `loadConfig` tidak bisa muat lagi dan sebelum restart slug
kosong terbaca sebagai workspace pertama; dan `pendingWorkspaces` beserta
`pendingTrust` menyapu entri kedaluwarsa saat entri baru masuk, karena tiap entri
menahan satu `InboundMessage` utuh dan mencetak satu DM.

**Anggaran laju tidak menyentuh cabang ini** dan itu tetap benar: sesudah
keputusan 1, satu-satunya pengirim yang bisa mencapainya adalah operator, jadi
banjirnya menimpa dirinya sendiri. Yang dibangun adalah penyapu kedaluwarsa,
bukan penghitung.

## Alternatif yang ditolak

**Membuka bentuk path untuk setiap pengirim di allowlist.** Kartu bertanda
tangan tetap menahan, jadi yang menolak ini bukan kekuatan approval-nya,
melainkan `session.principal`: satu tekanan operator akan menyerahkan sebuah
direktori pilihan orang lain dan wewenang approval di dalamnya sekaligus. Bentuk
yang aman untuknya menuntut principal sesi dipisahkan dari peminta, yang adalah
pekerjaan lain dan spec lain.

**Menggambar kartunya di ruangan.** Ditolak oleh `handleCallback` yang melucuti
keyboard untuk setiap penekan di allowlist, dan oleh T6b.

**Membiarkan ruangan menerima jawaban yang bercabang.** Itu `isdir(p)` untuk
setiap anggota ruangan, dan tidak ada satu pun kalimat yang perlu memberikannya:
yang bisa memperbaiki path-nya adalah orang yang bisa menjalankan `ls`, dan
kalimat untuknya sampai di DM-nya.

**Kunci config berisi root yang boleh menjadi workspace.** Sama seperti di
ADR-0010, dan tidak ada yang berubah pada pengukurannya.

**Konfirmasi berupa kata di ruangan, alih-alih kartu di DM.** Aturan keras 2:
tidak ada jalur di mana teks chat sendiri menulis entri workspace.
