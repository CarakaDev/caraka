// Content for the brand kit page, transcribed from the renderVals() block of
// design/mockups/Caraka Brandkit.dc.html. The mockup is the source of truth:
// nothing here is authored, reworded, or reordered.

// renderVals() derives five values from the comp's `accent` prop, whose default
// is #E2452C — the value the page ships. Resolved against that default:
//   accentInk   rgb(226·0.62, 69·0.62, 44·0.62) rounded
//   glowSoft    rgba(r,g,b,0.32)
//   glowStrong  rgba(r,g,b,0.62)
//   inkOnAccent (r·299 + g·587 + b·114) / 1000 = 113.1, not > 150, so the light ink
export const accent = '#E2452C'
export const accentInk = 'rgb(140,43,27)'
export const glowSoft = 'rgba(226,69,44,0.32)'
export const glowStrong = 'rgba(226,69,44,0.62)'
export const inkOnAccent = '#F2F8FF'

export const ramp = [
  { step: '50', hex: '#FFEDE7', ink: '#6F271B' },
  { step: '100', hex: '#FFE0D8', ink: '#6F271B' },
  { step: '200', hex: '#FFC9BC', ink: '#6F271B' },
  { step: '300', hex: '#FFA694', ink: '#492019' },
  { step: '400', hex: '#FF7A5E', ink: '#2B1612' },
  { step: '500', hex: '#E2452C', ink: '#FFEDE7' },
  { step: '600', hex: '#C02F17', ink: '#FFEDE7' },
  { step: '700', hex: '#952C1B', ink: '#FFE0D8' },
  { step: '800', hex: '#6F271B', ink: '#FFC9BC' },
  { step: '900', hex: '#492019', ink: '#FFA694' },
  { step: '950', hex: '#2B1612', ink: '#FF7A5E' },
]

export const neutrals = [
  { step: '000', hex: '#05080C', ink: '#7A848F' },
  { step: '050', hex: '#0C1116', ink: '#7A848F' },
  { step: '100', hex: '#171C22', ink: '#95A0AB' },
  { step: '200', hex: '#292E35', ink: '#95A0AB' },
  { step: '300', hex: '#414950', ink: '#D2D8DF' },
  { step: '400', hex: '#5D666F', ink: '#F6F9FC' },
  { step: '500', hex: '#7A848F', ink: '#05080C' },
  { step: '600', hex: '#95A0AB', ink: '#05080C' },
  { step: '700', hex: '#B2BCC6', ink: '#05080C' },
  { step: '800', hex: '#D2D8DF', ink: '#05080C' },
  { step: '900', hex: '#E9EDF2', ink: '#05080C' },
  { step: '950', hex: '#F6F9FC', ink: '#05080C' },
]

export const semantic = [
  { role: 'running', hex: '#6FB9F0', dec: '7322096', glyph: '▸' },
  { role: 'awaiting', hex: '#FFD67E', dec: '16766590', glyph: '⏸' },
  { role: 'done', hex: '#8EEE98', dec: '9367192', glyph: '✓' },
  { role: 'failed', hex: '#FF93B2', dec: '16749490', glyph: '✗' },
  { role: 'cancelled', hex: '#CB86DB', dec: '13338331', glyph: '⊘' },
]

/** `style` is spliced onto the sample glyph, so each card shows its own mistake. */
export const donts = [
  {
    style: 'font-size:52px; line-height:1; transform:rotate(-18deg);',
    title: 'Jangan dimiringkan',
    note: 'Aksara punya garis dasar. Memiringkannya membuatnya salah tulis.',
  },
  {
    style: 'font-size:52px; line-height:1; transform:scaleX(1.7);',
    title: 'Jangan diregangkan',
    note: 'Proporsi glyph adalah bagian dari keterbacaannya.',
  },
  {
    style:
      'font-size:52px; line-height:1; background:linear-gradient(90deg,#E2452C,#FFD67E,#8EEE98); -webkit-background-clip:text; background-clip:text; color:transparent;',
    title: 'Jangan diberi gradien',
    note: 'Satu warna solid. Gradien pelangi adalah klise AI-slop.',
  },
  {
    style: 'font-size:52px; line-height:1; text-shadow:3px 3px 0 #E2452C, -3px -3px 0 #8EEE98;',
    title: 'Jangan diberi bayangan keras',
    note: 'Hanya cahaya lembut satu warna yang diizinkan, dan hanya di versi animasi.',
  },
  {
    style: 'font-size:52px; line-height:1; opacity:0.25;',
    title: 'Jangan diturunkan kontrasnya',
    note: 'Minimum 4,5:1 terhadap latar. Lambang bukan tekstur.',
  },
  {
    style: 'font-size:52px; line-height:1.9;',
    title: 'Jangan biarkan perataan bawaan',
    note: 'Tanpa line-height:1 + translateY(17.5%), glyph duduk terlalu tinggi di kotaknya.',
  },
]
