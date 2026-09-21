'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface ToolbarPopoverProps {
  open: boolean
  anchorRef: React.RefObject<Element | null>
  onClose: () => void
  children: React.ReactNode
  className?: string
  align?: 'start' | 'center' | 'end'
  placement?: 'bottom' | 'right' | 'left'
  gap?: number
  /** Match top + height of this element (e.g. parent panel). */
  matchHeightRef?: React.RefObject<Element | null>
  onPopoverMouseEnter?: () => void
  onPopoverMouseLeave?: () => void
  /** Extra roots treated as inside the popover for outside-click dismissal. */
  insideRefs?: React.RefObject<Element | null>[]
}

export function ToolbarPopover({
  open,
  anchorRef,
  onClose,
  children,
  className = '',
  align = 'start',
  placement = 'bottom',
  gap = 4,
  matchHeightRef,
  onPopoverMouseEnter,
  onPopoverMouseLeave,
  insideRefs,
}: ToolbarPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [panelHeight, setPanelHeight] = useState<number | undefined>(undefined)

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const popoverEl = popoverRef.current
    const popoverWidth = popoverEl?.offsetWidth ?? 0
    const popoverHeight = popoverEl?.offsetHeight ?? 0
    const matchEl = matchHeightRef?.current
    const matchRect = matchEl?.getBoundingClientRect()

    if (placement === 'right' || placement === 'left') {
      const viewportPad = 8
      const maxLeft = window.innerWidth - popoverWidth - viewportPad
      let sideLeft: number

      if (placement === 'left') {
        sideLeft = (matchRect ? matchRect.left : rect.left) - popoverWidth - gap
      } else {
        sideLeft = rect.right + gap
        if (popoverWidth > 0 && sideLeft > maxLeft) {
          sideLeft = (matchRect ? matchRect.left : rect.left) - popoverWidth - gap
        }
      }

      if (matchRect) {
        setPanelHeight(matchRect.height)
        setPosition({
          top: matchRect.top,
          left: Math.max(viewportPad, Math.min(sideLeft, maxLeft)),
        })
        return
      }
      let top = rect.top + rect.height / 2 - popoverHeight / 2
      const maxTop = window.innerHeight - popoverHeight - viewportPad
      top = Math.max(viewportPad, Math.min(top, maxTop))
      setPanelHeight(undefined)
      setPosition({
        top,
        left: Math.max(viewportPad, Math.min(sideLeft, maxLeft)),
      })
      return
    }

    setPanelHeight(undefined)
    let left = rect.left
    if (align === 'center') left = rect.left + rect.width / 2 - popoverWidth / 2
    if (align === 'end') left = rect.right - popoverWidth
    left = Math.max(8, Math.min(left, window.innerWidth - popoverWidth - 8))
    let top = rect.bottom + gap
    if (popoverHeight > 0 && top + popoverHeight > window.innerHeight - 8) {
      const above = rect.top - popoverHeight - gap
      if (above >= 8) top = above
    }
    setPosition({ top, left })
  }, [anchorRef, align, placement, gap, matchHeightRef])

  useEffect(() => {
    if (!open) return
    updatePosition()
    let ro: ResizeObserver | undefined
    let matchRo: ResizeObserver | undefined
    const raf = requestAnimationFrame(() => {
      updatePosition()
      const node = popoverRef.current
      if (node) {
        ro = new ResizeObserver(updatePosition)
        ro.observe(node)
      }
      const matchNode = matchHeightRef?.current
      if (matchNode) {
        matchRo = new ResizeObserver(updatePosition)
        matchRo.observe(matchNode)
      }
    })
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect()
      matchRo?.disconnect()
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open, updatePosition, matchHeightRef])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (anchorRef.current?.contains(target)) return
      if (popoverRef.current?.contains(target)) return
      if (insideRefs?.some((ref) => ref.current?.contains(target))) return
      onClose()
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open, anchorRef, insideRefs, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={popoverRef}
      className={`fixed z-[10055] bg-popover border border-border rounded-lg shadow-lg ${className}`}
      style={{
        top: position.top,
        left: position.left,
        ...(panelHeight != null ? { height: panelHeight } : {}),
      }}
      onMouseDown={(e) => e.preventDefault()}
      onMouseEnter={onPopoverMouseEnter}
      onMouseLeave={onPopoverMouseLeave}
    >
      {children}
    </div>,
    document.body,
  )
}
