import {
  Extension,
  InputRule,
  textblockTypeInputRule,
  wrappingInputRule,
} from '@tiptap/core'

/**
 * Markdown-style line-start shortcuts (Notion-like autoformat).
 * Triggers on space after the marker, or Enter for horizontal rules / code fences.
 */
export const MarkdownShortcuts = Extension.create({
  name: 'markdownShortcuts',

  addInputRules() {
    const schema = this.editor.schema

    return [
      textblockTypeInputRule({
        find: /^(#{1,6})\s$/,
        type: schema.nodes.heading,
        getAttributes: (match) => ({ level: match[1]!.length }),
      }),

      wrappingInputRule({
        find: /^\s*([-+*])\s$/,
        type: schema.nodes.bulletList,
      }),

      wrappingInputRule({
        find: /^(\d+)\.\s$/,
        type: schema.nodes.orderedList,
        getAttributes: (match) => ({ start: parseInt(match[1]!, 10) }),
        joinPredicate: (match, node) =>
          node.childCount + node.attrs.start === parseInt(match[1]!, 10),
      }),

      new InputRule({
        find: /^\[\s?\]\s$/,
        handler: ({ range, chain }) => {
          chain().deleteRange(range).toggleTaskList().run()
        },
      }),

      wrappingInputRule({
        find: /^>\s$/,
        type: schema.nodes.blockquote,
      }),

      new InputRule({
        find: /^(?:---|___|\*\*\*)$/,
        handler: ({ range, chain }) => {
          chain().deleteRange(range).setHorizontalRule().run()
        },
      }),

      textblockTypeInputRule({
        find: /^```([a-z0-9+#-]*)?\s$/,
        type: schema.nodes.codeBlock,
        getAttributes: (match) => {
          const lang = match[1]?.trim()
          return lang ? { language: lang } : {}
        },
      }),
    ]
  },
})
