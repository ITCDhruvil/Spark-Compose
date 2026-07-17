'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Loader2, Plus, Send, Trash2 } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { ConfirmButton } from '@/components/ui/confirm-button'
import { aiApi, APIError } from '@/lib/api/ai-client'
import { getDraftPlaybook, listDraftPlaybooks } from '@/lib/editor/draft-playbooks'
import type {
  AskDraftPlan,
  AskDraftQuestion,
  ConstructionContentType,
  DraftOutlineSection,
} from '@/lib/api/ai-types'
import { openGuidedDraft } from '@/lib/editor/guided-draft-events'
import { cn } from '@/lib/utils'

interface AiConversationalDraftCardProps {
  open: boolean
  onClose: () => void
  editor: Editor
}

type Phase = 'pick_type' | 'chat' | 'confirm' | 'error'


interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
  questions?: AskDraftQuestion[]
  kind?: 'required' | 'optional'
}

const PLAYBOOKS = listDraftPlaybooks()

function humanizeLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase())
}

function planSummaryRows(plan: AskDraftPlan): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [
    { label: 'Type', value: humanizeLabel(plan.contentType) },
    { label: 'Audience', value: plan.audience },
    { label: 'Topic', value: plan.topic },
    { label: 'Length', value: plan.length ?? 'medium' },
  ]
  if (plan.draftName) rows.push({ label: 'Draft name', value: plan.draftName })
  if (plan.angle) rows.push({ label: 'Angle', value: plan.angle })
  if (plan.mustInclude) rows.push({ label: 'Must include', value: plan.mustInclude })
  if (plan.briefSummary) rows.push({ label: 'Brief', value: plan.briefSummary })
  if (plan.whys) {
    for (const [k, v] of Object.entries(plan.whys)) {
      if (v?.trim()) rows.push({ label: humanizeLabel(k), value: v.trim() })
    }
  }
  return rows
}

function nextSectionId(outline: DraftOutlineSection[]): string {
  let n = outline.length + 1
  const ids = new Set(outline.map((s) => s.id))
  while (ids.has(`sec_${n}`)) n += 1
  return `sec_${n}`
}

export function AiConversationalDraftCard({
  open,
  onClose,
}: AiConversationalDraftCardProps) {
  const [phase, setPhase] = useState<Phase>('pick_type')
  const [contentType, setContentType] = useState<ConstructionContentType | null>(null)
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [apiMessages, setApiMessages] = useState<unknown[]>([])
  const [pendingToolCallIds, setPendingToolCallIds] = useState<string[]>([])
  const [pendingToolNames, setPendingToolNames] = useState<string[]>([])
  const [activeQuestions, setActiveQuestions] = useState<AskDraftQuestion[] | null>(null)
  const [questionKind, setQuestionKind] = useState<'required' | 'optional' | null>(null)
  const [otherForId, setOtherForId] = useState<string | null>(null)
  /** Single-choice picks while collecting a multi-question turn (or allowMultiple) */
  const [chipPicks, setChipPicks] = useState<Record<string, string>>({})
  /** Selected chip labels per question id (for allowMultiple) */
  const [selectedByQuestion, setSelectedByQuestion] = useState<Record<string, string[]>>({})
  const [otherExtra, setOtherExtra] = useState('')

  const [plan, setPlan] = useState<AskDraftPlan | null>(null)
  const [editableOutline, setEditableOutline] = useState<DraftOutlineSection[]>([])
  const [impactSuggestions, setImpactSuggestions] = useState<{ heading: string; why: string }[]>([])
  const [impactLoading, setImpactLoading] = useState(false)
  const [addingSection, setAddingSection] = useState(false)
  const [newSectionHeading, setNewSectionHeading] = useState('')

  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setPhase('pick_type')
    setContentType(null)
    setTurns([])
    setInput('')
    setBusy(false)
    setError(null)
    setApiMessages([])
    setPendingToolCallIds([])
    setPendingToolNames([])
    setActiveQuestions(null)
    setQuestionKind(null)
    setOtherForId(null)
    setSelectedByQuestion({})
    setChipPicks({})
    setOtherExtra('')
    setPlan(null)
    setEditableOutline([])
    setImpactSuggestions([])
    setImpactLoading(false)
    setAddingSection(false)
    setNewSectionHeading('')
  }, [])

  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, busy, phase, activeQuestions])

  const buildToolResults = useCallback((answerPayload: string) => {
    return pendingToolCallIds.map((id, i) => {
      const name = pendingToolNames[i] ?? ''
      if (name === 'replyToUser') {
        return { toolCallId: id, output: JSON.stringify({ ok: true, delivered: true }) }
      }
      return { toolCallId: id, output: answerPayload }
    })
  }, [pendingToolCallIds, pendingToolNames])

  const applyAskResponse = useCallback((res: Awaited<ReturnType<typeof aiApi.askDraft>>) => {
    setApiMessages(res.messages)

    if (res.type === 'questions') {
      setPendingToolCallIds(res.pendingToolCallIds)
      setPendingToolNames(res.pendingToolNames)
      setActiveQuestions(res.questions)
      setQuestionKind(res.kind)
      setOtherForId(null)
      setSelectedByQuestion({})
      setChipPicks({})
      setOtherExtra('')
      // Show only the human reply in chat; question lives with the option chips
      const content =
        res.assistantMessage?.trim()
        || res.questions[0]?.question
        || 'Got it — what else should I know?'
      setTurns((t) => [
        ...t,
        {
          role: 'assistant',
          content,
          questions: res.questions,
          kind: res.kind,
        },
      ])
      setPhase('chat')
      return
    }

    setPendingToolCallIds([])
    setPendingToolNames([])
    setActiveQuestions(null)
    setQuestionKind(null)
    setPlan(res.plan)
    setEditableOutline(res.plan.outline ?? [])
    setImpactSuggestions([])
    setAddingSection(false)
    setNewSectionHeading('')
    const playbook = getDraftPlaybook(res.plan.contentType)
    const readyText =
      res.assistantMessage?.trim()
      || playbook.confirmLead
    setTurns((t) => [
      ...t,
      {
        role: 'assistant',
        content: readyText,
      },
    ])
    setPhase('confirm')
    setImpactLoading(true)
    void aiApi.draftGuide({ action: 'outlineImpact', plan: res.plan })
      .then((impact) => {
        setImpactSuggestions(impact.impactSuggestions ?? [])
      })
      .catch(() => {
        setImpactSuggestions([])
      })
      .finally(() => setImpactLoading(false))
  }, [])

  const startConversation = useCallback(async (
    type: ConstructionContentType,
    firstPrompt: string,
    opts?: { showUserBubble?: boolean },
  ) => {
    setBusy(true)
    setError(null)
    setPhase('chat')
    setContentType(type)
    if (opts?.showUserBubble !== false) {
      setTurns((t) => [...t, { role: 'user', content: firstPrompt }])
    }
    try {
      const res = await aiApi.askDraft({
        prompt: firstPrompt,
        contentType: type,
      })
      applyAskResponse(res)
    } catch (e) {
      setPhase('error')
      setError(e instanceof APIError ? e.message : e instanceof Error ? e.message : 'Ask failed')
    } finally {
      setBusy(false)
    }
  }, [applyAskResponse])

  const pickType = useCallback((type: ConstructionContentType) => {
    const playbook = PLAYBOOKS.find((p) => p.id === type)!
    setContentType(type)
    setTurns([{ role: 'assistant', content: playbook.openingPrompt }])
    setPhase('chat')
    setActiveQuestions(null)
    void startConversation(
      type,
      `I chose "${playbook.label}". Start the conversation like a colleague — greet briefly, then ask the first natural question with concrete tap options about their situation (not a generic template).`,
      { showUserBubble: false },
    )
  }, [startConversation])

  const submitAnswers = useCallback(async (userText: string, answerPayload: string) => {
    if (!pendingToolCallIds.length || busy) return
    setBusy(true)
    setError(null)
    setTurns((t) => [...t, { role: 'user', content: userText }])
    setActiveQuestions(null)
    setOtherForId(null)
    setSelectedByQuestion({})
    setChipPicks({})
    setOtherExtra('')
    setInput('')

    try {
      const res = await aiApi.askDraft({
        prompt: '',
        contentType: contentType ?? undefined,
        messages: apiMessages,
        toolResults: buildToolResults(answerPayload),
      })
      applyAskResponse(res)
    } catch (e) {
      setPhase('error')
      setError(e instanceof APIError ? e.message : e instanceof Error ? e.message : 'Ask failed')
    } finally {
      setBusy(false)
    }
  }, [pendingToolCallIds, busy, contentType, apiMessages, buildToolResults, applyAskResponse])

  const answerChip = useCallback((question: AskDraftQuestion, option: string) => {
    if (option.toLowerCase() === 'other') {
      setOtherForId(question.id)
      if (question.allowMultiple) {
        setSelectedByQuestion((prev) => {
          const cur = prev[question.id] ?? []
          if (cur.some((c) => c.toLowerCase() === 'other')) return prev
          return { ...prev, [question.id]: [...cur, 'Other'] }
        })
      } else {
        setChipPicks((prev) => ({ ...prev, [question.id]: 'Other' }))
      }
      return
    }
    if (!activeQuestions) return

    if (question.allowMultiple) {
      setSelectedByQuestion((prev) => {
        const cur = prev[question.id] ?? []
        const exists = cur.includes(option)
        const next = exists ? cur.filter((c) => c !== option) : [...cur, option]
        return { ...prev, [question.id]: next }
      })
      return
    }

    // Multiple questions on one turn: pick without submitting (Continue when all answered)
    if (activeQuestions.length > 1) {
      setChipPicks((prev) => ({ ...prev, [question.id]: option }))
      setOtherForId((id) => (id === question.id ? null : id))
      return
    }

    // Single exclusive question — submit immediately
    void submitAnswers(
      option,
      JSON.stringify({ answers: [{ questionId: question.id, answer: option }] }),
    )
  }, [activeQuestions, submitAnswers])

  const confirmCollectedAnswers = useCallback(() => {
    if (!activeQuestions?.length || busy) return

    const answers = activeQuestions.map((q) => {
      if (q.allowMultiple) {
        const selected = [...(selectedByQuestion[q.id] ?? [])]
        const wantsOther = selected.some((s) => s.toLowerCase() === 'other') || otherForId === q.id
        const withoutOther = selected.filter((s) => s.toLowerCase() !== 'other')
        if (wantsOther && otherExtra.trim()) withoutOther.push(otherExtra.trim())
        else if (wantsOther) withoutOther.push('Other')
        return {
          questionId: q.id,
          answer: withoutOther.length ? withoutOther.join('; ') : 'skipped',
        }
      }
      let pick = chipPicks[q.id]
      if ((pick?.toLowerCase() === 'other' || otherForId === q.id) && otherExtra.trim()) {
        pick = otherExtra.trim()
      }
      return { questionId: q.id, answer: pick?.trim() || 'skipped' }
    })

    const answered = answers.filter((a) => a.answer !== 'skipped')
    if (!answered.length) return

    const label = answered.map((a) => a.answer).join('; ')
    void submitAnswers(label, JSON.stringify({ answers }))
  }, [activeQuestions, busy, selectedByQuestion, chipPicks, otherForId, otherExtra, submitAnswers])

  const sendFreeText = useCallback(async () => {
    const text = input.trim()
    if (!text || busy) return

    if (!pendingToolCallIds.length && contentType && phase === 'chat') {
      setInput('')
      await startConversation(contentType, text)
      return
    }

    if (!pendingToolCallIds.length) return

    let answerPayload: string
    if (otherForId && activeQuestions) {
      answerPayload = JSON.stringify({
        answers: activeQuestions.map((q) => ({
          questionId: q.id,
          answer: q.id === otherForId ? text : 'skipped',
        })),
      })
    } else if (activeQuestions?.length === 1) {
      answerPayload = JSON.stringify({
        answers: [{ questionId: activeQuestions[0]!.id, answer: text }],
      })
    } else if (activeQuestions?.length) {
      answerPayload = JSON.stringify({
        answers: activeQuestions.map((q) => ({ questionId: q.id, answer: text })),
      })
    } else {
      answerPayload = JSON.stringify({ answers: [{ answer: text }] })
    }

    await submitAnswers(text, answerPayload)
  }, [
    input,
    busy,
    pendingToolCallIds,
    contentType,
    phase,
    startConversation,
    activeQuestions,
    otherForId,
    submitAnswers,
  ])

  const skipOptional = useCallback(() => {
    if (questionKind !== 'optional' || !pendingToolCallIds.length) return
    void submitAnswers(
      'Skipped optional questions',
      JSON.stringify({
        skipped: true,
        answers: (activeQuestions ?? []).map((q) => ({ questionId: q.id, answer: 'skipped' })),
      }),
    )
  }, [questionKind, pendingToolCallIds, activeQuestions, submitAnswers])

  const startWriting = useCallback(() => {
    if (!plan) return
    const outline = editableOutline
      .map((s) => ({ ...s, heading: s.heading.trim() }))
      .filter((s) => s.heading)
    if (outline.length < 1) return
    openGuidedDraft({ ...plan, outline })
    onClose()
  }, [plan, editableOutline, onClose])

  const updateOutlineHeading = useCallback((id: string, heading: string) => {
    setEditableOutline((prev) => prev.map((s) => (s.id === id ? { ...s, heading } : s)))
  }, [])

  const removeOutlineSection = useCallback((id: string) => {
    setEditableOutline((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.id !== id)))
  }, [])

  const addOutlineSection = useCallback((heading: string, intent?: string) => {
    const trimmed = heading.trim()
    if (!trimmed) return
    setEditableOutline((prev) => {
      if (prev.some((s) => s.heading.toLowerCase() === trimmed.toLowerCase())) return prev
      return [
        ...prev,
        {
          id: nextSectionId(prev),
          heading: trimmed,
          ...(intent?.trim() ? { intent: intent.trim() } : {}),
        },
      ]
    })
    setImpactSuggestions((prev) => prev.filter((s) => s.heading.toLowerCase() !== trimmed.toLowerCase()))
    setAddingSection(false)
    setNewSectionHeading('')
  }, [])

  const latestQuestions =
    activeQuestions
    ?? ([...turns].reverse().find((t) => t.role === 'assistant' && t.questions)?.questions ?? null)

  const showChips = phase === 'chat' && !!latestQuestions?.length && !busy && pendingToolCallIds.length > 0
  const needsContinue = !!latestQuestions?.some((q) => q.allowMultiple) || (latestQuestions?.length ?? 0) > 1
  const continueReady = needsContinue && !!latestQuestions?.every((q) => {
    if (q.allowMultiple) {
      const sel = selectedByQuestion[q.id] ?? []
      if (sel.length) return true
      if (otherForId === q.id && otherExtra.trim()) return true
      return false
    }
    const pick = chipPicks[q.id]
    if (!pick && otherForId !== q.id) return false
    if ((pick?.toLowerCase() === 'other' || otherForId === q.id) && !otherExtra.trim()) return false
    return true
  })

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Draft"
      description="Talk through your story — then we write the draft together."
      className="max-w-3xl w-[min(92vw,48rem)]"
    >
      <div className="flex flex-col gap-3 min-h-0 flex-1 h-full max-h-[min(78vh,640px)]">
        {phase === 'pick_type' && (
          <div className="space-y-2 overflow-y-auto draft-chat-scroll min-h-0">
            <p className="text-sm font-medium">What do you want to write about?</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {PLAYBOOKS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pickType(p.id)}
                  className="text-left rounded-lg border px-3 py-2.5 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                >
                  <span className="text-sm font-medium">{p.label}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {p.openingPrompt}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {phase !== 'pick_type' && (
          <>
            <div
              className={cn(
                'flex-1 min-h-0 overflow-y-auto space-y-3 pr-0.5',
                phase !== 'confirm' && 'draft-chat-scroll',
              )}
            >
              {/* During confirm, keep chat compact so the plan/outline fit */}
              {(phase === 'confirm'
                ? turns.slice(-2)
                : turns
              ).map((turn, i) => (
                turn.role === 'user' ? (
                  <div key={`user-${i}`} className="flex justify-end">
                    <div className="max-w-[50%] w-fit rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap leading-relaxed bg-primary text-primary-foreground">
                      {turn.content}
                    </div>
                  </div>
                ) : (
                  <div
                    key={`assistant-${i}`}
                    className="max-w-[92%] text-sm whitespace-pre-wrap leading-relaxed text-foreground"
                  >
                    {turn.content}
                  </div>
                )
              ))}

              {showChips && latestQuestions && (
                <div className="space-y-3 pt-0.5">
                  {latestQuestions.map((q) => {
                    return (
                      <div key={q.id} className="space-y-2">
                        {(!turns.length || turns[turns.length - 1]?.content !== q.question) && (
                          <p className="text-sm text-foreground/90">{q.question}</p>
                        )}
                        {q.allowMultiple && (
                          <p className="text-xs text-muted-foreground">Pick all that apply, then Continue.</p>
                        )}
                        {!q.allowMultiple && needsContinue && latestQuestions.length > 1 && (
                          <p className="text-xs text-muted-foreground">Choose one, then answer the next.</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {q.options.map((opt) => {
                            const isSelected = q.allowMultiple
                              ? (selectedByQuestion[q.id] ?? []).includes(opt)
                                || (opt.toLowerCase() === 'other' && otherForId === q.id)
                              : chipPicks[q.id] === opt
                                || (opt.toLowerCase() === 'other' && otherForId === q.id)
                            return (
                              <button
                                key={opt}
                                type="button"
                                disabled={busy}
                                onClick={() => answerChip(q, opt)}
                                className={cn(
                                  'text-sm px-3 py-1.5 rounded-full border bg-background transition-colors disabled:opacity-40',
                                  'hover:bg-primary/10 hover:border-primary/40 hover:text-primary',
                                  isSelected && 'border-primary bg-primary/10 text-primary',
                                )}
                              >
                                {opt}
                              </button>
                            )
                          })}
                        </div>
                        {(otherForId === q.id || chipPicks[q.id]?.toLowerCase() === 'other'
                          || (selectedByQuestion[q.id] ?? []).some((s) => s.toLowerCase() === 'other')) && (
                          <div className="space-y-1">
                            {q.allowMultiple || needsContinue ? (
                              <input
                                value={otherExtra}
                                onChange={(e) => setOtherExtra(e.target.value.slice(0, 500))}
                                placeholder="Your custom answer…"
                                className="w-full h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                              />
                            ) : (
                              <p className="text-xs text-muted-foreground">Type your answer below and send.</p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {needsContinue && (
                    <button
                      type="button"
                      disabled={busy || !continueReady}
                      onClick={confirmCollectedAnswers}
                      className="h-9 px-4 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                    >
                      Continue
                    </button>
                  )}
                  {questionKind === 'optional' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={skipOptional}
                      className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                    >
                      Skip for now
                    </button>
                  )}
                </div>
              )}

              {busy && phase === 'chat' && (
                <p className="ai-improve-shimmer-text text-sm font-medium">Thinking…</p>
              )}

              {phase === 'confirm' && plan && (
                <div className="space-y-4 border rounded-lg p-3 bg-muted/20">
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {getDraftPlaybook(plan.contentType).confirmLead}
                  </p>

                  <div className="overflow-hidden rounded-md border bg-background">
                    <table className="w-full text-sm">
                      <tbody>
                        {planSummaryRows(plan).map((row) => (
                          <tr key={row.label} className="border-b last:border-b-0">
                            <th className="w-[34%] align-top px-3 py-2 text-left font-semibold text-foreground bg-muted/40">
                              {row.label}
                            </th>
                            <td className="px-3 py-2 text-foreground/90 whitespace-pre-wrap">
                              {row.value}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Outline — add or remove sections
                    </p>
                    <div className="overflow-hidden rounded-md border bg-background">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                            <th className="w-10 px-2 py-1.5 font-semibold">#</th>
                            <th className="px-2 py-1.5 font-semibold">Section</th>
                            <th className="w-10 px-2 py-1.5" />
                          </tr>
                        </thead>
                        <tbody>
                          {editableOutline.map((s, i) => (
                            <tr key={s.id} className="border-b last:border-b-0">
                              <td className="px-2 py-1.5 tabular-nums text-muted-foreground align-middle">
                                {i + 1}
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  value={s.heading}
                                  onChange={(e) => updateOutlineHeading(s.id, e.target.value)}
                                  className="w-full rounded border border-transparent bg-transparent px-1.5 py-1 font-semibold outline-none hover:border-border focus:border-primary/40 focus:ring-1 focus:ring-ring/30"
                                  aria-label={`Section ${i + 1} heading`}
                                />
                                {s.intent && (
                                  <p className="px-1.5 text-xs text-muted-foreground">{s.intent}</p>
                                )}
                              </td>
                              <td className="px-1 py-1.5 text-right align-middle">
                                <button
                                  type="button"
                                  title="Remove section"
                                  disabled={editableOutline.length <= 1}
                                  onClick={() => removeOutlineSection(s.id)}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {addingSection ? (
                      <div className="flex gap-2">
                        <input
                          value={newSectionHeading}
                          onChange={(e) => setNewSectionHeading(e.target.value.slice(0, 120))}
                          placeholder="New section heading…"
                          className="h-9 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addOutlineSection(newSectionHeading)
                            }
                            if (e.key === 'Escape') {
                              setAddingSection(false)
                              setNewSectionHeading('')
                            }
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          disabled={!newSectionHeading.trim()}
                          onClick={() => addOutlineSection(newSectionHeading)}
                          className="h-9 px-3 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAddingSection(false)
                            setNewSectionHeading('')
                          }}
                          className="h-9 px-3 rounded-md text-xs font-medium border hover:bg-muted"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAddingSection(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add section
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Suggestions for impact
                    </p>
                    {impactLoading && (
                      <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Finding impactful sections…
                      </p>
                    )}
                    {!impactLoading && impactSuggestions.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Your outline already covers the strong beats — add a custom section above anytime.
                      </p>
                    )}
                    {impactSuggestions.length > 0 && (
                      <ul className="space-y-2">
                        {impactSuggestions.map((s) => (
                          <li
                            key={s.heading}
                            className="flex items-start justify-between gap-2 rounded-md border bg-background px-2.5 py-2"
                          >
                            <div className="min-w-0 space-y-0.5">
                              <p className="text-sm font-semibold">{s.heading}</p>
                              <p className="text-xs text-muted-foreground leading-snug">{s.why}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => addOutlineSection(s.heading, s.why)}
                              className="shrink-0 inline-flex items-center gap-1 h-8 px-2.5 rounded-md border text-xs font-medium hover:bg-primary/10 hover:border-primary/40 hover:text-primary"
                            >
                              <Plus className="h-3.5 w-3.5" /> Add
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {error && phase === 'error' && (
              <p className="text-xs text-red-600 shrink-0">{error}</p>
            )}

            {phase === 'confirm' && plan && (
              <div className="flex gap-2 shrink-0 pt-1 border-t">
                <ConfirmButton
                  className="flex-1 h-9 text-sm"
                  onClick={startWriting}
                  hideIcon
                  disabled={editableOutline.filter((s) => s.heading.trim()).length < 1}
                >
                  Start writing together
                </ConfirmButton>
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 px-3 rounded-md text-xs font-medium border hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            )}

            {(phase === 'chat' || phase === 'error') && (
              <div className="flex items-end gap-2 rounded-full border border-border bg-muted/30 pl-4 pr-1.5 py-1.5 shadow-sm focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-ring/30 transition-shadow shrink-0">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, 4000))}
                  placeholder={
                    otherForId
                      ? 'Type your Other answer…'
                      : pendingToolCallIds.length
                        ? 'Or type your own answer…'
                        : 'Add detail anytime…'
                  }
                  rows={1}
                  className="flex-1 min-h-[36px] max-h-28 bg-transparent py-2 text-sm resize-none outline-none placeholder:text-muted-foreground/70 leading-snug"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void sendFreeText()
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={!input.trim() || busy}
                  onClick={() => void sendFreeText()}
                  className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-35 transition-colors"
                  title="Send"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            )}

            {phase === 'error' && (
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  setPhase(plan ? 'confirm' : 'chat')
                }}
                className="h-8 text-xs text-primary hover:underline self-start shrink-0"
              >
                Try again
              </button>
            )}
          </>
        )}
      </div>
    </Dialog>
  )
}
