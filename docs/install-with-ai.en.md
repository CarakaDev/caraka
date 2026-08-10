# Installation prompt for Codex or Claude

**Bahasa Indonesia:** [`install-with-ai.md`](install-with-ai.md)

This prompt can be pasted into a coding agent running on the machine that holds the repository. It keeps the installation work separate from entering the Telegram token.

The English prompt below also appears as the first step of the [installation guide](install-guide.en.md). If one of them changes, change both.

## Bahasa Indonesia

```text
Pasang Caraka untuk repository di working directory saya saat ini.

Baca https://github.com/CarakaDev/caraka lebih dulu. Verifikasi Node.js 22
atau lebih baru, Git, Claude Code, dan `claude auth status`. Perbaiki hanya
prasyarat yang kurang tanpa mengubah repository saya. Jika Caraka sudah
dikonfigurasi, jalankan `npx caraka doctor`.

Untuk pairing Telegram, jangan pernah meminta saya menempel, membuka, atau
mengulang token bot lewat chat, output command, log, atau berkas yang akan
di-commit. Minta saya membuat bot lewat @BotFather, lalu berikan perintah ini
untuk saya jalankan sendiri di terminal lokal:

  npx caraka init --workspace "$PWD"

Tunggu saat saya memasukkan token secara privat dan menyetujui deep link
Telegram. Setelah saya mengonfirmasi init selesai, jalankan
`npx caraka doctor`, jelaskan check yang gagal, lalu mulai dengan
`npx caraka start`. Jangan mengaktifkan webhook, membuka port, memasang service,
atau mengubah konfigurasi model/provider milik Claude.
```

## English

```text
Install Caraka for the repository in my current working directory.

Read https://github.com/CarakaDev/caraka first. Verify Node.js 22 or newer,
Git, Claude Code, and `claude auth status`. Fix only missing prerequisites that
can be installed without changing my repository. Then run `npx caraka doctor`
if Caraka is already configured.

For Telegram pairing, never ask me to paste, reveal, or repeat the bot token in
chat, command output, logs, or a committed file. Tell me to create a bot with
@BotFather, then hand me this exact command to run myself in a local terminal:

  npx caraka init --workspace "$PWD"

Wait while I enter the token privately and approve the Telegram deep link.
After I confirm init is complete, run `npx caraka doctor`, explain any failed
check, and start it with `npx caraka start`. Do not enable a webhook, open a
port, install a service, or modify Claude's model/provider configuration.
```

## Why the token is not handed to the agent

Chat transcripts, tool logs, and terminal history can be kept by the coding agent's client. The Caraka wizard hides the input and writes the token straight to `~/.caraka/secrets/telegram.token`. Moving the token through chat throws that protection away.

If the client offers an interactive terminal the user can genuinely take over, the agent may open `npx caraka init` and then stop when the token prompt appears. It must not read or repeat that input.
