# Spec — codex-sandbox-ikut-mode: sandbox Codex mengikuti mode percakapan

**Status:** selesai · **Tanggal:** 10 Oktober 2026

## Latar

Dilaporkan dari luar sebagai [issue #16] oleh pemasangan Caraka 1.5.10. Sebuah
topik Telegram diset `assisted` di `telegram.modes`, dan Caraka meloloskannya di
gerbang kebijakan. Preset codex tetap menjalankan `codex exec --sandbox
read-only` dan melanjutkan dengan `-c sandbox_mode="read-only"`, jadi Codex tidak
pernah bisa menulis, apa pun mode percakapannya.

Dua sebab, satu laporan:

1. `presets/agents/codex.yaml` menulis kata sandbox tetap, `read-only`, di
   `args` dan di `resumeArgs`. Mode percakapan dibaca gateway sekali per pesan,
   tetapi tidak pernah sampai ke driver CLI, jadi tidak ada yang bisa
   mengubahnya.
2. `driver: acp` pada workspace codex gagal saat start dengan "Agent codex: the
   ACP command `acp` was not found". Preset codex tidak punya blok `acp:`, dan
   pesan itu mencetak kata cadangan `acp` seolah-olah itu nama perintah.

## Keputusan pemilik

Percakapan `assisted` dan `trusted` boleh membuat Codex menulis di dalam
workspace. Ini berlaku juga untuk DM, karena DM bawaannya `assisted`
(`resolvePolicyMode`). Ruang yang tidak disebut di peta `modes` tetap
`read-only`.

Di rute CLI tidak ada seam permission, jadi percakapan `assisted` menulis tanpa
kartu approval. Sandbox Codex sendiri yang menjadi rem di luar workspace.
`docs/security.md` §5 dan §7 mengatakan ini terang-terangan.

## Ruang lingkup

`presets/agents/codex.yaml`, `src/drivers/preset.ts`, `src/drivers/cli.ts`,
`src/core/driver.ts`, titik panggil `driver.prompt` di `src/core/gateway.ts`,
`src/cli.ts`, `src/i18n.ts`, `test/unit.test.ts`, `docs/security.md`,
`docs/design.md`, `CHANGELOG.md`, dan `AGENTS.md`.

## Yang tidak dikerjakan

- **Gerbang penolakan `read-only` di gateway tidak berubah.** Rute CLI tidak
  punya seam permission, dan run `read-only` di sana tetap ditolak. Entri
  `read-only` di peta sandbox hanya menjaga agar preset yang sama tetap lengkap.
- **Tidak ada perubahan untuk preset selain codex.** Field `sandbox` opsional,
  dan preset lain tidak menyentuhnya.
- **Tidak ada blok `acp:` untuk codex.** Codex tidak punya adapter ACP yang
  terverifikasi di sini, dan blok yang dikarang akan menggeser pesan galat
  tanpa memperbaiki apa pun.
- **Tidak ada harness untuk `caraka start`.** Test unit yang ada tidak
  menjalankan `start()`; pemeriksaan di sana dibuktikan lewat `buildDriver`, yang
  menjaga kalimat yang sama, dan lewat membaca urutannya (lihat plan).

## Acceptance criteria

- **AC-1** WHEN percakapan berada di mode `assisted`, Caraka shall menjalankan
  giliran pertama Codex dengan sandbox `workspace-write`.
- **AC-2** WHEN percakapan berada di mode `assisted`, Caraka shall melanjutkan
  sesi Codex dengan `sandbox_mode="workspace-write"`.
- **AC-3** WHEN percakapan berada di mode `trusted`, Caraka shall menjalankan
  Codex dengan sandbox `workspace-write`.
- **AC-4** WHEN percakapan berada di mode `read-only`, peta sandbox preset codex
  shall memberi kata `read-only`, pada giliran pertama dan pada resume.
- **AC-5** WHERE sebuah ruang tidak disebut di peta `modes`, Caraka shall
  memperlakukannya sebagai `read-only` (perilaku yang sudah ada, tidak berubah).
- **AC-6** IF sebuah preset menulis `{sandbox}` di `args` atau `resumeArgs` tanpa
  peta `sandbox` yang memuat ketiga mode, THEN pemuatan preset shall gagal dan
  menyebut field `sandbox`.
- **AC-7** IF preset punya `{sandbox}` tetapi tidak ada kata untuk mode yang
  berjalan, THEN driver CLI shall melempar galat dan tidak menjalankan agent.
- **AC-8** IF `workspace.driver` bernilai `acp` untuk agen yang presetnya tidak
  punya blok `acp`, THEN `caraka start` shall berhenti dengan kode keluar 78
  sebelum file pid ditulis dan sebelum channel mana pun menyala, dengan pesan
  yang menyebut agen itu dan kedua perbaikannya: hapus `driver: acp`, atau setel
  `driver: cli`.
- **AC-9** IF `buildDriver` dipaksa ke `acp` untuk preset tanpa blok `acp`, THEN
  ia shall melempar pesan "has no ACP route" dan shall tidak mencetak "was not
  found".
- **AC-10** WHERE blok `acp` ada tetapi perintahnya tidak ditemukan, pesan
  `driver.acpMissing` yang sudah ada shall tetap dipakai.

[issue #16]: https://github.com/CarakaDev/caraka/issues/16
