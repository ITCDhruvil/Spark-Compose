import { NextResponse } from 'next/server'
import type { CompareSummaryResponse } from '@/lib/api/ai-types'
import { costOpts } from '@/lib/server/ai/cost-opts'
import { chatJSON } from '@/lib/server/ai/openai-stream'
import { compareSummaryPrompt } from '@/lib/server/ai/prompts'
import { parseJsonBody } from '@/lib/server/ai/parse-json-body'

const BENCHMARK_IDS = ['grammar', 'tone', 'clarity', 'conciseness', 'completeness'] as const
const BENCHMARK_LABELS: Record<(typeof BENCHMARK_IDS)[number], string> = {
  grammar: 'Grammar',
  tone: 'Tone',
  clarity: 'Clarity',
  conciseness: 'Conciseness',
  completeness: 'Completeness',
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

function normalizeResponse(raw: CompareSummaryResponse): CompareSummaryResponse {
  const benchmarks = BENCHMARK_IDS.map((id) => {
    const found = raw.benchmarks?.find((b) => b.id === id)
    const original = clamp(found?.original ?? 50)
    const summary = clamp(found?.summary ?? 50)
    return {
      id,
      label: BENCHMARK_LABELS[id],
      original,
      summary,
      improvement: summary - original,
    }
  })
  const overallOriginal = clamp(raw.overall?.original ?? benchmarks.reduce((s, b) => s + b.original, 0) / benchmarks.length)
  const overallSummary = clamp(raw.overall?.summary ?? benchmarks.reduce((s, b) => s + b.summary, 0) / benchmarks.length)
  return {
    overall: {
      original: overallOriginal,
      summary: overallSummary,
      improvement: overallSummary - overallOriginal,
    },
    benchmarks,
  }
}

export async function POST(req: Request) {
  const cost = costOpts(req, 'compare-summary')
  const parsed = await parseJsonBody<{ original: string; summary: string }>(req)
  if (!parsed.ok) return parsed.response

  const { original, summary } = parsed.data
  if (!original?.trim() || !summary?.trim()) {
    return NextResponse.json({ error: 'Missing original or summary text' }, { status: 400 })
  }

  try {
    const result = await chatJSON<CompareSummaryResponse>([
      { role: 'user', content: compareSummaryPrompt(original, summary) },
    ], { maxTokens: 512, ...cost })
    return NextResponse.json(normalizeResponse(result))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Comparison failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
