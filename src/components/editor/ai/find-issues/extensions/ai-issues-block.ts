import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import type { FindIssueItem } from '@/lib/api/ai-types'
import { AiIssuesView } from './ai-issues-view'

export type AiIssuesStatus = 'loading' | 'ready'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    aiIssues: {
      insertAiIssues: (attrs: {
        issues?: FindIssueItem[]
        status?: AiIssuesStatus
        sourceFrom?: number
        sourceTo?: number
      }) => ReturnType
    }
  }
}

export const AiIssues = Node.create({
  name: 'aiIssues',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      status: {
        default: 'loading' as AiIssuesStatus,
      },
      issues: {
        default: [] as FindIssueItem[],
        parseHTML: (el) => {
          try {
            return JSON.parse(el.getAttribute('data-issues') || '[]')
          } catch {
            return []
          }
        },
        renderHTML: (attrs) => ({
          'data-issues': JSON.stringify(attrs.issues ?? []),
        }),
      },
      /** Document positions of the reviewed selection (updated as fixes apply). */
      sourceFrom: { default: 0 },
      sourceTo: { default: 0 },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-ai-issues]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-ai-issues': '', class: 'ai-issues-block' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(AiIssuesView)
  },

  addCommands() {
    return {
      insertAiIssues:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              status: attrs.status ?? 'loading',
              issues: attrs.issues ?? [],
              sourceFrom: attrs.sourceFrom ?? 0,
              sourceTo: attrs.sourceTo ?? 0,
            },
          }),
    }
  },
})
