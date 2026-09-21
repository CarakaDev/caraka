# Prompt instalasi untuk coding agent

**English:** [`install-with-ai.en.md`](install-with-ai.en.md)

Prompt ini dapat ditempel ke coding agent di komputer tempat repository berada. Prompt ini memasang Web/PWA lokal tanpa token Telegram.

Prompt berbahasa Indonesia di bawah juga muncul sebagai langkah pertama di [panduan instalasi](install-guide.md). Kalau salah satunya diubah, ubah keduanya.

## Bahasa Indonesia

```text
Pasang Caraka Web/PWA untuk repository di working directory saya saat ini.

Baca https://github.com/CarakaDev/caraka lebih dulu. Verifikasi Node.js 22 atau
lebih baru, Git, dan bahwa kamu sendiri sudah terpasang dan sudah login.
Perbaiki hanya prasyarat yang kurang tanpa mengubah repository saya.

Pertahankan repository serta konfigurasi agent atau provider yang sudah dipakai.
Temukan preset Caraka yang terkirim untuk coding agent yang sudah terpasang dan
sudah login. Gunakan `claude-code` untuk Claude Code dan `codex` untuk Codex.
Jangan gunakan `claude-agent-acp`; itu perintah ACP, bukan preset.

Pasang channel Web/PWA lokal di terminal lokal saya. Jalankan `npx caraka init web`
dengan `--workspace "$PWD"`, `--agent` berisi identifier preset itu, dan
`--language id`.

Setelah saya mengonfirmasi init selesai, jalankan `npx caraka doctor` dan jelaskan check yang gagal.
Jalankan `npx caraka start` di satu terminal lokal. Di terminal lokal terpisah, jalankan
`npx caraka web pair`. Pertahankan listener pada loopback.
Jangan mengaktifkan provider, membuka port, memasang service, atau mengubah konfigurasi model atau provider milikmu sendiri.
```

## English

```text
Install Caraka Web/PWA for the repository in my current working directory.

Read https://github.com/CarakaDev/caraka first. Verify Node.js 22 or newer,
Git, and that you yourself are installed and signed in. Fix only missing
prerequisites without changing my repository.

Preserve the repository and the agent or provider configuration already in use.
Identify the shipped Caraka preset for the coding agent that is installed and
signed in. Use `claude-code` for Claude Code and `codex` for Codex. Do not use
`claude-agent-acp`; it is the ACP command, not a preset.

Set up the local Web/PWA channel in my local terminal. Run `npx caraka init web`
with `--workspace "$PWD"`, `--agent` set to that preset identifier, and
`--language en`.

After I confirm init is complete, run `npx caraka doctor` and explain failed checks.
Start `npx caraka start` in one local terminal. In a separate local terminal, run
`npx caraka web pair`. Keep the listener on loopback.
Do not enable a provider, open a port, install a service, or change your own model or provider configuration.
```

## Token Telegram opsional

Prompt Web/PWA tidak memakai akun Telegram atau token. Bila nanti mengonfigurasi jalur Telegram opsional, simpan token BotFather di luar percakapan agent. Transkrip chat, tool log, dan histori terminal dapat menyimpan input. Wizard Telegram menyembunyikan input dan menulisnya ke `~/.caraka/secrets/telegram.token`.

Jika klien menyediakan terminal interaktif yang dapat diambil alih user, agent boleh membuka `npx caraka init` dan berhenti pada prompt token. Agent tidak boleh membaca atau mengulang input tersebut.
