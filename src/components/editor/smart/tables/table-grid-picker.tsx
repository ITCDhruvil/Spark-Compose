'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'

const MIN_GRID = 5
const MAX_GRID_CAP = 10
const CELL = 18
const GAP = 3
const MAX_ROWS_COLS = 30

function gridPx(size: number) {
  return size * CELL + (size - 1) * GAP
}

interface TableGridPickerProps {
  onSelect: (rows: number, cols: number) => void
  onHoverChange?: (rows: number, cols: number) => void
}

export function TableGridPicker({ onSelect, onHoverChange }: TableGridPickerProps) {
  const [hover, setHover] = useState<{ row: number; col: number } | null>(null)
  const [customOpen, setCustomOpen] = useState(false)
  const [customRows, setCustomRows] = useState('3')
  const [customCols, setCustomCols] = useState('3')
  const [maxGrid, setMaxGrid] = useState(MAX_GRID_CAP)

  useEffect(() => {
    const compute = () => {
      // Cap the grid so it comfortably fits within the viewport with room for the popover chrome.
      const availablePx = Math.min(window.innerWidth * 0.22, window.innerHeight * 0.35)
      const fit = Math.floor((availablePx + GAP) / (CELL + GAP))
      setMaxGrid(Math.max(MIN_GRID, Math.min(MAX_GRID_CAP, fit)))
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])

  const visibleSize = useMemo(() => {
    if (!hover) return MIN_GRID
    let size = Math.max(MIN_GRID, hover.row + 1, hover.col + 1)
    if (hover.row >= size - 1 || hover.col >= size - 1) {
      size = Math.min(maxGrid, size + 1)
    }
    return size
  }, [hover, maxGrid])

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

  const submitCustom = useCallback(() => {
    const r = Math.min(MAX_ROWS_COLS, Math.max(1, parseInt(customRows, 10) || 1))
    const c = Math.min(MAX_ROWS_COLS, Math.max(1, parseInt(customCols, 10) || 1))
    onSelect(r, c)
  }, [customRows, customCols, onSelect])

  return (
    <div
      className="p-3.5 select-none"
      style={{ width: Math.max(240, gridPx(maxGrid) + 28) }}
      onMouseLeave={() => setHover(null)}
    >
      <div className="flex items-center gap-2 pb-2.5 mb-3 border-b border-border">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <LayoutGrid className="w-3.5 h-3.5" />
        </span>
        <span className="text-sm font-medium text-foreground flex-1">Insert table</span>
      </div>

      <div
        className="overflow-hidden transition-[width,height] duration-150 ease-out mx-auto"
        style={{ width: gridPx(visibleSize), height: gridPx(visibleSize) }}
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${maxGrid}, ${CELL}px)`,
            gap: GAP,
            width: gridPx(maxGrid),
          }}
          onClick={handleCellClick}
        >
          {Array.from({ length: maxGrid * maxGrid }, (_, i) => {
            const row = Math.floor(i / maxGrid)
            const col = i % maxGrid
            const selected = hover !== null && row <= hover.row && col <= hover.col
            return (
              <div
                key={`${row}-${col}`}
                role="button"
                tabIndex={-1}
                onMouseEnter={() => handleCellEnter(row, col)}
                className={cn(
                  'rounded-[3px] border transition-all duration-75 cursor-pointer',
                  selected
                    ? 'bg-primary/25 border-primary shadow-sm'
                    : 'bg-muted/30 border-border/60 hover:border-muted-foreground/40',
                )}
                style={{ width: CELL, height: CELL }}
              />
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-center mt-3 pt-2.5 border-t border-border">
        <span className="text-xs font-semibold tabular-nums text-primary bg-primary/10 rounded-full px-2.5 py-1">
          {cols} × {rows}
        </span>
      </div>

      <div className="mt-2.5 pt-2.5 border-t border-border">
        {!customOpen ? (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setCustomOpen(true)}
            className="w-full text-xs font-medium text-center py-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            Custom size…
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={1}
              max={MAX_ROWS_COLS}
              value={customCols}
              onChange={(e) => setCustomCols(e.target.value)}
              className="w-14 text-xs text-center border border-input rounded-md py-1 bg-background focus:outline-none focus:ring-2 focus:ring-ring/40"
              placeholder="Cols"
            />
            <span className="text-xs text-muted-foreground">×</span>
            <input
              type="number"
              min={1}
              max={MAX_ROWS_COLS}
              value={customRows}
              onChange={(e) => setCustomRows(e.target.value)}
              className="w-14 text-xs text-center border border-input rounded-md py-1 bg-background focus:outline-none focus:ring-2 focus:ring-ring/40"
              placeholder="Rows"
            />
            <button
              type="button"
              onClick={submitCustom}
              className="text-xs font-medium px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
            >
              Insert
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
