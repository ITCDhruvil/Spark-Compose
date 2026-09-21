import { Mark, mergeAttributes } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    editorComment: {
      setComment: (attrs: { id: string; text: string; author: string; createdAt: string }) => ReturnType
      unsetComment: () => ReturnType
    }
  }
}

export const EditorComment = Mark.create({
  name: 'editorComment',

  addAttributes() {
    return {
      id: { default: null },
      text: { default: null },
      author: { default: null },
      createdAt: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-comment-id]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-comment-id': HTMLAttributes.id,
        class: 'editor-comment',
        title: HTMLAttributes.text,
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setComment:
        (attrs) =>
        ({ commands }) =>
          commands.setMark(this.name, attrs),
      unsetComment:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    }
  },
})
