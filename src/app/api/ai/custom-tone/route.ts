import type { CustomToneRequest } from '@/lib/api/ai-types'
import { costOpts } from '@/lib/server/ai/cost-opts'
import { streamChat } from '@/lib/server/ai/openai-stream'
import { customTonePrompt } from '@/lib/server/ai/prompts'
import { sseResponse } from '@/lib/server/ai/sse'

export async function POST(req: Request) {
  const cost = costOpts(req, 'tone')
  const body = (await req.json()) as CustomToneRequest
  return sseResponse(async (send) => {
    await streamChat(
      [{ role: 'user', content: customTonePrompt(body.selection, body.tone, body.before, body.after) }],
      (delta) => send({ type: 'token', delta }),
      { maxTokens: 2048, ...cost },
    )
  })
}
