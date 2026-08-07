// Content for the README & banner board, transcribed from the renderVals() block of
// design/mockups/Caraka README.dc.html. The comp still decides how this board
// looks; it stopped deciding what is true of the release. Where a line below no
// longer matches it because the code moved, the comment above it names the comp
// line and what shipped instead.

/** data-props: showChrome, boolean, default true — the browser chrome above the repo preview. */
export const showChrome = true

export const badges = [
  // Comp line 256 reads v0.0.0; package.json is 0.2.1.
  { k: 'npm', v: 'v0.2.1', tone: '#E2452C', ink: '#FFEDE7' },
  { k: 'license', v: 'MIT', tone: '#8EEE98', ink: '#05300C' },
  { k: 'node', v: '≥22', tone: '#E2452C', ink: '#FFEDE7' },
  { k: 'protocol', v: 'ACP', tone: '#FF7A5E', ink: '#2B0D06' },
  // Comp line 260 reads pre-alpha; the README status badge reads v0.2.
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
    desc: 'The envoy. A thin bridge from Telegram to the coding agent already on your machine — sessions as topics, approvals as buttons, nothing executed without a human in between.',
    // Comp line 271 says pre-alpha; v0.2.1 is published (CHANGELOG.md).
    status: 'v0.2 preview',
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
