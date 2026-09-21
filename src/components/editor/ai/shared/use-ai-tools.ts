'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Editor, JSONContent } from '@tiptap/core'
import type { GlossaryTerm } from '@/lib/api/ai-types'
import { aiApi } from '@/lib/api/ai-client'
import { useAiBelowReplace } from '../shared/use-ai-below-replace'

export type AiToolStatus = 'idle' | 'running' | 'pending' | 'undo' | 'error'

function applyGlossaryTerms(editor: Editor, terms: GlossaryTerm[]): number {
  const replacements: { from: number; to: number; text: string }[] = []
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return
    const text = node.text
    for (const t of terms) {
      let idx = 0
      while ((idx = text.indexOf(t.from, idx)) !== -1) {
        replacements.push({
          from: pos + idx,
          to: pos + idx + t.from.length,
          text: t.to,
        })
        idx += t.from.length
      }
    }
  })
  replacements.sort((a, b) => b.from - a.from)
  if (!replacements.length) return 0
  const tr = editor.state.tr
  for (const r of replacements) {
    tr.insertText(r.text, r.from, r.to)
  }
  editor.view.dispatch(tr.scrollIntoView())
  return replacements.length
}

function taskListNode(items: string[], loading = false) {
  return {
    type: 'taskList' as const,
    content: items.map((text) => ({
      type: 'taskItem' as const,
      attrs: { checked: false },
      content: [{
        type: 'paragraph' as const,
        content: loading
          ? [{ type: 'text' as const, text, marks: [{ type: 'aiLoading' as const }] }]
          : text
            ? [{ type: 'text' as const, text }]
            : [],
      }],
    })),
  }
}

function cellParagraph(text: string) {
  return {
    type: 'paragraph' as const,
    content: text ? [{ type: 'text' as const, text }] : [],
  }
}

function tableNode(headers: string[], rows: string[][]) {
  return {
    type: 'table' as const,
    content: [
      {
        type: 'tableRow' as const,
        content: headers.map((h) => ({
          type: 'tableHeader' as const,
          content: [cellParagraph(h)],
        })),
      },
      ...rows.map((row) => ({
        type: 'tableRow' as const,
        content: row.map((cell) => ({
          type: 'tableCell' as const,
          content: [cellParagraph(cell)],
        })),
      })),
    ],
  }
}

/**
 * AI tools that generate below the selection.
 * Confirm removes the original; Undo available for 5s.
 */
export function useAiTools(editor: Editor) {
  const {
    status: belowStatus,
    range,
    undoSeconds: belowUndoSeconds,
    beginBelow,
    writeGeneratedContent,
    markPending,
    failAndRemoveGenerated,
    confirm,
    cancel: cancelBelow,
    undo: undoBelow,
    reset: resetBelow,
    isAborted,
  } = useAiBelowReplace(editor)

  const [glossaryUndoSeconds, setGlossaryUndoSeconds] = useState(0)
  const glossarySnapRef = useRef<JSONContent | null>(null)
  const glossaryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => {
    if (glossaryTimerRef.current) clearInterval(glossaryTimerRef.current)
  }, [])

  const runChecklistTool = useCallback(async (
    loadingLabel: string,
    fetchItems: () => Promise<string[]>,
  ) => {
    const { from, to, empty } = editor.state.selection
    if (empty) return
    const text = editor.state.doc.textBetween(from, to, '\n').trim()
    if (!text) return

    beginBelow({ from, to }, text, loadingLabel)

    try {
      const items = await fetchItems()
      if (isAborted()) return
      writeGeneratedContent(
        taskListNode(items.length ? items : ['No items found']),
      )
      markPending()
    } catch {
      if (isAborted()) return
      failAndRemoveGenerated()
    }
  }, [editor, beginBelow, writeGeneratedContent, markPending, failAndRemoveGenerated, isAborted])

  const findIssues = useCallback(async () => {
    const { from, to } = editor.state.selection
    const text = editor.state.doc.textBetween(from, to, '\n').trim()
    await runChecklistTool('Finding issues…', async () => {
      const res = await aiApi.findIssues({ text })
      return res.issues.map((i) => {
        const tag = i.severity === 'high' ? '[High] ' : i.severity === 'medium' ? '[Med] ' : '[Low] '
        return `${tag}${i.text}`
      })
    })
  }, [editor, runChecklistTool])

  const actionItems = useCallback(async () => {
    const { from, to } = editor.state.selection
    const text = editor.state.doc.textBetween(from, to, '\n').trim()
    await runChecklistTool('Extracting actions…', async () => {
      const res = await aiApi.actionItems({ text })
      return res.items.map((i) => i.text)
    })
  }, [editor, runChecklistTool])

  const textToTable = useCallback(async () => {
    const { from, to, empty } = editor.state.selection
    if (empty) return
    const text = editor.state.doc.textBetween(from, to, '\n').trim()
    if (!text) return

    beginBelow({ from, to }, text, 'Building table…')

    try {
      const res = await aiApi.textToTable({ text })
      if (isAborted()) return
      writeGeneratedContent(tableNode(res.headers, res.rows))
      markPending()
    } catch {
      if (isAborted()) return
      failAndRemoveGenerated()
    }
  }, [editor, beginBelow, writeGeneratedContent, markPending, failAndRemoveGenerated, isAborted])

  const briefGaps = useCallback(async (brief: string) => {
    const document = editor.getText().trim()
    if (!document || !brief.trim()) return

    const end = editor.state.doc.content.size
    beginBelow({ from: end, to: end }, '\u200b', 'Checking brief…')

    try {
      const res = await aiApi.briefGaps({ document, brief: brief.trim() })
      if (isAborted()) return
      const items = res.gaps.map((g) => `Gap: ${g}`)
      writeGeneratedContent(taskListNode(items.length ? items : ['No gaps found']))
      markPending()
    } catch {
      if (isAborted()) return
      failAndRemoveGenerated()
    }
  }, [editor, beginBelow, writeGeneratedContent, markPending, failAndRemoveGenerated, isAborted])

  const glossary = useCallback(async () => {
    const text = editor.getText().trim()
    if (!text) return

    glossarySnapRef.current = editor.getJSON()
    const end = editor.state.doc.content.size
    editor.chain().focus().insertContentAt(end, {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Checking terms…', marks: [{ type: 'aiLoading' }] }],
    }).run()
    const loadFrom = end
    const loadTo = editor.state.selection.to

    try {
      const res = await aiApi.glossary({ text })
      editor.chain().focus().deleteRange({ from: loadFrom, to: loadTo }).run()

      if (!res.terms.length) {
        glossarySnapRef.current = null
        return
      }

      applyGlossaryTerms(editor, res.terms)

      if (glossaryTimerRef.current) clearInterval(glossaryTimerRef.current)
      setGlossaryUndoSeconds(5)
      glossaryTimerRef.current = setInterval(() => {
        setGlossaryUndoSeconds((s) => {
          if (s <= 1) {
            if (glossaryTimerRef.current) clearInterval(glossaryTimerRef.current)
            glossaryTimerRef.current = null
            glossarySnapRef.current = null
            return 0
          }
          return s - 1
        })
      }, 1000)
    } catch {
      try {
        editor.chain().focus().deleteRange({ from: loadFrom, to: loadTo }).run()
      } catch {
        // ignore
      }
      glossarySnapRef.current = null
    }
  }, [editor])

  const undoGlossary = useCallback(() => {
    const snap = glossarySnapRef.current
    if (!snap) return
    editor.commands.setContent(snap)
    glossarySnapRef.current = null
    if (glossaryTimerRef.current) clearInterval(glossaryTimerRef.current)
    glossaryTimerRef.current = null
    setGlossaryUndoSeconds(0)
  }, [editor])

  const imageMeta = useCallback(async (mode: 'caption' | 'alt') => {
    if (!editor.isActive('image')) return
    const attrs = editor.getAttributes('image')
    const src = String(attrs.src ?? '').trim()
    if (!src) return
    const context = editor.getText().slice(0, 800)
    try {
      const res = await aiApi.imageCaption({
        mode,
        src,
        alt: attrs.alt as string | undefined,
        title: (attrs.caption as string) || (attrs.title as string) || undefined,
        context,
      })
      if (mode === 'caption') {
        editor.chain().focus().updateAttributes('image', {
          caption: res.text,
          title: res.text,
          alt: (attrs.alt as string) || res.text,
        }).run()
      } else {
        editor.chain().focus().updateAttributes('image', { alt: res.text }).run()
      }
    } catch {
      // ignore
    }
  }, [editor])

  const status: AiToolStatus =
    glossaryUndoSeconds > 0
      ? 'undo'
      : belowStatus === 'running'
        ? 'running'
        : belowStatus

  const undoSeconds = glossaryUndoSeconds > 0 ? glossaryUndoSeconds : belowUndoSeconds

  const cancel = useCallback(() => {
    cancelBelow()
  }, [cancelBelow])

  const undo = useCallback(() => {
    if (glossaryUndoSeconds > 0) undoGlossary()
    else undoBelow()
  }, [glossaryUndoSeconds, undoGlossary, undoBelow])

  const reset = useCallback(() => {
    resetBelow()
    glossarySnapRef.current = null
    if (glossaryTimerRef.current) clearInterval(glossaryTimerRef.current)
    glossaryTimerRef.current = null
    setGlossaryUndoSeconds(0)
  }, [resetBelow])

  return {
    status,
    range,
    undoSeconds,
    findIssues,
    actionItems,
    briefGaps,
    textToTable,
    glossary,
    imageMeta,
    confirm,
    cancel,
    undo,
    reset,
  }
}
