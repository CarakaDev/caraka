import { test, expect, type Page } from '@playwright/test'
import { PAGES } from '../src/lib/site'

// The comps never drew a phone. Everything asserted here comes from
// spec/mobile.md, not from a mockup — which is exactly why it needs tests: no
// reference image exists to catch a regression by eye.

const ROUTES = Object.values(PAGES).map((p) => p.path)
const WIDTHS = [320, 375, 390, 412]

const settle = (page: Page, path: string) => page.waitForTimeout(path === '/' ? 3000 : 700)

test.describe('no overflow', () => {
  for (const width of WIDTHS) {
    test(`nothing spills past ${width}px on any route`, async ({ page }) => {
      // AC-1.1
      await page.setViewportSize({ width, height: 800 })
      const spilling: string[] = []

      for (const path of ROUTES) {
        await page.goto(path)
        await settle(page, path)
        const over = await page.evaluate(() => {
          const de = document.documentElement
          return de.scrollWidth - de.clientWidth
        })
        if (over > 1) spilling.push(`${path} +${over}px`)
      }

      expect(spilling).toEqual([])
    })
  }

  test('anything wider than the screen scrolls inside its own container', async ({ page }) => {
    // AC-1.2 — a wide table or a fixed-size specimen is allowed to be wide. It
    // is not allowed to drag the page with it.
    await page.setViewportSize({ width: 390, height: 800 })
    const loose: string[] = []

    for (const path of ROUTES) {
      await page.goto(path)
      await settle(page, path)
      const found = await page.evaluate(() => {
        const out: string[] = []
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect()
          if (r.width <= window.innerWidth + 1) continue
          let p: HTMLElement | null = el.parentElement
          let contained = false
          while (p) {
            const ox = getComputedStyle(p).overflowX
            if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') { contained = true; break }
            p = p.parentElement
          }
          if (!contained) out.push(`${el.tagName.toLowerCase()} w=${Math.round(r.width)}`)
        }
        return [...new Set(out)]
      })
      found.forEach((f) => loose.push(`${path}: ${f}`))
    }

    expect(loose).toEqual([])
  })
})

test.describe('header menu', () => {
  /** Pages whose header carries navigation. The two brand boards have none by design. */
  const NAVIGATED = ['/', '/guide', '/docs', '/install', '/compare', '/security', '/whatsapp-risk', '/status', '/story', '/brand/ui-kit']

  test('every navigated page offers a menu, and it holds every desktop link', async ({ page }) => {
    // AC-2.1 and AC-2.2
    for (const path of NAVIGATED) {
      await page.goto(path)
      await settle(page, path)

      const btn = page.locator('.ck-menu-btn')
      await expect(btn, path).toBeVisible()

      // The desktop nav is hidden here, but its links are still in the DOM —
      // the menu must offer the same set, or a phone reader loses one.
      const desktop = await page.evaluate(() =>
        [...document.querySelectorAll('header [data-navlinks] a')].map((a) => (a.textContent || '').trim()),
      )
      await btn.click()
      const inMenu = await page.locator('.ck-menu-link').allTextContents()

      for (const label of desktop) {
        expect(inMenu.map((t) => t.trim()), `${path} is missing ${label}`).toContain(label)
      }
      // And the trailing call to action, which lives outside [data-navlinks].
      expect(inMenu.length, path).toBeGreaterThan(desktop.length)
    }
  })

  test('the panel is not rendered while shut', async ({ page }) => {
    // A closed <details> keeps a layout box, and an absolutely positioned child
    // escapes the UA's hiding entirely. Caught once already: the panel measured
    // 34x273 while shut, so its links were reachable by tab from a page that
    // looked closed.
    await page.goto('/docs')
    await settle(page, '/docs')
    await expect(page.locator('.ck-menu-panel')).toBeHidden()
    await expect(page.locator('.ck-toc-list')).toBeHidden()
  })

  test('Escape closes it and returns focus to the button', async ({ page }) => {
    // AC-2.3
    await page.goto('/docs')
    await settle(page, '/docs')
    await page.locator('.ck-menu-btn').click()
    await expect(page.locator('.ck-menu-panel')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.locator('.ck-menu-panel')).toBeHidden()
    await expect(page.locator('.ck-menu-btn')).toBeFocused()
  })

  test('the page behind it does not scroll', async ({ page, browserName }) => {
    // AC-2.4
    await page.goto('/docs')
    await settle(page, '/docs')
    await page.locator('.ck-menu-btn').click()

    // `toggle` is queued rather than dispatched synchronously, so the lock is
    // not in place the instant click() returns. Waiting on the panel and the
    // inline style is both the assertion and the synchronisation point; without
    // it the wheel below fires first and the test fails for the wrong reason.
    await expect(page.locator('.ck-menu-panel')).toBeVisible()
    expect(
      await page.evaluate(() => document.documentElement.style.overflow),
      'the root element was not locked',
    ).toBe('hidden')

    // Asserts the behaviour, not the property — locking the body alone computes
    // to overflow:hidden and reads as a pass while the page scrolls happily
    // underneath, which is what it did the first time.
    //
    // Driven with a wheel event rather than scrollTo(): overflow:hidden stops
    // the user, never the script, so scrollTo() moves the page either way and
    // would report a failure that is not one.
    expect(await page.evaluate(() => getComputedStyle(document.body).position), 'body was not pinned').toBe('fixed')

    // Playwright cannot drive a wheel in mobile WebKit, so the behavioural half
    // of this runs on Chromium. The lock itself is asserted on both above.
    if (browserName !== 'webkit') {
      await page.mouse.wheel(0, 600)
      await page.waitForTimeout(250)
      expect(await page.evaluate(() => window.scrollY), 'page scrolled while the menu was open').toBe(0)
    }

    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    expect(await page.evaluate(() => getComputedStyle(document.body).position), 'body stayed pinned').not.toBe('fixed')
  })

  test('a tap outside dismisses it', async ({ page }) => {
    await page.goto('/docs')
    await settle(page, '/docs')
    await page.locator('.ck-menu-btn').click()
    await expect(page.locator('.ck-menu-panel')).toBeVisible()

    await page.mouse.click(20, 600)
    await expect(page.locator('.ck-menu-panel')).toBeHidden()
  })
})

test.describe('table of contents', () => {
  const WITH_TOC = ['/guide', '/docs', '/install', '/security', '/whatsapp-risk', '/brand/ui-kit']

  test('the sidebar the comps hide comes back as a disclosure', async ({ page }) => {
    // AC-3.1 and AC-3.2 — same entries, same numbers, same order.
    for (const path of WITH_TOC) {
      await page.goto(path)
      await settle(page, path)

      const aside = await page.evaluate(() =>
        [...document.querySelectorAll('[data-toc] a')].map((a) => (a.textContent || '').replace(/\s+/g, ' ').trim()),
      )
      expect(aside.length, `${path} has no desktop toc to mirror`).toBeGreaterThan(0)

      await expect(page.locator('.ck-toc-btn'), path).toBeVisible()
      await page.locator('.ck-toc-btn').click()
      const mobile = (await page.locator('.ck-toc-link').allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim())

      expect(mobile, path).toEqual(aside)
    }
  })

  test('it starts closed', async ({ page }) => {
    // AC-3.4
    for (const path of WITH_TOC) {
      await page.goto(path)
      await settle(page, path)
      expect(await page.locator('.ck-toc').getAttribute('open'), path).toBeNull()
    }
  })

  test('following an entry clears the fixed header', async ({ page }) => {
    // AC-3.3
    await page.goto('/docs')
    await settle(page, '/docs')
    await page.locator('.ck-toc-btn').click()

    const href = await page.locator('.ck-toc-link').first().getAttribute('href')
    const id = (href || '').replace('#', '')
    const margin = await page
      .locator(`#${id}`)
      .evaluate((el) => Number.parseFloat(getComputedStyle(el).scrollMarginTop))
    expect(margin).toBeGreaterThanOrEqual(64)
  })
})

test.describe('tap targets', () => {
  test('every header and footer link answers to a 44px touch', async ({ page }) => {
    // AC-5.1. The element box may stay small — the spec forbids moving the
    // layout — so what matters is whether a 44px-wide press lands on the link.
    // Measured by hit testing, not by reading the element's own rectangle.
    const misses: string[] = []

    for (const path of ['/', '/docs', '/security', '/brand/ui-kit']) {
      await page.goto(path)
      await settle(page, path)

      const bad = await page.evaluate(() => {
        const out: string[] = []
        for (const el of document.querySelectorAll('header a, footer a')) {
          const r = el.getBoundingClientRect()
          if (r.width === 0 || r.height === 0) continue
          const cx = r.left + r.width / 2
          const cy = r.top + r.height / 2
          const reaches = [
            [cx, cy - 21],
            [cx, cy + 21],
          ].every(([x, y]) => {
            if (y < 0 || y > window.innerHeight) return true // off-screen edge, not a miss
            const hit = document.elementFromPoint(x, y)
            return !!hit && (hit === el || el.contains(hit) || hit.closest('a') === el)
          })
          if (!reaches) out.push(`${(el.textContent || '').trim().slice(0, 16)} ${Math.round(r.width)}x${Math.round(r.height)}`)
        }
        return out
      })
      bad.forEach((b) => misses.push(`${path}: ${b}`))
    }

    expect(misses).toEqual([])
  })
})
