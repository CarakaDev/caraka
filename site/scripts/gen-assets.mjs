// Build-time asset generator: favicons and one Open Graph card per page.
//
// The cards are a port of design/mockups/Caraka OG Images.dc.html. Section 00
// of that comp states four rules, and they are the reason this file looks the
// way it does:
//
//   1. The headline is 58px and never shrinks. If a sentence does not fit two
//      lines it is the sentence that gets shortened, in src/lib/site.ts.
//   2. 72px of safe padding. LinkedIn and Telegram crop the edge.
//   3. A motif carries no new information. It repeats what the page says.
//   4. Three mono facts under the body. Not four, not a sentence.
//
// Two rules from docs/brand.md drive the rest:
//
//   1. "Aksara wajib dikonversi ke path di semua aset ekspor." An SVG that
//      ships <text>ꦕ</text> renders as tofu wherever Noto Sans Javanese is
//      missing — which is most machines. satori's embedFont makes it a path.
//   2. Below 48px the mark is the solid variant: ꦕ in a coloured square, no
//      rings. Above it, the two rings that make the ∞.
//
// satori renders a subset of CSS. Where the comp uses something outside it
// (repeating-conic-gradient, mask-image, text-shadow, display:grid) the shape
// is rebuilt from divs, borders and gradients. Every such substitution is
// marked `approximation:` at the place it happens.
//
// Run: npm run assets   (wired into prebuild, so `npm run build` is enough)

import { mkdir, rm, writeFile, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'

const HERE = dirname(fileURLToPath(import.meta.url))
const SITE = join(HERE, '..')
const PUBLIC = join(SITE, 'public')

// --- brand tokens (docs/brand.md §6, values as they appear in the comp) -----
const KESUMBA_500 = '#E2452C'
const KESUMBA_400 = '#FF7A5E'
const KESUMBA_700 = '#8F2C1C'
const INK_ON_BRAND = '#FFEDE7'
const VOID = '#05080C'
const N_050 = '#0C1116'
const N_100 = '#171C22'
const N_200 = '#292E35'
const N_300 = '#414950'
const N_400 = '#5D666F'
const N_500 = '#7A848F'
const N_600 = '#95A0AB'
const N_700 = '#B2BCC6'
const N_800 = '#D2D8DF'
const N_900 = '#E9EDF2'
const WHITE = '#F6F9FC'
const OK = '#8EEE98'
const WARN = '#FFD67E'

const CARD_W = 1200
const CARD_H = 630
const PAD = 72 // comp §00 rule 2 — the safe area every platform crops to

// The aksara sits high in its em box: it uses neither the sandhangan space
// above nor the pasangan space below. docs/brand.md §6 measures the offset at
// 17.5% of the font size, and requires the correction everywhere the mark is
// drawn. satori has no percentage translate, so it is applied in px per size.
const AKSARA_NUDGE = 0.175

const font = async (pkg, file, name, weight) => ({
  name,
  weight,
  style: 'normal',
  data: await readFile(join(SITE, 'node_modules', pkg, 'files', file)),
})

// Public Sans 700 for the headline, 400 for body. JetBrains Mono 400 for every
// mono string in the comp. Noto Sans Javanese for the aksara. Nothing else is
// loaded, and test/og-glyphs.test.js fails the build if a string needs more.
const fonts = await Promise.all([
  font('@fontsource/public-sans', 'public-sans-latin-400-normal.woff', 'Public Sans', 400),
  font('@fontsource/public-sans', 'public-sans-latin-700-normal.woff', 'Public Sans', 700),
  font('@fontsource/jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff', 'JetBrains Mono', 400),
  font('@fontsource/noto-sans-javanese', 'noto-sans-javanese-javanese-400-normal.woff', 'Noto Sans Javanese', 400),
])

// --- tiny hyperscript, so this file needs no JSX transform ------------------
const h = (type, props = {}, ...rest) => {
  const children = rest.flat().filter((c) => c != null)
  return {
    type,
    props: { ...props, children: children.length === 0 ? undefined : children.length === 1 ? children[0] : children },
  }
}

/** Every satori box is a flex box; this saves repeating `display: 'flex'`. */
const box = (style, ...children) => h('div', { style: { display: 'flex', ...style } }, ...children)

const abs = (style, ...children) => box({ position: 'absolute', ...style }, ...children)

const mono = (size, color, style = {}) => ({
  fontFamily: 'JetBrains Mono',
  fontSize: size,
  color,
  ...style,
})

// --- glyphs satori has no font for ------------------------------------------
// The loaded subsets are latin and Javanese. ✓ (U+2713), ◐ (U+25D0) and
// ○ (U+25CB) are outside both, and no @fontsource subset in this project ships
// them. They are drawn as geometry rather than pulled in as a new dependency.

/** ✓ — two borders of a box, rotated 45°. */
const check = (size, color, weight = 2) =>
  box({
    width: size * 0.52,
    height: size * 0.92,
    borderRight: `${weight}px solid ${color}`,
    borderBottom: `${weight}px solid ${color}`,
    transform: 'rotate(45deg)',
  })

/** ○ — an open ring. */
const ring = (size, color, weight = 1.5) =>
  box({ width: size, height: size, borderRadius: size, border: `${weight}px solid ${color}` })

/** ◐ — the same ring with its left half filled. */
const halfRing = (size, color, weight = 1.5) =>
  box(
    { width: size, height: size, borderRadius: size, border: `${weight}px solid ${color}`, overflow: 'hidden' },
    box({ width: size / 2, height: size, background: color }),
  )

/** The aksara ꦕ, optically corrected. */
const aksara = (size, color, lineHeight = 1) =>
  box({
    fontFamily: 'Noto Sans Javanese',
    fontSize: size,
    lineHeight,
    color,
    transform: `translateY(${Math.round(size * AKSARA_NUDGE)}px)`,
  }, 'ꦕ')

/**
 * The full mark: two identical circles of diameter d, centres exactly d apart,
 * so they cross at the midpoint and the pair reads as ∞. Geometry in px, never
 * percentages — percentage margins resolve against container width and push the
 * pair off centre (AGENTS.md §6).
 *
 * The comp draws each circle twice: a faint complete ring, then one bright arc
 * per circle (top-left, bottom-right) so the pair reads as two envoys crossing.
 */
const mark = (d, aksaraSize) => {
  const w = Math.max(1.5, d * 0.02)
  const circle = (left, extra) =>
    abs({ left, top: 0, width: d, height: d, borderRadius: d, border: `${w}px solid transparent`, ...extra })
  return box({ position: 'relative', width: d * 2, height: d, alignItems: 'center', justifyContent: 'center' },
    circle(0, { borderColor: 'rgba(226,69,44,.22)' }),
    circle(d, { borderColor: 'rgba(226,69,44,.22)' }),
    circle(0, { borderTopColor: 'rgba(226,69,44,.7)' }),
    circle(d, { borderBottomColor: 'rgba(226,69,44,.7)' }),
    // approximation: comp has `text-shadow: 0 0 40px rgba(226,69,44,.7)` on the
    // aksara. satori has no text-shadow, so the bloom is a radial-gradient disc
    // behind the glyph at the same radius.
    abs({
      left: d - aksaraSize * 0.7,
      top: d / 2 - aksaraSize * 0.7,
      width: aksaraSize * 1.4,
      height: aksaraSize * 1.4,
      backgroundImage: 'radial-gradient(circle, rgba(226,69,44,.55), rgba(226,69,44,0) 62%)',
    }),
    box({ position: 'relative' }, aksara(aksaraSize, WHITE)),
  )
}

/**
 * The solid mark, for anything under 48px: coloured square, no rings.
 * ꦕ is a wide glyph — its ink spans about 1.15em. Setting it at 0.62 of the
 * tile ran it past the corners, so it is set at 0.48 and the tile keeps a
 * margin on every side at every size a launcher might crop to.
 */
const solidMark = (size, radius = Math.round(size * 0.22)) =>
  box({
    width: size,
    height: size,
    alignItems: 'center',
    justifyContent: 'center',
    background: KESUMBA_500,
    borderRadius: radius,
  }, aksara(size * 0.48, INK_ON_BRAND))

/**
 * The organisation avatar: the solid mark, full-bleed and square, with the
 * aksara set smaller than the favicon's so it survives GitHub's own circular
 * crop. docs/brand.md puts the avatar in the solid variant's list by name.
 */
const orgAvatar = (size) =>
  box({
    width: size,
    height: size,
    alignItems: 'center',
    justifyContent: 'center',
    background: KESUMBA_500,
  }, aksara(size * 0.42, INK_ON_BRAND))

// --- the frame, identical on every card -------------------------------------

const GRID_IMAGE = [
  'linear-gradient(rgba(226,69,44,.055) 1px, rgba(226,69,44,0) 1px)',
  'linear-gradient(90deg, rgba(226,69,44,.055) 1px, rgba(226,69,44,0) 1px)',
].join(', ')

/**
 * approximation: the comp fades the 34px grid out with
 * `mask-image: radial-gradient(ellipse 66% 62% at 76% 48%, #000 12%, transparent 72%)`.
 * satori supports no mask. The grid is instead painted inside an ellipse the
 * size of that mask's visible core — centre (912, 302), radii 570 × 281, the
 * 72% stop where the mask reaches zero. The edge is a hard cut instead of a
 * fade, which at 5.5% alpha over #05080C is under one 8-bit step.
 */
const gridWash = () =>
  abs({ left: 342, top: 21, width: 1140, height: 562, borderRadius: '50%', backgroundImage: GRID_IMAGE, backgroundSize: '34px 34px' })

/** The kesumba bloom behind the motif. */
const bloom = (size, right, alpha) =>
  abs({
    left: CARD_W - size + right,
    top: CARD_H / 2 - size / 2,
    width: size,
    height: size,
    backgroundImage: `radial-gradient(circle, rgba(226,69,44,${alpha}), rgba(226,69,44,0) 62%)`,
  })

/** The chapter bar: a 3px track with a fill sized to the page's place in the site order. */
const chapterBar = (percent) => [
  abs({ left: 0, top: 0, width: CARD_W, height: 3, background: N_100 }),
  abs({ left: 0, top: 0, width: `${percent}%`, height: 3, backgroundImage: `linear-gradient(90deg, ${KESUMBA_500}, ${KESUMBA_400})` }),
]

const eyebrow = (text) =>
  box({ alignItems: 'center', gap: 12, marginBottom: 26 },
    box({ width: 22, height: 1, background: KESUMBA_500 }),
    box(mono(13, KESUMBA_500, { letterSpacing: 13 * 0.22 }), text),
  )

/**
 * 58px/1.04/-0.035em, two lines, the second in kesumba-400. The break point is
 * a design decision, so it travels with the headline: site.ts marks it with
 * ` · `, which keeps ogHeadline a single readable string for og:image:alt.
 *
 * ponytail: fit is checked by eye against the rendered PNG, not in code —
 * measuring text needs a font-metrics dependency this build does not have. If
 * headlines start regressing, measure with fontkit and assert one line each.
 */
const headline = (text) => {
  const [lead, accent] = text.split(' · ')
  const style = { fontSize: 58, fontWeight: 700, lineHeight: 1.04, letterSpacing: 58 * -0.035 }
  return box({ flexDirection: 'column', marginBottom: 22 },
    box({ ...style, color: WHITE }, lead),
    accent ? box({ ...style, color: KESUMBA_400 }, accent) : null,
  )
}

/** Three mono facts separated by a · in n-200. Comp §00 rule 4. */
const facts = (items) =>
  box({ alignItems: 'center', gap: 16, ...mono(13, N_500, { letterSpacing: 13 * 0.14 }) },
    ...items.flatMap((item, i) => (i === 0 ? [box({}, item)] : [box({ color: N_200 }, '·'), box({}, item)])),
  )

const footer = (route) => [
  abs({ left: PAD, bottom: 56, alignItems: 'center', gap: 13 },
    solidMark(32, 8),
    box(mono(15, N_900, { letterSpacing: 15 * 0.2 }), 'caraka'),
    box({ width: 1, height: 16, background: N_200 }),
    box(mono(14, N_400), 'caraka.dev'),
  ),
  abs({ right: PAD, bottom: 56, ...mono(14, N_300) }, route),
]

const card = ({ percent, kicker, title, body, bodyWidth = 470, items, route, motif, gap = 52, grid = true, bloomSize = 760, bloomRight = -110, bloomAlpha = 0.12 }) =>
  box({ position: 'relative', width: CARD_W, height: CARD_H, background: VOID, fontFamily: 'Public Sans' },
    grid ? gridWash() : null,
    bloom(bloomSize, bloomRight, bloomAlpha),
    ...chapterBar(percent),
    abs({ left: 0, top: 0, width: CARD_W, height: CARD_H, padding: PAD, alignItems: 'center', gap },
      box({ flexDirection: 'column', alignItems: 'flex-start', flexGrow: 1, flexBasis: 0 },
        eyebrow(kicker),
        headline(title),
        box({ maxWidth: bodyWidth, marginBottom: 34, fontSize: 19, lineHeight: 1.6, color: N_600 }, body),
        facts(items),
      ),
      motif,
    ),
    ...footer(route),
  )

/** The panel every motif but the landing one sits in. */
const panel = (width, style, ...children) =>
  box({ width, flexShrink: 0, background: N_050, border: `1px solid ${N_100}`, borderRadius: 14, ...style }, ...children)

// --- the motifs, one per card ------------------------------------------------

/** 01 — the mark inside four instrument rings. */
const motifRings = () => {
  const size = 348
  const c = size / 2
  // approximation: the comp's outer ring is
  // `repeating-conic-gradient(from 0deg, rgba(226,69,44,.28) 0deg .6deg, transparent .6deg 12deg)`
  // clipped to an 11px rim. satori has no conic gradient, so the same 30 ticks
  // (360 / 12) are drawn as rotated 2×11px bars at the same radius. 0.6° at
  // r=168 is 1.76px, so a 2px bar is within a quarter pixel of the comp.
  const ticks = Array.from({ length: 30 }, (_, i) =>
    abs({
      left: c - 1,
      top: c - 5.5,
      width: 2,
      height: 11,
      background: 'rgba(226,69,44,.28)',
      transform: `rotate(${i * 12}deg) translateY(-168.5px)`,
    }))
  return box({ position: 'relative', width: size, height: size, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
    ...ticks,
    abs({ left: 24, top: 24, width: 300, height: 300, borderRadius: 150, border: '1.5px solid transparent', borderTopColor: KESUMBA_500, borderRightColor: 'rgba(226,69,44,.3)' }),
    abs({ left: 52, top: 52, width: 244, height: 244, borderRadius: 122, border: '1.5px solid transparent', borderBottomColor: 'rgba(226,69,44,.32)' }),
    abs({ left: 76, top: 76, width: 196, height: 196, borderRadius: 98, border: '1px dashed rgba(226,69,44,.16)' }),
    mark(75, 62),
  )
}

/**
 * 02 — the comparison matrix, three columns of 62px against a flexible label.
 * approximation: the comp uses `display: grid; grid-template-columns: 1fr 62px
 * 62px 62px`. satori has no grid, so the same track sizes are a flex row.
 */
const MATRIX = [
  ['Coding agent host', 1, 0, 0],
  ['Runs on your machine', 1, 1, 0],
  ['Session per topic', 1, 0, 0],
  ['Approval gate', 1, 2, 0],
  ['General assistant', 0, 1, 1],
  ['Cloud account needed', 0, 0, 1],
]

const motifMatrix = () => {
  const cell = (state, tone) =>
    box({ width: 62, flexShrink: 0, alignItems: 'center', justifyContent: 'center', ...mono(14, tone) },
      state === 1 ? check(14, tone) : state === 2 ? '~' : '—')
  return panel(400, { flexDirection: 'column', overflow: 'hidden' },
    box({ alignItems: 'center', padding: '15px 20px', background: N_100, ...mono(10.5, N_500, { letterSpacing: 10.5 * 0.13 }) },
      box({ flexGrow: 1, flexBasis: 0 }),
      ...['CRK', 'OCW', 'HRM'].map((t, i) =>
        box({ width: 62, flexShrink: 0, justifyContent: 'center', color: i === 0 ? KESUMBA_400 : N_500 }, t)),
    ),
    ...MATRIX.map(([label, a, b, c]) =>
      box({ alignItems: 'center', padding: '14px 20px', borderTop: `1px solid ${N_100}`, fontSize: 13.5, color: N_700 },
        box({ flexGrow: 1, flexBasis: 0 }, label),
        cell(a, OK),
        cell(b, N_400),
        cell(c, N_400),
      )),
  )
}

/** 03 — the four lines of the hanacaraka verse, glossed. */
const VERSE = [
  ['ꦲꦤꦕꦫꦏ', 'two envoys', WHITE],
  ['ꦢꦠꦱꦮꦭ', 'they disagreed', N_800],
  ['ꦥꦝꦗꦪꦚ', 'equally strong', N_700],
  ['ꦩꦒꦧꦛꦔ', 'both fell', N_500],
]

const motifVerse = () =>
  box({ width: 420, flexShrink: 0, flexDirection: 'column', gap: 18 },
    ...VERSE.map(([line, gloss, ink]) =>
      box({ alignItems: 'center', gap: 18 },
        box({ fontFamily: 'Noto Sans Javanese', fontSize: 34, lineHeight: 1.5, color: ink }, line),
        box({ flexGrow: 1, flexBasis: 0, height: 1, background: N_100 }),
        box({ width: 118, flexShrink: 0, justifyContent: 'flex-end', ...mono(11, N_400, { letterSpacing: 1.1 }) }, gloss),
      )),
  )

/** 04 — the seven documentation chapters, as a weighted table of contents. */
const TOC = [
  ['01', 'Quickstart', KESUMBA_400, WHITE, 44, KESUMBA_500],
  ['02', 'Sessions', N_500, N_800, 36, KESUMBA_700],
  ['03', 'Agent', N_500, N_800, 30, KESUMBA_700],
  ['04', 'Approval', N_500, N_700, 26, '#5C1F14'],
  ['05', 'Security', N_500, N_700, 22, '#5C1F14'],
  ['06', 'Config', N_400, N_600, 17, '#3D1710'],
  ['07', 'CLI', N_400, N_600, 12, '#3D1710'],
]

const motifToc = () =>
  panel(400, { flexDirection: 'column', gap: 3, padding: '26px 28px' },
    ...TOC.map(([n, name, num, ink, bar, tone]) =>
      box({ alignItems: 'center', gap: 14, padding: '9px 0' },
        box({ width: 20, flexShrink: 0, ...mono(11, num) }, n),
        box({ fontSize: 14, color: ink }, name),
        box({ flexGrow: 1, flexBasis: 0, height: 1, background: N_100 }),
        box({ width: bar, height: 3, borderRadius: 2, background: tone, flexShrink: 0 }),
      )),
  )

/**
 * 05 — the threat surface: thirteen cells in a fifteen-cell field.
 * approximation: `display: grid; grid-template-columns: repeat(5, 1fr)` with
 * `aspect-ratio: 1` becomes a wrapping flex row of 60px squares — the width the
 * grid resolves to inside a 400px panel with 28px padding and an 11px gap.
 */
const HOT = new Set([0, 4, 7, 11])

const motifThreats = () =>
  panel(400, { flexDirection: 'column', padding: '26px 28px' },
    box({ justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, ...mono(10.5, N_500, { letterSpacing: 10.5 * 0.16 }) },
      box({}, 'SURFACE'),
      box({ color: OK }, '13 / 13 COVERED'),
    ),
    box({ flexWrap: 'wrap', gap: 11, marginBottom: 22, width: 344 },
      ...Array.from({ length: 15 }, (_, i) => {
        if (i >= 13) return box({ width: 60, height: 60, borderRadius: 7, border: '1px solid #12161B' })
        const hot = HOT.has(i)
        return box({
          width: 60,
          height: 60,
          borderRadius: 7,
          alignItems: 'center',
          justifyContent: 'center',
          border: `1px solid ${hot ? KESUMBA_700 : '#1E3524'}`,
          background: hot ? 'rgba(226,69,44,.14)' : 'rgba(142,238,152,.07)',
          ...mono(12, hot ? KESUMBA_400 : OK),
        }, hot ? '!' : check(13, OK))
      }),
    ),
    box({ flexDirection: 'column', gap: 9, ...mono(11.5, N_500) },
      ...[
        ['prompt injection', 'approval gate'],
        ['token leak', 'scoped + rotated'],
        ['chat hijack', 'allowlist'],
      ].map(([threat, control]) =>
        box({ justifyContent: 'space-between', alignItems: 'center' },
          box({}, threat),
          box({ alignItems: 'center', gap: 8, color: OK },
            box({ width: 12, flexShrink: 0, justifyContent: 'center' }, check(11, OK, 1.5)),
            box({}, control),
          ),
        )),
    ),
  )

/**
 * 06 — the init wizard, as it actually runs. Lines follow docs/ via
 * src/data/docs.ts, not the comp's placeholder session.
 * approximation: the comp's `box-shadow: 0 30px 80px -30px rgba(0,0,0,.9)` is
 * dropped. satori supports no negative spread, and a shadow without it is a
 * grey halo the comp does not have.
 */
const TERM = [
  ['$', N_400, 'npx caraka init', N_900],
  [null, OK, 'workspace · current directory', N_500],
  [null, OK, 'claude login · ready', N_500],
  [null, OK, 'telegram · paired', N_500],
  [null, OK, 'secrets · mode 0600', N_500],
  ['$', N_400, 'npx caraka start', KESUMBA_400],
]

const motifTerminal = () =>
  panel(420, { flexDirection: 'column', overflow: 'hidden' },
    box({ alignItems: 'center', gap: 8, padding: '14px 18px', background: N_100, borderBottom: `1px solid ${N_200}` },
      ...[KESUMBA_500, WARN, OK].map((c) => box({ width: 9, height: 9, borderRadius: 9, background: c })),
      box({ marginLeft: 8, ...mono(11, N_400) }, 'bash'),
    ),
    box({ flexDirection: 'column', gap: 11, padding: '22px 24px', ...mono(13.5, N_500, { lineHeight: 1.5 }) },
      ...TERM.map(([sym, symTone, line, ink]) =>
        box({ gap: 10, alignItems: 'center' },
          box({ width: 10, flexShrink: 0, justifyContent: 'center', color: symTone }, sym ?? check(13, symTone, 1.5)),
          box({ color: ink }, line),
        )),
      box({ gap: 10, alignItems: 'center' },
        box({ width: 10, flexShrink: 0, justifyContent: 'center', color: N_400 }, '$'),
        box({ width: 8, height: 15, background: KESUMBA_400 }),
      ),
    ),
  )

/**
 * 07 — the eight phases. Comp §00 rule 3 says the motif repeats what the page
 * says, so the marks here follow `phases` in src/data/status.ts rather than the
 * comp: 0 done, 1 and 2 in progress, and the half ring on the one that carries
 * `live: true`. The comp drew phase 0 in flight, which stopped being true when
 * v0.1 shipped and is five phases stale after v0.5.
 *
 * The fifth column is how far the bar is drawn; the sixth marks the live row.
 * The comp's 62% and 48% were a drawing, not a measurement, and there is no
 * source in the docs for a fraction of a phase. The bar is binary now: full
 * where the release shipped, empty where the work has not started. Kesumba
 * rather than green on 1 to 5 is what src/data/status.ts already says — each of
 * those keeps a field gate open in roadmap.md that only other people can close.
 */
const PHASES = [
  ['0', 'Spike', OK, WHITE, '100%', false],
  ['1', 'Dogfood', KESUMBA_500, WHITE, '100%', false],
  ['2', 'Install', KESUMBA_500, WHITE, '100%', false],
  ['3', 'Memory', KESUMBA_500, WHITE, '100%', false],
  ['4', 'Abstraction', KESUMBA_500, WHITE, '100%', false],
  ['5', 'Closed beta', KESUMBA_500, WHITE, '100%', false],
  ['6', 'WhatsApp', KESUMBA_500, WHITE, '100%', true],
  ['7', 'Public 1.0', N_300, N_400, '0%', false],
]

const motifPhases = () =>
  panel(400, { flexDirection: 'column', gap: 15, padding: '26px 28px' },
    ...PHASES.map(([n, name, tone, ink, fill, live]) =>
      box({ alignItems: 'center', gap: 13 },
        box({ width: 16, flexShrink: 0, ...mono(11, N_400) }, n),
        box({ width: 12, flexShrink: 0, justifyContent: 'center' }, live ? halfRing(11, tone) : ring(11, tone)),
        box({ width: 110, flexShrink: 0, fontSize: 13, color: ink }, name),
        box({ flexGrow: 1, flexBasis: 0, height: 5, borderRadius: 3, background: N_100, overflow: 'hidden' },
          box({ width: fill, height: 5, borderRadius: 3, background: tone })),
      )),
  )

// --- 08, the neutral card ----------------------------------------------------
// Used for every route the comp does not draw. It carries no headline, so those
// pages' ogHeadline is never rendered — only their og:image:alt uses it.
const neutralCard = () =>
  box({ position: 'relative', width: CARD_W, height: CARD_H, background: KESUMBA_500, fontFamily: 'Public Sans', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30 },
    abs({
      left: 0,
      top: 0,
      width: CARD_W,
      height: CARD_H,
      backgroundImage: 'linear-gradient(rgba(5,8,12,.09) 1px, rgba(5,8,12,0) 1px), linear-gradient(90deg, rgba(5,8,12,.09) 1px, rgba(5,8,12,0) 1px)',
      backgroundSize: '34px 34px',
    }),
    abs({
      left: CARD_W / 2 - 450,
      top: CARD_H / 2 - 450,
      width: 900,
      height: 900,
      backgroundImage: 'radial-gradient(circle, rgba(255,237,231,.16), rgba(255,237,231,0) 60%)',
    }),
    aksara(190, INK_ON_BRAND),
    box({ position: 'relative', flexDirection: 'column', alignItems: 'center', gap: 14 },
      box(mono(30, '#FFF3F0', { letterSpacing: 30 * 0.42, paddingLeft: 30 * 0.42 }), 'caraka'),
      box({ fontSize: 19, color: 'rgba(255,237,231,.82)' }, 'Telegram, and the coding agent already on your machine.'),
    ),
    abs({ left: 0, bottom: 56, width: CARD_W, justifyContent: 'center', ...mono(14, 'rgba(255,237,231,.66)', { letterSpacing: 14 * 0.16 }) }, 'caraka.dev'),
  )

// --- per-card data the comp holds and site.ts does not ----------------------
// Percentages are read off the comp card by card; they encode the page's place
// in the site order and are not interpolated. Body and facts follow src/data/
// and docs/, so nothing here claims scope the v0.2 preview does not have.
const CARDS = {
  landing: {
    percent: 12.5,
    body: 'A thin bridge from Telegram to the coding agent already installed on your machine.',
    bodyWidth: 520,
    items: ['MIT', 'NODE 22+', 'CLAUDE CODE'],
    gap: 56,
    bloomAlpha: 0.16,
    motif: motifRings,
  },
  compare: {
    percent: 25,
    body: 'Where Caraka overlaps with OpenClaw and Hermes — and where it deliberately does not.',
    items: ['SCOPE', 'OWNERSHIP', 'SURFACE'],
    bloomAlpha: 0.13,
    motif: motifMatrix,
  },
  story: {
    percent: 37.5,
    body: 'A Javanese legend about a message that never arrived — mapped line by line onto the architecture.',
    items: ['20 AKSARA', '4 LINES', '1 ARCHITECTURE'],
    grid: false,
    bloomSize: 700,
    bloomRight: -40,
    bloomAlpha: 0.18,
    motif: motifVerse,
  },
  docs: {
    percent: 50,
    body: 'Seven chapters, written for humans and for agents. llms.txt and AGENTS.md ship in the repo.',
    items: ['7 CHAPTERS', 'llms.txt', 'AGENTS.md'],
    motif: motifToc,
  },
  security: {
    percent: 62.5,
    body: 'Approvals, scoped tokens, and an audit trail that survives a restart. Written down before the code.',
    items: ['THREAT MODEL', 'NO PORT', 'NO KEYS'],
    bloomAlpha: 0.12,
    motif: motifThreats,
  },
  install: {
    percent: 75,
    body: 'From nothing to a running envoy — Node, Git, and a Claude Code login you already have.',
    items: ['NODE 22+', 'GIT', 'CLAUDE CODE'],
    grid: false,
    bloomAlpha: 0.13,
    motif: motifTerminal,
  },
  status: {
    percent: 87.5,
    body: 'What shipped, what is being verified, and what has not started yet — including the parts that might fail.',
    items: ['8 PHASES', 'OPEN CHANGELOG', 'PREVIEW'],
    motif: motifPhases,
  },
}

// --- render helpers ---------------------------------------------------------
const toSvg = (node, width, height) => satori(node, { width, height, fonts, embedFont: true })

const toPng = (svg, width) =>
  new Resvg(svg, { fitTo: { mode: 'width', value: width }, background: 'rgba(0,0,0,0)' })
    .render()
    .asPng()

/**
 * Minimal ICO container. An .ico is a 6-byte directory header, one 16-byte
 * entry, then the image bytes — and since Vista the image may be a PNG as-is.
 * A dependency for 15 lines of struct packing is not worth carrying.
 */
const pngToIco = (png, size) => {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: 1 = icon
  header.writeUInt16LE(1, 4) // one image

  const entry = Buffer.alloc(16)
  entry.writeUInt8(size >= 256 ? 0 : size, 0) // width, 0 means 256
  entry.writeUInt8(size >= 256 ? 0 : size, 1) // height
  entry.writeUInt8(0, 2) // palette size, 0 for truecolour
  entry.writeUInt8(0, 3) // reserved
  entry.writeUInt16LE(1, 4) // colour planes
  entry.writeUInt16LE(32, 6) // bits per pixel
  entry.writeUInt32LE(png.length, 8)
  entry.writeUInt32LE(header.length + entry.length, 12) // offset to image data

  return Buffer.concat([header, entry, png])
}

// --- run --------------------------------------------------------------------
// Node 22.18+/24 strips TypeScript types on import, so site.ts is the single
// source of page metadata for both the pages and their OG cards.
const { PAGES, ogPath } = await import('../src/lib/site.ts')

async function main() {
  // public/og holds nothing but this script's output and is gitignored. It is
  // emptied first so a renamed card cannot leave its old file behind to be
  // copied into dist/ and served forever.
  await rm(join(PUBLIC, 'og'), { recursive: true, force: true })
  await mkdir(join(PUBLIC, 'og'), { recursive: true })

  // Favicons. The solid mark, per docs/brand.md — rings are illegible under 48px.
  const iconSvg = await toSvg(solidMark(512), 512, 512)
  await writeFile(join(PUBLIC, 'favicon.svg'), iconSvg)
  await writeFile(join(PUBLIC, 'favicon.ico'), pngToIco(toPng(iconSvg, 32), 32))
  await writeFile(join(PUBLIC, 'apple-touch-icon.png'), toPng(iconSvg, 180))
  await writeFile(join(PUBLIC, 'icon-512.png'), toPng(iconSvg, 512))
  await writeFile(join(PUBLIC, 'icon-192.png'), toPng(iconSvg, 192))

  // The GitHub organisation avatar. Not a favicon: GitHub rounds the corners
  // itself, so this one is full-bleed with square corners — rounding a tile
  // that is about to be rounded again eats the aksara's shoulders. The glyph
  // also sits smaller here, because GitHub crops to a circle in comment
  // threads and a rounded square everywhere else.
  //
  // Written into ../assets/ rather than public/: it is a brand asset that
  // belongs in git, not build output. There is no API for uploading it —
  // PATCH /orgs/{org} has no avatar field — so it is set by hand in
  // Settings ▸ Profile at github.com/organizations/CarakaDev/settings/profile.
  // The three brand SVGs live in ../assets/ because the GitHub README has to
  // reach them by relative path — raw.githubusercontent serves SVG as
  // text/plain and the image silently fails. The site needs the same files
  // under public/ to serve them at /brand/*.svg, so they are copied here
  // rather than committed twice and left to drift apart.
  await mkdir(join(PUBLIC, 'brand'), { recursive: true })
  for (const f of ['banner.svg', 'flow.svg', 'org-banner.svg']) {
    await writeFile(join(PUBLIC, 'brand', f), await readFile(join(SITE, '..', 'assets', f)))
  }
  console.log('brand/banner.svg  brand/flow.svg  brand/org-banner.svg  (copied from ../assets)')

  const avatarSvg = await toSvg(orgAvatar(512), 512, 512)
  await writeFile(join(SITE, '..', 'assets', 'org-avatar.png'), toPng(avatarSvg, 512))
  console.log('favicon.svg  favicon.ico  apple-touch-icon.png  icon-192.png  icon-512.png')

  const neutral = await toSvg(neutralCard(), CARD_W, CARD_H)

  for (const [key, meta] of Object.entries(PAGES)) {
    const spec = CARDS[key]
    const svg = spec
      ? await toSvg(card({ ...spec, kicker: meta.ogKicker, title: meta.ogHeadline, route: meta.path, motif: spec.motif() }), CARD_W, CARD_H)
      : neutral
    const file = ogPath(key).replace('/og/', '')
    // The comp's export note asks for 2× then a downsample, because a browser
    // screenshot at 1× breaks up the aksara and the 11px mono. resvg rasterises
    // the vector directly with its own antialiasing, so 1× is already clean —
    // and it is the size og:image:width declares.
    await writeFile(join(PUBLIC, 'og', file), toPng(svg, CARD_W))
    console.log(`og/${file}${spec ? '' : '  (neutral)'}`)
  }
}

await main()
