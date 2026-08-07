// Content for the security page, transcribed from the renderVals() block of
// design/mockups/Caraka Security.dc.html. The mockup is the source of truth:
// nothing here is authored, reworded, or reordered.
//
// The mockup's own helper defaults to `r(i, step = 2.4, span = 24)`, so every
// call below passes those numbers explicitly to the shared helper.

import { r } from '../lib/anim'

const ok = '#8EEE98',
  warn = '#FFD67E',
  no = '#5D666F'

export const toc = [
  { no: '01', id: 'boundary', href: '#boundary', title: 'Trust boundary' },
  { no: '02', id: 'threats', href: '#threats', title: 'Threats' },
  { no: '03', id: 'modes', href: '#modes', title: 'Policy modes' },
  { no: '04', id: 'defaults', href: '#defaults', title: 'Defaults' },
  { no: '05', id: 'honest', href: '#honest', title: 'What we do not claim' },
  { no: '06', id: 'report', href: '#report', title: 'Reporting' },
]

export const headline = [
  { tag: 'NO PORT', t: 'Binds to 127.0.0.1. Telegram uses long-polling, so v1.0 has no webhook at all.' },
  { tag: 'NO KEYS', t: 'Model API keys are never requested, stored, or transmitted. Those belong to your agent.' },
  { tag: 'NO NEW SURFACE', t: "Execution happens inside the coding agent's sandbox. We add none of our own." },
  { tag: 'NO MARKETPLACE', t: 'No plugin registry, no dynamic loading, no third-party skill supply chain.' },
]

export const untrusted = [
  'Message content from any chat',
  'Web pages and repo files the agent reads',
  'Memory returned from a recall',
  'Output from third-party MCP servers',
]

export const trusted = [
  'config.yaml on disk',
  'Signed callbacks from a button press',
  'Commands typed in your local terminal',
  'The principal allowlist',
]

export const threats = [
  {
    id: 'T1',
    name: 'A stranger sends commands',
    control:
      'Mandatory allowlist; the gateway refuses to start without one. Pairing is approved from the terminal, never from chat.',
  },
  {
    id: 'T2',
    name: 'Direct prompt injection',
    control: 'Approval arrives only as a signed callback with a nonce. Text cannot approve itself.',
  },
  {
    id: 'T3',
    name: 'Indirect injection via README or issue',
    control:
      'External content and memory are labelled as data, never instruction. High-risk actions ask even in trusted mode.',
  },
  {
    id: 'T4',
    name: 'Secret exfiltration through a reply',
    control: 'Outbound scrubber runs before send and before disk. Deny-list on ~/.ssh, ~/.aws, *.env, keychain.',
  },
  {
    id: 'T5',
    name: 'Destructive action',
    control: 'Force-push, rm -rf, migrations and deploys always require approval. Run timeout plus /stop.',
  },
  {
    id: 'T6',
    name: 'Leaking into a group',
    control:
      'Groups are read-only and require a mention. Sensitive output uses ephemeral messages visible only to the operator.',
  },
  {
    id: 'T7',
    name: 'Gateway exposed to the internet',
    control: 'Binds to 127.0.0.1. Opening it needs an explicit flag, prints a warning, and writes an audit event.',
  },
  {
    id: 'T8',
    name: 'Plugin supply chain',
    control: 'No marketplace and no dynamic loading. Dependencies capped at 25 direct runtime packages.',
  },
  {
    id: 'T9',
    name: 'WhatsApp account ban',
    control: 'Not applicable in v1.0. When it lands: two providers, forced allowlist, rate limits, never a first contact.',
  },
  {
    id: 'T10',
    name: 'Runaway cost',
    control: 'One run per workspace, 30-minute timeout, heartbeat off by default.',
  },
  {
    id: 'T11',
    name: 'No way to audit',
    control: 'Append-only log from the first commit. caraka audit --since 24h.',
  },
  {
    id: 'T12',
    name: 'Memory poisoning',
    control: 'Memory is labelled data, capped at 6 items or 800 tokens, and every claim traces to its evidence.',
  },
  {
    id: 'T13',
    name: 'Forged approval callback',
    control:
      'callback_data is capped at 64 bytes, so the payload stays server-side and only an HMAC-signed id travels.',
  },
].map((t, i) => ({ ...t, range: r(i, 2.4, 24) }))

export const modes = [
  { name: 'read-only', tone: '#95A0AB', bg: '#0C1116', w: '✗', wTone: no, e: '✗', eTone: no, p: '✗', pTone: no, range: r(0, 3, 24) },
  { name: 'assisted', tone: '#FF7A5E', bg: '#12100F', w: '⏸ ask', wTone: warn, e: '⏸ ask', eTone: warn, p: '✗', pTone: no, range: r(1, 3, 24) },
  { name: 'trusted', tone: '#95A0AB', bg: '#0C1116', w: '✓', wTone: ok, e: '✓', eTone: ok, p: '⏸ ask', pTone: warn, range: r(2, 3, 24) },
  { name: 'group', tone: '#95A0AB', bg: '#0C1116', w: '✗', wTone: no, e: '✗', eTone: no, p: '✗', pTone: no, range: r(3, 3, 24) },
]

export const risky = [
  'git push --force',
  'git reset --hard',
  'rm -rf',
  'DB migration',
  'terraform apply',
  'kubectl delete',
  'deploy',
  '~/.ssh · *.env · *.pem',
  'pipe to sh',
]

export const mandatory = [
  'The allowlist cannot be empty. The gateway stops with an error that explains how to fix it.',
  'Approval only through a signed, single-use callback with a TTL. The text fallback is nonce-bound too.',
  'Trusted mode is terminal-only and must expire, enforced by a database constraint.',
  'The outbound scrubber is always on, for chat messages and log lines alike.',
  'Authorisation decisions always reach the audit log.',
  'Groups never receive write or execute permission without an explicit opt-in.',
  'Callback payloads are never trusted as sent. Always an id plus HMAC, validated server-side.',
].map((t, i) => ({ t, range: r(i, 3, 24) }))

export const notClaimed = [
  'We cannot stop the agent doing something unwise after you approve it. Approval is a human decision and Caraka does not second-guess it.',
  'We cannot prevent prompt injection outright. What we guarantee is that its consequences require a human tap.',
  'We have not had a third-party security audit. This will be stated openly until it changes.',
  'Caraka is pre-alpha. Treat it as software that has not yet been attacked in the wild.',
  'Vulnerabilities in your coding agent, in Telegram, or in their libraries are theirs to fix. We will help route the report.',
]

export const commitments = [
  { n: '72h', t: 'Acknowledgement of any report sent to security@caraka.dev', range: r(0, 4, 24) },
  { n: '7d', t: 'Initial assessment, with a decision on severity and scope', range: r(1, 4, 24) },
  { n: '90d', t: 'Public advisory, or sooner once a fix is available', range: r(2, 4, 24) },
]

export const inScope = [
  'Bypassing the approval flow in any way',
  'Escaping the allowlist or the pairing mechanism',
  'Forging, replaying, or reusing an approval nonce',
  'Prompt injection that leads to execution without approval',
  'Secret leakage through messages, logs, memory, or audit entries',
  'Reading or writing outside a configured workspace',
]

export const outScope = [
  'Anything the operator explicitly approved',
  'Vulnerabilities in the coding agent itself',
  'Vulnerabilities in Telegram or its libraries',
  'WhatsApp bans from unofficial providers, which are documented and accepted',
  'Missing hardening that is documented as a deliberate trade-off',
]
