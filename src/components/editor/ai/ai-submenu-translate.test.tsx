import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { AiTranslateSubmenu } from './ai-submenu-translate'
import * as aiClient from '@/lib/api/ai-client'

function makeEditor() {
  return new Editor({ extensions: [StarterKit], content: '<p>Hello world</p>' })
}

describe('AiTranslateSubmenu', () => {
  it('renders language list with English first', () => {
    const editor = makeEditor()
    render(<AiTranslateSubmenu editor={editor} />)
    expect(screen.getByText('Translate')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/search languages/i)).toBeInTheDocument()
    expect(screen.getByText('English')).toBeInTheDocument()
    editor.destroy()
  })

  it('streams translation into the editor and offers confirm/cancel', async () => {
    async function* fakeStream() {
      yield JSON.stringify({ type: 'token', delta: 'Hola mundo' })
    }
    const spy = vi.spyOn(aiClient.aiApi, 'translate').mockReturnValue(fakeStream())
    const editor = makeEditor()
    editor.commands.selectAll()
    render(<AiTranslateSubmenu editor={editor} />)

    fireEvent.click(screen.getByText('Spanish'))

    await waitFor(() => expect(spy).toHaveBeenCalled())
    expect(spy.mock.calls[0][0].targetLang).toBe('Spanish')
    await waitFor(() => expect(screen.getByText('Confirm')).toBeInTheDocument())
    expect(editor.getText()).toContain('Hola mundo')
    editor.destroy()
  })
})
