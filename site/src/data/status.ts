// Content for the status page, transcribed from the renderVals() block of
// design/mockups/Caraka Status.dc.html. The comp decides the design. It stopped
// deciding the release facts on the day the code moved past it, so every place
// this file leaves the comp names the comp line it left and the reason.
//
// This mockup's own r() defaults to step 3, span 26, where the shared helper in
// lib/anim defaults to 4 and 30. Every call below therefore passes step and span
// explicitly, so the ranges come out byte-identical to the comp.

import { r } from '../lib/anim'

// Leaves the comp at Caraka Status.dc.html:238-242, which reads 0.0.0 beside
// three specification-era stats. The version is package.json's; the other three
// were already replaced when v0.1 shipped.
export const stats = [
  { n: '0.3.0', label: 'CURRENT VERSION', tone: '#FF7A5E', bg: '#12100F', border: '#2B1612' },
  { n: 'Preview', label: 'RELEASE STATE', tone: '#FFD67E', bg: '#0C1116', border: '#171C22' },
  { n: 'Claude', label: 'SUPPORTED AGENT', tone: '#B2BCC6', bg: '#0C1116', border: '#171C22' },
  { n: '1', label: 'PRIVATE OPERATOR', tone: '#B2BCC6', bg: '#0C1116', border: '#171C22' },
]

/** The three phase palettes the mockup spreads into each row. */
export const done = { ring: '#8EEE98', bg: '#0C1116', border: '#171C22', chipBg: '#0E1F14', chipInk: '#8EEE98', state: 'done' }
const now = { ring: '#E2452C', bg: '#12100F', border: '#2B1612', chipBg: '#2B1612', chipInk: '#FF7A5E', state: 'in progress' }
const next = { ring: '#5D666F', bg: '#0C1116', border: '#171C22', chipBg: '#171C22', chipInk: '#7A848F', state: 'planned' }

interface Phase {
  n: string
  title: string
  dur: string
  live?: boolean
  ring: string
  bg: string
  border: string
  chipBg: string
  chipInk: string
  state: string
  q: string
  gate: string
  range: string
}

// Leaves the comp at Caraka Status.dc.html:245,249,253, which pulses phase 0 and
// plans phases 1 and 2. v0.3 is published, so the pulse marks phase 3; only one
// phase pulses because the comp draws one. Phases 1-3 keep "in progress" rather
// than "done" because roadmap.md still holds their field gates open: the dogfood
// week, the three-minute install, and phase 3's A/B — moved past the release by
// owner decision on 8 August 2026.
export const phases: Phase[] = [
  { n: '0', title: 'Technical spike', dur: '1 week', ...done,
    q: 'Do the three foundations behave the way the documentation says?',
    gate: 'ACP permission requests fire for writes on Claude Code, createForumTopic works in a private chat with no admin rights, and sendRichMessage renders as specified. If the permission hook is unreliable, the approval architecture is redesigned before anything else is written.',
    range: r(0, 3, 26) },
  { n: '1', title: 'MVP dogfood · v0.1', dur: '3 weeks', ...now,
    q: 'Is this actually useful in daily work?',
    gate: 'The author uses it for a full week and finishes five real tasks without opening a laptop, and the topic list feels tidier than one flat chat. If it is annoying, fix it before adding anything.',
    range: r(1, 3, 26) },
  { n: '2', title: 'Smooth install · v0.2', dur: '1 week', ...now,
    q: 'Can someone else install it without help?',
    gate: 'Median time from npx to first delivered message stays under three minutes, with no questions asked of the author.',
    range: r(2, 3, 26) },
  { n: '3', title: 'Memory with Titen · v0.3', dur: '2 weeks', live: true, ...now,
    q: 'Does memory improve the answer, or just add noise?',
    gate: 'A personal A/B across twenty tasks, with and without memory. If it does not feel better, reduce memory rather than add more.',
    range: r(3, 3, 26) },
  { n: '4', title: 'Proving the abstraction · v0.4', dur: '2 weeks', ...next,
    q: 'Is the driver layer genuinely generic, or only generic-looking?',
    gate: 'Adding a new agent is one YAML file with no core code touched. If it needs code, the abstraction is wrong and gets fixed now.',
    range: r(4, 3, 26) },
  { n: '5', title: 'Closed beta · v0.5', dur: '3 weeks', ...next,
    q: "Does it survive in other people's hands?",
    gate: 'At least 60% of participants send a first message within 24 hours without asking anything, and there are zero incidents of execution without approval.',
    range: r(5, 3, 26) },
  { n: '6', title: 'WhatsApp · v0.6', dur: '2 weeks', ...next,
    q: "Can we ship WhatsApp without burning anyone's number?",
    gate: 'Fourteen days of real use with no ban and no manual relink, or an honest finding that makes Cloud API the recommended default.',
    range: r(6, 3, 26) },
  { n: '7', title: 'Public release · v1.0', dur: '2 weeks', ...next,
    q: 'Is it ready to be trusted by strangers?',
    gate: 'The security checklist is complete, documentation exists in both languages, 15+ agents are covered, and the honest comparison article is published.',
    range: r(7, 3, 26) },
]

// Leaves the comp at Caraka Status.dc.html:280-289, which lists two releases and
// titles the open one "phase 0". Each shipped version adds a card in the shape
// the comp drew; the gates below are the ones roadmap.md still leaves unticked.
export const releases = [
  { v: 'Unreleased', state: 'dogfood', date: 'in progress', tone: '#FF7A5E', chipBg: '#2B1612', chipInk: '#FF7A5E', headBg: '#12100F', border: '#2B1612', range: r(0, 4, 28),
    groups: [
      { label: 'OPEN GATES', tone: '#FFD67E', items: [
        'Complete live topic and Rich Message checks with the release bot',
        'Use Caraka for one full week and finish five real tasks',
        'Record five real setup sessions from people who have never seen it',
        'Run the personal A/B across twenty tasks, with and without memory',
      ] },
    ] },
  { v: '0.3.0', state: 'preview', date: '8 August 2026', tone: '#8EEE98', chipBg: '#0E1F14', chipInk: '#8EEE98', headBg: '#0E1216', border: '#171C22', range: r(1, 4, 28),
    groups: [
      { label: 'ADDED', tone: '#8EEE98', items: [
        "A MemoryProvider with three providers: titen, an HTTP adapter for a local Titen process; local, SQLite + FTS5 inside Caraka's own database with no embeddings; and none. A config from before v0.3 reads as local",
        'Compiled memory rides in front of the prompt as a labelled data block, at most 6 items in 800 tokens. The bound is enforced on what the provider returns, and memory markers inside recalled text are stripped so recalled data cannot pose as instruction',
        "Every run feeds memory back: the prompt and the agent's output become observations, tool-call titles arrive as they happen, and the injected context receives its outcome. A fast observation id closes the reply with Memory saved",
        'Chat commands /ingat, /lupakan, and /memori, accepted from any topic and answered in General when topics are on',
        'A compile that fails or outlives 500 ms is skipped, audited as memory_degraded, and the run continues. Text bound for a provider passes the secret scrubber before it leaves the process',
        'The wizard offers to install Titen after pairing; declining writes provider local and finishes as usual. doctor probes Titen\u2019s health endpoint and says when the memory endpoint is not loopback',
      ] },
      { label: 'LIMITED', tone: '#FFD67E', items: [
        'The titen adapter has only ever answered a mocked fetch; no check in the repository talks to a live Titen, and its routes were read from the pre-1.0 Titen v0.7.0 source',
        'On titen, forget by filter deletes nothing, because v0.7.0 has no bulk delete route. Deleting by id works',
        'The wizard\u2019s install command was not run while closing the release, and no automated test covers init or doctor',
        'The A/B across twenty tasks stays open, moved past the release by owner decision on 8 August 2026',
      ] },
    ] },
  { v: '0.2.1', state: 'preview', date: '8 August 2026', tone: '#8EEE98', chipBg: '#0E1F14', chipInk: '#8EEE98', headBg: '#0E1216', border: '#171C22', range: r(1, 4, 28),
    groups: [
      { label: 'FIXED', tone: '#FFD67E', items: [
        'Single-use cards clear their buttons. Trust and group pairing kept theirs after they were answered; only the approval path cleared. The clear moved to the callback fork, after the principal check, so a member outside the sender allowlist still cannot wipe the operator\u2019s card',
      ] },
      { label: 'ADDED', tone: '#8EEE98', items: [
        'A readiness report after group pairing, repeated by /status in any non-private chat: privacy mode stays on, so Telegram delivers only commands addressed to the bot, replies to its own messages, and service messages \u2014 an ordinary group message never arrives',
        'The report states whether topics are available, and that granting the rights they need makes the bot an admin, which makes it receive every message in the group',
      ] },
    ] },
  { v: '0.2.0', state: 'preview', date: '7 August 2026', tone: '#8EEE98', chipBg: '#0E1F14', chipInk: '#8EEE98', headBg: '#0E1216', border: '#171C22', range: r(1, 4, 28),
    groups: [
      { label: 'ADDED', tone: '#8EEE98', items: [
        "Groups behind two allowlists, chat and sender, paired by a confirmation in the operator's DM",
        'Eight registered commands: /new, /status, /stop, /commands, /usage, /yolo, /lock, /help',
        'A trust window opened by /yolo, confirmed by a signed single-use callback, scoped to one workspace, and closed by /lock, by expiry, or by a restart',
        'Interface language in English or Indonesian, chosen at init',
        'stop and status, a PID file, a rate limit of twenty messages a minute, and a run limit of thirty minutes',
        'caraka service --print, which writes a systemd, launchd, or schtasks unit to stdout and installs nothing',
      ] },
      { label: 'LIMITED', tone: '#FFD67E', items: [
        'Inside a trust window Caraka still receives every permission request, still stops at the high-risk list, and still audits each action',
        "Claude's own bypassPermissions stays terminal-only, and its audit records the window without claiming to have audited what happened inside it",
        'An allowlisted group shows approval cards, paths, diffs, and command output to every member',
        'One operator, bot, workspace, and Claude adapter. Memory, attachments, and other coding agents are still not here',
        'The launchd and schtasks units are printed untested, and on macOS the unit starts at login rather than at boot',
      ] },
    ] },
  { v: '0.1.0', state: 'preview', date: '7 August 2026', tone: '#8EEE98', chipBg: '#0E1F14', chipInk: '#8EEE98', headBg: '#0E1216', border: '#171C22', range: r(2, 4, 28),
    groups: [
      { label: 'ADDED', tone: '#8EEE98', items: [
        'Private Telegram DM to Claude Code over the official ACP adapter',
        'Persisted sessions, progress streaming, cancellation, topics with linear fallback',
        'Signed single-use approvals, secret scrubbing, and append-only audit',
        'Init, read-only doctor, safe AI install prompt, and foreground start',
      ] },
      { label: 'LIMITED', tone: '#FFD67E', items: [
        'One operator, bot, workspace, and Claude adapter',
        'No groups, service manager, memory, attachments, or other coding agents',
      ] },
    ] },
  { v: '0.0.0', state: 'released', date: '7 August 2026', tone: '#B2BCC6', chipBg: '#171C22', chipInk: '#7A848F', headBg: '#0E1216', border: '#171C22', range: r(3, 4, 28),
    groups: [
      { label: 'ADDED', tone: '#8EEE98', items: [
        'Full public specification: PRD, FRD, BRD, design, ERD, security model, roadmap',
        // The CHANGELOG 0.0.0 entry this was copied from wrote "Eleven"; docs/research/
        // has held thirteen files since e090f1b, and docs.astro counts them correctly.
        'Thirteen sourced research documents',
        'Brand: name, hanacaraka philosophy, logo book, colour system built with a differential method',
        'bin/caraka.mjs prints status and a link to the repository',
      ] },
      { label: 'DECIDED', tone: '#6FB9F0', items: [
        'Telegram is the first channel; v0.1 uses private-DM long-polling with no listener',
        'Claude Code is the first agent, over ACP',
        'Titen is selected for future memory work and is not shipped in v0.1',
        'Kesumba #E2452C is the brand colour, the only candidate clearing 3:1 against both light and dark browser chrome',
        'No plugin marketplace, ever',
      ] },
    ] },
]

export const candidates = [
  { what: 'MCP inbox for IDE agents', when: 'real demand from Cline, Kilo, Windsurf, Kiro or Antigravity users', range: r(0, 2, 26) },
  { what: 'Signal via signal-cli', when: 'at least 20 requests', range: r(1, 2, 26) },
  { what: 'Mini App as the dashboard', when: 'the htmx dashboard proves insufficient', range: r(2, 2, 26) },
  { what: 'Multi-operator and teams', when: 'a team actually uses it, rather than an assumption that one might', range: r(3, 2, 26) },
  { what: 'Simple cron', when: 'requested, and never as an agent-driven heartbeat, which is expensive and noisy', range: r(4, 2, 26) },
  { what: 'Managed Bots one-tap setup', when: 'only if the manager bot is run by the user themselves', range: r(5, 2, 26) },
  { what: 'LLM-assisted memory', when: "following Titen's consolidations roadmap, never built here", range: r(6, 2, 26) },
]

export const never = ['plugin marketplace', 'our own agent loop', 'our own execution tools', 'mobile app', 'hosted multi-tenant', 'model provider abstraction']
