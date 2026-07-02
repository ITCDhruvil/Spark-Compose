'use client'

import { useEffect, useState } from 'react'
import { Dialog } from '@/components/ui/dialog'

interface CommentDialogProps {
  open: boolean
  onClose: () => void
  initialText?: string
  author?: string
  onSubmit: (text: string) => void
  onRemove?: () => void
}

export function CommentDialog({
  open, onClose, initialText = '', author, onSubmit, onRemove,
}: CommentDialogProps) {
  const [text, setText] = useState(initialText)

  useEffect(() => {
    if (open) setText(initialText)
  }, [open, initialText])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    onSubmit(trimmed)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Comment on selection" className="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {author && <p className="text-xs text-muted-foreground">Comment by {author}</p>}
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="Add a note about this selection…"
          className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
        />
        <div className="flex items-center justify-between gap-2">
          <div>
            {onRemove && initialText && (
              <button type="button" onClick={() => { onRemove(); onClose() }} className="text-sm text-destructive hover:underline">
                Remove comment
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted">Cancel</button>
            <button type="submit" className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90">Save</button>
          </div>
        </div>
      </form>
    </Dialog>
  )
}
