'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import type { AutoStructureOp, SuggestBlockKind } from '@/lib/api/ai-types'
import { aiApi } from '@/lib/api/ai-client'
import {
  blockStartPos,
  collectHeadingContext,
  resolveHeadingLevel,
  smartHeadingLevel,
  smartSubtitleLevel,
  titleInsertPos,
} from '@/lib/editor/heading-context'
import { useAiBelowReplace } from './use-ai-below-replace'

export type SuggestBlockStatus = 'idle' | 'running' | 'pending' | 'undo' | 'error'

export interface SuggestRange {
  from: number
  to: number
}

export type SuggestMenuKind = SuggestBlockKind | 'auto'

export const SUGGEST_OPTIONS: {
  kind: SuggestMenuKind
  label: string
  description: string
}[] = [
  {
    kind: 'auto',
    label: 'Auto',
    description: 'Uses the full document, not the selection',
  },
  { kind: 'heading', label: 'Heading', description: 'Title above the paragraph' },
  { kind: 'subtitle', label: 'Subtitle', description: 'Secondary title above the paragraph' },
  { kind: 'bulletList', label: 'Bullet points', description: 'Bullets below the paragraph' },
  { kind: 'orderedList', label: 'Number list', description: 'Numbered list below the paragraph' },
  { kind: 'taskList', label: 'Check box', description: 'Checklist below the paragraph' },
]

const LOADING: Record<SuggestBlockKind, string> = {
  heading: 'Suggesting title…',
  subtitle: 'Suggesting subtitle…',
  bulletList: 'Suggesting bullet points…',
  orderedList: 'Suggesting numbered list…',
  taskList: 'Suggesting checklist…',
}

function isTitleKind(kind: SuggestBlockKind) {
  return kind === 'heading' || kind === 'subtitle'
}

function headingNode(level: 1 | 2 | 3, text: string, loading = false) {
  return {
    type: 'heading' as const,
    attrs: { level },
    content: loading
      ? [{ type: 'text' as const, text, marks: [{ type: 'aiLoading' as const }] }]
      : [{ type: 'text' as const, text }],
  }
}

function listItemParagraph(text: string, loading = false) {
  return {
    type: 'paragraph' as const,
    content: loading
      ? [{ type: 'text' as const, text, marks: [{ type: 'aiLoading' as const }] }]
      : text
        ? [{ type: 'text' as const, text }]
        : [],
  }
}

function listNode(kind: 'bulletList' | 'orderedList' | 'taskList', items: string[], loading = false) {
  if (kind === 'taskList') {
    return {
      type: 'taskList' as const,
      content: items.map((text) => ({
        type: 'taskItem' as const,
        attrs: { checked: false },
        content: [listItemParagraph(text, loading)],
      })),
    }
  }
  return {
    type: kind,
    content: items.map((text) => ({
      type: 'listItem' as const,
      content: [listItemParagraph(text, loading)],
    })),
  }
}

/**
 * Suggests a block for the selected paragraph:
 * - heading / subtitle → above (keep original)
 * - lists → below; confirm removes original, Undo for 5s
 */
export function useSuggestBlock(editor: Editor) {
  const {
    status: belowStatus,
    range: belowRange,
    undoSeconds,
    beginBelow,
    writeGeneratedContent,
    markPending,
    failAndRemoveGenerated,
    confirm: confirmBelow,
    cancel: cancelBelow,
    undo,
    reset: resetBelow,
    isAborted,
  } = useAiBelowReplace(editor)
  const [mode, setMode] = useState<'title' | 'list' | null>(null)
  const [titleStatus, setTitleStatus] = useState<SuggestBlockStatus>('idle')
  const [titleRange, setTitleRange] = useState<SuggestRange | null>(null)
  const abortRef = useRef(false)
  const titleRangeRef = useRef<SuggestRange | null>(null)

  useEffect(() => () => { abortRef.current = true }, [])

  const resetTitle = useCallback(() => {
    abortRef.current = true
    titleRangeRef.current = null
    setTitleRange(null)
    setTitleStatus('idle')
    setMode(null)
  }, [])

  const writeTitle = useCallback((
    from: number,
    to: number | null,
    content: Record<string, unknown>,
  ): SuggestRange => {
    if (to == null) {
      editor.chain().focus().insertContentAt(from, content).run()
    } else {
      editor.chain().focus().insertContentAt({ from, to }, content).run()
    }
    const next = { from, to: editor.state.selection.to }
    titleRangeRef.current = next
    setTitleRange(next)
    return next
  }, [editor])

  const runAuto = useCallback(async () => {
    // Always analyse the full document, not the current selection
    const text = editor.getText().trim()
    if (!text) return

    abortRef.current = false
    setMode('title')
    resetBelow()
    setTitleStatus('running')

    const docEnd = editor.state.doc.content.size
    writeTitle(docEnd, null, headingNode(2, 'Structuring…', true))

    try {
      const res = await aiApi.autoStructure({ text })
      const loading = titleRangeRef.current
      if (loading) editor.chain().focus().deleteRange(loading).run()
      titleRangeRef.current = null
      setTitleRange(null)

      if (abortRef.current) {
        resetTitle()
        return
      }

      const ops: AutoStructureOp[] = res.operations?.length
        ? res.operations
        : (res.headings ?? []).map((h) => ({
            matchPrefix: h.matchPrefix,
            action: h.level === 3 ? ('subtitle' as const) : ('heading' as const),
            level: h.level,
            text: h.text,
          }))

      if (!ops.length) {
        setTitleStatus('idle')
        setMode(null)
        return
      }

      type Target = {
        pos: number
        nodeSize: number
        action: string
        level: 1 | 2 | 3
        text?: string
        items?: string[]
        headers?: string[]
        rows?: string[][]
        replacement?: string
      }

      const targets: Target[] = []
      const docSize = editor.state.doc.content.size
      for (const op of ops) {
        let targetPos: number | null = null
        let nodeSize = 0
        editor.state.doc.nodesBetween(0, docSize, (node, pos) => {
          if (targetPos != null) return false
          if (!node.isTextblock || node.type.name === 'heading') return
          const paraText = node.textContent
          if (
            paraText.startsWith(op.matchPrefix)
            || op.matchPrefix.startsWith(paraText.slice(0, Math.min(24, paraText.length)))
          ) {
            targetPos = pos
            nodeSize = node.nodeSize
            return false
          }
        })
        if (targetPos == null) continue
        targets.push({
          pos: targetPos,
          nodeSize,
          action: op.action,
          level: op.action === 'subtitle' ? 3 : op.action === 'heading' ? (op.level === 1 ? 1 : 2) : 2,
          text: op.text,
          items: op.items,
          headers: op.headers,
          rows: op.rows,
          replacement: op.replacement,
        })
      }

      // Bottom → top so positions stay valid
      targets.sort((a, b) => b.pos - a.pos)

      for (const t of targets) {
        if (t.action === 'heading' || t.action === 'subtitle') {
          if (!t.text) continue
          editor.chain().focus().insertContentAt(t.pos, headingNode(t.level, t.text, false)).run()
        } else if (t.action === 'refactor' && t.replacement) {
          editor.chain().focus().insertContentAt(
            { from: t.pos, to: t.pos + t.nodeSize },
            { type: 'paragraph', content: [{ type: 'text', text: t.replacement }] },
          ).run()
        } else if (
          (t.action === 'bulletList' || t.action === 'orderedList' || t.action === 'taskList')
          && t.items?.length
        ) {
          editor.chain().focus().insertContentAt(
            t.pos + t.nodeSize,
            listNode(t.action, t.items, false),
          ).run()
        } else if (t.action === 'table' && t.headers?.length && t.rows?.length) {
          const tableContent = {
            type: 'table' as const,
            content: [
              {
                type: 'tableRow' as const,
                content: t.headers.map((h) => ({
                  type: 'tableHeader' as const,
                  content: [{ type: 'paragraph' as const, content: [{ type: 'text' as const, text: h }] }],
                })),
              },
              ...t.rows.map((row) => ({
                type: 'tableRow' as const,
                content: row.map((cell) => ({
                  type: 'tableCell' as const,
                  content: [{
                    type: 'paragraph' as const,
                    content: cell ? [{ type: 'text' as const, text: cell }] : [],
                  }],
                })),
              })),
            ],
          }
          editor.chain().focus().insertContentAt(t.pos + t.nodeSize, tableContent).run()
        }
      }

      setTitleStatus('idle')
      setMode(null)
    } catch {
      const loading = titleRangeRef.current
      if (loading) editor.chain().focus().deleteRange(loading).run()
      titleRangeRef.current = null
      setTitleRange(null)
      setTitleStatus('error')
      setTimeout(() => {
        setTitleStatus('idle')
        setMode(null)
      }, 1500)
    }
  }, [editor, resetBelow, writeTitle, resetTitle])

  const run = useCallback(async (kind: SuggestMenuKind) => {
    if (kind === 'auto') {
      await runAuto()
      return
    }

    const { from, to, empty } = editor.state.selection
    if (empty) return

    const paragraph = editor.state.doc.textBetween(from, to, '\n').trim()
    if (!paragraph) return

    abortRef.current = false

    const insertAt = isTitleKind(kind)
      ? titleInsertPos(editor, kind)
      : null

    const contextPos = isTitleKind(kind)
      ? (insertAt ?? from)
      : (blockStartPos(editor) ?? from)
    const { prev, next } = collectHeadingContext(editor, contextPos)
    let preferredLevel = kind === 'subtitle'
      ? smartSubtitleLevel(prev, next)
      : smartHeadingLevel(prev, next)

    if (kind === 'heading' && next[0]?.level) {
      preferredLevel = Math.max(1, next[0].level - 1) as 1 | 2 | 3
      const prevLevel = prev.at(-1)?.level
      if (prevLevel != null && preferredLevel > prevLevel + 1) {
        preferredLevel = (prevLevel + 1) as 1 | 2 | 3
      }
    }

    const displayLevel: 1 | 2 | 3 = kind === 'subtitle'
      ? 3
      : kind === 'heading'
        ? (preferredLevel === 1 ? 1 : 2)
        : preferredLevel

    const loadingLabel = LOADING[kind]

    // Lists: generate below original, confirm removes original
    if (!isTitleKind(kind)) {
      setMode('list')
      resetTitle()
      beginBelow({ from, to }, paragraph, loadingLabel)

      try {
        const res = await aiApi.suggestBlock({
          kind,
          paragraph,
          prevHeadings: prev.map(({ level, text }) => ({ level, text })),
          nextHeadings: next.map(({ level, text }) => ({ level, text })),
          preferredLevel,
        })
        if (isAborted()) return

        let items = (res.items ?? []).map((s) => s.trim()).filter(Boolean)
        if (!items.length) {
          items = paragraph.split(/[.!?]\s+/).map((s) => s.trim()).filter(Boolean).slice(0, 4)
        }
        if (!items.length) items = [paragraph.slice(0, 80)]

        writeGeneratedContent(listNode(kind, items, false))
        markPending()
      } catch {
        if (isAborted()) return
        failAndRemoveGenerated()
      }
      return
    }

    // Titles: insert above, keep original paragraph
    if (insertAt == null) return
    setMode('title')
    resetBelow()
    setTitleStatus('running')

    let at = writeTitle(insertAt, null, headingNode(displayLevel, loadingLabel, true))

    try {
      const res = await aiApi.suggestBlock({
        kind,
        paragraph,
        prevHeadings: prev.map(({ level, text }) => ({ level, text })),
        nextHeadings: next.map(({ level, text }) => ({ level, text })),
        preferredLevel,
      })

      if (abortRef.current) {
        const cur = titleRangeRef.current
        if (cur) editor.chain().focus().deleteRange(cur).run()
        resetTitle()
        return
      }

      const cur = titleRangeRef.current ?? at
      let text = (res.text ?? '').trim().replace(/^["']|["']$/g, '').replace(/[.。]\s*$/, '')
      if (!text) text = paragraph.split(/\s+/).slice(0, 8).join(' ')
      const finalLevel: 1 | 2 | 3 = kind === 'subtitle'
        ? 3
        : resolveHeadingLevel(res.level, prev, next) === 1
          ? 1
          : 2
      at = writeTitle(cur.from, cur.to, headingNode(finalLevel, text, false))
      editor.commands.setTextSelection({ from: at.from, to: at.to })
      setTitleStatus('pending')
    } catch {
      if (abortRef.current) return
      const cur = titleRangeRef.current
      if (cur) editor.chain().focus().deleteRange(cur).run()
      titleRangeRef.current = null
      setTitleRange(null)
      setTitleStatus('error')
      setTimeout(() => {
        setTitleStatus('idle')
        setMode(null)
      }, 1500)
    }
  }, [
    editor, writeTitle, resetTitle, resetBelow, beginBelow, writeGeneratedContent,
    markPending, failAndRemoveGenerated, isAborted, runAuto,
  ])

  const confirm = useCallback(() => {
    if (mode === 'list') {
      confirmBelow()
      return
    }
    if (mode === 'title' && titleStatus === 'pending') {
      const at = titleRangeRef.current
      if (at) editor.commands.setTextSelection(at.to)
      resetTitle()
    }
  }, [mode, confirmBelow, titleStatus, editor, resetTitle])

  const cancel = useCallback(() => {
    if (mode === 'list') {
      cancelBelow()
      setMode(null)
      return
    }
    abortRef.current = true
    const at = titleRangeRef.current
    if (at) editor.chain().focus().deleteRange(at).run()
    resetTitle()
  }, [mode, cancelBelow, editor, resetTitle])

  const status: SuggestBlockStatus = mode === 'list'
    ? (belowStatus === 'running' ? 'running' : belowStatus)
    : mode === 'title'
      ? titleStatus
      : 'idle'

  const range = mode === 'list' ? belowRange : titleRange

  return {
    status,
    range,
    undoSeconds: mode === 'list' ? undoSeconds : 0,
    run,
    confirm,
    cancel,
    undo,
    reset: () => {
      resetBelow()
      resetTitle()
    },
  }
}

/** @deprecated use useSuggestBlock */
export const useSuggestHeading = useSuggestBlock
