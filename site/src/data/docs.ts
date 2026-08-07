// Content for the docs page, transcribed from the renderVals() block of
// design/mockups/Caraka Docs.dc.html. The mockup is the source of truth:
// nothing here is authored, reworded, or reordered.

import { r } from '../lib/anim'

/** The mockup's two shorthand tones, `g` and `d`, kept under their own names. */
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
    intro: 'One command. No Docker, no repo to clone, no config file to write by hand. The wizard detects what it can and asks you to confirm — it never asks for something it could have found itself.',
    term: [
      { t: '$ npx caraka init', tone: d },
      { t: '', tone: d },
      { t: '  Memeriksa lingkungan…', tone: g },
      { t: '  Node.js 22.14', tone: g, mark: '  ✔', markTone: '#8EEE98' },
      { t: '  claude 2.4.1        agent · ACP ✓', tone: g, mark: '  ✔', markTone: '#8EEE98' },
      { t: '  titen               belum terpasang', tone: d, mark: '  ○', markTone: '#5D666F' },
      { t: '', tone: d },
      { t: '  Workspace  ~/dev/toko-api', tone: '#B2BCC6' },
      { t: '  Bot        @toko_caraka_bot', tone: '#B2BCC6' },
      { t: '  Mode       assisted', tone: '#B2BCC6' },
      { t: '', tone: d },
      { t: '  Siap. Kirim pesan ke bot kamu.', tone: '#8EEE98', mark: '  ✅', markTone: '#8EEE98' },
    ],
    note: "The wizard ends with the gateway running and prints your first incoming message — proof it works, rather than 'done, good luck'.",
  },
  {
    no: '02', id: 'sessions', href: '#sessions', label: 'Sesi', title: 'Sessions & topics',
    intro: 'One session equals one forum topic. Caraka creates it, names it, colours its icon by state, posts a closing summary, then closes it. Sessions never move between topics, and a topic is never reused.',
    rows: [
      { k: '@workspace <task>', v: 'Starts a new session in a new topic. Sent from the General topic.' },
      { k: '(reply in a topic)', v: 'Continues that session. No prefix needed — the topic is the context.' },
      { k: '/new', v: 'Start a fresh session with a clean context.' },
      { k: '/stop', v: 'Cancel the running turn (session/cancel over ACP).' },
      { k: '/status', v: 'Active runs, agent, mode, queue depth.' },
      { k: '/switch <agent>', v: 'Change the coding agent for this workspace.' },
      { k: '/mode read-only|assisted', v: 'Lower or raise permissions. trusted is terminal-only.' },
      { k: '/pin · /unpin', v: 'Exempt a topic from auto-deletion.' },
      { k: '/ingat · /lupakan · /memori', v: 'Write, forget, and inspect memory.' },
    ],
    note: 'Where topics are unavailable — WhatsApp, or a supergroup without forum mode — Caraka falls back to linear mode with a [workspace · #id] header. Nothing ever hard-fails.',
  },
  {
    no: '03', id: 'agents', href: '#agents', label: 'Agent', title: 'Connecting an agent',
    intro: 'Three routes, chosen automatically. ACP first, headless CLI as fallback, and an MCP inbox for agents that live inside an IDE and cannot be spawned.',
    cards: [
      { tag: 'ROUTE A · ACP', tone: '#FF7A5E', title: 'Spawned over stdio', body: 'JSON-RPC 2.0. Streaming updates, native permission prompts, diffs, multi-session. Covers ~19 of 22 agents.', bg: '#12100F', border: '#2B1612', range: r(0, 4, 26) },
      { tag: 'ROUTE B · CLI', tone: '#7A848F', title: 'A declarative preset', body: 'command, args, resumeArgs, output json|jsonl|text, sessionMode. Adding an agent is one YAML file.', bg: '#0C1116', border: '#171C22', range: r(1, 4, 26) },
      { tag: 'ROUTE C · MCP', tone: '#7A848F', title: 'We become the server', body: 'inbox_pull, reply, ask, status. The agent pulls messages — a degraded mode, and we say so.', bg: '#0C1116', border: '#171C22', range: r(2, 4, 26) },
    ],
    note: "Route C is honest about its trade-off: the agent must be told to call inbox_pull, so it is not 'always on' the way ACP is.",
  },
  {
    no: '04', id: 'approval', href: '#approval', label: 'Approval', title: 'Approvals & policy',
    intro: "ACP already defines session/request_permission, so Caraka does not invent an approval system — it renders the protocol's own request as buttons in your chat.",
    rows: [
      { k: 'read-only', v: 'Read only. No writes, no commands. Default for groups.' },
      { k: 'assisted', v: 'Writes and commands require a tap. Default for DMs.' },
      { k: 'trusted', v: 'Writes and commands run freely. Terminal-only, and must expire.' },
      { k: 'always approval', v: 'force-push, rm -rf, DB migration, deploy, ~/.ssh, *.env — regardless of mode.' },
      { k: 'nonce + TTL', v: 'Single-use, bound to (principal, session, request). Expires in 10 minutes.' },
      { k: 'fallback', v: 'Channels without buttons reply with a short code: ok A7F3 / no A7F3.' },
    ],
    note: 'Approval can never arrive as ordinary chat text. That single rule is what stops a prompt injection from approving itself.',
  },
  {
    no: '05', id: 'memory', href: '#memory', label: 'Memori', title: 'Memory',
    intro: 'Titen is the default provider, running locally. It separates observation, claim, and context so a conclusion is never confused with the evidence behind it.',
    rows: [
      { k: 'observe', v: 'POST /v1/observations — append-only evidence with a content hash.' },
      { k: 'consolidate', v: 'POST /v1/consolidations — rules first, model only if it must.' },
      { k: 'compile', v: 'POST /v1/context/compile — scope, then rank into an explicit token budget.' },
      { k: 'feedback', v: 'POST /v1/context/:id/feedback — outcomes tune the next recall.' },
      { k: 'trace', v: 'GET /v1/claims/:id/evidence — every claim runs back to its source.' },
      { k: 'provider: local', v: 'Fallback when Titen is absent: SQLite + FTS5, deliberately shallow.' },
      { k: 'provider: none', v: 'Memory off. The agent still works.' },
    ],
    note: 'Recall times out at 500 ms and continues without memory. Memory may degrade the answer, but it must never block the reply.',
  },
  {
    no: '06', id: 'config', href: '#config', label: 'Konfigurasi', title: 'Configuration',
    intro: 'A single YAML file at ~/.caraka/config.yaml, validated with a schema that produces readable errors. Every value can be overridden with a CARAKA_* environment variable.',
    term: [
      { t: 'channels:', tone: '#FF7A5E' },
      { t: '  telegram:', tone: '#B2BCC6' },
      { t: '    allowFrom: ["88123456"]   # wajib', tone: g },
      { t: '', tone: d },
      { t: 'workspaces:', tone: '#FF7A5E' },
      { t: '  - slug: toko-api', tone: '#B2BCC6' },
      { t: '    path: ~/dev/toko-api', tone: g },
      { t: '    agent: claude-code', tone: g },
      { t: '    mode: assisted', tone: g },
      { t: '', tone: d },
      { t: 'memory:', tone: '#FF7A5E' },
      { t: '  provider: titen', tone: g },
      { t: '  budgetTokens: 800', tone: g },
    ],
    note: 'Secrets never live here. Bot tokens go to the OS keychain, or a chmod 600 file when no keychain is available.',
  },
  {
    no: '07', id: 'cli', href: '#cli', label: 'CLI', title: 'CLI reference',
    intro: 'The terminal is the trusted surface. Anything that raises a privilege happens here, never from chat.',
    rows: [
      { k: 'caraka init', v: 'Interactive setup. Safe to re-run.' },
      { k: 'caraka doctor [--fix]', v: 'Diagnose everything. Read-only, secrets redacted, safe to paste into an issue.' },
      { k: 'caraka start | stop | status', v: 'Gateway lifecycle.' },
      { k: 'caraka pair approve <ch> <code>', v: 'Approve a new sender. Out-of-band by design.' },
      { k: 'caraka trust <ws> --for 60m', v: 'The only path to trusted mode. Always expires.' },
      { k: 'caraka audit --since 24h', v: 'Who asked for what, when, approved by whom.' },
      { k: 'caraka ws add | list | remove', v: 'Manage workspaces.' },
      { k: 'caraka uninstall', v: 'Clean removal. Your repos and agent config are untouched.' },
    ],
  },
]
