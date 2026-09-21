'use client'

import type { LucideIcon } from 'lucide-react'

interface AiToggleRowProps {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
  actionLabel?: string
  onAction?: () => void
  actionDisabled?: boolean
  icon?: LucideIcon
}

export function AiToggleRow({
  label,
  description,
  checked,
  onChange,
  actionLabel,
  onAction,
  actionDisabled,
  icon: Icon,
}: AiToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-3 hover:bg-muted/40 transition-colors">
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        {Icon && (
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="w-3.5 h-3.5" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-none">{label}</p>
          {description && <p className="text-xs text-muted-foreground mt-1 leading-snug">{description}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            disabled={actionDisabled}
            className="text-xs font-medium px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.97] transition disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {actionLabel}
          </button>
        )}
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${checked ? 'bg-primary' : 'bg-muted-foreground/25'}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'}`}
          />
        </button>
      </div>
    </div>
  )
}
