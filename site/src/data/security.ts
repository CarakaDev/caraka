// Security-page copy follows docs/security.md and the shipped v0.1 runtime.

import { r } from '../lib/anim'

const ok = '#8EEE98',
  warn = '#FFD67E',
  no = '#5D666F'

export const toc = [
  { no: '01', id: 'boundary', href: '#boundary', title: 'Trust boundary' },
  { no: '02', id: 'threats', href: '#threats', title: 'Threats' },
  { no: '03', id: 'modes', href: '#modes', title: 'Telegram routes' },
  { no: '04', id: 'defaults', href: '#defaults', title: 'Defaults' },
  { no: '05', id: 'honest', href: '#honest', title: 'What we do not claim' },
  { no: '06', id: 'report', href: '#report', title: 'Reporting' },
]

export const headline = [
  { tag: 'NO PORT', t: 'Telegram uses long-polling. v0.1 opens no listener or webhook.' },
  { tag: 'NO KEYS', t: 'Model API keys are never requested, stored, or transmitted. Those belong to your agent.' },
  { tag: 'NO TOOLS', t: "Caraka ships no execution tools. Claude owns the tool policy and sandbox." },
  { tag: 'NO MARKETPLACE', t: 'No plugin registry, no dynamic loading, no third-party skill supply chain.' },
]

export const untrusted = [
  'Telegram messages and callback payloads',
  'Text streamed back by Claude',
  'Tool titles, targets, and raw input from ACP',
  'Unknown fields in Telegram updates',
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
      'Claude owns content handling and tool policy. Caraka never turns agent output or ordinary chat text into approval.',
  },
  {
    id: 'T4',
    name: 'Secret exfiltration through a reply',
    control:
      'Outbound text and audit details are scrubbed. The Telegram token is removed from the Claude subprocess environment.',
  },
  {
    id: 'T5',
    name: 'Destructive action',
    control:
      'Caraka relays every ACP permission request and /stop sends session/cancel. Claude decides which tools require permission.',
  },
  {
    id: 'T6',
    name: 'Leaking into a group',
    control: 'v0.1 rejects every non-private chat before a prompt reaches Claude.',
  },
  {
    id: 'T7',
    name: 'Gateway exposed to the internet',
    control: 'The gateway only makes outbound Telegram requests and starts no network listener.',
  },
  {
    id: 'T8',
    name: 'Plugin supply chain',
    control: 'No marketplace or dynamic loading. Runtime dependencies are pinned in package-lock.json.',
  },
  {
    id: 'T9',
    name: 'WhatsApp account ban',
    control: 'Not applicable: v0.1 contains no WhatsApp channel code.',
  },
  {
    id: 'T10',
    name: 'Runaway cost',
    control: 'Tasks run serially. Caraka has no model provider, reasoning loop, heartbeat, or background scheduler.',
  },
  {
    id: 'T11',
    name: 'No way to audit',
    control: 'SQLite records inbound, outbound, runs, approvals, and errors; triggers reject audit updates and deletes.',
  },
  {
    id: 'T12',
    name: 'Memory poisoning',
    control: 'Not applicable: v0.1 does not install, query, or write a memory provider.',
  },
  {
    id: 'T13',
    name: 'Forged approval callback',
    control:
      'callback_data is capped at 64 bytes, so the payload stays server-side and only an HMAC-signed id travels.',
  },
].map((t, i) => ({ ...t, range: r(i, 2.4, 24) }))

export const modes = [
  { name: 'allowed DM', tone: '#FF7A5E', bg: '#12100F', r: '✓', rTone: ok, w: '✓', wTone: ok, e: 'button', eTone: warn, p: '✓', pTone: ok, range: r(0, 3, 24) },
  { name: 'unknown user', tone: '#95A0AB', bg: '#0C1116', r: '✗', rTone: no, w: '✗', wTone: no, e: '✗', eTone: no, p: '✗', pTone: no, range: r(1, 3, 24) },
  { name: 'group chat', tone: '#95A0AB', bg: '#0C1116', r: '✗', rTone: no, w: '✗', wTone: no, e: '✗', eTone: no, p: '✗', pTone: no, range: r(2, 3, 24) },
  { name: 'signed callback', tone: '#95A0AB', bg: '#0C1116', r: '✓', rTone: ok, w: '—', wTone: no, e: '✓', eTone: ok, p: '✓', pTone: ok, range: r(3, 3, 24) },
]

export const risky = [
  'allow_once only',
  'reject_once',
  '10-minute TTL',
  'principal-bound',
  'session-bound',
  'single-use',
  'HMAC-signed',
]

export const mandatory = [
  'The allowlist cannot be empty. The gateway stops with an error that explains how to fix it.',
  'Only private chats from the paired Telegram principal can reach Claude.',
  'Approval only through a signed, single-use callback with a TTL. Chat text is never a fallback.',
  'Token and approval key files use mode 0600 inside a mode-0700 secrets directory.',
  'The outbound scrubber runs before Telegram messages and audit details.',
  'SQLite triggers keep audit rows append-only.',
  'Long-polling opens no listener; unavailable topics fall back to linear mode.',
].map((t, i) => ({ t, range: r(i, 3, 24) }))

export const notClaimed = [
  'Caraka cannot guarantee that Claude asks before every operation. The coding agent owns its tool policy and sandbox.',
  'A signed button proves who approved one request; it does not make the approved operation safe.',
  'We have not had a third-party security audit. This will be stated openly until it changes.',
  'Caraka v0.1 is an early preview. Treat it as software that has not yet been attacked in the wild.',
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
  'A group message or unknown user reaching Claude',
  'Secret leakage through Caraka messages or audit entries',
  'Caraka opening an undocumented network listener',
]

export const outScope = [
  'Anything the operator explicitly approved',
  'Vulnerabilities in the coding agent itself',
  'Vulnerabilities in Telegram or its libraries',
  'Tool access enabled directly in the coding agent configuration',
  'Channels and policy modes not shipped in v0.1',
]
