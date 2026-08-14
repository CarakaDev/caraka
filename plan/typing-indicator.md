# Plan — typing-indicator

**Spec:** `spec/typing-indicator.md` · **Tanggal:** 14 Agustus 2026

Sembilan langkah. Satu sampai lima adalah kodenya, dan urutannya terikat:
kontraknya lebih dulu, lalu satu-satunya pemanggil, lalu tiga adapter yang tidak
saling menyentuh. Enam dan tujuh adalah test, delapan dokumen, sembilan gerbang.

## Langkah

### 1. `src/core/channel.ts` — satu method opsional

Di bawah `resumeThread?` (`:352`), dalam bentuk yang sama dengan
`finishThread?`:

```ts
  /**
   * Tampilkan status kerja di header chat. Opsional dengan cara `finishThread?`
   * opsional: absen berarti diam, dan tidak ada pemanggil yang bercabang.
   * Nilai kembaliannya tidak dibaca core; yang dibaca hanya bahwa method-nya ada.
   */
  typing?(chatId: string, threadId?: string): Promise<unknown>;
```

Tidak ada perubahan pada `ChannelCaps`. Komentar tiga fieldnya sudah menyebut
pembacanya masing-masing, dan menambah field kelima berarti menambah pembaca yang
tidak ada.

### 2. `src/core/gateway.ts` — detak di `runTask`, dan kadensnya sebagai seam

Konstanta di samping `RUN_LIMIT_MS`:

```ts
// 4 detik, karena jendela terpendek di antara channel adalah 5 detik milik
// `sendChatAction`. Angka dan sumbernya di `spec/typing-indicator.md`.
const TYPING_MS = 4_000;
```

Parameter konstruktor terakhir, mengikuti pola `runLimitMs` yang sudah ada
(`:212`) supaya test bisa memendekkannya seperti `runLimitMs: 40`:

```ts
    private readonly typingMs = TYPING_MS,
```

Di `runTask`, tepat sesudah `const progress = await this.sendToSession(…)` yang
mengirim ack `run.working`. Tidak boleh sebelumnya: Telegram menghapus status
saat pesan dari bot tiba, dan Cloud API menghapusnya "once you respond".

```ts
    let beat: NodeJS.Timeout | undefined;
    // Satu panggilan dalam penerbangan pada satu waktu: `call()` di telegram.ts
    // tidak punya timeout request dan menunggu habis sebuah 429, jadi tanpa
    // penjaga ini detak berikutnya menumpuk di belakang yang menggantung.
    let ticking = false;
    const tick = () => {
      if (ticking) return;
      ticking = true;
      void this.channelOf(session.chatId)
        .typing?.(session.chatId, session.threadId)
        // Kegagalan pertama mengakhiri detak. Bot tanpa
        // SEND_MESSAGES_IN_THREADS akan menjawab 403 tiap 4 detik selama run,
        // dan pola itulah yang dihukum batas 10.000 request tidak sah Discord.
        .catch(() => {
          if (beat) clearInterval(beat);
          beat = undefined;
        })
        .finally(() => {
          ticking = false;
        });
    };
    tick();
    beat = setInterval(tick, this.typingMs);
    beat.unref?.();
```

Satu baris di `finally` yang sudah ada, di samping `if (timeout) clearTimeout(timeout)`:

```ts
      if (beat) clearInterval(beat);
```

`finally` menutup keempat jalan keluar `runTask`: selesai normal, `catch` yang
tidak melempar ulang, batas waktu yang lewat `cancelForTime` lalu kembali sebagai
`stopReason === "cancelled"`, dan `/stop` yang sama dengan itu. Dua `return`
awal di dalam `try` juga melewatinya, dan keduanya terjadi sebelum detak berarti
apa pun.

### 3. `src/channels/telegram.ts` — `sendChatAction`

Di samping `sendText` (`:393`), memakai konversi thread id yang sama:

```ts
  typing(chatId: string, threadId = "") {
    return this.call("sendChatAction", {
      chat_id: chatId,
      action: "typing",
      ...(threadId ? { message_thread_id: Number(threadId) } : {}),
    });
  }
```

`call()` mengembalikan `body.result`, dan method ini menjawab `True`, jadi tidak
ada bentuk balasan baru yang perlu ditangani.

### 4. `src/channels/discord.ts` — rute typing

Di samping `sendText` (`:258`):

```ts
  typing(chatId: string, threadId = "") {
    return this.call("POST", `/channels/${threadId || containerOf(this.id, chatId)}/typing`);
  }
```

Body dihilangkan, jadi `call()` tidak mengirim `content-type` dan tidak mengirim
body — yang diminta rute ini. 204 sudah dijawab `undefined` oleh `call()`
(`:246`).

### 5. `src/channels/whatsapp.ts` — satu slot transport, dan id pesan masuk

Slot baru di `WhatsAppTransport` (`:84`), di bawah `edit?`:

```ts
  /** Absen ketika provider tidak punya cara menampilkan status. */
  typing?(messageId: string): Promise<unknown>;
```

Slot itu yang membuat pemisahan provider tidak butuh percabangan: `cloud()`
mengisinya, transport Baileys tidak, dan `typing()` di kelas ini menjawab
`undefined` untuk Baileys dengan pemeriksaan yang sama persis dengan `editText`.

Peta id pesan masuk terakhir per pengirim, di samping `lastEdit` (`:181`):

```ts
  // `typing_indicator` menumpang read receipt, jadi ia butuh id pesan masuk. Ia
  // berhenti di sini dengan alasan yang sama dengan `fetchAttachment`: tidak ada
  // pengenal pesan milik channel yang menyeberang ke core.
  private readonly lastInbound = new Map<string, string>();
```

Dua baris di `receive()`, sesudah pemeriksaan tipe dan sebelum event masuk
`inbox`:

```ts
    evict(this.lastInbound, REMEMBERED);
    this.lastInbound.set(from, id);
```

`evict` belum diimpor di berkas ini dan `REMEMBERED` belum ada di sini; keduanya
sudah berpasangan di `discord.ts:54` dan `whatsapp-baileys.ts:33` dengan nilai
500, jadi yang ditambahkan adalah satu nama di daftar impor `../core/channel.js`
dan satu konstanta dengan nilai yang sama. Entri dihapus saat dipakai, jadi
plafon itu hanya menjaga pengirim yang menulis lalu tidak pernah menjalankan run.

Method-nya:

```ts
  // Satu panggilan per pesan masuk. Jendelanya 25 detik dan apakah mengirim
  // ulang id yang sama memperbaruinya tidak berdokumen, jadi id-nya dipakai
  // sekali lalu dilepas dan detak berikutnya berhenti di sini tanpa biaya.
  // Tidak lewat `emit()`: ini read receipt, bukan pesan, dan plafon 12 per 60
  // detik ada untuk pesan sungguhan di jalur yang punya risiko ban.
  async typing(chatId: string) {
    const send = this.wire().typing;
    if (!send) return undefined;
    const to = containerOf(this.id, chatId);
    const id = this.lastInbound.get(to);
    if (!id) return undefined;
    this.lastInbound.delete(to);
    return send(id);
  }
```

Dan di `cloud()` (`:465`), di samping `sendFile`:

```ts
      typing: (messageId) =>
        this.graph(`/${phone}/messages`, {
          messaging_product: "whatsapp",
          status: "read",
          message_id: messageId,
          typing_indicator: { type: "text" },
        }),
```

`post()` tidak dipakai karena ia membaca `messages[0].id` dari balasan, dan
balasan panggilan ini `{"success": true}`.

### 6. `test/unit.test.ts`

Empat adapter-level, semuanya dengan fetcher stub yang sudah jadi pola di berkas
ini:

- Telegram dengan `threadId` "7001" → satu panggilan `sendChatAction`,
  `chat_id` benar, `action` `"typing"`, `message_thread_id` bernilai number 7001.
  Satu assertion kedua di test yang sama menolak sembilan nilai `action` lain
  dengan membandingkan terhadap literal.
- Discord dengan `threadId` → path `/channels/7001/typing`, `init.body`
  `undefined`, dan `headers` tanpa `content-type`.
- WhatsApp `cloud-api`: `receive("62…", "wamid.X", "halo")` lalu dua kali
  `typing()` → satu panggilan `graph` dengan body persis AC-6.1, panggilan kedua
  nol. Seam `sleep` yang direkam tidak dipanggil sama sekali, dan panjang
  antrean outbound tidak berubah (AC-6.4).
- WhatsApp `baileys`: `typing()` menjawab `undefined` dan transport tidak
  menerima panggilan apa pun. Ditambah pembacaan setiap `.ts` di bawah `src/`
  yang gagal bila `sendPresenceUpdate` muncul, dengan cara yang sama dengan test
  `deleteForumTopic` yang sudah ada.

Satu test sumber untuk AC-2.3: baca `src/core/gateway.ts` dan gagal bila
`/await[^;\n]*\.typing/` cocok.

### 7. `test/e2e.test.ts`

Harness (`:423`) mendapat dua hal. Pertama, opsi `typing` yang menyisipkan
method-nya dengan pola `...(options.archives ? {…} : {})` yang sudah dipakai
`finishThread`, sehingga channel palsu tanpa opsi itu membuktikan AC-3. Kedua,
pencatatan ke `calls` yang sudah ada, supaya urutan terhadap `sendText` terbaca
di satu daftar:

```ts
    ...(options.typing
      ? {
          typing: async (_chatId: string, threadId: string) => {
            calls.push(`typing:${threadId}`);
            return options.typing === "hangs"
              ? new Promise(() => {})
              : options.typing === "fails"
                ? Promise.reject(new Error("403"))
                : true;
          },
        }
      : {}),
```

`typingMs` masuk ke daftar opsi harness dan diteruskan ke `new Gateway(…)`
(`:463`) seperti `runLimitMs`.

Test-nya:

1. Run normal dengan `typing: true`, `typingMs: 10`, driver yang menahan ~120 md
   → `calls` memuat `typing:7001` sesudah ack dan sebelum `sendResult`,
   jumlahnya antara 2 dan 13 (AC-1.1, AC-1.2, AC-1.4).
2. Run yang sama, lalu penantian 60 md sesudah `runTask` selesai → jumlah
   `typing:` tidak bertambah (AC-1.3). Diulang untuk run yang gagal dan untuk
   `/stop`.
3. `typing: "fails"` → `h.sent` dan `h.calls` tanpa entri typing sama dengan
   baseline `typing: true` yang dipotong entri typing-nya, dan run tetap
   `done` (AC-2.1).
4. `typing: "hangs"`, run ~120 md dengan `typingMs: 10` → run selesai `done`,
   dan `calls` memuat tepat satu `typing:` (AC-2.2).
5. Tanpa opsi `typing` → `h.sent`, `h.calls`, dan tabel `audit` identik dengan
   run yang sama sebelum langkah 2 (AC-3.1, AC-3.2).

### 8. Dokumen

`docs/api.md` §5 kehilangan `typing` dari daftar rencana dan mendapat kalimat
kenapa ia method opsional. `docs/design.md` baris 307 menjadi empat kemampuan.
`docs/frd.md` FR-CHAN-08 mendapat kalimat tanggal dan penyebutan Baileys.
`docs/whatsapp-risiko.md` baris 113 menjadi "satu ack ditambah 25 detik status
mengetik" tanpa mengubah klausa `caps.edit` di depannya. `docs/ui-ux.md` §5
mendapat baris "Indikator kerja". `site/CLAUDE.md` dan `site/AGENTS.md` baris
132 kehilangan "a typing indicator" dari daftar. `AGENTS.md` mendapat baris
ledger dengan angka terukur. `CHANGELOG.md` mengikuti bentuk rilis yang berlaku.

### 9. Gerbang

`npm run verify` dari akar, keluarannya ditempel di bawah, lalu `git mv` kedua
berkas ke `done/typing-indicator/`.

## Pemetaan AC → pembuktian

| AC | Pembuktian |
|---|---|
| AC-1.1 | e2e langkah 7.1: `typingMs: 10`, run ~120 md, jumlah entri `typing:` di `h.calls` tidak melebihi 13 |
| AC-1.2 | e2e langkah 7.1: indeks `sendText:▸ …working` lebih kecil dari indeks `typing:` pertama di daftar `calls` yang sama |
| AC-1.3 | e2e langkah 7.2 ×3 (selesai, gagal, `/stop`): jumlah `typing:` dibaca sesudah `runTask` kembali, lalu dibaca lagi sesudah 60 md, dan kedua angkanya sama |
| AC-1.4 | e2e langkah 7.1: entri yang tercatat adalah `typing:7001`, id thread sesi, bukan string kosong |
| AC-2.1 | e2e langkah 7.3: dua daftar `calls` dibandingkan sesudah entri `typing:` dibuang, dan `sessions.state` bernilai `done` |
| AC-2.2 | e2e langkah 7.4: promise menggantung, run kembali `done`, tepat satu entri `typing:` meski sekitar dua belas detak lewat |
| AC-2.3 | unit: `src/core/gateway.ts` dibaca dan `/await[^;\n]*\.typing/` tidak cocok |
| AC-3.1 | e2e langkah 7.5: `h.sent` dan `h.calls` identik dengan run yang sama tanpa opsi `typing` |
| AC-3.2 | e2e langkah 7.5: tabel `audit` tidak memuat action apa pun yang memuat `typing`, dan `readiness()` kedua adapter dibaca tanpa kata itu |
| AC-4.1 | unit Telegram dengan fetcher stub: `params.message_thread_id` bertipe number bernilai 7001 |
| AC-4.2 | unit yang sama: `params.action === "typing"`, dan pembandingan terhadap sembilan nilai lain gagal |
| AC-5.1 | unit Discord dengan fetcher stub: URL berakhir `/channels/7001/typing`, bukan id channel induk |
| AC-5.2 | unit yang sama: argumen kedua `fetcher` tanpa `body`, dan `headers` tanpa `content-type` |
| AC-6.1 | unit WhatsApp `cloud-api`: body `graph` sama persis dengan empat field di AC-6.1, dan `message_id` berasal dari `receive` |
| AC-6.2 | unit yang sama: dua panggilan `typing()`, satu `graph` |
| AC-6.3 | unit WhatsApp `baileys`: `typing()` menjawab `undefined` dan transport palsu tidak dipanggil; ditambah pembacaan setiap `.ts` di bawah `src/` yang gagal pada nama `sendPresenceUpdate` |
| AC-6.4 | unit `cloud-api` dengan seam `sleep` yang direkam: nol pemanggilan `sleep` pada jalur typing, dan `sendText` sesudahnya tetap membayar jeda acaknya |
| AC-7.1 | baca `docs/api.md` §5: `typing` hilang dari daftar rencana, ada kalimat method opsional |
| AC-7.2 | `grep -n "tetap rencana" docs/design.md` menyebut empat nama |
| AC-7.3 | `grep -rn "typing indicator" site/CLAUDE.md site/AGENTS.md` nol hasil |
| AC-7.4 | baca `docs/frd.md` FR-CHAN-08: tanggal, dan Baileys disebut sebagai yang tidak mendapatkannya |
| AC-7.5 | baca `docs/whatsapp-risiko.md`: kalimat 25 detik ada, klausa `caps.edit` tetap |
| AC-7.6 | baca tabel `docs/ui-ux.md` §5: baris "Indikator kerja" terisi tiga kolom |
| AC-7.7 | baca ledger `AGENTS.md`: angka terukur, selisih terhadap rentang di bawah, pagu ~8.000 tidak bergeser |

## Biaya

**Baseline.** `src/` berukuran **10.011 baris** di `b2fe39f`, diukur dengan

```bash
for f in $(git ls-files src); do git show HEAD:$f; done | wc -l
```

Angka itu 40 di atas 9.971 yang ledger `AGENTS.md` catat untuk `grup-nyaman`,
karena 1.5.1 mendarat sesudah baris itu ditulis. Pekerjaan lain sedang berjalan
di pohon yang sama (`close-bukan-otomatis`, sudah di-stage, +32 baris bersih di
`src/`), jadi angka awal diukur ulang saat langkah 1 dimulai dan bukan disalin
dari sini.

**Perkiraan: 70–150 baris di `src/`, ditambah 60–110 di `test/`.** Rentang,
bukan satu angka, karena ledger menunjukkan lima perkiraan berupa satu angka
meleset dengan faktor 1,8 sampai 2,6 dan satu rentang lebar bertahan.

Yang bisa dihitung sekarang: `channel.ts` 8, `gateway.ts` 16 termasuk konstanta
dan parameter, `telegram.ts` 8, `discord.ts` 5, `whatsapp.ts` 18. Jumlahnya 55,
dan itu batas bawah yang tidak realistis. Yang membuat ledger meleset berulang
kali adalah harga seam dan harga komentar, dan di sini keduanya bisa disebut
sebelum ditulis. Seam-nya murah: satu parameter konstruktor dengan bentuk yang
sudah ada di `runLimitMs`, dan `sleep`, `now`, serta `random` di `whatsapp.ts`
sudah menjadi seam. Komentarnya tidak murah: empat perilaku yang tidak
berdokumen harus dicatat di tempat masing-masing menggigit — ack yang harus
mendahului detak, edit yang mungkin menghapus status, id Cloud API yang dipakai
sekali, dan penolakan Baileys beserta cara membuka penolakan itu. Itu yang
membawa 55 ke sekitar 100, dan rentangnya dibuat lebar ke dua arah dari sana.

Tidak ada penghapusan yang membayarnya, dan tidak ada yang dijanjikan.
`pangkas-berulang` sudah mengukur lima kandidat yang empat spec sebelumnya terus
tawarkan dan hasilnya −35 baris, bukan +400. Pagu tetap ~8.000, dan pekerjaan
ini menaikkan utang menjadi sekitar 2.100.

## Risiko

**Yang paling mungkin salah adalah anggapan bahwa status dan teks yang tumbuh
bisa tampil bersamaan di Telegram.** Dokumennya hanya menyatakan status hilang
saat pesan dari bot tiba, dan tidak menyatakan apa pengaruh sebuah
`editMessageText`. Kalau edit ikut menghapusnya, run yang cerewet hampir tidak
pernah menampilkan status. Pemeriksaannya bukan test otomatis: satu bot
sungguhan, satu topic, satu run yang mengeluarkan teks terus-menerus, dan
pengamatan header selama sekitar satu menit. Hasilnya ditulis di
`docs/telegram-integration.md` apa adanya, termasuk bila hasilnya mengecewakan.
Yang tidak dilakukan sebagai jawaban adalah mempercepat detak, karena bagian
Biaya di spec sudah menunjukkan sisi lain dari angka itu.

**Detak yang tertahan 429 memegang sebuah fetch di luar umur run.** `call()` di
`telegram.ts` tidak punya timeout request dan mengulang selamanya sambil
menunggu `retry_after`. Penjaga `ticking` menjaga agar detak tidak menumpuk, dan
`clearInterval` di `finally` menghentikan detak berikutnya, tetapi panggilan yang
sedang menggantung tetap hidup sampai selesai. `beat.unref()` tidak menutup itu:
yang di-unref adalah timer, bukan socket. Konsekuensinya sempit — penutupan
`caraka start` bisa menunggu selama `retry_after` — dan `retry_after` Telegram
untuk flood control berukuran detik, jadi ini tidak dibayar dengan signal baru
sampai ada pengukuran yang menunjukkan sebaliknya. Kalau pengukuran itu datang,
jalannya sudah ada: `call()` menerima `AbortSignal` opsional dan `runTask` bisa
meneruskan signal run.

**Pohon kerja sedang dipakai pekerjaan lain.** `close-bukan-otomatis` menyentuh
`src/core/gateway.ts`, `src/core/channel.ts`, dan `src/i18n.ts`. Nomor baris di
plan ini menunjuk `b2fe39f`, jadi setiap anchor dibaca ulang sebelum disunting,
dan `runTask` dibaca utuh sekali lagi sebelum blok detak ditempel.

**Baileys bisa berbalik menjadi satu baris.** Kalau verifikasi `Baileys#866`
menunjukkan `composing` bekerja tanpa `presenceSubscribe` dan tanpa `available`,
yang dibutuhkan hanya satu slot `typing` di transport Baileys ditambah jitter.
Yang tidak boleh terjadi adalah menambahkannya tanpa verifikasi itu, karena
harga kesalahannya adalah push notification yang mati di ponsel pemilik nomor.

## Keluaran gerbang

Ditempel di sini sesudah `npm run verify` hijau, sebelum kedua berkas pindah ke
`done/typing-indicator/`. Klaim tanpa keluaran perintah tidak dihitung.
