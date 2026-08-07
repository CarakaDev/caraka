# Plan — keadaan sesi pada nama topic

## Keputusan yang menentukan bentuk diff

**Semua perubahan keadaan lewat satu pintu.** `markTopic` yang lama hanya
dipanggil di akhir run, sementara `store.setState` dipanggil di lima tempat.
Menambah pemanggilan `editTopic` di kelima tempat itu berarti lima kesempatan
untuk lupa. Gantinya satu method `Gateway.setState()` yang menulis ke store lalu
mengganti nama topic, dan kelima pemanggil dialihkan ke sana — nama topic tidak
lagi bisa berbeda pendapat dengan baris di baliknya.

**Satu pemanggilan tidak di-`await`.** Di `askPermission`, `finish()` sedang
menyelesaikan promise permission milik ACP. Rename hanyalah kosmetik, jadi ia
dilepas dengan `void` supaya `editForumTopic` yang lambat tidak menunda jawaban
ke agen. Empat pemanggil lain menunggu seperti biasa.

**`icon_color` sebagai parameter default di `Telegram.createTopic`.** Gateway
tidak perlu tahu angkanya; nilai `7322096` (biru, dari enam nilai yang
didokumentasikan Bot API) hidup di lapisan channel yang bicara ke Telegram.

## Perubahan

| Berkas | Perubahan |
|---|---|
| `src/core/gateway.ts` | `markTopic` menjadi `setState()` dengan peta `GLYPH`; lima pemanggil `store.setState` dialihkan |
| `src/channels/telegram.ts` | `createTopic` mengirim `icon_color` sekali saat pembuatan |
| `test/e2e.test.ts` | harness mendapat opsi `topics` dan `editTopicFails`; stub `createTopic` bisa berhasil; dua tes baru |

## Pemetaan AC ke pembuktian

- **AC-1** — e2e "a topic gets its colour once and carries its state in the
  name": rename tercatat berurutan `▸ ship it` lalu `✓ ship it`.
- **AC-2** — tes yang sama, bagian kedua: `Telegram.createTopic` dengan fetcher
  palsu, body `createForumTopic` memuat `icon_color: 7322096`. Diperiksa di
  kabel karena stub harness tidak melewati badan request.
- **AC-3** — e2e yang sudah ada: "a session that finishes is marked…" dan tes
  time-limit menulis keadaan tanpa satu pun pemanggilan `editForumTopic`.
- **AC-4** — e2e "a rename Telegram refuses changes neither the run nor the
  row": `editTopic` melempar, prompt tetap sampai, baris berakhir `done`.

Dua assertion lama `h.calls.includes("createForumTopic")` sempat menjadi
hampa saat stub merekam `createForumTopic:${iconColor}` — pencocokan persis
tidak akan pernah benar lagi, jadi keduanya lolos tanpa membuktikan apa pun.
Stub kembali merekam nama method saja dan assertion itu bisa gagal lagi.

## Yang tidak dikerjakan

Membedakan warna per keadaan atau memakai `icon_custom_emoji_id`; alasannya di
spec. Menyentuh mode linear juga tidak — header `[workspace · #id]` tetap
menjadi penanda sesi di sana.

## Verifikasi

```
npm run lint       All matched files use the correct format.
                   Finished in 70ms on 15 files using 24 threads.
npm run typecheck  (tanpa keluaran)
npm test           tests 26, pass 26, fail 0
npm run e2e        tests 17, pass 17, fail 0
```

Di antara 17 tes e2e itu dua yang baru:

```
✔ a topic gets its colour once and carries its state in the name (200.871665ms)
✔ a rename Telegram refuses changes neither the run nor the row (189.145562ms)
```
