# Spec — rename-topic-tenang: satu nama ditulis sekali

**Slug:** rename-topic-tenang · **Tanggal:** 15 Agustus 2026 · **Status:** selesai

## Latar

Dilaporkan dari luar: *"setiap mau kerja dia selalu rename topic terus, padahal
dia sudah ada di topic itu."*

Yang dilihat pelapor bukan glifnya, melainkan ongkosnya. Setiap
`editForumTopic` menulis satu service message `forum_topic_edited` ke dalam
transkrip topic, jadi rename yang berlebih terbaca sebagai sampah di ruangan
kerja, bukan sekadar panggilan API yang mubazir. Ini bentuk yang sama dengan
cacat 1.5.0 yang ditutup separuh di 1.5.2 — waktu itu yang menulis service
message adalah `closeForumTopic` dan `reopenForumTopic`; yang tersisa adalah
rename-nya sendiri.

`Gateway.setState` adalah satu-satunya pemanggil `channel.editTopic`, dicapai
dari sepuluh tempat, dan ia memanggil tanpa membandingkan apa pun dengan nama
yang sudah terpasang. Empat jalur karena itu mengirim nama yang **sudah** ada di
topic itu:

- **`/stop`** — `stopActive` menulis `cancelled`, dan run yang dibatalkannya
  kembali lewat jalur normal dan menulis `cancelled` lagi. Dua `⊘ <judul>`.
- **Timeout 30 menit** — `cancelForTime` menulis `cancelled`, jalur yang sama
  menyusul. Bentuk yang sama persis.
- **`/close`** — menulis `done` pada sesi yang run terakhirnya sudah berakhir di
  `done`. Judul sesi tidak pernah berubah sesudah dibuat, jadi namanya identik.
- **Dua approval sekaligus** — masing-masing menulis `awaiting_approval` saat
  tiba, dan masing-masing menulis `running` saat dijawab. Dua pasang identik.

Giliran pertama di topic baru menghabiskan tiga panggilan topic:
`createForumTopic` dengan judul telanjang, lalu dua rename.

Telegram menjawab rename identik dengan 400 `TOPIC_NOT_MODIFIED`, dan
`.catch(() => undefined)` di pemanggilnya tidak bisa membedakannya dari
kegagalan izin atau masalah jaringan. Di Discord `editTopic` adalah PATCH
channel dan tidak ada 400 seperti itu — yang terbakar adalah token rate limit
pada batas yang Discord sendiri tidak dokumentasikan, dan satu giliran biasa
sudah menghabiskannya.

**Cacat kedua, ditemukan saat memverifikasi yang pertama.** `fetchWithRetry`
tidur `Math.min(seconds, 60)` di dalam `for(;;)` tanpa jalan keluar. Ia tidur
lebih sebentar daripada yang diminta — cara paling pasti mendapat 429
berikutnya — dan tidak pernah menyerah. Karena `setState` di-`await` pada empat
dari lima pemanggilnya, satu 429 pada rename **menahan run-nya**, bukan sekadar
menunda glifnya. `.catch` di `setState` bukan jaring pengaman: 429-nya tidak
pernah dilempar.

## Lingkup

Dua perubahan, keduanya di jalur yang sama, tidak ada yang lain.

1. `setState` melewatkan `editTopic` ketika nama yang akan ditulis sama dengan
   nama terakhir yang berhasil ia tulis untuk thread itu.
2. `fetchWithRetry` menghormati `retry-after` seutuhnya, dan berhenti ketika
   total tunggu melewati anggarannya alih-alih mengulang selamanya.

**Di luar lingkup, dan alasannya.** Menghapus salah satu dari pasangan
`▸`/`✓` per giliran. Itu memang akan memangkas dua service message menjadi satu,
tetapi transisi yang paling masuk akal dibuang adalah justru yang menjadi alasan
produk ini ada — papan status yang bisa dibaca sekilas (ADR-0003), dan sebuah AC
spec yang sudah diterima memakukannya. Sisa yang tidak ditutup dicatat di bawah,
tidak disembunyikan.

## Acceptance criteria

- **AC-1** — Ketika `setState` akan menulis nama yang sama dengan nama terakhir
  yang berhasil ditulis untuk thread itu, sistem **shall** melewatkan panggilan
  `editTopic` dan tetap menulis state-nya ke baris sesi.
- **AC-2** — Penanda nama **shall** ditulis hanya sesudah panggilan rename
  berhasil, sehingga rename yang gagal dicoba lagi pada transisi berikutnya.
- **AC-3** — Penanda **shall** dikunci pada nama yang dirender, bukan pada
  state, sehingga giliran kedua di topic yang sama tetap bergerak
  `▸` → `✓`.
- **AC-4** — Penulisan state ke basis data **shall** tetap terjadi meski
  panggilan topic dilewatkan.
- **AC-5** — Ketika sebuah channel menjawab 429, sistem **shall** menunggu
  selama yang disebut `retry-after`, tanpa dipotong.
- **AC-6** — Ketika total tunggu 429 melewati anggarannya, sistem **shall**
  melempar galat channel itu alih-alih mengulang, sehingga pemanggil yang bisa
  merosot kehilangan glifnya dan bukan run-nya.

## Yang tetap terbuka sesudah ini

Giliran biasa tetap menulis dua service message, `▸` lalu `✓`. Keduanya nama
yang berbeda, jadi tidak satu pun dilewatkan guard ini. Menguranginya adalah
keputusan produk tentang papan status, bukan perbaikan bug, dan tidak diambil
di sini.

`AC-4` dijaga oleh urutan, bukan oleh test: `store.setState` menaikkan
`updated_at`, dan pencarian route mengurutkan `updated_at DESC`, jadi
mengembalikan lebih awal atas state yang tidak berubah akan mengubah sesi mana
yang di-resolve sebuah pesan berikutnya. Guard-nya karena itu duduk **di bawah**
penulisan state, bukan di atasnya.
