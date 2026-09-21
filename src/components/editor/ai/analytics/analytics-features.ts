import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Gauge,
  TrendingUp,
  LineChart,
  PieChart,
  Activity,
  Circle,
  Flame,
  Table2,
} from 'lucide-react'
import type { ChartKind } from '@/lib/editor/smart/spark-chart/chart-from-table'
import type { ProgressAnalyticsMode } from '@/lib/api/ai-types'
import type { FeatureHelp } from '../shared/upcoming-features'

export interface AnalyticsFeature {
  label: string
  icon: LucideIcon
  help: FeatureHelp
}

/** Spark-branded instant chart-from-table feature (table toolbar + analytics). */
export const SPARK_CHART_LABEL = 'Spark Chart'

export const CHART_TYPE_OPTIONS: { kind: ChartKind; label: string; icon: LucideIcon }[] = [
  { kind: 'bar', label: 'Bar', icon: BarChart3 },
  { kind: 'line', label: 'Line', icon: LineChart },
  { kind: 'pie', label: 'Pie', icon: PieChart },
  { kind: 'area', label: 'Area', icon: TrendingUp },
  { kind: 'scatter', label: 'Scatter', icon: Activity },
  { kind: 'doughnut', label: 'Doughnut', icon: Circle },
]

export const ANALYTICS_FEATURES: AnalyticsFeature[] = [
  {
    label: SPARK_CHART_LABEL,
    icon: BarChart3,
    help: {
      what: 'Instantly turn this table into bar, line, pie, area, scatter, or doughnut charts.',
      how: 'Click in a table with a label column and numeric columns, then Spark Chart in the table toolbar (or Spark AI → Analytics).',
    },
  },
  {
    label: 'KPI widgets',
    icon: Gauge,
    help: {
      what: 'Visual KPI cards such as SPI, CPI, open RFIs, defects, delays, and productivity.',
      how: 'Select notes or a metrics table, then Spark AI → Analytics → KPI widgets to insert cards below.',
    },
  },
  {
    label: 'Progress analytics',
    icon: TrendingUp,
    help: {
      what: 'Burn-down charts, progress trends, and CSV visualizations from project data.',
      how: 'Select a table or CSV text, then Spark AI → Analytics → Progress and choose burn-down, trend, or CSV chart.',
    },
  },
]

export const PROGRESS_MODE_OPTIONS: {
  mode: ProgressAnalyticsMode
  label: string
  icon: LucideIcon
  description: string
}[] = [
  {
    mode: 'burndown',
    label: 'Burn-down',
    icon: Flame,
    description: 'Remaining work or tasks over time',
  },
  {
    mode: 'trend',
    label: 'Trends',
    icon: LineChart,
    description: 'Progress or resource metrics by period',
  },
  {
    mode: 'csv',
    label: 'From CSV',
    icon: Table2,
    description: 'Chart pasted spreadsheet or CSV data',
  },
]
