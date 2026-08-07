// Renders a design comp and its ported page at the same viewport and writes
// both screenshots, so fidelity can be judged by looking rather than guessing.
import { chromium } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'

const [, , DIST, MOCKDIR, MOCKFILE, ROUTE, OUTDIR, MODE] = process.argv
const MIME = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.mjs':'text/javascript', '.woff2':'font/woff2', '.woff':'font/woff', '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.xml':'application/xml', '.json':'application/json', '.txt':'text/plain', '.webmanifest':'application/manifest+json' }

const serve = (root, port) => new Promise((resolve) => {
  const s = createServer(async (req, res) => {
    let p = join(root, decodeURIComponent(req.url.split('?')[0]))
    try { if ((await stat(p)).isDirectory()) p = join(p, 'index.html') }
    catch { if (!extname(p)) p += '.html' }
    let body
    try { body = await readFile(p) } catch { res.writeHead(404); res.end('nf'); return }
    res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' })
    res.end(body)
  })
  s.listen(port, () => resolve(s))
})

const a = await serve(DIST, 4321)
const b = await serve(MOCKDIR, 4322)
const browser = await chromium.launch()
const full = MODE === 'full'

for (const [label, url] of [['port', `http://localhost:4321${ROUTE}`], ['mockup', `http://localhost:4322/${encodeURIComponent(MOCKFILE)}`]]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const bad = []
  page.on('pageerror', (e) => bad.push(String(e).slice(0, 160)))
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 })
    await page.waitForTimeout(3600)
    await page.screenshot({ path: join(OUTDIR, `${label}.png`), fullPage: full })
    const h = await page.evaluate(() => document.body.scrollHeight)
    console.log(`${label}: height ${h}px${bad.length ? ' | errors: ' + bad.join(' ; ') : ''}`)
  } catch (e) {
    console.log(`${label}: FAILED ${String(e).slice(0, 200)}`)
  }
  await page.close()
}
await browser.close(); a.close(); b.close()
