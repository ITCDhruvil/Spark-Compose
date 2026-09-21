import type { Editor } from '@tiptap/react'

export interface FindMatch {
  from: number
  to: number
}

export function findInEditor(
  editor: Editor,
  query: string,
  options: { caseSensitive?: boolean; from?: number } = {},
): FindMatch | null {
  if (!query) return null
  const { caseSensitive = false, from = editor.state.selection.to } = options
  const doc = editor.state.doc
  const needle = caseSensitive ? query : query.toLowerCase()

  const search = (start: number, end: number): FindMatch | null => {
    let found: FindMatch | null = null
    doc.nodesBetween(start, end, (node, pos) => {
      if (found || !node.isText || !node.text) return
      const haystack = caseSensitive ? node.text : node.text.toLowerCase()
      const index = haystack.indexOf(needle)
      if (index !== -1) {
        found = { from: pos + index, to: pos + index + query.length }
        return false
      }
    })
    return found
  }

  const first = search(from, doc.content.size)
  if (first) return first
  if (from > 0) return search(0, from)
  return null
}

export function findAllInEditor(
  editor: Editor,
  query: string,
  caseSensitive = false,
): FindMatch[] {
  if (!query) return []
  const matches: FindMatch[] = []
  let cursor = 0
  while (cursor <= editor.state.doc.content.size) {
    const match = findInEditor(editor, query, { caseSensitive, from: cursor })
    if (!match) break
    matches.push(match)
    cursor = match.from + 1
  }
  return matches
}

export function replaceInEditor(
  editor: Editor,
  query: string,
  replacement: string,
  caseSensitive = false,
): boolean {
  const { from, to, empty } = editor.state.selection
  if (!empty) {
    const selected = editor.state.doc.textBetween(from, to, ' ')
    const matches = caseSensitive
      ? selected === query
      : selected.toLowerCase() === query.toLowerCase()
    if (matches) {
      editor.chain().focus().insertContentAt({ from, to }, replacement).run()
      return true
    }
  }
  const match = findInEditor(editor, query, { caseSensitive })
  if (!match) return false
  editor.chain().focus().insertContentAt(match, replacement).setTextSelection({
    from: match.from,
    to: match.from + replacement.length,
  }).run()
  return true
}

export function replaceAllInEditor(
  editor: Editor,
  query: string,
  replacement: string,
  caseSensitive = false,
): number {
  const matches = findAllInEditor(editor, query, caseSensitive).reverse()
  matches.forEach((match) => {
    editor.chain().insertContentAt(match, replacement).run()
  })
  return matches.length
}
