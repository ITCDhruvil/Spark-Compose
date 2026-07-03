'use client'

import { useCallback, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { aiApi } from '@/lib/api/ai-client'
import type { OutlineHeading } from '@/lib/api/ai-types'

export function AiOutlineSubmenu({ editor }: { editor: Editor }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [suggestions, setSuggestions] = useState<OutlineHeading[]>([])

  const suggest = useCallback(async () => {
    setStatus('loading')
    try {
      const res = await aiApi.outline({ docText: editor.getText() })
      setSuggestions(res.headings)
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }, [editor])

  const insert = useCallback((h: OutlineHeading) => {
    editor.chain().focus().insertContent({
      type: 'heading',
      attrs: { level: h.level },
      content: [{ type: 'text', text: h.text }],
    }).run()
  }, [editor])

  return (
    <div className="group relative px-3 py-2.5">
      <p className="text-sm font-medium">Outline</p>
      <div className="absolute left-full top-0 ml-1 hidden w-72 rounded-lg border bg-popover p-3 shadow-lg group-hover:block group-focus-within:block z-50">
        <button
          type="button"
          onClick={suggest}
          disabled={status === 'loading'}
          className="w-full text-xs px-2 py-1.5 rounded-md border hover:bg-muted disabled:opacity-50 mb-2"
        >
          {status === 'loading' ? 'Analysing…' : 'Suggest headings'}
        </button>
        {suggestions.length > 0 && (
          <ul className="space-y-1">
            {suggestions.map((h, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-xs py-1">
                <span className="truncate">
                  <span className="text-muted-foreground font-mono mr-1">H{h.level}</span>
                  {h.text}
                </span>
                <button type="button" onClick={() => insert(h)} className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                  Insert
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
