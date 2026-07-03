'use client'

import { useCallback, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Dialog } from '@/components/ui/dialog'
import { aiApi, ragApi, uploadsApi, APIError } from '@/lib/api/ai-client'
import { lexicalToTiptapDoc } from '@/lib/editor/lexical-to-tiptap'
import type {
  ConstructionContentType, ConstructionDraftLength, LexicalEditorState,
} from '@/lib/api/ai-types'

interface AiConstructionModalProps {
  open: boolean
  onClose: () => void
  editor: Editor
}

const CONTENT_TYPES: { value: ConstructionContentType; label: string }[] = [
  { value: 'article', label: 'Article' },
  { value: 'blog_post', label: 'Blog post' },
  { value: 'case_study', label: 'Case study' },
  { value: 'experience_share', label: 'Share your experience' },
  { value: 'technical_guide', label: 'Technical guide' },
]

const LENGTHS: { value: ConstructionDraftLength; label: string }[] = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
]

const ARTICLE_IMAGE_MAX_BYTES = 3 * 1024 * 1024

async function encodeImageAsBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  const mediaType = file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg'
  const buf = await file.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]!)
  return { base64: btoa(binary), mediaType }
}

export function AiConstructionModal({ open, onClose, editor }: AiConstructionModalProps) {
  const [contentType, setContentType] = useState<ConstructionContentType>('blog_post')
  const [audience, setAudience] = useState('')
  const [topic, setTopic] = useState('')
  const [angle, setAngle] = useState('')
  const [mustInclude, setMustInclude] = useState('')
  const [length, setLength] = useState<ConstructionDraftLength>('medium')
  const [referenceNotes, setReferenceNotes] = useState('')
  const [refDocFile, setRefDocFile] = useState<File | null>(null)
  const [referenceSourceId, setReferenceSourceId] = useState<string | null>(null)
  const [ingestStatus, setIngestStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPlacementHint, setPhotoPlacementHint] = useState('')
  const [aiDecide, setAiDecide] = useState(false)

  const [preview, setPreview] = useState<LexicalEditorState | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const indexReferences = useCallback(async () => {
    if (!referenceNotes.trim() && !refDocFile) return
    setIngestStatus('loading')
    try {
      const res = await ragApi.ingest({ notes: referenceNotes, file: refDocFile ?? undefined })
      setReferenceSourceId(res.sourceId)
      setWarnings((w) => [...w, ...(res.warnings ?? [])])
      setIngestStatus('done')
    } catch (e) {
      setIngestStatus('error')
      setError(e instanceof APIError ? e.message : 'Indexing failed')
    }
  }, [referenceNotes, refDocFile])

  const generate = useCallback(async () => {
    setError(null)
    setPreview(null)
    setWarnings([])
    setStatus('loading')
    try {
      let articleImageBase64: string | undefined
      let articleImageMediaType: string | undefined
      let articleImagePublicUrl: string | undefined
      let sourceId = referenceSourceId ?? undefined

      if (!sourceId && (refDocFile || referenceNotes.trim())) {
        const ing = await ragApi.ingest({ notes: referenceNotes, file: refDocFile ?? undefined })
        sourceId = ing.sourceId
        setReferenceSourceId(ing.sourceId)
        if (ing.warnings?.length) setWarnings((w) => [...w, ...ing.warnings])
      }

      if (photoFile) {
        if (photoFile.size > ARTICLE_IMAGE_MAX_BYTES) {
          setError('Photo must be 3 MB or smaller.')
          setStatus('error')
          return
        }
        const upload = await uploadsApi.image(photoFile)
        const enc = await encodeImageAsBase64(photoFile)
        articleImagePublicUrl = upload.url
        articleImageBase64 = enc.base64
        articleImageMediaType = enc.mediaType
      }

      const placement = aiDecide ? '' : photoPlacementHint.trim()
      const res = await aiApi.constructionDraft({
        contentType,
        audience: audience.trim(),
        topic: topic.trim(),
        angle: angle.trim(),
        mustInclude: mustInclude.trim(),
        length,
        ...(sourceId ? { referenceSourceId: sourceId } : {}),
        ...(referenceNotes.trim() ? { referenceNotes: referenceNotes.trim() } : {}),
        ...(aiDecide ? { referenceAiDecide: true } : {}),
        ...(articleImageBase64 && articleImageMediaType && articleImagePublicUrl
          ? { articleImageBase64, articleImageMediaType, articleImagePublicUrl }
          : {}),
        ...(placement ? { articleImagePlacementHint: placement } : {}),
      })
      setPreview(res.lexicalJson)
      setWarnings((w) => [...w, ...(res.warnings ?? [])])
      setStatus('done')
    } catch (e) {
      setStatus('error')
      setError(e instanceof APIError ? e.message : e instanceof Error ? e.message : 'Request failed')
    }
  }, [
    contentType, audience, topic, angle, mustInclude, length,
    referenceSourceId, referenceNotes, refDocFile, photoFile, photoPlacementHint, aiDecide,
  ])

  const apply = useCallback(() => {
    if (!preview) return
    const tiptapDoc = lexicalToTiptapDoc(preview)
    editor.chain().focus().insertContent(tiptapDoc.content as any[]).run()
    setPreview(null)
    setWarnings([])
    setStatus('idle')
    onClose()
  }, [preview, editor, onClose])

  const discard = useCallback(() => {
    setPreview(null)
    setWarnings([])
    setStatus('idle')
  }, [])

  const canGenerate = audience.trim().length > 0 && topic.trim().length > 0 && status !== 'loading'

  return (
    <Dialog open={open} onClose={onClose} title="Construction draft" className="max-w-lg max-h-[85vh] overflow-y-auto">
      <div className="space-y-3">
        <select
          value={contentType}
          onChange={(e) => setContentType(e.target.value as ConstructionContentType)}
          className="w-full border rounded-md px-2 py-1.5 text-sm bg-background"
        >
          {CONTENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        <textarea
          value={audience}
          onChange={(e) => setAudience(e.target.value.slice(0, 800))}
          placeholder="Who is the audience?"
          rows={2}
          className="w-full border rounded-md p-2 text-sm resize-none bg-background"
        />
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value.slice(0, 2000))}
          placeholder="What is the topic?"
          rows={3}
          className="w-full border rounded-md p-2 text-sm resize-none bg-background"
        />
        <textarea
          value={angle}
          onChange={(e) => setAngle(e.target.value.slice(0, 1200))}
          placeholder="What angle or perspective?"
          rows={2}
          className="w-full border rounded-md p-2 text-sm resize-none bg-background"
        />
        <textarea
          value={mustInclude}
          onChange={(e) => setMustInclude(e.target.value.slice(0, 4000))}
          placeholder="Facts, figures, or points that must be included"
          rows={2}
          className="w-full border rounded-md p-2 text-sm resize-none bg-background"
        />

        <div className="border rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Reference materials (optional)</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={aiDecide} onChange={(e) => setAiDecide(e.target.checked)} />
            Let AI decide
          </label>
          <textarea
            value={referenceNotes}
            onChange={(e) => {
              setReferenceNotes(e.target.value.slice(0, 12000))
              setReferenceSourceId(null)
            }}
            placeholder="Paste specs, meeting notes, or facts"
            rows={2}
            className="w-full border rounded-md p-2 text-sm resize-none bg-background"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="file"
              accept=".pdf,.docx,.txt,.md"
              onChange={(e) => {
                setRefDocFile(e.target.files?.[0] ?? null)
                setReferenceSourceId(null)
              }}
              className="text-xs"
            />
            <button
              type="button"
              onClick={indexReferences}
              disabled={ingestStatus === 'loading' || (!referenceNotes.trim() && !refDocFile)}
              className="text-xs px-2 py-1 rounded border disabled:opacity-50"
            >
              {ingestStatus === 'loading' ? 'Indexing…' : 'Index references'}
            </button>
          </div>

          <div className="border-t pt-2 space-y-1.5">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Site photo (optional)</p>
            <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} className="text-xs" />
            {!aiDecide && (
              <textarea
                value={photoPlacementHint}
                onChange={(e) => setPhotoPlacementHint(e.target.value.slice(0, 800))}
                placeholder="Placement notes for the photo (optional)"
                rows={2}
                className="w-full border rounded-md p-2 text-sm resize-none bg-background"
              />
            )}
          </div>
        </div>

        <select value={length} onChange={(e) => setLength(e.target.value as ConstructionDraftLength)} className="w-full border rounded-md px-2 py-1.5 text-sm bg-background">
          {LENGTHS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>

        <button
          type="button"
          onClick={generate}
          disabled={!canGenerate}
          className="w-full px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-50"
        >
          {status === 'loading' ? 'Generating…' : 'Generate draft'}
        </button>

        {preview && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-emerald-600">Draft ready — insert at cursor</p>
            <div className="flex gap-2">
              <button type="button" onClick={apply} className="flex-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm">Apply</button>
              <button type="button" onClick={discard} className="flex-1 px-3 py-1.5 rounded-md border text-sm">Discard</button>
            </div>
          </div>
        )}

        {error && <p className="text-xs rounded-md border border-red-200 bg-red-50 text-red-600 px-2 py-1.5">{error}</p>}

        {warnings.length > 0 && (
          <ul className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 space-y-1 list-disc list-inside">
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        )}
      </div>
    </Dialog>
  )
}
