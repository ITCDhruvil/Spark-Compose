import { NextResponse } from 'next/server'
import type { FindIssueItem, FindIssuesRequest, FindIssuesResponse } from '@/lib/api/ai-types'
import { costOpts } from '@/lib/server/ai/cost-opts'
import { chatJSON } from '@/lib/server/ai/openai-stream'
import { findIssuesPrompt } from '@/lib/server/ai/prompts'

export async function POST(req: Request) {
  try {
    const cost = costOpts(req, 'find-issues')
    const body = (await req.json()) as FindIssuesRequest
    const text = body.text?.trim()
    if (!text) return NextResponse.json({ error: 'Text is required' }, { status: 400 })

    const result = await chatJSON<{ issues?: Array<Partial<FindIssueItem>> }>([
      { role: 'user', content: findIssuesPrompt(text) },
    ], cost)

    const issues: FindIssueItem[] = (result.issues ?? [])
      .map((i, index) => {
        const originalSnippet = String(i.originalSnippet ?? '').trim()
        const suggestion = String(i.suggestion ?? '').trim()
        const issueText = String(i.text ?? '').trim()
        if (!issueText || !originalSnippet || !suggestion) return null
        if (!text.includes(originalSnippet)) return null
        return {
          id: `issue-${index}-${originalSnippet.slice(0, 12)}`,
          severity: (['high', 'medium', 'low'].includes(String(i.severity))
            ? i.severity
            : 'medium') as FindIssueItem['severity'],
          text: issueText,
          originalSnippet,
          suggestion,
        }
      })
      .filter((i): i is FindIssueItem => i != null)
      .slice(0, 8)

    if (!issues.length) {
      return NextResponse.json({ issues: [] } satisfies FindIssuesResponse)
    }

    return NextResponse.json({ issues } satisfies FindIssuesResponse)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Find issues failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
