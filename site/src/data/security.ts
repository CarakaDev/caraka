// Security-page copy follows docs/security.md and the shipped v0.5 runtime.
// Where a line below no longer matches design/mockups/Caraka Security.dc.html,
// the comment above it names the comp line and what shipped instead. The comp
// still decides how this page looks; it stopped deciding what is true of the
// release.

import { r } from '../lib/anim'

const ok = '#8EEE98',
  warn = '#FFD67E',
  no = '#5D666F'

export const toc = [
  { no: '01', id: 'boundary', href: '#boundary', title: 'Trust boundary' },
  { no: '02', id: 'threats', href: '#threats', title: 'Threats' },
  { no: '03', id: 'modes', href: '#modes', title: 'Chat routes' },
  { no: '04', id: 'defaults', href: '#defaults', title: 'Defaults' },
  { no: '05', id: 'honest', href: '#honest', title: 'What we do not claim' },
  { no: '06', id: 'report', href: '#report', title: 'Reporting' },
]

export const headline = [
  { tag: 'NO PORT', t: 'No channel listens: Telegram is polled, Discord is an outbound socket, and there is no webhook anywhere.' },
  { tag: 'NO KEYS', t: 'Model API keys are never requested, stored, or transmitted. Those belong to your agent.' },
  { tag: 'NO TOOLS', t: "Caraka ships no execution tools. Claude owns the tool policy and sandbox." },
  { tag: 'NO MARKETPLACE', t: 'No plugin registry, no dynamic loading, no third-party skill supply chain.' },
]

export const untrusted = [
  'Telegram messages, Discord events, and callback payloads',
  'Text streamed back by the coding agent',
  'Tool titles, targets, and raw input from ACP',
  'Unknown fields in an update from either channel',
]

export const trusted = [
  'config.yaml on disk',
  'Signed callbacks from a button press',
  'Commands typed in your local terminal',
  // Comp line 303 reads "The principal allowlist". v0.2 keeps two lists and
  // consults both before a message is served (src/core/gateway.ts:161-165).
  'The chat and sender allowlists',
]

export const threats = [
  {
    id: 'T1',
    name: 'A stranger sends commands',
    // Comp line 306 ends "Pairing is approved from the terminal, never from
    // chat". Operator pairing still is (src/cli.ts:193-197), but v0.2 pairs a
    // group from a signed button in the operator's DM (gateway.ts:811-886).
    control:
      'Mandatory allowlist; the gateway refuses to start without one. The operator pairs from the terminal, and a group is confirmed by a signed button in the DM of that same operator.',
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
      'Outbound text and audit details are scrubbed, including the shape of a Discord bot token. No variable whose name starts with CARAKA_ reaches an agent subprocess.',
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
    // Comp line 311 promises read-only groups behind a mention, with ephemeral
    // messages for sensitive output. v0.2 ships neither: a group message needs
    // both allowlists (gateway.ts:161-165), and ephemeral was refused as a
    // control (done/v02/spec.md §2b.2), so the disclosure is stated instead.
    control:
      'A group message needs its chat and its sender on the allowlists, and pairing is confirmed in the operator DM. Caraka never asks for group admin, so a bot left in privacy mode reads only commands and replies to itself. Every member of a paired group sees the approval cards, paths, and command output.',
  },
  {
    id: 'T7',
    name: 'Gateway exposed to the internet',
    control: 'Both channels are outbound only, so the gateway opens nothing. Since v0.5 one listener exists and it is not a channel: caraka dashboard binds 127.0.0.1, answers GET only, and holds the database read-only. Binding it anywhere else needs --bind, which prints a warning and writes an audit row first.',
  },
  {
    id: 'T8',
    name: 'Plugin supply chain',
    control: 'No marketplace or dynamic loading. Runtime dependencies are pinned in package-lock.json.',
  },
  {
    id: 'T9',
    name: 'WhatsApp account ban',
    control: 'Not applicable: there is no WhatsApp channel code in the package.',
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
    control: 'Recalled text is labelled as data, its memory markers are stripped so it cannot pose as instruction, and the injected context is capped at 6 items in 800 tokens.',
  },
  {
    id: 'T13',
    name: 'Forged approval callback',
    control:
      'The payload stays server-side and only an HMAC-signed id travels — 33 characters, inside both Telegram\u2019s 64-byte callback_data and Discord\u2019s custom_id.',
  },
].map((t, i) => ({ ...t, range: r(i, 2.4, 24) }))

// Comp line 325 gives the group row four crosses. An allowlisted group or guild
// channel runs like the DM it was paired from — no policy-mode gate exists on the
// run path for any channel — and the row that stays empty is the one missing
// either list. Colours and column order are the comp's.
export const modes = [
  { name: 'allowed DM', tone: '#FF7A5E', bg: '#12100F', r: '✓', rTone: ok, w: '✓', wTone: ok, e: 'button', eTone: warn, p: '✓', pTone: ok, range: r(0, 3, 24) },
  { name: 'unlisted chat or user', tone: '#95A0AB', bg: '#0C1116', r: '✗', rTone: no, w: '✗', wTone: no, e: '✗', eTone: no, p: '✗', pTone: no, range: r(1, 3, 24) },
  { name: 'allowed group or guild channel', tone: '#95A0AB', bg: '#0C1116', r: '✓', rTone: ok, w: '✓', wTone: ok, e: 'button', eTone: warn, p: '✓', pTone: ok, range: r(2, 3, 24) },
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
  // Was "Only private chats from the paired Telegram principal can reach
  // Claude", which v0.2 makes false; the comp line it ported (336) asked for
  // groups behind an explicit opt-in, and the two allowlists are that opt-in.
  'A message reaches Claude only when its chat is on the chat allowlist and its sender is on the sender allowlist.',
  'Approval only through a signed, single-use callback with a TTL. Chat text is never a fallback.',
  'Token and approval key files use mode 0600 inside a mode-0700 secrets directory.',
  'The outbound scrubber runs before every message on every channel, and before every audit detail.',
  'SQLite triggers keep audit rows append-only.',
  'No channel opens a listener; where threads are unavailable, sessions fall back to linear mode with a header.',
  // Comp line 333 already asked for a trust window that expires under a
  // database constraint. v0.2 has it (src/store/db.ts:100), so the card states
  // what the window does not suspend (gateway.ts:546-570).
  'A trust window is opened by a signed callback, never by chat text, and it must state a duration. It closes on /lock, at expiry, or when the gateway restarts. Caraka still receives every permission request inside it, keeps the button on high-risk actions, and audits each decision it makes for you.',
].map((t, i) => ({ t, range: r(i, 3, 24) }))

export const notClaimed = [
  'Caraka cannot guarantee that Claude asks before every operation. The coding agent owns its tool policy and sandbox.',
  'A signed button proves who approved one request; it does not make the approved operation safe.',
  'We have not had a third-party security audit. This will be stated openly until it changes.',
  'The local dashboard has no authentication. While caraka dashboard runs, anyone on that machine who can reach 127.0.0.1 can read it, including a local user with no read permission on the database file. Loopback is not an authentication boundary; what the page does refuse is a browser arriving under someone else\u2019s hostname.',
  'Nothing on the Discord path has ever run against a real Discord. The evidence is a mocked gateway socket and a mocked REST surface, so the real payload shapes, the real 429 behaviour, and the real permissions are unproven.',
  // The second tier, which has no line in the comp because the comp has no
  // trust window. Terminal-only by AC-6.13/6.14; the audit records the window
  // and says so (src/cli.ts:366-397, gateway.ts:969-977).
  'The bypassPermissions mode belongs to Claude and is opened from the terminal alone. Inside that window Caraka is never asked for permission, so its audit records that the window was open and not what ran inside it.',
  'Caraka v0.5 is a closed beta. Treat it as software that has not yet been attacked in the wild.',
  'Vulnerabilities in your coding agent, in Telegram, or in Discord are theirs to fix. We will help route the report.',
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
  // A group message reaching Claude is the shipped behaviour now, so the
  // reportable failure is a chat or sender that is on neither list.
  'A message from a chat or sender outside the allowlists reaching Claude',
  'Secret leakage through Caraka messages or audit entries',
  'Caraka opening an undocumented network listener',
]

export const outScope = [
  'Anything the operator explicitly approved',
  'Vulnerabilities in the coding agent itself',
  'Vulnerabilities in Telegram or in Discord',
  'Tool access enabled directly in the coding agent configuration',
  'Policy modes, which are specified and have no gate on the run path in any channel',
]
