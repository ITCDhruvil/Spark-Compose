import Heading from '@tiptap/extension-heading'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { uniqueHeadingIds } from '@/lib/editor/toc-utils'

export const HeadingWithId = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('id'),
        renderHTML: (attributes) => {
          if (!attributes.id) return {}
          return { id: attributes.id as string }
        },
      },
    }
  },

  addProseMirrorPlugins() {
    const parent = this.parent?.() ?? []

    return [
      ...parent,
      new Plugin({
        key: new PluginKey('headingIds'),
        appendTransaction(transactions, _oldState, newState) {
          if (!transactions.some((tr) => tr.docChanged)) return null

          const headings: { pos: number; text: string; id: string | null }[] = []
          newState.doc.descendants((node, pos) => {
            if (node.type.name !== 'heading') return
            const text = node.textContent.trim()
            if (!text) return
            headings.push({ pos, text, id: node.attrs.id as string | null })
          })

          if (!headings.length) return null

          const ids = uniqueHeadingIds(headings)
          let tr = newState.tr
          let changed = false

          headings.forEach((h, i) => {
            const nextId = ids[i]
            if (h.id === nextId) return
            const node = newState.doc.nodeAt(h.pos)
            if (!node) return
            tr = tr.setNodeMarkup(h.pos, undefined, { ...node.attrs, id: nextId })
            changed = true
          })

          return changed ? tr : null
        },
      }),
    ]
  },
}).configure({ levels: [1, 2, 3, 4, 5, 6] })
