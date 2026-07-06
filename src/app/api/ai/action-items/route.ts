import { NextResponse } from 'next/server'
import type { ActionItemsRequest, ActionItemsResponse } from '@/lib/api/ai-types'
import { costOpts } from '@/lib/server/ai/cost-opts'
import { chatJSON } from '@/lib/server/ai/openai-stream'
import { actionItemsPrompt } from '@/lib/server/ai/prompts'

function formatItem(item: { text?: string; owner?: string; due?: string }) {
  let line = String(item.text ?? '').trim()
  if (!line) return ''
  const meta = [item.owner?.trim(), item.due?.trim()].filter(Boolean)
  if (meta.length) line = `${line} — ${meta.join(', ')}`
  return line
}

export async function POST(req: Request) {
  try {
    const cost = costOpts(req, 'action-items')
    const body = (await req.json()) as ActionItemsRequest
    const text = body.text?.trim()
    if (!text) return NextResponse.json({ error: 'Text is required' }, { status: 400 })

    const result = await chatJSON<ActionItemsResponse>([
      { role: 'user', content: actionItemsPrompt(text) },
    ], cost)

    const items = (result.items ?? [])
      .map((item) => ({
        text: formatItem(item),
        owner: item.owner?.trim() || undefined,
        due: item.due?.trim() || undefined,
      }))
      .filter((i) => i.text)
      .slice(0, 12)

    if (!items.length) {
      return NextResponse.json({ error: 'No action items found' }, { status: 500 })
    }

    return NextResponse.json({ items } satisfies ActionItemsResponse)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Action items failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
