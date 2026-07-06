import { NextResponse } from 'next/server'
import { costOpts } from '@/lib/server/ai/cost-opts'
import { chatJSON } from '@/lib/server/ai/openai-stream'
import { parseJsonBody } from '@/lib/server/ai/parse-json-body'

export async function POST(req: Request) {
  const cost = costOpts(req, 'spelling')
  const parsed = await parseJsonBody<{ word?: string; context?: string }>(req)
  if (!parsed.ok) return parsed.response

  const word = parsed.data.word?.trim() ?? ''
  if (!word || word.length < 2) {
    return NextResponse.json({ corrected: word, changed: false })
  }

  // Skip codes / numbers / very short tokens
  if (word.length < 3 || /\d/.test(word) || /^[A-Z]{2,}$/.test(word)) {
    return NextResponse.json({ corrected: word, changed: false })
  }

  try {
    const context = (parsed.data.context ?? '').slice(0, 200)
    const result = await chatJSON<{ corrected?: string; changed?: boolean }>(
      [{
        role: 'user',
        content: `You are an autocorrect engine. Check ONE word for spelling only.

Word: ${JSON.stringify(word)}
Context: ${JSON.stringify(context)}

Rules:
- If the word is already correctly spelled, return it unchanged with changed=false.
- If it is a typo/misspelling, return the single corrected word with changed=true.
- Do not change grammar, casing style (keep first-letter capitalization if it looks intentional), or add punctuation.
- Return only JSON: { "corrected": "word", "changed": true|false }`,
      }],
      { maxTokens: 40, ...cost, tags: ['spelling', 'autocorrect'] },
    )

    const corrected = String(result.corrected ?? word).trim()
    const changed = Boolean(result.changed) && corrected.length > 0 && corrected !== word
    return NextResponse.json({
      corrected: changed ? corrected : word,
      changed,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Spell check failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
