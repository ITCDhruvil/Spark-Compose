'use client'

import { useCallback, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { ChevronDown, Trash2 } from 'lucide-react'
import { ToolbarPopover } from './toolbar-popover'
import { CHART_TYPE_OPTIONS } from './ai/analytics-features'
import type { ChartKind } from '@/lib/editor/chart-from-table'
import { updateChartBlockAttrs } from './extensions/chart-block'

interface ChartBlockToolbarProps {
  editor: Editor
  chartType: ChartKind
  nodePos: number
}

function MenuBtn({
  onClick, title, children, danger,
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
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

function chartTypeLabel(kind: ChartKind): string {
  return CHART_TYPE_OPTIONS.find((o) => o.kind === kind)?.label ?? 'Chart'
}

function chartTypeIcon(kind: ChartKind) {
  return CHART_TYPE_OPTIONS.find((o) => o.kind === kind)?.icon
}

export function ChartBlockToolbar({ editor, chartType, nodePos }: ChartBlockToolbarProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const tagRef = useRef<HTMLButtonElement>(null)
  const [typeOpen, setTypeOpen] = useState(false)

  const TypeIcon = chartTypeIcon(chartType)

  const applyChartType = useCallback((kind: ChartKind) => {
    updateChartBlockAttrs(editor, { chartType: kind }, nodePos)
    setTypeOpen(false)
  }, [editor, nodePos])

  const deleteChart = useCallback(() => {
    setTypeOpen(false)
    editor.chain().focus().setNodeSelection(nodePos).deleteSelection().run()
  }, [editor, nodePos])

  return (
    <>
      <div
        ref={menuRef}
        role="toolbar"
        aria-label="Chart tools"
        className="chart-block-toolbar pointer-events-auto flex items-center gap-0.5 bg-popover border border-border rounded-lg shadow-lg px-1.5 py-1"
        onMouseDown={(e) => e.preventDefault()}
      >
        <button
          ref={tagRef}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); setTypeOpen((o) => !o) }}
          title="Change chart type"
          className={`inline-flex items-center gap-1 h-7 px-2 rounded-[3px] text-xs font-medium shrink-0 transition-colors ${
            typeOpen
              ? 'bg-primary/15 text-primary'
              : 'hover:bg-[#e8e8e8] dark:hover:bg-white/10 text-foreground'
          }`}
        >
          {TypeIcon ? <TypeIcon className="w-3.5 h-3.5 shrink-0" /> : null}
          {chartTypeLabel(chartType)}
          <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
        </button>

        <Divider />

        <MenuBtn onClick={deleteChart} title="Delete chart" danger>
          <Trash2 className="w-3.5 h-3.5" />
        </MenuBtn>
      </div>

      <ToolbarPopover
        open={typeOpen}
        anchorRef={tagRef}
        insideRefs={[menuRef]}
        onClose={() => setTypeOpen(false)}
        placement="bottom"
        className="w-44 rounded-xl border border-border bg-popover p-1.5 shadow-xl pointer-events-auto"
      >
        <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Chart type
        </p>
        {CHART_TYPE_OPTIONS.map((opt) => {
          const Icon = opt.icon
          const active = chartType === opt.kind
          return (
            <button
              key={opt.kind}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                applyChartType(opt.kind)
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                active ? 'bg-primary/15 text-primary' : 'hover:bg-accent/50'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {opt.label}
            </button>
          )
        })}
      </ToolbarPopover>
    </>
  )
}
