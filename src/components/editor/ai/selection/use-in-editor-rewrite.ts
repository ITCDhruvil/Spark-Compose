'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { Editor } from '@tiptap/react'
import { useAiBelowReplace } from '../shared/use-ai-below-replace'
import type { TextRange } from './use-summarize-flow'

export type InEditorRewriteStatus = 'idle' | 'generating' | 'pending' | 'undo' | 'error'

type StreamFactory = (signal: AbortSignal) => AsyncGenerator<string>

/**
 * Streams AI output below the selection, then confirm / cancel / undo.
 */
export function useInEditorRewrite(editor: Editor) {
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

  const run = useCallback(async (
    sourceText: string,
    replaceRange: TextRange,
    streamFactory: StreamFactory,
    loadingLabel = 'Working…',
  ) => {
    if (!sourceText.trim()) return

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    beginBelow(replaceRange, sourceText, loadingLabel)

    try {
      let accumulated = ''
      for await (const raw of streamFactory(ctrl.signal)) {
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

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    cancelBelow()
  }, [cancelBelow])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    resetBelow()
  }, [resetBelow])

  const status: InEditorRewriteStatus =
    belowStatus === 'running' ? 'generating' : belowStatus

  return {
    status,
    range,
    undoSeconds,
    run,
    confirm,
    cancel,
    undo,
    reset,
  }
}
