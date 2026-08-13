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
  { n: '1.3.2', label: 'CURRENT VERSION', tone: '#FF7A5E', bg: '#12100F', border: '#2B1612' },
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
  { v: '1.3.1', state: 'unproven', date: '13 August 2026', tone: '#8EEE98', chipBg: '#0E1F14', chipInk: '#8EEE98', headBg: '#0E1216', border: '#171C22', range: r(1, 4, 28),
    groups: [
      { label: 'FIXED', tone: '#FFD67E', items: [
        'Caraka renamed threads it did not open, and on a channel that can archive one it archived them too. A session can be born inside a topic that already exists — the thread arrives on the incoming message, and a topic is only created when there is none — so a message sent inside a topic a human made and named gave that session the human’s thread, with nothing recording who made it. The first state change then renamed it to the first line of whoever’s message started the task',
        'The half the report did not reach: the archive call runs on done, failed and cancelled, so one task run inside someone else’s thread renamed it and then archived it. The issue described a rename on Telegram; the hole was in core, and one guard closes both because the rename and the archive sit behind the same check',
        'Caraka records the threads it opens and mutates only those. A thread it does not own gets neither call, one audit line naming the chat and the thread, and a session that runs and answers exactly as before — the guard costs a glyph, never a name. Ownership is keyed by thread rather than by session, so a second session opened in the same topic through /new inherits it',
      ] },
      { label: 'LIMITED', tone: '#FFD67E', items: [
        'A name already overwritten cannot be restored. It was never stored, and the Bot API has no method that returns a forum topic’s name — which is also why the stored record is a bit and never a name',
        'After upgrading, a session that already had a topic stops updating its glyph. No audit row records a topic’s creation and no name can be read back, so ownership of a thread that predates this release cannot be proven from anything on disk, and the guard fails closed rather than guessing. Guessing the other way is what renames someone else’s topic',
        'Half of the acceptance criteria in the report are deliberately not built. They ask for an explicit target name and a current-to-target confirmation, which assume a product that offers renaming to its users; Caraka has no rename command, and its only topic mutation is the automatic state glyph. What it needed was a provenance condition',
        'src/ measures 9,438 lines against the ~8,000 ceiling, up 26, of which eleven are the comment recording why ownership sits beside the route and why the guard sits below the glyph check',
      ] },
    ] },
  { v: '1.3.0', state: 'unproven', date: '13 August 2026', tone: '#8EEE98', chipBg: '#0E1F14', chipInk: '#8EEE98', headBg: '#0E1216', border: '#171C22', range: r(1, 4, 28),
    groups: [
      { label: 'FIXED', tone: '#FFD67E', items: [
        'The outbound scrubber did not redact a bot token in the one shape a bot token travels in. Its pattern opened with a word boundary, and Telegram’s download endpoint writes …/file/bot<token>/<path>, where nothing separates the t of bot from the first digit. Measured: the bare token redacts, the token in a sentence redacts, the token in either API URL passed through whole. store.audit runs that scrubber over every row and the audit table refuses an UPDATE and a DELETE, so what lands there cannot be taken out',
        'caraka trust /tmp --for 60 --bypass wrote a trusted grant with bypassPermissions for a path no config.yaml names, and printed success. Nothing between reading the argument and writing the row asked whether it was a configured workspace. It was inert only because an unknown session slug resolved to the first workspace instead of to nothing, and both halves of that accident are closed',
        'caraka start died on any operating system when the ACP adapter could not be spawned. It held the one spawn in the tree with no error listener, and Node throws an unhandled one, so the documented fall back to the CLI driver was unreachable through that path. The Windows report that surfaced it was a way in rather than the cause',
        '/lock told the operator no trust window was open while windows were open, on a multi-workspace install in a chat with no session and no sticky workspace',
        'caraka trust did nothing at all for a config path spelled with a trailing slash or a .., and still printed success: it resolved its argument while the gateway keyed on the raw config string, so the grant it wrote could never be matched by the lookup that reads one',
        'A photo, a voice note, a video, a sticker, a document and a location all vanished without a word. The inbound path read "if there is no text, return" — a nullability check standing in for a content-kind check — and it sat before the audit line, so the message was authorised and then left no row',
        '/newsletter was titled sletter, because the titler stripped a leading /new from text routing had already stripped the command from',
        'The verification gate ran the build after the tests, so a test that runs the shipped binary to catch a wrong version number failed in CI on a missing module, and passed on a developer machine only because a previous build was still lying in the directory',
      ] },
      { label: 'ADDED', tone: '#8EEE98', items: [
        'A paired room answers when it is spoken to. One optional tri-state field on the inbound contract: set when the channel saw a mention, a reply to one of the bot’s own messages, or a command it routed, and left unset when the channel cannot tell — which core reads as answer anyway rather than go quiet. No fifth capability field and no stored mode. Two clauses an earlier design carried were cut before any code: a bare thread id reports every message in every forum topic as addressed, including topics humans opened for themselves',
        'The gate sits below the approval-code check and below the whole command router, so /stop, /lock and a code reply keep working in a room that never addressed the bot. A test pins that placement, because hoisting it would kill /stop in every group and nothing would have noticed',
        'Native commands reach a paired group. Registration read the sender allowlist, which on Telegram is the direct messages, so a group menu was empty at startup and stayed empty after pairing. Publishing a menu into a group is new disclosure — the chat scope covers every member, so all thirteen commands and their descriptions become visible to people outside the allowlist — and the pairing card says so',
        '/new keeps its title and can choose its workspace: /new Kerjaan Dummy @dummy opens a session and a topic of that name in that workspace. The path the issue did not mention needed the test — a /new that has to ask which workspace used to lose both its title and its create intent by the time the button was pressed',
        'A workspace can be named by path from the operator’s direct message, confirmed on the signed single-use card pairing already uses, and written to config.yaml on yes. From a group a path is refused and the workspace list is the answer. It arrived behind four things that had to be true first, including a containment check docs/security.md §7 had promised since v1.0 with nothing behind it',
        'An attachment is carried: image bytes over ACP, or -i <path> where a preset names the flag. Generated names only, a fixed mime allowlist, refused past Telegram’s documented 20 MB before a byte is fetched, written under the Caraka home at 0700 and never into the workspace, and the token-bearing URL is built and spent inside the adapter so no part of it crosses into core',
      ] },
      { label: 'CHANGED', tone: '#6FB9F0', items: [
        'The group readiness sentence stopped asserting something false. It told the operator "an ordinary message in this group never reaches me" at the moment they decide whether to pair, and that is false in exactly the configuration Caraka’s own topic feature requires: a per-session topic needs the manage-topics right, an admin bot has privacy mode off, and an admin bot receives everything. getMe answers this in a field the adapter did not declare',
        'A Discord slash command from a stranger no longer says it was received. The adapter acknowledged the interaction before handing anything to core, so a guild member outside the allowlist was told Caraka had it and then got silence',
        'Command resolution answers whether something can be spawned rather than whether a file exists. On Windows npm writes three files per package binary and the one matching the bare name is a shell script; libuv appends only .com and .exe, so the path that check returned was guaranteed to fail. A shell is refused as the fix, and the refusal is written down against CVE-2024-27980',
        'Hard rule 3 in AGENTS.md was rewritten. It claimed trusted mode was terminal-only and enforced by a database constraint; the expiry half is enforced and the terminal-only half has been enforced by nothing since /yolo shipped, because the constraint lists chat explicitly',
      ] },
      { label: 'LIMITED', tone: '#FFD67E', items: [
        'Nothing here was run on Windows. The reported crash has two causes, one platform-independent and fixed and tested; the Windows half is proved through a platform parameter rather than against a real win32. Whether the reporter’s error is gone is unproven and the issue stays open',
        'The attachment path is unproven on Claude Code’s CLI route. Its Read tool is reported to refuse a path outside the project directory, and the bytes deliberately do not land in the workspace, so that combination degrades to the refusal sentence. It works over ACP, where the adapter takes image content blocks',
        'src/ measures 9,412 lines against the ~8,000 ceiling, up 914 in this release, which is 1,412 over rather than near. Each item records its own number, its estimate and the gap; the two largest gaps are four channel wire shapes that had to be declared before an attachment could be read off any of them, and four security preconditions that turned out to live under a one-line feature. One removal paid part of it. The ceiling stays where it is',
        'Every field gate is still open, the same nine as at 1.0.0. Nothing in this release closes one',
      ] },
    ] },
  { v: '1.2.0', state: 'unproven', date: '10 August 2026', tone: '#8EEE98', chipBg: '#0E1F14', chipInk: '#8EEE98', headBg: '#0E1216', border: '#171C22', range: r(1, 4, 28),
    groups: [
      { label: 'CHANGED', tone: '#6FB9F0', items: [
        'The Titen adapter had never spoken to a Titen. It was written from the route table in docs/design.md and tested against a mock built from the same table, so the test agreed with the document and the document was wrong. A Titen 0.7.3 was installed on 10 August 2026 and refused every field: 7717 against the 8787 titen serve binds, scope and text where it reads subject_id and content, budgetTokens where it reads max_tokens, a free-string kind against a closed enum, a required source object left out, and no authorization header at all against a server that answers 401 everywhere memory goes',
        'caraka doctor probed a port nothing was listening on and a path that answers 404 on the port Titen does listen on. Neither existed, so the memory row was red on every install where Titen was running correctly and green on none. It makes a credentialed call to a read-only /v1 route now, and a missing key is its own failing row with the command that fixes it',
        'Four agents have answered a live binary, over five routes, instead of two: Claude Code over ACP and over its CLI route, Codex and aider 0.86.2 on the CLI, goose 1.45.0 over ACP. The aider preset gained --no-pretty, --no-check-update, --no-auto-commits and a resume line, and the gemini preset moved off the deprecated --experimental-acp — corrections that only running them could produce',
        'Nine documents under docs/ have English pairs, up from seven. The other thirty-six say in their own header that they are Indonesian by decision: an accepted decision record is not rewritten, research is provenance for a decision already made, and a specification in two languages is two specifications that will disagree',
      ] },
      { label: 'ADDED', tone: '#8EEE98', items: [
        'CARAKA_TITEN_API_KEY, deliberately not Titen’s own TITEN_API_KEY. claudeEnvironment() strips the CARAKA_ prefix and nothing else, so a key under Titen’s name would be inherited by every spawned coding agent along with the 18 MCP tools, 12 of which write or delete outside the scrubber',
      ] },
      { label: 'FIXED', tone: '#FFD67E', items: [
        '/memori reported memory unreachable against a healthy Titen. It compiles with an empty task, which the local provider reads as "the newest rows" and Titen refuses outright; the adapter substitutes a listing task and the interface contract is unchanged',
        'Which trust window is in force was decided at random when two of them opened inside the same millisecond. A workspace can hold two open trusted rows, and the query that picks one ordered by a timestamp alone — a tie the database is free to break either way, between rows that can differ in principal. It breaks toward the later insert now. Found by running the gate on a second machine, where the test failed on half its runs and here on none',
      ] },
      { label: 'LIMITED', tone: '#FFD67E', items: [
        'Under Titen an observation never surfaces in a compile. compile returns consolidated claims, claims come from a consolidations route that demands the claims themselves, and nothing in Caraka calls it — so a subject with four stored observations compiles to zero items, which is the measured result rather than the feared one. The compile latency, 4.9 ms median over ten consecutive calls, is a floor for the same reason: the compile that produced it selected nothing',
        'Three of the seven presets have never completed a turn here. amp, cursor, and gemini answered initialize over ACP and stopped at "Authentication required", because a full turn on each needs a paid account this machine does not have. All three still carry belum diverifikasi inside their own files, and a handshake is not a turn',
        'src/ measures 8,498 lines against the ~8,000 line ceiling in AGENTS.md, up 149 in this release and 618 since v1.0. That is over the budget, not near it, and the fold that pays for it is work owed',
        'Every field gate is still open, the same nine listed above. Four of them cannot be closed from a repository at all, because each needs other people or calendar time: five recorded setup sessions, twenty beta developers, fourteen days on a real WhatsApp number, and the launch. Phase 0’s two remaining spikes need a live Telegram bot and a person watching their own client',
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
