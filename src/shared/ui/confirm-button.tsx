'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfirmButtonProps {
  onClick: () => void
  children?: React.ReactNode
  title?: string
  disabled?: boolean
  className?: string
  /** Hide the default check icon */
  hideIcon?: boolean
}

export function ConfirmButton({
  onClick,
  children = 'Confirm',
  title = 'Confirm',
  disabled,
  className,
  hideIcon,
}: ConfirmButtonProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium transition-colors disabled:opacity-40 shrink-0',
        'border border-primary/30 bg-primary/10 text-primary',
        'hover:bg-primary hover:text-primary-foreground hover:border-primary',
        className,
      )}
    >
      {!hideIcon && <Check className="w-3.5 h-3.5" />}
      {children}
    </button>
  )
}
