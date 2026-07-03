// src/lib/editor/lexical-to-tiptap.ts
import type {
  LexicalEditorState, LexicalNode, LexicalBlockNode, LexicalTextNode,
} from '@/lib/api/ai-types'

const TEXT_FORMAT = {
  Bold: 1,
  Italic: 2,
  Strikethrough: 4,
  Underline: 8,
  Code: 16,
  Subscript: 32,
  Superscript: 64,
} as const

function textNodeToTiptap(node: LexicalTextNode): Record<string, unknown> {
  const marks: Record<string, unknown>[] = []
  if (node.format & TEXT_FORMAT.Bold) marks.push({ type: 'bold' })
  if (node.format & TEXT_FORMAT.Italic) marks.push({ type: 'italic' })
  if (node.format & TEXT_FORMAT.Strikethrough) marks.push({ type: 'strike' })
  if (node.format & TEXT_FORMAT.Underline) marks.push({ type: 'underline' })
  if (node.format & TEXT_FORMAT.Code) marks.push({ type: 'code' })
  if (node.format & TEXT_FORMAT.Subscript) marks.push({ type: 'subscript' })
  if (node.format & TEXT_FORMAT.Superscript) marks.push({ type: 'superscript' })

  const out: Record<string, unknown> = { type: 'text', text: node.text }
  if (marks.length > 0) out.marks = marks
  return out
}

function convertChildren(children: LexicalNode[]): Record<string, unknown>[] {
  return children.map(convertNode).filter((n): n is Record<string, unknown> => n !== null)
}

function convertNode(node: LexicalNode): Record<string, unknown> | null {
  switch (node.type) {
    case 'text':
      return textNodeToTiptap(node)

    case 'paragraph':
      return { type: 'paragraph', content: convertChildren(node.children) }

    case 'heading': {
      const level = Number(node.tag.replace('h', ''))
      return { type: 'heading', attrs: { level: Math.min(level, 4) }, content: convertChildren(node.children) }
    }

    case 'quote':
      return { type: 'blockquote', content: [{ type: 'paragraph', content: convertChildren(node.children) }] }

    case 'list':
      return {
        type: node.listType === 'number' ? 'orderedList' : node.listType === 'check' ? 'taskList' : 'bulletList',
        content: convertChildren(node.children),
      }

    case 'listitem': {
      const content = convertChildren(node.children)
      const wrapped = content.length > 0 && content[0].type === 'paragraph' ? content : [{ type: 'paragraph', content }]
      if (typeof node.checked === 'boolean') {
        return { type: 'taskItem', attrs: { checked: node.checked }, content: wrapped }
      }
      return { type: 'listItem', content: wrapped }
    }

    case 'code':
      return {
        type: 'codeBlock',
        attrs: { language: node.language ?? null },
        content: convertChildren(node.children),
      }

    case 'table':
      return { type: 'table', content: convertChildren(node.children) }

    case 'tablerow':
      return { type: 'tableRow', content: convertChildren(node.children) }

    case 'tablecell': {
      const content = convertChildren(node.children)
      const wrapped = content.length > 0 && content[0].type === 'paragraph' ? content : [{ type: 'paragraph', content }]
      return { type: node.headerState ? 'tableHeader' : 'tableCell', content: wrapped }
    }

    case 'image':
      return {
        type: 'image',
        attrs: { src: node.src, alt: node.alt, align: node.alignment, sizePreset: '100' },
      }

    default:
      return null
  }
}

export function lexicalToTiptapDoc(state: LexicalEditorState): Record<string, unknown> {
  const content = (state.root.children as LexicalBlockNode[])
    .map(convertNode)
    .filter((n): n is Record<string, unknown> => n !== null)
  return { type: 'doc', content }
}
