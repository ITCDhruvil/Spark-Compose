'use client'

import { cn } from '@/lib/utils'

interface ColorPickerGridProps {
  colors: readonly string[]
  value?: string | null
  onChange: (color: string) => void
  onClear?: () => void
  clearLabel?: string
}

export function ColorPickerGrid({
  colors, value, onChange, onClear, clearLabel = 'None',
}: ColorPickerGridProps) {
  return (
    <div className="p-2">
      <div className="grid grid-cols-8 gap-1">
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            title={color}
            onMouseDown={(e) => { e.preventDefault(); onChange(color) }}
            className={cn(
              'w-5 h-5 rounded-[2px] border border-black/10 shrink-0',
              value === color && 'ring-2 ring-primary ring-offset-1',
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      {onClear && (
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onClear() }}
          className="mt-2 w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted"
        >
          {clearLabel}
        </button>
      )}
    </div>
  )
}
