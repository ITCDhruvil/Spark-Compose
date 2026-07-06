export type CalloutKind = 'info' | 'warning' | 'error' | 'success'

export type ParsedSlashCommand =
  | { kind: 'table'; rows: number; cols: number; header: boolean }
  | { kind: 'heading'; level: 1 | 2 | 3; title?: string }
  | { kind: 'callout'; type: CalloutKind }
  | { kind: 'checklist'; items: number }
  | { kind: 'cols'; cols: number }

const MAX_TABLE_DIM = 30
const MAX_CHECKLIST_ITEMS = 50

const CALLOUT_ALIASES: Record<string, CalloutKind> = {
  info: 'info',
  warning: 'warning',
  warn: 'warning',
  error: 'error',
  err: 'error',
  success: 'success',
  ok: 'success',
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function parseTable(query: string): ParsedSlashCommand | null {
  // Compact: table3x3, table4+6, table2x5header
  const compact = query.match(/^table(\d+)[x×+](\d+)(header)?$/i)
  if (compact) {
    return {
      kind: 'table',
      rows: clamp(parseInt(compact[1]!, 10), 1, MAX_TABLE_DIM),
      cols: clamp(parseInt(compact[2]!, 10), 1, MAX_TABLE_DIM),
      header: !!compact[3],
    }
  }

  // Compact square: table4
  const compactSquare = query.match(/^table(\d+)$/i)
  if (compactSquare) {
    const n = clamp(parseInt(compactSquare[1]!, 10), 1, MAX_TABLE_DIM)
    return { kind: 'table', rows: n, cols: n, header: false }
  }

  // Spaced: table 3x3, table 4 + 6 header
  const full = query.match(/^table\s+(\d+)\s*[x×+]\s*(\d+)(?:\s+header)?$/i)
  if (full) {
    return {
      kind: 'table',
      rows: clamp(parseInt(full[1]!, 10), 1, MAX_TABLE_DIM),
      cols: clamp(parseInt(full[2]!, 10), 1, MAX_TABLE_DIM),
      header: /\bheader\b/i.test(query),
    }
  }

  const partial = query.match(/^table\s+(\d+)$/i)
  if (partial) {
    const n = clamp(parseInt(partial[1]!, 10), 1, MAX_TABLE_DIM)
    return { kind: 'table', rows: n, cols: n, header: false }
  }

  if (/^table$/i.test(query)) {
    return { kind: 'table', rows: 3, cols: 3, header: true }
  }

  return null
}

function parseHeading(query: string): ParsedSlashCommand | null {
  const compact = query.match(/^h([1-3])$/i)
  if (compact) {
    return { kind: 'heading', level: parseInt(compact[1]!, 10) as 1 | 2 | 3 }
  }

  const m = query.match(/^h([1-3])(?:\s+(.+))?$/i)
  if (!m) return null
  const level = parseInt(m[1]!, 10) as 1 | 2 | 3
  const title = m[2]?.trim()
  return title ? { kind: 'heading', level, title } : { kind: 'heading', level }
}

function parseCallout(query: string): ParsedSlashCommand | null {
  const compact = query.match(/^callout(info|warning|error|success|warn|err|ok)$/i)
  if (compact) {
    const type = CALLOUT_ALIASES[compact[1]!.toLowerCase()]
    if (type) return { kind: 'callout', type }
  }

  const m = query.match(/^callout(?:\s+(\w+))?$/i)
  if (!m) return null
  const raw = m[1]?.toLowerCase()
  if (!raw) return { kind: 'callout', type: 'info' }
  const type = CALLOUT_ALIASES[raw]
  if (!type) return null
  return { kind: 'callout', type }
}

function parseChecklist(query: string): ParsedSlashCommand | null {
  const compact = query.match(/^checklist(\d+)$/i)
  if (compact) {
    return {
      kind: 'checklist',
      items: clamp(parseInt(compact[1]!, 10), 1, MAX_CHECKLIST_ITEMS),
    }
  }

  const m = query.match(/^checklist(?:\s+(\d+))?$/i)
  if (!m) return null
  const items = m[1]
    ? clamp(parseInt(m[1], 10), 1, MAX_CHECKLIST_ITEMS)
    : 3
  return { kind: 'checklist', items }
}

function parseCols(query: string): ParsedSlashCommand | null {
  const compact = query.match(/^cols?(\d+)$/i)
  if (compact) {
    return {
      kind: 'cols',
      cols: clamp(parseInt(compact[1]!, 10), 1, MAX_TABLE_DIM),
    }
  }

  const m = query.match(/^cols?(?:\s+(\d+))?$/i)
  if (!m) return null
  const cols = m[1]
    ? clamp(parseInt(m[1], 10), 1, MAX_TABLE_DIM)
    : 4
  return { kind: 'cols', cols }
}

/** Parse a slash-menu query (text after `/`, no leading slash). */
export function parseSlashQuery(query: string): ParsedSlashCommand | null {
  const q = query.trim()
  if (!q) return null

  return (
    parseTable(q)
    ?? parseHeading(q)
    ?? parseCallout(q)
    ?? parseChecklist(q)
    ?? parseCols(q)
  )
}

/** Base keyword for filtering static slash items (e.g. "table" from "table3x3"). */
export function slashQueryBase(query: string): string {
  const q = query.trim()
  const word = q.split(/\s+/)[0]?.toLowerCase() ?? ''
  const compact = word.match(/^([a-z]+)/i)?.[1] ?? word
  return compact.replace(/\d.*$/, '').toLowerCase() || word
}
