const FONT_SIZE_PT_RE = /^([\d.]+)pt$/i

/** Font size must use half-point steps only (e.g. 11, 11.5 — not 11.6 or 11.623). */
export function isValidCustomFontSizePt(input: string): boolean {
  const trimmed = input.trim()
  if (!trimmed) return false
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 1 || n > 400) return false
  return Math.abs(n * 2 - Math.round(n * 2)) < 1e-9
}

export function fontSizePtToCSSValue(input: string): string | null {
  if (!isValidCustomFontSizePt(input)) return null
  const n = Math.round(Number(input.trim()) * 2) / 2
  return Number.isInteger(n) ? `${n}pt` : `${n.toFixed(1)}pt`
}

export function labelFromFontSizeAttr(fontSize: string | undefined | null): string {
  if (!fontSize) return '11'
  const m = FONT_SIZE_PT_RE.exec(fontSize.trim())
  if (!m) return '11'
  const n = Number(m[1])
  if (!Number.isFinite(n)) return '11'
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}
