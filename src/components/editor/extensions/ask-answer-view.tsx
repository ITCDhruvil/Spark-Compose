'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from '@tiptap/react'
import { RefreshCw } from 'lucide-react'
import type { AskPreset } from '@/lib/api/ai-types'
import { streamAskAnswer } from '@/lib/editor/stream-ask-answer'

const ASK_PRESETS: { id: AskPreset; label: string; title: string }[] = [
  { id: 'default', label: 'Teach again', title: 'Regenerate with adaptive teaching depth' },
  { id: 'short', label: 'Essentials', title: 'Shorter core idea' },
  { id: 'detailed', label: 'Go deeper', title: 'More WHY and field checks' },
  { id: 'toolbox', label: 'Field brief', title: 'Crew-ready briefing style' },
]

function promptFromPreviousSibling(editor: NodeViewProps['editor'], pos: number) {
  const $pos = editor.state.doc.resolve(pos)
  const index = $pos.index($pos.depth)
  if (index <= 0) return ''
  const prev = $pos.node($pos.depth).child(index - 1)
  if (prev.type.name !== 'askPrompt') return ''
  return prev.textContent.trim()
}

export function AskAnswerView({ node, getPos, editor }: NodeViewProps) {
  const [busy, setBusy] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const streaming = Boolean(node.attrs.streaming) || busy
  const loadingText = node.textContent.trim()
  const isLoading = streaming
    || loadingText === 'Answering...'
    || loadingText === 'Thinking it through…'

  useEffect(() => () => abortRef.current?.abort(), [])

  const onRegenerate = useCallback(async (preset: AskPreset = 'default') => {
    const pos = getPos()
    if (typeof pos !== 'number' || busy) return

    const prompt = promptFromPreviousSibling(editor, pos)
    if (!prompt) return

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setBusy(true)

    try {
      await streamAskAnswer(editor, pos, prompt, ctrl.signal, {
        existingNodeSize: node.nodeSize,
        preset,
      })
    } catch {
      // error text is written into the answer block
    } finally {
      if (abortRef.current === ctrl) abortRef.current = null
      setBusy(false)
    }
  }, [busy, editor, getPos, node.nodeSize])

  return (
    <NodeViewWrapper
      className={`ask-block ask-block-answer${streaming ? ' is-streaming' : ''}`}
    >
      <div className="ask-block-answer-header" contentEditable={false}>
        <span className="ask-tag ask-tag-answer" title="Expert insight">insight</span>
        {!isLoading && (
          <div className="ask-block-answer-actions">
            {ASK_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                title={p.title}
                className="ask-btn ask-btn-secondary ask-btn-regenerate"
                onMouseDown={(e) => { e.preventDefault(); void onRegenerate(p.id) }}
              >
                {p.id === 'default' && <RefreshCw className="w-3.5 h-3.5" />}
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="ask-block-answer-body">
        <NodeViewContent className="ask-block-answer-content" />
      </div>
    </NodeViewWrapper>
  )
}
