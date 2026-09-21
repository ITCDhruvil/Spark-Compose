'use client'

import { useCallback, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { aiApi } from '@/lib/api/ai-client'

const MIN_POLISH_CHARS = 20

export function useImproveDoc(editor: Editor) {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const run = useCallback(async () => {
    const blocks: { from: number; to: number; text: string }[] = []
    editor.state.doc.forEach((node, offset) => {
      const text = node.textContent
      if (text.trim()) blocks.push({ from: offset + 1, to: offset + node.nodeSize - 1, text })
    })

    if (blocks.length === 0) {
      setStatus('done')
      return
    }

    setStatus('running')
    setProgress({ current: 0, total: blocks.length })

    try {
      for (let i = blocks.length - 1; i >= 0; i--) {
        const block = blocks[i]
        if (block.text.trim().length >= MIN_POLISH_CHARS) {
          let accumulated = ''
          const ctrl = new AbortController()
          for await (const raw of aiApi.rewrite({ selection: block.text, mode: 'polish' }, ctrl.signal)) {
            const evt = JSON.parse(raw) as { type: string; delta?: string }
            if (evt.type === 'token' && evt.delta) accumulated += evt.delta
          }
          if (accumulated) {
            editor.chain().insertContentAt({ from: block.from, to: block.to }, accumulated).run()
          }
        }
        setProgress({ current: blocks.length - i, total: blocks.length })
      }
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }, [editor])

  return { run, status, progress }
}
