// Content for the README & banner board, transcribed from the renderVals() block of
// design/mockups/Caraka README.dc.html. The comp still decides how this board
// looks; it stopped deciding what is true of the release. Where a line below no
// longer matches it because the code moved, the comment above it names the comp
// line and what shipped instead.

/** data-props: showChrome, boolean, default true — the browser chrome above the repo preview. */
export const showChrome = true

export const badges = [
  // Comp line 256 reads v0.0.0. This chip is the npm registry badge, so it
  // tracks what is published, not package.json. 0.2.1 is the last version the
  // owner pushed to the registry; 0.3.0 through 0.6.0 are tagged in the
  // repository and unpublished, and publishing waits on the owner each time.
  // Bump this only after an npm publish.
  { k: 'npm', v: 'v0.2.1', tone: '#E2452C', ink: '#FFEDE7' },
  { k: 'license', v: 'MIT', tone: '#8EEE98', ink: '#05300C' },
  { k: 'node', v: '≥22', tone: '#E2452C', ink: '#FFEDE7' },
  { k: 'protocol', v: 'ACP', tone: '#FF7A5E', ink: '#2B0D06' },
  // Comp line 260 reads pre-alpha. This mirrors the README's own status badge,
  // and the README body is still written to the v0.2 surface, so the badge is
  // v0.2 until that copy is swept. The release the code is at is 0.6.0.
  { k: 'status', v: 'v0.2', tone: '#FFD67E', ink: '#3A2A00' },
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
    // Comp line 271 says pre-alpha. 0.6.0 is the release in the CHANGELOG;
    // 0.2.1 is the last one on npm, which is what the chip above shows.
    status: 'v0.6 closed beta',
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
