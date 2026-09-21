export type TaskListItem = { text: string; checked: boolean }

export type StructuredBlock =
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'taskList'; items: TaskListItem[] }

export interface PasteLineHint {
  text: string
  fontSizePt?: number
  bold?: boolean
  isListItem?: boolean
  isTaskItem?: boolean
  checked?: boolean
  listType?: 'ul' | 'ol' | 'task'
  headingLevel?: number
}

const BULLET_RE = /^(?:[-•*–—·▪▫◦‣⁃]|\u2022|\u2023|\u2043|\u2219|\u25AA|\u25CF|\u25E6|\u00B7)\s+(.+)$/

export function normalizePasteNewlines(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

export function parseBulletText(line: string): string | null {
  const t = line.trim()
  const m = t.match(BULLET_RE)
  if (m) return m[1].trim()
  const tab = line.match(/^\t+\s*(.+)$/)
  return tab ? tab[1].trim() : null
}

export function parseNumberedText(line: string): { num: number; label: string } | null {
  const m = line.trim().match(/^(\d+)[.)]\s+(.+)$/)
  if (!m) return null
  return { num: parseInt(m[1], 10), label: m[2].trim() }
}

const CHECKED_PREFIX_RE = /^[\u2611\u2612\u25A0\u2713\u2714☑■✓✔]\s*/
const UNCHECKED_PREFIX_RE = /^[\u2610\u25A1☐□]\s*/

/** Parse markdown / symbol checkbox prefixes: `[x] item`, `☑ item`, etc. */
export function parseCheckboxText(line: string): { text: string; checked: boolean } | null {
  const t = line.trim()
  const bracket = t.match(/^\[(x|X| )\]\s+(.+)$/)
  if (bracket) {
    return { text: bracket[2].trim(), checked: bracket[1].toLowerCase() === 'x' }
  }
  if (CHECKED_PREFIX_RE.test(t)) {
    return { text: t.replace(CHECKED_PREFIX_RE, '').trim(), checked: true }
  }
  if (UNCHECKED_PREFIX_RE.test(t)) {
    return { text: t.replace(UNCHECKED_PREFIX_RE, '').trim(), checked: false }
  }
  return null
}

export function htmlContainsChecklist(html: string): boolean {
  return /<input[^>]+type=["']?checkbox/i.test(html)
    || /data-type=["']taskItem/i.test(html)
    || /role=["']checkbox/i.test(html)
}

function extractListItemText(li: Element): string {
  const clone = li.cloneNode(true) as Element
  clone.querySelectorAll('input, [role="checkbox"], label').forEach((n) => n.remove())
  return (clone.textContent ?? '').replace(/\u00a0/g, ' ').trim()
}

function taskStateFromElement(el: Element): boolean | null {
  if (el.getAttribute('data-type') === 'taskItem') {
    return el.getAttribute('data-checked') === 'true'
  }

  const checkbox = el.querySelector('input[type="checkbox"]')
  if (checkbox instanceof HTMLInputElement) return checkbox.checked

  const roleCb = el.querySelector('[role="checkbox"]')
  if (roleCb) {
    const aria = roleCb.getAttribute('aria-checked')
    if (aria === 'true') return true
    if (aria === 'false') return false
  }

  if (
    el.querySelector('s, strike, del')
    || el.querySelector('[style*="line-through" i]')
  ) {
    return true
  }

  return null
}

function taskListItemsFromList(list: Element): TaskListItem[] | null {
  const lis = [...list.querySelectorAll(':scope > li')]
  if (!lis.length) return null

  const states = lis.map((li) => taskStateFromElement(li))
  const hasCheckbox = lis.some((li) =>
    li.querySelector('input[type="checkbox"], [role="checkbox"]')
    || li.getAttribute('data-type') === 'taskItem',
  )

  if (!hasCheckbox && states.filter((s) => s !== null).length < 2) return null

  return lis.map((li, idx) => ({
    text: extractListItemText(li),
    checked: states[idx] ?? false,
  })).filter((item) => item.text)
}

function taskListToHtml(items: TaskListItem[]): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<ul data-type="taskList">${
    items.map((item) =>
      `<li data-type="taskItem" data-checked="${item.checked ? 'true' : 'false'}"><p>${esc(item.text)}</p></li>`,
    ).join('')
  }</ul>`
}

/** Convert pasted HTML lists with checkboxes into TipTap task-list markup. */
export function normalizeChecklistHtml(html: string): string {
  if (typeof document === 'undefined' || !html.trim()) return html
  if (!htmlContainsChecklist(html) && !/data-type=["']taskList/i.test(html)) return html

  const root = document.createElement('div')
  root.innerHTML = html

  root.querySelectorAll('ul, ol').forEach((list) => {
    if (list.getAttribute('data-type') === 'taskList') return
    const items = taskListItemsFromList(list)
    if (!items?.length) return

    const taskList = document.createElement('ul')
    taskList.setAttribute('data-type', 'taskList')
    items.forEach((item) => {
      const li = document.createElement('li')
      li.setAttribute('data-type', 'taskItem')
      li.setAttribute('data-checked', item.checked ? 'true' : 'false')
      const p = document.createElement('p')
      p.textContent = item.text
      li.appendChild(p)
      taskList.appendChild(li)
    })
    list.replaceWith(taskList)
  })

  return root.innerHTML
}

/** True for Word-style inline list phrases like "this is bullet point 3". */
export function isBulletPointPhrase(text: string): boolean {
  return /\b(?:this is )?bullet\s*point\s*\d+\b/i.test(text.trim())
}

/** Split one line that contains multiple inline "bullet point N" phrases. */
export function splitInlineBulletItems(line: string): string[] | null {
  const t = line.trim()
  if (!t) return null

  const thisIsBulletRe = /\bthis is bullet point\s*\d+\b/gi
  const thisIsMatches = [...t.matchAll(thisIsBulletRe)]
  if (thisIsMatches.length >= 2) {
    return thisIsMatches.map((m) => m[0].trim())
  }

  const bulletOnlyRe = /\bbullet point\s*\d+\b/gi
  const bulletMatches = [...t.matchAll(bulletOnlyRe)]
  if (bulletMatches.length >= 2) {
    return bulletMatches.map((m) => m[0].trim())
  }

  const dashParts = t.split(/\s+-\s+/).map((s) => s.trim()).filter(Boolean)
  if (dashParts.length >= 2 && dashParts.every((p) => p.length < 200)) {
    return dashParts
  }

  return null
}

/** Split one line with inline numbered items: "1. foo 2. bar" */
export function splitInlineNumberedLines(line: string): string[] | null {
  const t = line.trim()
  if (!/\d+[.)]\s+\S/.test(t)) return null
  const markers = [...t.matchAll(/\d+[.)]\s+/g)]
  if (markers.length < 2) return null
  const parts = t
    .split(/\s+(?=\d+[.)]\s+)/)
    .map((s) => s.trim())
    .filter(Boolean)
  return parts.length >= 2 ? parts : null
}

function isSubtitleLine(text: string): boolean {
  return /\b(sub\s*-?\s*title|subtitle)\b/i.test(text.trim())
}

function isTitleLine(text: string): boolean {
  const t = text.trim()
  return /^this is (a )?title$/i.test(t) || /^title$/i.test(t)
}

function expandPasteLines(text: string): string[] {
  const out: string[] = []
  for (const raw of normalizePasteNewlines(text).split('\n')) {
    const trimmed = raw.trim()
    if (!trimmed) {
      out.push('')
      continue
    }
    const bullets = splitInlineBulletItems(trimmed)
    if (bullets) {
      out.push(...bullets)
      continue
    }
    const numbered = splitInlineNumberedLines(trimmed)
    if (numbered) {
      out.push(...numbered)
      continue
    }
    out.push(raw)
  }
  return out
}

function median(values: number[]): number | undefined {
  if (!values.length) return undefined
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

type LineKind = 'h1' | 'h2' | 'h3' | 'p' | 'ul' | 'ol' | 'taskList'

function scoreLineKind(
  text: string,
  index: number,
  lines: string[],
  hint: PasteLineHint | undefined,
  bodyFontPt: number,
): { kind: LineKind; score: number }[] {
  const t = text.trim()
  const words = t.split(/\s+/).filter(Boolean).length
  const next = lines.slice(index + 1).find((l) => l.trim())?.trim() ?? null

  const scores: Record<LineKind, number> = {
    h1: 0, h2: 0, h3: 0, p: 0, ul: 0, ol: 0, taskList: 0,
  }

  if (hint?.headingLevel === 1) scores.h1 += 12
  if (hint?.headingLevel === 2) scores.h2 += 12
  if (hint?.headingLevel === 3) scores.h3 += 10
  if (hint?.isTaskItem || hint?.listType === 'task') scores.taskList += 18
  if (hint?.checked !== undefined && (hint?.isTaskItem || hint?.isListItem)) scores.taskList += 14
  if (hint?.isListItem || hint?.listType === 'ul') scores.ul += 12
  if (hint?.listType === 'ol') scores.ol += 12

  if (hint?.fontSizePt) {
    const delta = hint.fontSizePt - bodyFontPt
    if (delta >= 6) scores.h1 += 10
    else if (delta >= 3) scores.h2 += 8
    else if (delta >= 1.5) scores.h3 += 6
  }

  if (hint?.bold && t.length <= 90) {
    if (index === 0) scores.h1 += 10
    else scores.h2 += 4
  }

  if (isTitleLine(t)) scores.h1 += 20
  if (isSubtitleLine(t)) scores.h3 += 16

  if (parseBulletText(t)) scores.ul += 14
  if (isBulletPointPhrase(t)) scores.ul += 14
  if (splitInlineBulletItems(t)) scores.ul += 18
  if (parseCheckboxText(t)) scores.taskList += 18
  const numbered = parseNumberedText(t)
  if (numbered) {
    const nxt = lines.slice(index + 1).find((l) => l.trim())
    const nxtNum = nxt ? parseNumberedText(nxt) : null
    if (nxtNum && nxtNum.num === numbered.num + 1) scores.ol += 14
    else if (numbered.label.length <= 72 && numbered.label.split(/\s+/).length <= 6) scores.h2 += 10
    else scores.ol += 8
  }

  if (index === 0 && hint?.fontSizePt && hint.fontSizePt >= bodyFontPt + 4) scores.h1 += 15
  if (index === 0 && t.length <= 120 && !/[.!?]$/.test(t) && words <= 14) scores.h1 += 8
  if (t === t.toUpperCase() && t.length < 80 && /[A-Z]/.test(t)) scores.h3 += 9
  if (/:\s*$/.test(t) && t.length < 100) scores.h3 += 7

  if (index > 0 && next && t.length <= 72 && !/[.!?]$/.test(t) && words <= 8) {
    if (next.length >= t.length + 10 || (next.endsWith('.') && next.split(/\s+/).length >= 6)) {
      scores.h2 += 7
    }
  }

  if (t.endsWith('.') && words >= 6) scores.p += 8
  if (t.length > 90) scores.p += 5
  scores.p += 3

  return (Object.keys(scores) as LineKind[]).map((kind) => ({ kind, score: scores[kind] }))
}

function pickKind(scored: { kind: LineKind; score: number }[]): LineKind {
  const best = scored.reduce((a, b) => (b.score > a.score ? b : a))
  if (
    best.kind === 'ul' || best.kind === 'ol' || best.kind === 'taskList'
    || best.kind === 'h1' || best.kind === 'h2' || best.kind === 'h3'
  ) {
    return best.kind
  }
  return 'p'
}

/** Classify plain lines (+ optional Word hints) into document blocks. */
export function classifyPasteLines(
  text: string,
  hints: PasteLineHint[] = [],
): StructuredBlock[] {
  const expanded = expandPasteLines(text)
  const lines = expanded.map((l) => l.trimEnd())
  const nonEmpty = lines.map((l) => l.trim()).filter(Boolean)
  if (!nonEmpty.length) return []

  const fontSizes = hints.map((h) => h.fontSizePt).filter((n): n is number => n != null && n > 0)
  const bodyFontPt = median(fontSizes) ?? 11

  const blocks: StructuredBlock[] = []
  let lineHintIndex = 0
  let i = 0
  const trimmedLines = lines.map((l) => l.trim())
  const nonEmptyIndices = trimmedLines.map((l, idx) => (l ? idx : -1)).filter((idx) => idx >= 0)

  const hintForLine = (lineIndex: number, text: string): PasteLineHint | undefined => {
    if (hints[lineHintIndex]?.text.trim() === text.trim()) {
      return hints[lineHintIndex++]
    }
    const byText = hints.find((h) => h.text.trim() === text.trim())
    if (byText) {
      const at = hints.indexOf(byText)
      if (at >= lineHintIndex) lineHintIndex = at + 1
    }
    return byText
  }

  while (i < lines.length) {
    const trimmed = lines[i].trim()
    if (!trimmed) {
      i++
      continue
    }

    const lineIndex = nonEmptyIndices.indexOf(i)
    const hint = hintForLine(lineIndex, trimmed)

    const kind = pickKind(scoreLineKind(trimmed, i, lines, hint, bodyFontPt))

    const inlineBullets = splitInlineBulletItems(trimmed)
    if (inlineBullets && inlineBullets.length >= 2) {
      blocks.push({ type: 'ul', items: inlineBullets })
      i++
      continue
    }

    const inlineNumbered = splitInlineNumberedLines(trimmed)
    if (inlineNumbered && inlineNumbered.length >= 2) {
      const items = inlineNumbered
        .map((l) => parseNumberedText(l)?.label ?? l)
        .filter(Boolean)
      if (items.length >= 2) {
        blocks.push({ type: 'ol', items })
        i++
        continue
      }
    }

    if (kind === 'taskList' || parseCheckboxText(trimmed) || hint?.isTaskItem || hint?.listType === 'task') {
      const items: TaskListItem[] = []
      while (i < lines.length) {
        const t = lines[i].trim()
        if (!t) break
        const h = hintForLine(nonEmptyIndices.indexOf(i), t)
        const checkbox = parseCheckboxText(lines[i])
        const isItem = checkbox
          || h?.isTaskItem
          || h?.listType === 'task'
          || (h?.isListItem && h?.checked !== undefined)
        if (!isItem) break
        items.push({
          text: checkbox?.text ?? parseBulletText(lines[i]) ?? t,
          checked: checkbox?.checked ?? h?.checked ?? false,
        })
        i++
        if (hints[lineHintIndex - 1]?.text.trim() === t) continue
        const hMatch = hints.find((hintItem) => hintItem.text.trim() === t)
        if (hMatch) lineHintIndex = hints.indexOf(hMatch) + 1
      }
      if (items.length) blocks.push({ type: 'taskList', items })
      continue
    }

    if (kind === 'ul') {
      const items: string[] = []
      while (i < lines.length) {
        const t = lines[i].trim()
        if (!t) break
        const bullet = parseBulletText(lines[i])
        const h = hintForLine(nonEmptyIndices.indexOf(i), t)
        const isItem = bullet || h?.isListItem || h?.listType === 'ul' || isBulletPointPhrase(t)
        if (!isItem) break
        items.push(bullet ?? t)
        i++
        if (hints[lineHintIndex - 1]?.text.trim() === t) continue
        const hMatch = hints.find((h) => h.text.trim() === t)
        if (hMatch) lineHintIndex = hints.indexOf(hMatch) + 1
      }
      if (items.length) blocks.push({ type: 'ul', items })
      continue
    }

    if (kind === 'ol') {
      const items: string[] = []
      let expected = parseNumberedText(lines[i])?.num
      while (i < lines.length) {
        const n = parseNumberedText(lines[i])
        if (!n) break
        if (expected != null && n.num !== expected) break
        items.push(n.label)
        expected = n.num + 1
        i++
      }
      if (items.length) blocks.push({ type: 'ol', items })
      continue
    }

    if (kind === 'h1') {
      blocks.push({ type: 'h1', text: trimmed })
      i++
      continue
    }
    if (kind === 'h2') {
      const numbered = parseNumberedText(trimmed)
      blocks.push({ type: 'h2', text: numbered?.label ?? trimmed.replace(/:\s*$/, '') })
      i++
      continue
    }
    if (kind === 'h3' || isSubtitleLine(trimmed)) {
      blocks.push({ type: 'h3', text: trimmed.replace(/:\s*$/, '') })
      i++
      continue
    }

    const para: string[] = [trimmed]
    i++
    while (i < lines.length) {
      const t = lines[i].trim()
      if (!t) break
      const nextKind = pickKind(scoreLineKind(t, i, lines, hintForLine(nonEmptyIndices.indexOf(i), t), bodyFontPt))
      if (nextKind !== 'p') break
      para.push(t)
      i++
    }
    blocks.push({ type: 'p', text: para.join(' ') })
  }

  return blocks
}

export function structuredBlocksToHtml(blocks: StructuredBlock[]): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return blocks.map((b) => {
    switch (b.type) {
      case 'h1': return `<h1>${esc(b.text)}</h1>`
      case 'h2': return `<h2>${esc(b.text)}</h2>`
      case 'h3': return `<h3>${esc(b.text)}</h3>`
      case 'p': return `<p>${esc(b.text)}</p>`
      case 'ul': return `<ul>${b.items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`
      case 'ol': return `<ol>${b.items.map((item) => `<li>${esc(item)}</li>`).join('')}</ol>`
      case 'taskList': return taskListToHtml(b.items)
      default: return ''
    }
  }).join('\n')
}

export function classifyPasteToHtml(text: string, hints: PasteLineHint[] = []): string {
  return structuredBlocksToHtml(classifyPasteLines(text, hints))
}

function fontSizeFromStyle(style: string, className: string): number | undefined {
  const fs = style.match(/font-size:\s*([\d.]+)\s*(pt|px)/i)
  if (fs) {
    let pt = parseFloat(fs[1])
    if (fs[2].toLowerCase() === 'px') pt *= 0.75
    return pt
  }
  if (/MsoTitle/i.test(className)) return 20
  if (/MsoHeading1|Heading1/i.test(className)) return 16
  if (/MsoHeading2|Heading2/i.test(className)) return 14
  if (/MsoHeading3|Heading3/i.test(className)) return 12
  return undefined
}

function hintFromElement(el: Element): PasteLineHint | null {
  const text = (el.textContent ?? '').replace(/\u00a0/g, ' ').trim()
  if (!text) return null

  const tag = el.tagName.toLowerCase()
  const style = el.getAttribute('style') ?? ''
  const className = el.getAttribute('class') ?? ''

  const hint: PasteLineHint = { text }

  if (/^h([1-6])$/.test(tag)) hint.headingLevel = parseInt(tag[1], 10) as 1 | 2 | 3 | 4 | 5 | 6
  if (tag === 'li') {
    hint.isListItem = true
    const taskState = taskStateFromElement(el)
    if (taskState !== null || el.querySelector('input[type="checkbox"], [role="checkbox"]')) {
      hint.isTaskItem = true
      hint.listType = 'task'
      hint.checked = taskState ?? false
      hint.text = extractListItemText(el)
    } else {
      hint.listType = el.parentElement?.tagName.toLowerCase() === 'ol' ? 'ol' : 'ul'
    }
  }

  const fontSizePt = fontSizeFromStyle(style, className)
  if (fontSizePt) hint.fontSizePt = fontSizePt

  if (/MsoListParagraph/i.test(className) || /mso-list:/i.test(style)) {
    hint.isListItem = true
    if (!hint.listType) hint.listType = 'ul'
  }

  hint.bold = !!(
    el.querySelector('b,strong')
    || /font-weight:\s*(bold|700|600)/i.test(style)
    || /<b>|<strong>/i.test(el.innerHTML)
  )

  return hint
}

/** Extract per-line hints from Word / browser HTML (runs in browser). */
export function extractLineHintsFromHtml(html: string): PasteLineHint[] {
  if (typeof document === 'undefined' || !html.trim()) return []

  const root = document.createElement('div')
  root.innerHTML = html

  const hints: PasteLineHint[] = []
  const nodes = root.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,div')

  nodes.forEach((el) => {
    const tag = el.tagName.toLowerCase()
    if (tag === 'p' || tag === 'div') {
      const inner = el.innerHTML
      if (/<br\s*\/?>/i.test(inner)) {
        const parts = inner.split(/<br\s*\/?>/i)
        parts.forEach((part) => {
          const tmp = document.createElement('div')
          tmp.innerHTML = part
          const text = (tmp.textContent ?? '').replace(/\u00a0/g, ' ').trim()
          if (!text) return
          const base = hintFromElement(el)
          hints.push({ ...base, text, isListItem: base?.isListItem || !!parseBulletText(text) })
        })
        return
      }
      const hint = hintFromElement(el)
      if (!hint) return
      const inlineBullets = splitInlineBulletItems(hint.text)
      if (inlineBullets) {
        inlineBullets.forEach((item) => {
          hints.push({ text: item, isListItem: true, listType: 'ul', bold: hint.bold })
        })
        return
      }
      if (hints.length === 0 && hint.bold && hint.text.length <= 80) {
        hint.headingLevel = 1
      }
      hints.push(hint)
      return
    }
    const hint = hintFromElement(el)
    if (hint) hints.push(hint)
  })

  return hints
}
