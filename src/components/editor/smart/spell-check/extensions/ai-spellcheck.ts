'use client'

import { useEffect, useRef } from 'react'
import type { Editor } from '@tiptap/react'
import { correctFromDictionary } from '@/lib/editor/smart/spell-check/spell-dictionary'
import { useAiStore } from '@/lib/store/use-ai-store'

const TRIGGER = /[\s.,!?;:\n]/
const WORD_RE = /([A-Za-z][A-Za-z'-]{2,})$/
const SKIP_WORD = /^[A-Z]{2,}$|\d/

function wordBeforeCursor(editor: Editor): { from: number; to: number; word: string } | null {
  const { from, empty } = editor.state.selection
  if (!empty || from < 2) return null

  const sep = editor.state.doc.textBetween(from - 1, from)
  if (!TRIGGER.test(sep)) return null

  const start = Math.max(0, from - 48)
  const chunk = editor.state.doc.textBetween(start, from - 1, '\n', '\n')
  const match = chunk.match(WORD_RE)
  if (!match?.[1]) return null

  const word = match[1]
  if (SKIP_WORD.test(word)) return null

  const wordFrom = from - 1 - word.length
  const wordTo = from - 1
  if (wordFrom < 0) return null

  return { from: wordFrom, to: wordTo, word }
}

/**
 * Spelling toggle: instant local auto-correct only (no AI, no tokens, no modal).
 * Uses common typo map + construction / English dictionaries.
 */
export function useAiSpellcheck(editor: Editor | null) {
  const enabled = useAiStore((s) => s.spellingEnabled)
  const lastKeyRef = useRef('')

  useEffect(() => {
    if (!editor || !enabled) return

    const onUpdate = ({
      editor: ed,
      transaction,
    }: {
      editor: Editor
      transaction: { docChanged: boolean; getMeta: (key: string) => unknown }
    }) => {
      if (!transaction.docChanged) return
      if (transaction.getMeta('aiSpellcheck')) return

      const info = wordBeforeCursor(ed)
      if (!info) return

      const key = `${info.from}:${info.word}`
      if (key === lastKeyRef.current) return
      lastKeyRef.current = key

      const corrected = correctFromDictionary(info.word)
      if (!corrected || corrected === info.word) return

      const still = ed.state.doc.textBetween(info.from, info.to)
      if (still !== info.word) return

      const { tr } = ed.state
      tr.insertText(corrected, info.from, info.to)
      tr.setMeta('aiSpellcheck', true)
      ed.view.dispatch(tr)
      lastKeyRef.current = `${info.from}:${corrected}`
    }

    editor.on('update', onUpdate)
    return () => {
      editor.off('update', onUpdate)
    }
  }, [editor, enabled])
}
