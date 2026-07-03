import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { AiAutocomplete } from './ai-autocomplete'
import * as aiClient from '@/lib/api/ai-client'

describe('AiAutocomplete extension', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('does not trigger completion when autocomplete is disabled', async () => {
    const completeSpy = vi.spyOn(aiClient.aiApi, 'complete')
    const editor = new Editor({
      extensions: [StarterKit, AiAutocomplete.configure({ enabled: () => false })],
      content: '<p>hello world</p>',
    })
    editor.commands.setTextSelection(editor.state.doc.content.size - 1)
    editor.view.dispatch(editor.state.tr)
    vi.advanceTimersByTime(500)
    await Promise.resolve()
    expect(completeSpy).not.toHaveBeenCalled()
    editor.destroy()
  })

  it('does not trigger completion when before-cursor context is under 3 chars', async () => {
    const completeSpy = vi.spyOn(aiClient.aiApi, 'complete')
    const editor = new Editor({
      extensions: [StarterKit, AiAutocomplete.configure({ enabled: () => true })],
      content: '<p>hi</p>',
    })
    editor.commands.setTextSelection(editor.state.doc.content.size - 1)
    editor.view.dispatch(editor.state.tr)
    vi.advanceTimersByTime(500)
    await Promise.resolve()
    expect(completeSpy).not.toHaveBeenCalled()
    editor.destroy()
  })

  it('triggers completion after debounce when enabled and context is long enough', async () => {
    async function* fakeStream() {
      yield JSON.stringify({ type: 'token', delta: ' there' })
    }
    const completeSpy = vi.spyOn(aiClient.aiApi, 'complete').mockReturnValue(fakeStream())

    const editor = new Editor({
      extensions: [StarterKit, AiAutocomplete.configure({ enabled: () => true })],
      content: '<p>hello</p>',
    })
    editor.commands.setTextSelection(editor.state.doc.content.size - 1)
    editor.view.dispatch(editor.state.tr)
    vi.advanceTimersByTime(500)
    await Promise.resolve()
    await Promise.resolve()

    expect(completeSpy).toHaveBeenCalledTimes(1)
    editor.destroy()
  })

  it('accepts the ghost suggestion as real text on Tab', async () => {
    async function* fakeStream() {
      yield JSON.stringify({ type: 'token', delta: ' there' })
    }
    vi.spyOn(aiClient.aiApi, 'complete').mockReturnValue(fakeStream())

    const editor = new Editor({
      extensions: [StarterKit, AiAutocomplete.configure({ enabled: () => true })],
      content: '<p>hello</p>',
    })
    editor.commands.setTextSelection(editor.state.doc.content.size - 1)
    editor.view.dispatch(editor.state.tr)
    vi.advanceTimersByTime(500)
    await Promise.resolve()
    await Promise.resolve()

    expect(editor.storage.aiAutocomplete.ghostText).toBe(' there')
    expect(editor.getText()).not.toContain('hello there')

    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    editor.view.dom.dispatchEvent(tabEvent)

    expect(editor.getText()).toContain('hello there')
    expect(editor.storage.aiAutocomplete.ghostText).toBeNull()

    editor.destroy()
  })

  it('accepts the ghost suggestion on ArrowRight when cursor is at the ghost position', async () => {
    async function* fakeStream() {
      yield JSON.stringify({ type: 'token', delta: ' there' })
    }
    vi.spyOn(aiClient.aiApi, 'complete').mockReturnValue(fakeStream())

    const editor = new Editor({
      extensions: [StarterKit, AiAutocomplete.configure({ enabled: () => true })],
      content: '<p>hello</p>',
    })
    editor.commands.setTextSelection(editor.state.doc.content.size - 1)
    editor.view.dispatch(editor.state.tr)
    vi.advanceTimersByTime(500)
    await Promise.resolve()
    await Promise.resolve()

    expect(editor.storage.aiAutocomplete.ghostText).toBe(' there')

    const arrowEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
    editor.view.dom.dispatchEvent(arrowEvent)

    expect(editor.getText()).toContain('hello there')
    expect(editor.storage.aiAutocomplete.ghostText).toBeNull()

    editor.destroy()
  })

  it('dismisses the ghost suggestion and aborts the fetch on Escape', async () => {
    const abortSpy = vi.fn()
    async function* fakeStream(_req: unknown, signal: AbortSignal) {
      signal.addEventListener('abort', abortSpy)
      yield JSON.stringify({ type: 'token', delta: ' there' })
      // simulate a pending stream that never resolves further without abort
      await new Promise(() => {})
    }
    vi.spyOn(aiClient.aiApi, 'complete').mockImplementation(fakeStream as any)

    const editor = new Editor({
      extensions: [StarterKit, AiAutocomplete.configure({ enabled: () => true })],
      content: '<p>hello</p>',
    })
    editor.commands.setTextSelection(editor.state.doc.content.size - 1)
    editor.view.dispatch(editor.state.tr)
    vi.advanceTimersByTime(500)
    await Promise.resolve()
    await Promise.resolve()

    expect(editor.storage.aiAutocomplete.ghostText).toBe(' there')

    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    editor.view.dom.dispatchEvent(escapeEvent)

    expect(editor.storage.aiAutocomplete.ghostText).toBeNull()
    expect(editor.getText()).not.toContain('hello there')
    expect(abortSpy).toHaveBeenCalledTimes(1)

    editor.destroy()
  })
})
