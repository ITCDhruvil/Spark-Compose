'use client'

import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Bold, Italic, Underline, Strikethrough, Code,
  List, ListOrdered, CheckSquare, Link2, Highlighter,
  IndentIncrease, IndentDecrease, CaseSensitive, Table2, Megaphone,
} from 'lucide-react'
import {
  canLiftListItem, canSinkListItem, convertToBulletList, convertToOrderedList,
  liftListItem, sinkListItem,
} from '../editor-list-utils'
import {
  selectionLinesToTable,
  selectionToList,
  transformSelectionCase,
  wrapSelectionInCallout,
} from '@/lib/editor/selection-transforms'
import { getLastCallout } from '@/lib/editor/editor-preferences'

function FormatBtn({
  onClick, active, title, children, disabled,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className={`h-8 min-w-8 px-1.5 inline-flex items-center justify-center rounded-md text-sm transition-colors disabled:opacity-40 ${
        active
          ? 'bg-primary/15 text-primary'
          : 'text-foreground hover:bg-muted'
      }`}
    >
      {children}
    </button>
  )
}

function useEditorRefresh(editor: Editor) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const refresh = () => setTick((n) => n + 1)
    editor.on('selectionUpdate', refresh)
    editor.on('transaction', refresh)
    return () => {
      editor.off('selectionUpdate', refresh)
      editor.off('transaction', refresh)
    }
  }, [editor])
}

export function SelectionFormatBar({ editor }: { editor: Editor }) {
  useEditorRefresh(editor)

  return (
    <div
      className="flex flex-nowrap items-center gap-0.5 px-1.5 py-1.5"
      onMouseDown={(e) => e.preventDefault()}
    >
      <FormatBtn
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="Bold (Ctrl+B)"
      >
        <Bold className="w-4 h-4" />
      </FormatBtn>
      <FormatBtn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="Italic (Ctrl+I)"
      >
        <Italic className="w-4 h-4" />
      </FormatBtn>
      <FormatBtn
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive('underline')}
        title="Underline (Ctrl+U)"
      >
        <Underline className="w-4 h-4" />
      </FormatBtn>
      <FormatBtn
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive('strike')}
        title="Strikethrough"
      >
        <Strikethrough className="w-4 h-4" />
      </FormatBtn>
      <FormatBtn
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive('code')}
        title="Inline code"
      >
        <Code className="w-4 h-4" />
      </FormatBtn>
      <FormatBtn
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        active={editor.isActive('highlight')}
        title="Highlight"
      >
        <Highlighter className="w-4 h-4" />
      </FormatBtn>

      <span className="w-px h-5 bg-border mx-0.5" aria-hidden />

      <FormatBtn
        onClick={() => convertToBulletList(editor)}
        active={editor.isActive('bulletList')}
        title="Bulleted list"
      >
        <List className="w-4 h-4" />
      </FormatBtn>
      <FormatBtn
        onClick={() => convertToOrderedList(editor)}
        active={editor.isActive('orderedList')}
        title="Numbered list"
      >
        <ListOrdered className="w-4 h-4" />
      </FormatBtn>
      <FormatBtn
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        active={editor.isActive('taskList')}
        title="Checklist"
      >
        <CheckSquare className="w-4 h-4" />
      </FormatBtn>

      <span className="w-px h-5 bg-border mx-0.5" aria-hidden />

      <FormatBtn
        onClick={() => sinkListItem(editor)}
        title="Increase indent (Tab)"
        disabled={!canSinkListItem(editor)}
      >
        <IndentIncrease className="w-4 h-4" />
      </FormatBtn>
      <FormatBtn
        onClick={() => liftListItem(editor)}
        title="Decrease indent (Shift+Tab)"
        disabled={!canLiftListItem(editor)}
      >
        <IndentDecrease className="w-4 h-4" />
      </FormatBtn>

      <span className="w-px h-5 bg-border mx-0.5" aria-hidden />

      <FormatBtn
        onClick={() => {
          const url = window.prompt('Link URL')
          if (url) editor.chain().focus().setLink({ href: url }).run()
        }}
        active={editor.isActive('link')}
        title="Link (Ctrl+K)"
      >
        <Link2 className="w-4 h-4" />
      </FormatBtn>

      <span className="w-px h-5 bg-border mx-0.5" aria-hidden />

      <FormatBtn onClick={() => transformSelectionCase(editor, 'title')} title="Title Case">
        <CaseSensitive className="w-4 h-4" />
      </FormatBtn>
      <FormatBtn
        onClick={() => selectionToList(editor)}
        title="Turn into bullet list"
      >
        <List className="w-4 h-4" />
      </FormatBtn>
      <FormatBtn
        onClick={() => selectionLinesToTable(editor)}
        title="Turn lines into table"
      >
        <Table2 className="w-4 h-4" />
      </FormatBtn>
      <FormatBtn
        onClick={() => wrapSelectionInCallout(editor, getLastCallout())}
        title="Wrap in callout"
      >
        <Megaphone className="w-4 h-4" />
      </FormatBtn>
    </div>
  )
}
