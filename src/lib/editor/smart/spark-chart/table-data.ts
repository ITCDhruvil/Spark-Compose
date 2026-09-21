import { findParentNode } from '@tiptap/core'
import type { Editor } from '@tiptap/core'
import { looksLikeCsv } from '../smart-paste/paste-structure'

export interface TableData {
  headers: string[]
  rows: string[][]
  /** Document position of the table node */
  pos: number
  /** End position (exclusive) of the table node */
  end: number
}

export function parseNumericValue(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replace(/[£$€%,]/g, '')
    .replace(/\s+/g, '')
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function cellText(node: { textContent: string }): string {
  return node.textContent.trim()
}

/** Extract the table enclosing the current selection, if any. */
export function extractTableAtSelection(editor: Editor): TableData | null {
  const { selection } = editor.state
  const match = findParentNode((node) => node.type.name === 'table')(selection)
  if (!match) return null

  const headers: string[] = []
  const rows: string[][] = []
  let rowIndex = 0

  match.node.forEach((row) => {
    const cells: string[] = []
    let hasHeaderCell = false
    row.forEach((cell) => {
      if (cell.type.name === 'tableHeader') hasHeaderCell = true
      cells.push(cellText(cell))
    })
    if (rowIndex === 0 && hasHeaderCell) {
      headers.push(...cells)
    } else {
      rows.push(cells)
    }
    rowIndex++
  })

  if (!headers.length && rows.length) {
    const [first, ...rest] = rows
    headers.push(...(first ?? []).map((_, i) => `Column ${i + 1}`))
    rows.splice(0, 1, ...rest)
  }

  if (!headers.length) return null

  const normalized = rows
    .map((row) => {
      const cells = [...row]
      while (cells.length < headers.length) cells.push('')
      return cells.slice(0, headers.length)
    })
    .filter((row) => row.some(Boolean))

  return {
    headers,
    rows: normalized,
    pos: match.pos,
    end: match.pos + match.node.nodeSize,
  }
}

function splitDelimitedRow(line: string, delim: '\t' | ','): string[] {
  if (delim === '\t') return line.split('\t').map((c) => c.trim())

  const cells: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (ch === ',' && !inQuotes) {
      cells.push(current.trim())
      current = ''
      continue
    }
    current += ch
  }
  cells.push(current.trim())
  return cells
}

function detectDelimiter(lines: string[]): '\t' | ',' | null {
  const tabCounts = lines.map((l) => (l.match(/\t/g) ?? []).length)
  const commaCounts = lines.map((l) => (l.match(/,/g) ?? []).length)
  const tabCols = tabCounts[0] ?? 0
  if (tabCols >= 1 && tabCounts.every((c) => c === tabCols)) return '\t'
  const commaCols = commaCounts[0] ?? 0
  if (commaCols >= 1 && commaCounts.every((c) => c === commaCols)) return ','
  return null
}

/** Parse CSV/TSV text into table data (for progress analytics on pasted data). */
export function parseDelimitedText(text: string): TableData | null {
  if (!looksLikeCsv(text)) return null
  const lines = text.replace(/\r\n/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean)
  const delim = detectDelimiter(lines)
  if (!delim) return null
  const rows = lines.map((l) => splitDelimitedRow(l, delim))
  const [head, ...body] = rows
  if (!head?.length) return null
  return {
    headers: head,
    rows: body.filter((r) => r.some(Boolean)),
    pos: -1,
    end: -1,
  }
}

export function tableToCsv(table: TableData): string {
  const esc = (s: string) => (s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s)
  const lines = [
    table.headers.map(esc).join(','),
    ...table.rows.map((r) => r.map(esc).join(',')),
  ]
  return lines.join('\n')
}

export function getContextText(editor: Editor): string {
  const table = extractTableAtSelection(editor)
  if (table) return tableToCsv(table)
  const { from, to, empty } = editor.state.selection
  if (!empty) return editor.state.doc.textBetween(from, to, '\n').trim()
  return editor.getText().trim()
}
