// Every string a person reads lives here. The tool ships English and Indonesian;
// `id` is typed against `en`, so a missing key fails `tsc` and never reaches a chat.

const en = {
  "queue.queued": "◌ Task queued (#{n}).",
  "queue.limit": "◌ 20 messages a minute is the limit. The rest are queued.",
  "session.untitled": "New task",
  "session.created": "Write the task for {agent} here.",
  "run.working": "◌ Caraka → {agent} · lumaku…",
  "run.cancelled": "Task cancelled.",
  "run.noOutput": "{agent} finished without text output.",
  "run.imageOnly": "{agent} finished with {count} image and no text.",
  "run.timeout": "Run passed {minutes} minutes and was cancelled.",
  // What a sender is told when an attachment cannot reach the agent this session
  // runs on. It names the kind rather than the file, because the file has no name
  // Caraka is willing to repeat, and it names the way in that does work.
  "attach.unsupported":
    "Caraka cannot hand a {kind} to this agent; send the task as text, or put the file in the workspace and name its path.",
  // 20 MB is the getFile ceiling (`docs/security.md` §9). It is written into the
  // sentence rather than passed in, because the ceiling belongs to the adapter
  // that reported the file as too big and core stores no channel's number.
  "attach.tooBig":
    "That attachment is {size} MB and Caraka fetches at most 20 MB; send a smaller one, or put the file in the workspace and name its path.",
  // The outbound half, and the reason it is a sentence rather than silence: the
  // agent did produce the picture, and a channel that cannot carry one is a fact
  // about the channel, not about the run.
  "attach.outUnsupported":
    "{agent} produced a {mime}, and this channel cannot carry one; ask for the file to be written into the workspace instead.",
  "permission.header": "⏸ {agent} asks for permission",
  "permission.fallbackTitle": "Tool operation",
  "permission.ttl": "Valid for 10 minutes",
  // Where there are no buttons the code is the decision, so the card says both
  // words it answers to and how long they last.
  "permission.ttlReply":
    "Valid for 10 minutes · code {code}\nReply `ok {code}` to allow it once, or `no {code}` to refuse.",
  "approval.codeInvalid":
    "That code matches nothing waiting in this conversation. The code is printed on the card itself.",
  "approval.codeLocked":
    "Five wrong codes. Caraka stops reading codes in this session until the waiting request is decided or its ten minutes are up.",
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
  // `/close` is the only thing that closes a topic. Auto-closing on `done` shut
  // it after every turn, because `done` is what one run leaves behind rather than
  // the end of a session.
  "close.done": "Session finished. This topic is closed; the transcript stays.",
  "close.running": "A task is still running here. Send /stop first, then /close.",
  "stop.cancelling": "Cancelling the task.",
  "status.session": "Status: {state}.",
  "status.none": "No session in this conversation yet.",
  // Two bodies, chosen by container. Neither carries a backtick or an asterisk:
  // Telegram's `sendText` is called with no `parse_mode` and shows them, while
  // Discord renders the same string as markdown, and one string cannot hold two
  // renders. Both stay under 2000 characters, which is where Discord truncates
  // `content` without an error.
  "help.direct":
    "Send a task as an ordinary message. This conversation is yours, so everything you write here reaches the coding agent:\n\n  add a rate limit to the login route\n\nWhere your chat app has topics, each task gets one of its own and the answer arrives there. A topic is closed when you send /close, not when a task finishes — a session keeps taking turns. Closed, not deleted, so the transcript stays readable.\n\nPick the folder with @ in front. /ws lists the names:\n\n  @toko-api fix the checkout 500\n\nA folder can also be named by its path, and I offer to add it:\n\n  /new ~/Project/coret Coret\n\nWhen the agent wants to write a file or run a command, a card arrives. It is yours to decide, it works once, and it expires in ten minutes. No word you type decides anything.\n\n/new [folder] [title]  a fresh session, both optional\n/status   what this session is doing\n/stop     cancel the running task\n/ws       list the workspaces and their paths\n/switch <preset>  run this session on another agent\n/commands what the agent itself offers\n/usage    context and cost so far\n/ingat <note>  save a note for this workspace\n/memori   list those notes\n/lupakan <id>  delete one of them\n/yolo 30m open a trust window, 60 minutes at most\n/lock     close it now\n/close    finish this session and close its topic\n/help     this message\n\nThe long version: caraka.dev/guide",
  "help.room":
    "This is a room, so I answer only what is aimed at me — inside a session topic too. Everything else said here I leave alone: no session opens and nothing reaches the coding agent.\n\nAim a message at me by naming me, by replying to one of my own messages, or with a command:\n\n  @caraka_bot @toko-api fix the checkout 500\n\nA room starts read-only. I read the repository and answer questions; I refuse to write a file, run a command, or open a trust window until whoever runs Caraka opts this room in, in config.yaml on that computer.\n\nEveryone who can read this room reads what I put in it: the approval cards, the file paths, the diffs, and the command output. Adding the room chose that.\n\nA folder is named by its slug here; /ws lists them. Whoever runs Caraka can also name one by its path, and the question that writes it down is asked in their own conversation with me, never here.\n\nCommands: /new /status /stop /ws /switch /commands /usage /ingat /lupakan /memori /yolo /lock /close /help. Send /help in your own conversation with me for what each one does.\n\nThe long version: caraka.dev/guide",
  "ws.choose": "Which workspace should take this?",
  "ws.unknown": "No workspace is called {slug}. These exist:\n{list}",
  "ws.list": "Workspaces:\n{list}",
  "ws.sticky": "Tasks in this chat now go to {slug}.",
  // A path names a workspace nobody has approved yet, so the sentence says who
  // may name one rather than only that this sender may not. The list stays: `/ws`
  // already prints the same lines into the same room (ADR-0011).
  "ws.pathOperatorOnly":
    "A path names a workspace only when the first sender on this channel's allowlist writes it. Here a workspace is named by its slug:\n{list}",
  // The one sentence a room gets for every path it names, whatever the answer
  // turns out to be. It branches on nothing, because three answers that can be
  // told apart are the primitive `isdir(p)` for any `p` (`docs/security.md` T6b).
  "ws.askedOperator":
    "That path is answered in the private conversation with whoever runs Caraka, not here.",
  "ws.pathMissing":
    "{path} is not a directory Caraka can find. Create it first, or check the spelling, then send the path again.",
  "ws.slugTaken":
    "The slug {slug} already points at {path}. Give this one a slug of its own in config.yaml, then restart.",
  // `basename(resolve("/"))` is the empty string, and a slug that cannot be
  // written is refused before the card rather than after the press.
  "ws.slugBad":
    "{path} gives no usable name for a workspace. Add it in config.yaml with a slug of letters, digits, dots, dashes, or underscores, then restart.",
  // The one part of the rooted-allowlist idea worth having (ADR-0010, rejected
  // alternative 1): a parent of a workspace is not a smaller grant than the disk.
  "ws.pathOverlap":
    "{path} overlaps the workspace {slug} at {existing}, so one trust window would cover both. Name a directory that holds neither the other, or add it in config.yaml by hand.",
  "ws.addCard":
    "Add {path} as workspace {slug}?\nYes writes the entry into config.yaml, where it stays until you remove it by hand. Every task sent to {slug} then runs in that directory, and a trust window opened on it covers that directory.",
  // Nesting is allowed because the outer workspace already reaches the inner
  // directory, so the inner one is a narrower key rather than a wider one. What
  // it does cost is two scopes over one directory, and the card says so rather
  // than letting the operator find out at `/lock`.
  "ws.addCardNested":
    "Add {path} as workspace {slug}?\nIt sits inside {outer}, which already reaches it. Adding it gives that directory a second scope of its own: a trust window on one is not closed by /lock on the other, and memory saved under one does not surface under the other.\nYes writes the entry into config.yaml, where it stays until you remove it by hand.",
  "ws.added": "{slug} now points at {path}. Tasks in this chat go there.",
  "switch.unknown": "That is not a loaded preset. Loaded: {list}",
  "switch.done": "This session switches to {agent} on its next task.",
  "help.commandsEmpty": "{agent} has not sent its command list for this session yet.",
  "help.commands": "{agent} commands for this session:\n{list}",
  "help.unknownCommand":
    "Caraka does not know /{name}. Send /commands for the list the agent reported.",
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
    "{agent} could not finish the task. {details}\nTry /new or run `npx caraka doctor` on the computer.",
  "start.notice": "Caraka is up on {host}. Workspace {workspace}, version {version}.",
  "policy.readOnly":
    '⛔ Refused: {tool}{target}\nThis conversation is read-only, so no write and no command runs here. To let it, add "{container}": assisted under {channel}.modes in config.yaml and restart. A room stays read-only until someone opts it in.',
  "policy.noSeam":
    "⛔ Not run. This workspace's route decides permissions itself and never asks Caraka, so read-only has nothing to refuse a write at. Send the task from your direct message with the bot, or give this workspace `driver: acp` in config.yaml.",
  "policy.noTrust":
    "⛔ No window opened. This conversation is read-only, and a trust window covers the whole workspace, including the conversations that are not. Send /yolo from your direct message with the bot, or opt this one in under {channel}.modes in config.yaml first.",
  "trust.needDuration": "Write a duration, for example /yolo 30m. The longest is 60 minutes.",
  "trust.tooLong": "The longest trust window is 60 minutes.",
  "trust.needButtons":
    "A trust window is confirmed by pressing a button, and this channel has none. Open it from the terminal instead: `caraka trust <workspace> --for 30m`.",
  "trust.alreadyOpen":
    "A trust window is already open. Close it with /lock, then open a new one; both are recorded.",
  // The path rides beside the slug because a workspace can now be added from
  // chat: ten minutes after that card, the operator's memory of it is the only
  // thing standing between a slug and a directory.
  "trust.card":
    "Open a Caraka trust window for {minutes} minutes on {workspace} ({path})?\nCaraka still receives every permission request, still stops at the high-risk list, and still records each action. Press the button to confirm; chat text cannot open it.",
  "trust.opened": "Trust window open for {minutes} minutes. Close it any time with /lock.",
  "trust.closed": "Trust window closed.",
  // The honest answer where the old one said no window was open while every
  // window stayed open.
  "trust.closedAll":
    "This chat names no single workspace, so every open trust window was closed ({n}). A window is opened again with /yolo from a conversation that names its workspace, or from the terminal with `caraka trust`.",
  "trust.notOpen": "No trust window is open.",
  "group.pairing":
    "Caraka was added to the Telegram group {title} ({chatId}). Adding a group to the allowlist means choosing to show that work to its members: every member sees the approval cards, file paths, diffs, and command output, and Caraka's command menu with its descriptions appears for every one of them. Press the button to allow it.",
  "group.paired": "{title} is on the chat allowlist.",
  // Read straight after pairing, which is the one moment the operator is
  // looking. Privacy mode is on — Telegram simply does not deliver ordinary
  // group messages to the bot, so silence would otherwise look like a fault.
  "group.ready":
    "How it works here\n\nTelegram only delivers three kinds of message to me in a group, because privacy mode is on:\n· a command addressed to me, like /new@{bot}\n· a reply to one of my own messages\n· service messages\n\nAn ordinary message in this group never reaches me. That is Telegram, not a fault.\n\nTopics: {topics}\n\nTo let me read every message you would turn privacy mode off in @BotFather, or make me an admin — an admin bot receives all messages either way. Caraka never asks for that.",
  // The other half of the same reading: privacy mode is off, so everything
  // arrives and the gate is Caraka's rather than Telegram's.
  "group.readyAll":
    "How it works here\n\nPrivacy mode is off for me here, so Telegram delivers every message in this group to me. I answer the ones aimed at me:\n· a message that names @{bot}, a command like /new@{bot} included\n· a reply to one of my own messages\n\nEverything else is read and left alone: no session is opened, and nothing reaches the coding agent.\n\nTopics: {topics}\n\nTo have Telegram deliver less, turn privacy mode back on in @BotFather and take my admin rights away.",
  "group.topicsOn": "on. Each session gets its own topic here.",
  "group.topicsOff":
    "off. This group is not a forum, or I am not an admin with can_manage_topics — sessions run linear with a header. Granting that right makes me an admin, and an admin bot reads every message in the group. That is the trade.",
  "channel.empty": "(The agent sent no text.)",
  "channel.unreachable": "{channel} {method} could not be reached.",
  "channel.refused": "{channel} refused {method}.",
  "channel.startFailed": "{channel} could not start, so nothing was started. {message}",
  "session.threadsOff":
    "Threads are not available here, so sessions run linear with a header. Archive the old threads, or grant the right to create them, then run `npx caraka doctor` to look again.",
  "discord.pairing":
    "Caraka can see {title} ({chatId}). Adding a Discord channel to the allowlist means choosing to show that work to the people who can read it: every one of them sees the approval cards, file paths, diffs, and command output. A role changes none of that, and a role never approves anything. Press the button to allow it.",
  "discord.ready":
    "How it works here\n\nI ask Discord for no privileged intent, so the text of an ordinary message never reaches me. That is the permission I did not ask for, not a fault.\n\nWhat reaches me:\n\u00b7 a slash command, such as /new\n\u00b7 a button on a card I sent\n\nThreads: {topics}\n\nA reply lands in the session thread; a command answers in this channel.",
  "discord.threadsOn": "on. Each session gets its own thread here.",
  "discord.threadsOff":
    "off. This is a direct message, and a direct message holds no threads, so sessions run linear with a header.",
  "discord.asFile": "The answer was longer than Discord carries in a message, so it is attached.",
  // The ack is ephemeral and Discord closes the reply window in seconds, so it
  // cannot wait for core to decide. What it can do is say what silence means.
  "discord.acknowledged":
    "Caraka has it. If nothing follows this, your account or this channel is not on Caraka's allowlist. Ask whoever runs it to add you.",
  "discord.fatalClose":
    "Discord closed the gateway with code {code} and would close it again, so Caraka stopped instead of retrying. Check the bot token and the invite in the Discord developer portal, then start again.",
  "whatsapp.noGroups":
    "Caraka does not run in a WhatsApp group. A group message names the group as its sender, so every member would drive the agent as one person and every member would read the approval code. Only a one-to-one conversation with a number on the whatsapp allowlist reaches Caraka.",
  "whatsapp.ready":
    "How it works here\n\nSessions run one after another in this conversation, with a header like [ws · #4f2a] in front of each reply, because WhatsApp holds no threads.\n\nApproval has no button here. The card carries a code, and only a reply of `ok <code>` or `no <code>` from you decides it — the code is on the card and nowhere else.",
  "whatsapp.asFile": "The answer was longer than four messages, so it is attached as a file.",
  "whatsapp.noThreads": "WhatsApp has no threads, so a session cannot be given one.",
  "whatsapp.notStarted": "The WhatsApp channel has not started.",
  "whatsapp.firstContact":
    "Caraka never writes to a number that has not written to it first. Send one message from that number, or put it on the whatsapp allowlist.",
  "whatsapp.baileysMissing":
    "The baileys provider needs its module, and it is not installed. Run `{install}`, then start Caraka again. It is an optional peer dependency on purpose: an install that only uses Telegram never downloads it.",
  "whatsapp.loggedOut":
    "WhatsApp logged this device out, so Caraka stopped instead of reconnecting — repeated reconnects after a logout are the reported way to lose the account. Delete `~/.caraka/secrets/whatsapp/` and start Caraka again to link the device from scratch.",
  "whatsapp.gaveUp":
    "WhatsApp did not come back after {attempts} attempts, so Caraka stopped trying. Read https://github.com/CarakaDev/caraka/blob/main/docs/troubleshooting.en.md, then start again once the connection is back.",
  "whatsapp.pairingCode":
    "\nThis device is not linked yet. On the phone, open WhatsApp → Linked devices → Link with phone number, and type:\n{code}\n",
  "whatsapp.pairingNoNumber":
    '\nThis device is not linked, and linking needs the number Caraka will run as. Put `number: "628…"` in the whatsapp block of config.yaml — a number kept apart from the personal one — then start Caraka again.\n',
  "whatsapp.webhookExposed":
    "\n════════════════════════════════════════════════════════════\n⚠  The WhatsApp webhook will listen on {host}:{port}, not on\n   127.0.0.1. Every request is still checked against\n   X-Hub-Signature-256, and nothing else about that address is\n   protected. Put a reverse proxy with TLS in front of it.\n════════════════════════════════════════════════════════════\n",
  "whatsapp.riskNotice":
    "\n⚠  WhatsApp provider: baileys. This logs in as a linked device on a real\n   account, and the account can be banned for it. Use a number kept apart\n   from the personal one, and read what is known about how often it happens:\n   https://github.com/CarakaDev/caraka/blob/main/docs/whatsapp-risiko.en.md\n",
  "acp.start":
    "The ACP adapter did not start: its command failed to run, or the agent did not answer. Run `claude auth login` if it is signed out, then start Caraka again.",
  "acp.notStarted": "Claude ACP has not started.",
  "preset.invalid": "Preset {file} is invalid at `{field}` and was skipped.",
  "driver.noSession": "The CLI driver does not know that session. Send /new to start over.",
  "driver.rolloutGone":
    "The agent no longer has this session stored, so this ran as a new one. It does not carry the earlier turns.",
  "driver.exit": "{command} stopped with an error. {detail}",
  "driver.acpMissing":
    "Agent {agent}: the ACP command `{command}` was not found. Install it, or set `driver: cli` under `workspace` in config.yaml.",
  "driver.cliMissing":
    "Agent {agent}: its preset has no CLI command. Install the ACP adapter, or remove `driver: cli` from config.yaml.",
  "driver.none":
    "Agent {agent}: neither the ACP adapter nor a CLI command was found. Install the agent, then run `npx caraka doctor`.",
  "agents.none":
    "No coding agent was found: none is installed, none is on PATH, or the one on PATH cannot be started from here. Install one (claude, codex, gemini, cline, cursor-agent, goose, amp), then run `caraka doctor` to confirm it is detected. On native Windows an agent installed with `npm -g` cannot be started this way: install its `.exe`, or run Caraka under WSL2.",
  "cli.nodeVersion": "Node.js 22 or newer is required.",
  "cli.gitMissing": "Git was not found. Install Git, then run init again.",
  "cli.workspaceMissing": "Workspace not found: {path}",
  "cli.workspaceArg": "Write a path after `--workspace`.",
  "cli.tokenPrompt": "Telegram bot token from @BotFather (not shown): ",
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
  // The link carries a bearer secret, so the line under it says what holding
  // that link means before the operator forwards it to anyone.
  "cli.pairSecret":
    "Whoever opens that link first is paired. It works once, it dies in five minutes, and it is the only thing standing between a stranger and this machine — do not forward it.",
  "fix.header": "\nRepaired:",
  "fix.leftHeader": "\nLeft alone, because repairing it takes a decision:",
  "fix.nothing": "\nNothing to repair: every path Caraka owns is where it should be.",
  "fix.madeDir": "  {path} — created at 0700.",
  "fix.setMode": "  {path} — mode {before} → {after}. It was readable beyond you.",
  "fix.clearedPid": "  {path} — removed. The gateway it names is not running.",
  "fix.keepsConfig":
    "  {path} — unreadable, and --fix writes neither a configuration nor a credential. Run `caraka init`.",
  "fix.keepsWorkspace":
    "  {path} — the workspace is missing. It is your repository, so Caraka does not create it. Clone it back, or point workspace.path at where it moved.",
  "fix.keepsAllowlist":
    "  {channel} — the allowlist is empty. Who may send tasks is your decision, so --fix does not fill it. Run `caraka init` again.",
  "cli.uninstallRunning":
    "Caraka is running (PID {pid}). Run `caraka stop` first, then `caraka uninstall`.",
  "cli.uninstallNothing": "There is nothing to remove: no Caraka file exists under {root}.",
  "cli.uninstallRemoves": "\nThese are deleted, and there is no undo:",
  "cli.uninstallKeeps":
    "\nThese are not Caraka's to delete:\n  the Telegram bot — it stays until you delete it in @BotFather\n  every file the coding agent wrote in your workspace, including work you have not committed",
  "cli.uninstallConfirm": "\nType uninstall to confirm: ",
  "cli.uninstallCancelled": "Nothing was deleted.",
  "cli.uninstallDone": "Removed {count} path(s). Caraka is gone from this machine.",
  "cli.languagePrompt": "Interface language [en/id] ({fallback}): ",
  "cli.memoryOffer":
    "\nMemory. Titen runs locally on 127.0.0.1:8787 and stores what Caraka observes. Reading it back stays empty until Titen holds claims, and nothing here writes those yet. Its routes need a key: `titen bootstrap` prints one, and Caraka reads it from CARAKA_TITEN_API_KEY.\nInstall it now with `curl -fsSL https://titen.dev/install.sh | bash`? [y/N]: ",
  "cli.memoryLocal": "Memory provider: local (SQLite inside Caraka's own database).",
  "cli.memoryTiten": "Memory provider: titen.",
  "cli.memoryInstallFailed": "The Titen install did not finish. Memory falls back to local.",
  // Each of these ends the same way on purpose: memory falls back to local and
  // init finishes. A step that cannot be completed says which one it was, so the
  // reader knows what to repair rather than that something went wrong.
  "cli.titenMissing":
    "Titen installed but its command was not found in {dir} or on PATH. Memory falls back to local.",
  "cli.titenStoreNoKey":
    "A Titen store already exists at {db} and Caraka holds no key for it. Make one with `titen key list --db {db}` to find the org, then `titen key create --db {db} --org-id <id>`, and put it in CARAKA_TITEN_API_KEY. Memory falls back to local until then.",
  "cli.titenNoKey":
    "Titen was installed but `titen bootstrap` printed no API key, so there is nothing to authenticate with. Memory falls back to local.",
  "cli.titenServe":
    "Titen is installed and its key is stored. One command left, and it needs that database:\n\n  titen serve --db {db}\n",
  "cli.titenLive": "Titen is installed, its key is stored, and it is already answering.",
  "cli.ready": "\nReady. Configuration: {path}",
  "cli.stopped": "\nCaraka stopped: {message}\n",
  "cli.unknownError": "unknown error",
  "cli.running": "Caraka is live: {channels} → {agent} ({workspace})",
  "cli.allowlistEmpty": "The {channel} allowlist is empty. Run `caraka init` again.",
  "cli.alreadyRunning": "Caraka is already running (PID {pid}). Stop it with `caraka stop`.",
  "cli.notRunning": "Caraka is not running.",
  "cli.stopSent": "SIGTERM sent to PID {pid}.",
  "cli.statusRunning": "Running · PID {pid} · workspace {workspace} · channels {channels}",
  "cli.statusStopped": "Stopped · workspace {workspace} · channels {channels}",
  "cli.trustUsage": "Write a workspace and a duration: caraka trust <workspace> --for 30m",
  "cli.trustNotWorkspace":
    "{path} is not a workspace in config.yaml, so no window was opened. A workspace is named in config.yaml, and this command only opens a window on one of these:\n{list}",
  "cli.trustTooLong": "The longest trust window is 60 minutes.",
  "cli.trustOpened": "Trust window open on {workspace} until {until}.",
  "cli.bypassOpened":
    "Claude bypassPermissions is on for {workspace} until {until}. Caraka will not see the permission decisions taken inside that window and will not claim to have audited them.",
  "cli.serviceUsage": "Write one of: caraka service --print systemd|launchd|schtasks",
  "cli.servicePathMissing": "Not found on disk: {path}",
  "cli.dashboardReady": "Dashboard: {url} — read-only. Ctrl-C stops it.",
  "cli.dashboardNoDatabase":
    "No Caraka database at {path}. Run `caraka init` first; the dashboard reads that file and never creates it.",
  "cli.dashboardPortBusy":
    "Port {port} is already in use. Choose another with `caraka dashboard --port <n>`.",
  "cli.dashboardPortInvalid": "`--port` takes a number from 0 to 65535, not {port}.",
  "cli.dashboardFlagArg": "Write a value after `{flag}`.",
  // Printed before the listener accepts anything, because a warning that
  // arrives after the first reader is a record, not a warning.
  "cli.dashboardExposed":
    "\n════════════════════════════════════════════════════════════\n⚠  The dashboard will listen on {host}:{port}, not on 127.0.0.1.\n   Anyone who can reach that address reads every session title,\n   audit line, and policy grant on this machine. There is no\n   login and there is no token.\n   Reach it over Tailscale, WireGuard, or SSH instead.\n════════════════════════════════════════════════════════════\n",
  "cli.help": "\nꦕꦫꦏ  caraka v{version}\n\n{body}\n",
  "dash.title": "Caraka",
  "dash.readOnly": "Read-only. Nothing on this page changes anything.",
  "dash.renderedAt": "Read at {time}.",
  "dash.nav.sessions": "Sessions",
  "dash.nav.runs": "Runs",
  "dash.nav.approvals": "Approvals",
  "dash.nav.audit": "Audit",
  "dash.nav.policy": "Policy",
  "dash.nav.memory": "Memory",
  "dash.nav.beta": "Beta",
  "dash.empty": "Nothing recorded yet.",
  "dash.error": "That panel could not be read.",
  "dash.notFound": "No such page.",
  "dash.methodNotAllowed": "The dashboard answers GET and HEAD only.",
  "dash.forbiddenHost":
    "The dashboard answers its own address only. Open it at http://127.0.0.1 with the port it was started on.",
  "dash.runsDerived":
    "Paired from the audit rows run.start and run.finish. A start with nothing after it is shown as running, because the database cannot tell that apart from a process that died; a start the same session started again reads interrupted.",
  "dash.approvalsReadOnly":
    "Approving happens in chat, on a signed single-use button. This page only reports what was decided.",
  "dash.auditWindow": "Window {window}. Add ?since=1h, 24h, 7d or all.",
  "dash.memoryElsewhere":
    "Memory provider {provider} keeps its content outside this database, so there is nothing here to show.",
  "dash.col.state": "State",
  "dash.col.status": "Status",
  "dash.col.title": "Title",
  "dash.col.workspace": "Workspace",
  "dash.col.agent": "Agent",
  "dash.col.principal": "Principal",
  "dash.col.updated": "Updated",
  "dash.col.session": "Session",
  "dash.col.started": "Started",
  "dash.col.duration": "Duration",
  "dash.col.id": "Id",
  "dash.col.tool": "Tool call",
  "dash.col.expires": "Expires",
  "dash.col.time": "Time",
  "dash.col.action": "Action",
  "dash.col.result": "Result",
  "dash.col.details": "Details",
  "dash.col.mode": "Mode",
  "dash.col.grantedBy": "Granted by",
  "dash.col.created": "Created",
  "dash.col.scope": "Scope",
  "dash.col.kind": "Kind",
  "dash.col.text": "Text",
  "dash.status.waiting": "waiting",
  "dash.status.allowed": "allowed",
  "dash.status.rejected": "rejected",
  "dash.status.expired": "expired",
  "dash.status.open": "open",
  "dash.status.closed": "closed",
  "dash.beta.setup": "Setup time",
  "dash.beta.setupValue": "{seconds} seconds from first start to first message.",
  "dash.beta.setupUnknown":
    "Unknown. This database has no gateway.start row before its first message, which is what a database created before v0.5 looks like.",
  "dash.beta.activation": "Activation",
  "dash.beta.yes": "yes",
  "dash.beta.no": "no",
  "dash.beta.proxy":
    "Activation reads the audit action run.finish with result end_turn as the proxy for a message that succeeded, within 24 hours of the earliest gateway.start.",
  "dash.beta.share": "Share these numbers",
  "dash.beta.shareNote":
    "Nothing is sent from here. Caraka has no outbound telemetry; copying this line is the only way it travels.",
} as const;

export type MessageKey = keyof typeof en;
export type Language = "en" | "id";

const id: Record<MessageKey, string> = {
  "queue.queued": "◌ Tugas masuk antrean (#{n}).",
  "queue.limit": "◌ Batasnya 20 pesan per menit. Sisanya masuk antrean.",
  "session.untitled": "Tugas baru",
  "session.created": "Tulis tugas untuk {agent} di sini.",
  "run.working": "◌ Caraka → {agent} · lumaku…",
  "run.cancelled": "Tugas dibatalkan.",
  "run.noOutput": "{agent} selesai tanpa keluaran teks.",
  "run.imageOnly": "{agent} selesai dengan {count} gambar dan tanpa teks.",
  "run.timeout": "Run melewati {minutes} menit dan dibatalkan.",
  "attach.unsupported":
    "Caraka tidak bisa menyerahkan {kind} ke agent ini; kirim tugasnya sebagai teks, atau taruh berkasnya di workspace lalu sebut path-nya.",
  "attach.tooBig":
    "Lampiran itu {size} MB dan Caraka mengunduh paling banyak 20 MB; kirim yang lebih kecil, atau taruh berkasnya di workspace lalu sebut path-nya.",
  "attach.outUnsupported":
    "{agent} menghasilkan {mime}, dan channel ini tidak bisa membawanya; minta berkasnya ditulis ke dalam workspace saja.",
  "permission.header": "⏸ {agent} meminta izin",
  "permission.fallbackTitle": "Operasi tool",
  "permission.ttl": "Berlaku 10 menit",
  "permission.ttlReply":
    "Berlaku 10 menit · kode {code}\nBalas `ok {code}` untuk menyetujui sekali, atau `no {code}` untuk menolak.",
  "approval.codeInvalid":
    "Kode itu tidak cocok dengan apa pun yang menunggu di percakapan ini. Kodenya tertulis di kartunya sendiri.",
  "approval.codeLocked":
    "Lima kode salah. Caraka berhenti membaca kode di sesi ini sampai permintaan yang menunggu diputuskan atau sepuluh menitnya habis.",
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
  "close.done": "Sesi selesai. Topic ini ditutup; transkripnya tetap ada.",
  "close.running": "Masih ada tugas berjalan di sini. Kirim /stop dulu, baru /close.",
  "stop.cancelling": "Tugas sedang dibatalkan.",
  "status.session": "Status: {state}.",
  "status.none": "Belum ada sesi di percakapan ini.",
  "help.direct":
    "Kirim tugas sebagai pesan biasa. Percakapan ini milikmu, jadi semua yang kamu tulis di sini sampai ke coding agent:\n\n  tambahkan rate limit di route login\n\nDi aplikasi chat yang punya topic, tiap tugas mendapat satu topic sendiri dan jawabannya tiba di sana. Topic ditutup saat kamu mengirim /close, bukan saat satu tugas selesai — sesi terus menerima giliran berikutnya. Ditutup, bukan dihapus, jadi transkripnya tetap bisa dibaca.\n\nPilih foldernya dengan @ di depan. /ws menampilkan namanya:\n\n  @toko-api perbaiki checkout 500\n\nFolder juga bisa disebut lewat path-nya, dan saya menawarkan untuk menambahkannya:\n\n  /new ~/Project/coret Coret\n\nSaat agent hendak menulis berkas atau menjalankan perintah, sebuah kartu tiba. Kamu yang memutuskan, kartunya sekali pakai, dan kedaluwarsa dalam sepuluh menit. Tidak ada kata yang kamu ketik yang memutuskan apa pun.\n\n/new [folder] [judul]  sesi baru, keduanya opsional\n/status   sesi ini sedang apa\n/stop     batalkan tugas yang berjalan\n/ws       daftar workspace beserta path-nya\n/switch <preset>  jalankan sesi ini di agent lain\n/commands apa yang ditawarkan agent-nya sendiri\n/usage    konteks dan biaya sejauh ini\n/ingat <catatan>  simpan catatan untuk workspace ini\n/memori   daftar catatan itu\n/lupakan <id>  hapus salah satunya\n/yolo 30m buka jendela trust, paling lama 60 menit\n/lock     tutup sekarang\n/close    selesaikan sesi ini dan tutup topic-nya\n/help     pesan ini\n\nVersi panjangnya: caraka.dev/guide",
  "help.room":
    "Ini ruangan, jadi saya hanya menjawab yang ditujukan kepada saya — termasuk di dalam topic sesi. Sisanya saya baca lalu biarkan: tidak ada sesi yang dibuka dan tidak ada yang sampai ke coding agent.\n\nTujukan pesan kepada saya dengan menyebut nama saya, dengan membalas salah satu pesan saya, atau dengan sebuah perintah:\n\n  @caraka_bot @toko-api perbaiki checkout 500\n\nRuangan mulai read-only. Saya membaca repositori dan menjawab pertanyaan; saya menolak menulis berkas, menjalankan perintah, atau membuka jendela trust sampai yang menjalankan Caraka memasukkan ruangan ini di config.yaml pada komputer itu.\n\nSetiap orang yang bisa membaca ruangan ini membaca yang saya taruh di sini: kartu approval, path berkas, diff, dan keluaran perintah. Menambahkan ruangan ini berarti memilih itu.\n\nFolder di sini disebut lewat slug-nya; /ws menampilkannya. Yang menjalankan Caraka juga boleh menyebut folder lewat path, dan pertanyaan yang menuliskannya diajukan di percakapannya sendiri dengan saya, bukan di sini.\n\nPerintah: /new /status /stop /ws /switch /commands /usage /ingat /lupakan /memori /yolo /lock /close /help. Kirim /help di percakapanmu sendiri dengan saya untuk penjelasan tiap perintah.\n\nVersi panjangnya: caraka.dev/guide",
  "ws.choose": "Workspace mana yang mengerjakan ini?",
  "ws.unknown": "Tidak ada workspace bernama {slug}. Yang ada:\n{list}",
  "ws.list": "Daftar workspace:\n{list}",
  "ws.sticky": "Tugas di chat ini sekarang masuk ke {slug}.",
  "ws.pathOperatorOnly":
    "Bentuk path menamai workspace hanya ketika pengirim pertama di allowlist channel ini yang menuliskannya. Di sini workspace disebut lewat slug-nya:\n{list}",
  "ws.askedOperator":
    "Path itu dijawab di percakapan pribadi dengan yang menjalankan Caraka, bukan di sini.",
  "ws.pathMissing":
    "{path} bukan direktori yang bisa Caraka temukan. Buat dulu direktorinya, atau periksa ejaannya, lalu kirim path-nya lagi.",
  "ws.slugTaken":
    "Slug {slug} sudah menunjuk {path}. Beri yang ini slug sendiri di config.yaml, lalu mulai ulang.",
  "ws.slugBad":
    "{path} tidak memberi nama yang bisa dipakai untuk workspace. Tambahkan di config.yaml dengan slug berisi huruf, angka, titik, tanda hubung, atau garis bawah, lalu mulai ulang.",
  "ws.pathOverlap":
    "{path} tumpang-tindih dengan workspace {slug} di {existing}, jadi satu jendela trust akan berlaku untuk keduanya. Sebut direktori yang tidak memuat yang lain, atau tambahkan di config.yaml sendiri.",
  "ws.addCard":
    "Tambahkan {path} sebagai workspace {slug}?\nYa menulis entrinya ke config.yaml, dan entri itu tinggal di sana sampai kamu menghapusnya sendiri. Setiap tugas ke {slug} lalu berjalan di direktori itu, dan jendela trust yang dibuka padanya berlaku untuk direktori itu.",
  "ws.addCardNested":
    "Tambahkan {path} sebagai workspace {slug}?\nIa berada di dalam {outer}, yang sudah menjangkaunya. Menambahkannya memberi direktori itu scope kedua miliknya sendiri: jendela trust pada salah satunya tidak ditutup oleh /lock pada yang lain, dan memori yang disimpan di bawah satu tidak muncul di bawah yang lain.\nYa menulis entrinya ke config.yaml, dan ia tinggal di sana sampai kamu menghapusnya sendiri.",
  "ws.added": "{slug} sekarang menunjuk {path}. Tugas di chat ini masuk ke sana.",
  "switch.unknown": "Itu bukan preset yang termuat. Yang termuat: {list}",
  "switch.done": "Sesi ini beralih ke {agent} pada tugas berikutnya.",
  "help.commandsEmpty": "{agent} belum mengirim daftar perintah untuk sesi ini.",
  "help.commands": "Perintah {agent} untuk sesi ini:\n{list}",
  "help.unknownCommand": "Caraka tidak mengenal /{name}. Kirim /commands untuk daftar dari agent.",
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
    "{agent} tidak dapat menyelesaikan tugas. {details}\nCoba /new atau jalankan `npx caraka doctor` di komputer.",
  "start.notice": "Caraka aktif di {host}. Workspace {workspace}, versi {version}.",
  "policy.readOnly":
    '⛔ Ditolak: {tool}{target}\nPercakapan ini read-only, jadi tidak ada tulis dan tidak ada perintah yang berjalan di sini. Untuk mengizinkannya, tambahkan "{container}": assisted di bawah {channel}.modes pada config.yaml lalu mulai ulang. Sebuah ruang tetap read-only sampai ada yang memilihnya masuk.',
  "policy.noSeam":
    "⛔ Tidak dijalankan. Route workspace ini memutuskan izin sendiri dan tidak pernah bertanya ke Caraka, jadi read-only tidak punya tempat untuk menolak tulis. Kirim tugasnya dari pesan langsung dengan bot, atau beri workspace ini `driver: acp` di config.yaml.",
  "policy.noTrust":
    "⛔ Tidak ada jendela yang dibuka. Percakapan ini read-only, sedangkan jendela trust berlaku untuk seluruh workspace, termasuk percakapan yang bukan read-only. Kirim /yolo dari pesan langsung dengan bot, atau masukkan percakapan ini dulu di bawah {channel}.modes pada config.yaml.",
  "trust.needDuration": "Tulis durasinya, misalnya /yolo 30m. Paling lama 60 menit.",
  "trust.tooLong": "Jendela trust paling lama 60 menit.",
  "trust.needButtons":
    "Jendela trust dikonfirmasi dengan menekan tombol, dan channel ini tidak punya tombol. Bukalah dari terminal: `caraka trust <workspace> --for 30m`.",
  "trust.alreadyOpen":
    "Jendela trust sudah terbuka. Tutup dengan /lock lalu buka yang baru; keduanya tercatat.",
  "trust.card":
    "Buka jendela trust Caraka selama {minutes} menit di {workspace} ({path})?\nCaraka tetap menerima setiap permintaan izin, tetap berhenti pada daftar berisiko tinggi, dan tetap mencatat tiap aksi. Tekan tombol untuk konfirmasi; teks chat tidak bisa membukanya.",
  "trust.opened": "Jendela trust terbuka {minutes} menit. Tutup kapan saja dengan /lock.",
  "trust.closed": "Jendela trust ditutup.",
  "trust.closedAll":
    "Chat ini tidak menyebut satu workspace, jadi setiap jendela trust yang terbuka ditutup ({n}). Jendela dibuka lagi dengan /yolo dari percakapan yang menyebut workspace-nya, atau dari terminal dengan `caraka trust`.",
  "trust.notOpen": "Tidak ada jendela trust yang terbuka.",
  "group.pairing":
    "Caraka ditambahkan ke grup Telegram {title} ({chatId}). Memasukkan grup ke allowlist berarti memilih untuk memperlihatkan pekerjaan itu kepada anggotanya: setiap anggota melihat kartu approval, path berkas, diff, dan keluaran perintah, dan menu perintah Caraka beserta deskripsinya muncul di menu tiap anggota. Tekan tombol untuk mengizinkannya.",
  "group.paired": "{title} masuk allowlist chat.",
  "group.ready":
    "Cara kerjanya di sini\n\nDi grup, Telegram hanya mengirimkan tiga jenis pesan kepada saya, karena privacy mode menyala:\n· perintah yang ditujukan ke saya, seperti /new@{bot}\n· balasan atas pesan saya sendiri\n· service message\n\nPesan biasa di grup ini tidak pernah sampai ke saya. Itu Telegram, bukan kerusakan.\n\nTopic: {topics}\n\nAgar saya membaca semua pesan, matikan privacy mode di @BotFather, atau jadikan saya admin — bot admin menerima semua pesan. Caraka tidak pernah memintanya.",
  "group.readyAll":
    "Cara kerjanya di sini\n\nPrivacy mode saya di grup ini tidak aktif, jadi Telegram mengirimkan setiap pesan di grup ini kepada saya. Saya menjawab yang ditujukan ke saya:\n· pesan yang menyebut @{bot}, termasuk perintah seperti /new@{bot}\n· balasan atas pesan saya sendiri\n\nSisanya saya baca lalu biarkan: tidak ada sesi yang dibuka, dan tidak ada yang sampai ke coding agent.\n\nTopic: {topics}\n\nAgar Telegram mengirim lebih sedikit, aktifkan lagi privacy mode di @BotFather dan lepas hak admin saya.",
  "group.topicsOn": "aktif. Tiap sesi mendapat topic sendiri di sini.",
  "group.topicsOff":
    "tidak aktif. Grup ini bukan forum, atau saya bukan admin dengan can_manage_topics — sesi berjalan linear dengan header. Memberi hak itu menjadikan saya admin, dan bot admin membaca setiap pesan di grup. Itu pertukarannya.",
  "channel.empty": "(Agent tidak mengirim teks.)",
  "channel.unreachable": "{channel} {method} tidak dapat dihubungi.",
  "channel.refused": "{channel} menolak {method}.",
  "channel.startFailed": "{channel} tidak dapat dimulai, jadi tidak ada yang dijalankan. {message}",
  "session.threadsOff":
    "Thread tidak tersedia di sini, jadi sesi berjalan linear dengan header. Arsipkan thread lama, atau berikan hak membuatnya, lalu jalankan `npx caraka doctor` untuk memeriksanya lagi.",
  "discord.pairing":
    "Caraka bisa melihat {title} ({chatId}). Memasukkan sebuah channel Discord ke allowlist berarti memilih untuk memperlihatkan pekerjaan itu kepada semua yang dapat membacanya: setiap anggota melihat kartu approval, path berkas, diff, dan keluaran perintah. Role tidak mengubah satu pun dari itu, dan role tidak pernah menyetujui apa pun. Tekan tombol untuk mengizinkannya.",
  "discord.ready":
    "Cara kerjanya di sini\n\nSaya tidak meminta intent istimewa apa pun ke Discord, jadi teks pesan biasa tidak pernah sampai ke saya. Itu izin yang memang tidak saya minta, bukan kerusakan.\n\nYang sampai ke saya:\n\u00b7 slash command, misalnya /new\n\u00b7 tombol pada kartu yang saya kirim\n\nThread: {topics}\n\nBalasan masuk ke thread sesi; perintah dijawab di channel ini.",
  "discord.threadsOn": "aktif. Tiap sesi mendapat thread sendiri di sini.",
  "discord.threadsOff":
    "tidak aktif. Ini pesan langsung, dan pesan langsung tidak punya thread, jadi sesi berjalan linear dengan header.",
  "discord.asFile":
    "Jawabannya lebih panjang daripada yang bisa dibawa satu pesan Discord, jadi dilampirkan.",
  "discord.acknowledged":
    "Caraka sudah menerimanya. Kalau tidak ada balasan sesudah ini, akunmu atau channel ini tidak ada di allowlist Caraka. Minta yang menjalankannya untuk menambahkanmu.",
  "discord.fatalClose":
    "Discord menutup gateway dengan kode {code} dan akan menutupnya lagi, jadi Caraka berhenti alih-alih mencoba ulang. Periksa token bot dan undangannya di Discord developer portal, lalu jalankan lagi.",
  "whatsapp.noGroups":
    "Caraka tidak berjalan di grup WhatsApp. Pesan grup menyebut grup itu sendiri sebagai pengirim, jadi setiap anggota akan menyetir agent sebagai satu orang dan setiap anggota membaca kode approval. Hanya percakapan satu lawan satu dengan nomor di allowlist whatsapp yang sampai ke Caraka.",
  "whatsapp.ready":
    "Cara kerjanya di sini\n\nSesi berjalan berurutan di percakapan ini, dengan header seperti [ws · #4f2a] di depan tiap balasan, karena WhatsApp tidak punya thread.\n\nApproval di sini tidak pakai tombol. Kartunya membawa satu kode, dan hanya balasan `ok <kode>` atau `no <kode>` dari kamu yang memutuskannya — kodenya ada di kartu itu dan tidak di tempat lain.",
  "whatsapp.asFile":
    "Jawabannya lebih panjang daripada empat pesan, jadi dilampirkan sebagai berkas.",
  "whatsapp.noThreads": "WhatsApp tidak punya thread, jadi sesi tidak bisa diberi satu.",
  "whatsapp.notStarted": "Channel WhatsApp belum dimulai.",
  "whatsapp.firstContact":
    "Caraka tidak pernah menulis ke nomor yang belum pernah menulis lebih dulu. Kirim satu pesan dari nomor itu, atau masukkan ke allowlist whatsapp.",
  "whatsapp.baileysMissing":
    "Provider baileys butuh modulnya, dan modul itu belum terpasang. Jalankan `{install}`, lalu mulai Caraka lagi. Ia peer dependency opsional dengan sengaja: pemasangan yang hanya memakai Telegram tidak pernah mengunduhnya.",
  "whatsapp.loggedOut":
    "WhatsApp mengeluarkan perangkat ini, jadi Caraka berhenti alih-alih menyambung ulang — sambung ulang berulang sesudah logout adalah pola yang dilaporkan menghilangkan akun. Hapus `~/.caraka/secrets/whatsapp/` lalu jalankan Caraka lagi untuk menautkan perangkat dari awal.",
  "whatsapp.gaveUp":
    "WhatsApp tidak kembali sesudah {attempts} percobaan, jadi Caraka berhenti mencoba. Baca https://github.com/CarakaDev/caraka/blob/main/docs/troubleshooting.md, lalu jalankan lagi setelah koneksinya pulih.",
  "whatsapp.pairingCode":
    "\nPerangkat ini belum tertaut. Di ponsel, buka WhatsApp → Perangkat tertaut → Tautkan dengan nomor telepon, lalu ketik:\n{code}\n",
  "whatsapp.pairingNoNumber":
    '\nPerangkat ini belum tertaut, dan penautan butuh nomor yang akan dipakai Caraka. Tulis `number: "628…"` di blok whatsapp pada config.yaml — nomor yang terpisah dari nomor pribadi — lalu jalankan Caraka lagi.\n',
  "whatsapp.webhookExposed":
    "\n════════════════════════════════════════════════════════════\n⚠  Webhook WhatsApp akan mendengarkan di {host}:{port}, bukan\n   127.0.0.1. Setiap request tetap diperiksa terhadap\n   X-Hub-Signature-256, dan selain itu alamat tersebut tidak\n   terlindungi. Pasang reverse proxy ber-TLS di depannya.\n════════════════════════════════════════════════════════════\n",
  "whatsapp.riskNotice":
    "\n⚠  Provider WhatsApp: baileys. Ini masuk sebagai perangkat tertaut pada akun\n   sungguhan, dan akun itu bisa diblokir karenanya. Pakai nomor yang terpisah\n   dari nomor pribadi, dan baca apa yang diketahui tentang seberapa seringnya:\n   https://github.com/CarakaDev/caraka/blob/main/docs/whatsapp-risiko.md\n",
  "acp.start":
    "Adapter ACP tidak dapat dimulai: perintahnya gagal dijalankan, atau agent-nya tidak menjawab. Jalankan `claude auth login` kalau belum masuk, lalu jalankan Caraka lagi.",
  "acp.notStarted": "Claude ACP belum dimulai.",
  "preset.invalid": "Preset {file} tidak sah pada `{field}` dan dilewati.",
  "driver.noSession": "Driver CLI tidak mengenal sesi itu. Kirim /new untuk memulai lagi.",
  "driver.rolloutGone":
    "Agent tidak lagi menyimpan sesi ini, jadi giliran ini berjalan sebagai sesi baru. Ia tidak membawa giliran-giliran sebelumnya.",
  "driver.exit": "{command} berhenti dengan galat. {detail}",
  "driver.acpMissing":
    "Agent {agent}: perintah ACP `{command}` tidak ditemukan. Pasang dulu, atau setel `driver: cli` di bagian `workspace` config.yaml.",
  "driver.cliMissing":
    "Agent {agent}: preset-nya tidak punya perintah CLI. Pasang adapter ACP-nya, atau hapus `driver: cli` dari config.yaml.",
  "driver.none":
    "Agent {agent}: adapter ACP maupun perintah CLI tidak ditemukan. Pasang agent-nya, lalu jalankan `npx caraka doctor`.",
  "agents.none":
    "Tidak ada coding agent yang ditemukan: belum terpasang, tidak ada di PATH, atau yang ada di PATH tidak bisa dijalankan dari sini. Pasang salah satu (claude, codex, gemini, cline, cursor-agent, goose, amp), lalu jalankan `caraka doctor` untuk memastikan terdeteksi. Di Windows native, agent yang dipasang lewat `npm -g` tidak bisa dijalankan begini: pasang `.exe`-nya, atau jalankan Caraka lewat WSL2.",
  "cli.nodeVersion": "Node.js 22 atau lebih baru diperlukan.",
  "cli.gitMissing": "Git tidak ditemukan. Pasang Git, lalu jalankan init lagi.",
  "cli.workspaceMissing": "Workspace tidak ditemukan: {path}",
  "cli.workspaceArg": "Isi path setelah `--workspace`.",
  "cli.tokenPrompt": "Token bot Telegram dari @BotFather (tidak ditampilkan): ",
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
  "cli.pairSecret":
    "Siapa pun yang membuka tautan itu lebih dulu akan terpasang. Ia berlaku sekali, mati dalam lima menit, dan hanya itu yang memisahkan orang asing dari mesin ini — jangan diteruskan.",
  "fix.header": "\nDiperbaiki:",
  "fix.leftHeader": "\nDibiarkan, karena memperbaikinya butuh keputusan:",
  "fix.nothing": "\nTidak ada yang perlu diperbaiki: semua path milik Caraka ada di tempatnya.",
  "fix.madeDir": "  {path} — dibuat dengan mode 0700.",
  "fix.setMode": "  {path} — mode {before} → {after}. Sebelumnya terbaca di luar akun Anda.",
  "fix.clearedPid": "  {path} — dihapus. Gateway yang ditulis di dalamnya tidak berjalan.",
  "fix.keepsConfig":
    "  {path} — tidak terbaca, dan --fix tidak menulis konfigurasi maupun kredensial. Jalankan `caraka init`.",
  "fix.keepsWorkspace":
    "  {path} — workspace-nya hilang. Itu repositori Anda, jadi Caraka tidak membuatnya. Clone lagi, atau arahkan workspace.path ke lokasi barunya.",
  "fix.keepsAllowlist":
    "  {channel} — allowlist-nya kosong. Siapa yang boleh mengirim tugas adalah keputusan Anda, jadi --fix tidak mengisinya. Jalankan `caraka init` lagi.",
  "cli.uninstallRunning":
    "Caraka sedang berjalan (PID {pid}). Jalankan `caraka stop` dulu, lalu `caraka uninstall`.",
  "cli.uninstallNothing": "Tidak ada yang bisa dihapus: tidak ada berkas Caraka di bawah {root}.",
  "cli.uninstallRemoves": "\nIni dihapus, dan tidak bisa dibatalkan:",
  "cli.uninstallKeeps":
    "\nIni bukan milik Caraka untuk dihapus:\n  bot Telegram — ia tetap ada sampai Anda menghapusnya di @BotFather\n  semua berkas yang ditulis coding agent di workspace Anda, termasuk yang belum di-commit",
  "cli.uninstallConfirm": "\nKetik uninstall untuk mengonfirmasi: ",
  "cli.uninstallCancelled": "Tidak ada yang dihapus.",
  "cli.uninstallDone": "{count} path dihapus. Caraka hilang dari mesin ini.",
  "cli.languagePrompt": "Bahasa antarmuka [en/id] ({fallback}): ",
  "cli.memoryOffer":
    "\nMemori. Titen berjalan lokal di 127.0.0.1:8787 dan menyimpan apa yang Caraka amati. Pembacaan kembali masih kosong sampai Titen punya claim, dan di sini belum ada yang menulisnya. Rutenya butuh kunci: `titen bootstrap` mencetak satu, dan Caraka membacanya dari CARAKA_TITEN_API_KEY.\nPasang sekarang dengan `curl -fsSL https://titen.dev/install.sh | bash`? [y/N]: ",
  "cli.memoryLocal": "Provider memori: local (SQLite di database Caraka sendiri).",
  "cli.memoryTiten": "Provider memori: titen.",
  "cli.memoryInstallFailed": "Pemasangan Titen tidak selesai. Memori memakai local.",
  "cli.titenMissing":
    "Titen terpasang tetapi perintahnya tidak ditemukan di {dir} maupun di PATH. Memori memakai local.",
  "cli.titenStoreNoKey":
    "Store Titen sudah ada di {db} dan Caraka tidak memegang kuncinya. Buat satu dengan `titen key list --db {db}` untuk menemukan org-nya, lalu `titen key create --db {db} --org-id <id>`, dan taruh di CARAKA_TITEN_API_KEY. Sampai itu, memori memakai local.",
  "cli.titenNoKey":
    "Titen terpasang tetapi `titen bootstrap` tidak mencetak kunci API, jadi tidak ada yang bisa dipakai untuk autentikasi. Memori memakai local.",
  "cli.titenServe":
    "Titen terpasang dan kuncinya tersimpan. Tinggal satu perintah, dan ia butuh database itu:\n\n  titen serve --db {db}\n",
  "cli.titenLive": "Titen terpasang, kuncinya tersimpan, dan ia sudah menjawab.",
  "cli.ready": "\nSiap. Konfigurasi: {path}",
  "cli.stopped": "\nCaraka berhenti: {message}\n",
  "cli.unknownError": "kesalahan tidak dikenal",
  "cli.running": "Caraka aktif: {channels} → {agent} ({workspace})",
  "cli.allowlistEmpty": "Allowlist {channel} kosong. Jalankan `caraka init` lagi.",
  "cli.alreadyRunning": "Caraka sudah berjalan (PID {pid}). Hentikan dengan `caraka stop`.",
  "cli.notRunning": "Caraka tidak berjalan.",
  "cli.stopSent": "SIGTERM dikirim ke PID {pid}.",
  "cli.statusRunning": "Berjalan · PID {pid} · workspace {workspace} · channel {channels}",
  "cli.statusStopped": "Berhenti · workspace {workspace} · channel {channels}",
  "cli.trustUsage": "Tulis workspace dan durasi: caraka trust <workspace> --for 30m",
  "cli.trustNotWorkspace":
    "{path} bukan workspace di config.yaml, jadi tidak ada jendela yang dibuka. Workspace ditulis di config.yaml, dan perintah ini hanya membuka jendela pada salah satu dari:\n{list}",
  "cli.trustTooLong": "Jendela trust paling lama 60 menit.",
  "cli.trustOpened": "Jendela trust terbuka di {workspace} sampai {until}.",
  "cli.bypassOpened":
    "Mode bypassPermissions Claude menyala untuk {workspace} sampai {until}. Caraka tidak akan melihat keputusan izin di dalam jendela itu dan tidak akan mengaku telah mengauditnya.",
  "cli.serviceUsage": "Tulis salah satu: caraka service --print systemd|launchd|schtasks",
  "cli.servicePathMissing": "Tidak ada di disk: {path}",
  "cli.dashboardReady": "Dasbor: {url} — hanya baca. Ctrl-C menghentikannya.",
  "cli.dashboardNoDatabase":
    "Tidak ada database Caraka di {path}. Jalankan `caraka init` dulu; dasbor membaca berkas itu dan tidak pernah membuatnya.",
  "cli.dashboardPortBusy":
    "Port {port} sudah dipakai. Pilih yang lain dengan `caraka dashboard --port <n>`.",
  "cli.dashboardPortInvalid": "`--port` menerima angka 0 sampai 65535, bukan {port}.",
  "cli.dashboardFlagArg": "Isi nilai setelah `{flag}`.",
  "cli.dashboardExposed":
    "\n════════════════════════════════════════════════════════════\n⚠  Dasbor akan mendengarkan di {host}:{port}, bukan 127.0.0.1.\n   Siapa pun yang bisa mencapai alamat itu membaca setiap judul\n   sesi, baris audit, dan policy grant di mesin ini. Tidak ada\n   login dan tidak ada token.\n   Pakai Tailscale, WireGuard, atau SSH untuk akses jauh.\n════════════════════════════════════════════════════════════\n",
  "cli.help": "\nꦕꦫꦏ  caraka v{version}\n\n{body}\n",
  "dash.title": "Caraka",
  "dash.readOnly": "Hanya baca. Tidak ada di halaman ini yang mengubah apa pun.",
  "dash.renderedAt": "Dibaca pada {time}.",
  "dash.nav.sessions": "Sesi",
  "dash.nav.runs": "Run",
  "dash.nav.approvals": "Approval",
  "dash.nav.audit": "Audit",
  "dash.nav.policy": "Policy",
  "dash.nav.memory": "Memori",
  "dash.nav.beta": "Beta",
  "dash.empty": "Belum ada yang tercatat.",
  "dash.error": "Panel itu tidak dapat dibaca.",
  "dash.notFound": "Halaman itu tidak ada.",
  "dash.methodNotAllowed": "Dasbor hanya menjawab GET dan HEAD.",
  "dash.forbiddenHost":
    "Dasbor hanya menjawab alamatnya sendiri. Bukalah di http://127.0.0.1 dengan port tempat ia dijalankan.",
  "dash.runsDerived":
    "Dipasangkan dari baris audit run.start dan run.finish. Start tanpa pasangan sesudahnya ditampilkan berjalan, karena database tidak bisa membedakannya dari proses yang mati; start yang disusul start lain pada sesi sama terbaca interrupted.",
  "dash.approvalsReadOnly":
    "Approval dilakukan di chat, lewat tombol bertanda tangan sekali pakai. Halaman ini hanya melaporkan apa yang sudah diputuskan.",
  "dash.auditWindow": "Jendela {window}. Tambahkan ?since=1h, 24h, 7d atau all.",
  "dash.memoryElsewhere":
    "Provider memori {provider} menyimpan isinya di luar database ini, jadi tidak ada yang bisa ditampilkan di sini.",
  "dash.col.state": "State",
  "dash.col.status": "Status",
  "dash.col.title": "Judul",
  "dash.col.workspace": "Workspace",
  "dash.col.agent": "Agent",
  "dash.col.principal": "Principal",
  "dash.col.updated": "Diperbarui",
  "dash.col.session": "Sesi",
  "dash.col.started": "Mulai",
  "dash.col.duration": "Durasi",
  "dash.col.id": "Id",
  "dash.col.tool": "Tool call",
  "dash.col.expires": "Kedaluwarsa",
  "dash.col.time": "Waktu",
  "dash.col.action": "Aksi",
  "dash.col.result": "Hasil",
  "dash.col.details": "Detail",
  "dash.col.mode": "Mode",
  "dash.col.grantedBy": "Diberikan oleh",
  "dash.col.created": "Dibuat",
  "dash.col.scope": "Scope",
  "dash.col.kind": "Jenis",
  "dash.col.text": "Teks",
  "dash.status.waiting": "menunggu",
  "dash.status.allowed": "diizinkan",
  "dash.status.rejected": "ditolak",
  "dash.status.expired": "kedaluwarsa",
  "dash.status.open": "terbuka",
  "dash.status.closed": "tertutup",
  "dash.beta.setup": "Waktu setup",
  "dash.beta.setupValue": "{seconds} detik dari start pertama sampai pesan pertama.",
  "dash.beta.setupUnknown":
    "Tidak diketahui. Database ini tidak punya baris gateway.start sebelum pesan pertamanya, dan begitulah bentuk database yang dibuat sebelum v0.5.",
  "dash.beta.activation": "Aktivasi",
  "dash.beta.yes": "ya",
  "dash.beta.no": "tidak",
  "dash.beta.proxy":
    "Aktivasi membaca aksi audit run.finish ber-result end_turn sebagai proksi untuk pesan yang berhasil, dalam 24 jam sejak gateway.start paling awal.",
  "dash.beta.share": "Bagikan angka ini",
  "dash.beta.shareNote":
    "Tidak ada yang dikirim dari sini. Caraka tidak punya telemetri keluar; menyalin baris ini satu-satunya cara ia berpindah.",
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
