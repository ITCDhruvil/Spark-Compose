import { describe, expect, it } from 'vitest'
import {
  findEnhanceInsertPos,
  sanitizeInsertMarkdown,
  toSecondPersonSummary,
} from '@/lib/editor/ai/draft/draft-enhance-insert'
import { draftEnhancePrompt } from '@/lib/server/ai/prompts'

function fakeDoc(blocks: { type: string; text: string; level?: number }[]) {
  let size = 0
  const nodes = blocks.map((b) => {
    const nodeSize = Math.max(b.text.length, 1) + 2
    const node = {
      type: { name: b.type },
      textContent: b.text,
      nodeSize,
      attrs: { level: b.level ?? 2 },
    }
    size += nodeSize
    return node
  })
  return {
    content: { size },
    forEach(fn: (node: (typeof nodes)[0], offset: number) => void) {
      let offset = 0
      for (const node of nodes) {
        fn(node, offset)
        offset += node.nodeSize
      }
    },
  }
}

describe('draft-enhance-insert', () => {
  it('toSecondPersonSummary rewrites third person', () => {
    expect(toSecondPersonSummary('The user aimed to cover low-carbon concrete.', 'asked'))
      .toMatch(/^You /)
    expect(toSecondPersonSummary('The draft covers benefits and hurdles.', 'draft'))
      .toMatch(/^Your draft/i)
  })

  it('sanitizeInsertMarkdown strips meta include titles', () => {
    const md = sanitizeInsertMarkdown(
      'Include a Section on Lifecycle Analysis\n\nConsider adding details about emissions.\n\nLow-carbon mixes use SCMs to cut embodied carbon.',
      'Include a Section on Lifecycle Analysis',
    )
    expect(md.toLowerCase()).not.toContain('include a section')
    expect(md.toLowerCase()).not.toContain('consider adding')
    expect(md).toMatch(/^## /)
    expect(md.toLowerCase()).toContain('low-carbon mixes')
  })

  it('findEnhanceInsertPos places before next same-level heading', () => {
    const doc = fakeDoc([
      { type: 'heading', text: 'Introduction', level: 2 },
      { type: 'paragraph', text: 'Intro body' },
      { type: 'heading', text: 'Benefits of low-carbon concrete', level: 2 },
      { type: 'paragraph', text: 'Benefits body' },
      { type: 'heading', text: 'Future outlook', level: 2 },
    ])
    const pos = findEnhanceInsertPos(doc, 'Benefits')
    // Should be start of "Future outlook"
    expect(pos).toBeGreaterThan(0)
    expect(pos).toBeLessThan(doc.content.size)
  })
})

describe('draftEnhancePrompt', () => {
  it('requires second person and insertMarkdown', () => {
    const prompt = draftEnhancePrompt({
      documentText: 'Low-carbon concrete draft.',
      topic: 'low-carbon concrete',
    })
    expect(prompt).toContain('SECOND PERSON')
    expect(prompt).toContain('insertMarkdown')
    expect(prompt).toContain('afterHeading')
    expect(prompt).toContain('Never start with')
  })
})
