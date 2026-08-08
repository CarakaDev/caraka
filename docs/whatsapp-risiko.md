# Risiko WhatsApp

**Produk:** Caraka · **Tanggal:** 8 Agustus 2026 · **English:** [`whatsapp-risiko.en.md`](whatsapp-risiko.en.md)
**Riset pendukung:** `docs/research/channel-chat-indonesia-baileys-telegram-multi-sumber.md` §2
**Untuk siapa:** orang yang sedang menimbang provider `baileys`, sebelum memasang apa pun.

Halaman ini yang ditunjuk `caraka start` ketika config memilih `provider: baileys`, dan ia ditulis supaya kamu bisa memutuskan **tidak** memakainya. Caraka tidak bisa mencegah WhatsApp memblokir nomormu bila kamu memilih provider tidak resmi (`security.md` §12). Yang bisa kami lakukan adalah menjelaskan apa yang sedang kamu pertaruhkan sebelum kamu mempertaruhkannya.

---

## Status hari ini

Channel WhatsApp terkirim di `0.6.0`, 8 Agustus 2026, dengan dua provider: `baileys` dan `cloud-api` (`CHANGELOG.md`). Halaman ini berlaku untuk `baileys` saja; `cloud-api` adalah jalur resmi Meta dan tidak punya kelas risiko ini sama sekali.

Yang **belum** terjadi: uji lapangan 14 hari yang menjadi gerbang penutup Fase 6 (`roadmap.md`). Gerbang itu berbunyi 14 hari pemakaian nyata di nomor terpisah tanpa ban dan tanpa relink manual, **atau** temuan jujur yang menjadikan Cloud API rekomendasi utama. Tidak ada nomor WhatsApp hidup yang pernah ditautkan ke kode ini, jadi setiap angka di halaman ini berasal dari laporan orang lain; kami belum punya pengalaman sendiri untuk ditambahkan.

---

## Apa yang sebenarnya terjadi saat kamu menautkan perangkat

Baileys membaca protokol WhatsApp Web multi-device hasil rekayasa balik. Kamu memasukkan kode pairing, dan nomormu mendapat satu *linked device* baru yang bukan aplikasi WhatsApp.

Itu gratis, selesai dalam dua menit, tidak butuh verifikasi bisnis, dan memberi perangkat itu **akses penuh ke chat personalmu**. Semua kenyamanan tadi berasal dari fakta yang sama: perangkatnya duduk di dalam akunmu, dengan jangkauan yang sama seperti WhatsApp Web. Bagi Meta itu bukan integrasi; itu klien yang tidak mereka tulis, dan konsekuensinya jatuh pada nomornya, bukan pada Caraka.

Dua hal yang perlu kamu tahu sebelum menautkan:

- Cara ini melanggar Ketentuan Layanan WhatsApp.
- Maintainer Baileys sendiri menyatakan tidak mendukung penggunaan yang melanggar ToS, dan secara eksplisit melarang bulk atau automated messaging.

---

## Angka yang benar-benar kami punya

Tidak ada base rate resmi. Yang ada laporan lapangan, dan riset di atas mengumpulkannya:

| Angka | Isi | Batasnya |
|---|---|---|
| **68%** | satu analisis 600+ akun UKM India: 68% mengalami minimal satu ban dalam 12 bulan | populasi pemasaran keluar, bukan bridge satu operator |
| **2–8 minggu** | estimasi umum sampai tooling protokol hasil rekayasa balik terdeteksi, **bila perilakunya memicu detektor** | syarat "bila" itu yang menentukan |
| rentang laporan | beberapa hari sampai berbulan-bulan tanpa masalah | tidak ada pola yang bisa diandalkan |

Keduanya datang dari ringkasan riset kami tertanggal **7 Agustus 2026**, yang mencantumkan sumber pihak ketiganya sebagai satu daftar dan tidak menyebut mana yang mengukur angka yang mana. Angka 68% itu menggambarkan akun yang dipakai bekerja mengirim pesan bisnis ke orang asing, bukan satu developer yang membalas dirinya sendiri: ia batas atas dari perilaku yang tidak kita lakukan, bukan ramalan untuk perilaku yang kita lakukan. Kami tidak punya angka untuk pemasangan berbentuk Caraka, dan tidak akan mengarangnya.

Isu OpenClaw #23093 melaporkan pola yang lebih konkret: session logout berulang, error 401, dan ban, terutama sesudah reconnect atau saat bridge mengirim balasan. Isu terkait di sekitarnya berbunyi "WhatsApp linking stuck at logging in" dan "can't link new devices at this time". Reconnect dan mengirim balasan adalah pekerjaan sehari-hari sebuah bridge, jadi laporan itu menyentuh persis cara Caraka bekerja — dan itulah kenapa plafon reconnect di tabel berikut sepuluh kali lipat punya Discord.

---

## Sinyal deteksi, dan apa yang Caraka lakukan terhadap masing-masing

Empat sinyal yang dilaporkan, dan posisi Caraka terhadapnya. Empat dari lima baris di bawah adalah kode yang bisa gagal, bukan kalimat di dokumen; `test/unit.test.ts` menguji plafon, jeda, penolakan kontak pertama, dan plafon reconnect.

| Sinyal | Yang dilaporkan | Posisi Caraka |
|---|---|---|
| Reply-ratio | di bawah 10% dihitung risiko tinggi | Caraka hanya membalas. Rasionya mendekati 100%, dan tidak ada permukaan untuk memulai percakapan |
| Jarak contact-graph | mengirim ke orang yang tidak punya hubungan denganmu | `emit()` di `src/channels/whatsapp.ts` menolak menulis ke nomor yang belum pernah menulis lebih dulu dan tidak ada di `allowFrom`, lalu menulis satu baris audit |
| Timing | pola pengiriman yang terlalu rapi untuk manusia | jeda acak seragam 1.200–3.500 md antar-outbound, dengan plafon 12 pesan per jendela bergulir 60 detik. Kelebihan diantrekan, tidak dijatuhkan |
| Reconnect | logout berulang dan 401 sesudah menyambung ulang | backoff 5 detik ×2 berjitter penuh, plafon 300 detik, berhenti di percobaan keenam. Jawaban logged-out atau 401 tidak pernah disambung ulang sama sekali |
| Asal traffic | IP datacenter atau VPS | **tidak ditangani.** Caraka berjalan di mesinmu; kalau mesin itu VPS, sinyal itu ada dan tidak bisa dibereskan dari dalam program |

Satu jalan tulis, dan hanya satu: setiap pengiriman WhatsApp lewat `emit()`, sehingga tidak ada pemanggil yang bisa melewatkan ketiga penjagaan itu.

Riset yang sama juga menyebut "anti-ban wrapper" dan random delay hanya menyentuh sebagian sinyal. Tidak ada yang menjamin apa pun. Evolution API, WAHA, dan Whapi.Cloud juga bukan jawaban: semuanya memakai Baileys atau whatsmeow di balik layar, sehingga risiko banned-nya identik, dan yang berbeda hanya siapa yang mengurus infrastrukturnya. Caraka menolak jalur itu dengan alasan tambahan yang lebih membosankan: satu proses tambahan untuk risiko yang sama (`techstack.md` §5).

---

## Kenapa bentuk pemakaian Caraka duduk di ujung paling rendah

Satu nomor. Satu operator. Balasan hanya masuk ke percakapan yang sudah ada. Tidak pernah menghubungi orang asing. Volume rendah, dan reply-ratio mendekati 100%. Riset menyebut setup yang hanya membaca dan membalas percakapan yang sudah ada jauh lebih rendah risikonya dibanding menyebar pesan first-contact.

Itu tetap bukan jaminan. Empat sinyal di atas adalah apa yang **dilaporkan** orang, bukan aturan main yang dikonfirmasi WhatsApp, dan risiko yang tidak dapat diprediksi tidak berubah menjadi dapat diprediksi karena profilmu bagus.

---

## Yang menjadi gerbang di kode, dan yang tidak

Lima mitigasi wajib di riset. Empat sudah menjadi perilaku program:

1. **`allowFrom` wajib diisi.** Skema config memakai `.min(1)`, jadi blok `whatsapp:` dengan daftar kosong menghentikan `caraka start` dengan pesan yang menyebut channel mana (`src/config.ts`).
2. **Plafon outbound keras dan jeda acak**, ditegakkan di `emit()`, dengan angka di tabel atas.
3. **Tidak pernah mengirim pesan first-contact**, ditegakkan di fungsi yang sama.
4. **Pilihan `baileys` tidak berlaku sampai kamu menulis `acknowledgeRisk: true`** di config. Tanpa itu start berhenti, dan pesannya menautkan halaman ini (`docs/frd.md` FR-SETUP-06).

Yang kelima setengah jalan, dan itu perlu dikatakan. Riset meminta peringatan nomor terpisah **saat onboarding**; `caraka init whatsapp` belum dibangun, jadi blok `whatsapp:` ditulis tangan. Yang ada sebagai gantinya adalah peringatan yang dicetak setiap `caraka start` ketika provider `baileys` terpilih, memuat kalimat nomor terpisah dan tautan ke halaman ini. Itu tetap peringatan yang tidak bisa dilewati, tetapi ia tiba sesudah keputusan ditulis, bukan sebelum.

---

## Pakai nomor terpisah

Tautkan nomor yang kamu sanggup kehilangan.

Aturan itu sesederhana kelihatannya. Perangkat yang kamu tautkan mendapat akses penuh ke chat personal nomor tersebut, dan bila blokir datang, yang diblokir adalah nomor itu. Jalur resmi pun meminta hal yang sama dengan alasan berbeda: Cloud API butuh nomor khusus yang tidak bisa berbagi dengan WhatsApp pribadimu.

Dua hal lagi yang berumur panjang:

- **Jangan taruh nomor kolega di `allowFrom` "untuk jaga-jaga".** Daftar itu satu-satunya gerbang pengirim, dan setiap nomor di dalamnya bisa menyetir agent.
- **Grup tidak didukung, dan itu keputusan.** Protokol perangkat tertaut menyebut grup itu sendiri sebagai pengirim, jadi setiap anggota akan tiba sebagai satu principal dan setiap anggota membaca kode approval di kartu yang sama. Caraka menolak pesan grup di `receive()`; hanya percakapan satu lawan satu dengan nomor di `allowFrom` yang sampai.

---

## Cloud API: harganya, syaratnya, dan kapan itu jawaban yang benar

Jalur resmi Meta menghapus kelas risiko ini. Tidak ada ban, komunikasinya lewat webhook tanpa kerapuhan WebSocket, didukung Meta, dan fiturnya lebih kaya (template, interactive message, media, read receipt).

Yang harus kamu sediakan sebagai gantinya:

- **Verifikasi Meta Business**, memakan beberapa hari.
- **Harga per pesan**, ±$0,005–0,08 tergantung negara dan arah pesan. Sejak **1 Juli 2025** Meta pindah dari conversation-based ke per-message pricing. Template Utility gratis di dalam jendela 24 jam; Marketing dan Authentication selalu berbayar. Caraka hanya membalas percakapan yang sudah ada, jadi ia tidak pernah mengirim template.
- **Nomor khusus** yang tidak bisa berbagi dengan WhatsApp pribadimu.
- **Endpoint webhook yang bisa dihubungi Meta.** Penerimanya sudah terkirim di `0.6.0` dan bind `127.0.0.1` secara default; alamat lain hanya lewat flag eksplisit yang mencetak peringatan dan menulis audit sebelum koneksi pertama diterima. Signature `X-Hub-Signature-256` wajib dan dibandingkan waktu-tetap, juga saat bind loopback. TLS dan eksposur publiknya pekerjaan reverse proxy milikmu; Caraka tidak menyediakannya dan tidak mengklaim menyediakannya (`security.md` §8).

Angka harga di atas berumur; ia tercatat dalam riset kami tertanggal 7 Agustus 2026. Periksa daftar harga Meta sendiri sebelum menghitung anggaran.

Cloud API adalah jawaban yang benar bila nomor itu milik bisnismu, atau bila kehilangannya berarti kehilangan pelanggan, dan kamu menerima verifikasinya, nomor khususnya, tagihan per pesannya, serta satu endpoint yang harus kamu jaga. Config yang sama bekerja untuk keduanya: yang berubah hanya `provider`, dan satu-satunya perbedaan yang dilihat core adalah `caps.edit`, karena Cloud API tidak punya endpoint edit dan progres di sana berhenti di satu ack.

Bila yang sebenarnya kamu inginkan hanya menjalankan coding agent dari chat, dan nomor WhatsApp bukan bagian dari kebutuhannya, Telegram sudah terkirim sejak `0.1.0`: Bot API resmi, gratis, tanpa risiko ban, dan long-polling yang tidak membuka port apa pun.

---

## Kalau nomornya kena

Runbook lengkapnya di `docs/troubleshooting.md`, bagian WhatsApp. Ringkasnya: hentikan gateway, jangan menyambung ulang, hapus `~/.caraka/secrets/whatsapp/`, dan putuskan apakah nomor berikutnya layak dipertaruhkan atau sudah saatnya pindah ke `cloud-api`.

---

## Yang tidak kami janjikan

- Kami tidak bisa mencegah WhatsApp memblokir nomormu bila kamu memakai provider tidak resmi (`security.md` §12).
- Ban akun dari provider tidak resmi berada di luar cakupan laporan keamanan kami. Risikonya didokumentasikan dan diterima, dan tidak diperlakukan sebagai cacat produk (`SECURITY.md`).
- Kami tidak punya angka peluang untuk nomormu, dan tidak akan memberikan satu pun.
- Kami tidak tahu apa yang terjadi sesudah sebuah nomor kena: jalur banding, lama pemulihan, dan apakah nomor itu bisa dipakai lagi tidak ada di riset mana pun yang kami punya.

Kalau setelah membaca semua ini kamu merasa taruhannya tidak sepadan untuk nomormu, itu kesimpulan yang memang tersedia di halaman ini. Telegram mengerjakan pekerjaan yang sama tanpa taruhan tersebut.
