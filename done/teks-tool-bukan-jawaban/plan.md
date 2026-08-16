# Plan — teks-tool-bukan-jawaban

**Spec:** [`spec.md`](./spec.md)
· **Tanggal:** 16 Agustus 2026 · **Status:** terverifikasi; publish menunggu persetujuan

## Langkah

1. Tambahkan satu e2e yang mengirim teks dari `tool_call_update`, lalu teks
   jawaban agent. Buktikan tes merah karena transkrip tool masuk hasil final.
2. Di `src/core/gateway.ts`, simpan preview progres dan jawaban final dalam dua
   string. Pembaca semua blok mengisi preview; pembaca
   `agent_message_chunk` saja mengisi final.
3. Pertahankan `blocksOf` dan `imagesOf`, lalu jalankan e2e gambar tool yang
   sudah ada bersama tes regresi baru.
4. Jelaskan batas update teks di `docs/api.md`. Ukur perubahan `src/` dan catat
   hasilnya di ledger `AGENTS.md`.
5. Jalankan `npm run verify`. Tempel hasilnya di berkas ini.
6. Naikkan versi ke `1.5.8`, tulis `CHANGELOG.md`, sinkronkan permukaan versi
   yang digerbangi situs, lalu jalankan `npm run verify` lagi.
7. Pindahkan spec dan plan ke `done/teks-tool-bukan-jawaban/`, commit dengan
   trailer CADIS, push, dan cocokkan `HEAD` dengan `origin/main`.
8. Setelah persetujuan pemilik, jalankan `npm publish`, verifikasi registry dan
   tarball, perbarui paket global, mulai ulang proses Caraka, lalu periksa versi,
   proses ACP, dan log startup.

## Risiko

- Memotong semua blok tool dari pembaca bersama akan menghilangkan gambar tool.
  `imagesOf` tetap membaca kedua sumber dan tes yang sudah ada dijalankan.
- Memakai satu string lagi tanpa batas akan menggandakan pertumbuhan memori.
  Kedua string memakai batas 240.000 karakter yang sama dengan buffer sekarang.
- Publish dan restart tidak dapat dibatalkan dengan satu edit. Keduanya menunggu
  persetujuan pemilik setelah commit dan push siap.

## Pemetaan bukti

| AC | Bukti |
|---|---|
| AC-1.1 | e2e: teks tool ada di `edits` |
| AC-1.2 | e2e: teks tool tidak ada di `sendResult` |
| AC-1.3 | e2e: id pesan progres masuk daftar `deleted` sesudah hasil final |
| AC-2.1 | e2e yang sama: jawaban agent ada di preview dan hasil final |
| AC-2.2 | e2e `an image born inside a tool call is delivered too` |
| AC-3.1 | `npm publish`, registry metadata, dan inspeksi tarball |
| AC-3.2 | versi global, PID baru, proses ACP, dan log startup |

## Verifikasi

Tes regresi merah sebelum patch:

```text
tool text stays in the progress draft and out of the final answer
AssertionError: the tool text left with the draft
true !== false
```

Tes terarah sesudah patch:

```text
pass 2 · fail 0
an image born inside a tool call is delivered too
tool text stays in the progress draft and out of the final answer
```

Gate pra-rilis pada `caraka@1.5.7`:

```text
clean: 313 tracked files, no credentials
unit: 171 pass, 0 fail
e2e: 108 pass, 0 fail
site: 35 pass, 0 fail
```

Gate rilis pada `caraka@1.5.8`:

```text
clean: 313 tracked files, no credentials
unit: 171 pass, 0 fail
e2e: 108 pass, 0 fail
site unit: 35 pass, 0 fail
site browser: 140 pass, 2 engine-specific skips
```

Tarball kering npm:

```text
caraka@1.5.8 · 88 entries · 266320 bytes packed
dist/core/gateway.js included
```
