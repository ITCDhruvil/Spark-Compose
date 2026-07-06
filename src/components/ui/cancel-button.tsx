'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CancelButtonProps {
  onClick: () => void
  children?: React.ReactNode
  title?: string
  disabled?: boolean
  className?: string
  /** Hide the default X icon */
  hideIcon?: boolean
}

export function CancelButton({
  onClick,
  children = 'Cancel',
  title = 'Cancel',
  disabled,
  className,
  hideIcon,
}: CancelButtonProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium transition-colors disabled:opacity-40 shrink-0',
        'border border-border bg-background text-foreground',
        'hover:border-red-500 hover:text-red-600 hover:bg-red-50',
        'dark:hover:border-red-500 dark:hover:text-red-400 dark:hover:bg-red-950/40',
        className,
      )}
    >
      {!hideIcon && <X className="w-3.5 h-3.5" />}
      {children}
    </button>
  )
}
