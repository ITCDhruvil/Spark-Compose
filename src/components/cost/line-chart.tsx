'use client'

import { useMemo } from 'react'
import {
  CategoryScale, Chart as ChartJS, Filler, LinearScale, LineElement,
  PointElement, Tooltip, type ChartData, type ChartOptions,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { chartColor } from './chart-colors'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

interface LineItem {
  label: string
  value: number
  secondary?: string
}

export function LineChart({
  items,
  formatValue,
}: {
  items: LineItem[]
  formatValue: (n: number) => string
}) {
  const stroke = chartColor(0, 1)

  const data: ChartData<'line'> = useMemo(() => ({
    labels: items.map((i) => i.label),
    datasets: [{
      data: items.map((i) => i.value),
      borderColor: stroke,
      backgroundColor: 'rgba(37, 99, 235, 0.12)',
      borderWidth: 2,
      pointBackgroundColor: stroke,
      pointBorderColor: '#fff',
      pointBorderWidth: 1.5,
      pointRadius: 4,
      pointHoverRadius: 6,
      fill: true,
      tension: 0.3,
    }],
  }), [items, stroke])

  const options: ChartOptions<'line'> = useMemo(() => ({
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
      x: {
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
      y: {
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
  }), [items, formatValue])

  if (!items.length) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No data yet.</p>
  }

  return (
    <div className="h-52 w-full">
      <Line data={data} options={options} />
    </div>
  )
}
