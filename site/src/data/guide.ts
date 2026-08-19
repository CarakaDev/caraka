// Guide-page copy: the path from installed to working in the room where the
// work happens. Every claim traces to ../docs/ or ../src/, and the sentences a
// reader will meet in the chat are quoted from src/i18n.ts rather than
// paraphrased — a page that teaches a refusal in words the program does not use
// is a page that teaches nothing.
//
// This route has no comp. Its shapes and its stylesheet are the docs page's,
// because it is the same kind of page: numbered chapters, a right-hand rail, a
// terminal block, a row table, a note panel. site/AGENTS.md records it beside
// /whatsapp-risk, which borrows the security comp the same way.
//
// Two rules bind this file. It carries no version number: site/AGENTS.md names
// the two version-bearing surfaces that are swept by hand, and a third place to
// forget is not worth a sentence that ages anyway. And it is not a fourth
// holder of the release state — status.ts, compare.ts and security.ts hold that
// word between them. Chapter 08 names the limits that bind these instructions,
// which is a different claim from grading the release.

const g = '#7A848F'
const d = '#5D666F'
const ok = '#8EEE98'

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

interface Chapter {
  no: string
  id: string
  href: string
  title: string
  intro: string
  term?: TermLine[]
  rows?: Row[]
  note?: string
}

/** The banner under the headline. `unproven` is the word, and it stays the word. */
export const banner =
  'Caraka is unproven: every phase carries shipped code, and no field gate has been answered by anyone but the author. This page teaches what the program does today, and chapter 08 says which parts of it have only ever answered a test.'

export const chapters: Chapter[] = [
  {
    no: '01',
    id: 'supply',
    href: '#supply',
    title: 'What you supply',
    intro:
      'Caraka owns no account. It drives the coding agent already installed on your machine and speaks through a bot you create yourself, so four things have to exist before the first command runs, and Caraka can install none of them for you.',
    // docs/install-guide.md §1 and the requirement chain in src/data/install.ts.
    // The PATH scan and the one-of-seven rule are src/cli.ts; `agents.none` is
    // the only stop.
    rows: [
      {
        k: 'Node 22 or newer',
        v: 'The runtime for the gateway and for npx. init checks it before anything else.',
      },
      {
        k: 'Git',
        v: 'Your coding agent works inside the repository you point Caraka at, and init checks that Git is there before it pairs anyone.',
      },
      {
        k: 'A coding agent, signed in',
        v: 'init scans PATH for the seven agent binaries it knows and one of them is enough. Nine presets ship, Claude Code over the official ACP adapter is the shortest route, and five of the nine have completed a turn against a live binary here.',
      },
      {
        k: 'A bot of your own',
        v: 'On Telegram that means @BotFather and the token it gives you. You paste it into the init wizard in your terminal, never into a chat and never into a file that gets committed.',
      },
    ],
    term: [
      { t: '$ npx caraka init', tone: '#FF7A5E' },
      { t: '  asks what it needs, pairs one operator, writes config.yaml', tone: d },
      { t: '', tone: d },
      { t: '$ npx caraka doctor', tone: '#B2BCC6' },
      { t: '  names what is missing; --fix repairs what can be repaired alone', tone: d },
      { t: '', tone: d },
      { t: '$ npx caraka start', tone: '#B2BCC6' },
      { t: '  stays in the foreground until Ctrl-C', tone: d },
    ],
    note:
      'The token is stored in a mode-0600 file outside config.yaml. Caraka asks for no model API key, because the agent keeps its own authentication, and it opens no port: Telegram is polled, and both listeners it can start bind 127.0.0.1 unless you say otherwise.',
  },
  {
    no: '02',
    id: 'pair',
    href: '#pair',
    title: 'Pairing',
    intro:
      'init prints a link. Whoever opens it first and presses Start becomes the operator, it answers once, and it dies in five minutes — so it is the one thing standing between a stranger and this machine, and forwarding it hands that machine over.',
    // cli.pairSecret and cli.pairWaiting in src/i18n.ts; the group half is
    // handleMembership in src/core/gateway.ts, which sends the card to
    // directTo(channel, operator) and returns early unless the person who added
    // the bot is already on the sender allowlist.
    rows: [
      {
        k: 'The operator',
        v: 'The first sender on that channel’s allowlist. A few things are read from that person and nobody else, and the path form in chapter 05 is the one you will meet.',
      },
      {
        k: 'Your own conversation with the bot',
        v: 'Everything you write there reaches the coding agent. It starts in assisted mode, where a write or a command draws an approval card before it happens.',
      },
      {
        k: 'A group, or a guild channel',
        v: 'Add the bot to the room. The pairing card arrives in your own conversation with the bot rather than in the room, and only if the person who added it is already on the sender allowlist.',
      },
      {
        k: 'What adding a room chooses',
        v: 'Everyone who can read the room reads the approval cards, the file paths, the diffs, and the command output. The card says exactly that before you press it.',
      },
    ],
    note:
      'Being on the chat allowlist is not permission to write. A room starts read-only, and it stays that way until whoever runs Caraka names it under that channel’s modes in config.yaml on that computer.',
  },
  {
    no: '03',
    id: 'topics',
    href: '#topics',
    title: 'Topics',
    intro:
      'Where the chat app has topics, one session is one topic and its answers arrive there. In a Telegram group three conditions decide whether that happens, and two of them are yours rather than Caraka’s.',
    // topicsAvailable in src/core/gateway.ts reads three things: the config
    // switch through caps.threads, chat.is_forum, and the forumChats entry a
    // membership event writes from can_manage_topics. The trade in the last row
    // is group.topicsOff and Telegram's own privacy-mode documentation, quoted
    // in done/grup-sapa-dan-menu/spec.md.
    rows: [
      {
        k: 'topics: true in config.yaml',
        v: 'The channel-wide switch init writes. With it off, no session opens a topic anywhere on that channel.',
      },
      {
        k: 'The group is a forum',
        v: 'Topics turned on in the group’s own settings, by whoever owns the group. Caraka reads the flag Telegram sends with each message and cannot set it.',
      },
      {
        k: 'Caraka is an admin, with Manage topics',
        v: 'That right is what lets a bot create, rename, close, and reopen a topic. It arrives on a membership event, so promoting Caraka after it was added is what turns topics on.',
      },
      {
        k: 'What that right costs',
        v: 'An admin bot receives every message in the group, because Telegram stops holding ordinary messages back from it. Chapter 04 is what stands in privacy mode’s place.',
      },
    ],
    note:
      'Without all three, sessions run linear behind a workspace and session header and nothing fails. A topic Caraka is refused once marks that container and says so in the room, rather than being retried on every task.',
  },
  {
    no: '04',
    id: 'aim',
    href: '#aim',
    title: 'Aiming a message',
    intro:
      'In a room Caraka answers what is aimed at it and leaves everything else alone. That now holds inside a session topic as well, which is the one place it used to not hold: a topic that carries a session is not the same thing as a sentence addressed to Caraka.',
    // The gate is `aimed` in src/core/gateway.ts; the adapter decides what
    // counts, in addressed() in src/channels/telegram.ts, which excludes a reply
    // to the service message that created the topic. Both /help bodies say the
    // same thing, and docs/frd.md FR-CHAN-09 records that there is no switch.
    term: [
      { t: 'an ordinary line in the room', tone: g, mark: '  ·', markTone: d },
      { t: '  read, and left alone', tone: d },
      { t: '', tone: d },
      { t: '@yourbot add a rate limit to the login route', tone: '#D2D8DF', mark: '  ✓', markTone: ok },
      { t: '(a reply to any message Caraka wrote) run the tests', tone: '#D2D8DF', mark: '  ✓', markTone: ok },
      { t: '/new@yourbot ~/Project/coret Coret', tone: '#D2D8DF', mark: '  ✓', markTone: ok },
    ],
    rows: [
      {
        k: 'Name it',
        v: 'The mention has to open the message. A mention anywhere else in the line is left where it is, so asking Caraka to fix @yourbot’s parser still says @yourbot.',
      },
      {
        k: 'Reply to one of its messages',
        v: 'Any message Caraka wrote counts, and in a topic it opened there is always one, because it posts progress as soon as the topic exists. A reply to the service message that created the topic does not count.',
      },
      {
        k: 'What answers without being aimed',
        v: '/stop and /lock, so a run can be halted by anyone the allowlist names, and a reply carrying an approval code, because where there are no buttons that code is the only way a decision can arrive.',
      },
      {
        k: 'If Caraka is not an admin here',
        v: 'Telegram delivers only a command that names the bot, a reply to one of its messages, and service messages. An ordinary group message never reaches Caraka at all. That is privacy mode, not a fault.',
      },
    ],
    note:
      'In your own conversation with the bot every message is aimed at Caraka by definition, so none of this applies there. There is no setting that turns the gate off in a room.',
  },
  {
    no: '05',
    id: 'session',
    href: '#session',
    title: 'Sessions and folders',
    intro:
      'A session is one task and its transcript. It begins with an ordinary message where ordinary messages arrive, or with /new anywhere, and it runs in the folder the chat is already stuck to unless you name another.',
    // The shapes are read off the code, not off prose: markWorkspace in
    // src/core/gateway.ts reads the first word as a folder only when it is
    // absolute after ~/ is expanded, and routeTask's own /^@(\S+)(?:\s+|$)/ is
    // anchored at the start of the line, so the folder comes first and the title
    // takes the rest. The fourteen commands are gatewayCommands in
    // src/core/channel.ts.
    term: [
      { t: '/new', tone: '#D2D8DF' },
      { t: '  a fresh session, untitled', tone: d },
      { t: '/new Coret', tone: '#D2D8DF' },
      { t: '  a fresh session called Coret', tone: d },
      { t: '@toko-api fix the checkout 500', tone: '#D2D8DF' },
      { t: '  picks that workspace, and the chat sticks to it', tone: d },
      { t: '/new ~/Project/coret Coret', tone: '#FF7A5E' },
      { t: '  names a folder by its path, and offers to add it', tone: d },
      { t: '', tone: d },
      { t: 'in a group the same line names the bot too — one task, one topic:', tone: d },
      { t: '/new@kopipagi_bot ~/Project/kopipagi.id Task Kopi Pagi', tone: '#FF7A5E' },
      { t: '  /new              open a new session', tone: d },
      { t: '  @kopipagi_bot     which bot, when the group holds more than one', tone: d },
      { t: '  ~/Project/…       the folder the agent runs in', tone: d },
      { t: '  Task Kopi Pagi    what the topic is called', tone: d },
    ],
    rows: [
      {
        k: 'The folder comes first',
        v: 'The title takes the rest of the line. A first word that is not an absolute path once ~/ is expanded is part of the title, so /new fix the login bug is a session with that name and not a folder called fix.',
      },
      {
        k: '/ws',
        v: 'Lists the workspaces and their paths. In a room, a slug is how a folder is named.',
      },
      {
        k: 'The path form',
        v: 'Read from the channel’s operator, in any container Caraka serves, and from nobody else. That path becomes the key of a trust window, of a memory scope, and of the directory the agent runs in, so the person who chooses the string is the person who paired.',
      },
      {
        k: 'A path config.yaml does not name yet',
        v: 'Caraka offers to add it. The card is drawn in the operator’s own conversation and nowhere else, and the room is told one fixed sentence saying where the answer is given — the same sentence whether that directory exists, is a file, or overlaps something.',
      },
      {
        k: 'What the card’s Yes does',
        v: 'Three things at once: the entry is written to config.yaml and stays until you remove it, the topic appears, and the session opens empty. Nothing has reached the coding agent yet, so the message after it is the actual task. The card expires in ten minutes and takes the waiting task with it.',
      },
      {
        k: 'Where the session is born',
        v: 'In the room the task came from, not in the conversation where the card was answered.',
      },
      {
        k: 'What is refused before a card exists',
        v: 'A path that is not a directory, a last segment that cannot be a slug, a slug or path already taken, and a folder that contains a workspace you already have — approving ~/Project is not meaningfully smaller than approving the disk. A folder inside an existing workspace does get a card, carrying the cost: two scopes over one directory, so /lock on one leaves the other’s trust window open and memory under one does not surface under the other.',
      },
      {
        k: 'One run at a time',
        v: 'Per workspace, in the order the messages arrived. A second task in the same workspace is queued and told its number, and workspaces run beside each other rather than behind each other.',
      },
    ],
    note:
      'Fourteen commands are registered, so your chat app offers them in its own menu: /new /status /stop /ws /switch /commands /usage /ingat /lupakan /memori /yolo /lock /close /help. Send /help in your own conversation with the bot for what each one does; the answer in a room is a shorter, different one. Those fourteen are all Caraka has. What the coding agent offers is a separate list you read with /commands, and on the ACP route the agent puts its own skills in it — Caraka repeats that list and adds nothing.',
  },
  {
    no: '06',
    id: 'approve',
    href: '#approve',
    title: 'Approvals',
    intro:
      'When the agent wants to write a file or run a command, Caraka stops and asks. The question arrives as a card, and what answers it is a single-use secret rather than a word.',
    // Hard rule 2 in AGENTS.md, and the strings are permission.ttl,
    // permission.ttlReply, approval.codeLocked and trust.card in src/i18n.ts.
    // The ten minutes and the sixty are both in the code that writes them.
    rows: [
      {
        k: 'Where there are buttons',
        v: 'The decision travels inside a signed callback bound to the person, the session, and the request. Pressing it once is the whole answer.',
      },
      {
        k: 'Where there are none',
        v: 'The card carries a code generated on your machine and printed nowhere else, not even in the agent’s own context. Reply ok followed by the code to allow it once, or no followed by the code to refuse.',
      },
      {
        k: 'Ten minutes, and one use',
        v: 'A card expires and answers once. Five wrong codes stop Caraka reading codes in that session until the waiting request is decided or its ten minutes are up.',
      },
      {
        k: 'No word approves anything',
        v: 'Not yes, not approve, nothing a prompt injected into a file could produce. A card in a room is read by everyone in it, and only the person it is bound to can answer it.',
      },
      {
        k: '/yolo 30m, and /lock',
        v: 'A trust window auto-approves ordinary actions in one workspace for a stated duration, 60 minutes at most, and /lock closes it. Opening one is confirmed by pressing a button; chat text cannot open one.',
      },
    ],
    note:
      'The high-risk list applies before any of this and draws a card whatever the mode says. A trust window covers the whole workspace, including the conversations that were never opted in, which is why /yolo is refused in a read-only room rather than quietly scoped to it.',
  },
  {
    no: '07',
    id: 'refused',
    href: '#refused',
    title: 'When it refuses',
    intro:
      'A refusal names what happened and what to do next, and never shows a stack trace. Six of them arrive often enough to be worth reading before you meet one.',
    // Each row is one string in src/i18n.ts: policy.readOnly,
    // ws.pathOperatorOnly, ws.pathMissing, ws.pathOverlap, ws.slugBad, and
    // policy.noTrust. The reason a parent directory is refused is ADR-0010's
    // rejected alternative 1, measured rather than assumed.
    rows: [
      {
        k: 'This conversation is read-only',
        v: 'A room starts that way. Whoever runs Caraka adds that container’s id as assisted under the channel’s modes in config.yaml and restarts. Until then Caraka reads the repository and answers questions there.',
      },
      {
        k: 'A path names a workspace only when the operator writes it',
        v: 'Name the folder by its slug instead, and /ws lists them. Or ask the operator to add it once, after which the slug works for everyone the allowlist names.',
      },
      {
        k: 'That is not a directory Caraka can find',
        v: 'The path is resolved on the machine running Caraka, not on the phone you typed it from. Create it there, or check the spelling, then send the path again.',
      },
      {
        k: 'That path overlaps a workspace',
        v: 'A parent of a workspace is not a smaller grant than the whole disk: one trust window would cover both. Name a directory that holds neither the other, or add it in config.yaml by hand.',
      },
      {
        k: 'That gives no usable name',
        v: 'The slug is the last part of the path, and it has to be letters, digits, dots, dashes, or underscores. Add the entry in config.yaml with a slug of your own, then restart.',
      },
      {
        k: 'No window opened',
        v: '/yolo sent from a read-only room. Send it from your own conversation with the bot, or opt the room in first.',
      },
    ],
    note:
      'Nothing closes a topic on its own. A finished run is renamed with its state glyph and left open, because a run ending is not a session ending — the next message in that topic continues the same session. When you are done, /close marks the session finished, sends a closing line, and closes the topic in that order, so the last thing in the topic explains why the session ended. It refuses while a task is running and names /stop as the way through. Closed, never deleted: the delete call takes the whole transcript with it, while closing is a flag and the history stays readable to every member. In a group the composer is then gone for everyone but an admin with Manage topics, and the next session starts with /new.',
  },
  {
    no: '08',
    id: 'limits',
    href: '#limits',
    title: 'What is unproven',
    intro:
      'The instructions above describe code that ships and is tested. Three parts of it have never been answered by a person, and knowing which three is the difference between following a guide and trusting one.',
    // site/AGENTS.md holds the verified scope and its limits; the topic-closing
    // row is the last entry in spec/grup-nyaman.md's own "Yang tidak
    // dikerjakan", which records both Telegram claims as unverified against a
    // real server rather than claiming them.
    rows: [
      {
        k: 'Telegram is the route that has been used',
        v: 'The Discord path has never touched a real Discord, and no WhatsApp number has ever been linked. Both are shipped code answering a test rather than a person.',
      },
      {
        k: 'Closing and reopening a topic',
        v: 'Exercised against a stub adapter and against the Bot API documentation, never against a real forum supergroup. If a session ends and its topic stays open, this is the gap it fell through.',
      },
      {
        k: 'Four of the nine agent presets',
        v: 'Have never been run here at all: amp, antigravity, cursor, and gemini. The other five each completed two turns and a resume against their real binary. A YAML file that loads is not an agent that answered, and running one is what breaks its preset — two of the five were wrong until the run found them.',
      },
    ],
    note:
      'Where a sentence on this page disagrees with what your own machine does, the machine is right and this page has the bug. docs/troubleshooting.md is the runbook, and the repository takes the report.',
  },
]

/** The closing card: where the long answers live. */
export const closing = {
  title: 'Two pages this one leans on.',
  body: 'Install walks the prerequisites and the prompt that hands the work to your coding agent. Docs is the scope: everything Caraka does, and what it deliberately does not.',
  links: [
    { label: 'Install →', href: '/install' },
    { label: 'Docs →', href: '/docs' },
  ],
}
