import { test, expect, describe } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parsePolicy, plain } from '../src/lib/policy.ts'

// /privacy renders the two policy files. These tests keep the facts the store
// listing and the page depend on from being edited out of them.

const DOCS = join(fileURLToPath(new URL('..', import.meta.url)), '..', 'docs')
const read = (f) => readFileSync(join(DOCS, f), 'utf8')

describe('the policy files parse', () => {
  for (const [file, lang] of [['privacy.md', 'en'], ['privacy.id.md', 'id']]) {
    const md = read(file)
    const p = parsePolicy(md)

    test(`${file} has a title, a dated meta line, and eleven sections`, () => {
      expect(p.title.length).toBeGreaterThan(5)
      expect(plain(p.meta)).toContain('13')
      expect(p.sections).toHaveLength(11)
    })

    test(`${file} names the developer and the contact address`, () => {
      expect(md).toContain('PT Global Raya Oris Wijaya')
      expect(md).toContain('halo@caraka.dev')
    })

    test(`${file} keeps the Android facts`, () => {
      expect(md).toMatch(/HTTPS/)
      expect(md).toMatch(/Keystore/)
      expect(md).toMatch(/Google code scanner/)
      expect(md).toMatch(lang === 'en' ? /Disconnect/ : /Putuskan/)
      expect(md).toMatch(/SQLite/)
    })
  }

  test('both files have the same section count', () => {
    expect(parsePolicy(read('privacy.md')).sections.length).toBe(parsePolicy(read('privacy.id.md')).sections.length)
  })

  test('markdown the reader does not handle throws', () => {
    expect(() => parsePolicy('# T\n\nmeta\n\n## S\n\nsome text and [broken')).toThrow()
  })
})
