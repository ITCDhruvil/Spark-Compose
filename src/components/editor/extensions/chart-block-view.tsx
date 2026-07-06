'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import type { ChartDataset, ChartKind, ScatterPoint } from '@/lib/editor/chart-from-table'
import { EditorChart } from '../charts/editor-chart'
import { ChartBlockToolbar } from '../chart-block-toolbar'
import { updateChartBlockAttrs } from './chart-block'

function parseJson<T>(raw: unknown, fallback: T): T {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  }
  if (Array.isArray(raw) || (raw && typeof raw === 'object')) return raw as T
  return fallback
}

export function ChartBlockView({ node, selected, getPos, editor }: NodeViewProps) {
  const chartType = (node.attrs.chartType as ChartKind) ?? 'bar'
  const title = String(node.attrs.title ?? 'Chart')
  const labels = parseJson<string[]>(node.attrs.labelsJson, [])
  const datasets = parseJson<ChartDataset[]>(node.attrs.datasetsJson, [])
  const scatterData = parseJson<ScatterPoint[]>(node.attrs.scatterJson, [])
  const scatterLabel = String(node.attrs.scatterLabel ?? 'Series')

  const [titleDraft, setTitleDraft] = useState(title)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTitleDraft(title)
  }, [title])

  const pos = getPos()
  const nodePos = typeof pos === 'number' ? pos : null

  const commitTitle = useCallback(() => {
    const next = titleDraft.trim() || 'Chart'
    setTitleDraft(next)
    if (next === title || nodePos == null) return
    updateChartBlockAttrs(editor, { title: next }, nodePos)
  }, [editor, nodePos, title, titleDraft])

  const selectChart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.chart-block-title-input')) return
    if ((e.target as HTMLElement).closest('.chart-block-toolbar')) return
    e.preventDefault()
    if (nodePos != null) {
      editor.chain().focus().setNodeSelection(nodePos).run()
    }
  }, [editor, nodePos])

  return (
    <NodeViewWrapper
      className={`chart-block${selected ? ' is-selected' : ''}`}
      data-chart-type={chartType}
      data-node-view-wrapper
      contentEditable={false}
      onMouseDownCapture={selectChart}
    >
      {selected && nodePos != null ? (
        <ChartBlockToolbar editor={editor} chartType={chartType} nodePos={nodePos} />
      ) : null}
      <div className="chart-block-inner">
        {selected ? (
          <input
            ref={titleRef}
            type="text"
            className="chart-block-title chart-block-title-input"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitTitle()
                titleRef.current?.blur()
              }
              if (e.key === 'Escape') {
                e.preventDefault()
                setTitleDraft(title)
                titleRef.current?.blur()
              }
            }}
            onMouseDown={(e) => e.stopPropagation()}
            aria-label="Chart title"
          />
        ) : (
          <p className="chart-block-title">{title}</p>
        )}
        <div className="chart-block-canvas">
          <EditorChart
            chartType={chartType}
            labels={labels}
            datasets={datasets}
            scatterData={scatterData}
            scatterLabel={scatterLabel}
          />
        </div>
      </div>
    </NodeViewWrapper>
  )
}
