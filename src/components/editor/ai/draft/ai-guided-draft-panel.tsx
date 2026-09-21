'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Check, Loader2, Pencil, RefreshCw, Sparkles, X } from 'lucide-react'
import { aiApi, APIError } from '@/lib/api/ai-client'
import type { AskDraftPlan, DraftOutlineSection } from '@/lib/api/ai-types'
import { getDraftPlaybook } from '@/lib/editor/ai/draft/draft-playbooks'
import {
  OPEN_GUIDED_DRAFT_EVENT,
  type GuidedDraftEventDetail,
} from '@/lib/editor/ai/draft/guided-draft-events'
import { findHeadingRange, readSectionText } from '@/lib/editor/ai/draft/guided-draft-dom'
import { insertMarkdown } from '@/lib/editor/ai/ask/insert-markdown'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { cn } from '@/lib/utils'

interface AiGuidedDraftPanelProps {
  editor: Editor
}

type Step = 'boot' | 'title' | 'title_custom' | 'section' | 'improve' | 'done'

export function AiGuidedDraftPanel({ editor }: AiGuidedDraftPanelProps) {
  const [open, setOpen] = useState(false)
  const [plan, setPlan] = useState<AskDraftPlan | null>(null)
  const [outline, setOutline] = useState<DraftOutlineSection[]>([])
  const [step, setStep] = useState<Step>('boot')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [suggestedTitle, setSuggestedTitle] = useState('')
  const [titleHistory, setTitleHistory] = useState<string[]>([])
  const [customTitle, setCustomTitle] = useState('')
  const [confirmedTitle, setConfirmedTitle] = useState('')

  const [sectionIndex, setSectionIndex] = useState(0)
  const [guide, setGuide] = useState<{
    heading: string
    whatToWrite: string
    howToWrite: string
    tips?: string[]
  } | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  const close = useCallback(() => {
    abortRef.current?.abort()
    setOpen(false)
    setPlan(null)
    setOutline([])
    setStep('boot')
    setBusy(false)
    setError(null)
    setSuggestedTitle('')
    setTitleHistory([])
    setCustomTitle('')
    setConfirmedTitle('')
    setSectionIndex(0)
    setGuide(null)
  }, [])

  const loadTitles = useCallback(async (p: AskDraftPlan, previous: string[]) => {
    setBusy(true)
    setError(null)
    try {
      const res = await aiApi.draftGuide({
        action: 'suggestTitles',
        plan: p,
        previousTitles: previous,
      })
      const next = res.titles?.[0]?.trim()
      if (!next) throw new Error('No title suggestion')
      setSuggestedTitle(next)
      setTitleHistory((h) => [...h, next])
      setStep('title')
    } catch (e) {
      setError(e instanceof APIError ? e.message : e instanceof Error ? e.message : 'Could not suggest a title')
      setSuggestedTitle(p.draftName || p.topic)
      setStep('title')
    } finally {
      setBusy(false)
    }
  }, [])

  const loadSectionGuide = useCallback(async (p: AskDraftPlan, section: DraftOutlineSection) => {
    setBusy(true)
    setError(null)
    setGuide(null)
    try {
      const res = await aiApi.draftGuide({
        action: 'sectionGuide',
        plan: p,
        sectionId: section.id,
        sectionHeading: section.heading,
      })
      if (!res.guide) throw new Error('No guide')
      setGuide(res.guide)

      const heading = res.guide.heading || section.heading
      const existing = findHeadingRange(editor, heading)
      if (!existing) {
        editor
          .chain()
          .focus('end')
          .insertContent([
            { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: heading }] },
            { type: 'paragraph' },
          ])
          .run()
      }
      // Place cursor after the heading for writing
      const range = findHeadingRange(editor, heading)
      if (range) {
        editor.chain().focus().setTextSelection(range.contentFrom).run()
      }
      setStep('section')
    } catch (e) {
      setError(e instanceof APIError ? e.message : e instanceof Error ? e.message : 'Could not load section guide')
      setGuide({
        heading: section.heading,
        whatToWrite: section.intent || 'Write this part of the story in your own words.',
        howToWrite: 'Keep it concrete and field-honest. Short paragraphs work well.',
      })
      const existing = findHeadingRange(editor, section.heading)
      if (!existing) {
        editor
          .chain()
          .focus('end')
          .insertContent([
            { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: section.heading }] },
            { type: 'paragraph' },
          ])
          .run()
      }
      setStep('section')
    } finally {
      setBusy(false)
    }
  }, [editor])

  const startGuided = useCallback(async (incoming: AskDraftPlan) => {
    setOpen(true)
    setPlan(incoming)
    setStep('boot')
    setBusy(true)
    setError(null)
    setSectionIndex(0)
    setGuide(null)
    setConfirmedTitle('')
    setCustomTitle('')
    setTitleHistory([])

    let working = { ...incoming }
    try {
      if (!working.outline?.length) {
        const res = await aiApi.draftGuide({ action: 'proposeOutline', plan: working })
        working = {
          ...working,
          draftName: res.draftName || working.draftName || working.topic,
          outline: res.outline ?? [],
        }
        setPlan(working)
      }
      setOutline(working.outline ?? [])
      await loadTitles(working, [])
    } catch (e) {
      setError(e instanceof APIError ? e.message : e instanceof Error ? e.message : 'Could not start guided writing')
      setOutline(working.outline ?? [])
      setSuggestedTitle(working.draftName || working.topic)
      setStep('title')
      setBusy(false)
    }
  }, [loadTitles])

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<GuidedDraftEventDetail>).detail
      if (!detail?.plan) return
      void startGuided(detail.plan)
    }
    window.addEventListener(OPEN_GUIDED_DRAFT_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_GUIDED_DRAFT_EVENT, onOpen)
  }, [startGuided])

  useEffect(() => () => { abortRef.current?.abort() }, [])

  const confirmTitle = useCallback((title: string) => {
    const t = title.trim()
    if (!t || !plan) return
    setConfirmedTitle(t)

    // Replace or insert H1
    let h1Pos: number | null = null
    editor.state.doc.forEach((node, offset) => {
      if (h1Pos == null && node.type.name === 'heading' && Number(node.attrs.level) === 1) {
        h1Pos = offset
      }
    })
    if (h1Pos != null) {
      const node = editor.state.doc.nodeAt(h1Pos)
      if (node) {
        editor
          .chain()
          .focus()
          .insertContentAt(
            { from: h1Pos, to: h1Pos + node.nodeSize },
            { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: t }] },
          )
          .run()
      }
    } else {
      editor
        .chain()
        .focus('start')
        .insertContent({ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: t }] })
        .run()
    }

    const sections = outline.length ? outline : plan.outline ?? []
    if (!sections.length) {
      setStep('done')
      return
    }
    setSectionIndex(0)
    void loadSectionGuide(plan, sections[0]!)
  }, [editor, plan, outline, loadSectionGuide])

  const suggestAnotherTitle = useCallback(() => {
    if (!plan) return
    void loadTitles(plan, titleHistory)
  }, [plan, titleHistory, loadTitles])

  const finishSection = useCallback(() => {
    setStep('improve')
  }, [])

  const skipImprove = useCallback(() => {
    if (!plan) return
    const sections = outline.length ? outline : plan.outline ?? []
    const next = sectionIndex + 1
    if (next >= sections.length) {
      setStep('done')
      return
    }
    setSectionIndex(next)
    void loadSectionGuide(plan, sections[next]!)
  }, [plan, outline, sectionIndex, loadSectionGuide])

  const runImprove = useCallback(async () => {
    if (!plan || !guide) return
    const text = readSectionText(editor, guide.heading)
    if (!text.trim()) {
      setError('Write a bit in this section first, then improve.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await aiApi.draftGuide({
        action: 'improveSection',
        plan,
        sectionId: outline[sectionIndex]?.id,
        sectionHeading: guide.heading,
        sectionText: text,
      })
      const md = res.improvedMarkdown?.trim()
      if (!md) throw new Error('Empty improve result')
      const range = findHeadingRange(editor, guide.heading)
      if (range && range.contentTo > range.contentFrom) {
        insertMarkdown(editor, md, { from: range.contentFrom, to: range.contentTo })
      } else if (range) {
        insertMarkdown(editor, md, { from: range.contentFrom, to: range.contentFrom })
      }
      skipImprove()
    } catch (e) {
      setError(e instanceof APIError ? e.message : e instanceof Error ? e.message : 'Improve failed')
    } finally {
      setBusy(false)
    }
  }, [plan, guide, editor, outline, sectionIndex, skipImprove])

  if (!open || !plan) return null

  const draftLabel = plan.draftName || plan.topic
  const playbook = getDraftPlaybook(plan.contentType)
  const currentSection = (outline.length ? outline : plan.outline ?? [])[sectionIndex]
  const sectionCount = (outline.length ? outline : plan.outline ?? []).length

  return (
    <div className="draft-enhance-panel sticky top-0 z-20 w-full shrink-0 border-b bg-background/95 backdrop-blur-sm shadow-sm">
      <div className="px-4 py-3 space-y-3 max-h-[min(48vh,460px)] overflow-y-auto draft-chat-scroll">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold leading-tight">Writing together</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="font-medium text-foreground">{draftLabel}</span>
                {' — '}
                {playbook.id === 'experience_share'
                  ? 'tell it like you were there; I’ll keep you honest and clear.'
                  : playbook.id === 'case_study'
                    ? 'we’ll stay evidence-led; you bring the facts, I keep the spine tight.'
                    : playbook.id === 'blog_post'
                      ? 'hook first, takeaway last — write how you’d talk it through.'
                      : playbook.id === 'technical_guide'
                        ? 'precise steps and safety callouts; you write, I keep it usable on site.'
                        : 'clear thesis, clean sections — you write the piece, I guide the structure.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            title="Close"
            onClick={close}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md border hover:bg-muted"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {busy && (step === 'boot' || step === 'title') && (
          <p className="ai-improve-shimmer-text text-sm font-medium">
            {step === 'boot' ? 'Building your outline…' : 'Suggesting a title…'}
          </p>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}

        {step === 'title' && (
          <div className="space-y-3 rounded-lg border bg-muted/20 px-3 py-3">
            <p className="text-sm leading-relaxed">
              Let’s start with the title. Here’s a suggestion — does this look good?
            </p>
            <p className="text-base font-semibold">{suggestedTitle}</p>
            <div className="flex flex-wrap gap-2">
              <ConfirmButton
                className="h-9 text-sm"
                hideIcon
                disabled={busy}
                onClick={() => confirmTitle(suggestedTitle)}
              >
                Confirm
              </ConfirmButton>
              <button
                type="button"
                disabled={busy}
                onClick={suggestAnotherTitle}
                className="h-9 px-3 rounded-md text-sm font-medium border inline-flex items-center gap-1.5 hover:bg-muted disabled:opacity-40"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Suggest another
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setCustomTitle(suggestedTitle)
                  setStep('title_custom')
                }}
                className="h-9 px-3 rounded-md text-sm font-medium border inline-flex items-center gap-1.5 hover:bg-muted disabled:opacity-40"
              >
                <Pencil className="w-3.5 h-3.5" />
                Custom
              </button>
            </div>
          </div>
        )}

        {step === 'title_custom' && (
          <div className="space-y-3 rounded-lg border bg-muted/20 px-3 py-3">
            <p className="text-sm">Type your title:</p>
            <input
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value.slice(0, 160))}
              className="w-full h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              placeholder="Your title"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  confirmTitle(customTitle)
                }
              }}
            />
            <div className="flex gap-2">
              <ConfirmButton
                className="h-9 text-sm"
                hideIcon
                disabled={!customTitle.trim()}
                onClick={() => confirmTitle(customTitle)}
              >
                Confirm
              </ConfirmButton>
              <button
                type="button"
                onClick={() => setStep('title')}
                className="h-9 px-3 rounded-md text-sm font-medium border hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {step === 'section' && guide && currentSection && (
          <div className="space-y-3 rounded-lg border bg-muted/20 px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Section {sectionIndex + 1} of {sectionCount}
              </p>
              {confirmedTitle && (
                <p className="text-[11px] text-muted-foreground truncate max-w-[50%]">{confirmedTitle}</p>
              )}
            </div>
            <p className="text-sm font-semibold">{guide.heading}</p>
            <div className="space-y-2 text-sm leading-relaxed">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
                  What to write
                </p>
                <p>{guide.whatToWrite}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
                  How to write
                </p>
                <p>{guide.howToWrite}</p>
              </div>
              {!!guide.tips?.length && (
                <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                  {guide.tips.map((t) => <li key={t}>{t}</li>)}
                </ul>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Write under this heading in the editor in your own words, then mark the section done.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={finishSection}
              className="h-9 px-3 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
            >
              Section done
            </button>
          </div>
        )}

        {step === 'improve' && guide && (
          <div className="space-y-3 rounded-lg border bg-muted/20 px-3 py-3">
            <p className="text-sm leading-relaxed">
              Nice work on <span className="font-medium">{guide.heading}</span>. Want an optional polish for this section only? You can skip.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void runImprove()}
                className="h-9 px-3 rounded-md text-sm font-medium border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground inline-flex items-center gap-1.5 disabled:opacity-40"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Improve section
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={skipImprove}
                className="h-9 px-3 rounded-md text-sm font-medium border hover:bg-muted disabled:opacity-40"
              >
                Skip / continue
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-2 rounded-lg border bg-emerald-500/10 px-3 py-3">
            <p className="text-sm font-medium">You’ve walked through the outline — keep editing freely anytime.</p>
            <button
              type="button"
              onClick={close}
              className="h-9 px-3 rounded-md text-sm font-medium border hover:bg-muted"
            >
              Close assistant
            </button>
          </div>
        )}

        {sectionCount > 0 && (step === 'section' || step === 'improve') && (
          <div className="flex gap-1">
            {Array.from({ length: sectionCount }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full',
                  i < sectionIndex ? 'bg-primary' : i === sectionIndex ? 'bg-primary/60' : 'bg-muted',
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
