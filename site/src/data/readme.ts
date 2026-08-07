// Content for the README & banner board, transcribed from the renderVals() block of
// design/mockups/Caraka README.dc.html. The mockup is the source of truth:
// nothing here is authored, reworded, or reordered.

/** data-props: showChrome, boolean, default true — the browser chrome above the repo preview. */
export const showChrome = true

export const badges = [
  { k: 'npm', v: 'v0.0.0', tone: '#E2452C', ink: '#FFEDE7' },
  { k: 'license', v: 'MIT', tone: '#8EEE98', ink: '#05300C' },
  { k: 'node', v: '≥22', tone: '#E2452C', ink: '#FFEDE7' },
  { k: 'protocol', v: 'ACP', tone: '#FF7A5E', ink: '#2B0D06' },
  { k: 'status', v: 'pre-alpha', tone: '#FFD67E', ink: '#3A2A00' },
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
    status: 'pre-alpha',
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
