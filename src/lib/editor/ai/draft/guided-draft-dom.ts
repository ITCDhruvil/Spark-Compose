import type { Editor } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

export interface HeadingRange {
  headingPos: number
  headingNodeSize: number
  /** Content starts after heading */
  contentFrom: number
  /** Content ends at next same-or-higher heading or doc end */
  contentTo: number
}

/** Find a top-level heading by text (case-insensitive includes). */
export function findHeadingRange(editor: Editor, headingText: string): HeadingRange | null {
  const needle = headingText.trim().toLowerCase()
  if (!needle) return null

  const tops: { node: ProseMirrorNode; pos: number }[] = []
  editor.state.doc.forEach((node, offset) => {
    tops.push({ node, pos: offset })
  })

  let bestIdx = -1
  let bestScore = 0
  for (let i = 0; i < tops.length; i++) {
    const { node } = tops[i]!
    if (node.type.name !== 'heading') continue
    const text = node.textContent.trim().toLowerCase()
    let score = 0
    if (text === needle) score = 100
    else if (text.includes(needle) || needle.includes(text)) score = 80
    if (score > bestScore) {
      bestScore = score
      bestIdx = i
    }
  }
  if (bestIdx < 0 || bestScore < 40) return null

  const heading = tops[bestIdx]!
  const level = Number(heading.node.attrs.level ?? 2)
  const contentFrom = heading.pos + heading.node.nodeSize
  let contentTo = editor.state.doc.content.size
  for (let j = bestIdx + 1; j < tops.length; j++) {
    const n = tops[j]!.node
    if (n.type.name === 'heading' && Number(n.attrs.level ?? 2) <= level) {
      contentTo = tops[j]!.pos
      break
    }
  }

  return {
    headingPos: heading.pos,
    headingNodeSize: heading.node.nodeSize,
    contentFrom,
    contentTo,
  }
}

export function readSectionText(editor: Editor, headingText: string): string {
  const range = findHeadingRange(editor, headingText)
  if (!range) return ''
  return editor.state.doc.textBetween(range.contentFrom, range.contentTo, '\n').trim()
}
