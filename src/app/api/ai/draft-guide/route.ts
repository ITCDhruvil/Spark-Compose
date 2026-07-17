import { NextResponse } from 'next/server'
import type { DraftGuideRequest, DraftGuideResponse } from '@/lib/api/ai-types'
import { costOpts } from '@/lib/server/ai/cost-opts'
import { chatJSON } from '@/lib/server/ai/openai-stream'
import { draftGuidePrompt, normalizeGuideAction } from '@/lib/server/ai/draft-guide-prompts'
import { parseJsonBody } from '@/lib/server/ai/parse-json-body'

export async function POST(req: Request) {
  const cost = costOpts(req, 'draft')
  const parsed = await parseJsonBody<DraftGuideRequest>(req)
  if (!parsed.ok) return parsed.response

  const action = normalizeGuideAction(parsed.data.action)
  if (!action || !parsed.data.plan?.topic?.trim()) {
    return NextResponse.json({ error: 'action and plan.topic are required' }, { status: 400 })
  }

  if (action === 'improveSection' && !parsed.data.sectionText?.trim()) {
    return NextResponse.json({ error: 'sectionText is required for improveSection' }, { status: 400 })
  }

  try {
    const raw = await chatJSON<Partial<DraftGuideResponse>>(
      [{ role: 'user', content: draftGuidePrompt({ ...parsed.data, action }) }],
      {
        maxTokens: action === 'improveSection' ? 2048 : 1024,
        ...cost,
        tags: ['draft', 'guide', action],
      },
    )

    if (action === 'suggestTitles') {
      const titles = Array.isArray(raw.titles)
        ? raw.titles.map((t) => String(t).trim()).filter(Boolean).slice(0, 5)
        : []
      if (!titles.length) {
        return NextResponse.json({ error: 'No titles returned' }, { status: 502 })
      }
      const response: DraftGuideResponse = { action, titles }
      return NextResponse.json(response)
    }

    if (action === 'proposeOutline') {
      const draftName = String(raw.draftName ?? parsed.data.plan.draftName ?? parsed.data.plan.topic).trim()
      const outline = Array.isArray(raw.outline)
        ? raw.outline
            .map((s, i) => {
              const item = s as { id?: string; heading?: string; intent?: string }
              const heading = String(item.heading ?? '').trim()
              if (!heading) return null
              return {
                id: String(item.id ?? `sec_${i + 1}`).trim() || `sec_${i + 1}`,
                heading,
                ...(item.intent?.trim() ? { intent: item.intent.trim() } : {}),
              }
            })
            .filter((x): x is NonNullable<typeof x> => x != null)
            .slice(0, 6)
        : []
      if (outline.length < 2) {
        return NextResponse.json({ error: 'Outline too short' }, { status: 502 })
      }
      const response: DraftGuideResponse = { action, draftName, outline }
      return NextResponse.json(response)
    }

    if (action === 'outlineImpact') {
      const impactSuggestions = Array.isArray(raw.impactSuggestions)
        ? raw.impactSuggestions
            .map((s) => {
              const item = s as { heading?: string; why?: string }
              const heading = String(item.heading ?? '').trim()
              const why = String(item.why ?? '').trim()
              if (!heading || !why) return null
              return { heading, why }
            })
            .filter((x): x is NonNullable<typeof x> => x != null)
            .slice(0, 4)
        : []
      const response: DraftGuideResponse = { action, impactSuggestions }
      return NextResponse.json(response)
    }

    if (action === 'sectionGuide') {
      const g = raw.guide as DraftGuideResponse['guide'] | undefined
      if (!g?.whatToWrite?.trim() || !g?.howToWrite?.trim()) {
        return NextResponse.json({ error: 'Incomplete section guide' }, { status: 502 })
      }
      const response: DraftGuideResponse = {
        action,
        guide: {
          heading: String(g.heading ?? parsed.data.sectionHeading ?? 'Section').trim(),
          whatToWrite: String(g.whatToWrite).trim(),
          howToWrite: String(g.howToWrite).trim(),
          tips: Array.isArray(g.tips)
            ? g.tips.map((t) => String(t).trim()).filter(Boolean).slice(0, 4)
            : undefined,
        },
      }
      return NextResponse.json(response)
    }

    const improved = String(raw.improvedMarkdown ?? '').trim()
    if (!improved) {
      return NextResponse.json({ error: 'No improved text returned' }, { status: 502 })
    }
    const response: DraftGuideResponse = { action, improvedMarkdown: improved }
    return NextResponse.json(response)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Draft guide failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
