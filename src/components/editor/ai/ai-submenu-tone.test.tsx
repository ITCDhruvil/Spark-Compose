import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { AiToneSubmenu } from './ai-submenu-tone'
import * as aiClient from '@/lib/api/ai-client'

function makeEditor() {
  return new Editor({ extensions: [StarterKit], content: '<p>Hello world</p>' })
}

describe('AiToneSubmenu', () => {
  it('renders searchable tone options', () => {
    const editor = makeEditor()
    render(<AiToneSubmenu editor={editor} />)
    expect(screen.getByText('Tone & prompts')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/search tones/i)).toBeInTheDocument()
    expect(screen.getByText('Professional')).toBeInTheDocument()
    expect(screen.getByText('Simplify')).toBeInTheDocument()
    editor.destroy()
  })

  it('streams rewrite into the editor and offers confirm/cancel', async () => {
    async function* fakeStream() {
      yield JSON.stringify({ type: 'token', delta: 'Greetings, world' })
    }
    const spy = vi.spyOn(aiClient.aiApi, 'customTone').mockReturnValue(fakeStream())
    const editor = makeEditor()
    editor.commands.selectAll()
    render(<AiToneSubmenu editor={editor} />)

    fireEvent.click(screen.getByText('Professional'))

    await waitFor(() => expect(spy).toHaveBeenCalled())
    expect(spy.mock.calls[0][0].tone).toContain('professional')
    await waitFor(() => expect(screen.getByText('Confirm')).toBeInTheDocument())
    expect(editor.getText()).toContain('Greetings, world')
    editor.destroy()
  })
})
