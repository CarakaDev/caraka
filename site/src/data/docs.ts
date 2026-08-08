// Documentation-page copy follows the shipped v0.5 implementation and docs/.
// design/mockups/Caraka Docs.dc.html decides the layout and stopped deciding
// the content at v0.1: its chapter 05 is Memory, which does not ship, and its
// row lists name commands that were never built. Where a line here contradicts
// the comp, the note above it says which comp line and why.

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
    intro: 'A Telegram topic or a Discord thread maps to one persisted agent session. Where threads are unavailable, or creating one fails, the same task runs in linear mode with a workspace and session header.',
    // comp:219-233 lists nine chat commands. Thirteen are registered, and they
    // are these: `gatewayCommands` in src/core/channel.ts, sent through
    // setMyCommands on Telegram and registered as application commands on
    // Discord. A slash command outside that list is refused once the agent has
    // reported its own, and forwarded before then.
    rows: [
      { k: '(ordinary message)', v: 'Creates or resumes the session for this Telegram thread and sends the text to Claude unchanged.' },
      { k: '/new', v: 'Create a fresh local session and, where topics are available, a new topic for it.' },
      { k: '/stop', v: 'Send session/cancel for the active Claude prompt.' },
      { k: '/status', v: 'Show idle, running, awaiting_approval, done, failed, or cancelled.' },
      { k: '/ws', v: 'List the configured workspaces and their paths, answering in General.' },
      { k: '/switch <preset>', v: 'Rebind this session to another loaded agent preset from its next task on.' },
      { k: '/commands', v: 'List the slash commands Claude reported for this session, or say it has reported none yet.' },
      { k: '/usage', v: 'Report the context and cost from the agent’s last usage update, or say none has arrived.' },
      { k: '/ingat <note>', v: 'Save a note to memory for this workspace, or say memory is off.' },
      { k: '/lupakan <id>', v: 'Delete one memory item by its id.' },
      { k: '/memori', v: 'List what memory currently holds for this workspace.' },
      { k: '/yolo <duration>', v: 'Offer a trust window for this workspace. The duration is mandatory, sixty minutes is the ceiling, and a signed button opens it.' },
      { k: '/lock', v: 'Close the trust window now.' },
      { k: '/help', v: 'Show the command list.' },
      { k: 'restart', v: 'Load the stored ACP session before the next prompt, and close any trust window the last process left open. A CLI-route session starts a fresh agent thread instead: its id lives in process memory.' },
    ],
    // comp:233 has no equivalent; the v0.1 note it replaced said groups were
    // outside the release. The chat allowlist admits them now, and v0.4 made
    // the multi-workspace sentence false.
    note: 'One run at a time per workspace and the rest queued FIFO; past 20 messages a minute the sender waits, and a run is cancelled at 30 minutes. A group or guild channel is served once its id reaches the chat allowlist. More than one workspace is supported, and @slug in front of a message picks which.',
  },
  {
    no: '03', id: 'agent', href: '#agent', label: 'Agent', title: 'Claude over ACP',
    intro: 'Caraka starts the official Claude ACP adapter as a subprocess. Claude owns the model, tools, sandbox, authentication, and repository context.',
    cards: [
      { tag: 'SHIPPED · ACP v1', tone: '#FF7A5E', title: 'Official adapter', body: '@agentclientprotocol/sdk 1.3.0 and claude-agent-acp 0.63.0 are pinned runtime dependencies.', bg: '#12100F', border: '#2B1612', range: r(0, 4, 26) },
      { tag: 'SESSION', tone: '#8EEE98', title: 'New and load', body: 'Each chat route stores the ACP session id. A missing old session is replaced without breaking the route.', bg: '#0C1116', border: '#171C22', range: r(1, 4, 26) },
      { tag: 'CLI FALLBACK', tone: '#8EEE98', title: 'Seven presets, one YAML each', body: 'An agent without ACP is spawned from a preset in presets/agents/ and answers in one text update. The MCP inbox is still roadmap work.', bg: '#0C1116', border: '#171C22', range: r(2, 4, 26) },
    ],
    note: 'No model abstraction or agent loop exists in Caraka. ACP transports prompts, updates, permission requests, and cancellation.',
  },
  {
    no: '04', id: 'approval', href: '#approval', label: 'Approval', title: 'Signed approvals',
    intro: 'ACP permission requests become buttons on whichever channel asked. Ordinary text is never interpreted as approval.',
    // comp:245-256 names read-only, assisted and trusted as chat-selectable
    // modes. Only the trust window exists, and it is not a mode: see the row
    // below and `guardPermission` in src/core/security.ts:107-121.
    rows: [
      { k: 'allow', v: 'Only an ACP allow_once option is offered, and the button carries the option’s own name. An option that would leave standing permission behind is answered with reject_once instead.' },
      { k: 'reject', v: 'Select reject_once when available; otherwise cancel the permission request.' },
      { k: 'trust window', v: 'While one is open, an ordinary request is allowed once, announced in the chat, and audited; a high-risk one keeps its buttons.' },
      { k: 'callback', v: 'Random id plus truncated HMAC, 33 characters — inside Telegram’s 64-byte callback_data and inside Discord’s custom_id.' },
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
      { k: 'secret files', v: '~/.caraka/secrets uses mode 0700; token and approval key use 0600.' },
      { k: 'scrubber', v: 'Runs before every outbound message on every channel and before every audit detail. No CARAKA_ variable reaches an agent subprocess.' },
      { k: 'audit', v: 'SQLite triggers reject UPDATE and DELETE on audit rows.' },
      { k: 'network', v: 'No channel listens and there is no webhook. caraka dashboard is the one listener, on 127.0.0.1, GET only, with the database opened read-only.' },
      { k: 'output', v: 'Rich Message first on Telegram with a scrubbed plain-text fallback; plain markdown on Discord, and a .md attachment past three pieces.' },
    ],
    note: 'The audit stores prompt length and hash, not the raw private prompt.',
  },
  {
    no: '06', id: 'config', href: '#config', label: 'Config', title: 'Configuration',
    intro: 'One validated YAML file names the workspaces, the configured channels, their allowlists, the interface language, the memory provider, and the agent. Secrets are separate.',
    // comp:272-290 shows a multi-workspace file with memory and mode keys. The
    // workspaces list and the memory block arrived in v0.3 and v0.4, and the
    // discord block in v0.5. There is still no mode key: no policy-mode gate
    // exists on the run path. Every block is additive and version stays 1, so a
    // file written for an older release still loads unchanged.
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
      { t: 'agent:', tone: '#FF7A5E' },
      { t: '  adapter: claude-agent-acp', tone: g },
      { t: '  adapterVersion: 0.63.0', tone: g },
    ],
    note: 'CARAKA_HOME changes the local data directory. CARAKA_TELEGRAM_TOKEN and CARAKA_DISCORD_TOKEN are available for controlled automation, but the interactive wizard is the safer default, and neither variable is passed down to an agent subprocess. The interface language, English or Indonesian, is asked once during init and never guessed from an incoming message.',
  },
  {
    no: '07', id: 'cli', href: '#cli', label: 'CLI', title: 'CLI reference',
    intro: 'The command surface is small on purpose, and it grows one verb at a time.',
    // comp:292-303 lists eight verbs including pair, audit, ws and uninstall.
    // The router in src/cli.ts answers the verbs below and nothing else.
    rows: [
      { k: 'npx caraka init [--workspace PATH]', v: 'Check prerequisites, choose the interface language, validate the bot, pair one Telegram principal, and write private config.' },
      { k: 'npx caraka doctor', v: 'Read-only checks for runtime, config, permissions, workspace, Claude, allowlist, Telegram, and topic capability.' },
      { k: 'npx caraka start', v: 'Run the long-polling Telegram-to-Claude gateway in the foreground.' },
      { k: 'npx caraka stop', v: 'Send SIGTERM to the PID the running gateway wrote to ~/.caraka/caraka.pid.' },
      { k: 'npx caraka status', v: 'Report whether the gateway runs, with its PID, workspace, and bot username. No token, and nothing anyone wrote in chat.' },
      { k: 'npx caraka dashboard [--port n]', v: 'Serve a read-only page on 127.0.0.1:7718 that reads the same database the gateway writes: sessions, runs, approvals, audit, policy, memory. It answers GET only, and it works while the gateway is stopped.' },
      { k: 'npx caraka trust <ws> --for 30m', v: 'Open a trust window from the terminal, sixty minutes at most. Adding --bypass hands the permission decisions to Claude itself, where Caraka cannot see them.' },
      { k: 'npx caraka service --print systemd|launchd|schtasks', v: 'Print one unit file to stdout.' },
      { k: 'npx caraka --version', v: 'Print the package version.' },
      { k: 'npm i -g caraka', v: 'Optional global install; use caraka instead of npx afterward.' },
    ],
    note: 'There is no doctor --fix, uninstall command, workspace manager, or audit CLI. caraka service writes nothing and installs nothing: it prints a unit for you to save and load yourself, and the macOS one starts at login rather than at boot.',
  },
]
