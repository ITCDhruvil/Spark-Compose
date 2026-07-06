'use client'

import { Lightbulb } from 'lucide-react'
import { SUGGEST_OPTIONS, type SuggestBlockStatus, type SuggestMenuKind } from './use-suggest-block'

interface AiSuggestSubmenuProps {
  hasSelection: boolean
  status: SuggestBlockStatus
  onSuggest: (kind: SuggestMenuKind) => void
}

export function AiSuggestHeadingSubmenu({
  hasSelection,
  status,
  onSuggest,
}: AiSuggestSubmenuProps) {
  const busy = status === 'running' || status === 'pending' || status === 'undo'

  return (
    <div className="px-3 py-2.5">
      <p className="text-sm font-medium mb-2 inline-flex items-center gap-1.5">
        <Lightbulb className="w-3.5 h-3.5 text-primary" />
        Suggest
      </p>
      <div className="flex flex-col gap-1">
        {SUGGEST_OPTIONS.map((opt) => {
          const needsSelection = opt.kind !== 'auto'
          const disabled = busy || (needsSelection && !hasSelection)
          return (
            <button
              key={opt.kind}
              type="button"
              onClick={() => onSuggest(opt.kind)}
              disabled={disabled}
              className="w-full text-left text-xs px-2.5 py-1.5 rounded-md border hover:bg-muted disabled:opacity-50"
            >
              <span className="font-medium">{opt.label}</span>
              <span className="block text-[10px] text-muted-foreground">{opt.description}</span>
              {opt.kind === 'auto' && (
                <span className="mt-1 block rounded bg-muted px-1.5 py-0.5 text-[10px] leading-snug text-muted-foreground">
                  Note: runs on the full document, not only the selected text.
                </span>
              )}
            </button>
          )
        })}
      </div>
      {!hasSelection && (
        <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
          Select a paragraph for Heading, lists, and other options. Auto works on the full document.
        </p>
      )}
      {status === 'pending' && (
        <p className="mt-2 text-[11px] text-muted-foreground">Confirm or cancel below the insert.</p>
      )}
    </div>
  )
}
