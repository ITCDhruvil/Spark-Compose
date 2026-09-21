'use client'

import { useCallback, useRef, useState } from 'react'

export type ToolbarPopoverId =
  | 'heading'
  | 'font'
  | 'size'
  | 'align'
  | 'bulletList'
  | 'numberedList'
  | 'checklist'
  | 'textColor'
  | 'highlight'
  | 'table'
  | 'callout'
  | 'export'

export function useToolbarPopovers() {
  const [openId, setOpenId] = useState<ToolbarPopoverId | null>(null)
  const externalCloseRef = useRef<() => void>(() => {})

  const registerExternalClose = useCallback((close: () => void) => {
    externalCloseRef.current = close
  }, [])

  const closeAll = useCallback(() => {
    externalCloseRef.current()
    setOpenId(null)
  }, [])

  const toggle = useCallback((id: ToolbarPopoverId) => {
    externalCloseRef.current()
    setOpenId((cur) => (cur === id ? null : id))
  }, [])

  const close = useCallback(() => setOpenId(null), [])

  const isOpen = useCallback((id: ToolbarPopoverId) => openId === id, [openId])

  const beforeExternalOpen = useCallback(() => {
    setOpenId(null)
  }, [])

  return {
    openId,
    toggle,
    close,
    closeAll,
    isOpen,
    registerExternalClose,
    beforeExternalOpen,
  }
}
