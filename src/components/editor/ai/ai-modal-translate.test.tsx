import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { AiTranslateModal } from './ai-modal-translate'
import * as aiClient from '@/lib/api/ai-client'

function makeEditorWithSelection() {
  const editor = new Editor({ extensions: [StarterKit], content: '<p>Hello world</p>' })
  editor.commands.setTextSelection({ from: 1, to: 12 })
  return editor
}

describe('AiTranslateModal', () => {
  it('renders when open', () => {
    const editor = makeEditorWithSelection()
    render(<AiTranslateModal open={true} onClose={() => {}} editor={editor} />)
    expect(screen.getByText('Translate')).toBeInTheDocument()
    editor.destroy()
  })

  it('does not render when closed', () => {
    const editor = makeEditorWithSelection()
    render(<AiTranslateModal open={false} onClose={() => {}} editor={editor} />)
    expect(screen.queryByText('Translate')).not.toBeInTheDocument()
    editor.destroy()
  })

  it('streams translated text and replaces selection on Accept', async () => {
    async function* fakeStream() {
      yield JSON.stringify({ type: 'token', delta: 'Hola mundo' })
    }
    vi.spyOn(aiClient.aiApi, 'translate').mockReturnValue(fakeStream())
    const editor = makeEditorWithSelection()
    render(<AiTranslateModal open={true} onClose={() => {}} editor={editor} />)

    fireEvent.click(screen.getByText('Translate selection'))

    await waitFor(() => expect(screen.getByText('Hola mundo')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Accept'))
    expect(editor.getText()).toContain('Hola mundo')
    editor.destroy()
  })

  it('does not run when selection is empty', () => {
    const editor = new Editor({ extensions: [StarterKit], content: '<p>Hello world</p>' })
    editor.commands.setTextSelection({ from: 1, to: 1 })
    const spy = vi.spyOn(aiClient.aiApi, 'translate').mockClear()
    render(<AiTranslateModal open={true} onClose={() => {}} editor={editor} />)

    fireEvent.click(screen.getByText('Translate selection'))

    expect(spy).not.toHaveBeenCalled()
    editor.destroy()
  })

  it('aborts the in-flight stream when unmounted before it finishes', async () => {
    const abortSpy = vi.fn()
    async function* fakeStream(_req: unknown, signal: AbortSignal) {
      signal.addEventListener('abort', abortSpy)
      yield JSON.stringify({ type: 'token', delta: 'Hola' })
      await new Promise(() => {})
    }
    vi.spyOn(aiClient.aiApi, 'translate').mockImplementation(fakeStream as any)
    const editor = makeEditorWithSelection()
    const { unmount } = render(<AiTranslateModal open={true} onClose={() => {}} editor={editor} />)

    fireEvent.click(screen.getByText('Translate selection'))
    await waitFor(() => expect(screen.getByText('Hola')).toBeInTheDocument())

    unmount()

    expect(abortSpy).toHaveBeenCalledTimes(1)
    editor.destroy()
  })

  it('aborts the in-flight stream when closed before it finishes', async () => {
    const abortSpy = vi.fn()
    async function* fakeStream(_req: unknown, signal: AbortSignal) {
      signal.addEventListener('abort', abortSpy)
      yield JSON.stringify({ type: 'token', delta: 'Hola' })
      await new Promise(() => {})
    }
    vi.spyOn(aiClient.aiApi, 'translate').mockImplementation(fakeStream as any)
    const editor = makeEditorWithSelection()
    const { rerender } = render(<AiTranslateModal open={true} onClose={() => {}} editor={editor} />)

    fireEvent.click(screen.getByText('Translate selection'))
    await waitFor(() => expect(screen.getByText('Hola')).toBeInTheDocument())

    rerender(<AiTranslateModal open={false} onClose={() => {}} editor={editor} />)

    expect(abortSpy).toHaveBeenCalledTimes(1)
    editor.destroy()
    cleanup()
  })
})
