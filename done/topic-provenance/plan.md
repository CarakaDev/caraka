# Plan — topic-provenance

**Spec:** [`spec/topic-provenance.md`](../spec/topic-provenance.md) · **Tanggal:** 13 Agustus 2026

## Keputusan penyimpanan

Kepemilikan disimpan di tabel `meta` yang sudah ada, satu baris per thread,
kuncinya `topic.own.<chatId>.<threadId>` dan nilainya `1`. Tidak ada migrasi,
tidak ada kolom baru, dan pola kuncinya sama dengan `threads.<chatId>` yang sudah
dipakai `topicsAvailable`.

Kenapa `meta` dan bukan kolom di `sessions`: kepemilikan adalah sifat **thread**,
bukan sifat sesi. Sebuah thread yang Caraka buat untuk sesi A tetap milik Caraka
ketika sesi B lahir di thread yang sama lewat `/new` — dengan kunci per thread,
AC-9 terpenuhi tanpa satu baris kode tambahan, sementara kolom per sesi menuntut
pewarisan yang harus ditulis dan diuji sendiri.

Nilainya `1`, bukan nama. Nama topic tidak pernah bisa dibaca dari Bot API, jadi
tidak ada nama yang jujur untuk disimpan (AC-11).

Tidak ada backfill. Basis data yang lahir sebelum rilis ini tidak punya satu pun
baris itu, jadi setiap thread di dalamnya terbaca bukan milik Caraka dan tidak
disentuh (AC-8). Itu memang arah yang benar untuk sebuah penjaga, dan
konsekuensinya nyata: sesi yang sudah punya topic berhenti memperbarui glifnya
sesudah upgrade. Dicatat di `CHANGELOG`, bukan disembunyikan.

## Langkah

1. **Merah dulu.** Satu test e2e baru: pesan yang membawa `message_thread_id` ke
   sebuah chat forum, lalu satu tugas dijalankan sampai selesai. Assert
   `h.calls` tidak memuat satu pun `editForumTopic:`. Hari ini test ini gagal
   dengan dua panggilan, dan dua panggilan itulah isi laporan #7.
2. `src/core/gateway.ts` — satu static:

   ```ts
   // Kepemilikan thread, bukan kepemilikan sesi: sebuah thread yang Caraka buat
   // tetap miliknya ketika sesi berikutnya lahir di dalamnya.
   private static ownKey(chatId: string, threadId: string) {
     return `topic.own.${chatId}.${threadId}`;
   }
   ```
3. `src/core/gateway.ts`, `createSession` — sesudah `createTopic` berhasil dan
   hanya di cabang itu, `this.store.setMeta(Gateway.ownKey(chatId, threadId), "1")`.
   Cabang yang mengambil thread dari pesan tidak menulis apa pun (AC-1, AC-2), dan
   karena `setMeta` memakai `ON CONFLICT … DO UPDATE`, menulis ulang kunci yang
   sudah ada tidak mengubah apa pun (AC-10).
4. `src/core/gateway.ts`, `setState` — satu syarat, ditaruh **sesudah**
   `this.store.setState(...)` dan sesudah pemeriksaan glif, sebelum `channel`
   diambil:

   ```ts
   if (this.store.meta(Gateway.ownKey(session.chatId, session.threadId)) !== "1") {
     this.note(session, "topic.skip", "unowned", {
       chatId: session.chatId,
       threadId: session.threadId,
     });
     return;
   }
   ```

   Posisinya menentukan tiga hal sekaligus. Di atas `setState` ke basis data, ia
   akan menelan perpindahan keadaan (AC-6 gagal). Di bawah pemeriksaan glif, ia
   menjaga `editTopic` **dan** `finishThread` dengan satu syarat, karena keduanya
   sudah berada di bawah pemeriksaan itu — jadi tidak ada penjaga kedua untuk
   arsip Discord (AC-4, AC-5).
5. `test/e2e.test.ts` — opsi harness `archives?: boolean` yang menambahkan
   `finishThread` ke channel palsu dan mencatat `finishThread:<threadId>`.
   Channel Telegram tidak punya method itu, dan yang diuji di sini bukan Telegram
   melainkan core terhadap sebuah kemampuan (hard rule 1), jadi kemampuannya
   dinyalakan lewat opsi alih-alih dipinjam dari adapter yang tidak memilikinya.
6. `test/e2e.test.ts` — enam test baru, dan satu pemeriksaan di test yang sudah
   ada. Rinciannya di tabel di bawah.
7. `docs/session-model.md` — satu bagian: thread yang dibuat Caraka membawa glif,
   thread yang bukan miliknya tidak disentuh, dan sesi tetap berjalan di
   keduanya. `docs/frd.md` FR-SESS: syarat kepemilikan sebelum mutasi thread.
   `docs/security.md` dan `.en`: satu baris di daftar kontrol, karena mutasi
   thread bersama adalah efek samping di ruang yang dibagi orang lain.
8. `npm run verify`, lalu gerbang yang sama di `rama-tuf`.

## Pemetaan AC → pembuktian

| AC | Pembuktian |
|---|---|
| AC-1 | e2e *Caraka menandai thread yang dibuatnya*: sesudah pesan tanpa `message_thread_id` di chat forum, `store.meta("topic.own.42.7001")` bernilai `1` |
| AC-2 | e2e *thread dari pesan tidak pernah ditandai*: pesan dengan `message_thread_id: 900`, lalu `store.meta("topic.own.42.900")` `undefined` |
| AC-3 | e2e yang sudah ada, *a topic gets its colour once and carries its state in the name*: `renames` tetap `["editForumTopic:▸ ship it", "editForumTopic:✓ ship it"]` tanpa diubah |
| AC-4 | e2e langkah 1: `h.calls.filter((c) => c.startsWith("editForumTopic:"))` panjangnya 0. Gagal sebelum langkah 4 |
| AC-5 | e2e *sebuah thread yang bukan milik Caraka tidak diarsipkan*, harness `archives: true`: tugas di thread dari pesan selesai, `h.calls` tidak memuat `finishThread:`; pasangannya di test yang sama, thread yang Caraka buat sendiri memuatnya |
| AC-6 | e2e langkah 1, assert kedua: `SELECT state FROM sessions` bernilai `done` walau tidak ada satu pun rename |
| AC-7 | e2e langkah 1, assert ketiga: satu baris `SELECT action, result, details FROM audit WHERE action = 'topic.skip'`, `result` `unowned`, `details` memuat `900` |
| AC-8 | e2e *basis data sebelum rilis ini tidak menyentuh thread mana pun*: satu baris sesi ditulis langsung lewat `store.createSession` dengan `threadId: "555"` tanpa baris `meta`, lalu satu pesan di thread itu; tidak ada `editForumTopic:` |
| AC-9 | e2e *thread yang dibuat Caraka tetap miliknya untuk sesi berikutnya*: pesan pertama membuat topic, `/new` kedua di thread yang sama, dan rename sesi kedua tetap terjadi |
| AC-10 | e2e, test yang sama dengan AC-9: `store.meta` untuk thread itu tetap `1` sesudah pesan kedua |
| AC-11 | e2e langkah 1, assert keempat: `SELECT value FROM meta WHERE key LIKE 'topic.own.%'` mengembalikan hanya `1`, dan tidak satu pun baris memuat judul sesi. Dipasangkan dengan `grep -n "setMeta(Gateway.ownKey" src/core/gateway.ts` yang harus satu baris |
| AC-12 | e2e langkah 1, assert kelima: `h.calls` memuat `sendMessage` yang membawa `message_thread_id: 900`, jadi sesi tetap menjawab di thread itu |

## Risiko

**Sesi yang sudah ada berhenti mendapat glif.** Konsekuensi langsung dari tidak
ada backfill, dan tidak ada jalan jujur untuk menghindarinya: tidak ada baris
audit yang mencatat pembuatan topic, dan Bot API tidak punya method yang
mengembalikan nama sebuah topic, jadi kepemilikan thread lama tidak bisa
dibuktikan dari apa pun yang tersimpan. Arahnya benar — sebuah penjaga yang
salah menebak "milik saya" mengganti nama milik orang lain, dan yang salah
menebak "bukan milik saya" hanya berhenti menulis glif. Yang kedua terlihat, bisa
dilaporkan, dan tidak menghancurkan apa pun.

**Satu baris audit per perpindahan keadaan di thread orang lain.** Sebuah run
melewati `running` lalu `done`, jadi dua baris per tugas. Sebanding dengan
aktivitas, seperti setiap baris audit lain, dan itulah catatan yang menjelaskan
kenapa glif tidak muncul ketika ada yang menanyakannya. Tidak di-dedupe: sebuah
penanda "sudah pernah diaudit" adalah baris `meta` kedua untuk menghemat baris
audit, yang menukar hal yang murah dengan hal yang lebih murah.

**Kunci `meta` tumbuh satu baris per thread yang Caraka buat.** Terikat pada
jumlah topic yang dibuat, sejalan dengan tabel `sessions` itu sendiri, dan
`caraka uninstall` sudah menghapus seluruh basis data.

**Anggaran.** Diperkirakan +12 baris di `src/`: satu static tiga baris, satu
`setMeta`, lima baris penjaga beserta baris auditnya, dan komentar yang menyebut
kenapa posisinya di bawah pemeriksaan glif. `src/` 9.412 → sekitar 9.424, dan
angkanya dicatat di `AGENTS.md` seperti yang sebelumnya. Ini perbaikan bug pada
jalur yang bisa merusak milik orang lain, yang adalah hal yang anggaran ini
memang untuk dibelanjakan.

## Keluaran gerbang

Merah dulu, 13 Agustus 2026, sesudah langkah 1 dan 5 dan sebelum langkah 2:

```
✖ a thread that arrived with the message is never renamed, and the session still runs
  AssertionError: Expected values to be strictly deep-equal:
    actual: [ 'editForumTopic:▸ ship it', 'editForumTopic:✓ ship it' ],
    expected: []
✖ Caraka marks the thread it created, and keeps it for the next session
    actual: undefined, expected: '1'
✖ a thread that is not Caraka's is not archived either
  AssertionError: Expected values to be strictly deep-equal:
    actual: [ 'finishThread:900' ],
    expected: []
```

Dua penggantian nama di baris pertama adalah isi laporan #7 apa adanya.
`finishThread:900` adalah bagian yang tidak disebut laporan itu: di channel yang
bisa mengarsipkan, thread milik orang lain bukan cuma diganti namanya, ia
diarsipkan ketika tugas selesai.

Dua test sempat gagal karena test-nya sendiri salah, dan keduanya diperbaiki
bukan dilonggarkan: `/new` tidak memindahkan keadaan, jadi rename yang diassert
tepat sesudahnya tidak mengassert apa pun, dan pesan kedua di test arsip datang
dari id yang tidak ada di allowlist sehingga ditolak sebelum apa pun terjadi.

Sesudah langkah 2 sampai 4, kelimanya hijau — termasuk test rename yang sudah ada
sebelumnya, yang tidak disentuh:

```
✔ a thread that arrived with the message is never renamed, and the session still runs
✔ Caraka marks the thread it created, and keeps it for the next session
✔ a thread that is not Caraka's is not archived either
✔ a database from before this release treats every thread as not its own
✔ a topic gets its colour once and carries its state in the name
ℹ pass 5 · fail 0
```

Gerbang penuh, `npm run verify`:

```
clean: 269 tracked files, no credentials
ℹ tests 146 · pass 146 · fail 0
ℹ tests 92  · pass 92  · fail 0
```

92 e2e dari 88 sebelumnya, yaitu empat test baru. Test Discord yang mengarsipkan
thread tetap hijau tanpa disentuh, dan itu pembuktian yang tidak diminta tabel di
atas: thread yang Caraka buat sendiri lewat perintah slash tetap dicatat, diganti
namanya, dan diarsipkan seperti sebelumnya.

Biaya baris terukur +26 di `src/`, bukan +12 seperti perkiraan di bagian Risiko.
Selisihnya komentar: sebelas baris yang menjelaskan kenapa kunci kepemilikan ada
di `meta` dan bukan di baris sesi, dan kenapa penjaga itu duduk di bawah
pemeriksaan glif. `src/` 9.412 → 9.438.

### Mesin kedua

`rama-tuf`, disinkron ke direktori tersendiri seperti sebelumnya:

```
host: ra-tuf · Linux 7.0.12-201.fc44.x86_64 · node v24.18.0 · npm 11.16.0
clean: 269 tracked files, no credentials
ℹ tests 146 · pass 146 · fail 0
ℹ tests 92  · pass 92  · fail 0
```

Angkanya sama dengan mesin pertama. `npm run smoke` tidak dihitung sebagai
pembuktian untuk pekerjaan ini dan tidak ditunggu: yang dijalankannya adalah
spawn agent dan satu turn nyata, dan tidak satu baris pun yang diubah di sini
berada di jalur itu. Hasil smoke terakhir yang tercatat ada di
`done/spawn-windows/plan.md`.
