'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { aiApi } from '@/lib/api/ai-client'
import type { SummaryLength } from '@/lib/api/ai-types'
import { useAiStore } from '@/lib/store/use-ai-store'
import { useAiBelowReplace } from '../shared/use-ai-below-replace'

export interface TextRange {
  from: number
  to: number
}

type FlowStatus = 'idle' | 'generating' | 'pending' | 'undo' | 'error'

export function useSummarizeFlow(editor: Editor) {
  const [length, setLength] = useState<SummaryLength>('medium')
  const {
    status: belowStatus,
    range,
    undoSeconds,
    beginBelow,
    writeGeneratedText,
    markPending,
    failAndRemoveGenerated,
    confirm: confirmBelow,
    cancel: cancelBelow,
    undo,
    reset: resetBelow,
    isAborted,
  } = useAiBelowReplace(editor)
  const abortRef = useRef<AbortController | null>(null)
  const originalTextRef = useRef('')

  const registerSummaryReplacement = useAiStore((s) => s.registerSummaryReplacement)

  useEffect(() => () => abortRef.current?.abort(), [])

  const run = useCallback(async (
    sourceText: string,
    replaceRange: TextRange,
    nextLength: SummaryLength,
  ) => {
    if (!sourceText.trim()) return

    abortRef.current?.abort()
    setLength(nextLength)
    originalTextRef.current = sourceText

    const ctrl = new AbortController()
    abortRef.current = ctrl

    beginBelow(replaceRange, sourceText, 'Summarizing…')

    try {
      let accumulated = ''
      for await (const raw of aiApi.summarize({ text: sourceText, length: nextLength }, ctrl.signal)) {
        if (ctrl.signal.aborted || isAborted()) return
        const evt = JSON.parse(raw) as { type: string; delta?: string }
        if (evt.type !== 'token' || !evt.delta) continue
        accumulated += evt.delta
        writeGeneratedText(accumulated, false)
      }

      if (ctrl.signal.aborted || isAborted()) return

      if (!accumulated.trim()) {
        failAndRemoveGenerated()
        return
      }
      markPending()
    } catch {
      if (ctrl.signal.aborted || isAborted()) return
      failAndRemoveGenerated()
    }
  }, [beginBelow, writeGeneratedText, markPending, failAndRemoveGenerated, isAborted])

  const confirm = useCallback(() => {
    if (belowStatus !== 'pending' || !range) return
    const summaryText = editor.state.doc.textBetween(range.from, range.to, '\n')
    const original = originalTextRef.current
    confirmBelow()
    if (summaryText.trim() && original) {
      registerSummaryReplacement({
        summaryText,
        originalText: original,
        length,
      })
    }
  }, [belowStatus, range, editor, confirmBelow, length, registerSummaryReplacement])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    cancelBelow()
  }, [cancelBelow])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    resetBelow()
  }, [resetBelow])

  const status: FlowStatus =
    belowStatus === 'running' ? 'generating' : belowStatus

  return {
    status,
    length,
    range,
    undoSeconds,
    run,
    confirm,
    cancel,
    undo,
    reset,
  }
}
