import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { AiConstructionModal } from './ai-modal-construction'
import * as aiClient from '@/lib/api/ai-client'

function makeEditor() {
  return new Editor({ extensions: [StarterKit], content: '<p></p>' })
}

describe('AiConstructionModal', () => {
  it('disables Generate draft until audience and topic are filled', () => {
    const editor = makeEditor()
    render(<AiConstructionModal open={true} onClose={() => {}} editor={editor} />)
    expect(screen.getByText('Generate draft')).toBeDisabled()
    editor.destroy()
  })

  it('calls constructionDraft with form values and shows Apply/Discard on success', async () => {
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
    render(<AiConstructionModal open={true} onClose={() => {}} editor={editor} />)

    fireEvent.change(screen.getByPlaceholderText(/audience/i), { target: { value: 'Engineers' } })
    fireEvent.change(screen.getByPlaceholderText(/topic/i), { target: { value: 'Rust ownership' } })
    fireEvent.click(screen.getByText('Generate draft'))

    await waitFor(() => expect(screen.getByText('Apply')).toBeInTheDocument())
    expect(aiClient.aiApi.constructionDraft).toHaveBeenCalledWith(
      expect.objectContaining({ audience: 'Engineers', topic: 'Rust ownership' }),
    )
    editor.destroy()
  })

  it('applies the generated draft as real Tiptap content on Apply click', async () => {
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
    render(<AiConstructionModal open={true} onClose={() => {}} editor={editor} />)

    fireEvent.change(screen.getByPlaceholderText(/audience/i), { target: { value: 'Engineers' } })
    fireEvent.change(screen.getByPlaceholderText(/topic/i), { target: { value: 'Rust ownership' } })
    fireEvent.click(screen.getByText('Generate draft'))

    await waitFor(() => screen.getByText('Apply'))
    fireEvent.click(screen.getByText('Apply'))

    expect(editor.getText()).toContain('Generated body')
    editor.destroy()
  })

  it('shows warnings returned by the backend', async () => {
    vi.spyOn(aiClient.aiApi, 'constructionDraft').mockResolvedValue({
      lexicalJson: { root: { type: 'root', version: 1, direction: 'ltr', format: '', indent: 0, children: [] } },
      warnings: ['Reference document could not be parsed'],
    })
    const editor = makeEditor()
    render(<AiConstructionModal open={true} onClose={() => {}} editor={editor} />)

    fireEvent.change(screen.getByPlaceholderText(/audience/i), { target: { value: 'Engineers' } })
    fireEvent.change(screen.getByPlaceholderText(/topic/i), { target: { value: 'Rust ownership' } })
    fireEvent.click(screen.getByText('Generate draft'))

    await waitFor(() => expect(screen.getByText('Reference document could not be parsed')).toBeInTheDocument())
    editor.destroy()
  })

  it('discards the preview and returns to idle state', async () => {
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
    render(<AiConstructionModal open={true} onClose={() => {}} editor={editor} />)

    fireEvent.change(screen.getByPlaceholderText(/audience/i), { target: { value: 'Engineers' } })
    fireEvent.change(screen.getByPlaceholderText(/topic/i), { target: { value: 'Rust ownership' } })
    fireEvent.click(screen.getByText('Generate draft'))

    await waitFor(() => screen.getByText('Discard'))
    fireEvent.click(screen.getByText('Discard'))

    expect(screen.queryByText('Apply')).not.toBeInTheDocument()
    expect(editor.getText()).not.toContain('Generated body')
    editor.destroy()
  })

  it('suppresses the placement-hint field when Let AI decide is checked', () => {
    const editor = makeEditor()
    render(<AiConstructionModal open={true} onClose={() => {}} editor={editor} />)

    expect(screen.getByPlaceholderText(/placement notes/i)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Let AI decide'))
    expect(screen.queryByPlaceholderText(/placement notes/i)).not.toBeInTheDocument()
    editor.destroy()
  })

  it('shows an error message when generation fails', async () => {
    vi.spyOn(aiClient.aiApi, 'constructionDraft').mockRejectedValue(
      new aiClient.APIError(500, 'Server error'),
    )
    const editor = makeEditor()
    render(<AiConstructionModal open={true} onClose={() => {}} editor={editor} />)

    fireEvent.change(screen.getByPlaceholderText(/audience/i), { target: { value: 'Engineers' } })
    fireEvent.change(screen.getByPlaceholderText(/topic/i), { target: { value: 'Rust ownership' } })
    fireEvent.click(screen.getByText('Generate draft'))

    await waitFor(() => expect(screen.getByText('Server error')).toBeInTheDocument())
    expect(screen.queryByText('Apply')).not.toBeInTheDocument()
    editor.destroy()
  })
})
