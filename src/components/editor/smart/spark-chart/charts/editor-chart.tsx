'use client'

import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ChartDataset, ChartKind, ScatterPoint } from '@/lib/editor/smart/spark-chart/chart-from-table'
import { EDITOR_CHART_COLORS, formatChartNumber } from './editor-chart-theme'

interface EditorChartProps {
  chartType: ChartKind
  labels: string[]
  datasets: ChartDataset[]
  scatterData?: ScatterPoint[]
  scatterLabel?: string
}

interface TooltipPayloadItem {
  name?: string
  value?: number
  color?: string
  dataKey?: string
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg text-xs text-popover-foreground">
      {label ? <p className="mb-1 font-semibold">{label}</p> : null}
      {payload.map((item) => (
        <p key={String(item.dataKey ?? item.name)} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span>
            {item.name}: {formatChartNumber(Number(item.value ?? 0))}
          </span>
        </p>
      ))}
    </div>
  )
}

const CHART_MARGIN = { top: 8, right: 12, left: 4, bottom: 4 }
const AXIS_TICK = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' }
const GRID_STROKE = 'hsl(var(--border))'

export function EditorChart({
  chartType,
  labels,
  datasets,
  scatterData = [],
  scatterLabel = 'Series',
}: EditorChartProps) {
  const colors = EDITOR_CHART_COLORS

  const seriesData = useMemo(
    () =>
      labels.map((name, i) => {
        const row: Record<string, string | number> = { name }
        for (const ds of datasets) row[ds.label] = ds.data[i] ?? 0
        return row
      }),
    [labels, datasets],
  )

  const pieData = useMemo(
    () => labels.map((name, i) => ({ name, value: datasets[0]?.data[i] ?? 0 })),
    [labels, datasets],
  )

  const scatterPoints = useMemo(
    () => scatterData.map((p) => ({ x: p.x, y: p.y })),
    [scatterData],
  )

  if (chartType === 'pie' || chartType === 'doughnut') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="46%"
            innerRadius={chartType === 'doughnut' ? '52%' : 0}
            outerRadius="72%"
            paddingAngle={2}
            stroke="hsl(var(--card))"
            strokeWidth={2}
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  if (chartType === 'scatter') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="4 4" stroke={GRID_STROKE} vertical={false} />
          <XAxis
            type="number"
            dataKey="x"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatChartNumber}
          />
          <YAxis
            type="number"
            dataKey="y"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatChartNumber}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ strokeDasharray: '4 4' }} />
          <Scatter name={scatterLabel} data={scatterPoints} fill={colors[0]} />
        </ScatterChart>
      </ResponsiveContainer>
    )
  }

  if (chartType === 'line' || chartType === 'area') {
    const Chart = chartType === 'area' ? AreaChart : LineChart
    return (
      <ResponsiveContainer width="100%" height="100%">
        <Chart data={seriesData} margin={CHART_MARGIN}>
          <defs>
            {datasets.map((ds, i) => (
              <linearGradient key={ds.label} id={`editor-chart-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors[i % colors.length]} stopOpacity={0.28} />
                <stop offset="100%" stopColor={colors[i % colors.length]} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatChartNumber}
            width={48}
          />
          <Tooltip content={<ChartTooltip />} />
          {datasets.length > 1 ? (
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            />
          ) : null}
          {chartType === 'area'
            ? datasets.map((ds, i) => (
                <Area
                  key={ds.label}
                  type="monotone"
                  dataKey={ds.label}
                  stroke={colors[i % colors.length]}
                  strokeWidth={2.5}
                  fill={`url(#editor-chart-grad-${i})`}
                  dot={{ r: 3.5, strokeWidth: 2, fill: 'hsl(var(--card))' }}
                  activeDot={{ r: 5 }}
                />
              ))
            : datasets.map((ds, i) => (
                <Line
                  key={ds.label}
                  type="monotone"
                  dataKey={ds.label}
                  stroke={colors[i % colors.length]}
                  strokeWidth={2.5}
                  dot={{ r: 3.5, strokeWidth: 2, fill: 'hsl(var(--card))' }}
                  activeDot={{ r: 5 }}
                />
              ))}
        </Chart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={seriesData} margin={CHART_MARGIN}>
        <CartesianGrid strokeDasharray="4 4" stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatChartNumber}
          width={48}
        />
        <Tooltip
          content={<ChartTooltip />}
          cursor={{ fill: 'hsl(var(--muted))', opacity: 0.12 }}
        />
        {datasets.length > 1 ? (
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          />
        ) : null}
        {datasets.map((ds, i) => (
          <Bar
            key={ds.label}
            dataKey={ds.label}
            fill={colors[i % colors.length]}
            radius={[6, 6, 0, 0]}
            maxBarSize={52}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
