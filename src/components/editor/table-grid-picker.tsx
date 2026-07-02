'use client'

import { useState, useCallback, useMemo } from 'react'
import { LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'

const MIN_GRID = 5
const MAX_GRID = 10
const CELL = 18
const GAP = 3

function gridPx(size: number) {
  return size * CELL + (size - 1) * GAP
}

interface TableGridPickerProps {
  onSelect: (rows: number, cols: number) => void
  onHoverChange?: (rows: number, cols: number) => void
}

export function TableGridPicker({ onSelect, onHoverChange }: TableGridPickerProps) {
  const [hover, setHover] = useState<{ row: number; col: number } | null>(null)

  const visibleSize = useMemo(() => {
    if (!hover) return MIN_GRID
    let size = Math.max(MIN_GRID, hover.row + 1, hover.col + 1)
    // Reveal one extra row/column when hovering the edge so the grid can grow to 10×10
    if (hover.row >= size - 1 || hover.col >= size - 1) {
      size = Math.min(MAX_GRID, size + 1)
    }
    return size
  }, [hover])

  const rows = hover ? hover.row + 1 : 1
  const cols = hover ? hover.col + 1 : 1

  const handleCellEnter = useCallback((row: number, col: number) => {
    setHover({ row, col })
    onHoverChange?.(row + 1, col + 1)
  }, [onHoverChange])

  const handleCellClick = useCallback(() => {
    if (!hover) return
    onSelect(rows, cols)
  }, [onSelect, rows, cols, hover])

  return (
    <div
      className="p-3 select-none w-[220px]"
      onMouseLeave={() => setHover(null)}
    >
      <div className="flex items-center gap-2 pb-2 mb-2 border-b border-border">
        <LayoutGrid className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-sm text-foreground flex-1">Insert table</span>
      </div>

      <div
        className="overflow-hidden transition-[width,height] duration-100 ease-out"
        style={{ width: gridPx(visibleSize), height: gridPx(visibleSize) }}
      >
        <div
          className="grid gap-[3px]"
          style={{
            gridTemplateColumns: `repeat(${MAX_GRID}, ${CELL}px)`,
            width: gridPx(MAX_GRID),
          }}
          onClick={handleCellClick}
        >
          {Array.from({ length: MAX_GRID * MAX_GRID }, (_, i) => {
            const row = Math.floor(i / MAX_GRID)
            const col = i % MAX_GRID
            const selected = hover !== null && row <= hover.row && col <= hover.col
            return (
              <div
                key={`${row}-${col}`}
                role="button"
                tabIndex={-1}
                onMouseEnter={() => handleCellEnter(row, col)}
                className={cn(
                  'rounded-[2px] border transition-colors cursor-pointer',
                  selected
                    ? 'bg-primary/20 border-primary/50'
                    : 'bg-background border-border/80 hover:border-muted-foreground/40',
                )}
                style={{ width: CELL, height: CELL }}
              />
            )
          })}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-2.5 font-medium tabular-nums">
        {cols} × {rows}
      </p>
    </div>
  )
}
