import { describe, it, expect } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import {
  collectHeadingContext,
  resolveHeadingLevel,
  smartHeadingLevel,
  titleInsertPos,
} from './heading-context'

function makeEditor(html: string) {
  return new Editor({ extensions: [StarterKit], content: html })
}

describe('smartHeadingLevel', () => {
  it('defaults to H2 with no neighbors', () => {
    expect(smartHeadingLevel([], [])).toBe(2)
  })

  it('uses H1 when nothing precedes and next is H2', () => {
    expect(smartHeadingLevel([], [{ level: 2, text: 'Next', pos: 10 }])).toBe(1)
  })

  it('stays a sibling of the previous heading', () => {
    expect(smartHeadingLevel(
      [{ level: 2, text: 'Prev', pos: 0 }],
      [{ level: 2, text: 'Next', pos: 20 }],
    )).toBe(2)
  })
})

describe('resolveHeadingLevel', () => {
  it('does not skip more than one level below previous', () => {
    expect(resolveHeadingLevel(3, [{ level: 1, text: 'Top', pos: 0 }], [])).toBe(2)
  })

  it('avoids a second consecutive H1', () => {
    expect(resolveHeadingLevel(1, [{ level: 1, text: 'Top', pos: 0 }], [])).toBe(2)
  })
})

describe('smartSubtitleLevel', () => {
  it('is one step deeper than a section heading', async () => {
    const { smartSubtitleLevel } = await import('./heading-context')
    expect(smartSubtitleLevel([], [])).toBe(3)
    expect(smartSubtitleLevel([{ level: 1, text: 'Top', pos: 0 }], [])).toBe(2)
  })
})

describe('titleInsertPos', () => {
  it('puts a title above an existing subtitle stack', () => {
    const editor = makeEditor('<h3>Sub</h3><p>Body paragraph about safety.</p>')
    // Select inside the paragraph
    let paraPos = 0
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph') paraPos = pos
    })
    editor.commands.setTextSelection({ from: paraPos + 1, to: paraPos + 5 })

    const titlePos = titleInsertPos(editor, 'heading')
    const subPos = titleInsertPos(editor, 'subtitle')
    expect(titlePos).toBe(0) // before the H3
    expect(subPos).toBeGreaterThan(0) // at paragraph start, after H3
    expect(subPos).toBeGreaterThan(titlePos!)
    editor.destroy()
  })

  it('puts a subtitle under an existing title', () => {
    const editor = makeEditor('<h2>Title</h2><p>Body paragraph about safety.</p>')
    let paraPos = 0
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph') paraPos = pos
    })
    editor.commands.setTextSelection({ from: paraPos + 1, to: paraPos + 5 })

    const titlePos = titleInsertPos(editor, 'heading')
    const subPos = titleInsertPos(editor, 'subtitle')
    expect(titlePos).toBe(0)
    expect(subPos).toBeGreaterThan(titlePos!)
    editor.destroy()
  })
})

describe('collectHeadingContext', () => {
  it('splits previous and following headings around a position', () => {
    const editor = makeEditor('<h1>A</h1><p>body</p><h2>B</h2>')
    // position of the paragraph (after H1)
    let paraPos = 0
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph') paraPos = pos
    })
    const { prev, next } = collectHeadingContext(editor, paraPos)
    expect(prev.map((h) => h.text)).toEqual(['A'])
    expect(next.map((h) => h.text)).toEqual(['B'])
    editor.destroy()
  })
})
