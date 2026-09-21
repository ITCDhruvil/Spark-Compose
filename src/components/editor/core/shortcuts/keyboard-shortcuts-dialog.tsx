'use client'

import { Dialog } from '@/shared/ui/dialog'
import { EDITOR_SHORTCUTS } from '../toolbar/editor-constants'

interface KeyboardShortcutsDialogProps {
  open: boolean
  onClose: () => void
}

export function KeyboardShortcutsDialog({ open, onClose }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Keyboard shortcuts" className="max-w-md">
      <div className="space-y-1 max-h-[60vh] overflow-y-auto">
        {EDITOR_SHORTCUTS.map(({ keys, action }) => (
          <div key={keys} className="flex items-center justify-between gap-4 py-1.5 border-b border-border/50 last:border-0">
            <span className="text-sm text-muted-foreground">{action}</span>
            <kbd className="text-xs font-mono bg-muted px-2 py-0.5 rounded border shrink-0">{keys}</kbd>
          </div>
        ))}
      </div>
    </Dialog>
  )
}
