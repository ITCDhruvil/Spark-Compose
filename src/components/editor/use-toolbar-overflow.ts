'use client'

import { useCallback, useLayoutEffect, useRef, useState } from 'react'

const MORE_BUTTON_WIDTH = 52

export function useToolbarOverflow(segmentCount: number) {
  const containerRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState(segmentCount)

  const recalculate = useCallback(() => {
    const container = containerRef.current
    const measure = measureRef.current
    if (!container || !measure) return

    const widths = Array.from(measure.children).map(
      (child) => (child as HTMLElement).getBoundingClientRect().width,
    )
    const available = container.clientWidth
    const total = widths.reduce((sum, w) => sum + w, 0)

    if (total <= available) {
      setVisibleCount(segmentCount)
      return
    }

    let used = 0
    let count = 0
    const budget = available - MORE_BUTTON_WIDTH
    for (const width of widths) {
      if (used + width <= budget) {
        used += width
        count += 1
      } else {
        break
      }
    }
    setVisibleCount(count)
  }, [segmentCount])

  useLayoutEffect(() => {
    recalculate()
    const ro = new ResizeObserver(recalculate)
    if (containerRef.current) ro.observe(containerRef.current)
    if (measureRef.current) ro.observe(measureRef.current)
    window.addEventListener('resize', recalculate)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', recalculate)
    }
  }, [recalculate])

  return {
    containerRef,
    measureRef,
    visibleCount,
    hasOverflow: visibleCount < segmentCount,
  }
}

export type ToolbarSegmentId =
  | 'history'
  | 'styles'
  | 'ai'
  | 'format'
  | 'colors'
  | 'clearFormat'
  | 'align'
  | 'lists'
  | 'indent'
  | 'insert'
  | 'blocks'
  | 'toc'
  | 'shortcuts'
  | 'findReplace'
  | 'comment'
  | 'embedVideo'
  | 'callout'
  | 'export'
  | 'print'
  | 'focusMode'
  | 'spellCheck'

export const TOOLBAR_SEGMENT_ORDER: ToolbarSegmentId[] = [
  'history',
  'styles',
  'ai',
  'format',
  'colors',
  'clearFormat',
  'align',
  'lists',
  'indent',
  'insert',
  'blocks',
  'toc',
  'shortcuts',
  'findReplace',
  'comment',
  'embedVideo',
  'callout',
  'export',
  'print',
  'focusMode',
  'spellCheck',
]
