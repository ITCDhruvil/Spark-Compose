import { NextResponse } from 'next/server'
import type { KpiWidgetsRequest, KpiWidgetsResponse } from '@/lib/api/ai-types'
import { costOpts } from '@/lib/server/ai/cost-opts'
import { chatJSON } from '@/lib/server/ai/openai-stream'
import { kpiWidgetsPrompt } from '@/lib/server/ai/prompts'

export async function POST(req: Request) {
  try {
    const cost = costOpts(req, 'kpi-widgets')
    const body = (await req.json()) as KpiWidgetsRequest
    const text = body.text?.trim()
    if (!text) return NextResponse.json({ error: 'Text is required' }, { status: 400 })

    const result = await chatJSON<KpiWidgetsResponse>([
      { role: 'user', content: kpiWidgetsPrompt(text) },
    ], cost)

    const kpis = (result.kpis ?? [])
      .map((k) => ({
        label: String(k.label ?? '').trim(),
        value: String(k.value ?? '').trim(),
        trend: k.trend ? String(k.trend).trim() : undefined,
        status: k.status === 'good' || k.status === 'warn' || k.status === 'bad' ? k.status : undefined,
      }))
      .filter((k) => k.label && k.value)
      .slice(0, 8)

    if (!kpis.length) {
      return NextResponse.json({ error: 'Could not extract KPIs from this content' }, { status: 500 })
    }

    return NextResponse.json({ kpis } satisfies KpiWidgetsResponse)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'KPI extraction failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
