'use client'

import { useCallback, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Dialog } from '@/components/ui/dialog'
import { aiApi } from '@/lib/api/ai-client'

interface AiToneModalProps {
  open: boolean
  onClose: () => void
  editor: Editor
}

export function AiToneModal({ open, onClose, editor }: AiToneModalProps) {
  const [instruction, setInstruction] = useState('')
  const [status, setStatus] = useState<'idle' | 'streaming' | 'done' | 'error'>('idle')
  const [result, setResult] = useState('')

  const run = useCallback(async () => {
    const { from, to } = editor.state.selection
    const selection = editor.state.doc.textBetween(from, to, '\n')
    if (!selection.trim() || !instruction.trim()) return
    setResult('')
    setStatus('streaming')
    const ctrl = new AbortController()
    try {
      for await (const raw of aiApi.customTone({ selection, tone: instruction }, ctrl.signal)) {
        const evt = JSON.parse(raw) as { type: string; delta?: string }
        if (evt.type === 'token' && evt.delta) setResult((r) => r + evt.delta)
      }
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }, [editor, instruction])

  const accept = useCallback(() => {
    const { from, to } = editor.state.selection
    editor.chain().focus().insertContentAt({ from, to }, result).run()
    setResult('')
    setInstruction('')
    setStatus('idle')
    onClose()
  }, [editor, result, onClose])

  return (
    <Dialog open={open} onClose={onClose} title="Custom tone">
      <div className="space-y-3">
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value.slice(0, 200))}
          placeholder="e.g. rewrite as a formal executive briefing"
          maxLength={200}
          rows={3}
          className="w-full border rounded-md p-2 text-sm resize-none bg-background"
        />
        <button
          type="button"
          onClick={run}
          disabled={status === 'streaming' || !instruction.trim()}
          className="w-full px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-50"
        >
          {status === 'streaming' ? 'Rewriting…' : 'Apply to selection'}
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
