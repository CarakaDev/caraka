# Plan — agen-milik-workspace

**Spec:** [`../spec/agen-milik-workspace.md`](../spec/agen-milik-workspace.md)

## Bentuk perbaikannya

Urutan yang dipakai ditulis satu kali, sebagai satu metode di gateway:

```ts
private agentFor(workspace: Workspace, session?: Session) {
  return session?.agent || workspace.agent || "";
}
```

`""` yang keluar dari sana tetap berarti "bawaan produk" bagi `driverFor`, jadi
`DEFAULT_AGENT` tidak berpindah dan tidak dicabut — yang berubah hanyalah bahwa
workspace ditanya lebih dulu. Dua pemanggil membacanya, dan pemanggil ketiga yang
ditulis nanti tidak bisa salah tanpa melewatinya.

## Langkah

1. **Tes merah dulu.** Satu giliran penuh: sesi disemai dengan `agent: ""` di
   workspace yang menyebut `agent: "codex"`, lalu diamati id apa yang sampai ke
   `driverFor`. Merah hari ini berbunyi `claude-code`.
2. **`agentFor`** di `src/core/gateway.ts`, dan dua pemanggilnya:
   `this.driver(this.agentFor(this.home), this.home.driver)` pada pemanasan, dan
   `this.driver(this.agentFor(workspace, session), workspace.driver)` pada run.
3. **Banner.** `cli.running` kehilangan kata `Claude` di kedua katalog dan
   menerima `{agent}`. `src/cli.ts` mengisinya dengan
   `workspace.agent || DEFAULT_AGENT` — id preset, kata yang sama yang dicetak
   `caraka doctor`, bukan nama dagang yang tidak bisa ditelusuri ke config.
4. **Tes untuk AC-4, AC-5, AC-6**, yang terakhir dengan dua workspace yang
   menyebut agen berbeda dalam satu proses.
5. **`docs/session-model.md` §5** menuliskan urutannya — `docs/agents.md` yang disebut rencana ini semula tidak ada, dan urutan ini milik model sesi, karena selama ini tidak ada dokumen
   yang menyebut apa yang terjadi kalau sesi tidak menyimpan agen.

## Yang bisa retak

- **Pemanasan saat start** kini menyalakan agen milik workspace. Pada pemasangan
  yang menyebut agen yang belum terpasang, kegagalan itu muncul saat start dan
  bukan pada tugas pertama — yang memang maksud baris itu sejak ditulis, tetapi
  sekarang ia menyalakan biner yang lain, jadi pesan gagalnya berubah pada
  pemasangan yang salah menulis `agent:`. Itu perbaikan, bukan regresi, dan
  disebut di CHANGELOG karena orang akan melihat pesan yang berbeda.
- **`{agent}` di banner** mengubah baris yang mungkin dibaca skrip orang.
  Formatnya tetap `Caraka is live: {channels} → {agent} ({workspace})`.

## Gate

```bash
npm run verify
```

```
clean: 296 tracked files, no credentials
ℹ pass 165   (unit)
ℹ fail 0
ℹ pass 102   (e2e)
ℹ fail 0
```
