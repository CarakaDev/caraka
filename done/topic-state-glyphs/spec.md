# Spec — keadaan sesi pada nama topic

Butir roadmap Fase 0: tandai keadaan sesi lewat `editForumTopic`. Sampai
sekarang hanya sesi yang selesai yang diberi tanda, dengan menempelkan teks
keadaan di belakang judul, dan penandaan itu hidup terpisah dari
`store.setState` — dua pemanggilan yang bisa tidak sepakat, dan memang pernah:
sesi yang gagal atau menunggu approval tidak mengubah apa pun di daftar topic.

Batasan dari Bot API yang menentukan bentuknya: `icon_color` hanya bisa
ditetapkan saat `createForumTopic`, dari enam nilai yang didokumentasikan.
`editForumTopic` hanya membuka `name` dan `icon_custom_emoji_id`. Jadi warna
menjadi identitas yang diberikan sekali, dan keadaan yang berubah harus tinggal
di nama. Glif ditaruh di depan karena daftar topic dibaca sekilas dan Telegram
menampilkan awal nama, bukan akhirnya.

Peta glifnya: `▸` running, `⏸` awaiting_approval, `✓` done, `✗` failed,
`⊘` cancelled. Warna bukan satu-satunya sinyal — di sini warna malah tidak
membawa sinyal sama sekali.

## Acceptance criteria

- **AC-1** WHERE sesi memiliki topic, WHEN keadaannya berubah, gateway shall
  mengganti nama topic itu menjadi `<glif> <judul>` sesuai keadaan barunya.
- **AC-2** WHEN sebuah topic dibuat, gateway shall menetapkan `icon_color`
  sekali pada `createForumTopic` dan tidak pernah mencoba mengubahnya lagi.
- **AC-3** IF sesi berjalan dalam mode linear tanpa `threadId`, THEN gateway
  shall menulis keadaan ke store tanpa memanggil `editForumTopic`.
- **AC-4** IF `editForumTopic` ditolak Telegram, THEN gateway shall membiarkan
  run berjalan dan keadaan di store tetap tertulis.

## Di luar lingkup

Warna per keadaan (Bot API tidak mengizinkannya), `icon_custom_emoji_id`
(butuh custom emoji milik bot), serta menutup atau menghapus topic — keputusan
itu sudah diambil dan diuji: sesi yang selesai ditandai, tidak pernah ditutup
dan tidak pernah dihapus.
