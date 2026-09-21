import { describe, it, expect } from 'vitest'
import {
  classifyPasteLines,
  classifyPasteToHtml,
  normalizeChecklistHtml,
  normalizePasteNewlines,
  parseCheckboxText,
  splitInlineBulletItems,
  splitInlineNumberedLines,
} from './paste-line-classifier'

describe('normalizePasteNewlines', () => {
  it('converts lone CR to LF', () => {
    expect(normalizePasteNewlines('Title\rParagraph\r\nBullet')).toBe('Title\nParagraph\nBullet')
  })
})

describe('classifyPasteLines', () => {
  it('detects title, paragraph, and bullets', () => {
    const text = `This is title
Some paragraph with more detail about the project.
- First bullet point
- Second bullet point`
    const blocks = classifyPasteLines(text)
    expect(blocks[0]).toEqual({ type: 'h1', text: 'This is title' })
    expect(blocks[1]).toEqual({ type: 'p', text: 'Some paragraph with more detail about the project.' })
    expect(blocks[2]).toEqual({
      type: 'ul',
      items: ['First bullet point', 'Second bullet point'],
    })
  })

  it('uses Word font-size hints for title vs body', () => {
    const text = `Project Update\nSummary of works completed this week on site.`
    const blocks = classifyPasteLines(text, [
      { text: 'Project Update', fontSizePt: 20, bold: true },
      { text: 'Summary of works completed this week on site.', fontSizePt: 11 },
    ])
    expect(blocks[0]?.type).toBe('h1')
    expect(blocks[1]?.type).toBe('p')
  })

  it('detects Word list paragraph hints without bullet char', () => {
    const text = `Title\nItem one\nItem two`
    const blocks = classifyPasteLines(text, [
      { text: 'Title', fontSizePt: 18 },
      { text: 'Item one', isListItem: true, listType: 'ul' },
      { text: 'Item two', isListItem: true, listType: 'ul' },
    ])
    expect(blocks[0]?.type).toBe('h1')
    expect(blocks[1]).toEqual({ type: 'ul', items: ['Item one', 'Item two'] })
  })

  it('handles demo paste: title, paragraph, subtitle, inline bullets', () => {
    const text = `This is title
This is paragraph, This is paragraph, This is paragraph.
This is sub title
this is bullet point 1 this is bullet point 2 this is bullet point 3 this is bullet point 4`

    const blocks = classifyPasteLines(text, [
      { text: 'This is title', bold: true },
      { text: 'This is paragraph, This is paragraph, This is paragraph.' },
      { text: 'This is sub title' },
      {
        text: 'this is bullet point 1 this is bullet point 2 this is bullet point 3 this is bullet point 4',
        isListItem: true,
        listType: 'ul',
      },
    ])

    expect(blocks[0]).toEqual({ type: 'h1', text: 'This is title' })
    expect(blocks[1]?.type).toBe('p')
    expect(blocks[2]).toEqual({ type: 'h3', text: 'This is sub title' })
    expect(blocks[3]).toEqual({
      type: 'ul',
      items: [
        'this is bullet point 1',
        'this is bullet point 2',
        'this is bullet point 3',
        'this is bullet point 4',
      ],
    })
  })

  it('splits inline bullet point phrases on one line', () => {
    const items = splitInlineBulletItems(
      'this is bullet point 1 this is bullet point 2 this is bullet point 3',
    )
    expect(items).toHaveLength(3)
  })

  it('splits inline numbered items on one line', () => {
    const lines = splitInlineNumberedLines('1. First item 2. Second item 3. Third item')
    expect(lines).toHaveLength(3)
  })

  it('classifies markdown checkbox lines as a task list', () => {
    const text = `Task Checklist
[x] User Authentication
[x] Rich Text Formatting
[ ] Real-time Collaboration`
    const blocks = classifyPasteLines(text)
    expect(blocks[0]?.type).toBe('h1')
    expect(blocks[1]).toEqual({
      type: 'taskList',
      items: [
        { text: 'User Authentication', checked: true },
        { text: 'Rich Text Formatting', checked: true },
        { text: 'Real-time Collaboration', checked: false },
      ],
    })
  })

  it('renders task list HTML for TipTap', () => {
    const html = classifyPasteToHtml(`[x] Done\n[ ] Todo`)
    expect(html).toContain('data-type="taskList"')
    expect(html).toContain('data-type="taskItem" data-checked="true"')
    expect(html).toContain('data-checked="false"')
    expect(html).toContain('<p>Done</p>')
  })
})

describe('normalizeChecklistHtml', () => {
  it('converts checkbox ul paste into task list markup', () => {
    const pasted = `<p><strong>Task Checklist</strong></p>
<ul>
<li><input type="checkbox" checked> User Authentication</li>
<li><input type="checkbox" checked> Rich Text Formatting</li>
<li><input type="checkbox"> Real-time Collaboration</li>
</ul>`
    const html = normalizeChecklistHtml(pasted)
    expect(html).toContain('data-type="taskList"')
    expect(html).toContain('data-checked="true"')
    expect(html).toContain('<p>User Authentication</p>')
    expect(html).toContain('data-checked="false"')
    expect(html).toContain('<p>Real-time Collaboration</p>')
    expect(html).not.toContain('type="checkbox"')
  })
})

describe('parseCheckboxText', () => {
  it('parses bracket and symbol checkbox prefixes', () => {
    expect(parseCheckboxText('[x] Item')).toEqual({ text: 'Item', checked: true })
    expect(parseCheckboxText('[ ] Item')).toEqual({ text: 'Item', checked: false })
    expect(parseCheckboxText('☑ Item')?.checked).toBe(true)
    expect(parseCheckboxText('☐ Item')?.checked).toBe(false)
  })
})
