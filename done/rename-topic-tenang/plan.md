# Plan — rename-topic-tenang

**Slug:** rename-topic-tenang · **Tanggal:** 15 Agustus 2026 · **Status:** selesai

## Langkah

1. `Gateway.nameKey(chatId, threadId)` → `topic.name.<chat>.<thread>`, sebelah
   `Gateway.ownKey`. Tanpa kolom baru: satu string tidak membayar sebuah migrasi.
2. Di `setState`, **di bawah** penulisan state dan di bawah pemeriksaan glif dan
   kepemilikan: render namanya, bandingkan dengan `store.meta(nameKey)`,
   kembalikan kalau sama. (AC-1, AC-3, AC-4)
3. Panggilan rename menjadi `.then(() => true).catch(() => false)`, dan
   `setMeta` hanya jalan kalau benar. (AC-2)
4. `RETRY_BUDGET_SECONDS = 60` di `src/core/channel.ts`, akumulator `waited` di
   `fetchWithRetry`, hapus `Math.min(seconds, 60)`, lempar `request.fail` di atas
   anggaran. (AC-5, AC-6)
5. Betulkan tiga kalimat di `docs/session-model.md` yang perubahan ini membuat
   salah atau yang sudah salah sejak 1.5.2.

## Verifikasi

```
npm run verify   → 171 unit, 104 e2e, 35 unit situs, semuanya hijau
```

Test negatif dijalankan: dengan baris guard dinonaktifkan, `a name the topic
already carries is not written again` **gagal** (`ℹ fail 1`); dengan guard
terpasang ia lulus. Test anggaran dijalankan terhadap `fetchWithRetry` langsung
dengan `sleep` disuntik, jadi ia memakukan tunggu 45 detik dalam 0,45 md.

## Yang berubah dari rencana

Rancangan pertama menaruh `if (state sama) return` di puncak `setState`. Itu
salah dan ditangkap sebelum ditulis: `store.setState` menaikkan `updated_at`,
dan pencarian route mengurutkan kolom itu, jadi guard di puncak akan mengubah
sesi mana yang dijawab sebuah pesan berikutnya. Guard-nya turun ke bawah
penulisan state dan dikunci pada nama, bukan state.
