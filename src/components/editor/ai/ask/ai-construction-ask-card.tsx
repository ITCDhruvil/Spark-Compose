'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Loader2, Send } from 'lucide-react'
import { Dialog } from '@/shared/ui/dialog'
import { aiApi, APIError } from '@/lib/api/ai-client'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { openDraftAnything } from '@/lib/editor/ai/draft/draft-anything-events'

interface AiConstructionAskCardProps {
  open: boolean
  onClose: () => void
  editor: Editor
}

interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  { label: 'Technical', prompt: 'Explain a common technical method used on mid-rise concrete frames.' },
  { label: 'Stats', prompt: 'What productivity stats should a super track on a tower-crane pour week?' },
  { label: 'News & trends', prompt: 'What are current trends in construction safety technology?' },
  { label: 'Techniques', prompt: 'What techniques improve rebar cage readiness before a column pour?' },
  { label: 'Safety', prompt: 'What are key tower crane lift-path checks before the first pick?' },
]

async function askConstruction(message: string, history: ChatTurn[]): Promise<string> {
  const data = await aiApi.ask({ message, history })
  return data.answer ?? ''
}

export function AiConstructionAskCard({ open, onClose, editor }: AiConstructionAskCardProps) {
  const [input, setInput] = useState('')
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      setInput('')
      setTurns([])
      setBusy(false)
      setError(null)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, busy])

  const send = useCallback(async (text: string) => {
    const message = text.trim()
    if (!message || busy) return

    setError(null)
    setInput('')
    const history = turns
    setTurns((t) => [...t, { role: 'user', content: message }])
    setBusy(true)

    try {
      const answer = await askConstruction(message, history)
      setTurns((t) => [...t, { role: 'assistant', content: answer }])
    } catch (e) {
      setError(e instanceof APIError ? e.message : e instanceof Error ? e.message : 'Request failed')
      setTurns((t) => t.slice(0, -1))
      setInput(message)
    } finally {
      setBusy(false)
    }
  }, [busy, turns])

  const insertLastAnswer = useCallback(() => {
    const last = [...turns].reverse().find((t) => t.role === 'assistant')
    if (!last) return
    // Insert as plain paragraphs (answers may include light markdown bullets)
    const lines = last.content.split(/\n+/).map((l) => l.trim()).filter(Boolean)
    const content = lines.map((line) => {
      const text = line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '').replace(/\*\*([^*]+)\*\*/g, '$1')
      return { type: 'paragraph', content: [{ type: 'text', text }] }
    })
    editor.chain().focus().insertContent(content).run()
    onClose()
  }, [turns, editor, onClose])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Ask"
      description="Construction Q&A — technical, stats, trends, techniques, and safety."
      className="max-w-md"
    >
      <div className="flex flex-col gap-3 max-h-[min(70vh,520px)]">
        {turns.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Ask anything construction-related. For a full written piece, use <button type="button" className="text-primary font-medium hover:underline" onClick={() => { onClose(); openDraftAnything() }}>/draft</button>.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => void send(s.prompt)}
                  className="text-xs px-2.5 py-1.5 rounded-full border bg-background hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 min-h-[140px] max-h-[320px] overflow-y-auto space-y-2.5 pr-0.5">
          {turns.map((turn, i) => (
            <div
              key={`${turn.role}-${i}`}
              className={`rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                turn.role === 'user'
                  ? 'bg-primary text-primary-foreground ml-6'
                  : 'bg-muted/50 border mr-4'
              }`}
            >
              {turn.content}
            </div>
          ))}
          {busy && (
            <div className="rounded-xl px-3 py-2 mr-4 border bg-muted/30">
              <span className="ai-improve-shimmer-text text-sm font-medium">Thinking...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}

        <div className="flex items-end gap-2 rounded-full border border-border bg-muted/30 pl-4 pr-1.5 py-1.5 shadow-sm focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-ring/30 transition-shadow">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 2000))}
            placeholder="Ask anything about construction…"
            rows={1}
            className="flex-1 min-h-[36px] max-h-28 bg-transparent py-2 text-sm resize-none outline-none placeholder:text-muted-foreground/70 leading-snug"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send(input)
              }
            }}
          />
          <button
            type="button"
            disabled={!input.trim() || busy}
            onClick={() => void send(input)}
            className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-35 disabled:hover:bg-primary transition-colors"
            title="Send"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>

        {turns.some((t) => t.role === 'assistant') && (
          <div className="flex gap-2">
            <ConfirmButton className="flex-1" onClick={insertLastAnswer} hideIcon>
              Insert last answer
            </ConfirmButton>
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3 rounded-md text-xs font-medium border hover:bg-muted"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </Dialog>
  )
}
