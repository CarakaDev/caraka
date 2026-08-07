// Content for the Open Graph card board, transcribed from the renderVals() block of
// design/mockups/Caraka OG Images.dc.html. The comp still decides how this board
// looks; it stopped deciding what is true of the release. Where a line below no
// longer matches it because the code moved, the comment above it names the comp
// line and what shipped instead.

const y = '#8EEE98',
  n = '—'

/** The two props the comp declares in data-props, at their declared defaults. */
export const showGrid: boolean = true
export const showGuides: boolean = false

export const matrix = [
  { row: 'Coding agent host', a: '✓', b: n, c: n },
  { row: 'Runs on your machine', a: '✓', b: '✓', c: n },
  { row: 'Session per topic', a: '✓', b: n, c: n },
  { row: 'Approval gate', a: '✓', b: '~', c: n },
  { row: 'General assistant', a: n, b: '✓', c: '✓' },
  { row: 'Cloud account needed', a: n, b: n, c: '✓' },
]

export const legend = [
  { aksara: 'ꦲꦤꦕꦫꦏ', gloss: 'two envoys', ink: '#F6F9FC' },
  { aksara: 'ꦢꦠꦱꦮꦭ', gloss: 'a difference', ink: '#D2D8DF' },
  { aksara: 'ꦥꦝꦗꦪꦚ', gloss: 'equally strong', ink: '#B2BCC6' },
  { aksara: 'ꦩꦒꦧꦛꦔ', gloss: 'both fell', ink: '#7A848F' },
]

// Comp lines 531-537 name the specification-era chapters, Memori and Agent lain
// among them; the docs page ships neither, so the names follow the generator's
// TOC (site/scripts/gen-assets.mjs:381-389). The num, ink, bar, and tone
// columns are the comp's own.
export const toc = [
  { n: '01', name: 'Quickstart', num: '#FF7A5E', ink: '#F6F9FC', bar: '44px', tone: '#E2452C' },
  { n: '02', name: 'Sessions', num: '#7A848F', ink: '#D2D8DF', bar: '36px', tone: '#8F2C1C' },
  { n: '03', name: 'Agent', num: '#7A848F', ink: '#D2D8DF', bar: '30px', tone: '#8F2C1C' },
  { n: '04', name: 'Approval', num: '#7A848F', ink: '#B2BCC6', bar: '26px', tone: '#5C1F14' },
  { n: '05', name: 'Security', num: '#7A848F', ink: '#B2BCC6', bar: '22px', tone: '#5C1F14' },
  { n: '06', name: 'Config', num: '#5D666F', ink: '#95A0AB', bar: '17px', tone: '#3D1710' },
  { n: '07', name: 'CLI', num: '#5D666F', ink: '#95A0AB', bar: '12px', tone: '#3D1710' },
]

// Fifteen cells for thirteen threats: the last two are the empty remainder of
// the 5-column grid, and four of the covered ones are marked hot. Kept as the
// comp's own expression rather than expanded, so the rule stays readable.
export const threats = Array.from({ length: 15 }, (_, i) => {
  if (i >= 13) return { glyph: '', bg: 'transparent', border: '#12161B', ink: '#414950' }
  const hot = [0, 4, 7, 11].includes(i)
  return hot
    ? { glyph: '!', bg: 'rgba(226,69,44,.14)', border: '#8F2C1C', ink: '#FF7A5E' }
    : { glyph: '✓', bg: 'rgba(142,238,152,.07)', border: '#1E3524', ink: y }
})

// Comp lines 549-554 script a Gemini install offer and a `/mulai` greeting;
// init offers no Gemini install and /mulai is not one of the eight commands, so
// the lines follow the generator's wizard transcript
// (site/scripts/gen-assets.mjs:455-462).
export const term = [
  { sym: '$', mark: '#5D666F', line: 'npx caraka init', ink: '#E9EDF2' },
  { sym: '✓', mark: y, line: 'workspace · current directory', ink: '#7A848F' },
  { sym: '✓', mark: y, line: 'claude login · ready', ink: '#7A848F' },
  { sym: '✓', mark: y, line: 'telegram · paired', ink: '#7A848F' },
  { sym: '✓', mark: y, line: 'secrets · mode 0600', ink: '#7A848F' },
  { sym: '$', mark: '#5D666F', line: 'npx caraka start', ink: '#FF7A5E' },
]

// Comp lines 558-565 draw phase 0 in flight, which stopped being true when
// v0.1 shipped and is two phases stale after v0.2. Names and marks follow
// src/data/status.ts:44-47 through the generator's PHASES
// (site/scripts/gen-assets.mjs:484-501); the ink shades are the comp's own.
export const phases = [
  { n: '0', glyph: '●', name: 'Spike', tone: '#8EEE98', ink: '#F6F9FC', fill: '100%' },
  { n: '1', glyph: '◐', name: 'Dogfood', tone: '#E2452C', ink: '#95A0AB', fill: '62%' },
  { n: '2', glyph: '◐', name: 'Install', tone: '#E2452C', ink: '#95A0AB', fill: '48%' },
  { n: '3', glyph: '○', name: 'Memory', tone: '#414950', ink: '#7A848F', fill: '0%' },
  { n: '4', glyph: '○', name: 'Abstraction', tone: '#414950', ink: '#7A848F', fill: '0%' },
  { n: '5', glyph: '○', name: 'Closed beta', tone: '#414950', ink: '#5D666F', fill: '0%' },
  { n: '6', glyph: '○', name: 'WhatsApp', tone: '#414950', ink: '#5D666F', fill: '0%' },
  { n: '7', glyph: '○', name: 'Public 1.0', tone: '#414950', ink: '#5D666F', fill: '0%' },
]

export const meta =
  '<meta property="og:title"       content="Caraka — send the task, Caraka runs it">\n<meta property="og:description" content="A thin bridge from Telegram to the coding agent already installed on your machine.">\n<meta property="og:image"       content="https://caraka.dev/og/og-landing.png">\n<meta property="og:image:width"  content="1200">\n<meta property="og:image:height" content="630">\n<meta property="og:type"        content="website">\n<meta property="og:url"         content="https://caraka.dev/">\n\n<meta name="twitter:card"  content="summary_large_image">\n<meta name="twitter:image" content="https://caraka.dev/og/og-landing.png">\n<meta name="twitter:image:alt" content="Kartu Caraka: judul putih di latar gelap, cincin kesumba dengan aksara ꦕ.">'
