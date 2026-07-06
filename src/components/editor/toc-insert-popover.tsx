'use client'

import { useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { ToolbarPopover } from './toolbar-popover'
import { useTocStore } from '@/lib/store/use-toc-store'
import { extractHeadings } from '@/lib/editor/toc-utils'

interface TocInsertPopoverProps {
  open: boolean
  anchorRef: React.RefObject<HTMLElement | null>
  onClose: () => void
  editor: Editor
}

const PAGE_OPTIONS = [
  { pages: 1, label: '1 page' },
  { pages: 2, label: '2 pages' },
  { pages: 3, label: '3 pages' },
] as const

export function TocInsertPopover({ open, anchorRef, onClose, editor }: TocInsertPopoverProps) {
  const template = useTocStore((s) => s.template)
  const hasHeadings = extractHeadings(editor, { skipToc: true }).length > 0
  const [customOpen, setCustomOpen] = useState(false)
  const [customPages, setCustomPages] = useState('4')
  const inputRef = useRef<HTMLInputElement>(null)

  const insert = (indexPages: number) => {
    if (!hasHeadings) return
    editor.commands.insertTableOfContents({ indexPages, template })
    onClose()
    setCustomOpen(false)
  }

  return (
    <ToolbarPopover open={open} anchorRef={anchorRef} onClose={onClose} className="w-44 p-1">
      <p className="px-2.5 pt-2 pb-1.5 text-[10px] font-medium text-muted-foreground">
        Insert index
      </p>
      {!hasHeadings ? (
        <p className="px-2.5 pb-2 text-[11px] text-muted-foreground leading-snug">
          Add a heading first.
        </p>
      ) : (
        <>
          {PAGE_OPTIONS.map((opt) => (
            <button
              key={opt.pages}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                insert(opt.pages)
              }}
              className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-[12px] text-foreground hover:bg-muted/70 transition-colors"
            >
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              setCustomOpen((v) => !v)
              setTimeout(() => inputRef.current?.focus(), 0)
            }}
            className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-[12px] text-foreground hover:bg-muted/70 transition-colors"
          >
            Custom…
          </button>
          {customOpen ? (
            <div className="flex items-center gap-1.5 px-2 pb-1.5 pt-0.5">
              <input
                ref={inputRef}
                type="number"
                min={1}
                max={20}
                value={customPages}
                onChange={(e) => setCustomPages(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-12 rounded border-0 bg-muted/60 px-2 py-1 text-[12px] focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  const n = Math.min(20, Math.max(1, parseInt(customPages, 10) || 1))
                  insert(n)
                }}
                className="rounded-md px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10"
              >
                Add
              </button>
            </div>
          ) : null}
        </>
      )}
      <p className="px-2.5 py-2 mt-0.5 text-[10px] text-muted-foreground/70 border-t border-border/50">
        Style: {template}
      </p>
    </ToolbarPopover>
  )
}
