# Spec — teks-tool-bukan-jawaban

**Tanggal:** 16 Agustus 2026 · **Status:** terverifikasi; AC-3 menunggu persetujuan publish

## Latar

Caraka 1.5.7 mulai membaca blok dari `tool_call` dan `tool_call_update` agar
gambar yang dibuat sebuah tool sampai ke chat. Pembaca teks memakai jalur blok
yang sama, sehingga transkrip Mem0 dan keluaran shell ikut ditambahkan ke
`output`. Pesan progres tetap terhapus saat run selesai, tetapi `output` itu
sudah dikirim lagi sebagai hasil final dan menetap di Telegram.

Kontrak yang sudah tertulis di `docs/design.md` dan
`docs/telegram-integration.md` adalah satu pesan progres yang disunting selama
run, lalu hasil final baru dikirim dan pesan progres dihapus.

## Ruang lingkup

- Pisahkan teks untuk preview progres dari teks jawaban final.
- Pertahankan gambar yang lahir di dalam tool call.
- Terbitkan patch sebagai `caraka@1.5.8`, lalu perbarui instalasi yang berjalan
  di komputer ini setelah persetujuan pemilik.

## Yang tidak dikerjakan

- Tidak mengubah bentuk Rich Message atau interval edit progres.
- Tidak menambah jenis update ACP atau konfigurasi baru.
- Tidak mengubah isi baris `Memory saved`; baris itu memang penutup hasil final.

## Acceptance criteria

- **AC-1.1** WHEN sebuah `tool_call` atau `tool_call_update` membawa blok teks,
  Caraka shall menampilkan teks itu hanya pada pesan progres yang dapat disunting.
- **AC-1.2** WHEN run yang sama selesai, Caraka shall tidak menaruh teks dari
  tool call pada hasil final.
- **AC-1.3** WHEN run yang sama selesai, Caraka shall menghapus pesan progres
  sesudah hasil final dikirim.
- **AC-2.1** WHEN sebuah `agent_message_chunk` membawa blok teks, Caraka shall
  menaruh teks itu pada pesan progres dan hasil final.
- **AC-2.2** WHERE sebuah tool call membawa blok gambar yang sah, Caraka shall
  tetap mengirim gambar itu ke channel yang mendukung gambar.
- **AC-3.1** WHEN pemilik menyetujui publikasi, paket `caraka@1.5.8` shall
  tersedia dari registry npm dengan perubahan ini di tarball-nya.
- **AC-3.2** WHEN instalasi global komputer ini diperbarui dan Caraka dimulai
  ulang, proses yang aktif shall memakai `caraka@1.5.8` dan lulus pemeriksaan
  kesiapan tanpa mencetak kredensial.
