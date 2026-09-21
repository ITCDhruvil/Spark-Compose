'use client'

const BULLET_PREVIEW_CLASS: Record<string, string> = {
  disc: 'list-preview-disc',
  circle: 'list-preview-circle',
  square: 'list-preview-square',
  '"◆"': 'list-preview-char',
  '"◇"': 'list-preview-char',
  '"▸"': 'list-preview-char',
  '"–"': 'list-preview-char',
}

export function ListStylePreviewSlot({ children }: { children?: React.ReactNode }) {
  return (
    <span className="list-style-preview-slot" aria-hidden>
      {children}
    </span>
  )
}

export function ListStylePreview({
  value,
  preview,
  className = '',
}: {
  value: string
  preview?: string
  className?: string
}) {
  const kind = BULLET_PREVIEW_CLASS[value]
  if (kind && kind !== 'list-preview-char') {
    return (
      <ListStylePreviewSlot>
        <span className={`list-style-preview ${kind} ${className}`} />
      </ListStylePreviewSlot>
    )
  }
  if (preview != null) {
    return (
      <ListStylePreviewSlot>
        <span className={`list-style-preview list-preview-char ${className}`}>{preview}</span>
      </ListStylePreviewSlot>
    )
  }
  return <ListStylePreviewSlot />
}
