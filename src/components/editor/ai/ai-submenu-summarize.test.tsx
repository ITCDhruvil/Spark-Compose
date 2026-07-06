import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { AiSummarizeSubmenu } from './ai-submenu-summarize'
import * as aiClient from '@/lib/api/ai-client'

function makeEditor() {
  return new Editor({ extensions: [StarterKit], content: '<p>Some long document text to summarize.</p>' })
}

describe('AiSummarizeSubmenu', () => {
  it('renders length options', () => {
    const editor = makeEditor()
    render(<AiSummarizeSubmenu editor={editor} />)
    expect(screen.getByText('Summarize')).toBeInTheDocument()
    expect(screen.getByText('Short')).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
    expect(screen.getByText('Detailed')).toBeInTheDocument()
    editor.destroy()
  })

  it('streams summary into the editor and offers confirm/cancel', async () => {
    async function* fakeStream() {
      yield JSON.stringify({ type: 'token', delta: 'Summary text' })
    }
    const spy = vi.spyOn(aiClient.aiApi, 'summarize').mockReturnValue(fakeStream())
    const editor = makeEditor()
    editor.commands.selectAll()
    render(<AiSummarizeSubmenu editor={editor} />)

    fireEvent.click(screen.getByText('Medium'))

    await waitFor(() => expect(spy).toHaveBeenCalled())
    expect(spy.mock.calls[0][0].text).toContain('Some long document text')
    expect(spy.mock.calls[0][0].length).toBe('medium')

    await waitFor(() => expect(screen.getByText('Confirm')).toBeInTheDocument())
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(editor.getText()).toContain('Summary text')
    editor.destroy()
  })

  it('aborts the in-flight stream when unmounted before it finishes', async () => {
    const abortSpy = vi.fn()
    async function* fakeStream(_req: unknown, signal: AbortSignal) {
      signal.addEventListener('abort', abortSpy)
      yield JSON.stringify({ type: 'token', delta: 'Result' })
      await new Promise(() => {})
    }
    vi.spyOn(aiClient.aiApi, 'summarize').mockImplementation(fakeStream as never)
    const editor = makeEditor()
    editor.commands.selectAll()
    const { unmount } = render(<AiSummarizeSubmenu editor={editor} />)

    fireEvent.click(screen.getByText('Short'))
    await waitFor(() => expect(editor.getText()).toContain('Result'))

    unmount()

    await waitFor(() => expect(abortSpy).toHaveBeenCalledTimes(1))
    editor.destroy()
  })
})
