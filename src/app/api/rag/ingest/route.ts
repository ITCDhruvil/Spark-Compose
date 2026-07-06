import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { ingestCorpus } from '@/lib/server/ai/rag-store'

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const notes = (form.get('notes') as string | null)?.trim() ?? ''
    const file = form.get('file') as File | null
    const sourceId = randomUUID()
    const warnings: string[] = []

    let text = notes
    let filename = 'notes.txt'

    if (file) {
      filename = file.name
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (ext === 'txt' || ext === 'md') {
        text = [text, await file.text()].filter(Boolean).join('\n\n')
      } else {
        warnings.push(`File type .${ext} is stored by name only; full text extraction is not yet supported.`)
        text = [text, `[Document: ${file.name}]`].filter(Boolean).join('\n\n')
      }
    }

    if (!text.trim()) {
      return NextResponse.json({ error: 'No notes or file content to index' }, { status: 400 })
    }

    ingestCorpus(sourceId, text, filename)

    return NextResponse.json({
      sourceId,
      chunkCount: 1,
      filename,
      hasEmbeddings: false,
      warnings,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ingest failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
