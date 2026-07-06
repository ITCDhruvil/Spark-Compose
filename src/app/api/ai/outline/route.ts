import { NextResponse } from 'next/server'
import type { OutlineRequest, OutlineResponse } from '@/lib/api/ai-types'
import { costOpts } from '@/lib/server/ai/cost-opts'
import { chatJSON } from '@/lib/server/ai/openai-stream'
import { outlinePrompt } from '@/lib/server/ai/prompts'

export async function POST(req: Request) {
  try {
    const cost = costOpts(req, 'outline')
    const body = (await req.json()) as OutlineRequest
    const result = await chatJSON<OutlineResponse>([
      { role: 'user', content: outlinePrompt(body.docText) },
    ], cost)
    return NextResponse.json({
      headings: (result.headings ?? []).map((h) => ({
        level: Math.min(3, Math.max(1, h.level)) as 1 | 2 | 3,
        text: h.text,
        offset: h.offset,
      })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Outline failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
