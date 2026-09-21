import type { Editor } from '@tiptap/core'

export interface TextRange {
  from: number
  to: number
}

/** Insert or replace a range with shimmer loading text (aiLoading mark). */
export function writeAiLoadingText(
  editor: Editor,
  from: number,
  to: number,
  label: string,
): TextRange {
  editor.chain().focus().insertContentAt(
    { from, to },
    { type: 'text', text: label, marks: [{ type: 'aiLoading' }] },
  ).run()
  return { from, to: editor.state.selection.to }
}

/** Plain text write (drops shimmer). */
export function writeAiPlainText(
  editor: Editor,
  from: number,
  to: number,
  text: string,
): TextRange {
  editor.chain().focus().insertContentAt({ from, to }, text).run()
  return { from, to: editor.state.selection.to }
}

/** Insert a shimmer paragraph at a document position (below original). */
export function insertAiLoadingParagraph(
  editor: Editor,
  pos: number,
  label: string,
): TextRange {
  editor.chain().focus().insertContentAt(pos, {
    type: 'paragraph',
    content: [{ type: 'text', text: label, marks: [{ type: 'aiLoading' }] }],
  }).run()
  return { from: pos, to: editor.state.selection.to }
}

/** Position immediately after the block(s) covering a selection range. */
export function posAfterRange(editor: Editor, range: TextRange): number {
  const docSize = editor.state.doc.content.size
  const end = Math.min(Math.max(range.to, range.from), docSize)
  const $to = editor.state.doc.resolve(end)
  for (let d = $to.depth; d > 0; d--) {
    if ($to.node(d).isTextblock) {
      return $to.after(d)
    }
  }
  return end
}
