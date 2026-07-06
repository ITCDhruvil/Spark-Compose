import type { RewriteRequest } from '@/lib/api/ai-types'
import { costOpts } from '@/lib/server/ai/cost-opts'
import { streamChat } from '@/lib/server/ai/openai-stream'
import { rewritePrompt } from '@/lib/server/ai/prompts'
import { sseResponse } from '@/lib/server/ai/sse'

function featureForMode(mode: RewriteRequest['mode']): string {
  if (mode === 'grammar') return 'grammar'
  if (mode === 'spelling') return 'spelling'
  return 'improve'
}

export async function POST(req: Request) {
  const body = (await req.json()) as RewriteRequest
  const cost = costOpts(req, featureForMode(body.mode))
  return sseResponse(async (send) => {
    await streamChat(
      [{ role: 'user', content: rewritePrompt(body.selection, body.mode, body.before, body.after) }],
      (delta) => send({ type: 'token', delta }),
      { model: body.model, maxTokens: 2048, ...cost },
    )
  })
}
