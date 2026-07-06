'use client'

import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { FONT_SIZES } from './editor-constants'
import { fontSizePtToCSSValue, isValidCustomFontSizePt, labelFromFontSizeAttr } from '@/lib/editor/font-size-utils'

export function FontSizePopover({
  editor,
  onClose,
}: {
  editor: Editor
  onClose: () => void
}) {
  const attrSize = editor.getAttributes('textStyle').fontSize as string | undefined
  const currentLabel = labelFromFontSizeAttr(attrSize)
  const [customValue, setCustomValue] = useState(currentLabel)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setCustomValue(currentLabel)
    setError(null)
  }, [currentLabel])

  const applyCustom = () => {
    const css = fontSizePtToCSSValue(customValue)
    if (!css) {
      setError('Use half-point steps (e.g. 11, 11.5)')
      return
    }
    editor.chain().focus().setFontSize(css).run()
    setError(null)
    onClose()
  }

  return (
    <>
      <div className="px-3 py-2 border-b border-border/80">
        <label htmlFor="font-size-custom" className="block text-[10px] uppercase font-medium text-muted-foreground">
          Custom size
        </label>
        <div className="mt-1.5 flex items-center gap-1.5">
          <input
            id="font-size-custom"
            type="text"
            inputMode="decimal"
            value={customValue}
            onChange={(e) => {
              setCustomValue(e.target.value)
              setError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                applyCustom()
              }
            }}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="11.5"
            className={`h-8 w-full min-w-0 rounded-[3px] border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 ${
              error ? 'border-destructive' : 'border-[#d1d1d1] dark:border-border'
            }`}
          />
          <span className="text-xs text-muted-foreground shrink-0">pt</span>
        </div>
        {error ? <p className="mt-1 text-[11px] text-destructive">{error}</p> : null}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault()
            if (!isValidCustomFontSizePt(customValue)) {
              setError('Use half-point steps (e.g. 11, 11.5)')
              return
            }
            applyCustom()
          }}
          className="mt-2 w-full rounded-[3px] border border-[#d1d1d1] dark:border-border bg-white dark:bg-background px-2 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
        >
          Apply
        </button>
      </div>
      {FONT_SIZES.map((s) => (
        <button
          key={s.value}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault()
            editor.chain().focus().setFontSize(s.value).run()
            onClose()
          }}
          className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-muted ${
            currentLabel === s.label ? 'bg-primary/10 text-primary' : ''
          }`}
        >
          {s.label}
        </button>
      ))}
    </>
  )
}
