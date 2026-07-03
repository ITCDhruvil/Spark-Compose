'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Check, Copy } from 'lucide-react'
import { aiApi } from '@/lib/api/ai-client'
import type { SummaryLength } from '@/lib/api/ai-types'

const LENGTHS: { value: SummaryLength; label: string }[] = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'detailed', label: 'Detailed' },
]

export function AiSummarizeSubmenu({ editor }: { editor: Editor }) {
  const [length, setLength] = useState<SummaryLength>('medium')
  const [status, setStatus] = useState<'idle' | 'loading' | 'streaming' | 'done' | 'error'>('idle')
  const [result, setResult] = useState('')
  const [copied, setCopied] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const run = useCallback(async (scope: 'selection' | 'doc') => {
    const { from, to, empty } = editor.state.selection
    const text = scope === 'doc' || empty
      ? editor.getText()
      : editor.state.doc.textBetween(from, to, '\n')
    if (!text.trim()) return

    setStatus('loading')
    setResult('')
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      for await (const raw of aiApi.summarize({ text, length }, ctrl.signal)) {
        const evt = JSON.parse(raw) as { type: string; delta?: string }
        if (evt.type === 'token' && evt.delta) {
          setStatus('streaming')
          setResult((r) => r + evt.delta)
        }
      }
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }, [editor, length])

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [result])

  return (
    <div className="group relative px-3 py-2.5">
      <p className="text-sm font-medium">Summarize</p>
      <div className="absolute left-full top-0 ml-1 hidden w-72 rounded-lg border bg-popover p-3 shadow-lg group-hover:block group-focus-within:block z-50">
        <div className="space-y-1.5 mb-2">
          {LENGTHS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => setLength(l.value)}
              className={`block w-full text-left px-2 py-1 rounded text-sm ${length === l.value ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mb-2">
          <button type="button" onClick={() => run('selection')} className="flex-1 text-xs px-2 py-1.5 rounded-md border hover:bg-muted">Selection</button>
          <button type="button" onClick={() => run('doc')} className="flex-1 text-xs px-2 py-1.5 rounded-md border hover:bg-muted">Whole doc</button>
        </div>
        <div className="min-h-[60px] rounded-md border bg-muted/30 p-2 text-xs whitespace-pre-wrap">
          {result || (status === 'loading' || status === 'streaming' ? 'Summarizing…' : 'No summary yet.')}
        </div>
        {result && (
          <button type="button" onClick={copy} className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </button>
        )}
      </div>
    </div>
  )
}
