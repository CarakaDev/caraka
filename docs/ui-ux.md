# UI/UX — Caraka

**English:** this document is Indonesian only, and stays that way because it is internal specification. English documentation starts at [`../README.md`](../README.md).

**Versi:** 0.2 · **Tanggal:** 7 Agustus 2026

> Produk ini nyaris tidak punya UI. Permukaannya adalah **chat**, **terminal**, dan sejak v0.5 satu **dasbor lokal read-only** di `127.0.0.1`. Ini dokumen *interaction design*, bukan *visual design*.

---

## 1. Prinsip pengalaman

1. **Chat bukan terminal.** Jangan tempelkan output CLI mentah. Ringkas, terstruktur, terbaca di layar 6 inci sambil berjalan.
2. **Satu tugas, satu tab.** Setiap sesi hidup di topic-nya sendiri. Aliran utama tetap bersih.
3. **Status terlihat tanpa dibuka.** Warna ikon topic memberi tahu keadaan lima sesi sekaligus dalam satu pandangan.
4. **Keputusan berbahaya butuh ketukan, bukan ketikan.**
5. **Diam itu bagus.** Tanpa aktivitas → tanpa pesan. Heartbeat mati secara default.
6. **Bahasa dipilih sekali, bukan ditebak.** Prosa agent mengikuti bahasa prompt karena Claude melakukannya; string milik Caraka mengikuti `language` di config.
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
| Perintah | Di mana | Fungsi | Status |
|---|---|---|---|
| `/new [judul]` | topic sesi | mulai sesi baru (topic baru), judul opsional | terpasang |
| `/stop` | topic sesi | batalkan run | terpasang |
| `/status` | mana saja | ringkasan semua sesi aktif | terpasang |
| `/help` | mana saja | bantuan singkat | terpasang |
| `/start` | mana saja | pairing deep link | terpasang |
| `/commands` `/usage` | mana saja | daftar perintah agent, pemakaian terakhir | terpasang |
| `/yolo <durasi>` `/lock` | topic sesi | buka dan tutup jendela trust | terpasang |
| `/ws` | mana saja → dijawab di General | daftar workspace | terpasang |
| `/switch <id preset>` | topic sesi | ganti coding agent pada giliran berikutnya | terpasang |
| `/mode read-only\|assisted` | topic sesi | turunkan/naikkan izin | dispesifikasikan, belum di v0.2 |
| `/pin` `/unpin` | topic sesi | kecualikan dari auto-hapus | dispesifikasikan, belum di v0.2 |
| `/ingat <teks>` `/lupakan <id>` `/memori` | mana saja → dijawab di General | kelola memori | terpasang |

Perintah sengaja sedikit. Kalau butuh dokumentasi untuk memakainya, terlalu banyak.

`/mode` dan `/switch` tidak boleh mengeraskan nama mode milik agent: id mode adalah
string spesifik per agent, jadi keduanya menunggu Caraka membaca `configOptions`
dari `session/new` dan aliran `config_option_update`.

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

Kenapa dikirim sebagai pesan baru, bukan hasil edit: `editMessageText` sebenarnya bisa meng-edit sebuah pesan menjadi rich message sejak Bot API 10.1 menambahkan parameter `rich_message`. Yang menahan adalah laporan bahwa format rich hancur menjadi teks polos bertanda mentah saat di-edit di tengah stream, dan laporan itu **belum diuji ulang** setelahnya. Pola kirim-baru + hapus-progres dipertahankan karena ia sudah bekerja.

### 4.4 Kartu approval
```
  ⚠️  Butuh izin

     Tulis berkas
     src/plugins/rate-limit.ts   (baru · 28 baris)

     Berlaku 10 menit · kode A7F3

     [ ✅ Setujui ]   [ 👁 Lihat isi ]   [ ❌ Tolak ]
         hijau             netral            merah
```
Topic berubah 🟡 saat kartu muncul, kembali 🔵 setelah diputuskan. Di grup, kartu yang sama terbaca setiap anggota; yang tetap tertutup adalah keputusannya, karena tombolnya hanya sah dari principal di allowlist (`security.md` §4).

Baris `kode A7F3` di gambar itu **tidak** muncul di channel bertombol. Sejak v0.6 kode hanya dibangkitkan ketika `caps.buttons` false, dan kartu bertombol tidak membawa kode sama sekali: dua bearer secret untuk satu keputusan berarti dua permukaan tebakan tanpa satu pun kemampuan baru. Di WhatsApp kartunya kehilangan tiga tombol itu dan menyebut kedua bentuk balasan beserta masa berlakunya.

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

Kolom Telegram dan Discord terpasang sejak v0.5, kolom WhatsApp sejak v0.6. Sel yang belum terbangun ditandai di bawah tabel.

| Aspek | Telegram | Discord | WhatsApp |
|---|---|---|---|
| Sesi | forum topic (DM, tanpa admin) | public thread di text channel, `auto_archive_duration` 10080 mnt | linear + header `[ws · #id]` |
| Status sesi | glif di nama topic (warna ikon dikunci saat dibuat) | glif di nama thread | glif di header balasan |
| Hasil | `sendRichMessage`, jatuh ke pesan biasa bila ditolak | pesan markdown biasa | teks; lewat tiga pecahan menjadi satu berkas `.md` |
| Approval | tombol, terikat principal | tombol, terikat principal — role tidak pernah mengotorisasi (ADR-0008) | kode sekali pakai di kartu, `ok A7F3` / `no A7F3`, terikat principal dan sesi (ADR-0009) |
| Progres | edit pesan, ekor 3.900 karakter | edit pesan, ekor sepanjang `caps.maxChars` | `baileys` mengedit pesan, maks 1 update / 30 dtk; `cloud-api` tidak punya endpoint edit, jadi `caps.edit` false dan progres berhenti di satu ack |
| Batas | 30.000 karakter per rich message, 4.096 per pesan biasa | 2.000 | 4.096 |
| Diff panjang | dipecah pada batas block | dipecah; lewat tiga pecahan dikirim sebagai satu berkas `.md` | sama, lewat `splitMarkdown` yang sama |

Aturan keras: **code block tidak pernah terpotong di tengah.** Melebihi batas → potong di batas block, dan pesan berikutnya membuka pagarnya kembali. Satu fungsi melakukannya untuk kedua channel (`splitMarkdown` di `src/core/channel.ts`), jadi tidak ada channel yang bisa memotongnya dengan cara sendiri. Ambang tiga pecahan pada baris Discord adalah keputusan keterbacaan, bukan batas platform: dinding empat pesan lebih sulit dibaca daripada satu lampiran.

Dua sel di tabel ini dulu menjanjikan lebih dari yang ada. Embed Discord tidak dibangun: keluaran agent adalah markdown dan Discord membacanya apa adanya, jadi lapisan embed akan menjadi permukaan tanpa pembaca — itu juga yang membuat FR-CHAN-07 terpenuhi tanpa lapisan escape. "button/select + role" pada baris approval adalah cara merender, bukan cara mengotorisasi, dan kata `role` dihapus dari baris itu supaya tidak terbaca sebagai otoritas.

---

## 6. Onboarding

Lihat `install-flow.md` untuk alur lengkap. Kualitas yang dikejar: **wizard mengonfirmasi apa yang ia temukan, bukan menanyakan apa yang seharusnya ia tahu**, dan berakhir dengan pesan pertama yang benar-benar terkirim — bukan dengan "selesai, semoga berhasil".

---

## 7. Permukaan CLI

```
caraka init                             # terpasang
caraka doctor [--fix]                   # terpasang (--fix belum)
caraka start                            # terpasang
caraka stop | status                    # terpasang
caraka dashboard [--port n] [--bind addr]         # terpasang
caraka service --print systemd|launchd|schtasks   # terpasang
caraka trust <workspace> --for 60m      # terpasang
caraka trust <workspace> --bypass --for 60m       # terpasang
caraka logs [-f]                        # dispesifikasikan, belum di v0.2
caraka ws add | list | remove           # dispesifikasikan, belum di v0.2
caraka pair list | approve <channel> <code> | revoke <id>   # dispesifikasikan, belum di v0.2
caraka audit --since 24h [--workspace x]           # dispesifikasikan, belum di v0.2
caraka session list | export <id>       # dispesifikasikan, belum di v0.2
caraka memory status | export           # dispesifikasikan, belum di v0.2
caraka config edit | validate           # dispesifikasikan, belum di v0.2
```

`--bypass` menyalakan mode `bypassPermissions` milik Claude, dan itu satu-satunya
jalan menuju mode tersebut. Selama jendela itu terbuka Caraka berhenti menerima
`session/request_permission`, jadi ia tidak melihat keputusan izin apa pun dan
tidak mengaudit isinya. Tanpa `--bypass`, perintah yang sama membuka jendela trust
Caraka, yang tetap menerima setiap permintaan izin.

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
