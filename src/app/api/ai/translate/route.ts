import type { TranslateRequest } from '@/lib/api/ai-types'
import { costOpts } from '@/lib/server/ai/cost-opts'
import { streamChat } from '@/lib/server/ai/openai-stream'
import { translatePrompt } from '@/lib/server/ai/prompts'
import { sseResponse } from '@/lib/server/ai/sse'

export async function POST(req: Request) {
  const cost = costOpts(req, 'translate')
  const body = (await req.json()) as TranslateRequest
  return sseResponse(async (send) => {
    await streamChat(
      [{ role: 'user', content: translatePrompt(body.text, body.targetLang) }],
      (delta) => send({ type: 'token', delta }),
      { maxTokens: 2048, ...cost },
    )
  })
}
