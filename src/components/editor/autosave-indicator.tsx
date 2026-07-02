'use client'

interface AutosaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error'
}

export function AutosaveIndicator({ status }: AutosaveIndicatorProps) {
  if (status === 'idle') return null

  const config = {
    saving: { text: 'Saving...', className: 'text-muted-foreground' },
    saved: { text: 'Saved just now', className: 'text-green-600 dark:text-green-400' },
    error: { text: 'Save failed', className: 'text-destructive' },
  }[status]

  return (
    <span className={`text-xs ${config.className} transition-all`}>
      {config.text}
    </span>
  )
}
