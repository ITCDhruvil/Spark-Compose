import type { SummarizeRequest } from '@/lib/api/ai-types'
import { costOpts } from '@/lib/server/ai/cost-opts'
import { streamChat } from '@/lib/server/ai/openai-stream'
import { summarizePrompt } from '@/lib/server/ai/prompts'
import { sseResponse } from '@/lib/server/ai/sse'

export async function POST(req: Request) {
  const cost = costOpts(req, 'summarize')
  const body = (await req.json()) as SummarizeRequest
  return sseResponse(async (send) => {
    await streamChat(
      [{ role: 'user', content: summarizePrompt(body.text, body.length) }],
      (delta) => send({ type: 'token', delta }),
      { maxTokens: body.length === 'detailed' ? 1024 : body.length === 'medium' ? 512 : 256, ...cost },
    )
  })
}
