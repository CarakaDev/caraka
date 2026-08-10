# Spec — adapter Titen terhadap Titen hidup

**Slug:** titen-hidup · **Tanggal:** 10 Agustus 2026
**Induk:** `done/memori-v03/spec.md` · **Roadmap:** `docs/roadmap.md` Fase 0 (kotak Titen), Fase 7 (cakupan agent)

## Latar

`src/memory/titen.ts` mendarat di v0.3 dan tidak pernah bicara dengan Titen.
Rutenya dibaca dari `docs/design.md` §13, testnya memakai mock yang menyepakati
bentuk yang sama, dan `CHANGELOG.md:59` mencatat alasannya dengan jujur: tidak
ada Titen di mesin ini. Sejak 10 Agustus 2026 ada satu — Titen 0.7.3 di
`127.0.0.1:8787` pada host pengembangan — dan setiap field yang dikirim adapter
ternyata ditolak. Spec ini menutup jarak antara apa yang ditulis repositori ini
tentang Titen dan apa yang dijawab Titen.

Pemicu langsungnya adalah temuan sampingan di
`done/mcp-titen-passthrough/spec.md`, yang mengukur `401` tanpa kredensial dan
`400` dengan kredensial, lalu menyerahkan berkasnya ke pemilik.

## Ruang lingkup

Adapter, konfigurasi, baris doctor, kunci API, dan setiap dokumen yang menyebut
port atau jalur health Titen. Ditambah verifikasi preset yang bisa dijalankan
di mesin yang sama.

## Yang tidak dikerjakan

- **Konsolidasi.** `POST /v1/consolidations` menuntut `claims[].statement`
  beserta `sources[].relation`, dan memutuskan claim apa yang lahir dari sebuah
  transcript adalah pekerjaan yang butuh spec sendiri. Konsekuensinya —
  observation hanya-tulis di bawah Titen — dicatat, bukan diperbaiki.
- **`forget` lewat filter.** Titen 0.7.3 tidak punya rute purge massal.
- **MCP passthrough.** Sudah diputuskan dan dibatalkan.
- **`site/`.** Halaman status memuat kalimat yang spec ini buat jadi salah;
  itu pekerjaan berkas lain dan agent lain.
- **Preset yang butuh akun berbayar.** `amp`, `cursor`, `gemini` berhenti di
  handshake.

## Acceptance criteria

### AC-1 · Endpoint

- **AC-1.1** WHERE `config.yaml` tidak menyebut `memory.endpoint`, Caraka shall
  memakai `http://127.0.0.1:8787`.
- **AC-1.2** Caraka shall menyimpan endpoint default itu sebagai satu konstanta,
  dan skema konfigurasi shall mengimpornya alih-alih menuliskan angkanya lagi.

### AC-2 · Kredensial

- **AC-2.1** Adapter shall membaca kunci Titen dari `CARAKA_TITEN_API_KEY`.
- **AC-2.2** WHERE kunci itu ada, adapter shall mengirimkannya sebagai header
  `authorization: Bearer` pada setiap permintaan.
- **AC-2.3** `claudeEnvironment()` shall menghapus `CARAKA_TITEN_API_KEY` dari
  environment yang diwariskan ke coding agent yang di-spawn.
- **AC-2.4** WHERE kunci itu ada, `startupSecrets()` shall menyertakannya
  sebagai rahasia exact di scrubber.

### AC-3 · Bentuk kawat

- **AC-3.1** WHEN `observe` dipanggil, adapter shall mengirim `subject_id`,
  `content`, `kind` dari enum tertutup Titen, dan `source` dengan `type` dan
  `ref`.
- **AC-3.2** IF `kind` yang diminta pemanggil tidak ada di peta, THEN adapter
  shall mengirim `system_event` alih-alih string bebas yang ditolak.
- **AC-3.3** WHEN `compile` dipanggil, adapter shall mengirim `max_tokens` dan
  shall membaca `budget.used_tokens` dari balasan.
- **AC-3.4** IF `task` yang diterima `compile` kosong atau hanya spasi, THEN
  adapter shall menggantinya dengan task yang tidak kosong.
- **AC-3.5** WHEN `trace` dipanggil, adapter shall membawa stance setiap
  evidence (`supporting`, `contradicting`, `qualifying`) ke label sumbernya.
- **AC-3.6** WHEN `forget` menghapus id yang sudah terhapus, adapter shall
  mengembalikan 0.
- **AC-3.7** Setiap string di badan permintaan keluar shall melewati scrubber,
  dan badan itu shall tetap JSON yang sah sesudahnya.

### AC-4 · Doctor

- **AC-4.1** WHILE `memory.provider` adalah `titen`, `caraka doctor` shall
  menyelidik rute `/v1` yang menuntut kredensial, bukan `/healthz`.
- **AC-4.2** IF penyelidikan itu dijawab `401`, THEN doctor shall menandai baris
  itu gagal dan menyebut `CARAKA_TITEN_API_KEY` sebagai perbaikannya.
- **AC-4.3** IF tidak ada yang menjawab di endpoint itu, THEN doctor shall
  menandai baris itu gagal dan menyebut `titen serve`.

### AC-5 · Preset

- **AC-5.1** WHEN `scripts/smoke-cli.mjs` menerima argumen rute kedua, ia shall
  menjalankan rute itu alih-alih `driver` milik preset.
- **AC-5.2** `presets/agents/aider.yaml` shall membawa `--no-auto-commits` di
  `args` dan di `resumeArgs`, dan shall tidak membawa `--yes-always` di
  keduanya.
- **AC-5.3** Berkas preset yang menandai dirinya `belum diverifikasi` shall
  tepat tiga: `amp`, `cursor`, `gemini`.

### AC-6 · Dokumen

- **AC-6.1** Tidak satu pun dokumen atau string yang dilihat pengguna shall
  menyebut `7717` sebagai port Titen, atau `/health` sebagai jalur health-nya.
- **AC-6.2** `docs/design.md` §13 shall menyatakan bahwa di bawah Titen sebuah
  observation hanya-tulis sampai ada yang memasok claim.
- **AC-6.3** Prompt pemasangan Titen shall tidak menjanjikan bahwa apa yang
  Caraka simpan akan terbaca kembali.

## Angka dan sumbernya

Semua diukur pada 10 Agustus 2026 terhadap Titen 0.7.3 di host pengembangan.

| Angka | Cara diambil |
|---|---|
| port default `8787` | `titen serve --help` mencetak `[--port 8787]`; proses yang berjalan tanpa flag mendengarkan di sana |
| `/healthz` 200, `/health` 404 | `curl -o /dev/null -w "%{http_code}"` ke keduanya |
| `7717` tidak dilayani | `curl` gagal connect; `ss -ltn` tidak memuatnya |
| `401` tanpa kunci, `404` dengan kunci pada `/v1/claims/:id/evidence` | dua `curl` ke id yang tidak ada |
| `400 VALIDATION_ERROR "task must be a non-empty string"` | `POST /v1/context/compile` dengan `task: ""` |
| latensi compile **5 md** | `performance.now()` mengelilingi `compile` lewat adapter yang sudah dibangun |
