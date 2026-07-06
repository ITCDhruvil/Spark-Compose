import { chartColors } from '@/components/cost/chart-colors'
import { parseNumericValue, type TableData } from './table-data'

export type ChartKind = 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'doughnut'

export interface ChartDataset {
  label: string
  data: number[]
  backgroundColor?: string[]
  borderColor?: string
  fill?: boolean
}

export interface ScatterPoint {
  x: number
  y: number
}

export interface ChartBlockConfig {
  chartType: ChartKind
  title: string
  labels: string[]
  datasets: ChartDataset[]
  scatterData?: ScatterPoint[]
  scatterLabel?: string
}

function numericColumns(table: TableData): { index: number; label: string }[] {
  const cols: { index: number; label: string }[] = []
  for (let c = 1; c < table.headers.length; c++) {
    const values = table.rows.map((r) => parseNumericValue(r[c] ?? ''))
    if (values.some((v) => v !== null)) {
      cols.push({ index: c, label: table.headers[c] ?? `Series ${c}` })
    }
  }
  return cols
}

function rowLabels(table: TableData): string[] {
  return table.rows.map((r, i) => (r[0]?.trim() || `Row ${i + 1}`))
}

export function buildChartFromTable(
  table: TableData,
  chartType: ChartKind,
  title?: string,
): ChartBlockConfig | null {
  const cols = numericColumns(table)
  if (!cols.length) return null

  const labels = rowLabels(table)
  const defaultTitle = `${cols[0]?.label ?? 'Values'} by ${table.headers[0] ?? 'category'}`

  if (chartType === 'pie' || chartType === 'doughnut') {
    const col = cols[0]!
    const data = table.rows.map((r) => parseNumericValue(r[col.index] ?? '') ?? 0)
    const colors = chartColors(labels.length)
    return {
      chartType,
      title: title ?? defaultTitle,
      labels,
      datasets: [{
        label: col.label,
        data,
        backgroundColor: colors,
      }],
    }
  }

  if (chartType === 'scatter') {
    const xCol = cols[0]!
    const yCol = cols[1] ?? cols[0]!
    const scatterData: ScatterPoint[] = table.rows.map((r, i) => ({
      x: parseNumericValue(r[xCol.index] ?? '') ?? i + 1,
      y: parseNumericValue(r[yCol.index] ?? '') ?? 0,
    }))
    return {
      chartType: 'scatter',
      title: title ?? `${yCol.label} vs ${xCol.label}`,
      labels: [],
      datasets: [],
      scatterData,
      scatterLabel: `${yCol.label} vs ${xCol.label}`,
    }
  }

  const palette = chartColors(cols.length)
  const datasets: ChartDataset[] = cols.map((col, i) => ({
    label: col.label,
    data: table.rows.map((r) => parseNumericValue(r[col.index] ?? '') ?? 0),
    backgroundColor: chartType === 'bar'
      ? chartColors(labels.length)
      : [palette[i]!],
    borderColor: palette[i],
    fill: chartType === 'area',
  }))

  return {
    chartType: chartType === 'area' ? 'line' : chartType,
    title: title ?? defaultTitle,
    labels,
    datasets,
  }
}

const DATE_HINT = /date|week|day|month|period|sprint|milestone/i

export function buildProgressChart(
  table: TableData,
  mode: 'burndown' | 'trend' | 'csv',
  title?: string,
): ChartBlockConfig | null {
  const dateCol = table.headers.findIndex((h) => DATE_HINT.test(h))
  const labelCol = dateCol >= 0 ? dateCol : 0
  const numericCols = numericColumns(table).filter((c) => c.index !== labelCol)
  if (!numericCols.length) return null

  const labels = table.rows.map((r, i) => r[labelCol]?.trim() || `Point ${i + 1}`)
  const primary = numericCols[0]!
  const data = table.rows.map((r) => parseNumericValue(r[primary.index] ?? '') ?? 0)

  const modeTitle = mode === 'burndown'
    ? 'Burn-down'
    : mode === 'trend'
      ? 'Progress trend'
      : 'CSV visualization'

  const colors = chartColors(1)
  return {
    chartType: mode === 'burndown' ? 'line' : 'area',
    title: title ?? `${modeTitle}: ${primary.label}`,
    labels,
    datasets: [{
      label: primary.label,
      data,
      borderColor: colors[0],
      backgroundColor: [colors[0]!],
      fill: mode !== 'burndown',
    }],
  }
}
