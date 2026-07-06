import { NextResponse } from 'next/server'
import type { GlossaryRequest, GlossaryResponse, GlossaryTerm } from '@/lib/api/ai-types'
import { costOpts } from '@/lib/server/ai/cost-opts'
import { chatJSON } from '@/lib/server/ai/openai-stream'
import { glossaryPrompt } from '@/lib/server/ai/prompts'

export async function POST(req: Request) {
  try {
    const cost = costOpts(req, 'glossary')
    const body = (await req.json()) as GlossaryRequest
    const text = body.text?.trim()
    if (!text) return NextResponse.json({ error: 'Text is required' }, { status: 400 })

    const result = await chatJSON<GlossaryResponse>([
      { role: 'user', content: glossaryPrompt(text) },
    ], cost)

    const terms: GlossaryTerm[] = (result.terms ?? [])
      .map((t) => ({
        from: String(t.from ?? '').trim(),
        to: String(t.to ?? '').trim(),
      }))
      .filter((t) => t.from && t.to && t.from !== t.to && text.includes(t.from))
      // Longer phrases first so we don't partially replace
      .sort((a, b) => b.from.length - a.from.length)
      .slice(0, 30)

    return NextResponse.json({ terms } satisfies GlossaryResponse)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Glossary failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
