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
})
