'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'
import { Sparkles } from 'lucide-react'
import { aiApi } from '@/lib/api/ai-client'
import { insertMarkdown } from '@/lib/editor/insert-markdown'
import { OPEN_ASK_BOT_EVENT } from '@/lib/editor/ask-bot-events'

interface AiInlineAskProps {
  editor: Editor
}

const LOADING = 'Answering...'

function currentBlockInfo(editor: Editor): { text: string; from: number; to: number; after: number } | null {
  const { $from } = editor.state.selection
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d)
    if (node.isTextblock) {
      const from = $from.start(d)
      const to = $from.end(d)
      const after = $from.after(d)
      const text = editor.state.doc.textBetween(from, to, '\n')
      return { text, from, to, after }
    }
  }
  return null
}

function endsWithSentence(text: string): boolean {
  const t = text.trim()
  if (t.length < 4) return false
  return /[.?!？]\s*$/.test(t)
}

function findLoadingBlock(editor: Editor, startPos: number): { from: number; to: number } | null {
  let found: { from: number; to: number } | null = null
  editor.state.doc.nodesBetween(startPos, editor.state.doc.content.size, (node, pos) => {
    if (found) return false
    if (node.isTextblock && node.textContent === LOADING) {
      found = { from: pos, to: pos + node.nodeSize }
      return false
    }
  })
  return found
}

export function AiInlineAsk({ editor }: AiInlineAskProps) {
  const [mounted, setMounted] = useState(false)
  const [askPos, setAskPos] = useState<{ top: number; left: number } | null>(null)
  const [question, setQuestion] = useState('')
  const [insertAfter, setInsertAfter] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const enableGhost = useCallback(() => {
    const info = currentBlockInfo(editor)
    // Ensure an empty line for the ghost hint
    if (info && info.text.trim().length > 0) {
      editor.chain().focus().insertContent({ type: 'paragraph' }).setAskGhostHint(true).run()
    } else {
      editor.chain().focus().setAskGhostHint(true).run()
    }
  }, [editor])

  useEffect(() => {
    const onAskMode = () => enableGhost()
    window.addEventListener(OPEN_ASK_BOT_EVENT, onAskMode)
    return () => window.removeEventListener(OPEN_ASK_BOT_EVENT, onAskMode)
  }, [enableGhost])

  const refresh = useCallback(() => {
    if (busy) return
    const info = currentBlockInfo(editor)
    if (!info) {
      setAskPos(null)
      setQuestion('')
      setInsertAfter(null)
      return
    }

    const trimmed = info.text.trim()
    if (endsWithSentence(trimmed)) {
      editor.commands.setAskGhostHint(false)
      try {
        const coords = editor.view.coordsAtPos(info.to)
        setAskPos({ top: coords.bottom + 6, left: coords.left })
        setQuestion(trimmed)
        setInsertAfter(info.after)
      } catch {
        setAskPos(null)
      }
    } else {
      setAskPos(null)
      setQuestion('')
      setInsertAfter(null)
    }
  }, [editor, busy])

  useEffect(() => {
    refresh()
    editor.on('selectionUpdate', refresh)
    editor.on('transaction', refresh)
    return () => {
      editor.off('selectionUpdate', refresh)
      editor.off('transaction', refresh)
    }
  }, [editor, refresh])

  const runAsk = useCallback(async () => {
    if (!question || insertAfter == null || busy) return

    setBusy(true)
    setAskPos(null)
    editor.commands.setAskGhostHint(false)

    const after = insertAfter
    editor
      .chain()
      .focus()
      .insertContentAt(after, {
        type: 'paragraph',
        content: [{ type: 'text', text: LOADING, marks: [{ type: 'aiLoading' }] }],
      })
      .run()

    const loading = findLoadingBlock(editor, after)
    if (!loading) {
      setBusy(false)
      return
    }

    try {
      const { answer } = await aiApi.ask({ message: question })
      const text = (answer ?? '').trim() || 'No answer returned.'

      editor.chain().focus().deleteRange({ from: loading.from, to: loading.to }).run()
      insertMarkdown(editor, text, { from: loading.from, to: loading.from })
    } catch {
      const still = findLoadingBlock(editor, after)
      if (still) {
        editor
          .chain()
          .focus()
          .insertContentAt(
            { from: still.from + 1, to: still.to - 1 },
            'Could not get an answer. Try again.',
          )
          .run()
      }
    } finally {
      setBusy(false)
      refresh()
    }
  }, [question, insertAfter, busy, editor, refresh])

  if (!mounted || !editor.isEditable) return null

  return createPortal(
    <>
      {askPos && !busy && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault()
            void runAsk()
          }}
          className="fixed z-[9990] inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-lg hover:bg-primary/90 transition-colors"
          style={{ top: askPos.top, left: askPos.left }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Ask
        </button>
      )}
    </>,
    document.body,
  )
}
