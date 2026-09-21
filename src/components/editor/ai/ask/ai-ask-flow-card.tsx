'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { ArrowLeft, ImageIcon, Square, X } from 'lucide-react'
import { Dialog } from '@/shared/ui/dialog'
import { aiApi, uploadsApi, APIError } from '@/lib/api/ai-client'
import { lexicalToTiptapDoc } from '@/lib/editor/ai/ask/lexical-to-tiptap'
import type {
  ConstructionContentType,
  ConstructionDraftImage,
  ConstructionDraftLength,
} from '@/lib/api/ai-types'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { cn } from '@/lib/utils'

const WIZARD_STEPS = [
  { id: 'type', label: 'Type' },
  { id: 'audience', label: 'Audience' },
  { id: 'topic', label: 'Topic' },
  { id: 'angle', label: 'Angle' },
  { id: 'length', label: 'Length' },
  { id: 'images', label: 'Images' },
] as const

function stepIndex(step: string): number {
  if (step === 'type') return 0
  if (step === 'audience') return 1
  if (step === 'topic') return 2
  if (step === 'angle') return 3
  if (step === 'length') return 4
  if (step === 'image_choice' || step === 'image_upload' || step === 'image_placement') return 5
  if (step === 'generating' || step === 'done') return 6
  return -1
}

function StepProgress({ step }: { step: string }) {
  const current = stepIndex(step)
  if (current < 0) return null
  return (
    <div className="flex items-center gap-1 mb-1">
      {WIZARD_STEPS.map((s, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={s.id} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div
              className={cn(
                'h-1 w-full rounded-full transition-colors',
                done || active ? 'bg-primary' : 'bg-muted',
              )}
            />
            <span
              className={cn(
                'text-[9px] truncate w-full text-center',
                active ? 'text-primary font-medium' : done ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {s.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function WizardBack({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      title="Back"
      disabled={disabled}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium border border-border bg-background text-foreground hover:bg-muted transition-colors disabled:opacity-40"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      Back
    </button>
  )
}

function WizardSkip({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      title="Skip"
      disabled={disabled}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40"
    >
      Skip
    </button>
  )
}

function WizardContinue({
  onClick, disabled, children = 'Continue',
}: {
  onClick: () => void
  disabled?: boolean
  children?: React.ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onMouseDown={(e) => { e.preventDefault(); if (!disabled) onClick() }}
      className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 flex-1"
    >
      {children}
    </button>
  )
}

function WizardNav({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-2 pt-1">{children}</div>
}

interface AiAskFlowCardProps {
  open: boolean
  onClose: () => void
  editor: Editor
}

type Step =
  | 'type'
  | 'audience'
  | 'topic'
  | 'angle'
  | 'length'
  | 'image_choice'
  | 'image_upload'
  | 'image_placement'
  | 'generating'
  | 'done'
  | 'error'

const DRAFT_TYPES: { id: ConstructionContentType; label: string; hint: string }[] = [
  { id: 'article', label: 'Article', hint: 'Longer, structured piece' },
  { id: 'blog_post', label: 'Blog post', hint: 'Friendly and scannable' },
  { id: 'case_study', label: 'Case study', hint: 'Situation, approach, outcome' },
  { id: 'experience_share', label: 'Share experience', hint: 'First-person story' },
  { id: 'technical_guide', label: 'Technical guide', hint: 'Steps and checklists' },
]

const AUDIENCE_OPTIONS = [
  'Field crew and supers',
  'Project engineers',
  'Owner / client reps',
  'General readers',
  'Other',
]

const LENGTH_OPTIONS: { id: ConstructionDraftLength; label: string }[] = [
  { id: 'short', label: 'Short' },
  { id: 'medium', label: 'Medium' },
  { id: 'long', label: 'Long' },
]

const MAX_IMAGES = 3

async function encodeImageAsBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  const mediaType = file.type?.startsWith('image/') ? file.type : 'image/png'
  const buf = await file.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]!)
  return { base64: btoa(binary), mediaType }
}

async function filesToArticleImages(files: File[]): Promise<ConstructionDraftImage[]> {
  const out: ConstructionDraftImage[] = []
  for (const file of files.slice(0, MAX_IMAGES)) {
    const upload = await uploadsApi.image(file)
    const enc = await encodeImageAsBase64(file)
    out.push({ base64: enc.base64, mediaType: enc.mediaType, publicUrl: upload.url })
  }
  return out
}

function isSafeDraftInput(text: string): boolean {
  const t = text.toLowerCase()
  const blocked = [
    /ignore (all )?(previous|prior) instructions/,
    /jailbreak/,
    /hack (the|this)/,
  ]
  return !blocked.some((re) => re.test(t))
}

export function AiAskFlowCard({ open, onClose, editor }: AiAskFlowCardProps) {
  const [step, setStep] = useState<Step>('type')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [contentType, setContentType] = useState<ConstructionContentType | null>(null)
  const [audience, setAudience] = useState('')
  const [audienceOther, setAudienceOther] = useState('')
  const [topic, setTopic] = useState('')
  const [angle, setAngle] = useState('')
  const [length, setLength] = useState<ConstructionDraftLength>('medium')

  const [photos, setPhotos] = useState<{ id: string; file: File; previewUrl: string }[]>([])
  const [placementMode, setPlacementMode] = useState<'auto' | 'manual' | null>(null)
  const [manualPlacement, setManualPlacement] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const abortRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setStep('type')
    setBusy(false)
    setError(null)
    setContentType(null)
    setAudience('')
    setAudienceOther('')
    setTopic('')
    setAngle('')
    setLength('medium')
    setPhotos((p) => {
      p.forEach((ph) => URL.revokeObjectURL(ph.previewUrl))
      return []
    })
    setPlacementMode(null)
    setManualPlacement('')
    setWarnings([])
  }, [])

  const stopGenerating = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setBusy(false)
    setStep('image_choice')
    setError(null)
  }, [])

  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  const resolvedAudience = audience.toLowerCase() === 'other' ? audienceOther.trim() : audience

  const generate = useCallback(async (
    images: ConstructionDraftImage[],
    placementHint: string,
    autoPlace: boolean,
  ) => {
    if (!contentType || !resolvedAudience || !topic.trim()) return
    if (!isSafeDraftInput(topic) || !isSafeDraftInput(resolvedAudience) || !isSafeDraftInput(angle)) {
      setError('This assistant only creates draft documents. Please use a normal writing request.')
      setStep('error')
      return
    }

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setStep('generating')
    setBusy(true)
    setError(null)
    setWarnings([])
    try {
      const res = await aiApi.constructionDraft({
        contentType,
        audience: resolvedAudience,
        topic: topic.trim(),
        angle: angle.trim(),
        mustInclude: '',
        length,
        ...(images.length ? { articleImages: images, referenceAiDecide: autoPlace } : {}),
        ...(placementHint ? { articleImagePlacementHint: placementHint } : {}),
      }, ctrl.signal)

      if (ctrl.signal.aborted) return

      const tiptapDoc = lexicalToTiptapDoc(res.lexicalJson)
      editor.chain().focus().insertContent(tiptapDoc.content as never[]).run()
      setWarnings(res.warnings ?? [])
      setStep('done')
    } catch (e) {
      if (ctrl.signal.aborted) return
      setStep('error')
      setError(e instanceof APIError ? e.message : e instanceof Error ? e.message : 'Draft failed')
    } finally {
      if (!ctrl.signal.aborted) setBusy(false)
      abortRef.current = null
    }
  }, [contentType, resolvedAudience, topic, angle, length, editor])

  const finishWithImages = useCallback(async () => {
    setBusy(true)
    try {
      const images = photos.length ? await filesToArticleImages(photos.map((p) => p.file)) : []
      const placement =
        placementMode === 'manual'
          ? manualPlacement.trim()
          : 'Auto-detect the best placement for each photo and write Figure captions.'
      setBusy(false)
      await generate(images, placement, placementMode !== 'manual')
    } catch (e) {
      setBusy(false)
      setStep('error')
      setError(e instanceof APIError ? e.message : e instanceof Error ? e.message : 'Upload failed')
    }
  }, [photos, placementMode, manualPlacement, generate])

  const addPhotoFiles = (files: FileList | null) => {
    if (!files?.length) return
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name))
    if (!imageFiles.length) return
    setPhotos((prev) => {
      const room = MAX_IMAGES - prev.length
      if (room <= 0) return prev
      return [
        ...prev,
        ...imageFiles.slice(0, room).map((file) => ({
          id: Math.random().toString(36).slice(2),
          file,
          previewUrl: URL.createObjectURL(file),
        })),
      ]
    })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Draft"
      description="Draft documents only — pick a type, then answer a few questions."
      className="max-w-md"
    >
      <div className="space-y-3">
        <StepProgress step={step} />

        {step === 'type' && (
          <>
            <p className="text-sm font-medium">What do you want to draft?</p>
            <div className="grid gap-2">
              {DRAFT_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setContentType(t.id)
                    setStep('audience')
                  }}
                  className="w-full text-left rounded-xl border px-3.5 py-3 hover:bg-primary/5 hover:border-primary/30 transition-colors"
                >
                  <span className="block text-sm font-medium">{t.label}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{t.hint}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'audience' && (
          <>
            <p className="text-sm font-medium">Who is the audience?</p>
            <div className="flex flex-wrap gap-1.5">
              {AUDIENCE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAudience(opt)}
                  className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${
                    audience === opt
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            {audience === 'Other' && (
              <input
                value={audienceOther}
                onChange={(e) => setAudienceOther(e.target.value.slice(0, 200))}
                placeholder="Describe the audience…"
                className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                autoFocus
              />
            )}
            <WizardNav>
              <WizardBack onClick={() => setStep('type')} />
              <WizardContinue disabled={!resolvedAudience} onClick={() => setStep('topic')} />
            </WizardNav>
          </>
        )}

        {step === 'topic' && (
          <>
            <p className="text-sm font-medium">What is the topic?</p>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value.slice(0, 2000))}
              placeholder="e.g. Tower crane safety on a mid-rise pour"
              rows={4}
              className="w-full border border-input rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/40"
              autoFocus
            />
            <WizardNav>
              <WizardBack onClick={() => setStep('audience')} />
              <WizardContinue disabled={topic.trim().length < 4} onClick={() => setStep('angle')} />
            </WizardNav>
          </>
        )}

        {step === 'angle' && (
          <>
            <p className="text-sm font-medium">Any angle or focus? (optional)</p>
            <textarea
              value={angle}
              onChange={(e) => setAngle(e.target.value.slice(0, 1200))}
              placeholder="e.g. Practical tips, no jargon"
              rows={3}
              className="w-full border border-input rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/40"
              autoFocus
            />
            <WizardNav>
              <WizardBack onClick={() => setStep('topic')} />
              <WizardSkip onClick={() => setStep('length')} />
              <WizardContinue onClick={() => setStep('length')} />
            </WizardNav>
          </>
        )}

        {step === 'length' && (
          <>
            <p className="text-sm font-medium">How long should it be?</p>
            <div className="flex gap-2">
              {LENGTH_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLength(opt.id)}
                  className={`flex-1 text-sm h-9 px-3 rounded-lg border transition-colors ${
                    length === opt.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <WizardNav>
              <WizardBack onClick={() => setStep('angle')} />
              <WizardContinue onClick={() => setStep('image_choice')} />
            </WizardNav>
          </>
        )}

        {step === 'image_choice' && (
          <>
            <p className="text-sm font-medium">Add images to this draft?</p>
            <p className="text-xs text-muted-foreground">Optional — you can skip.</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setStep('image_upload')}
                className="w-full text-sm px-3 py-2.5 rounded-lg border hover:bg-muted text-left"
              >
                Yes — upload photos
              </button>
              <button
                type="button"
                onClick={() => void generate([], '', true)}
                className="w-full text-sm px-3 py-2.5 rounded-lg border hover:bg-muted text-left"
              >
                No images
              </button>
            </div>
            <WizardNav>
              <WizardBack onClick={() => setStep('length')} />
              <WizardSkip onClick={() => void generate([], '', true)} />
            </WizardNav>
          </>
        )}

        {step === 'image_upload' && (
          <>
            <p className="text-sm font-medium">Upload photos</p>
            <p className="text-xs text-muted-foreground">
              {photos.length
                ? `${photos.length} of ${MAX_IMAGES} photo${photos.length === 1 ? '' : 's'} selected`
                : `Up to ${MAX_IMAGES} images.`}
            </p>

            {photos.length > 0 ? (
              <div className="space-y-2">
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
                        onClick={() => setPhotos((p) => {
                          const t = p.find((x) => x.id === photo.id)
                          if (t) URL.revokeObjectURL(t.previewUrl)
                          return p.filter((x) => x.id !== photo.id)
                        })}
                        className="absolute top-1.5 right-1.5 rounded-full bg-background/95 border p-1 shadow-sm hover:bg-muted"
                        aria-label={`Remove ${photo.file.name}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                {photos.length < MAX_IMAGES && (
                  <label className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border bg-background hover:bg-muted cursor-pointer">
                    <ImageIcon className="w-3.5 h-3.5" />
                    Add more photos
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={(e) => {
                        addPhotoFiles(e.target.files)
                        e.target.value = ''
                      }}
                    />
                  </label>
                )}
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 cursor-pointer hover:bg-muted/30 transition-colors">
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">Click to add images</span>
                <span className="text-[11px] text-muted-foreground">PNG, JPG up to 3 MB each</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    addPhotoFiles(e.target.files)
                    e.target.value = ''
                  }}
                />
              </label>
            )}
            <WizardNav>
              <WizardBack onClick={() => setStep('image_choice')} />
              <WizardContinue disabled={photos.length === 0} onClick={() => setStep('image_placement')}>
                Continue ({photos.length} photo{photos.length === 1 ? '' : 's'})
              </WizardContinue>
            </WizardNav>
          </>
        )}

        {step === 'image_placement' && (
          <>
            <p className="text-sm font-medium">Where should images go?</p>
            {photos.length > 0 && (
              <div className="rounded-lg border bg-muted/20 px-3 py-2">
                <p className="text-xs font-medium text-foreground">
                  {photos.length} photo{photos.length === 1 ? '' : 's'} will be included
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.previewUrl}
                        alt={photo.file.name}
                        title={photo.file.name}
                        className="h-12 w-12 object-cover rounded-md border bg-background"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setPlacementMode('auto')
                  void finishWithImages()
                }}
                className="w-full text-sm px-3 py-2.5 rounded-lg border hover:bg-muted text-left disabled:opacity-50"
              >
                {busy ? 'Uploading photos…' : 'Auto-detect placement & captions'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setPlacementMode('manual')}
                className={`w-full text-sm px-3 py-2.5 rounded-lg border text-left disabled:opacity-50 ${
                  placementMode === 'manual' ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                }`}
              >
                I’ll place them manually
              </button>
            </div>
            {placementMode === 'manual' && (
              <>
                <textarea
                  value={manualPlacement}
                  onChange={(e) => setManualPlacement(e.target.value.slice(0, 800))}
                  placeholder="e.g. Hero image after intro; second photo in Safety section"
                  rows={3}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
                <WizardContinue
                  disabled={!manualPlacement.trim() || busy}
                  onClick={() => void finishWithImages()}
                >
                  {busy ? 'Uploading photos…' : 'Generate draft'}
                </WizardContinue>
              </>
            )}
            <WizardNav>
              <WizardBack onClick={() => setStep('image_upload')} />
            </WizardNav>
          </>
        )}

        {step === 'generating' && (
          <div className="py-8 flex flex-col items-center gap-3">
            <span className="ai-improve-shimmer-text text-sm font-medium">Generating draft...</span>
            <button
              type="button"
              onClick={stopGenerating}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-colors"
            >
              <Square className="w-3 h-3 fill-current" />
              Stop
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Draft inserted into the editor.</p>
            <p className="text-xs text-muted-foreground">
              Hover an image to edit it. Captions use Figure format under each photo.
            </p>
            {warnings.length > 0 && (
              <ul className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 list-disc list-inside">
                {warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            )}
            <ConfirmButton className="w-full" onClick={onClose}>Done</ConfirmButton>
          </div>
        )}

        {step === 'error' && (
          <div className="space-y-3">
            <p className="text-xs rounded-lg border border-red-200 bg-red-50 text-red-600 px-3 py-2">
              {error ?? 'Something went wrong'}
            </p>
            <WizardNav>
              <WizardBack onClick={reset} />
              <WizardContinue onClick={onClose}>Close</WizardContinue>
            </WizardNav>
          </div>
        )}
      </div>
    </Dialog>
  )
}
