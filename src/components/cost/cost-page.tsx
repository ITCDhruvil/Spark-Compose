'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, LayoutDashboard, List, Users, Sparkles, Calculator, X, Search,
  BarChart3,
} from 'lucide-react'
import { BarChart } from './bar-chart'
import { LineChart } from './line-chart'
import {
  formatDateTime, formatFullDate, formatTokenCostMath, formatTokens, formatUsd, formatUsdExact,
} from '@/lib/cost/format'
import type { CostLogEntry, CostOverview, FeatureCostInsight, UserCostInsight } from '@/lib/server/ai/cost-types'
import type { ModelPricing } from '@/lib/server/ai/pricing'

type Tab = 'overview' | 'logs' | 'users' | 'features' | 'projection'

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'logs', label: 'Query logs', icon: List },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'features', label: 'Features', icon: Sparkles },
  { id: 'projection', label: 'Projection', icon: Calculator },
]

interface PricingPayload {
  defaultModel: string
  models: ModelPricing[]
  features: { id: string; label: string }[]
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const longValue = value.length > 14
  return (
    <div className="rounded-xl border bg-card p-4 min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`mt-1 font-semibold text-foreground break-words ${
          longValue ? 'text-lg leading-snug' : 'text-2xl tabular-nums'
        }`}
        title={value}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground leading-snug">{hint}</p> : null}
    </div>
  )
}

function KpiSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {children}
      </div>
    </section>
  )
}

const LOGS_PAGE_SIZE = 12
/** Charts only show top spenders — full list lives in the paginated table. */
const TOP_USERS_CHART = 10
const USERS_PAGE_SIZE = 12

function LogDetailPanel({
  entry,
  onClose,
}: {
  entry: CostLogEntry
  onClose: () => void
}) {
  const inputLine = entry.lineItems.find((l) => l.label.toLowerCase().includes('input'))
    ?? entry.lineItems[0]
  const outputLine = entry.lineItems.find((l) => l.label.toLowerCase().includes('output'))
    ?? entry.lineItems[1]

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end p-1.5 sm:p-2 bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="log-detail-title"
        className="flex h-full w-full max-w-md flex-col overflow-hidden rounded-md border bg-background shadow-2xl ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b bg-background px-4 py-3">
          <div className="min-w-0">
            <p id="log-detail-title" className="text-base font-semibold text-foreground">
              Cost breakdown
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {entry.featureLabel}
              <span className="text-muted-foreground/50"> · </span>
              <span className="font-mono text-xs">{entry.id.slice(0, 8)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-muted shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hide p-4 space-y-3.5 text-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">User</p>
              <p className="font-medium mt-0.5">{entry.userId}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Feature</p>
              <p className="font-medium mt-0.5">{entry.featureLabel}</p>
              <p className="text-[11px] text-muted-foreground font-mono">{entry.feature}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Model</p>
              <p className="font-medium mt-0.5">{entry.modelLabel}</p>
              <p className="text-[11px] text-muted-foreground font-mono">{entry.model}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">When</p>
              <p className="font-medium mt-0.5 leading-snug">{formatDateTime(entry.createdAt)}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Prompt tokens</p>
              <p className="font-medium mt-0.5 tabular-nums">{formatTokens(entry.promptTokens)}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Completion tokens</p>
              <p className="font-medium mt-0.5 tabular-nums">{formatTokens(entry.completionTokens)}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Total tokens</p>
              <p className="font-medium mt-0.5 tabular-nums">{formatTokens(entry.totalTokens)}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Usage source</p>
              <p className="font-medium mt-0.5">{entry.estimated ? 'Estimated' : 'OpenAI usage'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Tags</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(entry.tags ?? []).length ? (entry.tags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${
                      tag === 'image' || tag === 'vision'
                        ? 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    {tag}
                  </span>
                )) : (
                  <span className="text-xs text-muted-foreground">None</span>
                )}
              </div>
            </div>
          </div>

          {entry.estimated ? (
            <p className="rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 px-3 py-2 text-xs">
              Token counts were estimated from text length (API did not return usage). Costs use the same list-price formula.
            </p>
          ) : null}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              Line items
            </p>
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 font-medium">Line item</th>
                    <th className="px-3 py-2 font-medium text-right">Tokens</th>
                    <th className="px-3 py-2 font-medium text-right">$/1M</th>
                    <th className="px-3 py-2 font-medium text-right">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.lineItems.map((line) => (
                    <tr key={line.label} className="border-t">
                      <td className="px-3 py-2">{line.label}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatTokens(line.tokens)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">${line.unitPricePer1M}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">{formatUsdExact(line.costUsd)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30 font-semibold">
                    <td className="px-3 py-2.5" colSpan={3}>Total</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatUsdExact(entry.totalCostUsd)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="rounded-md border bg-muted/20 p-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              How the cost is calculated
            </p>
            <p className="text-xs text-muted-foreground leading-snug">
              Cost = (tokens ÷ 1,000,000) × list price per 1M tokens for this model.
            </p>
            <div className="space-y-1.5 text-xs">
              {inputLine ? (
                <div className="rounded-md border bg-background px-2.5 py-1.5 space-y-0.5">
                  <p className="font-medium text-foreground">Input (prompt)</p>
                  <p className="font-mono text-[11px] leading-snug text-foreground/90 break-all">
                    {formatTokenCostMath(inputLine.tokens, inputLine.unitPricePer1M, inputLine.costUsd)}
                  </p>
                </div>
              ) : null}
              {outputLine ? (
                <div className="rounded-md border bg-background px-2.5 py-1.5 space-y-0.5">
                  <p className="font-medium text-foreground">Output (completion)</p>
                  <p className="font-mono text-[11px] leading-snug text-foreground/90 break-all">
                    {formatTokenCostMath(outputLine.tokens, outputLine.unitPricePer1M, outputLine.costUsd)}
                  </p>
                </div>
              ) : null}
              <div className="rounded-md border bg-background px-2.5 py-1.5 space-y-0.5">
                <p className="font-medium text-foreground">Total</p>
                <p className="font-mono text-[11px] leading-snug text-foreground/90 break-all">
                  {formatUsdExact(entry.inputCostUsd)} + {formatUsdExact(entry.outputCostUsd)} = {formatUsdExact(entry.totalCostUsd)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-md border p-3 space-y-1.5 text-xs text-muted-foreground">
            <p className="font-semibold uppercase tracking-wide text-muted-foreground">End-to-end path</p>
            <p className="leading-relaxed">
              Client → <span className="font-mono text-foreground/80">/api/ai/*</span>
              {' '}→ OpenAI <span className="font-mono text-foreground/80">{entry.model}</span>
              {' '}→ usage tokens × list price
            </p>
            <p>
              Exact total: <span className="font-mono font-medium text-foreground">{formatUsdExact(entry.totalCostUsd)}</span>
              {' '}({formatTokens(entry.promptTokens)} in + {formatTokens(entry.completionTokens)} out)
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function QueryLogsTable({
  logs,
  onSelect,
}: {
  logs: CostLogEntry[]
  onSelect: (entry: CostLogEntry) => void
}) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return logs
    return logs.filter((row) => {
      const when = formatDateTime(row.createdAt).toLowerCase()
      const tags = (row.tags ?? []).join(' ')
      return (
        when.includes(q)
        || row.featureLabel.toLowerCase().includes(q)
        || row.feature.toLowerCase().includes(q)
        || row.userId.toLowerCase().includes(q)
        || row.modelLabel.toLowerCase().includes(q)
        || row.model.toLowerCase().includes(q)
        || tags.includes(q)
        || formatUsdExact(row.totalCostUsd).includes(q)
        || String(row.totalTokens).includes(q)
      )
    })
  }, [logs, query])

  const pageCount = Math.max(1, Math.ceil(filtered.length / LOGS_PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = filtered.slice(safePage * LOGS_PAGE_SIZE, safePage * LOGS_PAGE_SIZE + LOGS_PAGE_SIZE)

  return (
    <div className="rounded-xl border overflow-hidden bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <p className="text-sm font-semibold text-foreground">Query logs</p>
        <label className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(0)
            }}
            placeholder="Search feature, user, tag (image)…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
          />
        </label>
      </div>

      <div className="overflow-hidden">
        <table className="w-full table-fixed text-sm text-left">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="w-[24%] px-3 py-2.5 font-medium">Time</th>
              <th className="w-[14%] px-3 py-2.5 font-medium">Feature</th>
              <th className="w-[16%] px-3 py-2.5 font-medium">Tags</th>
              <th className="w-[12%] px-3 py-2.5 font-medium">User</th>
              <th className="w-[12%] px-3 py-2.5 font-medium">Model</th>
              <th className="w-[11%] px-3 py-2.5 font-medium text-right">Tokens</th>
              <th className="w-[11%] px-3 py-2.5 font-medium text-right">Cost</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr
                key={row.id}
                className="border-t hover:bg-muted/30 cursor-pointer"
                onClick={() => onSelect(row)}
              >
                <td className="px-3 py-2.5 text-xs leading-snug" title={formatDateTime(row.createdAt)}>
                  {formatDateTime(row.createdAt)}
                </td>
                <td className="px-3 py-2.5 font-medium truncate" title={row.featureLabel}>{row.featureLabel}</td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {(row.tags ?? []).length ? (row.tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium capitalize ${
                          tag === 'image' || tag === 'vision'
                            ? 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {tag}
                      </span>
                    )) : (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 truncate" title={row.userId}>{row.userId}</td>
                <td className="px-3 py-2.5 text-xs truncate" title={row.modelLabel}>{row.modelLabel}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatTokens(row.totalTokens)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums font-medium">{formatUsdExact(row.totalCostUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!filtered.length ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          {logs.length ? 'No logs match your search.' : 'No queries logged yet.'}
        </p>
      ) : (
        <div className="flex items-center justify-between gap-3 border-t px-4 py-2.5 text-xs text-muted-foreground">
          <span>
            {filtered.length} log{filtered.length === 1 ? '' : 's'}
            {query.trim() ? ' found' : ''}
            {' · '}
            page {safePage + 1} of {pageCount}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-md border bg-background px-2.5 py-1 font-medium text-foreground disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              className="rounded-md border bg-background px-2.5 py-1 font-medium text-foreground disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ProjectionTab({ pricing }: { pricing: PricingPayload | null }) {
  const models = pricing?.models ?? []
  const featureCatalog = pricing?.features ?? []
  const [modelId, setModelId] = useState(pricing?.defaultModel ?? 'gpt-4o-mini')
  const [users, setUsers] = useState(10)
  const [featuresInUse, setFeaturesInUse] = useState(8)
  const [queriesPerUserPerDay, setQueriesPerUserPerDay] = useState(12)
  const [workingDays, setWorkingDays] = useState<5 | 6>(5)

  useEffect(() => {
    if (!pricing) return
    setModelId(pricing.defaultModel)
    if (pricing.features.length) {
      setFeaturesInUse(Math.min(8, pricing.features.length))
    }
  }, [pricing])

  const model = models.find((m) => m.id === modelId) ?? models[0]

  const projection = useMemo(() => {
    if (!model) return null

    const promptPerQuery = 400
    const completionPerQuery = 200
    const costPerQuery =
      (promptPerQuery / 1_000_000) * model.inputPer1M
      + (completionPerQuery / 1_000_000) * model.outputPer1M

    const featureCount = Math.max(1, featuresInUse)
    const userCount = Math.max(0, users)
    const qPerUser = Math.max(0, queriesPerUserPerDay)
    // Total queries/day = users × queries per user (spread across features for the table)
    const dailyQueries = userCount * qPerUser
    const queriesPerFeaturePerDay = dailyQueries / featureCount
    const dailyCost = dailyQueries * costPerQuery

    const weeksPerYear = 52
    const workingDaysPerWeek = workingDays
    const workingDaysPerMonth = (workingDaysPerWeek * weeksPerYear) / 12
    const workingDaysPerQuarter = workingDaysPerMonth * 3
    const workingDaysPerHalfYear = workingDaysPerMonth * 6
    const workingDaysPerYear = workingDaysPerWeek * weeksPerYear

    const periods = [
      { id: 'daily', label: 'Daily (working day)', days: 1 },
      { id: 'weekly', label: 'Weekly', days: workingDaysPerWeek },
      { id: 'monthly', label: 'Monthly', days: workingDaysPerMonth },
      { id: 'quarterly', label: 'Quarterly', days: workingDaysPerQuarter },
      { id: 'halfYearly', label: 'Half-yearly', days: workingDaysPerHalfYear },
      { id: 'yearly', label: 'Yearly', days: workingDaysPerYear },
    ].map((p) => ({
      ...p,
      queries: dailyQueries * p.days,
      costUsd: dailyCost * p.days,
    }))

    const activeFeatures = featureCatalog.slice(0, featureCount)
    const perFeature = (activeFeatures.length ? activeFeatures : [{ id: 'all', label: 'All features' }]).map((f) => ({
      feature: f.id,
      label: f.label,
      dailyQueries: queriesPerFeaturePerDay,
      dailyCost: queriesPerFeaturePerDay * costPerQuery,
    }))

    return {
      costPerQuery,
      promptPerQuery,
      completionPerQuery,
      dailyQueries,
      dailyCost,
      userCount,
      featureCount,
      workingDaysPerWeek,
      workingDaysPerMonth,
      periods,
      perFeature,
    }
  }, [model, users, featuresInUse, queriesPerUserPerDay, workingDays, featureCatalog])

  if (!pricing || !model || !projection) {
    return <p className="text-sm text-muted-foreground">Loading pricing…</p>
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-4 space-y-4">
        <p className="text-sm font-semibold text-foreground">Projection inputs</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm space-y-1">
            <span className="text-muted-foreground">Model</span>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className="w-full rounded-md border bg-background px-2.5 py-2 text-sm"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </label>
          <label className="text-sm space-y-1">
            <span className="text-muted-foreground">Active users</span>
            <input
              type="number"
              min={0}
              value={users}
              onChange={(e) => setUsers(Math.max(0, Number(e.target.value) || 0))}
              className="w-full rounded-md border bg-background px-2.5 py-2 text-sm tabular-nums"
            />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-muted-foreground">Features in use</span>
            <input
              type="number"
              min={1}
              max={Math.max(1, featureCatalog.length || 20)}
              value={featuresInUse}
              onChange={(e) => setFeaturesInUse(Math.max(1, Number(e.target.value) || 1))}
              className="w-full rounded-md border bg-background px-2.5 py-2 text-sm tabular-nums"
            />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-muted-foreground">Queries / user / day</span>
            <input
              type="number"
              min={0}
              value={queriesPerUserPerDay}
              onChange={(e) => setQueriesPerUserPerDay(Math.max(0, Number(e.target.value) || 0))}
              className="w-full rounded-md border bg-background px-2.5 py-2 text-sm tabular-nums"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm text-muted-foreground">Working days / week</span>
          <label className="inline-flex items-center gap-2 text-sm font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={workingDays === 5}
              onChange={() => setWorkingDays(5)}
              className="h-4 w-4 rounded border-border"
            />
            5 days
          </label>
          <label className="inline-flex items-center gap-2 text-sm font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={workingDays === 6}
              onChange={() => setWorkingDays(6)}
              className="h-4 w-4 rounded border-border"
            />
            6 days
          </label>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Daily queries = users × queries/user/day
          ({formatTokens(projection.userCount)} × {formatTokens(queriesPerUserPerDay)} = {formatTokens(projection.dailyQueries)}).
          Spread evenly across {projection.featureCount} features.
          Assumes ~{projection.promptPerQuery} input + {projection.completionPerQuery} output tokens per query
          on {model.label} (${model.inputPer1M}/1M in · ${model.outputPer1M}/1M out).
          Monthly uses {projection.workingDaysPerMonth.toFixed(1)} working days ({workingDays}×52÷12).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {projection.periods.map((p) => (
          <StatCard
            key={p.id}
            label={p.label}
            value={formatUsd(p.costUsd)}
            hint={`${formatTokens(Math.round(p.queries))} queries · ${p.days === 1 ? '1 day' : `${p.days.toFixed(p.days % 1 ? 1 : 0)} days`}`}
          />
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Cost / query" value={formatUsd(projection.costPerQuery)} />
        <StatCard
          label="Daily queries"
          value={formatTokens(projection.dailyQueries)}
          hint={`${formatUsd(projection.dailyCost)} / working day`}
        />
        <StatCard
          label="Users × features"
          value={`${formatTokens(projection.userCount)} × ${formatTokens(projection.featureCount)}`}
          hint={`${formatTokens(queriesPerUserPerDay)} queries / user / day`}
        />
        <StatCard
          label="Working days / week"
          value={String(projection.workingDaysPerWeek)}
          hint={`${projection.workingDaysPerMonth.toFixed(1)} days / month`}
        />
      </div>

      <div className="rounded-xl border overflow-hidden bg-card">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">Period projections</p>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Period</th>
              <th className="px-4 py-2.5 font-medium text-right">Working days</th>
              <th className="px-4 py-2.5 font-medium text-right">Queries</th>
              <th className="px-4 py-2.5 font-medium text-right">Cost</th>
            </tr>
          </thead>
          <tbody>
            {projection.periods.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-2.5 font-medium">{p.label}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {p.days === 1 ? '1' : p.days.toFixed(p.days % 1 ? 1 : 0)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatTokens(Math.round(p.queries))}</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatUsd(p.costUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border overflow-hidden bg-card">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">Per-feature (even split)</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Daily load divided across {projection.featureCount} features
          </p>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Feature</th>
              <th className="px-4 py-2.5 font-medium text-right">Daily queries</th>
              <th className="px-4 py-2.5 font-medium text-right">Daily cost</th>
              <th className="px-4 py-2.5 font-medium text-right">Monthly cost</th>
              <th className="px-4 py-2.5 font-medium text-right">Yearly cost</th>
            </tr>
          </thead>
          <tbody>
            {projection.perFeature.map((row) => (
              <tr key={row.feature} className="border-t">
                <td className="px-4 py-2.5 font-medium">{row.label}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{row.dailyQueries.toFixed(1)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatUsd(row.dailyCost)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {formatUsd(row.dailyCost * projection.workingDaysPerMonth)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                  {formatUsd(row.dailyCost * projection.workingDaysPerWeek * 52)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function UserDetailPanel({
  user,
  onClose,
}: {
  user: UserCostInsight
  onClose: () => void
}) {
  const avgCost = user.totalQueries > 0 ? user.totalCostUsd / user.totalQueries : 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end p-1.5 sm:p-2 bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-detail-title"
        className="flex h-full w-full max-w-md flex-col overflow-hidden rounded-md border bg-background shadow-2xl ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b bg-background px-4 py-3">
          <div className="min-w-0">
            <p id="user-detail-title" className="text-base font-semibold text-foreground">
              User usage
            </p>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{user.userId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-muted shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hide p-4 space-y-3.5 text-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">User</p>
              <p className="font-medium mt-0.5 break-all">{user.userId}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Top feature</p>
              <p className="font-medium mt-0.5">{user.topFeature}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Total queries</p>
              <p className="font-medium mt-0.5 tabular-nums">{formatTokens(user.totalQueries)}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Total cost</p>
              <p className="font-medium mt-0.5 tabular-nums">{formatUsdExact(user.totalCostUsd)}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Avg cost / query</p>
              <p className="font-medium mt-0.5 tabular-nums">{formatUsdExact(avgCost)}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Features used</p>
              <p className="font-medium mt-0.5 tabular-nums">{user.byFeature.length}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              Feature usage
            </p>
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 font-medium">Feature</th>
                    <th className="px-3 py-2 font-medium text-right">Queries</th>
                    <th className="px-3 py-2 font-medium text-right">Share</th>
                    <th className="px-3 py-2 font-medium text-right">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {user.byFeature.map((f) => {
                    const share = user.totalCostUsd > 0
                      ? (f.costUsd / user.totalCostUsd) * 100
                      : 0
                    return (
                      <tr key={f.feature} className="border-t">
                        <td className="px-3 py-2 font-medium text-foreground">{f.label}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatTokens(f.queries)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{share.toFixed(1)}%</td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">
                          {formatUsdExact(f.costUsd)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30 font-semibold">
                    <td className="px-3 py-2.5">Total</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatTokens(user.totalQueries)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">100%</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatUsdExact(user.totalCostUsd)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function UsersTab({
  users,
  onSelectUser,
}: {
  users: UserCostInsight[]
  onSelectUser: (user: UserCostInsight) => void
}) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) =>
      u.userId.toLowerCase().includes(q)
      || u.topFeature.toLowerCase().includes(q)
      || formatUsd(u.totalCostUsd).includes(q)
      || formatUsdExact(u.totalCostUsd).includes(q)
      || String(u.totalQueries).includes(q),
    )
  }, [users, query])

  const pageCount = Math.max(1, Math.ceil(filtered.length / USERS_PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = filtered.slice(safePage * USERS_PAGE_SIZE, safePage * USERS_PAGE_SIZE + USERS_PAGE_SIZE)
  const topUsers = users.slice(0, TOP_USERS_CHART)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-4 flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold">Top spenders</p>
          <p className="text-[11px] text-muted-foreground">
            Top {Math.min(TOP_USERS_CHART, users.length)} of {users.length} — click a row for details
          </p>
        </div>
        <LineChart
          items={topUsers.map((u) => ({
            label: u.userId,
            value: u.totalCostUsd,
            secondary: u.topFeature,
          }))}
          formatValue={formatUsd}
        />
      </div>

      <div className="rounded-xl border overflow-hidden bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Users</p>
          <label className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(0)
              }}
              placeholder="Search user, feature, cost…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            />
          </label>
        </div>
        <div className="overflow-hidden">
          <table className="w-full table-fixed text-sm text-left">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-[28%] px-4 py-2.5 font-medium">User</th>
                <th className="w-[28%] px-4 py-2.5 font-medium">Top feature</th>
                <th className="w-[22%] px-4 py-2.5 font-medium text-right">Queries</th>
                <th className="w-[22%] px-4 py-2.5 font-medium text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((u) => (
                <tr
                  key={u.userId}
                  className="border-t hover:bg-muted/30 cursor-pointer"
                  onClick={() => onSelectUser(u)}
                >
                  <td className="px-4 py-2.5 font-medium truncate" title={u.userId}>{u.userId}</td>
                  <td className="px-4 py-2.5 text-foreground/90 truncate" title={u.topFeature}>{u.topFeature}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatTokens(u.totalQueries)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatUsdExact(u.totalCostUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {users.length ? 'No users match your search.' : 'No users yet.'}
          </p>
        ) : (
          <div className="flex items-center justify-between gap-3 border-t px-4 py-2.5 text-xs text-muted-foreground">
            <span>
              {filtered.length} user{filtered.length === 1 ? '' : 's'}
              {query.trim() ? ' found' : ''}
              {' · '}
              page {safePage + 1} of {pageCount}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="rounded-md border bg-background px-2.5 py-1 font-medium text-foreground disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                className="rounded-md border bg-background px-2.5 py-1 font-medium text-foreground disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function CostPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [overview, setOverview] = useState<CostOverview | null>(null)
  const [logs, setLogs] = useState<CostLogEntry[]>([])
  const [users, setUsers] = useState<UserCostInsight[]>([])
  const [features, setFeatures] = useState<FeatureCostInsight[]>([])
  const [pricing, setPricing] = useState<PricingPayload | null>(null)
  const [selected, setSelected] = useState<CostLogEntry | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserCostInsight | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [o, l, u, f, p] = await Promise.all([
        fetch('/api/cost/overview').then((r) => r.json()),
        fetch('/api/cost/logs?limit=300').then((r) => r.json()),
        fetch('/api/cost/users').then((r) => r.json()),
        fetch('/api/cost/features').then((r) => r.json()),
        fetch('/api/cost/pricing').then((r) => r.json()),
      ])
      if (o.error) throw new Error(o.error)
      setOverview(o)
      setLogs(l.logs ?? [])
      setUsers(u.users ?? [])
      setFeatures(f.features ?? [])
      setPricing(p)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cost data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Page stays scrollable without a visible scrollbar
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    html.classList.add('scrollbar-hide')
    body.classList.add('scrollbar-hide')
    return () => {
      html.classList.remove('scrollbar-hide')
      body.classList.remove('scrollbar-hide')
    }
  }, [])

  // When detail panel is open, lock the page; only the panel scrolls
  useEffect(() => {
    if (!selected && !selectedUser) return
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.overflow
    const prevBody = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prevHtml
      body.style.overflow = prevBody
    }
  }, [selected, selectedUser])

  return (
    <main className="min-h-screen bg-muted/20">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                Spark Compose
              </Link>
            </div>
            <h1 className="inline-flex items-center gap-2 text-xl font-semibold text-foreground">
              <BarChart3 className="w-5 h-5 shrink-0" aria-hidden />
              Cost & Analysis
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Usage and cost for {overview?.defaultModel ?? 'the configured model'} across editor features.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            Refresh
          </button>
        </div>

        <div className="flex flex-wrap gap-1 border-b mb-6">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === id
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <>
            {tab === 'overview' && overview ? (
              <div className="space-y-8">
                <KpiSection title="Spend">
                  <StatCard label="Total cost" value={formatUsd(overview.totalCostUsd)} />
                  <StatCard
                    label="Input cost"
                    value={formatUsdExact(overview.totalInputCostUsd)}
                    hint={`${overview.inputCostSharePct.toFixed(1)}% of total · ${formatTokens(overview.promptTokens)} tokens`}
                  />
                  <StatCard
                    label="Output cost"
                    value={formatUsdExact(overview.totalOutputCostUsd)}
                    hint={`${overview.outputCostSharePct.toFixed(1)}% of total · ${formatTokens(overview.completionTokens)} tokens`}
                  />
                  <StatCard
                    label="Avg cost / query"
                    value={formatUsd(overview.avgCostPerQueryUsd)}
                  />
                </KpiSection>

                <KpiSection title="Usage">
                  <StatCard
                    label="Total queries"
                    value={formatTokens(overview.totalQueries)}
                    hint={`${formatTokens(overview.exactQueryCount)} exact · ${formatTokens(overview.estimatedQueryCount)} estimated`}
                  />
                  <StatCard
                    label="Total tokens"
                    value={formatTokens(overview.totalTokens)}
                    hint={`${formatTokens(overview.promptTokens)} in · ${formatTokens(overview.completionTokens)} out`}
                  />
                  <StatCard
                    label="Avg tokens / query"
                    value={formatTokens(Math.round(overview.avgTokensPerQuery))}
                  />
                  <StatCard
                    label="Estimated usage share"
                    value={`${overview.estimatedSharePct.toFixed(1)}%`}
                    hint="Queries without OpenAI usage metadata"
                  />
                </KpiSection>

                <KpiSection title="Coverage">
                  <StatCard
                    label="Features used"
                    value={formatTokens(overview.featureCount)}
                    hint={`${formatTokens(overview.singleQueryFeatures)} with only 1 query`}
                  />
                  <StatCard
                    label="Active users"
                    value={formatTokens(overview.userCount)}
                    hint={`${formatTokens(overview.singleQueryUsers)} with only 1 query`}
                  />
                  <StatCard
                    label="Top 3 features share"
                    value={`${overview.top3FeaturesSharePct.toFixed(1)}%`}
                    hint="Of total spend"
                  />
                  <StatCard
                    label="Top user share"
                    value={`${overview.topUserSharePct.toFixed(1)}%`}
                    hint={overview.highestSpendUser
                      ? overview.highestSpendUser.label
                      : undefined}
                  />
                </KpiSection>

                <KpiSection title="Model & pricing">
                  <StatCard
                    label="Model"
                    value={overview.defaultModelLabel}
                    hint={overview.defaultModel}
                  />
                  <StatCard
                    label="Input price / 1M"
                    value={`$${overview.inputPricePer1M}`}
                    hint="List price (prompt tokens)"
                  />
                  <StatCard
                    label="Output price / 1M"
                    value={`$${overview.outputPricePer1M}`}
                    hint="List price (completion tokens)"
                  />
                  <StatCard
                    label="Blended rate / 1M"
                    value={formatUsd(overview.blendedRatePer1MUsd)}
                    hint={`Effective · ${formatUsdExact(overview.costPer1kTokensUsd)} per 1K tokens`}
                  />
                </KpiSection>

                <KpiSection title="Trends">
                  <StatCard
                    label="Cost today"
                    value={formatUsd(overview.costTodayUsd)}
                    hint={`${formatTokens(overview.queriesToday)} queries`}
                  />
                  <StatCard
                    label="Last 7 days"
                    value={formatUsd(overview.costLast7DaysUsd)}
                    hint={`${formatTokens(overview.queriesLast7Days)} queries`}
                  />
                  <StatCard
                    label="Avg daily cost"
                    value={formatUsd(overview.avgDailyCostUsd)}
                    hint="Across active days"
                  />
                  <StatCard
                    label="Projected monthly"
                    value={formatUsd(overview.projectedMonthlyUsd)}
                    hint="Avg daily × 30"
                  />
                  <StatCard
                    label="Busiest day (queries)"
                    value={overview.busiestDayByQueries
                      ? formatFullDate(overview.busiestDayByQueries.date)
                      : '—'}
                    hint={overview.busiestDayByQueries
                      ? `${formatTokens(overview.busiestDayByQueries.queries)} queries`
                      : undefined}
                  />
                  <StatCard
                    label="Busiest day (spend)"
                    value={overview.busiestDayByCost
                      ? formatFullDate(overview.busiestDayByCost.date)
                      : '—'}
                    hint={overview.busiestDayByCost
                      ? formatUsd(overview.busiestDayByCost.costUsd)
                      : undefined}
                  />
                </KpiSection>

                <KpiSection title="Insights">
                  <StatCard
                    label="Most used feature"
                    value={overview.mostUsedFeature?.label ?? '—'}
                    hint={overview.mostUsedFeature
                      ? `${formatTokens(overview.mostUsedFeature.queries)} queries · ${formatUsd(overview.mostUsedFeature.costUsd)}`
                      : undefined}
                  />
                  <StatCard
                    label="Most expensive feature"
                    value={overview.mostExpensiveFeature?.label ?? '—'}
                    hint={overview.mostExpensiveFeature
                      ? `${formatUsd(overview.mostExpensiveFeature.costUsd)} · ${overview.mostExpensiveFeature.sharePct.toFixed(1)}% of spend`
                      : undefined}
                  />
                  <StatCard
                    label="Highest avg cost feature"
                    value={overview.highestAvgCostFeature?.label ?? '—'}
                    hint={overview.highestAvgCostFeature
                      ? `${formatUsdExact(overview.highestAvgCostFeature.avgCostUsd)} / query`
                      : undefined}
                  />
                  <StatCard
                    label="Cheapest feature"
                    value={overview.cheapestFeature?.label ?? '—'}
                    hint={overview.cheapestFeature
                      ? `${formatUsd(overview.cheapestFeature.costUsd)} total`
                      : undefined}
                  />
                  <StatCard
                    label="Highest spend user"
                    value={overview.highestSpendUser?.label ?? '—'}
                    hint={overview.highestSpendUser
                      ? `${formatUsd(overview.highestSpendUser.costUsd)} · ${overview.highestSpendUser.sharePct.toFixed(1)}% of spend`
                      : undefined}
                  />
                  <StatCard
                    label="Most active user"
                    value={overview.mostActiveUser?.label ?? '—'}
                    hint={overview.mostActiveUser
                      ? `${formatTokens(overview.mostActiveUser.queries)} queries`
                      : undefined}
                  />
                  <StatCard
                    label="Lightest user"
                    value={overview.lightestUser?.label ?? '—'}
                    hint={overview.lightestUser
                      ? `${formatUsd(overview.lightestUser.costUsd)} total`
                      : undefined}
                  />
                  <StatCard
                    label="Input vs output"
                    value={`${overview.inputCostSharePct.toFixed(0)}% / ${overview.outputCostSharePct.toFixed(0)}%`}
                    hint="Input cost share · output cost share"
                  />
                </KpiSection>
              </div>
            ) : null}

            {tab === 'logs' ? (
              <QueryLogsTable
                logs={logs}
                onSelect={(entry) => {
                  setSelectedUser(null)
                  setSelected(entry)
                }}
              />
            ) : null}

            {tab === 'users' ? (
              <UsersTab
                users={users}
                onSelectUser={(user) => {
                  setSelected(null)
                  setSelectedUser(user)
                }}
              />
            ) : null}

            {tab === 'features' ? (
              <div className="space-y-4">
                <div className="rounded-xl border bg-card p-4">
                  <div className="mb-4 flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold">Most popular by cost</p>
                    <p className="text-[11px] text-muted-foreground">
                      {features.length} features
                    </p>
                  </div>
                  <BarChart
                    horizontal
                    items={features.map((f) => ({
                      label: f.label,
                      value: f.totalCostUsd,
                      secondary: `${f.sharePct.toFixed(1)}% · ${f.totalQueries} queries`,
                    }))}
                    formatValue={formatUsd}
                  />
                </div>
                <div className="rounded-xl border overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Feature</th>
                        <th className="px-3 py-2 font-medium text-right">Queries</th>
                        <th className="px-3 py-2 font-medium text-right">Tokens</th>
                        <th className="px-3 py-2 font-medium text-right">Avg cost</th>
                        <th className="px-3 py-2 font-medium text-right">Total</th>
                        <th className="px-3 py-2 font-medium text-right">Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {features.map((f) => (
                        <tr key={f.feature} className="border-t">
                          <td className="px-3 py-2 font-medium">{f.label}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{f.totalQueries}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{formatTokens(f.totalTokens)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{formatUsd(f.avgCostUsd)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{formatUsd(f.totalCostUsd)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{f.sharePct.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {tab === 'projection' ? <ProjectionTab pricing={pricing} /> : null}
          </>
        )}
      </div>

      {selected ? <LogDetailPanel entry={selected} onClose={() => setSelected(null)} /> : null}
      {selectedUser ? <UserDetailPanel user={selectedUser} onClose={() => setSelectedUser(null)} /> : null}
    </main>
  )
}
