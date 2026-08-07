// Content for the install page, transcribed from the renderVals() block of
// design/mockups/Caraka Install.dc.html. The mockup is the source of truth:
// nothing here is authored, reworded, or reordered.
//
// The mockup's own helper defaults to `r(i, step = 2.6, span = 24)` while the
// shared helper defaults to `r(i, step = 4, span = 30)`, so every call below
// spells out the span the mockup would have filled in. The strings produced are
// identical to the comp's.

import { r } from '../lib/anim'

const g = '#7A848F',
  d = '#5D666F',
  ok = '#8EEE98',
  no = '#5D666F'

export const toc = [
  { no: '01', id: 'chain', href: '#chain', title: 'Prerequisites' },
  { no: '02', id: 'node', href: '#node', title: 'No Node.js' },
  { no: '03', id: 'agent', href: '#agent', title: 'No agent' },
  { no: '04', id: 'cost', href: '#cost', title: 'Cost' },
  { no: '05', id: 'which', href: '#which', title: 'Which path' },
  { no: '06', id: 'script', href: '#script', title: 'install.sh' },
  { no: '07', id: 'verify', href: '#verify', title: 'Verify' },
]

export const chain = [
  { n: '1', title: 'Node.js 22 or newer', body: 'The runtime Caraka itself runs on. npx ships with it, so this is the only thing to solve before you start.', range: r(0, 5, 28) },
  { n: '2', title: 'A coding agent', body: 'The thing that actually writes the code. Caraka has none of its own, on purpose. Gemini CLI is free.', range: r(1, 5, 28) },
  { n: '3', title: 'Model access for that agent', body: 'A subscription or an API key, belonging to the agent rather than to Caraka. We never see it.', range: r(2, 5, 28) },
]

export const notNeeded = ['Docker', 'a database', 'a cloud account', 'a domain', 'an open port', 'a reverse proxy', 'a TLS certificate', 'a credit card']

export const nodeRows = [
  { os: 'macOS', cmd: 'brew install node', range: r(0, 2, 24) },
  { os: 'macOS / Linux', cmd: 'curl -fsSL https://fnm.vercel.app/install | bash && fnm install 22', range: r(1, 2, 24) },
  { os: 'Ubuntu / Debian', cmd: 'curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs', range: r(2, 2, 24) },
  { os: 'Fedora', cmd: 'sudo dnf install nodejs22', range: r(3, 2, 24) },
  { os: 'Arch', cmd: 'sudo pacman -S nodejs npm', range: r(4, 2, 24) },
  { os: 'Windows', cmd: 'winget install OpenJS.NodeJS.LTS   # then run Caraka inside WSL2', range: r(5, 2, 24) },
]

export const agents = [
  { name: 'Gemini CLI', pill: 'FREE', pillBg: '#8EEE98', pillInk: '#07090D', bg: '#0C1116', border: '#171C22', install: 'npm i -g @google/gemini-cli', login: 'gemini   # then sign in with Google', note: '1,000 requests a day at no cost. It does not match top-tier models on complex multi-file reasoning, and that is the honest trade.', range: r(0, 4, 26) },
  { name: 'Claude Code', pill: 'FROM $20/mo', pillBg: '#2B1612', pillInk: '#FF7A5E', bg: '#12100F', border: '#2B1612', install: 'npm i -g @anthropic-ai/claude-code', login: 'claude login', note: 'The first agent Caraka was built against. Not available on the free Claude tier at all.', range: r(1, 4, 26) },
  { name: 'Codex CLI', pill: 'FREE TIER', pillBg: '#171C22', pillInk: '#B2BCC6', bg: '#0C1116', border: '#171C22', install: 'npm i -g @openai/codex', login: 'codex login', note: 'The CLI is free and open source, and ChatGPT Free includes limited access. Sized for evaluation rather than work.', range: r(2, 4, 26) },
]

export const prices = [
  { plan: 'Free', a: 'not available', aTone: '#FF93B2', b: 'limited', bTone: '#FFD67E', c: '1,000 req/day', cTone: ok, bg: '#12100F', range: r(0, 2, 24) },
  { plan: 'Entry', a: '$20 Pro', aTone: '#B2BCC6', b: '$8 Go', bTone: '#B2BCC6', c: '—', cTone: no, bg: '#0C1116', range: r(1, 2, 24) },
  { plan: 'Standard', a: '$100 Max 5x', aTone: '#B2BCC6', b: '$20 Plus', bTone: '#B2BCC6', c: '—', cTone: no, bg: '#0C1116', range: r(2, 2, 24) },
  { plan: 'Heavy', a: '$200 Max 20x', aTone: '#B2BCC6', b: '$100–200 Pro', bTone: '#B2BCC6', c: '—', cTone: no, bg: '#0C1116', range: r(3, 2, 24) },
  { plan: 'Team', a: '$20+/seat', aTone: '#B2BCC6', b: '$25/user', bTone: '#B2BCC6', c: '—', cTone: no, bg: '#0C1116', range: r(4, 2, 24) },
  { plan: 'Pay per token', a: '$2/$10 per M', aTone: '#B2BCC6', b: 'credits ~$0.04', bTone: '#B2BCC6', c: '—', cTone: no, bg: '#0C1116', range: r(5, 2, 24) },
]

export const costNotes = [
  { tag: 'CARAKA ADDS NOTHING', tone: '#8EEE98', bg: '#12100F', border: '#2B1612', t: 'No agent loop means no second stream of tokens. Everything runs on the plan you already pay for.', range: r(0, 3, 24) },
  { tag: 'ONE POOL PER ACCOUNT', tone: '#FFD67E', bg: '#0C1116', border: '#171C22', t: "Claude Code shares its allowance with the web and desktop apps. An afternoon of long chats reduces that week's coding.", range: r(1, 3, 24) },
  { tag: 'CODEX CAN TOP UP', tone: '#7A848F', bg: '#0C1116', border: '#171C22', t: 'Credits let you push past the allowance. Claude stops hard until the cycle resets, so running both is useful.', range: r(2, 3, 24) },
  { tag: 'OPEN SOURCE MAINTAINERS', tone: '#7A848F', bg: '#0C1116', border: '#171C22', t: "Anthropic's Claude for Open Source programme grants six months of Max 20x to qualifying maintainers.", range: r(3, 3, 24) },
]

export const paths = [
  { you: 'Nothing installed, want to try for free', use: 'Gemini CLI', chipBg: '#2B1612', chipInk: '#FF7A5E', border: '#2B1612', range: r(0, 2.4, 24) },
  { you: 'Already paying for ChatGPT', use: 'Codex CLI', chipBg: '#171C22', chipInk: '#B2BCC6', border: '#171C22', range: r(1, 2.4, 24) },
  { you: 'Already paying for Claude Pro or Max', use: 'Claude Code', chipBg: '#171C22', chipInk: '#B2BCC6', border: '#171C22', range: r(2, 2.4, 24) },
  { you: 'Open source maintainer', use: 'Claude for OSS', chipBg: '#171C22', chipInk: '#B2BCC6', border: '#171C22', range: r(3, 2.4, 24) },
  { you: 'No subscription at all', use: 'Codex credits or API key', chipBg: '#171C22', chipInk: '#B2BCC6', border: '#171C22', range: r(4, 2.4, 24) },
]

export const scriptRules = [
  { t: 'Readable before it runs. The docs show the less pipe before the bash pipe.', range: r(0, 2, 24) },
  { t: 'Idempotent. Running it twice changes nothing and duplicates nothing.', range: r(1, 2, 24) },
  { t: 'Never sudo quietly. If elevation is needed it stops and explains why.', range: r(2, 2, 24) },
  { t: 'Detects Node and offers fnm, without installing anything unasked.', range: r(3, 2, 24) },
  { t: 'Detects your agent and prints the install command rather than running it.', range: r(4, 2, 24) },
  { t: 'Names the version and the install location before writing anything.', range: r(5, 2, 24) },
  { t: '--dry-run prints the plan and touches nothing.', range: r(6, 2, 24) },
  { t: 'CARAKA_VERSION pins a release, for reproducible environments.', range: r(7, 2, 24) },
]

export const verifyLines = [
  { t: '$ caraka doctor', tone: d, range: r(0, 2, 24) },
  { t: '', tone: d, range: r(1, 2, 24) },
  { t: 'node 22.14 · caraka 0.4.0', tone: g, mark: '✔', markTone: ok, range: r(2, 2, 24) },
  { t: 'claude 2.4.1 · acp', tone: g, mark: '✔', markTone: ok, range: r(3, 2, 24) },
  { t: 'telegram · @toko_caraka_bot', tone: g, mark: '✔', markTone: ok, range: r(4, 2, 24) },
  { t: 'titen 0.7.0 · 127.0.0.1:7717', tone: g, mark: '✔', markTone: ok, range: r(5, 2, 24) },
  { t: 'forum topics unavailable · linear mode', tone: '#E6D3A8', mark: '!', markTone: '#FFD67E', range: r(6, 2, 24) },
  { t: '', tone: d, range: r(7, 2, 24) },
  { t: '$ caraka doctor --fix     # repairs what it can', tone: d, range: r(8, 2, 24) },
  { t: '$ caraka uninstall        # clean, repos untouched', tone: d, range: r(9, 2, 24) },
] as { t: string; tone: string; mark?: string; markTone?: string; range: string }[]
