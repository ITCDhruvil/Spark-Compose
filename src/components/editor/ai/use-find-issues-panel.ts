'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/core'
import { aiApi } from '@/lib/api/ai-client'
import { posAfterRange } from '@/lib/editor/ai-loading-text'

/**
 * Inserts an in-editor issues block below the selection (not a floating modal).
 */
export function useFindIssuesPanel(editor: Editor) {
  const [active, setActive] = useState(false)
  const suppressMenuRef = useRef(false)
  const nodePosRef = useRef<number | null>(null)

  useEffect(() => {
    const sync = () => {
      let has = false
      editor.state.doc.descendants((n) => {
        if (n.type.name === 'aiIssues') has = true
      })
      if (!has) {
        suppressMenuRef.current = false
        setActive(false)
        nodePosRef.current = null
      }
    }
    editor.on('update', sync)
    return () => { editor.off('update', sync) }
  }, [editor])

  const close = useCallback(() => {
    const pos = nodePosRef.current
    if (typeof pos === 'number') {
      const node = editor.state.doc.nodeAt(pos)
      if (node?.type.name === 'aiIssues') {
        editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run()
      }
    }
    nodePosRef.current = null
    suppressMenuRef.current = false
    setActive(false)
  }, [editor])

  const run = useCallback(async () => {
    const { from, to, empty } = editor.state.selection
    if (empty) return
    const text = editor.state.doc.textBetween(from, to, '\n').trim()
    if (!text) return

    suppressMenuRef.current = true
    setActive(true)

    // Collapse selection so the AI bubble disappears
    editor.commands.setTextSelection(to)

    const insertAt = posAfterRange(editor, { from, to })

    editor.chain().focus().insertContentAt(insertAt, {
      type: 'aiIssues',
      attrs: {
        status: 'loading',
        issues: [],
        sourceFrom: from,
        sourceTo: to,
      },
    }).run()

    nodePosRef.current = insertAt

    try {
      const res = await aiApi.findIssues({ text })
      const node = editor.state.doc.nodeAt(insertAt)
      if (!node || node.type.name !== 'aiIssues') {
        // Position may have shifted — find nearest aiIssues node
        let found: number | null = null
        editor.state.doc.descendants((n, pos) => {
          if (n.type.name === 'aiIssues' && found == null) found = pos
        })
        if (found == null) {
          setActive(false)
          suppressMenuRef.current = false
          return
        }
        nodePosRef.current = found
        editor.chain().focus().command(({ tr }) => {
          tr.setNodeMarkup(found!, undefined, {
            status: 'ready',
            issues: res.issues,
            sourceFrom: from,
            sourceTo: to,
          })
          return true
        }).run()
      } else {
        editor.chain().focus().command(({ tr }) => {
          tr.setNodeMarkup(insertAt, undefined, {
            status: 'ready',
            issues: res.issues,
            sourceFrom: from,
            sourceTo: to,
          })
          return true
        }).run()
      }

      if (!res.issues.length) {
        setTimeout(() => close(), 1600)
      }
    } catch {
      close()
    }
  }, [editor, close])

  return {
    open: active,
    run,
    close,
    suppressMenu: () => suppressMenuRef.current,
    // unused by portal UI — kept for API compat
    status: 'idle' as const,
    issues: [],
    position: null,
    fixingId: null,
    fixingAll: false,
    fixOne: () => {},
    fixAll: () => {},
  }
}
