// Content for the Open Graph card board, transcribed from the renderVals() block of
// design/mockups/Caraka OG Images.dc.html. The mockup is the source of truth:
// nothing here is authored, reworded, or reordered.

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

export const toc = [
  { n: '01', name: 'Gerbang pertama', num: '#FF7A5E', ink: '#F6F9FC', bar: '44px', tone: '#E2452C' },
  { n: '02', name: 'Sesi & topic', num: '#7A848F', ink: '#D2D8DF', bar: '36px', tone: '#8F2C1C' },
  { n: '03', name: 'Approval', num: '#7A848F', ink: '#D2D8DF', bar: '30px', tone: '#8F2C1C' },
  { n: '04', name: 'Memori', num: '#7A848F', ink: '#B2BCC6', bar: '26px', tone: '#5C1F14' },
  { n: '05', name: 'Agent lain', num: '#7A848F', ink: '#B2BCC6', bar: '22px', tone: '#5C1F14' },
  { n: '06', name: 'Operasional', num: '#5D666F', ink: '#95A0AB', bar: '17px', tone: '#3D1710' },
  { n: '07', name: 'Rujukan', num: '#5D666F', ink: '#95A0AB', bar: '12px', tone: '#3D1710' },
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

export const term = [
  { sym: '$', mark: '#5D666F', line: 'npx caraka init', ink: '#E9EDF2' },
  { sym: '›', mark: '#414950', line: 'checking node… v22.4.0 ✓', ink: '#7A848F' },
  { sym: '›', mark: '#414950', line: 'no agent found', ink: '#FFD67E' },
  { sym: '›', mark: '#414950', line: 'install gemini-cli? (free) y', ink: '#7A848F' },
  { sym: '›', mark: '#414950', line: 'paste bot token from @BotFather', ink: '#7A848F' },
  { sym: '✓', mark: y, line: 'envoy awake — say /mulai', ink: '#8EEE98' },
]

export const phases = [
  { n: '0', glyph: '◐', name: 'Verifikasi', tone: '#FFD67E', ink: '#F6F9FC', fill: '62%' },
  { n: '1', glyph: '○', name: 'Bridge', tone: '#414950', ink: '#95A0AB', fill: '0%' },
  { n: '2', glyph: '○', name: 'Sesi', tone: '#414950', ink: '#95A0AB', fill: '0%' },
  { n: '3', glyph: '○', name: 'Approval', tone: '#414950', ink: '#7A848F', fill: '0%' },
  { n: '4', glyph: '○', name: 'Memori', tone: '#414950', ink: '#7A848F', fill: '0%' },
  { n: '5', glyph: '○', name: 'Multi-agent', tone: '#414950', ink: '#5D666F', fill: '0%' },
  { n: '6', glyph: '○', name: 'Hardening', tone: '#414950', ink: '#5D666F', fill: '0%' },
  { n: '7', glyph: '○', name: '1.0', tone: '#414950', ink: '#5D666F', fill: '0%' },
]

export const meta =
  '<meta property="og:title"       content="Caraka — send the task, Caraka runs it">\n<meta property="og:description" content="A thin bridge from Telegram to the coding agent already installed on your machine.">\n<meta property="og:image"       content="https://caraka.dev/og/og-landing.png">\n<meta property="og:image:width"  content="1200">\n<meta property="og:image:height" content="630">\n<meta property="og:type"        content="website">\n<meta property="og:url"         content="https://caraka.dev/">\n\n<meta name="twitter:card"  content="summary_large_image">\n<meta name="twitter:image" content="https://caraka.dev/og/og-landing.png">\n<meta name="twitter:image:alt" content="Kartu Caraka: judul putih di latar gelap, cincin kesumba dengan aksara ꦕ.">'
