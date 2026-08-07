# UI/UX — Caraka

**Versi:** 0.2 · **Tanggal:** 7 Agustus 2026

> Produk ini nyaris tidak punya UI. Permukaannya adalah **chat** dan **terminal**. Ini dokumen *interaction design*, bukan *visual design*.

---

## 1. Prinsip pengalaman

1. **Chat bukan terminal.** Jangan tempelkan output CLI mentah. Ringkas, terstruktur, terbaca di layar 6 inci sambil berjalan.
2. **Satu tugas, satu tab.** Setiap sesi hidup di topic-nya sendiri. Aliran utama tetap bersih.
3. **Status terlihat tanpa dibuka.** Warna ikon topic memberi tahu keadaan lima sesi sekaligus dalam satu pandangan.
4. **Keputusan berbahaya butuh ketukan, bukan ketikan.**
5. **Diam itu bagus.** Tanpa aktivitas → tanpa pesan. Heartbeat mati secara default.
6. **Bilingual otomatis.** Balas dalam bahasa yang dipakai user.
7. **Gagal dengan jalan keluar.** Setiap error menyebut langkah berikutnya.

---

## 2. Tata letak: ruang kerja ber-tab

```
  ┌─ Chat privat dengan @toko_caraka_bot ──────────────┐
  │                                                    │
  │  📋 General                          3 sesi aktif  │
  │  🔵 ▸ toko-api · rate limit login            #a91  │
  │  🟡 ⏸ toko-api · audit dependency            #a92  │
  │  🔵 ▸ web-landing · revisi hero              #a93  │
  │  🟢 ✓ toko-api · fix checkout 500            #a88  │
  │  🔴 ✗ api-gateway · migrasi prisma           #a84  │
  └────────────────────────────────────────────────────┘
```

| Warna | State | Arti |
|---|---|---|
| 🔵 biru | `running` | agent sedang bekerja |
| 🟡 kuning | `awaiting_approval` | **butuh kamu** |
| 🟢 hijau | `done` | selesai, tertutup |
| 🩷 magenta | `failed` | gagal |
| 🟣 ungu | `cancelled` | dibatalkan |

Kuning adalah satu-satunya warna yang berarti "buka saya sekarang". Itu disengaja: **satu sinyal perhatian, bukan lima.**

---

## 3. Tata bahasa pesan

### Di topic General — memulai sesi
```
@toko-api tambahkan rate limit di endpoint login
```
Tanpa prefiks → memakai workspace terakhir. Bot membalas satu baris dan memindahkan percakapan:
```
▸ sesi #a91 dibuat → "toko-api · rate limit login"
```

### Di topic sesi — melanjutkan
Ketik biasa. Tidak perlu prefiks, tidak perlu perintah. **Topic adalah konteksnya.**

### Perintah
| Perintah | Di mana | Fungsi |
|---|---|---|
| `/ws` | mana saja → dijawab di General | daftar workspace |
| `/new` | topic sesi | mulai sesi baru (topic baru) |
| `/stop` | topic sesi | batalkan run |
| `/status` | mana saja | ringkasan semua sesi aktif |
| `/switch <agent>` | topic sesi | ganti coding agent |
| `/mode read-only\|assisted` | topic sesi | turunkan/naikkan izin |
| `/pin` `/unpin` | topic sesi | kecualikan dari auto-hapus |
| `/ingat <teks>` `/lupakan <id>` `/memori` | mana saja | kelola memori |
| `/help` | mana saja | bantuan singkat |

Perintah sengaja sedikit. Kalau butuh dokumentasi untuk memakainya, terlalu banyak.

---

## 4. Anatomi balasan

### 4.1 Ack (< 1 detik, teks polos)
```
▸ claude · #a91
```

### 4.2 Progres (satu pesan, di-edit di tempat, throttle 1,5 dtk)
```
▸ claude · #a91
├ membaca src/routes/auth.ts
├ membaca src/middleware/*.ts
└ menyusun perubahan…                    ⏱ 0:24
```
Maksimal 5 baris terakhir; sisanya digulung. Bila `sendRichMessageDraft` tersedia, penalaran agent tampil sebagai **thinking block** yang bisa dilipat — bukan sebagai dinding teks.

### 4.3 Hasil akhir (Rich Message baru, pesan progres dihapus)
```
  Rate limit ditambahkan

  Memakai @fastify/rate-limit — 100 req / 15 menit per IP
  di POST /login.

  ┌────────────────────────────┬──────┬────────┐
  │ Berkas                     │  ±   │ Status │
  ├────────────────────────────┼──────┼────────┤
  │ src/routes/auth.ts         │ +12  │ ubah   │
  │ src/plugins/rate-limit.ts  │ +28  │ baru   │
  └────────────────────────────┴──────┴────────┘

  ▾ Diff lengkap                              (dilipat)

  ✓ 18 test lulus   ⏱ 1:12

  Push ke branch feat/login-rate-limit?
  [ 🚀 Push ]  [ ❌ Batal ]
```

Kenapa dikirim sebagai pesan baru, bukan hasil edit: **tidak ada `editRichMessage`** di Bot API, dan meng-edit pesan streaming merusak format rich menjadi teks polos bertanda mentah. Pola kirim-baru + hapus-progres adalah perbaikan yang sudah terbukti di implementasi lain.

### 4.4 Kartu approval
```
  ⚠️  Butuh izin

     Tulis berkas
     src/plugins/rate-limit.ts   (baru · 28 baris)

     Berlaku 10 menit · kode A7F3

     [ ✅ Setujui ]   [ 👁 Lihat isi ]   [ ❌ Tolak ]
         hijau             netral            merah
```
Topic berubah 🟡 saat kartu muncul, kembali 🔵 setelah diputuskan. Di grup, kartu dikirim **ephemeral** — hanya operator yang melihatnya.

### 4.5 Penutup (sebelum topic ditutup)
```
  ✓ Selesai · 1:12 · 2 berkas · 18 test lulus
    Ingatan disimpan: claim_f3963d7b
```
Baris terakhir setiap topic selalu menjelaskan apa yang terjadi — sehingga daftar topic dapat dipercaya tanpa dibuka.

### 4.6 Error
```
  ✗ Agent berhenti: timeout setelah 30 menit.
    Perubahan yang sudah disetujui tetap tersimpan.

    [ 🔄 Lanjutkan ]  [ 🆕 Sesi baru ]  [ 📋 Log ]
```

---

## 5. Aturan format lintas channel

| Aspek | Telegram | Discord | WhatsApp |
|---|---|---|---|
| Sesi | forum topic (DM, tanpa admin) | thread (auto-arsip 7 hari) | linear + header `[ws · #id]` |
| Status sesi | warna ikon topic | prefiks nama | prefiks nama |
| Hasil | `sendRichMessage` (tabel, code, collapsible) | embed + code block | teks + file |
| Approval | tombol berwarna (+ ephemeral di grup) | button/select + role | kode teks `ok A7F3` |
| Progres | edit pesan / rich draft | edit pesan | maks 1 update / 30 dtk |
| Batas | 32.768 karakter | 2.000 | praktis pendek |
| Diff panjang | collapsible → file bila > batas | file | file |

Aturan keras: **code block tidak pernah terpotong di tengah.** Melebihi batas → potong di batas block, sisanya sebagai file.

---

## 6. Onboarding

Lihat `install-flow.md` untuk alur lengkap. Kualitas yang dikejar: **wizard mengonfirmasi apa yang ia temukan, bukan menanyakan apa yang seharusnya ia tahu**, dan berakhir dengan pesan pertama yang benar-benar terkirim — bukan dengan "selesai, semoga berhasil".

---

## 7. Permukaan CLI

```
caraka start | stop | status | logs [-f]
caraka doctor [--fix]
caraka ws add | list | remove
caraka pair list | approve <channel> <code> | revoke <id>
caraka trust <workspace> --for 60m      # satu-satunya jalan ke mode trusted
caraka audit --since 24h [--workspace x]
caraka session list | export <id>
caraka memory status | export
caraka config edit | validate
```

`doctor` adalah alat dukungan utama: read-only, deterministik, rahasia teredaksi, aman ditempel ke issue.

---

## 8. Nada bahasa

- Ringkas, langsung, tanpa basa-basi. Emoji hanya sebagai penanda status.
- Spesifik: bukan "sudah selesai", tapi "18 test lulus, 2 berkas berubah".
- Jujur soal ketidakpastian: "test tidak saya jalankan — tidak ada skrip test di package.json".
- Tanpa persona buatan. Ini alat, bukan teman.

---

## 9. Aksesibilitas & kondisi nyata

- Semua informasi tersedia dalam teks; tombol dan warna adalah **pintasan, bukan syarat**. Status juga muncul sebagai prefiks nama (`▸ ⏸ ✓ ✗ ⊘`) untuk pengguna yang tidak dapat membedakan warna.
- Berfungsi di koneksi lambat: progres di-*edit*, bukan di-spam.
- Notifikasi hanya untuk hal yang butuh perhatian (approval, selesai, gagal).
- Bila topic tidak tersedia, mode linear memberi seluruh fungsi yang sama — hanya lebih padat.
