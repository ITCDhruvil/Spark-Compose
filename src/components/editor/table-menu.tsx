'use client'

import type { Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import {
  ArrowDownToLine, ArrowUpToLine, ArrowLeftToLine, ArrowRightToLine,
  Trash2, Rows3, Columns3, Table2, Combine, SplitSquareHorizontal, PanelTop,
} from 'lucide-react'

interface TableMenuProps {
  editor: Editor
}

function MenuBtn({
  onClick, title, children, disabled, danger,
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={title}
      disabled={disabled}
      className={`h-7 min-w-7 px-1.5 inline-flex items-center justify-center rounded-[3px] text-xs transition-colors disabled:opacity-40 shrink-0 ${
        danger
          ? 'text-destructive hover:bg-destructive/10'
          : 'hover:bg-[#e8e8e8] dark:hover:bg-white/10 text-foreground'
      }`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-border/80 mx-0.5 shrink-0" />
}

function isInTable(editor: Editor) {
  return editor.isActive('table') || editor.isActive('tableCell') || editor.isActive('tableHeader')
}

export function TableMenu({ editor }: TableMenuProps) {
  return (
    <BubbleMenu
      editor={editor}
      pluginKey="tableBubbleMenu"
      shouldShow={({ editor: ed }) => isInTable(ed)}
      options={{ placement: 'top', offset: 8 }}
      className="flex items-center gap-0.5 bg-popover border border-border rounded-lg shadow-lg px-1.5 py-1 z-[9999] max-w-[95vw] overflow-x-auto"
    >
      <span className="inline-flex items-center gap-1 px-1 text-xs text-muted-foreground shrink-0">
        <Table2 className="w-3.5 h-3.5" />
        Table
      </span>
      <Divider />

      <MenuBtn onClick={() => editor.chain().focus().addRowBefore().run()} title="Insert row above" disabled={!editor.can().addRowBefore()}>
        <ArrowUpToLine className="w-3.5 h-3.5" />
      </MenuBtn>
      <MenuBtn onClick={() => editor.chain().focus().addRowAfter().run()} title="Insert row below" disabled={!editor.can().addRowAfter()}>
        <ArrowDownToLine className="w-3.5 h-3.5" />
      </MenuBtn>
      <MenuBtn onClick={() => editor.chain().focus().deleteRow().run()} title="Delete row" disabled={!editor.can().deleteRow()} danger>
        <Rows3 className="w-3.5 h-3.5" />
      </MenuBtn>

      <Divider />

      <MenuBtn onClick={() => editor.chain().focus().addColumnBefore().run()} title="Insert column left" disabled={!editor.can().addColumnBefore()}>
        <ArrowLeftToLine className="w-3.5 h-3.5" />
      </MenuBtn>
      <MenuBtn onClick={() => editor.chain().focus().addColumnAfter().run()} title="Insert column right" disabled={!editor.can().addColumnAfter()}>
        <ArrowRightToLine className="w-3.5 h-3.5" />
      </MenuBtn>
      <MenuBtn onClick={() => editor.chain().focus().deleteColumn().run()} title="Delete column" disabled={!editor.can().deleteColumn()} danger>
        <Columns3 className="w-3.5 h-3.5" />
      </MenuBtn>

      <Divider />

      <MenuBtn onClick={() => editor.chain().focus().mergeCells().run()} title="Merge cells" disabled={!editor.can().mergeCells()}>
        <Combine className="w-3.5 h-3.5" />
      </MenuBtn>
      <MenuBtn onClick={() => editor.chain().focus().splitCell().run()} title="Split cell" disabled={!editor.can().splitCell()}>
        <SplitSquareHorizontal className="w-3.5 h-3.5" />
      </MenuBtn>
      <MenuBtn onClick={() => editor.chain().focus().toggleHeaderRow().run()} title="Toggle header row" disabled={!editor.can().toggleHeaderRow()}>
        <PanelTop className="w-3.5 h-3.5" />
      </MenuBtn>

      <Divider />

      <MenuBtn onClick={() => editor.chain().focus().deleteTable().run()} title="Delete entire table" disabled={!editor.can().deleteTable()} danger>
        <Trash2 className="w-3.5 h-3.5" />
      </MenuBtn>
    </BubbleMenu>
  )
}
