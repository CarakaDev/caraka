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
  { n: '1.6.1', label: 'CURRENT VERSION', tone: '#FF7A5E', bg: '#12100F', border: '#2B1612' },
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
  { n: '4', label: 'CHANNELS', tone: '#B2BCC6', bg: '#0C1116', border: '#171C22' },
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
  { n: '7', title: 'Public release · v1.0 → v1.6.1', dur: '2 weeks', live: true, ...shipped,
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
  { v: '1.6.1', state: 'unproven', date: '10 October 2026', tone: '#8EEE98', chipBg: '#0E1F14', chipInk: '#8EEE98', headBg: '#0E1216', border: '#171C22', range: r(1, 4, 28),
    groups: [
      { label: 'FIXED', tone: '#FFD67E', items: [
        'A Codex run follows the conversation\u2019s mode. A topic set to assisted passed the policy gate, but Codex always ran read-only, so it could never write. Each mode now picks its own Codex setting: read-only stays read-only, and assisted and trusted write inside the workspace. A resumed session keeps the mode of its route, and a conversation with no configured mode stays read-only',
        'An agent set to driver: acp with no ACP route now stops caraka start with exit code 78, before any channel starts. The message names the agent and gives both fixes: remove driver: acp, or set driver: cli. The old message said the command acp was not found',
      ] },
      { label: 'CHANGED', tone: '#FFD67E', items: [
        'A direct message can now write through Codex. A direct message defaults to assisted, so Codex writes inside the workspace without an approval card, and its own sandbox stops it outside the workspace. A group or topic stays read-only until its mode is set',
      ] },
    ] },
  { v: '1.6.0', state: 'unproven', date: '21 September 2026', tone: '#8EEE98', chipBg: '#0E1F14', chipInk: '#8EEE98', headBg: '#0E1216', border: '#171C22', range: r(1, 4, 28),
    groups: [
      { label: 'ADDED', tone: '#FFD67E', items: [
        'Web/PWA is a fourth local channel. A paired browser can create and resume Gateway tasks, answer approvals, transfer guarded files, manage devices, and install a cache-safe shell',
        'Optional Web Push uses a configured HTTPS origin. Setup plans for Tailscale Serve and a named Cloudflare Tunnel show the requested operation before they change provider state',
      ] },
      { label: 'CHANGED', tone: '#FFD67E', items: [
        'The release includes the attachment path and session status work already on this branch. Public guides now describe the chat-independent Web/PWA setup path',
      ] },
      { label: 'LIMITED', tone: '#FFD67E', items: [
        'Provider, DNS, push delivery, and phone reachability remain manual checks. Web/PWA is not a native Android app, and every existing field gate remains open',
      ] },
    ] },
  { v: '1.5.10', state: 'unproven', date: '3 September 2026', tone: '#8EEE98', chipBg: '#0E1F14', chipInk: '#8EEE98', headBg: '#0E1216', border: '#171C22', range: r(1, 4, 28),
    groups: [
      { label: 'FIXED', tone: '#FFD67E', items: [
        'A run no longer hangs on a terminal with nobody at it. The reporter asked the bot for a git clone on a VPS; the run started and never ended, because git was waiting for a password. It does not read credentials from stdin \u2014 it opens /dev/tty, and the stdio pipes an agent is spawned with do not close that door \u2014 so from a shell, tmux or screen the agent and everything under it inherited a terminal, and the prompt went where nobody reads. Every agent now leads its own process group, which is a session with no controlling terminal, and GIT_TERMINAL_PROMPT=0 names the cause out loud. Measured on one machine in one terminal: still waiting after ten seconds, against exit 128 after 467ms',
        'Cancelling a run ends what the agent started. The thirty-minute limit did fire, and it signalled the agent\u2019s own pid \u2014 but a hung git is a grandchild, caraka to claude to bash to git, so every attempt left a tree behind with nothing that could end it. Restarting Caraka reached none of them, because they were no longer its children, and only restarting the machine swept them. The signal goes to the group now, on both routes and on shutdown',
      ] },
      { label: 'CHANGED', tone: '#FFD67E', items: [
        'runner.timeoutMinutes is read. Both troubleshooting files have told operators to raise the run limit with that key for several releases while no code read it: an unknown key is stripped rather than refused, so the file loaded, the number was never used, and nothing said so. The default stays thirty minutes, and one run at a time per workspace means a large number holds a workspace that long',
      ] },
      { label: 'LIMITED', tone: '#FFD67E', items: [
        'Windows cancellation is unchanged \u2014 detached opens a console window there and there is no negative pid to signal \u2014 and no machine running this gate is Windows, so nothing about that platform is claimed. Ctrl-C also stops at Caraka now rather than reaching the agent through the terminal; what ends the agent is the shutdown path that already cancelled every run',
        'Nothing here limits CPU or memory. The report asked for that, and it belongs to the operator\u2019s cgroup, ulimit or systemd unit. A cap would have held the symptom at a ceiling and left every process tree alive',
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
  { v: '1.5.7 → 0.0.0', state: 'in CHANGELOG.md', date: '7–15 August 2026', tone: '#B2BCC6', chipBg: '#171C22', chipInk: '#7A848F', headBg: '#0E1216', border: '#171C22', range: r(2, 4, 28),
    groups: [
      { label: 'WHERE THE FULL ENTRIES ARE', tone: '#FFD67E', items: [
        'CHANGELOG.md in the repository, linked at the foot of this page. It carries every release below at the length it was written in; what is here is one line each, and nothing has been dropped from the history',
      ] },
      { label: 'SHIPPED', tone: '#8EEE98', items: [
        '1.5.7 · 15 August 2026 — a topic name was written again when it had not changed, a 429 held the run, and an image the agent made never reached the chat',
        '1.5.6 · 15 August 2026 — release facts, status badges, and the gate moved together after prose drifted from the package',
        '1.5.5 · 14 August 2026 — a dropped send stranded a session as running for good, and a stored rollout the agent no longer had broke every turn after it',
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
