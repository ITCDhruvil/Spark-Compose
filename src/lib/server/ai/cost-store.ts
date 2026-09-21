import { randomUUID } from 'crypto'
import fs from 'fs'
import path from 'path'
import { calcTokenCostUsd, getModelPricing, DEFAULT_MODEL_ID } from './pricing'
import {
  AI_FEATURES, featureLabel,
  type CostLogEntry, type CostOverview, type CostOverviewRankItem,
  type FeatureCostInsight, type UserCostInsight,
} from './cost-types'

const DATA_DIR = path.join(process.cwd(), '.data')
const DATA_FILE = path.join(DATA_DIR, 'ai-cost-logs.json')

let cache: CostLogEntry[] | null = null

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

/** Vercel’s runtime filesystem is read-only except /tmp; local `.data/` still works. */
function persistSafe(logs: CostLogEntry[]) {
  try {
    ensureDir()
    fs.writeFileSync(DATA_FILE, JSON.stringify(logs, null, 2), 'utf8')
  } catch {
    // keep in-memory cache only
  }
}

function buildLineItems(
  model: string,
  promptTokens: number,
  completionTokens: number,
): CostLogEntry['lineItems'] {
  const pricing = getModelPricing(model)
  const costs = calcTokenCostUsd(model, promptTokens, completionTokens)
  return [
    {
      label: 'Input tokens (prompt)',
      tokens: promptTokens,
      unitPricePer1M: pricing.inputPer1M,
      costUsd: costs.inputCostUsd,
    },
    {
      label: 'Output tokens (completion)',
      tokens: completionTokens,
      unitPricePer1M: pricing.outputPer1M,
      costUsd: costs.outputCostUsd,
    },
  ]
}

function seedLogs(): CostLogEntry[] {
  const users = ['alex', 'jordan', 'sam', 'riley', 'local-user']
  const features = AI_FEATURES.filter((f) => f.id !== 'unknown').map((f) => f.id)
  const models = [DEFAULT_MODEL_ID, 'gpt-4o-mini']
  const now = Date.now()
  const logs: CostLogEntry[] = []

  for (let day = 29; day >= 0; day--) {
    const queriesThatDay = 4 + ((day * 3) % 8)
    for (let q = 0; q < queriesThatDay; q++) {
      const feature = features[(day + q * 5) % features.length]
      const userId = users[(day + q) % users.length]
      const model = models[(day + q) % models.length]
      const promptTokens = 120 + ((day * 17 + q * 41) % 900)
      const completionTokens = 40 + ((day * 13 + q * 23) % 500)
      const costs = calcTokenCostUsd(model, promptTokens, completionTokens)
      const pricing = getModelPricing(model)
      const createdAt = new Date(now - day * 86_400_000 - q * 3_600_000).toISOString()
      const tags =
        feature === 'image-caption' || feature === 'draft'
          ? (q % 3 === 0 ? ['image', 'vision'] : feature === 'image-caption' ? ['image', 'vision'] : [])
          : []
      logs.push({
        id: `seed-${day}-${q}`,
        createdAt,
        feature,
        featureLabel: featureLabel(feature),
        userId,
        model,
        modelLabel: pricing.label,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        inputCostUsd: costs.inputCostUsd,
        outputCostUsd: costs.outputCostUsd,
        totalCostUsd: costs.totalCostUsd,
        estimated: false,
        tags,
        lineItems: buildLineItems(model, promptTokens, completionTokens),
      })
    }
  }
  return logs
}

function load(): CostLogEntry[] {
  if (cache) return cache
  try {
    ensureDir()
    if (!fs.existsSync(DATA_FILE)) {
      cache = seedLogs()
      persistSafe(cache)
      return cache
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8')
    cache = (JSON.parse(raw) as CostLogEntry[]).map((e) => ({
      ...e,
      tags: Array.isArray(e.tags) ? e.tags : [],
    }))
  } catch {
    cache = seedLogs()
    persistSafe(cache)
  }
  return cache ?? seedLogs()
}

export function recordAiUsage(input: {
  feature: string
  userId: string
  model: string
  promptTokens: number
  completionTokens: number
  estimated?: boolean
  tags?: string[]
  meta?: CostLogEntry['meta']
}): CostLogEntry {
  const model = input.model || DEFAULT_MODEL_ID
  const pricing = getModelPricing(model)
  const costs = calcTokenCostUsd(model, input.promptTokens, input.completionTokens)
  const tags = [...new Set((input.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean))]
  const entry: CostLogEntry = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    feature: input.feature,
    featureLabel: featureLabel(input.feature),
    userId: input.userId || 'local-user',
    model,
    modelLabel: pricing.label,
    promptTokens: input.promptTokens,
    completionTokens: input.completionTokens,
    totalTokens: input.promptTokens + input.completionTokens,
    inputCostUsd: costs.inputCostUsd,
    outputCostUsd: costs.outputCostUsd,
    totalCostUsd: costs.totalCostUsd,
    estimated: !!input.estimated,
    tags,
    lineItems: buildLineItems(model, input.promptTokens, input.completionTokens),
    meta: input.meta,
  }
  const logs = load()
  logs.unshift(entry)
  // Keep last 5k entries
  if (logs.length > 5000) logs.length = 5000
  persistSafe(logs)
  return entry
}

export function listCostLogs(opts?: {
  limit?: number
  feature?: string
  userId?: string
}): CostLogEntry[] {
  let logs = load()
  if (opts?.feature) logs = logs.filter((l) => l.feature === opts.feature)
  if (opts?.userId) logs = logs.filter((l) => l.userId === opts.userId)
  const limit = opts?.limit ?? 200
  return logs.slice(0, limit)
}

export function getCostLog(id: string): CostLogEntry | null {
  return load().find((l) => l.id === id) ?? null
}

export function getCostOverview(): CostOverview {
  const logs = load()
  const pricing = getModelPricing(DEFAULT_MODEL_ID)
  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10)

  let totalCostUsd = 0
  let totalTokens = 0
  let promptTokens = 0
  let completionTokens = 0
  let totalInputCostUsd = 0
  let totalOutputCostUsd = 0
  let estimatedQueryCount = 0
  let exactQueryCount = 0
  let costTodayUsd = 0
  let queriesToday = 0
  let costLast7DaysUsd = 0
  let queriesLast7Days = 0

  const byDay = new Map<string, { costUsd: number; queries: number }>()
  const byFeature = new Map<string, { label: string; costUsd: number; queries: number }>()
  const byUser = new Map<string, { costUsd: number; queries: number }>()

  for (const l of logs) {
    const date = l.createdAt.slice(0, 10)
    totalCostUsd += l.totalCostUsd
    totalTokens += l.totalTokens
    promptTokens += l.promptTokens
    completionTokens += l.completionTokens
    totalInputCostUsd += l.inputCostUsd
    totalOutputCostUsd += l.outputCostUsd
    if (l.estimated) estimatedQueryCount += 1
    else exactQueryCount += 1

    if (date === today) {
      costTodayUsd += l.totalCostUsd
      queriesToday += 1
    }
    if (date >= weekAgo) {
      costLast7DaysUsd += l.totalCostUsd
      queriesLast7Days += 1
    }

    const day = byDay.get(date) ?? { costUsd: 0, queries: 0 }
    day.costUsd += l.totalCostUsd
    day.queries += 1
    byDay.set(date, day)

    const feat = byFeature.get(l.feature) ?? { label: l.featureLabel, costUsd: 0, queries: 0 }
    feat.costUsd += l.totalCostUsd
    feat.queries += 1
    byFeature.set(l.feature, feat)

    const user = byUser.get(l.userId) ?? { costUsd: 0, queries: 0 }
    user.costUsd += l.totalCostUsd
    user.queries += 1
    byUser.set(l.userId, user)
  }

  const totalQueries = logs.length
  const costByDay = [...byDay.entries()]
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const costByFeature = [...byFeature.entries()]
    .map(([feature, v]) => ({ feature, ...v }))
    .sort((a, b) => b.costUsd - a.costUsd)

  const costByUser = [...byUser.entries()]
    .map(([userId, v]) => ({ userId, ...v }))
    .sort((a, b) => b.costUsd - a.costUsd)

  const activeDays = costByDay.length || 1
  const avgDailyCost = totalCostUsd / activeDays
  const safeTotalCost = totalCostUsd || 1

  const toFeatureRank = (
    row: { feature: string; label: string; costUsd: number; queries: number } | undefined,
  ): CostOverviewRankItem | null => {
    if (!row) return null
    return {
      id: row.feature,
      label: row.label,
      costUsd: row.costUsd,
      queries: row.queries,
      sharePct: (row.costUsd / safeTotalCost) * 100,
      avgCostUsd: row.queries ? row.costUsd / row.queries : 0,
    }
  }

  const toUserRank = (
    row: { userId: string; costUsd: number; queries: number } | undefined,
  ): CostOverviewRankItem | null => {
    if (!row) return null
    return {
      id: row.userId,
      label: row.userId,
      costUsd: row.costUsd,
      queries: row.queries,
      sharePct: (row.costUsd / safeTotalCost) * 100,
      avgCostUsd: row.queries ? row.costUsd / row.queries : 0,
    }
  }

  const featuresByQueries = [...costByFeature].sort((a, b) => b.queries - a.queries)
  const featuresByAvg = [...costByFeature]
    .filter((f) => f.queries > 0)
    .sort((a, b) => (b.costUsd / b.queries) - (a.costUsd / a.queries))
  const featuresByCheapest = [...costByFeature].sort((a, b) => a.costUsd - b.costUsd)
  const usersByQueries = [...costByUser].sort((a, b) => b.queries - a.queries)
  const usersByLightest = [...costByUser].sort((a, b) => a.costUsd - b.costUsd)

  const mostExpensiveFeature = toFeatureRank(costByFeature[0])
  const mostUsedFeature = toFeatureRank(featuresByQueries[0])
  const highestAvgCostFeature = toFeatureRank(featuresByAvg[0])
  const cheapestFeature = toFeatureRank(featuresByCheapest[0])
  const highestSpendUser = toUserRank(costByUser[0])
  const mostActiveUser = toUserRank(usersByQueries[0])
  const lightestUser = toUserRank(usersByLightest[0])

  const top3FeaturesSharePct = costByFeature
    .slice(0, 3)
    .reduce((s, f) => s + f.costUsd, 0) / safeTotalCost * 100

  const busiestDayByQueries = [...costByDay].sort((a, b) => b.queries - a.queries)[0] ?? null
  const busiestDayByCost = [...costByDay].sort((a, b) => b.costUsd - a.costUsd)[0] ?? null

  return {
    totalCostUsd,
    totalQueries,
    totalTokens,
    promptTokens,
    completionTokens,
    totalInputCostUsd,
    totalOutputCostUsd,
    inputCostSharePct: (totalInputCostUsd / safeTotalCost) * 100,
    outputCostSharePct: (totalOutputCostUsd / safeTotalCost) * 100,
    avgCostPerQueryUsd: totalQueries ? totalCostUsd / totalQueries : 0,
    avgTokensPerQuery: totalQueries ? totalTokens / totalQueries : 0,
    costPer1kTokensUsd: totalTokens ? (totalCostUsd / totalTokens) * 1000 : 0,
    blendedRatePer1MUsd: totalTokens ? (totalCostUsd / totalTokens) * 1_000_000 : 0,
    featureCount: byFeature.size,
    userCount: byUser.size,
    estimatedQueryCount,
    exactQueryCount,
    estimatedSharePct: totalQueries ? (estimatedQueryCount / totalQueries) * 100 : 0,
    costTodayUsd,
    queriesToday,
    costLast7DaysUsd,
    queriesLast7Days,
    projectedMonthlyUsd: avgDailyCost * 30,
    avgDailyCostUsd: avgDailyCost,
    defaultModel: DEFAULT_MODEL_ID,
    defaultModelLabel: pricing.label,
    inputPricePer1M: pricing.inputPer1M,
    outputPricePer1M: pricing.outputPer1M,
    costByDay,
    costByFeature,
    costByUser,
    mostExpensiveFeature,
    mostUsedFeature,
    highestAvgCostFeature,
    cheapestFeature,
    highestSpendUser,
    mostActiveUser,
    lightestUser,
    topUserSharePct: highestSpendUser?.sharePct ?? 0,
    top3FeaturesSharePct,
    singleQueryUsers: costByUser.filter((u) => u.queries === 1).length,
    singleQueryFeatures: costByFeature.filter((f) => f.queries === 1).length,
    busiestDayByQueries,
    busiestDayByCost,
    topFeature: costByFeature[0]
      ? {
          feature: costByFeature[0].feature,
          label: costByFeature[0].label,
          costUsd: costByFeature[0].costUsd,
          queries: costByFeature[0].queries,
        }
      : null,
    topUser: costByUser[0]
      ? {
          userId: costByUser[0].userId,
          costUsd: costByUser[0].costUsd,
          queries: costByUser[0].queries,
        }
      : null,
  }
}

export function getUserInsights(): UserCostInsight[] {
  const logs = load()
  const map = new Map<string, CostLogEntry[]>()
  for (const l of logs) {
    const list = map.get(l.userId) ?? []
    list.push(l)
    map.set(l.userId, list)
  }

  return [...map.entries()]
    .map(([userId, entries]) => {
      const byFeatureMap = new Map<string, { label: string; costUsd: number; queries: number }>()
      let totalCostUsd = 0
      for (const e of entries) {
        totalCostUsd += e.totalCostUsd
        const f = byFeatureMap.get(e.feature) ?? { label: e.featureLabel, costUsd: 0, queries: 0 }
        f.costUsd += e.totalCostUsd
        f.queries += 1
        byFeatureMap.set(e.feature, f)
      }
      const byFeature = [...byFeatureMap.entries()]
        .map(([feature, v]) => ({ feature, ...v }))
        .sort((a, b) => b.costUsd - a.costUsd)
      return {
        userId,
        totalCostUsd,
        totalQueries: entries.length,
        byFeature,
        topFeature: byFeature[0]?.label ?? '—',
      }
    })
    .sort((a, b) => b.totalCostUsd - a.totalCostUsd)
}

export function getFeatureInsights(): FeatureCostInsight[] {
  const logs = load()
  const totalCost = logs.reduce((s, l) => s + l.totalCostUsd, 0) || 1
  const map = new Map<string, CostLogEntry[]>()
  for (const l of logs) {
    const list = map.get(l.feature) ?? []
    list.push(l)
    map.set(l.feature, list)
  }

  return [...map.entries()]
    .map(([feature, entries]) => {
      const totalCostUsd = entries.reduce((s, e) => s + e.totalCostUsd, 0)
      const totalTokens = entries.reduce((s, e) => s + e.totalTokens, 0)
      const byUserMap = new Map<string, { costUsd: number; queries: number }>()
      for (const e of entries) {
        const u = byUserMap.get(e.userId) ?? { costUsd: 0, queries: 0 }
        u.costUsd += e.totalCostUsd
        u.queries += 1
        byUserMap.set(e.userId, u)
      }
      return {
        feature,
        label: entries[0]?.featureLabel ?? featureLabel(feature),
        totalCostUsd,
        totalQueries: entries.length,
        avgCostUsd: entries.length ? totalCostUsd / entries.length : 0,
        totalTokens,
        sharePct: (totalCostUsd / totalCost) * 100,
        byUser: [...byUserMap.entries()]
          .map(([userId, v]) => ({ userId, ...v }))
          .sort((a, b) => b.costUsd - a.costUsd),
      }
    })
    .sort((a, b) => b.totalCostUsd - a.totalCostUsd)
}
