'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { ChevronLeft, ListTree, Plus } from 'lucide-react'
import { extractHeadings, scrollToHeadingId } from '@/lib/editor/smart/document-outline/toc-utils'
import { TocInsertPopover } from './toc-insert-popover'

interface TocSidebarProps {
  editor: Editor | null
}

const LEVEL_STYLE: Record<number, { pad: string; size: string; weight: string }> = {
  1: { pad: 'pl-3', size: 'text-[15px]', weight: 'font-semibold' },
  2: { pad: 'pl-5', size: 'text-[14px]', weight: 'font-medium' },
  3: { pad: 'pl-7', size: 'text-[13px]', weight: 'font-normal' },
  4: { pad: 'pl-9', size: 'text-[13px]', weight: 'font-normal' },
}

const TICK_WIDTH: Record<number, string> = {
  1: 'w-3.5',
  2: 'w-2.5',
  3: 'w-2',
  4: 'w-1.5',
}

export function TocSidebar({ editor }: TocSidebarProps) {
  const [headings, setHeadings] = useState(() => (editor ? extractHeadings(editor, { skipToc: true }) : []))
  const [activeId, setActiveId] = useState<string | null>(null)
  const [insertOpen, setInsertOpen] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const insertRef = useRef<HTMLButtonElement>(null)

  const refresh = useCallback(() => {
    if (!editor) return
    setHeadings(extractHeadings(editor, { skipToc: true }))
  }, [editor])

  useEffect(() => {
    if (!editor) return
    refresh()
    let timer: ReturnType<typeof setTimeout>
    const handler = () => {
      clearTimeout(timer)
      timer = setTimeout(refresh, 300)
    }
    editor.on('update', handler)
    return () => {
      editor.off('update', handler)
      clearTimeout(timer)
    }
  }, [editor, refresh])

  useEffect(() => {
    if (!editor || headings.length === 0) return

    const dom = editor.view.dom
    const onScroll = () => {
      const offset = 120
      let current: string | null = null
      for (const h of headings) {
        const el = document.getElementById(h.id)
        if (!el) continue
        const top = el.getBoundingClientRect().top
        if (top <= offset) current = h.id
      }
      setActiveId(current ?? headings[0]?.id ?? null)
    }

    onScroll()
    dom.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      dom.removeEventListener('scroll', onScroll)
      window.removeEventListener('scroll', onScroll)
    }
  }, [editor, headings])

  if (!editor) return null

  if (!expanded) {
    return (
      <aside
        className="toc-outline-rail hidden lg:flex shrink-0 self-start sticky top-4"
        aria-label="Document outline"
      >
        <div className="toc-outline-rail-inner">
          <button
            type="button"
            title="Expand outline"
            aria-label="Expand On this page"
            aria-expanded={false}
            onClick={() => setExpanded(true)}
            className="toc-outline-rail-btn"
          >
            <ListTree className="w-4 h-4 shrink-0" strokeWidth={2} />
          </button>

          {headings.length > 0 ? (
            <div className="toc-outline-rail-ticks" aria-hidden>
              {headings.slice(0, 16).map((h) => (
                <button
                  key={`${h.id}-${h.pos}`}
                  type="button"
                  title={h.text}
                  onClick={(e) => {
                    e.stopPropagation()
                    scrollToHeadingId(editor, h.id)
                  }}
                  className={`toc-outline-rail-tick ${TICK_WIDTH[h.level] ?? TICK_WIDTH[4]} ${
                    activeId === h.id ? 'toc-outline-rail-tick-active' : ''
                  }`}
                />
              ))}
            </div>
          ) : null}

          <span className="toc-outline-rail-label" aria-hidden>
            On this page
          </span>

          <button
            ref={insertRef}
            type="button"
            title="Insert table of contents"
            aria-label="Insert table of contents"
            aria-expanded={insertOpen}
            onClick={() => setInsertOpen((o) => !o)}
            className="toc-outline-rail-btn"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        <TocInsertPopover
          open={insertOpen}
          anchorRef={insertRef}
          onClose={() => setInsertOpen(false)}
          editor={editor}
        />
      </aside>
    )
  }

  return (
    <aside
      className="toc-outline-panel hidden lg:flex shrink-0 self-start sticky top-4"
      aria-label="Document outline"
    >
      <div className="toc-outline-panel-inner">
        <div className="flex items-center justify-between gap-2 mb-4">
          <span className="text-[14px] font-medium text-muted-foreground">
            On this page
          </span>
          <div className="flex items-center gap-0.5">
            <button
              ref={insertRef}
              type="button"
              title="Insert table of contents"
              aria-label="Insert table of contents"
              aria-expanded={insertOpen}
              onClick={() => setInsertOpen((o) => !o)}
              className="toc-sidebar-index-btn"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              <span>Index</span>
            </button>
            <button
              type="button"
              title="Collapse to bar"
              aria-label="Collapse outline"
              aria-expanded
              onClick={() => setExpanded(false)}
              className="toc-outline-collapse-btn"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        <TocInsertPopover
          open={insertOpen}
          anchorRef={insertRef}
          onClose={() => setInsertOpen(false)}
          editor={editor}
        />

        <nav className="max-h-[calc(100vh-10rem)] overflow-y-auto scrollbar-hide">
          {headings.length === 0 ? (
            <p className="text-[14px] leading-relaxed text-muted-foreground/80">
              Headings appear here as you write.
            </p>
          ) : (
            <ul className="space-y-0.5 border-l border-border/40">
              {headings.map((h) => {
                const isActive = activeId === h.id
                const style = LEVEL_STYLE[h.level] ?? LEVEL_STYLE[4]
                const isNested = h.level >= 3

                return (
                  <li key={`${h.id}-${h.pos}`}>
                    <button
                      type="button"
                      onClick={() => scrollToHeadingId(editor, h.id)}
                      className={[
                        'block w-full text-left py-2 pr-1 leading-snug border-l-2 -ml-px transition-colors',
                        style.pad,
                        style.size,
                        style.weight,
                        isActive
                          ? 'border-primary text-foreground'
                          : isNested
                            ? 'border-transparent text-muted-foreground/85 hover:text-foreground'
                            : 'border-transparent text-muted-foreground hover:text-foreground',
                      ].join(' ')}
                    >
                      <span className="line-clamp-3">{h.text}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </nav>
      </div>
    </aside>
  )
}
