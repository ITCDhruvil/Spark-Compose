import type { Editor } from '@tiptap/react'
import type { Node as PMNode } from '@tiptap/pm/model'
import { canIndentBlock, canOutdentBlock } from '../lists/extensions/block-indent'

export function sinkListItem(editor: Editor) {
  editor.chain().focus().indentBlock().run()
}

export function liftListItem(editor: Editor) {
  editor.chain().focus().outdentBlock().run()
}

export function canSinkListItem(editor: Editor) {
  return canIndentBlock(editor)
}

export function canLiftListItem(editor: Editor) {
  return canOutdentBlock(editor)
}

type ListTypeName = 'bulletList' | 'orderedList'

/**
 * Merge consecutive top-level bullet/ordered lists into one list of `targetType`.
 * Fixes "all 1." / only-first-numbered when each item was its own list.
 */
export function mergeAdjacentLists(editor: Editor, targetType: ListTypeName): boolean {
  const { state } = editor
  const listType = state.schema.nodes[targetType]
  const bulletType = state.schema.nodes.bulletList
  const orderedType = state.schema.nodes.orderedList
  const itemType = state.schema.nodes.listItem
  if (!listType || !itemType || !bulletType || !orderedType) return false

  type Run = { from: number; to: number; lists: PMNode[] }
  const runs: Run[] = []
  let current: Run | null = null

  state.doc.forEach((node, offset) => {
    const isList = node.type === bulletType || node.type === orderedType
    if (isList) {
      if (!current) {
        current = { from: offset, to: offset + node.nodeSize, lists: [node] }
      } else {
        current.to = offset + node.nodeSize
        current.lists.push(node)
      }
    } else if (current) {
      runs.push(current)
      current = null
    }
  })
  if (current) runs.push(current)

  const needsWork = runs.some((run) => {
    if (run.lists.length > 1) return true
    return run.lists[0]?.type.name !== targetType
  })
  if (!needsWork) return false

  let tr = state.tr
  let changed = false

  for (let r = runs.length - 1; r >= 0; r--) {
    const run = runs[r]!
    const items: PMNode[] = []
    let attrs: Record<string, unknown> = {}

    for (const list of run.lists) {
      if (list.type.name === targetType) attrs = { ...list.attrs }
      list.forEach((child) => {
        if (child.type === itemType) items.push(child)
      })
    }

    if (items.length === 0) continue

    const renumbered = items.map((item, index) =>
      item.type.create({ ...item.attrs, value: index + 1 }, item.content, item.marks),
    )

    const newList = listType.create(attrs, renumbered)
    tr = tr.replaceWith(run.from, run.to, newList)
    changed = true
  }

  if (!changed) return false
  editor.view.dispatch(tr.scrollIntoView())
  return true
}

export function convertToOrderedList(editor: Editor) {
  const { $from } = editor.state.selection
  let inList = false
  for (let d = $from.depth; d > 0; d--) {
    const name = $from.node(d).type.name
    if (name === 'bulletList' || name === 'orderedList') {
      inList = true
      break
    }
  }

  if (!inList) {
    editor.chain().focus().toggleOrderedList().run()
  } else if (editor.isActive('bulletList')) {
    editor.chain().focus().toggleBulletList().toggleOrderedList().run()
  } else if (!editor.isActive('orderedList')) {
    editor.chain().focus().toggleOrderedList().run()
  }

  mergeAdjacentLists(editor, 'orderedList')
}

export function convertToBulletList(editor: Editor) {
  const { $from } = editor.state.selection
  let inList = false
  for (let d = $from.depth; d > 0; d--) {
    const name = $from.node(d).type.name
    if (name === 'bulletList' || name === 'orderedList') {
      inList = true
      break
    }
  }

  if (!inList) {
    editor.chain().focus().toggleBulletList().run()
  } else if (editor.isActive('orderedList')) {
    editor.chain().focus().toggleOrderedList().toggleBulletList().run()
  } else if (!editor.isActive('bulletList')) {
    editor.chain().focus().toggleBulletList().run()
  }

  mergeAdjacentLists(editor, 'bulletList')
}
