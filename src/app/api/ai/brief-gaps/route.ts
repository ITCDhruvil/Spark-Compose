import { NextResponse } from 'next/server'
import type { BriefGapsRequest, BriefGapsResponse } from '@/lib/api/ai-types'
import { costOpts } from '@/lib/server/ai/cost-opts'
import { chatJSON } from '@/lib/server/ai/openai-stream'
import { briefGapsPrompt } from '@/lib/server/ai/prompts'

export async function POST(req: Request) {
  try {
    const cost = costOpts(req, 'against-brief')
    const body = (await req.json()) as BriefGapsRequest
    const document = body.document?.trim()
    const brief = body.brief?.trim()
    if (!document) return NextResponse.json({ error: 'Document is required' }, { status: 400 })
    if (!brief) return NextResponse.json({ error: 'Brief is required' }, { status: 400 })

    const result = await chatJSON<BriefGapsResponse>([
      { role: 'user', content: briefGapsPrompt(document, brief) },
    ], cost)

    const gaps = (result.gaps ?? []).map((g) => String(g).trim()).filter(Boolean).slice(0, 15)
    if (!gaps.length) {
      return NextResponse.json({
        gaps: ['Brief appears covered — double-check safety, owners, and acceptance criteria.'],
      } satisfies BriefGapsResponse)
    }

    return NextResponse.json({ gaps } satisfies BriefGapsResponse)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Brief gaps failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
