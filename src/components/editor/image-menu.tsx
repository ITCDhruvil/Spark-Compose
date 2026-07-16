'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import {
  Accessibility,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Captions,
  Loader2,
  Pencil,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { aiApi } from '@/lib/api/ai-client'
import { useEditorAiEnabled } from '@/lib/editor/editor-ai-context'
import {
  getSelectedImagePos,
  renumberFigureCaptions,
  upsertImageMetaParagraph,
} from '@/lib/editor/image-meta'
import type { ImageAlign } from './extensions/resizable-image'

const SIZE_PRESETS = ['25', '50', '75', '100'] as const
const SIZE_STEP = 10
const MIN_PCT = 10
const MAX_PCT = 100

interface ImageMenuProps {
  editor: Editor
  onEdit: () => void
}

function MenuBtn({
  onClick, title, children, active, danger, disabled,
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
  active?: boolean
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={title}
      disabled={disabled}
      className={`h-7 min-w-7 px-1.5 inline-flex items-center justify-center rounded-[3px] text-xs transition-colors shrink-0 disabled:opacity-40 ${
        danger
          ? 'text-destructive hover:bg-destructive/10'
          : active
            ? 'bg-primary/15 text-primary'
            : 'hover:bg-muted text-foreground'
      }`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-border/80 mx-0.5 shrink-0" />
}

type ImageMenuAttrs = {
  align: ImageAlign
  sizePreset: string | null
  width: number | null
  height: number | null
}

function readImageAttrs(editor: Editor): ImageMenuAttrs {
  const attrs = editor.getAttributes('image')
  return {
    align: (attrs.align as ImageAlign) ?? 'center',
    sizePreset: attrs.sizePreset != null ? String(attrs.sizePreset) : null,
    width: typeof attrs.width === 'number' ? attrs.width : null,
    height: typeof attrs.height === 'number' ? attrs.height : null,
  }
}

function sameImageAttrs(a: ImageMenuAttrs, b: ImageMenuAttrs) {
  return (
    a.align === b.align
    && a.sizePreset === b.sizePreset
    && a.width === b.width
    && a.height === b.height
  )
}

/** Current display size as a percentage of the editor content width. */
function getSizePercent(editor: Editor): number {
  const { sizePreset, width } = readImageAttrs(editor)
  if (width != null) {
    const pos = getSelectedImagePos(editor)
    if (pos != null) {
      const dom = editor.view.nodeDOM(pos)
      const parent = (dom as HTMLElement | null)?.parentElement
      const parentWidth = parent?.clientWidth ?? editor.view.dom.clientWidth
      if (parentWidth > 0) {
        return Math.min(MAX_PCT, Math.max(MIN_PCT, Math.round((width / parentWidth) * 100)))
      }
    }
    return 50
  }
  const pct = Number(sizePreset ?? '100')
  return Number.isFinite(pct) ? Math.min(MAX_PCT, Math.max(MIN_PCT, pct)) : 100
}

export function ImageMenu({ editor, onEdit }: ImageMenuProps) {
  const aiEnabled = useEditorAiEnabled()
  const [busy, setBusy] = useState<'caption' | 'alt' | null>(null)
  const [attrs, setAttrs] = useState<ImageMenuAttrs>(() => readImageAttrs(editor))
  const [sizePct, setSizePct] = useState(() => getSizePercent(editor))

  // Stable props — BubbleMenu dispatches a transaction when these identities change.
  const bubbleOptions = useMemo(() => ({ placement: 'top' as const, offset: 10 }), [])
  const shouldShow = useCallback(({ editor: ed }: { editor: Editor }) => ed.isActive('image'), [])

  useEffect(() => {
    const refresh = () => {
      if (!editor.isActive('image')) return
      const next = readImageAttrs(editor)
      setAttrs((prev) => (sameImageAttrs(prev, next) ? prev : next))
      const nextPct = getSizePercent(editor)
      setSizePct((prev) => (prev === nextPct ? prev : nextPct))
    }
    editor.on('selectionUpdate', refresh)
    editor.on('transaction', refresh)
    return () => {
      editor.off('selectionUpdate', refresh)
      editor.off('transaction', refresh)
    }
  }, [editor])

  const { align, sizePreset, width: pixelWidth } = attrs
  const activePreset = pixelWidth == null && sizePreset != null && SIZE_PRESETS.includes(sizePreset as typeof SIZE_PRESETS[number])
    ? sizePreset
    : null

  const setAlign = (value: ImageAlign) => {
    editor.chain().focus().updateAttributes('image', { align: value }).run()
  }

  const setWidthPercent = (preset: number | string) => {
    const pct = String(Math.min(MAX_PCT, Math.max(MIN_PCT, Number(preset))))
    editor.chain().focus().updateAttributes('image', {
      sizePreset: pct,
      width: null,
      height: null,
    }).run()
  }

  const nudgeSize = (direction: -1 | 1) => {
    const current = getSizePercent(editor)
    const next = direction === 1
      ? Math.min(MAX_PCT, Math.ceil((current + 0.1) / SIZE_STEP) * SIZE_STEP)
      : Math.max(MIN_PCT, Math.floor((current - 0.1) / SIZE_STEP) * SIZE_STEP)
    if (next === current) return
    setWidthPercent(next)
  }

  const runImageMeta = async (mode: 'caption' | 'alt') => {
    const imagePos = getSelectedImagePos(editor)
    if (imagePos == null || busy) return

    const attrs = editor.getAttributes('image')
    const src = String(attrs.src ?? '').trim()
    if (!src) {
      setBusy(null)
      return
    }

    setBusy(mode)

    upsertImageMetaParagraph(editor, imagePos, mode, '', true)

    try {
      const res = await aiApi.imageCaption({
        mode,
        src,
        alt: attrs.alt as string | undefined,
        title: (attrs.caption as string) || (attrs.title as string) || undefined,
        context: editor.getText().slice(0, 800),
      })
      const text = res.text.trim()
      if (!text) {
        const node = editor.state.doc.nodeAt(imagePos)
        if (node?.type.name === 'image') {
          const after = imagePos + node.nodeSize
          const next = editor.state.doc.nodeAt(after)
          const loadingText = mode === 'caption' ? 'Writing caption…' : 'Writing alt text…'
          if (next?.type.name === 'paragraph' && next.textContent === loadingText) {
            editor.chain().focus().deleteRange({ from: after, to: after + next.nodeSize }).run()
          }
        }
        editor.commands.setNodeSelection(imagePos)
        return
      }

      upsertImageMetaParagraph(editor, imagePos, mode, text, false)
      if (mode === 'caption') {
        renumberFigureCaptions(editor)
      }
      editor.commands.setNodeSelection(imagePos)
    } catch {
      const node = editor.state.doc.nodeAt(imagePos)
      if (node?.type.name === 'image') {
        const after = imagePos + node.nodeSize
        const next = editor.state.doc.nodeAt(after)
        const loadingText = mode === 'caption' ? 'Writing caption…' : 'Writing alt text…'
        if (next?.type.name === 'paragraph' && next.textContent === loadingText) {
          editor.chain().focus().deleteRange({ from: after, to: after + next.nodeSize }).run()
        }
        if (mode === 'alt') {
          const n1 = editor.state.doc.nodeAt(after)
          let altPos = after
          if (n1?.type.name === 'paragraph' && /^Figure\s+\d+:/i.test(n1.textContent)) {
            altPos = after + n1.nodeSize
          }
          const n2 = editor.state.doc.nodeAt(altPos)
          if (n2?.type.name === 'paragraph' && n2.textContent === 'Writing alt text…') {
            editor.chain().focus().deleteRange({ from: altPos, to: altPos + n2.nodeSize }).run()
          }
        }
        editor.commands.setNodeSelection(imagePos)
      }
    } finally {
      setBusy(null)
    }
  }

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="imageBubbleMenu"
      shouldShow={shouldShow}
      options={bubbleOptions}
      className="flex items-center gap-0.5 bg-popover border border-border rounded-lg shadow-lg px-1.5 py-1 z-[10001]"
    >
      <MenuBtn onClick={() => setAlign('left')} active={align === 'left'} title="Align left">
        <AlignLeft className="w-3.5 h-3.5" />
      </MenuBtn>
      <MenuBtn onClick={() => setAlign('center')} active={align === 'center'} title="Align center">
        <AlignCenter className="w-3.5 h-3.5" />
      </MenuBtn>
      <MenuBtn onClick={() => setAlign('right')} active={align === 'right'} title="Align right">
        <AlignRight className="w-3.5 h-3.5" />
      </MenuBtn>

      <Divider />

      <MenuBtn
        onClick={() => nudgeSize(-1)}
        title="Smaller"
        disabled={sizePct <= MIN_PCT}
      >
        <ZoomOut className="w-3.5 h-3.5" />
      </MenuBtn>
      <span
        className="h-7 min-w-[2.5rem] px-1 inline-flex items-center justify-center text-[10px] font-medium tabular-nums text-muted-foreground"
        title={pixelWidth != null ? `${pixelWidth}px` : `${sizePct}% width`}
      >
        {sizePct}%
      </span>
      <MenuBtn
        onClick={() => nudgeSize(1)}
        title="Bigger"
        disabled={sizePct >= MAX_PCT}
      >
        <ZoomIn className="w-3.5 h-3.5" />
      </MenuBtn>

      <Divider />

      {SIZE_PRESETS.map((w) => (
        <button
          key={w}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); setWidthPercent(w) }}
          className={`h-7 px-1.5 text-[10px] rounded shrink-0 ${
            activePreset === w
              ? 'bg-primary/15 text-primary'
              : 'hover:bg-muted'
          }`}
          title={`Width ${w}%`}
        >
          {w}%
        </button>
      ))}

      <Divider />

      {aiEnabled && (
        <>
          <button
            type="button"
            title="AI Caption — writes a Figure N: line under the image for reports and documents"
            disabled={busy !== null}
            onMouseDown={(e) => { e.preventDefault(); void runImageMeta('caption') }}
            className="h-7 px-1.5 inline-flex items-center gap-1 text-[10px] font-medium rounded shrink-0 hover:bg-muted disabled:opacity-40 text-foreground"
          >
            {busy === 'caption'
              ? <Loader2 className="w-3 h-3 animate-spin text-primary" />
              : <Captions className="w-3 h-3 text-primary" />}
            <span>AI Caption</span>
          </button>
          <button
            type="button"
            title="AI Alt text — short description for screen readers and accessibility. Saved on the image’s alt attribute so assistive tech can describe it; not a visible figure caption."
            disabled={busy !== null}
            onMouseDown={(e) => { e.preventDefault(); void runImageMeta('alt') }}
            className="h-7 px-1.5 inline-flex items-center gap-1 text-[10px] font-medium rounded shrink-0 hover:bg-muted disabled:opacity-40 text-foreground"
          >
            {busy === 'alt'
              ? <Loader2 className="w-3 h-3 animate-spin text-primary" />
              : <Accessibility className="w-3 h-3 text-primary" />}
            <span>AI Alt text</span>
          </button>

          <Divider />
        </>
      )}

      <MenuBtn onClick={onEdit} title="Edit image">
        <Pencil className="w-3.5 h-3.5" />
      </MenuBtn>
      <MenuBtn
        onClick={() => editor.chain().focus().deleteSelection().run()}
        title="Delete image"
        danger
      >
        <Trash2 className="w-3.5 h-3.5" />
      </MenuBtn>
    </BubbleMenu>
  )
}
