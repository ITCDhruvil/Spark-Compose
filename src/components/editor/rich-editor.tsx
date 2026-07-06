'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Highlight } from '@tiptap/extension-highlight'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Link from '@tiptap/extension-link'
import FontFamily from '@tiptap/extension-font-family'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Color from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import Typography from '@tiptap/extension-typography'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { createLowlight, common } from 'lowlight'

import { EditorToolbar } from './editor-toolbar'
import { TableMenu } from './table-menu'
import { ImageMenu } from './image-menu'
import { AiSelectionMenu } from './ai/ai-selection-menu'
import { AiAskFlowCard } from './ai/ai-ask-flow-card'
import { OPEN_DRAFT_ANYTHING_EVENT } from '@/lib/editor/draft-anything-events'
import { EditorDragHandle } from './editor-drag-handle'
import { TocSidebar } from './toc-sidebar'
import { HeadingWithId } from './extensions/heading-id'
import { TocBlock } from './extensions/toc-block'
import { TocTemplateModal } from './toc-template-modal'
import { AutosaveIndicator } from './autosave-indicator'
import { SlashCommands } from './slash-commands'
import { SmartPaste } from './smart-paste'
import { MarkdownShortcuts } from './extensions/markdown-shortcuts'
import { BlockShortcuts } from './extensions/block-shortcuts'
import { EmptyLineHint } from './empty-line-hint'
import { CommandPalette } from './command-palette'
import { AiAutocomplete } from './extensions/ai-autocomplete'
import { useAiSpellcheck } from './extensions/ai-spellcheck'
import { AiGrammarCheck, useAiGrammarCheck } from './extensions/ai-grammar-check'
import { useAiStore } from '@/lib/store/use-ai-store'
import { FontSize } from './extensions/font-size'
import { ResizableImage } from './extensions/resizable-image'
import { Callout } from './extensions/callout'
import { VideoEmbed } from './extensions/video-embed'
import { ChartBlock } from './extensions/chart-block'
import { KpiRow } from './extensions/kpi-row'
import { EditorComment } from './extensions/editor-comment'
import { ListStyleExtension } from './extensions/list-style'
import { BlockIndent } from './extensions/block-indent'
import { AiLoadingMark } from './extensions/ai-loading-mark'
import { AskPrompt, AskAnswer } from './extensions/ask-blocks'
import { AiIssues } from './extensions/ai-issues-block'
import { useEditorDialogs } from './use-editor-dialogs'
import { uploadsApi } from '@/lib/api/ai-client'
import { readImageFileAsDataUrl } from './editor-image-upload'

const lowlight = createLowlight(common)

export interface RichEditorProps {
  content?: string
  onChange?: (json: string, html: string) => void
  placeholder?: string
  autofocus?: boolean
  editable?: boolean
  showToc?: boolean
  minHeight?: string
}

export function RichEditor({
  content,
  onChange,
  placeholder = 'Start writing… or type / for commands',
  autofocus = false,
  editable = true,
  showToc = true,
  minHeight = '320px',
}: RichEditorProps) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [focusMode, setFocusMode] = useState(false)
  const [spellCheck, setSpellCheck] = useState(true)
  const [draftOpen, setDraftOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const skipContentSyncRef = useRef(false)
  const initialContent = useRef(parseContent(content))

  useEffect(() => {
    const openDraft = () => setDraftOpen(true)
    window.addEventListener(OPEN_DRAFT_ANYTHING_EVENT, openDraft)
    return () => window.removeEventListener(OPEN_DRAFT_ANYTHING_EVENT, openDraft)
  }, [])

  const extensions = useMemo(() => [
    StarterKit.configure({
      heading: false,
      codeBlock: false,
      link: false,
    }),
    HeadingWithId,
    TocBlock,
    CodeBlockLowlight.configure({ lowlight }),
    Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
    Highlight.configure({ multicolor: true }),
    ResizableImage,
    FontFamily,
    FontSize,
    Callout,
    VideoEmbed,
    ChartBlock,
    KpiRow,
    EditorComment,
    ListStyleExtension,
    BlockIndent,
    Table.configure({ resizable: true, allowTableNodeSelection: true }),
    TableRow,
    TableHeader,
    TableCell,
    TaskList,
    TaskItem.configure({ nested: true }),
    Placeholder.configure({ placeholder, includeChildren: true }),
    CharacterCount,
    Color,
    TextStyle,
    Subscript,
    Superscript,
    Typography,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Underline,
    AiLoadingMark,
    AskPrompt,
    AskAnswer,
    AiIssues,
    SlashCommands,
    MarkdownShortcuts,
    BlockShortcuts,
    SmartPaste,
    AiAutocomplete.configure({
      enabled: () => useAiStore.getState().autocompleteEnabled,
      scope: () => useAiStore.getState().autocompleteScope,
    }),
    AiGrammarCheck,
  ], [placeholder])

  const editorProps = useMemo(() => ({
    attributes: {
      spellcheck: spellCheck ? 'true' : 'false',
      lang: 'en',
      class: 'prose-editor',
    },
  }), [spellCheck])

  const handleEditorUpdate = useCallback(({ editor: ed }: { editor: Editor }) => {
    if (!onChange) return
    setSaveStatus('saved')
    skipContentSyncRef.current = true
    onChange(JSON.stringify(ed.getJSON()), ed.getHTML())
  }, [onChange])

  const editor = useEditor({
    immediatelyRender: true,
    extensions,
    content: initialContent.current,
    autofocus,
    editable,
    editorProps,
    onUpdate: handleEditorUpdate,
  })

  useAiSpellcheck(editor)
  const grammarPopup = useAiGrammarCheck(editor)

  const {
    dialogs,
    openLinkDialog,
    openImageDialog,
    openImageEditDialog,
    openShortcutsDialog,
    openFindReplace,
    openEmbedDialog,
    openCommentDialog,
    insertCallout,
  } = useEditorDialogs(editor)

  useEffect(() => {
    if (!editor) return
    editor.view.dom.spellcheck = spellCheck
  }, [editor, spellCheck])

  useEffect(() => {
    if (!editor || !content) return
    if (skipContentSyncRef.current) {
      skipContentSyncRef.current = false
      return
    }
    const parsed = parseContent(content)
    const currentJson = JSON.stringify(editor.getJSON())
    const incomingJson = typeof parsed === 'string' ? parsed : JSON.stringify(parsed)
    if (currentJson !== incomingJson) {
      editor.commands.setContent(parsed)
    }
  }, [content, editor])

  useEffect(() => {
    if (!editor) return
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        openLinkDialog()
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        openFindReplace()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    const dom = editor.view.dom
    dom.addEventListener('keydown', onKeyDown)
    return () => dom.removeEventListener('keydown', onKeyDown)
  }, [editor, openLinkDialog, openFindReplace])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    if (!editor || !editable) return
    const file = e.dataTransfer.files?.[0]
    if (!file?.type.startsWith('image/')) return
    e.preventDefault()
    try {
      let src: string
      try {
        src = (await uploadsApi.image(file)).url
      } catch {
        src = await readImageFileAsDataUrl(file)
      }
      editor.chain().focus().insertContent({
        type: 'image',
        attrs: { src, align: 'center', sizePreset: '100' },
      }).run()
    } catch {
      // ignore
    }
  }, [editor, editable])

  if (!editor) return null

  const charCount = editor.storage.characterCount?.characters?.() ?? 0
  const wordCount = editor.storage.characterCount?.words?.() ?? 0

  const shellClass = focusMode
    ? 'fixed inset-0 z-[100] bg-background flex flex-col overflow-hidden'
    : 'w-full'

  const showOutline = editable && showToc && !focusMode

  const editorColumn = (
    <div
      className={`editor-shell flex min-w-0 flex-col overflow-hidden ${
        focusMode ? 'flex-1 min-h-0' : 'flex-1 w-full'
      }`}
      style={!focusMode ? { minHeight } : undefined}
    >
      {editable && (
        <div className="relative z-30 shrink-0">
          <EditorToolbar
            editor={editor}
            onLinkClick={openLinkDialog}
            onImageClick={openImageDialog}
            onShortcutsClick={openShortcutsDialog}
            focusMode={focusMode}
            spellCheck={spellCheck}
            onToggleFocusMode={() => setFocusMode((f) => !f)}
            onToggleSpellCheck={() => setSpellCheck((s) => !s)}
            onFindReplace={openFindReplace}
            onAddComment={openCommentDialog}
            onEmbedVideo={openEmbedDialog}
            onInsertCallout={insertCallout}
          />
        </div>
      )}

      <div className="editor-workspace flex flex-1 flex-col min-h-0 px-3 py-0.5">
        <div className="editor-canvas relative flex flex-1 min-h-0 flex-col">
          <div
            className="editor-canvas-scroll relative flex-1 min-h-0 overflow-y-auto"
            data-editor-scroll
            onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) e.preventDefault() }}
            onDrop={handleDrop}
          >
            <EditorDragHandle
              editor={editor}
              onInsertImage={openImageDialog}
              onEmbedVideo={openEmbedDialog}
            />
            <EmptyLineHint editor={editor} />
            <TableMenu editor={editor} />
            <ImageMenu editor={editor} onEdit={openImageEditDialog} />
            <EditorContent
              editor={editor}
              className="focus:outline-none w-full flex-1 editor-content-area"
            />
          </div>
        </div>
      </div>

      {editable && <AiSelectionMenu editor={editor} />}

      {editable && (
        <div className="editor-statusbar flex shrink-0 items-center justify-between gap-4 px-4 py-1.5 text-sm text-muted-foreground">
          <span className="tabular-nums min-w-0 truncate">
            {wordCount} words | {charCount} chars | Ctrl+Shift+P commands | / slash menu
          </span>
          <AutosaveIndicator status={saveStatus} />
        </div>
      )}
    </div>
  )

  return (
    <div className={shellClass}>
      <div
        className={`w-full ${
          focusMode
            ? 'relative flex flex-col flex-1 max-w-4xl mx-auto px-4 py-4'
            : showOutline
              ? 'flex items-stretch gap-3'
              : 'relative'
        }`}
      >
        {showOutline && <TocSidebar editor={editor} />}
        <div className={showOutline && !focusMode ? 'min-w-0 flex-1' : 'w-full'}>
          {editorColumn}
        </div>
      </div>
      {editable && (
        <AiAskFlowCard
          open={draftOpen}
          onClose={() => setDraftOpen(false)}
          editor={editor}
        />
      )}
      {dialogs}
      {grammarPopup}
      {editable && (
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          editor={editor}
          actions={{
            openLinkDialog,
            openFindReplace,
            openImageDialog,
            openShortcutsDialog,
            openEmbedDialog,
            insertCallout,
            toggleFocusMode: () => setFocusMode((f) => !f),
            toggleSpellCheck: () => setSpellCheck((s) => !s),
          }}
        />
      )}
      {editable && <TocTemplateModal editor={editor} />}
    </div>
  )
}

function parseContent(content?: string): string | Record<string, unknown> {
  if (!content) return ''
  const trimmed = content.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed) as Record<string, unknown>
    } catch {
      return content
    }
  }
  return content
}
