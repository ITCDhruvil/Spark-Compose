import { Node, mergeAttributes, textblockTypeInputRule } from '@tiptap/core'
import type { Editor } from '@tiptap/core'
import { Fragment, Slice } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { AskPromptView } from './ask-prompt-view'
import { AskAnswerView } from './ask-answer-view'

const askPromptPasteKey = new PluginKey('askPromptPaste')

function isInsideAskPrompt($from: {
  depth: number
  parent: { type: { name: string } }
  node: (d: number) => { type: { name: string } }
}) {
  if ($from.parent.type.name === 'askPrompt') return true
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.name === 'askPrompt') return true
  }
  return false
}

function clipboardToInlineText(cd: DataTransfer | null) {
  if (!cd) return ''
  const plain = cd.getData('text/plain')
  if (plain) return plain.replace(/\r\n|\r|\n/g, ' ').replace(/\s+/g, ' ')
  const html = cd.getData('text/html')
  if (!html) return ''
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return (tmp.textContent ?? '').replace(/\r\n|\r|\n/g, ' ').replace(/\s+/g, ' ')
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    askPrompt: {
      insertAskPrompt: () => ReturnType
    }
  }
}

function activateAskFromSlash(editor: Editor, nodeName: string) {
  const { $from } = editor.state.selection
  if (!$from.parent.isTextblock || $from.depth === 0) {
    return editor.chain().focus().insertContent({ type: nodeName }).run()
  }
  const from = $from.before($from.depth)
  const to = $from.after($from.depth)
  return editor.chain().focus().insertContentAt({ from, to }, { type: nodeName }).run()
}

export const AskPrompt = Node.create({
  name: 'askPrompt',
  // Run paste handlers before SmartPaste
  priority: 1000,
  group: 'block',
  content: 'inline*',
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: 'div[data-ask-prompt]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-ask-prompt': '', class: 'ask-block ask-block-prompt' }), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(AskPromptView)
  },

  addCommands() {
    return {
      insertAskPrompt:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
    }
  },

  // Type `/ask` + space → activate tagged ask block
  addInputRules() {
    return [
      textblockTypeInputRule({
        find: /^\/ask\s$/,
        type: this.type,
      }),
    ]
  },

  // Paste into the prompt as plain inline text (not a new paragraph below)
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: askPromptPasteKey,
        props: {
          handlePaste(view, event) {
            const { $from } = view.state.selection
            if (!isInsideAskPrompt($from)) return false

            const flat = clipboardToInlineText(event.clipboardData)
            event.preventDefault()
            if (!flat) return true

            const { from, to } = view.state.selection
            view.dispatch(view.state.tr.insertText(flat, from, to).scrollIntoView())
            return true
          },
          // Default PM paste path (e.g. internal slice) — keep it inline-only
          transformPasted(slice, view) {
            if (!isInsideAskPrompt(view.state.selection.$from)) return slice
            const text = slice.content.textBetween(0, slice.content.size, ' ')
            const flat = text.replace(/\s+/g, ' ').trim()
            if (!flat) return slice
            return new Slice(Fragment.from(view.state.schema.text(flat)), 0, 0)
          },
        },
      }),
    ]
  },

  addKeyboardShortcuts() {
    const nodeName = this.name
    return {
      // Backup when Space is handled before the input rule (e.g. slash menu open)
      Space: ({ editor }) => {
        const { $from } = editor.state.selection
        if (!$from.parent.isTextblock) return false
        if ($from.parent.textContent.trim() !== '/ask') return false
        return activateAskFromSlash(editor, nodeName)
      },
      // Exit ask block on Enter at end → new normal paragraph below
      Enter: ({ editor }) => {
        if (!editor.isActive(this.name)) return false
        const { $from } = editor.state.selection
        if ($from.parentOffset < $from.parent.content.size) return false
        return editor
          .chain()
          .insertContentAt($from.after(), { type: 'paragraph' })
          .focus($from.after() + 1)
          .run()
      },
    }
  },
})

export const AskAnswer = Node.create({
  name: 'askAnswer',
  group: 'block',
  content: 'block+',
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      streaming: {
        default: false,
        rendered: false,
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-ask-answer]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-ask-answer': '', class: 'ask-block ask-block-answer' }), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(AskAnswerView)
  },
})
