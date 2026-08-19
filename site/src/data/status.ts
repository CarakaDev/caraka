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
  { n: '1.5.9', label: 'CURRENT VERSION', tone: '#FF7A5E', bg: '#12100F', border: '#2B1612' },
  { n: 'Unproven', label: 'RELEASE STATE', tone: '#FFD67E', bg: '#0C1116', border: '#171C22' },
  // Nine presets load; six routes across five agents have completed a turn
  // against a live binary here — Claude Code over ACP and over its CLI route,
  // Codex and aider on the CLI, and goose over ACP, all on 10 August 2026, then
  // opencode over ACP on 14 August. Two of those presets were wrong until the
  // run found them, so the argument for reading the other four as unproven is
  // that running them is what breaks them. Three channels since v0.6 —
  // Telegram, Discord, WhatsApp — and WhatsApp counts as shipped code, not as a
  // linked number: none has ever been linked, which the cards below state in as
  // many words.
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
    gate: 'ACP permission requests fire for writes on Claude Code, createForumTopic works in a private chat with no admin rights, sendRichMessage renders as specified, and the compile latency has a measured number. The permission hook was answered by a live smoke run and the compile latency by a live Titen; the other two still wait on a bot someone is typing to.',
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
  // The title carries both ends of the phase because the phase never closed.
  // v1.0 published on 8 August 2026 and this row read `v1.0` for a week while
  // seventeen more releases shipped inside it, so the page answered "v1.0" to a
  // reader looking at 1.5.5. The gate below is what keeps phase 7 open, not the
  // version, and roadmap.md now lists what shipped between the two numbers.
  { n: '7', title: 'Public release · v1.0 → v1.5.9', dur: '2 weeks', live: true, ...shipped,
    q: 'Is it ready to be trusted by strangers?',
    gate: 'Every goal in prd.md is met and measured. Fifteen agents are not covered: nine presets ship and five have completed a turn against a live binary here, over six routes — Claude Code over ACP and over its CLI route, Codex and aider on the CLI, goose and opencode over ACP. Four have never run here at all. Taking the release to the Indonesian developer community and to the ACP ecosystem is the step nothing in a repository can perform.',
    range: r(7, 3, 26) },
]

// Leaves the comp at Caraka Status.dc.html:280-289, which lists two releases and
// titles the open one "phase 0". The gates below are the ones roadmap.md still
// leaves unticked.
//
// Five shipped releases keep a card each and the rest are one line in the last
// card. Until 14 August 2026 every release added a card and none was ever taken
// away: the page measured 18,455px at 1440x900 and the five newest cards had
// cost 663, 632, 513, 716 and 610px, which is a rate the 320px overflow test
// pays for in seconds. site/AGENTS.md records the deviation and the numbers.
// Adding a release means adding its card at the top of this list and moving the
// sixth one down into the archive card as one line, taken from the lead sentence
// of its own entry in CHANGELOG.md. test/fidelity.test.js fails on a sixth card.
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
  { v: '1.5.9', state: 'unproven', date: '19 August 2026', tone: '#8EEE98', chipBg: '#0E1F14', chipInk: '#8EEE98', headBg: '#0E1216', border: '#171C22', range: r(1, 4, 28),
    groups: [
      { label: 'FIXED', tone: '#FFD67E', items: [
        'One dropped request at boot no longer ends caraka init. On a fresh VPS the first two attempts stopped at Telegram deleteWebhook could not be reached and the fifth went through. The call one line above it is getMe, whose own failure names a rejected token \u2014 the reporter never saw that sentence, so the token was accepted and the request two hundred milliseconds behind it was lost twice. A thrown send got exactly one more attempt, 500ms later; it gets three now, at 500ms and 1500ms, and Discord and WhatsApp route through the same rungs',
        'A deleteWebhook that never left no longer stops the gateway. The poll loop already answers a transport failure by sleeping two seconds and asking again, forever, so a network that arrives late is met by a process still alive to meet it. A webhook that really is still set is not hidden by this: getUpdates answers 409, the loop rethrows it, and start ends on that sentence with exit code 78',
      ] },
      { label: 'CHANGED', tone: '#FFD67E', items: [
        'The refusal that names a running PID now names the directory it read it from, and names CARAKA_HOME with an example. Several instances on one VPS, one folder each, and the second start quit with the first one\u2019s PID: every path hangs off one directory unless that variable moves it, so two installations are one process to that check. Both install guides now carry the whole recipe, including the one the reporter would have hit next \u2014 two pollers on one bot token, and Telegram ending the second with a 409',
        'The /commands answer says where its list comes from. Issue #14 asked for a /skill listing every skill; skills belong to the agent, and on the ACP route the agent already sends them here as commands. The command asked for exists and is called /commands. What did not exist was a sentence saying so, and Caraka still keeps no registry of skills',
        'Six claims that had stopped being true. The Indonesian README said attachments were missing and the registry held 0.2.1; both install guides counted six presets where nine ship; both OpenClaw comparisons recorded the core at 8,349 lines against a paragraph naming 7,996 as the only measured figure, both written on 8 August. Four sentences on this site named Claude where the agent is whichever preset the session runs on',
      ] },
      { label: 'LIMITED', tone: '#FFD67E', items: [
        'A transport that is genuinely down now holds one call for two seconds rather than half of one, and nothing keys the PID lock by workspace \u2014 that lock is the only thing refusing two gateways one config, one database and one secrets directory',
      ] },
    ] },
  { v: '1.5.8', state: 'unproven', date: '16 August 2026', tone: '#8EEE98', chipBg: '#0E1F14', chipInk: '#8EEE98', headBg: '#0E1216', border: '#171C22', range: r(1, 4, 28),
    groups: [
      { label: 'FIXED', tone: '#FFD67E', items: [
        'Text produced inside a tool call leaves with the progress draft. 1.5.7 taught the shared block reader to see tool-call content so an image made by a tool could reach the chat, then the text reader reused it and appended Mem0 recall, shell output and every other textual tool result to the answer sent as the final Rich Message',
        'Preview and answer are separate buffers. Every text block still reaches the temporary preview, while only agent message chunks fill the answer that survives it. Images continue through the shared reader from both messages and tool calls, and the progress draft is still deleted after the final result is sent',
      ] },
      { label: 'LIMITED', tone: '#FFD67E', items: [
        'Memory saved remains in the final answer. Caraka writes it after the agent finishes to name the observation the run stored; it is not a streaming fragment or tool output',
      ] },
    ] },
  { v: '1.5.7', state: 'unproven', date: '15 August 2026', tone: '#8EEE98', chipBg: '#0E1F14', chipInk: '#8EEE98', headBg: '#0E1216', border: '#171C22', range: r(1, 4, 28),
    groups: [
      { label: 'FIXED', tone: '#FFD67E', items: [
        'A name the topic already carried was written again. Reported from outside: every time I give it work it renames the topic again, even though it is already in that topic. What the reporter sees is not the glyph but the cost of it \u2014 every rename writes a service message into the transcript, so a redundant one is litter in the room they are working in. Four paths sent a name the topic already had: /stop and the thirty-minute timeout each cancel a run that then reports itself cancelled, /close writes done on a session whose last run already ended there, and two approvals arriving together each fire twice',
        'The guard sits below the state write, not above it. The state write bumps the row timestamp and the route lookup orders by it, so returning early on an unchanged state would quietly change which session a later message resolves to. It is keyed on the rendered name rather than the state, so a second turn still moves from running to done',
        'A 429 held the run instead of the glyph. The retry loop slept for less than the channel asked \u2014 which is how the next 429 is earned \u2014 and never gave up, and four of the five callers await it, so one rate limit on a rename held the run itself. The wait is honoured in full now and a budget ends the loop: past it the topic loses its glyph rather than the run being held. Renaming a Discord thread is limited to a couple of calls per ten minutes, which one ordinary turn already spent',
      ] },
      { label: 'ADDED', tone: '#8EEE98', items: [
        'An image the agent produced reaches the chat. It did not exist, and the hole ran through three layers: the core update type declared content as text only, the reader returned the empty string for anything else, and no channel method could put bytes in a chat. A turn whose only output was a picture reported that it finished without output \u2014 the agent drew the chart and the person who asked was told nothing had been made',
        'The tool-call path too, which was lost twice over: it was declared without its content field and its update kind was not declared at all, and that is where an image is usually born, because an agent that draws a chart draws it inside a tool',
      ] },
      { label: 'LIMITED', tone: '#FFD67E', items: [
        'A channel without the method answers with a sentence naming what arrived. WhatsApp is that channel: its API needs upload-then-send, its transport seam types the payload as a string, and every write passes the funnel holding five ban mitigations. No number has ever been linked to this code',
        'Bytes cannot pass the secret scrubber. A secret rendered into a picture leaves as a picture, and that is recorded as a limit rather than a gap to close',
        'An ordinary turn still writes two service messages. Those are different names, so nothing skips them; dropping one is a product decision about the status board rather than a bug fix',
      ] },
    ] },
  { v: '1.5.6', state: 'unproven', date: '15 August 2026', tone: '#8EEE98', chipBg: '#0E1F14', chipInk: '#8EEE98', headBg: '#0E1216', border: '#171C22', range: r(1, 4, 28),
    groups: [
      { label: 'CHANGED', tone: '#FFD67E', items: [
        'The release gate now reads this page. The test that fails on a version with a changelog heading and no card here has existed for several releases, but the gate a release runs never touched the site, so 1.4.2 and 1.5.0 both went out with their own version missing from it. CI said so hours after the push, and 1.5.0 was fixed sixteen hours later. The check runs before publish now, and it caught this release',
        'The release line is held by a test rather than by sweeping. Every MIT · vX.Y, unproven on this site and the status badge on both READMEs must equal the version in package.json. That badge is the one a reader clicks to reach roadmap.md, and it read v1.0 for seventeen releases while four other surfaces read v1.5',
        'Forty-one claims in roadmap.md and on this site now match the code. Seven presets became nine and four agents over five routes became five over six, because opencode and antigravity landed in 1.4.0 and no count moved with them. The install and guide pages said init scans PATH for the nine presets when it scans seven binaries and three presets are never looked for. The UI kit printed caraka ws add as the exact command for an empty state, and no such verb has ever existed',
        'roadmap.md records what shipped after v1.0. The phase list stopped at phase 7, so seventeen releases appeared nowhere in it and this page answered v1.0 to a reader looking at 1.5.5',
      ] },
      { label: 'LIMITED', tone: '#FFD67E', items: [
        'No file that npm ships changed. The package carries bin, dist, presets and the dashboard assets; the documentation and the changelog are not among them, and src did not move. Installing this over 1.5.5 changes nothing you can run. It exists so the newest tag in the registry belongs to a repository whose account of itself is accurate',
        'Eleven boxes in roadmap.md are still open and not one was ticked. Every one is a field gate no repository can close, and what was wrong was the prose inside them rather than their state',
      ] },
    ] },
  { v: '1.5.5', state: 'unproven', date: '14 August 2026', tone: '#8EEE98', chipBg: '#0E1F14', chipInk: '#8EEE98', headBg: '#0E1216', border: '#171C22', range: r(1, 4, 28),
    groups: [
      { label: 'FIXED', tone: '#FFD67E', items: [
        'One dropped request stranded a session for good. A transient transport failure \u2014 four ECONNRESETs in a burst of thirty calls, each at 420 to 466ms, measured by the person who reported it \u2014 aborted the task while Caraka was sending its own progress line. That send sat above the run\u2019s try block, so the failure skipped every catch and finally: nothing wrote failed, nothing released the queue, and the session stayed running. One run at a time per workspace means that locks the workspace behind it',
        'A dropped request is now tried once more, after half a second. Discord and WhatsApp got it through the shared helper without either adapter changing; Telegram calls it directly, because Telegram answers 200 for its own errors and puts the code in the body, which a status-reading helper cannot fold in. A refusal is an answer, not a dropped request, and is never retried',
        'A stored session id the agent no longer has is replaced, once. The CLI driver hands the agent\u2019s own id back on every later turn, and when that rollout is gone from disk \u2014 an update, a cleanup, a moved HOME \u2014 the agent refuses and nothing cleared the id, so every turn after repeated the same doomed resume and the session was broken for good. Caraka drops the id and runs the turn again as a fresh session, and says so, because the fresh session does not carry the earlier turns',
      ] },
      { label: 'LIMITED', tone: '#FFD67E', items: [
        'A retried write can arrive twice. Telegram has no idempotency key, and a request that arrived with a lost answer cannot be told apart from one that never left. The trade is one rare duplicate progress line against a session stuck running behind a locked workspace',
        'Only the resume failure that names the id Caraka just sent is retried. A run that died halfway may already have written files, and repeating its prompt would repeat them. The id is the signal because we are the ones who sent it, so no preset has to guess at nine agents\u2019 error sentences',
      ] },
    ] },
  { v: '1.5.4 → 0.0.0', state: 'in CHANGELOG.md', date: '7–14 August 2026', tone: '#B2BCC6', chipBg: '#171C22', chipInk: '#7A848F', headBg: '#0E1216', border: '#171C22', range: r(2, 4, 28),
    groups: [
      { label: 'WHERE THE FULL ENTRIES ARE', tone: '#FFD67E', items: [
        'CHANGELOG.md in the repository, linked at the foot of this page. It carries every release below at the length it was written in; what is here is one line each, and nothing has been dropped from the history',
      ] },
      { label: 'SHIPPED', tone: '#8EEE98', items: [
        '1.5.4 · 14 August 2026 — nine sentences said Claude outright, on paths every task crosses, and the working line took the brand',
        '1.5.3 · 14 August 2026 — an installation whose config said agent: codex ran Claude, and said so',
        '1.5.2 · 14 August 2026 — the topic closed after every turn, because done was read as the end of a session',
        '1.5.1 · 14 August 2026 — the folder form refused the only layout most people have',
        '1.5.0 · 14 August 2026 — a session got its own topic, and a finished one closed it',
        '1.4.2 · 14 August 2026 — a group could not open a topic, because init had read a private-chat setting as the answer for every container',
        '1.4.1 · 14 August 2026 — a setting that describes direct messages was switching topics off in groups',
        '1.4.0 · 14 August 2026 — the install prompt told people to use Claude, and the README buried it under the manual route',
        '1.3.3 · 13 August 2026 — a workspace written as @~/Project/Coret answered that no workspace had that name',
        '1.3.2 · 13 August 2026 — answering yes to the memory offer left a config pointing at a service that could not be started by name',
        '1.3.1 · 13 August 2026 — Caraka renamed threads it did not open, and on a channel that can archive one it archived them too',
        '1.3.0 · 13 August 2026 — six issues filed against a released 1.2.0, and the two most expensive things in the release are in none of them',
        '1.2.0 · 10 August 2026 — the Titen adapter spoke to a live Titen for the first time, and every field it had been sending was refused',
        '1.1.2 · 10 August 2026 — caraka --version printed 1.1.0 on an installed 1.1.1',
        '1.1.1 · 10 August 2026 — one preset was wrong in a way only running it could show',
        '1.1.0 · 8 August 2026 — four boxes open since the specification, closed with code: the policy-mode gate on the run path, deep-link pairing, doctor --fix, and uninstall',
        '1.0.0 · 8 August 2026 — the version number, and not one capability that was not already running under it',
        '0.6.0 · 8 August 2026 — a third channel, and the first one that cannot show a button',
        '0.5.0 · 8 August 2026 — a second channel, and a read-only dashboard to watch it from',
        '0.4.0 · 8 August 2026 — seven agent presets and more than one workspace; the driver layer stopped being Claude-shaped',
        '0.3.0 · 8 August 2026 — memory: what a run leaves behind rides in front of the next prompt, and its failure never blocks a reply',
        '0.2.1 · 8 August 2026 — both fixes came out of live testing in a real group rather than out of review',
        '0.2.0 · 7 August 2026 — groups, a trust window, service units, and a second interface language',
        '0.1.0 · 7 August 2026 — first usable preview, for one private Telegram operator and Claude Code',
        '0.0.0 · 7 August 2026 — name reservation on npm and the initial public specification',
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
