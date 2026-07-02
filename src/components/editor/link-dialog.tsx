'use client'

import { useEffect, useState } from 'react'
import { Dialog } from '@/components/ui/dialog'

interface LinkDialogProps {
  open: boolean
  onClose: () => void
  initialUrl?: string
  initialText?: string
  onSubmit: (url: string, text?: string) => void
  onRemove?: () => void
}

export function LinkDialog({
  open, onClose, initialUrl = '', initialText = '', onSubmit, onRemove,
}: LinkDialogProps) {
  const [url, setUrl] = useState(initialUrl)
  const [text, setText] = useState(initialText)

  useEffect(() => {
    if (open) {
      setUrl(initialUrl)
      setText(initialText)
    }
  }, [open, initialUrl, initialText])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return
    onSubmit(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`, text.trim() || undefined)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Insert link">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">URL</label>
          <input
            autoFocus
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Display text (optional)</label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Link label"
            className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          <div>
            {onRemove && initialUrl && (
              <button
                type="button"
                onClick={() => { onRemove(); onClose() }}
                className="text-sm text-destructive hover:underline"
              >
                Remove link
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted">
              Cancel
            </button>
            <button type="submit" className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90">
              Apply
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  )
}
