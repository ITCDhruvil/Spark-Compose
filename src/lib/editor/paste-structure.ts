import { parseEmbedUrl } from '@/components/editor/extensions/video-embed'

const IMAGE_URL_RE = /\.(png|jpe?g|gif|webp|svg|bmp|avif)(\?[^\s]*)?$/i

export type PasteUrlKind = 'video' | 'image'

export interface PasteUrlTarget {
  kind: PasteUrlKind
  url: string
}

/** Single-line http(s) URL suitable for embed or image insert. */
export function parsePasteUrl(text: string): PasteUrlTarget | null {
  const trimmed = text.trim()
  if (!trimmed || /\s/.test(trimmed)) return null
  if (!/^https?:\/\//i.test(trimmed)) return null

  if (parseEmbedUrl(trimmed)) {
    return { kind: 'video', url: trimmed }
  }
  if (IMAGE_URL_RE.test(trimmed)) {
    return { kind: 'image', url: trimmed }
  }
  return null
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

/** Tab- or comma-separated values with consistent column counts (Excel / Sheets). */
export function looksLikeCsv(text: string): boolean {
  const lines = text.replace(/\r\n/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return false
  if (lines.some((l) => /^\|.+\|$/.test(l))) return false

  const delim = detectDelimiter(lines)
  if (!delim) return false

  const counts = lines.map((l) => splitDelimitedRow(l, delim).length)
  const first = counts[0] ?? 0
  return first >= 2 && counts.every((c) => c === first)
}

/** GitHub-style pipe table (at least header + separator or 2 data rows). */
export function looksLikePipeTable(text: string): boolean {
  const lines = text.replace(/\r\n/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return false
  const pipeLines = lines.filter((l) => /^\|.+\|$/.test(l))
  if (pipeLines.length < 2) return false
  const isSep = (r: string) => /^\|[\s|:-]+\|$/.test(r)
  return pipeLines.length >= 2 && (pipeLines.some(isSep) || pipeLines.length >= 2)
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function csvToHtml(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean)
  const delim = detectDelimiter(lines)
  if (!delim) return ''

  const rows = lines.map((l) => splitDelimitedRow(l, delim))
  const [head, ...body] = rows
  if (!head?.length) return ''

  const ths = head.map((c) => `<th>${escHtml(c)}</th>`).join('')
  const trs = body.map((r) =>
    `<tr>${r.map((c) => `<td>${escHtml(c)}</td>`).join('')}</tr>`,
  ).join('')
  return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`
}

export function pipeTableToHtml(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean)
  const isSep = (r: string) => /^\|[\s|:-]+\|$/.test(r)
  const data = lines.filter((l) => /^\|.+\|$/.test(l) && !isSep(l))
  if (data.length === 0) return ''

  const cells = (r: string) =>
    r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim())

  const [head, ...body] = data
  const ths = cells(head!).map((c) => `<th>${escHtml(c)}</th>`).join('')
  const trs = body.map((r) =>
    `<tr>${cells(r).map((c) => `<td>${escHtml(c)}</td>`).join('')}</tr>`,
  ).join('')
  return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`
}
