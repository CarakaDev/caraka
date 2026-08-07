/** Canonical facts about the site. Nothing here may contradict docs/brand.md. */

export const SITE = {
  url: 'https://caraka.dev',
  name: 'caraka',
  /** docs/brand.md §5 — the primary English tagline. */
  tagline: 'Send the task. Caraka runs it.',
  repo: 'https://github.com/CarakaDev/caraka',
  npm: 'https://www.npmjs.com/package/caraka',
  contact: 'halo@caraka.dev',
  security: 'security@caraka.dev',
  /** docs/brand.md §6 — kesumba-500 is the brand colour. */
  brand: '#E2452C',
  /** n-000, the deepest surface. */
  void: '#05080C',
} as const

/** The four links in the fixed header, in mockup order. */
export const NAV = [
  { label: 'Docs', href: '/docs' },
  { label: 'Install', href: '/install' },
  { label: 'Compare', href: '/compare' },
  { label: 'Security', href: '/security' },
] as const

export type PageKey =
  | 'landing'
  | 'docs'
  | 'install'
  | 'compare'
  | 'security'
  | 'status'
  | 'story'
  | 'brand'
  | 'warna'
  | 'ui-kit'
  | 'og'
  | 'readme'
  | 'notFound'

export interface PageMeta {
  /** Route, used for the canonical URL and the OG image filename. */
  path: string
  /** Language the page is actually written in. The mockups are not all English. */
  lang: 'en' | 'id'
  title: string
  description: string
  /**
   * Headline drawn into the OG image, and its `og:image:alt`.
   *
   * The card sets it at 58px on exactly two lines and never shrinks it, so
   * ` · ` marks where the line breaks; the generator draws the part after it in
   * kesumba-400, the way every card in the comp does. Each part has to fit one
   * line in roughly 580px — about 21 characters. A longer sentence is a wrong
   * sentence, not a smaller type size.
   */
  ogHeadline: string
  /** Mono eyebrow above the OG headline. Uppercase, under ~24 characters. */
  ogKicker: string
}

export const PAGES: Record<PageKey, PageMeta> = {
  landing: {
    path: '/',
    lang: 'en',
    title: 'caraka — send the task, Caraka runs it',
    // The release scope sentence, kept to the one in README.md. v0.2 added the
    // allowlisted group, which cost `streaming progress` the room to stay in a
    // description search engines cut at about 160 characters.
    description:
      'Caraka v0.2 connects a private Telegram chat, or an allowlisted group, to Claude Code, with persisted sessions, signed approvals, secret scrubbing, and audit.',
    ogHeadline: 'Send the task. · Caraka runs it.',
    // Latin-1 only. Two constraints meet here: wide tracking breaks the
    // aksara's conjunct shaping (the mark beside it already carries ꦕ), and
    // the OG fonts are subset to latin, so U+2192 and friends draw as tofu.
    ogKicker: 'TELEGRAM · YOUR CODING AGENT',
  },
  docs: {
    path: '/docs',
    lang: 'en',
    title: 'Documentation — caraka',
    description:
      'Caraka documentation: the usable v0.2 Telegram-to-Claude scope, architecture, session model, security controls, and roadmap.',
    // Shortened for the card: the old sentence needed four lines at 58px.
    ogHeadline: 'Everything it does. · And what it does not.',
    ogKicker: 'DOCUMENTATION',
  },
  install: {
    path: '/install',
    lang: 'en',
    title: 'Install — caraka',
    description:
      'Install Caraka v0.2 for private Telegram chat and Claude Code, by command or with a safe prompt for Codex and Claude.',
    // Shortened for the card. The three checks are the requirement chain in
    // src/data/install.ts: Node 22+, Git, and a signed-in Claude Code.
    ogHeadline: 'Three checks. · Then one command.',
    ogKicker: 'INSTALL',
  },
  compare: {
    path: '/compare',
    lang: 'en',
    title: 'Compare — caraka',
    description:
      'How Caraka differs from OpenClaw and Hermes: where each one puts the agent loop, what that costs, and which job each shape actually fits.',
    ogHeadline: 'Where the two shapes · actually differ.',
    ogKicker: 'COMPARE',
  },
  security: {
    path: '/security',
    lang: 'en',
    title: 'Threat model — caraka',
    description:
      'Caraka connects untrusted chat input to code execution on your machine. The trust boundary, the threats, the controls, and what this project will not claim.',
    // Was the same sentence as /story, which left two cards indistinguishable
    // in a timeline. Thirteen is the length of `threats` in src/data/security.ts.
    ogHeadline: '13 threats mapped. · Each has a control.',
    ogKicker: 'THREAT MODEL',
  },
  status: {
    path: '/status',
    lang: 'en',
    title: 'Status & roadmap — caraka',
    description:
      'Caraka v0.2 is a usable Telegram-to-Claude preview. See the open dogfood gates, release scope, and work that remains planned.',
    // The gate in the headline is phase 1's, and roadmap.md still holds it open
    // after v0.2: a week of daily use and five real tasks, which a version
    // number does not stand in for.
    ogHeadline: 'v0.2 is usable. · The gate is still open.',
    ogKicker: 'STATUS',
  },
  story: {
    path: '/story',
    lang: 'en',
    title: 'Hanacaraka — caraka',
    description:
      'Two envoys obeyed perfectly, and both died. Not from disloyalty, but from loyalty without context. Every line of the Javanese verse is a design decision in this project.',
    // Shortened for the card: 'Loyalty without context' needs 658px of the
    // 584px this card's text column has. This is the first sentence of the
    // page description, and it still carries the lesson.
    ogHeadline: 'Two envoys obeyed. · Both died.',
    ogKicker: 'HANACARAKA',
  },
  brand: {
    path: '/brand',
    lang: 'id',
    title: 'Logo book — caraka',
    description:
      'Anatomi lambang Caraka: dua lingkaran bersinggungan membentuk ∞ dengan aksara ꦕ di persilangannya. Konstruksi, gerak, varian, ruang aman, dan larangan.',
    ogHeadline: 'Dua lingkaran. Dua utusan. Tanpa ujung.',
    ogKicker: 'LOGO BOOK',
  },
  warna: {
    path: '/brand/warna',
    lang: 'id',
    title: 'Sistem warna — caraka',
    description:
      'Satu hue merek, sisanya nada. Ramp kesumba di OKLCH, netral dingin di hue 250°, dan enam warna status yang terkunci pada ikon topic Telegram.',
    ogHeadline: 'Satu hue. Sisanya nada.',
    ogKicker: 'SISTEM WARNA',
  },
  'ui-kit': {
    path: '/brand/ui-kit',
    lang: 'en',
    title: 'UI kit — caraka',
    description:
      'Every component in the Caraka surface, in every state it will actually reach: session rows, approval cards, progress, closers, errors, and the rules the kit enforces.',
    ogHeadline: 'Every component, in every state it will actually reach.',
    ogKicker: 'UI KIT v1.0',
  },
  og: {
    path: '/brand/og',
    lang: 'id',
    title: 'Kartu Open Graph — caraka',
    description:
      'Satu kerangka, tujuh isi. Bilah bab di atas, kolom teks di kiri, panel instrumen di kanan, lockup ꦕ di kaki — yang berubah hanya kalimat dan satu motif.',
    ogHeadline: 'Satu kerangka, tujuh isi.',
    ogKicker: 'OPEN GRAPH',
  },
  readme: {
    path: '/brand/readme',
    lang: 'id',
    title: 'README & banner — caraka',
    description:
      'Animasi di GitHub tanpa GIF: markdown membuang script dan style, tetapi melewatkan gambar apa adanya, jadi animasinya dititipkan di dalam SVG.',
    ogHeadline: 'Animasi di GitHub, tanpa GIF.',
    ogKicker: 'README',
  },
  // Specified in the UI kit alongside 500, 503 and 424. It is excluded from the
  // sitemap and marked noindex; the OG card exists because a broken link still
  // gets shared, and an unfurl with no image reads as a dead domain.
  notFound: {
    path: '/404',
    lang: 'en',
    title: 'This page was never sent — caraka',
    description: 'The link is wrong, or the page moved. Nothing is broken on your side.',
    ogHeadline: 'This page was never sent.',
    ogKicker: '404',
  },
}

/** OG image path for a page key. Generated into public/og by scripts/gen-assets.mjs. */
export const ogPath = (key: PageKey) => `/og/og-${key}.png`
