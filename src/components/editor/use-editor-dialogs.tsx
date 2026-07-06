'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { LinkDialog } from './link-dialog'
import { ImageDialog } from './image-dialog'
import { KeyboardShortcutsDialog } from './keyboard-shortcuts-dialog'
import { FindReplaceDialog } from './find-replace-dialog'
import { EmbedDialog } from './embed-dialog'
import { CommentDialog } from './comment-dialog'
import { MediaDialog } from './media-dialog'
import { uploadsApi } from '@/lib/api/ai-client'
import { readImageFileAsDataUrl } from './editor-image-upload'
import { OPEN_MEDIA_EVENT } from '@/lib/editor/media-events'
import type { ImageAlign } from './extensions/resizable-image'
import type { CalloutType } from './extensions/callout'
import { setLastCallout } from '@/lib/editor/editor-preferences'

const DEFAULT_AUTHOR = 'You'

export function useEditorDialogs(editor: Editor | null) {
  const [linkOpen, setLinkOpen] = useState(false)
  const [imageOpen, setImageOpen] = useState(false)
  const [imageMode, setImageMode] = useState<'insert' | 'edit'>('insert')
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [findOpen, setFindOpen] = useState(false)
  const [embedOpen, setEmbedOpen] = useState(false)
  const [commentOpen, setCommentOpen] = useState(false)
  const [mediaOpen, setMediaOpen] = useState(false)

  useEffect(() => {
    const onOpenMedia = () => setMediaOpen(true)
    window.addEventListener(OPEN_MEDIA_EVENT, onOpenMedia)
    return () => window.removeEventListener(OPEN_MEDIA_EVENT, onOpenMedia)
  }, [])

  const openLinkDialog = useCallback(() => {
    if (!editor) return
    setLinkOpen(true)
  }, [editor])

  const openImageDialog = useCallback(() => {
    if (!editor) return
    setImageMode('insert')
    setImageOpen(true)
  }, [editor])

  const openImageEditDialog = useCallback(() => {
    if (!editor) return
    setImageMode('edit')
    setImageOpen(true)
  }, [editor])

  const openFindReplace = useCallback(() => {
    if (!editor) return
    setFindOpen(true)
  }, [editor])

  const openEmbedDialog = useCallback(() => {
    if (!editor) return
    setEmbedOpen(true)
  }, [editor])

  const openMediaDialog = useCallback(() => {
    if (!editor) return
    setMediaOpen(true)
  }, [editor])

  const openCommentDialog = useCallback(() => {
    if (!editor) return
    const { empty } = editor.state.selection
    if (empty) return
    if (editor.isActive('editorComment')) {
      editor.chain().focus().extendMarkRange('editorComment').run()
    }
    setCommentOpen(true)
  }, [editor])

  const handleLinkSubmit = useCallback((url: string, text?: string) => {
    if (!editor) return
    const { empty } = editor.state.selection
    if (text && empty) {
      editor.chain().focus().insertContent(`<a href="${url}">${text}</a>`).run()
      return
    }
    if (empty) {
      editor.chain().focus().insertContent(`<a href="${url}">${url}</a>`).run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const handleLinkRemove = useCallback(() => {
    editor?.chain().focus().extendMarkRange('link').unsetLink().run()
  }, [editor])

  const handleImageSubmit = useCallback(({ src, caption, width, align }: {
    src: string
    caption?: string
    width?: string
    align?: ImageAlign
  }) => {
    if (!editor) return
    if (imageMode === 'edit' && editor.isActive('image')) {
      editor.chain().focus().updateAttributes('image', {
        src,
        alt: caption ?? '',
        title: caption ?? '',
        caption: caption ?? '',
        align: align ?? 'center',
        sizePreset: width ?? '100',
        width: null,
        height: null,
      }).run()
      return
    }
    editor.chain().focus().insertContent({
      type: 'image',
      attrs: {
        src,
        alt: caption ?? '',
        title: caption ?? '',
        caption: caption ?? '',
        align: align ?? 'center',
        sizePreset: width ?? '100',
      },
    }).run()
  }, [editor, imageMode])

  const handleImageUpload = useCallback(async (file: File) => {
    try {
      const { url } = await uploadsApi.image(file)
      return url
    } catch {
      // Fallback so insert still works if the upload API is unavailable
      return readImageFileAsDataUrl(file)
    }
  }, [])

  const handleEmbed = useCallback((url: string) => {
    editor?.chain().focus().setVideoEmbed(url).run()
  }, [editor])

  const handleCommentSubmit = useCallback((text: string) => {
    if (!editor) return
    const chain = editor.chain().focus()
    if (editor.isActive('editorComment')) {
      chain.extendMarkRange('editorComment').updateAttributes('editorComment', {
        text,
        author: DEFAULT_AUTHOR,
        createdAt: new Date().toISOString(),
      }).run()
      return
    }
    chain.setComment({
      id: crypto.randomUUID(),
      text,
      author: DEFAULT_AUTHOR,
      createdAt: new Date().toISOString(),
    }).run()
  }, [editor])

  const handleCommentRemove = useCallback(() => {
    editor?.chain().focus().unsetComment().run()
  }, [editor])

  const insertCallout = useCallback((type: CalloutType) => {
    if (!editor) return
    const { empty } = editor.state.selection
    if (empty) {
      editor.chain().focus().insertContent({
        type: 'callout',
        attrs: { type },
        content: [{ type: 'paragraph' }],
      }).run()
    } else {
      editor.chain().focus().setCallout(type).run()
    }
    setLastCallout(type)
  }, [editor])

  const linkInitialUrl = editor?.getAttributes('link').href as string | undefined
  const imageAttrs = editor?.isActive('image') ? editor.getAttributes('image') : {}
  const commentAttrs = editor?.isActive('editorComment') ? editor.getAttributes('editorComment') : {}

  const dialogs = editor ? (
    <>
      <LinkDialog
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        initialUrl={linkInitialUrl ?? ''}
        onSubmit={handleLinkSubmit}
        onRemove={editor.isActive('link') ? handleLinkRemove : undefined}
      />
      <ImageDialog
        open={imageOpen}
        onClose={() => setImageOpen(false)}
        mode={imageMode}
        initialUrl={(imageAttrs.src as string) ?? ''}
        initialCaption={(imageAttrs.caption as string) ?? (imageAttrs.title as string) ?? (imageAttrs.alt as string) ?? ''}
        initialWidth={(imageAttrs.sizePreset as string) ?? '100'}
        initialAlign={(imageAttrs.align as ImageAlign) ?? 'center'}
        onSubmit={handleImageSubmit}
        onUpload={handleImageUpload}
      />
      <KeyboardShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <FindReplaceDialog open={findOpen} onClose={() => setFindOpen(false)} editor={editor} />
      <EmbedDialog open={embedOpen} onClose={() => setEmbedOpen(false)} onSubmit={handleEmbed} />
      <MediaDialog
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        onInsertImage={() => {
          setImageMode('insert')
          setImageOpen(true)
        }}
        onEmbedVideo={() => setEmbedOpen(true)}
      />
      <CommentDialog
        open={commentOpen}
        onClose={() => setCommentOpen(false)}
        initialText={(commentAttrs.text as string) ?? ''}
        author={(commentAttrs.author as string) ?? DEFAULT_AUTHOR}
        onSubmit={handleCommentSubmit}
        onRemove={editor.isActive('editorComment') ? handleCommentRemove : undefined}
      />
    </>
  ) : null

  return {
    dialogs,
    openLinkDialog,
    openImageDialog,
    openImageEditDialog,
    openShortcutsDialog: () => setShortcutsOpen(true),
    openFindReplace,
    openEmbedDialog,
    openMediaDialog,
    openCommentDialog,
    insertCallout,
  }
}
