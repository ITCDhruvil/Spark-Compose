import { NextResponse } from 'next/server'
import type { SuggestBlockKind, SuggestBlockRequest, SuggestBlockResponse } from '@/lib/api/ai-types'
import { costOpts } from '@/lib/server/ai/cost-opts'
import { chatJSON } from '@/lib/server/ai/openai-stream'
import { suggestHeadingPrompt, suggestListPrompt } from '@/lib/server/ai/prompts'

const TITLE_KINDS = new Set<SuggestBlockKind>(['heading', 'subtitle'])
const LIST_KINDS = new Set<SuggestBlockKind>(['bulletList', 'orderedList', 'taskList'])

export async function POST(req: Request) {
  try {
    const cost = costOpts(req, 'suggest')
    const body = (await req.json()) as SuggestBlockRequest
    const paragraph = body.paragraph?.trim()
    if (!paragraph) {
      return NextResponse.json({ error: 'Paragraph is required' }, { status: 400 })
    }

    const kind: SuggestBlockKind = body.kind ?? 'heading'
    const preferredLevel = Math.min(3, Math.max(1, body.preferredLevel ?? 2)) as 1 | 2 | 3
    const prevHeadings = (body.prevHeadings ?? []).slice(-5)
    const nextHeadings = (body.nextHeadings ?? []).slice(0, 5)

    if (LIST_KINDS.has(kind)) {
      const result = await chatJSON<{ items?: string[] }>([
        {
          role: 'user',
          content: suggestListPrompt(paragraph, kind as 'bulletList' | 'orderedList' | 'taskList'),
        },
      ], cost)
      const items = (result.items ?? [])
        .map((item) => String(item).trim().replace(/^[-*•\d.)\s]+/, ''))
        .filter(Boolean)
        .slice(0, 8)

      if (!items.length) {
        return NextResponse.json({ error: 'No list items returned' }, { status: 500 })
      }

      return NextResponse.json({ items } satisfies SuggestBlockResponse)
    }

    if (!TITLE_KINDS.has(kind)) {
      return NextResponse.json({ error: 'Unknown suggest kind' }, { status: 400 })
    }

    const result = await chatJSON<{ level?: number; text?: string }>([
      {
        role: 'user',
        content: suggestHeadingPrompt(
          paragraph,
          prevHeadings,
          nextHeadings,
          preferredLevel,
          kind as 'heading' | 'subtitle',
        ),
      },
    ], cost)

    const text = (result.text ?? '').trim().replace(/^["']|["']$/g, '').replace(/[.。]\s*$/, '')
    if (!text) {
      return NextResponse.json({ error: 'No heading returned' }, { status: 500 })
    }

    const level = Math.min(3, Math.max(1, Number(result.level) || preferredLevel)) as 1 | 2 | 3

    return NextResponse.json({ level, text } satisfies SuggestBlockResponse)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Suggest failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
