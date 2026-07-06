'use client'

import { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Undo2, Redo2, Bold, Italic, Underline, Strikethrough, Code, Highlighter, RemoveFormatting,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, CheckSquare, Quote, Code2, Table2, Minus, Link2,
  ChevronDown, ImageIcon, Subscript, Superscript, IndentIncrease, IndentDecrease,
  Baseline, Keyboard, Search, MessageSquarePlus, Video, Download, Printer,
  Maximize2, Minimize2, ListTree,
} from 'lucide-react'
import { ToolbarPopover } from './toolbar-popover'
import { TableGridPicker } from './table-grid-picker'
import { ColorPickerGrid } from './color-picker-grid'
import { EditorMoreMenu } from './editor-more-menu'
import { AiDropdown } from './ai/ai-dropdown'
import {
  canLiftListItem, canSinkListItem, convertToBulletList, convertToOrderedList,
  liftListItem, sinkListItem,
} from './editor-list-utils'
import {
  FONT_FAMILIES, TEXT_COLORS, HIGHLIGHT_COLORS,
} from './editor-constants'
import { BULLET_LIST_STYLES, ORDERED_LIST_STYLES } from './extensions/list-style'
import { ListStylePreview } from './list-style-preview'
import type { CalloutType } from './extensions/callout'
import {
  TOOLBAR_SEGMENT_ORDER, useToolbarOverflow, type ToolbarSegmentId,
} from './use-toolbar-overflow'
import {
  copyToClipboard, downloadText, exportHtml, exportJson, exportMarkdown, printEditorContent,
} from './editor-export'
import { useTocStore } from '@/lib/store/use-toc-store'
import { useToolbarPopovers } from './use-toolbar-popovers'
import { HEADING_STYLE_OPTIONS, applyHeadingStyle, isHeadingStyleActive } from '@/lib/editor/heading-style-options'
import { HeadingStyleMenuItem } from './heading-style-preview'
import { FontSizePopover } from './font-size-popover'
import { labelFromFontSizeAttr } from '@/lib/editor/font-size-utils'

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
      className={`h-8 min-w-8 px-1.5 inline-flex items-center justify-center rounded-[3px] text-sm transition-colors disabled:opacity-40 shrink-0 ${
        active ? 'bg-[#cce0ff] text-[#185abd] dark:bg-primary/20 dark:text-primary' : 'hover:bg-[#e8e8e8] dark:hover:bg-white/10 text-foreground'
      } ${className ?? ''}`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-6 bg-[#d1d1d1] dark:bg-border/80 mx-1 self-center shrink-0" />
}

function ToolGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex items-center gap-px shrink-0 ${className ?? ''}`}>{children}</div>
}

const ALIGN_OPTIONS = [
  { label: 'Left align', value: 'left' as const, icon: AlignLeft },
  { label: 'Center align', value: 'center' as const, icon: AlignCenter },
  { label: 'Right align', value: 'right' as const, icon: AlignRight },
  { label: 'Justify', value: 'justify' as const, icon: AlignJustify },
]

function ListMenuItem({
  onClick, icon, label,
}: {
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-x-2.5 px-3 py-1.5 text-sm hover:bg-muted rounded-sm text-left"
    >
      <span className="list-style-preview-slot flex items-center justify-center">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

function ListStyleSection({
  title, items, onSelect,
}: {
  title: string
  items: readonly { label: string; value: string; preview?: string }[]
  onSelect: (value: string) => void
}) {
  return (
    <>
      <p className="px-3 pt-1.5 pb-0.5 pl-[2.625rem] text-[10px] uppercase text-muted-foreground font-medium">{title}</p>
      {items.map((s) => (
        <button
          key={s.value}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onSelect(s.value) }}
          className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-x-2.5 px-3 py-1.5 text-sm hover:bg-muted rounded-sm text-left"
        >
          <ListStylePreview value={s.value} preview={s.preview} />
          <span>{s.label}</span>
        </button>
      ))}
    </>
  )
}

function SegmentWrap({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5 shrink-0">{children}</div>
}

function RibbonDropdownBtn({
  buttonRef,
  onClick,
  active,
  title,
  children,
}: {
  buttonRef: React.RefObject<HTMLButtonElement | null>
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      ref={buttonRef as React.Ref<HTMLButtonElement>}
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className={`h-8 flex items-center gap-0.5 px-1 rounded-[3px] shrink-0 transition-colors ${
        active
          ? 'bg-[#cce0ff] text-[#185abd] dark:bg-primary/20 dark:text-primary'
          : 'hover:bg-[#e8e8e8] dark:hover:bg-white/10 text-foreground'
      }`}
    >
      {children}
    </button>
  )
}

export function EditorToolbar({
  editor, onLinkClick, onImageClick, onShortcutsClick,
  focusMode, spellCheck, onToggleFocusMode, onToggleSpellCheck,
  onFindReplace, onAddComment, onEmbedVideo, onInsertCallout,
}: EditorToolbarProps) {
  const popovers = useToolbarPopovers()
  const { toggle: togglePopover, close: closePopover, isOpen } = popovers

  const headingRef = useRef<HTMLButtonElement>(null)
  const fontRef = useRef<HTMLButtonElement>(null)
  const sizeRef = useRef<HTMLButtonElement>(null)
  const alignRef = useRef<HTMLButtonElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const bulletListRef = useRef<HTMLButtonElement>(null)
  const numberedListRef = useRef<HTMLButtonElement>(null)
  const checklistRef = useRef<HTMLButtonElement>(null)
  const textColorRef = useRef<HTMLButtonElement>(null)
  const highlightRef = useRef<HTMLButtonElement>(null)
  const calloutRef = useRef<HTMLButtonElement>(null)
  const exportRef = useRef<HTMLButtonElement>(null)
  const [exportStatus, setExportStatus] = useState('')
  const [, setToolbarTick] = useState(0)

  useEffect(() => {
    const refresh = () => setToolbarTick((n) => n + 1)
    editor.on('selectionUpdate', refresh)
    editor.on('transaction', refresh)
    return () => {
      editor.off('selectionUpdate', refresh)
      editor.off('transaction', refresh)
    }
  }, [editor])

  const { containerRef, measureRef, visibleCount, hasOverflow } = useToolbarOverflow(TOOLBAR_SEGMENT_ORDER.length)
  const openTocTemplateModal = useTocStore((s) => s.openTemplateModal)

  const currentHeading = HEADING_STYLE_OPTIONS.find((h) =>
    isHeadingStyleActive(h, (name, attrs) => editor.isActive(name, attrs)),
  ) ?? HEADING_STYLE_OPTIONS[0]

  const currentFont = FONT_FAMILIES.find((f) => f.value === (editor.getAttributes('textStyle').fontFamily as string)) ?? FONT_FAMILIES[0]
  const currentSize = labelFromFontSizeAttr(editor.getAttributes('textStyle').fontSize as string | undefined)
  const currentAlign = ALIGN_OPTIONS.find((a) => editor.isActive({ textAlign: a.value })) ?? ALIGN_OPTIONS[0]
  const AlignIcon = currentAlign.icon
  const textColor = editor.getAttributes('textStyle').color as string | undefined
  const highlightColor = editor.getAttributes('highlight').color as string | undefined

  const flashExport = (msg: string) => {
    setExportStatus(msg)
    setTimeout(() => setExportStatus(''), 2000)
  }

  const segments: Record<ToolbarSegmentId, React.ReactNode> = {
    history: (
      <SegmentWrap>
        <ToolGroup>
          <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Undo (Ctrl+Z)" disabled={!editor.can().undo()}>
            <Undo2 className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Redo (Ctrl+Y)" disabled={!editor.can().redo()}>
            <Redo2 className="w-4 h-4" />
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
          onMouseDown={(e) => { e.preventDefault(); togglePopover('heading') }}
          className="h-8 flex items-center gap-1 px-2 rounded-[3px] text-sm hover:bg-[#e8e8e8] dark:hover:bg-white/10 min-w-[88px] max-w-[112px] justify-between shrink-0 border border-[#d1d1d1] dark:border-border bg-white dark:bg-background"
        >
          <span className="truncate">{currentHeading.label}</span>
          <ChevronDown className="w-3 h-3 shrink-0 opacity-60" />
        </button>
        <ToolbarPopover open={isOpen('heading')} anchorRef={headingRef} onClose={closePopover} className="min-w-[260px] py-1 max-h-80 overflow-y-auto scrollbar-hide overscroll-contain">
          {HEADING_STYLE_OPTIONS.map((h, i) => {
            const prev = HEADING_STYLE_OPTIONS[i - 1]
            const showDivider = h.section === 'outline' && prev?.section === 'document'
            return (
              <div key={h.id}>
                {showDivider ? <div className="my-1 border-t border-border/80" /> : null}
                <HeadingStyleMenuItem
                  option={h}
                  active={isHeadingStyleActive(h, (name, attrs) => editor.isActive(name, attrs))}
                  onSelect={() => {
                    applyHeadingStyle(editor, h)
                    closePopover()
                  }}
                />
              </div>
            )
          })}
        </ToolbarPopover>

        <button
          ref={fontRef}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); togglePopover('font') }}
          className="h-8 flex items-center gap-1 px-2 rounded-[3px] text-sm hover:bg-[#e8e8e8] dark:hover:bg-white/10 min-w-[64px] max-w-[88px] justify-between shrink-0 border border-[#d1d1d1] dark:border-border bg-white dark:bg-background"
          title="Font"
        >
          <span className="truncate">{currentFont.label}</span>
          <ChevronDown className="w-3 h-3 shrink-0 opacity-60" />
        </button>
        <ToolbarPopover open={isOpen('font')} anchorRef={fontRef} onClose={closePopover} className="min-w-[180px] py-1 max-h-64 overflow-y-auto scrollbar-hide overscroll-contain">
          {FONT_FAMILIES.map((f) => (
            <button
              key={f.label}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                if (f.value) editor.chain().focus().setFontFamily(f.value).run()
                else editor.chain().focus().unsetFontFamily().run()
                closePopover()
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
          onMouseDown={(e) => { e.preventDefault(); togglePopover('size') }}
          className="h-8 flex items-center justify-center gap-0.5 px-2 rounded-[3px] text-sm hover:bg-[#e8e8e8] dark:hover:bg-white/10 min-w-[36px] shrink-0 border border-[#d1d1d1] dark:border-border bg-white dark:bg-background"
          title="Font size"
        >
          {currentSize}
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
        <ToolbarPopover open={isOpen('size')} anchorRef={sizeRef} onClose={closePopover} className="min-w-[120px] py-1 max-h-56 overflow-y-auto scrollbar-hide overscroll-contain">
          <FontSizePopover editor={editor} onClose={closePopover} />
        </ToolbarPopover>
        <Divider />
      </SegmentWrap>
    ),
    ai: (
      <SegmentWrap>
        <AiDropdown
          editor={editor}
          onBeforeOpen={popovers.beforeExternalOpen}
          registerExternalClose={popovers.registerExternalClose}
        />
        <Divider />
      </SegmentWrap>
    ),
    format: (
      <SegmentWrap>
        <ToolGroup className="pl-1.5">
          <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Ctrl+B)">
            <Bold className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Ctrl+I)">
            <Italic className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (Ctrl+U)">
            <Underline className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
            <Strikethrough className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive('subscript')} title="Subscript">
            <Subscript className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive('superscript')} title="Superscript">
            <Superscript className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline code">
            <Code className="w-4 h-4" />
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
          onMouseDown={(e) => { e.preventDefault(); togglePopover('textColor') }}
          className="h-8 flex flex-col items-center justify-center px-1.5 rounded-[3px] hover:bg-[#e8e8e8] dark:hover:bg-white/10 shrink-0"
          title="Text color"
        >
          <Baseline className="w-4 h-4" />
          <span className="w-4 h-0.5 rounded-full mt-0.5" style={{ backgroundColor: textColor ?? '#000000' }} />
        </button>
        <ToolbarPopover open={isOpen('textColor')} anchorRef={textColorRef} onClose={closePopover} className="p-0">
          <ColorPickerGrid
            colors={TEXT_COLORS}
            value={textColor}
            onChange={(c) => { editor.chain().focus().setColor(c).run(); closePopover() }}
            onClear={() => { editor.chain().focus().unsetColor().run(); closePopover() }}
            clearLabel="Reset color"
          />
        </ToolbarPopover>

        <button
          ref={highlightRef}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); togglePopover('highlight') }}
          className="h-8 flex flex-col items-center justify-center px-1.5 rounded-[3px] hover:bg-[#e8e8e8] dark:hover:bg-white/10 shrink-0"
          title="Highlight color"
        >
          <Highlighter className="w-4 h-4" />
          <span className="w-4 h-0.5 rounded-full mt-0.5" style={{ backgroundColor: highlightColor ?? '#ffff00' }} />
        </button>
        <ToolbarPopover open={isOpen('highlight')} anchorRef={highlightRef} onClose={closePopover} className="p-0">
          <ColorPickerGrid
            colors={HIGHLIGHT_COLORS}
            value={highlightColor}
            onChange={(c) => { editor.chain().focus().toggleHighlight({ color: c }).run(); closePopover() }}
            onClear={() => { editor.chain().focus().unsetHighlight().run(); closePopover() }}
            clearLabel="Remove highlight"
          />
        </ToolbarPopover>
        <Divider />
      </SegmentWrap>
    ),
    clearFormat: (
      <SegmentWrap>
        <ToolBtn onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} title="Clear formatting">
          <RemoveFormatting className="w-4 h-4" />
        </ToolBtn>
        <Divider />
      </SegmentWrap>
    ),
    align: (
      <SegmentWrap>
        <button
          ref={alignRef}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); togglePopover('align') }}
          className="h-8 flex items-center gap-0.5 px-1 rounded-[3px] hover:bg-[#e8e8e8] dark:hover:bg-white/10 shrink-0"
          title="Alignment"
        >
          <AlignIcon className="w-4 h-4" />
          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
        </button>
        <ToolbarPopover open={isOpen('align')} anchorRef={alignRef} onClose={closePopover} className="p-1">
          <div className="flex items-center gap-0.5">
            {ALIGN_OPTIONS.map(({ label, value, icon: Icon }) => (
              <ToolBtn
                key={value}
                onClick={() => { editor.chain().focus().setTextAlign(value).run(); closePopover() }}
                active={editor.isActive({ textAlign: value })}
                title={label}
              >
                <Icon className="w-4 h-4" />
              </ToolBtn>
            ))}
          </div>
        </ToolbarPopover>
        <Divider />
      </SegmentWrap>
    ),
    lists: (
      <SegmentWrap>
        <ToolGroup>
          <RibbonDropdownBtn
            buttonRef={bulletListRef}
            onClick={() => togglePopover('bulletList')}
            active={editor.isActive('bulletList')}
            title="Bulleted list"
          >
            <List className="w-4 h-4" />
            <ChevronDown className="w-2.5 h-2.5 opacity-60" />
          </RibbonDropdownBtn>
          <ToolbarPopover open={isOpen('bulletList')} anchorRef={bulletListRef} onClose={closePopover} className="p-1 min-w-[200px]">
            <ListMenuItem onClick={() => { convertToBulletList(editor); closePopover() }} icon={<List className="w-4 h-4" />} label="Bulleted list" />
            <div className="border-t my-1" />
            <ListStyleSection
              title="Bullet style"
              items={BULLET_LIST_STYLES}
              onSelect={(v) => { editor.chain().focus().setBulletListStyle(v).run(); closePopover() }}
            />
          </ToolbarPopover>

          <RibbonDropdownBtn
            buttonRef={numberedListRef}
            onClick={() => togglePopover('numberedList')}
            active={editor.isActive('orderedList')}
            title="Numbered list"
          >
            <ListOrdered className="w-4 h-4" />
            <ChevronDown className="w-2.5 h-2.5 opacity-60" />
          </RibbonDropdownBtn>
          <ToolbarPopover open={isOpen('numberedList')} anchorRef={numberedListRef} onClose={closePopover} className="p-1 min-w-[200px]">
            <ListMenuItem onClick={() => { convertToOrderedList(editor); closePopover() }} icon={<ListOrdered className="w-4 h-4" />} label="Numbered list" />
            <div className="border-t my-1" />
            <ListStyleSection
              title="Number style"
              items={ORDERED_LIST_STYLES}
              onSelect={(v) => { editor.chain().focus().setOrderedListStyle(v).run(); closePopover() }}
            />
          </ToolbarPopover>

          <RibbonDropdownBtn
            buttonRef={checklistRef}
            onClick={() => togglePopover('checklist')}
            active={editor.isActive('taskList')}
            title="Checklist"
          >
            <CheckSquare className="w-4 h-4" />
            <ChevronDown className="w-2.5 h-2.5 opacity-60" />
          </RibbonDropdownBtn>
          <ToolbarPopover open={isOpen('checklist')} anchorRef={checklistRef} onClose={closePopover} className="p-1 min-w-[180px]">
            <ListMenuItem onClick={() => { editor.chain().focus().toggleTaskList().run(); closePopover() }} icon={<CheckSquare className="w-4 h-4" />} label="Checklist" />
          </ToolbarPopover>
        </ToolGroup>
      </SegmentWrap>
    ),
    indent: (
      <SegmentWrap>
        <ToolBtn onClick={() => sinkListItem(editor)} title="Increase indent (Tab)" disabled={!canSinkListItem(editor)}>
          <IndentIncrease className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => liftListItem(editor)} title="Decrease indent (Shift+Tab)" disabled={!canLiftListItem(editor)}>
          <IndentDecrease className="w-4 h-4" />
        </ToolBtn>
        <Divider />
      </SegmentWrap>
    ),
    insert: (
      <SegmentWrap>
        <ToolGroup>
          <div ref={tableRef}>
            <ToolBtn onClick={() => togglePopover('table')} active={isOpen('table')} title="Insert table">
              <Table2 className="w-4 h-4" />
            </ToolBtn>
          </div>
          <ToolbarPopover open={isOpen('table')} anchorRef={tableRef} onClose={closePopover} className="p-0">
            <TableGridPicker onSelect={(rows, cols) => { editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run(); closePopover() }} />
          </ToolbarPopover>
          <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal line">
            <Minus className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={onLinkClick} active={editor.isActive('link')} title="Link (Ctrl+K)">
            <Link2 className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={onImageClick} title="Image">
            <ImageIcon className="w-4 h-4" />
          </ToolBtn>
        </ToolGroup>
        <Divider />
      </SegmentWrap>
    ),
    blocks: (
      <SegmentWrap>
        <ToolGroup>
          <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote">
            <Quote className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code block">
            <Code2 className="w-4 h-4" />
          </ToolBtn>
        </ToolGroup>
        <Divider />
      </SegmentWrap>
    ),
    toc: (
      <SegmentWrap>
        <ToolBtn onClick={openTocTemplateModal} title="Index / table of contents style">
          <ListTree className="w-4 h-4" />
        </ToolBtn>
        <Divider />
      </SegmentWrap>
    ),
    shortcuts: (
      <SegmentWrap>
        <ToolBtn onClick={onShortcutsClick} title="Keyboard shortcuts">
          <Keyboard className="w-4 h-4" />
        </ToolBtn>
        <Divider />
      </SegmentWrap>
    ),
    findReplace: (
      <SegmentWrap>
        <ToolBtn onClick={onFindReplace} title="Find & replace (Ctrl+F)">
          <Search className="w-4 h-4" />
        </ToolBtn>
      </SegmentWrap>
    ),
    comment: (
      <SegmentWrap>
        <ToolBtn onClick={onAddComment} title="Add comment">
          <MessageSquarePlus className="w-4 h-4" />
        </ToolBtn>
      </SegmentWrap>
    ),
    embedVideo: (
      <SegmentWrap>
        <ToolBtn onClick={onEmbedVideo} title="Embed video">
          <Video className="w-4 h-4" />
        </ToolBtn>
      </SegmentWrap>
    ),
    callout: (
      <SegmentWrap>
        <button
          ref={calloutRef}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); togglePopover('callout') }}
          className="h-8 flex items-center gap-0.5 px-1.5 rounded-[3px] text-sm hover:bg-[#e8e8e8] dark:hover:bg-white/10 shrink-0"
          title="Callout block"
        >
          Callout
          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
        </button>
        <ToolbarPopover open={isOpen('callout')} anchorRef={calloutRef} onClose={closePopover} className="py-1 min-w-[140px]">
          {(['info', 'warning', 'error', 'success'] as CalloutType[]).map((type) => (
            <button
              key={type}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onInsertCallout(type); closePopover() }}
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
          onMouseDown={(e) => { e.preventDefault(); togglePopover('export') }}
          className="h-8 flex items-center gap-0.5 px-1.5 rounded-[3px] hover:bg-[#e8e8e8] dark:hover:bg-white/10 shrink-0"
          title="Export"
        >
          <Download className="w-4 h-4" />
          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
        </button>
        <ToolbarPopover open={isOpen('export')} anchorRef={exportRef} onClose={closePopover} className="py-1 min-w-[160px]">
          <button type="button" onMouseDown={(e) => { e.preventDefault(); copyToClipboard(exportHtml(editor)).then(() => flashExport('HTML copied')); closePopover() }} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-sm text-left">
            Copy HTML
          </button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); copyToClipboard(exportMarkdown(editor)).then(() => flashExport('Markdown copied')); closePopover() }} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-sm text-left">
            Copy Markdown
          </button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); downloadText(exportMarkdown(editor), 'document.md', 'text/markdown'); closePopover() }} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-sm text-left">
            Download Markdown
          </button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); downloadText(exportJson(editor), 'document.json', 'application/json'); closePopover() }} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-sm text-left">
            Download JSON
          </button>
        </ToolbarPopover>
      </SegmentWrap>
    ),
    print: (
      <SegmentWrap>
        <ToolBtn onClick={() => printEditorContent(editor)} title="Print preview">
          <Printer className="w-4 h-4" />
        </ToolBtn>
      </SegmentWrap>
    ),
    focusMode: (
      <SegmentWrap>
        <ToolBtn onClick={onToggleFocusMode} active={focusMode} title={focusMode ? 'Exit focus mode' : 'Focus mode'}>
          {focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </ToolBtn>
      </SegmentWrap>
    ),
    spellCheck: (
      <SegmentWrap>
        <ToolBtn onClick={onToggleSpellCheck} active={spellCheck} title={`Spell check ${spellCheck ? 'on' : 'off'}`}>
          <span className={`text-[11px] font-semibold px-0.5 ${spellCheck ? '' : 'opacity-60'}`}>ABC</span>
        </ToolBtn>
      </SegmentWrap>
    ),
  }

  const segmentNodes = TOOLBAR_SEGMENT_ORDER.map((id) => (
    <div key={id}>{segments[id]}</div>
  ))

  const overflowSegments = TOOLBAR_SEGMENT_ORDER.slice(visibleCount)

  return (
    <div ref={containerRef} className="relative bg-[#f3f3f3] dark:bg-muted/30 flex items-center gap-1 px-4 py-3.5 overflow-hidden w-full">
      <div
        ref={measureRef}
        className="absolute left-0 top-0 flex items-center gap-1 invisible pointer-events-none opacity-0 whitespace-nowrap"
        aria-hidden
      >
        {segmentNodes}
      </div>

      <div className="flex items-center gap-1 flex-nowrap min-w-0 flex-1 overflow-hidden">
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
        <span className="fixed bottom-4 right-4 z-[10000] bg-foreground text-background text-sm px-3 py-1.5 rounded-md shadow-lg">
          {exportStatus}
        </span>
      )}
    </div>
  )
}
