'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Editor } from '@tiptap/react'

interface TocEntry {
  level: number
  text: string
  id: string
}

interface TocSidebarProps {
  editor: Editor | null
}

export function TocSidebar({ editor }: TocSidebarProps) {
  const [headings, setHeadings] = useState<TocEntry[]>([])

  const extractHeadings = useCallback(() => {
    if (!editor) return
    const entries: TocEntry[] = []
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'heading') {
        const text = node.textContent
        const id = text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
        entries.push({ level: node.attrs.level as number, text, id })
      }
    })
    setHeadings(entries)
  }, [editor])

  useEffect(() => {
    if (!editor) return
    extractHeadings()
    let timer: ReturnType<typeof setTimeout>
    const handler = () => {
      clearTimeout(timer)
      timer = setTimeout(extractHeadings, 500)
    }
    editor.on('update', handler)
    return () => {
      editor.off('update', handler)
      clearTimeout(timer)
    }
  }, [editor, extractHeadings])

  if (headings.length === 0) return null

  const indentMap: Record<number, string> = { 1: '', 2: 'ml-3', 3: 'ml-6', 4: 'ml-9' }

  return (
    <div className="hidden xl:block w-48 flex-shrink-0">
      <div className="sticky top-4 space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">On this page</p>
        {headings.map((h, i) => (
          <button
            key={i}
            onClick={() => {
              const el = document.getElementById(h.id)
              el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
            className={`block text-xs text-muted-foreground hover:text-foreground text-left w-full truncate py-0.5 ${indentMap[h.level] ?? ''}`}
          >
            {h.text}
          </button>
        ))}
      </div>
    </div>
  )
}
