// Content for the story page, transcribed from the renderVals() block of
// design/mockups/Caraka Story.dc.html. The mockup is the source of truth:
// nothing here is authored, reworded, or reordered.

import { r } from '../lib/anim'

export const verse = [
  { aksara: 'ꦲꦤꦕꦫꦏ', latin: 'hana caraka — there were two envoys', tone: '#F6F9FC', delay: '.25s' },
  { aksara: 'ꦢꦠꦱꦮꦭ', latin: 'data sawala — they disagreed', tone: '#C9D2DB', delay: '.55s' },
  { aksara: 'ꦥꦝꦗꦪꦚ', latin: 'padha jayanya — they were equally strong', tone: '#8E99A4', delay: '.85s' },
  { aksara: 'ꦩꦒꦧꦛꦔ', latin: 'maga bathanga — both became corpses', tone: '#5D666F', delay: '1.15s' },
]

export const beats = [
  {
    n: '1',
    who: 'AJI SAKA',
    ring: '#FF7A5E',
    ink: '#B2BCC6',
    text: 'A king leaves his heirloom kris with Sembada, one of two servants he trusts completely, and gives one instruction: hand it to no one but me.',
    range: r(0, 5, 34),
  },
  {
    n: '2',
    who: 'TIME PASSES',
    ring: '#7A848F',
    ink: '#95A0AB',
    text: 'Aji Saka travels on. Months later, settled elsewhere, he wants the kris brought to him — and sends Dora, the other servant, to fetch it.',
    range: r(1, 5, 34),
  },
  {
    n: '3',
    who: 'DORA',
    ring: '#6FB9F0',
    ink: '#95A0AB',
    text: 'Dora arrives carrying a clear instruction: take the kris and bring it back. He is loyal. He is doing exactly what he was told.',
    range: r(2, 5, 34),
  },
  {
    n: '4',
    who: 'SEMBADA',
    ring: '#FFD67E',
    ink: '#95A0AB',
    text: "Sembada refuses. He is also loyal, and also doing exactly what he was told: hand it to no one but the king himself. Neither man can verify the other's order.",
    range: r(3, 5, 34),
  },
  {
    n: '5',
    who: 'DATA SAWALA',
    ring: '#FF93B2',
    ink: '#95A0AB',
    text: "They fight. Both are the king's best; both are equally strong. Neither yields, because yielding would mean betraying the instruction each holds.",
    range: r(4, 5, 34),
  },
  {
    n: '6',
    who: 'MAGA BATHANGA',
    ring: '#5D666F',
    ink: '#7A848F',
    text: 'Both die. Aji Saka arrives too late, understands what his own two instructions have done, and creates twenty letters so the story is never forgotten.',
    range: r(5, 5, 34),
  },
]

export const mapping = [
  {
    aksara: 'ꦲꦤꦕꦫꦏ',
    latin: 'hana caraka',
    feature: 'Caraka does not think for itself',
    body: 'No agent loop, no tools, no model provider. It carries your intent to the coding agent you already trust, and comes back to report.',
    range: r(0, 4, 28),
  },
  {
    aksara: 'ꦢꦠꦱꦮꦭ',
    latin: 'data sawala',
    feature: 'Memory with provenance',
    body: 'Every claim names the evidence behind it. Superseded facts are marked, not deleted. A disagreement stays a disagreement — never averaged into a false consensus.',
    range: r(1, 4, 28),
  },
  {
    aksara: '—',
    latin: 'no one could ask',
    feature: 'Approval by tap, or by a code that answers once',
    body: 'Every consequential action stops and asks a human, through a signed single-use callback. Chat text can never approve, which is what stops a forged instruction.',
    range: r(2, 4, 28),
  },
  {
    aksara: 'ꦥꦝꦗꦪꦚ',
    latin: 'padha jayanya',
    feature: 'One run per workspace',
    body: 'Two equally capable processes writing the same files is the software version of the same fight. Concurrency is capped at one, and the queue is visible.',
    range: r(3, 4, 28),
  },
  {
    aksara: 'ꦩꦒꦧꦛꦔ',
    latin: 'maga bathanga',
    feature: 'Append-only audit',
    body: 'Who asked for what, when, approved by whom, and what came of it. Work that ends badly still leaves a trace you can follow.',
    range: r(4, 4, 28),
  },
]

export const markNotes = [
  {
    t: 'The mark is two identical circles meeting at a single point, forming ∞, with the letter ꦕ (ca) sitting at the crossing.',
    range: r(0, 4, 30),
  },
  {
    t: 'It is literal: hana caraka — there were two envoys, crossing back and forth without end. The shape is the sentence.',
    range: r(1, 4, 30),
  },
  {
    t: 'The accent is kesumba, a traditional red dye — the same family as the cinnabar used in Javanese manuscripts for rubrication: marking the most important word on a page. That is what an accent colour does here.',
    range: r(2, 4, 30),
  },
  {
    t: 'No wayang, no kris, no batik ornament. The story is carried by the word and the script, never by visual cliché.',
    range: r(3, 4, 30),
  },
]

export const sisters = [
  {
    tag: 'ꦠꦶꦠꦺꦤ · NITENI',
    tone: '#7A848F',
    name: 'Titen',
    body: 'To notice, then keep what you noticed. Evidence, claims, and compiled context with provenance you can trace — deterministic, no model in the loop.',
    border: '#171C22',
    range: r(0, 5, 30),
  },
  {
    tag: 'ꦕꦫꦏ · ENVOY',
    tone: '#FF7A5E',
    name: 'Caraka',
    body: 'The one who is sent. Carries your intent to the agent, reports along the way, stops to ask when the stakes are real, and comes back with a result.',
    border: '#2B1612',
    range: r(1, 5, 30),
  },
]
