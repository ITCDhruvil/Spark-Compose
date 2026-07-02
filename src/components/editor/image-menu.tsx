'use client'

import type { Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import {
  AlignCenter, AlignLeft, AlignRight, Pencil, Trash2,
} from 'lucide-react'
import type { ImageAlign } from './extensions/resizable-image'

interface ImageMenuProps {
  editor: Editor
  onEdit: () => void
}

function MenuBtn({
  onClick, title, children, active, danger,
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
  active?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={title}
      className={`h-7 min-w-7 px-1.5 inline-flex items-center justify-center rounded-[3px] text-xs transition-colors shrink-0 ${
        danger
          ? 'text-destructive hover:bg-destructive/10'
          : active
            ? 'bg-primary/15 text-primary'
            : 'hover:bg-muted text-foreground'
      }`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-border/80 mx-0.5 shrink-0" />
}

export function ImageMenu({ editor, onEdit }: ImageMenuProps) {
  const align = (editor.getAttributes('image').align as ImageAlign) ?? 'center'
  const sizePreset = String(editor.getAttributes('image').sizePreset ?? '100')

  const setAlign = (value: ImageAlign) => {
    editor.chain().focus().updateAttributes('image', { align: value }).run()
  }

  const setWidth = (preset: string) => {
    editor.chain().focus().updateAttributes('image', {
      sizePreset: preset,
      width: null,
      height: null,
    }).run()
  }

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="imageBubbleMenu"
      shouldShow={({ editor: ed }) => ed.isActive('image')}
      options={{ placement: 'top', offset: 8 }}
      className="flex items-center gap-0.5 bg-popover border border-border rounded-lg shadow-lg px-1.5 py-1 z-[9999]"
    >
      <MenuBtn onClick={() => setAlign('left')} active={align === 'left'} title="Align left">
        <AlignLeft className="w-3.5 h-3.5" />
      </MenuBtn>
      <MenuBtn onClick={() => setAlign('center')} active={align === 'center'} title="Align center">
        <AlignCenter className="w-3.5 h-3.5" />
      </MenuBtn>
      <MenuBtn onClick={() => setAlign('right')} active={align === 'right'} title="Align right">
        <AlignRight className="w-3.5 h-3.5" />
      </MenuBtn>
      <Divider />
      {(['25', '50', '75', '100'] as const).map((w) => (
        <button
          key={w}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); setWidth(w) }}
          className={`h-7 px-1.5 text-[10px] rounded shrink-0 ${
            sizePreset === w && !editor.getAttributes('image').width
              ? 'bg-primary/15 text-primary'
              : 'hover:bg-muted'
          }`}
          title={`Width ${w}%`}
        >
          {w}%
        </button>
      ))}
      <Divider />
      <MenuBtn onClick={onEdit} title="Edit image">
        <Pencil className="w-3.5 h-3.5" />
      </MenuBtn>
      <MenuBtn
        onClick={() => editor.chain().focus().deleteSelection().run()}
        title="Delete image"
        danger
      >
        <Trash2 className="w-3.5 h-3.5" />
      </MenuBtn>
    </BubbleMenu>
  )
}
