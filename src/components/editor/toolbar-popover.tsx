'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface ToolbarPopoverProps {
  open: boolean
  anchorRef: React.RefObject<HTMLElement | null>
  onClose: () => void
  children: React.ReactNode
  className?: string
  align?: 'start' | 'center' | 'end'
}

export function ToolbarPopover({
  open,
  anchorRef,
  onClose,
  children,
  className = '',
  align = 'start',
}: ToolbarPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const popoverWidth = popoverRef.current?.offsetWidth ?? 0
    let left = rect.left
    if (align === 'center') left = rect.left + rect.width / 2 - popoverWidth / 2
    if (align === 'end') left = rect.right - popoverWidth
    setPosition({ top: rect.bottom + 4, left })
  }, [anchorRef, align])

  useEffect(() => {
    if (!open) return
    updatePosition()
    let ro: ResizeObserver | undefined
    const raf = requestAnimationFrame(() => {
      updatePosition()
      const node = popoverRef.current
      if (node) {
        ro = new ResizeObserver(updatePosition)
        ro.observe(node)
      }
    })
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect()
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (anchorRef.current?.contains(target)) return
      if (popoverRef.current?.contains(target)) return
      onClose()
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open, anchorRef, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={popoverRef}
      className={`fixed z-[9999] bg-popover border border-border rounded-lg shadow-lg ${className}`}
      style={{ top: position.top, left: position.left }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {children}
    </div>,
    document.body,
  )
}
