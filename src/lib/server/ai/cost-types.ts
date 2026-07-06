export const AI_FEATURES = [
  { id: 'autocomplete', label: 'Autocomplete' },
  { id: 'spelling', label: 'Spelling' },
  { id: 'grammar', label: 'Grammar' },
  { id: 'improve', label: 'Improve' },
  { id: 'explain', label: 'Explain' },
  { id: 'suggest', label: 'Suggestions' },
  { id: 'find-issues', label: 'Find issues' },
  { id: 'to-table', label: 'To table' },
  { id: 'kpi-widgets', label: 'KPI widgets' },
  { id: 'progress-analytics', label: 'Progress analytics' },
  { id: 'action-items', label: 'Action items' },
  { id: 'against-brief', label: 'Against brief' },
  { id: 'glossary', label: 'Glossary' },
  { id: 'translate', label: 'Translate' },
  { id: 'tone', label: 'Tone' },
  { id: 'summarize', label: 'Summarize' },
  { id: 'draft', label: 'Draft' },
  { id: 'ask', label: 'Ask' },
  { id: 'outline', label: 'Outline' },
  { id: 'image-caption', label: 'Image caption' },
  { id: 'compare-summary', label: 'Compare summary' },
  { id: 'unknown', label: 'Unknown' },
] as const

export type AiFeatureId = (typeof AI_FEATURES)[number]['id']

export function featureLabel(id: string): string {
  return AI_FEATURES.find((f) => f.id === id)?.label ?? id
}

export interface CostLineItem {
  label: string
  tokens: number
  unitPricePer1M: number
  costUsd: number
}

export interface CostLogEntry {
  id: string
  createdAt: string
  feature: AiFeatureId | string
  featureLabel: string
  userId: string
  model: string
  modelLabel: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  inputCostUsd: number
  outputCostUsd: number
  totalCostUsd: number
  estimated: boolean
  /** e.g. image, vision, draft — for filtering multimodal queries */
  tags: string[]
  lineItems: CostLineItem[]
  meta?: Record<string, string | number | boolean>
}

export interface CostOverviewRankItem {
  id: string
  label: string
  costUsd: number
  queries: number
  sharePct: number
  avgCostUsd: number
}

export interface CostOverviewDayItem {
  date: string
  costUsd: number
  queries: number
}

export interface CostOverview {
  totalCostUsd: number
  totalQueries: number
  totalTokens: number
  promptTokens: number
  completionTokens: number
  totalInputCostUsd: number
  totalOutputCostUsd: number
  inputCostSharePct: number
  outputCostSharePct: number
  avgCostPerQueryUsd: number
  avgTokensPerQuery: number
  costPer1kTokensUsd: number
  blendedRatePer1MUsd: number
  featureCount: number
  userCount: number
  estimatedQueryCount: number
  exactQueryCount: number
  estimatedSharePct: number
  costTodayUsd: number
  queriesToday: number
  costLast7DaysUsd: number
  queriesLast7Days: number
  projectedMonthlyUsd: number
  avgDailyCostUsd: number
  defaultModel: string
  defaultModelLabel: string
  inputPricePer1M: number
  outputPricePer1M: number
  costByDay: CostOverviewDayItem[]
  costByFeature: { feature: string; label: string; costUsd: number; queries: number }[]
  costByUser: { userId: string; costUsd: number; queries: number }[]
  /** Highest total cost */
  mostExpensiveFeature: CostOverviewRankItem | null
  /** Most queries */
  mostUsedFeature: CostOverviewRankItem | null
  /** Highest avg cost per query among features with usage */
  highestAvgCostFeature: CostOverviewRankItem | null
  cheapestFeature: CostOverviewRankItem | null
  highestSpendUser: CostOverviewRankItem | null
  mostActiveUser: CostOverviewRankItem | null
  lightestUser: CostOverviewRankItem | null
  topUserSharePct: number
  top3FeaturesSharePct: number
  singleQueryUsers: number
  singleQueryFeatures: number
  busiestDayByQueries: CostOverviewDayItem | null
  busiestDayByCost: CostOverviewDayItem | null
  /** @deprecated use mostExpensiveFeature */
  topFeature: { feature: string; label: string; costUsd: number; queries: number } | null
  /** @deprecated use highestSpendUser */
  topUser: { userId: string; costUsd: number; queries: number } | null
}

export interface UserCostInsight {
  userId: string
  totalCostUsd: number
  totalQueries: number
  byFeature: { feature: string; label: string; costUsd: number; queries: number }[]
  topFeature: string
}

export interface FeatureCostInsight {
  feature: string
  label: string
  totalCostUsd: number
  totalQueries: number
  avgCostUsd: number
  totalTokens: number
  sharePct: number
  byUser: { userId: string; costUsd: number; queries: number }[]
}
