import { test, expect, type Page } from '@playwright/test'
import { PAGES, ogPath, type PageKey } from '../src/lib/site'
import { VEIL_LABEL } from '../src/data/landing'

// Object.entries widens the key to string and ogPath only takes a PageKey; the
// cast is what PAGES already guarantees. Without it `npm run typecheck` is red.
const ROUTES = (Object.entries(PAGES) as [PageKey, (typeof PAGES)[PageKey]][]).map(([key, meta]) => ({ key, ...meta }))

/** The landing page opens behind a 2.6s veil; everything else paints at once. */
const settle = async (page: Page) => page.waitForTimeout(3000)

test.describe('routes', () => {
  for (const r of ROUTES) {
    test(`${r.path} responds and is the page it claims to be`, async ({ page }) => {
      const res = await page.goto(r.path)
      expect(res?.status()).toBe(200)

      // AC-1.1
      await expect(page).toHaveTitle(r.title)
      await expect(page.locator('html')).toHaveAttribute('lang', r.lang)

      // AC-4.5 — every social tag points at this route, not the last one built.
      const abs = (p: string) => new URL(p, 'https://caraka.dev').href
      await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', abs(r.path))
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', abs(r.path))
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', abs(ogPath(r.key)))
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image')
    })
  }

  test('the OG image each page points at actually exists', async ({ request }) => {
    // AC-4.3 — a 404 here is invisible until someone shares a link.
    for (const r of ROUTES) {
      const res = await request.get(ogPath(r.key))
      expect(res.status(), ogPath(r.key)).toBe(200)
      expect(Number(res.headers()['content-length'])).toBeGreaterThan(1000)
    }
  })

  test('the favicon set is served', async ({ request }) => {
    for (const f of ['/favicon.svg', '/favicon.ico', '/apple-touch-icon.png', '/site.webmanifest', '/robots.txt']) {
      expect((await request.get(f)).status(), f).toBe(200)
    }
  })
})

test.describe('motion', () => {
  test('scroll-driven content is visible on every engine', async ({ page }) => {
    // AC-2.1 and AC-2.2 together. Elements carrying `animation: … linear both`
    // with no duration depend on a view() timeline to ever reach opacity 1.
    // Where the engine has no scroll-driven animations the declaration is
    // dropped, the animation runs for 0s, and `both` leaves the final frame in
    // place. Either way the reader sees the text. This test is the only thing
    // standing between that reasoning and a blank page in the wild.
    await page.goto('/')
    await settle(page)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(1200)

    const headings = page.locator('main h2')
    const n = await headings.count()
    expect(n).toBeGreaterThan(3)

    for (let i = 0; i < n; i++) {
      await expect(headings.nth(i)).toBeVisible()
      const opacity = Number(await headings.nth(i).evaluate((el) => getComputedStyle(el).opacity))

      // The final section is the exception, and it is the comp's behaviour, not
      // a porting defect: its range is `entry 0% cover 28%`, and at a 900px
      // viewport the document runs out of scroll before the cover phase gets
      // that far. Measured in the mockup itself, the last heading settles at
      // 0.3565 — the port reproduces that value exactly. It stays legible (a
      // 38px bold at roughly 4:1 on the void, which clears AA for large text),
      // so it is left alone rather than quietly redesigned.
      const floor = i === n - 1 ? 0.3 : 0.9
      expect(opacity, `heading ${i} opacity`).toBeGreaterThan(floor)
    }
  })

  test('scroll progress advances', async ({ page }) => {
    // AC-2.4 and AC-2.5 — CSS drives this where possible, ck.js where not.
    await page.goto('/')
    await settle(page)
    const read = () =>
      page.evaluate(() => Number(getComputedStyle(document.documentElement).getPropertyValue('--ck-sp')) || 0)

    expect(await read()).toBeLessThan(0.05)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(600)
    expect(await read()).toBeGreaterThan(0.5)
  })

  test('reduced motion still shows the content', async ({ browser }) => {
    // AC-2.3 — with animations cut to 0.001ms, nothing may be left mid-fade.
    const page = await browser.newPage({ reducedMotion: 'reduce' })
    await page.goto('/')
    await page.waitForTimeout(500)
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('h1')).toContainText('Send the task.')
    await page.close()
  })
})

test.describe('the opening veil', () => {
  const veil = (page: Page) => page.locator('[data-veil]')

  test('plays in full on the first visit of a tab', async ({ page }) => {
    // AC-1.3 and AC-1.2. Each test gets its own context, so every one of these
    // is a first visit unless it navigates twice itself.
    await page.goto('/')
    await expect(veil(page)).toBeVisible()
    await expect(veil(page)).toContainText(VEIL_LABEL)
    expect(await veil(page).evaluate((el) => getComputedStyle(el).animationDuration)).toBe('2.6s')

    // AC-1.6 is measured by the height baselines at the bottom of this file.
    // This is the reason those numbers are allowed to stay put: a fixed
    // element contributes nothing to document height, so retexting or hiding
    // it cannot move one. Asserted rather than assumed.
    expect(await veil(page).evaluate((el) => getComputedStyle(el).position)).toBe('fixed')

    await settle(page)
    await expect(veil(page)).toBeHidden()
  })

  test('exists on / and on no other route', async ({ page }) => {
    // AC-1.1
    for (const r of ROUTES.filter((r) => r.path !== '/')) {
      await page.goto(r.path)
      await expect(veil(page), r.path).toHaveCount(0)
    }
  })

  test('is already hidden when the second load of the tab parses it', async ({ page }) => {
    // AC-1.4. The trip through /docs is what makes this provable: that route
    // has no [data-veil] at all, so an element found after `commit` can only
    // belong to the new document. Waiting for `attached` then reading display
    // is the earliest point Playwright can observe anything; that the rule was
    // in place before the first paint is fixed by ordering, asserted in
    // test/fidelity.test.js.
    await page.goto('/')
    await expect(veil(page)).toBeVisible()
    await page.goto('/docs')

    await page.goto('/', { waitUntil: 'commit' })
    const el = veil(page)
    await el.waitFor({ state: 'attached' })
    expect(await el.evaluate((e) => getComputedStyle(e).display)).toBe('none')
  })

  test('a sessionStorage that throws is treated as a first visit', async ({ page }) => {
    // AC-1.5 — Safari with cookies blocked, and a storage quota that is full.
    // Overriding the prototype method rather than the `sessionStorage` getter
    // because the getter lives in a different place in each engine.
    await page.addInitScript(() => {
      Storage.prototype.getItem = () => {
        throw new Error('storage blocked')
      }
    })
    await page.goto('/')
    await expect(veil(page)).toBeVisible()
    await page.goto('/')
    await expect(veil(page)).toBeVisible()
  })
})

test.describe('copy button', () => {
  test('copies the install command and reports it', async ({ page, context, browserName }) => {
    // AC-3.1 and AC-3.2. Clipboard permissions are Chromium-only in Playwright;
    // elsewhere assert the button carries what it would copy.
    await page.goto('/')
    await settle(page)
    const btn = page.locator('[data-copy]').first()
    await expect(btn).toHaveAttribute('data-copy', 'npx caraka init')

    if (browserName !== 'chromium') return

    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await btn.click()
    await expect(btn.locator('[data-copy-label]')).toHaveText('COPIED')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('npx caraka init')

    // AC-3.2 — and it goes back.
    await page.waitForTimeout(1900)
    await expect(btn.locator('[data-copy-label]')).toHaveText('COPY')
  })
})

test.describe('keyboard access', () => {
  test('the first tab stop is the skip link, and it lands on the content', async ({ page }) => {
    // AC-5.1 — the landing page opens behind a fixed header and a 2.6s veil.
    await page.goto('/')
    await settle(page)
    await page.keyboard.press('Tab')

    const focused = page.locator(':focus')
    await expect(focused).toHaveClass(/ck-skip/)
    await expect(focused).toBeVisible()
    await expect(focused).toHaveAttribute('href', '#main')
    await expect(page.locator('#main')).toHaveCount(1)
  })

  test('focus is visible', async ({ page }) => {
    // AC-5.2
    await page.goto('/')
    await settle(page)
    await page.keyboard.press('Tab')
    const outline = await page.locator(':focus').evaluate((el) => getComputedStyle(el).outlineStyle)
    expect(outline).not.toBe('none')
  })

  test('anchors clear the fixed header', async ({ page }) => {
    // AC-5.3 — without scroll-margin-top the target sits behind the header.
    await page.goto('/')
    const margin = await page
      .locator('#gap')
      .evaluate((el) => Number.parseFloat(getComputedStyle(el).scrollMarginTop))
    expect(margin).toBeGreaterThanOrEqual(64)
  })
})

test.describe('honesty', () => {
  test('no page claims the software is finished', async ({ page }) => {
    // AC-6.2 — the project is pre-alpha with nothing implemented.
    // Each pattern is a CLAIM of adoption or maturity. Note `trusted by \d`
    // rather than `trusted by`: the roadmap page asks "Is it ready to be
    // trusted by strangers?", which is the opposite of a claim.
    const banned =
      /\b(production[- ]ready|battle[- ]tested|trusted by \d|used by \d|thousands of (users|developers)|v1\.0 release)\b/i
    for (const r of ROUTES) {
      await page.goto(r.path)
      const text = await page.locator('body').innerText()
      expect(text, `${r.path}`).not.toMatch(banned)
    }
  })
})

test.describe('the comps still decide the layout', () => {
  test('every route keeps the document height its mockup renders at', async ({ page, browserName }) => {
    // Chromium only, and not for convenience: engines disagree on font metrics.
    // Firefox renders /brand/warna 11px taller than Chromium does, and always
    // did — measured against an unmodified copy of the page. A single set of
    // numbers can therefore only be true for one engine. Chromium is the one
    // scripts/compare-to-mockup.mjs renders the comps in, so the numbers below
    // and the parity check they guard come from the same place.
    test.skip(browserName !== 'chromium', 'height baselines are per-engine')

    // These numbers came from rendering each comp beside its port at 1440x900;
    // all ten matched exactly. They are the tripwire for any later change —
    // phone work especially, since a media query written one breakpoint too
    // wide would land here first.
    //
    // /brand/readme reads 5533: the comp's placement note was corrected (the
    // reason for relative image paths, not the rule), and the longer sentence
    // grew the board by 43px on both sides. It also honours the aksara's own
    // 112/92 metrics; before U+0020 entered the font's unicode-range the strut
    // fell through to serif and the page came out 16px short. See global.css.
    //
    // Three of these moved when the comps did: the minimum-size rule replaced
    // the ringed lockups in the two colophons (+6 each), and the UI kit gained
    // an eighth rule (+59 with its own header change). Each new number was
    // measured against the updated comp and matches it exactly.
    //
    // This lives in the desktop suite on purpose. Under device emulation the
    // same pages measure a pixel taller on three routes, which is sub-pixel
    // rounding at a different device scale factor, not a regression.
    //
    // Six of these no longer track a comp. `/`, `/docs`, `/compare`,
    // `/install`, `/security` and `/status` carry release copy, and the comps
    // behind them describe v0.1 — groups rejected, three CLI commands, no
    // trust window, no service file, a Gemini free path that never shipped. A
    // comp still decides how those six pages look; it stopped deciding what
    // they claim, so their numbers are now measured from the built site rather
    // than from design/mockups/*.dc.html, and a diff against the comp on those
    // six is expected reading rather than a failure. /brand/readme joined them
    // at v0.6, when the repo card's one-line description grew a third channel;
    // the four below it still keep their comp's height, and /story only swapped
    // a version string of identical length.
    //
    // Measured 8 August 2026, Chromium at 1440x900, against the copy that
    // shipped with v0.2. Deltas from the v0.1 baselines: / +31, /docs +907,
    // /install +94, /security +371, /status +524. /status then took a further +317
    // when the 0.2.1 changelog card was added, and / a further +29 when the
    // sessions paragraph stopped claiming icons recolour and topics close.
    // The 0.3.0 card moved nothing; the 0.4.0 card and the fifth open gate
    // moved /status +628 (measured 8 August 2026, same viewport). The v0.4
    // lines on / rode inside their existing chips and card, moving nothing.
    // v0.5 moved /status +808 to 7596: the 0.5.0 card and two more open gates.
    // Measured 8 August 2026, Chromium, same 1440x900 viewport. The other six
    // routes hold — the Discord and dashboard rewrites on /, /docs, /compare,
    // /install and /security stayed inside rows and cards that already existed.
    //
    // v0.6 moved five, all re-measured 8 August 2026, Chromium, same viewport:
    // /status +1064 to 8660 (the 0.6.0 card, the largest yet, plus a sixth open
    // gate), /docs +625 (a code row on the approval table, three lines added to
    // the config sample, and four rewritten rows that now wrap), /security +338
    // (two more "what we do not claim" entries and four rewritten controls),
    // /install +69 and / +65 (one rewritten listener claim on each), and
    // /brand/readme +16 (a third channel in the repo card's description).
    // /compare held: the channel count and the maturity chip changed inside
    // cells that already existed, and 'topics, threads, or a header' is shorter
    // than the line it replaced.
    //
    // v1.0 moved seven. Read these against v0.6, not against the first set of
    // v1.0 numbers this file carried: those were taken against a `dist/` built
    // before the last copy edits landed, so they were a real measurement of a
    // tree that no longer existed. The set below was taken after `rm -rf dist
    // && npm run build`, twice, identical both times — 8 August 2026, Chromium,
    // 1440x900. If a number here ever looks impossible, rebuild before
    // believing it: `npm run e2e` reuses a preview server it did not start.
    //
    // /status +2153 to 10813 is the largest move this page has taken. The 1.0.0
    // card carries its own ADDED and LIMITED groups, a ninth open gate joins the
    // list, and every phase row now names an open gate where three of them used
    // to read done. /security +741: a fourteenth threat control, the CLI route's
    // missing permission hook added to what we do not claim, and four rewritten
    // entries. /docs +306: the release banner grew, and the doctor, start, and
    // dashboard rows wrap. /install +154 and / +65: a rewritten hero and a
    // rewritten section on each. /compare +58, which is the first time it has
    // moved since the port: the memory line the port had dropped came back.
    // /brand/readme −16 to 5533, the height it held before v0.6, because the
    // repo card's status chip and the board's blockquote were both rewritten
    // shorter.
    //
    // /whatsapp-risk is the thirteenth entry and the first route here that
    // never had a comp: it renders docs/whatsapp-risiko.en.md, and it borrows
    // the security page's shapes and stylesheet. 6857 is its first baseline.
    // /security moved with it, +65 to 5901, for the one line under "what we do
    // not claim" that points at it. /docs took the same link in its footer and
    // held at 6805 — the row had room for a seventh link at 1440px. Measured
    // 8 August 2026, Chromium at 1440x900, against `rm -rf dist && npm run
    // build`, twice, identical both times.
    //
    // v1.2.0 moved four. /status +1071 to 13648 is the second-largest move this
    // page has taken: the 1.2.0 card carries CHANGED, ADDED, FIXED, and LIMITED,
    // and the CHANGED group alone runs four entries because the Titen adapter
    // was wrong in four separate ways. /install +25 and / +15: the count of agents
    // run against a live binary went from one to four on each, which is a
    // longer clause than the one it replaced. /brand/readme +24: the repo
    // card's status chip and the board's blockquote both took the same count.
    // /docs and /compare held — their edits landed inside sentences that were
    // already there. Measured 10 August 2026, Chromium at 1440x900, against
    // `rm -rf dist && npm run build`, twice, identical both times.
    //
    // v1.1.2 moved one: /status +203 to 12577, for a patch card carrying a
    // single FIXED group. Measured 10 August 2026, Chromium at 1440x900,
    // against `rm -rf dist && npm run build`, twice, identical both times.
    //
    // v1.1.1 moved one: /status +339 to 12374, for the 1.1.1 card. It is a
    // patch card with two groups and no new open gate, which is why it costs a
    // quarter of what 1.1.0 did. / held: the sentence naming Codex moved off
    // the ACP card, where it had wrapped a line and put the page 22 past its
    // comp, and onto the CLI card, which is the route Codex was verified on.
    // Measured 10 August 2026, Chromium at 1440x900, against `rm -rf dist &&
    // npm run build`, twice, identical both times.
    //
    // v1.1 moved five, measured the same way and on the same viewport, twice,
    // identical both times. /status +1222 to 12035: the 1.1.0 card, which
    // carries three groups rather than two. /docs +509: a policy-mode row on
    // the security table, two lines in the config sample, and two more CLI
    // verbs, all of which wrap. /security +246: a fifth row in the mode table,
    // a mandatory control that had been a sentence until this release, one more
    // reportable failure, and a rewritten group-disclosure control. /install
    // +76: the comp's own last two transcript lines, restored now that both
    // commands exist. /brand/readme +24: the repo card gained the mode gate.
    // / and /compare held — their edits landed inside cells and chips that were
    // already there.
    const EXPECTED: Record<string, number> = {
      // v1.2 copy — measured from the site (see above)
      '/': 6595,
      '/docs': 7314,
      '/compare': 5931,
      '/install': 5465,
      '/security': 6147,
      '/whatsapp-risk': 6857,
      '/status': 13648,
      '/brand/readme': 5581,
      // still measured against the comp
      '/story': 5734,
      '/brand': 10177,
      '/brand/warna': 5264,
      '/brand/ui-kit': 9584,
      '/brand/og': 6821,
    }

    await page.setViewportSize({ width: 1440, height: 900 })
    const drift: string[] = []

    for (const [path, expected] of Object.entries(EXPECTED)) {
      await page.goto(path, { waitUntil: 'networkidle' })
      // No veil wait: the landing intro is position:fixed and contributes
      // nothing to document height. Ten routes at the full settle would take
      // the whole test past its timeout for no measurement gain.
      await page.waitForTimeout(300)
      const got = await page.evaluate(() => document.body.scrollHeight)
      if (got !== expected) drift.push(`${path}: ${got} (comp renders at ${expected})`)
    }

    expect(drift).toEqual([])
  })
})
