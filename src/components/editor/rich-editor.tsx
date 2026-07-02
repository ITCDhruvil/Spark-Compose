'use client'

import { useEffect, useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
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
import { createLowlight, common } from 'lowlight'

import { EditorToolbar } from './editor-toolbar'
import { FloatingToolbar } from './floating-toolbar'
import { TableMenu } from './table-menu'
import { ImageMenu } from './image-menu'
import { EditorDragHandle } from './editor-drag-handle'
import { TocSidebar } from './toc-sidebar'
import { AutosaveIndicator } from './autosave-indicator'
import { SlashCommands } from './slash-commands'
import { SmartPaste } from './smart-paste'
import { FontSize } from './extensions/font-size'
import { ResizableImage } from './extensions/resizable-image'
import { Callout } from './extensions/callout'
import { VideoEmbed } from './extensions/video-embed'
import { EditorComment } from './extensions/editor-comment'
import { ListStyleExtension } from './extensions/list-style'
import { useEditorDialogs } from './use-editor-dialogs'
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

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        codeBlock: false,
        link: false,
      }),
      CodeBlockLowlight.configure({ lowlight }),
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      Highlight.configure({ multicolor: true }),
      ResizableImage,
      FontFamily,
      FontSize,
      Callout,
      VideoEmbed,
      EditorComment,
      ListStyleExtension,
      Table.configure({ resizable: true, allowTableNodeSelection: true }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
      Color,
      TextStyle,
      Subscript,
      Superscript,
      Typography,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      SlashCommands,
      SmartPaste,
    ],
    content: parseContent(content),
    autofocus,
    editable,
    editorProps: {
      attributes: {
        spellcheck: spellCheck ? 'true' : 'false',
        lang: 'en',
        class: 'prose-editor',
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (!onChange) return
      setSaveStatus('saving')
      onChange(JSON.stringify(ed.getJSON()), ed.getHTML())
      setSaveStatus('saved')
    },
  })

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
      const src = await readImageFileAsDataUrl(file)
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
    : showToc ? 'flex gap-6' : 'w-full'

  return (
    <div className={shellClass}>
      <div className={`flex-1 min-w-0 w-full ${focusMode ? 'flex flex-col max-w-4xl mx-auto px-4 py-4' : ''}`}>
        <div className={`relative border rounded-lg focus-within:ring-2 focus-within:ring-ring bg-background w-full shadow-sm ${focusMode ? 'flex-1 flex flex-col min-h-0' : ''}`}>
          {editable && (
            <div className="relative z-30 rounded-t-lg shrink-0">
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
          <div
            className={`relative ${focusMode ? 'flex-1 min-h-0 overflow-y-auto' : ''}`}
            onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) e.preventDefault() }}
            onDrop={handleDrop}
          >
            <EditorDragHandle editor={editor} />
            <FloatingToolbar editor={editor} onLinkClick={openLinkDialog} />
            <TableMenu editor={editor} />
            <ImageMenu editor={editor} onEdit={openImageEditDialog} />
            <EditorContent
              editor={editor}
              className="focus:outline-none w-full px-4 py-3 editor-content-area"
              style={{ minHeight: focusMode ? undefined : minHeight }}
            />
          </div>
          {editable && (
            <div className="flex items-center justify-between px-4 py-1.5 border-t text-xs text-muted-foreground rounded-b-lg bg-muted/10 shrink-0">
              <AutosaveIndicator status={saveStatus} />
              <span>{wordCount} words · {charCount} chars · Ctrl+K link · Ctrl+F find · / commands</span>
            </div>
          )}
        </div>
      </div>
      {editable && showToc && !focusMode && <TocSidebar editor={editor} />}
      {dialogs}
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
