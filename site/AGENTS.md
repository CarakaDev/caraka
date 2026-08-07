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

## Content

`src/data/*.ts` holds what the lists render. Every value there traces to `../docs/`. Caraka is pre-alpha with nothing implemented: never write copy that implies a feature works, and never introduce a number, date, version, or quotation that is not already in the docs.

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
