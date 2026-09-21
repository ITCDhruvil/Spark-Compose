'use client'

import { useCallback, useMemo, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Search } from 'lucide-react'
import { aiApi } from '@/lib/api/ai-client'
import { TRANSLATE_LANGUAGES } from '@/lib/editor/ai/writing-tools/translate-languages'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { CancelButton } from '@/shared/ui/cancel-button'
import { useInEditorRewrite } from './use-in-editor-rewrite'

export function AiTranslateSubmenu({ editor }: { editor: Editor }) {
  const flow = useInEditorRewrite(editor)
  const [query, setQuery] = useState('')

  const languages = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return TRANSLATE_LANGUAGES
    return TRANSLATE_LANGUAGES.filter((l) => l.label.toLowerCase().includes(q))
  }, [query])

  const run = useCallback((lang: string) => {
    const { from, to, empty } = editor.state.selection
    if (empty) return
    const text = editor.state.doc.textBetween(from, to, '\n')
    if (!text.trim()) return
    void flow.run(text, { from, to }, (signal) =>
      aiApi.translate({ text, targetLang: lang }, signal),
    'Translating…')
  }, [editor, flow])

  return (
    <div className="px-3 py-2.5">
      <p className="text-sm font-medium mb-2">Translate</p>

      {flow.status === 'generating' && (
        <p className="text-xs font-medium ai-improve-shimmer-text">Translating…</p>
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
              placeholder="Search languages…"
              className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground/70"
            />
          </label>
          <div className="max-h-40 overflow-y-auto p-1">
            {languages.length === 0 ? (
              <p className="px-2 py-3 text-center text-[11px] text-muted-foreground">No matches</p>
            ) : (
              languages.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => run(l.value)}
                  className="w-full text-left text-xs px-2 py-1.5 rounded-md hover:bg-muted"
                >
                  {l.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
