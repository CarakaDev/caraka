import { test, expect, describe } from 'vitest'
import { VEIL_LABEL } from '../src/data/landing.ts'
import { releases } from '../src/data/status.ts'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// The mockups are the design. These tests are the tripwire that says so out
// loud: if a stylesheet drifts from its comp, or a hover state is dropped in a
// port, the build stops instead of quietly shipping something that only mostly
// looks right.

const SITE = fileURLToPath(new URL('..', import.meta.url))
const MOCKUPS = join(SITE, '..', 'design', 'mockups')

const SLUG = {
  'Caraka Landing.dc.html': 'landing',
  'Caraka Docs.dc.html': 'docs',
  'Caraka Install.dc.html': 'install',
  'Caraka Compare.dc.html': 'compare',
  'Caraka Security.dc.html': 'security',
  'Caraka Status.dc.html': 'status',
  'Caraka Story.dc.html': 'story',
  'Caraka Brandkit.dc.html': 'brand',
  'Caraka Sistem Warna.dc.html': 'warna',
  'Caraka UI Kit.dc.html': 'ui-kit',
  'Caraka OG Images.dc.html': 'og',
  'Caraka README.dc.html': 'readme',
}

const mockup = (file) => readFileSync(join(MOCKUPS, file), 'utf8')
const styleBlock = (src) => src.slice(src.indexOf('<style>') + 7, src.indexOf('</style>')).trim()
const globalCss = readFileSync(join(SITE, 'src', 'styles', 'global.css'), 'utf8')

describe('page stylesheets', () => {
  for (const [file, slug] of Object.entries(SLUG)) {
    test(`${slug}.css is its mockup's style block, unedited`, () => {
      const css = readFileSync(join(SITE, 'src', 'styles', 'pages', `${slug}.css`), 'utf8')
      // Strip only the provenance header this repo adds on extraction.
      const body = css.replace(/^\/\*[\s\S]*?\*\/\s*/, '').trim()
      expect(body).toBe(styleBlock(mockup(file)))
    })
  }

  test('keyframes that collide across pages keep their own values', () => {
    // ck-rise travels a different distance on five different pages. One shared
    // stylesheet would silently give them all whichever definition loaded last.
    const seen = new Map()
    for (const [file, slug] of Object.entries(SLUG)) {
      const re = /@keyframes\s+([\w-]+)\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g
      let m
      while ((m = re.exec(styleBlock(mockup(file))))) {
        const key = m[1]
        const value = m[2].replace(/\s+/g, ' ').trim()
        if (!seen.has(key)) seen.set(key, new Map())
        seen.get(key).set(value, [...(seen.get(key).get(value) || []), slug])
      }
    }
    const collisions = [...seen].filter(([, variants]) => variants.size > 1)
    expect(collisions.length, 'no collisions found — the fixture changed').toBeGreaterThan(0)

    for (const [name, variants] of collisions) {
      for (const [value, slugs] of variants) {
        for (const slug of slugs) {
          const css = readFileSync(join(SITE, 'src', 'styles', 'pages', `${slug}.css`), 'utf8')
          const own = new RegExp(`@keyframes\\s+${name}\\s*\\{((?:[^{}]|\\{[^{}]*\\})*)\\}`).exec(css)
          expect(own, `${slug}.css is missing @keyframes ${name}`).not.toBeNull()
          expect(own[1].replace(/\s+/g, ' ').trim(), `${slug} @keyframes ${name}`).toBe(value)
        }
      }
    }
  })
})

describe('hover states', () => {
  const declarations = new Set()
  for (const file of Object.keys(SLUG)) {
    for (const m of mockup(file).matchAll(/style-hover="([^"]*)"/g)) declarations.add(m[1].trim())
  }

  // The class body, normalised: property:value pairs, order-independent.
  const normalise = (decl) =>
    decl
      .split(';')
      .map((d) => d.trim().replace(/\s+/g, ' '))
      .filter(Boolean)
      .sort()
      .join(';')

  const classes = new Map()
  for (const m of globalCss.matchAll(/\.(hv-[\w-]+):hover\s*\{([^}]*)\}/g)) {
    classes.set(m[1], normalise(m[2]))
  }

  test('every style-hover in every mockup has a class that reproduces it', () => {
    const wanted = [...declarations].map(normalise)
    const have = new Set(classes.values())
    const missing = wanted.filter((w) => !have.has(w))
    expect(missing).toEqual([])
  })

  test('no hover class exists that no mockup asks for', () => {
    // Except the two descendant rules for the rail, which pair with hv-reveal
    // and hv-tick and are declared separately.
    const wanted = new Set([...declarations].map(normalise))
    const unused = [...classes].filter(([, body]) => !wanted.has(body)).map(([name]) => name)
    expect(unused).toEqual([])
  })
})

describe('fonts', () => {
  test('the three families the mockups name are declared', () => {
    // Inline styles across the comps say 'Public Sans', 'JetBrains Mono' and
    // 'Noto Sans Javanese'. Self-hosting under a different family name would
    // silently fall back to a system font on every one of those declarations.
    for (const family of ['Public Sans', 'JetBrains Mono', 'Noto Sans Javanese']) {
      expect(globalCss).toContain(`font-family: '${family}';`)
    }
  })

  test('anchor targets clear the fixed header', () => {
    expect(globalCss).toMatch(/\[id\]\s*\{\s*scroll-margin-top:/)
  })
})

describe('ports', () => {
  const pagesDir = join(SITE, 'src', 'pages')
  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.astro') ? [join(dir, e.name)] : [],
    )

  test('no design-comp syntax survived the port', () => {
    const leftovers = []
    for (const f of walk(pagesDir)) {
      const src = readFileSync(f, 'utf8')
      for (const pattern of ['sc-for', 'sc-if', 'style-hover', 'hint-placeholder', 'data-screen-label', '.dc.html"', 'className']) {
        if (src.includes(pattern)) leftovers.push(`${f.replace(SITE, '')}: ${pattern}`)
      }
      // Design-comp interpolation is `{{ name }}` or `{{ item.field }}` and
      // nothing else. Matching on `{{` alone flags every Astro object prop —
      // `cta={{ label: '…' }}` is a JSX object literal, not a leftover.
      if (/\{\{\s*[a-zA-Z_$][\w$]*(\.[\w$]+)*\s*\}\}/.test(src)) {
        leftovers.push(`${f.replace(SITE, '')}: {{ }}`)
      }
    }
    expect(leftovers).toEqual([])
  })

  test('every page reaches every other page it links to', () => {
    const routes = new Set(['/'])
    for (const f of walk(pagesDir)) {
      const rel = f.replace(join(pagesDir), '').replace(/\.astro$/, '').replace(/\/index$/, '')
      routes.add(rel === '' ? '/' : rel)
    }
    const broken = []
    for (const f of walk(pagesDir)) {
      for (const m of readFileSync(f, 'utf8').matchAll(/href="(\/[^"#?]*)"/g)) {
        if (!routes.has(m[1])) broken.push(`${f.replace(SITE, '')} -> ${m[1]}`)
      }
    }
    expect(broken).toEqual([])
  })
})

describe('the opening veil', () => {
  const index = readFileSync(join(SITE, 'src', 'pages', 'index.astro'), 'utf8')
  const agentsMd = readFileSync(join(SITE, 'AGENTS.md'), 'utf8')

  test('the label is English and the page renders the constant', () => {
    // AC-1.2 — `lang="en"` on / is a promise about this string, and a label
    // outside printable ASCII is a promise broken in a way nobody reads.
    expect(VEIL_LABEL).toMatch(/^[ -~]+$/)
    expect(index).toContain('{VEIL_LABEL}')
    expect(index).not.toContain('MEMBUKA GERBANG')
  })

  test('AGENTS.md still records the deviation from the comp', () => {
    // AC-1.7. Anchored on the comp too: if the mockup is ever redrawn in
    // English there is no deviation left to explain, and this test says so.
    expect(mockup('Caraka Landing.dc.html')).toContain('MEMBUKA GERBANG')
    expect(agentsMd).toContain(VEIL_LABEL)
    expect(agentsMd).toMatch(/mockup/i)
  })

  test('the replay flag is decided in <head>, ahead of the veil markup', () => {
    // AC-1.4, the half no browser observation can prove: Playwright can only
    // measure after the element exists. Ordering is structural, so it is
    // asserted on source — which also keeps this check runnable without a
    // build. <head> is parsed before <body> in every engine there is.
    const base = readFileSync(join(SITE, 'src', 'layouts', 'Base.astro'), 'utf8')
    expect(base.slice(base.indexOf('<head>'), base.indexOf('</head>'))).toContain('<slot name="head" />')

    const head = index.indexOf('slot="head"')
    expect(head, 'index.astro no longer fills the head slot').toBeGreaterThan(-1)
    expect(index.indexOf('<div data-veil')).toBeGreaterThan(head)
    expect(index).toMatch(/<script is:inline>[\s\S]*?sessionStorage[\s\S]*?<\/script>/)
  })

  test('the hide rule can beat the inline display the comp gave the veil', () => {
    // The other half of AC-1.4, and the half that shipped broken: the veil's
    // `display: flex` is an inline style, so a stylesheet rule without
    // `!important` loses every time. Asserted here as well as in Playwright
    // because this suite runs without a build.
    expect(index).toMatch(/\[data-veil-seen\]\s*\[data-veil\]\s*\{[^}]*display:\s*none\s*!important/)
    expect(index).toMatch(/<div data-veil[^>]*display:\s*flex/)
  })
})

describe('the changelog list is bounded', () => {
  // Every release added a card and nothing ever took one away. /status measured
  // 18,455px at 1440x900 on 14 August 2026 and was growing about 600px a
  // release, which the 320px overflow test in e2e/mobile.spec.ts pays for in
  // seconds against a 30-second timeout. Five full cards is the bound, and the
  // rest are one line each in the last card.
  //
  // The height baseline in e2e/site.spec.ts also goes red on a sixth card, but
  // a red baseline only says a number moved. These say which rule was broken,
  // and they run without a browser or a build.
  const semver = /^\d+\.\d+\.\d+$/
  const line = /^(\d+\.\d+\.\d+) · /
  const items = (r) => r.groups.flatMap((g) => g.items)
  const full = releases.filter((r) => semver.test(r.v))
  const archive = releases.find((r) => items(r).some((i) => line.test(i)))

  test('at most five releases keep a full card', () => {
    expect(full.length, `full cards: ${full.map((r) => r.v).join(', ')} — the sixth belongs in the archive card as one line`).toBeLessThanOrEqual(5)
  })

  test('the card holding the rest says where they are read in full', () => {
    expect(archive, 'no card carries the collapsed release lines').toBeDefined()
    expect(items(archive).join('\n')).toContain('CHANGELOG.md')
  })

  test('every version in CHANGELOG.md is still named on the page', () => {
    // Read from the file rather than from a list here, so a release published
    // without a card or a line fails instead of passing quietly.
    const changelog = readFileSync(join(SITE, '..', 'CHANGELOG.md'), 'utf8')
    const published = [...changelog.matchAll(/^## \[(\d+\.\d+\.\d+)\]/gm)].map((m) => m[1])
    expect(published.length, 'CHANGELOG.md parsed to nothing — the heading shape changed').toBeGreaterThan(5)

    // Matched against versions the page presents as versions, never against
    // the whole page: '0.86.2' inside a sentence about aider would otherwise
    // answer for a release nobody listed.
    const named = new Set([
      ...full.map((r) => r.v),
      ...releases.flatMap(items).map((i) => line.exec(i)?.[1]).filter(Boolean),
    ])
    expect(published.filter((v) => !named.has(v))).toEqual([])
  })
})
