'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'
import { Plus } from 'lucide-react'

const HANDLE_LEFT_OFFSET = 22
const BLOCKED_ANCESTORS = new Set([
  'table',
  'callout',
  'askPrompt',
  'askAnswer',
  'listItem',
  'taskItem',
  'blockquote',
  'codeBlock',
])

interface HintLayout {
  top: number
  left: number
}

function getEmptyParagraphHint(editor: Editor): HintLayout | null {
  const { $from, empty } = editor.state.selection
  if (!empty) return null
  if ($from.parent.type.name !== 'paragraph') return null
  if ($from.parent.content.size > 0) return null

  for (let d = $from.depth; d > 0; d--) {
    if (BLOCKED_ANCESTORS.has($from.node(d).type.name)) return null
  }

  const pos = $from.before($from.depth)
  const dom = editor.view.nodeDOM(pos)
  if (!(dom instanceof HTMLElement)) return null

  const rect = dom.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return null

  return {
    top: Math.round(rect.top + 4),
    left: Math.round(Math.max(4, rect.left - HANDLE_LEFT_OFFSET)),
  }
}

interface EmptyLineHintProps {
  editor: Editor
}

export function EmptyLineHint({ editor }: EmptyLineHintProps) {
  const [layout, setLayout] = useState<HintLayout | null>(null)

  const sync = useCallback(() => {
    setLayout(getEmptyParagraphHint(editor))
  }, [editor])

  useEffect(() => {
    sync()
    editor.on('selectionUpdate', sync)
    editor.on('transaction', sync)
    window.addEventListener('scroll', sync, true)
    window.addEventListener('resize', sync)
    return () => {
      editor.off('selectionUpdate', sync)
      editor.off('transaction', sync)
      window.removeEventListener('scroll', sync, true)
      window.removeEventListener('resize', sync)
    }
  }, [editor, sync])

  const openSlashMenu = useCallback(() => {
    editor.chain().focus().insertContent('/').run()
  }, [editor])

  if (!layout || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="editor-empty-hint"
      style={{ top: layout.top, left: layout.left }}
    >
      <button
        type="button"
        className="editor-empty-hint-btn"
        title="Insert block — type / for commands"
        aria-label="Insert block — opens slash commands"
        onMouseDown={(e) => e.preventDefault()}
        onClick={openSlashMenu}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>,
    document.body,
  )
}
