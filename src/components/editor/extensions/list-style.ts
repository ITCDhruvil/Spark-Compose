import { Extension } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    listStyle: {
      setBulletListStyle: (style: string) => ReturnType
      setOrderedListStyle: (style: string) => ReturnType
    }
  }
}

export const BULLET_LIST_STYLES = [
  { label: 'Disc', value: 'disc' },
  { label: 'Circle', value: 'circle' },
  { label: 'Square', value: 'square' },
] as const

export const ORDERED_LIST_STYLES = [
  { label: '1, 2, 3', value: 'decimal' },
  { label: 'a, b, c', value: 'lower-alpha' },
  { label: 'A, B, C', value: 'upper-alpha' },
  { label: 'i, ii, iii', value: 'lower-roman' },
  { label: 'I, II, III', value: 'upper-roman' },
] as const

export const ListStyleExtension = Extension.create({
  name: 'listStyleExtension',

  addGlobalAttributes() {
    return [
      {
        types: ['bulletList', 'orderedList'],
        attributes: {
          listStyleType: {
            default: null,
            parseHTML: (element) =>
              element.getAttribute('data-list-style') || element.style.listStyleType || null,
            renderHTML: (attributes) => {
              if (!attributes.listStyleType) return {}
              return {
                'data-list-style': attributes.listStyleType,
                style: `list-style-type: ${attributes.listStyleType as string}`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setBulletListStyle:
        (style: string) =>
        ({ chain, editor }) => {
          if (editor.isActive('bulletList')) {
            return chain().focus().updateAttributes('bulletList', { listStyleType: style }).run()
          }
          return chain().focus().toggleBulletList().updateAttributes('bulletList', { listStyleType: style }).run()
        },
      setOrderedListStyle:
        (style: string) =>
        ({ chain, editor }) => {
          if (editor.isActive('orderedList')) {
            return chain().focus().updateAttributes('orderedList', { listStyleType: style }).run()
          }
          return chain().focus().toggleOrderedList().updateAttributes('orderedList', { listStyleType: style }).run()
        },
    }
  },
})
