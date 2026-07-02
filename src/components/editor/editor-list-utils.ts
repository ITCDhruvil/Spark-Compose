import type { Editor } from '@tiptap/react'

export function sinkListItem(editor: Editor) {
  if (editor.can().sinkListItem('taskItem')) {
    editor.chain().focus().sinkListItem('taskItem').run()
    return
  }
  if (editor.can().sinkListItem('listItem')) {
    editor.chain().focus().sinkListItem('listItem').run()
  }
}

export function liftListItem(editor: Editor) {
  if (editor.can().liftListItem('taskItem')) {
    editor.chain().focus().liftListItem('taskItem').run()
    return
  }
  if (editor.can().liftListItem('listItem')) {
    editor.chain().focus().liftListItem('listItem').run()
  }
}

export function canSinkListItem(editor: Editor) {
  return editor.can().sinkListItem('taskItem') || editor.can().sinkListItem('listItem')
}

export function canLiftListItem(editor: Editor) {
  return editor.can().liftListItem('taskItem') || editor.can().liftListItem('listItem')
}
