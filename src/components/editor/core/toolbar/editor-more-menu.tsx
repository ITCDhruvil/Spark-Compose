'use client'

import { useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Search, MessageSquarePlus, Download, Printer, Maximize2, Minimize2,
  Video, ChevronDown, FileCode, FileText, Braces,
  RemoveFormatting, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, CheckSquare, Table2, Minus, Link2, ImageIcon,
  Quote, Code2, Keyboard, IndentIncrease, IndentDecrease,
} from 'lucide-react'
import { ToolbarPopover } from './toolbar-popover'
import {
  copyToClipboard, downloadText, exportHtml, exportJson, exportMarkdown, printEditorContent,
} from './editor-export'
import type { CalloutType } from '../callouts/extensions/callout'
import { BULLET_LIST_STYLES, ORDERED_LIST_STYLES } from '../lists/extensions/list-style'
import { ListStylePreview } from '../formatting/list-style-preview'
import { liftListItem, sinkListItem } from '../formatting/editor-list-utils'
import type { ToolbarSegmentId } from './use-toolbar-overflow'
import { AiDropdown } from '../../ai/toolbar/ai-dropdown'

interface EditorMoreMenuProps {
  editor: Editor
  aiEnabled?: boolean
  overflowSegments: ToolbarSegmentId[]
  focusMode: boolean
  spellCheck: boolean
  onToggleFocusMode: () => void
  onToggleSpellCheck: () => void
  onFindReplace: () => void
  onAddComment: () => void
  onEmbedVideo: () => void
  onInsertCallout: (type: CalloutType) => void
  onLinkClick: () => void
  onImageClick: () => void
  onShortcutsClick: () => void
}

function MenuItem({
  onClick, children, title,
}: {
  onClick: () => void
  children: React.ReactNode
  title?: string
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-x-2.5 px-3 py-1.5 text-sm hover:bg-muted rounded-sm text-left"
    >
      {children}
    </button>
  )
}

const ALIGN_OPTIONS = [
  { label: 'Left align', value: 'left' as const, icon: AlignLeft },
  { label: 'Center align', value: 'center' as const, icon: AlignCenter },
  { label: 'Right align', value: 'right' as const, icon: AlignRight },
  { label: 'Justify', value: 'justify' as const, icon: AlignJustify },
]

function OverflowItems({
  editor,
  segments,
  aiEnabled,
  close,
  onFindReplace,
  onAddComment,
  onEmbedVideo,
  onInsertCallout,
  onLinkClick,
  onImageClick,
  onShortcutsClick,
  onToggleFocusMode,
  onToggleSpellCheck,
  focusMode,
  spellCheck,
}: {
  editor: Editor
  segments: Set<ToolbarSegmentId>
  aiEnabled: boolean
  close: () => void
  onFindReplace: () => void
  onAddComment: () => void
  onEmbedVideo: () => void
  onInsertCallout: (type: CalloutType) => void
  onLinkClick: () => void
  onImageClick: () => void
  onShortcutsClick: () => void
  onToggleFocusMode: () => void
  onToggleSpellCheck: () => void
  focusMode: boolean
  spellCheck: boolean
}) {
  const [calloutOpen, setCalloutOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const calloutRef = useRef<HTMLButtonElement>(null)
  const exportRef = useRef<HTMLButtonElement>(null)

  const has = (id: ToolbarSegmentId) => segments.has(id)

  return (
    <>
      {aiEnabled && has('ai') && (
        <>
          <div className="px-3 py-1.5">
            <AiDropdown editor={editor} />
          </div>
          <div className="border-t my-1" />
        </>
      )}

      {has('clearFormat') && (
        <MenuItem onClick={() => { editor.chain().focus().unsetAllMarks().clearNodes().run(); close() }}>
          <RemoveFormatting className="w-4 h-4" /> Clear formatting
        </MenuItem>
      )}

      {has('align') && ALIGN_OPTIONS.map(({ label, value, icon: Icon }) => (
        <MenuItem key={value} onClick={() => { editor.chain().focus().setTextAlign(value).run(); close() }}>
          <Icon className="w-4 h-4" /> {label}
        </MenuItem>
      ))}

      {(has('lists') || has('indent')) && (
        <>
          {(has('clearFormat') || has('align')) && <div className="border-t my-1" />}
          {has('lists') && (
            <>
              <p className="px-3 py-1 text-[10px] uppercase text-muted-foreground font-medium">Lists</p>
              <MenuItem onClick={() => { editor.chain().focus().toggleBulletList().run(); close() }}>
                <span className="list-style-preview-slot flex items-center justify-center"><List className="w-4 h-4" /></span>
                <span>Bulleted list</span>
              </MenuItem>
              <MenuItem onClick={() => { editor.chain().focus().toggleOrderedList().run(); close() }}>
                <span className="list-style-preview-slot flex items-center justify-center"><ListOrdered className="w-4 h-4" /></span>
                <span>Numbered list</span>
              </MenuItem>
              <MenuItem onClick={() => { editor.chain().focus().toggleTaskList().run(); close() }}>
                <span className="list-style-preview-slot flex items-center justify-center"><CheckSquare className="w-4 h-4" /></span>
                <span>Checklist</span>
              </MenuItem>
              <p className="px-3 pt-1 pb-0.5 text-[10px] uppercase text-muted-foreground font-medium">Bullet style</p>
              {BULLET_LIST_STYLES.map((s) => (
                <MenuItem key={s.value} onClick={() => { editor.chain().focus().setBulletListStyle(s.value).run(); close() }}>
                  <ListStylePreview value={s.value} preview={s.preview} />
                  <span>{s.label}</span>
                </MenuItem>
              ))}
              <p className="px-3 pt-1 pb-0.5 text-[10px] uppercase text-muted-foreground font-medium">Number style</p>
              {ORDERED_LIST_STYLES.map((s) => (
                <MenuItem key={s.value} onClick={() => { editor.chain().focus().setOrderedListStyle(s.value).run(); close() }}>
                  <ListStylePreview value={s.value} preview={s.preview} />
                  <span>{s.label}</span>
                </MenuItem>
              ))}
            </>
          )}
          {has('indent') && (
            <>
              <MenuItem onClick={() => { sinkListItem(editor); close() }} title="Increase indent">
                <IndentIncrease className="w-4 h-4" /> Increase indent
              </MenuItem>
              <MenuItem onClick={() => { liftListItem(editor); close() }} title="Decrease indent">
                <IndentDecrease className="w-4 h-4" /> Decrease indent
              </MenuItem>
            </>
          )}
        </>
      )}

      {has('insert') && (
        <>
          <div className="border-t my-1" />
          <p className="px-3 py-1 text-[10px] uppercase text-muted-foreground font-medium">Insert</p>
          <MenuItem onClick={() => { editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); close() }}>
            <Table2 className="w-4 h-4" /> Table (3├ù3)
          </MenuItem>
          <MenuItem onClick={() => { editor.chain().focus().setHorizontalRule().run(); close() }}>
            <Minus className="w-4 h-4" /> Horizontal line
          </MenuItem>
          <MenuItem onClick={() => { onLinkClick(); close() }}>
            <Link2 className="w-4 h-4" /> Link
          </MenuItem>
          <MenuItem onClick={() => { onImageClick(); close() }}>
            <ImageIcon className="w-4 h-4" /> Image
          </MenuItem>
        </>
      )}

      {has('blocks') && (
        <>
          <MenuItem onClick={() => { editor.chain().focus().toggleBlockquote().run(); close() }}>
            <Quote className="w-4 h-4" /> Quote
          </MenuItem>
          <MenuItem onClick={() => { editor.chain().focus().toggleCodeBlock().run(); close() }}>
            <Code2 className="w-4 h-4" /> Code block
          </MenuItem>
        </>
      )}

      {has('shortcuts') && (
        <MenuItem onClick={() => { onShortcutsClick(); close() }}>
          <Keyboard className="w-4 h-4" /> Keyboard shortcuts
        </MenuItem>
      )}

      {has('findReplace') && (
        <MenuItem onClick={() => { onFindReplace(); close() }}>
          <Search className="w-4 h-4" /> Find & replace
        </MenuItem>
      )}

      {has('comment') && (
        <MenuItem onClick={() => { onAddComment(); close() }}>
          <MessageSquarePlus className="w-4 h-4" /> Add comment
        </MenuItem>
      )}

      {has('embedVideo') && (
        <MenuItem onClick={() => { onEmbedVideo(); close() }}>
          <Video className="w-4 h-4" /> Embed video
        </MenuItem>
      )}

      {has('callout') && (
        <>
          <button
            ref={calloutRef}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setCalloutOpen((o) => !o) }}
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-muted rounded-sm"
          >
            <span>Callout block</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>
          <ToolbarPopover open={calloutOpen} anchorRef={calloutRef} onClose={() => setCalloutOpen(false)} className="py-1 min-w-[140px]">
            {(['info', 'warning', 'error', 'success'] as CalloutType[]).map((type) => (
              <MenuItem key={type} onClick={() => { onInsertCallout(type); setCalloutOpen(false); close() }}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </MenuItem>
            ))}
          </ToolbarPopover>
        </>
      )}

      {has('export') && (
        <>
          <button
            ref={exportRef}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setExportOpen((o) => !o) }}
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-muted rounded-sm"
          >
            <span className="flex items-center gap-2"><Download className="w-4 h-4" /> Export</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>
          <ToolbarPopover open={exportOpen} anchorRef={exportRef} onClose={() => setExportOpen(false)} className="py-1 min-w-[160px]">
            <MenuItem onClick={async () => { await copyToClipboard(exportHtml(editor)); setExportOpen(false); close() }}>
              <FileCode className="w-4 h-4" /> Copy HTML
            </MenuItem>
            <MenuItem onClick={async () => { await copyToClipboard(exportMarkdown(editor)); setExportOpen(false); close() }}>
              <FileText className="w-4 h-4" /> Copy Markdown
            </MenuItem>
            <MenuItem onClick={() => { downloadText(exportMarkdown(editor), 'document.md', 'text/markdown'); setExportOpen(false); close() }}>
              <FileText className="w-4 h-4" /> Download Markdown
            </MenuItem>
            <MenuItem onClick={() => { downloadText(exportJson(editor), 'document.json', 'application/json'); setExportOpen(false); close() }}>
              <Braces className="w-4 h-4" /> Download JSON
            </MenuItem>
            <MenuItem onClick={() => { printEditorContent(editor); setExportOpen(false); close() }}>
              <Printer className="w-4 h-4" /> Print / PDF
            </MenuItem>
          </ToolbarPopover>
        </>
      )}

      {has('print') && (
        <MenuItem onClick={() => { printEditorContent(editor); close() }}>
          <Printer className="w-4 h-4" /> Print preview
        </MenuItem>
      )}

      {has('focusMode') && (
        <MenuItem onClick={() => { onToggleFocusMode(); close() }}>
          {focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          {focusMode ? 'Exit focus mode' : 'Focus mode'}
        </MenuItem>
      )}

      {has('spellCheck') && (
        <MenuItem onClick={() => { onToggleSpellCheck(); close() }}>
          <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${spellCheck ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}>
            {spellCheck ? 'Γ£ô' : ''}
          </span>
          Spell check {spellCheck ? 'on' : 'off'}
        </MenuItem>
      )}

      {/* Overflow for early segments grouped as formatting */}
      {(has('history') || has('styles') || has('format') || has('colors')) && (
        <>
          <div className="border-t my-1" />
          <p className="px-3 py-1 text-[10px] uppercase text-muted-foreground font-medium">More formatting</p>
          {has('history') && (
            <>
              <MenuItem onClick={() => { editor.chain().focus().undo().run(); close() }}>Undo</MenuItem>
              <MenuItem onClick={() => { editor.chain().focus().redo().run(); close() }}>Redo</MenuItem>
            </>
          )}
          {has('styles') && (
            <>
              <MenuItem onClick={() => { editor.chain().focus().setParagraph().run(); close() }}>Normal text</MenuItem>
              <MenuItem onClick={() => { editor.chain().focus().setHeading({ level: 1 }).run(); close() }}>Heading 1</MenuItem>
              <MenuItem onClick={() => { editor.chain().focus().setHeading({ level: 2 }).run(); close() }}>Heading 2</MenuItem>
              <MenuItem onClick={() => { editor.chain().focus().setHeading({ level: 3 }).run(); close() }}>Heading 3</MenuItem>
            </>
          )}
          {has('format') && (
            <>
              <MenuItem onClick={() => { editor.chain().focus().toggleBold().run(); close() }}>Bold</MenuItem>
              <MenuItem onClick={() => { editor.chain().focus().toggleItalic().run(); close() }}>Italic</MenuItem>
              <MenuItem onClick={() => { editor.chain().focus().toggleUnderline().run(); close() }}>Underline</MenuItem>
            </>
          )}
          {has('colors') && (
            <>
              <MenuItem onClick={() => { editor.chain().focus().setColor('#000000').run(); close() }}>Text color</MenuItem>
              <MenuItem onClick={() => { editor.chain().focus().toggleHighlight({ color: '#ffff00' }).run(); close() }}>Highlight</MenuItem>
            </>
          )}
        </>
      )}
    </>
  )
}

export function EditorMoreMenu({
  editor,
  aiEnabled = true,
  overflowSegments,
  focusMode,
  spellCheck,
  onToggleFocusMode,
  onToggleSpellCheck,
  onFindReplace,
  onAddComment,
  onEmbedVideo,
  onInsertCallout,
  onLinkClick,
  onImageClick,
  onShortcutsClick,
}: EditorMoreMenuProps) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const close = () => setOpen(false)
  const segmentSet = new Set(overflowSegments)

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onMouseDown={(e) => { e.preventDefault(); setOpen((o) => !o) }}
        className="h-7 flex items-center gap-0.5 px-1.5 rounded-[3px] text-xs hover:bg-[#e8e8e8] dark:hover:bg-white/10 shrink-0"
        title="More tools"
      >
        More
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      <ToolbarPopover open={open} anchorRef={anchorRef} onClose={() => setOpen(false)} align="end" className="py-1 min-w-[220px]">
        <OverflowItems
          editor={editor}
          aiEnabled={aiEnabled}
          segments={segmentSet}
          close={close}
          onFindReplace={onFindReplace}
          onAddComment={onAddComment}
          onEmbedVideo={onEmbedVideo}
          onInsertCallout={onInsertCallout}
          onLinkClick={onLinkClick}
          onImageClick={onImageClick}
          onShortcutsClick={onShortcutsClick}
          onToggleFocusMode={onToggleFocusMode}
          onToggleSpellCheck={onToggleSpellCheck}
          focusMode={focusMode}
          spellCheck={spellCheck}
        />
      </ToolbarPopover>
    </>
  )
}
