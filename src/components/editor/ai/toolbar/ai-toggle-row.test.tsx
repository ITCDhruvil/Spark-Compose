import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AiToggleRow } from './ai-toggle-row'

describe('AiToggleRow', () => {
  it('renders label and reflects checked state', () => {
    render(<AiToggleRow label="Autocomplete" checked={true} onChange={() => {}} />)
    expect(screen.getByText('Autocomplete')).toBeInTheDocument()
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('calls onChange with inverted value when toggled', () => {
    const onChange = vi.fn()
    render(<AiToggleRow label="Improve doc" checked={false} onChange={onChange} />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('renders an inline action button when actionLabel is provided', () => {
    const onAction = vi.fn()
    render(
      <AiToggleRow
        label="Improve doc"
        checked={true}
        onChange={() => {}}
        actionLabel="Run improve"
        onAction={onAction}
      />,
    )
    fireEvent.click(screen.getByText('Run improve'))
    expect(onAction).toHaveBeenCalled()
  })

  it('disables the action button when actionDisabled is true', () => {
    render(
      <AiToggleRow
        label="Improve doc"
        checked={true}
        onChange={() => {}}
        actionLabel="Run improve"
        onAction={() => {}}
        actionDisabled
      />,
    )
    expect(screen.getByText('Run improve')).toBeDisabled()
  })
})
