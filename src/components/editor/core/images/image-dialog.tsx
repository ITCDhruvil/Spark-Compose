'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { Dialog } from '@/shared/ui/dialog'
import { IMAGE_WIDTHS } from '../toolbar/editor-constants'
import type { ImageAlign } from '../images/extensions/resizable-image'

interface ImageDialogProps {
  open: boolean
  onClose: () => void
  mode?: 'insert' | 'edit'
  initialUrl?: string
  initialCaption?: string
  initialWidth?: string
  initialAlign?: ImageAlign
  onSubmit: (data: { src: string; caption?: string; width?: string; align?: ImageAlign }) => void
  onUpload?: (file: File) => Promise<string>
}

export function ImageDialog({
  open,
  onClose,
  mode = 'insert',
  initialUrl = '',
  initialCaption = '',
  initialWidth = '100',
  initialAlign = 'center',
  onSubmit,
  onUpload,
}: ImageDialogProps) {
  const [url, setUrl] = useState(initialUrl)
  const [caption, setCaption] = useState(initialCaption)
  const [width, setWidth] = useState(initialWidth)
  const [align, setAlign] = useState<ImageAlign>(initialAlign)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setUrl(initialUrl)
      setCaption(initialCaption)
      setWidth(initialWidth)
      setAlign(initialAlign)
      setError('')
    }
  }, [open, initialUrl, initialCaption, initialWidth, initialAlign])

  const handleFile = async (file: File | null) => {
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const src = onUpload ? await onUpload(file) : await readLocal(file)
      setUrl(src)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const src = url.trim()
    if (!src) return
    onSubmit({ src, caption: caption.trim() || undefined, width, align })
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title={mode === 'edit' ? 'Edit image' : 'Insert image'} className="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Image URL</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://… or upload a file"
            className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm hover:bg-muted disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'Uploading…' : url ? 'Replace image' : 'Upload image'}
            </button>
          </div>

          {url ? (
            <div className="rounded-lg border bg-muted/20 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Upload preview" className="max-h-48 w-full object-contain bg-background" />
              <div className="px-3 py-2 border-t flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Image ready</p>
                <p className="text-[11px] text-muted-foreground truncate max-w-[70%]" title={url}>
                  {url.startsWith('data:') ? 'Local preview' : url}
                </p>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-8 text-center hover:bg-muted/40 transition-colors disabled:opacity-50"
            >
              <Upload className="w-7 h-7 text-muted-foreground" />
              <span className="text-xs font-medium">Click to upload an image</span>
              <span className="text-[11px] text-muted-foreground">Preview appears here after upload</span>
            </button>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Width</label>
            <select
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              className="w-full px-3 py-2 rounded-md border bg-background text-sm"
            >
              {IMAGE_WIDTHS.map((w) => (
                <option key={w.value} value={w.value}>{w.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Alignment</label>
            <select
              value={align}
              onChange={(e) => setAlign(e.target.value as ImageAlign)}
              className="w-full px-3 py-2 rounded-md border bg-background text-sm"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Caption / alt text</label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Describe the image"
            className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted">
            Cancel
          </button>
          <button type="submit" disabled={!url.trim() || uploading} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-50">
            {mode === 'edit' ? 'Update' : 'Insert'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}

async function readLocal(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}
