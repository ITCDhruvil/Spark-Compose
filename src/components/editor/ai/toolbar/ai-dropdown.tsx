'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'
import type { LucideIcon } from 'lucide-react'
import {
  Sparkles, ChevronDown, ChevronRight, Zap, Wand2, MessageSquareText,
  Lightbulb, ShieldAlert, Table2, ListChecks, ClipboardList, BookA,
  Languages, Mic2, FileText, FileEdit, MessageCircle, HelpCircle,
  HardHat, Briefcase, Wrench, Heading, Heading2, List, ListOrdered,
  CheckSquare, AlignLeft, AlignCenter, AlignJustify, Globe, Heart, Info,
  SpellCheck, SpellCheck2,
  BarChart3,
} from 'lucide-react'
import { ToolbarPopover } from '../../core/toolbar/toolbar-popover'
import { useAiStore } from '@/lib/store/use-ai-store'
import { ALL_TONE_OPTIONS } from '@/lib/editor/ai/writing-tools/tone-options'
import { TRANSLATE_LANGUAGES } from '@/lib/editor/ai/writing-tools/translate-languages'
import { SUGGEST_OPTIONS } from '../selection/use-suggest-block'
import { UPCOMING_FEATURE_GROUPS, type FeatureHelp } from '../shared/upcoming-features'
import {
  ANALYTICS_FEATURES,
  CHART_TYPE_OPTIONS,
  PROGRESS_MODE_OPTIONS,
} from '../analytics/analytics-features'

type SectionId = 'explain' | 'suggestions' | 'translate' | 'tone' | 'summarize' | 'analytics' | 'upcoming'

const EXPLAIN_OPTIONS: { label: string; icon: LucideIcon; help: FeatureHelp }[] = [
  {
    label: 'What does this mean?',
    icon: HelpCircle,
    help: {
      what: 'Plain-language explanation of the selected text.',
      how: 'Select text in the editor, open the selection AI menu, then choose Explain → What does this mean?',
    },
  },
  {
    label: 'For site crew',
    icon: HardHat,
    help: {
      what: 'Rewrites the selection in field-friendly language for site crews.',
      how: 'Select text, open the selection AI menu, then choose Explain → For site crew.',
    },
  },
  {
    label: 'For client',
    icon: Briefcase,
    help: {
      what: 'Rewrites the selection clearly and professionally for a client audience.',
      how: 'Select text, open the selection AI menu, then choose Explain → For client.',
    },
  },
  {
    label: 'For engineer',
    icon: Wrench,
    help: {
      what: 'Rewrites the selection with precise technical language for engineers.',
      how: 'Select text, open the selection AI menu, then choose Explain → For engineer.',
    },
  },
]

const SUGGEST_HELP: Record<string, FeatureHelp> = {
  auto: {
    what: 'Structures the full document with headings, lists, and related layout.',
    how: 'Open the selection AI menu and choose Suggest → Auto. Runs on the whole document.',
  },
  heading: {
    what: 'Suggests a title and inserts it above the selected paragraph.',
    how: 'Select a paragraph, open the selection AI menu, then choose Suggest → Heading.',
  },
  subtitle: {
    what: 'Suggests a secondary title above the selected paragraph.',
    how: 'Select a paragraph, open the selection AI menu, then choose Suggest → Subtitle.',
  },
  bulletList: {
    what: 'Turns the selection into bullet points below the paragraph.',
    how: 'Select text, open the selection AI menu, then choose Suggest → Bullet points.',
  },
  orderedList: {
    what: 'Turns the selection into a numbered list below the paragraph.',
    how: 'Select text, open the selection AI menu, then choose Suggest → Number list.',
  },
  taskList: {
    what: 'Turns the selection into a checklist below the paragraph.',
    how: 'Select text, open the selection AI menu, then choose Suggest → Check box.',
  },
}

const SUGGEST_ICONS: Record<string, LucideIcon> = {
  auto: Sparkles,
  heading: Heading,
  subtitle: Heading2,
  bulletList: List,
  orderedList: ListOrdered,
  taskList: CheckSquare,
}

const SUMMARIZE_OPTIONS: { label: string; icon: LucideIcon; help: FeatureHelp }[] = [
  {
    label: 'Short',
    icon: AlignLeft,
    help: {
      what: 'A brief summary of the selection.',
      how: 'Select text, open the selection AI menu, then choose Summarize → Short.',
    },
  },
  {
    label: 'Medium',
    icon: AlignCenter,
    help: {
      what: 'A balanced summary with the key points.',
      how: 'Select text, open the selection AI menu, then choose Summarize → Medium.',
    },
  },
  {
    label: 'Detailed',
    icon: AlignJustify,
    help: {
      what: 'A longer summary that keeps more detail.',
      how: 'Select text, open the selection AI menu, then choose Summarize → Detailed.',
    },
  },
]

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

function InfoTip({ what, how }: FeatureHelp) {
  const ref = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const label = `What: ${what} How to use: ${how}`

  const show = () => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    setPos({ top: r.top + r.height / 2, left: r.right + 8 })
  }

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={label}
        onMouseEnter={show}
        onMouseLeave={() => setPos(null)}
        onFocus={show}
        onBlur={() => setPos(null)}
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-foreground/45 hover:bg-muted hover:text-foreground transition-colors"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {pos
        ? createPortal(
            <div
              role="tooltip"
              className="pointer-events-none fixed z-[10050] w-[240px] rounded-md border border-border bg-popover px-2.5 py-2 text-[11px] leading-snug text-popover-foreground shadow-lg"
              style={{ top: pos.top, left: pos.left, transform: 'translateY(-50%)' }}
            >
              <p className="font-semibold text-foreground">What</p>
              <p className="mt-0.5 text-muted-foreground">{what}</p>
              <p className="mt-2 font-semibold text-foreground">How to use</p>
              <p className="mt-0.5 text-muted-foreground">{how}</p>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

function FeatureRow({
  icon: Icon,
  label,
  help,
  nested,
  badge,
}: {
  icon: LucideIcon
  label: string
  help: FeatureHelp
  nested?: boolean
  badge?: 'Soon' | 'New'
}) {
  return (
    <div
      className={`flex items-center gap-2.5 py-1.5 text-sm text-foreground ${
        nested ? 'pl-9 pr-1.5' : 'pl-3 pr-1.5'
      }`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0 text-foreground/70" aria-hidden />
      <span className="min-w-0 flex-1 font-medium">{label}</span>
      {badge ? (
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
            badge === 'New'
              ? 'bg-primary/15 text-primary'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {badge}
        </span>
      ) : null}
      <InfoTip {...help} />
    </div>
  )
}

function CollapsibleSection({
  id,
  icon: Icon,
  label,
  open,
  onToggle,
  children,
}: {
  id: SectionId
  icon: LucideIcon
  label: string
  open: boolean
  onToggle: (id: SectionId) => void
  children: React.ReactNode
}) {
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onMouseDown={(e) => {
          e.preventDefault()
          onToggle(id)
        }}
        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-foreground hover:bg-muted/40 transition-colors"
      >
        <Icon className="w-3.5 h-3.5 shrink-0 text-foreground/70" aria-hidden />
        <span className="min-w-0 flex-1 font-medium">{label}</span>
        <ChevronRight
          className={`w-3.5 h-3.5 shrink-0 text-foreground/50 transition-transform ${open ? 'rotate-90' : ''}`}
          aria-hidden
        />
      </button>
      {open ? <div className="pb-0.5">{children}</div> : null}
    </div>
  )
}

function ToggleRow({
  icon: Icon,
  label,
  help,
  checked,
  onChange,
}: {
  icon: LucideIcon
  label: string
  help: FeatureHelp
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-b">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="w-3.5 h-3.5 shrink-0 text-foreground" />
        <span className="text-sm font-medium text-foreground">{label}</span>
        <InfoTip {...help} />
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-muted-foreground/25'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : ''
          }`}
        />
      </button>
    </div>
  )
}

export function AiDropdown({
  editor,
  onBeforeOpen,
  registerExternalClose,
}: {
  editor: Editor
  onBeforeOpen?: () => void
  registerExternalClose?: (close: () => void) => void
}) {
  void editor
  const [open, setOpen] = useState(false)
  const [openSections, setOpenSections] = useState<Partial<Record<SectionId, boolean>>>({})
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    registerExternalClose?.(() => setOpen(false))
  }, [registerExternalClose])

  const toggleOpen = useCallback(() => {
    setOpen((o) => {
      const next = !o
      if (next) onBeforeOpen?.()
      return next
    })
  }, [onBeforeOpen])

  const autocompleteEnabled = useAiStore((s) => s.autocompleteEnabled)
  const setAutocompleteEnabled = useAiStore((s) => s.setAutocompleteEnabled)
  const autocompleteScope = useAiStore((s) => s.autocompleteScope)
  const setAutocompleteScope = useAiStore((s) => s.setAutocompleteScope)
  const spellingEnabled = useAiStore((s) => s.spellingEnabled)
  const setSpellingEnabled = useAiStore((s) => s.setSpellingEnabled)
  const grammarEnabled = useAiStore((s) => s.grammarEnabled)
  const setGrammarEnabled = useAiStore((s) => s.setGrammarEnabled)

  const scopeOptions = [
    { id: 'sentence' as const, label: 'Sentence' },
    { id: 'paragraph' as const, label: 'Para' },
  ]

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        toggleOpen()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggleOpen])

  const close = () => setOpen(false)

  const toggleSection = (id: SectionId) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        title="Spark AI features"
        onMouseDown={(e) => { e.preventDefault(); toggleOpen() }}
        className="h-8 flex items-center gap-0.5 pl-1.5 pr-1 rounded-[3px] text-sm hover:bg-[#e8e8e8] dark:hover:bg-white/10 shrink-0 border border-[#d1d1d1] dark:border-border bg-white dark:bg-background overflow-visible"
      >
        <span className="spark-ai-ribbon-icon-slot shrink-0" aria-hidden>
          <Sparkles className="spark-ai-ribbon-icon w-3.5 h-3.5" />
        </span>
        <span className="spark-ai-ribbon-label text-sm font-semibold">Spark AI</span>
        <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
      </button>

      <ToolbarPopover open={open} anchorRef={triggerRef} onClose={close} className="w-72 p-0 overflow-hidden">
        <ToggleRow
          icon={Zap}
          label="Autocomplete"
          checked={autocompleteEnabled}
          onChange={setAutocompleteEnabled}
          help={{
            what: 'Shows ghost-text suggestions as you type.',
            how: 'Turn on, pick Word / Sentence / Para, pause while typing, then Tab or → to accept.',
          }}
        />
        {autocompleteEnabled ? (
          <div className="grid grid-cols-2 gap-1.5 px-3 py-2 border-b bg-muted/20">
            {scopeOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  setAutocompleteScope(opt.id)
                }}
                className={`w-full rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  autocompleteScope === opt.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background border text-foreground hover:bg-muted'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : null}
        <ToggleRow
          icon={SpellCheck}
          label="Spelling"
          checked={spellingEnabled}
          onChange={setSpellingEnabled}
          help={{
            what: 'Instant local auto-correct (no AI tokens). Uses a common typo list plus construction terms.',
            how: 'Turn on, then type. After space or punctuation, known typos are fixed automatically.',
          }}
        />
        <ToggleRow
          icon={SpellCheck2}
          label="Grammar"
          checked={grammarEnabled}
          onChange={setGrammarEnabled}
          help={{
            what: 'Underlines grammar and punctuation issues. Hover for a suggestion, click Replace.',
            how: 'Turn on and keep typing. Amber = grammar, blue = punctuation. Spelling is auto-fixed separately.',
          }}
        />

        <div className="max-h-[min(70vh,20rem)] overflow-y-auto scrollbar-hide overscroll-contain py-1.5 select-none">
          <p className="px-3 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-foreground/50">
            Features
          </p>

          <FeatureRow
            icon={Wand2}
            label="Improve"
            help={{
              what: 'Polishes grammar, clarity, and flow of the selected text.',
              how: 'Select text in the editor, open the selection AI menu, then choose Improve.',
            }}
          />

          <FeatureRow
            icon={ShieldAlert}
            label="Find issues"
            help={{
              what: 'Scans the selection for clarity, accuracy, and writing issues.',
              how: 'Select text, open the selection AI menu, then choose Find issues.',
            }}
          />
          <FeatureRow
            icon={Table2}
            label="To table"
            help={{
              what: 'Converts the selected text into a structured table.',
              how: 'Select text, open the selection AI menu, then choose To table.',
            }}
          />
          <FeatureRow
            icon={ListChecks}
            label="Action items"
            help={{
              what: 'Extracts action items and checklist tasks from the selection.',
              how: 'Select text, open the selection AI menu, then choose Action items.',
            }}
          />
          <FeatureRow
            icon={ClipboardList}
            label="Against brief"
            help={{
              what: 'Compares the document against requirements you paste and lists gaps.',
              how: 'Open the selection AI menu, choose Against brief, paste requirements, then check gaps.',
            }}
          />
          <FeatureRow
            icon={BookA}
            label="Glossary"
            help={{
              what: 'Enforces preferred terms across the full document.',
              how: 'Open the selection AI menu and choose Glossary.',
            }}
          />

          <CollapsibleSection
            id="explain"
            icon={MessageSquareText}
            label="Explain"
            open={!!openSections.explain}
            onToggle={toggleSection}
          >
            {EXPLAIN_OPTIONS.map((opt) => (
              <FeatureRow key={opt.label} nested icon={opt.icon} label={opt.label} help={opt.help} />
            ))}
          </CollapsibleSection>

          <CollapsibleSection
            id="suggestions"
            icon={Lightbulb}
            label="Suggestions"
            open={!!openSections.suggestions}
            onToggle={toggleSection}
          >
            {SUGGEST_OPTIONS.map((opt) => (
              <FeatureRow
                key={opt.kind}
                nested
                icon={SUGGEST_ICONS[opt.kind] ?? Lightbulb}
                label={opt.label}
                help={SUGGEST_HELP[opt.kind] ?? { what: opt.description, how: 'Use this option from the selection AI menu.' }}
              />
            ))}
          </CollapsibleSection>

          <CollapsibleSection
            id="translate"
            icon={Languages}
            label="Translate"
            open={!!openSections.translate}
            onToggle={toggleSection}
          >
            {TRANSLATE_LANGUAGES.map((lang) => (
              <FeatureRow
                key={lang.value}
                nested
                icon={Globe}
                label={lang.label}
                help={{
                  what: `Translates the selection into ${lang.label}.`,
                  how: `Select text, open the selection AI menu, then choose Translate → ${lang.label}.`,
                }}
              />
            ))}
          </CollapsibleSection>

          <CollapsibleSection
            id="tone"
            icon={Mic2}
            label="Tone"
            open={!!openSections.tone}
            onToggle={toggleSection}
          >
            {ALL_TONE_OPTIONS.map((t) => (
              <FeatureRow
                key={t.label}
                nested
                icon={TONE_ICONS[t.label] ?? Mic2}
                label={t.label}
                help={{
                  what: t.prompt,
                  how: `Select text, open the selection AI menu, then choose Tone → ${t.label}.`,
                }}
              />
            ))}
          </CollapsibleSection>

          <CollapsibleSection
            id="summarize"
            icon={FileText}
            label="Summarize"
            open={!!openSections.summarize}
            onToggle={toggleSection}
          >
            {SUMMARIZE_OPTIONS.map((opt) => (
              <FeatureRow key={opt.label} nested icon={opt.icon} label={opt.label} help={opt.help} />
            ))}
          </CollapsibleSection>

          <CollapsibleSection
            id="analytics"
            icon={BarChart3}
            label="Analytics"
            open={!!openSections.analytics}
            onToggle={toggleSection}
          >
            {ANALYTICS_FEATURES.map((feature) => (
              <FeatureRow
                key={feature.label}
                nested
                icon={feature.icon}
                label={feature.label}
                help={feature.help}
                badge="New"
              />
            ))}
            <p className="px-3 pt-1.5 pb-0.5 pl-9 text-[9px] font-semibold uppercase tracking-wide text-foreground/40">
              Chart types
            </p>
            {CHART_TYPE_OPTIONS.map((opt) => (
              <FeatureRow
                key={opt.kind}
                nested
                icon={opt.icon}
                label={opt.label}
                help={{
                  what: `Insert a ${opt.label.toLowerCase()} chart from the table at your cursor.`,
                  how: 'Place the cursor in a table with labels and numeric columns, then Spark AI → Analytics → pick a chart type.',
                }}
              />
            ))}
            <p className="px-3 pt-1.5 pb-0.5 pl-9 text-[9px] font-semibold uppercase tracking-wide text-foreground/40">
              Progress
            </p>
            {PROGRESS_MODE_OPTIONS.map((opt) => (
              <FeatureRow
                key={opt.mode}
                nested
                icon={opt.icon}
                label={opt.label}
                help={{
                  what: opt.description,
                  how: 'Select a table or CSV data, then Spark AI → Analytics → Progress → choose a mode.',
                }}
              />
            ))}
          </CollapsibleSection>

          <FeatureRow
            icon={FileEdit}
            label="Draft"
            badge="New"
            help={{
              what: 'Opens a prompt to draft new content from a brief.',
              how: 'Open the selection AI menu or use Draft from the editor, describe what you need, then insert the result.',
            }}
          />

          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-foreground/50 border-t mt-1">
            Insert
          </p>
          <FeatureRow
            icon={MessageCircle}
            label="Ask"
            badge="New"
            help={{
              what: 'Ask a construction expert in the document — learn the WHY, with follow-ups to go deeper.',
              how: 'Type /ask, end with . or ?, then Teach me (or Go deeper / Field brief). Sharpen question if you want a clearer ask.',
            }}
          />

          <div className="border-t mt-1 pt-1">
          <CollapsibleSection
            id="upcoming"
            icon={Sparkles}
            label="Upcoming"
            open={!!openSections.upcoming}
            onToggle={toggleSection}
          >
            {UPCOMING_FEATURE_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="px-3 pt-1.5 pb-0.5 pl-9 text-[9px] font-semibold uppercase tracking-wide text-foreground/40">
                  {group.label}
                </p>
                {group.features.map((feature) => (
                  <FeatureRow
                    key={feature.label}
                    nested
                    icon={feature.icon}
                    label={feature.label}
                    help={feature.help}
                    badge="Soon"
                  />
                ))}
              </div>
            ))}
          </CollapsibleSection>
          </div>
        </div>
      </ToolbarPopover>
    </>
  )
}
