// Documentation-page copy follows the shipped v0.1 implementation and docs/.

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
    rows: [
      { k: '(ordinary message)', v: 'Creates or resumes the session for this Telegram thread and sends the text to Claude unchanged.' },
      { k: '/new', v: 'Create a fresh local session and, when available, a new private-chat topic.' },
      { k: '/stop', v: 'Send session/cancel for the active Claude prompt.' },
      { k: '/status', v: 'Show idle, running, awaiting_approval, done, failed, or cancelled.' },
      { k: '/help', v: 'Show the command list.' },
      { k: 'restart', v: 'Load the stored Claude ACP session before the next prompt.' },
    ],
    note: 'v0.1 serialises tasks for its one operator. Groups and multiple workspaces are outside this release.',
  },
  {
    no: '03', id: 'agent', href: '#agent', label: 'Agent', title: 'Claude over ACP',
    intro: 'Caraka starts the official Claude ACP adapter as a subprocess. Claude owns the model, tools, sandbox, authentication, and repository context.',
    cards: [
      { tag: 'SHIPPED · ACP v1', tone: '#FF7A5E', title: 'Official adapter', body: '@agentclientprotocol/sdk 1.3.0 and claude-agent-acp 0.63.0 are pinned runtime dependencies.', bg: '#12100F', border: '#2B1612', range: r(0, 4, 26) },
      { tag: 'SESSION', tone: '#8EEE98', title: 'New and load', body: 'Each Telegram route stores the ACP session id. A missing old session is replaced without breaking the chat route.', bg: '#0C1116', border: '#171C22', range: r(1, 4, 26) },
      { tag: 'NOT IN v0.1', tone: '#7A848F', title: 'Other coding agents', body: 'CLI presets, MCP inbox, switching agents, and multi-workspace routing remain roadmap work.', bg: '#0C1116', border: '#171C22', range: r(2, 4, 26) },
    ],
    note: 'No model abstraction or agent loop exists in Caraka. ACP transports prompts, updates, permission requests, and cancellation.',
  },
  {
    no: '04', id: 'approval', href: '#approval', label: 'Approval', title: 'Signed approvals',
    intro: 'Claude ACP permission requests become Telegram buttons. Ordinary text is never interpreted as approval.',
    rows: [
      { k: 'allow', v: 'Only an ACP allow_once option is offered in Telegram.' },
      { k: 'reject', v: 'Select reject_once when available; otherwise cancel the permission request.' },
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
    rows: [
      { k: 'private DM', v: 'Non-private updates are rejected.' },
      { k: 'allowlist', v: 'The gateway refuses to start with no approved Telegram principal.' },
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
    intro: 'One validated YAML file names the workspace, bot, allowlist, topic capability, and pinned Claude adapter. Secrets are separate.',
    term: [
      { t: 'version: 1', tone: '#FF7A5E' },
      { t: 'workspace:', tone: '#FF7A5E' },
      { t: '  name: toko-api', tone: '#B2BCC6' },
      { t: '  path: /home/user/dev/toko-api', tone: g },
      { t: 'telegram:', tone: '#FF7A5E' },
      { t: '  botUsername: toko_caraka_bot', tone: '#B2BCC6' },
      { t: '  allowFrom: ["88123456"]', tone: g },
      { t: '  topics: true', tone: g },
      { t: 'agent:', tone: '#FF7A5E' },
      { t: '  adapter: claude-agent-acp', tone: g },
      { t: '  adapterVersion: 0.63.0', tone: g },
    ],
    note: 'CARAKA_HOME changes the local data directory. CARAKA_TELEGRAM_TOKEN is available for controlled automation, but the interactive wizard is the safer default.',
  },
  {
    no: '07', id: 'cli', href: '#cli', label: 'CLI', title: 'CLI reference',
    intro: 'v0.1 exposes three commands. The small surface is deliberate.',
    rows: [
      { k: 'npx caraka init [--workspace PATH]', v: 'Check prerequisites, validate the bot, pair one Telegram principal, and write private config.' },
      { k: 'npx caraka doctor', v: 'Read-only checks for runtime, config, permissions, workspace, Claude, allowlist, and Telegram.' },
      { k: 'npx caraka start', v: 'Run the long-polling Telegram-to-Claude gateway in the foreground.' },
      { k: 'npx caraka --version', v: 'Print the package version.' },
      { k: 'npm i -g caraka', v: 'Optional global install; use caraka instead of npx afterward.' },
    ],
    note: 'There is no doctor --fix, service manager, uninstall command, trust mode, workspace manager, or audit CLI in v0.1.',
  },
]
