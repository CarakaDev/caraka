import { test, expect, type Page } from '@playwright/test'
import { PAGES } from '../src/lib/site'

const ROUTES = Object.entries(PAGES).map(([key, meta]) => ({ key, ...meta }))

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
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', abs(`/og/${r.key}.png`))
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image')
    })
  }

  test('the OG image each page points at actually exists', async ({ request }) => {
    // AC-4.3 — a 404 here is invisible until someone shares a link.
    for (const r of ROUTES) {
      const res = await request.get(`/og/${r.key}.png`)
      expect(res.status(), `/og/${r.key}.png`).toBe(200)
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
