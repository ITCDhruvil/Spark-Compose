/** Find a document position to insert enhancement content after a matching section. */
export function findEnhanceInsertPos(
  doc: { forEach: (fn: (node: { type: { name: string }; textContent: string; nodeSize: number; attrs: Record<string, unknown> }, offset: number) => void) => void; content: { size: number } },
  afterHeading?: string,
): number {
  const end = doc.content.size
  const needle = afterHeading?.trim().toLowerCase()
  if (!needle) return end

  type Top = { text: string; level: number; pos: number; size: number; isHeading: boolean }
  const tops: Top[] = []
  doc.forEach((node, offset) => {
    const isHeading = node.type.name === 'heading'
    tops.push({
      text: node.textContent.trim().toLowerCase(),
      level: isHeading ? Number(node.attrs.level ?? 2) : 99,
      pos: offset,
      size: node.nodeSize,
      isHeading,
    })
  })

  const scoreMatch = (headingText: string): number => {
    if (!headingText) return 0
    if (headingText === needle) return 100
    if (headingText.includes(needle) || needle.includes(headingText)) return 80
    const needleWords = needle.split(/\s+/).filter((w) => w.length > 3)
    if (!needleWords.length) return 0
    const hits = needleWords.filter((w) => headingText.includes(w)).length
    return (hits / needleWords.length) * 60
  }

  let bestIdx = -1
  let bestScore = 0
  for (let i = 0; i < tops.length; i++) {
    const t = tops[i]!
    if (!t.isHeading) continue
    const score = scoreMatch(t.text)
    if (score > bestScore) {
      bestScore = score
      bestIdx = i
    }
  }

  if (bestIdx < 0 || bestScore < 30) return end

  const sectionLevel = tops[bestIdx]!.level
  for (let j = bestIdx + 1; j < tops.length; j++) {
    const n = tops[j]!
    if (n.isHeading && n.level <= sectionLevel) {
      return n.pos
    }
  }
  return end
}

/** Soft-fix third-person coach copy into second person. */
export function toSecondPersonSummary(text: string, kind: 'asked' | 'draft' = 'asked'): string {
  let s = text.trim()
  if (!s) return s
  s = s
    .replace(/\b[Tt]he user aimed to\b/g, 'You wanted to')
    .replace(/\b[Tt]he user wanted to\b/g, 'You wanted to')
    .replace(/\b[Tt]he user asked to\b/g, 'You asked to')
    .replace(/\b[Tt]he user aimed\b/g, 'You aimed')
    .replace(/\b[Tt]he user's\b/g, 'Your')
    .replace(/\b[Tt]he user\b/g, 'You')
    .replace(/\bTheir draft\b/g, 'Your draft')
    .replace(/\b[Tt]he draft currently covers\b/g, 'Your draft currently covers')
    .replace(/\b[Tt]he draft covers\b/g, 'Your draft covers')

  if (/^(you|your)\b/i.test(s)) return s

  if (kind === 'draft') {
    return `Your draft currently covers ${s.charAt(0).toLowerCase()}${s.slice(1)}`
  }
  return `You asked to ${s.charAt(0).toLowerCase()}${s.slice(1)}`
}

/** Strip meta coaching lines from insert markdown if the model slips. */
export function sanitizeInsertMarkdown(md: string, fallbackTitle?: string): string {
  let text = md.trim()
  if (!text) {
    return fallbackTitle ? `## ${fallbackTitle}\n\n` : ''
  }

  const metaLine = /^(include|consider adding|add a section|highlight|you should|try adding)\b/i
  const lines = text.split('\n')
  const cleaned = lines.filter((line) => {
    const t = line.trim()
    if (!t) return true
    if (metaLine.test(t) && !t.startsWith('#')) return false
    if (/^#+\s*(include|consider adding|add a section|highlight)\b/i.test(t)) return false
    return true
  })
  text = cleaned.join('\n').trim()

  if (!/^#{1,4}\s/m.test(text) && fallbackTitle) {
    const cleanTitle = fallbackTitle
      .replace(/^(include|consider adding|add)\b[:\s]*/i, '')
      .replace(/\b(a )?section on\b/i, '')
      .trim() || fallbackTitle
    text = `## ${cleanTitle}\n\n${text}`
  }

  return text
}
