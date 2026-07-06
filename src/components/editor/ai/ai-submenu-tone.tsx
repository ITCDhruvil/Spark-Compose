'use client'

import { useCallback, useMemo, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Search } from 'lucide-react'
import { aiApi } from '@/lib/api/ai-client'
import { ALL_TONE_OPTIONS } from '@/lib/editor/tone-options'
import { ConfirmButton } from '@/components/ui/confirm-button'
import { CancelButton } from '@/components/ui/cancel-button'
import { useInEditorRewrite } from './use-in-editor-rewrite'

export function AiToneSubmenu({ editor }: { editor: Editor }) {
  const flow = useInEditorRewrite(editor)
  const [query, setQuery] = useState('')

  const options = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ALL_TONE_OPTIONS
    return ALL_TONE_OPTIONS.filter(
      (t) => t.label.toLowerCase().includes(q) || t.prompt.toLowerCase().includes(q),
    )
  }, [query])

  const run = useCallback((prompt: string) => {
    const { from, to, empty } = editor.state.selection
    if (empty) return
    const text = editor.state.doc.textBetween(from, to, '\n')
    if (!text.trim()) return
    void flow.run(text, { from, to }, (signal) =>
      aiApi.customTone({ selection: text, tone: prompt }, signal),
    'Rewriting…')
  }, [editor, flow])

  return (
    <div className="px-3 py-2.5">
      <p className="text-sm font-medium mb-2">Tone & prompts</p>

      {flow.status === 'generating' && (
        <p className="text-xs font-medium ai-improve-shimmer-text">Rewriting…</p>
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
        <div className="rounded-lg border bg-background overflow-hidden">
          <label className="flex items-center gap-2 px-2.5 py-2 border-b">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tones or prompts…"
              className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground/70"
            />
          </label>
          <div className="max-h-40 overflow-y-auto p-1">
            {options.length === 0 ? (
              <p className="px-2 py-3 text-center text-[11px] text-muted-foreground">No matches</p>
            ) : (
              options.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  title={t.prompt}
                  onClick={() => run(t.prompt)}
                  className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted"
                >
                  <span className="block text-xs font-medium">{t.label}</span>
                  <span className="block text-[10px] text-muted-foreground line-clamp-1">{t.prompt}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
