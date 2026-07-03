import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { AiOutlineSubmenu } from './ai-submenu-outline'
import * as aiClient from '@/lib/api/ai-client'

function makeEditor() {
  return new Editor({ extensions: [StarterKit], content: '<p>Intro text.</p>' })
}

describe('AiOutlineSubmenu', () => {
  it('renders Suggest headings button', () => {
    const editor = makeEditor()
    render(<AiOutlineSubmenu editor={editor} />)
    expect(screen.getByText('Suggest headings')).toBeInTheDocument()
    editor.destroy()
  })

  it('fetches and lists suggested headings, inserting on click', async () => {
    vi.spyOn(aiClient.aiApi, 'outline').mockResolvedValue({
      headings: [{ level: 2, text: 'Background' }],
    })
    const editor = makeEditor()
    render(<AiOutlineSubmenu editor={editor} />)

    fireEvent.click(screen.getByText('Suggest headings'))

    await waitFor(() => expect(screen.getByText('Background')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Insert'))
    expect(editor.getHTML()).toContain('Background')
    editor.destroy()
  })
})
