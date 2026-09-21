'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { Editor } from '@tiptap/react'
import { aiApi } from '@/lib/api/ai-client'
import { useAiBelowReplace } from '../shared/use-ai-below-replace'

export interface ImproveRange {
  from: number
  to: number
}

const LOADING_LABEL = 'Improving…'

/**
 * Streams an improved version below the selection.
 * Confirm removes the original; Undo is available for 5s.
 */
export function useImproveSelection(editor: Editor) {
  const {
    status: belowStatus,
    range,
    undoSeconds,
    beginBelow,
    writeGeneratedText,
    markPending,
    failAndRemoveGenerated,
    confirm,
    cancel: cancelBelow,
    undo,
    reset: resetBelow,
    isAborted,
  } = useAiBelowReplace(editor)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const run = useCallback(async (nextRange: ImproveRange) => {
    const selection = editor.state.doc.textBetween(nextRange.from, nextRange.to, '\n')
    if (!selection.trim()) return

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    beginBelow(nextRange, selection, LOADING_LABEL)

    try {
      let accumulated = ''
      for await (const raw of aiApi.rewrite({ selection, mode: 'polish' }, ctrl.signal)) {
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
  }, [editor, beginBelow, writeGeneratedText, markPending, failAndRemoveGenerated, isAborted])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    cancelBelow()
  }, [cancelBelow])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    resetBelow()
  }, [resetBelow])

  return {
    status: belowStatus === 'running' ? 'running' as const : belowStatus,
    range,
    undoSeconds,
    run,
    confirm,
    cancel,
    undo,
    reset,
  }
}
