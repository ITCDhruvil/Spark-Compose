import { describe, it, expect, beforeEach } from 'vitest'
import { useAiStore } from './use-ai-store'

describe('useAiStore toggles', () => {
  beforeEach(() => {
    useAiStore.setState({ autocompleteEnabled: true, improveEnabled: true })
  })

  it('setAutocompleteEnabled flips the flag', () => {
    useAiStore.getState().setAutocompleteEnabled(false)
    expect(useAiStore.getState().autocompleteEnabled).toBe(false)
  })

  it('setImproveEnabled flips the flag', () => {
    useAiStore.getState().setImproveEnabled(false)
    expect(useAiStore.getState().improveEnabled).toBe(false)
  })
})

describe('useAiStore rewrite session', () => {
  it('startRewrite creates a loading session and returns an AbortController', () => {
    const ctrl = useAiStore.getState().startRewrite('custom_tone', 'hello world')
    expect(ctrl).toBeInstanceOf(AbortController)
    const session = useAiStore.getState().rewriteSession
    expect(session).not.toBeNull()
    expect(session?.status).toBe('loading')
    expect(session?.original).toBe('hello world')
  })

  it('appendRewrite accumulates deltas and sets status to streaming', () => {
    useAiStore.getState().startRewrite('custom_tone', 'hi')
    useAiStore.getState().appendRewrite('He')
    useAiStore.getState().appendRewrite('llo')
    const session = useAiStore.getState().rewriteSession
    expect(session?.rewritten).toBe('Hello')
    expect(session?.status).toBe('streaming')
  })

  it('finishRewrite sets status done and stores warnings', () => {
    useAiStore.getState().startRewrite('custom_tone', 'hi')
    useAiStore.getState().finishRewrite(['warn1'])
    const session = useAiStore.getState().rewriteSession
    expect(session?.status).toBe('done')
    expect(session?.warnings).toEqual(['warn1'])
  })

  it('clearRewrite aborts and nulls the session', () => {
    useAiStore.getState().startRewrite('custom_tone', 'hi')
    useAiStore.getState().clearRewrite()
    expect(useAiStore.getState().rewriteSession).toBeNull()
  })
})
