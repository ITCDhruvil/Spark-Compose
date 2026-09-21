import { Node, mergeAttributes } from '@tiptap/core'
import type { Editor } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'
import { ReactNodeViewRenderer } from '@tiptap/react'
import type { ChartBlockConfig, ChartKind } from '@/lib/editor/smart/spark-chart/chart-from-table'
import { ChartBlockView } from './chart-block-view'

export type ChartBlockAttrs = Partial<{
  chartType: ChartKind
  title: string
}>

/** Update chart node attrs (works with NodeSelection; safe across HMR). */
export function updateChartBlockAttrs(
  editor: Editor,
  attrs: ChartBlockAttrs,
  nodePos?: number,
): boolean {
  const { selection } = editor.state
  const chain = editor.chain().focus()

  if (typeof nodePos === 'number') {
    return chain.setNodeSelection(nodePos).updateAttributes('chartBlock', attrs).run()
  }

  if (selection instanceof NodeSelection && selection.node.type.name === 'chartBlock') {
    return chain.updateAttributes('chartBlock', attrs).run()
  }

  if (editor.isActive('chartBlock')) {
    return chain.updateAttributes('chartBlock', attrs).run()
  }

  return false
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    chartBlock: {
      insertChartBlock: (config: ChartBlockConfig) => ReturnType
      updateChartBlock: (attrs: Partial<{
        chartType: ChartBlockConfig['chartType']
        title: string
      }>) => ReturnType
    }
  }
}

function serializeConfig(config: ChartBlockConfig) {
  return {
    chartType: config.chartType,
    title: config.title,
    labelsJson: JSON.stringify(config.labels ?? []),
    datasetsJson: JSON.stringify(config.datasets ?? []),
    scatterJson: JSON.stringify(config.scatterData ?? []),
    scatterLabel: config.scatterLabel ?? '',
  }
}

export const ChartBlock = Node.create({
  name: 'chartBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      chartType: { default: 'bar' },
      title: { default: 'Chart' },
      labelsJson: { default: '[]' },
      datasetsJson: { default: '[]' },
      scatterJson: { default: '[]' },
      scatterLabel: { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-chart-block]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-chart-block': '', class: 'chart-block' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChartBlockView)
  },

  addCommands() {
    return {
      insertChartBlock:
        (config) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: serializeConfig(config),
          }),
      updateChartBlock:
        (attrs) =>
        ({ commands, editor }) => {
          const { selection } = editor.state
          if (selection instanceof NodeSelection && selection.node.type.name === 'chartBlock') {
            return commands.updateAttributes('chartBlock', attrs)
          }
          if (editor.isActive('chartBlock')) {
            return commands.updateAttributes('chartBlock', attrs)
          }
          return false
        },
    }
  },
})
