import { create } from 'zustand'
import type { SummaryLength } from '@/lib/api/ai-types'

export type RewriteMode =
  | 'grammar' | 'spelling' | 'concise' | 'professional' | 'simplify'
  | 'executive' | 'technical' | 'polish' | 'custom_tone'

export type AIStatus = 'idle' | 'loading' | 'streaming' | 'done' | 'error'

export interface RewriteSession {
  mode: RewriteMode
  original: string
  rewritten: string
  status: AIStatus
  warnings: string[]
  abortController: AbortController
}

export interface SummaryReplacement {
  summaryText: string
  originalText: string
  length: SummaryLength
}

export type AutocompleteScopeSetting = 'word' | 'sentence' | 'paragraph'

interface AiState {
  autocompleteEnabled: boolean
  autocompleteScope: AutocompleteScopeSetting
  improveEnabled: boolean
  spellingEnabled: boolean
  grammarEnabled: boolean

  ghostText: string | null
  ghostTextAbortController: AbortController | null
  ghostLastError: string | null

  rewriteSession: RewriteSession | null
  summaryReplacements: SummaryReplacement[]

  setAutocompleteEnabled: (v: boolean) => void
  setAutocompleteScope: (v: AutocompleteScopeSetting) => void
  setImproveEnabled: (v: boolean) => void
  setSpellingEnabled: (v: boolean) => void
  setGrammarEnabled: (v: boolean) => void

  setGhostText: (text: string | null) => void
  setGhostAbort: (ctrl: AbortController | null) => void
  setGhostError: (msg: string | null) => void
  cancelGhost: () => void

  startRewrite: (mode: RewriteMode, original: string) => AbortController
  appendRewrite: (delta: string) => void
  finishRewrite: (warnings?: string[]) => void
  cancelRewrite: () => void
  setRewriteError: () => void
  clearRewrite: () => void

  registerSummaryReplacement: (entry: SummaryReplacement) => void
  findSummaryReplacement: (selectedText: string) => SummaryReplacement | null
  removeSummaryReplacement: (summaryText: string) => void
}

export const useAiStore = create<AiState>((set, get) => ({
  autocompleteEnabled: false,
  autocompleteScope: 'sentence' as AutocompleteScopeSetting,
  improveEnabled: false,
  spellingEnabled: false,
  grammarEnabled: false,

  ghostText: null,
  ghostTextAbortController: null,
  ghostLastError: null,

  rewriteSession: null,
  summaryReplacements: [],

  setAutocompleteEnabled: (autocompleteEnabled) => set({ autocompleteEnabled }),
  setAutocompleteScope: (autocompleteScope) => set({ autocompleteScope }),
  setImproveEnabled: (improveEnabled) => set({ improveEnabled }),
  setSpellingEnabled: (spellingEnabled) => set({ spellingEnabled }),
  setGrammarEnabled: (grammarEnabled) => set({ grammarEnabled }),

  setGhostText: (ghostText) => set({ ghostText }),
  setGhostAbort: (ghostTextAbortController) => set({ ghostTextAbortController }),
  setGhostError: (ghostLastError) => set({ ghostLastError }),
  cancelGhost: () => {
    get().ghostTextAbortController?.abort()
    set({ ghostText: null, ghostTextAbortController: null })
  },

  startRewrite: (mode, original) => {
    get().rewriteSession?.abortController.abort()
    const ctrl = new AbortController()
    set({
      rewriteSession: { mode, original, rewritten: '', status: 'loading', warnings: [], abortController: ctrl },
    })
    return ctrl
  },

  appendRewrite: (delta) =>
    set((s) => {
      if (!s.rewriteSession) return s
      return {
        rewriteSession: { ...s.rewriteSession, rewritten: s.rewriteSession.rewritten + delta, status: 'streaming' },
      }
    }),

  finishRewrite: (warnings = []) =>
    set((s) => {
      if (!s.rewriteSession) return s
      return { rewriteSession: { ...s.rewriteSession, status: 'done', warnings } }
    }),

  cancelRewrite: () => {
    get().rewriteSession?.abortController.abort()
    set({ rewriteSession: null })
  },

  setRewriteError: () =>
    set((s) => {
      if (!s.rewriteSession) return s
      return { rewriteSession: { ...s.rewriteSession, status: 'error' } }
    }),

  clearRewrite: () => {
    get().rewriteSession?.abortController.abort()
    set({ rewriteSession: null })
  },

  registerSummaryReplacement: (entry) =>
    set((s) => ({
      summaryReplacements: [
        ...s.summaryReplacements.filter((r) => r.summaryText.trim() !== entry.summaryText.trim()),
        entry,
      ],
    })),

  findSummaryReplacement: (selectedText) => {
    const norm = selectedText.trim()
    return get().summaryReplacements.find((r) => r.summaryText.trim() === norm) ?? null
  },

  removeSummaryReplacement: (summaryText) =>
    set((s) => ({
      summaryReplacements: s.summaryReplacements.filter((r) => r.summaryText.trim() !== summaryText.trim()),
    })),
}))
