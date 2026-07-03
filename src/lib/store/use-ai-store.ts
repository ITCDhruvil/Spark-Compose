import { create } from 'zustand'

export type RewriteMode =
  | 'grammar' | 'concise' | 'professional' | 'simplify'
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

interface AiState {
  autocompleteEnabled: boolean
  improveEnabled: boolean

  ghostText: string | null
  ghostTextAbortController: AbortController | null
  ghostLastError: string | null

  rewriteSession: RewriteSession | null

  setAutocompleteEnabled: (v: boolean) => void
  setImproveEnabled: (v: boolean) => void

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
}

export const useAiStore = create<AiState>((set, get) => ({
  autocompleteEnabled: true,
  improveEnabled: true,

  ghostText: null,
  ghostTextAbortController: null,
  ghostLastError: null,

  rewriteSession: null,

  setAutocompleteEnabled: (autocompleteEnabled) => set({ autocompleteEnabled }),
  setImproveEnabled: (improveEnabled) => set({ improveEnabled }),

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
}))
