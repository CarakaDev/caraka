// Every string a person reads lives here. The tool ships English and Indonesian;
// `id` is typed against `en`, so a missing key fails `tsc` and never reaches a chat.

const en = {
  "queue.queued": "◌ Task queued.",
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
    "Send a task as an ordinary message. Commands: /new, /status, /stop, /commands, /usage, /yolo, /lock, /help.",
  "help.commandsEmpty": "Claude has not sent its command list for this session yet.",
  "help.commands": "Claude commands for this session:\n{list}",
  "help.unknownCommand":
    "Caraka does not know /{name}. Send /commands for the list Claude reported.",
  "usage.none": "The agent has not reported usage for this session yet.",
  "usage.report": "Context {used}/{size} tokens. Cost {cost}.",
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
  "telegram.empty": "(Claude sent no text.)",
  "telegram.unreachable": "Telegram {method} could not be reached.",
  "telegram.refused": "Telegram refused {method}.",
  "acp.start": "Claude could not start over ACP. Run `claude auth login`, then try again.",
  "acp.notStarted": "Claude ACP has not started.",
  "cli.nodeVersion": "Node.js 22 or newer is required.",
  "cli.gitMissing": "Git was not found. Install Git, then run init again.",
  "cli.claudeMissing": "Claude Code was not found. Install Claude Code, then run init again.",
  "cli.claudeLogin": "Claude Code is not logged in. Run `claude auth login`, then repeat init.",
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
  "queue.queued": "◌ Tugas masuk antrean.",
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
    "Kirim tugas sebagai pesan biasa. Perintah: /new, /status, /stop, /commands, /usage, /yolo, /lock, /help.",
  "help.commandsEmpty": "Claude belum mengirim daftar perintah untuk sesi ini.",
  "help.commands": "Perintah Claude untuk sesi ini:\n{list}",
  "help.unknownCommand": "Caraka tidak mengenal /{name}. Kirim /commands untuk daftar dari Claude.",
  "usage.none": "Agent belum melaporkan pemakaian untuk sesi ini.",
  "usage.report": "Konteks {used}/{size} token. Biaya {cost}.",
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
  "telegram.empty": "(Claude tidak mengirim teks.)",
  "telegram.unreachable": "Telegram {method} tidak dapat dihubungi.",
  "telegram.refused": "Telegram menolak {method}.",
  "acp.start":
    "Claude tidak dapat dimulai lewat ACP. Jalankan `claude auth login`, lalu coba lagi.",
  "acp.notStarted": "Claude ACP belum dimulai.",
  "cli.nodeVersion": "Node.js 22 atau lebih baru diperlukan.",
  "cli.gitMissing": "Git tidak ditemukan. Pasang Git, lalu jalankan init lagi.",
  "cli.claudeMissing": "Claude Code tidak ditemukan. Pasang Claude Code, lalu jalankan init lagi.",
  "cli.claudeLogin": "Claude Code belum login. Jalankan `claude auth login`, lalu ulangi init.",
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
