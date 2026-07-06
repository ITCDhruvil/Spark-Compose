import type { Editor } from '@tiptap/core'

export interface HeadingRef {
  level: 1 | 2 | 3
  text: string
  pos: number
}

/** Headings before and after a document position (block start). */
export function collectHeadingContext(editor: Editor, atPos: number): {
  prev: HeadingRef[]
  next: HeadingRef[]
} {
  const prev: HeadingRef[] = []
  const next: HeadingRef[] = []

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'heading') return
    const level = Math.min(3, Math.max(1, Number(node.attrs.level) || 2)) as 1 | 2 | 3
    const item: HeadingRef = { level, text: node.textContent, pos }
    if (pos + node.nodeSize <= atPos) prev.push(item)
    else if (pos >= atPos) next.push(item)
  })

  return { prev, next }
}

/**
 * Pick H1–H3 from surrounding outline:
 * - no neighbors → H2 (body section)
 * - after Hn → prefer same level (sibling section), never jump more than +1
 * - respect the next heading so we don't outrank an upcoming higher section oddly
 */
export function smartHeadingLevel(prev: HeadingRef[], next: HeadingRef[]): 1 | 2 | 3 {
  const prevLevel = prev.at(-1)?.level ?? null
  const nextLevel = next[0]?.level ?? null

  if (prevLevel === null && nextLevel === null) return 2
  if (prevLevel === null) {
    // Content before the first heading — top-level or one above the next section
    if (nextLevel === 1) return 1
    return 1
  }

  let level: number = prevLevel

  if (nextLevel !== null) {
    if (nextLevel === prevLevel) {
      level = prevLevel
    } else if (nextLevel > prevLevel) {
      // Deeper section follows — stay a sibling of previous
      level = prevLevel
    } else {
      // Higher-rank section follows — align with it or one below previous
      level = Math.min(prevLevel, nextLevel)
    }
  }

  return Math.min(3, Math.max(1, level)) as 1 | 2 | 3
}

/** Blend model suggestion with local outline rules. */
export function resolveHeadingLevel(
  suggested: number | undefined,
  prev: HeadingRef[],
  next: HeadingRef[],
): 1 | 2 | 3 {
  const fallback = smartHeadingLevel(prev, next)
  if (suggested == null || Number.isNaN(suggested)) return fallback

  let level = Math.min(3, Math.max(1, Math.round(suggested)))
  const prevLevel = prev.at(-1)?.level

  // Never skip more than one level deeper than the previous heading
  if (prevLevel != null && level > prevLevel + 1) {
    level = prevLevel + 1
  }

  // Prefer not to introduce a second H1 when one already exists just above
  if (level === 1 && prevLevel === 1) {
    level = 2
  }

  return Math.min(3, Math.max(1, level)) as 1 | 2 | 3
}

/** Start position of the textblock containing the selection (for inserting a heading above it). */
export function blockStartPos(editor: Editor): number | null {
  const { $from, empty } = editor.state.selection
  if (empty) return null

  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).isTextblock) {
      return $from.before(d)
    }
  }
  return null
}

/** End position of the textblock containing the selection (for inserting content below it). */
export function blockEndPos(editor: Editor): number | null {
  const { $from, empty } = editor.state.selection
  if (empty) return null

  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).isTextblock) {
      return $from.after(d)
    }
  }
  return null
}

/**
 * Consecutive heading nodes immediately above the selected paragraph
 * (no other blocks in between).
 */
export function adjacentHeadingsAbove(editor: Editor): {
  paraStart: number
  /** Start pos of the first heading in the run, or paraStart if none */
  runStart: number
  headings: HeadingRef[]
} | null {
  const paraStart = blockStartPos(editor)
  if (paraStart == null) return null

  const $para = editor.state.doc.resolve(paraStart)
  const parent = $para.parent
  const index = $para.index()
  const headings: HeadingRef[] = []

  let runStartIndex = index
  for (let i = index - 1; i >= 0; i--) {
    const child = parent.child(i)
    if (child.type.name !== 'heading') break
    runStartIndex = i
    const level = Math.min(3, Math.max(1, Number(child.attrs.level) || 2)) as 1 | 2 | 3
    headings.unshift({ level, text: child.textContent, pos: 0 })
  }

  // Resolve absolute positions for the run
  let pos = $para.start()
  for (let i = 0; i < runStartIndex; i++) {
    pos += parent.child(i).nodeSize
  }
  const runStart = pos

  let headingPos = runStart
  for (let i = 0; i < headings.length; i++) {
    headings[i] = { ...headings[i], pos: headingPos }
    headingPos += parent.child(runStartIndex + i).nodeSize
  }

  return { paraStart, runStart: headings.length ? runStart : paraStart, headings }
}

/**
 * Where to insert a title vs subtitle above the selected paragraph.
 * - heading (title): above any adjacent subtitles/titles already stacked on this para
 * - subtitle: directly above the paragraph (below an existing title in that stack)
 */
export function titleInsertPos(
  editor: Editor,
  kind: 'heading' | 'subtitle',
): number | null {
  const adj = adjacentHeadingsAbove(editor)
  if (!adj) return null

  if (kind === 'subtitle') {
    // Sit just above the paragraph, under any existing title in the stack
    return adj.paraStart
  }

  // Title goes at the top of the adjacent heading stack
  return adj.runStart
}

/** Subtitle sits one level deeper than a normal section heading. */
export function smartSubtitleLevel(prev: HeadingRef[], next: HeadingRef[]): 1 | 2 | 3 {
  const base = smartHeadingLevel(prev, next)
  return Math.min(3, Math.max(2, base + 1)) as 1 | 2 | 3
}
