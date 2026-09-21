import { NextResponse } from 'next/server'
import type {
  ConstructionContentType,
  DraftEnhanceImprovement,
  DraftEnhanceKind,
  DraftEnhanceRequest,
  DraftEnhanceResponse,
} from '@/lib/api/ai-types'
import { costOpts } from '@/lib/server/ai/cost-opts'
import { chatJSON } from '@/lib/server/ai/openai-stream'
import { draftEnhancePrompt } from '@/lib/server/ai/prompts'
import { parseJsonBody } from '@/lib/server/ai/parse-json-body'
import { sanitizeInsertMarkdown, toSecondPersonSummary } from '@/lib/editor/ai/draft/draft-enhance-insert'

const KINDS: DraftEnhanceKind[] = ['add', 'trend', 'strengthen', 'clarify']

function asKind(v: unknown): DraftEnhanceKind {
  return typeof v === 'string' && (KINDS as string[]).includes(v)
    ? (v as DraftEnhanceKind)
    : 'add'
}

function normalize(raw: Partial<DraftEnhanceResponse>): DraftEnhanceResponse {
  const explanations = Array.isArray(raw.explanations)
    ? raw.explanations
        .map((e) => ({
          title: String((e as { title?: string })?.title ?? '').trim(),
          detail: String((e as { detail?: string })?.detail ?? '').trim(),
        }))
        .filter((e) => e.title && e.detail)
        .slice(0, 4)
    : []

  const improvements: DraftEnhanceImprovement[] = Array.isArray(raw.improvements)
    ? raw.improvements
        .map((item, i): DraftEnhanceImprovement | null => {
          const im = item as Partial<DraftEnhanceImprovement>
          const title = String(im.title ?? '').trim()
          const reason = String(im.reason ?? '').trim()
          const suggestion = String(im.suggestion ?? '').trim()
          const insertRaw = String(im.insertMarkdown ?? '').trim() || suggestion
          if (!title || !insertRaw) return null
          const afterHeading = String(im.afterHeading ?? '').trim()
          const row: DraftEnhanceImprovement = {
            id: String(im.id ?? `imp_${i + 1}`).trim() || `imp_${i + 1}`,
            kind: asKind(im.kind),
            title,
            reason: reason || 'This would strengthen your draft.',
            suggestion: suggestion || title,
            insertMarkdown: sanitizeInsertMarkdown(insertRaw, title),
          }
          if (afterHeading) row.afterHeading = afterHeading
          return row
        })
        .filter((x): x is DraftEnhanceImprovement => x != null)
        .slice(0, 5)
    : []

  return {
    askedSummary: toSecondPersonSummary(
      String(raw.askedSummary ?? '').trim()
        || 'You asked to draft this topic — we inferred details from the document.',
      'asked',
    ),
    draftSummary: toSecondPersonSummary(
      String(raw.draftSummary ?? '').trim()
        || 'Your draft currently covers the main topic in the document.',
      'draft',
    ),
    explanations,
    improvements,
  }
}

export async function POST(req: Request) {
  const cost = costOpts(req, 'draft')
  const parsed = await parseJsonBody<DraftEnhanceRequest>(req)
  if (!parsed.ok) return parsed.response

  const { documentText, brief, topic, contentType, audience } = parsed.data
  if (!documentText?.trim()) {
    return NextResponse.json({ error: 'Document text is required' }, { status: 400 })
  }

  try {
    const raw = await chatJSON<Partial<DraftEnhanceResponse>>(
      [{
        role: 'user',
        content: draftEnhancePrompt({
          documentText: documentText.trim(),
          brief,
          topic,
          contentType: contentType as ConstructionContentType | undefined,
          audience,
        }),
      }],
      { maxTokens: 3500, ...cost, tags: ['draft', 'enhance'] },
    )
    return NextResponse.json(normalize(raw))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Draft enhance failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
