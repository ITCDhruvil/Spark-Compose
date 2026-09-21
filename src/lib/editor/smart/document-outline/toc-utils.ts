import type { Editor } from '@tiptap/core'
import type { Node as PmNode } from '@tiptap/pm/model'
import type { EditorState } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import type { TocTemplateId } from './toc-templates'
import { getTocTemplate } from './toc-templates'

/** Virtual A4 content height (px) used to estimate page numbers in the editor. */
export const TOC_PAGE_HEIGHT_PX = 880

export interface TocHeading {
  level: number
  text: string
  id: string
  pos: number
}

export interface TocEntry {
  id: string
  text: string
  level: number
  page: number
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'section'
}

export function uniqueHeadingIds(headings: { text: string }[]): string[] {
  const seen = new Map<string, number>()
  return headings.map((h) => {
    const base = slugifyHeading(h.text)
    const count = (seen.get(base) ?? 0) + 1
    seen.set(base, count)
    return count === 1 ? base : `${base}-${count}`
  })
}

export function findTocBlockPosInDoc(doc: PmNode): number | null {
  let found: number | null = null
  doc.descendants((node, pos) => {
    if (node.type.name === 'tocBlock') {
      found = pos
      return false
    }
  })
  return found
}

export function findTocBlockPos(editor: Editor): number | null {
  if (editor.isDestroyed) return null
  return findTocBlockPosInDoc(editor.state.doc)
}

export function extractHeadings(editor: Editor, opts?: { skipToc?: boolean }): TocHeading[] {
  if (editor.isDestroyed) return []
  return extractHeadingsFromDoc(editor.state.doc, opts)
}

export function extractHeadingsFromDoc(doc: PmNode, opts?: { skipToc?: boolean }): TocHeading[] {
  const entries: Omit<TocHeading, 'id'>[] = []
  doc.descendants((node, pos) => {
    if (opts?.skipToc && node.type.name === 'tocBlock') return false
    if (node.type.name !== 'heading') return
    const text = node.textContent.trim()
    if (!text) return
    entries.push({ level: node.attrs.level as number, text, pos })
  })

  const ids = uniqueHeadingIds(entries)
  return entries.map((e, i) => ({
    ...e,
    id: (doc.nodeAt(e.pos)?.attrs.id as string) || ids[i],
  }))
}

export function scrollToHeadingId(editor: Editor, id: string) {
  if (editor.isDestroyed) return

  let targetPos: number | null = null
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading' && node.attrs.id === id) {
      targetPos = pos
      return false
    }
  })
  if (targetPos == null) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }
  editor.chain().focus().setTextSelection(targetPos + 1).run()
  requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

export function measureTocEntriesFromView(view: EditorView, indexPages: number): TocEntry[] {
  const headings = extractHeadingsFromDoc(view.state.doc, { skipToc: true })
  const dom = view.dom
  const origin = dom.getBoundingClientRect().top + dom.scrollTop

  return headings.map((h) => {
    const el = document.getElementById(h.id)
    let page = indexPages + 1
    if (el) {
      const top = el.getBoundingClientRect().top + dom.scrollTop - origin
      page = Math.max(indexPages + 1, Math.ceil((top + 1) / TOC_PAGE_HEIGHT_PX))
    }
    return { id: h.id, text: h.text, level: h.level, page }
  })
}

export function measureTocEntries(editor: Editor, indexPages: number): TocEntry[] {
  if (editor.isDestroyed) return []
  return measureTocEntriesFromView(editor.view, indexPages)
}

function entriesEqual(a: TocEntry[], b: TocEntry[]): boolean {
  if (a.length !== b.length) return false
  return a.every((entry, i) => {
    const other = b[i]
    return (
      entry.id === other.id
      && entry.text === other.text
      && entry.level === other.level
      && entry.page === other.page
    )
  })
}

/** Build a page-number refresh transaction from the supplied state (must match view.state at dispatch). */
export function buildTocPageRefreshTransaction(state: EditorState, view: EditorView) {
  const tocPos = findTocBlockPosInDoc(state.doc)
  if (tocPos == null) return null

  const tocNode = state.doc.nodeAt(tocPos)
  if (!tocNode || tocNode.type.name !== 'tocBlock') return null

  const indexPages = (tocNode.attrs.indexPages as number) ?? 1
  const entries = measureTocEntriesFromView(view, indexPages)
  const current = (tocNode.attrs.entries ?? []) as TocEntry[]
  if (entriesEqual(current, entries)) return null

  return state.tr.setNodeMarkup(tocPos, undefined, { ...tocNode.attrs, entries })
}

export function refreshTocPageNumbers(editor: Editor): boolean {
  if (editor.isDestroyed) return false

  return editor
    .chain()
    .command(({ tr, state, view }) => {
      const tocPos = findTocBlockPosInDoc(state.doc)
      if (tocPos == null) return false

      const tocNode = state.doc.nodeAt(tocPos)
      if (!tocNode || tocNode.type.name !== 'tocBlock') return false

      const indexPages = (tocNode.attrs.indexPages as number) ?? 1
      const entries = measureTocEntriesFromView(view, indexPages)
      const current = (tocNode.attrs.entries ?? []) as TocEntry[]
      if (entriesEqual(current, entries)) return false

      tr.setNodeMarkup(tocPos, undefined, { ...tocNode.attrs, entries })
      return true
    })
    .run()
}

export function insertTableOfContents(
  editor: Editor,
  opts: { indexPages: number; template: TocTemplateId },
): boolean {
  if (editor.isDestroyed) return false

  const headings = extractHeadings(editor, { skipToc: true })
  if (!headings.length) return false

  const template = getTocTemplate(opts.template)
  const placeholderEntries: TocEntry[] = headings.map((h) => ({
    id: h.id,
    text: h.text,
    level: h.level,
    page: opts.indexPages + 1,
  }))

  const tocAttrs = {
    template: opts.template,
    indexPages: opts.indexPages,
    title: template.title,
    entries: placeholderEntries,
  }

  const existingToc = findTocBlockPos(editor)

  if (existingToc != null) {
    return editor
      .chain()
      .focus()
      .command(({ tr, state }) => {
        const pos = findTocBlockPosInDoc(state.doc)
        if (pos == null) return false
        const node = state.doc.nodeAt(pos)
        if (!node || node.type.name !== 'tocBlock') return false
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...tocAttrs })
        return true
      })
      .run()
  }

  return editor
    .chain()
    .focus()
    .insertContentAt(0, [
      { type: 'tocBlock', attrs: tocAttrs },
      { type: 'horizontalRule' },
      { type: 'paragraph' },
    ])
    .run()
}

export function applyTocTemplateToDocument(editor: Editor, template: TocTemplateId): boolean {
  if (editor.isDestroyed) return false

  const meta = getTocTemplate(template)

  return editor
    .chain()
    .command(({ tr, state }) => {
      let changed = false
      state.doc.descendants((node, pos) => {
        if (node.type.name !== 'tocBlock') return
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, template, title: meta.title })
        changed = true
      })
      return changed
    })
    .run()
}
