import { NextResponse } from 'next/server'
import type { ConstructionDraftImage, ConstructionDraftRequest } from '@/lib/api/ai-types'
import { costOpts } from '@/lib/server/ai/cost-opts'
import { chatText, chatVisionJSON } from '@/lib/server/ai/openai-stream'
import { markdownToLexical } from '@/lib/server/ai/markdown-to-lexical'
import {
  constructionDraftPrompt,
  imagePlacementAnalysisPrompt,
  type DraftImageAnalysis,
} from '@/lib/server/ai/prompts'
import { getCorpusText } from '@/lib/server/ai/rag-store'
import { getDraftPlaybook } from '@/lib/editor/ai/draft/draft-playbooks'

function resolveImages(body: ConstructionDraftRequest): ConstructionDraftImage[] {
  if (body.articleImages?.length) return body.articleImages
  if (body.articleImageBase64 && body.articleImagePublicUrl) {
    return [{
      base64: body.articleImageBase64,
      mediaType: body.articleImageMediaType || 'image/jpeg',
      publicUrl: body.articleImagePublicUrl,
    }]
  }
  return []
}

async function analyzeImages(
  images: ConstructionDraftImage[],
  topic: string,
  audience: string,
  cost: ReturnType<typeof costOpts>,
): Promise<DraftImageAnalysis[]> {
  const out: DraftImageAnalysis[] = []
  for (let i = 0; i < images.length; i++) {
    const img = images[i]!
    const dataUrl = `data:${img.mediaType};base64,${img.base64}`
    const index = i + 1
    try {
      const res = await chatVisionJSON<{
        description?: string
        alt?: string
        caption?: string
        placementHint?: string
      }>(
        imagePlacementAnalysisPrompt(topic, audience, index, images.length),
        dataUrl,
        {
          maxTokens: 350,
          ...cost,
          tags: ['image', 'vision', 'placement'],
        },
      )
      out.push({
        index,
        description: String(res.description ?? '').trim() || `Site photo ${index}`,
        alt: String(res.alt ?? '').trim() || `Site photo ${index}`,
        caption: String(res.caption ?? '').trim() || `Figure ${index}: Site photo related to ${topic}`,
        placementHint: String(res.placementHint ?? '').trim() || 'Place where it supports the narrative',
      })
    } catch {
      out.push({
        index,
        description: `Uploaded site photo ${index}`,
        alt: `Site photo ${index}`,
        caption: `Figure ${index}: Supporting photo for ${topic}`,
        placementHint: 'Place after the introduction or in a relevant section',
      })
    }
  }
  return out
}

export async function POST(req: Request) {
  try {
    const cost = costOpts(req, 'draft')
    const body = (await req.json()) as ConstructionDraftRequest
    const sourceIds = body.referenceSourceIds?.length
      ? body.referenceSourceIds
      : body.referenceSourceId
        ? [body.referenceSourceId]
        : []
    const ragText = sourceIds.length ? getCorpusText(sourceIds) : ''
    const referenceNotes = [body.referenceNotes, ragText].filter(Boolean).join('\n\n')

    const images = resolveImages(body)
    const warnings: string[] = []

    let imageAnalyses: DraftImageAnalysis[] = []
    if (images.length > 0) {
      // Always run vision so placement/captions are based on real photo content
      imageAnalyses = await analyzeImages(
        images,
        body.topic,
        body.audience,
        cost,
      )
      if (imageAnalyses.some((a) => a.description.startsWith('Uploaded site photo'))) {
        warnings.push('One or more photos could not be fully analyzed; fallback captions were used.')
      }
    }

    let markdown = await chatText(
      [{
        role: 'user',
        content: constructionDraftPrompt({
          contentType: body.contentType,
          audience: body.audience,
          topic: body.topic,
          angle: body.angle,
          mustInclude: body.mustInclude,
          length: body.length,
          whys: body.whys,
          briefSummary: body.briefSummary,
          generationHints: getDraftPlaybook(body.contentType).generationHints,
          referenceNotes: referenceNotes || undefined,
          articleImagePlacementHint: body.articleImagePlacementHint,
          imageCount: images.length,
          imageAnalyses,
          aiDecidePlacement: body.referenceAiDecide !== false,
        }),
      }],
      {
        model: body.model,
        maxTokens: body.length === 'long' ? 4096 : body.length === 'short' ? 1024 : 2048,
        ...cost,
        tags: images.length > 0 ? ['image', 'draft'] : ['draft'],
      },
    )

    // Prefer vision captions if the model omitted or mangled them
    images.forEach((img, index) => {
      const token = `IMAGE_${index + 1}`
      markdown = markdown.split(token).join(img.publicUrl)
    })

    // Ensure every uploaded image appears at least once
    for (let i = 0; i < images.length; i++) {
      const url = images[i]!.publicUrl
      if (!markdown.includes(url)) {
        const analysis = imageAnalyses[i]
        const n = i + 1
        markdown += `\n\n![${analysis?.alt ?? `Site photo ${n}`}](${url})\n\n*${analysis?.caption ?? `Figure ${n}: Supporting photo`}*\n`
        warnings.push(`IMAGE_${n} was missing from the draft and was appended with its vision caption.`)
      }
    }

    const lexicalJson = markdownToLexical(markdown)
    if (sourceIds.length && !ragText) {
      warnings.push('Referenced documents were not found in the index.')
    }

    return NextResponse.json({ lexicalJson, warnings, imageAnalyses })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Construction draft failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
