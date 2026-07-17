'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Lightbulb, Loader2, RefreshCw, Sparkles, TrendingUp, X } from 'lucide-react'
import { aiApi, APIError } from '@/lib/api/ai-client'
import type {
  ConstructionContentType,
  DraftEnhanceImprovement,
  DraftEnhanceKind,
  DraftEnhanceResponse,
} from '@/lib/api/ai-types'
import {
  OPEN_DRAFT_ENHANCE_EVENT,
  type DraftEnhanceEventDetail,
} from '@/lib/editor/draft-anything-events'
import { insertMarkdown } from '@/lib/editor/insert-markdown'
import { findEnhanceInsertPos } from '@/lib/editor/draft-enhance-insert'
import { cn } from '@/lib/utils'

interface AiDraftEnhancePanelProps {
  editor: Editor
}

const CONTENT_TYPES: ConstructionContentType[] = [
  'article', 'blog_post', 'case_study', 'experience_share', 'technical_guide',
]

function asContentType(v?: string): ConstructionContentType | undefined {
  return v && (CONTENT_TYPES as string[]).includes(v) ? (v as ConstructionContentType) : undefined
}

const KIND_META: Record<DraftEnhanceKind, { label: string; className: string }> = {
  add: { label: 'Add', className: 'bg-sky-500/15 text-sky-800 dark:text-sky-200' },
  trend: { label: 'In trend', className: 'bg-violet-500/15 text-violet-800 dark:text-violet-200' },
  strengthen: { label: 'Strengthen', className: 'bg-amber-500/15 text-amber-900 dark:text-amber-200' },
  clarify: { label: 'Clarify', className: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200' },
}

function editorPlainText(editor: Editor): string {
  return editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n').trim()
}

export function AiDraftEnhancePanel({ editor }: AiDraftEnhancePanelProps) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<DraftEnhanceResponse | null>(null)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const contextRef = useRef<DraftEnhanceEventDetail>({})
  const abortRef = useRef<AbortController | null>(null)

  const load = useCallback(async (detail?: DraftEnhanceEventDetail) => {
    if (detail) contextRef.current = { ...contextRef.current, ...detail }
    const text = editorPlainText(editor)
    if (!text) {
      setError('Add some draft content first, then refresh suggestions.')
      setData(null)
      setBusy(false)
      return
    }

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setBusy(true)
    setError(null)

    try {
      const ctx = contextRef.current
      const res = await aiApi.draftEnhance({
        documentText: text,
        brief: ctx.brief,
        topic: ctx.topic,
        audience: ctx.audience,
        contentType: asContentType(ctx.contentType),
      }, ctrl.signal)
      if (ctrl.signal.aborted) return
      setData(res)
      setDismissed(new Set())
    } catch (e) {
      if (ctrl.signal.aborted) return
      setError(e instanceof APIError ? e.message : e instanceof Error ? e.message : 'Could not load suggestions')
    } finally {
      if (!ctrl.signal.aborted) setBusy(false)
      abortRef.current = null
    }
  }, [editor])

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<DraftEnhanceEventDetail>).detail ?? {}
      setOpen(true)
      void load(detail)
    }
    window.addEventListener(OPEN_DRAFT_ENHANCE_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_DRAFT_ENHANCE_EVENT, onOpen)
  }, [load])

  useEffect(() => () => { abortRef.current?.abort() }, [])

  const insertSuggestion = useCallback((item: DraftEnhanceImprovement) => {
    const markdown = item.insertMarkdown?.trim() || item.suggestion
    if (!markdown) return
    const pos = findEnhanceInsertPos(editor.state.doc, item.afterHeading)
    insertMarkdown(editor, `\n${markdown}\n`, { from: pos, to: pos })
    setDismissed((prev) => new Set(prev).add(item.id))
  }, [editor])

  const close = useCallback(() => {
    abortRef.current?.abort()
    setOpen(false)
    setBusy(false)
    setError(null)
  }, [])

  if (!open) return null

  const visibleImprovements = (data?.improvements ?? []).filter((i) => !dismissed.has(i.id))

  return (
    <div className="draft-enhance-panel sticky top-0 z-20 w-full shrink-0 border-b bg-background/95 backdrop-blur-sm shadow-sm">
      <div className="px-4 py-3 space-y-3 max-h-[min(42vh,420px)] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold leading-tight">Draft coach</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                What you asked for vs what your draft covers — tips you can insert in the right place.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              title="Refresh"
              disabled={busy}
              onClick={() => void load()}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md border hover:bg-muted disabled:opacity-40"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              title="Close"
              onClick={close}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md border hover:bg-muted"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {busy && !data && (
          <p className="ai-improve-shimmer-text text-sm font-medium">Comparing your brief to the draft…</p>
        )}

        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}

        {data && (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  What you asked
                </p>
                <p className="text-sm mt-1 leading-relaxed">{data.askedSummary}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  What the draft covers
                </p>
                <p className="text-sm mt-1 leading-relaxed">{data.draftSummary}</p>
              </div>
            </div>

            {data.explanations.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5" />
                  Explained for you
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {data.explanations.map((ex) => (
                    <div key={ex.title} className="rounded-lg border px-3 py-2.5 bg-background">
                      <p className="text-sm font-medium">{ex.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{ex.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {visibleImprovements.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Chances to improve this draft
                </p>
                <div className="space-y-2">
                  {visibleImprovements.map((item) => {
                    const meta = KIND_META[item.kind]
                    return (
                      <div
                        key={item.id}
                        className="rounded-lg border px-3 py-2.5 bg-background flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn('text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded', meta.className)}>
                              {meta.label}
                            </span>
                            <span className="text-sm font-medium">{item.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{item.reason}</p>
                          <p className="text-xs leading-relaxed border-l-2 border-primary/30 pl-2 text-foreground/90">
                            {item.suggestion}
                          </p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => insertSuggestion(item)}
                            className="h-8 px-2.5 rounded-md text-xs font-medium border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
                          >
                            Insert
                          </button>
                          <button
                            type="button"
                            onClick={() => setDismissed((prev) => new Set(prev).add(item.id))}
                            className="h-8 px-2.5 rounded-md text-xs font-medium border hover:bg-muted"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {!busy && visibleImprovements.length === 0 && data.improvements.length > 0 && (
              <p className="text-xs text-muted-foreground">All improvement tips dismissed. Refresh to load again.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
