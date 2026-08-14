# Installation prompt for a coding agent

**Bahasa Indonesia:** [`install-with-ai.md`](install-with-ai.md)

This prompt can be pasted into a coding agent running on the machine that holds the repository. It keeps the installation work separate from entering the Telegram token.

The English prompt below also appears as the first step of the [installation guide](install-guide.en.md). If one of them changes, change both.

## Bahasa Indonesia

```text
Pasang Caraka untuk repository di working directory saya saat ini.

Baca https://github.com/CarakaDev/caraka lebih dulu. Verifikasi Node.js 22 atau
lebih baru, Git, dan bahwa kamu sendiri sudah terpasang dan sudah login.
Perbaiki hanya prasyarat yang kurang tanpa mengubah repository saya.

Jangan pernah meminta saya menempel, membuka, atau mengulang token bot Telegram
lewat chat, output command, log, atau berkas yang akan di-commit. Minta saya
membuat bot lewat @BotFather, lalu berikan perintah ini untuk saya jalankan
sendiri di terminal lokal:

  npx caraka init --workspace "$PWD"

Setelah saya mengonfirmasi init selesai, jalankan `npx caraka doctor`, jelaskan
check yang gagal, lalu mulai dengan `npx caraka start`. Jangan mengaktifkan
webhook, membuka port, memasang service, atau mengubah konfigurasi model atau
provider milikmu sendiri.
```

## English

```text
Install Caraka for the repository in my current working directory.

Read https://github.com/CarakaDev/caraka first. Verify Node.js 22 or newer,
Git, and that you yourself are installed and signed in. Fix only missing
prerequisites without changing my repository.

Never ask me to paste, reveal, or repeat the Telegram bot token in chat, command
output, logs, or a committed file. Tell me to create a bot with @BotFather, then
hand me this command to run myself in a local terminal:

  npx caraka init --workspace "$PWD"

After I confirm init is complete, run `npx caraka doctor`, explain failed
checks, and start it with `npx caraka start`. Do not enable a webhook, open a
port, install a service, or change your own model or provider configuration.
```

## Why the token is not handed to the agent

Chat transcripts, tool logs, and terminal history can be kept by the coding agent's client. The Caraka wizard hides the input and writes the token straight to `~/.caraka/secrets/telegram.token`. Moving the token through chat throws that protection away.

If the client offers an interactive terminal the user can genuinely take over, the agent may open `npx caraka init` and then stop when the token prompt appears. It must not read or repeat that input.
