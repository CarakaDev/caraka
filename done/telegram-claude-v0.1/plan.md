# Plan — Telegram ke Claude Code v0.1

**Spec:** [`spec.md`](spec.md) ·
**Standar:** [`standards/ears.md`](../../standards/ears.md)

---

## 1. Bentuk yang dipilih

Runtime ESM TypeScript dibangun dengan toolchain yang sudah dipakai repo. Jalur
agent memakai `@agentclientprotocol/sdk` stabil dan menjalankan dependency
`@agentclientprotocol/claude-agent-acp` resmi dengan Node yang sama. Telegram
memakai `fetch` bawaan Node karena rilis ini hanya membutuhkan sedikit method Bot
API dan fitur 10.2 masih lebih baru daripada tipe banyak pustaka bot.

SQLite bawaan Node menyimpan sesi, approval, dan audit. `node:crypto` menangani
nonce serta HMAC. `node:readline` menangani wizard. Tidak ada framework CLI,
framework bot, ORM, logger, atau library approval.

## 2. Langkah

1. **Kontrak dan penyimpanan** — config YAML tervalidasi, secret mode `0600`,
   migrasi SQLite maju-saja, scrubber, audit, dan approval single-use.
2. **Adapter Telegram** — API client, long-polling, retry 429, topic opsional,
   rich send, callback, dan pemecahan pesan.
3. **Driver Claude ACP** — lifecycle subprocess, initialize, new/load/prompt,
   update routing, permission request, cancel, dan shutdown.
4. **Gateway** — allowlist, command kecil, mapping thread ke sesi, antrean satu
   run, progres ter-throttle, serta fallback linear.
5. **CLI** — `init`, pairing terminal, `doctor`, `start`, dan `--help`.
6. **Dokumentasi** — README ID/EN, install guide, install prompt, changelog, dan
   copy situs yang tidak lagi menyatakan paket sebagai placeholder.
7. **Verifikasi** — unit, integrasi HTTP mock, e2e gateway mock, ACP smoke nyata,
   lint, typecheck, package inspection, secret scan, dan audit prosa.
8. **Rilis** — tutup WIP mobile sebagai commit terpisah, commit runtime, push,
   publish npm, deploy Cloudflare, lalu smoke produksi.

## 3. Pembuktian tiap AC

| AC | Bukti |
|---|---|
| AC-1 | test init dengan Telegram mock + inspeksi mode berkas |
| AC-2 | test allowlist, grup, callback principal salah |
| AC-3 | test long-poll, unknown field, 429, topic dan fallback linear |
| AC-4 | fake ACP untuk error/cancel/load + smoke Claude ACP nyata |
| AC-5 | test HMAC rusak, replay, expiry, cross-session, shutdown |
| AC-6 | corpus secret sintetis + Telegram rich fallback + splitter |
| AC-7 | test doctor read-only, signal shutdown, dan `npm pack --dry-run` |
| AC-8 | pencarian copy, install tarball di direktori sementara, npm registry, dan HTTP production smoke |

## 4. Batas kesederhanaan

Satu workspace dan satu principal cukup untuk membuktikan produk. Skema menyimpan
id secara eksplisit agar rilis berikutnya dapat menambah workspace tanpa migrasi
destruktif, tetapi tidak ada repository pattern, dependency injection container,
event bus, atau interface satu-implementasi.

Rilis ini memakai file rahasia `0600`, bukan keychain. Tambahkan adapter keychain
setelah ada kebutuhan Windows/macOS nyata atau sebelum klaim dukungan keychain
ditampilkan sebagai sudah tersedia.

## 5. Keluaran verifikasi

**Status:** selesai · **Tanggal rilis:** 7 Agustus 2026

### Runtime dan keamanan

```text
$ npm run verify
> npm run lint && npm run typecheck && npm test && npm run e2e && npm run build
unit: 9 passed, 0 failed
e2e gateway: 1 passed, 0 failed
TypeScript build: passed

$ npm run smoke
Claude ACP smoke passed: initialize, new, prompt, load, prompt.

$ bash scripts/scan-secrets.sh
clean: 153 tracked files, no credentials
```

Smoke ACP memakai Claude Code yang terpasang dan sudah login. E2E gateway
membuktikan private allowlist, fallback topic ke linear, prompt utuh, permission
ACP, callback HMAC sekali pakai, scrubber, audit outbound, dan shutdown
idempoten.

### Artefak npm

```text
$ npm pack --pack-destination <tmp>
caraka@0.1.0
package size: 32.5 kB
unpacked size: 124.7 kB
total files: 26
bin/caraka.mjs: -rwxr-xr-x

$ <fresh-install>/node_modules/.bin/caraka --version
0.1.0

$ npm view caraka@0.1.0 version dist-tags --json
version: 0.1.0
latest: 0.1.0

registry install: 106 packages added
registry CLI: 0.1.0
tarball credential scan: clean
```

Build selalu menghapus `dist/` sebelum `tsc`, sehingga tarball final tidak
membawa artefak `dist/src` lama.

### Website

```text
$ npm run check
astro check: 40 files, 0 errors, 0 warnings, 0 hints
vitest: 2 files passed, 20 tests passed

$ npm audit
found 0 vulnerabilities

$ npm run build
11 pages built

$ npm run e2e
92 passed, 2 skipped, 0 failed
```

Dua skip adalah pemeriksaan tinggi dokumen yang sengaja hanya berjalan di
Chromium. Suite lain berjalan di Chromium, Firefox, WebKit, Chrome mobile, dan
Safari mobile.

### Publikasi dan smoke produksi

```text
$ npm publish --access public
+ caraka@0.1.0

$ npm run deploy
Uploaded caraka-site
Deployed caraka-site triggers
caraka.dev/* (zone name: caraka.dev)
Current Version ID: eaa56ce6-8a85-4fa7-af57-755788a3db63

HTTP 200 / · copy verified
HTTP 200 /install · command and AI prompt verified
HTTP 200 /docs · shipped scope verified
HTTP 200 /security · v0.1 boundary verified
HTTP 200 /status · release state verified
npm 0.1.0 · metadata 200 · tarball 200
Browser /install · COPY PROMPT → COPIED · clipboard content verified
```

Commit yang dipublikasikan: `e0903eb`, `fa68dc3`, `defe833`, dan
`3993da1`. Seluruhnya sudah berada di `origin/main`.
