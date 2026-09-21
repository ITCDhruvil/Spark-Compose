import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { AiDraftAnythingCard } from './ai-draft-anything-card'
import * as aiClient from '@/lib/api/ai-client'

function makeEditor() {
  return new Editor({ extensions: [StarterKit], content: '<p></p>' })
}

describe('AiDraftAnythingCard', () => {
  it('disables Generate draft until audience and topic are filled', () => {
    const editor = makeEditor()
    render(<AiDraftAnythingCard open={true} onClose={() => {}} editor={editor} />)
    expect(screen.getByText('Generate draft')).toBeDisabled()
    expect(screen.getByText('Draft Anything')).toBeInTheDocument()
    editor.destroy()
  })

  it('calls constructionDraft with form values and shows Insert draft on success', async () => {
    vi.spyOn(aiClient.aiApi, 'constructionDraft').mockResolvedValue({
      lexicalJson: {
        root: {
          type: 'root', version: 1, direction: 'ltr', format: '', indent: 0,
          children: [
            {
              type: 'paragraph', version: 1, direction: 'ltr', format: '', indent: 0,
              children: [{ type: 'text', version: 1, text: 'Generated body', format: 0, detail: 0, mode: 'normal', style: '' }],
            },
          ],
        },
      },
      warnings: [],
    })
    const editor = makeEditor()
    render(<AiDraftAnythingCard open={true} onClose={() => {}} editor={editor} />)

    fireEvent.change(screen.getByPlaceholderText(/who is this for/i), { target: { value: 'Engineers' } })
    fireEvent.change(screen.getByPlaceholderText(/what should the draft cover/i), { target: { value: 'Rust ownership' } })
    fireEvent.click(screen.getByText('Generate draft'))

    await waitFor(() => expect(screen.getByText('Insert draft')).toBeInTheDocument())
    expect(aiClient.aiApi.constructionDraft).toHaveBeenCalledWith(
      expect.objectContaining({ audience: 'Engineers', topic: 'Rust ownership' }),
    )
    editor.destroy()
  })

  it('applies the generated draft as real Tiptap content on Insert draft click', async () => {
    vi.spyOn(aiClient.aiApi, 'constructionDraft').mockResolvedValue({
      lexicalJson: {
        root: {
          type: 'root', version: 1, direction: 'ltr', format: '', indent: 0,
          children: [
            {
              type: 'paragraph', version: 1, direction: 'ltr', format: '', indent: 0,
              children: [{ type: 'text', version: 1, text: 'Generated body', format: 0, detail: 0, mode: 'normal', style: '' }],
            },
          ],
        },
      },
      warnings: [],
    })
    const editor = makeEditor()
    render(<AiDraftAnythingCard open={true} onClose={() => {}} editor={editor} />)

    fireEvent.change(screen.getByPlaceholderText(/who is this for/i), { target: { value: 'Engineers' } })
    fireEvent.change(screen.getByPlaceholderText(/what should the draft cover/i), { target: { value: 'Rust ownership' } })
    fireEvent.click(screen.getByText('Generate draft'))

    await waitFor(() => screen.getByText('Insert draft'))
    fireEvent.click(screen.getByText('Insert draft'))

    expect(editor.getText()).toContain('Generated body')
    editor.destroy()
  })

  it('shows Try sample control for sample form and photo', () => {
    const editor = makeEditor()
    render(<AiDraftAnythingCard open={true} onClose={() => {}} editor={editor} />)
    expect(screen.getByText(/try sample/i)).toBeInTheDocument()
    editor.destroy()
  })

  it('shows an error message when generation fails', async () => {
    vi.spyOn(aiClient.aiApi, 'constructionDraft').mockRejectedValue(
      new aiClient.APIError(500, 'Server error'),
    )
    const editor = makeEditor()
    render(<AiDraftAnythingCard open={true} onClose={() => {}} editor={editor} />)

    fireEvent.change(screen.getByPlaceholderText(/who is this for/i), { target: { value: 'Engineers' } })
    fireEvent.change(screen.getByPlaceholderText(/what should the draft cover/i), { target: { value: 'Rust ownership' } })
    fireEvent.click(screen.getByText('Generate draft'))

    await waitFor(() => expect(screen.getByText('Server error')).toBeInTheDocument())
    expect(screen.queryByText('Insert draft')).not.toBeInTheDocument()
    editor.destroy()
  })
})
