'use client'

interface AutosaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error'
}

export function AutosaveIndicator({ status }: AutosaveIndicatorProps) {
  const config = {
    idle: { text: 'Saved just now', className: 'text-green-600 dark:text-green-400' },
    saving: { text: 'Saving...', className: 'text-muted-foreground' },
    saved: { text: 'Saved just now', className: 'text-green-600 dark:text-green-400' },
    error: { text: 'Save failed', className: 'text-destructive' },
  }[status]

  return (
    <span className={`text-xs shrink-0 ${config.className} transition-all`}>
      {config.text}
    </span>
  )
}
