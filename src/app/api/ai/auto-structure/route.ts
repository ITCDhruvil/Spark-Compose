import { NextResponse } from 'next/server'
import type { AutoStructureOp, AutoStructureResponse } from '@/lib/api/ai-types'
import { costOpts } from '@/lib/server/ai/cost-opts'
import { chatJSON } from '@/lib/server/ai/openai-stream'
import { autoStructurePrompt } from '@/lib/server/ai/prompts'

const ACTIONS = new Set([
  'heading', 'subtitle', 'bulletList', 'orderedList', 'taskList', 'table', 'refactor',
])

export async function POST(req: Request) {
  try {
    const cost = costOpts(req, 'suggest')
    const body = (await req.json()) as { text?: string }
    const text = body.text?.trim()
    if (!text) return NextResponse.json({ error: 'Text is required' }, { status: 400 })

    const result = await chatJSON<AutoStructureResponse>([
      { role: 'user', content: autoStructurePrompt(text) },
    ], cost)

    const fromOps = (result.operations ?? []).map((op): AutoStructureOp | null => {
      const action = String(op.action ?? '')
      if (!ACTIONS.has(action)) return null
      const matchPrefix = String(op.matchPrefix ?? '').trim().slice(0, 80)
      if (!matchPrefix) return null
      return {
        matchPrefix,
        action: action as AutoStructureOp['action'],
        level: op.level != null
          ? Math.min(3, Math.max(1, Number(op.level) || 2)) as 1 | 2 | 3
          : undefined,
        text: op.text?.trim(),
        items: Array.isArray(op.items)
          ? op.items.map((i) => String(i).trim()).filter(Boolean).slice(0, 8)
          : undefined,
        headers: Array.isArray(op.headers)
          ? op.headers.map((h) => String(h).trim()).filter(Boolean).slice(0, 8)
          : undefined,
        rows: Array.isArray(op.rows)
          ? op.rows.map((r) => (r ?? []).map((c) => String(c ?? '').trim())).slice(0, 20)
          : undefined,
        replacement: op.replacement?.trim(),
      }
    }).filter((op): op is AutoStructureOp => op != null)

    // Back-compat: old headings-only responses
    const fromHeadings: AutoStructureOp[] = (result.headings ?? []).map((h) => ({
      matchPrefix: String(h.matchPrefix ?? '').trim().slice(0, 80),
      action: (h.level === 3 ? 'subtitle' : 'heading') as AutoStructureOp['action'],
      level: Math.min(3, Math.max(1, Number(h.level) || 2)) as 1 | 2 | 3,
      text: String(h.text ?? '').trim(),
    })).filter((op) => op.matchPrefix && op.text)

    const operations = (fromOps.length ? fromOps : fromHeadings).slice(0, 12)

    return NextResponse.json({ operations } satisfies AutoStructureResponse)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Auto structure failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
