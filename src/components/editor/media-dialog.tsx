'use client'

import { ImageIcon, Video } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'

interface MediaDialogProps {
  open: boolean
  onClose: () => void
  onInsertImage: () => void
  onEmbedVideo: () => void
}

const OPTIONS = [
  {
    id: 'image',
    title: 'Image',
    description: 'Upload or paste an image URL',
    icon: ImageIcon,
  },
  {
    id: 'video',
    title: 'Video',
    description: 'Embed YouTube or Vimeo',
    icon: Video,
  },
] as const

export function MediaDialog({
  open,
  onClose,
  onInsertImage,
  onEmbedVideo,
}: MediaDialogProps) {
  const pick = (id: 'image' | 'video') => {
    onClose()
    // Let the media dialog unmount before opening the next one
    requestAnimationFrame(() => {
      if (id === 'image') onInsertImage()
      else onEmbedVideo()
    })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Insert media"
      description="Choose what to add to the document."
      className="max-w-sm"
    >
      <div className="p-3 space-y-1.5">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => pick(opt.id)}
            className="flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left hover:bg-muted/60 transition-colors"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
              <opt.icon className="w-4 h-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{opt.title}</span>
              <span className="block text-xs text-muted-foreground">{opt.description}</span>
            </span>
          </button>
        ))}
      </div>
    </Dialog>
  )
}
