import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
})
