'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import type { LucideIcon } from 'lucide-react'
import {
  Sparkles, Wand2, Languages, Mic2, FileText, RefreshCw, Undo2, FileEdit,
  Lightbulb, ChevronRight, MessageSquareText, ShieldAlert, Table2, ListChecks, ClipboardList,
  Search, BookA, SpellCheck, SpellCheck2, Zap,
  HelpCircle, HardHat, Briefcase, Wrench, Heading, Heading2, List, ListOrdered, CheckSquare,
  ChevronDown, MessageCircle, Heart, AlignCenter, AlignLeft, AlignJustify,
  BarChart3, Gauge,
} from 'lucide-react'
import type { ExplainAudience, RewriteMode, SummaryLength } from '@/lib/api/ai-types'
import { useAiStore } from '@/lib/store/use-ai-store'
import { aiApi } from '@/lib/api/ai-client'
import { TRANSLATE_LANGUAGES } from '@/lib/editor/ai/writing-tools/translate-languages'
import { helloForLanguage } from '@/lib/editor/ai/writing-tools/language-hellos'
import { ALL_TONE_OPTIONS } from '@/lib/editor/ai/writing-tools/tone-options'
import { CancelButton } from '@/shared/ui/cancel-button'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { AiInEditorActionBar } from './ai-in-editor-action-bar'
import { SelectionFormatBar } from '@/components/editor/smart/selection-format/selection-format-bar'
import { ToggleSwitch } from '../toolbar/selection-ai-toggles'
import { openDraftAnything } from '@/lib/editor/ai/draft/draft-anything-events'
import { useImproveSelection } from './use-improve-selection'
import { useInEditorRewrite } from './use-in-editor-rewrite'
import { useSuggestBlock, SUGGEST_OPTIONS, type SuggestMenuKind } from '../selection/use-suggest-block'
import { useAiTools } from '../shared/use-ai-tools'
import { useFindIssuesPanel } from '../find-issues/use-find-issues-panel'
import { useSummarizeFlow, type TextRange } from './use-summarize-flow'
import { ToolbarPopover } from '../../core/toolbar/toolbar-popover'
import { UPCOMING_FEATURE_GROUPS } from '../shared/upcoming-features'
import { useAnalyticsTools } from '../analytics/use-analytics-tools'
import {
  CHART_TYPE_OPTIONS,
  PROGRESS_MODE_OPTIONS,
} from '../analytics/analytics-features'
import type { ChartKind } from '@/lib/editor/smart/spark-chart/chart-from-table'
import type { ProgressAnalyticsMode } from '@/lib/api/ai-types'

interface AiSelectionMenuProps {
  editor: Editor
}

type SubFlyoutId = 'explain' | 'suggest' | 'translate' | 'tone' | 'analytics' | 'upcoming'

type Panel = 'main' | 'summarize' | 'brief'

const LENGTHS: { value: SummaryLength; label: string }[] = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'detailed', label: 'Detailed' },
]

const EXPLAIN_OPTIONS: {
  id: ExplainAudience
  label: string
  description: string
  icon: LucideIcon
}[] = [
  { id: 'explain', label: 'What does this mean?', description: 'Plain explanation', icon: HelpCircle },
  { id: 'crew', label: 'For site crew', description: 'Field-friendly rewrite', icon: HardHat },
  { id: 'client', label: 'For client', description: 'Clear, professional', icon: Briefcase },
  { id: 'engineer', label: 'For engineer', description: 'Precise technical', icon: Wrench },
]

const SUGGEST_ICONS: Record<string, LucideIcon> = {
  auto: Sparkles,
  heading: Heading,
  subtitle: Heading2,
  bulletList: List,
  orderedList: ListOrdered,
  taskList: CheckSquare,
}

const TONE_ICONS: Record<string, LucideIcon> = {
  Professional: Briefcase,
  Casual: MessageCircle,
  Formal: FileText,
  Friendly: MessageSquareText,
  Executive: Briefcase,
  Technical: Wrench,
  Empathetic: Heart,
  Confident: Zap,
  Neutral: AlignCenter,
  Enthusiastic: Sparkles,
  Simplify: AlignLeft,
  Concise: AlignCenter,
  Clarify: HelpCircle,
  Expand: AlignJustify,
  Bullets: List,
  Persuasive: Mic2,
  'Fix grammar': Wand2,
  'Active voice': Zap,
  'Shorter sentences': AlignLeft,
  'More formal email': FileEdit,
}

function NewBadge() {
  return (
    <span className="rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide bg-primary/15 text-primary">
      New
    </span>
  )
}

function FlyoutInfoItem({
  icon: Icon,
  label,
  description,
}: {
  icon: LucideIcon
  label: string
  description: string
}) {
  return (
    <div className="grid w-full grid-cols-[1rem_minmax(0,1fr)] items-start gap-x-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent">
      <Icon className="w-4 h-4 shrink-0 text-foreground/70 mt-0.5" aria-hidden />
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{label}</span>
          <span className="rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide bg-muted text-muted-foreground">
            Soon
          </span>
        </span>
        <span className="block text-xs text-muted-foreground leading-snug">{description}</span>
      </span>
    </div>
  )
}

function MenuRow({
  onClick, title, children, disabled, hasFlyout, badge,
}: {
  onClick?: () => void
  title: string
  children: React.ReactNode
  disabled?: boolean
  hasFlyout?: boolean
  badge?: 'new'
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault()
        onClick?.()
      }}
      title={title}
      disabled={disabled}
      className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors disabled:opacity-40 ${
        hasFlyout ? 'justify-between' : ''
      } hover:bg-accent text-foreground`}
    >
      <span className="inline-flex items-center gap-2 min-w-0">
        {children}
        {badge === 'new' ? <NewBadge /> : null}
      </span>
      {hasFlyout ? <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" /> : null}
    </button>
  )
}

function AiToggleRow({
  icon: Icon,
  label,
  title,
  checked,
  onToggle,
  toggleLabel,
  onClick,
  disabled,
}: {
  icon: LucideIcon
  label: string
  title: string
  checked: boolean
  onToggle: (v: boolean) => void
  toggleLabel: string
  onClick?: () => void
  disabled?: boolean
}) {
  const labelContent = (
    <>
      <Icon className="w-4 h-4 shrink-0 text-foreground/80" aria-hidden />
      <span className="truncate">{label}</span>
    </>
  )

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_2.25rem] items-center gap-3 pl-3 pr-2.5 py-1.5 rounded-md hover:bg-accent/60">
      {onClick ? (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault()
            onClick()
          }}
          title={title}
          disabled={disabled}
          className="flex min-w-0 items-center gap-2.5 text-left text-sm font-medium text-foreground transition-colors disabled:opacity-40"
        >
          {labelContent}
        </button>
      ) : (
        <div
          title={title}
          className="flex min-w-0 items-center gap-2.5 text-sm font-medium text-foreground"
        >
          {labelContent}
        </div>
      )}
      <div className="flex justify-end">
        <ToggleSwitch checked={checked} onChange={onToggle} label={toggleLabel} />
      </div>
    </div>
  )
}

function FlyoutMenuItem({
  icon: Icon,
  label,
  description,
  disabled,
  onClick,
  hoverNote,
}: {
  icon: LucideIcon
  label: string
  description: string
  disabled?: boolean
  onClick: () => void
  hoverNote?: string
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={hoverNote}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className="grid w-full grid-cols-[1rem_minmax(0,1fr)] items-start gap-x-2.5 rounded-lg px-3 py-2 text-left hover:bg-accent disabled:opacity-50"
    >
      <Icon className="w-4 h-4 shrink-0 text-foreground/70 mt-0.5" aria-hidden />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="block text-xs text-muted-foreground leading-snug">{description}</span>
      </span>
    </button>
  )
}

function FlyoutMenuRow({
  rowRef,
  title,
  children,
  disabled,
  active,
  onToggle,
  onHoverOpen,
}: {
  rowRef: React.RefObject<HTMLButtonElement | null>
  title: string
  children: React.ReactNode
  disabled?: boolean
  active: boolean
  onToggle: () => void
  onHoverOpen: () => void
}) {
  return (
    <button
      ref={rowRef as React.Ref<HTMLButtonElement>}
      type="button"
      onMouseDown={(e) => {
        e.preventDefault()
        if (!disabled) onToggle()
      }}
      onMouseEnter={() => {
        if (!disabled) onHoverOpen()
      }}
      title={title}
      disabled={disabled}
      aria-expanded={active}
      className={`flex w-full items-center justify-between gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors disabled:opacity-40 hover:bg-accent ${
        active ? 'bg-accent/70 text-foreground' : 'text-foreground'
      }`}
    >
      <span className="inline-flex items-center gap-2 min-w-0">{children}</span>
      <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${active ? 'rotate-90' : ''}`} />
    </button>
  )
}

function TranslateFlyoutPanel({
  disabled,
  onSelect,
  onClose,
}: {
  disabled?: boolean
  onSelect: (lang: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const languages = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return TRANSLATE_LANGUAGES
    return TRANSLATE_LANGUAGES.filter(
      (l) =>
        l.label.toLowerCase().includes(q)
        || l.value.toLowerCase().includes(q)
        || helloForLanguage(l.value).toLowerCase().includes(q),
    )
  }, [query])

  return (
    <div className="w-64 overflow-hidden">
      <div className="border-b p-1.5">
        <label className="flex items-center gap-1.5 rounded-md bg-muted/60 px-2 py-1.5">
          <Search className="w-3 h-3 text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search languagesΓÇª"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            onMouseDown={(e) => e.stopPropagation()}
          />
        </label>
      </div>
      <div className="max-h-[min(70vh,18rem)] overflow-y-auto p-1 scrollbar-hide overscroll-contain">
        {languages.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">No matches</p>
        ) : (
          languages.map((lang) => (
            <button
              key={lang.value}
              type="button"
              disabled={disabled}
              onMouseDown={(e) => {
                e.preventDefault()
                onSelect(lang.value)
                onClose()
              }}
              className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent disabled:opacity-50"
            >
              <span className="text-sm font-medium truncate">{lang.label}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {helloForLanguage(lang.value)}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

function shouldShowAiSelection({ editor: ed }: { editor: Editor }) {
  // Image AI lives on ImageMenu ΓÇö avoid overlapping bubble menus
  if (ed.isActive('image')) return false
  if (ed.isActive('chartBlock')) return false
  if (!ed.isFocused) return false
  const { empty, from, to } = ed.state.selection
  if (empty) return false
  if (ed.isActive('codeBlock')) return false
  const text = ed.state.doc.textBetween(from, to, '\n')
  return text.trim().length > 0
}

function coordsAboveRange(editor: Editor, range: TextRange, offsetPx = 48): { top: number; left: number } {
  try {
    const start = editor.view.coordsAtPos(range.from)
    const endPos = Math.max(range.from, range.to - (range.to > range.from ? 1 : 0))
    const end = editor.view.coordsAtPos(endPos)
    const topEdge = Math.min(start.top, end.top)
    return { top: topEdge - offsetPx, left: start.left }
  } catch {
    return { top: 80, left: 24 }
  }
}

export function AiSelectionMenu({ editor }: AiSelectionMenuProps) {
  const [selectionRange, setSelectionRange] = useState<TextRange | null>(null)
  const [panel, setPanel] = useState<Panel>('main')
  const [featuresOpen, setFeaturesOpen] = useState(false)
  const [openSubFlyout, setOpenSubFlyout] = useState<SubFlyoutId | null>(null)
  const explainRef = useRef<HTMLButtonElement>(null)
  const suggestRef = useRef<HTMLButtonElement>(null)
  const translateRef = useRef<HTMLButtonElement>(null)
  const toneRef = useRef<HTMLButtonElement>(null)
  const upcomingRef = useRef<HTMLButtonElement>(null)
  const analyticsRef = useRef<HTMLButtonElement>(null)
  const featuresPanelRef = useRef<HTMLDivElement>(null)
  const [actionPos, setActionPos] = useState<{ top: number; left: number } | null>(null)
  const [, setBusyLabel] = useState('WorkingΓÇª')
  const [briefText, setBriefText] = useState('')
  const [analyticsBusy, setAnalyticsBusy] = useState(false)

  const summarize = useSummarizeFlow(editor)
  const rewrite = useInEditorRewrite(editor)
  const improve = useImproveSelection(editor)
  const suggestBlock = useSuggestBlock(editor)
  const tools = useAiTools(editor)
  const analytics = useAnalyticsTools(editor)
  const issuesPanel = useFindIssuesPanel(editor)

  const findSummaryReplacement = useAiStore((s) => s.findSummaryReplacement)
  const removeSummaryReplacement = useAiStore((s) => s.removeSummaryReplacement)

  const summarizeBusy = summarize.status === 'generating' || summarize.status === 'pending' || summarize.status === 'undo'
  const rewriteBusy = rewrite.status === 'generating' || rewrite.status === 'pending' || rewrite.status === 'undo'
  const improveBusy = improve.status === 'running' || improve.status === 'pending' || improve.status === 'undo'
  const suggestBusy = suggestBlock.status === 'running' || suggestBlock.status === 'pending' || suggestBlock.status === 'undo'
  const toolsBusy = tools.status === 'running' || tools.status === 'pending' || tools.status === 'undo'
  const anyBusy = summarizeBusy || rewriteBusy || improveBusy || suggestBusy || toolsBusy || analyticsBusy

  const actionStatus: 'pending' | 'undo' | null =
    summarize.status === 'undo' || rewrite.status === 'undo' || improve.status === 'undo'
    || suggestBlock.status === 'undo' || tools.status === 'undo'
      ? 'undo'
      : summarize.status === 'pending' || rewrite.status === 'pending' || improve.status === 'pending'
        || suggestBlock.status === 'pending' || tools.status === 'pending'
        ? 'pending'
        : null

  const showActionBar = actionStatus != null

  const undoSeconds =
    improve.status === 'undo' ? improve.undoSeconds
      : rewrite.status === 'undo' ? rewrite.undoSeconds
        : summarize.status === 'undo' ? summarize.undoSeconds
          : suggestBlock.status === 'undo' ? suggestBlock.undoSeconds
            : tools.status === 'undo' ? tools.undoSeconds
              : 0

  const picking = panel === 'summarize'
  const cardOpen = panel === 'brief'

  const collapseSelection = useCallback(() => {
    const { to, empty } = editor.state.selection
    if (!empty) editor.commands.setTextSelection(to)
  }, [editor])

  const captureRange = useCallback((): TextRange | null => {
    const { from, to, empty } = editor.state.selection
    if (empty) return null
    return { from, to }
  }, [editor])

  const getSelectedText = useCallback(() => {
    const { from, to, empty } = editor.state.selection
    if (empty) return ''
    return editor.state.doc.textBetween(from, to, '\n')
  }, [editor])

  const summaryMatch = findSummaryReplacement(getSelectedText())

  const pinActionBar = useCallback((range: TextRange) => {
    setActionPos(coordsAboveRange(editor, range))
  }, [editor])

  const openPanel = useCallback((next: Panel) => {
    const range = captureRange() ?? selectionRange
    if (!range && next !== 'brief') return
    if (range) {
      setSelectionRange(range)
      setActionPos(coordsAboveRange(editor, range))
    }
    setPanel(next)
  }, [captureRange, selectionRange, editor])

  const clearUi = useCallback(() => {
    setPanel('main')
    setSelectionRange(null)
    setActionPos(null)
    setBriefText('')
  }, [])

  const dismissMenu = useCallback(() => {
    setOpenSubFlyout(null)
    setFeaturesOpen(false)
    clearUi()
    collapseSelection()
  }, [clearUi, collapseSelection])

  const cancelAll = useCallback(() => {
    summarize.cancel()
    rewrite.cancel()
    improve.cancel()
    suggestBlock.cancel()
    tools.cancel()
    issuesPanel.close()
    clearUi()
  }, [summarize, rewrite, improve, suggestBlock, tools, issuesPanel, clearUi])

  const confirmActive = useCallback(() => {
    if (summarize.status === 'pending') summarize.confirm()
    else if (improve.status === 'pending') improve.confirm()
    else if (suggestBlock.status === 'pending') suggestBlock.confirm()
    else if (tools.status === 'pending') tools.confirm()
    else if (rewrite.status === 'pending') rewrite.confirm()
    // Stay open for undo window ΓÇö don't clearUi
  }, [summarize, improve, suggestBlock, tools, rewrite])

  const undoActive = useCallback(() => {
    if (summarize.status === 'undo') summarize.undo()
    else if (improve.status === 'undo') improve.undo()
    else if (suggestBlock.status === 'undo') suggestBlock.undo()
    else if (tools.status === 'undo') tools.undo()
    else if (rewrite.status === 'undo') rewrite.undo()
    clearUi()
  }, [summarize, improve, suggestBlock, tools, rewrite, clearUi])

  const runSuggest = useCallback((kind: SuggestMenuKind) => {
    setPanel('main')
    setBusyLabel(kind === 'auto' ? 'StructuringΓÇª' : 'SuggestingΓÇª')
    void suggestBlock.run(kind)
  }, [suggestBlock])

  const runExplain = useCallback((audience: ExplainAudience) => {
    const range = captureRange()
    if (!range) return
    const text = editor.state.doc.textBetween(range.from, range.to, '\n')
    if (!text.trim()) return
    setPanel('main')
    const label = audience === 'explain' ? 'ExplainingΓÇª' : 'RewritingΓÇª'
    setBusyLabel(label)
    void rewrite.run(text, range, (signal) => aiApi.explain({ selection: text, audience }, signal), label)
  }, [captureRange, editor, rewrite])

  const runFindIssues = useCallback(() => {
    void issuesPanel.run()
  }, [issuesPanel])

  const runActionItems = useCallback(() => {
    setBusyLabel('Extracting actionsΓÇª')
    void tools.actionItems()
  }, [tools])

  const runTextToTable = useCallback(() => {
    const range = captureRange()
    if (range) pinActionBar(range)
    setBusyLabel('Building tableΓÇª')
    void tools.textToTable()
  }, [tools, captureRange, pinActionBar])

  const runBriefGaps = useCallback(() => {
    if (!briefText.trim()) return
    setPanel('main')
    setBusyLabel('Checking briefΓÇª')
    void tools.briefGaps(briefText)
  }, [tools, briefText])

  const runGlossary = useCallback(() => {
    setBusyLabel('Checking termsΓÇª')
    void tools.glossary()
  }, [tools])

  const generateSummary = useCallback((length: SummaryLength) => {
    const range = selectionRange ?? captureRange()
    if (!range) return
    const text = editor.state.doc.textBetween(range.from, range.to, '\n')
    if (!text.trim()) return
    setPanel('main')
    setBusyLabel('SummarizingΓÇª')
    pinActionBar(range)
    void summarize.run(text, range, length)
  }, [selectionRange, captureRange, editor, summarize, pinActionBar])

  const runTranslate = useCallback((lang: string) => {
    const range = selectionRange ?? captureRange()
    if (!range) return
    const text = editor.state.doc.textBetween(range.from, range.to, '\n')
    if (!text.trim()) return
    setPanel('main')
    setBusyLabel('TranslatingΓÇª')
    void rewrite.run(text, range, (signal) => aiApi.translate({ text, targetLang: lang }, signal), 'TranslatingΓÇª')
  }, [selectionRange, captureRange, editor, rewrite])

  const runTone = useCallback((prompt: string) => {
    const range = selectionRange ?? captureRange()
    if (!range) return
    const text = editor.state.doc.textBetween(range.from, range.to, '\n')
    if (!text.trim()) return
    setPanel('main')
    setBusyLabel('RewritingΓÇª')
    void rewrite.run(text, range, (signal) => aiApi.customTone({ selection: text, tone: prompt }, signal), 'RewritingΓÇª')
  }, [selectionRange, captureRange, editor, rewrite])

  const runImprove = useCallback(() => {
    const range = captureRange()
    if (!range) return
    setSelectionRange(range)
    setBusyLabel('ImprovingΓÇª')
    pinActionBar(range)
    void improve.run(range)
  }, [captureRange, improve, pinActionBar])

  const spellingEnabled = useAiStore((s) => s.spellingEnabled)
  const grammarEnabled = useAiStore((s) => s.grammarEnabled)
  const autocompleteEnabled = useAiStore((s) => s.autocompleteEnabled)
  const setSpellingEnabled = useAiStore((s) => s.setSpellingEnabled)
  const setGrammarEnabled = useAiStore((s) => s.setGrammarEnabled)
  const setAutocompleteEnabled = useAiStore((s) => s.setAutocompleteEnabled)

  const runBasics = useCallback(async (mode: 'spelling' | 'grammar') => {
    if (mode === 'spelling' && !useAiStore.getState().spellingEnabled) return
    if (mode === 'grammar' && !useAiStore.getState().grammarEnabled) return
    const range = captureRange()
    if (!range) return
    const text = editor.state.doc.textBetween(range.from, range.to, '\n')
    if (!text.trim()) return

    // In-place fix only ΓÇö no full-block regeneration / Confirm bar
    const ctrl = new AbortController()
    try {
      let accumulated = ''
      for await (const raw of aiApi.rewrite(
        { selection: text, mode: mode as RewriteMode },
        ctrl.signal,
      )) {
        const evt = JSON.parse(raw) as { type: string; delta?: string }
        if (evt.type === 'token' && evt.delta) accumulated += evt.delta
      }
      const fixed = accumulated.trim()
      if (!fixed || fixed === text.trim()) return
      const still = editor.state.doc.textBetween(range.from, range.to, '\n')
      if (still !== text) return
      editor.chain().focus().insertContentAt({ from: range.from, to: range.to }, fixed).run()
    } catch {
      // ignore abort / network
    }
  }, [captureRange, editor])

  const redoSummary = useCallback(() => {
    const range = captureRange()
    const match = findSummaryReplacement(getSelectedText())
    if (!range || !match) return
    setSelectionRange(range)
    setPanel('main')
    setBusyLabel('SummarizingΓÇª')
    pinActionBar(range)
    void summarize.run(match.originalText, range, match.length)
  }, [captureRange, findSummaryReplacement, getSelectedText, summarize, pinActionBar])

  const revertSummary = useCallback(() => {
    const range = captureRange()
    const match = findSummaryReplacement(getSelectedText())
    if (!range || !match) return
    editor.chain().focus().insertContentAt(
      { from: range.from, to: range.to },
      match.originalText,
    ).run()
    removeSummaryReplacement(match.summaryText)
    collapseSelection()
  }, [captureRange, collapseSelection, editor, findSummaryReplacement, getSelectedText, removeSummaryReplacement])

  const shouldShow = useCallback(({ editor: ed }: { editor: Editor }) => {
    if (anyBusy) return false
    if (issuesPanel.open || issuesPanel.suppressMenu()) return false
    if (cardOpen || picking) return selectionRange != null || shouldShowAiSelection({ editor: ed })
    return shouldShowAiSelection({ editor: ed })
  }, [anyBusy, cardOpen, picking, selectionRange, issuesPanel])

  const bubbleOptions = useMemo(() => {
    const el =
      typeof document !== 'undefined'
        ? document.querySelector('[data-editor-scroll]')
        : null
    const scrollTarget: HTMLElement | Window =
      el instanceof HTMLElement ? el : window

    return {
      strategy: 'fixed' as const,
      placement: 'top-start' as const,
      offset: 8,
      flip: true,
      shift: { padding: 8 },
      scrollTarget,
    }
  }, [])

  const appendToBody = useCallback(() => document.body, [])

  useEffect(() => {
    if (!picking && !cardOpen && !anyBusy) {
      setSelectionRange(null)
      setActionPos(null)
    }
  }, [picking, cardOpen, anyBusy])

  useEffect(() => {
    const collapseFlyouts = () => {
      setFeaturesOpen(false)
      setOpenSubFlyout(null)
    }
    const onBlur = () => collapseFlyouts()
    const onSelectionUpdate = () => {
      if (!shouldShowAiSelection({ editor })) collapseFlyouts()
    }
    editor.on('blur', onBlur)
    editor.on('selectionUpdate', onSelectionUpdate)
    return () => {
      editor.off('blur', onBlur)
      editor.off('selectionUpdate', onSelectionUpdate)
    }
  }, [editor])

  useEffect(() => {
    if (!anyBusy && !picking && !cardOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelAll()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [anyBusy, picking, cardOpen, cancelAll])

  useEffect(() => {
    if (!showActionBar) return
    const range =
      tools.range
      ?? suggestBlock.range
      ?? improve.range
      ?? summarize.range
      ?? rewrite.range
      ?? selectionRange
    if (range) {
      setActionPos(coordsAboveRange(editor, range))
      return
    }
    // Glossary undo has no range ΓÇö pin bar near bottom-left of the viewport
    if (tools.status === 'undo') {
      setActionPos({ top: Math.max(80, window.innerHeight - 96), left: 24 })
    }
  }, [
    showActionBar,
    actionStatus,
    undoSeconds,
    improve.range,
    suggestBlock.range,
    tools.range,
    tools.status,
    summarize.range,
    rewrite.range,
    editor,
    selectionRange,
  ])

  const toolsDisabled = anyBusy

  const closeSubFlyout = useCallback(() => setOpenSubFlyout(null), [])
  const toggleSubFlyout = useCallback((id: SubFlyoutId) => {
    setOpenSubFlyout((cur) => (cur === id ? null : id))
  }, [])

  const runChart = useCallback((kind: ChartKind) => {
    closeSubFlyout()
    const ok = analytics.insertChart(kind)
    if (ok) dismissMenu()
  }, [analytics, dismissMenu, closeSubFlyout])

  const runKpis = useCallback(async () => {
    setAnalyticsBusy(true)
    setBusyLabel('Extracting KPIsΓÇª')
    closeSubFlyout()
    try {
      const ok = await analytics.insertKpis()
      if (ok) dismissMenu()
    } finally {
      setAnalyticsBusy(false)
    }
  }, [analytics, dismissMenu, closeSubFlyout])

  const runProgress = useCallback(async (mode: ProgressAnalyticsMode) => {
    setAnalyticsBusy(true)
    setBusyLabel('Building chartΓÇª')
    closeSubFlyout()
    try {
      const ok = await analytics.insertProgress(mode)
      if (ok) dismissMenu()
    } finally {
      setAnalyticsBusy(false)
    }
  }, [analytics, dismissMenu, closeSubFlyout])

  const openSubFlyoutHover = useCallback((id: SubFlyoutId) => {
    setOpenSubFlyout(id)
  }, [])

  const subFlyoutHoverHandlers = useMemo(
    () => ({
      onHoverOpen: (id: SubFlyoutId) => () => openSubFlyoutHover(id),
    }),
    [openSubFlyoutHover],
  )

  const subFlyoutClass = 'p-1.5 shadow-xl rounded-xl max-h-[min(70vh,18rem)] overflow-y-auto scrollbar-hide overscroll-contain'

  return (
    <>
      <BubbleMenu
        editor={editor}
        pluginKey="aiSelectionMenu"
        shouldShow={shouldShow}
        appendTo={appendToBody}
        updateDelay={0}
        options={bubbleOptions}
        className={`pointer-events-auto z-[10050] ${
          cardOpen || picking
            ? 'p-0 bg-transparent border-0 shadow-none'
            : ''
        }`}
      >
        {panel === 'summarize' ? (
          <div className="flex flex-col w-40 rounded-xl border border-border bg-popover shadow-xl p-1">
            <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Summarize length
            </p>
            {LENGTHS.map((l) => (
              <MenuRow key={l.value} onClick={() => generateSummary(l.value)} title={`Summarize ΓÇö ${l.label}`}>
                <FileText className="w-4 h-4 text-primary" />
                {l.label}
              </MenuRow>
            ))}
            <MenuRow onClick={cancelAll} title="Cancel">
              Cancel
            </MenuRow>
          </div>
        ) : panel === 'brief' ? (
          <div
            className="w-[280px] rounded-xl border border-border bg-popover text-popover-foreground shadow-xl overflow-hidden"
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2 border-b bg-muted/30">
              <p className="text-sm font-semibold inline-flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-primary" />
                Against brief
              </p>
              <CancelButton onClick={() => setPanel('main')} className="h-7 px-2" />
            </div>
            <div className="p-3 space-y-2">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Paste requirements the draft must cover (PPE, lift plan, weatherΓÇª).
              </p>
              <textarea
                value={briefText}
                onChange={(e) => setBriefText(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                rows={4}
                placeholder="Must includeΓÇª"
                className="w-full rounded-lg border bg-background px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 resize-none"
              />
              <div className="flex justify-end gap-1.5">
                <CancelButton onClick={() => setPanel('main')} />
                <ConfirmButton
                  onClick={runBriefGaps}
                  disabled={!briefText.trim() || toolsBusy}
                  title="Check gaps"
                >
                  Check gaps
                </ConfirmButton>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex w-72 min-w-[17.5rem] flex-col gap-1.5" onMouseDown={(e) => e.preventDefault()}>
            <div className="w-max max-w-[95vw] rounded-xl border border-border bg-popover shadow-xl overflow-hidden">
              <SelectionFormatBar editor={editor} />
            </div>
            <div ref={featuresPanelRef} className="flex flex-col rounded-xl border border-border bg-popover p-1.5 shadow-xl overflow-hidden">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                setFeaturesOpen((o) => !o)
              }}
              aria-expanded={featuresOpen}
              className="flex w-full items-center gap-2 px-3 py-2.5 border-b border-border/50 text-left hover:bg-accent/40 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-semibold ai-improve-shimmer-text">Spark AI</span>
              <ChevronDown
                className={`ml-auto w-4 h-4 text-muted-foreground shrink-0 transition-transform ${
                  featuresOpen ? 'rotate-180' : ''
                }`}
                aria-hidden
              />
            </button>

            {featuresOpen ? (
            <div className="ai-features-menu-scroll relative py-0.5">
            {summaryMatch ? (
              <>
                <MenuRow onClick={redoSummary} title="Regenerate summary">
                  <RefreshCw className="w-4 h-4" />
                  Redo summary
                </MenuRow>
                <MenuRow onClick={revertSummary} title="Restore original">
                  <Undo2 className="w-4 h-4" />
                  Revert
                </MenuRow>
                <div className="my-1 h-px bg-border" />
              </>
            ) : null}

            <AiToggleRow
              icon={Zap}
              label="Autocomplete"
              title="Autocomplete ΓÇö ghost text while typing (Tab to accept)"
              checked={autocompleteEnabled}
              onToggle={setAutocompleteEnabled}
              toggleLabel="Autocomplete"
            />

            <AiToggleRow
              icon={SpellCheck}
              label="Spelling"
              title={
                spellingEnabled
                  ? 'Fix spelling in selection (in place). Auto-correct also runs as you type when on.'
                  : 'Turn spelling on, then click to fix selection'
              }
              disabled={rewriteBusy || !spellingEnabled}
              checked={spellingEnabled}
              onToggle={setSpellingEnabled}
              toggleLabel="Spelling"
              onClick={() => { void runBasics('spelling') }}
            />

            <AiToggleRow
              icon={SpellCheck2}
              label="Grammar"
              title={
                grammarEnabled
                  ? 'Fix grammar in selection (in place, no regenerate bar)'
                  : 'Turn grammar on, then click to fix selection'
              }
              disabled={rewriteBusy || !grammarEnabled}
              checked={grammarEnabled}
              onToggle={setGrammarEnabled}
              toggleLabel="Grammar"
              onClick={() => { void runBasics('grammar') }}
            />

            <div className="my-1 h-px bg-border" />

            <MenuRow onClick={runImprove} title="Improve selection" disabled={improveBusy}>
              <Wand2 className="w-4 h-4" />
              Improve
            </MenuRow>

            <MenuRow
              onClick={runFindIssues}
              title="Find issues in selection"
              disabled={toolsDisabled || issuesPanel.open}
            >
              <ShieldAlert className="w-4 h-4" />
              Find issues
            </MenuRow>

            <MenuRow onClick={runTextToTable} title="Convert selection to table" disabled={toolsDisabled}>
              <Table2 className="w-4 h-4" />
              To table
            </MenuRow>

            <MenuRow onClick={runActionItems} title="Extract action items" disabled={toolsDisabled}>
              <ListChecks className="w-4 h-4" />
              Action items
            </MenuRow>

            <MenuRow onClick={() => openPanel('brief')} title="Compare against a brief" disabled={toolsDisabled}>
              <ClipboardList className="w-4 h-4" />
              Against brief
            </MenuRow>

            <MenuRow onClick={runGlossary} title="Enforce preferred terms across the document" disabled={toolsDisabled}>
              <BookA className="w-4 h-4" />
              Glossary
            </MenuRow>

            <FlyoutMenuRow
              rowRef={explainRef}
              title="Explain or simplify"
              disabled={rewriteBusy}
              active={openSubFlyout === 'explain'}
              onToggle={() => toggleSubFlyout('explain')}
              onHoverOpen={subFlyoutHoverHandlers.onHoverOpen('explain')}
            >
              <MessageSquareText className="w-4 h-4" />
              Explain
            </FlyoutMenuRow>

            <FlyoutMenuRow
              rowRef={suggestRef}
              title="Suggest structure"
              disabled={suggestBusy}
              active={openSubFlyout === 'suggest'}
              onToggle={() => toggleSubFlyout('suggest')}
              onHoverOpen={subFlyoutHoverHandlers.onHoverOpen('suggest')}
            >
              <Lightbulb className="w-4 h-4" />
              Suggest
            </FlyoutMenuRow>

            <FlyoutMenuRow
              rowRef={translateRef}
              title="Translate"
              disabled={rewriteBusy}
              active={openSubFlyout === 'translate'}
              onToggle={() => toggleSubFlyout('translate')}
              onHoverOpen={subFlyoutHoverHandlers.onHoverOpen('translate')}
            >
              <Languages className="w-4 h-4" />
              Translate
            </FlyoutMenuRow>

            <FlyoutMenuRow
              rowRef={toneRef}
              title="Tone & prompts"
              disabled={rewriteBusy}
              active={openSubFlyout === 'tone'}
              onToggle={() => toggleSubFlyout('tone')}
              onHoverOpen={subFlyoutHoverHandlers.onHoverOpen('tone')}
            >
              <Mic2 className="w-4 h-4" />
              Tone
            </FlyoutMenuRow>

            <FlyoutMenuRow
              rowRef={analyticsRef}
              title="Charts, KPIs, and progress analytics"
              disabled={analyticsBusy}
              active={openSubFlyout === 'analytics'}
              onToggle={() => toggleSubFlyout('analytics')}
              onHoverOpen={subFlyoutHoverHandlers.onHoverOpen('analytics')}
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
              <NewBadge />
            </FlyoutMenuRow>

            <FlyoutMenuRow
              rowRef={upcomingRef}
              title="Upcoming AI features"
              active={openSubFlyout === 'upcoming'}
              onToggle={() => toggleSubFlyout('upcoming')}
              onHoverOpen={subFlyoutHoverHandlers.onHoverOpen('upcoming')}
            >
              <Sparkles className="w-4 h-4" />
              Upcoming
            </FlyoutMenuRow>

            <MenuRow onClick={() => openPanel('summarize')} title="Summarize">
              <FileText className="w-4 h-4" />
              Summarize
            </MenuRow>

            <MenuRow onClick={() => { openDraftAnything(); dismissMenu() }} title="Draft Anything" badge="new">
              <FileEdit className="w-4 h-4" />
              Draft
            </MenuRow>
            </div>
            ) : null}

            <ToolbarPopover
              open={openSubFlyout === 'explain'}
              anchorRef={explainRef}
              placement="right"
              gap={8}
              onClose={closeSubFlyout}
              className={`w-56 ${subFlyoutClass}`}
            >
              {EXPLAIN_OPTIONS.map((opt) => (
                <FlyoutMenuItem
                  key={opt.id}
                  icon={opt.icon}
                  label={opt.label}
                  description={opt.description}
                  disabled={rewriteBusy}
                  onClick={() => {
                    runExplain(opt.id)
                    closeSubFlyout()
                  }}
                />
              ))}
            </ToolbarPopover>

            <ToolbarPopover
              open={openSubFlyout === 'suggest'}
              anchorRef={suggestRef}
              placement="right"
              gap={8}
              onClose={closeSubFlyout}
              className={`w-60 ${subFlyoutClass}`}
            >
              {SUGGEST_OPTIONS.map((opt) => {
                const Icon = SUGGEST_ICONS[opt.kind] ?? Lightbulb
                return (
                  <FlyoutMenuItem
                    key={opt.kind}
                    icon={Icon}
                    label={opt.label}
                    description={opt.description}
                    disabled={suggestBusy}
                    onClick={() => {
                      runSuggest(opt.kind)
                      closeSubFlyout()
                    }}
                    hoverNote={
                      opt.kind === 'auto'
                        ? 'Note: runs on the full document, not only the selected text.'
                        : undefined
                    }
                  />
                )
              })}
            </ToolbarPopover>

            <ToolbarPopover
              open={openSubFlyout === 'translate'}
              anchorRef={translateRef}
              placement="right"
              gap={8}
              onClose={closeSubFlyout}
              className={subFlyoutClass}
            >
              <TranslateFlyoutPanel
                disabled={rewriteBusy}
                onSelect={runTranslate}
                onClose={closeSubFlyout}
              />
            </ToolbarPopover>

            <ToolbarPopover
              open={openSubFlyout === 'tone'}
              anchorRef={toneRef}
              placement="right"
              gap={8}
              onClose={closeSubFlyout}
              className={`w-80 ${subFlyoutClass}`}
            >
              {ALL_TONE_OPTIONS.map((t) => (
                <FlyoutMenuItem
                  key={t.label}
                  icon={TONE_ICONS[t.label] ?? Mic2}
                  label={t.label}
                  description={t.prompt}
                  disabled={rewriteBusy}
                  onClick={() => {
                    runTone(t.prompt)
                    closeSubFlyout()
                  }}
                />
              ))}
            </ToolbarPopover>

            <ToolbarPopover
              open={openSubFlyout === 'analytics'}
              anchorRef={analyticsRef}
              placement="right"
              gap={8}
              onClose={closeSubFlyout}
              matchHeightRef={featuresPanelRef}
              className="w-[26rem] max-w-[min(92vw,26rem)] p-1 flex flex-col overflow-hidden shadow-xl rounded-xl"
            >
              <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide overscroll-contain">
                <p className="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Charts from table
                </p>
                {CHART_TYPE_OPTIONS.map((opt) => (
                  <FlyoutMenuItem
                    key={opt.kind}
                    icon={opt.icon}
                    label={opt.label}
                    description={`Insert a ${opt.label.toLowerCase()} chart below the table`}
                    disabled={analyticsBusy || !analytics.hasTableContext()}
                    onClick={() => runChart(opt.kind)}
                  />
                ))}
                <div className="my-1 h-px bg-border mx-2" />
                <FlyoutMenuItem
                  icon={Gauge}
                  label="KPI widgets"
                  description="SPI, CPI, open RFIs, delays, and more"
                  disabled={analyticsBusy}
                  onClick={() => { void runKpis() }}
                />
                <p className="px-3 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Progress analytics
                </p>
                {PROGRESS_MODE_OPTIONS.map((opt) => (
                  <FlyoutMenuItem
                    key={opt.mode}
                    icon={opt.icon}
                    label={opt.label}
                    description={opt.description}
                    disabled={analyticsBusy}
                    onClick={() => { void runProgress(opt.mode) }}
                  />
                ))}
              </div>
            </ToolbarPopover>

            <ToolbarPopover
              open={openSubFlyout === 'upcoming'}
              anchorRef={upcomingRef}
              placement="right"
              gap={8}
              onClose={closeSubFlyout}
              matchHeightRef={featuresPanelRef}
              className="w-[28rem] max-w-[min(92vw,28rem)] p-1 flex flex-col overflow-hidden shadow-xl rounded-xl"
            >
              <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide overscroll-contain">
              {UPCOMING_FEATURE_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </p>
                  {group.features.map((feature) => (
                    <FlyoutInfoItem
                      key={feature.label}
                      icon={feature.icon}
                      label={feature.label}
                      description={feature.help.what}
                    />
                  ))}
                </div>
              ))}
              </div>
            </ToolbarPopover>
            </div>
          </div>
        )}
      </BubbleMenu>

      <AiInEditorActionBar
        open={showActionBar}
        status={actionStatus ?? 'pending'}
        position={actionPos}
        undoSeconds={undoSeconds}
        onConfirm={confirmActive}
        onCancel={cancelAll}
        onUndo={undoActive}
      />
    </>
  )
}
