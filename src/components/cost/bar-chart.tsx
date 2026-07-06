'use client'

import { useMemo } from 'react'
import {
  BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip,
  type ChartData, type ChartOptions,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { chartColors } from './chart-colors'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

interface BarItem {
  label: string
  value: number
  secondary?: string
}

export function BarChart({
  items,
  formatValue,
  horizontal = false,
}: {
  items: BarItem[]
  formatValue: (n: number) => string
  /** Better for many categories with long labels (e.g. features). */
  horizontal?: boolean
}) {
  const data: ChartData<'bar'> = useMemo(() => ({
    labels: items.map((i) => i.label),
    datasets: [{
      data: items.map((i) => i.value),
      backgroundColor: chartColors(items.length),
      borderRadius: 4,
      borderSkipped: false,
      maxBarThickness: horizontal ? 22 : 36,
    }],
  }), [items, horizontal])

  const options: ChartOptions<'bar'> = useMemo(() => ({
    indexAxis: horizontal ? 'y' : 'x',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label(ctx) {
            const item = items[ctx.dataIndex]
            const value = Number(ctx.raw ?? 0)
            const extra = item?.secondary ? ` · ${item.secondary}` : ''
            return ` ${formatValue(value)}${extra}`
          },
        },
      },
    },
    scales: {
      x: horizontal
        ? {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.06)' },
            ticks: {
              font: { size: 10 },
              callback(value) {
                return formatValue(Number(value))
              },
            },
          }
        : {
            grid: { display: false },
            ticks: {
              font: { size: 11 },
              maxRotation: 0,
              autoSkip: true,
              callback(_, index) {
                const label = items[index]?.label ?? ''
                return label.length > 10 ? `${label.slice(0, 9)}…` : label
              },
            },
          },
      y: horizontal
        ? {
            grid: { display: false },
            ticks: {
              font: { size: 11 },
              autoSkip: false,
            },
          }
        : {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.06)' },
            ticks: {
              font: { size: 10 },
              callback(value) {
                return formatValue(Number(value))
              },
            },
          },
    },
  }), [items, formatValue, horizontal])

  if (!items.length) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No data yet.</p>
  }

  const height = horizontal
    ? Math.max(220, items.length * 28 + 40)
    : 208

  return (
    <div className="w-full" style={{ height }}>
      <Bar data={data} options={options} />
    </div>
  )
}
