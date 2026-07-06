'use client'

import {
  forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState,
} from 'react'
import { type CommandItem } from './slash-command-items'
import type { SlashCommandSection } from '@/lib/editor/slash-suggestions'

export interface CommandListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

interface CommandListProps {
  sections: SlashCommandSection[]
  command: (item: CommandItem) => void
}

function flattenSections(sections: SlashCommandSection[]): CommandItem[] {
  return sections.flatMap((s) => s.items)
}

export const CommandList = forwardRef<CommandListRef, CommandListProps>(({ sections, command }, ref) => {
  const items = useMemo(() => flattenSections(sections), [sections])
  const [selected, setSelected] = useState(0)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => setSelected(0), [items])

  useEffect(() => {
    itemRefs.current[selected]?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  const select = (index: number) => {
    const item = items[index]
    if (item) command(item)
  }

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (!items.length) return false
      if (event.key === 'ArrowUp') {
        setSelected((s) => (s - 1 + items.length) % items.length)
        return true
      }
      if (event.key === 'ArrowDown') {
        setSelected((s) => (s + 1) % items.length)
        return true
      }
      if (event.key === 'Enter') {
        select(selected)
        return true
      }
      return false
    },
  }))

  if (!items.length) {
    return (
      <div className="w-72 rounded-xl border bg-popover p-1.5 shadow-lg">
        <p className="px-2.5 py-2 text-sm text-muted-foreground">No results</p>
      </div>
    )
  }

  let itemIndex = 0

  return (
    <div className="w-72 rounded-xl border bg-popover p-1.5 shadow-lg">
      <div className="max-h-[17rem] overflow-y-auto scrollbar-hide">
        {sections.map((section) => (
          <div key={section.label || 'default'}>
            {section.label ? (
              <p className="px-2.5 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {section.label}
              </p>
            ) : null}
            {section.items.map((item) => {
              const i = itemIndex++
              return (
                <button
                  key={item.key ?? item.title}
                  ref={(el) => { itemRefs.current[i] = el }}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setSelected(i)}
                  onClick={() => select(i)}
                  className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${
                    i === selected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent'
                  }`}
                >
                  <span className="flex-shrink-0 text-muted-foreground">{item.icon}</span>
                  <span className="min-w-0">
                    <span className="font-medium text-foreground">{item.title}</span>
                    <span className="block text-xs text-muted-foreground">{item.description}</span>
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
})
CommandList.displayName = 'CommandList'
