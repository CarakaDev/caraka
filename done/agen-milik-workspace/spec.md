# Spec — agen-milik-workspace: sesi tanpa agen mengambil agen workspace-nya

**Status:** selesai · **Tanggal:** 14 Agustus 2026

## Latar

Dilaporkan dari luar sebagai [issue #9] oleh pemasangan yang naik dari 1.3.2 ke
1.5.1. Workspace-nya menyebut agennya sendiri:

```yaml
workspaces:
  - slug: ariekoprasethio
    path: /home/ariekoprasethio
    driver: cli
    agent: codex
```

`caraka doctor` menjawab `✓ Agent codex codex-cli 0.147.0: ready`. Layanannya
tetap menyalakan Claude, mencetak `Caraka is live: telegram → Claude`, dan
tugas pertama dari Telegram gagal dengan `Authentication required` karena Claude
memang tidak pernah dipasang di mesin itu.

Satu sebab, terlihat di tiga tempat. Id agen kosong diselesaikan terhadap
`DEFAULT_AGENT` — `"claude-code"` — tanpa satu pun dari ketiganya menanyai
workspace yang menjadi milik run itu:

1. `gateway.ts:364`, pemanasan saat start: `this.driver("", this.home.driver)`
   menyalakan agen bawaan produk pada rute home workspace. Inilah yang membuat
   Claude hidup pada mesin yang tidak memilikinya, sebelum ada pesan masuk.
2. `gateway.ts:1334`, pemilihan driver tiap run: `this.driver(session.agent, …)`.
   Sesi yang dibuat sebelum workspace itu menyebut agennya menyimpan `agent: ""`,
   dan `""` jatuh ke Claude walau workspace-nya menyebut codex. Sesi baru tidak
   kena — `createSession` menyalin `workspace.agent` — jadi yang terkena persis
   pemasangan yang sudah berjalan lebih dulu, seperti pelapornya.
3. `i18n.ts:278` dan `:603`: `cli.running` menuliskan kata `Claude` sebagai teks
   tetap di kedua katalog. Baris itu tidak pernah menyebut agen yang benar-benar
   dipilih, jadi setelah pelapornya menambal `DEFAULT_AGENT` di `dist/` pun
   banner-nya masih berbunyi `→ Claude`.

Tambalan lokal yang dipakai pelapornya — mengganti `DEFAULT_AGENT` menjadi
`"codex"` di `dist/cli.js` — hilang pada pembaruan npm berikutnya, dan ia sendiri
menulis bahwa itu bukan perbaikan hulu karena pemasangan lain memilih agen lain.

## Ruang lingkup

`src/core/gateway.ts`, `src/cli.ts`, `src/i18n.ts` (dua katalog),
`test/e2e.test.ts`, `docs/session-model.md`, dan `CHANGELOG.md`.

## Yang tidak dikerjakan

- **Tidak ada kunci `defaultAgent` baru di config.** Pelapornya menyebutnya
  sebagai kemungkinan ketiga dari empat. Workspace sudah punya `agent`, dan
  workspace tunggal adalah bentuk yang dipakai hampir semua pemasangan — kunci
  global kedua hanya menambah tempat yang bisa saling bertentangan. `agent:` di
  workspace tunggal sudah persis kunci global itu.
- **Baris sesi lama tidak ditulis ulang saat pembaruan.** Migrasi menyentuh
  data orang untuk memperbaiki pembacaan; membaca dengan benar tidak menyentuh
  apa pun, dan tetap benar kalau `agent:` workspace-nya diubah lagi besok.
- **`DEFAULT_AGENT` tidak dicabut.** Ia tetap jaring terakhir untuk pemasangan
  yang tidak menyebut agen di mana pun, dan itu memang mayoritasnya.
- **Adapter warisan `agent.adapter` tidak dijadikan sumber pemilihan.**
  `claude-agent-acp` di sana adalah nilai bawaan yang ditulis generator, bukan
  pilihan yang pernah dibuat seseorang, dan membacanya akan mengunci pelapor ke
  Claude lewat pintu kedua.

## Acceptance criteria

- **AC-1** IF sebuah sesi tidak menyimpan id agen, THEN Caraka shall memakai
  `agent` milik workspace sesi itu.
- **AC-2** IF sesi itu maupun workspace-nya tidak menyebut agen, THEN Caraka
  shall memakai agen bawaan produk.
- **AC-3** WHERE sebuah sesi menyimpan id agen, id itu shall menang atas `agent`
  milik workspace.
- **AC-4** WHEN Caraka menyalakan driver pemanasan saat start, ia shall memakai
  `agent` milik workspace pertama, bukan agen bawaan produk.
- **AC-5** WHEN Caraka mencetak baris hidupnya, baris itu shall menyebut agen
  yang benar-benar dipilih untuk workspace pertama.
- **AC-6** WHERE lebih dari satu workspace menyebut agen berbeda, tiap run shall
  memakai agen milik workspace-nya sendiri.

[issue #9]: https://github.com/CarakaDev/caraka/issues/9
