'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Dialog } from '@/components/ui/dialog'
import { aiApi } from '@/lib/api/ai-client'
import { TRANSLATE_LANGUAGE_GROUPS } from '@/lib/editor/translate-languages'

interface AiTranslateModalProps {
  open: boolean
  onClose: () => void
  editor: Editor
}

export function AiTranslateModal({ open, onClose, editor }: AiTranslateModalProps) {
  const [lang, setLang] = useState(TRANSLATE_LANGUAGE_GROUPS[0]?.options[0]?.value ?? '')
  const [status, setStatus] = useState<'idle' | 'streaming' | 'done' | 'error'>('idle')
  const [result, setResult] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const rangeRef = useRef<{ from: number; to: number } | null>(null)

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort()
    }
  }, [open])

  const run = useCallback(async () => {
    const { from, to } = editor.state.selection
    const text = editor.state.doc.textBetween(from, to, '\n')
    if (!text.trim()) return
    rangeRef.current = { from, to }
    setResult('')
    setStatus('streaming')
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      for await (const raw of aiApi.translate({ text, targetLang: lang }, ctrl.signal)) {
        const evt = JSON.parse(raw) as { type: string; delta?: string }
        if (evt.type === 'token' && evt.delta) setResult((r) => r + evt.delta)
      }
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }, [editor, lang])

  const accept = useCallback(() => {
    const range = rangeRef.current ?? editor.state.selection
    editor.chain().focus().insertContentAt({ from: range.from, to: range.to }, result).run()
    setResult('')
    setStatus('idle')
    onClose()
  }, [editor, result, onClose])

  return (
    <Dialog open={open} onClose={onClose} title="Translate">
      <div className="space-y-3">
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          className="w-full border rounded-md px-2 py-1.5 text-sm bg-background"
        >
          {TRANSLATE_LANGUAGE_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <button
          type="button"
          onClick={run}
          disabled={status === 'streaming'}
          className="w-full px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-50"
        >
          {status === 'streaming' ? 'Translating…' : 'Translate selection'}
        </button>
        {result && (
          <>
            <div className="min-h-[60px] rounded-md border bg-muted/30 p-2 text-sm whitespace-pre-wrap">{result}</div>
            <div className="flex gap-2">
              <button type="button" onClick={accept} className="flex-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm">Accept</button>
              <button type="button" onClick={() => setResult('')} className="flex-1 px-3 py-1.5 rounded-md border text-sm">Reject</button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  )
}
