// Every string a person reads lives here. The tool ships English and Indonesian;
// `id` is typed against `en`, so a missing key fails `tsc` and never reaches a chat.

const en = {
  "queue.queued": "◌ Task queued (#{n}).",
  "queue.limit": "◌ 20 messages a minute is the limit. The rest are queued.",
  "session.untitled": "New task",
  "session.created": "Write the task for Claude here.",
  "run.working": "◌ Claude is working…",
  "run.cancelled": "Task cancelled.",
  "run.noOutput": "Claude finished without text output.",
  "run.timeout": "Run passed {minutes} minutes and was cancelled.",
  "permission.header": "⏸ Claude asks for permission",
  "permission.fallbackTitle": "Tool operation",
  "permission.ttl": "Valid for 10 minutes.",
  "permission.target": "Target",
  "permission.auto": "▸ Trust window: {tool}{target}",
  "button.reject": "Reject",
  "button.allow": "Allow once",
  "button.confirm": "Confirm",
  "callback.denied": "You are not allowed to approve this task.",
  "callback.invalid": "That approval is not valid or has ended.",
  "callback.used": "That approval was already used or has expired.",
  "callback.allowed": "Allowed once.",
  "callback.rejected": "Rejected.",
  "callback.confirmed": "Confirmed.",
  "stop.none": "No task is running.",
  "stop.cancelling": "Cancelling the task.",
  "status.session": "Status: {state}.",
  "status.none": "No session in this conversation yet.",
  "help.body":
    "Send a task as an ordinary message; `@workspace` in front routes it. Commands: /new, /status, /stop, /ws, /switch, /commands, /usage, /ingat, /lupakan, /memori, /yolo, /lock, /help.",
  "ws.choose": "Which workspace should take this?",
  "ws.unknown": "No workspace is called {slug}. These exist:\n{list}",
  "ws.list": "Workspaces:\n{list}",
  "ws.sticky": "Tasks in this chat now go to {slug}.",
  "switch.unknown": "That is not a loaded preset. Loaded: {list}",
  "switch.done": "This session switches to {agent} on its next task.",
  "help.commandsEmpty": "Claude has not sent its command list for this session yet.",
  "help.commands": "Claude commands for this session:\n{list}",
  "help.unknownCommand":
    "Caraka does not know /{name}. Send /commands for the list Claude reported.",
  "usage.none": "The agent has not reported usage for this session yet.",
  "usage.report": "Context {used}/{size} tokens. Cost {cost}.",
  "memory.off":
    "Memory is off for this gateway. Set memory.provider to local or titen in config.yaml, then restart.",
  "memory.rememberUsage": "Write the note after the command: /ingat prefer pnpm here.",
  "memory.remembered": "Saved: {id}. /lupakan {id} deletes it.",
  "memory.forgetUsage": "Write the id after the command: /lupakan abc123. /memori lists the ids.",
  "memory.forgotten": "Forgotten: {id}.",
  "memory.notFound": "No memory item has the id {id}. /memori lists what is stored.",
  "memory.list": "Memory for this workspace:\n{list}",
  "memory.empty": "Memory is empty. /ingat <text> saves the first note.",
  "memory.failed":
    "Memory did not answer, so nothing changed. `npx caraka doctor` on the computer shows why.",
  "memory.saved": "Memory saved: {id}",
  "error.report":
    "Claude could not finish the task. {details}\nTry /new or run `npx caraka doctor` on the computer.",
  "start.notice": "Caraka is up on {host}. Workspace {workspace}, version {version}.",
  "trust.needDuration": "Write a duration, for example /yolo 30m. The longest is 60 minutes.",
  "trust.tooLong": "The longest trust window is 60 minutes.",
  "trust.alreadyOpen":
    "A trust window is already open. Close it with /lock, then open a new one; both are recorded.",
  "trust.card":
    "Open a Caraka trust window for {minutes} minutes on {workspace}?\nCaraka still receives every permission request, still stops at the high-risk list, and still records each action. Press the button to confirm; chat text cannot open it.",
  "trust.opened": "Trust window open for {minutes} minutes. Close it any time with /lock.",
  "trust.closed": "Trust window closed.",
  "trust.notOpen": "No trust window is open.",
  "group.pairing":
    "Caraka was added to {title} ({chatId}). Adding a group to the allowlist means choosing to show that work to its members: every member sees the approval cards, file paths, diffs, and command output. Press the button to allow it.",
  "group.paired": "{title} is on the chat allowlist.",
  // Read straight after pairing, which is the one moment the operator is
  // looking. Privacy mode is on — Telegram simply does not deliver ordinary
  // group messages to the bot, so silence would otherwise look like a fault.
  "group.ready":
    "How it works here\n\nTelegram only delivers three kinds of message to me in a group, because privacy mode is on:\n· a command addressed to me, like /new@{bot}\n· a reply to one of my own messages\n· service messages\n\nAn ordinary message in this group never reaches me. That is Telegram, not a fault.\n\nTopics: {topics}\n\nTo let me read every message you would turn privacy mode off in @BotFather, or make me an admin — an admin bot receives all messages either way. Caraka never asks for that.",
  "group.topicsOn": "on. Each session gets its own topic here.",
  "group.topicsOff":
    "off. This group is not a forum, or I am not an admin with can_manage_topics — sessions run linear with a header. Granting that right makes me an admin, and an admin bot reads every message in the group. That is the trade.",
  "telegram.empty": "(Claude sent no text.)",
  "telegram.unreachable": "Telegram {method} could not be reached.",
  "telegram.refused": "Telegram refused {method}.",
  "acp.start": "Claude could not start over ACP. Run `claude auth login`, then try again.",
  "acp.notStarted": "Claude ACP has not started.",
  "preset.invalid": "Preset {file} is invalid at `{field}` and was skipped.",
  "driver.noSession": "The CLI driver does not know that session. Send /new to start over.",
  "driver.exit": "{command} stopped with an error. {detail}",
  "driver.acpMissing":
    "Agent {agent}: the ACP command `{command}` was not found. Install it, or set `driver: cli` under `workspace` in config.yaml.",
  "driver.cliMissing":
    "Agent {agent}: its preset has no CLI command. Install the ACP adapter, or remove `driver: cli` from config.yaml.",
  "driver.none":
    "Agent {agent}: neither the ACP adapter nor a CLI command was found. Install the agent, then run `npx caraka doctor`.",
  "agents.none":
    "No coding agent was found: none is installed, or none is on PATH. Install one (claude, codex, gemini, cline, cursor-agent, goose, amp), then run `caraka doctor` to confirm it is detected.",
  "cli.nodeVersion": "Node.js 22 or newer is required.",
  "cli.gitMissing": "Git was not found. Install Git, then run init again.",
  "cli.workspaceMissing": "Workspace not found: {path}",
  "cli.workspaceArg": "Write a path after `--workspace`.",
  "cli.tokenPrompt": "Bot token from @BotFather (not shown): ",
  "cli.tokenEmpty": "Telegram token is empty.",
  "cli.tokenRejected": "Telegram rejected the token. Copy a new one from @BotFather and try again.",
  "cli.botNoUsername": "The Telegram bot has no username.",
  "cli.cancelled": "Installation cancelled.",
  "cli.pairOpen": "\nOpen this link and press Start:\n{url}",
  "cli.pairWaiting": "Waiting five minutes for pairing…",
  "cli.pairTimeout": "Pairing timed out. Run `caraka init` again.",
  "cli.pairFailed": "Telegram pairing failed. Check the connection and try again.",
  "cli.pairConfirm": "Allow {identity} (ID {id}) to send tasks? [y/N]: ",
  "cli.pairCancelled": "Pairing cancelled; no configuration was saved.",
  "cli.languagePrompt": "Interface language [en/id] ({fallback}): ",
  "cli.memoryOffer":
    "\nMemory. Titen keeps what Caraka learns between runs, served locally on 127.0.0.1:7717.\nInstall it now with `curl -fsSL https://titen.dev/install.sh | bash`? [y/N]: ",
  "cli.memoryLocal": "Memory provider: local (SQLite inside Caraka's own database).",
  "cli.memoryTiten": "Memory provider: titen.",
  "cli.memoryInstallFailed": "The Titen install did not finish. Memory falls back to local.",
  "cli.ready": "\nReady. Configuration: {path}",
  "cli.stopped": "\nCaraka stopped: {message}\n",
  "cli.unknownError": "unknown error",
  "cli.running": "Caraka is live: @{bot} → Claude ({workspace})",
  "cli.allowlistEmpty": "The allowlist is empty. Run `caraka init` again.",
  "cli.alreadyRunning": "Caraka is already running (PID {pid}). Stop it with `caraka stop`.",
  "cli.notRunning": "Caraka is not running.",
  "cli.stopSent": "SIGTERM sent to PID {pid}.",
  "cli.statusRunning": "Running · PID {pid} · workspace {workspace} · bot @{bot}",
  "cli.statusStopped": "Stopped · workspace {workspace} · bot @{bot}",
  "cli.trustUsage": "Write a workspace and a duration: caraka trust <workspace> --for 30m",
  "cli.trustTooLong": "The longest trust window is 60 minutes.",
  "cli.trustOpened": "Trust window open on {workspace} until {until}.",
  "cli.bypassOpened":
    "Claude bypassPermissions is on for {workspace} until {until}. Caraka will not see the permission decisions taken inside that window and will not claim to have audited them.",
  "cli.serviceUsage": "Write one of: caraka service --print systemd|launchd|schtasks",
  "cli.servicePathMissing": "Not found on disk: {path}",
  "cli.help": "\nꦕꦫꦏ  caraka v{version}\n\n{body}\n",
} as const;

export type MessageKey = keyof typeof en;
export type Language = "en" | "id";

const id: Record<MessageKey, string> = {
  "queue.queued": "◌ Tugas masuk antrean (#{n}).",
  "queue.limit": "◌ Batasnya 20 pesan per menit. Sisanya masuk antrean.",
  "session.untitled": "Tugas baru",
  "session.created": "Tulis tugas untuk Claude di sini.",
  "run.working": "◌ Claude sedang bekerja…",
  "run.cancelled": "Tugas dibatalkan.",
  "run.noOutput": "Claude selesai tanpa keluaran teks.",
  "run.timeout": "Run melewati {minutes} menit dan dibatalkan.",
  "permission.header": "⏸ Claude meminta izin",
  "permission.fallbackTitle": "Operasi tool",
  "permission.ttl": "Berlaku 10 menit.",
  "permission.target": "Target",
  "permission.auto": "▸ Jendela trust: {tool}{target}",
  "button.reject": "Tolak",
  "button.allow": "Setujui sekali",
  "button.confirm": "Konfirmasi",
  "callback.denied": "Kamu tidak diizinkan menyetujui tugas ini.",
  "callback.invalid": "Approval tidak sah atau sudah berakhir.",
  "callback.used": "Approval sudah dipakai atau kedaluwarsa.",
  "callback.allowed": "Diizinkan sekali.",
  "callback.rejected": "Ditolak.",
  "callback.confirmed": "Terkonfirmasi.",
  "stop.none": "Tidak ada tugas yang sedang berjalan.",
  "stop.cancelling": "Tugas sedang dibatalkan.",
  "status.session": "Status: {state}.",
  "status.none": "Belum ada sesi di percakapan ini.",
  "help.body":
    "Kirim tugas sebagai pesan biasa; `@workspace` di depan merutekannya. Perintah: /new, /status, /stop, /ws, /switch, /commands, /usage, /ingat, /lupakan, /memori, /yolo, /lock, /help.",
  "ws.choose": "Workspace mana yang mengerjakan ini?",
  "ws.unknown": "Tidak ada workspace bernama {slug}. Yang ada:\n{list}",
  "ws.list": "Daftar workspace:\n{list}",
  "ws.sticky": "Tugas di chat ini sekarang masuk ke {slug}.",
  "switch.unknown": "Itu bukan preset yang termuat. Yang termuat: {list}",
  "switch.done": "Sesi ini beralih ke {agent} pada tugas berikutnya.",
  "help.commandsEmpty": "Claude belum mengirim daftar perintah untuk sesi ini.",
  "help.commands": "Perintah Claude untuk sesi ini:\n{list}",
  "help.unknownCommand": "Caraka tidak mengenal /{name}. Kirim /commands untuk daftar dari Claude.",
  "usage.none": "Agent belum melaporkan pemakaian untuk sesi ini.",
  "usage.report": "Konteks {used}/{size} token. Biaya {cost}.",
  "memory.off":
    "Memori sedang nonaktif di gateway ini. Setel memory.provider ke local atau titen di config.yaml, lalu mulai ulang.",
  "memory.rememberUsage": "Tulis catatannya setelah perintah: /ingat pakai pnpm di sini.",
  "memory.remembered": "Tersimpan: {id}. /lupakan {id} menghapusnya.",
  "memory.forgetUsage": "Tulis id-nya setelah perintah: /lupakan abc123. Daftar id ada di /memori.",
  "memory.forgotten": "Terlupakan: {id}.",
  "memory.notFound": "Tidak ada item memori ber-id {id}. /memori menampilkan daftarnya.",
  "memory.list": "Memori workspace ini:\n{list}",
  "memory.empty": "Memori masih kosong. /ingat <teks> menyimpan catatan pertama.",
  "memory.failed":
    "Memori tidak menjawab, jadi tidak ada yang berubah. `npx caraka doctor` di komputer menunjukkan sebabnya.",
  "memory.saved": "Ingatan disimpan: {id}",
  "error.report":
    "Claude tidak dapat menyelesaikan tugas. {details}\nCoba /new atau jalankan `npx caraka doctor` di komputer.",
  "start.notice": "Caraka aktif di {host}. Workspace {workspace}, versi {version}.",
  "trust.needDuration": "Tulis durasinya, misalnya /yolo 30m. Paling lama 60 menit.",
  "trust.tooLong": "Jendela trust paling lama 60 menit.",
  "trust.alreadyOpen":
    "Jendela trust sudah terbuka. Tutup dengan /lock lalu buka yang baru; keduanya tercatat.",
  "trust.card":
    "Buka jendela trust Caraka selama {minutes} menit di {workspace}?\nCaraka tetap menerima setiap permintaan izin, tetap berhenti pada daftar berisiko tinggi, dan tetap mencatat tiap aksi. Tekan tombol untuk konfirmasi; teks chat tidak bisa membukanya.",
  "trust.opened": "Jendela trust terbuka {minutes} menit. Tutup kapan saja dengan /lock.",
  "trust.closed": "Jendela trust ditutup.",
  "trust.notOpen": "Tidak ada jendela trust yang terbuka.",
  "group.pairing":
    "Caraka ditambahkan ke {title} ({chatId}). Memasukkan grup ke allowlist berarti memilih untuk memperlihatkan pekerjaan itu kepada anggotanya: setiap anggota melihat kartu approval, path berkas, diff, dan keluaran perintah. Tekan tombol untuk mengizinkannya.",
  "group.paired": "{title} masuk allowlist chat.",
  "group.ready":
    "Cara kerjanya di sini\n\nDi grup, Telegram hanya mengirimkan tiga jenis pesan kepada saya, karena privacy mode menyala:\n· perintah yang ditujukan ke saya, seperti /new@{bot}\n· balasan atas pesan saya sendiri\n· service message\n\nPesan biasa di grup ini tidak pernah sampai ke saya. Itu Telegram, bukan kerusakan.\n\nTopic: {topics}\n\nAgar saya membaca semua pesan, matikan privacy mode di @BotFather, atau jadikan saya admin — bot admin menerima semua pesan. Caraka tidak pernah memintanya.",
  "group.topicsOn": "aktif. Tiap sesi mendapat topic sendiri di sini.",
  "group.topicsOff":
    "tidak aktif. Grup ini bukan forum, atau saya bukan admin dengan can_manage_topics — sesi berjalan linear dengan header. Memberi hak itu menjadikan saya admin, dan bot admin membaca setiap pesan di grup. Itu pertukarannya.",
  "telegram.empty": "(Claude tidak mengirim teks.)",
  "telegram.unreachable": "Telegram {method} tidak dapat dihubungi.",
  "telegram.refused": "Telegram menolak {method}.",
  "acp.start":
    "Claude tidak dapat dimulai lewat ACP. Jalankan `claude auth login`, lalu coba lagi.",
  "acp.notStarted": "Claude ACP belum dimulai.",
  "preset.invalid": "Preset {file} tidak sah pada `{field}` dan dilewati.",
  "driver.noSession": "Driver CLI tidak mengenal sesi itu. Kirim /new untuk memulai lagi.",
  "driver.exit": "{command} berhenti dengan galat. {detail}",
  "driver.acpMissing":
    "Agent {agent}: perintah ACP `{command}` tidak ditemukan. Pasang dulu, atau setel `driver: cli` di bagian `workspace` config.yaml.",
  "driver.cliMissing":
    "Agent {agent}: preset-nya tidak punya perintah CLI. Pasang adapter ACP-nya, atau hapus `driver: cli` dari config.yaml.",
  "driver.none":
    "Agent {agent}: adapter ACP maupun perintah CLI tidak ditemukan. Pasang agent-nya, lalu jalankan `npx caraka doctor`.",
  "agents.none":
    "Tidak ada coding agent yang ditemukan: belum terpasang, atau tidak ada di PATH. Pasang salah satu (claude, codex, gemini, cline, cursor-agent, goose, amp), lalu jalankan `caraka doctor` untuk memastikan terdeteksi.",
  "cli.nodeVersion": "Node.js 22 atau lebih baru diperlukan.",
  "cli.gitMissing": "Git tidak ditemukan. Pasang Git, lalu jalankan init lagi.",
  "cli.workspaceMissing": "Workspace tidak ditemukan: {path}",
  "cli.workspaceArg": "Isi path setelah `--workspace`.",
  "cli.tokenPrompt": "Token bot dari @BotFather (tidak ditampilkan): ",
  "cli.tokenEmpty": "Token Telegram kosong.",
  "cli.tokenRejected": "Token Telegram ditolak. Salin token baru dari @BotFather lalu coba lagi.",
  "cli.botNoUsername": "Bot Telegram tidak memiliki username.",
  "cli.cancelled": "Instalasi dibatalkan.",
  "cli.pairOpen": "\nBuka tautan ini dan tekan Start:\n{url}",
  "cli.pairWaiting": "Menunggu pairing selama 5 menit…",
  "cli.pairTimeout": "Pairing habis waktu. Jalankan `caraka init` lagi.",
  "cli.pairFailed": "Pairing Telegram gagal. Periksa koneksi lalu coba lagi.",
  "cli.pairConfirm": "Izinkan {identity} (ID {id}) mengirim tugas? [y/N]: ",
  "cli.pairCancelled": "Pairing dibatalkan; tidak ada konfigurasi yang disimpan.",
  "cli.languagePrompt": "Bahasa antarmuka [en/id] ({fallback}): ",
  "cli.memoryOffer":
    "\nMemori. Titen menyimpan apa yang Caraka pelajari antar-run, berjalan lokal di 127.0.0.1:7717.\nPasang sekarang dengan `curl -fsSL https://titen.dev/install.sh | bash`? [y/N]: ",
  "cli.memoryLocal": "Provider memori: local (SQLite di database Caraka sendiri).",
  "cli.memoryTiten": "Provider memori: titen.",
  "cli.memoryInstallFailed": "Pemasangan Titen tidak selesai. Memori memakai local.",
  "cli.ready": "\nSiap. Konfigurasi: {path}",
  "cli.stopped": "\nCaraka berhenti: {message}\n",
  "cli.unknownError": "kesalahan tidak dikenal",
  "cli.running": "Caraka aktif: @{bot} → Claude ({workspace})",
  "cli.allowlistEmpty": "Allowlist kosong. Jalankan `caraka init` lagi.",
  "cli.alreadyRunning": "Caraka sudah berjalan (PID {pid}). Hentikan dengan `caraka stop`.",
  "cli.notRunning": "Caraka tidak berjalan.",
  "cli.stopSent": "SIGTERM dikirim ke PID {pid}.",
  "cli.statusRunning": "Berjalan · PID {pid} · workspace {workspace} · bot @{bot}",
  "cli.statusStopped": "Berhenti · workspace {workspace} · bot @{bot}",
  "cli.trustUsage": "Tulis workspace dan durasi: caraka trust <workspace> --for 30m",
  "cli.trustTooLong": "Jendela trust paling lama 60 menit.",
  "cli.trustOpened": "Jendela trust terbuka di {workspace} sampai {until}.",
  "cli.bypassOpened":
    "Mode bypassPermissions Claude menyala untuk {workspace} sampai {until}. Caraka tidak akan melihat keputusan izin di dalam jendela itu dan tidak akan mengaku telah mengauditnya.",
  "cli.serviceUsage": "Tulis salah satu: caraka service --print systemd|launchd|schtasks",
  "cli.servicePathMissing": "Tidak ada di disk: {path}",
  "cli.help": "\nꦕꦫꦏ  caraka v{version}\n\n{body}\n",
};

export const catalogs: Record<Language, Record<MessageKey, string>> = { en, id };

export type Translate = (key: MessageKey, values?: Record<string, string | number>) => string;

export function translator(language: Language = "en"): Translate {
  const catalog = catalogs[language];
  return (key, values = {}) =>
    catalog[key].replace(/\{(\w+)\}/g, (whole, name: string) =>
      name in values ? String(values[name]) : whole,
    );
}

// The wizard asks once and writes the answer down. Nothing at runtime reads the
// locale again, and no incoming message ever changes it.
export function defaultLanguage(tag = globalThis.navigator?.language): Language {
  return tag?.toLowerCase().startsWith("id") ? "id" : "en";
}
