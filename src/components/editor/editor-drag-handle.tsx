'use client'

import { DragHandle } from '@tiptap/extension-drag-handle-react'

interface EditorDragHandleProps {
  editor: import('@tiptap/react').Editor
}

export function EditorDragHandle({ editor }: EditorDragHandleProps) {
  return (
    <DragHandle
      editor={editor}
      className="editor-drag-handle"
    >
      <svg width="10" height="16" viewBox="0 0 10 16" className="opacity-40 hover:opacity-80">
        <circle cx="2" cy="3" r="1.2" fill="currentColor" />
        <circle cx="2" cy="8" r="1.2" fill="currentColor" />
        <circle cx="2" cy="13" r="1.2" fill="currentColor" />
        <circle cx="7" cy="3" r="1.2" fill="currentColor" />
        <circle cx="7" cy="8" r="1.2" fill="currentColor" />
        <circle cx="7" cy="13" r="1.2" fill="currentColor" />
      </svg>
    </DragHandle>
  )
}
