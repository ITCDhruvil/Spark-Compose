'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Search, X } from 'lucide-react'

export interface AiPickerItem {
  id: string
  label: string
  description?: string
  group?: string
}

interface AiPickerCardProps {
  open: boolean
  title: string
  items: AiPickerItem[]
  position: { top: number; left: number } | null
  searchPlaceholder?: string
  emptyLabel?: string
  onSelect: (item: AiPickerItem) => void
  onClose: () => void
}

export function AiPickerCard({
  open,
  title,
  items,
  position,
  searchPlaceholder = 'Search…',
  emptyLabel = 'No matches',
  onSelect,
  onClose,
}: AiPickerCardProps) {
  const [mounted, setMounted] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 50)
    return () => window.clearTimeout(focusTimer)
  }, [open])

  // Delay outside-click binding so the opening click doesn't immediately close the card
  useEffect(() => {
    if (!open) return

    let remove: (() => void) | undefined
    const bindTimer = window.setTimeout(() => {
      const onPointerDown = (e: PointerEvent) => {
        if (cardRef.current?.contains(e.target as Node)) return
        onCloseRef.current()
      }
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onCloseRef.current()
      }
      document.addEventListener('pointerdown', onPointerDown, true)
      document.addEventListener('keydown', onKey)
      remove = () => {
        document.removeEventListener('pointerdown', onPointerDown, true)
        document.removeEventListener('keydown', onKey)
      }
    }, 150)

    return () => {
      window.clearTimeout(bindTimer)
      remove?.()
    }
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q)
        || item.description?.toLowerCase().includes(q)
        || item.group?.toLowerCase().includes(q),
    )
  }, [items, query])

  const groups = useMemo(() => {
    const map = new Map<string, AiPickerItem[]>()
    for (const item of filtered) {
      const key = item.group ?? ''
      const list = map.get(key) ?? []
      list.push(item)
      map.set(key, list)
    }
    return [...map.entries()]
  }, [filtered])

  if (!open || !mounted) return null

  const anchor = position ?? { top: 120, left: 24 }
  const top = Math.min(Math.max(8, anchor.top), window.innerHeight - 360)
  const left = Math.min(Math.max(8, anchor.left), window.innerWidth - 300)

  return createPortal(
    <div
      ref={cardRef}
      className="fixed z-[10000] w-[280px] rounded-xl border border-border bg-popover text-popover-foreground shadow-xl overflow-hidden"
      style={{ top, left }}
      role="dialog"
      aria-label={title}
    >
      <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2 border-b bg-muted/30">
        <p className="text-sm font-semibold">{title}</p>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onClose()
          }}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-2 border-b">
        <label className="flex items-center gap-2 rounded-lg border bg-background px-2.5 py-2 focus-within:ring-2 focus-within:ring-ring/40">
          <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
          />
        </label>
      </div>

      <div className="max-h-56 overflow-y-auto p-1.5">
        {filtered.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">{emptyLabel}</p>
        ) : (
          groups.map(([group, groupItems]) => (
            <div key={group || 'all'} className="mb-1 last:mb-0">
              {group ? (
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group}
                </p>
              ) : null}
              {groupItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onSelect(item)
                  }}
                  className="flex w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-accent transition-colors"
                >
                  <span className="font-medium">{item.label}</span>
                  {item.description ? (
                    <span className="text-[11px] text-muted-foreground line-clamp-1">{item.description}</span>
                  ) : null}
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>,
    document.body,
  )
}
