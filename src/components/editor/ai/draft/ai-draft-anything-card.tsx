'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import {
  ChevronDown, ChevronRight, FileUp, ImageIcon, Loader2, Sparkles, Wand2, X,
} from 'lucide-react'
import { Dialog } from '@/shared/ui/dialog'
import { aiApi, ragApi, uploadsApi, APIError } from '@/lib/api/ai-client'
import { lexicalToTiptapDoc } from '@/lib/editor/ai/ask/lexical-to-tiptap'
import {
  DRAFT_ANYTHING_FIXTURES,
  DRAFT_ANYTHING_SAMPLE_IMAGES,
} from '@/lib/editor/ai/draft/draft-anything-fixtures'
import type {
  ConstructionContentType, ConstructionDraftImage, ConstructionDraftLength, LexicalEditorState,
} from '@/lib/api/ai-types'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { CancelButton } from '@/shared/ui/cancel-button'

interface AiDraftAnythingCardProps {
  open: boolean
  onClose: () => void
  editor: Editor
}

const inputClass =
  'w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring/40 placeholder:text-muted-foreground/60 resize-none'

const selectClass =
  'w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring/40 appearance-none'

const CONTENT_TYPES: { value: ConstructionContentType; label: string }[] = [
  { value: 'article', label: 'Article' },
  { value: 'blog_post', label: 'Blog post' },
  { value: 'case_study', label: 'Case study' },
  { value: 'experience_share', label: 'Experience share' },
  { value: 'technical_guide', label: 'Technical guide' },
]

const LENGTHS: { value: ConstructionDraftLength; label: string }[] = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
]

const IMAGE_MAX_BYTES = 3 * 1024 * 1024

interface RefDoc {
  id: string
  file: File
  sourceId: string | null
  status: 'idle' | 'loading' | 'done' | 'error'
}

interface RefPhoto {
  id: string
  file: File
  previewUrl: string
}

function makeId() {
  return Math.random().toString(36).slice(2)
}

async function encodeImageAsBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  const mediaType = file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg'
  const buf = await file.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]!)
  return { base64: btoa(binary), mediaType }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

export function AiDraftAnythingCard({ open, onClose, editor }: AiDraftAnythingCardProps) {
  const [contentType, setContentType] = useState<ConstructionContentType>('blog_post')
  const [audience, setAudience] = useState('')
  const [topic, setTopic] = useState('')
  const [angle, setAngle] = useState('')
  const [mustInclude, setMustInclude] = useState('')
  const [length, setLength] = useState<ConstructionDraftLength>('medium')

  const [referencesOpen, setReferencesOpen] = useState(false)
  const [referenceNotes, setReferenceNotes] = useState<string[]>([])
  const [refDocs, setRefDocs] = useState<RefDoc[]>([])
  const [photos, setPhotos] = useState<RefPhoto[]>([])
  const [photoPlacementHint, setPhotoPlacementHint] = useState('')
  const [aiDecide, setAiDecide] = useState(true)

  const [preview, setPreview] = useState<LexicalEditorState | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [sampleLoading, setSampleLoading] = useState(false)

  const resetForm = useCallback(() => {
    setPreview(null)
    setWarnings([])
    setError(null)
    setStatus('idle')
  }, [])

  useEffect(() => {
    if (!open) resetForm()
  }, [open, resetForm])

  const fillSample = useCallback(async () => {
    const fixture = DRAFT_ANYTHING_FIXTURES[contentType]
    setAudience(fixture.audience)
    setTopic(fixture.topic)
    setAngle(fixture.angle)
    setMustInclude(fixture.mustInclude)
    setLength(fixture.length)
    setPhotoPlacementHint(fixture.photoPlacementHint)
    setAiDecide(true)
    setReferencesOpen(true)
    setError(null)
    setSampleLoading(true)

    try {
      const loaded: RefPhoto[] = []
      for (const sample of DRAFT_ANYTHING_SAMPLE_IMAGES) {
        const res = await fetch(sample.url)
        if (!res.ok) throw new Error(`Sample image not found: ${sample.url}`)
        const blob = await res.blob()
        const file = new File([blob], sample.name, { type: blob.type || 'image/png' })
        loaded.push({ id: makeId(), file, previewUrl: URL.createObjectURL(file) })
      }
      setPhotos((prev) => {
        for (const p of prev) URL.revokeObjectURL(p.previewUrl)
        return loaded
      })
    } catch {
      setError('Could not load sample images. Check public/sample_images/sample.png and mistake.png.')
    } finally {
      setSampleLoading(false)
    }
  }, [contentType])

  const addNote = useCallback(() => {
    setReferenceNotes((notes) => [...notes, ''])
  }, [])

  const updateNote = useCallback((index: number, value: string) => {
    setReferenceNotes((notes) => notes.map((n, i) => (i === index ? value.slice(0, 12000) : n)))
  }, [])

  const removeNote = useCallback((index: number) => {
    setReferenceNotes((notes) => notes.filter((_, i) => i !== index))
  }, [])

  const addDocFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return
    setRefDocs((docs) => [
      ...docs,
      ...Array.from(files).map((file) => ({
        id: makeId(), file, sourceId: null as string | null, status: 'idle' as const,
      })),
    ])
  }, [])

  const removeDoc = useCallback((id: string) => {
    setRefDocs((docs) => docs.filter((d) => d.id !== id))
  }, [])

  const addPhotoFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return
    setReferencesOpen(true)
    setPhotos((p) => [
      ...p,
      ...Array.from(files).map((file) => ({
        id: makeId(), file, previewUrl: URL.createObjectURL(file),
      })),
    ])
  }, [])

  const removePhoto = useCallback((id: string) => {
    setPhotos((p) => {
      const target = p.find((ph) => ph.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return p.filter((ph) => ph.id !== id)
    })
  }, [])

  const generate = useCallback(async () => {
    setError(null)
    setPreview(null)
    setWarnings([])
    setStatus('loading')
    try {
      const sourceIds: string[] = refDocs.map((d) => d.sourceId).filter((s): s is string => !!s)
      const unindexedDocs = refDocs.filter((d) => !d.sourceId)
      const combinedNotes = referenceNotes.filter((n) => n.trim()).join('\n\n')

      for (const doc of unindexedDocs) {
        const ing = await ragApi.ingest({ notes: '', file: doc.file })
        sourceIds.push(ing.sourceId)
        setRefDocs((docs) => docs.map((d) => (d.id === doc.id ? { ...d, sourceId: ing.sourceId, status: 'done' } : d)))
        if (ing.warnings?.length) setWarnings((w) => [...w, ...ing.warnings])
      }

      if (combinedNotes.trim() && sourceIds.length === 0) {
        const ing = await ragApi.ingest({ notes: combinedNotes })
        sourceIds.push(ing.sourceId)
        if (ing.warnings?.length) setWarnings((w) => [...w, ...ing.warnings])
      }

      const articleImages: ConstructionDraftImage[] = []
      for (const photo of photos) {
        if (photo.file.size > IMAGE_MAX_BYTES) {
          setError(`Photo "${photo.file.name}" must be 3 MB or smaller.`)
          setStatus('error')
          return
        }
        try {
          const upload = await uploadsApi.image(photo.file)
          const enc = await encodeImageAsBase64(photo.file)
          articleImages.push({
            base64: enc.base64,
            mediaType: enc.mediaType,
            publicUrl: upload.url,
          })
        } catch (uploadErr) {
          const msg = uploadErr instanceof APIError
            ? uploadErr.message
            : uploadErr instanceof Error
              ? uploadErr.message
              : 'Upload failed'
          setError(`Could not upload "${photo.file.name}": ${msg}`)
          setStatus('error')
          return
        }
      }

      const placement = aiDecide ? '' : photoPlacementHint.trim()
      const res = await aiApi.constructionDraft({
        contentType,
        audience: audience.trim(),
        topic: topic.trim(),
        angle: angle.trim(),
        mustInclude: mustInclude.trim(),
        length,
        ...(sourceIds.length > 0 ? { referenceSourceIds: sourceIds } : {}),
        ...(combinedNotes.trim() ? { referenceNotes: combinedNotes.trim() } : {}),
        // Vision always analyzes photos; aiDecide controls auto placement vs user hint
        referenceAiDecide: aiDecide,
        ...(articleImages.length > 0 ? { articleImages } : {}),
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
    referenceNotes, refDocs, photos, photoPlacementHint, aiDecide,
  ])

  const apply = useCallback(() => {
    if (!preview) return
    const tiptapDoc = lexicalToTiptapDoc(preview)
    editor.chain().focus().insertContent(tiptapDoc.content as never[]).run()
    onClose()
  }, [preview, editor, onClose])

  const canGenerate = audience.trim().length > 0 && topic.trim().length > 0 && status !== 'loading'

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Draft Anything"
      description="Answer a few questions. Uploaded photos are analyzed with vision for placement and captions, then the draft is written."
      className="max-w-md"
    >
      <div className="space-y-3 max-h-[min(72vh,640px)] overflow-y-auto pr-0.5">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Type">
            <div className="relative">
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value as ConstructionContentType)}
                className={selectClass}
              >
                {CONTENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </Field>
          <Field label="Length">
            <div className="relative">
              <select
                value={length}
                onChange={(e) => setLength(e.target.value as ConstructionDraftLength)}
                className={selectClass}
              >
                {LENGTHS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </Field>
        </div>

        <button
          type="button"
          onClick={() => void fillSample()}
          disabled={sampleLoading}
          className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-primary/25 bg-primary/5 text-primary hover:bg-primary/10 disabled:opacity-50 transition-colors"
        >
          {sampleLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
          Try sample (form + 2 site photos)
        </button>

        <Field label="Audience">
          <textarea
            value={audience}
            onChange={(e) => setAudience(e.target.value.slice(0, 800))}
            placeholder="Who is this for?"
            rows={2}
            className={inputClass}
          />
        </Field>

        <Field label="Topic">
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value.slice(0, 2000))}
            placeholder="What should the draft cover?"
            rows={3}
            className={inputClass}
          />
        </Field>

        <Field label="Angle (optional)">
          <textarea
            value={angle}
            onChange={(e) => setAngle(e.target.value.slice(0, 1200))}
            placeholder="Tone or perspective"
            rows={2}
            className={inputClass}
          />
        </Field>

        <Field label="Must include (optional)">
          <textarea
            value={mustInclude}
            onChange={(e) => setMustInclude(e.target.value.slice(0, 4000))}
            placeholder="Facts, figures, or requirements"
            rows={2}
            className={inputClass}
          />
        </Field>

        <div className="rounded-xl border bg-muted/20 p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Photos</p>
              <p className="text-[11px] text-muted-foreground">
                {photos.length
                  ? `${photos.length} photo${photos.length === 1 ? '' : 's'} ready for vision placement`
                  : 'Upload site photos — previews appear here'}
              </p>
            </div>
            <label className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border bg-background hover:bg-muted cursor-pointer shrink-0">
              <ImageIcon className="w-3.5 h-3.5" />
              {photos.length ? 'Add more' : 'Upload photos'}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => { addPhotoFiles(e.target.files); e.target.value = '' }}
                className="sr-only"
              />
            </label>
          </div>

          {photos.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="relative rounded-lg border bg-background overflow-hidden shadow-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.previewUrl}
                    alt={photo.file.name}
                    className="h-28 w-full object-cover bg-muted"
                  />
                  <div className="px-2 py-1.5 space-y-0.5 border-t">
                    <p className="text-[11px] font-medium truncate" title={photo.file.name}>
                      {photo.file.name}
                    </p>
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                      Ready · IMAGE_{index + 1}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="absolute top-1.5 right-1.5 rounded-full bg-background/95 border p-1 shadow-sm hover:bg-muted"
                    aria-label={`Remove ${photo.file.name}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-background px-3 py-6 text-center cursor-pointer hover:bg-muted/40 transition-colors">
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">Drop or click to upload photos</span>
              <span className="text-[11px] text-muted-foreground">PNG, JPG up to 3 MB each</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => { addPhotoFiles(e.target.files); e.target.value = '' }}
                className="sr-only"
              />
            </label>
          )}

          <label className="flex items-center gap-2 text-xs rounded-lg border bg-background px-3 py-2 cursor-pointer hover:bg-muted/30">
            <input
              type="checkbox"
              checked={aiDecide}
              onChange={(e) => setAiDecide(e.target.checked)}
              className="h-3.5 w-3.5 accent-primary"
            />
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
            AI analyzes photos for placement and captions
          </label>

          {!aiDecide && (
            <textarea
              value={photoPlacementHint}
              onChange={(e) => setPhotoPlacementHint(e.target.value.slice(0, 800))}
              placeholder="Where should photos go? (optional)"
              rows={2}
              className={inputClass}
            />
          )}
        </div>

        <div className="rounded-xl border overflow-hidden">
          <button
            type="button"
            onClick={() => setReferencesOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
          >
            <span className="text-xs font-medium text-muted-foreground">
              Notes & documents
              {referenceNotes.filter((n) => n.trim()).length + refDocs.length > 0
                ? ` · ${referenceNotes.filter((n) => n.trim()).length + refDocs.length}`
                : ''}
            </span>
            <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${referencesOpen ? 'rotate-90' : ''}`} />
          </button>

          {referencesOpen && (
            <div className="px-3 pb-3 space-y-3 border-t pt-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium text-muted-foreground">Notes</p>
                  <button type="button" onClick={addNote} className="text-[11px] font-medium text-primary">
                    + Add
                  </button>
                </div>
                {referenceNotes.map((note, i) => (
                  <div key={i} className="relative">
                    <textarea
                      value={note}
                      onChange={(e) => updateNote(i, e.target.value)}
                      placeholder="Paste notes or facts"
                      rows={2}
                      className={`${inputClass} pr-8`}
                    />
                    <button
                      type="button"
                      onClick={() => removeNote(i)}
                      className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground">Documents</p>
                <label className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border hover:bg-muted cursor-pointer">
                  <FileUp className="w-3.5 h-3.5" />
                  Add files
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,.md"
                    multiple
                    onChange={(e) => { addDocFiles(e.target.files); e.target.value = '' }}
                    className="sr-only"
                  />
                </label>
                {refDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 text-xs border rounded-md px-2 py-1.5">
                    <span className="flex-1 truncate">{doc.file.name}</span>
                    <button type="button" onClick={() => removeDoc(doc.id)}>
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {status === 'done' && preview ? (
          <div className="rounded-xl border bg-muted/20 p-3 space-y-2">
            <p className="text-sm font-medium">Draft ready</p>
            <p className="text-xs text-muted-foreground">Insert at the cursor, including any images and captions.</p>
            <div className="flex gap-2">
              <ConfirmButton onClick={apply} className="flex-1">Insert draft</ConfirmButton>
              <CancelButton onClick={() => { setPreview(null); setStatus('idle') }} className="flex-1">
                Discard
              </CancelButton>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void generate()}
            disabled={!canGenerate}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition"
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {photos.length > 0 ? 'Analyzing photos & generating…' : 'Generating…'}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {photos.length > 0 ? `Generate draft (${photos.length} photo${photos.length === 1 ? '' : 's'})` : 'Generate draft'}
              </>
            )}
          </button>
        )}

        {error && (
          <p className="text-xs rounded-lg border border-red-200 bg-red-50 text-red-600 px-3 py-2">{error}</p>
        )}

        {warnings.length > 0 && (
          <ul className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 space-y-1 list-disc list-inside">
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        )}
      </div>
    </Dialog>
  )
}

/** @deprecated Use AiDraftAnythingCard */
export const AiConstructionModal = AiDraftAnythingCard
