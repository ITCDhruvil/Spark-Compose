import { describe, it, expect } from 'vitest'
import {
  looksLikeStructuredDocument,
  parseStructuredBlocks,
  structuredTextToHtml,
  convertPastedContent,
  isBrowserPlainTextHtml,
} from './smart-paste'

const METHOD_STATEMENT = `Method Statement — Tower Crane Lift (Level 5 Slab Pour)

1. Scope
This method statement covers a single tower-crane lift of a precast panel to Level 5 on the North Block. Work is planned for one shift.

2. Sequence
- Brief the banksman and crane operator.
- Attach the load using the approved lifting accessories.
- Lift to Level 5 and land on the designated landing zone.
- Release the load and clear the exclusion zone.

3. Plant
- Tower crane TC-02
- Certified chain sling and shackles

4. Weather
Lifts will not proceed in high winds. The lift supervisor will decide on the day.

5. Quality
Landing zone to be clear of debris before the lift.`

describe('structured paste — method statement', () => {
  it('detects structured document pattern', () => {
    expect(looksLikeStructuredDocument(METHOD_STATEMENT)).toBe(true)
  })

  it('parses title, section headings, bullets, and paragraphs', () => {
    const blocks = parseStructuredBlocks(METHOD_STATEMENT)
    expect(blocks[0]).toEqual({
      type: 'h1',
      text: 'Method Statement — Tower Crane Lift (Level 5 Slab Pour)',
    })
    expect(blocks[1]).toEqual({ type: 'h2', text: 'Scope' })
    expect(blocks[2]?.type).toBe('p')
    expect(blocks[3]).toEqual({ type: 'h2', text: 'Sequence' })
    expect(blocks[4]).toEqual({
      type: 'ul',
      items: [
        'Brief the banksman and crane operator.',
        'Attach the load using the approved lifting accessories.',
        'Lift to Level 5 and land on the designated landing zone.',
        'Release the load and clear the exclusion zone.',
      ],
    })
    expect(blocks[5]).toEqual({ type: 'h2', text: 'Plant' })
    expect(blocks[6]).toEqual({
      type: 'ul',
      items: ['Tower crane TC-02', 'Certified chain sling and shackles'],
    })
    expect(blocks[7]).toEqual({ type: 'h2', text: 'Weather' })
    expect(blocks[8]?.type).toBe('p')
    expect(blocks[9]).toEqual({ type: 'h2', text: 'Quality' })
    expect(blocks[10]?.type).toBe('p')
  })

  it('renders one ordered list for steps, not per-section "1." resets', () => {
    const steps = `1. Brief the team
2. Attach the load
3. Lift to level
4. Land and secure`

    const html = structuredTextToHtml(steps)
    expect(html).toContain('<ol>')
    expect(html.match(/<ol>/g)?.length).toBe(1)
    expect(html).toContain('<li>Brief the team</li>')
    expect(html).toContain('<li>Land and secure</li>')
    expect(html).not.toContain('<h2>')
  })

  it('converts method statement to semantic HTML', () => {
    const html = structuredTextToHtml(METHOD_STATEMENT)
    expect(html).toContain('<h1>Method Statement — Tower Crane Lift (Level 5 Slab Pour)</h1>')
    expect(html).toContain('<h2>Scope</h2>')
    expect(html).toContain('<h2>Sequence</h2>')
    expect(html).toMatch(/<ul>[\s\S]*Brief the banksman[\s\S]*<\/ul>/)
    expect(html.match(/<ol>/g) ?? []).toHaveLength(0)
    expect(html.match(/<h2>/g)?.length).toBe(5)
  })

  it('prefers structured parser over trivial browser HTML', () => {
    const browserHtml = `<meta charset="utf-8"><p>Method Statement — Tower Crane Lift</p><p>1. Scope</p><p>- Brief team</p>`
    expect(isBrowserPlainTextHtml(browserHtml)).toBe(true)
    const html = convertPastedContent(METHOD_STATEMENT, browserHtml)
    expect(html).toContain('<h1>')
    expect(html).toContain('<h2>Scope</h2>')
    expect(html).toContain('<ul>')
  })
})

describe('markdown paste still works', () => {
  it('handles hash headings', () => {
    const md = '# Title\n\n## Sub\n\nParagraph text.'
    const html = convertPastedContent(md, '')
    expect(html).toContain('<h1>Title</h1>')
    expect(html).toContain('<h2>Sub</h2>')
    expect(html).toContain('<p>Paragraph text.</p>')
  })
})

describe('csv paste', () => {
  it('converts spreadsheet paste to table HTML', () => {
    const csv = 'Trade,Hours\nCarpentry,40\nElectrical,24'
    const html = convertPastedContent(csv, '')
    expect(html).toContain('<table>')
    expect(html).toContain('<th>Trade</th>')
    expect(html).toContain('<td>Electrical</td>')
  })
})
