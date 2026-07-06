import type { Editor } from '@tiptap/react'
import { TextSelection } from '@tiptap/pm/state'

export interface TopLevelBlock {
  index: number
  pos: number
  nodeSize: number
}

/** Direct child of the document at the current selection. */
export function getTopLevelBlock(editor: Editor): TopLevelBlock | null {
  const { $from } = editor.state.selection
  if ($from.depth < 1) return null
  const index = $from.index(0)
  const pos = $from.before(1)
  const node = editor.state.doc.child(index)
  return { index, pos, nodeSize: node.nodeSize }
}

export function duplicateCurrentBlock(editor: Editor): boolean {
  const block = getTopLevelBlock(editor)
  if (!block) return false
  const node = editor.state.doc.nodeAt(block.pos)
  if (!node) return false
  editor.chain().focus().insertContentAt(block.pos + block.nodeSize, node.toJSON()).run()
  return true
}

export function deleteCurrentBlock(editor: Editor): boolean {
  const block = getTopLevelBlock(editor)
  if (!block) return false
  editor.chain().focus().deleteRange({ from: block.pos, to: block.pos + block.nodeSize }).run()
  return true
}

export function moveCurrentBlock(editor: Editor, direction: 'up' | 'down'): boolean {
  const block = getTopLevelBlock(editor)
  if (!block) return false

  const { state, view } = editor
  const { index, pos, nodeSize } = block
  const node = state.doc.child(index)

  if (direction === 'up') {
    if (index === 0) return false
    const prev = state.doc.child(index - 1)
    const insertPos = pos - prev.nodeSize
    const tr = state.tr.delete(pos, pos + nodeSize).insert(insertPos, node)
    tr.setSelection(TextSelection.near(tr.doc.resolve(insertPos + 1)))
    view.dispatch(tr.scrollIntoView())
    return true
  }

  if (index >= state.doc.childCount - 1) return false
  const next = state.doc.child(index + 1)
  const tr = state.tr.delete(pos, pos + nodeSize).insert(pos + next.nodeSize, node)
  tr.setSelection(TextSelection.near(tr.doc.resolve(pos + next.nodeSize + 1)))
  view.dispatch(tr.scrollIntoView())
  return true
}
