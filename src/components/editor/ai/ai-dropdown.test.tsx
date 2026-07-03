import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { AiDropdown } from './ai-dropdown'

function makeEditor() {
  return new Editor({ extensions: [StarterKit], content: '<p>Hello</p>' })
}

describe('AiDropdown', () => {
  it('renders an AI trigger button', () => {
    const editor = makeEditor()
    render(<AiDropdown editor={editor} />)
    expect(screen.getByTitle('AI features')).toBeInTheDocument()
    editor.destroy()
  })

  it('opens the popover listing all 7 feature rows on click', () => {
    const editor = makeEditor()
    render(<AiDropdown editor={editor} />)
    fireEvent.click(screen.getByTitle('AI features'))

    expect(screen.getByText('Autocomplete')).toBeInTheDocument()
    expect(screen.getByText('Improve doc')).toBeInTheDocument()
    expect(screen.getByText('Summarize')).toBeInTheDocument()
    expect(screen.getByText('Outline')).toBeInTheDocument()
    expect(screen.getByText('Translate')).toBeInTheDocument()
    expect(screen.getByText('Custom tone')).toBeInTheDocument()
    expect(screen.getByText('Construction draft')).toBeInTheDocument()
    editor.destroy()
  })

  it('opens the Translate modal when its row is clicked', () => {
    const editor = makeEditor()
    render(<AiDropdown editor={editor} />)
    fireEvent.click(screen.getByTitle('AI features'))
    fireEvent.click(screen.getByText('Translate'))
    expect(screen.getAllByText('Translate').length).toBeGreaterThan(1)
    editor.destroy()
  })

  it('opens the Construction draft modal when its row is clicked', () => {
    const editor = makeEditor()
    render(<AiDropdown editor={editor} />)
    fireEvent.click(screen.getByTitle('AI features'))
    fireEvent.click(screen.getByText('Construction draft'))
    expect(screen.getByPlaceholderText(/topic/i)).toBeInTheDocument()
    editor.destroy()
  })
})
