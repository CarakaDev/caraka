// Install-page copy follows docs/install-guide.md and docs/install-with-ai.md.
// The layout stays aligned with design/mockups/Caraka Install.dc.html. That comp
// documents an install script and a pricing table that were never built, so this
// file already carries its own text; the comments below mark where v0.2 changed
// what that text can say.

import { r } from '../lib/anim'

const g = '#7A848F',
  d = '#5D666F',
  ok = '#8EEE98'

export const toc = [
  { no: '01', id: 'chain', href: '#chain', title: 'Requirements' },
  { no: '02', id: 'node', href: '#node', title: 'Node.js' },
  { no: '03', id: 'agent', href: '#agent', title: 'Claude & Telegram' },
  { no: '04', id: 'cost', href: '#cost', title: 'Init checks' },
  { no: '05', id: 'which', href: '#which', title: 'Install path' },
  { no: '06', id: 'script', href: '#script', title: 'AI install prompt' },
  { no: '07', id: 'verify', href: '#verify', title: 'Verify & run' },
]

export const chain = [
  { n: '1', title: 'Node.js 22 or newer', body: 'The runtime for Caraka and npx. Check it with node --version before starting.', range: r(0, 5, 28) },
  { n: '2', title: 'Git', body: 'Claude works inside the repository you choose. Caraka checks that Git is available before pairing.', range: r(1, 5, 28) },
  { n: '3', title: 'Claude Code, signed in', body: 'v0.2 connects to the official Claude ACP adapter. Run claude auth status to confirm access.', range: r(2, 5, 28) },
]

export const notNeeded = ['Docker', 'a cloud account', 'a domain', 'an open port', 'a webhook', 'a reverse proxy', 'a TLS certificate', 'a background service']

export const nodeRows = [
  { os: 'macOS', cmd: 'brew install node', range: r(0, 2, 24) },
  { os: 'macOS / Linux', cmd: 'curl -fsSL https://fnm.vercel.app/install | bash && fnm install 22', range: r(1, 2, 24) },
  { os: 'Ubuntu / Debian', cmd: 'curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs', range: r(2, 2, 24) },
  { os: 'Fedora', cmd: 'sudo dnf install nodejs22', range: r(3, 2, 24) },
  { os: 'Arch', cmd: 'sudo pacman -S nodejs npm', range: r(4, 2, 24) },
  { os: 'Windows', cmd: 'winget install OpenJS.NodeJS.LTS   # use PowerShell or WSL2', range: r(5, 2, 24) },
]

export const agents = [
  { name: 'Claude Code', pill: 'REQUIRED', pillBg: '#2B1612', pillInk: '#FF7A5E', bg: '#12100F', border: '#2B1612', install: 'npm install --global @anthropic-ai/claude-code', login: 'claude auth login', note: 'Caraka uses your existing Claude access. It does not ask for or store a model API key.', range: r(0, 4, 26) },
  { name: 'Telegram bot', pill: 'REQUIRED', pillBg: '#171C22', pillInk: '#B2BCC6', bg: '#0C1116', border: '#171C22', install: 'open @BotFather and send /newbot', login: 'keep the token out of chat and issues', note: 'The init wizard validates the token, then stores it in a mode-0600 secret file.', range: r(1, 4, 26) },
  { name: 'Topic mode', pill: 'OPTIONAL', pillBg: '#0E1F14', pillInk: '#8EEE98', bg: '#0C1116', border: '#171C22', install: 'enable topic mode for the bot in @BotFather', login: 'otherwise Caraka uses linear mode', note: 'A topic failure never blocks a task. Linear replies carry a workspace and session header.', range: r(2, 4, 26) },
]

export const prices = [
  { plan: 'Node', a: 'node --version', aTone: '#B2BCC6', b: 'v22+', bTone: ok, c: 'nodejs.org', cTone: '#FF7A5E', bg: '#0C1116', range: r(0, 2, 24) },
  { plan: 'Git', a: 'git --version', aTone: '#B2BCC6', b: 'found', bTone: ok, c: 'install Git', cTone: '#FF7A5E', bg: '#0C1116', range: r(1, 2, 24) },
  { plan: 'Claude', a: 'claude --version', aTone: '#B2BCC6', b: 'found', bTone: ok, c: 'npm install -g …', cTone: '#FF7A5E', bg: '#0C1116', range: r(2, 2, 24) },
  { plan: 'Auth', a: 'claude auth status', aTone: '#B2BCC6', b: 'logged in', bTone: ok, c: 'claude auth login', cTone: '#FF7A5E', bg: '#0C1116', range: r(3, 2, 24) },
  { plan: 'Telegram', a: 'getMe', aTone: '#B2BCC6', b: 'valid bot', bTone: ok, c: 'copy a new token', cTone: '#FF7A5E', bg: '#0C1116', range: r(4, 2, 24) },
  { plan: 'Identity', a: 'one-time deep link', aTone: '#B2BCC6', b: 'terminal approval', bTone: ok, c: 'run init again', cTone: '#FF7A5E', bg: '#12100F', range: r(5, 2, 24) },
]

export const costNotes = [
  { tag: 'NO MODEL KEY', tone: '#8EEE98', bg: '#12100F', border: '#2B1612', t: 'Claude keeps its own authentication, model, tools, and sandbox.', range: r(0, 3, 24) },
  { tag: 'NO LISTENER', tone: '#8EEE98', bg: '#0C1116', border: '#171C22', t: 'Telegram uses long-polling. Caraka does not bind a network port.', range: r(1, 3, 24) },
  { tag: 'PRIVATE TOKEN', tone: '#FFD67E', bg: '#0C1116', border: '#171C22', t: 'The bot token stays outside config.yaml in a mode-0600 file.', range: r(2, 3, 24) },
  { tag: 'ONE WORKSPACE', tone: '#7A848F', bg: '#0C1116', border: '#171C22', t: 'v0.2 deliberately supports one operator, bot, workspace, and Claude adapter.', range: r(3, 3, 24) },
  // Comp lines 364-369 hold four pricing notes the port replaced with what init
  // does. This fifth card is the language question v0.2 asks once at init
  // (src/cli.ts:141-148); the second sentence is what it deliberately does not
  // do (done/v02/spec.md §3.3).
  { tag: 'LANGUAGE ASKED ONCE', tone: '#7A848F', bg: '#0C1116', border: '#171C22', t: 'init asks for English or Indonesian and writes the answer to config.yaml. Caraka never picks a language from the text of a message.', range: r(4, 3, 24) },
]

export const paths = [
  { you: 'Fastest path, no global package', use: 'npx caraka init', chipBg: '#2B1612', chipInk: '#FF7A5E', border: '#2B1612', range: r(0, 2.4, 24) },
  { you: 'Use Caraka every day from PATH', use: 'npm i -g caraka', chipBg: '#171C22', chipInk: '#B2BCC6', border: '#171C22', range: r(1, 2.4, 24) },
  { you: 'Want Codex or Claude to help', use: 'copy the prompt below', chipBg: '#171C22', chipInk: '#B2BCC6', border: '#171C22', range: r(2, 2.4, 24) },
  { you: 'Choose a different repository', use: '--workspace PATH', chipBg: '#171C22', chipInk: '#B2BCC6', border: '#171C22', range: r(3, 2.4, 24) },
  { you: 'Already paired', use: 'npx caraka doctor', chipBg: '#171C22', chipInk: '#B2BCC6', border: '#171C22', range: r(4, 2.4, 24) },
]

export const agentPrompt = `Install Caraka for the repository in my current working directory.

Read https://github.com/CarakaDev/caraka first. Verify Node.js 22 or newer,
Git, Claude Code, and \`claude auth status\`. Fix only missing prerequisites
without changing my repository.

Never ask me to paste, reveal, or repeat the Telegram bot token in chat, command
output, logs, or a committed file. Tell me to create a bot with @BotFather, then
hand me this command to run myself in a local terminal:

  npx caraka init --workspace "$PWD"

After I confirm init is complete, run \`npx caraka doctor\`, explain failed
checks, and start it with \`npx caraka start\`. Do not enable a webhook, open a
port, install a service, or change Claude's model/provider configuration.`

export const scriptRules = [
  { t: 'The agent checks Node, Git, Claude Code, and Claude authentication first.', range: r(0, 2, 24) },
  { t: 'The Telegram token never enters the AI conversation or a committed file.', range: r(1, 2, 24) },
  { t: 'The user performs the private token step in the local init wizard.', range: r(2, 2, 24) },
  { t: 'The agent may continue with doctor after pairing is complete.', range: r(3, 2, 24) },
  { t: 'No webhook or listening port is enabled.', range: r(4, 2, 24) },
  // Was "No background service is promised by v0.1", which v0.2 makes false:
  // `caraka service --print` exists (src/service.ts). What stays true is that
  // nothing installs it — no file is written and the package has no
  // postinstall hook (AC-5.1, AC-5.9).
  { t: 'The agent installs no service. caraka service --print writes a unit to stdout for you to install yourself.', range: r(5, 2, 24) },
  { t: 'Claude keeps its current model and provider configuration.', range: r(6, 2, 24) },
  { t: 'Repository files are not changed by the installer.', range: r(7, 2, 24) },
]

export const verifyLines = [
  { t: '$ npx caraka doctor', tone: d, range: r(0, 2, 24) },
  { t: '', tone: d, range: r(1, 2, 24) },
  { t: 'Node.js · ready', tone: g, mark: '✓', markTone: ok, range: r(2, 2, 24) },
  { t: 'Git · ready', tone: g, mark: '✓', markTone: ok, range: r(3, 2, 24) },
  { t: 'Claude login · ready', tone: g, mark: '✓', markTone: ok, range: r(4, 2, 24) },
  { t: 'Telegram · ready', tone: g, mark: '✓', markTone: ok, range: r(5, 2, 24) },
  { t: 'Allowlist · ready', tone: g, mark: '✓', markTone: ok, range: r(6, 2, 24) },
  { t: '', tone: d, range: r(7, 2, 24) },
  { t: '$ npx caraka start', tone: '#FF7A5E', range: r(8, 2, 24) },
  { t: 'Ctrl-C stops it here; npx caraka stop ends one started elsewhere', tone: d, range: r(9, 2, 24) },
  // Three lines the comp has no counterpart for (its transcript, lines 390-401,
  // ends on `caraka doctor --fix` and `caraka uninstall`, neither of which
  // exists). `service` prints and returns; the macOS caveat is the honest
  // reading of a per-user LaunchAgent (src/service.ts:74-86).
  { t: '', tone: d, range: r(10, 2, 24) },
  { t: '$ npx caraka service --print systemd', tone: '#FF7A5E', range: r(11, 2, 24) },
  { t: 'prints a unit and writes nothing; the macOS agent starts at login, not at boot', tone: d, range: r(12, 2, 24) },
] as { t: string; tone: string; mark?: string; markTone?: string; range: string }[]
