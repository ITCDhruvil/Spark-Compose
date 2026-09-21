// src/lib/editor/lexical-to-tiptap.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest'
import { lexicalToTiptapDoc } from './lexical-to-tiptap'
import type { LexicalEditorState } from '@/lib/api/ai-types'

function textNode(text: string, format = 0) {
  return { type: 'text' as const, version: 1 as const, text, format, detail: 0, mode: 'normal', style: '' }
}

describe('lexicalToTiptapDoc', () => {
  it('converts a paragraph with plain text', () => {
    const state: LexicalEditorState = {
      root: {
        type: 'root', version: 1, direction: 'ltr', format: '', indent: 0,
        children: [
          { type: 'paragraph', version: 1, direction: 'ltr', format: '', indent: 0, children: [textNode('hello')] },
        ],
      },
    }
    const doc = lexicalToTiptapDoc(state)
    expect(doc).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'hello' }] },
      ],
    })
  })

  it('converts bold+italic text format bitmask to Tiptap marks', () => {
    // Bold=1, Italic=2 -> 3
    const state: LexicalEditorState = {
      root: {
        type: 'root', version: 1, direction: 'ltr', format: '', indent: 0,
        children: [
          { type: 'paragraph', version: 1, direction: 'ltr', format: '', indent: 0, children: [textNode('bi', 3)] },
        ],
      },
    }
    const doc = lexicalToTiptapDoc(state)
    const textContent = (doc.content as any[])[0].content[0]
    expect(textContent.marks).toEqual(
      expect.arrayContaining([{ type: 'bold' }, { type: 'italic' }]),
    )
  })

  it('converts heading with tag h2', () => {
    const state: LexicalEditorState = {
      root: {
        type: 'root', version: 1, direction: 'ltr', format: '', indent: 0,
        children: [
          { type: 'heading', tag: 'h2', version: 1, direction: 'ltr', format: '', indent: 0, children: [textNode('Title')] },
        ],
      },
    }
    const doc = lexicalToTiptapDoc(state)
    expect((doc.content as any[])[0]).toEqual({
      type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Title' }],
    })
  })

  it('converts bullet list with list items', () => {
    const state: LexicalEditorState = {
      root: {
        type: 'root', version: 1, direction: 'ltr', format: '', indent: 0,
        children: [
          {
            type: 'list', listType: 'bullet', start: 1, tag: 'ul',
            version: 1, direction: 'ltr', format: '', indent: 0,
            children: [
              {
                type: 'listitem', value: 1, version: 1, direction: 'ltr', format: '', indent: 0,
                children: [{ type: 'paragraph', version: 1, direction: 'ltr', format: '', indent: 0, children: [textNode('item one')] }],
              },
            ],
          },
        ],
      },
    }
    const doc = lexicalToTiptapDoc(state)
    expect((doc.content as any[])[0].type).toBe('bulletList')
    expect((doc.content as any[])[0].content[0].type).toBe('listItem')
  })

  it('converts image node', () => {
    const state: LexicalEditorState = {
      root: {
        type: 'root', version: 1, direction: 'ltr', format: '', indent: 0,
        children: [
          { type: 'image', version: 1, src: 'https://x/y.png', alt: 'cap', width: 800, alignment: 'center' },
        ],
      },
    }
    const doc = lexicalToTiptapDoc(state)
    expect((doc.content as any[])[0]).toEqual({
      type: 'image',
      attrs: { src: 'https://x/y.png', alt: 'cap', align: 'center', sizePreset: '100' },
    })
  })

  it('converts code block with language', () => {
    const state: LexicalEditorState = {
      root: {
        type: 'root', version: 1, direction: 'ltr', format: '', indent: 0,
        children: [
          { type: 'code', language: 'python', version: 1, direction: 'ltr', format: '', indent: 0, children: [textNode('print(1)')] },
        ],
      },
    }
    const doc = lexicalToTiptapDoc(state)
    expect((doc.content as any[])[0]).toEqual({
      type: 'codeBlock', attrs: { language: 'python' }, content: [{ type: 'text', text: 'print(1)' }],
    })
  })

  it('converts quote block', () => {
    const state: LexicalEditorState = {
      root: {
        type: 'root', version: 1, direction: 'ltr', format: '', indent: 0,
        children: [
          { type: 'quote', version: 1, direction: 'ltr', format: '', indent: 0, children: [textNode('wise words')] },
        ],
      },
    }
    const doc = lexicalToTiptapDoc(state)
    expect((doc.content as any[])[0].type).toBe('blockquote')
  })

  it('converts a table with rows and cells', () => {
    const state: LexicalEditorState = {
      root: {
        type: 'root', version: 1, direction: 'ltr', format: '', indent: 0,
        children: [
          {
            type: 'table', version: 1, direction: 'ltr', format: '', indent: 0,
            children: [
              {
                type: 'tablerow', version: 1, direction: 'ltr', format: '', indent: 0,
                children: [
                  {
                    type: 'tablecell', headerState: 1, version: 1, direction: 'ltr', format: '', indent: 0,
                    children: [{ type: 'paragraph', version: 1, direction: 'ltr', format: '', indent: 0, children: [textNode('H1')] }],
                  },
                ],
              },
            ],
          },
        ],
      },
    }
    const doc = lexicalToTiptapDoc(state)
    expect((doc.content as any[])[0].type).toBe('table')
    expect((doc.content as any[])[0].content[0].type).toBe('tableRow')
    expect((doc.content as any[])[0].content[0].content[0].type).toBe('tableHeader')
  })
})
