// Content for the UI kit page, transcribed from the renderVals() block of
// design/mockups/Caraka UI Kit.dc.html. The mockup is the source of truth:
// nothing here is authored, reworded, or reordered.

/** Each section's `body` is a React tree in the mockup; see KitBody.astro. */
export type KitKind =
  | 'tokens'
  | 'buttons'
  | 'inputs'
  | 'chips'
  | 'sessions'
  | 'approval'
  | 'alerts'
  | 'empties'
  | 'term'
  | 'loading'
  | 'modal'
  | 'marks'

export const sections: { no: string; id: string; title: string; note: string; body: KitKind }[] = [
  { no: '01', id: 'tokens', title: 'Tokens', note: 'Colour ramps, type scale, radius. Everything else on this page draws from here.', body: 'tokens' },
  { no: '02', id: 'buttons', title: 'Buttons', note: 'Six states per variant. A control with no disabled state is not finished.', body: 'buttons' },
  { no: '03', id: 'inputs', title: 'Inputs', note: 'Error text replaces the hint rather than stacking below it, so the field never grows on failure.', body: 'inputs' },
  { no: '04', id: 'chips', title: 'Status chips', note: 'Colour never carries meaning alone. The deuteranopia row shows why.', body: 'chips' },
  { no: '05', id: 'sessions', title: 'Session rows', note: "The product's core component. Six states plus the skeleton it shows while loading.", body: 'sessions' },
  { no: '06', id: 'approval', title: 'Approval card', note: 'The one component where a mistake costs real work. Every terminal state is drawn.', body: 'approval' },
  { no: '07', id: 'alerts', title: 'Alerts', note: 'Each one names the thing that happened and the number attached to it.', body: 'alerts' },
  { no: '08', id: 'empty', title: 'Empty states', note: 'An empty state is a first-run tutorial. It always carries the exact command to fix it.', body: 'empties' },
  { no: '09', id: 'terminal', title: 'Terminal', note: 'Four severities in one block. Output is deterministic and safe to paste into an issue.', body: 'term' },
  { no: '10', id: 'loading', title: 'Loading', note: 'Indeterminate spinners for unknown waits, a determinate bar when progress is known.', body: 'loading' },
  { no: '11', id: 'dialog', title: 'Dialog', note: 'Reserved for actions that trusted mode still refuses to skip.', body: 'modal' },
  { no: '12', id: 'mark', title: 'Mark sizes', note: 'Where the ∞ pair holds together, and where it stops.', body: 'marks' },
]

export const toc = [
  ...sections.map((s) => ({ no: s.no, id: s.id, href: '#' + s.id, title: s.title })),
  { no: '13', id: 'errors', href: '#errors', title: 'Error pages' },
]

export const errorPages = [
  { route: 'caraka.dev/404', code: '404', title: 'This page was never sent', body: 'The link is wrong, or the page moved. Nothing is broken on your side.', cta: 'Go home', alt: 'Read the docs', dot: '#7A848F', border: '#171C22', ring: '#414950', glyphInk: '#7A848F', codeInk: '#414950', glow: 'rgba(122,132,143,.10)', ringAnimL: '', ringAnimR: '', hint: null },
  { route: 'caraka.dev/500', code: '500', title: 'The gate did not open', body: 'Something failed on our side. It has been logged, and nothing you did caused it.', cta: 'Try again', alt: 'Report it', dot: '#FF93B2', border: '#2B1612', ring: '#FF93B2', glyphInk: '#FF93B2', codeInk: '#FF93B2', glow: 'rgba(255,147,178,.12)', ringAnimL: '', ringAnimR: '', hint: null },
  { route: 'gateway · offline', code: '503', title: 'Gateway is not running', body: 'Caraka is installed but the process is not up. Start it and the topic list comes back.', cta: 'Retry', alt: 'View logs', dot: '#FFD67E', border: '#171C22', ring: '#FFD67E', glyphInk: '#FFD67E', codeInk: '#FFD67E', glow: 'rgba(255,214,126,.10)', ringAnimL: 'animation: ck-spin 3.4s linear infinite;', ringAnimR: 'animation: ck-spinRev 3.4s linear infinite;', hint: 'caraka start' },
  // Comp line 437 offers the Gemini free path. Since v0.4 init takes any one of
  // the seven presets it finds on PATH, but Claude Code is the only route that
  // has ever answered here, so the empty state names that one rather than
  // listing seven a reader would have to choose between.
  { route: 'agent · not found', code: '424', title: 'No coding agent installed', body: 'Caraka has no agent of its own. Install Claude Code, authenticate, then run init again.', cta: 'Install guide', alt: 'Compare agents', dot: '#E2452C', border: '#2B1612', ring: '#E2452C', glyphInk: '#F6F9FC', codeInk: '#FF7A5E', glow: 'rgba(226,69,44,.14)', ringAnimL: '', ringAnimR: '', hint: 'npm i -g @anthropic-ai/claude-code' },
] as { route: string; code: string; title: string; body: string; cta: string; alt: string; dot: string; border: string; ring: string; glyphInk: string; codeInk: string; glow: string; ringAnimL: string; ringAnimR: string; hint: string | null }[]

export const rules = [
  { n: '01', t: 'Colour is never the only signal. Every status carries a glyph, because done and cancelled sit at ΔE 2,5 under deuteranopia.' },
  { n: '02', t: 'Focus is a 2px outline offset by 2px. Never a colour swap, never a shadow, never removed.' },
  { n: '03', t: 'Kesumba 500 is for marks and buttons. Text and links use kesumba 400, which reaches 7,83:1 on the void.' },
  { n: '04', t: 'Every empty state carries the exact command that fills it. An empty screen with no next step is a dead end.' },
  { n: '05', t: 'Errors name what happened and what to do. No stack traces, no apology, no blame.' },
  { n: '06', t: 'Ring geometry is written in px. Percentage margins resolve against width, which puts the pair off-centre.' },
  { n: '07', t: 'Below 48px the rings drop and the mark becomes a solid tile. Site headers and footers use the tile. The one exception is the animated ∞ indicator, which is a loading component rather than the identity mark.' },
  { n: '08', t: 'Disabled controls do not react to hover. The cursor should tell the truth before the click does.' },
]
