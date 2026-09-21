import { describe, it, expect, vi } from 'vitest'
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
    expect(screen.getByTitle('Spark AI features')).toBeInTheDocument()
    editor.destroy()
  })

  it('shows features with section chevrons at the end', () => {
    const editor = makeEditor()
    render(<AiDropdown editor={editor} />)
    fireEvent.mouseDown(screen.getByTitle('Spark AI features'))

    expect(screen.getByText('Autocomplete')).toBeInTheDocument()
    expect(screen.getByText('Spelling')).toBeInTheDocument()
    expect(screen.getByText('Grammar')).toBeInTheDocument()
    expect(screen.getAllByRole('switch')).toHaveLength(3)
    expect(screen.getByRole('switch', { name: 'Spelling' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('switch', { name: 'Grammar' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText('Features')).toBeInTheDocument()
    expect(screen.getByText('Improve')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Explain', expanded: false })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Suggestions', expanded: false })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Translate', expanded: false })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tone', expanded: false })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Summarize', expanded: false })).toBeInTheDocument()
    expect(screen.getByText('Glossary')).toBeInTheDocument()
    expect(screen.getByText('Against brief')).toBeInTheDocument()
    expect(screen.getByText('Draft')).toBeInTheDocument()
    expect(screen.getByText('Ask')).toBeInTheDocument()
    expect(screen.getByText('Analytics')).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Analytics', expanded: false }))
    expect(screen.getByText('Spark Chart')).toBeInTheDocument()
    expect(screen.getAllByText('New').length).toBeGreaterThanOrEqual(3)
    expect(screen.getByText('Upcoming')).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Upcoming', expanded: false }))
    expect(screen.getByText('Accurate dictation')).toBeInTheDocument()
    expect(screen.getByText('Hybrid project RAG')).toBeInTheDocument()
    expect(screen.getAllByText('Soon').length).toBeGreaterThan(0)
    expect(
      screen.getByRole('button', {
        name: /What: Push-to-talk mic that inserts speech at the cursor/,
      }),
    ).toBeInTheDocument()

    expect(screen.queryByText('Heading')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Improve' })).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: /What: Polishes grammar, clarity, and flow of the selected text\./,
      }),
    ).toBeInTheDocument()
    editor.destroy()
  })

  it('puts info on features, not section titles', () => {
    const editor = makeEditor()
    render(<AiDropdown editor={editor} />)
    fireEvent.mouseDown(screen.getByTitle('Spark AI features'))

    const section = screen.getByRole('button', { name: 'Suggestions', expanded: false })
    expect(section.querySelector('svg')).toBeTruthy()
    fireEvent.mouseDown(section)

    const headingInfo = screen.getByRole('button', {
      name: /What: Suggests a title and inserts it above the selected paragraph\./,
    })
    fireEvent.mouseEnter(headingInfo)
    const tip = screen.getByRole('tooltip')
    expect(tip).toHaveTextContent('What')
    expect(tip).toHaveTextContent('How to use')
    editor.destroy()
  })

  it('toggles autocomplete', () => {
    const editor = makeEditor()
    render(<AiDropdown editor={editor} />)
    fireEvent.mouseDown(screen.getByTitle('Spark AI features'))

    const toggle = screen.getByRole('switch', { name: 'Autocomplete' })
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-checked', 'true')
    editor.destroy()
  })

  it('enables spelling and grammar only when toggled on', () => {
    const editor = makeEditor()
    render(<AiDropdown editor={editor} />)
    fireEvent.mouseDown(screen.getByTitle('Spark AI features'))

    const spelling = screen.getByRole('switch', { name: 'Spelling' })
    const grammar = screen.getByRole('switch', { name: 'Grammar' })
    expect(spelling).toHaveAttribute('aria-checked', 'false')
    expect(grammar).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(spelling)
    fireEvent.click(grammar)
    expect(spelling).toHaveAttribute('aria-checked', 'true')
    expect(grammar).toHaveAttribute('aria-checked', 'true')
    editor.destroy()
  })

  it('shows Sentence and Para when autocomplete is on', async () => {
    const { useAiStore } = await import('@/lib/store/use-ai-store')
    useAiStore.setState({ autocompleteEnabled: false, autocompleteScope: 'sentence' })
    const editor = makeEditor()
    render(<AiDropdown editor={editor} />)
    fireEvent.mouseDown(screen.getByTitle('Spark AI features'))

    expect(screen.queryByText('Sentence')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('switch', { name: 'Autocomplete' }))
    expect(screen.queryByText('Word')).not.toBeInTheDocument()
    expect(screen.getByText('Sentence')).toBeInTheDocument()
    expect(screen.getByText('Para')).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByText('Para'))
    expect(useAiStore.getState().autocompleteScope).toBe('paragraph')
    editor.destroy()
  })
})

describe('openDraftAnything event', () => {
  it('is dispatched when openDraftAnything is called', async () => {
    const { openDraftAnything, OPEN_DRAFT_ANYTHING_EVENT } = await import('@/lib/editor/ai/draft/draft-anything-events')
    const spy = vi.fn()
    window.addEventListener(OPEN_DRAFT_ANYTHING_EVENT, spy)
    openDraftAnything()
    expect(spy).toHaveBeenCalledTimes(1)
    window.removeEventListener(OPEN_DRAFT_ANYTHING_EVENT, spy)
  })
})
