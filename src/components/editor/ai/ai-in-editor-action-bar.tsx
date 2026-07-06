'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Undo2 } from 'lucide-react'
import { ConfirmButton } from '@/components/ui/confirm-button'
import { CancelButton } from '@/components/ui/cancel-button'

interface AiInEditorActionBarProps {
  open: boolean
  status: 'generating' | 'pending' | 'undo'
  position: { top: number; left: number } | null
  generatingLabel?: string
  undoSeconds?: number
  onConfirm: () => void
  onCancel: () => void
  onUndo?: () => void
}

export function AiInEditorActionBar({
  open,
  status,
  position,
  undoSeconds = 0,
  onConfirm,
  onCancel,
  onUndo,
}: AiInEditorActionBarProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!open || !mounted || !position) return null
  if (status !== 'pending' && status !== 'undo') return null

  return createPortal(
    <div
      className="fixed z-[10000] flex items-center gap-1.5 rounded-lg border border-border bg-popover px-2 py-1.5 shadow-lg pointer-events-auto"
      style={{ top: position.top, left: position.left }}
      role="toolbar"
      aria-label="AI edit actions"
    >
      {status === 'undo' ? (
        <>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onUndo?.() }}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border border-border bg-background hover:bg-muted transition-colors"
            title="Undo and restore original"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Undo
          </button>
          <span
            className="tabular-nums text-xs font-medium text-muted-foreground min-w-[1.75rem] text-center"
            aria-live="polite"
          >
            {undoSeconds}s
          </span>
        </>
      ) : (
        <>
          <ConfirmButton onClick={onConfirm} title="Keep new content and remove original" />
          <CancelButton onClick={onCancel} title="Discard new content" />
        </>
      )}
    </div>,
    document.body,
  )
}
