# Changelog

All notable changes to this project are recorded here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.5] — 2026-08-14

Two reports from the same installation, both reproduced here before either was touched.

### Fixed

- **One dropped request no longer strands a session** ([issue #11]). A transient transport failure — the reporter measured four `ECONNRESET`s in a burst of thirty calls, each at 420–466ms — aborted the task while Caraka was sending its own progress line. That send sat *above* `runTask`'s `try` block, so the failure skipped every `catch` and `finally`: nothing wrote `failed`, nothing released the queue, and the session stayed `running` for good. One run at a time per workspace means that locks the workspace behind it. The send now happens inside the `try`, and both readers of the progress message tolerate its absence.
- **A dropped request is tried once more.** `retrySend` in `src/core/channel.ts` retries a *thrown* send after 500ms, once. `fetchWithRetry` routes through it, so Discord and WhatsApp got it without either adapter changing; Telegram calls it directly, because Telegram answers 200 for its own errors and puts `error_code` in the body, which a status-reading helper cannot fold in. A refusal is an answer, not a dropped request, and is never retried.
- **A stored session id the agent no longer has is replaced, once** ([issue #10]). The CLI driver hands the agent's own session id back on every later turn. When that rollout is gone from disk — an update, a cleanup, a moved `HOME` — codex answers `no rollout found for thread id …`, and nothing cleared the id, so every turn after repeated the same doomed resume and the session was broken for good. Caraka now drops the id and runs the turn again as a fresh session. It says so in the chat, because the fresh session does not carry the earlier turns and an answer that quietly forgot them is worse than an error.

### Limited

- A retried write can arrive twice. Telegram has no idempotency key, and a request that arrived with a lost answer is indistinguishable from one that never left. The trade is one rare duplicate progress line against a session stuck `running` behind a locked workspace.
- Only the resume failure that **names the id Caraka just sent** is retried. A run that died halfway may already have written files, and repeating its prompt would repeat them. The id is the signal because we are the ones who sent it, so no preset has to guess at nine agents' error sentences — with a floor of eight characters, so a short id cannot match by accident.
- The retry is bounded to one by construction rather than by a counter: clearing the stored id sets the turn count to zero, and a fresh turn cannot take the resume branch.

[issue #10]: https://github.com/CarakaDev/caraka/issues/10
[issue #11]: https://github.com/CarakaDev/caraka/issues/11

## [1.5.4] — 2026-08-14

Nine sentences said `Claude` outright, and an installation running codex read them on every task.

1.5.3 made the right agent run. It did not change what Caraka says while that agent is working, and the line a person watches on every single task read `◌ Claude sedang bekerja…` no matter which agent had been chosen. So did the approval card, the first line of every new session, and the failure report — `Claude could not finish the task`, which is the sentence the reporter of [issue #9] pasted into it.

This is that bug's third form and its widest: the fix was written into the driver selection, and the catalogs were never read.

### Fixed

- **Six sentences now name the agent that is running**: the working line, the no-output line, the failure report, the approval card header, the first line of a new session, and both `/commands` answers. `agentOf` is the one reader, so they cannot answer differently from each other.
- **Three that cannot reach the name no longer guess one.** `channel.empty` is sent by three channels that never learn which agent answered, and `help.unknownCommand` runs where there is no session; both now say `the agent`, which is what `usage.none` has always said.
- **`FINISHED` is deleted.** It has been dead since 1.5.2 removed the automatic close and was left behind in the same commit.

### Changed

- `DEFAULT_AGENT` moved from `src/cli.ts` to `src/core/driver.ts`. Core has to be able to say it out loud now, and `""` is not a name a person can read.
- Three catalog keys keep the name on purpose and the test that guards this says why: `acp.start` and `acp.notStarted` are the Claude ACP adapter's own errors, and `bypassPermissions` is the name of a mode Claude Code has and the other eight presets do not.

### Added

- **The working line carries the brand**, in the form this project already uses: `cli.running` has printed `Caraka is live: telegram → codex (/path)` since the arrow meant "carried from, to", and the working line means exactly that. It now reads `◌ Caraka → codex · lumaku…`. *Lumaku* is Javanese for "is on its way" — the language of the ꦕꦫꦏ on the mark, and a verb belonging to Caraka rather than to the agent. Both catalogs carry it unchanged, because it is a brand word rather than one to translate.
- The arrow stops there. The approval card is still `⏸ codex asks for permission` and the failure report is still `codex could not finish the task`: what asks and what fails is the agent, and an arrow on those two would claim both for Caraka.

### Limited

- The name printed is the preset id — `codex`, `opencode`, `claude-code` — the same string `caraka doctor` prints. It is not a display name, and there is no mapping from one to the other.

[issue #9]: https://github.com/CarakaDev/caraka/issues/9

## [1.5.3] — 2026-08-14

An installation whose config said `agent: codex` ran Claude, and said so.

Reported from outside as [issue #9] by an installation upgraded 1.3.2 → 1.5.1. Its workspace named `agent: codex`, `caraka doctor` answered `✓ Agent codex codex-cli 0.147.0: ready`, and the service still started Claude, printed `Caraka is live: telegram → Claude`, and failed the first Telegram task with `Authentication required` — on a machine where Claude had never been signed in.

One cause, in three places. An empty agent id resolved against the product default without the workspace it belonged to ever being asked: at start-up, where the warm-up driver was always the default; on every run, where a session row written before its workspace named an agent stores `""`; and in the banner, where `Claude` was fixed text in both catalogs and could never have said anything else.

Sessions created after a workspace names its agent were never affected — `createSession` copies it. What the bug hit was exactly the installations that had been running longest.

### Fixed

- **A session that stores no agent now runs the one its workspace names.** The order is the session's agent, then the workspace's `agent:`, then the product default; it is written once, in `agentFor`, and both places that pick a driver read it. `DEFAULT_AGENT` has not moved and is still the last resort for the installations — most of them — that name no agent anywhere.
- **The warm-up driver started at boot is the first workspace's agent**, not the default. An installation that cannot start its agent fails at start-up rather than on its first task, which is what that line was written for.
- **The line printed when Caraka comes up names the agent actually selected**, as the preset id `caraka doctor` prints: `Caraka is live: telegram → codex (/home/…)`.

### Changed

- Nothing is written to the database for this. Old session rows keep their empty agent and are read against their workspace every time, so changing a workspace's `agent:` tomorrow applies to sessions created before today too.

### Limited

- A workspace naming an agent that is not installed now fails at start-up with that agent's error rather than reaching the first task. That is the intent of the warm-up, but the message an installation with a typo in `agent:` sees is a different one than before.
- No `defaultAgent` key was added to the config. The reporter offered it as one of four possibilities; a single workspace's `agent:` already is that key, and a second global one is only somewhere for the two to disagree.

[issue #9]: https://github.com/CarakaDev/caraka/issues/9

## [1.5.2] — 2026-08-14

The topic closed after every turn, because `done` was read as the end of a session.

1.5.0 closed a topic on `done`, `failed`, and `cancelled`. Only the middle one is unambiguous. `done` is the state one **run** leaves behind, and the next message in that topic continues the same session — so every single turn shut the topic and the turn after reopened it, writing a `forum_topic_closed` and a `forum_topic_reopened` service message into the transcript each time and leaving the topic shut while its session was alive.

Seen on the first installation to use it, an hour after the release: two questions in one topic, two answers, and the topic closed in between with nobody asking for it.

What was asked for was "a close-topic function, not delete" — the ability to close, not an automatic close on a state that is not an ending. Caraka has no event meaning "this session is over", and guessing it from `done` was the wrong guess.

### Added

- **`/close` finishes a session and closes its topic**, in that order: the session is marked done, a closing line is sent, and only then does the topic close — so the last thing in the topic explains why it ended. It sits under the same ownership record as the rename, so Caraka closes only a topic it opened, and a session running without a thread is simply marked finished. A close the channel refuses is swallowed, as before.
- **`/close` refuses while a task is still running**, and names `/stop` as the way through. Closing under a live run would shut the topic the answer was about to arrive in.

### Fixed

- **Nothing closes a topic automatically any more.** A finished run is renamed with its state glyph and left open, which is what it did before 1.5.0.
- **Nothing reopens one automatically either.** With no automatic close there is nothing to reopen, and that branch was firing on every second turn and spending a `TOPIC_NOT_MODIFIED` — a 400 for a bot — on each.

### Limited

- A topic now stays open until somebody sends `/close`, so a busy group's topic list grows until they do. Closing on any guess — `done`, an idle timer, a count — is the same guess that was just removed wearing a different hat.
- After `/close`, ordinary members cannot post in that topic. That is what closing means on Telegram; the next session starts with `/new`, and an admin who wants to continue can reopen the topic from their own client.
- `src/` measures **10,043 lines**, up 72.

## [1.5.1] — 2026-08-14

The folder form refused the only layout most people have.

1.5.0 refused a proposed folder that overlapped an existing workspace in either direction. Only one of those directions is dangerous. A path that **contains** a workspace widens a grant — that is the rooted allowlist ADR 0010 rejected with measurements, one trust window away from every repository beneath it. A path **inside** a workspace grants nothing new: the outer one already reaches it, so the inner one is a narrower key rather than a wider one.

Refusing the inner direction made the feature useless for the commonest setup. `caraka init --workspace "$PWD"` writes one workspace at the directory it was run in, and on the first installation to try this that was `~/Project` — so every folder its owner works in sits inside it. What they got, verbatim:

```
/home/ramaaditya/Project/coret overlaps the workspace Project at
/home/ramaaditya/Project, so one trust window would cover both.
```

### Fixed

- **A folder inside an existing workspace draws a card instead of a refusal.** A folder that contains one is still refused, still with case folded, and still re-checked when the card is pressed.
- **The card says what nesting costs**, rather than the rule deciding on the operator's behalf: one directory with two scopes means `/lock` on one does not close the other's trust window, and memory saved under one does not surface under the other. That is a consequence worth reading before pressing yes, and it was never a reason to refuse.

### Limited

- `/lock` still closes only the workspace it resolves, so a window open on the outer workspace survives a `/lock` in the inner one. That is its own concern and its own fix.
- Merging two scopes over one directory is not attempted. Nested workspaces stay two keys: two trust windows, two memory scopes.

## [1.5.0] — 2026-08-14

Working in a group stopped meaning shouting into it.

Three things a person actually hits, in the order they hit them. A finished session left its topic open forever, so the topic list only grew. Naming a folder needed a direct message, so the group could not start work on anything the config did not already know. And inside a session topic every line became a prompt, which makes the topic useless for talking to anyone but the bot.

### Added

- **A finished session closes its topic.** Closed, never deleted: `deleteForumTopic` takes the whole transcript with it, while closing is a flag and a service message and the history stays readable to every member. Telegram refuses a rename and a close in one call, so the state glyph is written first and the close follows. Continuing a finished session reopens the topic. Caraka closes only topics it opened — the ownership record from 1.3.1 gates the close and the reopen exactly as it gates the rename — and it can never reach the General topic, which has its own methods and no creator exemption. `deleteForumTopic` is now absent from `src/` entirely, comments included, and a test sweeps the whole tree to keep it that way.
- **`/new ~/Project/coret Coret` works from a group.** The folder comes first, the title is the rest, and only an absolute path is read as a folder — `Project/coret` stays a title, which is what makes the rule explainable in two sentences. `@slug` keeps working exactly as before.
- **A page that teaches the whole thing**, at [caraka.dev/guide](https://caraka.dev/guide): what you supply, pairing, topics, aiming a message, sessions and folders, approvals, what happens when Caraka refuses, and what is still unproven. It has no mockup of its own, so it borrows the docs comp's shapes the way `/whatsapp-risk` borrows the security comp's — the one precedent this project already set for a route with no comp.
- **`/help` answers differently in a room than in a direct message.** In a room it says what a room refuses, what everyone in it can read, and what the channel does and does not deliver. With examples, in language a person can act on.

### Changed

- **A session topic is no longer an exception to the addressing rule.** Since 1.3.0 a room only answers when addressed, but any message inside a topic Caraka held a session in counted as addressed — so the topic could not be used for discussion. Now it is addressed the same way everywhere: a mention, a command, or **a reply to one of Caraka's own messages**. Replying is the natural way to continue a session without repeating the bot's name. A reply to the topic-creation service message does not count, and that exemption matters more than it looks: every first-level message in a forum topic is technically a reply to it, so without it the rule that was just removed would come back through the other door.
- **The path form is accepted from any container, and only from the channel operator.** ADR 0010 refused it outside the operator's direct message because whoever can post in a group would otherwise choose what directory the agent runs against. Re-read against the code, what that decision was really holding is *who chooses the string* — `createSession` makes the requester the session's principal, and the store then makes that same person the only one who can answer permission cards inside the directory they named. So the amendment keeps the operator test and drops the container test. The confirmation card is raised in the operator's direct message and nowhere else; the room receives one fixed sentence that does not vary with whether the path exists, because a sentence that varied would be a way to probe the filesystem from a group. Recorded as ADR 0011, which amends 0010 rather than replacing it.

### Fixed

Seven defects in already-shipped code, all found by the reviews that produced this release rather than by anyone using it.

- **A card could have been decidable by the person who triggered it.** The pending workspace entry took its principal from the requester rather than from the operator. Invisible while the path form was direct-message-only, and live the moment a room could ask. The test asserts the stored principal is the operator while the message's sender is somebody else.
- **`create` did not survive the workspace card**, so `/new <new folder> Coret` would have run "Coret" as a prompt instead of titling the session — the owner's own example. Same class as the bug fixed in 1.3.0 for the workspace-choice button; this map had it too.
- **A folder whose name is not a legal slug wrote a config that would not boot.** Refused before the card now, case-insensitively against existing slugs and existing paths both.
- **A proposed folder that contains or is contained by an existing workspace is refused.** Without it `~/Project` becomes by accident the rooted allowlist ADR 0010 rejected with measurements: one `/yolo` on it would auto-approve every non-high-risk action across every repository beneath it.
- **That overlap check did not fold case, while the slug check three lines above it did.** On a case-insensitive filesystem two spellings of one directory passed both directions. And it ran only when the card was drawn, never when it was pressed — so two cards minted separately could be pressed in either order and leave nested workspaces behind. It runs again on the press now.
- **A failed run's explanation never reached its topic.** The error was reported against the message that opened the topic, whose thread id is empty, so it landed in General while the topic was renamed with a failure glyph and closed with nothing inside saying why. The comment above that code asserted the opposite.
- **Two pending maps grew without bound and had no sweeper**, each entry holding a whole inbound message and minting a direct message. The approval path has capped at five since v0.6 for exactly this reason.

### Limited

- `src/` measures **9,971 lines**, up 303. The spec estimated ~190 and its plan wrote an honest expectation of 220–320, citing that the last five estimates in this repository came in low by 1.8 to 2.6 times. It landed at 303, inside the range. No removal paid for it: the pass that looked for one measured the candidates at −35 lines rather than the several hundred four earlier specs had assumed.
- **Whether a closed topic still accepts a message from the bot is implementation evidence, not a documented promise.** Telegram's own server permits it for the topic's creator, which Caraka always is here, but the Bot API page says nothing about it, so every send into a closed topic stays fallible and a refused close is swallowed rather than ending a run.
- Symlink and bind-mount containment is still unpromised, exactly as ADR 0010 recorded it.

## [1.4.2] — 2026-08-14

Two things this project had been saying for four releases turned out to be false, and both were settled by measuring rather than by arguing.

**The first: there was no deletion waiting.** Four specs in a row closed with a version of the same sentence — a set of verified removals had been found, and only the rule against mixing a fix with a refactor stood between them and the complexity budget. That sentence was wrong about the removals. The pass that finally made them **added 35 lines**, taking `src/` from 9,633 to 9,668.

The reason is uniform across all six candidates. Each duplicate is a body of four to twenty lines, and what holds the two copies apart — an error class, an injected clock, a translated sentence, Discord's body-level `retry_after` — costs more as parameters than the body costs as a copy. A function declaration is three lines the inline version never had. The shared fetch-with-retry is the clearest case: 24 lines came off the two channel adapters and 47 went on in `core/channel.ts`. Only the twin `PRAGMA` scans broke even, and the sixth candidate had already been folded, which the comment above it said. `AGENTS.md` now records this so a fifth spec does not write the sentence again.

**The second: the status page was not what was slowing the mobile suite down.** The 320px WebKit overflow test had been called margin erosion caused by that page growing ~600px per release. Paired before-and-after runs, with `dist` rebuilt for each side: 15.2s alone before and after, 22.2s under the full suite before and after. Trimming 9,817 pixels off the page moved it by half a second at most, while the full-suite figure swings 18.5–22.2s between runs of one build. Route-by-route timing says why: that test spends 2,673ms navigating all thirteen routes and 11,461ms in its own fixed waits, and `/status` navigates in 123ms — among the cheapest on the list. It pays for its waits, not for page height.

### Changed

- **The status page stops growing by a card per release.** The five newest releases keep a full card; the fourteen older ones became one line each — version, date, and the lead sentence of their own changelog entry — inside one more card of the shape the comp already drew. Nothing vanishes: every version with a heading in `CHANGELOG.md` is still named on the page, and a test fails on a sixth full card or on a published version with no line. `/status` went from 18,455px to 8,638px, and twenty release cards to seven. Worth doing on its own terms; it just does not buy what it was expected to buy.
- **One retry loop on the path that carries a bot token, where there were two.** This is what the simplification pass actually bought. The WhatsApp copy it deleted had no test at any point in its life — every WhatsApp test injects a transport or uses Baileys — so that path now runs the same code Discord's 429 tests exercise. The token never crosses into core: the helper takes the request as a closure it cannot see into and has no `init` parameter, which an adversarial review confirmed by reading it.

### Limited

- **Five things the green gate does not prove**, recorded rather than claimed as covered: WhatsApp's REST path has no test at all, Discord's body-level `retry_after` fallback is never exercised because the tests always send the header, Discord's 204 branch has no caller, `channel.unreachable` needs a `fetch` that throws and nothing makes one, and `memory.failed` appears nowhere in `test/`.
- **Two behaviour-adjacent details from the fold**, written down rather than glossed: the two translated sentences are now built per REST call instead of only on the failing branch, which is a pure catalog lookup either way, and Discord no longer reads the 429 body when the header is usable, where the old code read it and threw it away.
- `src/` measures **9,668 lines**, 1,668 over the ~8,000 ceiling. The next feature owes that or a removal, and it will not be one of these six.

## [1.4.1] — 2026-08-14

A setting that describes direct messages was switching topics off in groups.

`init` read `has_topics_enabled` from `getMe` and wrote it as `telegram.topics`. The Bot API defines that field as *"True, if the bot has forum topic mode enabled **in private chats**"* — it answers for a DM and says nothing about a group. That value became `caps.threads`, and `topicsAvailable` checks it before anything else:

```ts
if (!this.channelOf(chatId).caps.threads) return false;   // stops here
if (message.chat.type === "private") return message.chat.is_forum !== false;
return message.chat.is_forum === true && this.forumChats.get(chatId) !== false;
```

The third line, the only one about groups, was never reached. So a supergroup forum with its own topics, where Caraka held the manage-topics right, never got a topic from Caraka — and the reason was a switch about private chats. Measured on this installation: `getMe` answered `has_topics_enabled: false`, config held `topics: false`, and a group full of topics got none.

### Fixed

- **`init` no longer derives the topic preference from a private-chat field.** `telegram.topics` is the operator's preference, the way `discord.threads` is, and it is written on. Each container kind is already decided on its own terms: `is_forum` per chat, the manage-topics right per group, and the first real refusal marks a container as linear through `noteThreadsOff`. The gate in `topicsAvailable` is deliberately untouched — moving the `caps.threads` check into the private branch would have fixed Telegram by breaking Discord, where `threads` is a real opt-out.
- **`caraka doctor` names the conversation its rows report.** `Topics` and `User-created topics` read a private-chat field and told the operator to visit @BotFather; they read `Topics in direct messages` and `User-created topics in direct messages` now, and the remedy says a group's own topics are unaffected. That row is what sent the owner of this installation to the wrong setting.
- **A security test could pass a forgery.** `approval callbacks reject forgery and preserve signed decision` built its forged callback by replacing the signature's last character with `x` — so on the runs where the signature already ended in `x`, the forgery was the original string and verification correctly accepted it. Measured at **98 collisions in 6,400 callbacks, 1.53%**, against the 1.56% that one character in a 64-symbol alphabet predicts. The mutation is now guaranteed to differ and asserted to differ before it is used. The code was never wrong; the test was, and a flaky security test reads as a security hole to whoever meets it next.

### Limited

- **An existing `config.yaml` keeps the value `init` wrote it.** An installation created before this release still holds `topics: false` and will keep it until one line is changed by hand. What changed is what the next `init` writes, and what `doctor` says about it.
- **A direct message whose topic mode is off now costs one failed API call**, once per installation, because the preference no longer pre-empts the attempt. `noteThreadsOff` marks that conversation on the first real refusal, tells its owner once, and every session after runs linear. `caraka doctor` clears the marker if the setting changes.
- `src/` measures **9,634 lines**, up 14, all of it comment and renaming — one expression became one literal.

## [1.4.0] — 2026-08-14

The install prompt told people to use Claude, and the README buried it under the manual route.

Caraka ships a prompt a person pastes into their coding agent, and it named one agent: *"Verify Node.js 22 or newer, Git, Claude Code, and `claude auth status`"*, then *"do not change Claude's model/provider configuration"*. Anyone using something else had to translate it themselves. The fix is smaller than it sounds, because the prompt is **executed by** the agent, so it already knows what it is and can address itself — *"verify that you yourself are installed and signed in"*, *"do not change your own model or provider configuration"*. Shorter than what it replaced, and it now works for every agent, including two Caraka has only just learned to drive.

The README was the last surface still leading with the manual commands. The website fixed that ordering in `done/install-prompt-dulu/` for a measured reason — the prompt verifies the prerequisites itself, so the prerequisite sections only matter to someone who chose the manual route — and `docs/install-guide.md` §2 already read that way. README now does too, in both languages.

### Added

- **A preset for opencode, verified against a live binary.** `opencode acp` is a real ACP server over stdio, so it joins on the same route as Claude Code and goose. `scripts/smoke-cli.mjs opencode` against opencode 1.18.18 on 14 August 2026: two turns with a `session/load` between them, and the second turn recalled the number the first was given. Nothing in the file changed after that run — the command and its one flag were right the first time. That takes the count of agents proven here from four to five.
- **A preset for Antigravity CLI, on the CLI route.** Its binary is `agy`, not `antigravity`, and `agy --help` at 1.1.13 names no ACP at all, so it runs through print mode the way codex and aider do: `--print` for the turn, `--output-format json`, and `--conversation <id>` to resume. The JSON envelope was read from real output rather than transcribed — `response` carries the text and `conversation_id` the session, and both are already understood by the existing parser, so this preset costs no driver code at all.
- **`--dangerously-skip-permissions` exists in `agy --help` and is deliberately not used.** The CLI route hands no permission decisions back to Caraka, so a `read-only` run refuses it before it starts; that flag would remove the only guard left on that route, which is the agent's own. A test pins its absence.

### Changed

- **The install prompt names no agent**, on all four surfaces that carry it — `README.md`, `README.id.md`, `site/src/data/install.ts`, and `docs/install-with-ai.md` with its English pair. A test now holds those copies byte-identical to each other, because a prompt duplicated four ways drifts.
- **`## Install` in both READMEs leads with the agent-assisted path.** Nothing was dropped in the move: the warning never to paste the bot token into a chat or an issue, the topic-mode note, and the global-install option are all still there, below.
- **The landing page's terminal read `caraka · v1.1.0`**, three releases stale, and showed only the manual route. It reads the released version and shows the prompt path now. The deviation is recorded in `site/AGENTS.md`, which is where this project keeps every place the port leaves its mockup.

### Limited

- **Antigravity is unverified, and its own file says where it stopped.** `agy` demands a Google sign-in before it answers anything: the run on 14 August 2026 printed an OAuth URL, waited sixty seconds for a pasted code, and answered `{"status":"ERROR","error":"authentication failed or timed out"}`. So three things are unproven — whether `response` is populated on a successful turn, whether the `conversation_id` it returns can be replayed by `--conversation`, and what its default permission behaviour is in print mode. It joins amp, cursor and gemini in that state, and the set of unverified presets is pinned by a test so verifying one means editing that line.
- **Gemini CLI was retired for individual Pro and Ultra users on 18 June 2026, and Google names Antigravity as its replacement.** That date is two months past. The `gemini` preset is left in place — it has never completed a turn here, so nothing depends on it — but the fact is now written inside the preset with its date and a pointer to the successor, so the next person to maintain those lines knows what they are maintaining.
- `src/` is unchanged at **9,620 lines**. Two presets and a prompt rewrite are one YAML file each and some prose, which is the shape hard rule 5 asks a new agent to have.

## [1.3.3] — 2026-08-13

`@~/Project/Coret` answered that no workspace had that name.

The path form that landed in 1.3.1 takes an absolute path, and `~/` is not one. A chat message never passes through a shell, so nothing expands the tilde before Caraka sees it, and `isAbsolute("~/Project/Coret")` is `false` — the token fell through to the slug list and got a sentence about workspaces instead of a sentence about paths. The request that asked for this feature wrote its example exactly that way, so what shipped accepted the long spelling and refused the one the person asking for it used.

### Fixed

- **A leading `~/` is read as a path rooted in the home directory of the user running Caraka.** `~` on its own is that directory. Only the path branch sees the expansion: the slug lookup keeps the token as typed, so an unknown slug still quotes what was written. `~user/` is deliberately left alone — another person's home is a guess about the machine's layout, and a wrong guess names somebody else's directory.
- Who may use the path form does not change. It is still the operator's own direct message, the decision recorded in `docs/adr/0010-workspace-dari-chat.md`, and a tilde is not a way around it. What `~/x` reaches was already reachable by typing the long path in the same conversation, so this translates a spelling rather than opening a door.

### Limited

- **One test is flaky under load and it is not this one.** On the first full gate run of this change, `a session already holding five questions is refused the sixth` failed once. It passed three of three runs on its own, two of two full runs afterwards, and on the second machine. This change is a pure string function and one guard in the router, neither of which touches the approval queue. It is written down rather than passed over, because a test that fails one run in six will one day fail on somebody else's machine and be read as a regression. It deserves work of its own; v1.2.0 recorded the same class of thing in `activeGrant`.
- `src/` measures **9,620 lines**, up 22 against an estimate of 12. The difference is the comment on a second guard the plan did not predict: `workspaceForPath` had already answered, and the guard below it still read the unexpanded token, so a tilde path drew two replies and the one that arrived last was the wrong one.

## [1.3.2] — 2026-08-13

Answering `y` to the memory offer left a config pointing at a service that could not be started by name.

`caraka init` offers to install Titen, and anyone who says yes there has said they want Titen. What the offer left behind was `provider: titen` and four things missing: the command was not on `PATH`, no store had been bootstrapped, no API key existed, and nothing was listening. The cause is one line — the installer's exit status was read as proof the provider worked:

```ts
if (install.status === 0) memoryProvider = "titen";
```

It is not proof. Measured here on 13 August 2026: the installer finished with status `0`, installed through `bun add` into `~/.bun/bin`, and **printed itself** that `titen` would not resolve because that directory is not on `PATH`. Caraka read the status and not the sentence.

Three properties of Titen 0.7.4 shape the fix, and none of them is worked around by changing Titen — they are reported in its own repository and this release stands against 0.7.4 as it is: the installer exits `0` with the binary unresolvable; `bootstrap` and `serve` both default `--db` to the working directory, so a key made in one place answers `401` from another; and a second `bootstrap` on one store throws `UNIQUE constraint failed` while still exiting `0`, so its status cannot tell success from already-done either.

### Fixed

- **The memory offer finishes what it starts, or says which step did not.** Three of the four missing things are Caraka's to do and it does them now: the binary is resolved as an absolute path rather than looked up on `PATH`, `titen bootstrap` runs against one pinned store at `~/.caraka/titen.db`, and the API key it prints is stored at `~/.caraka/secrets/titen.key` at 0600. `provider: titen` is written only when a key is actually held; every other outcome writes `provider: local` and names the step — an installer that did not finish, a binary that did not resolve, or a bootstrap that printed no key. The fourth thing is `titen serve`, which stays the operator's to run because Caraka installs no background service, so what it prints is that one command with the pinned store already in it.
- **The key no longer has to be exported by hand.** It is read the way every channel token is: `CARAKA_TITEN_API_KEY` first, the secret file when the variable is empty. The variable keeps its `CARAKA_` prefix, which is what `claudeEnvironment()` strips before a coding agent is spawned. `caraka doctor` reads the same two sources, so its memory row no longer goes red on an install that works.
- **An existing store is never bootstrapped a second time**, because the exit status cannot distinguish that case and running it prints a stack trace for nothing. A store with no key Caraka can read is not guessed at either: it names `titen key list` and `titen key create` and falls back to `local`.
- **`caraka doctor`'s memory remedy names the store.** It said `run titen serve`, which is the advice that produces the `401` — without `--db` that command opens whatever the working directory holds.

### Limited

- **Recall is still empty under Titen, and this release does not change that.** An observation is accepted and stored; `compile` selects claims, claims come only from `POST /v1/consolidations`, and nothing in Caraka calls it. Verified again against 0.7.4 with two `curl` calls: the observation is accepted, and a compile of the same subject one second later answers `items: []` with `selected_items`, `omitted_items` and `deduplicated_items` all `0` — it was never a candidate. So this makes Titen reachable and `/ingat` genuinely store; it does not make `/memori` return rows. The memory offer says so before anyone answers it, and that sentence is unchanged. `local` returns rows today.
- **The bun install directory is a guess, and a good one rather than a certainty.** `$BUN_INSTALL/bin` then `~/.bun/bin` then `PATH` covers the installer's current behaviour; an install that lands somewhere else falls to `local` with the directory named rather than silently claiming Titen.
- `src/` measures **9,598 lines**, up 160 against an estimate of 55 — the third estimate in this release to come in low, and the same reason each time. About 35 lines are six injected seams with their option type and defaults, carrying no decision but making the ones that exist reachable from a test; about 20 more record which Titen behaviour forced which branch and how it was measured. Without them the figure lands near the estimate and none of the ten new tests can run without a real installer on whatever machine runs the gate.

## [1.3.1] — 2026-08-13

Caraka renamed threads it did not create, and on a channel that can archive one, it archived them too.

A session can be born inside a topic that already exists. `createSession` reads `message_thread_id` off the incoming message and only calls `createForumTopic` when there is none, so a message sent inside a topic a human made and named gives that session the human's thread. Nothing recorded who created it. Then the first state change renamed it to the first line of whoever's message started the task, and the old name was stored nowhere, so nothing could put it back.

Reported as #7 from an incident on a different product, which made it easy to dismiss as somebody else's bug. It was not: the same path exists here, and the report was more conservative than the code deserved. On Discord `finishThread` sends `{ archived: true }`, and it runs on `done`, `failed`, and `cancelled` — so one task run inside someone else's thread renamed it and then archived it. The issue described a rename on Telegram. The hole is in core, and the archive is the half nobody had noticed.

The mention gate that shipped hours earlier in 1.3.0 narrows this and does not close it: an unaddressed message in a human's topic no longer starts a session. Address Caraka there once and the rename still happened.

### Fixed

- **Topic mutation is refused for any thread Caraka did not open.** Caraka records the threads it creates, and `setState` renames or archives only those. A thread it does not own gets neither call, one `topic.skip` audit line naming the chat and the thread, and a session that otherwise runs and answers exactly as before — the guard costs a glyph, never a name. Ownership is recorded per thread rather than per session, so a second session opened in the same topic through `/new` inherits it. The stored value is a bit, never a name: the Bot API has no method that returns a forum topic's name, so there is no name Caraka could honestly claim to know.

### Limited

- **A name already overwritten cannot be restored.** It was never stored and it cannot be read back from Telegram. If a topic of yours was renamed by 1.3.0 or earlier, the name has to be set by hand.
- **After upgrading, a session that already had a topic stops updating its glyph.** There is no audit row recording a topic's creation and no way to read a topic's name, so ownership of a thread that predates 1.3.1 cannot be proven from anything on disk, and the guard fails closed rather than guessing. Topics opened after the upgrade behave as they always did. Guessing the other way is what renames someone else's topic, so the direction is deliberate.
- **Half of the acceptance criteria in #7 are not built, and will not be until they apply.** They ask for an explicit target name, a `current → target` confirmation, and a refusal to infer a name from conversation — all of which assume a product that offers renaming to its users. Caraka has no rename command; its only topic mutation is the automatic state glyph. What it needed was a provenance condition, not a confirmation dialogue. If a rename command is ever added, the confirmation belongs to it, and `spec/topic-provenance.md` records why it is absent now.
- `src/` measures **9,438 lines**, up 26. Eleven of those are the comment recording why ownership lives beside the route instead of on the session row, and why the guard sits below the glyph check where it covers the rename and the archive with one condition.

## [1.3.0] — 2026-08-13

Six issues were filed against a released 1.2.0. The two most expensive things in this release are in none of them, and both were found by reading the code the issues pointed at.

The first is the outbound scrubber. `src/core/security.ts` opened its Telegram pattern with `\b`, and Telegram's download endpoint writes `https://api.telegram.org/file/bot<token>/<path>` — no word boundary separates the `t` of `bot` from the first digit, so the one shape a bot token actually travels in was the one shape the pattern could not see. Measured on 13 August 2026: the bare token redacts, the token in a sentence redacts, the token in either API URL passes through whole. What made it worth stopping everything for is where it lands. `store.audit` runs this scrubber over every row, and the `audit` table carries triggers refusing an `UPDATE` and a `DELETE`, so a token written there cannot be taken out again. The exposure is narrower than it first reads — `src/cli.ts` seeds the running process's own token as an exact secret, and the exact pass runs before the pattern list, so while `caraka start` holds it the token was already covered. The pattern is the layer over a token this process never loaded, and that is the layer the append-only table records forever.

The second is `caraka trust`. `caraka trust /tmp --for 60 --bypass` wrote `mode='trusted'`, `granted_by='cli'`, `agent_mode='bypassPermissions'` for a path no `config.yaml` names, and printed success. Nothing between reading the argument and writing the row asked whether that path was a configured workspace. It was inert only by accident: `activeGrant` is called with configured paths, and an unknown session slug resolved to the first workspace instead of to nothing. Both halves of that accident are now closed, and hard rule 3 in `AGENTS.md` has been rewritten, because it claimed `trusted` was terminal-only and enforced by a database constraint. The expiry half is enforced. The terminal-only half has been enforced by nothing since `/yolo` shipped: the `granted_by` CHECK constraint lists `'chat'` explicitly. A rule that asserts a control it does not have is worse than a rule that admits the gap.

Everything else answers an issue. What none of them asked for and all of them needed: the gate now builds before it tests. `bin/caraka.mjs` imports `dist/cli.js`, `dist/` is gitignored, and the verification gate ran `npm run build` last — so the test that runs the shipped binary to catch a wrong version number failed in CI on a missing module, and passed on a developer machine only because a previous build was still lying in the directory. A gate whose answer depends on untracked leftovers is not one.

### Added

- **A room answers when it is spoken to.** A paired group turned every message from an allowlisted sender into an agent task, so two people talking in that group were dictating prompts. `InboundMessage` gains one optional tri-state `addressed`: set when the channel saw a mention, a reply to one of the bot's own messages, or a command it routed; left unset when the channel cannot tell, which core reads as "answer anyway" rather than going quiet. No fifth `ChannelCaps` field and no stored per-container mode — the tri-state is the capability report. Telegram fills it from a `mention` or `bot_command` entity whose UTF-16 slice ends in the bot's own username, or from a reply that is not a `forum_topic_created` service message; Discord from its `mentions` array, and `true` on the message it synthesises from a slash command, without which `/caraka <task>` would have died in every guild. Two clauses that the first design carried were removed before any of it was written, because each opened the gate rather than closing it: a bare `message_thread_id` reports every message in every forum topic as addressed, including the topics humans opened for their own conversations, and the pending workspace question was a ten-minute window in which anything counted. The gate sits on the last branch of the inbound path, below the approval-code check and below the whole command router, so `/stop`, `/lock`, and a code reply keep working in a room that never addressed the bot. That placement is a safety property rather than a detail, so a test pins it: hoisting the gate above the router would kill `/stop` in every group and, before this release, no test would have noticed.
- **Native commands reach a paired group.** `registerCommands` published to the sender allowlist, which on Telegram is the DM chats, so a group's `/` menu was empty at startup and stayed empty after pairing. It reads the container allowlist now — a strict superset, since the constructor already merges the senders into it — and pairing publishes to the new container immediately instead of waiting for a restart. A container that refuses the call is audited and skipped, the way a DM already was. Publishing a menu into a group is new disclosure and is treated as such: TDLib defines the chat scope as covering every member, so all thirteen commands and their descriptions become visible to people who are not on the allowlist, `/ws — List the workspaces and their paths` included. The pairing card says so now, which is the mechanism `docs/security.md` §4 control 6 designates for exactly this.
- **`/new` keeps its title and can choose its workspace.** `/new Kerjaan Dummy @dummy` opens a session titled *Kerjaan Dummy* in the `dummy` workspace, and the topic takes the same name. Both halves were dropped before: the command word was parsed in two places that disagreed, so the workspace reader saw a `/` where it expected an `@` and the titler tried to redo the parse with a weaker pattern. The command is cut once now, where it was always cut, and the argument travels. The path the issue did not mention is the one that needed a test: on a multi-workspace install a `/new` that has to ask which workspace used to lose both its title and its create intent by the time the button was pressed ten minutes later.
- **A workspace can be named from a chat, in the operator's direct message only.** A path in a group message stays refused and answers with the workspace list. In the operator's DM an unknown path raises the signed single-use card that pairing already uses, and a yes writes the entry to `config.yaml` and runs the waiting task. Group members stay on slugs. This is the feature the issue asked for and it arrived behind four things that had to be true first, none of which were: a workspace path is canonical where it becomes a capability key, `caraka trust` refuses a path no config names, an unknown session slug resolves to nothing rather than to the first workspace and its trust window, and the workspace-choice button carries a signature now that a button can mint a workspace. The fourth is a control this repository had promised since v1.0 and never written: `docs/security.md` §7 said a path outside the workspace is high-risk, and nothing implemented it. `insideWorkspace` does, and it is a containment check on the resolved path rather than a prefix comparison, because `/home/r/Project-secret` starts with `/home/r/Project`.
- **An attachment is carried instead of dropped.** A photo now reaches the agent: as image bytes on the ACP route, whose adapter reports `promptCapabilities.image`, or as `-i <path>` where a preset names the flag. The bytes land under the Caraka home at 0700, never in the workspace, with a generated name — Telegram states that both the filename and the mime type of a document are "as defined by the sender", and a compressed photo carries neither, so the extension comes from a fixed allowlist and the sender's name is never joined into a path. Anything past Telegram's documented 20 MB download ceiling is refused with a sentence before a byte is fetched. The adapter downloads, so the token-bearing URL is built and spent inside the adapter and no part of it crosses into core. The path reaches the agent inside a labelled block, the way recalled memory already does, and a run whose prompt carried an attachment does not take the trust window's auto-approve: that branch skips the card for anything not on the high-risk list, and an unlabelled image is the one input for which "not obviously dangerous" carries no information.

### Changed

- **The group readiness sentence stopped asserting something false.** `group.ready` told the operator "An ordinary message in this group never reaches me. That is Telegram, not a fault." at the moment they decide whether to pair, and `docs/security.md` §4 control 6 counts that sentence as the group disclosure. It is false in exactly the configuration Caraka's own headline group feature requires: a per-session topic needs `can_manage_topics`, an admin bot has privacy mode off, and an admin bot receives everything. `getMe` answers this in `can_read_all_group_messages`, the adapter did not declare the field, and `Channel.getMe()` sat in the contract with no caller anywhere in `src/core/`. The adapter reads it once at startup and picks between two sentences; `getMe` came off the contract, which took the WhatsApp stub that existed only to satisfy it.
- **A Discord slash command from a stranger no longer says it was received.** The adapter acknowledged the interaction before handing anything to core, so a guild member outside the allowlist was told "Caraka has it." and then got silence, from a global command list visible in every guild since v0.5.
- **`resolveCommand` answers whether a command can be spawned, not whether a file exists.** On Windows npm writes three files per package binary and the one matching the bare name is a `#!/bin/sh` script; libuv appends only `.com` and `.exe` and never tries an extensionless name, so the path that check returned was guaranteed `ENOENT` (`errno -4058`). `shell: true` is refused as the fix and the refusal is written down: CVE-2024-27980, and Node's own note that batch arguments sometimes cannot be unambiguously escaped, against a prompt that arrives as an argv element.
- **`docs/security.md` corrects its download ceiling from 25 MB to the documented 20 MB**, and §12 gains the line it was missing: an image is the first untrusted input Caraka can hand a model with no possible "data, not instruction" label. T3's primary control is a text wrapper, pixels cannot carry it, and the person who forwarded the screenshot may not be able to read what it says.

### Fixed

- **`caraka start` died on any operating system when the ACP adapter could not be spawned.** The one `spawn` in the tree with no `error` listener; Node reports `ENOENT` on the next tick as an `error` event, and an unhandled one is thrown and ends the process. So the documented fall back to the CLI driver was unreachable through that path, on every platform, and the Windows report that surfaced it was one way in rather than the cause. The reported libuv assertion is a teardown race behind the same unhandled event.
- **`/lock` reported that no trust window was open while windows were open.** On a multi-workspace install, in a chat with no session at that route and no sticky workspace, the chat resolved to nothing, so nothing was closed and the operator was told so. It closes every window it can see in that case and says which answer it gave.
- **`caraka trust` silently did nothing for a config path spelled with a trailing slash or a `..`**, and printed success. It resolved its argument while the gateway keyed on the raw config string, so the grant it wrote could never be matched by the lookup that reads one. Workspace paths are canonical where they become keys now, so two spellings of one directory stop being two capabilities.
- **`/newsletter` was titled `sletter`.** The titler stripped a leading `/new` from text that routing had already stripped the command from. That strip is gone, and the 72-character cut no longer lands between a surrogate pair, which `createForumTopic` answers with a 400 that marked the whole container as having no topics.
- **A photo, a voice note, a video, a sticker, a document, and a location all vanished without a word.** The inbound path read `if (!text) return`, a nullability check standing in for a content-kind check, and it sat before the audit line, so the message was authorised and then left no row. All four adapters repeated the same substitution. An attachment the current route cannot carry now answers with one sentence naming what arrived, which is the silent drop `docs/security.md` §9 already forbade.
- **The verification gate builds before it tests.** Covered above; `npm run verify` and the CI `verify` job both run `build` between `typecheck` and `test`.

### Limited

- **Nothing here was run on Windows.** The reported crash has two causes, one of which is platform-independent and is fixed and tested; the Windows half is proved through a platform parameter rather than against `win32`. That `claude.exe` resolves and that `errno -4058` is gone for the reporter is unproven, and the issue stays open until someone on that machine says so.
- **The attachment path is unproven on the CLI route for Claude Code.** Its `Read` tool is reported to refuse a path outside the project directory (`anthropics/claude-code#29013`), and the bytes deliberately do not land in the workspace, so that combination degrades to the sentence rather than the file. It works on the ACP route, where the adapter takes image content blocks, and on a preset that names an image flag. The honest reading is that the feature is real on ACP and conditional on the CLI.
- **The complexity budget is 1,412 lines over, not near.** `src/` measures **9,412 lines** against the ~8,000 ceiling, up 914 in this release. Each item records its own number, its estimate, and the gap in `AGENTS.md`; the two largest gaps are the four channel wire shapes that had to be declared before any attachment could be read off them, and four security preconditions that turned out to live under a one-line feature. One removal paid a part of it, the container-id pair Discord and WhatsApp had each written out. The five other removals that were found and verified were left where they are, because a PR that fixes a bug and refactors is two PRs. The ceiling stays ~8,000, and what this release owes is now larger than what any single feature can pay.
- **Every field gate is still open**, the same nine as at 1.0.0. Nothing in this release closes one, and three of the four that cannot be closed from a repository still cannot.

## [1.2.0] — 2026-08-10

The headline is not a feature. `src/memory/titen.ts` shipped at v0.3 and had never spoken to a Titen. It was written from the route table in `docs/design.md` §13 and tested against a mock built from the same table, so the test agreed with the document and the document was wrong, and every field the adapter sent was refused by the only thing that gets a vote. A Titen 0.7.3 was installed and started on 10 August 2026, each route was hit with `curl` until it stopped refusing, and the adapter was rewritten against the rejections rather than the table.

What was wrong: the port, `7717` against the `8787` that `titen serve` binds; `scope` and `text` where Titen reads `subject_id` and `content`; `budgetTokens` where it reads `max_tokens`; `tokensUsed` read from a key it never sends; a free-string `kind` against a closed enum; a `source` object left out that is required with both its `type` and its `ref`; and no `authorization` header at all against a server that answers `401` on every route memory uses.

`caraka doctor` failed in a way worth stating on its own: it probed `http://127.0.0.1:7717/health`, a port nothing was listening on and a path that answers `404` on the port Titen does listen on. Neither existed. The memory row was therefore red on every install where Titen was running correctly, and there was no configuration under which it could have been green.

What is proven now, measured on 10 August 2026 against that server: `observe` accepted and answering with an `obs_…` id, `compile` accepted and answering in 4.9 ms median over ten consecutive calls, and `feedback`, `trace`, and `forget` each answered by the live server rather than a mock. The doctor probe answers `401` without the key and `404` with it, which is the credentialed call reaching the route and finding no such claim — the two outcomes it needs to tell apart. Four coding agents were run against live binaries in the same pass, over five routes, and two presets were wrong until they were.

### Changed

- **The Titen adapter speaks a different wire format.** Every request it sends changed: `subject_id` and `content` where it used to send `scope` and `text`, `max_tokens` where it sent `budgetTokens`, `used_tokens` read from `budget` instead of a key Titen never sends, `kind` mapped into Titen's closed enum instead of passed through as a free string, and an `Authorization: Bearer` header that was not there at all. Compiled items are claims, and their three evidence stances — supporting, contradicting, qualifying — are carried into the source label instead of being flattened, because a contradiction that loses its stance reads as agreement. Anyone running `provider: titen` on 1.1.2 gets a different set of requests, and the reason is that the old set was never accepted by anything: it was written against `docs/design.md` §13 and checked against a mock that agreed with the same document.
- **The Titen endpoint default is `127.0.0.1:8787`, not `127.0.0.1:7717`.** 8787 is what `titen serve` binds with no flag given. 7717 was a number this repository wrote down and never measured, and because `src/cli.ts` always passes the configured endpoint, it was the number every install used — `caraka doctor` reported memory dead against a Titen that was running. There is one constant now, exported from the adapter and imported by the config schema, so the two cannot drift apart again.
- **`caraka doctor` proves a credentialed call instead of a heartbeat.** `/healthz` answers 200 with no key while every route memory actually uses answers 401, so the row was green for installs where each observe and each compile failed. It probes a read-only `/v1` route now and reports a missing key as its own failing row with the command that fixes it.
- **The Gemini preset moves from `--experimental-acp` to `--acp`.** The deprecated flag still runs; the current one is what the binary documents.
- **`npm run smoke` runs five agents instead of one.** `scripts/smoke-cli.mjs` takes an optional route argument, which is what lets `claude-code cli` exercise the CLI half of that dual-route preset — the only shipped route nothing had ever run, because without the argument the script reads `driver: acp` and repeats the smoke that already existed.
- **The aider and goose presets move from transcribed to verified**, against aider 0.86.2 and goose 1.45.0. Aider gained `--no-pretty`, `--no-check-update`, `--no-auto-commits`, and a `resumeArgs` line, and a unit test pins the two flags that make `--no-auto-commits` a control rather than a preference.
- **`docs/` stops being half-translated by accident and starts being deliberately bilingual in nine places.** `install-flow` and `install-with-ai` gained English pairs, which takes the count from seven to nine. The other thirty-six files under `docs/` carry a header line saying they are Indonesian only and why, so a reader hitting one knows it is a decision rather than a gap: the ten records in `docs/adr/` are not rewritten because an accepted decision record is not rewritten, the thirteen in `docs/research/` are provenance for decisions already made, and the thirteen specification documents stay Indonesian because a specification in two languages is two specifications that will disagree.
- **The MCP passthrough box in roadmap phase 3 is declined rather than deferred again**, and the measurement is why. An ACP session opened by `ClaudeAcp` unchanged, sending `mcpServers: []`, already carried all 18 Titen tools, because the Claude adapter reads the working directory's `.mcp.json`. One `claude mcp add` on the owner's side gives the same result with no Caraka code, and 12 of those 18 tools write or delete outside the scrubber and outside the `compile` budget. `done/mcp-titen-passthrough/spec.md` carries the numbers.
- **The CI `presets` job checks the route each preset declares, not only its schema.** `command` and `acp` are both optional in the schema because `claude-code` carries both routes, so a preset could declare `driver: acp` and name nothing to spawn and still validate. The job fails on that now, and the workflow header carries a standing per-agent reason why the live smoke is not there.

### Added

- `CARAKA_TITEN_API_KEY`, the environment variable the Titen adapter reads its key from. It is deliberately not Titen's own `TITEN_API_KEY`: `claudeEnvironment()` strips the `CARAKA_` prefix and nothing else, so a key under Titen's name would be inherited by every spawned coding agent, handing it `titen_remember`, `delete_entities`, and `delete_relations` outside the scrubber — the surface `done/mcp-titen-passthrough/spec.md` refused to forward on purpose. It is seeded into the startup scrubber like every other secret this process holds.

### Fixed

- `/memori` reported memory unreachable against a healthy Titen. The command compiles with an empty task, which `local` reads as "the newest rows" and Titen rejects with `VALIDATION_ERROR "task must be a non-empty string"`. The adapter substitutes a listing task; the interface contract is unchanged.
- Which trust window is in force was decided at random when two of them opened inside the same millisecond. `openGrant` does not close the window it supersedes, so a workspace can hold two open `trusted` rows, and `activeGrant` ordered by `created_at DESC` alone — a tie SQLite is free to break either way, between rows that can differ in `principal` and `agentMode`. It orders by `rowid` as well now, so the later grant wins the way the clock meant it to. Found by running the gate on a second machine: the test that pins the window's grantor failed on roughly half of its runs there and on none here, which is what a millisecond of margin looks like on faster hardware. A second test came back from that machine too — the one proving a WhatsApp channel that has given up raises its sentence out of `updates()` — and that one was the test rather than the code: it attached its rejection handler after the drops instead of before, so a fatal raised mid-loop was an unhandled rejection about one run in five.

### Limited

- **Under Titen, an observation never surfaces in a compile.** `compile` returns consolidated claims and nothing else. Claims come from `POST /v1/consolidations`, which demands `claims[].statement` with a `sources[].relation` from a closed set, and nothing in Caraka calls it — so a subject with four stored observations compiles to zero items, which is the result that was measured rather than the one that was feared. `/ingat` still answers `Memory saved: <id>` truthfully, and the round trip the install prompt used to promise does not exist. `docs/design.md` §13 says so now, and the prompt no longer promises it. The 4.9 ms median is a floor for the same reason: the compile that produced it selected nothing.
- **Three of the seven presets have never completed a turn here.** `amp`, `cursor`, and `gemini` answered `initialize` over ACP on 10 August 2026 and stopped at "Authentication required", because a full turn on each needs a paid account this machine does not have — an Amp API key, a Cursor login, a Gemini key. All three still carry `belum diverifikasi` in their own files, and a handshake is not a turn. Goal G2 in `docs/prd.md` asks for fifteen agents; four have answered.
- **The complexity budget is over, not near.** `src/` measures 8,498 lines against the ~8,000 ceiling in `AGENTS.md`, up 149 in this release and up 618 from v1.0. Most of the 149 is the comment block that records which field caused which rejection, which is the cheapest thing here and still counts. The budget asks a new feature to remove something or stay under; this release did neither, and the fold that pays for it is work owed.
- **Every field gate is still open**, the same nine as at 1.0.0 and 1.1.0. Four of them cannot be closed from a repository under any amount of work, because each needs other people or calendar time that has not passed: five recorded setup sessions from people who have never seen the product, twenty beta developers, fourteen days of real use on a separate WhatsApp number, and the launch itself. The two remaining phase 0 spikes — the topic bubble in a DM, and the `editMessageText` retest with `rich_message` — need a live Telegram bot and a person watching their own client, and moved to post-release validation on the same date.

## [1.1.2] — 2026-08-10

### Fixed

- `caraka --version` printed `1.1.0` on an installed `1.1.1`. The version was a second copy in `src/cli.ts`, and `npm version` moves `package.json` and nothing else, so the copy drifted the moment a release did not go through the hand that kept it. It is read from the manifest now — `package.json` is in every tarball npm builds regardless of `files`, and it sits one level above both `dist/cli.js` and `src/cli.ts`. A test runs the built binary and compares what it prints to the manifest, so the next drift fails the release instead of shipping.

## [1.1.1] — 2026-08-10

One preset was wrong in a way only running it could show.

### Fixed

- The Codex preset's resume line carried a flag the binary rejects and a sandbox it never applied. `codex exec resume` takes neither `--color` nor `--sandbox`: the first stopped the run outright, and the second meant every continued turn ran without the read-only sandbox the first line of that file calls a security control. It has been that way since the preset landed in v0.4, unseen, because the flags were transcribed from documentation and nobody had run them. The resume line carries the control as `-c sandbox_mode="read-only"` now, which Codex validates against the same three values `--sandbox` accepts — a wrong one is refused before the model is reached, so the control is enforced rather than merely accepted. A unit test pins both halves: the control must be present, and the flag that broke it must not return.

### Changed

- Two agents are proven against a live binary instead of one. Codex answered on 10 August 2026 through the real preset, the real loader, the real `CliDriver`, and the real binary — two turns and a resume that recalled a number from the first. `docs/roadmap.md`, the status page, the landing page, and the UI-kit copy stop saying Claude Code is the only route that has answered here. Five presets remain transcribed and unrun, and Codex having been wrong on two of its three resume flags is the argument for treating them that way.

## [1.1.0] — 2026-08-08

Four boxes that had been open since the specification, closed with code rather than with prose. The largest is the policy-mode gate: `docs/security.md` §5 has described a `read-only` group since v0.2 and no release before this one enforced it, so a room on the allowlist ran with the rules of the direct message it was paired from. Three of the others are the install-flow work phase 2 asked for and never got.

### Added

- The policy-mode gate on the run path. The mode is read once per message, from the channel's `modes` map and from the kind of container the message arrived in. It is never read from the text, so nothing a sender or an agent writes can move it, and never from which channel answered, so core still holds no comparison against `channel.id`. What the map does not name takes the documented default: `assisted` in a private conversation, `read-only` in a room.
- What `read-only` refuses, and it refuses in three places rather than one. A permission request that writes or executes is refused before the card is drawn, with a message naming the config line that would allow it. `/yolo` is refused, because a trust window covers the whole workspace and one opened from a read-only room would raise the authority of every conversation that is not. A task on a route that decides permissions itself does not start, because without a permission seam there is nothing for the mode to refuse at, and starting anyway would be running unguarded under a name that promises otherwise.
- The judgement of what counts as a write does not rest on the agent's own label. A request whose `kind` reads `read` but whose payload carries `command`, `content`, `edits`, `patch`, or an `old_string`/`new_string` pair is read as a write, because threats T1 and T2 in `docs/security.md` §2 both end with an agent writing whatever suits it. A tool kind nobody recognises is refused rather than assumed harmless.
- A `modes` map in each channel block, keyed by container id or, in a private conversation, by the principal's id. The file `caraka init` writes opts nothing in. `trusted` cannot be written there at all: hard rule 3 says a trusted window has to expire, and a value in a file has no clock, so the schema rejects it and names `caraka trust` in the error.
- Deep-link pairing that is handled as the bearer secret it is. Whoever sends the payload back is written into the allowlist, so the code carries 72 bits from `randomBytes`, answers exactly one message, dies on a five-minute deadline it enforces itself rather than borrowing from whichever poll is in flight, and is compared with `timingSafeEqual` because it arrives from the network. Nothing signs it, and the reason is written at the function: the code never leaves the process that will check it. The wizard prints a line under the link saying that whoever opens it first is paired.
- `caraka doctor --fix`. It repairs the three kinds of drift `docs/install-flow.md` §4 wrote a correct value for: a directory Caraka owns that is not 0700, a file it wrote that is not 0600, and a PID file naming a process that is gone. Every branch is a `stat`, a `chmod`, a `mkdir`, or an unlink; nothing writes a credential and nothing opens a socket. The repair runs before the checks, so the rows report the state the operator is left with. An unreadable config, a missing workspace, and an empty allowlist come back in a refused list with the reason, because each is a decision rather than drift.
- `caraka uninstall`. It deletes the config, the database with its `-wal` and `-shm` sidecars, the discovery cache, the PID file, and the whole secrets directory, then removes `~/.caraka` only if that leaves it empty, so a file the operator put there survives. A running gateway stops the command at exit 78 before anything is removed. Confirmation takes the word `uninstall` typed in full, and a refusal exits 1 so that `caraka uninstall && …` cannot read it as a removal. Two things are printed as not Caraka's to delete: the bot on Telegram's side, and whatever the coding agent wrote in the workspace.
- A live smoke for the CLI route. `npm run smoke` now runs `scripts/smoke-cli.mjs codex` after the Claude one: the real YAML through the real loader, the real `CliDriver`, the real binary, two turns with a number carried across the resume. It skips when the binary is absent, and it fails when the binary is present and will not answer. What it has proved so far is the machinery around the agent rather than the agent: the preset resolves, the driver spawns `codex`, and the agent's own refusal comes back as a sentence. Every run of it on 8 August 2026 ended on a spent usage quota, so no turn has completed and the smoke has never passed.
- A CI job running `npm audit --omit=dev --audit-level=high` over the production tree, and again over the tree an install that chose the Baileys provider ends up with. It earned its place within the hour: the second tree came back with three findings, one critical, because the pinned `@whiskeysockets/baileys@6.7.18` was under GHSA-qvv5-jq5g-4cgg — message spoofing through a crafted `protocolMessage`, and a version its own maintainer had deprecated over that advisory. Nothing in this repository looked at that tree before today, and v1.0.0 shipped to npm pinning it. Both trees answer zero now and both steps gate.

### Changed

- Both remaining rows in the `docs/security.md` §13 checklist moved to `met`, so all thirteen are answered against the code. Shipped defaults, because the gate the row was waiting for exists and the row names the six tests that fail if it stops being true. `npm audit`, because the command now runs on every push over both trees and both answer zero — the row was open for a few hours over the answer rather than the absence of the command, which is the shape a checklist is supposed to have.
- Phase 2 of `docs/roadmap.md` stopped saying its work was undone. Four of its boxes had been built and left unticked for releases: the `init` wizard, PATH discovery, `getMe` validation the moment the token is typed, and container capability detection with the linear fallback. Each now carries the code that answers it. Deep-link pairing, `doctor --fix`, and clean uninstall are the three this release built. Reading the ACP Registry comes out as a line of its own, marked withdrawn rather than pending, with the date and the reason: metadata nothing displays is a fetch on every first run and no feature. Recording five real setup sessions is the one box in the phase still open, and it is a field gate.
- Phase 0's three open boxes say what is holding them rather than only that they are open. The Telegram topic half is code that shipped and a client bubble nobody has photographed; Rich Messages shipped in its simplest form and the retest was never run; Titen has a client with nothing to talk to.
- A failed CLI run is reported in the agent's own words. `codex` writes its reason into the structured stdout it was asked for while stderr carries progress notes, so reading the last stderr line named the wrong cause about as often as the right one.
- `presets/agents/*.yaml` gained an `acp.asksPermission` field, defaulting to false. One adapter class serves every ACP preset, so whether `session/request_permission` really arrives is the agent's claim to make rather than the class's to assume. Only `claude-code.yaml` sets it, because it is the only adapter anything here has watched.

### Fixed

- The optional Baileys peer moved from `6.7.18` to `6.7.22`. The pinned version was under GHSA-qvv5-jq5g-4cgg and deprecated by its own maintainer over the same advisory, so anyone who installed v1.0.0 and chose `provider: baileys` got a WhatsApp library that could be made to accept a spoofed message. Nothing in this repository had ever audited that tree; the CI job added in this release found it on its first run, which is the whole argument for the job.

- A `--bypass` cession was recorded against the workspace, so two conversations sharing a workspace shared one record. Either could consume the other's, after which the run that really had ceded its mode was never restored and the agent kept deciding permissions with `/lock` reporting a closed window. The record is now keyed by workspace and agent session together.

### Limited

- The core is over its own ceiling. `src/` measures 8,349 lines against the ~8,000 in `AGENTS.md`; v1.0 sat at 7,880 and this release's policy-mode gate and three commands went past it. A simplification pass gave back 73 lines and stopped where a normalised block scan stopped finding repetition — reaching 8,000 from here costs a feature or the comments that carry the decisions, and both were refused. The ceiling was not raised to meet the number; `docs/prd.md` G6 and `docs/frd.md` NFR-08 record the miss instead.

- **Titen was never contacted.** It is not installed on this machine, and nothing answers on `127.0.0.1:7717`. `titen bootstrap`, `titen serve`, and the compile-latency figure phase 0 asks for have no source to be measured from, so the box stays open and the adapter has still only ever answered a mocked fetch.
- **The Rich Messages spike still needs a live bot and a person.** What ships is `sendRichMessage` per piece with a plain-text fallback when Telegram rejects it. Structured table and code blocks, `sendRichMessageDraft`, and the retest of whether `editMessageText` with `rich_message` is enough were all out of scope in v0.2 and were never built after. None of the three can be answered from a repository.
- **Every field gate is still open**, the same nine as at 1.0.0. A gate on the run path is not a week of daily use, five recorded setup sessions, an A/B across twenty tasks, twenty beta developers, or fourteen days on a real WhatsApp number. This release adds a refusal the code can prove and nothing a person has confirmed.
- **Two agents are proven against a live binary, not fifteen.** Claude Code over ACP and Codex over the CLI route have both completed real turns here, Codex including a resume that recalled a number from its first turn. Its first passing run was on 10 August 2026 and it cost the preset two corrections — `codex exec resume` takes neither `--color` nor `--sandbox`, so the resume line had been carrying a flag the binary rejects and a sandbox it never applied. The other five presets are transcribed and unrun. Goal G2 in `docs/prd.md` (≥ 15 agents covered) is not met.
- `src/` stands at 8,422 lines against the ~8,000 line ceiling in `AGENTS.md`, up from 7,880 at 1.0.0. The complexity budget asks a new feature to remove something or stay under the ceiling, and this release did neither. The fold that pays for these 542 lines is work that has not been done.
- Two cells of the `assisted` row in `docs/security.md` §5 are still design. The table writes ✗ for `git push` and for deploy; what the code does is send an approval card for both, because the high-risk list applies ahead of the mode and is not differentiated by one.
- Mapping a Discord role to a policy mode is still not built. The `modes` map is keyed by container, or by principal in a private conversation, so a guild channel is opted in one at a time. A role has never authorised an approval and never will (ADR-0008).
- The npm registry holds 1.0.0. This release is not published, because `npm publish` is the owner's command.
- There has been no third-party security audit, and this line stays until there is one.

## [1.0.0] — 2026-08-08

The version number, and not one capability that was not already running under it. Every phase in `docs/roadmap.md` carries shipped code at the same time, which is what the number says. It says nothing about use: every field gate in that document is still open, and each was moved past this release by the owner's decision on 8 August 2026 with the date written beside it.

### Added

- `docs/openclaw-vs-caraka.md`, with an English copy beside it. The comparison phase 7 asked for, written so that choosing OpenClaw is a conclusion it offers rather than one it argues against.
- `docs/integrasi-ekosistem.md`, with an English copy beside it: what this client needed from ACP and from Titen, what it could not say in the protocol's own vocabulary, and which half of that pair comes from an author who also writes the other one.
- English copies of the pages an English reader was until now sent to in Indonesian — `docs/faq.en.md`, `docs/install-guide.en.md`, `docs/security.en.md`, `docs/troubleshooting.en.md`. Seven documents under `docs/` now carry an English pair; thirty-eight do not, and that includes every architecture decision record and every research document.
- Every runtime string that named a document now prints its address on GitHub instead of a repository path, and the English catalogue points at the English copy. `docs/` is not in the package's `files` list, so the reconnect message and both risk warnings had been sending an installer to a path that exists only for someone who cloned the repository.
- The pre-release checklist in `docs/security.md` §13 answered against the code as it stands rather than against the audit that filled it in when the version still read 0.2. Eleven of its thirteen rows are met, and each names the test that fails when the claim stops being true. Two are deferred with the date and with what has to happen to close them: `npm audit` runs on no schedule and never sees the optional Baileys peer, and the shipped-defaults claim has no policy-mode gate on the run path to rest on.
- `caraka.dev/whatsapp-risk`, the route phase 7 asked for. It renders `docs/whatsapp-risiko.en.md` without softening a claim or adding one, and it is reached from the security page and from the documentation page rather than from the header, where a provider-specific caveat would sit above the three routes everyone needs. No comp was ever drawn for it, so it is built from the security page's shapes and imports that page's stylesheet.
- Measurements in `docs/roadmap.md` and `docs/techstack.md` where both files carried estimates: cold start, peak RSS, idle RAM, `caraka doctor`, the tarball, and the tree an install actually leaves on disk, each with the machine and the command it was read from. Two of them miss goal G3 in `docs/prd.md`. Idle RAM is 94,324 kB against a target of 80 MB, and `node -e ''` alone accounts for 42 MB of it. An install with `--omit=dev` occupies 309,248,851 bytes against a target of 15 MB, of which 275,013,181 bytes is the Claude Agent SDK platform binary that arrives through the ACP adapter. The published tarball is the part that meets the target.

### Changed

- Repeated code across the gateway, the dashboard, the store, the config loader, and the two push channels folded into named helpers, with no behaviour moved along with it. `src/` drops from 7,996 lines to 7,880 against the ~8,000 ceiling in `AGENTS.md`.
- CI gained a second job that runs the site's lint, type check, and unit tests. The site's Playwright suite stays a per-machine command, for the same reason the agent smoke does: the runner has no browsers to give it and a workflow that pretends otherwise is worth less than no workflow.

### Fixed

- A signed webhook body could take the process down with it. WhatsApp Cloud sends JSON, and JSON holds a number or an object wherever the payload type says string: a numeric `from` reached `String.prototype.includes` and left as an unhandled rejection out of the POST handler, a numeric `text` reached core's `trim` and stopped the channel, and a body of literal `null` parsed to a value with no `entry` to read. The signature check runs ahead of all three, so only Meta could send one, and none of the three is a shape Meta sends — which is why nothing had ever reached them. Found by the seeded corpus on its first pass over the inbound readers, and closed where both providers come through: one type gate in `receive`, and null-safety across the walk in `ingest`.
- A long answer could arrive with its tail missing. `splitMarkdown` budgeted the fence a line arrived to and not the one it left behind, so a line that opened a code block bought a closing marker nobody had counted and the piece ran past the limit its caller gave it. Discord and WhatsApp pass their own limit and then cut the overflow away, which is where the text went. Found by the seeded corpus while it was proving something else, and the corpus now asserts the flat limit rather than the loose bound it had been written around.

### Limited

- **No field gate in this project has been answered by a human, the author included.** There was no dogfood week, no five recorded setup sessions, no memory A/B across twenty tasks, no cohort of twenty beta developers, and no fourteen days on a real WhatsApp number. Each was moved past its release by the owner's decision on 8 August 2026 and written into `docs/roadmap.md` with that date beside it, rather than ticked. Reaching 1.0 says the code for every phase landed and passes the checks this repository can run. Whether any of it survives a day on someone else's machine is not known.
- Discord, WhatsApp, and Titen have only ever answered mocks and fixtures. No Discord bot token, no WhatsApp number, no Cloud API webhook, and no running Titen process has ever been used from here, so the real payload shapes, the real 429 behaviour, the real pairing flow, the ban behaviour, and Titen's live routes are all unproven. Telegram with Claude Code over ACP is the one path that has been driven end to end by a person.
- Six of the seven presets are transcribed rather than run. Claude Code is the only agent ever started against a live binary on this machine, and only through its ACP route, so goal G2 in `docs/prd.md` (≥ 15 agents covered) is not met.
- The risk page reads English on the site. `docs/whatsapp-risiko.md` is the Indonesian original and the copy the error refusing `provider: baileys` links, but caraka.dev declares one language per route and has no scheme for a second; a reader who wants the Indonesian is sent to the repository from the page and from its footer.
- The npm registry still holds 0.2.1. Every release since is tagged in this repository and unpublished, because `npm publish` is the owner's command.
- There has been no third-party security audit, and this line stays until there is one.

## [0.6.0] — 2026-08-08

A third channel, and the first one that cannot show a button. WhatsApp arrives as another implementation of the contract Discord already answered, so what this release actually builds is the two things that seam left unanswered: how a permission is granted where there is nothing to press, and how a bridge behaves on a network that bans numbers for behaving like one.

### Added

- `src/channels/whatsapp.ts`, the third `Channel`, with both providers behind one `id`. No method was added to the interface, and `src/core/` holds no comparison against `channel.id` and no literal `"whatsapp"` — the same grep that guards Discord guards this.
- Linear mode cost nothing. The channel declares `caps.threads: false` and `header()`, already called at nine outbound sites, writes `[ws · #id]` in front of every reply. `/status` in a conversation without threads names every session that conversation is holding, capped at the five most recent so the answer does not grow with the transcript.
- `caps` gains a fourth field, `edit`, and its reader in the same change. Where it is false the progress path is off entirely: the first ack still goes out and nothing follows it until the result. The Cloud API has no edit endpoint, so `cloud-api` declares it false and `baileys` declares it true. `rich`, `files`, `typing`, and `ephemeral` stay undeclared, because core still asks about none of them.
- Approval on a channel with no buttons. The card carries a four-character code over a 32-symbol alphabet, generated from `randomBytes`, stored on the approval row, and printed on the card and nowhere else. It never appears in an audit row, a log line, or a prompt. Spending it takes the same `UPDATE … WHERE decision IS NULL` as the button path, bound to `(principal, session, request)` with the same ten-minute TTL. What is refused is the word: `yes` is a task, not a decision, and a code-shaped message is never forwarded to the agent whether it matches or not. A channel that has buttons is given no code at all.
- Two bounds around that code. Five wrong codes from one principal close the code route for that session until the pending question is decided or expires, said once rather than on every message, and the counter runs only while a question is waiting. Five undecided approvals per session is now a ceiling rather than a plan: the sixth request is cancelled without a card and the refusal goes to the audit. That row was specified in `docs/security.md` §9 from the beginning and is what the code's entropy argument rests on — five live codes out of 2^20 at a time.
- Hard rule 2 in `AGENTS.md` and FR-CHAN-02 in `docs/frd.md` were amended in the same change, and `spec/v10.md` AC-5.3 with them. The rule now reads "approval can never arrive as unauthenticated text", which is what it was always protecting. ADR-0009 carries the argument.
- The five ban mitigations as code that can fail. Every WhatsApp send passes through one function, and no caller can reach a transport around it: it enforces a rolling ceiling of 12 messages per 60 seconds with the excess queued rather than dropped, a uniform random gap of 1,200–3,500 ms, and a refusal to write to any number that has not written first and is not on `allowFrom`. `allowFrom` is `.min(1)` as on every other channel, and `provider: baileys` without `acknowledgeRisk: true` stops start with a message linking the risk page.
- `docs/whatsapp-risiko.md` and `docs/whatsapp-risiko.en.md`: what is known about bans, where each figure comes from, what its population actually was, which detection signal Caraka answers in code and which one it cannot answer at all, and when Cloud API is the right answer instead. The page is written so that deciding against `baileys` is a conclusion it offers.
- `@whiskeysockets/baileys` as an exact-version **optional peer dependency**, not a dependency and not an `optionalDependency` — npm installs the latter by default, which would drag its transitive tree into every Telegram-only install. Direct runtime dependencies stay at four. One file, `src/channels/whatsapp-baileys.ts`, names the module, and it is reached only through `await import()` behind the provider switch. A missing module is one sentence carrying the exact install command and the pinned version, with no stack trace.
- The Cloud API webhook receiver on `node:http`, bound to `127.0.0.1` unless `caraka start` is given another address, which prints a warning and writes an audit row before the first connection is accepted. `X-Hub-Signature-256` is mandatory and compared in constant time, loopback included, because another process on the same machine can knock as easily as Meta can. A body past its size bound is cut before it is read, and every other path and method answers 404. Provider `baileys` opens no listener at all.
- The Baileys auth state is treated as a credential, not as session state: `~/.caraka/secrets/whatsapp/` at directory mode 0700 with files at 0600, beside the token, verify token, and app secret the Cloud API needs. `caraka doctor` reports all four as their own lines, and every token the process loads is seeded to the scrubber as an exact secret.
- Reconnect with a ceiling and an end. Five seconds doubling with full jitter, capped at 300 seconds, and six attempts before the channel stops, writes an audit row, and raises the operator's sentence out of `updates()`. The counter returns to zero only after a connection has held for 60 seconds, so a link that connects and drops cannot reset it forever. A logged-out or 401 answer is never retried once — repeated reconnects after a logout are the reported way to lose the account — and the message names deleting `~/.caraka/secrets/whatsapp/` as the way back.
- Group messages are refused in `receive()`. On the linked-device protocol a group names itself as the sender, so every member would arrive as one principal and every member would read the approval code on the same card. The readiness message says so rather than letting someone discover it.

### Limited

- No live WhatsApp number was ever linked on this machine, and no live Cloud API webhook was ever received. Every check answers a fake transport, an injected `fetch`, a stand-in for the Baileys module, or a real listener on port 0 — so the real payload shapes, the real pairing flow, the real ban behaviour, and Meta's real webhook envelope stay unproven. This is the same posture as the printed-untested service units in 0.2.0 and the mocked Discord surface in 0.5.0.
- Because the Baileys peer is optional, CI never installs it. `npm audit` does not see it, and a breaking change in its API would not surface from this repository. What holds the line is the pinned exact version and an error message that names it.
- `caraka init whatsapp` is not built. A `whatsapp:` block is written by hand and Cloud API credentials are written by hand into `~/.caraka/secrets/`, with no verification call before they are used. Three acceptance criteria stay unmet and are recorded as unmet in `done/whatsapp-v06/`.
- The consequence of that is worth stating on its own: the risk warning is unskippable but late. Start refuses `baileys` without `acknowledgeRisk: true` and prints the separate-number warning on every start, so nobody runs it unwarned — but the warning arrives after the operator has already written the decision into the config rather than before.
- Most of the numbers in this release are spec-set rather than measured. The outbound ceiling and the jitter band, the code's four characters and its five-attempt limit, the backoff base, its 300-second ceiling, six attempts and the 60-second stability window, the five sessions `/status` names, and `maxChars` 4096 all come from `spec/whatsapp-v06.md` §7 with the reasoning beside each. Only the 30-second progress interval, the ten-minute TTL, and the five pending approvals trace to a document. Each one lives in the code as one named constant whose comment points back at the spec.
- Two flows core still sends with buttons — the workspace chooser and `/yolo` — are dead ends on WhatsApp. Core reads `caps.buttons` at the approval site and not at those two, so the cards arrive with nothing to press.
- Groups are unsupported and there is no `allowChats` in the `whatsapp:` block, because no room can reach this channel for a second list to gate. The `MEDIA:<path>` attachment convention is still absent on every channel, so a long answer travels as a `.md` file and nothing else is attached.
- The OS keychain is still not used on any channel; a 0600 file remains the store, as `docs/security.md` §6 has always said it would be where no keychain is available.
- `src/` stands at 7,996 lines against the ~8,000 line ceiling in `AGENTS.md`. That is the line, not room below it, and phase 7 does not fit until something is removed.
- The field half of the phase 6 gate stays open. Fourteen days of real use on a separate number with no ban and no manual relink cannot be answered from a repository, and it moved past the release by owner decision on 8 August 2026, the same shape as phases 3, 4, and 5. Until it is answered, the recommendation the risk page already gives stands: `cloud-api` if the number matters to you.

## [0.5.0] — 2026-08-08

A second channel and a page to watch it from. Discord proves the `Channel` seam was real rather than a name, and `caraka dashboard` reads the database the gateway writes without being allowed to change it.

### Added

- A `Channel` contract in `src/core/channel.ts`, named from the twelve methods the gateway already called rather than from the `onMessage`/`onChoice`/`send` sketch the specification carried. Updates stay an async generator that `Gateway.run()` drives in one line, so a channel that pushes bridges into a generator inside its own adapter.
- `caps` with three fields — `threads`, `buttons`, `maxChars` — because three are all core has anything to ask about. Without `buttons` a permission request is refused and audited; it never falls back to chat text. `maxChars` decides how much of the progress tail survives, so the newest output is what stays.
- One Gateway holding a list of channels. Allowlists and the operator are maps keyed by `channel.id`, and the run slot stays keyed by workspace slug, so one workspace still runs one task at a time no matter which channel asked.
- `src/channels/discord.ts` on the built-in `fetch` and Node's global `WebSocket`: no new dependency, and the module is imported only when a `discord:` block exists in config. Gateway identify, heartbeat, resume, backoff reconnect, a half-open socket closed rather than left to hang, and a fatal close code that stops instead of retrying.
- One public thread per Discord session, `auto_archive_duration` 10080, the state glyph in the thread name, and `archived: true` after the closing summary. Archiving is never claimed to free quota, because Discord counts archived threads against the active limit; the limit arrives as a thrown error and that container falls to linear mode.
- Thread capability on Discord is detected by catching that error, not by creating and deleting a test thread. The marker lives in the existing `meta` table and `doctor` clears it.
- Approval on Discord with the primitive untouched: the same 33-character signed payload travels as `custom_id`, the deferred ack is sent before core touches the database, and components are disabled at the same fork that clears a Telegram keyboard. A Discord role authorises nothing.
- Caraka asks Discord for no privileged intent, so the text of an ordinary message never arrives. The readiness message says that in as many words and names what does arrive: a slash command, and a button on a card Caraka sent.
- An optional `discord:` config block, additive with `version` still 1. `telegram:` became optional in the same shape, and start refuses when no channel is configured or when a configured channel has an empty `allowFrom`, naming which.
- `caraka dashboard [--port n] [--bind addr]`: seven read-only panels — sessions, runs, approvals, audit, policy, memory, beta — served from `127.0.0.1:7718` with the database opened `readOnly`. Anything other than GET or HEAD is refused before a query runs, every statement is a literal with bound parameters, and a request whose `Host` is not a loopback literal is refused so a web page cannot read a panel as its own origin.
- Runs and the beta numbers are derived from the audit log rather than from new tables. Setup time is the first `gateway.start` to the first `msg.in`; activation is a `run.finish` that ended a turn within 24 hours. The opt-in is on sharing the two numbers, not on collecting them — the audit log is a mandatory control and was never optional.
- htmx is vendored to `assets/dashboard/htmx.min.js` and served by the page itself. The page contacts no third-party origin and works with no network at all.
- Two leaks closed. `claudeEnvironment()` stopped removing one variable name and now removes every key beginning `CARAKA_`, so the next channel's token cannot escape the way this one would have. The scrubber learned the shape of a Discord bot token, which the Telegram and JWT patterns both missed.

### Limited

- No live Discord credential was ever used on this machine. Every Discord check answers a mocked `fetch` and a mocked `WebSocket`, which leaves the real payload shapes, the real 429 behaviour, and the real permission set unproven. This follows the same posture as the printed-untested service units in 0.2.0 and the credential-free CI matrix in 0.4.0.
- The dashboard has no authentication, deliberately and not by omission. While it runs, anyone on that machine who can reach `127.0.0.1` can read it, including a local user with no read permission on `~/.caraka/caraka.db`. Loopback is not an authentication boundary; the real boundary is the file mode, and the dashboard widens it for as long as it is up.
- `caraka init discord` is not built. A `discord:` block is written by hand today, and `saveConfig` writes the token file at mode 0600. The wizard is the remaining step of `done/discord-v05/plan.md`.
- The dashboard's htmx swap has never been watched in a real browser with the CSP live. What is checked automatically: every anchor carries `hx-get`, `hx-target`, and an `href` to the same path, an `HX-Request` returns the fragment alone, and every panel carries `hx-trigger="every 10s"`.
- Role to policy-mode mapping on Discord (FR-AUTH-06) is not built, and the reason is not time. No policy-mode gate exists on the run path for any channel, so mapping a role to `read-only` would promise a refusal that does not happen. The `grup (default) read-only` row in `docs/security.md` §5 is marked as design rather than build for the same reason.
- Embeds, attachments, and a typing indicator are still absent on both channels. A long Discord answer past three pieces travels as one `.md` file; everything else is plain markdown.
- A Discord session's route is stored as a namespaced `chat_id` rather than a `channel` column, so no query can filter by channel without matching a prefix. The column arrives with the first reader that genuinely needs it.
- Both human halves of the phase gate stay open: twenty beta developers have not been recruited, and neither DoD number — 60% first message within 24 hours, zero unapproved executions — can be answered by the author. Both moved past the release by owner decision on 8 August 2026.

## [0.4.0] — 2026-08-08

Seven agent presets and more than one workspace. The driver layer stops being Claude-shaped, and a test now proves that adding an agent is one YAML file.

### Added

- An `AgentDriver` interface named from the surface the gateway actually uses. The Claude ACP adapter and the new CLI driver both implement it, core reads its own update and permission types, and the ACP SDK import is gone from `src/core`.
- `presets/agents/`, holding seven presets — claude-code, codex, gemini, cursor, goose, amp, aider — validated by a strict schema of only the fields the code reads. An invalid file is named with its failing field and skipped while the rest load. An ACP preset carries its spawn as `acp: {command, args, env}`, and one preset may carry both routes.
- A generic CLI driver: it spawns the preset's command in the session's workspace, sends the prompt as an argument or over stdin past `maxPromptArgChars`, parses `json`, `jsonl`, or `text` output, finds the agent-side session id through `sessionIdFields`, and cancels with SIGTERM then SIGKILL after five seconds. The whole answer arrives as one text update.
- Driver selection per run: ACP when the preset's adapter resolves and survives initialize, the CLI route when it does not, otherwise an error naming the agent and the next step. `workspaces[].driver` forces one route and never tries the other.
- More than one workspace: an additive `workspaces[]` list in config, `@slug` in front of a message routes it and sticks as the chat's default, and a button chooser asks when several workspaces exist and none is sticky. A v0.3 database gains the two session routing columns through a guarded ALTER and keeps its rows.
- One active run per workspace, the rest queued FIFO per workspace with the ack numbered. `/stop` cancels the run of the sender's workspace only; shutdown cancels them all.
- `/switch <preset id>` moves a session to another loaded preset on its next task, and `/ws` lists workspaces, answering in General. Neither hardcodes any agent's mode names.
- Discovery scans PATH for the seven known binaries and caches the result for a day; `doctor` forces a rescan and draws one row per discovered agent. `init` now needs any one agent found rather than Claude specifically.
- The repository's first CI workflow: the four gate commands, every preset through the loader's schema, and the recorded parser fixtures.

### Limited

- Live verification still covers Claude Code only. The codex flags are copied verbatim from the documented block but were never run here, and the gemini, cursor, goose, and amp ACP commands plus every aider flag are transcribed from research, marked `# belum diverifikasi` inside their files.
- CI runs no live smoke: the runners hold no agent binary and no credentials, so the workflow validates schemas and parser fixtures and says so instead of faking a matrix. Smoke stays `npm run smoke`, per machine.
- The CLI route has no permission hook and no streaming. Approval on that route falls to the agent's own brakes — codex keeps `--sandbox read-only`, and aider's `--yes-always` was removed because auto-approval without a sandbox is execution without anyone's consent.
- A CLI session's agent-side thread id lives in process memory; after a gateway restart the next turn starts a fresh agent thread.
- The human half of the phase gate — someone adding an agent without asking a question — stays open, moved past the release by owner decision on 8 August 2026.

## [0.3.0] — 2026-08-08

Memory. What a run leaves behind rides in front of the next prompt, and its failure never blocks a reply.

### Added

- A `MemoryProvider` interface with three providers: `titen`, an HTTP adapter for a local [Titen](https://titen.dev) process; `local`, SQLite + FTS5 inside Caraka's own database with no embeddings; and `none`. A config file from before v0.3 reads as `local`.
- Compiled memory is injected in front of the prompt as a labelled data block, at most 6 items in 800 tokens. The bound is enforced on what the provider returns, not only passed to it, and `<memory` markers inside recalled text are stripped — recalled data cannot close the block and pose as instruction.
- Every run feeds memory back: the user's prompt and the agent's output become observations when the run ends, tool-call titles as they arrive, and the injected context receives its outcome. When the output's observation id returns within the time bound, the reply closes with `Memory saved: <id>`.
- Chat commands `/ingat <text>`, `/lupakan <id>`, and `/memori`, accepted from any topic and answered in General when topics are on.
- Degradation: a compile that fails or outlives 500 ms is skipped, audited as `memory_degraded`, and the run continues. Text bound for a provider passes the secret scrubber field by field before it leaves the process.
- The wizard offers to install Titen after pairing; declining, or a failed install, writes `provider: local` and finishes as usual. `doctor` probes Titen's `/health` when configured and says so when the memory endpoint is not loopback, because memory data then leaves the machine.

### Limited

- The `titen` adapter has only ever answered a mocked fetch; no check in this repository talks to a live Titen. Its routes were read from the Titen v0.7.0 source, a pre-1.0 surface that can move, and `local` keeps working without it.
- On `titen`, `forget` by filter deletes nothing, because v0.7.0 has no bulk delete route. Deleting by id works.
- The wizard's install command was not run while closing this release, and no automated test covers `init` or `doctor`.
- The phase's A/B across twenty tasks stays open, moved past the release by owner decision on 8 August 2026.

### Changed

- A session's topic now wears its state as a leading glyph in the name — `▸` running, `⏸` awaiting approval, `✓` done, `✗` failed, `⊘` cancelled — renamed on every transition through the one path that also writes the row, so the name cannot disagree with the database. `icon_color` is set once at creation, because `editForumTopic` cannot change it afterwards.

## [0.2.1] — 2026-08-08

Both fixes came out of live testing in a real group, not review.

### Fixed

- Single-use cards now clear their buttons. The approval path did this; `confirmTrust` and group pairing did not, so a pairing card kept working-looking buttons after it had been answered. The clear moved to the callback fork, after the principal check, so a member outside the sender allowlist still cannot wipe the operator's card.

### Added

- A readiness report after group pairing, repeated by `/status` in any non-private chat. Privacy mode stays on by design, so Telegram delivers only commands addressed to the bot, replies to its own messages, and service messages — an ordinary group message never arrives. That was documented but never said to the operator, so a working bot read as a broken one. The report also states whether topics are available, and that granting the rights they need makes the bot an admin, which makes it receive every message in the group.

## [0.2.0] — 2026-08-07

Groups, a trust window, service units, and a second interface language.

### Added

- Allowlisted groups: a chat allowlist and a sender allowlist that must both match, with pairing confirmed by a signed button in the operator's DM and the disclosure stated on the card.
- `/commands`, `/usage`, `/yolo <duration>`, and `/lock`, bringing the registered set to eight.
- A Caraka trust window opened by `/yolo`: one workspace, a mandatory duration capped at sixty minutes, closed by `/lock`, expiry, or restart. Permission requests are still received, the high-risk list still stops for a button, and every automatic decision is audited.
- `caraka service --print` writes a systemd, launchd, or schtasks unit to stdout. It installs nothing, has no `postinstall` hook, and never prints `sudo`.
- English and Indonesian interfaces, chosen once at `init` and never inferred from a message.
- `caraka stop`, a PID file, a twenty-message-per-minute rate limit, and a thirty-minute run limit.

### Limited

- `bypassPermissions` remains reachable only from the terminal, through `caraka trust --bypass`. No chat path reaches it.
- The launchd and schtasks units are printed but untested on their platforms.

## [0.1.0] — 2026-08-07

First usable preview for one private Telegram operator and Claude Code.

### Added

- `init`, `doctor`, and `start` commands with one-time Telegram pairing.
- Claude ACP initialize, new/load session, prompt streaming, permission requests, and cancellation.
- Optional private-chat topics with automatic linear-mode fallback.
- Signed, principal-bound, session-bound, single-use approval callbacks with a ten-minute TTL.
- Mode-`0600` token storage, outbound secret scrubbing, and append-only SQLite audit.
- Rich Telegram results with plain-text fallback and code-fence-aware splitting.
- English and Indonesian install docs plus a safe prompt for Codex or Claude to assist installation.
- Unit, mock Telegram e2e, package, and authenticated Claude ACP smoke checks.

### Limited

- One operator, bot, workspace, and Claude Code adapter.
- Foreground process only. Groups, services, memory, attachments, and other coding agents remain roadmap work.

## [0.0.0] — 2026-08-07

Name reservation on npm and the initial public specification.

[0.4.0]: https://github.com/CarakaDev/caraka/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/CarakaDev/caraka/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/CarakaDev/caraka/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/CarakaDev/caraka/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/CarakaDev/caraka/compare/v0.0.0...v0.1.0
[0.0.0]: https://github.com/CarakaDev/caraka/releases/tag/v0.0.0
