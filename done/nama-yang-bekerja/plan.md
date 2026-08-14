# Plan — nama-yang-bekerja

**Spec:** [`../spec/nama-yang-bekerja.md`](../spec/nama-yang-bekerja.md)

## Yang ditemukan setelah spec ditulis

Spec ini dibuka dengan dua kalimat. Tes yang menuntut AC-4 — tidak ada katalog
yang menulis nama agen sebagai teks tetap — menemukan **sembilan**, dan tiga di
antaranya berada di jalur yang dilewati setiap tugas:

| Kunci | Yang dibacanya |
|---|---|
| `run.working` | `◌ Claude sedang bekerja…` pada tiap tugas |
| `run.noOutput` | `Claude selesai tanpa keluaran teks.` |
| `error.report` | `Claude tidak dapat menyelesaikan tugas. {details}` |
| `permission.header` | `⏸ Claude meminta izin` pada tiap kartu izin |
| `session.created` | `Tulis tugas untuk Claude di sini.` pada tiap sesi baru |
| `help.commands` | `Perintah Claude untuk sesi ini:` |
| `help.commandsEmpty` | `Claude belum mengirim daftar perintah…` |
| `help.unknownCommand` | `…daftar dari Claude.` |
| `channel.empty` | `(Claude tidak mengirim teks.)` |

`error.report` adalah kalimat persis yang ditempel pelapor [issue #9] ke
laporannya. Perbaikan 1.5.3 membuat agennya benar; kalimat yang ia baca tetap
menyebut Claude.

## Langkah

1. **Tes lebih dulu**, memindai kedua katalog untuk nama agen mana pun. Merah
   dengan sembilan.
2. **Enam kalimat menerima `{agent}`** dan diisi di tempat sesi ada di tangan.
3. **Tiga kalimat tidak menyebut siapa pun**, karena namanya memang tidak
   terjangkau di sana: `channel.empty` dikirim oleh tiga channel yang tidak tahu
   agen mana yang menjawab, dan `help.unknownCommand` ada di jalur tanpa sesi.
   Keduanya memakai kata `agent`, mengikuti `usage.none` yang sudah begitu.
4. **Tiga kunci dikecualikan dengan alasannya di tes**: `acp.start` dan
   `acp.notStarted` adalah galat milik adapter ACP Claude sendiri, dan
   `bypassPermissions` adalah nama sebuah mode yang hanya dimiliki Claude Code.
5. **`DEFAULT_AGENT` pindah** dari `cli.ts` ke `core/driver.ts`, karena core
   sekarang harus bisa mengucapkannya: `""` bukan nama yang bisa dibaca orang.
6. **`agentOf(session)`** menjadi satu-satunya pembaca untuk kalimat, supaya
   enam kalimat itu tidak bisa saling menjawab berbeda.

## Yang ikut terhapus

`FINISHED` di `gateway.ts:87`, mati sejak 1.5.2 mencabut penutupan otomatis dan
tertinggal di sana — lint menandainya begitu berkas itu disentuh lagi.

## Yang bisa retak

Empat tes mengunci kalimat lamanya. Ditulis ulang ke kontrak baru, bukan
dihapus: yang menuntut `Claude is working…` sekarang menuntut nama agen yang
dipakai sesi itu.

## Gate

```bash
npm run verify
```

```
clean: 301 tracked files, no credentials
ℹ pass 166   (unit)
ℹ fail 0
ℹ pass 102   (e2e)
ℹ fail 0
```

[issue #9]: https://github.com/CarakaDev/caraka/issues/9
