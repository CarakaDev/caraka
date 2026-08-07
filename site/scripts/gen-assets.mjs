// Build-time asset generator: favicons and one Open Graph image per page.
//
// Two rules from docs/brand.md drive the whole file:
//   1. "Aksara wajib dikonversi ke path di semua aset ekspor." An SVG that ships
//      <text>ꦕ</text> renders as tofu wherever Noto Sans Javanese is missing —
//      which is most machines. satori's embedFont turns every glyph into a path.
//   2. Below 48px the mark is the solid variant: ꦕ in a coloured square, no
//      rings. Above it, the two rings that make the ∞.
//
// Run: npm run assets   (wired into prebuild, so `npm run build` is enough)

import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'

const HERE = dirname(fileURLToPath(import.meta.url))
const SITE = join(HERE, '..')
const PUBLIC = join(SITE, 'public')

// --- brand tokens (docs/brand.md §6) ---------------------------------------
const KESUMBA_500 = '#E2452C'
const KESUMBA_400 = '#FF7A5E'
const INK_ON_BRAND = '#FFEDE7'
const VOID = '#05080C'
const N_050 = '#0C1116'
const N_100 = '#171C22'
const N_500 = '#7A848F'
const N_900 = '#E9EDF2'
const WHITE = '#F6F9FC'

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

const fonts = await Promise.all([
  font('@fontsource/public-sans', 'public-sans-latin-400-normal.woff', 'Public Sans', 400),
  font('@fontsource/public-sans', 'public-sans-latin-600-normal.woff', 'Public Sans', 600),
  font('@fontsource/jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff', 'JetBrains Mono', 400),
  font('@fontsource/jetbrains-mono', 'jetbrains-mono-latin-700-normal.woff', 'JetBrains Mono', 700),
  font('@fontsource/noto-sans-javanese', 'noto-sans-javanese-javanese-400-normal.woff', 'Noto Sans Javanese', 400),
])

// --- tiny hyperscript, so this file needs no JSX transform ------------------
const h = (type, props = {}, ...children) => ({
  type,
  props: { ...props, children: children.length === 0 ? undefined : children.length === 1 ? children[0] : children },
})

/** The aksara ꦕ, optically corrected. */
const aksara = (size, color) =>
  h('div', {
    style: {
      display: 'flex',
      fontFamily: 'Noto Sans Javanese',
      fontSize: size,
      lineHeight: 1,
      color,
      transform: `translateY(${Math.round(size * AKSARA_NUDGE)}px)`,
    },
  }, 'ꦕ')

/**
 * The full mark: two identical circles of diameter d, centres exactly d apart,
 * so they cross at the midpoint and the pair reads as ∞. The aksara sits at the
 * crossing, set at 0.59d. Geometry in px, never percentages — percentage margins
 * resolve against container width and push the pair off centre (AGENTS.md §6).
 */
const mark = (d, ring, ink) =>
  h('div', {
    style: { display: 'flex', position: 'relative', width: d * 2, height: d, alignItems: 'center' },
  },
    h('div', { style: { display: 'flex', position: 'absolute', left: 0, top: 0, width: d, height: d, borderRadius: d, border: `${Math.max(2, Math.round(d * 0.022))}px solid ${ring}` } }),
    h('div', { style: { display: 'flex', position: 'absolute', left: d, top: 0, width: d, height: d, borderRadius: d, border: `${Math.max(2, Math.round(d * 0.022))}px solid ${ring}` } }),
    h('div', {
      style: { display: 'flex', position: 'absolute', left: d * 0.5, top: 0, width: d, height: d, alignItems: 'center', justifyContent: 'center' },
    }, aksara(d * 0.59, ink)),
  )

/**
 * The solid mark, for anything under 48px: coloured square, no rings.
 * ꦕ is a wide glyph — its ink spans about 1.15em. Setting it at 0.62 of the
 * tile ran it past the corners, so it is set at 0.48 and the tile keeps a
 * margin on every side at every size a launcher might crop to.
 */
const solidMark = (size) =>
  h('div', {
    style: {
      display: 'flex',
      width: size,
      height: size,
      alignItems: 'center',
      justifyContent: 'center',
      background: KESUMBA_500,
      borderRadius: Math.round(size * 0.22),
    },
  }, aksara(size * 0.48, INK_ON_BRAND))

// --- Open Graph card --------------------------------------------------------
const ogCard = ({ kicker, headline, lang }) =>
  h('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      width: 1200,
      height: 630,
      padding: '64px 72px',
      background: VOID,
      // A single kesumba wash in the top-left, the same bloom the hero uses.
      backgroundImage: `radial-gradient(900px 620px at 8% -18%, rgba(226,69,44,0.20), rgba(5,8,12,0) 62%)`,
      fontFamily: 'Public Sans',
    },
  },
    // A hairline of brand across the top edge.
    h('div', { style: { display: 'flex', position: 'absolute', left: 0, top: 0, width: 1200, height: 4, background: KESUMBA_500 } }),

    h('div', { style: { display: 'flex', alignItems: 'center', gap: 22 } },
      mark(56, KESUMBA_500, WHITE),
      h('div', { style: { display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 30, letterSpacing: 6, color: N_900 } }, 'caraka'),
    ),

    h('div', { style: { display: 'flex', flexDirection: 'column', gap: 22 } },
      h('div', { style: { display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 18, letterSpacing: 5, color: KESUMBA_400 } }, kicker),
      h('div', {
        style: {
          display: 'flex',
          fontSize: headline.length > 46 ? 60 : 72,
          fontWeight: 600,
          lineHeight: 1.12,
          color: WHITE,
          maxWidth: 1000,
        },
      }, headline),
    ),

    h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
      h('div', { style: { display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 20, color: N_500 } }, 'caraka.dev'),
      h('div', {
        style: {
          display: 'flex',
          padding: '8px 16px',
          border: `1px solid ${N_100}`,
          borderRadius: 8,
          background: N_050,
          fontFamily: 'JetBrains Mono',
          fontSize: 16,
          letterSpacing: 2,
          color: N_500,
        },
      }, lang === 'id' ? 'MIT · PRA-ALFA' : 'MIT · PRE-ALPHA'),
    ),
  )

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
const { PAGES } = await import('../src/lib/site.ts')

async function main() {
  await mkdir(join(PUBLIC, 'og'), { recursive: true })

  // Favicons. The solid mark, per docs/brand.md — rings are illegible under 48px.
  const iconSvg = await toSvg(solidMark(512), 512, 512)
  await writeFile(join(PUBLIC, 'favicon.svg'), iconSvg)
  await writeFile(join(PUBLIC, 'favicon.ico'), pngToIco(toPng(iconSvg, 32), 32))
  await writeFile(join(PUBLIC, 'apple-touch-icon.png'), toPng(iconSvg, 180))
  await writeFile(join(PUBLIC, 'icon-512.png'), toPng(iconSvg, 512))
  await writeFile(join(PUBLIC, 'icon-192.png'), toPng(iconSvg, 192))
  console.log('favicon.svg  favicon.ico  apple-touch-icon.png  icon-192.png  icon-512.png')

  for (const [key, meta] of Object.entries(PAGES)) {
    const svg = await toSvg(ogCard({ kicker: meta.ogKicker, headline: meta.ogHeadline, lang: meta.lang }), 1200, 630)
    await writeFile(join(PUBLIC, 'og', `${key}.png`), toPng(svg, 1200))
    console.log(`og/${key}.png`)
  }
}

await main()
