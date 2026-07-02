'use client'

import { useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Undo2, Redo2, Bold, Italic, Underline, Strikethrough, Code, Highlighter, RemoveFormatting,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, CheckSquare, Quote, Code2, Table2, Minus, Link2,
  ChevronDown, ImageIcon, Subscript, Superscript, IndentIncrease, IndentDecrease,
  Baseline, Keyboard, Search, MessageSquarePlus, Video, Download, Printer,
  Maximize2, Minimize2,
} from 'lucide-react'
import { ToolbarPopover } from './toolbar-popover'
import { TableGridPicker } from './table-grid-picker'
import { ColorPickerGrid } from './color-picker-grid'
import { EditorMoreMenu } from './editor-more-menu'
import { canLiftListItem, canSinkListItem, liftListItem, sinkListItem } from './editor-list-utils'
import {
  FONT_FAMILIES, FONT_SIZES, TEXT_COLORS, HIGHLIGHT_COLORS,
} from './editor-constants'
import { BULLET_LIST_STYLES, ORDERED_LIST_STYLES } from './extensions/list-style'
import type { CalloutType } from './extensions/callout'
import {
  TOOLBAR_SEGMENT_ORDER, useToolbarOverflow, type ToolbarSegmentId,
} from './use-toolbar-overflow'
import {
  copyToClipboard, downloadText, exportHtml, exportJson, exportMarkdown, printEditorContent,
} from './editor-export'

interface EditorToolbarProps {
  editor: Editor
  onLinkClick: () => void
  onImageClick: () => void
  onShortcutsClick: () => void
  focusMode: boolean
  spellCheck: boolean
  onToggleFocusMode: () => void
  onToggleSpellCheck: () => void
  onFindReplace: () => void
  onAddComment: () => void
  onEmbedVideo: () => void
  onInsertCallout: (type: CalloutType) => void
}

function ToolBtn({
  onClick, active, title, children, disabled, className,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={title}
      disabled={disabled}
      className={`h-7 min-w-7 px-1 inline-flex items-center justify-center rounded-[3px] text-sm transition-colors disabled:opacity-40 shrink-0 ${
        active ? 'bg-[#cce0ff] text-[#185abd] dark:bg-primary/20 dark:text-primary' : 'hover:bg-[#e8e8e8] dark:hover:bg-white/10 text-foreground'
      } ${className ?? ''}`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-[#d1d1d1] dark:bg-border/80 mx-1 self-center shrink-0" />
}

function ToolGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-px shrink-0">{children}</div>
}

const HEADING_OPTIONS = [
  { label: 'Normal text', value: 0 },
  { label: 'Heading 1', value: 1 },
  { label: 'Heading 2', value: 2 },
  { label: 'Heading 3', value: 3 },
  { label: 'Heading 4', value: 4 },
] as const

const ALIGN_OPTIONS = [
  { label: 'Left align', value: 'left' as const, icon: AlignLeft },
  { label: 'Center align', value: 'center' as const, icon: AlignCenter },
  { label: 'Right align', value: 'right' as const, icon: AlignRight },
  { label: 'Justify', value: 'justify' as const, icon: AlignJustify },
]

function ListMenuItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-sm"
    >
      {children}
    </button>
  )
}

function ListStyleSection({
  title, items, onSelect,
}: {
  title: string
  items: readonly { label: string; value: string }[]
  onSelect: (value: string) => void
}) {
  return (
    <>
      <p className="px-3 pt-1 pb-0.5 text-[10px] uppercase text-muted-foreground font-medium">{title}</p>
      {items.map((s) => (
        <button
          key={s.value}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onSelect(s.value) }}
          className="flex w-full items-center px-3 py-1.5 text-sm hover:bg-muted rounded-sm text-left"
        >
          {s.label}
        </button>
      ))}
    </>
  )
}

function SegmentWrap({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5 shrink-0">{children}</div>
}

export function EditorToolbar({
  editor, onLinkClick, onImageClick, onShortcutsClick,
  focusMode, spellCheck, onToggleFocusMode, onToggleSpellCheck,
  onFindReplace, onAddComment, onEmbedVideo, onInsertCallout,
}: EditorToolbarProps) {
  const [headingOpen, setHeadingOpen] = useState(false)
  const [fontOpen, setFontOpen] = useState(false)
  const [sizeOpen, setSizeOpen] = useState(false)
  const [alignOpen, setAlignOpen] = useState(false)
  const [tableOpen, setTableOpen] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [textColorOpen, setTextColorOpen] = useState(false)
  const [highlightOpen, setHighlightOpen] = useState(false)
  const [calloutOpen, setCalloutOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportStatus, setExportStatus] = useState('')

  const headingRef = useRef<HTMLButtonElement>(null)
  const fontRef = useRef<HTMLButtonElement>(null)
  const sizeRef = useRef<HTMLButtonElement>(null)
  const alignRef = useRef<HTMLButtonElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLButtonElement>(null)
  const textColorRef = useRef<HTMLButtonElement>(null)
  const highlightRef = useRef<HTMLButtonElement>(null)
  const calloutRef = useRef<HTMLButtonElement>(null)
  const exportRef = useRef<HTMLButtonElement>(null)
  const tableCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { containerRef, measureRef, visibleCount, hasOverflow } = useToolbarOverflow(TOOLBAR_SEGMENT_ORDER.length)

  const currentHeading = HEADING_OPTIONS.find((h) =>
    h.value === 0 ? editor.isActive('paragraph') : editor.isActive('heading', { level: h.value }),
  ) ?? HEADING_OPTIONS[0]

  const currentFont = FONT_FAMILIES.find((f) => f.value === (editor.getAttributes('textStyle').fontFamily as string)) ?? FONT_FAMILIES[0]
  const currentSize = FONT_SIZES.find((s) => s.value === (editor.getAttributes('textStyle').fontSize as string))?.label ?? '11'
  const currentAlign = ALIGN_OPTIONS.find((a) => editor.isActive({ textAlign: a.value })) ?? ALIGN_OPTIONS[0]
  const AlignIcon = currentAlign.icon
  const textColor = editor.getAttributes('textStyle').color as string | undefined
  const highlightColor = editor.getAttributes('highlight').color as string | undefined

  const openTable = () => {
    if (tableCloseTimer.current) clearTimeout(tableCloseTimer.current)
    setTableOpen(true)
  }
  const scheduleCloseTable = () => { tableCloseTimer.current = setTimeout(() => setTableOpen(false), 150) }
  const cancelCloseTable = () => { if (tableCloseTimer.current) clearTimeout(tableCloseTimer.current) }

  const flashExport = (msg: string) => {
    setExportStatus(msg)
    setTimeout(() => setExportStatus(''), 2000)
  }

  const segments: Record<ToolbarSegmentId, React.ReactNode> = {
    history: (
      <SegmentWrap>
        <ToolGroup>
          <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Undo (Ctrl+Z)" disabled={!editor.can().undo()}>
            <Undo2 className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Redo (Ctrl+Y)" disabled={!editor.can().redo()}>
            <Redo2 className="w-3.5 h-3.5" />
          </ToolBtn>
        </ToolGroup>
        <Divider />
      </SegmentWrap>
    ),
    styles: (
      <SegmentWrap>
        <button
          ref={headingRef}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); setHeadingOpen((o) => !o) }}
          className="h-7 flex items-center gap-1 px-2 rounded-[3px] text-xs hover:bg-[#e8e8e8] dark:hover:bg-white/10 min-w-[80px] max-w-[100px] justify-between shrink-0 border border-[#d1d1d1] dark:border-border bg-white dark:bg-background"
        >
          <span className="truncate">{currentHeading.label}</span>
          <ChevronDown className="w-3 h-3 shrink-0 opacity-60" />
        </button>
        <ToolbarPopover open={headingOpen} anchorRef={headingRef} onClose={() => setHeadingOpen(false)} className="min-w-[160px] py-1">
          {HEADING_OPTIONS.map((h) => (
            <button
              key={h.value}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                if (h.value === 0) editor.chain().focus().setParagraph().run()
                else editor.chain().focus().setHeading({ level: h.value as 1 | 2 | 3 | 4 }).run()
                setHeadingOpen(false)
              }}
              className={`block w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${currentHeading.value === h.value ? 'bg-primary/10 text-primary' : ''}`}
            >
              {h.label}
            </button>
          ))}
        </ToolbarPopover>

        <button
          ref={fontRef}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); setFontOpen((o) => !o) }}
          className="h-7 flex items-center gap-1 px-2 rounded-[3px] text-xs hover:bg-[#e8e8e8] dark:hover:bg-white/10 min-w-[64px] max-w-[88px] justify-between shrink-0 border border-[#d1d1d1] dark:border-border bg-white dark:bg-background"
          title="Font"
        >
          <span className="truncate">{currentFont.label}</span>
          <ChevronDown className="w-3 h-3 shrink-0 opacity-60" />
        </button>
        <ToolbarPopover open={fontOpen} anchorRef={fontRef} onClose={() => setFontOpen(false)} className="min-w-[180px] py-1 max-h-64 overflow-y-auto">
          {FONT_FAMILIES.map((f) => (
            <button
              key={f.label}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                if (f.value) editor.chain().focus().setFontFamily(f.value).run()
                else editor.chain().focus().unsetFontFamily().run()
                setFontOpen(false)
              }}
              className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-muted ${currentFont.label === f.label ? 'bg-primary/10 text-primary' : ''}`}
              style={{ fontFamily: f.value || undefined }}
            >
              {f.label}
            </button>
          ))}
        </ToolbarPopover>

        <button
          ref={sizeRef}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); setSizeOpen((o) => !o) }}
          className="h-7 flex items-center justify-center gap-0.5 px-2 rounded-[3px] text-xs hover:bg-[#e8e8e8] dark:hover:bg-white/10 min-w-[36px] shrink-0 border border-[#d1d1d1] dark:border-border bg-white dark:bg-background"
          title="Font size"
        >
          {currentSize}
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
        <ToolbarPopover open={sizeOpen} anchorRef={sizeRef} onClose={() => setSizeOpen(false)} className="min-w-[80px] py-1 max-h-56 overflow-y-auto">
          {FONT_SIZES.map((s) => (
            <button
              key={s.value}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                editor.chain().focus().setFontSize(s.value).run()
                setSizeOpen(false)
              }}
              className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-muted ${currentSize === s.label ? 'bg-primary/10 text-primary' : ''}`}
            >
              {s.label}
            </button>
          ))}
        </ToolbarPopover>
        <Divider />
      </SegmentWrap>
    ),
    format: (
      <SegmentWrap>
        <ToolGroup>
          <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Ctrl+B)">
            <Bold className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Ctrl+I)">
            <Italic className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (Ctrl+U)">
            <Underline className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
            <Strikethrough className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive('subscript')} title="Subscript">
            <Subscript className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive('superscript')} title="Superscript">
            <Superscript className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline code">
            <Code className="w-3.5 h-3.5" />
          </ToolBtn>
        </ToolGroup>
        <Divider />
      </SegmentWrap>
    ),
    colors: (
      <SegmentWrap>
        <button
          ref={textColorRef}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); setTextColorOpen((o) => !o) }}
          className="h-7 flex flex-col items-center justify-center px-1.5 rounded-[3px] hover:bg-[#e8e8e8] dark:hover:bg-white/10 shrink-0"
          title="Text color"
        >
          <Baseline className="w-3.5 h-3.5" />
          <span className="w-4 h-0.5 rounded-full mt-0.5" style={{ backgroundColor: textColor ?? '#000000' }} />
        </button>
        <ToolbarPopover open={textColorOpen} anchorRef={textColorRef} onClose={() => setTextColorOpen(false)} className="p-0">
          <ColorPickerGrid
            colors={TEXT_COLORS}
            value={textColor}
            onChange={(c) => { editor.chain().focus().setColor(c).run(); setTextColorOpen(false) }}
            onClear={() => { editor.chain().focus().unsetColor().run(); setTextColorOpen(false) }}
            clearLabel="Reset color"
          />
        </ToolbarPopover>

        <button
          ref={highlightRef}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); setHighlightOpen((o) => !o) }}
          className="h-7 flex flex-col items-center justify-center px-1.5 rounded-[3px] hover:bg-[#e8e8e8] dark:hover:bg-white/10 shrink-0"
          title="Highlight color"
        >
          <Highlighter className="w-3.5 h-3.5" />
          <span className="w-4 h-0.5 rounded-full mt-0.5" style={{ backgroundColor: highlightColor ?? '#ffff00' }} />
        </button>
        <ToolbarPopover open={highlightOpen} anchorRef={highlightRef} onClose={() => setHighlightOpen(false)} className="p-0">
          <ColorPickerGrid
            colors={HIGHLIGHT_COLORS}
            value={highlightColor}
            onChange={(c) => { editor.chain().focus().toggleHighlight({ color: c }).run(); setHighlightOpen(false) }}
            onClear={() => { editor.chain().focus().unsetHighlight().run(); setHighlightOpen(false) }}
            clearLabel="Remove highlight"
          />
        </ToolbarPopover>
        <Divider />
      </SegmentWrap>
    ),
    clearFormat: (
      <SegmentWrap>
        <ToolBtn onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} title="Clear formatting">
          <RemoveFormatting className="w-3.5 h-3.5" />
        </ToolBtn>
        <Divider />
      </SegmentWrap>
    ),
    align: (
      <SegmentWrap>
        <button
          ref={alignRef}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); setAlignOpen((o) => !o) }}
          className="h-7 flex items-center gap-0.5 px-1 rounded-[3px] hover:bg-[#e8e8e8] dark:hover:bg-white/10 shrink-0"
          title="Alignment"
        >
          <AlignIcon className="w-3.5 h-3.5" />
          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
        </button>
        <ToolbarPopover open={alignOpen} anchorRef={alignRef} onClose={() => setAlignOpen(false)} className="p-1">
          <div className="flex items-center gap-0.5">
            {ALIGN_OPTIONS.map(({ label, value, icon: Icon }) => (
              <ToolBtn
                key={value}
                onClick={() => { editor.chain().focus().setTextAlign(value).run(); setAlignOpen(false) }}
                active={editor.isActive({ textAlign: value })}
                title={label}
              >
                <Icon className="w-3.5 h-3.5" />
              </ToolBtn>
            ))}
          </div>
        </ToolbarPopover>
        <Divider />
      </SegmentWrap>
    ),
    lists: (
      <SegmentWrap>
        <button
          ref={listRef}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); setListOpen((o) => !o) }}
          className="h-7 flex items-center gap-0.5 px-1 rounded-[3px] hover:bg-[#e8e8e8] dark:hover:bg-white/10 shrink-0"
          title="Lists"
        >
          <List className="w-3.5 h-3.5" />
          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
        </button>
        <ToolbarPopover open={listOpen} anchorRef={listRef} onClose={() => setListOpen(false)} className="p-1 min-w-[180px] max-h-80 overflow-y-auto">
          <ListMenuItem onClick={() => { editor.chain().focus().toggleBulletList().run(); setListOpen(false) }}>
            <List className="w-4 h-4" /> Bulleted list
          </ListMenuItem>
          <ListMenuItem onClick={() => { editor.chain().focus().toggleOrderedList().run(); setListOpen(false) }}>
            <ListOrdered className="w-4 h-4" /> Numbered list
          </ListMenuItem>
          <ListMenuItem onClick={() => { editor.chain().focus().toggleTaskList().run(); setListOpen(false) }}>
            <CheckSquare className="w-4 h-4" /> Checklist
          </ListMenuItem>
          <div className="border-t my-1" />
          <ListStyleSection
            title="Bullet style"
            items={BULLET_LIST_STYLES}
            onSelect={(v) => { editor.chain().focus().setBulletListStyle(v).run(); setListOpen(false) }}
          />
          <div className="border-t my-1" />
          <ListStyleSection
            title="Number style"
            items={ORDERED_LIST_STYLES}
            onSelect={(v) => { editor.chain().focus().setOrderedListStyle(v).run(); setListOpen(false) }}
          />
        </ToolbarPopover>
      </SegmentWrap>
    ),
    indent: (
      <SegmentWrap>
        <ToolBtn onClick={() => sinkListItem(editor)} title="Increase indent (Tab)" disabled={!canSinkListItem(editor)}>
          <IndentIncrease className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => liftListItem(editor)} title="Decrease indent (Shift+Tab)" disabled={!canLiftListItem(editor)}>
          <IndentDecrease className="w-3.5 h-3.5" />
        </ToolBtn>
        <Divider />
      </SegmentWrap>
    ),
    insert: (
      <SegmentWrap>
        <ToolGroup>
          <div ref={tableRef} onMouseEnter={openTable} onMouseLeave={scheduleCloseTable}>
            <ToolBtn onClick={() => openTable()} active={tableOpen} title="Insert table">
              <Table2 className="w-3.5 h-3.5" />
            </ToolBtn>
          </div>
          <ToolbarPopover open={tableOpen} anchorRef={tableRef} onClose={() => setTableOpen(false)} className="p-0">
            <div onMouseEnter={cancelCloseTable} onMouseLeave={scheduleCloseTable}>
              <TableGridPicker onSelect={(rows, cols) => { editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run(); setTableOpen(false) }} />
            </div>
          </ToolbarPopover>
          <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal line">
            <Minus className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={onLinkClick} active={editor.isActive('link')} title="Link (Ctrl+K)">
            <Link2 className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={onImageClick} title="Image">
            <ImageIcon className="w-3.5 h-3.5" />
          </ToolBtn>
        </ToolGroup>
        <Divider />
      </SegmentWrap>
    ),
    blocks: (
      <SegmentWrap>
        <ToolGroup>
          <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote">
            <Quote className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code block">
            <Code2 className="w-3.5 h-3.5" />
          </ToolBtn>
        </ToolGroup>
        <Divider />
      </SegmentWrap>
    ),
    shortcuts: (
      <SegmentWrap>
        <ToolBtn onClick={onShortcutsClick} title="Keyboard shortcuts">
          <Keyboard className="w-3.5 h-3.5" />
        </ToolBtn>
        <Divider />
      </SegmentWrap>
    ),
    findReplace: (
      <SegmentWrap>
        <ToolBtn onClick={onFindReplace} title="Find & replace (Ctrl+F)">
          <Search className="w-3.5 h-3.5" />
        </ToolBtn>
      </SegmentWrap>
    ),
    comment: (
      <SegmentWrap>
        <ToolBtn onClick={onAddComment} title="Add comment">
          <MessageSquarePlus className="w-3.5 h-3.5" />
        </ToolBtn>
      </SegmentWrap>
    ),
    embedVideo: (
      <SegmentWrap>
        <ToolBtn onClick={onEmbedVideo} title="Embed video">
          <Video className="w-3.5 h-3.5" />
        </ToolBtn>
      </SegmentWrap>
    ),
    callout: (
      <SegmentWrap>
        <button
          ref={calloutRef}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); setCalloutOpen((o) => !o) }}
          className="h-7 flex items-center gap-0.5 px-1.5 rounded-[3px] text-xs hover:bg-[#e8e8e8] dark:hover:bg-white/10 shrink-0"
          title="Callout block"
        >
          Callout
          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
        </button>
        <ToolbarPopover open={calloutOpen} anchorRef={calloutRef} onClose={() => setCalloutOpen(false)} className="py-1 min-w-[140px]">
          {(['info', 'warning', 'error', 'success'] as CalloutType[]).map((type) => (
            <button
              key={type}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onInsertCallout(type); setCalloutOpen(false) }}
              className="flex w-full items-center px-3 py-2 text-sm hover:bg-muted rounded-sm text-left"
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </ToolbarPopover>
      </SegmentWrap>
    ),
    export: (
      <SegmentWrap>
        <button
          ref={exportRef}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); setExportOpen((o) => !o) }}
          className="h-7 flex items-center gap-0.5 px-1.5 rounded-[3px] hover:bg-[#e8e8e8] dark:hover:bg-white/10 shrink-0"
          title="Export"
        >
          <Download className="w-3.5 h-3.5" />
          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
        </button>
        <ToolbarPopover open={exportOpen} anchorRef={exportRef} onClose={() => setExportOpen(false)} className="py-1 min-w-[160px]">
          <button type="button" onMouseDown={(e) => { e.preventDefault(); copyToClipboard(exportHtml(editor)).then(() => flashExport('HTML copied')); setExportOpen(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-sm text-left">
            Copy HTML
          </button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); copyToClipboard(exportMarkdown(editor)).then(() => flashExport('Markdown copied')); setExportOpen(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-sm text-left">
            Copy Markdown
          </button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); downloadText(exportMarkdown(editor), 'document.md', 'text/markdown'); setExportOpen(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-sm text-left">
            Download Markdown
          </button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); downloadText(exportJson(editor), 'document.json', 'application/json'); setExportOpen(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-sm text-left">
            Download JSON
          </button>
        </ToolbarPopover>
      </SegmentWrap>
    ),
    print: (
      <SegmentWrap>
        <ToolBtn onClick={() => printEditorContent(editor)} title="Print preview">
          <Printer className="w-3.5 h-3.5" />
        </ToolBtn>
      </SegmentWrap>
    ),
    focusMode: (
      <SegmentWrap>
        <ToolBtn onClick={onToggleFocusMode} active={focusMode} title={focusMode ? 'Exit focus mode' : 'Focus mode'}>
          {focusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </ToolBtn>
      </SegmentWrap>
    ),
    spellCheck: (
      <SegmentWrap>
        <ToolBtn onClick={onToggleSpellCheck} active={spellCheck} title={`Spell check ${spellCheck ? 'on' : 'off'}`}>
          <span className={`text-[10px] font-semibold px-0.5 ${spellCheck ? '' : 'opacity-60'}`}>ABC</span>
        </ToolBtn>
      </SegmentWrap>
    ),
  }

  const segmentNodes = TOOLBAR_SEGMENT_ORDER.map((id) => (
    <div key={id}>{segments[id]}</div>
  ))

  const overflowSegments = TOOLBAR_SEGMENT_ORDER.slice(visibleCount)

  return (
    <div ref={containerRef} className="relative border-b bg-[#f3f3f3] dark:bg-muted/30 flex items-center gap-0.5 px-2 py-1.5 overflow-hidden w-full">
      <div
        ref={measureRef}
        className="absolute left-0 top-0 flex items-center gap-0.5 invisible pointer-events-none opacity-0 whitespace-nowrap"
        aria-hidden
      >
        {segmentNodes}
      </div>

      <div className="flex items-center gap-0.5 flex-nowrap min-w-0 flex-1 overflow-hidden">
        {segmentNodes.slice(0, visibleCount)}
      </div>

      {hasOverflow && (
        <EditorMoreMenu
          editor={editor}
          overflowSegments={overflowSegments}
          focusMode={focusMode}
          spellCheck={spellCheck}
          onToggleFocusMode={onToggleFocusMode}
          onToggleSpellCheck={onToggleSpellCheck}
          onFindReplace={onFindReplace}
          onAddComment={onAddComment}
          onEmbedVideo={onEmbedVideo}
          onInsertCallout={onInsertCallout}
          onLinkClick={onLinkClick}
          onImageClick={onImageClick}
          onShortcutsClick={onShortcutsClick}
        />
      )}

      {exportStatus && (
        <span className="fixed bottom-4 right-4 z-[10000] bg-foreground text-background text-xs px-3 py-1.5 rounded-md shadow-lg">
          {exportStatus}
        </span>
      )}
    </div>
  )
}
