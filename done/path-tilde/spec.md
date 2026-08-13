# Spec — path-tilde: `@~/Project/Coret` sampai ke cabang path

**Status:** selesai · **Tanggal:** 13 Agustus 2026

## Latar

Bentuk path yang mendarat di 1.3.1 hanya menerima path absolut, dan `~/` bukan
salah satunya. Yang menuliskannya mendapat kalimat tentang workspace yang tidak
ada, bukan kalimat tentang path.

`routeTask` (`src/core/gateway.ts:534-540`) memilih cabang dengan `isAbsolute`:

```ts
const chosen = isAbsolute(token)
  ? this.workspaceForPath(message, token, rest)
  : this.workspaceBySlug(token);
```

`isAbsolute("~/Project/Coret")` bernilai `false` — tilde adalah ekspansi shell,
dan sebuah pesan chat tidak pernah melewati shell. Jadi token itu dibaca sebagai
slug, tidak ditemukan, dan jawabannya `ws.unknown`: *"No workspace is called
~/Project/Coret"*. Diukur pada 13 Agustus 2026:

```
"~/Project/Coret"   isAbsolute: false   resolve: <cwd>/~/Project/Coret
```

Bentuk itu bukan bentuk yang jarang. Isu #2 yang meminta fitur ini menuliskan
contohnya persis `@~/Project/dummy`, dan itu cara orang mengetik path rumahnya.
Yang dibangun menerima `@/home/ramaaditya/Project/Coret` dan menolak cara yang
dipakai orang yang memintanya.

## Ruang lingkup

`src/core/gateway.ts` (satu normalisasi token sebelum pemilihan cabang),
`test/e2e.test.ts`, dan `docs/session-model.md` §5 beserta `docs/frd.md`
FR-SESS-02 bila keduanya menyebut bentuk path yang diterima.

## Yang tidak dikerjakan

- **Tidak mengubah siapa yang boleh memakai bentuk path.** Ia tetap hanya
  percakapan pribadi dengan operator channel itu, keputusan yang diambil di
  isu #4 dan dicatat di `docs/adr/0010-workspace-dari-chat.md`. Yang berubah cara
  menuliskannya, bukan siapa yang boleh.
- **Tidak memperluas apa yang terjangkau.** `~/` milik operator adalah path
  absolut yang sudah boleh ditulis panjang hari ini; ini menerjemahkan ejaan,
  bukan membuka direktori baru.
- **Tidak memperluas `~user/`.** Rumah orang lain adalah tebakan tentang tata
  letak mesin, dan yang salah menebak menunjuk direktori orang lain. Ia jatuh ke
  jalur slug seperti sekarang.
- **Tidak mengembangkan variabel lingkungan** seperti `$HOME` atau `${HOME}`.
  Satu bentuk yang dipakai orang sudah cukup, dan mengembangkan variabel dari
  teks chat adalah permukaan yang tidak diminta siapa pun.
- **Tidak menyentuh `caraka trust`, `config.yaml`, atau skema workspace.** Ketiganya
  ditulis dari terminal, tempat shell sudah mengembangkan tilde sebelum Caraka
  melihatnya.

## Acceptance criteria

- **AC-1** WHEN sebuah token workspace diawali `~/`, Caraka shall
  memperlakukannya sebagai path yang berakar di direktori rumah pengguna yang
  menjalankan proses ini.
- **AC-2** WHEN sebuah token workspace berupa `~` tanpa apa pun sesudahnya,
  Caraka shall memperlakukannya sebagai direktori rumah itu sendiri.
- **AC-3** WHEN sebuah token yang diawali `~/` dinilai, Caraka shall memilih
  cabang path dan bukan cabang slug.
- **AC-4** IF sebuah token diawali `~` dan diikuti sesuatu selain `/`, THEN
  Caraka shall memperlakukannya sebagai slug.
- **AC-5** WHILE pesan datang dari ruang atau dari pengirim yang bukan operator,
  WHEN sebuah token diawali `~/`, Caraka shall menolaknya dengan kalimat yang
  sama seperti path absolut ditolak.
- **AC-6** WHEN sebuah path bertilde diterima dan direktorinya ada, slug yang
  ditawarkan kartu shall diambil dari nama direktori terakhirnya.
- **AC-7** IF sebuah path bertilde menunjuk direktori yang tidak ada, THEN
  Caraka shall menjawab dengan path yang sudah dikembangkan, bukan dengan tilde
  apa adanya.
- **AC-8** Caraka shall tidak mengembangkan `~` yang berada di tengah sebuah
  token.
