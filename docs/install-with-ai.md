# Prompt instalasi untuk coding agent

**English:** [`install-with-ai.en.md`](install-with-ai.en.md)

Prompt ini dapat ditempel ke coding agent yang berjalan di komputer tempat repository berada. Ia memisahkan pekerjaan instalasi dari input token Telegram.

Prompt berbahasa Indonesia di bawah juga muncul sebagai langkah pertama di [panduan instalasi](install-guide.md). Kalau salah satunya diubah, ubah keduanya.

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

## Kenapa token tidak diberikan ke agent

Transkrip chat, tool log, dan histori terminal bisa disimpan oleh klien coding agent. Wizard Caraka menyembunyikan input dan menulis token langsung ke `~/.caraka/secrets/telegram.token`. Memindahkan token melalui chat menghilangkan perlindungan itu.

Jika klien menyediakan terminal interaktif yang benar-benar dapat diambil alih user, agent boleh membuka `npx caraka init` lalu berhenti saat prompt token muncul. Agent tidak boleh membaca atau mengulang input tersebut.
