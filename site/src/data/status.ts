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
  { n: '1.4.2', label: 'CURRENT VERSION', tone: '#FF7A5E', bg: '#12100F', border: '#2B1612' },
  { n: 'Unproven', label: 'RELEASE STATE', tone: '#FFD67E', bg: '#0C1116', border: '#171C22' },
  // Seven presets load; five routes across four agents have completed a turn
  // against a live binary here, all on 10 August 2026 — Claude Code over ACP
  // and over its CLI route, Codex and aider on the CLI, goose over ACP. Two of
  // those presets were wrong until the run found them, so the count of proven
  // agents is four and the argument for reading the other three as unproven is
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
  { n: '7', title: 'Public release · v1.0', dur: '2 weeks', live: true, ...shipped,
    q: 'Is it ready to be trusted by strangers?',
    gate: 'Every goal in prd.md is met and measured. Fifteen agents are not covered: seven presets ship and four have answered a live binary here — Claude Code on both its routes, Codex and aider on the CLI, goose over ACP. Taking the release to the Indonesian developer community and to the ACP ecosystem is the step nothing in a repository can perform.',
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
  { v: '1.4.2', state: 'unproven', date: '14 August 2026', tone: '#8EEE98', chipBg: '#0E1F14', chipInk: '#8EEE98', headBg: '#0E1216', border: '#171C22', range: r(1, 4, 28),
    groups: [
      { label: 'MEASURED', tone: '#6FB9F0', items: [
        'Two things this project had been saying for four releases turned out to be false, and both were settled by measuring. The first: there was no deletion waiting. Four specs in a row closed with a version of the same sentence \u2014 a set of verified removals had been found, and only the rule against mixing a fix with a refactor stood between them and the budget. The pass that finally made them ADDED 35 lines, 9,633 to 9,668',
        'The reason is uniform across all six candidates. Each duplicate is a body of four to twenty lines, and what holds the two copies apart \u2014 an error class, an injected clock, a translated sentence, a body-level retry header \u2014 costs more as parameters than the body costs as a copy. The shared fetch-with-retry is the clearest: 24 lines off the two channel adapters, 47 on in core. Only the twin PRAGMA scans broke even, and the sixth candidate had already been folded',
        'The second: this page was not what was slowing the mobile suite down. That had been called margin erosion from a page growing about 600px per release. Paired runs with the build redone for each side: 15.2s alone before and after, 22.2s under the full suite before and after. Trimming 9,817 pixels moved it by half a second at most, while the full-suite figure swings 18.5 to 22.2s between runs of one build. That test spends 2,673ms navigating thirteen routes and 11,461ms in its own fixed waits, and this page navigates in 123ms \u2014 among the cheapest on the list',
      ] },
      { label: 'CHANGED', tone: '#8EEE98', items: [
        'This page stops growing by a card per release. The five newest keep a full card; the fourteen older ones are one line each, taken from the lead sentence of their own changelog entry. Nothing vanishes \u2014 every published version is still named here, and a test fails on a sixth full card or on a version with no line. 18,455px to 8,638px, twenty cards to seven',
        'One retry loop on the path that carries a bot token, where there were two. This is what the simplification pass actually bought. The copy it deleted had no test at any point in its life, so that path now runs the same code the Discord 429 tests exercise. The token never crosses into core: the helper takes the request as a closure it cannot see into and has no init parameter, which an adversarial review confirmed by reading it',
      ] },
      { label: 'LIMITED', tone: '#FFD67E', items: [
        'Five things the green gate does not prove, recorded rather than claimed as covered: the WhatsApp REST path has no test at all, the Discord body-level retry fallback is never exercised because the tests always send the header, the Discord 204 branch has no caller, one unreachable-channel sentence needs a fetch that throws and nothing makes one, and one memory-failure sentence appears nowhere in the tests',
        'src/ measures 9,668 lines against the ~8,000 ceiling, 1,668 over. The next feature owes that or a removal, and it will not be one of these six',
      ] },
    ] },
  { v: '1.4.1', state: 'unproven', date: '14 August 2026', tone: '#8EEE98', chipBg: '#0E1F14', chipInk: '#8EEE98', headBg: '#0E1216', border: '#171C22', range: r(1, 4, 28),
    groups: [
      { label: 'FIXED', tone: '#FFD67E', items: [
        'A setting that describes direct messages was switching topics off in groups. init read has_topics_enabled from getMe and wrote it as the topic preference, but the Bot API defines that field as "the bot has forum topic mode enabled in private chats" \u2014 it answers for a DM and says nothing about a group. That value became the channel capability, and the gate checks it before anything else, so the one line about groups was never reached. A supergroup forum full of its own topics, where Caraka held the manage-topics right, never got a topic from Caraka',
        'The preference is the operator\u2019s now, the way the Discord one is, and each container kind is decided on its own terms: the forum flag per chat, the manage-topics right per group, and the first real refusal marking a container linear. The gate itself was deliberately left alone \u2014 moving that check into the private branch would have fixed Telegram by breaking Discord, where the same field is a real opt-out',
        'caraka doctor now names the conversation its rows report. Topics and User-created topics read a private-chat field and told the operator to visit BotFather; they say "in direct messages", and the remedy adds that a group\u2019s own topics are unaffected. That row is what sent one operator to the wrong setting',
        'A security test could pass a forgery. It built its forged callback by replacing the signature\u2019s last character with x, so on runs where the signature already ended in x the forgery was the original string and verification correctly accepted it. Measured at 98 collisions in 6,400 callbacks, 1.53%, against the 1.56% one character of a 64-symbol alphabet predicts. The code was never wrong; the test was, and a flaky security test reads as a security hole to whoever meets it next',
      ] },
      { label: 'LIMITED', tone: '#FFD67E', items: [
        'An existing config keeps the value init wrote it. An installation made before this release still holds the preference off until one line is changed by hand; what changed is what the next init writes, and what doctor says about it',
        'A direct message whose topic mode is off now costs one failed API call, once per installation, because the preference no longer pre-empts the attempt. The first real refusal marks that conversation, tells its owner once, and every session after runs linear',
      ] },
    ] },
  { v: '1.4.0', state: 'unproven', date: '14 August 2026', tone: '#8EEE98', chipBg: '#0E1F14', chipInk: '#8EEE98', headBg: '#0E1216', border: '#171C22', range: r(1, 4, 28),
    groups: [
      { label: 'ADDED', tone: '#8EEE98', items: [
        'A preset for opencode, verified against a live binary. opencode acp is a real ACP server over stdio, so it joins on the same route as Claude Code and goose. Two turns with a session load between them, and the second turn recalled the number the first was given \u2014 opencode 1.18.18, 14 August 2026. Nothing in the file changed after that run. Five agents have now answered a live binary here, up from four',
        'A preset for Antigravity CLI, on the CLI route. Its binary is agy, not antigravity, and its help names no ACP at all, so it runs through print mode the way codex and aider do. The JSON envelope was read from real output rather than transcribed: response carries the text and conversation_id the session, and both are already understood by the existing parser, so the preset costs no driver code',
        'The flag that would auto-approve every tool permission exists in that CLI and is deliberately unused. The CLI route hands no permission decisions back to Caraka, so a read-only run refuses it before it starts; that flag would remove the only guard left on that route, which is the agent\u2019s own. A test pins its absence',
      ] },
      { label: 'CHANGED', tone: '#6FB9F0', items: [
        'The install prompt named one agent \u2014 it asked the reader to verify Claude Code and not to change Claude\u2019s configuration \u2014 so anyone using something else had to translate it. The prompt is executed by the agent, so it can address itself: it now asks whoever is reading it to verify that they themselves are installed and signed in. Shorter than what it replaced, and it works for every agent',
        'Both READMEs lead with the agent-assisted path. The website fixed that ordering earlier for a measured reason \u2014 the prompt verifies the prerequisites itself, so the prerequisite sections only matter to someone taking the manual route \u2014 and the README was the last surface still inverted. Nothing was dropped in the move',
      ] },
      { label: 'LIMITED', tone: '#FFD67E', items: [
        'Antigravity is unverified and its own file says where it stopped. It demands a Google sign-in before it answers anything, and the run printed an OAuth URL, waited sixty seconds for a pasted code, and returned an authentication error. Three things stay unproven: whether the response field is populated on a successful turn, whether the conversation id it returns can be replayed, and what its default permission behaviour is in print mode',
        'Gemini CLI was retired for individual Pro and Ultra users on 18 June 2026, and Google names Antigravity as its replacement. That date is two months past. The gemini preset is left in place because nothing depends on it, but the fact is now written inside the preset with its date and a pointer to the successor',
      ] },
    ] },
  { v: '1.3.3', state: 'unproven', date: '13 August 2026', tone: '#8EEE98', chipBg: '#0E1F14', chipInk: '#8EEE98', headBg: '#0E1216', border: '#171C22', range: r(1, 4, 28),
    groups: [
      { label: 'FIXED', tone: '#FFD67E', items: [
        'A workspace written as @~/Project/Coret answered that no workspace had that name. A chat message never passes through a shell, so nothing expands the tilde before Caraka sees it and the token is not an absolute path \u2014 it fell through to the slug list and got a sentence about workspaces instead of one about paths. The request that asked for this feature wrote its example exactly that way, so what shipped accepted the long spelling and refused the one the person asking for it used',
        'A leading ~/ is read as a path rooted in the home of the user running Caraka, and ~ alone is that directory. Only the path branch sees the expansion, so an unknown slug still quotes what was typed. ~user/ is left alone \u2014 another person\u2019s home is a guess about the machine, and a wrong guess names somebody else\u2019s directory',
        'Who may use the path form does not change: still the operator\u2019s own direct message, and a tilde is not a way around it. What ~/x reaches was already reachable by typing the long path in the same conversation by the same person',
      ] },
      { label: 'LIMITED', tone: '#FFD67E', items: [
        'One test is flaky under load and it is not this one. On the first full gate run it failed once, then passed three of three alone, two of two full runs after, and on the second machine. This change is a pure string function and one guard in the router, neither of which touches the approval queue. Written down rather than passed over: a test that fails one run in six will fail on somebody else\u2019s machine one day and be read as a regression',
        'src/ measures 9,620 lines against the ~8,000 ceiling, up 22 against an estimate of 12 \u2014 the closest estimate of this release, because the function is pure and its home directory was already a parameter, so no seam had to be bought',
      ] },
    ] },
  { v: '1.3.2', state: 'unproven', date: '13 August 2026', tone: '#8EEE98', chipBg: '#0E1F14', chipInk: '#8EEE98', headBg: '#0E1216', border: '#171C22', range: r(1, 4, 28),
    groups: [
      { label: 'FIXED', tone: '#FFD67E', items: [
        'Answering yes to the memory offer left a config pointing at a service that could not be started by name. init read the installer\u2019s exit status as proof the provider worked; it is not. The installer finished with status 0, installed into a bun directory, and printed itself that the command would not resolve because that directory is not on PATH \u2014 four things were missing and Caraka claimed none of them were',
        'Three of the four are Caraka\u2019s to do and it does them: the binary is resolved as an absolute path instead of looked up on PATH, bootstrap runs against one pinned store, and the key it prints is stored at 0600. provider: titen is written only when a key is actually held; every other outcome falls back to local and names the step that did not hold',
        'The fourth is the server, which stays the operator\u2019s to run because Caraka installs no background service. What it prints is that one command with the pinned store already in it \u2014 the store matters, because both bootstrap and serve default it to the working directory, so a key made in one place answers 401 from another',
        'The key no longer has to be exported by hand. It is read the way every channel token is: the environment first, the secret file when the environment is silent. caraka doctor reads the same two sources, so its memory row stopped going red on an install that works, and its remedy names the store rather than suggesting the command that produces the 401',
      ] },
      { label: 'LIMITED', tone: '#FFD67E', items: [
        'Recall is still empty under Titen and this release does not change it. An observation is accepted and stored; a compile selects claims, claims come only from a consolidation route, and nothing in Caraka calls it. Verified again with two curl calls: the observation is accepted, and a compile of the same subject answers with an empty list where selected, omitted and deduplicated are all zero \u2014 it was never a candidate. This makes Titen reachable and /ingat genuinely store; it does not make /memori return rows',
        'src/ measures 9,598 lines against the ~8,000 ceiling, up 160 against an estimate of 55 \u2014 the third estimate in this release to come in low, for the same reason each time. About 35 lines are injected seams with their types and defaults, carrying no decision but making the ones that exist reachable from a test; without them none of the ten new tests can run without a real installer on whatever machine runs the gate',
      ] },
    ] },
  { v: '1.3.1 → 0.0.0', state: 'in CHANGELOG.md', date: '7–13 August 2026', tone: '#B2BCC6', chipBg: '#171C22', chipInk: '#7A848F', headBg: '#0E1216', border: '#171C22', range: r(2, 4, 28),
    groups: [
      { label: 'WHERE THE FULL ENTRIES ARE', tone: '#FFD67E', items: [
        'CHANGELOG.md in the repository, linked at the foot of this page. It carries every release below at the length it was written in; what is here is one line each, and nothing has been dropped from the history',
      ] },
      { label: 'SHIPPED', tone: '#8EEE98', items: [
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
