'use client'

import type { HeadingStyleOption } from '@/lib/editor/heading-style-options'

export function HeadingStylePreview({
  option,
  className = '',
}: {
  option: HeadingStyleOption
  className?: string
}) {
  return (
    <span
      className={`block truncate leading-tight ${option.previewClass} ${className}`}
      aria-hidden
    >
      {option.preview}
    </span>
  )
}

export function HeadingStyleMenuItem({
  option,
  active,
  onSelect,
}: {
  option: HeadingStyleOption
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault()
        onSelect()
      }}
      className={`block w-full px-3 py-2.5 text-left transition-colors hover:bg-muted ${
        active ? 'bg-primary/10 text-primary' : ''
      }`}
    >
      <HeadingStylePreview option={option} />
    </button>
  )
}
