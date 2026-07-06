import type { Editor } from '@tiptap/react'
import { markdownToLexical } from '@/lib/server/ai/markdown-to-lexical'
import { lexicalToTiptapDoc } from '@/lib/editor/lexical-to-tiptap'

/** Insert rendered markdown at a document position (replaces `from`–`to` if provided). */
export function insertMarkdown(
  editor: Editor,
  markdown: string,
  range?: { from: number; to: number },
) {
  const doc = lexicalToTiptapDoc(markdownToLexical(markdown))
  const content = (doc.content as Record<string, unknown>[]) ?? []
  if (content.length === 0) {
    content.push({ type: 'paragraph', content: [{ type: 'text', text: markdown }] })
  }

  if (range) {
    editor.chain().focus().insertContentAt({ from: range.from, to: range.to }, content).run()
  } else {
    editor.chain().focus().insertContent(content).run()
  }
}
