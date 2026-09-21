'use client'

import { useEffect, useState } from 'react'
import { Dialog } from '@/shared/ui/dialog'

interface EmbedDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (url: string) => void
}

export function EmbedDialog({ open, onClose, onSubmit }: EmbedDialogProps) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setUrl('')
      setError('')
    }
  }, [open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return
    if (!/(youtube\.com|youtu\.be|vimeo\.com)/i.test(trimmed)) {
      setError('Enter a valid YouTube or Vimeo URL')
      return
    }
    onSubmit(trimmed)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Embed video" className="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Video URL</label>
          <input
            autoFocus
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError('') }}
            placeholder="https://www.youtube.com/watch?v=…"
            className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground">Supports YouTube and Vimeo links.</p>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted">Cancel</button>
          <button type="submit" className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90">Embed</button>
        </div>
      </form>
    </Dialog>
  )
}
