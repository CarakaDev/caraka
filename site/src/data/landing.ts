// Content for the landing page, transcribed from the renderVals() block of
// design/mockups/Caraka Landing.dc.html.
//
// The comp decides the design and no longer decides the release facts. Four
// blocks below already left it before v0.2 — `agents` (comp:509), `layers`
// (comp:512-516), `safety` (comp:524-531) and `term` (comp:533-541) name what
// the code does, not what the comp imagined. Every other value is the comp's,
// unreworded and unreordered. Each divergence carries its own note.

import { r } from '../lib/anim'

/**
 * The one string on this page that is not the mockup's. The comp reads
 * `MEMBUKA GERBANG` on a route that declares `lang="en"`; AC-1.2 makes the
 * label match the language the page claims. `OPENING THE GATE` is the literal
 * reading of the Indonesian and keeps the gate image the veil is drawing.
 *
 * It lives here as a constant so a test can hold it: `fidelity.test.js` fails
 * on a non-ASCII character in it, and fails if `site/AGENTS.md` stops naming
 * the deviation. See site/AGENTS.md for the record AC-1.7 asks for.
 */
export const VEIL_LABEL = 'OPENING THE GATE'

export const nav = [
  { id: 'hero', href: '#hero', label: 'GATE' },
  { id: 'gap', href: '#gap', label: 'THE GAP' },
  { id: 'tabs', href: '#tabs', label: 'TABS' },
  { id: 'protocol', href: '#protocol', label: 'PROTOCOL' },
  { id: 'memory', href: '#memory', label: 'MEMORY' },
  { id: 'safety', href: '#safety', label: 'SAFETY' },
  { id: 'install', href: '#install', label: 'INSTALL' },
  { id: 'philosophy', href: '#philosophy', label: 'NAME' },
]

/** `visual` names the micro-animation drawn in the card; see GapVisual.astro. */
export const gaps = [
  {
    title: 'Locked to one machine',
    body: 'The idea arrives on the road, in bed, mid-meeting. Execution waits until you are back at the laptop.',
    visual: 'unreachable' as const,
    range: r(0, 5, 28),
    delay: '0s',
  },
  {
    title: 'Long runs go blind',
    body: 'A migration, a refactor, a full test suite — running with no way to see progress or stop it from outside.',
    visual: 'blind' as const,
    range: r(1, 5, 28),
    delay: '1.1s',
  },
  {
    title: 'A restart can lose the thread',
    body: 'Without a persisted agent session, the next phone message starts a fresh context instead of resuming the task.',
    visual: 'forget' as const,
    range: r(2, 5, 28),
    delay: '2.2s',
  },
]

export const states = [
  { glyph: '▸', name: 'running', color: '#6FB9F0', range: r(0, 3, 26) },
  { glyph: '⏸', name: 'needs you', color: '#FFD67E', range: r(1, 3, 26) },
  { glyph: '✓', name: 'done', color: '#8EEE98', range: r(2, 3, 26) },
  { glyph: '✗', name: 'failed', color: '#FF93B2', range: r(3, 3, 26) },
  { glyph: '⊘', name: 'cancelled', color: '#CB86DB', range: r(4, 3, 26) },
]

export const topics = [
  { glyph: '▸', name: 'toko-api · rate limit login', id: '#a91', color: '#6FB9F0', ink: '#F6F9FC', bg: '#0C1116', bar: 1, delay: '0s', range: r(0, 3.5, 30) },
  { glyph: '⏸', name: 'toko-api · dependency audit', id: '#a92', color: '#FFD67E', ink: '#E9EDF2', bg: '#12100F', bar: 1, delay: '.6s', range: r(1, 3.5, 30) },
  { glyph: '▸', name: 'toko-api · hero revision', id: '#a93', color: '#6FB9F0', ink: '#F6F9FC', bg: '#0C1116', bar: 1, delay: '1.2s', range: r(2, 3.5, 30) },
  { glyph: '✓', name: 'toko-api · fix checkout 500', id: '#a88', color: '#8EEE98', ink: '#7A848F', bg: '#0C1116', bar: 0, delay: '0s', range: r(3, 3.5, 30) },
  { glyph: '✗', name: 'toko-api · prisma migrate', id: '#a84', color: '#FF93B2', ink: '#7A848F', bg: '#0C1116', bar: 0, delay: '0s', range: r(4, 3.5, 30) },
  { glyph: '⊘', name: 'toko-api · restructure docs', id: '#a81', color: '#CB86DB', ink: '#5D666F', bg: '#0C1116', bar: 0, delay: '0s', range: r(5, 3.5, 30) },
]

// comp:509 lists 13 agents plus "+ 15 more" with no status. Claude Code is the
// one agent verified live. `presets/agents/` ships a preset for five of the
// others since v0.4 — flags transcribed, marked unverified inside each file —
// so their rows read "preset", a file that exists, not a claim it was run here.
export const agents = [
  'Claude Code · v0.2', 'Codex CLI · preset', 'Gemini CLI · preset', 'Cursor · preset',
  'Cline · roadmap', 'Goose · preset', 'Amp · preset', 'Copilot CLI · roadmap',
  'Devin · roadmap', 'Factory Droid · roadmap', 'Auggie · roadmap',
  'OpenHands · roadmap', 'Qwen Code · roadmap', 'ACP keeps the path open',
].map((n, i) => ({ n, range: r(i, 1.6, 24) }))

// comp:512-516 describes all three routes as working. The CLI card returned to
// the comp's own words when v0.4 shipped `src/drivers/cli.ts` and
// `presets/agents/`; the MCP route stays roadmap — no MCP server in the package.
export const layers = [
  {
    tag: 'ACP · PRIMARY',
    tone: '#FF7A5E',
    title: 'Claude first, one protocol',
    body: 'v0.2 uses Claude Code through ACP over stdio: streaming updates, permission requests, cancellation, and persisted sessions.',
    bg: '#12100F',
    border: '#2B1612',
    delay: '0s',
    range: r(0, 4, 28),
  },
  {
    tag: 'CLI · FALLBACK',
    tone: '#7A848F',
    title: 'A YAML file, not code',
    body: 'Agents without ACP are driven by a declarative preset. Adding one is a single file in presets/agents/.',
    bg: '#0C1116',
    border: '#171C22',
    delay: '1.3s',
    range: r(1, 4, 28),
  },
  {
    tag: 'MCP · ROADMAP',
    tone: '#7A848F',
    title: 'An inbox for IDE agents',
    body: 'The planned MCP route lets IDE agents pull messages. v0.2 starts only the Claude ACP adapter.',
    bg: '#0C1116',
    border: '#171C22',
    delay: '2.6s',
    range: r(2, 4, 28),
  },
]

export const mem = [
  { n: '1', k: 'observation', v: 'Raw evidence with a content hash and the time it happened. Append-only — never rewritten.', range: r(0, 5, 34) },
  { n: '2', k: 'claim', v: 'A conclusion that names the evidence it came from. Disagreements are kept as disagreements, never averaged.', range: r(1, 5, 34) },
  { n: '3', k: 'context', v: 'Exactly what was handed to the agent, why each record was chosen, and what the token budget cut.', range: r(2, 5, 34) },
]

/**
 * comp:524-531 is a v0.1 list. Two lines no longer describe the code.
 *
 * "Only private messages from the paired Telegram principal reach Claude" was
 * true when every non-private chat was refused. `src/core/gateway.ts:161-165`
 * now consults two sets: `allowedChats` for the chat and `allowed` for the
 * sender, and a message needs both. Channels are still refused outright.
 *
 * The seventh line is new, not the comp's. `/yolo` opens a trust window
 * (`gateway.ts:720-793`), so a summary of what Caraka refuses to do has to say
 * that a window exists and where it stops: `isHighRisk` keeps the buttons on,
 * and the row expires by database constraint whatever anyone taps.
 */
export const safety = [
  'The allowlist is mandatory — the gateway refuses to start without one.',
  'The chat and the sender are separate allowlists, and a message must pass both.',
  'Approvals are signed, single-use callbacks with a TTL. Chat text can never approve.',
  'No channel listens: Telegram is polled, Discord is an outbound socket. The only listener is the dashboard, on 127.0.0.1, read-only, GET only.',
  'Secrets are scrubbed from outbound messages and append-only audit details.',
  'Model API keys are never touched — those belong to your coding agent.',
  'A trust window expires on the clock, and high-risk actions still ask for a tap.',
].map((t, i) => ({ t, range: r(i, 2.6, 26) }))

export const term = [
  { t: '$ npx caraka init', tone: '#5D666F', range: r(0, 2.4, 22) },
  { t: '', tone: '#5D666F', range: r(1, 2.4, 22) },
  // comp:535 reads `caraka · v0.1.0`; `VERSION` in src/cli.ts is 0.2.1.
  { t: 'caraka · v0.2.1', tone: '#F6F9FC', mark: 'ꦕꦫꦏ', markTone: '#E2452C', range: r(2, 2.4, 22) },
  { t: '', tone: '#5D666F', range: r(3, 2.4, 22) },
  { t: 'claude login · ready', tone: '#7A848F', mark: '✔', markTone: '#8EEE98', range: r(4, 2.4, 22) },
  { t: 'telegram · paired', tone: '#7A848F', mark: '✔', markTone: '#8EEE98', range: r(5, 2.4, 22) },
  { t: 'workspace toko-api', tone: '#7A848F', mark: '✔', markTone: '#8EEE98', range: r(6, 2.4, 22) },
  { t: 'run npx caraka start', tone: '#B2BCC6', mark: '▸', markTone: '#FF7A5E', caret: true, range: r(7, 2.4, 22) },
] as { t: string; tone: string; mark?: string; markTone?: string; caret?: boolean; range: string }[]

export const verse = [
  { aksara: 'ꦲꦤꦕꦫꦏ', latin: 'hana caraka — there were two envoys', tone: '#F6F9FC', range: r(0, 6, 34) },
  { aksara: 'ꦢꦠꦱꦮꦭ', latin: 'data sawala — they disagreed', tone: '#B2BCC6', range: r(1, 6, 34) },
  { aksara: 'ꦥꦝꦗꦪꦚ', latin: 'padha jayanya — equally strong', tone: '#7A848F', range: r(2, 6, 34) },
  { aksara: 'ꦩꦒꦧꦛꦔ', latin: 'maga bathanga — both became corpses', tone: '#5D666F', range: r(3, 6, 34) },
]

/** Footer links, in mockup order. Local paths replace the comps' filenames. */
export const footerLinks = [
  { label: 'Docs', href: '/docs' },
  { label: 'Story', href: '/story' },
  { label: 'Compare', href: '/compare' },
  { label: 'Install', href: '/install' },
  { label: 'Security', href: '/security' },
  { label: 'Status', href: '/status' },
  { label: 'UI Kit', href: '/brand/ui-kit' },
  { label: 'GitHub', href: 'https://github.com/CarakaDev/caraka' },
  { label: 'ACP', href: 'https://agentclientprotocol.com' },
  { label: 'Titen', href: 'https://titen.dev' },
  { label: 'halo@caraka.dev', href: 'mailto:halo@caraka.dev' },
]
