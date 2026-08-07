// Documentation-page copy follows the shipped v0.2 implementation and docs/.
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
    intro: 'A Telegram topic maps to one persisted ACP session. When topic mode is unavailable or createForumTopic fails, the same task runs in linear mode with a workspace and session header.',
    // comp:219-233 lists nine chat commands. Eight are registered, and they are
    // these: `gatewayCommands` in src/channels/telegram.ts:55-64, sent through
    // setMyCommands per allowlisted chat. A slash command outside that list is
    // refused once Claude has reported its own, and forwarded before then.
    rows: [
      { k: '(ordinary message)', v: 'Creates or resumes the session for this Telegram thread and sends the text to Claude unchanged.' },
      { k: '/new', v: 'Create a fresh local session and, where topics are available, a new topic for it.' },
      { k: '/stop', v: 'Send session/cancel for the active Claude prompt.' },
      { k: '/status', v: 'Show idle, running, awaiting_approval, done, failed, or cancelled.' },
      { k: '/commands', v: 'List the slash commands Claude reported for this session, or say it has reported none yet.' },
      { k: '/usage', v: 'Report the context and cost from Claude’s last usage update, or say none has arrived.' },
      { k: '/yolo <duration>', v: 'Offer a trust window for this workspace. The duration is mandatory, sixty minutes is the ceiling, and a signed button opens it.' },
      { k: '/lock', v: 'Close the trust window now.' },
      { k: '/help', v: 'Show the command list.' },
      { k: 'restart', v: 'Load the stored Claude ACP session before the next prompt, and close any trust window the last process left open.' },
    ],
    // comp:233 has no equivalent; the v0.1 note it replaced said groups were
    // outside the release. `config.telegram.allowChats` admits them now.
    note: 'Tasks run one at a time; past 20 messages a minute the rest are queued, and a run is cancelled at 30 minutes. A group is served once its chat id reaches the chat allowlist. Multiple workspaces are still outside this release.',
  },
  {
    no: '03', id: 'agent', href: '#agent', label: 'Agent', title: 'Claude over ACP',
    intro: 'Caraka starts the official Claude ACP adapter as a subprocess. Claude owns the model, tools, sandbox, authentication, and repository context.',
    cards: [
      { tag: 'SHIPPED · ACP v1', tone: '#FF7A5E', title: 'Official adapter', body: '@agentclientprotocol/sdk 1.3.0 and claude-agent-acp 0.63.0 are pinned runtime dependencies.', bg: '#12100F', border: '#2B1612', range: r(0, 4, 26) },
      { tag: 'SESSION', tone: '#8EEE98', title: 'New and load', body: 'Each Telegram route stores the ACP session id. A missing old session is replaced without breaking the chat route.', bg: '#0C1116', border: '#171C22', range: r(1, 4, 26) },
      { tag: 'NOT IN v0.2', tone: '#7A848F', title: 'Other coding agents', body: 'CLI presets, MCP inbox, switching agents, and multi-workspace routing remain roadmap work.', bg: '#0C1116', border: '#171C22', range: r(2, 4, 26) },
    ],
    note: 'No model abstraction or agent loop exists in Caraka. ACP transports prompts, updates, permission requests, and cancellation.',
  },
  {
    no: '04', id: 'approval', href: '#approval', label: 'Approval', title: 'Signed approvals',
    intro: 'Claude ACP permission requests become Telegram buttons. Ordinary text is never interpreted as approval.',
    // comp:245-256 names read-only, assisted and trusted as chat-selectable
    // modes. Only the trust window exists, and it is not a mode: see the row
    // below and `guardPermission` in src/core/security.ts:107-121.
    rows: [
      { k: 'allow', v: 'Only an ACP allow_once option is offered, and the button carries the option’s own name. An option that would leave standing permission behind is answered with reject_once instead.' },
      { k: 'reject', v: 'Select reject_once when available; otherwise cancel the permission request.' },
      { k: 'trust window', v: 'While one is open, an ordinary request is allowed once, announced in the chat, and audited; a high-risk one keeps its buttons.' },
      { k: 'callback', v: 'Random id plus truncated HMAC, below Telegram’s 64-byte limit.' },
      { k: 'binding', v: 'Validated against Telegram principal, local session, ACP session, and tool-call record.' },
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
      { k: 'group pairing', v: 'A group arrives as my_chat_member and is confirmed in the operator’s DM, never in the group. Privacy mode stays on and group admin is never requested.' },
      { k: 'group disclosure', v: 'Putting a group on the allowlist chooses to show that work to its members: every one of them sees the approval cards, paths, diffs, and command output.' },
      { k: 'secret files', v: '~/.caraka/secrets uses mode 0700; token and approval key use 0600.' },
      { k: 'scrubber', v: 'Runs before outbound Telegram text and audit details.' },
      { k: 'audit', v: 'SQLite triggers reject UPDATE and DELETE on audit rows.' },
      { k: 'network', v: 'Long-polling only. No webhook or listener port.' },
      { k: 'output', v: 'Rich Message first, scrubbed plain-text fallback.' },
    ],
    note: 'The audit stores prompt length and hash, not the raw private prompt.',
  },
  {
    no: '06', id: 'config', href: '#config', label: 'Config', title: 'Configuration',
    intro: 'One validated YAML file names the workspace, bot, both allowlists, interface language, topic capability, and pinned Claude adapter. Secrets are separate.',
    // comp:272-290 shows a multi-workspace file with memory and mode keys. The
    // schema in src/config.ts:9-30 has neither. `language` and `allowChats`
    // arrived in v0.2; both are optional, so a v0.1 file still loads unchanged.
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
      { t: 'agent:', tone: '#FF7A5E' },
      { t: '  adapter: claude-agent-acp', tone: g },
      { t: '  adapterVersion: 0.63.0', tone: g },
    ],
    note: 'CARAKA_HOME changes the local data directory. CARAKA_TELEGRAM_TOKEN is available for controlled automation, but the interactive wizard is the safer default. The interface language, English or Indonesian, is asked once during init and never guessed from an incoming message.',
  },
  {
    no: '07', id: 'cli', href: '#cli', label: 'CLI', title: 'CLI reference',
    intro: 'v0.2 exposes seven commands. The small surface is deliberate.',
    // comp:292-303 lists eight verbs including pair, audit, ws and uninstall.
    // The router in src/cli.ts:434-445 answers these seven and nothing else.
    rows: [
      { k: 'npx caraka init [--workspace PATH]', v: 'Check prerequisites, choose the interface language, validate the bot, pair one Telegram principal, and write private config.' },
      { k: 'npx caraka doctor', v: 'Read-only checks for runtime, config, permissions, workspace, Claude, allowlist, Telegram, and topic capability.' },
      { k: 'npx caraka start', v: 'Run the long-polling Telegram-to-Claude gateway in the foreground.' },
      { k: 'npx caraka stop', v: 'Send SIGTERM to the PID the running gateway wrote to ~/.caraka/caraka.pid.' },
      { k: 'npx caraka status', v: 'Report whether the gateway runs, with its PID, workspace, and bot username. No token, and nothing anyone wrote in chat.' },
      { k: 'npx caraka trust <ws> --for 30m', v: 'Open a trust window from the terminal, sixty minutes at most. Adding --bypass hands the permission decisions to Claude itself, where Caraka cannot see them.' },
      { k: 'npx caraka service --print systemd|launchd|schtasks', v: 'Print one unit file to stdout.' },
      { k: 'npx caraka --version', v: 'Print the package version.' },
      { k: 'npm i -g caraka', v: 'Optional global install; use caraka instead of npx afterward.' },
    ],
    note: 'There is no doctor --fix, uninstall command, workspace manager, or audit CLI in v0.2. caraka service writes nothing and installs nothing: it prints a unit for you to save and load yourself, and the macOS one starts at login rather than at boot.',
  },
]
