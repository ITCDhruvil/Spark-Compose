'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/core'
import {
  insertAiLoadingParagraph,
  posAfterRange,
  writeAiLoadingText,
  writeAiPlainText,
  type TextRange,
} from '@/lib/editor/ai-loading-text'

export type BelowReplaceStatus = 'idle' | 'running' | 'pending' | 'undo' | 'error'

const UNDO_SECONDS = 5

/**
 * Generate AI content below the original selection.
 * Confirm removes the original and keeps the new content, then offers Undo for 5s.
 */
export function useAiBelowReplace(editor: Editor) {
  const [status, setStatus] = useState<BelowReplaceStatus>('idle')
  const [range, setRange] = useState<TextRange | null>(null)
  const [undoSeconds, setUndoSeconds] = useState(0)

  const originalRangeRef = useRef<TextRange | null>(null)
  const generatedRangeRef = useRef<TextRange | null>(null)
  const originalTextRef = useRef('')
  const undoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const abortRef = useRef(false)

  const clearUndoTimer = useCallback(() => {
    if (undoTimerRef.current) {
      clearInterval(undoTimerRef.current)
      undoTimerRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    abortRef.current = true
    clearUndoTimer()
    originalRangeRef.current = null
    generatedRangeRef.current = null
    originalTextRef.current = ''
    setRange(null)
    setUndoSeconds(0)
    setStatus('idle')
  }, [clearUndoTimer])

  useEffect(() => () => {
    abortRef.current = true
    clearUndoTimer()
  }, [clearUndoTimer])

  const startUndoWindow = useCallback((keptRange: TextRange, originalText: string) => {
    originalTextRef.current = originalText
    generatedRangeRef.current = keptRange
    originalRangeRef.current = null
    setRange(keptRange)
    setStatus('undo')
    setUndoSeconds(UNDO_SECONDS)
    clearUndoTimer()
    undoTimerRef.current = setInterval(() => {
      setUndoSeconds((s) => {
        if (s <= 1) {
          clearUndoTimer()
          generatedRangeRef.current = null
          originalTextRef.current = ''
          setRange(null)
          setStatus('idle')
          return 0
        }
        return s - 1
      })
    }, 1000)
  }, [clearUndoTimer])

  /** Start generation below the original selection with shimmer text. */
  const beginBelow = useCallback((
    originalRange: TextRange,
    originalText: string,
    loadingLabel: string,
  ): TextRange => {
    abortRef.current = false
    clearUndoTimer()
    originalRangeRef.current = { ...originalRange }
    originalTextRef.current = originalText
    setStatus('running')

    const insertAt = posAfterRange(editor, originalRange)
    const generated = insertAiLoadingParagraph(editor, insertAt, loadingLabel)
    generatedRangeRef.current = generated
    setRange(generated)
    return generated
  }, [editor, clearUndoTimer])

  /** Update the generated block (text). */
  const writeGeneratedText = useCallback((text: string, loading = false) => {
    const at = generatedRangeRef.current
    if (!at) return null
    const next = loading
      ? writeAiLoadingText(editor, at.from, at.to, text)
      : writeAiPlainText(editor, at.from, at.to, text)
    generatedRangeRef.current = next
    setRange(next)
    return next
  }, [editor])

  /** Replace the generated block with arbitrary node content (table, list, …). */
  const writeGeneratedContent = useCallback((content: Record<string, unknown> | Record<string, unknown>[]) => {
    const at = generatedRangeRef.current
    if (!at) return null
    editor.chain().focus().insertContentAt({ from: at.from, to: at.to }, content).run()
    const next = { from: at.from, to: editor.state.selection.to }
    generatedRangeRef.current = next
    setRange(next)
    return next
  }, [editor])

  const markPending = useCallback(() => {
    const gen = generatedRangeRef.current
    if (!gen) return
    editor.commands.setTextSelection({ from: gen.from, to: gen.to })
    setStatus('pending')
  }, [editor])

  const failAndRemoveGenerated = useCallback(() => {
    const gen = generatedRangeRef.current
    if (gen) {
      editor.chain().focus().deleteRange({ from: gen.from, to: gen.to }).run()
    }
    generatedRangeRef.current = null
    originalRangeRef.current = null
    setRange(null)
    setStatus('error')
    setTimeout(() => setStatus('idle'), 1500)
  }, [editor])

  /** Keep new content, remove original, offer Undo for 5s. */
  const confirm = useCallback(() => {
    if (status !== 'pending') return
    const orig = originalRangeRef.current
    const gen = generatedRangeRef.current
    const originalText = originalTextRef.current
    if (!orig || !gen) return

    const origLen = orig.to - orig.from

    // Additive inserts (e.g. brief gaps at end) — keep new content, no undo swap
    if (origLen === 0 || !originalText || originalText === '\u200b') {
      originalRangeRef.current = null
      generatedRangeRef.current = null
      originalTextRef.current = ''
      setRange(null)
      setStatus('idle')
      editor.commands.setTextSelection(gen.to)
      return
    }

    editor.chain().focus().deleteRange({ from: orig.from, to: orig.to }).run()

    const kept = {
      from: gen.from - origLen,
      to: gen.to - origLen,
    }
    generatedRangeRef.current = kept
    setRange(kept)
    editor.commands.setTextSelection(kept.to)
    startUndoWindow(kept, originalText)
  }, [editor, status, startUndoWindow])

  /** Remove generated content; original stays. */
  const cancel = useCallback(() => {
    abortRef.current = true
    const gen = generatedRangeRef.current
    if (gen) {
      editor.chain().focus().deleteRange({ from: gen.from, to: gen.to }).run()
    }
    reset()
  }, [editor, reset])

  /** Within the undo window: restore original text in place of the new content. */
  const undo = useCallback(() => {
    if (status !== 'undo') return
    const gen = generatedRangeRef.current
    const original = originalTextRef.current
    if (gen && original) {
      writeAiPlainText(editor, gen.from, gen.to, original)
    }
    reset()
  }, [editor, status, reset])

  const isAborted = useCallback(() => abortRef.current, [])

  return {
    status,
    range,
    undoSeconds,
    beginBelow,
    writeGeneratedText,
    writeGeneratedContent,
    markPending,
    failAndRemoveGenerated,
    confirm,
    cancel,
    undo,
    reset,
    isAborted,
  }
}
