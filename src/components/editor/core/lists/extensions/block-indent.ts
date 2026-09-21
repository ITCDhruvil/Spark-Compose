import { Extension } from '@tiptap/core'

const MAX_INDENT = 8

export const BLOCK_INDENT_TYPES = ['paragraph', 'heading'] as const

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockIndent: {
      indentBlock: () => ReturnType
      outdentBlock: () => ReturnType
    }
  }
}

function findIndentableBlock(
  depth: number,
  nodeAtDepth: (d: number) => { type: { name: string }; attrs: Record<string, unknown> },
  before: (d: number) => number,
) {
  for (let d = depth; d > 0; d--) {
    const node = nodeAtDepth(d)
    if (BLOCK_INDENT_TYPES.includes(node.type.name as (typeof BLOCK_INDENT_TYPES)[number])) {
      return { pos: before(d), node }
    }
  }
  return null
}

export const BlockIndent = Extension.create({
  name: 'blockIndent',

  addGlobalAttributes() {
    return [
      {
        types: [...BLOCK_INDENT_TYPES],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const raw = element.getAttribute('data-indent')
              if (raw) return parseInt(raw, 10) || 0
              const ml = element.style.marginLeft
              if (!ml) return 0
              const rem = parseFloat(ml)
              return Number.isFinite(rem) ? Math.round(rem / 1.5) : 0
            },
            renderHTML: (attributes) => {
              const level = (attributes.indent as number) ?? 0
              if (!level) return {}
              return {
                'data-indent': String(level),
                style: `margin-left: calc(${level} * 1.5rem)`,
              }
            },
          },
        },
      },
    ]
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => this.editor.commands.indentBlock(),
      'Shift-Tab': () => this.editor.commands.outdentBlock(),
    }
  },

  addCommands() {
    return {
      indentBlock:
        () =>
        ({ editor, state, dispatch, chain }) => {
          if (editor.can().sinkListItem('taskItem')) {
            return chain().focus().sinkListItem('taskItem').run()
          }
          if (editor.can().sinkListItem('listItem')) {
            return chain().focus().sinkListItem('listItem').run()
          }

          const { $from } = state.selection
          const block = findIndentableBlock($from.depth, (d) => $from.node(d), (d) => $from.before(d))
          if (!block) return false

          const indent = (block.node.attrs.indent as number) ?? 0
          if (indent >= MAX_INDENT) return false
          if (!dispatch) return true

          dispatch(
            state.tr.setNodeMarkup(block.pos, undefined, {
              ...block.node.attrs,
              indent: indent + 1,
            }),
          )
          return true
        },
      outdentBlock:
        () =>
        ({ editor, state, dispatch, chain }) => {
          if (editor.can().liftListItem('taskItem')) {
            return chain().focus().liftListItem('taskItem').run()
          }
          if (editor.can().liftListItem('listItem')) {
            return chain().focus().liftListItem('listItem').run()
          }

          const { $from } = state.selection
          const block = findIndentableBlock($from.depth, (d) => $from.node(d), (d) => $from.before(d))
          if (!block) return false

          const indent = (block.node.attrs.indent as number) ?? 0
          if (indent <= 0) return false
          if (!dispatch) return true

          dispatch(
            state.tr.setNodeMarkup(block.pos, undefined, {
              ...block.node.attrs,
              indent: indent - 1,
            }),
          )
          return true
        },
    }
  },
})

export function canIndentBlock(editor: import('@tiptap/core').Editor) {
  if (editor.can().sinkListItem('taskItem') || editor.can().sinkListItem('listItem')) return true
  const { $from } = editor.state.selection
  const block = findIndentableBlock($from.depth, (d) => $from.node(d), (d) => $from.before(d))
  if (!block) return false
  return ((block.node.attrs.indent as number) ?? 0) < MAX_INDENT
}

export function canOutdentBlock(editor: import('@tiptap/core').Editor) {
  if (editor.can().liftListItem('taskItem') || editor.can().liftListItem('listItem')) return true
  const { $from } = editor.state.selection
  const block = findIndentableBlock($from.depth, (d) => $from.node(d), (d) => $from.before(d))
  if (!block) return false
  return ((block.node.attrs.indent as number) ?? 0) > 0
}
