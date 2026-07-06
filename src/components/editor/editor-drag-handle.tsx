'use client'

import {
  useCallback, useEffect, useRef, useState,
} from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'
import { NodeSelection } from '@tiptap/pm/state'
import {
  Copy, Trash2, Bold, Italic, Underline, Strikethrough, Code,
  ChevronRight, Type, List, ListOrdered, CheckSquare, Minus,
  ImageIcon, Video, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Megaphone,
} from 'lucide-react'
import { BULLET_LIST_STYLES, ORDERED_LIST_STYLES } from './extensions/list-style'
import { convertToBulletList, convertToOrderedList } from './editor-list-utils'

interface EditorDragHandleProps {
  editor: Editor
  onInsertImage?: () => void
  onEmbedVideo?: () => void
}

interface BlockHandleLayout {
  pos: number
  top: number
  left: number
}

type SubmenuId = 'convert' | 'media' | 'alignment' | 'lists' | 'bullets'

const DRAG_THRESHOLD = 5
const HANDLE_WIDTH = 18
const MENU_WIDTH = 208
const SUBMENU_WIDTH = 256
const SUBMENU_CLOSE_MS = 120

/** Approximate panel heights so flyouts stay on-screen without scrolling. */
const SUBMENU_HEIGHT = {
  convert: 380,
  media: 170,
  alignment: 170,
  lists: 260,
  bullets: 260,
} satisfies Record<SubmenuId, number>

function GripIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" aria-hidden className="opacity-60">
      {[0, 1, 2].map((row) =>
        [0, 1].map((col) => (
          <circle
            key={`${row}-${col}`}
            cx={2 + col * 6}
            cy={2 + row * 5}
            r="1.2"
            fill="currentColor"
          />
        )),
      )}
    </svg>
  )
}

function selectBlock(editor: Editor, pos: number) {
  const { state, view } = editor
  view.dispatch(state.tr.setSelection(NodeSelection.create(state.doc, pos)))
}

function selectBlockText(editor: Editor, pos: number) {
  const node = editor.state.doc.nodeAt(pos)
  if (!node) return
  const from = pos + 1
  const to = pos + node.nodeSize - 1
  if (to > from) {
    editor.chain().focus().setTextSelection({ from, to }).run()
  } else {
    editor.chain().focus().setTextSelection(from).run()
  }
}

function duplicateBlock(editor: Editor, pos: number) {
  const node = editor.state.doc.nodeAt(pos)
  if (!node) return
  editor.chain().focus().insertContentAt(pos + node.nodeSize, node.toJSON()).run()
}

function deleteBlock(editor: Editor, pos: number) {
  const node = editor.state.doc.nodeAt(pos)
  if (!node) return
  editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run()
}

function runBlockCommand(editor: Editor, pos: number, fn: (e: Editor) => void) {
  selectBlock(editor, pos)
  fn(editor)
}

function runMarkOnBlock(editor: Editor, pos: number, fn: (e: Editor) => void) {
  selectBlockText(editor, pos)
  fn(editor)
}

const MEDIA_BLOCK_TYPES = new Set([
  'image',
  'videoEmbed',
  'horizontalRule',
  'table',
  'codeBlock',
])

/** Skip drag handles on empty lines — no content, no grip. */
function isMeaningfulBlock(node: { type: { name: string }; textContent: string; childCount: number }): boolean {
  if (MEDIA_BLOCK_TYPES.has(node.type.name)) return true
  if (node.textContent.trim().length > 0) return true
  // Non-text nodes like an image inside a wrapper
  if (node.type.name === 'callout' && node.childCount > 0) {
    return node.textContent.trim().length > 0
  }
  return false
}

function collectBlockLayouts(editor: Editor): BlockHandleLayout[] {
  const { view } = editor
  const layouts: BlockHandleLayout[] = []

  editor.state.doc.forEach((node, pos) => {
    if (!isMeaningfulBlock(node)) return

    const dom = view.nodeDOM(pos)
    if (!(dom instanceof HTMLElement)) return

    const rect = dom.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) return

    layouts.push({
      pos,
      // Round to avoid sub-pixel churn from BubbleMenu / resize observers.
      top: Math.round(rect.top + 4),
      left: Math.round(Math.max(4, rect.left - HANDLE_WIDTH - 4)),
    })
  })

  return layouts
}

function sameLayouts(a: BlockHandleLayout[], b: BlockHandleLayout[]) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const left = a[i]!
    const right = b[i]!
    if (left.pos !== right.pos || left.top !== right.top || left.left !== right.left) {
      return false
    }
  }
  return true
}

interface MenuItemProps {
  icon?: React.ReactNode
  label: string
  onClick?: () => void
  danger?: boolean
  submenu?: boolean
  active?: boolean
  children?: React.ReactNode
}

function MenuItem({ icon, label, onClick, danger, submenu, active, children }: MenuItemProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors text-left ${
        danger
          ? 'text-destructive hover:bg-destructive/10'
          : active
            ? 'bg-accent text-foreground'
            : 'text-foreground hover:bg-accent'
      }`}
    >
      {icon && <span className="flex-shrink-0 text-muted-foreground">{icon}</span>}
      <span className="flex-1 min-w-0">{children ?? label}</span>
      {submenu && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  )
}

interface ConvertOption {
  id: string
  label: string
  previewClass: string
  preview?: React.ReactNode
  run: (editor: Editor) => void
}

const CONVERT_OPTIONS: ConvertOption[] = [
  {
    id: 'text',
    label: 'Text',
    previewClass: 'text-sm font-normal leading-none',
    run: (e) => { e.chain().focus().setParagraph().run() },
  },
  {
    id: 'h1',
    label: 'Heading 1',
    previewClass: 'text-xl font-bold leading-none',
    run: (e) => { e.chain().focus().setHeading({ level: 1 }).run() },
  },
  {
    id: 'h2',
    label: 'Heading 2',
    previewClass: 'text-lg font-bold leading-none',
    run: (e) => { e.chain().focus().setHeading({ level: 2 }).run() },
  },
  {
    id: 'h3',
    label: 'Heading 3',
    previewClass: 'text-base font-semibold leading-none',
    run: (e) => { e.chain().focus().setHeading({ level: 3 }).run() },
  },
  {
    id: 'h4',
    label: 'Heading 4',
    previewClass: 'text-sm font-semibold leading-none',
    run: (e) => { e.chain().focus().setHeading({ level: 4 }).run() },
  },
  {
    id: 'quote',
    label: 'Quote',
    previewClass: 'text-sm italic border-l-2 border-muted-foreground/40 pl-2 text-muted-foreground leading-none',
    run: (e) => { e.chain().focus().toggleBlockquote().run() },
  },
  {
    id: 'code',
    label: 'Code block',
    previewClass: 'text-xs font-mono bg-muted px-1.5 py-0.5 rounded leading-none',
    run: (e) => { e.chain().focus().toggleCodeBlock().run() },
  },
  {
    id: 'bullet',
    label: 'Bullet list',
    previewClass: 'text-sm leading-none',
    preview: <span className="text-sm leading-none">• List item</span>,
    run: (e) => { convertToBulletList(e) },
  },
  {
    id: 'numbered',
    label: 'Numbered list',
    previewClass: 'text-sm leading-none',
    preview: <span className="text-sm leading-none">1. List item</span>,
    run: (e) => { convertToOrderedList(e) },
  },
  {
    id: 'task',
    label: 'Checklist',
    previewClass: 'text-sm leading-none',
    preview: (
      <span className="text-sm leading-none inline-flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded border border-muted-foreground/50" /> Task
      </span>
    ),
    run: (e) => { e.chain().focus().toggleTaskList().run() },
  },
  {
    id: 'callout',
    label: 'Callout',
    previewClass: 'text-sm leading-none',
    preview: (
      <span className="text-sm leading-none rounded bg-sky-50 dark:bg-sky-950/40 border-l-2 border-sky-500 px-2 py-0.5">
        Callout
      </span>
    ),
    run: (e) => { e.chain().focus().toggleCallout('info').run() },
  },
  {
    id: 'divider',
    label: 'Divider',
    previewClass: 'text-sm leading-none',
    preview: <span className="block w-full border-t border-muted-foreground/40 my-1" />,
    run: (e) => { e.chain().focus().setHorizontalRule().run() },
  },
]

export function EditorDragHandle({ editor, onInsertImage, onEmbedVideo }: EditorDragHandleProps) {
  const [layouts, setLayouts] = useState<BlockHandleLayout[]>([])
  const [menuPos, setMenuPos] = useState<number | null>(null)
  const [submenu, setSubmenu] = useState<SubmenuId | null>(null)
  const [submenuAnchor, setSubmenuAnchor] = useState<{ top: number; left: number; openLeft: boolean } | null>(null)
  const [mounted, setMounted] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const pointerStart = useRef<{ x: number; y: number; pos: number } | null>(null)
  const didDrag = useRef(false)
  const closeSubmenuTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearSubmenuTimer = useCallback(() => {
    if (closeSubmenuTimer.current) {
      clearTimeout(closeSubmenuTimer.current)
      closeSubmenuTimer.current = null
    }
  }, [])

  const closeMenu = useCallback(() => {
    clearSubmenuTimer()
    setMenuPos(null)
    setSubmenu(null)
    setSubmenuAnchor(null)
  }, [clearSubmenuTimer])

  const hideSubmenu = useCallback(() => {
    setSubmenu(null)
    setSubmenuAnchor(null)
  }, [])

  const scheduleHideSubmenu = useCallback(() => {
    clearSubmenuTimer()
    closeSubmenuTimer.current = setTimeout(hideSubmenu, SUBMENU_CLOSE_MS)
  }, [clearSubmenuTimer, hideSubmenu])

  const showSubmenu = useCallback((id: SubmenuId, row: HTMLElement, menuEl: HTMLElement) => {
    clearSubmenuTimer()
    const rowRect = row.getBoundingClientRect()
    const menuRect = menuEl.getBoundingClientRect()
    const openLeft = menuRect.right + 4 + SUBMENU_WIDTH > window.innerWidth
    const left = openLeft ? menuRect.left - SUBMENU_WIDTH - 4 : menuRect.right + 4
    // Align flyout top with the hovered row; nudge up only if it would clip the viewport
    const maxTop = window.innerHeight - SUBMENU_HEIGHT[id] - 8
    const top = Math.max(8, Math.min(rowRect.top, maxTop))
    setSubmenu(id)
    setSubmenuAnchor({ top, left, openLeft })
  }, [clearSubmenuTimer])

  const refresh = useCallback(() => {
    if (!editor || editor.isDestroyed) return
    const next = collectBlockLayouts(editor)
    setLayouts((prev) => (sameLayouts(prev, next) ? prev : next))
  }, [editor])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => () => clearSubmenuTimer(), [clearSubmenuTimer])

  useEffect(() => {
    refresh()

    const onUpdate = () => refresh()
    editor.on('transaction', onUpdate)
    editor.on('selectionUpdate', onUpdate)
    editor.on('focus', onUpdate)
    editor.on('blur', onUpdate)

    window.addEventListener('resize', onUpdate)
    window.addEventListener('scroll', onUpdate, true)

    const scrollParent = editor.view.dom.closest('.overflow-y-auto, .overflow-auto')
    scrollParent?.addEventListener('scroll', onUpdate)

    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(onUpdate)
      : null
    ro?.observe(editor.view.dom)

    return () => {
      editor.off('transaction', onUpdate)
      editor.off('selectionUpdate', onUpdate)
      editor.off('focus', onUpdate)
      editor.off('blur', onUpdate)
      window.removeEventListener('resize', onUpdate)
      window.removeEventListener('scroll', onUpdate, true)
      scrollParent?.removeEventListener('scroll', onUpdate)
      ro?.disconnect()
    }
  }, [editor, refresh])

  useEffect(() => {
    if (menuPos == null) return

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (menuRef.current?.contains(target)) return
      if ((target as HTMLElement).closest?.('[data-block-handle]')) return
      if ((target as HTMLElement).closest?.('[data-block-submenu]')) return
      closeMenu()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu()
    }

    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuPos, closeMenu])

  const withBlock = useCallback((pos: number, action: (pos: number) => void) => {
    action(pos)
    closeMenu()
  }, [closeMenu])

  const onPointerDown = useCallback((e: React.PointerEvent, pos: number) => {
    pointerStart.current = { x: e.clientX, y: e.clientY, pos }
    didDrag.current = false
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!pointerStart.current) return
    const dx = Math.abs(e.clientX - pointerStart.current.x)
    const dy = Math.abs(e.clientY - pointerStart.current.y)
    if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
      didDrag.current = true
      if (menuPos != null) closeMenu()
    }
  }, [menuPos, closeMenu])

  const onPointerUp = useCallback((e: React.PointerEvent, pos: number) => {
    if (!didDrag.current && pointerStart.current?.pos === pos) {
      e.preventDefault()
      e.stopPropagation()
      hideSubmenu()
      setMenuPos((open) => (open === pos ? null : pos))
    }
    pointerStart.current = null
  }, [hideSubmenu])

  const onDragStart = useCallback((e: React.DragEvent, pos: number) => {
    const node = editor.state.doc.nodeAt(pos)
    if (!node) {
      e.preventDefault()
      return
    }

    didDrag.current = true
    closeMenu()
    selectBlock(editor, pos)

    const dom = editor.view.nodeDOM(pos)
    if (dom instanceof HTMLElement) {
      e.dataTransfer.setDragImage(dom, 0, 0)
    }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', node.textContent.slice(0, 40))

    const selection = NodeSelection.create(editor.state.doc, pos)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(editor.view as any).dragging = {
      slice: selection.content(),
      move: true,
    }
  }, [editor, closeMenu])

  const onDragEnd = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(editor.view as any).dragging = null
    pointerStart.current = null
    refresh()
  }, [editor, refresh])

  const onRowEnter = useCallback((id: SubmenuId | null, row: HTMLElement | null) => {
    const menuEl = menuRef.current
    if (!id || !row || !menuEl) {
      scheduleHideSubmenu()
      return
    }
    showSubmenu(id, row, menuEl)
  }, [scheduleHideSubmenu, showSubmenu])

  if (!mounted || !editor.isEditable) return null

  const menuLayout = menuPos != null ? layouts.find((l) => l.pos === menuPos) : null
  const menuTop = menuLayout ? menuLayout.top + 28 : 0
  const menuLeft = menuLayout
    ? Math.min(menuLayout.left, window.innerWidth - MENU_WIDTH - 8)
    : 0

  const sample = 'Heading'

  const submenuItems: { id: SubmenuId; label: string; icon: React.ReactNode }[] = [
    { id: 'convert', label: 'Convert', icon: <Type className="h-4 w-4" /> },
    { id: 'media', label: 'Media', icon: <ImageIcon className="h-4 w-4" /> },
    { id: 'alignment', label: 'Alignment', icon: <AlignLeft className="h-4 w-4" /> },
    { id: 'lists', label: 'Lists', icon: <ListOrdered className="h-4 w-4" /> },
    { id: 'bullets', label: 'Bullet points', icon: <List className="h-4 w-4" /> },
  ]

  return createPortal(
    <>
      {layouts.map((layout) => (
        <div
          key={layout.pos}
          data-block-handle={layout.pos}
          className="editor-drag-handle"
          style={{ top: layout.top, left: layout.left }}
          draggable
          onDragStart={(e) => onDragStart(e, layout.pos)}
          onDragEnd={onDragEnd}
        >
          <button
            type="button"
            aria-label="Drag to move block, click for actions"
            className="flex h-full w-full cursor-grab items-center justify-center active:cursor-grabbing"
            onPointerDown={(e) => onPointerDown(e, layout.pos)}
            onPointerMove={onPointerMove}
            onPointerUp={(e) => onPointerUp(e, layout.pos)}
          >
            <GripIcon />
          </button>
        </div>
      ))}

      {menuLayout && (
        <div
          ref={menuRef}
          className="fixed z-50 w-52 rounded-xl border bg-popover p-1.5 shadow-lg"
          style={{ top: menuTop, left: menuLeft }}
          onMouseLeave={scheduleHideSubmenu}
        >
          <div onMouseEnter={() => onRowEnter(null, null)}>
            <MenuItem
              icon={<Copy className="h-4 w-4" />}
              label="Duplicate"
              onClick={() => withBlock(menuLayout.pos, (pos) => duplicateBlock(editor, pos))}
            />
            <MenuItem
              icon={<Trash2 className="h-4 w-4" />}
              label="Delete"
              danger
              onClick={() => withBlock(menuLayout.pos, (pos) => deleteBlock(editor, pos))}
            />
          </div>

          <div className="my-1 h-px bg-border" />
          <SectionLabel>Format</SectionLabel>

          <div onMouseEnter={() => onRowEnter(null, null)}>
            <MenuItem
              icon={<Bold className="h-4 w-4" />}
              label="Bold"
              onClick={() => withBlock(menuLayout.pos, (pos) => runMarkOnBlock(editor, pos, (e) => { e.chain().focus().toggleBold().run() }))}
            />
            <MenuItem
              icon={<Italic className="h-4 w-4" />}
              label="Italic"
              onClick={() => withBlock(menuLayout.pos, (pos) => runMarkOnBlock(editor, pos, (e) => { e.chain().focus().toggleItalic().run() }))}
            />
            <MenuItem
              icon={<Underline className="h-4 w-4" />}
              label="Underline"
              onClick={() => withBlock(menuLayout.pos, (pos) => runMarkOnBlock(editor, pos, (e) => { e.chain().focus().toggleUnderline().run() }))}
            />
            <MenuItem
              icon={<Strikethrough className="h-4 w-4" />}
              label="Stroke"
              onClick={() => withBlock(menuLayout.pos, (pos) => runMarkOnBlock(editor, pos, (e) => { e.chain().focus().toggleStrike().run() }))}
            />
            <MenuItem
              icon={<Code className="h-4 w-4" />}
              label="Code"
              onClick={() => withBlock(menuLayout.pos, (pos) => runMarkOnBlock(editor, pos, (e) => { e.chain().focus().toggleCode().run() }))}
            />
          </div>

          <div className="my-1 h-px bg-border" />

          {submenuItems.map((item) => (
            <div
              key={item.id}
              onMouseEnter={(e) => onRowEnter(item.id, e.currentTarget)}
            >
              <MenuItem
                icon={item.icon}
                label={item.label}
                submenu
                active={submenu === item.id}
              />
            </div>
          ))}
        </div>
      )}

      {menuLayout && submenu && submenuAnchor && (
        <div
          data-block-submenu={submenu}
          className="fixed z-50 w-64 rounded-xl border bg-popover p-1.5 shadow-lg"
          style={{ top: submenuAnchor.top, left: submenuAnchor.left }}
          onMouseEnter={clearSubmenuTimer}
          onMouseLeave={scheduleHideSubmenu}
        >
          <SubmenuPanel
            id={submenu}
            pos={menuLayout.pos}
            editor={editor}
            sample={sample}
            onInsertImage={onInsertImage}
            onEmbedVideo={onEmbedVideo}
            withBlock={withBlock}
          />
        </div>
      )}
    </>,
    document.body,
  )
}

function SubmenuPanel({
  id,
  pos,
  editor,
  sample,
  onInsertImage,
  onEmbedVideo,
  withBlock,
}: {
  id: SubmenuId
  pos: number
  editor: Editor
  sample: string
  onInsertImage?: () => void
  onEmbedVideo?: () => void
  withBlock: (pos: number, action: (pos: number) => void) => void
}) {
  return (
    <>
      {id === 'convert' && (
        <>
          {CONVERT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              title={opt.label}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => withBlock(pos, (p) => runBlockCommand(editor, p, opt.run))}
              className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left hover:bg-accent transition-colors"
            >
              <span className="text-xs font-medium text-muted-foreground shrink-0">
                {opt.label}
              </span>
              {opt.preview ?? (
                <span className={opt.previewClass}>{sample}</span>
              )}
            </button>
          ))}
        </>
      )}

      {id === 'media' && (
        <>
          <SectionLabel>Media</SectionLabel>
          <MenuItem
            icon={<ImageIcon className="h-4 w-4" />}
            label="Image"
            onClick={() => withBlock(pos, (p) => {
              selectBlock(editor, p)
              onInsertImage?.()
            })}
          />
          <MenuItem
            icon={<Video className="h-4 w-4" />}
            label="Video"
            onClick={() => withBlock(pos, (p) => {
              selectBlock(editor, p)
              onEmbedVideo?.()
            })}
          />
          <MenuItem
            icon={<Minus className="h-4 w-4" />}
            label="Divider"
            onClick={() => withBlock(pos, (p) => runBlockCommand(editor, p, (e) => { e.chain().focus().setHorizontalRule().run() }))}
          />
          <MenuItem
            icon={<Megaphone className="h-4 w-4" />}
            label="Callout"
            onClick={() => withBlock(pos, (p) => runBlockCommand(editor, p, (e) => { e.chain().focus().toggleCallout('info').run() }))}
          />
        </>
      )}

      {id === 'alignment' && (
        <>
          <SectionLabel>Alignment</SectionLabel>
          {([
            { label: 'Left', value: 'left' as const, icon: AlignLeft },
            { label: 'Center', value: 'center' as const, icon: AlignCenter },
            { label: 'Right', value: 'right' as const, icon: AlignRight },
            { label: 'Justify', value: 'justify' as const, icon: AlignJustify },
          ]).map(({ label, value, icon: Icon }) => (
            <MenuItem
              key={value}
              icon={<Icon className="h-4 w-4" />}
              label={label}
              onClick={() => withBlock(pos, (p) => runBlockCommand(editor, p, (e) => { e.chain().focus().setTextAlign(value).run() }))}
            />
          ))}
        </>
      )}

      {id === 'lists' && (
        <>
          <SectionLabel>Numbered lists</SectionLabel>
          {ORDERED_LIST_STYLES.map((s) => (
            <button
              key={s.value}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => withBlock(pos, (p) => runBlockCommand(editor, p, (e) => {
                convertToOrderedList(e)
                e.chain().focus().setOrderedListStyle(s.value).run()
              }))}
              className="flex w-full items-center gap-3 rounded-lg px-2.5 py-1.5 text-sm hover:bg-accent transition-colors text-left"
            >
              <span className="w-8 shrink-0 text-center font-medium text-muted-foreground tabular-nums">
                {s.preview}
              </span>
              <span>{s.label}</span>
            </button>
          ))}
          <div className="my-1 h-px bg-border" />
          <MenuItem
            icon={<CheckSquare className="h-4 w-4" />}
            label="Checklist"
            onClick={() => withBlock(pos, (p) => runBlockCommand(editor, p, (e) => { e.chain().focus().toggleTaskList().run() }))}
          />
        </>
      )}

      {id === 'bullets' && (
        <>
          <SectionLabel>Bullet style</SectionLabel>
          {BULLET_LIST_STYLES.map((s) => (
            <button
              key={s.value}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => withBlock(pos, (p) => runBlockCommand(editor, p, (e) => {
                e.chain().focus().setBulletListStyle(s.value).run()
              }))}
              className="flex w-full items-center gap-3 rounded-lg px-2.5 py-1.5 text-sm hover:bg-accent transition-colors text-left"
            >
              <span className="w-8 shrink-0 text-center text-base leading-none text-muted-foreground">
                {s.preview}
              </span>
              <span>{s.label}</span>
            </button>
          ))}
        </>
      )}
    </>
  )
}
