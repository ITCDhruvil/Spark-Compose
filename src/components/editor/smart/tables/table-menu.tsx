'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { findParentNode } from '@tiptap/core'
import type { Editor } from '@tiptap/react'
import {
  ArrowDownToLine, ArrowUpToLine, ArrowLeftToLine, ArrowRightToLine,
  Trash2, Rows3, Columns3, Table2, Combine, SplitSquareHorizontal, PanelTop,
  Sparkles, ChevronDown,
} from 'lucide-react'
import { ToolbarPopover } from '@/components/editor/core/toolbar/toolbar-popover'
import { CHART_TYPE_OPTIONS, SPARK_CHART_LABEL } from '../../ai/analytics/analytics-features'
import { useAnalyticsTools } from '../../ai/analytics/use-analytics-tools'
import type { ChartKind } from '@/lib/editor/smart/spark-chart/chart-from-table'

interface TableMenuProps {
  editor: Editor
}

const MENU_GAP = 8
const VIEWPORT_PAD = 8
const EST_MENU_HEIGHT = 36

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

function getActiveTableRect(editor: Editor): DOMRect | null {
  const match = findParentNode((node) => node.type.name === 'table')(editor.state.selection)
  if (!match) return null
  const dom = editor.view.nodeDOM(match.pos)
  if (!(dom instanceof HTMLElement)) return null
  return dom.getBoundingClientRect()
}

function clampMenuPosition(tableRect: DOMRect, menuWidth: number, menuHeight: number) {
  let top = tableRect.top - menuHeight - MENU_GAP
  let left = tableRect.left
  if (top < VIEWPORT_PAD) top = tableRect.bottom + MENU_GAP
  left = Math.max(
    VIEWPORT_PAD,
    Math.min(left, window.innerWidth - Math.max(menuWidth, 48) - VIEWPORT_PAD),
  )
  return { top, left }
}

export function TableMenu({ editor }: TableMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const analyticsRef = useRef<HTMLButtonElement>(null)
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [chartsOpen, setChartsOpen] = useState(false)
  const analytics = useAnalyticsTools(editor)

  useEffect(() => {
    setMounted(true)
  }, [])

  const updatePosition = useCallback(() => {
    if (!editor.isFocused || !isInTable(editor)) {
      setVisible(false)
      setChartsOpen(false)
      return
    }

    const tableRect = getActiveTableRect(editor)
    if (!tableRect) {
      setVisible(false)
      setChartsOpen(false)
      return
    }

    const menuEl = menuRef.current
    const menuHeight = menuEl?.offsetHeight ?? EST_MENU_HEIGHT
    const menuWidth = menuEl?.offsetWidth ?? 0
    setPosition(clampMenuPosition(tableRect, menuWidth, menuHeight))
    setVisible(true)
  }, [editor])

  useEffect(() => {
    if (!visible) return
    const id = requestAnimationFrame(() => updatePosition())
    return () => cancelAnimationFrame(id)
  }, [visible, updatePosition])

  useEffect(() => {
    const onBlur = () => {
      setVisible(false)
      setChartsOpen(false)
    }

    editor.on('selectionUpdate', updatePosition)
    editor.on('focus', updatePosition)
    editor.on('transaction', updatePosition)
    editor.on('blur', onBlur)

    const scrollEl = document.querySelector('[data-editor-scroll]')
    scrollEl?.addEventListener('scroll', updatePosition, { passive: true })
    window.addEventListener('resize', updatePosition)

    updatePosition()

    return () => {
      editor.off('selectionUpdate', updatePosition)
      editor.off('focus', updatePosition)
      editor.off('transaction', updatePosition)
      editor.off('blur', onBlur)
      scrollEl?.removeEventListener('scroll', updatePosition)
      window.removeEventListener('resize', updatePosition)
    }
  }, [editor, updatePosition])

  useEffect(() => {
    if (!visible || !menuRef.current) return
    const ro = new ResizeObserver(updatePosition)
    ro.observe(menuRef.current)
    return () => ro.disconnect()
  }, [visible, updatePosition])

  const insertChart = useCallback((kind: ChartKind) => {
    setChartsOpen(false)
    analytics.insertChart(kind)
    requestAnimationFrame(updatePosition)
  }, [analytics, updatePosition])

  const menu = visible && mounted ? (
    <div
      ref={menuRef}
      role="toolbar"
      aria-label="Table tools"
      className="fixed z-[10050] pointer-events-auto flex items-center gap-0.5 bg-popover border border-border rounded-lg shadow-lg px-1.5 py-1 max-w-[95vw] overflow-x-auto"
      style={{ top: position.top, left: position.left }}
      onMouseDown={(e) => e.preventDefault()}
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

      <button
        ref={analyticsRef}
        type="button"
        onMouseDown={(e) => { e.preventDefault(); setChartsOpen((o) => !o) }}
        title={`${SPARK_CHART_LABEL} — visualize this table`}
        disabled={!analytics.hasTableContext()}
        aria-expanded={chartsOpen}
        className={`h-7 inline-flex items-center gap-1 pl-1.5 pr-1 rounded-[3px] text-xs transition-colors disabled:opacity-40 shrink-0 border overflow-visible ${
          chartsOpen
            ? 'bg-primary/15 border-primary/35 text-primary'
            : 'hover:bg-[#e8e8e8] dark:hover:bg-white/10 border-[#d1d1d1] dark:border-border bg-white dark:bg-background text-foreground'
        }`}
      >
        <span className="spark-ai-ribbon-icon-slot shrink-0" aria-hidden>
          <Sparkles className="spark-ai-ribbon-icon w-3.5 h-3.5" />
        </span>
        <span className="spark-ai-ribbon-label text-xs font-semibold">{SPARK_CHART_LABEL}</span>
        <ChevronDown className={`w-3 h-3 shrink-0 ${chartsOpen ? 'opacity-80' : 'opacity-60'}`} />
      </button>

      <Divider />

      <MenuBtn onClick={() => editor.chain().focus().deleteTable().run()} title="Delete entire table" disabled={!editor.can().deleteTable()} danger>
        <Trash2 className="w-3.5 h-3.5" />
      </MenuBtn>
    </div>
  ) : null

  return (
    <>
      {mounted && menu ? createPortal(menu, document.body) : null}

      <ToolbarPopover
        open={chartsOpen && visible}
        anchorRef={analyticsRef}
        insideRefs={[menuRef]}
        onClose={() => setChartsOpen(false)}
        placement="bottom"
        className="w-44 rounded-xl border border-border bg-popover p-1.5 shadow-xl pointer-events-auto"
      >
        <p className="px-2 py-1.5 text-xs font-semibold leading-none">
          <span className="spark-ai-ribbon-label">{SPARK_CHART_LABEL}</span>
        </p>
        <p className="px-2 pb-1 text-[10px] text-muted-foreground">
          Pick a chart type
        </p>
        {CHART_TYPE_OPTIONS.map((opt) => {
          const Icon = opt.icon
          return (
            <button
              key={opt.kind}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                insertChart(opt.kind)
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent/50 transition-colors"
            >
              <Icon className="w-4 h-4 text-primary shrink-0" />
              {opt.label}
            </button>
          )
        })}
      </ToolbarPopover>
    </>
  )
}
