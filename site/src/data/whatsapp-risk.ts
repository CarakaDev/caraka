// WhatsApp-risk page copy. Every line renders docs/whatsapp-risiko.en.md, the
// English half of the document the error refusing `provider: baileys` links.
// The page is that document, not a summary of it and not an argument of its
// own: no figure, no limit, and no refusal here is softened, strengthened, or
// added to. The Indonesian original is docs/whatsapp-risiko.md.
//
// This route has no comp. Its shapes and its stylesheet are the security
// page's, because it is the same kind of page — a disclosure written so that a
// reader can decide against the thing it documents.

import { r } from '../lib/anim'

export const toc = [
  { no: '01', id: 'today', href: '#today', title: 'Where this stands' },
  { no: '02', id: 'linking', href: '#linking', title: 'Linking a device' },
  { no: '03', id: 'figures', href: '#figures', title: 'The figures' },
  { no: '04', id: 'signals', href: '#signals', title: 'Detection signals' },
  { no: '05', id: 'shape', href: '#shape', title: 'Caraka’s shape' },
  { no: '06', id: 'gates', href: '#gates', title: 'Gates in code' },
  { no: '07', id: 'number', href: '#number', title: 'A separate number' },
  { no: '08', id: 'cloud-api', href: '#cloud-api', title: 'Cloud API' },
  { no: '09', id: 'hit', href: '#hit', title: 'If the number gets hit' },
  { no: '10', id: 'promise', href: '#promise', title: 'What we do not promise' },
]

/** The document's own front matter: who it is for, what it covers, what backs it. */
export const headline = [
  { tag: 'WHO THIS IS FOR', t: 'Anyone weighing the baileys provider, before installing anything.' },
  { tag: 'WHAT IT COVERS', t: 'The baileys provider alone. cloud-api is Meta’s official route and carries none of this class of risk.' },
  { tag: 'WHAT WE HAVE', t: 'No live WhatsApp number has ever been linked to this code, so every figure here comes from other people’s reports.' },
]

/** §2 — the two things the document asks you to know before you pair a device. */
export const beforeYouLink = [
  'This route violates WhatsApp’s Terms of Service.',
  'The Baileys maintainers state that they do not support ToS-violating use, and explicitly forbid bulk or automated messaging.',
]

/** §3 — every number the research holds, each with the limit that qualifies it. */
export const figures = [
  {
    n: '68%',
    says: 'one analysis of 600+ Indian SMB accounts: 68% had at least one ban within 12 months',
    limit: 'an outbound-marketing population, not a one-operator bridge',
  },
  {
    n: '2–8 weeks',
    says: 'a general estimate before tooling on a reverse-engineered protocol is detected, if its behaviour trips the detectors',
    limit: 'that “if” is the whole condition',
  },
  {
    n: 'the range of reports',
    says: 'a few days to several months without trouble',
    limit: 'no reliable pattern behind them',
  },
].map((f, i) => ({ ...f, range: r(i, 3, 24) }))

/** §4 — the reported signals, and where Caraka stands against each. */
export const signals = [
  {
    name: 'Reply ratio',
    reported: 'below 10% counts as high risk',
    stance: 'Caraka only replies. The ratio sits near 100%, and there is no surface for starting a conversation',
  },
  {
    name: 'Contact-graph distance',
    reported: 'messaging people you have no relationship with',
    stance:
      'emit() in src/channels/whatsapp.ts refuses to write to a number that has never written first and is not in allowFrom, and writes an audit row',
  },
  {
    name: 'Timing',
    reported: 'send patterns too regular to be human',
    stance:
      'a uniform random gap of 1,200–3,500 ms between outbound messages, under a ceiling of 12 per rolling 60 seconds. Excess is queued, never dropped',
  },
  {
    name: 'Reconnect',
    reported: 'repeated logouts and 401s after reconnecting',
    stance:
      'backoff of 5 seconds ×2 with full jitter, a 300-second ceiling, and a stop at the sixth attempt. A logged-out or 401 answer is never retried at all',
  },
  {
    name: 'Traffic origin',
    reported: 'datacenter or VPS IP addresses',
    stance:
      'not handled. Caraka runs on your machine; if that machine is a VPS, the signal is there and nothing inside the program can fix it',
  },
].map((s, i) => ({ ...s, range: r(i, 2.4, 24) }))

/** §6 — four of the research's five mandatory mitigations, as program behaviour. */
export const gates = [
  {
    title: 'allowFrom is mandatory.',
    body: 'The config schema uses .min(1), so a whatsapp: block with an empty list stops caraka start with a message naming the channel (src/config.ts).',
  },
  {
    title: 'A hard outbound ceiling and a random gap,',
    body: 'enforced in emit(), with the numbers in the table above.',
  },
  {
    title: 'No first-contact messages, ever,',
    body: 'enforced in the same function.',
  },
  {
    title: 'Choosing baileys does not take effect until you write acknowledgeRisk: true',
    body: 'in the config. Without it start refuses, and the message links to this page (docs/frd.md FR-SETUP-06).',
  },
].map((g, i) => ({ ...g, n: String(i + 1), range: r(i, 3, 24) }))

/** §7 — the two rules that outlive any release. */
export const separateNumber = [
  {
    title: 'Do not put a colleague’s number in allowFrom “just in case”.',
    body: 'That list is the only sender gate there is, and every number on it can drive the agent.',
  },
  {
    title: 'Groups are unsupported, and that is a decision.',
    body: 'The linked-device protocol names the group itself as the sender, so every member would arrive as one principal and every member would read the approval code on the same card. Caraka refuses group messages in receive(); only one-to-one conversations with a number in allowFrom get through.',
  },
].map((s, i) => ({ ...s, range: r(i, 3, 24) }))

/** §8 — what the official route asks for in exchange. */
export const cloudApi = [
  {
    title: 'Meta Business verification,',
    body: 'which takes several days.',
  },
  {
    title: 'Per-message pricing,',
    body: 'roughly $0.005–0.08 depending on country and direction. On 1 July 2025 Meta moved from conversation-based to per-message pricing. Utility templates are free inside the 24-hour window; Marketing and Authentication are always paid. Caraka only replies to conversations that already exist, so it never sends a template.',
  },
  {
    title: 'A dedicated number',
    body: 'that cannot be shared with your personal WhatsApp.',
  },
  {
    title: 'A webhook endpoint Meta can reach.',
    body: 'The receiver shipped in 0.6.0 and binds 127.0.0.1 by default; any other address needs an explicit flag that prints a warning and writes an audit row before the first connection is accepted. An X-Hub-Signature-256 signature is mandatory and compared in constant time, loopback included. TLS and public exposure are your reverse proxy’s job; Caraka does not provide them and does not claim to (security.md §8).',
  },
].map((c, i) => ({ ...c, range: r(i, 3, 24) }))

/** §10 — what this project will not promise about a WhatsApp number. */
export const notPromised = [
  'We cannot stop WhatsApp from blocking your number if you use an unofficial provider (security.md §12).',
  'Account bans from unofficial providers fall outside the scope of our security reports. The risk is documented and accepted, and it is not treated as a product defect (SECURITY.md).',
  'We have no probability figure for your number, and we will not offer one.',
  'We do not know what happens after a number is hit: the appeal route, how long recovery takes, and whether the number can be used again appear in none of the research we hold.',
]

/** Both language versions, in the repository. The error message links the Indonesian one. */
export const sources = [
  { label: 'whatsapp-risiko.en.md', href: 'https://github.com/CarakaDev/caraka/blob/main/docs/whatsapp-risiko.en.md' },
  { label: 'whatsapp-risiko.md', href: 'https://github.com/CarakaDev/caraka/blob/main/docs/whatsapp-risiko.md' },
]
