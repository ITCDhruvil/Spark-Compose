import { Mark, mergeAttributes } from '@tiptap/core'

/** Temporary mark for in-editor “Improving…” shimmer text. */
export const AiLoadingMark = Mark.create({
  name: 'aiLoading',
  excludes: '_',
  inclusive: false,

  parseHTML() {
    return [{ tag: 'span[data-ai-loading]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-ai-loading': '',
        class: 'ai-improve-shimmer-text',
      }),
      0,
    ]
  },
})
