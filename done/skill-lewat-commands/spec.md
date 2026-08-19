# Spec — skill-lewat-commands: skill agent sudah sampai lewat /commands, dan tidak ada yang menuliskannya

**Status:** selesai · **Tanggal:** 19 Agustus 2026

## Latar

Diminta dari luar sebagai [issue #14]: sebuah `/skill` yang menampilkan seluruh
skill yang tersedia, karena "skill sudah ada tetapi tidak terlihat kecuali kamu
sudah tahu namanya".

Setengah permintaan itu sudah terjawab kodenya, dan setengahnya lagi ditolak.

**Yang sudah ada.** Skill bukan konsep Caraka. Ia milik coding agent, dan pada
rute ACP agent mengirimkannya sendiri sebagai perintah. Diperiksa di adapter
yang dipasang paket ini, `@agentclientprotocol/claude-agent-acp` 0.63.0:
`getAvailableSlashCommands()` memetakan apa pun yang dijawab
`supportedCommands()`, dan `commands_changed` mengirim ulang daftar itu di
tengah sesi dengan alasan yang ditulis di komentarnya sendiri — "skills
discovered dynamically as the agent works in a subdirectory". Caraka membaca
`available_commands_update`, menyimpannya di `facts.commands`, dan `/commands`
mencetaknya. Jadi perintah yang diminta issue #14 sudah ada namanya `/commands`,
dan skill sudah ada di dalam jawabannya.

**Yang ditolak.** Registry skill milik Caraka sendiri. `AGENTS.md` menolak
marketplace plugin, dan `docs/blueprint.md` menolaknya di baris yang sama dengan
agent loop dan model provider. Lebih dari itu, membangunnya berarti membaca
direktori skill tiap agent dari inti — `~/.claude/skills`, direktori plugin,
lalu bentuk lain untuk agent berikutnya — yang persis cabang per-agent yang
dilarang aturan keras 5.

Yang tersisa adalah kenapa pelapor tidak menemukannya, dan itu ada di prosa.
`help.commandsEmpty` menjawab "{agent} has not sent its command list for this
session yet" lalu berhenti: tidak ada yang mengatakan daftar itu datang dari
mana, kapan, atau bahwa skill ikut di dalamnya. Di situs, baris `/commands` di
`/docs` berbunyi "the slash commands **Claude** reported" — nama tetap yang
dibuang dari seluruh string produk pada 1.5.4 dan tertinggal di sini. Panduan
pasang dalam dua bahasa mencetak delapan perintah dari empat belas yang
didaftarkan, dan menyebut Claude tiga kali di tempat yang agent-nya bisa apa
saja.

## Ruang lingkup

Satu kalimat katalog dalam dua bahasa, dan tempat yang menjelaskan `/commands`:
panduan pasang dalam dua bahasa, halaman `/docs` dan `/guide` di situs.

## Yang tidak dikerjakan

- **Tidak ada `/skill`.** Tidak sebagai perintah baru, tidak sebagai alias
  `/commands`. Alias berarti dua nama untuk satu jawaban dan satu lagi untuk
  tiap kata yang orang tebak berikutnya.
- **Caraka tidak membaca direktori skill agent mana pun.**
- **Daftar perintah tidak di-cache antar sesi.** Ia milik sesi karena agent
  mengirimkannya per sesi, dan menyimpannya lebih lama berarti mencetak daftar
  yang mungkin sudah tidak berlaku.

## Acceptance criteria

### AC-1 · Kalimat yang menyebutkan asal daftarnya

- **AC-1.1** WHEN `/commands` dikirim dan agent belum melaporkan daftar apa pun,
  Caraka shall menjawab dengan kalimat yang menyebut bahwa daftar itu berasal
  dari agent.
- **AC-1.2** Kalimat AC-1.1 shall menyebut bahwa skill agent ikut di dalam
  daftar itu.
- **AC-1.3** Kalimat AC-1.1 shall tetap menyebut nama agent lewat `{agent}` dan
  shall tidak menuliskan nama agent mana pun sebagai teks tetap.
- **AC-1.4** Kalimat AC-1.1 shall ada di kedua katalog bahasa.

### AC-2 · Dokumen yang menjawab pertanyaan issue #14

- **AC-2.1** Halaman `/docs` di situs shall menjelaskan `/commands` tanpa
  menyebut satu agent sebagai teks tetap, dan shall menyebut skill.
- **AC-2.2** Halaman `/guide` di situs shall menyebut `/commands` sebagai cara
  melihat apa yang ditawarkan agent, termasuk skill-nya.
- **AC-2.3** `docs/install-guide.md` dan `docs/install-guide.en.md` shall
  mencetak keempat belas perintah yang didaftarkan `registerCommands`, bukan
  delapan.
- **AC-2.4** Tidak ada baris dalam daftar perintah AC-2.3 yang shall menyebut
  sebuah coding agent sebagai teks tetap.
