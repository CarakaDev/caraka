# AGENTS.md — site/

The caraka.dev website. Read [`../AGENTS.md`](../AGENTS.md) first; everything there applies here too.

## What this is

Astro, static output, no adapter, no UI framework, no client framework runtime. The only JavaScript shipped to a visitor is `src/scripts/ck.js`, and it is 60 lines including its comments.

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

**Keyframes belong to their page.** Nine keyframe names appear in more than one mockup with different values: `ck-rise` travels 18, 22, 24, 26, or 28 pixels depending on which page you are on. `src/styles/pages/<slug>.css` holds one mockup's `<style>` block, unedited, imported by that page alone. Never merge them into `global.css`.

**Scroll-driven animations must survive an engine that lacks them.** An element carrying `animation: ck-rise linear both` with no duration is invisible until its timeline advances. Where `animation-timeline` is unsupported the declaration is dropped, the animation runs for 0s, and `both` leaves the element on its final frame — visible. The e2e suite asserts this in Firefox and WebKit, not just Chromium. If you add a scroll-driven animation, add it to that assertion.

## The one place the port leaves the mockup

`Caraka Landing.dc.html` labels the opening veil `MEMBUKA GERBANG`. The port
reads `OPENING THE GATE` (`VEIL_LABEL` in `src/data/landing.ts`), because `/`
declares `lang="en"` and the comp's own label is the only Indonesian on it. The
English is the literal reading, so the gate the animation draws survives. Every
other character of that mockup is ported unchanged, and `test/fidelity.test.js`
fails if this deviation stops being written down here.

The veil also plays once per tab session rather than on every load. The flag is
read by an inline `<script is:inline>` in the `<head>` of `index.astro`, which
is the only code that runs before the veil markup is parsed — `ck.js` is a
module and arrives after. **A Content-Security-Policy header would break this
silently:** the site ships no CSP and no `_headers` today, and the day one lands
that script needs its hash in `script-src` and the one-line `<style is:inline>`
beside it needs its own in `style-src`. Without them the veil replays on every
visit and nothing turns red.

## Content

`src/data/*.ts` holds what the lists render. Every value there traces to `../docs/` and `../src/`. The v0.2 preview supports one Telegram operator, the chats on `telegram.allowChats` — a DM and any group paired there — and Claude Code; copy must distinguish that verified scope from roadmap work. Never imply memory, attachments, or other coding agents ship, never say Caraka installs a background service (`caraka service --print` prints a unit and writes nothing), and never introduce a number, date, version, or quotation that is not already in the docs.

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
