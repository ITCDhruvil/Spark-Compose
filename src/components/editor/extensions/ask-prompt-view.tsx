'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from '@tiptap/react'
import { Sparkles, Wand2 } from 'lucide-react'
import type { AskPreset } from '@/lib/api/ai-types'
import { aiApi } from '@/lib/api/ai-client'
import { insertAndStreamAskAnswer } from '@/lib/editor/stream-ask-answer'

const ASK_PRESETS: { id: AskPreset; label: string }[] = [
  { id: 'short', label: 'Short' },
  { id: 'detailed', label: 'Detailed' },
  { id: 'toolbox', label: 'Toolbox talk' },
]

function isReady(text: string) {
  const t = text.trim()
  return t.length >= 4 && /[.?!？]\s*$/.test(t)
}

function clipboardToInlineText(cd: DataTransfer | null) {
  if (!cd) return ''
  const plain = cd.getData('text/plain')
  if (plain) return plain.replace(/\r\n|\r|\n/g, ' ').replace(/\s+/g, ' ')
  const html = cd.getData('text/html')
  if (!html) return ''
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return (tmp.textContent ?? '').replace(/\r\n|\r|\n/g, ' ').replace(/\s+/g, ' ')
}

function nextIsAskAnswer(editor: NodeViewProps['editor'], pos: number, nodeSize: number) {
  const next = editor.state.doc.nodeAt(pos + nodeSize)
  return next?.type.name === 'askAnswer'
}

export function AskPromptView({ node, getPos, editor }: NodeViewProps) {
  const text = node.textContent
  const ready = isReady(text)
  const [busy, setBusy] = useState<'ask' | 'improve' | null>(null)
  const [hasAnswer, setHasAnswer] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const nodeSizeRef = useRef(node.nodeSize)
  nodeSizeRef.current = node.nodeSize

  useEffect(() => () => abortRef.current?.abort(), [])

  const syncHasAnswer = useCallback(() => {
    const pos = getPos()
    if (typeof pos !== 'number') {
      setHasAnswer(false)
      return
    }
    setHasAnswer(nextIsAskAnswer(editor, pos, nodeSizeRef.current))
  }, [editor, getPos])

  useEffect(() => {
    syncHasAnswer()
    editor.on('update', syncHasAnswer)
    return () => {
      editor.off('update', syncHasAnswer)
    }
  }, [editor, syncHasAnswer])

  // Capture-phase paste runs before ProseMirror/SmartPaste, which would
  // otherwise insert block nodes and spill them onto a new line below.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return

    const onPaste = (e: globalThis.ClipboardEvent) => {
      e.preventDefault()
      e.stopImmediatePropagation()

      const flat = clipboardToInlineText(e.clipboardData)
      if (!flat) return

      const pos = getPos()
      if (typeof pos !== 'number') return

      const start = pos + 1
      const end = pos + nodeSizeRef.current - 1
      const { from, to } = editor.state.selection
      const inNode = from >= start && to <= end
      const fromPos = inNode ? from : end
      const toPos = inNode ? to : end

      editor.view.dispatch(
        editor.state.tr.insertText(flat, fromPos, toPos).scrollIntoView(),
      )
    }

    el.addEventListener('paste', onPaste, true)
    return () => el.removeEventListener('paste', onPaste, true)
  }, [editor, getPos])

  const replacePromptText = useCallback((next: string) => {
    const pos = getPos()
    if (typeof pos !== 'number') return
    const from = pos + 1
    const to = pos + node.nodeSize - 1
    editor.chain().focus().insertContentAt({ from, to }, next).run()
  }, [editor, getPos, node.nodeSize])

  const onImprove = useCallback(async () => {
    const prompt = text.trim()
    if (!prompt || busy) return
    setBusy('improve')
    try {
      const { answer } = await aiApi.ask({
        message: `Improve this construction question so it is clearer and more specific. Return ONLY the improved question, ending with ?\n\n${prompt}`,
      })
      let improved = (answer ?? '').trim().replace(/^["']|["']$/g, '')
      // Take first line only if model added extra text
      improved = improved.split('\n').map((l) => l.trim()).find((l) => l.length > 0) ?? improved
      if (improved) {
        replacePromptText(/[.?!？]\s*$/.test(improved) ? improved : `${improved}?`)
      }
    } catch {
      // keep original
    } finally {
      setBusy(null)
    }
  }, [text, busy, replacePromptText])

  const onAsk = useCallback(async (preset: AskPreset = 'default') => {
    const prompt = text.trim()
    if (!prompt || busy) return
    const pos = getPos()
    if (typeof pos !== 'number') return

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setBusy('ask')
    const insertAt = pos + node.nodeSize
    const existing = editor.state.doc.nodeAt(insertAt)
    const replaceExisting = existing?.type.name === 'askAnswer'

    try {
      await insertAndStreamAskAnswer(editor, insertAt, prompt, ctrl.signal, {
        replaceExisting,
        preset,
      })
    } catch {
      // error text is written into the answer block
    } finally {
      if (abortRef.current === ctrl) abortRef.current = null
      setBusy(null)
      syncHasAnswer()
    }
  }, [text, busy, getPos, editor, node.nodeSize, syncHasAnswer])

  return (
    <NodeViewWrapper ref={wrapRef} className="ask-block ask-block-prompt">
      <span className="ask-tag" contentEditable={false}>/ask</span>
      <NodeViewContent className="ask-block-content" />
      {busy === 'improve' && (
        <span className="ask-block-status ai-improve-shimmer-text" contentEditable={false}>
          Improving...
        </span>
      )}
      {ready && !busy && !hasAnswer && (
        <div className="ask-block-actions" contentEditable={false}>
          <button
            type="button"
            className="ask-btn ask-btn-primary"
            onMouseDown={(e) => { e.preventDefault(); void onAsk('default') }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Ask
          </button>
          {ASK_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="ask-btn ask-btn-secondary"
              onMouseDown={(e) => { e.preventDefault(); void onAsk(p.id) }}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            className="ask-btn ask-btn-secondary"
            onMouseDown={(e) => { e.preventDefault(); void onImprove() }}
          >
            <Wand2 className="w-3.5 h-3.5" />
            Improve question
          </button>
        </div>
      )}
    </NodeViewWrapper>
  )
}
