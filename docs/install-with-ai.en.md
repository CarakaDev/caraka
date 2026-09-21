# Installation prompt for a coding agent

**Bahasa Indonesia:** [`install-with-ai.md`](install-with-ai.md)

This prompt can be pasted into a coding agent running on the machine that holds the repository. It keeps the installation work separate from entering the Telegram token.

The English prompt below also appears as the first step of the [installation guide](install-guide.en.md). If one of them changes, change both.

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

## Optional Telegram token

The Web/PWA prompt does not use a Telegram account or token. If you later configure the optional Telegram route, keep its BotFather token out of the agent conversation. Chat transcripts, tool logs, and terminal history can retain input. The Telegram wizard hides the input and writes it to `~/.caraka/secrets/telegram.token`.

If the client offers an interactive terminal the user can take over, the agent may open `npx caraka init` and stop at the token prompt. It must not read or repeat that input.
