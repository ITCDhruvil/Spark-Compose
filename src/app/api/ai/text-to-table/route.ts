import { NextResponse } from 'next/server'
import type { TextToTableRequest, TextToTableResponse } from '@/lib/api/ai-types'
import { costOpts } from '@/lib/server/ai/cost-opts'
import { chatJSON } from '@/lib/server/ai/openai-stream'
import { textToTablePrompt } from '@/lib/server/ai/prompts'

export async function POST(req: Request) {
  try {
    const cost = costOpts(req, 'to-table')
    const body = (await req.json()) as TextToTableRequest
    const text = body.text?.trim()
    if (!text) return NextResponse.json({ error: 'Text is required' }, { status: 400 })

    const result = await chatJSON<TextToTableResponse>([
      { role: 'user', content: textToTablePrompt(text) },
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
      .slice(0, 20)

    if (!headers.length || !rows.length) {
      return NextResponse.json({ error: 'Could not build a table from this text' }, { status: 500 })
    }

    return NextResponse.json({ headers, rows } satisfies TextToTableResponse)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Text to table failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
