// Reads docs/privacy.md and docs/privacy.id.md, so the page is those files and
// not a copy of them. The subset is small on purpose: one `#` title, `##`
// sections, paragraphs, `-` lists, and four inline forms. A fifth form in a
// policy file throws here instead of printing as raw markdown on the page.

export type Inline =
  | { k: 'text'; v: string }
  | { k: 'code'; v: string }
  | { k: 'bold'; v: string }
  | { k: 'link'; v: string; href: string }

export type Block = { kind: 'p'; inline: Inline[] } | { kind: 'ul'; items: Inline[][] }

export interface Policy {
  title: string
  /** First paragraph under the title: product, date, other language. */
  meta: Inline[]
  /** The rest of the paragraphs before the first section. */
  intro: Inline[][]
  sections: { title: string; blocks: Block[] }[]
}

const INLINE = /`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g

export function inline(src: string): Inline[] {
  const out: Inline[] = []
  let last = 0
  for (const m of src.matchAll(INLINE)) {
    if (m.index > last) out.push({ k: 'text', v: src.slice(last, m.index) })
    if (m[1] !== undefined) out.push({ k: 'code', v: m[1] })
    else if (m[2] !== undefined) out.push({ k: 'bold', v: m[2] })
    else out.push({ k: 'link', v: m[3], href: m[4] })
    last = m.index + m[0].length
  }
  if (last < src.length) out.push({ k: 'text', v: src.slice(last) })
  for (const part of out) {
    if (part.k === 'text' && /[`*[\]]/.test(part.v)) {
      throw new Error(`policy: markdown this reader does not handle: ${part.v}`)
    }
  }
  return out
}

export function parsePolicy(md: string): Policy {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  let title = ''
  const paragraphs: Inline[][] = []
  const sections: Policy['sections'] = []
  let para: string[] = []
  let list: Inline[][] | null = null

  const target = (): Block[] | null => (sections.length ? sections[sections.length - 1].blocks : null)
  const flush = () => {
    if (para.length) {
      const inl = inline(para.join(' '))
      const t = target()
      if (t) t.push({ kind: 'p', inline: inl })
      else paragraphs.push(inl)
      para = []
    }
    if (list) {
      target()?.push({ kind: 'ul', items: list })
      list = null
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (line.startsWith('# ')) {
      flush()
      title = line.slice(2).trim()
    } else if (line.startsWith('## ')) {
      flush()
      sections.push({ title: line.slice(3).trim(), blocks: [] })
    } else if (line.startsWith('- ')) {
      if (para.length) flush()
      if (!list) list = []
      list.push(inline(line.slice(2)))
    } else if (line === '') {
      flush()
    } else {
      para.push(line.trim())
    }
  }
  flush()

  if (!title || !sections.length || !paragraphs.length) throw new Error('policy: title, meta line, or sections missing')
  return { title, meta: paragraphs[0], intro: paragraphs.slice(1), sections }
}

/** Plain text of an inline run, for tests. */
export const plain = (xs: Inline[]) => xs.map((x) => x.v).join('')
