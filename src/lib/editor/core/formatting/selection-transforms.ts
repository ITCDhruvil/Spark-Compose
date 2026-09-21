import type { Editor } from '@tiptap/react'
import type { CalloutType } from '@/components/editor/core/callouts/extensions/callout'
import { convertToBulletList } from '@/components/editor/core/formatting/editor-list-utils'
import { getLastCallout, setLastCallout } from '../preferences/editor-preferences'

function toTitleCase(text: string): string {
  return text.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

export function transformSelectionCase(editor: Editor, mode: 'title' | 'upper' | 'lower'): boolean {
  const { from, to, empty } = editor.state.selection
  if (empty) return false
  const text = editor.state.doc.textBetween(from, to, '')
  const next =
    mode === 'upper' ? text.toUpperCase()
      : mode === 'lower' ? text.toLowerCase()
        : toTitleCase(text)
  editor.chain().focus().insertContentAt({ from, to }, next).run()
  return true
}

export function selectionLinesToBulletList(editor: Editor): boolean {
  const { from, to, empty } = editor.state.selection
  if (empty) return false
  const text = editor.state.doc.textBetween(from, to, '\n')
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (!lines.length) return false

  const items = lines.map((line) => ({
    type: 'listItem',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: line }] }],
  }))

  editor
    .chain()
    .focus()
    .deleteRange({ from, to })
    .insertContent({ type: 'bulletList', content: items })
    .run()
  return true
}

export function selectionLinesToTable(editor: Editor): boolean {
  const { from, to, empty } = editor.state.selection
  if (empty) return false
  const text = editor.state.doc.textBetween(from, to, '\n')
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (!lines.length) return false

  const rows = lines.map((line) => {
    const cells = line.includes('\t')
      ? line.split('\t')
      : line.includes(',')
        ? line.split(',')
        : [line]
    return cells.map((c) => c.trim())
  })

  const cols = Math.max(...rows.map((r) => r.length), 1)
  const normalized = rows.map((r) => {
    const copy = [...r]
    while (copy.length < cols) copy.push('')
    return copy
  })

  const headerCells = normalized[0]!.map((c) => ({
    type: 'tableHeader',
    content: [{ type: 'paragraph', content: c ? [{ type: 'text', text: c }] : [] }],
  }))
  const bodyRows = normalized.slice(1).map((row) => ({
    type: 'tableRow',
    content: row.map((c) => ({
      type: 'tableCell',
      content: [{ type: 'paragraph', content: c ? [{ type: 'text', text: c }] : [] }],
    })),
  }))

  const table = {
    type: 'table',
    content: [
      { type: 'tableRow', content: headerCells },
      ...bodyRows,
    ],
  }

  editor.chain().focus().deleteRange({ from, to }).insertContent(table).run()
  return true
}

export function wrapSelectionInCallout(editor: Editor, type?: CalloutType): boolean {
  const calloutType = type ?? getLastCallout()
  const { from, to, empty } = editor.state.selection
  if (empty) return false

  const ok = editor.chain().focus().setCallout(calloutType).run()
  if (ok) {
    setLastCallout(calloutType)
    return true
  }

  const slice = editor.state.doc.slice(from, to)
  const blocks = slice.content.toJSON()
  const content = Array.isArray(blocks) && blocks.length ? blocks : [{ type: 'paragraph' }]

  editor
    .chain()
    .focus()
    .deleteRange({ from, to })
    .insertContent({ type: 'callout', attrs: { type: calloutType }, content })
    .run()
  setLastCallout(calloutType)
  return true
}

/** Turn selection into bullets when it is a single paragraph (fallback). */
export function selectionToList(editor: Editor): boolean {
  const { empty } = editor.state.selection
  if (empty) return false
  if (editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, '\n').includes('\n')) {
    return selectionLinesToBulletList(editor)
  }
  convertToBulletList(editor)
  return true
}
