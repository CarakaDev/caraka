// Content for the status page, transcribed from the renderVals() block of
// design/mockups/Caraka Status.dc.html. The mockup is the source of truth:
// nothing here is authored, reworded, or reordered.
//
// This mockup's own r() defaults to step 3, span 26, where the shared helper in
// lib/anim defaults to 4 and 30. Every call below therefore passes step and span
// explicitly, so the ranges come out byte-identical to the comp.

import { r } from '../lib/anim'

export const stats = [
  { n: '0.0.0', label: 'CURRENT VERSION', tone: '#FF7A5E', bg: '#12100F', border: '#2B1612' },
  { n: 'Phase 0', label: 'TECHNICAL SPIKE', tone: '#FFD67E', bg: '#0C1116', border: '#171C22' },
  { n: '~16 wk', label: 'ESTIMATE TO v1.0', tone: '#B2BCC6', bg: '#0C1116', border: '#171C22' },
  { n: '23', label: 'SPEC DOCUMENTS', tone: '#B2BCC6', bg: '#0C1116', border: '#171C22' },
]

/** The three phase palettes the mockup spreads into each row. `done` is defined
 *  there but never used — no phase has shipped yet — and is kept so the set
 *  stays whole. */
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

export const phases: Phase[] = [
  { n: '0', title: 'Technical spike', dur: '1 week', live: true, ...now,
    q: 'Do the three foundations behave the way the documentation says?',
    gate: 'ACP permission requests fire for writes on Claude Code, createForumTopic works in a private chat with no admin rights, and sendRichMessage renders as specified. If the permission hook is unreliable, the approval architecture is redesigned before anything else is written.',
    range: r(0, 3, 26) },
  { n: '1', title: 'MVP dogfood · v0.1', dur: '3 weeks', ...next,
    q: 'Is this actually useful in daily work?',
    gate: 'The author uses it for a full week and finishes five real tasks without opening a laptop, and the topic list feels tidier than one flat chat. If it is annoying, fix it before adding anything.',
    range: r(1, 3, 26) },
  { n: '2', title: 'Smooth install · v0.2', dur: '1 week', ...next,
    q: 'Can someone else install it without help?',
    gate: 'Median time from npx to first delivered message stays under three minutes, with no questions asked of the author.',
    range: r(2, 3, 26) },
  { n: '3', title: 'Memory with Titen · v0.3', dur: '2 weeks', ...next,
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

export const releases = [
  { v: 'Unreleased', state: 'phase 0', date: 'in progress', tone: '#FF7A5E', chipBg: '#2B1612', chipInk: '#FF7A5E', headBg: '#12100F', border: '#2B1612', range: r(0, 4, 28),
    groups: [
      { label: 'TO CONFIRM', tone: '#FFD67E', items: [
        'ACP permission requests actually fire for write operations on Claude Code',
        'createForumTopic works in a private chat with no admin rights',
        'sendRichMessage and sendRichMessageDraft behave as documented, and no editRichMessage exists',
        'Titen bootstrap and serve, with compile latency measured',
      ] },
    ] },
  { v: '0.0.0', state: 'released', date: '7 August 2026', tone: '#B2BCC6', chipBg: '#171C22', chipInk: '#7A848F', headBg: '#0E1216', border: '#171C22', range: r(1, 4, 28),
    groups: [
      { label: 'ADDED', tone: '#8EEE98', items: [
        'Full public specification: PRD, FRD, BRD, design, ERD, security model, roadmap',
        'Eleven sourced research documents',
        'Brand: name, hanacaraka philosophy, logo book, colour system built with a differential method',
        'bin/caraka.mjs prints status and a link to the repository',
      ] },
      { label: 'DECIDED', tone: '#6FB9F0', items: [
        'Telegram is the first and only channel in v1.0, with long-polling so no port is exposed',
        'Claude Code is the first agent, over ACP',
        'Titen is the default memory provider, deterministic and running locally',
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
