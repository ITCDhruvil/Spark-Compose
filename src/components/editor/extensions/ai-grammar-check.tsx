'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Editor } from '@tiptap/react'
import { aiApi } from '@/lib/api/ai-client'
import { useAiStore } from '@/lib/store/use-ai-store'

export type GrammarIssueType = 'spelling' | 'grammar' | 'punctuation'

export interface GrammarIssue {
  from: number
  to: number
  type: GrammarIssueType
  message: string
  suggestion: string
}

const pluginKey = new PluginKey<{ issues: GrammarIssue[] }>('aiGrammarCheck')

const COLOR_CLASS: Record<GrammarIssueType, string> = {
  spelling: 'ai-grammar-spelling',
  grammar: 'ai-grammar-grammar',
  punctuation: 'ai-grammar-punctuation',
}

function buildDecorations(doc: { nodeSize: number }, issues: GrammarIssue[]) {
  const decos = issues
    .filter((i) => i.from >= 0 && i.to <= doc.nodeSize - 2 && i.to > i.from)
    .map((i) =>
      Decoration.inline(i.from, i.to, {
        class: `ai-grammar-underline ${COLOR_CLASS[i.type]}`,
        'data-grammar-issue': 'true',
      }),
    )
  return DecorationSet.create(doc as never, decos)
}

export const AiGrammarCheck = Extension.create({
  name: 'aiGrammarCheck',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: pluginKey,
        state: {
          init: () => ({ issues: [] as GrammarIssue[] }),
          apply(tr, value) {
            const meta = tr.getMeta(pluginKey) as { issues?: GrammarIssue[] } | undefined
            if (meta?.issues) return { issues: meta.issues }
            if (tr.docChanged && value.issues.length) {
              // Map positions through document changes
              const mapped = value.issues
                .map((i) => ({
                  ...i,
                  from: tr.mapping.map(i.from),
                  to: tr.mapping.map(i.to),
                }))
                .filter((i) => i.to > i.from)
              return { issues: mapped }
            }
            return value
          },
        },
        props: {
          decorations(state) {
            const pluginState = pluginKey.getState(state)
            if (!pluginState?.issues.length) return DecorationSet.empty
            return buildDecorations(state.doc, pluginState.issues)
          },
        },
      }),
    ]
  },
})

function setIssues(editor: Editor, issues: GrammarIssue[]) {
  const tr = editor.state.tr.setMeta(pluginKey, { issues })
  editor.view.dispatch(tr)
}

function getIssues(editor: Editor): GrammarIssue[] {
  return pluginKey.getState(editor.state)?.issues ?? []
}

function activeBlock(editor: Editor): { from: number; to: number; text: string } | null {
  const { $from } = editor.state.selection
  const parent = $from.parent
  if (!parent.isTextblock) return null
  const from = $from.start()
  const to = $from.end()
  const text = editor.state.doc.textBetween(from, to, '\n')
  if (text.trim().length < 8) return null
  return { from, to, text }
}

/**
 * Grammarly-style underlines while Grammar is enabled.
 * Hover an underline → suggestion popover → click Replace.
 */
export function useAiGrammarCheck(editor: Editor | null) {
  const enabled = useAiStore((s) => s.grammarEnabled)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [hover, setHover] = useState<{
    issue: GrammarIssue
    x: number
    y: number
  } | null>(null)

  useEffect(() => {
    if (!editor || !enabled) {
      abortRef.current?.abort()
      if (timerRef.current) clearTimeout(timerRef.current)
      if (editor) setIssues(editor, [])
      setHover(null)
      return
    }

    const runCheck = () => {
      const block = activeBlock(editor)
      if (!block) {
        setIssues(editor, [])
        return
      }

      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl

      void (async () => {
        try {
          const res = await aiApi.grammarCheck({ text: block.text }, ctrl.signal)
          if (ctrl.signal.aborted) return
          // Spelling is auto-corrected separately — only underline grammar / punctuation
          const issues: GrammarIssue[] = (res.issues ?? [])
            .filter((i) => i.type !== 'spelling')
            .map((i) => ({
              from: block.from + i.start,
              to: block.from + i.end,
              type: i.type,
              message: i.message,
              suggestion: i.suggestion,
            }))
          setIssues(editor, issues)
        } catch {
          // ignore
        }
      })()
    }

    const onUpdate = ({
      transaction,
    }: {
      transaction: { docChanged: boolean; getMeta: (k: string) => unknown }
    }) => {
      if (!transaction.docChanged) return
      if (transaction.getMeta('aiGrammarReplace')) return
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(runCheck, 700)
    }

    const onMouseMove = (event: MouseEvent) => {
      const view = editor.view
      const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })
      if (!pos) {
        setHover(null)
        return
      }
      const issues = getIssues(editor)
      const issue = issues.find((i) => pos.pos >= i.from && pos.pos <= i.to)
      if (!issue) {
        setHover(null)
        return
      }
      const coords = view.coordsAtPos(issue.from)
      setHover({
        issue,
        x: (coords.left + coords.right) / 2,
        y: coords.bottom + 6,
      })
    }

    editor.on('update', onUpdate)
    editor.view.dom.addEventListener('mousemove', onMouseMove)
    // Initial check
    timerRef.current = setTimeout(runCheck, 400)

    return () => {
      editor.off('update', onUpdate)
      editor.view.dom.removeEventListener('mousemove', onMouseMove)
      abortRef.current?.abort()
      if (timerRef.current) clearTimeout(timerRef.current)
      setIssues(editor, [])
    }
  }, [editor, enabled])

  const applySuggestion = (issue: GrammarIssue) => {
    if (!editor) return
    if (issue.to <= issue.from) return
    const { tr } = editor.state
    tr.insertText(issue.suggestion, issue.from, issue.to)
    tr.setMeta('aiGrammarReplace', true)
    editor.view.dispatch(tr)
    setHover(null)
    // Refresh issues after replace
    setTimeout(() => {
      const block = activeBlock(editor)
      if (!block) {
        setIssues(editor, [])
        return
      }
      void aiApi.grammarCheck({ text: block.text }).then((res) => {
        setIssues(
          editor,
          (res.issues ?? [])
            .filter((i) => i.type !== 'spelling')
            .map((i) => ({
              from: block.from + i.start,
              to: block.from + i.end,
              type: i.type,
              message: i.message,
              suggestion: i.suggestion,
            })),
        )
      }).catch(() => setIssues(editor, []))
    }, 200)
  }

  if (!hover || typeof document === 'undefined') return null

  return createPortal(
    <div
      role="dialog"
      className="fixed z-[10040] w-64 rounded-lg border bg-popover p-2.5 text-popover-foreground shadow-xl"
      style={{
        left: Math.min(hover.x, window.innerWidth - 280),
        top: hover.y,
        transform: 'translateX(-50%)',
      }}
      onMouseDown={(e) => e.preventDefault()}
      onMouseLeave={() => setHover(null)}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
        {hover.issue.type}
      </p>
      <p className="text-xs text-muted-foreground mb-2">{hover.issue.message}</p>
      <p className="text-sm font-medium rounded-md bg-muted/60 px-2 py-1.5 mb-2 break-words">
        {hover.issue.suggestion}
      </p>
      <button
        type="button"
        className="w-full rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        onClick={() => applySuggestion(hover.issue)}
      >
        Replace
      </button>
    </div>,
    document.body,
  )
}
