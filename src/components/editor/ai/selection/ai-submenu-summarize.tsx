'use client'

import { useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import type { SummaryLength } from '@/lib/api/ai-types'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { CancelButton } from '@/shared/ui/cancel-button'
import { useSummarizeFlow } from './use-summarize-flow'

const LENGTHS: { value: SummaryLength; label: string }[] = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'detailed', label: 'Detailed' },
]

export function AiSummarizeSubmenu({ editor }: { editor: Editor }) {
  const flow = useSummarizeFlow(editor)

  const run = useCallback((length: SummaryLength) => {
    const { from, to, empty } = editor.state.selection
    if (empty) return
    const text = editor.state.doc.textBetween(from, to, '\n')
    if (!text.trim()) return
    void flow.run(text, { from, to }, length)
  }, [editor, flow])

  return (
    <div className="px-3 py-2.5">
      <p className="text-sm font-medium mb-2">Summarize</p>

      {flow.status === 'generating' && (
        <p className="text-xs font-medium ai-improve-shimmer-text">Summarizing…</p>
      )}

      {flow.status === 'pending' && (
        <div className="flex items-center gap-1.5">
          <ConfirmButton onClick={() => flow.confirm()} className="flex-1" />
          <CancelButton onClick={() => flow.cancel()} className="flex-1" />
        </div>
      )}

      {flow.status === 'undo' && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => flow.undo()}
            className="flex-1 h-8 rounded-md text-xs font-medium border hover:bg-muted"
          >
            Undo
          </button>
          <span className="text-xs tabular-nums text-muted-foreground min-w-[1.75rem] text-center">
            {flow.undoSeconds}s
          </span>
        </div>
      )}

      {(flow.status === 'idle' || flow.status === 'error') && (
        <div className="flex gap-1">
          {LENGTHS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => run(l.value)}
              className="flex-1 text-xs px-2 py-1.5 rounded-md border hover:bg-muted"
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
