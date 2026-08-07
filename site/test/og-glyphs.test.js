import { test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { PAGES } from '../src/lib/site.ts'

// The OG fonts are subset. Public Sans and JetBrains Mono ship the latin
// subset only, and Noto Sans Javanese ships the Javanese block only. A
// character outside both draws as a tofu box in every social preview, and
// nobody notices until it is live. U+2192 got in once already.
const LATIN = /[ -~ -ÿıŒœʻʼˆ˚˜‘’“”–—…•€™]/
const JAVANESE = /[ꦀ-꧟]/

const covered = (ch) => LATIN.test(ch) || JAVANESE.test(ch)

test('every OG string renders with the subset fonts the generator loads', () => {
  const bad = []
  for (const [key, meta] of Object.entries(PAGES)) {
    for (const field of ['ogKicker', 'ogHeadline']) {
      for (const ch of meta[field]) {
        if (!covered(ch)) bad.push(`${key}.${field}: ${JSON.stringify(ch)} U+${ch.codePointAt(0).toString(16).toUpperCase()}`)
      }
    }
  }
  expect(bad).toEqual([])
})

test('the tracked kicker carries no aksara', () => {
  // Wide letter-spacing breaks Javanese conjunct shaping; docs/brand.md pairs
  // the aksara with the word `caraka` instead, which the mark already does.
  for (const [key, meta] of Object.entries(PAGES)) {
    expect(JAVANESE.test(meta.ogKicker), `${key} kicker`).toBe(false)
  }
})

test('the generated favicon is a path, never live text', () => {
  // docs/brand.md: an exported SVG with <text> is tofu wherever Noto Sans
  // Javanese is absent, which is most machines.
  const svg = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8')
  expect(svg).not.toMatch(/<text/)
  expect(svg).toMatch(/<path/)
})
