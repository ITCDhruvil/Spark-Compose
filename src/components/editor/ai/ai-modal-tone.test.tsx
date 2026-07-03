import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { AiToneModal } from './ai-modal-tone'
import * as aiClient from '@/lib/api/ai-client'

function makeEditorWithSelection() {
  const editor = new Editor({ extensions: [StarterKit], content: '<p>Hello world</p>' })
  editor.commands.setTextSelection({ from: 1, to: 12 })
  return editor
}

describe('AiToneModal', () => {
  it('disables Apply until instruction text is entered', () => {
    const editor = makeEditorWithSelection()
    render(<AiToneModal open={true} onClose={() => {}} editor={editor} />)
    expect(screen.getByText('Apply to selection')).toBeDisabled()
    editor.destroy()
  })

  it('streams rewritten text and replaces selection on Accept', async () => {
    async function* fakeStream() {
      yield JSON.stringify({ type: 'token', delta: 'Greetings, world' })
    }
    vi.spyOn(aiClient.aiApi, 'customTone').mockReturnValue(fakeStream())
    const editor = makeEditorWithSelection()
    render(<AiToneModal open={true} onClose={() => {}} editor={editor} />)

    fireEvent.change(screen.getByPlaceholderText(/rewrite as/i), { target: { value: 'formal' } })
    fireEvent.click(screen.getByText('Apply to selection'))

    await waitFor(() => expect(screen.getByText('Greetings, world')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Accept'))
    expect(editor.getText()).toContain('Greetings, world')
    editor.destroy()
  })

  it('does not run when selection is empty even with instruction text', () => {
    const editor = new Editor({ extensions: [StarterKit], content: '<p>Hello world</p>' })
    editor.commands.setTextSelection({ from: 1, to: 1 })
    const spy = vi.spyOn(aiClient.aiApi, 'customTone').mockClear()
    render(<AiToneModal open={true} onClose={() => {}} editor={editor} />)

    fireEvent.change(screen.getByPlaceholderText(/rewrite as/i), { target: { value: 'formal' } })
    fireEvent.click(screen.getByText('Apply to selection'))

    expect(spy).not.toHaveBeenCalled()
    editor.destroy()
  })

  it('aborts the in-flight stream when unmounted before it finishes', async () => {
    const abortSpy = vi.fn()
    async function* fakeStream(_req: unknown, signal: AbortSignal) {
      signal.addEventListener('abort', abortSpy)
      yield JSON.stringify({ type: 'token', delta: 'Greetings' })
      await new Promise(() => {})
    }
    vi.spyOn(aiClient.aiApi, 'customTone').mockImplementation(fakeStream as any)
    const editor = makeEditorWithSelection()
    const { unmount } = render(<AiToneModal open={true} onClose={() => {}} editor={editor} />)

    fireEvent.change(screen.getByPlaceholderText(/rewrite as/i), { target: { value: 'formal' } })
    fireEvent.click(screen.getByText('Apply to selection'))
    await waitFor(() => expect(screen.getByText('Greetings')).toBeInTheDocument())

    unmount()

    expect(abortSpy).toHaveBeenCalledTimes(1)
    editor.destroy()
  })

  it('aborts the in-flight stream when closed before it finishes', async () => {
    const abortSpy = vi.fn()
    async function* fakeStream(_req: unknown, signal: AbortSignal) {
      signal.addEventListener('abort', abortSpy)
      yield JSON.stringify({ type: 'token', delta: 'Greetings' })
      await new Promise(() => {})
    }
    vi.spyOn(aiClient.aiApi, 'customTone').mockImplementation(fakeStream as any)
    const editor = makeEditorWithSelection()
    const { rerender } = render(<AiToneModal open={true} onClose={() => {}} editor={editor} />)

    fireEvent.change(screen.getByPlaceholderText(/rewrite as/i), { target: { value: 'formal' } })
    fireEvent.click(screen.getByText('Apply to selection'))
    await waitFor(() => expect(screen.getByText('Greetings')).toBeInTheDocument())

    rerender(<AiToneModal open={false} onClose={() => {}} editor={editor} />)

    expect(abortSpy).toHaveBeenCalledTimes(1)
    editor.destroy()
    cleanup()
  })
})
