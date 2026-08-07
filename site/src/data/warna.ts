// Content for the colour-system page, transcribed from the renderVals() block of
// design/mockups/Caraka Sistem Warna.dc.html. The mockup is the source of truth:
// nothing here is authored, reworded, or reordered.

const ok = '#8EEE98',
  warn = '#FFD67E',
  bad = '#FF7A5E'

export const roleCards = [
  { role: 'PRIMARY', name: 'Kesumba', swatch: '#E2452C', use: 'merek, gerbang aktif, aksi utama' },
  { role: 'SECONDARY', name: 'Netral dingin', swatch: 'linear-gradient(90deg,#05080C,#414950,#B2BCC6)', use: '90% permukaan, teks, batas' },
  { role: 'TERTIARY', name: 'Permukaan bernada', swatch: 'linear-gradient(90deg,#12100F,#1E1614,#2B1612)', use: 'baris aktif, sorotan, kartu terpilih' },
  { role: 'SEMANTIK', name: 'Enam status', swatch: 'linear-gradient(90deg,#6FB9F0,#FFD67E,#8EEE98,#FF93B2,#CB86DB)', use: 'terkunci pada ikon topic Telegram' },
]

export const ramp = [
  { step: '50', hex: '#FFEDE7', ink: '#6F271B' }, { step: '100', hex: '#FFE0D8', ink: '#6F271B' },
  { step: '200', hex: '#FFC9BC', ink: '#6F271B' }, { step: '300', hex: '#FFA694', ink: '#492019' },
  { step: '400', hex: '#FF7A5E', ink: '#2B1612' }, { step: '500', hex: '#E2452C', ink: '#FFEDE7' },
  { step: '600', hex: '#C02F17', ink: '#FFEDE7' }, { step: '700', hex: '#952C1B', ink: '#FFE0D8' },
  { step: '800', hex: '#6F271B', ink: '#FFC9BC' }, { step: '900', hex: '#492019', ink: '#FFA694' },
  { step: '950', hex: '#2B1612', ink: '#FF7A5E' },
]

export const rampUse = [
  { step: '50 – 200', use: 'latar terang, badge lembut' },
  { step: '300', use: 'batas fokus di latar terang' },
  { step: '400', use: 'teks & tautan di latar gelap · AAA' },
  { step: '500', use: 'warna merek · lambang · tombol utama' },
  { step: '600', use: 'hover tombol' },
  { step: '700 – 800', use: 'aktif / ditekan · batas' },
  { step: '900 – 950', use: 'permukaan bernada di latar gelap' },
]

export const neutrals = [
  { step: '000', hex: '#05080C', ink: '#7A848F' }, { step: '050', hex: '#0C1116', ink: '#7A848F' },
  { step: '100', hex: '#171C22', ink: '#95A0AB' }, { step: '200', hex: '#292E35', ink: '#95A0AB' },
  { step: '300', hex: '#414950', ink: '#D2D8DF' }, { step: '400', hex: '#5D666F', ink: '#F6F9FC' },
  { step: '500', hex: '#7A848F', ink: '#05080C' }, { step: '600', hex: '#95A0AB', ink: '#05080C' },
  { step: '700', hex: '#B2BCC6', ink: '#05080C' }, { step: '800', hex: '#D2D8DF', ink: '#05080C' },
  { step: '900', hex: '#E9EDF2', ink: '#05080C' }, { step: '950', hex: '#F6F9FC', ink: '#05080C' },
]

export const textContrast = [
  { step: 'n-950', hex: '#F6F9FC', ratio: '18,99', grade: 'AAA', gradeCol: ok },
  { step: 'n-900', hex: '#E9EDF2', ratio: '17,07', grade: 'AAA', gradeCol: ok },
  { step: 'n-800', hex: '#D2D8DF', ratio: '13,98', grade: 'AAA', gradeCol: ok },
  { step: 'n-700', hex: '#B2BCC6', ratio: '10,42', grade: 'AAA', gradeCol: ok },
  { step: 'n-600', hex: '#95A0AB', ratio: '7,54', grade: 'AAA', gradeCol: ok },
  { step: 'n-500', hex: '#7A848F', ratio: '5,28', grade: 'AA', gradeCol: warn },
  { step: 'n-400', hex: '#5D666F', ratio: '3,44', grade: 'hanya teks besar', gradeCol: bad },
]

export const neutralUse = [
  { step: 'n-000', use: 'latar terdalam' },
  { step: 'n-050', use: 'panel, kartu' },
  { step: 'n-100', use: 'batas, pemisah' },
  { step: 'n-200', use: 'batas kuat, input' },
  { step: 'n-400', use: 'teks nonaktif · besar saja' },
  { step: 'n-500 – 600', use: 'label, metadata' },
  { step: 'n-700 – 800', use: 'teks pendukung' },
  { step: 'n-900 – 950', use: 'teks utama' },
]

export const tertiary = [
  { name: 'surface-active', hex: '#12100F', use: 'baris atau kartu yang sedang aktif' },
  { name: 'surface-raised', hex: '#1E1614', use: 'panel menonjol bernada merek' },
  { name: 'border-brand', hex: '#2B1612', use: 'batas halus milik merek' },
  { name: 'overlay-brand', hex: '#492019', use: 'sorotan, latar badge' },
]

export const cvdSets = [
  {
    label: 'PENGLIHATAN NORMAL', tone: ok, worst: 'terdekat: failed ↔ cancelled = ΔE 11,8',
    note: 'Semua pasangan di atas 11. Cukup — meski failed dan cancelled sudah agak berdekatan.',
    chips: [{ hex: '#6FB9F0', glyph: '▸', name: 'run' }, { hex: '#FFD67E', glyph: '⏸', name: 'wait' }, { hex: '#8EEE98', glyph: '✓', name: 'done' }, { hex: '#FF93B2', glyph: '✗', name: 'fail' }, { hex: '#CB86DB', glyph: '⊘', name: 'canc' }],
  },
  {
    label: 'DEUTERANOPIA', tone: bad, worst: 'terdekat: done ↔ cancelled = ΔE 2,5',
    note: 'Hijau dan ungu sama-sama luruh jadi abu yang praktis identik. Kuning dan magenta hanya berjarak 5,0. Gagal telak.',
    chips: [{ hex: '#918BE1', glyph: '▸', name: 'run' }, { hex: '#F1F49F', glyph: '⏸', name: 'wait' }, { hex: '#BAB2B7', glyph: '✓', name: 'done' }, { hex: '#DFE6AA', glyph: '✗', name: 'fail' }, { hex: '#B5BAC6', glyph: '⊘', name: 'canc' }],
  },
  {
    label: 'PROTANOPIA', tone: bad, worst: 'terdekat: waiting ↔ done = ΔE 3,8',
    note: 'Kuning dan hijau menyatu; magenta justru bergeser ke kuning-hijau. Empat pasangan di bawah ambang.',
    chips: [{ hex: '#B2B3F0', glyph: '▸', name: 'run' }, { hex: '#DBDB7F', glyph: '⏸', name: 'wait' }, { hex: '#E5E698', glyph: '✓', name: 'done' }, { hex: '#A4A4B4', glyph: '✗', name: 'fail' }, { hex: '#9090DB', glyph: '⊘', name: 'canc' }],
  },
]

export const semantic = [
  { role: 'running', hex: '#6FB9F0', dec: '7322096', glyph: '▸' },
  { role: 'awaiting', hex: '#FFD67E', dec: '16766590', glyph: '⏸' },
  { role: 'done', hex: '#8EEE98', dec: '9367192', glyph: '✓' },
  { role: 'failed', hex: '#FF93B2', dec: '16749490', glyph: '✗' },
  { role: 'cancelled', hex: '#CB86DB', dec: '13338331', glyph: '⊘' },
  { role: 'dikosongkan', hex: '#FB6F5F', dec: '16478047', glyph: '—' },
]

export const tokensA = [
  { k: '--surface-base', v: 'n-000' }, { k: '--surface-panel', v: 'n-050' },
  { k: '--surface-active', v: 'kesumba-950' }, { k: '--surface-raised', v: 'kesumba-900' },
  { k: '--border-subtle', v: 'n-100' }, { k: '--border-strong', v: 'n-200' },
  { k: '--border-brand', v: 'kesumba-800' }, { k: '--border-focus', v: 'kesumba-400' },
]

export const tokensB = [
  { k: '--text-primary', v: 'n-900' }, { k: '--text-secondary', v: 'n-700' },
  { k: '--text-muted', v: 'n-500' }, { k: '--text-brand', v: 'kesumba-400' },
  { k: '--action-bg', v: 'kesumba-500' }, { k: '--action-hover', v: 'kesumba-600' },
  { k: '--action-ink', v: 'kesumba-50' }, { k: '--focus-ring', v: 'kesumba-400' },
]
