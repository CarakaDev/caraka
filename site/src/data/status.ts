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
//
// RELEASE STATE reads `Unproven`, and that one word is the answer this project
// gives everywhere the question is asked: src/data/compare.ts uses it in the
// maturity row and src/data/security.ts in what we do not claim. It is picked
// to carry both halves of the truth at once — every phase in docs/roadmap.md
// carries shipped code, and not one of the field gates has been run by a
// person. `Closed beta` said the first half and hid the second.
export const stats = [
  { n: '1.1.2', label: 'CURRENT VERSION', tone: '#FF7A5E', bg: '#12100F', border: '#2B1612' },
  { n: 'Unproven', label: 'RELEASE STATE', tone: '#FFD67E', bg: '#0C1116', border: '#171C22' },
  // Seven presets load; two routes have completed a turn against a live agent
  // here. Claude Code over ACP, and Codex over the CLI route on 10 August 2026,
  // which took two corrections to its preset to get there — the count of proven
  // agents is two. Three channels since v0.6 — Telegram,
  // Discord, WhatsApp — and WhatsApp counts as shipped code, not as a linked
  // number: none has ever been linked, which the cards below state in as many
  // words.
  { n: '3', label: 'CHANNELS', tone: '#B2BCC6', bg: '#0C1116', border: '#171C22' },
  { n: '1', label: 'PRIVATE OPERATOR', tone: '#B2BCC6', bg: '#0C1116', border: '#171C22' },
]

/**
 * The comp spreads three palettes across the rows — done, in progress, planned.
 * One is left. Every phase 0 to 7 carries shipped code and every phase still
 * holds a gate that only a person outside this repository can close, so eight
 * identical rows is the honest drawing and a green row would be a false one.
 */
const shipped = { ring: '#E2452C', bg: '#12100F', border: '#2B1612', chipBg: '#2B1612', chipInk: '#FF7A5E', state: 'shipped · gate open' }

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
// plans phases 1 and 2. v1.0 is published, so the pulse marks phase 7; only one
// phase pulses because the comp draws one. No row reads "done", because
// roadmap.md holds a gate open on every one of them: phase 0's live topic and
// Rich Message checks, the dogfood week, the three-minute install, phase 3's
// A/B, phase 4's watch of someone adding an agent without asking, phase 5's
// twenty beta developers, phase 6's fourteen days on a real number, and phase
// 7's launch. Phases 1 to 7 moved their gate past the release by owner decision
// on 8 August 2026.
export const phases: Phase[] = [
  { n: '0', title: 'Technical spike', dur: '1 week', ...shipped,
    q: 'Do the three foundations behave the way the documentation says?',
    gate: 'ACP permission requests fire for writes on Claude Code, createForumTopic works in a private chat with no admin rights, and sendRichMessage renders as specified. The permission hook was answered by a live smoke run; the other two still wait on a bot someone is typing to.',
    range: r(0, 3, 26) },
  { n: '1', title: 'MVP dogfood · v0.1', dur: '3 weeks', ...shipped,
    q: 'Is this actually useful in daily work?',
    gate: 'The author uses it for a full week and finishes five real tasks without opening a laptop, and the topic list feels tidier than one flat chat. If it is annoying, fix it before adding anything.',
    range: r(1, 3, 26) },
  { n: '2', title: 'Smooth install · v0.2', dur: '1 week', ...shipped,
    q: 'Can someone else install it without help?',
    gate: 'Median time from npx to first delivered message stays under three minutes, with no questions asked of the author. No setup session has been recorded, so there is no sample to take a median from.',
    range: r(2, 3, 26) },
  { n: '3', title: 'Memory with Titen · v0.3', dur: '2 weeks', ...shipped,
    q: 'Does memory improve the answer, or just add noise?',
    gate: 'A personal A/B across twenty tasks, with and without memory. If it does not feel better, reduce memory rather than add more.',
    range: r(3, 3, 26) },
  { n: '4', title: 'Proving the abstraction · v0.4', dur: '2 weeks', ...shipped,
    q: 'Is the driver layer genuinely generic, or only generic-looking?',
    gate: 'Adding a new agent is one YAML file with no core code touched. A test drives a full turn from a dummy preset, which is the machine half; the half that is open is watching another person do it without asking a question.',
    range: r(4, 3, 26) },
  { n: '5', title: 'Closed beta · v0.5', dur: '3 weeks', ...shipped,
    q: "Does it survive in other people's hands?",
    gate: 'At least 60% of participants send a first message within 24 hours without asking anything, and there are zero incidents of execution without approval. Nobody has been recruited, so neither number has anyone to come from.',
    range: r(5, 3, 26) },
  { n: '6', title: 'WhatsApp · v0.6', dur: '2 weeks', ...shipped,
    q: "Can we ship WhatsApp without burning anyone's number?",
    gate: 'Fourteen days of real use with no ban and no manual relink, or an honest finding that makes Cloud API the recommended default. No number has been linked, so the answer is open.',
    range: r(6, 3, 26) },
  { n: '7', title: 'Public release · v1.0', dur: '2 weeks', live: true, ...shipped,
    q: 'Is it ready to be trusted by strangers?',
    gate: 'Every goal in prd.md is met and measured. Fifteen agents are not covered: seven presets ship and two have answered a live binary here, Claude Code over ACP and Codex over the CLI route. Taking the release to the Indonesian developer community and to the ACP ecosystem is the step nothing in a repository can perform.',
    range: r(7, 3, 26) },
]

// Leaves the comp at Caraka Status.dc.html:280-289, which lists two releases and
// titles the open one "phase 0". Each shipped version adds a card in the shape
// the comp drew; the gates below are the ones roadmap.md still leaves unticked.
export const releases = [
  { v: 'Open gates', state: 'nobody has run these', date: 'after 1.0', tone: '#FF7A5E', chipBg: '#2B1612', chipInk: '#FF7A5E', headBg: '#12100F', border: '#2B1612', range: r(0, 4, 28),
    groups: [
      { label: 'OPEN GATES', tone: '#FFD67E', items: [
        'Complete live topic and Rich Message checks with the release bot',
        'Use Caraka for one full week and finish five real tasks',
        'Record five real setup sessions from people who have never seen it',
        'Run the personal A/B across twenty tasks, with and without memory',
        'Watch someone add an agent preset without asking a question',
        'Recruit twenty beta developers and answer both v0.5 gate numbers with their runs, not the author\u2019s',
        'Watch the dashboard swap a panel in a real browser with the CSP live',
        'Run fourteen days on a real WhatsApp number with no ban and no manual relink, or publish the honest finding that makes Cloud API the default',
        'Take the release to the Indonesian developer community and to the ACP ecosystem',
      ] },
    ] },
  { v: '1.1.2', state: 'unproven', date: '10 August 2026', tone: '#8EEE98', chipBg: '#0E1F14', chipInk: '#8EEE98', headBg: '#0E1216', border: '#171C22', range: r(1, 4, 28),
    groups: [
      { label: 'FIXED', tone: '#FFD67E', items: [
        'caraka --version printed 1.1.0 on an installed 1.1.1. The version was a second copy in the CLI, and npm version moves package.json and nothing else, so the copy drifted the moment a release did not go through the hand that kept it. It is read from the manifest now, and a test runs the built binary and compares what it prints',
      ] },
    ] },
  { v: '1.1.1', state: 'unproven', date: '10 August 2026', tone: '#8EEE98', chipBg: '#0E1F14', chipInk: '#8EEE98', headBg: '#0E1216', border: '#171C22', range: r(1, 4, 28),
    groups: [
      { label: 'FIXED', tone: '#FFD67E', items: [
        'The Codex preset resumed a session with a flag the binary rejects and a sandbox it never applied. codex exec resume takes neither --color nor --sandbox, so every continued turn had been running outside the read-only sandbox that file calls a security control — unseen since v0.4, because the flags were transcribed from documentation and never run',
        'The resume line carries the control as a validated config override now. A wrong value is refused before the model is reached, so it is enforced rather than accepted, and a test pins both the control and the flag that broke it',
      ] },
      { label: 'CHANGED', tone: '#8EEE98', items: [
        'Two agents are proven against a live binary instead of one. Five presets stay transcribed and unrun, and Codex having been wrong on two of its three resume flags is the reason to read that as a warning',
      ] },
    ] },
  { v: '1.1.0', state: 'unproven', date: '8 August 2026', tone: '#8EEE98', chipBg: '#0E1F14', chipInk: '#8EEE98', headBg: '#0E1216', border: '#171C22', range: r(1, 4, 28),
    groups: [
      { label: 'ADDED', tone: '#8EEE98', items: [
        'The policy-mode gate on the run path, which every release before this one specified and none enforced. A conversation the config does not name runs assisted in a direct message and read-only in a room, and read-only refuses a permission request before the card is drawn, refuses /yolo because a trust window covers the whole workspace, and refuses to start at all on a route that decides permissions itself and would give read-only nothing to refuse at. What counts as a write is not the kind label the agent wrote: a read carrying command, content, or an old_string/new_string pair is read as a write, and a tool nobody recognises is refused rather than assumed harmless',
        'A modes map per channel block, keyed by container id or, in a private conversation, by the principal. The shipped config opts nothing in, and trusted cannot be written there at all — a window has to expire, so it stays with caraka trust and /yolo',
        'Deep-link pairing that behaves like the bearer secret it is: 72 bits from randomBytes, one answer, a five-minute deadline it enforces itself, and a constant-time comparison because the payload arrives from the network. The wizard now prints a line under the link saying that whoever opens it first is paired',
        'caraka doctor --fix, which repairs only the three things install-flow.md wrote a correct value for — the directories Caraka owns at 0700, the files it writes at 0600, and a PID file naming a process that is gone — and prints what it refuses with the reason: an unreadable config, a missing workspace, an empty allowlist',
        'caraka uninstall, which deletes the config, the database with both SQLite sidecars, the discovery cache, the PID file, and the whole secrets directory, and names the two things it will not touch: the bot on Telegram’s side, and whatever the coding agent wrote in your workspace. A running gateway stops it at exit 78, and the confirmation takes the word uninstall typed in full',
        'A live smoke for the CLI route, npm run smoke now running scripts/smoke-cli.mjs codex after the Claude one: the real preset through the real loader, the real driver, the real binary, two turns and a resume. It skips when the binary is absent and fails when it is present and will not answer',
        'A CI job that runs npm audit over the production tree and over the tree an install that chose the Baileys provider ends up with, which closes the reason security.md deferred that row',
      ] },
      { label: 'CHANGED', tone: '#6FB9F0', items: [
        'A cede record from --bypass is now held per agent session rather than per workspace. Two conversations on one workspace hold two sessions, and the old key let either of them consume the other’s record, after which nothing restored the session that really was ceded',
        'A failed CLI run is reported in the agent’s own words. codex writes its reason into the structured stdout it was asked for while stderr carries progress notes, so the last stderr line named the wrong cause about as often as the right one',
        'Two security.md §13 rows moved. Safest-shipped-default is met, because the gate it was waiting for exists; the npm audit row is still deferred, but for a new reason — the command now runs, and on the Baileys tree it answers three findings',
        'Roadmap phase 2 stopped saying its boxes were empty. Five of its seven were already built and unticked, and deep-link pairing, doctor --fix, and uninstall are the three this release added',
      ] },
      { label: 'LIMITED', tone: '#FFD67E', items: [
        'Titen was never contacted. It is not installed on this machine and nothing answers on 127.0.0.1:7717, so titen bootstrap, titen serve, and the compile-latency number in phase 0 have no source to be measured from',
        'The Rich Messages spike is still open. What ships is sendRichMessage with a plain-text fallback; structured blocks, sendRichMessageDraft, and the retest of editMessageText with rich_message all need a live bot and a person typing to it',
        'Two agents are proven against a live binary. Claude Code over ACP, and Codex over the CLI route since 10 August 2026 — two turns and a resume that recalled a number. The other five presets are transcribed and unrun',
        'Every field gate is still open, the same nine listed above. A gate on the run path is not a week of use, five recorded setup sessions, an A/B across twenty tasks, twenty beta developers, or fourteen days on a real WhatsApp number',
        'src/ stands at 8,422 lines against the ~8,000 line ceiling in AGENTS.md. The features were built and the fold that pays for them was not; that is over the budget, not near it',
        'Two cells of the assisted row are still design. The table writes ✗ for git push and deploy; what the code does is send a card for both, because the high-risk list applies first and is not differentiated by mode',
      ] },
    ] },
  { v: '1.0.0', state: 'unproven', date: '8 August 2026', tone: '#8EEE98', chipBg: '#0E1F14', chipInk: '#8EEE98', headBg: '#0E1216', border: '#171C22', range: r(1, 4, 28),
    groups: [
      { label: 'ADDED', tone: '#8EEE98', items: [
        'The version number, and not one capability that was not already running under it. Every phase in docs/roadmap.md now carries shipped code at once: three channels on one Channel contract, seven agent presets behind one YAML file each, memory through Titen or a local SQLite provider or none, more than one workspace, a read-only dashboard on loopback, and an approval that is a single-use secret bound to the principal, the session, and the request on every channel',
        'The comparison the roadmap asked for, written so that choosing OpenClaw is a conclusion it offers: docs/openclaw-vs-caraka.md, with an English copy beside it',
        'Notes back to the two projects Caraka sits on, ACP and Titen \u2014 what the client needed, what it could not say in the protocol\u2019s own vocabulary, and which half of them comes from an author who also writes Titen: docs/integrasi-ekosistem.md, with an English copy beside it',
      ] },
      { label: 'LIMITED', tone: '#FFD67E', items: [
        'Nothing here was proven by anyone but the author. No dogfood week, no recorded setup session, no A/B across twenty tasks, no beta group, no fourteen days on a real WhatsApp number. A version number says the code landed; it says nothing about use',
        'The npm registry still holds 0.2.1. Every release since is tagged here and unpublished, and the publish command belongs to the owner',
        'Five of the seven presets are transcribed rather than run. Claude Code and Codex have both answered a live binary here, one on each route, so the fifteen-agent goal in prd.md is still not met',
        'No live Discord credential and no live WhatsApp number has ever been used here. Every check on both answers a fake transport, so the real payload shapes and the real rate-limit behaviour stay unproven',
        'There has been no third-party security audit, and this line stays until there is one',
      ] },
    ] },
  { v: '0.6.0', state: 'closed beta', date: '8 August 2026', tone: '#8EEE98', chipBg: '#0E1F14', chipInk: '#8EEE98', headBg: '#0E1216', border: '#171C22', range: r(1, 4, 28),
    groups: [
      { label: 'ADDED', tone: '#8EEE98', items: [
        'WhatsApp as the third channel on the same Channel contract, both providers behind one id. No method was added to the interface, and core still holds no comparison against channel.id and no literal "whatsapp"',
        'Linear mode cost nothing: the channel declares threads false and the header core already wrote does the rest. /status in a conversation without threads names every session it is holding, capped at the five most recent',
        'caps gains a fourth field, edit, with its reader in the same change. Where it is false the progress path is off entirely — the first ack goes out and nothing follows until the result. The Cloud API has no edit endpoint, so cloud-api declares it false and baileys declares it true',
        'Approval on a channel with no buttons. The card carries a four-character code from randomBytes over a 32-symbol alphabet, stored on the approval row and printed on the card and nowhere else — never in an audit row, a log line, or a prompt. Spending it takes the same single-use UPDATE as the button path with the same ten-minute TTL. A code-shaped message is never forwarded to the agent, matching or not, and a channel that has buttons is given no code at all',
        'Two bounds around that code: five wrong codes from one principal close the code route for that session, said once rather than on every message; and five undecided approvals per session is now a ceiling rather than a plan, with the sixth request cancelled without a card and the refusal in the audit',
        'The five ban mitigations as code that can fail. Every WhatsApp send passes one function no caller can reach around: a rolling ceiling of 12 messages per 60 seconds with the excess queued, a uniform random gap of 1,200–3,500 ms, and a refusal to write to any number that has not written first and is not on allowFrom',
        'A bilingual WhatsApp risk page: what is known about bans, where each figure comes from, what its population actually was, which detection signal Caraka answers in code and which one it cannot answer at all. Choosing baileys without acknowledgeRisk: true stops start with a message linking it',
        'Baileys as an exact-version optional peer dependency, not a dependency and not an optionalDependency, which npm would install by default. Direct runtime dependencies stay at four, one file names the module, and it is reached only through a lazy import. A missing module is one sentence with the exact install command in it',
        'The Cloud API webhook receiver, bound to 127.0.0.1 unless start is given another address, which prints a warning and writes an audit row first. X-Hub-Signature-256 is mandatory and compared in constant time, loopback included, because another local process can knock as easily as Meta. Provider baileys opens no listener at all',
        'The Baileys auth state is treated as a credential rather than session state: secrets/whatsapp/ at 0700 with files at 0600, beside the Cloud API token, verify token, and app secret. doctor reports all four, and every loaded token is seeded to the scrubber',
        'Reconnect with a ceiling and an end: five seconds doubling with full jitter, capped at 300, six attempts before the channel stops and raises the operator’s sentence. The counter resets only after a connection holds 60 seconds. A logged-out or 401 answer is never retried once, and the message names the way back',
        'Group messages are refused outright. On the linked-device protocol a group names itself as the sender, so every member would arrive as one principal and every member would read the approval code on the same card',
      ] },
      { label: 'LIMITED', tone: '#FFD67E', items: [
        'No live WhatsApp number was ever linked on this machine, and no live Cloud API webhook was ever received. Every check answers a fake transport, an injected fetch, a stand-in for the Baileys module, or a real listener on port 0, so the real payload shapes, the real pairing flow, and the real ban behaviour are unproven',
        'Because the Baileys peer is optional, CI never installs it. npm audit does not see it, and a breaking change in its API would not surface from this repository. What holds the line is the pinned exact version and an error message that names it',
        'caraka init whatsapp is not built. A whatsapp: block and the Cloud API credentials are written by hand, with no verification call before they are used',
        'The risk warning is unskippable but late. Start refuses baileys without acknowledgeRisk: true and prints the separate-number warning every time, so nobody runs it unwarned — but the warning arrives after the decision was written into the config, not before',
        'Most numbers in this release are spec-set rather than measured: the outbound ceiling and jitter band, the code length and its attempt limit, the backoff base, ceiling, attempt count and stability window, the five sessions /status names, and maxChars 4096. Only the 30-second progress interval, the ten-minute TTL, and the five pending approvals trace to a document',
        'Two flows core still sends with buttons — the workspace chooser and /yolo — are dead ends on WhatsApp. Core reads caps.buttons at the approval site and not at those two',
        'Groups are unsupported and the block carries no room allowlist, because no room reaches this channel for a second list to gate. The MEDIA: attachment convention is still absent on every channel',
        'src/ stands at 7,996 lines against the ~8,000 line ceiling. That is the line, not room below it',
        'The field half of the phase 6 gate stays open: fourteen days on a real number with no ban and no manual relink cannot be answered from a repository. Moved past the release by owner decision on 8 August 2026',
      ] },
    ] },
  { v: '0.5.0', state: 'closed beta', date: '8 August 2026', tone: '#8EEE98', chipBg: '#0E1F14', chipInk: '#8EEE98', headBg: '#0E1216', border: '#171C22', range: r(1, 4, 28),
    groups: [
      { label: 'ADDED', tone: '#8EEE98', items: [
        'A Channel contract named from the twelve methods the gateway already called, not from the onMessage/onChoice sketch the specification carried. Updates stay an async generator the gateway drives in one line, so a channel that pushes bridges into a generator inside its own adapter',
        'caps with three fields \u2014 threads, buttons, maxChars \u2014 because three are all core has anything to ask about. Without buttons a permission request is refused and audited, never moved to chat text; maxChars decides how much of the progress tail survives',
        'One gateway holding a list of channels. Allowlists are maps keyed by channel id and the run slot stays keyed by workspace slug, so one workspace runs one task at a time whichever channel asked',
        "Discord on the built-in fetch and Node's global WebSocket: no new dependency, and the module is imported only when a discord: block exists. Identify, heartbeat, resume, backoff reconnect, a half-open socket closed rather than left hanging, and a fatal close code that stops instead of retrying",
        'One public thread per Discord session with auto_archive_duration 10080, the state glyph in the thread name, and archived: true after the closing summary. Archiving never claims to free quota, because Discord counts archived threads; the limit arrives as a thrown error and that container falls to linear mode',
        'Approval on Discord with the primitive untouched: the same 33-character signed payload as custom_id, a deferred ack before core touches the database, and components disabled at the same fork that clears a Telegram keyboard. A Discord role authorises nothing',
        'No privileged intent is requested, so the text of an ordinary Discord message never arrives. The readiness message says so and names what does arrive: a slash command, and a button on a card Caraka sent',
        'caraka dashboard: seven read-only panels on 127.0.0.1:7718 with the database opened readOnly. Anything but GET is refused before a query runs, every statement is a literal with bound parameters, and a request whose Host is not a loopback literal is refused',
        'Runs and the beta numbers are derived from the audit log rather than from new tables. The opt-in is on sharing the two numbers, not on collecting them \u2014 the audit log is a mandatory control and was never optional',
        'Two leaks closed: every CARAKA_ variable is now stripped from an agent subprocess rather than one named token, and the scrubber learned the shape of a Discord bot token that both the Telegram and the JWT pattern missed',
      ] },
      { label: 'LIMITED', tone: '#FFD67E', items: [
        'No live Discord credential was ever used on this machine. Every Discord check answers a mocked fetch and a mocked WebSocket, which leaves the real payload shapes, the real 429 behaviour, and the real permission set unproven',
        'The dashboard has no authentication, deliberately. While it runs, anyone on that machine who can reach 127.0.0.1 can read it, including a local user with no read permission on the database file. Loopback is not an authentication boundary',
        'caraka init discord is not built. A discord: block is written by hand, and saveConfig writes the token file at mode 0600',
        'The htmx swap has never been watched in a real browser with the CSP live',
        'Role to policy-mode mapping on Discord is not built, and not for lack of time: no policy-mode gate exists on the run path for any channel, so mapping a role to read-only would promise a refusal that does not happen',
        'Both human halves of the phase gate stay open \u2014 twenty beta developers are not recruited, and neither gate number can be answered by the author. Moved past the release by owner decision on 8 August 2026',
      ] },
    ] },
  { v: '0.4.0', state: 'preview', date: '8 August 2026', tone: '#8EEE98', chipBg: '#0E1F14', chipInk: '#8EEE98', headBg: '#0E1216', border: '#171C22', range: r(1, 4, 28),
    groups: [
      { label: 'ADDED', tone: '#8EEE98', items: [
        'presets/agents/, holding seven presets validated by a strict schema of only the fields the code reads. An invalid file is named with its failing field and skipped while the rest load, and one preset may carry both the ACP and CLI routes',
        "A generic CLI driver: it spawns the preset's command in the session's workspace, parses json, jsonl, or text output, finds the agent-side session id, and cancels with SIGTERM then SIGKILL. The whole answer arrives as one text update",
        "Driver selection per run: ACP when the preset's adapter resolves and survives initialize, the CLI route when it does not, otherwise an error naming the agent and the next step. A workspace can force one route",
        "More than one workspace: an additive workspaces list in config, @slug in front of a message routes it and sticks as the chat's default, and a button chooser asks when several workspaces exist and none is sticky",
        'One active run per workspace, the rest queued FIFO per workspace with the ack numbered. /stop cancels the run of the sender\u2019s workspace only',
        '/switch moves a session to another loaded preset on its next task, and /ws lists workspaces, answering in General. Neither hardcodes any agent\u2019s mode names',
        'Discovery scans PATH for the seven known binaries and caches the result for a day; init now needs any one agent found rather than Claude specifically',
        "The repository's first CI workflow: the four gate commands, every preset through the loader's schema, and the recorded parser fixtures",
      ] },
      { label: 'LIMITED', tone: '#FFD67E', items: [
        'Live verification still covers Claude Code only. The codex flags are copied verbatim from the documented block but were never run here, and the gemini, cursor, goose, and amp ACP commands plus every aider flag are transcribed from research, marked unverified inside their files',
        'CI runs no live smoke: the runners hold no agent binary and no credentials, so the workflow validates schemas and parser fixtures and says so instead of faking a matrix',
        'The CLI route has no permission hook and no streaming. Approval on that route falls to the agent\u2019s own brakes — codex keeps its read-only sandbox, and aider\u2019s auto-approve flag was removed',
        'A CLI session\u2019s agent-side thread id lives in process memory; after a gateway restart the next turn starts a fresh agent thread',
        'The human half of the phase gate — someone adding an agent without asking a question — stays open, moved past the release by owner decision on 8 August 2026',
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
