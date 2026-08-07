// Content for the compare page, transcribed from the renderVals() block of
// design/mockups/Caraka Compare.dc.html. The mockup is the source of truth:
// nothing here is authored, reworded, or reordered.

import { r } from '../lib/anim'

/** `us` marks the Caraka card, which carries the orbiting mark; see compare.astro. */
export const products = [
  {
    name: 'OpenClaw',
    kind: 'PERSONAL AI ASSISTANT',
    tone: '#7A848F',
    bg: '#0C1116',
    border: '#171C22',
    us: false,
    range: r(0, 4, 26),
    body: 'A persistent, self-hosted assistant that connects a model to your OS, your messaging apps, and the internet. It acts rather than advises.',
    does: ['Clears your inbox', 'Manages your calendar', 'Drives a browser', 'Runs shell commands', 'Writes code, among other things'],
  },
  {
    name: 'Hermes',
    kind: 'AGENT FRAMEWORK',
    tone: '#7A848F',
    bg: '#0C1116',
    border: '#171C22',
    us: false,
    range: r(1, 4, 26),
    body: 'A Python agent framework with its own runtime and orchestration. You build the assistant you want on top of it.',
    does: ['Orchestrates agents', 'Ships its own tool layer', 'Linux, macOS, WSL2 only', 'Writes code, among other things'],
  },
  {
    name: 'Caraka',
    kind: 'CHAT BRIDGE TO YOUR CODING AGENT',
    tone: '#FF7A5E',
    bg: '#12100F',
    border: '#2B1612',
    us: true,
    range: r(2, 4, 26),
    body: 'A bridge with no runtime of its own. It carries your task to the coding agent you already installed and already pay for.',
    does: ['Works on your repository', 'Sessions as Telegram topics', 'Approval before every write', 'Memory across sessions', 'Nothing else, on purpose'],
  },
]

export const rows = [
  { k: 'Category', a: 'Personal assistant', b: 'Agent framework', c: 'Chat bridge', tone: '#FF7A5E', weight: '600', range: r(0, 2.2, 22) },
  { k: 'Main job', a: 'Inbox, calendar, browser', b: 'Orchestration', c: 'Your repository', tone: '#FF7A5E', weight: '600', range: r(1, 2.2, 22) },
  { k: 'Agent runtime', a: 'Its own', b: 'Its own', c: 'Yours', tone: '#FF7A5E', weight: '600', range: r(2, 2.2, 22) },
  { k: 'Execution tools', a: '20+', b: 'Yes', c: 'Zero', tone: '#FF7A5E', weight: '600', range: r(3, 2.2, 22) },
  { k: 'Plugin marketplace', a: 'Large', b: 'Yes', c: 'None', tone: '#FF7A5E', weight: '600', range: r(4, 2.2, 22) },
  { k: 'Channels', a: '22', b: 'via gateway', c: '1 in v1.0', tone: '#95A0AB', weight: '400', range: r(5, 2.2, 22) },
  { k: 'Tokens outside your agent', a: 'Yes, own loop', b: 'Yes', c: 'None', tone: '#8EEE98', weight: '600', range: r(6, 2.2, 22) },
  { k: 'Sandboxing', a: 'Configure it', b: 'Configure it', c: 'Inherited', tone: '#FF7A5E', weight: '600', range: r(7, 2.2, 22) },
  { k: 'Reported setup time', a: 'Hours', b: 'pip + venv', c: 'Under 3 min', tone: '#FF7A5E', weight: '600', range: r(8, 2.2, 22) },
  { k: 'Maturity', a: 'Very high', b: 'High', c: 'v0.2 preview', tone: '#FF93B2', weight: '600', range: r(9, 2.2, 22) },
]

export const complaints = [
  {
    tag: 'SETUP',
    quote: 'It is open-source, yes, but installation is a nightmare. I remember spending hours to get it right.',
    src: 'Composio, May 2026',
    answer: 'npx caraka init. One command, six interactions, target under three minutes. The wizard confirms what it finds rather than asking what it should already know.',
    range: r(0, 4, 28),
  },
  {
    tag: 'PLUGINS',
    quote: 'The Skills and Plugin ecosystem is vast, but the experience is horrible.',
    src: 'Composio, May 2026',
    answer: 'No marketplace at all. Extension happens through a declarative YAML preset or an MCP server you install deliberately. Trust sits with you, not with a registry.',
    range: r(1, 4, 28),
  },
  {
    tag: 'COST',
    quote: 'Agentic tasks consume a massive amount of tokens. If you want to use it like a personal assistant, the cost will skyrocket pretty fast.',
    src: 'Composio, May 2026',
    answer: 'Caraka has no agent loop, so it burns no tokens of its own. Everything runs on the coding-agent subscription you already pay for.',
    range: r(2, 4, 28),
  },
  {
    tag: 'SECURITY',
    quote: 'The initial releases lacked any security hardening. The internet was filled with heated debates around it.',
    src: 'Composio, May 2026',
    answer: 'Mandatory allowlist, signed single-use approvals, secret scrubbing, and an append-only audit log, all present from the first commit rather than added after an incident.',
    range: r(3, 4, 28),
  },
  {
    tag: 'STABILITY',
    quote: 'Every patch would make it worse. A fix for one thing would unfix the other.',
    src: 'Composio, May 2026',
    answer: 'A core capped at roughly 8,000 lines is small enough that one person can read it in a day. Fewer moving parts is the only reliable way to make a patch predictable.',
    range: r(4, 4, 28),
  },
  {
    tag: 'ARCHITECTURE',
    quote: 'Not bugs, since the project ships fast and breaks fast in equal measure. The edges I hit were architectural.',
    src: 'Vellum, August 2026',
    answer: 'The written non-goals are the defence. No agent loop, no tools, no marketplace, no companion app. Every feature request is tested against one question: can the coding agent already do this?',
    range: r(5, 4, 28),
  },
]

export const tokenPaths = [
  {
    tag: 'ASSISTANT WITH ITS OWN LOOP',
    tone: '#FF93B2',
    bg: '#0C1116',
    border: '#171C22',
    range: r(0, 5, 28),
    steps: [
      { t: 'your coding agent plan', cost: '$20+/mo', costTone: '#FF93B2', dot: '#FF93B2' },
      { t: 'assistant reasoning loop', cost: 'tokens', costTone: '#FF93B2', dot: '#FF93B2' },
      { t: 'heartbeat every 30 min', cost: 'tokens', costTone: '#FF93B2', dot: '#FF93B2' },
    ],
    note: 'Every proactive turn is a full agent turn. The bill arrives from two directions.',
  },
  {
    tag: 'CARAKA',
    tone: '#FF7A5E',
    bg: '#12100F',
    border: '#2B1612',
    range: r(1, 5, 28),
    steps: [
      { t: 'your coding agent plan', cost: '$20+/mo', costTone: '#B2BCC6', dot: '#FF7A5E' },
      { t: 'caraka bridge', cost: 'free', costTone: '#8EEE98', dot: '#8EEE98' },
      { t: 'heartbeat', cost: 'off', costTone: '#8EEE98', dot: '#8EEE98' },
    ],
    note: 'No loop, no second bill. Proactive scheduling is off by default because it is expensive and noisy.',
  },
]

export const picks = [
  { want: 'Clear my inbox, keep my calendar, drive a browser', use: 'OpenClaw', chipBg: '#171C22', chipInk: '#B2BCC6', border: '#171C22', range: r(0, 2.6, 24) },
  { want: 'Build my own assistant on a Python framework', use: 'Hermes', chipBg: '#171C22', chipInk: '#B2BCC6', border: '#171C22', range: r(1, 2.6, 24) },
  { want: 'Ship a fix to my repository from my phone', use: 'Caraka', chipBg: '#2B1612', chipInk: '#FF7A5E', border: '#2B1612', range: r(2, 2.6, 24) },
  { want: 'Keep five tasks running without them colliding in one chat', use: 'Caraka', chipBg: '#2B1612', chipInk: '#FF7A5E', border: '#2B1612', range: r(3, 2.6, 24) },
  { want: 'Approve every write before it lands', use: 'Caraka', chipBg: '#2B1612', chipInk: '#FF7A5E', border: '#2B1612', range: r(4, 2.6, 24) },
  { want: 'Not pay for a second reasoning loop', use: 'Caraka', chipBg: '#2B1612', chipInk: '#FF7A5E', border: '#2B1612', range: r(5, 2.6, 24) },
  { want: 'A mature project with a large community today', use: 'OpenClaw', chipBg: '#171C22', chipInk: '#B2BCC6', border: '#171C22', range: r(6, 2.6, 24) },
]

export const honest = [
  'OpenClaw is far more mature. Hundreds of thousands of stars, tens of thousands of commits, a real community. Caraka v0.2 is an early preview and you should treat it that way.',
  'OpenClaw does work Caraka will never do. Calendar, inbox, browser, home automation. If that is what you need, this is not the answer.',
  'The complaints quoted above come from early 2026 releases and some may already be fixed. Dates are printed so you can check for yourself rather than take our word for it.',
]
