# AGENTS.md — site/

The caraka.dev website. Read [`../AGENTS.md`](../AGENTS.md) first; everything there applies here too.

## What this is

Astro, static output, no adapter, no UI framework, no client framework runtime. The only JavaScript shipped to a visitor is `src/scripts/ck.js`, and it is 143 lines including its comments — it doubled when the phone layout the comps never drew landed, and this sentence did not move with it.

```
src/layouts/Base.astro     head, meta, OG tags, skip link
src/pages/                 one file per route
src/data/                  the list content each page renders
src/styles/global.css      fonts, hover classes, focus, skip link
src/styles/pages/*.css     each mockup's <style> block, verbatim
src/scripts/ck.js          copy buttons, scroll progress
scripts/gen-assets.mjs     favicons and one OG image per page
```

## The mockups are the design

`../design/mockups/*.dc.html` are finished comps. They are not a starting point to improve on — every colour, radius, easing curve, and animation range in them is a decision. Port them, do not redesign them.

They were built for a design-comp player, so six things in them do not exist in a browser. These are the only transformations allowed:

| Mockup | Port |
|---|---|
| `<sc-for list="{{ x }}" as="y">` | `{x.map((y) => (…))}` |
| `<sc-if value="{{ v }}">` | `{v && (…)}` |
| `{{ expr }}` | `{expr}` |
| `style-hover="…"` | the matching `.hv-*` class from `global.css` |
| `onClick="{{ copy }}"` | `data-copy="…"` plus a `data-copy-label` span |

`onClick="{{ jump }}"` is dropped entirely: a plain `href="#id"` with `scroll-behavior: smooth` already scrolls, and `[id] { scroll-margin-top }` keeps the fixed header off the target.

Everything else — every inline `style`, every `animation`, every `animation-range` — is copied character for character.

## Two rules that are easy to break by accident

**Keyframes belong to their page.** Nine keyframe names appear in more than one mockup with different values: `ck-rise` travels 18, 22, 24, 26, or 28 pixels depending on which page you are on. `src/styles/pages/<slug>.css` holds one mockup's `<style>` block, unedited, imported by the page that ports that mockup. Never merge them into `global.css`.

Two routes have no mockup, and both borrow rather than copy. `/whatsapp-risk` renders `../docs/whatsapp-risiko.en.md` and imports `security.css`; `/guide` teaches the path from `caraka init` to a working session in a room, and imports `docs.css`. That is the rule holding rather than bending — each page is built from the shapes of the comp whose stylesheet it takes, so those keyframe values are the correct ones, and one file cannot drift from itself. A page with a comp of its own never shares.

**Scroll-driven animations must survive an engine that lacks them.** An element carrying `animation: ck-rise linear both` with no duration is invisible until its timeline advances. Where `animation-timeline` is unsupported the declaration is dropped, the animation runs for 0s, and `both` leaves the element on its final frame — visible. The e2e suite asserts this in Firefox and WebKit, not just Chromium. If you add a scroll-driven animation, add it to that assertion.

## Where the port leaves the mockup

Seven places, and each is written down here because a deviation nobody recorded
is a diff someone finds six months later and "fixes" back.

**The header is one bar, and it holds `NAV` on every page.** Each comp drew its
own header with three to five of its siblings in it, and the port copied each
one, so ten pages shipped ten different menus — no two alike. `/status` was in
none of them, `/guide` in three, and from `/security` there was no link to
`/compare`, `/story`, or `/guide` at all. No comp is wrong about this; no comp
holds ten pages, so none of them could see it. `src/components/SiteHeader.astro`
is that bar, and its markup and every inline style in it are `docs.astro`'s
header unedited. It takes three props because the ten copies differed in exactly
three things: the badge, the links, the button at the right end.

`NAV` in `src/lib/site.ts` is the list, and two of its six entries are not in
any comp. `Guide` has no comp at all — the comps were drawn when four content
routes were all there were, and a page nobody can reach from a header is a page
written for nobody. `Home` is there because the page being read has to be in the
menu for the menu to be able to mark it; the comps left it to the wordmark,
which cannot carry a marker without also being a nav item.

The marker is a 4px dot under the label, brand red, and it pulses one ring every
2.8s — `.ck-nav` in `global.css`, keyframe `ck-nav-ping`, a name no comp uses, so
the rule above about per-page keyframes is not in play. Its `opacity: 1` belongs
to the rule and not to the keyframes, so an engine that drops the animation still
shows the reader where they are; `prefers-reduced-motion: reduce` stops the ring
and keeps the dot. Links that are not the open page grow the same dot at `.45` on
hover, so it means one thing in two states: here you are, there you would be.

`/404` and the four brand boards do not take the bar. Their content starts at or
near y=0, where a fixed header would sit on top of it, and none of them is a stop
on the path through the site. `/brand/ui-kit` and `/whatsapp-risk` do take it,
and neither is in `NAV`, so neither is marked — which is the honest answer for a
reference page.

Four tests hold this: no page may write a `<header>` of its own, every route in
`NAV` must render `SiteHeader`, a page that renders it must name its own route as
`active`, and the dot's opacity must live outside the keyframes. The e2e suite
checks the six links and the single `aria-current` on all six menu routes, and
that they stay on one row at 1440 and at 960.

**The page files hold prose too, and it drifts faster than `src/data/`.** On 14
August 2026 five audits read every page against the code. What they found was
not in `src/data/` — that had been swept the same day — but hard-coded in the
`.astro` files beside it: `/` said `v1.0` and `7 PRESETS VIA ACP`, `/docs` said
`v1.2` and called attachments roadmap work eight releases after they shipped,
five footers said `MIT · v1.0, unproven`, and `src/lib/site.ts` said `v1.3` in
four meta descriptions. `src/data/*.ts` is where the lists live and it is not
where all the sentences live; a sweep that stops at `src/data/` has swept half
the site. Three `v1.0`s are correct and must stay: the UI Kit and the colour
system carry their own version, which is the design system's, not the product's.

**One of those numbers was wrong because this file was wrong.** `site/AGENTS.md`
said the codex smoke "has so far only reached a spent usage quota rather than a
finished turn". That sentence describes 8 August 2026 and was written that day.
On 10 August a live smoke against codex-cli 0.147.0 completed two turns and a
resume — it is what found `codex exec resume` rejecting `--color` and ignoring
`--sandbox`, and finding that requires running the resume. The sentence outlived
its evidence by two days, and on 14 August it was copied out of here into
`src/data/status.ts`, into a CHANGELOG entry, and into a reply posted to the
person who reported issue #9. The count is five agents over six routes: Claude
Code over ACP and over its CLI route, Codex and aider on the CLI, goose over
ACP, and opencode over ACP on 14 August. A stale sentence in the file that
decides what is true is worse than a stale sentence anywhere else, because
everything else copies from it.

`npm run e2e` builds first. It serves `dist/` through `astro preview`, so before
14 August 2026 it could pass green against the build before the change — which it
did once, during this work, and the run that reported no page height had moved
was reading the old pages. The build costs about half a second and the gate is
worth more than that.

`Caraka Landing.dc.html` labels the opening veil `MEMBUKA GERBANG`. The port
reads `OPENING THE GATE` (`VEIL_LABEL` in `src/data/landing.ts`), because `/`
declares `lang="en"` and the comp's own label is the only Indonesian on it. The
English is the literal reading, so the gate the animation draws survives. Every
other character of the veil is ported unchanged, and `test/fidelity.test.js`
fails if this deviation stops being written down here.

The veil also plays once per tab session rather than on every load. The flag is
read by an inline `<script is:inline>` in the `<head>` of `index.astro`, which
is the only code that runs before the veil markup is parsed — `ck.js` is a
module and arrives after. **A Content-Security-Policy header would break this
silently:** the site ships no CSP and no `_headers` today, and the day one lands
that script needs its hash in `script-src` and the one-line `<style is:inline>`
beside it needs its own in `style-src`. Without them the veil replays on every
visit and nothing turns red.

`Caraka Install.dc.html` runs the AI prompt section sixth of seven, behind
Node, Claude Code, the init-check table, and the install-path list. `/install`
runs it first. The prompt verifies Node, Git, and the agent's own sign-in
itself, so the five sections it used to sit behind are the manual route rather
than a precondition for the fast one, and
`../docs/install-guide.md` already reads in that order — §2 is the coding-agent
path, §3 the manual one. The section markup, its styles, and its
`animation-range` values are the comp's, unedited; only its position and the
numbers 01–07 moved, along with one chip that used to say "the prompt below".
Every other section of that comp is in the comp's own order.

`Caraka Landing.dc.html:533-541` draws the install terminal as the manual route
alone: `$ npx caraka init`, then seven lines of what it prints. The port keeps
those eight lines and changes what they say, so the first one names the coding
agent that hands the command over and the last one hands the run back to it
(`term` in `src/data/landing.ts`). `/install` leads with that prompt, and a
landing page showing only the typed command sends every reader down the longer
route. The comp's `caraka · v0.1.0` reads 1.3.3 in the port for the reason this
file already gives: a comp is authoritative for design and stopped being
authoritative for release facts, and the version is the one `package.json`
carries and `src/cli.ts` prints. The line count, the tones, the marks, and every
`animation-range` are the comp's.

`Caraka Status.dc.html:280-289` draws the changelog as a card per release, and
the port let that list run: every release added a card and nothing ever took one
away. On 14 August 2026 `/status` measured 18,455px at 1440x900, and the five
newest cards had cost 663, 632, 513, 716 and 610px. Five releases keep a card
now. The fourteen from 1.3.0 down to 0.0.0 are one line each inside one more
card of the same shape, whose header names the range and points at
`CHANGELOG.md`, which carries every entry at the length it was written in and is
linked in this page's footer. The page came out at 8,638px, and a release costs
it one line rather than one card. No markup, style, or `animation-range` in
`src/pages/status.astro` changed; the whole diff is `src/data/status.ts`, so the
comp still decides how a release card looks and has stopped deciding how many
there are. `test/fidelity.test.js` fails on a sixth full card, and on a version
that has a `## [x.y.z]` heading in `CHANGELOG.md` and no line here.

The reason given for doing it does not survive its own measurement, and that is
written here rather than dropped. The 320px overflow test in `e2e/mobile.spec.ts`
had gone past its 30-second timeout once under the full parallel suite, and it
measured 22.2s under `npm run e2e` before this change and 22.2s after. Two other
run shapes were paired the same way and agreed: 19.7s against 19.4s, and 15.8s
against 15.2s alone. Removing 9,817px is worth half a second at most, and the
full-suite figure moves between 18.5s and 22.2s across runs of one build. That
test's time is its own `settle()` rather than the size of any page it visits,
and the route-by-route numbers are in the comment above the height baselines in
`e2e/site.spec.ts`. Trimming a page is not how that margin comes back.

## Content

`src/data/*.ts` holds what the lists render. Every value there traces to `../docs/` and `../src/`. Copy must distinguish the verified scope below from roadmap work, and never introduce a number, date, version, or quotation that is not already in the docs.

What v1.5 verifiably supports: one operator across three channels, Telegram, Discord, and WhatsApp, all on the same `Channel` contract, with the chats, guild channels, and numbers their allowlists name; a session as a Telegram topic, a Discord thread, or a `[workspace · #id]` header where the chat app has neither; nine agent presets, one YAML file each, five of which have completed a turn against a live binary here; memory through Titen, a local SQLite provider, or none; more than one workspace with `@slug` routing and one run at a time in each; an approval that is a single-use secret bound to the principal, the session, and the request on every channel — a signed callback where there are buttons, a generated code on the card where there are none; a policy mode read per message from the channel's `modes` map and the kind of container, defaulting to `assisted` in a private conversation and `read-only` in a room, where a write, a command, and `/yolo` are all refused; deep-link pairing whose code answers once and expires in five minutes; `caraka doctor --fix` and `caraka uninstall`, both terminal-only; and a read-only dashboard on `127.0.0.1` that `caraka dashboard` starts. Every one of those has a limit worth naming when the copy claims it: the Discord path has never touched a real Discord, no WhatsApp number has ever been linked and no live Cloud API webhook has ever arrived, four of the nine presets have never run here at all — the CLI route carries no permission hook at all and a `read-only` run refuses to start on it, the Titen adapter has only answered a mocked fetch, and the dashboard has no authentication — a loopback listener is not an authentication boundary.

The release state is one word, and it is **unproven**. It means both halves at once — every phase 0 to 7 carries shipped code, and not one field gate has been answered by a person. Do not soften it to a maturity word the field gates would have to earn.

Five files carry it and all five must say the same thing: `src/data/status.ts` in the RELEASE STATE stat, `src/data/compare.ts` in the maturity row, `src/data/security.ts` in what we do not claim, `src/data/readme.ts` in the status chip, and — outside this directory — the hard-coded status badge on line 10 of `../README.md` and `../README.id.md`. That fifth surface is the one a reader clicks: it links to `../docs/roadmap.md`, and it sat at `v1.0` until 15 August 2026, five releases after that stopped being true, which is what being unnamed here buys. The npm badge above it is served by shields from the registry and needs no sweep; this one is a static URL and does.

The fourth surface went unnamed here until 14 August 2026 and drifted exactly as far as being unnamed predicts — the chip read `v1.2` while the three named files read `v1.1`, and the line directly below the chip, in the same file, read `v1.5`. The badge repeated the lesson a day later at five releases of drift instead of one, which is the same finding at five times the size. The number in all five is the shipped release line and it moves with `package.json`. A `v1.1` that records when something changed — `uninstall` came back in v1.1, the mode key arrived in v1.1 — is history and never moves. The npm chip in `src/data/readme.ts` is the one number that does not track the release: it tracks the registry, so it stays behind until the owner publishes, and its comment says so and must keep saying so.

Still not shipped, and never to be implied: a typing indicator, embeds, WhatsApp groups, `caraka init discord`, `caraka init whatsapp`, an MCP inbox, and role-to-policy mapping on Discord — the `modes` map is keyed by container, or by principal in a private conversation, never by role. A role never authorises an approval. The two `assisted` cells for `git push` and deploy in `docs/security.md` §5 are still design: the high-risk list applies first and sends a card for both whatever the mode says. Caraka also never installs a background service — `caraka service --print` prints a unit and writes nothing.

Two version-bearing surfaces sit outside `src/data/` and `src/pages/` and are swept by hand: `src/lib/site.ts`, which holds every page's meta description and OG headline, and `scripts/gen-assets.mjs`, which draws those headlines and the eight phase rows into the PNGs. `/brand/og` is a preview board of what that generator draws, so a sentence changed on one side has to change on the other or the board stops being a preview.

A comp is authoritative for design and is no longer authoritative for release facts. Where a value here contradicts `design/mockups/*.dc.html` because the code moved, keep the truth and leave a comment naming the comp line it left and the code that made it wrong. A false claim is never kept for fidelity, and prose that is merely improvable is left alone — every changed line costs a height baseline in `e2e/site.spec.ts`.

## Assets

`npm run assets` regenerates every favicon and OG image; `npm run build` runs it first. They are gitignored on purpose — they are output, not source.

Two brand rules are enforced in code, not by review. The aksara ships as a `<path>` in every exported asset, because an SVG with `<text>ꦕ</text>` is a tofu box on any machine without Noto Sans Javanese. And every string drawn into an OG image is checked against the subset the generator loads; a character outside it fails `npm test` rather than shipping as a box.

## Commands

```bash
npm run dev          # local
npm run assets       # favicons + OG images
npm run check        # lint, typecheck, unit
npm run e2e          # playwright, chromium + firefox + webkit
npm run build        # assets, then static output to dist/
npm run deploy       # wrangler, reads CLOUDFLARE_ACCOUNT_ID from the environment
```

This repository is public. No token, key, or account identifier is ever committed — `wrangler.jsonc` carries no `account_id` for exactly that reason.
