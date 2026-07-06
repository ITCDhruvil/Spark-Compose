import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import type { KpiItem } from '@/lib/api/ai-types'
import { KpiRowView } from './kpi-row-view'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    kpiRow: {
      insertKpiRow: (items: KpiItem[]) => ReturnType
    }
  }
}

export const KpiRow = Node.create({
  name: 'kpiRow',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      itemsJson: { default: '[]' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-kpi-row]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-kpi-row': '', class: 'kpi-row' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(KpiRowView)
  },

  addCommands() {
    return {
      insertKpiRow:
        (items) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { itemsJson: JSON.stringify(items) },
          }),
    }
  },
})
