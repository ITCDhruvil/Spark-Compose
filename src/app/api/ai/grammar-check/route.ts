import { NextResponse } from 'next/server'
import { costOpts } from '@/lib/server/ai/cost-opts'
import { chatJSON } from '@/lib/server/ai/openai-stream'
import { parseJsonBody } from '@/lib/server/ai/parse-json-body'

export type GrammarIssueType = 'spelling' | 'grammar' | 'punctuation'

export interface GrammarIssueDto {
  start: number
  end: number
  type: GrammarIssueType
  message: string
  suggestion: string
}

export async function POST(req: Request) {
  const cost = costOpts(req, 'grammar')
  const parsed = await parseJsonBody<{ text?: string }>(req)
  if (!parsed.ok) return parsed.response

  const text = parsed.data.text ?? ''
  if (!text.trim() || text.length < 8) {
    return NextResponse.json({ issues: [] as GrammarIssueDto[] })
  }

  const slice = text.slice(0, 2500)

  try {
    const result = await chatJSON<{ issues?: GrammarIssueDto[] }>(
      [{
        role: 'user',
        content: `Find grammar, spelling, and punctuation issues in the text.
Return JSON only:
{
  "issues": [
    {
      "start": <0-based start index in the text>,
      "end": <0-based end index (exclusive)>,
      "type": "spelling" | "grammar" | "punctuation",
      "message": "short explanation",
      "suggestion": "replacement text for that exact span"
    }
  ]
}

Rules:
- start/end must refer to the exact character offsets in the text below.
- suggestion replaces only the span [start, end).
- Prefer precise spans (words or short phrases), not the whole paragraph.
- Do NOT report spelling/typo issues (type "spelling") — those are auto-corrected separately.
- Only report grammar and punctuation issues.
- If nothing is wrong, return { "issues": [] }.
- Max 8 issues.

Text:
"""${slice}"""`,
      }],
      { maxTokens: 800, ...cost, tags: ['grammar', 'underline'] },
    )

    const issues = (result.issues ?? [])
      .map((i) => ({
        start: Math.max(0, Math.min(slice.length, Number(i.start) || 0)),
        end: Math.max(0, Math.min(slice.length, Number(i.end) || 0)),
        type: (['spelling', 'grammar', 'punctuation'].includes(String(i.type))
          ? i.type
          : 'grammar') as GrammarIssueType,
        message: String(i.message ?? 'Suggestion').trim(),
        suggestion: String(i.suggestion ?? '').trim(),
      }))
      .filter((i) => i.end > i.start && i.suggestion.length > 0 && i.type !== 'spelling')
      .slice(0, 8)

    return NextResponse.json({ issues })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Grammar check failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
