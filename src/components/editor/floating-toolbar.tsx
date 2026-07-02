'use client'

import { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Bold, Italic, Underline, Strikethrough, Link2, Highlighter } from 'lucide-react'

interface FloatingToolbarProps {
  editor: Editor
  onLinkClick: () => void
}

function Btn({ onClick, active, title, children }: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={title}
      className={`p-1.5 rounded text-sm transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}
    >
      {children}
    </button>
  )
}

export function FloatingToolbar({ editor, onLinkClick }: FloatingToolbarProps) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const update = () => {
      const { from, to, empty } = editor.state.selection
      if (empty || from === to) { setPos(null); return }
      const domAtFrom = editor.view.domAtPos(from)
      const range = document.createRange()
      range.setStart(domAtFrom.node, domAtFrom.offset)
      range.setEnd(domAtFrom.node, domAtFrom.offset)
      const domRect = editor.view.dom.getBoundingClientRect()
      const selRects = window.getSelection()?.getRangeAt(0)?.getBoundingClientRect()
      if (!selRects || selRects.width === 0) { setPos(null); return }
      const editorRect = editor.view.dom.parentElement?.getBoundingClientRect() ?? domRect
      setPos({
        top: selRects.top - editorRect.top - 48,
        left: Math.max(0, selRects.left - editorRect.left + selRects.width / 2 - 120),
      })
    }

    editor.on('selectionUpdate', update)
    editor.on('transaction', update)
    return () => {
      editor.off('selectionUpdate', update)
      editor.off('transaction', update)
    }
  }, [editor])

  if (!pos) return null

  const setLink = () => onLinkClick()

  return (
    <div
      ref={ref}
      style={{ top: pos.top, left: pos.left }}
      className="absolute z-50 flex items-center gap-0.5 bg-popover border rounded-md shadow-md p-1 pointer-events-auto"
    >
      <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
        <Bold className="w-3.5 h-3.5" />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
        <Italic className="w-3.5 h-3.5" />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
        <Underline className="w-3.5 h-3.5" />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
        <Strikethrough className="w-3.5 h-3.5" />
      </Btn>
      <div className="w-px h-4 bg-border mx-0.5" />
      <Btn onClick={setLink} active={editor.isActive('link')} title="Link">
        <Link2 className="w-3.5 h-3.5" />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Highlight">
        <Highlighter className="w-3.5 h-3.5" />
      </Btn>
    </div>
  )
}
