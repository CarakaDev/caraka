# Plan — codex-sandbox-ikut-mode

**Spec:** [`spec.md`](spec.md)

## Bentuk perbaikannya

Mode percakapan sudah dibaca di `gateway.ts` tepat di atas `driver.prompt`, dan
tidak pernah dilewatkan. Perbaikannya melewatkannya, dan membiarkan preset
memilih kata sandbox per mode:

```yaml
args: ["exec", "--json", "--color", "never", "--sandbox", "{sandbox}", "--skip-git-repo-check"]
resumeArgs: [..., "-c", "sandbox_mode=\"{sandbox}\""]
sandbox: { read-only: read-only, assisted: workspace-write, trusted: workspace-write }
```

`DriverRoute` mendapat `mode: PolicyMode` (import type saja dari `security.ts`,
jadi tidak ada siklus). `CliDriver.prompt` mengganti `{sandbox}` di `.map` yang
sudah mengganti `{sessionId}`. Jalur retry (`return this.prompt(...)`) memakai
`route` yang sama, jadi mode ikut.

## Langkah

1. **Schema.** `sandbox` objek `strict` dengan tiga kunci wajib, plus `refine`:
   `{sandbox}` di `args` atau `resumeArgs` menuntut peta itu (AC-6).
2. **Preset codex** memakai slot dan peta. Komentar kepalanya ditulis ulang:
   sandbox tetap kontrolnya, dan kini mengikuti mode. Paragraf sejarah
   `codex exec resume` ditolak `--color` dan `--sandbox` tetap.
3. **Kontrak driver.** `mode` masuk `DriverRoute`; gateway mengisinya di satu
   titik panggil.
4. **`CliDriver`.** Gagal tertutup (AC-7): `{sandbox}` tanpa kata untuk mode
   itu melempar `driver.noSandbox` sebelum `spawn`, bukan menjalankan agent
   tanpa sandbox atau dengan tanda kurung kurawal harfiah.
5. **`buildDriver`.** Paksa `acp` tanpa blok `acp` melempar `driver.noAcpRoute`
   (AC-9). `driver.acpMissing` tetap untuk blok yang perintahnya hilang (AC-10).
6. **`start()`.** Preset dimuat sebelum file pid ditulis. Tiap workspace yang
   `driver: acp` dan agennya (`agent || DEFAULT_AGENT`) tanpa blok `acp` mencetak
   `driver.noAcpRoute`, mengisi `exitCode = 78`, dan kembali sebelum pid, store,
   dan channel (AC-8). Tidak ada file pid yang perlu dihapus karena belum ditulis.
7. **Test** di `test/unit.test.ts`: pin codex diperbarui (kontrol harus ada di
   kedua baris, `--color` tidak boleh ada di resume); argv giliran pertama dan
   resume untuk `assisted`, `trusted`, `read-only` lewat agent tiruan; schema
   menolak slot tanpa peta; `buildDriver` paksa `acp` melempar pesan baru.
8. **Dokumen:** `docs/security.md` §5 dan §7, `docs/design.md`, `CHANGELOG.md`,
   dan satu entri buku besar di `AGENTS.md`.

## Yang bisa retak

- **DM kini bisa menulis lewat Codex.** DM bawaannya `assisted`, jadi pemasangan
  yang tidak mengubah apa pun mendapat `workspace-write` di DM. Itu keputusan
  pemilik, dan CHANGELOG menyebutnya di bawah Changed.
- **Tidak ada kartu approval di rute CLI.** Tidak ada seam, jadi tidak ada yang
  bisa ditanyakan. Dokumen keamanan mengatakannya, dan sandbox Codex tetap
  membatasi tulisan ke workspace.
- **Tidak ada harness `start()`.** AC-8 tidak punya test otomatis. Pemeriksaannya
  duduk di atas `writeFile` pid dan memakai kalimat yang diuji di AC-9; kalau
  harness untuk `start()` dibangun nanti, test pertamanya adalah ini.

## Gate

Dijalankan di `rama-tuf`, bukan di mesin ini:

```bash
npm run verify
```

HASIL GATE: diisi setelah run.
