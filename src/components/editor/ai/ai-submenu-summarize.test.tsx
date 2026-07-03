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
  it('renders scope and length controls', () => {
    const editor = makeEditor()
    render(<AiSummarizeSubmenu editor={editor} />)
    expect(screen.getByText('Summarize')).toBeInTheDocument()
    editor.destroy()
  })

  it('calls aiApi.summarize with whole-doc text when Whole doc clicked', async () => {
    async function* fakeStream() {
      yield JSON.stringify({ type: 'token', delta: 'Summary text' })
    }
    const spy = vi.spyOn(aiClient.aiApi, 'summarize').mockReturnValue(fakeStream())
    const editor = makeEditor()
    render(<AiSummarizeSubmenu editor={editor} />)

    fireEvent.click(screen.getByText('Whole doc'))

    await waitFor(() => expect(spy).toHaveBeenCalled())
    expect(spy.mock.calls[0][0].text).toContain('Some long document text')
    editor.destroy()
  })

  it('displays streamed summary text and offers copy', async () => {
    async function* fakeStream() {
      yield JSON.stringify({ type: 'token', delta: 'Result' })
    }
    vi.spyOn(aiClient.aiApi, 'summarize').mockReturnValue(fakeStream())
    const editor = makeEditor()
    render(<AiSummarizeSubmenu editor={editor} />)

    fireEvent.click(screen.getByText('Whole doc'))

    await waitFor(() => expect(screen.getByText('Result')).toBeInTheDocument())
    expect(screen.getByText('Copy to clipboard')).toBeInTheDocument()
    editor.destroy()
  })

  it('aborts the in-flight stream when unmounted before it finishes', async () => {
    const abortSpy = vi.fn()
    async function* fakeStream(_req: unknown, signal: AbortSignal) {
      signal.addEventListener('abort', abortSpy)
      yield JSON.stringify({ type: 'token', delta: 'Result' })
      await new Promise(() => {})
    }
    vi.spyOn(aiClient.aiApi, 'summarize').mockImplementation(fakeStream as any)
    const editor = makeEditor()
    const { unmount } = render(<AiSummarizeSubmenu editor={editor} />)

    fireEvent.click(screen.getByText('Whole doc'))
    await waitFor(() => expect(screen.getByText('Result')).toBeInTheDocument())

    unmount()

    expect(abortSpy).toHaveBeenCalledTimes(1)
    editor.destroy()
  })
})
