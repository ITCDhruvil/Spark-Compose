import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AiSuggestHeadingSubmenu } from './ai-submenu-suggest-heading'

describe('AiSuggestHeadingSubmenu', () => {
  it('asks to select a paragraph when nothing is selected', () => {
    render(
      <AiSuggestHeadingSubmenu
        hasSelection={false}
        status="idle"
        onSuggest={() => {}}
      />,
    )
    expect(screen.getByText(/select a paragraph/i)).toBeInTheDocument()
  })

  it('lists suggest options when selection exists', () => {
    const onSuggest = vi.fn()
    render(
      <AiSuggestHeadingSubmenu
        hasSelection
        status="idle"
        onSuggest={onSuggest}
      />,
    )
    fireEvent.click(screen.getByText('Heading'))
    expect(onSuggest).toHaveBeenCalledWith('heading')
    fireEvent.click(screen.getByText('Bullet points'))
    expect(onSuggest).toHaveBeenCalledWith('bulletList')
    fireEvent.click(screen.getByText('Check box'))
    expect(onSuggest).toHaveBeenCalledWith('taskList')
  })
})
