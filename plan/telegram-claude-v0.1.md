# Plan — Telegram ke Claude Code v0.1

**Spec:** [`spec/telegram-claude-v0.1.md`](../spec/telegram-claude-v0.1.md) ·
**Standar:** [`standards/ears.md`](../standards/ears.md)

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

Diisi dengan keluaran command aktual sebelum spec dan plan dipindah ke `done/`.
