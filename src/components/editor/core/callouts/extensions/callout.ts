import { Node, mergeAttributes } from '@tiptap/core'

export type CalloutType = 'info' | 'warning' | 'error' | 'success'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (type?: CalloutType) => ReturnType
      toggleCallout: (type?: CalloutType) => ReturnType
      unsetCallout: () => ReturnType
    }
  }
}

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'info' as CalloutType,
        parseHTML: (element) => (element.getAttribute('data-callout') as CalloutType) || 'info',
        renderHTML: (attributes) => ({
          'data-callout': attributes.type,
          class: `callout callout-${attributes.type as string}`,
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes), 0]
  },

  addCommands() {
    return {
      setCallout:
        (type: CalloutType = 'info') =>
        ({ commands }) =>
          commands.wrapIn(this.name, { type }),
      toggleCallout:
        (type: CalloutType = 'info') =>
        ({ commands }) =>
          commands.toggleWrap(this.name, { type }),
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    }
  },
})
