// Loads every route at phone widths and reports what actually breaks:
// horizontal overflow (and the element causing it), unreachable navigation,
// and tap targets below the 44px floor.
import { chromium } from '@playwright/test'

const ROUTES = ['/', '/docs', '/install', '/compare', '/security', '/status', '/story', '/brand', '/brand/warna', '/brand/ui-kit', '/404']
const SIZES = [
  { name: 'iPhone SE  375', width: 375, height: 667 },
  { name: 'iPhone 14  390', width: 390, height: 844 },
  { name: 'Pixel 7    412', width: 412, height: 915 },
]
const BASE = process.argv[2] || 'http://localhost:4321'

const b = await chromium.launch()
for (const s of SIZES) {
  console.log(`\n════ ${s.name}×${s.height} ════`)
  const ctx = await b.newContext({ viewport: { width: s.width, height: s.height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  for (const r of ROUTES) {
    const p = await ctx.newPage()
    await p.goto(BASE + r, { waitUntil: 'networkidle', timeout: 45000 })
    await p.waitForTimeout(r === '/' ? 3200 : 900)
    const res = await p.evaluate(() => {
      const de = document.documentElement
      const overflow = de.scrollWidth - de.clientWidth
      const wide = []
      if (overflow > 1) {
        for (const el of document.querySelectorAll('body *')) {
          const rect = el.getBoundingClientRect()
          if (rect.width === 0) continue
          if (rect.right > de.clientWidth + 1 || rect.left < -1) {
            const style = getComputedStyle(el)
            // Skip elements inside something that scrolls on its own.
            let par = el.parentElement, contained = false
            while (par) {
              const ov = getComputedStyle(par).overflowX
              if (ov === 'auto' || ov === 'scroll' || ov === 'hidden') { contained = true; break }
              par = par.parentElement
            }
            if (contained) continue
            wide.push(`${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ')[0] : ''} right=${Math.round(rect.right)} w=${Math.round(rect.width)} ${style.position}`)
          }
        }
      }
      const links = [...document.querySelectorAll('header a, header button, nav a')]
      const visibleNav = links.filter((a) => a.getBoundingClientRect().width > 0).map((a) => (a.textContent || '').trim().slice(0, 14)).filter(Boolean)
      const small = [...document.querySelectorAll('a, button, [role=button]')]
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 0 && r.height > 0 && (r.height < 44 || r.width < 44))
      return {
        overflow,
        wide: [...new Set(wide)].slice(0, 4),
        visibleNav,
        tocVisible: !!document.querySelector('[data-toc]') && document.querySelector('[data-toc]').getBoundingClientRect().width > 0,
        hasToc: !!document.querySelector('[data-toc]'),
        smallTargets: small.length,
        smallest: small.slice(0, 2).map(({ el, r }) => `${el.tagName.toLowerCase()}"${(el.textContent||'').trim().slice(0,12)}" ${Math.round(r.width)}x${Math.round(r.height)}`),
      }
    })
    const flag = res.overflow > 1 ? `OVERFLOW +${res.overflow}px` : 'ok'
    console.log(`${r.padEnd(16)} ${flag.padEnd(16)} nav=[${res.visibleNav.join(',') || 'NONE'}] toc=${res.hasToc ? (res.tocVisible ? 'shown' : 'HIDDEN') : '-'} taps<44=${res.smallTargets}`)
    if (res.wide.length) res.wide.forEach((w) => console.log(`                   ↳ ${w}`))
    if (res.smallTargets) console.log(`                   ↳ e.g. ${res.smallest.join(' | ')}`)
    await p.close()
  }
  await ctx.close()
}
await b.close()
