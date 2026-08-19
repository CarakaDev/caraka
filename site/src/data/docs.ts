// Documentation-page copy follows the shipped v1.5 implementation and docs/.
// design/mockups/Caraka Docs.dc.html decides the layout and stopped deciding
// the content at v0.1: its chapter 05 is Memory, which arrived at v0.3 as a
// provider rather than a chapter, and its row lists name commands that were
// never built. Where a line here contradicts the comp, the note above it says
// which comp line and why.

import { r } from '../lib/anim'

const g = '#7A848F'
const d = '#5D666F'

interface TermLine {
  t: string
  tone: string
  mark?: string
  markTone?: string
}

interface Row {
  k: string
  v: string
}

interface Card {
  tag: string
  tone: string
  title: string
  body: string
  bg: string
  border: string
  range: string
}

interface Chapter {
  no: string
  id: string
  href: string
  label: string
  title: string
  intro: string
  term?: TermLine[]
  rows?: Row[]
  cards?: Card[]
  note?: string
}

export const chapters: Chapter[] = [
  {
    no: '01', id: 'quickstart', href: '#quickstart', label: 'Quickstart', title: 'Quickstart',
    intro: 'Install from the repository you want Claude to work in. The wizard checks local prerequisites, validates the Telegram bot, then pairs one private operator.',
    term: [
      { t: '$ claude auth status', tone: d },
      { t: '$ npx caraka init', tone: d },
      { t: '', tone: d },
      { t: '  Workspace · current directory', tone: g, mark: '  ✓', markTone: '#8EEE98' },
      { t: '  Claude login · ready', tone: g, mark: '  ✓', markTone: '#8EEE98' },
      { t: '  Telegram · paired', tone: g, mark: '  ✓', markTone: '#8EEE98' },
      { t: '  Secrets · mode 0600', tone: g, mark: '  ✓', markTone: '#8EEE98' },
      { t: '', tone: d },
      { t: '$ npx caraka doctor', tone: '#B2BCC6' },
      { t: '$ npx caraka start', tone: '#FF7A5E' },
    ],
    note: 'The token is entered in the terminal, never in config.yaml or an AI chat. Start keeps the gateway in the foreground until Ctrl-C.',
  },
  {
    no: '02', id: 'sessions', href: '#sessions', label: 'Sessions', title: 'Sessions & topics',
    intro: 'A Telegram topic or a Discord thread maps to one persisted agent session. Where threads are unavailable — a failed creation, or WhatsApp, which has none — the same task runs in linear mode behind a workspace and session header.',
    // comp:219-233 lists nine chat commands. Fourteen are registered, and they
    // are these: `gatewayCommands` in src/core/channel.ts, sent through
    // setMyCommands on Telegram and registered as application commands on
    // Discord. A slash command outside that list is refused once the agent has
    // reported its own, and forwarded before then.
    rows: [
      { k: '(ordinary message)', v: 'Creates or resumes the session for this thread or conversation and sends the text to the agent unchanged.' },
      { k: '/new [title] [@slug]', v: 'Create a fresh local session and, where topics are available, a new topic of the same name. Both parts are optional: the text becomes the session title, and @slug picks the workspace and sticks for the chat.' },
      { k: '/stop', v: 'Cancel the running task in the sender’s workspace.' },
      { k: '/status', v: 'Show idle, running, awaiting_approval, done, failed, or cancelled.' },
      { k: '/ws', v: 'List the configured workspaces and their paths, answering in General.' },
      { k: '/switch <preset>', v: 'Rebind this session to another loaded agent preset from its next task on.' },
      // Named Claude as fixed text until 19 August 2026, four releases after
      // the product strings stopped doing it. Issue #14 asked for a /skill
      // listing the agent's skills; on the ACP route the agent reports them
      // here as commands, so this row is the answer and it says so.
      { k: '/commands', v: 'List the slash commands the agent reported for this session, its skills among them on the ACP route, or say it has reported none yet. Caraka keeps no list of its own.' },
      { k: '/usage', v: 'Report the context and cost from the agent’s last usage update, or say none has arrived.' },
      { k: '/ingat <note>', v: 'Save a note to memory for this workspace, or say memory is off.' },
      { k: '/lupakan <id>', v: 'Delete one memory item by its id.' },
      { k: '/memori', v: 'List what memory currently holds for this workspace.' },
      { k: '/yolo <duration>', v: 'Offer a trust window for this workspace. The duration is mandatory, sixty minutes is the ceiling, and a signed button opens it.' },
      { k: '/lock', v: 'Close the trust window now.' },
      { k: '/close', v: 'Finish this session and close its topic, in that order, so the last thing in the topic explains why it ended. It refuses while a task is running and names /stop as the way through; nothing closes a topic on its own.' },
      { k: '/help', v: 'Explain how to work here, with examples. The answer in a room is a different one: it says what a room refuses, what everyone in it can read, and what the channel does and does not deliver.' },
      { k: 'restart', v: 'Load the stored ACP session before the next prompt, and close any trust window the last process left open. A CLI-route session starts a fresh agent thread instead: its id lives in process memory.' },
    ],
    // comp:233 has no equivalent; the v0.1 note it replaced said groups were
    // outside the release. The chat allowlist admits them now, and v0.4 made
    // the multi-workspace sentence false.
    note: 'One run at a time per workspace and the rest queued FIFO; past 20 messages a minute the sender waits, and a run is cancelled at 30 minutes. A group or guild channel is served once its id reaches the chat allowlist, and since v1.3 a message there becomes a task only when it addresses Caraka — a mention, a reply to one of its own messages, or a command — inside a session topic as well as outside one. A channel that cannot report addressing is answered rather than left silent. More than one workspace is supported, and @slug in front of a message picks which.',
  },
  {
    no: '03', id: 'agent', href: '#agent', label: 'Agent', title: 'Claude over ACP',
    intro: 'Caraka starts the official Claude ACP adapter as a subprocess. The agent owns the model, tools, sandbox, authentication, and repository context.',
    cards: [
      { tag: 'SHIPPED · ACP v1', tone: '#FF7A5E', title: 'Official adapter', body: '@agentclientprotocol/sdk 1.3.0 and claude-agent-acp 0.63.0 are pinned runtime dependencies.', bg: '#12100F', border: '#2B1612', range: r(0, 4, 26) },
      { tag: 'SESSION', tone: '#8EEE98', title: 'New and load', body: 'Each chat route stores the ACP session id. A missing old session is replaced without breaking the route.', bg: '#0C1116', border: '#171C22', range: r(1, 4, 26) },
      { tag: 'CLI FALLBACK', tone: '#8EEE98', title: 'Nine presets, one YAML each', body: 'An agent without ACP is spawned from a preset in presets/agents/ and answers in one text update. The MCP inbox is still roadmap work.', bg: '#0C1116', border: '#171C22', range: r(2, 4, 26) },
    ],
    note: 'No model abstraction or agent loop exists in Caraka. ACP transports prompts, updates, permission requests, and cancellation.',
  },
  {
    no: '04', id: 'approval', href: '#approval', label: 'Approval', title: 'Signed approvals',
    intro: 'ACP permission requests become a button on whichever channel has buttons, and a one-time code on the card where none exist. An ordinary word is never interpreted as approval.',
    // comp:245-256 names read-only, assisted and trusted as chat-selectable
    // modes. Only the trust window exists, and it is not a mode: see the row
    // below and `guardPermission` in src/core/security.ts:107-121.
    rows: [
      { k: 'allow', v: 'Only an ACP allow_once option is offered, and the button carries the option’s own name. An option that would leave standing permission behind is answered with reject_once instead.' },
      { k: 'reject', v: 'Select reject_once when available; otherwise cancel the permission request.' },
      { k: 'trust window', v: 'While one is open, an ordinary request is allowed once, announced in the chat, and audited; a high-risk one keeps its buttons.' },
      { k: 'callback', v: 'Random id plus truncated HMAC, 33 characters — inside Telegram’s 64-byte callback_data and inside Discord’s custom_id.' },
      { k: 'code', v: 'Where a channel has no buttons, four characters from randomBytes over a 32-symbol alphabet, stored on the approval row and printed on that card alone — never in an audit row, a log line, or a prompt. Replying ok or no with it spends it once. Five wrong codes close the route for that session, and a channel that has buttons is given no code.' },
      { k: 'binding', v: 'Validated against the channel principal, local session, ACP session, and tool-call record.' },
      { k: 'TTL', v: 'Expires after ten minutes.' },
      { k: 'replay', v: 'The database update succeeds once; later taps are rejected.' },
      { k: 'shutdown', v: 'Pending permission requests are cancelled before the adapter closes.' },
    ],
    note: 'The approval card shows the tool title and a scrubbed target or command when ACP supplies one.',
  },
  {
    no: '05', id: 'security', href: '#security', label: 'Security', title: 'Secrets & audit',
    intro: 'The bridge accepts untrusted chat input, so identity checks and scrubbing happen before Claude or disk receives data.',
    // The v0.1 line here read "Non-private updates are rejected", which the
    // group work made false: src/core/gateway.ts:161-165 checks the chat against
    // one allowlist and the sender against another, and serves only a message
    // that passes both. A channel is still refused whatever the lists say.
    rows: [
      { k: 'chat allowlist', v: 'A message is dropped unless its chat id is listed. Channel posts are never served.' },
      { k: 'sender allowlist', v: 'The gateway refuses to start empty, and a sender outside it is audited as denied wherever it wrote.' },
      { k: 'group pairing', v: 'A group or guild channel is confirmed in the operator’s DM, never in the room itself. Telegram privacy mode stays on, group admin is never requested, and Discord is never asked for the MESSAGE_CONTENT intent.' },
      { k: 'group disclosure', v: 'Putting a room on the allowlist chooses to show that work to everyone who can read it: every one of them sees the approval cards, paths, diffs, and command output. A Discord role changes none of it, and a role never approves anything.' },
      { k: 'policy mode', v: 'Read once per message, from the channel’s modes map and the kind of container the message arrived in, never from its text. A private conversation the map does not name is assisted; a room the map does not name is read-only, where a write or a command is refused before a card is drawn, /yolo opens no window, and a route that decides permissions itself is not run at all. A read carrying command, content, or an old_string/new_string pair counts as a write, and an unrecognised tool is refused rather than assumed harmless.' },
      { k: 'secret files', v: '~/.caraka/secrets uses mode 0700; every token and the approval key use 0600, and the Baileys auth state is a 0700 directory inside it.' },
      { k: 'scrubber', v: 'Runs before every outbound message on every channel and before every audit detail. No CARAKA_ variable reaches an agent subprocess.' },
      { k: 'audit', v: 'SQLite triggers reject UPDATE and DELETE on audit rows.' },
      { k: 'network', v: 'Nothing is opened to the internet. Two listeners exist and both bind 127.0.0.1: caraka dashboard, GET only with the database read-only, and the WhatsApp Cloud API webhook, which verifies X-Hub-Signature-256 in constant time even on loopback.' },
      { k: 'output', v: 'Rich Message first on Telegram with a scrubbed plain-text fallback; plain markdown on Discord and WhatsApp, and a .md attachment past three pieces on both.' },
    ],
    note: 'The audit stores prompt length and hash, not the raw private prompt.',
  },
  {
    no: '06', id: 'config', href: '#config', label: 'Config', title: 'Configuration',
    intro: 'One validated YAML file names the workspaces, the configured channels, their allowlists, the interface language, the memory provider, and the agent. Secrets are separate.',
    // comp:272-290 shows a multi-workspace file with memory and mode keys. The
    // workspaces list and the memory block arrived in v0.3 and v0.4, the discord
    // block in v0.5, the whatsapp block in v0.6, and the mode key in v1.1 — as
    // `modes` inside a channel block rather than beside the workspace, because
    // what a conversation may do belongs to the conversation. Every block is
    // additive and version stays 1, so a file written for an older release
    // still loads, and one that names no mode gets the documented defaults.
    term: [
      { t: 'version: 1', tone: '#FF7A5E' },
      { t: 'language: en', tone: g },
      { t: 'workspace:', tone: '#FF7A5E' },
      { t: '  name: toko-api', tone: '#B2BCC6' },
      { t: '  path: /home/user/dev/toko-api', tone: g },
      { t: 'telegram:', tone: '#FF7A5E' },
      { t: '  botUsername: toko_caraka_bot', tone: '#B2BCC6' },
      { t: '  allowFrom: ["88123456"]', tone: g },
      { t: '  allowChats: ["88123456"]', tone: g },
      { t: '  topics: true', tone: g },
      { t: 'discord:              # optional', tone: '#FF7A5E' },
      { t: '  appId: "140000000000000000"', tone: '#B2BCC6' },
      { t: '  allowFrom: ["230000000000000000"]', tone: g },
      { t: '  allowChats: ["990000000000000000"]', tone: g },
      { t: '  modes:              # unnamed rooms stay read-only', tone: '#FF7A5E' },
      { t: '    "990000000000000000": assisted', tone: g },
      { t: 'whatsapp:             # optional', tone: '#FF7A5E' },
      { t: '  provider: cloud-api', tone: '#B2BCC6' },
      { t: '  phoneNumberId: "1500000000"', tone: g },
      { t: '  allowFrom: ["628123456789"]', tone: g },
      { t: 'agent:', tone: '#FF7A5E' },
      { t: '  adapter: claude-agent-acp', tone: g },
      { t: '  adapterVersion: 0.63.0', tone: g },
    ],
    note: 'CARAKA_HOME changes the local data directory, and it is what makes a second instance on one host possible: config, database, secrets, and the PID file all hang off it, so two gateways started without it collide on the PID of the first (issue #13). CARAKA_TELEGRAM_TOKEN, CARAKA_DISCORD_TOKEN, and the three CARAKA_WHATSAPP_ variables are available for controlled automation, but a 0600 file under ~/.caraka/secrets is the safer default, and no CARAKA_ variable is passed down to an agent subprocess. Choosing the baileys provider needs acknowledgeRisk: true written by hand, and start refuses without it. The interface language, English or Indonesian, is asked once during init and never guessed from an incoming message.',
  },
  {
    no: '07', id: 'cli', href: '#cli', label: 'CLI', title: 'CLI reference',
    intro: 'The command surface is small on purpose, and it grows one verb at a time.',
    // comp:292-303 lists eight verbs including pair, audit, ws and uninstall.
    // `uninstall` came back in v1.1; pair, audit, and ws are still not verbs.
    // The router in src/cli.ts answers the verbs below and nothing else.
    rows: [
      { k: 'npx caraka init [--workspace PATH]', v: 'Check prerequisites, choose the interface language, validate the bot, pair one Telegram principal over a deep link that works once and expires in five minutes, and write private config.' },
      { k: 'npx caraka doctor', v: 'Read-only checks for runtime, config, the workspace, the agents found on PATH, secret file modes, the allowlist of each configured channel, memory, and topic capability.' },
      { k: 'npx caraka doctor --fix', v: 'Repair the three kinds of drift install-flow.md writes a correct value for — a directory Caraka owns that is not 0700, a file it wrote that is not 0600, a PID file naming a process that is gone — then run the checks, so the rows report the state you are left with. An unreadable config, a missing workspace, and an empty allowlist are printed with the reason they were left alone.' },
      { k: 'npx caraka start', v: 'Run the gateway in the foreground for every channel the config names. It refuses while a live PID sits in the data directory, and the refusal names that directory, because two installations in two folders are one process to that check until CARAKA_HOME separates them.' },
      { k: 'npx caraka stop', v: 'Send SIGTERM to the PID the running gateway wrote to ~/.caraka/caraka.pid.' },
      { k: 'npx caraka status', v: 'Report whether the gateway runs, with its PID, workspace, and configured channels. No token, and nothing anyone wrote in chat.' },
      { k: 'npx caraka dashboard [--port n]', v: 'Serve a read-only page on 127.0.0.1:7718 that reads the same database the gateway writes: seven panels covering sessions, runs, approvals, audit, policy, memory, and the two beta numbers. It answers GET only, and it works while the gateway is stopped.' },
      { k: 'npx caraka trust <ws> --for 30m', v: 'Open a trust window from the terminal, sixty minutes at most. Adding --bypass hands the permission decisions to Claude itself, where Caraka cannot see them.' },
      { k: 'npx caraka uninstall', v: 'Delete the config, the database with both SQLite sidecars, the discovery cache, the PID file, and the secrets directory, after listing them and taking the word uninstall typed in full. A running gateway stops it before anything is removed. The Telegram bot and everything the coding agent wrote in your workspace are named as not Caraka’s to delete.' },
      { k: 'npx caraka service --print systemd|launchd|schtasks', v: 'Print one unit file to stdout.' },
      { k: 'npx caraka --version', v: 'Print the package version.' },
      { k: 'npm i -g caraka', v: 'Optional global install; use caraka instead of npx afterward.' },
    ],
    note: 'There is no workspace manager and no audit CLI. doctor --fix and uninstall are terminal-only and are registered as no chat command: one writes to disk and the other deletes an install, and neither is a stranger’s message to send. caraka service writes nothing and installs nothing: it prints a unit for you to save and load yourself, and the macOS one starts at login rather than at boot.',
  },
]
