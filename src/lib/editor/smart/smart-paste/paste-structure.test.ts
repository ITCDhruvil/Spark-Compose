import { describe, it, expect } from 'vitest'
import {
  csvToHtml,
  looksLikeCsv,
  looksLikePipeTable,
  parsePasteUrl,
  pipeTableToHtml,
} from './paste-structure'

describe('looksLikeCsv', () => {
  it('detects tab-separated values', () => {
    const tsv = 'Name\tQty\tUnit\nSteel\t120\ttons\nConcrete\t45\tm3'
    expect(looksLikeCsv(tsv)).toBe(true)
  })

  it('detects comma-separated values', () => {
    const csv = 'A,B,C\n1,2,3\n4,5,6'
    expect(looksLikeCsv(csv)).toBe(true)
  })

  it('rejects inconsistent rows', () => {
    expect(looksLikeCsv('A,B\n1,2,3')).toBe(false)
  })
})

describe('csvToHtml', () => {
  it('renders a table with header row', () => {
    const html = csvToHtml('Item,Cost\nLabour,1200\nPlant,800')
    expect(html).toContain('<table>')
    expect(html).toContain('<th>Item</th>')
    expect(html).toContain('<td>Plant</td>')
  })
})

describe('pipeTableToHtml', () => {
  it('renders github-style pipe tables', () => {
    const md = `| A | B |
|---|---|
| 1 | 2 |`
    expect(looksLikePipeTable(md)).toBe(true)
    const html = pipeTableToHtml(md)
    expect(html).toContain('<th>A</th>')
    expect(html).toContain('<td>2</td>')
  })
})

describe('parsePasteUrl', () => {
  it('detects video URLs', () => {
    expect(parsePasteUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({
      kind: 'video',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    })
  })

  it('detects image URLs', () => {
    expect(parsePasteUrl('https://example.com/photo.jpg')).toEqual({
      kind: 'image',
      url: 'https://example.com/photo.jpg',
    })
  })

  it('rejects multi-line or plain text', () => {
    expect(parsePasteUrl('hello world')).toBeNull()
    expect(parsePasteUrl('https://a.com\nhttps://b.com')).toBeNull()
  })
})
