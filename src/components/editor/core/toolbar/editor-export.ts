import TurndownService from 'turndown'
import type { Editor } from '@tiptap/react'

const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' })

export function exportHtml(editor: Editor): string {
  return editor.getHTML()
}

export function exportMarkdown(editor: Editor): string {
  return td.turndown(editor.getHTML())
}

export function exportJson(editor: Editor): string {
  return JSON.stringify(editor.getJSON(), null, 2)
}

export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}

export function downloadText(content: string, filename: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function printEditorContent(editor: Editor, title = 'Document'): void {
  const html = editor.getHTML()
  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700')
  if (!win) return
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
<style>
  body { font-family: Georgia, serif; max-width: 800px; margin: 2rem auto; line-height: 1.7; color: #111; }
  img { max-width: 100%; height: auto; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #ccc; padding: 0.5rem; }
  blockquote { border-left: 3px solid #666; padding-left: 1rem; color: #444; }
  .callout { padding: 0.75rem 1rem; border-radius: 0.5rem; margin: 1rem 0; }
  .callout-info { background: #e8f4fd; border-left: 4px solid #1a73e8; }
  .callout-warning { background: #fef7e0; border-left: 4px solid #f9ab00; }
  .callout-error { background: #fce8e6; border-left: 4px solid #d93025; }
  .callout-success { background: #e6f4ea; border-left: 4px solid #188038; }
  @media print { body { margin: 0; max-width: none; } }
</style></head><body>${html}</body></html>`)
  win.document.close()
  win.focus()
  win.print()
}
