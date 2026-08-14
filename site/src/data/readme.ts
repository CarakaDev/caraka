// Content for the README & banner board, transcribed from the renderVals() block of
// design/mockups/Caraka README.dc.html. The comp still decides how this board
// looks; it stopped deciding what is true of the release. Where a line below no
// longer matches it because the code moved, the comment above it names the comp
// line and what shipped instead.

/** data-props: showChrome, boolean, default true — the browser chrome above the repo preview. */
export const showChrome = true

export const badges = [
  // Comp line 256 reads v0.0.0. This chip is the npm registry badge, so it
  // tracks what is published, not package.json. Bump it only after `npm publish`
  // has run — the owner's command and nobody else's — and only to what the
  // registry says. Read from the registry rather than from `npm view`, which
  // served the previous version for about a minute after a successful publish —
  // and the registry itself lagged too on 13 August 2026, answering 1.3.0 for
  // roughly a minute after `npm publish` printed `+ caraka@1.3.1`. Wait for
  // `curl -s https://registry.npmjs.org/caraka` to name the new one before
  // touching this line. It gave `dist-tags.latest` 1.4.2.
  { k: 'npm', v: 'v1.4.2', tone: '#E2452C', ink: '#FFEDE7' },
  { k: 'license', v: 'MIT', tone: '#8EEE98', ink: '#05300C' },
  { k: 'node', v: '≥22', tone: '#E2452C', ink: '#FFEDE7' },
  { k: 'protocol', v: 'ACP', tone: '#FF7A5E', ink: '#2B0D06' },
  // Comp line 260 reads pre-alpha. This one reads the release the code is at,
  // which is the newest heading in CHANGELOG.md, not the registry the chip
  // above tracks. The README's own status badge is the same idea and is not the
  // source: it still reads v1.0, which is drift in that file rather than a
  // second answer this one should copy.
  { k: 'status', v: 'v1.2', tone: '#FFD67E', ink: '#3A2A00' },
]

export const legend = [
  { aksara: 'ꦲꦤꦕꦫꦏ', roman: 'hana caraka', gloss: 'there were two envoys' },
  { aksara: 'ꦢꦠꦱꦮꦭ', roman: 'data sawala', gloss: 'they disagreed' },
  { aksara: 'ꦥꦝꦗꦪꦚ', roman: 'padha jayanya', gloss: 'they were equally strong' },
  { aksara: 'ꦩꦒꦧꦛꦔ', roman: 'maga bathanga', gloss: 'both became corpses' },
]

export const projects = [
  {
    name: 'caraka',
    desc: 'The envoy. A thin bridge from Telegram, Discord, or WhatsApp to the coding agent already on your machine — sessions as topics, threads, or a header, approval before every write, nothing executed without a human in between.',
    // Comp line 271 says pre-alpha. 1.3.0 is the release in the CHANGELOG, and
    // the chip above shows the registry instead, which is what it lags behind.
    status: 'v1.4, unproven',
    tone: '#FFD67E',
  },
  {
    name: 'titen',
    desc: 'The memory. Agent memory that never flattens a conclusion into its evidence — claims cite their observations, extraction is deterministic.',
    status: 'active',
    tone: '#8EEE98',
  },
]

// Rendered into a `white-space: pre-wrap` block, so every space is load-bearing.
export const tree =
  'di sini                    →  di repo\n\nassets/banner.svg.txt      →  assets/banner.svg\nassets/flow.svg.txt        →  assets/flow.svg\nREADME.md                  →  README.md\nREADME.id.md               →  README.id.md\n\n                              (repo CarakaDev/.github)\norg-profile/README.md      →  profile/README.md\norg-profile/assets/\n  banner.svg.txt           →  profile/assets/banner.svg'
