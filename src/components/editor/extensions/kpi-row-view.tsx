'use client'

import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import type { KpiItem } from '@/lib/api/ai-types'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'

function parseItems(raw: unknown): KpiItem[] {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as KpiItem[]
    } catch {
      return []
    }
  }
  if (Array.isArray(raw)) return raw as KpiItem[]
  return []
}

function statusClass(status?: KpiItem['status']): string {
  if (status === 'good') return 'kpi-card--good'
  if (status === 'warn') return 'kpi-card--warn'
  if (status === 'bad') return 'kpi-card--bad'
  return ''
}

function TrendIcon({ trend }: { trend?: string }) {
  if (!trend) return null
  const lower = trend.toLowerCase()
  if (lower.includes('down') || lower.startsWith('-')) {
    return <TrendingDown className="w-3 h-3" aria-hidden />
  }
  if (lower.includes('up') || lower.startsWith('+')) {
    return <TrendingUp className="w-3 h-3" aria-hidden />
  }
  return <Minus className="w-3 h-3" aria-hidden />
}

export function KpiRowView({ node }: NodeViewProps) {
  const items = parseItems(node.attrs.itemsJson)

  return (
    <NodeViewWrapper className="kpi-row">
      <div className="kpi-row-grid">
        {items.map((item) => (
          <div key={`${item.label}-${item.value}`} className={`kpi-card ${statusClass(item.status)}`}>
            <p className="kpi-card-label">{item.label}</p>
            <p className="kpi-card-value">{item.value}</p>
            {item.trend ? (
              <p className="kpi-card-trend">
                <TrendIcon trend={item.trend} />
                <span>{item.trend}</span>
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </NodeViewWrapper>
  )
}
