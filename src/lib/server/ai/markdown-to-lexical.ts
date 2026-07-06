import type {
  LexicalBlockNode, LexicalEditorState, LexicalNode, LexicalParagraphNode, LexicalTextNode,
} from '@/lib/api/ai-types'

const ELEMENT_BASE = {
  version: 1 as const,
  direction: 'ltr' as const,
  format: 'justify' as const,
  indent: 0,
}

const BOLD = 1
const ITALIC = 2

function textNode(text: string, format = 0): LexicalTextNode {
  return {
    type: 'text',
    version: 1,
    text,
    format,
    detail: 0,
    mode: 'normal',
    style: '',
  }
}

function paragraph(children: LexicalNode[], format: LexicalParagraphNode['format'] = 'justify'): LexicalBlockNode {
  return { type: 'paragraph', ...ELEMENT_BASE, format, children }
}

function heading(tag: 'h1' | 'h2' | 'h3' | 'h4', children: LexicalNode[]): LexicalBlockNode {
  return { type: 'heading', tag, ...ELEMENT_BASE, format: '', children }
}

function quote(children: LexicalNode[]): LexicalBlockNode {
  return { type: 'quote', ...ELEMENT_BASE, children }
}

function listItem(children: LexicalNode[], value = 1): LexicalBlockNode {
  return { type: 'listitem', value, ...ELEMENT_BASE, children }
}

function bulletList(items: LexicalBlockNode[]): LexicalBlockNode {
  return {
    type: 'list',
    listType: 'bullet',
    start: 1,
    tag: 'ul',
    ...ELEMENT_BASE,
    children: items,
  }
}

function numberList(items: LexicalBlockNode[]): LexicalBlockNode {
  return {
    type: 'list',
    listType: 'number',
    start: 1,
    tag: 'ol',
    ...ELEMENT_BASE,
    children: items,
  }
}

function codeBlock(code: string, language: string | null): LexicalBlockNode {
  return {
    type: 'code',
    language,
    ...ELEMENT_BASE,
    format: '',
    children: [textNode(code)],
  }
}

function imageNode(src: string, alt: string): LexicalBlockNode {
  return {
    type: 'image',
    version: 1,
    src,
    alt,
    width: 0,
    alignment: 'center',
  }
}

/** Parse **bold**, *italic*, and plain text into Lexical text nodes. */
export function parseInline(text: string): LexicalNode[] {
  if (!text) return []
  const nodes: LexicalNode[] = []
  // Match **bold**, *italic* (single), or plain runs
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|[^*`]+)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    const part = match[1] ?? ''
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      nodes.push(textNode(part.slice(2, -2), BOLD))
    } else if (part.startsWith('*') && part.endsWith('*') && part.length >= 2 && !part.startsWith('**')) {
      nodes.push(textNode(part.slice(1, -1), ITALIC))
    } else if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      nodes.push(textNode(part.slice(1, -1), 16))
    } else {
      nodes.push(textNode(part))
    }
  }
  return nodes.length ? nodes : [textNode(text)]
}

function parseTable(lines: string[], start: number): { node: LexicalBlockNode; next: number } | null {
  const header = lines[start] ?? ''
  if (!header.includes('|')) return null
  const sep = lines[start + 1] ?? ''
  if (!/^\|?[\s:-]+\|/.test(sep)) return null

  const parseRow = (line: string) =>
    line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim())

  const rows: string[][] = [parseRow(header)]
  let i = start + 2
  while (i < lines.length && (lines[i] ?? '').includes('|') && !(lines[i] ?? '').startsWith('```')) {
    rows.push(parseRow(lines[i] ?? ''))
    i++
  }

  const tableRows: LexicalBlockNode[] = rows.map((cols, rowIndex) => ({
    type: 'tablerow' as const,
    ...ELEMENT_BASE,
    format: '' as const,
    children: cols.map((col) => ({
      type: 'tablecell' as const,
      headerState: rowIndex === 0 ? 1 : 0,
      ...ELEMENT_BASE,
      format: '' as const,
      // Tables stay left-aligned — never justify cell text
      children: [paragraph(parseInline(col), 'left')],
    })),
  }))

  return {
    node: {
      type: 'table',
      ...ELEMENT_BASE,
      children: tableRows,
    },
    next: i,
  }
}

export function markdownToLexical(markdown: string): LexicalEditorState {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const children: LexicalBlockNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i] ?? ''

    if (!line.trim()) {
      i++
      continue
    }

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim() || null
      const codeLines: string[] = []
      i++
      while (i < lines.length && !(lines[i] ?? '').startsWith('```')) {
        codeLines.push(lines[i] ?? '')
        i++
      }
      i++
      children.push(codeBlock(codeLines.join('\n'), lang))
      continue
    }

    const table = parseTable(lines, i)
    if (table) {
      children.push(table.node)
      i = table.next
      continue
    }

    const imageMatch = /^!\[([^\]]*)\]\(([^)]+)\)\s*$/.exec(line.trim())
    if (imageMatch) {
      children.push(imageNode(imageMatch[2]!, imageMatch[1] || 'Image'))
      i++
      // Caption on next line: *Figure 1: ...* or Figure 1: ...
      const captionLine = (lines[i] ?? '').trim()
      const captionMatch =
        /^\*(Figure\s+\d+:.+)\*$/i.exec(captionLine)
        || /^(Figure\s+\d+:.+)$/i.exec(captionLine)
        || /^\*(.+)\*$/.exec(captionLine)
      if (captionMatch) {
        children.push(paragraph(parseInline(`*${captionMatch[1]!.trim()}*`), 'center'))
        i++
      }
      continue
    }

    const headingMatch = /^(#{1,4})\s+(.+)$/.exec(line)
    if (headingMatch) {
      const level = Math.min(headingMatch[1]!.length, 4) as 1 | 2 | 3 | 4
      const tag = (`h${level}` as 'h1' | 'h2' | 'h3' | 'h4')
      children.push(heading(tag, parseInline(headingMatch[2]!)))
      i++
      continue
    }

    if (line.startsWith('> ')) {
      const quoteLines: string[] = []
      while (i < lines.length && (lines[i] ?? '').startsWith('> ')) {
        quoteLines.push((lines[i] ?? '').slice(2))
        i++
      }
      children.push(quote(parseInline(quoteLines.join(' '))))
      continue
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: LexicalBlockNode[] = []
      let n = 1
      while (i < lines.length) {
        const cur = lines[i] ?? ''
        if (!cur.trim()) {
          if (i + 1 < lines.length && /^\s*[-*]\s+/.test(lines[i + 1] ?? '')) {
            i++
            continue
          }
          break
        }
        if (!/^\s*[-*]\s+/.test(cur)) break
        const itemText = cur.replace(/^\s*[-*]\s+/, '')
        items.push(listItem([paragraph(parseInline(itemText))], n++))
        i++
      }
      children.push(bulletList(items))
      continue
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: LexicalBlockNode[] = []
      let n = 1
      while (i < lines.length) {
        const cur = lines[i] ?? ''
        if (!cur.trim()) {
          // Keep one list when items are separated by blank lines
          if (i + 1 < lines.length && /^\s*\d+\.\s+/.test(lines[i + 1] ?? '')) {
            i++
            continue
          }
          break
        }
        if (!/^\s*\d+\.\s+/.test(cur)) break
        const itemText = cur.replace(/^\s*\d+\.\s+/, '')
        items.push(listItem([paragraph(parseInline(itemText))], n++))
        i++
      }
      children.push(numberList(items))
      continue
    }

    const paraLines: string[] = []
    while (
      i < lines.length
      && (lines[i] ?? '').trim()
      && !/^\s*(#{1,4}\s|[-*]\s+|\d+\.\s+|> |```|\|)/.test(lines[i] ?? '')
      && !/^!\[[^\]]*\]\([^)]+\)\s*$/.test((lines[i] ?? '').trim())
    ) {
      paraLines.push(lines[i] ?? '')
      i++
    }
    children.push(paragraph(parseInline(paraLines.join(' '))))
  }

  if (children.length === 0) {
    children.push(paragraph([textNode('')]))
  }

  return {
    root: {
      type: 'root',
      version: 1,
      direction: 'ltr',
      format: '',
      indent: 0,
      children,
    },
  }
}
