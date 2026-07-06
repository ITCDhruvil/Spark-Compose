import { NextResponse } from 'next/server'
import type { ProgressAnalyticsRequest, ProgressAnalyticsResponse } from '@/lib/api/ai-types'
import { costOpts } from '@/lib/server/ai/cost-opts'
import { chatJSON } from '@/lib/server/ai/openai-stream'
import { progressAnalyticsPrompt } from '@/lib/server/ai/prompts'

export async function POST(req: Request) {
  try {
    const cost = costOpts(req, 'progress-analytics')
    const body = (await req.json()) as ProgressAnalyticsRequest
    const text = body.text?.trim()
    const mode = body.mode ?? 'trend'
    if (!text) return NextResponse.json({ error: 'Text is required' }, { status: 400 })

    const result = await chatJSON<ProgressAnalyticsResponse>([
      { role: 'user', content: progressAnalyticsPrompt(text, mode) },
    ], cost)

    const headers = (result.headers ?? []).map((h) => String(h).trim()).filter(Boolean).slice(0, 8)
    const colCount = headers.length || 2
    const rows = (result.rows ?? [])
      .map((row) => {
        const cells = (row ?? []).map((c) => String(c ?? '').trim())
        while (cells.length < colCount) cells.push('')
        return cells.slice(0, colCount)
      })
      .filter((row) => row.some(Boolean))
      .slice(0, 30)

    if (!headers.length || !rows.length) {
      return NextResponse.json({ error: 'Could not build progress data from this content' }, { status: 500 })
    }

    return NextResponse.json({
      title: result.title?.trim() || undefined,
      headers,
      rows,
    } satisfies ProgressAnalyticsResponse)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Progress analytics failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
