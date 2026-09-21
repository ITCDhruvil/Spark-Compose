import { Extension } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'
import type { Node as PMNode } from '@tiptap/pm/model'
import { mergeAdjacentLists } from '@/components/editor/core/formatting/editor-list-utils'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    listStyle: {
      setBulletListStyle: (style: string) => ReturnType
      setOrderedListStyle: (style: string) => ReturnType
    }
  }
}

export const BULLET_LIST_STYLES = [
  { label: 'Filled circle', value: 'disc', preview: '●' },
  { label: 'Circle', value: 'circle', preview: '○' },
  { label: 'Square', value: 'square', preview: '■' },
  { label: 'Kite', value: '"◆"', preview: '◆' },
  { label: 'Diamond', value: '"◇"', preview: '◇' },
  { label: 'Triangle', value: '"▸"', preview: '▸' },
  { label: 'Dash', value: '"–"', preview: '–' },
] as const

export const ORDERED_LIST_STYLES = [
  { label: 'Numbers', value: 'decimal', preview: '1' },
  { label: 'Lowercase abc', value: 'lower-alpha', preview: 'a' },
  { label: 'Uppercase ABC', value: 'upper-alpha', preview: 'A' },
  { label: 'Roman i, ii', value: 'lower-roman', preview: 'i' },
  { label: 'Roman I, II', value: 'upper-roman', preview: 'I' },
  { label: 'Greek', value: 'lower-greek', preview: 'α' },
] as const

/** Ordered styles that use hierarchical markers (1.1.1 / A.A.A). */
export const HIERARCHICAL_ORDERED_STYLES = ORDERED_LIST_STYLES.map((s) => s.value)

function findParentOrderedListStyle(
  doc: { resolve: (pos: number) => { depth: number; node: (d: number) => { type: { name: string }; attrs: Record<string, unknown> } } },
  pos: number,
): string | null {
  const $pos = doc.resolve(pos)
  for (let d = $pos.depth; d > 0; d--) {
    const node = $pos.node(d)
    if (node.type.name === 'orderedList') {
      return (node.attrs.listStyleType as string | null) ?? 'decimal'
    }
  }
  return null
}

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
              const style = attributes.listStyleType as string
              const isBulletMarker =
                style === 'disc'
                || style === 'circle'
                || style === 'square'
                || style.startsWith('"')
              // Ordered markers use CSS counters (1.1.1 / A.A.A); bullets keep list-style-type.
              return isBulletMarker
                ? { 'data-list-style': style, style: `list-style-type: ${style}` }
                : { 'data-list-style': style }
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
        ({ chain, editor, state, dispatch }) => {
          const { $from } = state.selection

          // Prefer updating the whole ordered-list tree from the root list.
          let rootPos: number | null = null
          for (let d = $from.depth; d > 0; d--) {
            if ($from.node(d).type.name === 'orderedList') {
              rootPos = $from.before(d)
            }
          }

          if (rootPos == null) {
            if (editor.isActive('orderedList')) {
              chain().focus().updateAttributes('orderedList', { listStyleType: style }).run()
            } else if (editor.isActive('bulletList')) {
              chain().focus().toggleBulletList().toggleOrderedList().updateAttributes('orderedList', { listStyleType: style }).run()
            } else {
              chain().focus().toggleOrderedList().updateAttributes('orderedList', { listStyleType: style }).run()
            }
            // Merge split lists so numbering is continuous (1, 2, 3…)
            mergeAdjacentLists(editor, 'orderedList')
            editor.chain().focus().updateAttributes('orderedList', { listStyleType: style }).run()
            return true
          }

          if (!dispatch) return true

          const rootNode = state.doc.nodeAt(rootPos)
          if (!rootNode) return false

          let tr = state.tr.setNodeMarkup(rootPos, undefined, {
            ...rootNode.attrs,
            listStyleType: style,
          })

          // Apply the same style to every nested ordered list under this root.
          rootNode.descendants((node, offset) => {
            if (node.type.name !== 'orderedList') return
            const absPos = rootPos! + 1 + offset
            tr = tr.setNodeMarkup(absPos, undefined, {
              ...node.attrs,
              listStyleType: style,
            })
          })

          dispatch(tr)
          mergeAdjacentLists(editor, 'orderedList')
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction(transactions, _oldState, newState) {
          if (!transactions.some((tr) => tr.docChanged)) return null
          // Avoid re-entry loops from our own merge transactions
          if (transactions.some((tr) => tr.getMeta('mergeAdjacentLists'))) return null

          let tr = newState.tr
          let modified = false

          // Inherit list style on nested ordered lists
          newState.doc.descendants((node, pos) => {
            if (node.type.name !== 'orderedList') return

            const parentStyle = findParentOrderedListStyle(newState.doc, pos)
            if (!parentStyle) return

            const current = (node.attrs.listStyleType as string | null) ?? null
            if (current === parentStyle) return
            if (current != null) return

            tr = tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              listStyleType: parentStyle,
            })
            modified = true
          })

          // Merge consecutive top-level lists of the same type (fixes all-1. / only-first-numbered)
          const bulletType = newState.schema.nodes.bulletList
          const orderedType = newState.schema.nodes.orderedList
          const itemType = newState.schema.nodes.listItem
          if (bulletType && orderedType && itemType) {
            type Run = { from: number; to: number; type: 'bulletList' | 'orderedList'; lists: PMNode[] }
            const runs: Run[] = []
            let current: Run | null = null

            newState.doc.forEach((node, offset) => {
              const name = node.type.name
              if (name === 'bulletList' || name === 'orderedList') {
                if (current && current.type === name) {
                  current.to = offset + node.nodeSize
                  current.lists.push(node)
                } else {
                  if (current && current.lists.length > 1) runs.push(current)
                  current = {
                    from: offset,
                    to: offset + node.nodeSize,
                    type: name,
                    lists: [node],
                  }
                }
              } else {
                if (current && current.lists.length > 1) runs.push(current)
                current = null
              }
            })
            const tailRun = current as Run | null
            if (tailRun && tailRun.lists.length > 1) runs.push(tailRun)

            for (let r = runs.length - 1; r >= 0; r--) {
              const run = runs[r]!
              const listType = run.type === 'orderedList' ? orderedType : bulletType
              const items: PMNode[] = []
              let attrs: Record<string, unknown> = {}
              for (const list of run.lists) {
                attrs = { ...list.attrs }
                list.forEach((child) => {
                  if (child.type === itemType) items.push(child)
                })
              }
              if (items.length < 2) continue
              const renumbered = items.map((item, index) =>
                item.type.create({ ...item.attrs, value: index + 1 }, item.content, item.marks),
              )
              // Map positions through prior steps of this transaction
              const from = tr.mapping.map(run.from)
              const to = tr.mapping.map(run.to)
              tr = tr.replaceWith(from, to, listType.create(attrs, renumbered))
              modified = true
            }
          }

          if (!modified) return null
          tr.setMeta('mergeAdjacentLists', true)
          return tr
        },
      }),
    ]
  },
})
