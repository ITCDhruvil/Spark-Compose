import { NextResponse } from 'next/server'
import type { ImageCaptionRequest, ImageCaptionResponse } from '@/lib/api/ai-types'
import { costOpts } from '@/lib/server/ai/cost-opts'
import { chatVisionJSON } from '@/lib/server/ai/openai-stream'
import { imageCaptionPrompt } from '@/lib/server/ai/prompts'

function isUsableImageSrc(src: string): boolean {
  return (
    src.startsWith('data:image/')
    || src.startsWith('https://')
    || src.startsWith('http://')
  )
}

export async function POST(req: Request) {
  try {
    const cost = costOpts(req, 'image-caption')
    const body = (await req.json()) as ImageCaptionRequest
    const mode = body.mode === 'caption' ? 'caption' : 'alt'
    const src = body.src?.trim()

    if (!src || !isUsableImageSrc(src)) {
      return NextResponse.json(
        { error: 'A valid image src (data URL or http URL) is required for vision captioning.' },
        { status: 400 },
      )
    }

    // Guard oversized data URLs (~4MB payload limit comfort)
    if (src.startsWith('data:') && src.length > 4_000_000) {
      return NextResponse.json(
        { error: 'Image is too large to caption. Try a smaller image.' },
        { status: 400 },
      )
    }

    const result = await chatVisionJSON<ImageCaptionResponse>(
      imageCaptionPrompt(mode, body.alt, body.title, body.context),
      src,
      {
        maxTokens: mode === 'alt' ? 120 : 200,
        ...cost,
        tags: ['image', 'vision', mode === 'caption' ? 'caption' : 'alt'],
      },
    )

    let text = (result.text ?? '').trim().replace(/^["']|["']$/g, '')
    if (!text) {
      return NextResponse.json({ error: 'No caption returned' }, { status: 500 })
    }
    if (mode === 'alt' && text.length > 125) {
      text = `${text.slice(0, 122).trim()}…`
    }

    return NextResponse.json({ text } satisfies ImageCaptionResponse)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Image caption failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
