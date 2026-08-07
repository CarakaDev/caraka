# Spec — kartu pairing yang bersih dan laporan kesiapan grup

Ditemukan dari uji coba langsung, bukan dari review. Operator memasangkan grup
`Rama's Castle`, konfirmasi berhasil, lalu dua hal terjadi: tombol pada kartu
pairing tetap ada setelah ditekan, dan bot diam sepenuhnya di grup itu.

## Masalah

**1. Kartu single-use tidak membersihkan tombolnya.** Jalur approval memanggil
`clearKeyboard`; jalur `confirmTrust` dan `confirmGroup` tidak. Tiga handler
callback, satu di antaranya membersihkan. Tombol yang tersisa bukan lubang
keamanan — penekanan kedua ditolak karena permintaannya sudah dihapus — tetapi
ia menampilkan keadaan yang salah, dan operator tidak punya cara membedakan
"sudah dikonfirmasi" dari "belum tersentuh".

**2. Diamnya bot terbaca sebagai kerusakan.** Privacy mode menyala, dan itu
keputusan yang benar serta sudah tercatat di `docs/telegram-integration.md`
§6. Konsekuensinya tidak pernah sampai ke operator: dengan privacy mode
menyala Telegram hanya mengirimkan perintah yang ditujukan ke bot, balasan
atas pesan bot sendiri, dan service message. Pesan biasa tidak pernah tiba.
Tidak ada yang gagal, tidak ada yang bisa di-log, dan tidak ada yang bisa
dibaca operator selain diam.

Sumber: `https://core.telegram.org/bots/features#privacy-mode` — "Commands
explicitly meant for them", "Replies to any messages implicitly or explicitly
meant for this bot", dan "Privacy mode is enabled by default for all bots,
except bots that were added to a group as admins (bot admins always receive
all messages)."

Kalimat terakhir itu yang membuat topic dan privacy mode saling meniadakan:
`can_manage_topics` adalah hak administrator, jadi memberi bot hak topic
sekaligus membuatnya membaca setiap pesan di grup. `telegram-integration.md`
sudah menyatakan pertukaran ini; spec v0.2 AC-7b.7 mensyaratkan admin tanpa
menyebut harganya.

## Acceptance criteria

- **AC-1** WHEN sebuah callback dari principal yang ada di allowlist diterima,
  gateway shall menghapus keyboard pesan itu sebelum menjalankan handler
  apa pun, sehingga trust, pairing grup, dan approval seragam.
- **AC-2** IF principal tidak ada di allowlist pengirim, THEN gateway shall
  menolak callback itu tanpa menyentuh keyboard — anggota grup mana pun tidak
  boleh menghapus kartu milik operator.
- **AC-3** WHEN sebuah grup selesai dipasangkan, gateway shall mengirim laporan
  kesiapan ke DM operator yang menyatakan ketiga jenis pesan yang akan tiba,
  menyatakan bahwa pesan biasa tidak akan tiba, dan menyebut `/new@<bot>`
  sebagai cara menyapanya.
- **AC-4** Laporan kesiapan shall menyatakan status topic untuk grup itu, dan
  WHERE topic tidak tersedia ia shall menyebut bahwa memberikan haknya
  menjadikan bot admin dan admin membaca setiap pesan.
- **AC-5** WHEN `/status` dipanggil di chat non-privat, gateway shall
  menyertakan laporan kesiapan yang sama, karena di situlah pertanyaannya
  muncul.
- **AC-6** Seluruh teks laporan shall berada di katalog i18n untuk `en` dan
  `id`, tunduk pada tes "no Indonesian string survives outside the catalog".

## Di luar lingkup

Mematikan privacy mode, meminta hak admin, atau menawarkan tombol untuk
keduanya. Caraka menyatakan batasnya; mengubahnya adalah pekerjaan operator di
@BotFather, dan itu memang tidak nyaman dengan sengaja.
