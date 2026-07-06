import type { CompleteRequest } from '@/lib/api/ai-types'
import { costOpts } from '@/lib/server/ai/cost-opts'
import { streamAutocomplete } from '@/lib/server/ai/openai-stream'
import { parseJsonBody } from '@/lib/server/ai/parse-json-body'
import { completeMessages } from '@/lib/server/ai/prompts'
import { sseResponse } from '@/lib/server/ai/sse'

const MAX_TOKENS = {
  word: 12,
  sentence: 32,
  paragraph: 96,
} as const

const STOP_SEQUENCES = {
  word: ['\n', '.', '!', '?'],
  sentence: ['\n\n', '\n'],
  paragraph: ['\n\n\n'],
} as const

export async function POST(req: Request) {
  const cost = costOpts(req, 'autocomplete')
  const parsed = await parseJsonBody<CompleteRequest>(req)
  if (!parsed.ok) return parsed.response

  const body = parsed.data
  if (!body.before?.trim()) {
    return Response.json({ error: 'Missing before text' }, { status: 400 })
  }

  const scope = body.scope ?? 'sentence'

  return sseResponse(async (send) => {
    await streamAutocomplete(
      completeMessages(body.before, body.after ?? '', scope),
      (delta) => send({ type: 'token', delta }),
      {
        model: body.model,
        maxTokens: MAX_TOKENS[scope],
        stop: [...STOP_SEQUENCES[scope]],
        ...cost,
      },
    )
  })
}
