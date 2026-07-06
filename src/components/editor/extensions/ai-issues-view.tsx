'use client'

import { useCallback, useState } from 'react'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { TextSelection } from '@tiptap/pm/state'
import type { FindIssueItem } from '@/lib/api/ai-types'

function formatSuggestion(
  before: string,
  snippet: string,
  suggestion: string,
  after: string,
): string {
  const core = snippet.trim()
  let s = suggestion.trim()
  if (!s) return snippet

  if (core[0] && /[A-Z]/.test(core[0])) {
    s = s.charAt(0).toUpperCase() + s.slice(1)
  } else if (core[0] && /[a-z]/.test(core[0])) {
    s = s.charAt(0).toLowerCase() + s.slice(1)
  }

  const lead = snippet.match(/^\s*/)?.[0] ?? ''
  const trail = snippet.match(/\s*$/)?.[0] ?? ''
  const needLead = before.length > 0 && !/\s$/.test(before) && !/^\s/.test(lead + s) && !/^[.,;:!?)]/.test(s)
  const needTrail = after.length > 0 && !/^\s/.test(after) && !/\s$/.test(s + trail) && !/^[.,;:!?(]/.test(after)

  return `${needLead ? ' ' : lead}${s}${needTrail ? ' ' : trail}`
}

function applySnippetFix(
  editor: NodeViewProps['editor'],
  rangeFrom: number,
  rangeTo: number,
  snippet: string,
  suggestion: string,
): { from: number; to: number } | null {
  let mappedFrom: number | null = null
  let mappedTo: number | null = null
  let before = ''
  let after = ''

  editor.state.doc.nodesBetween(rangeFrom, rangeTo, (node, pos) => {
    if (mappedFrom != null) return false
    if (!node.isTextblock) return
    const start = pos + 1
    const end = pos + node.nodeSize - 1
    const from = Math.max(start, rangeFrom)
    const to = Math.min(end, rangeTo)
    if (from >= to) return
    const text = editor.state.doc.textBetween(from, to)
    const idx = text.indexOf(snippet)
    if (idx < 0) return
    mappedFrom = from + idx
    mappedTo = mappedFrom + snippet.length
    before = editor.state.doc.textBetween(Math.max(start, mappedFrom - 1), mappedFrom)
    after = editor.state.doc.textBetween(mappedTo, Math.min(end, mappedTo + 1))
    return false
  })

  if (mappedFrom == null || mappedTo == null) return null

  const formatted = formatSuggestion(before, snippet, suggestion, after)
  const tr = editor.state.tr
  tr.insertText(formatted, mappedFrom, mappedTo)
  const highlightTo = mappedFrom + formatted.length
  const highlightMark = editor.schema.marks.highlight?.create({ color: '#e5e5e5' })
  if (highlightMark) tr.addMark(mappedFrom, highlightTo, highlightMark)
  tr.setSelection(TextSelection.create(tr.doc, highlightTo))
  editor.view.dispatch(tr)

  return { from: mappedFrom, to: highlightTo }
}

export function AiIssuesView({ node, editor, deleteNode, updateAttributes }: NodeViewProps) {
  const status = (node.attrs.status as string) || 'loading'
  const issues = (node.attrs.issues as FindIssueItem[]) || []
  const [fixingId, setFixingId] = useState<string | null>(null)
  const [fixingAll, setFixingAll] = useState(false)

  const clearHighlightLater = useCallback((from: number, to: number) => {
    setTimeout(() => {
      try {
        const mark = editor.schema.marks.highlight
        if (!mark) return
        const tr = editor.state.tr
        tr.removeMark(from, to, mark)
        editor.view.dispatch(tr)
      } catch {
        // ignore
      }
    }, 2800)
  }, [editor])

  const fixOne = useCallback((issue: FindIssueItem) => {
    const sourceFrom = Number(node.attrs.sourceFrom) || 0
    const sourceTo = Number(node.attrs.sourceTo) || 0
    setFixingId(issue.id)

    const applied = applySnippetFix(
      editor,
      sourceFrom,
      sourceTo,
      issue.originalSnippet,
      issue.suggestion,
    )

    if (applied) {
      const delta = applied.to - applied.from - issue.originalSnippet.length
      const nextIssues = issues.filter((i) => i.id !== issue.id)
      clearHighlightLater(applied.from, applied.to)

      if (!nextIssues.length) {
        deleteNode()
      } else {
        updateAttributes({
          issues: nextIssues,
          sourceTo: sourceTo + delta,
        })
      }
    }

    setFixingId(null)
  }, [editor, node.attrs.sourceFrom, node.attrs.sourceTo, issues, clearHighlightLater, deleteNode, updateAttributes])

  const fixAll = useCallback(() => {
    const sourceFrom = Number(node.attrs.sourceFrom) || 0
    let sourceTo = Number(node.attrs.sourceTo) || 0
    setFixingAll(true)

    const text = editor.state.doc.textBetween(sourceFrom, sourceTo, '\n')
    const ordered = [...issues].sort(
      (a, b) => text.lastIndexOf(b.originalSnippet) - text.lastIndexOf(a.originalSnippet),
    )

    for (const issue of ordered) {
      const applied = applySnippetFix(
        editor,
        sourceFrom,
        sourceTo,
        issue.originalSnippet,
        issue.suggestion,
      )
      if (applied) {
        const delta = applied.to - applied.from - issue.originalSnippet.length
        sourceTo += delta
        clearHighlightLater(applied.from, applied.to)
      }
    }

    setFixingAll(false)
    deleteNode()
  }, [editor, node.attrs.sourceFrom, node.attrs.sourceTo, issues, clearHighlightLater, deleteNode])

  return (
    <NodeViewWrapper
      className="ai-issues-block"
      contentEditable={false}
      data-drag-handle={false}
    >
      <div className="ai-issues-toolbar">
        {status === 'ready' && issues.length > 1 && (
          <button
            type="button"
            className="ai-issues-fix-all"
            disabled={fixingAll || !!fixingId}
            onMouseDown={(e) => { e.preventDefault(); fixAll() }}
          >
            {fixingAll ? 'Fixing…' : 'Fix all'}
          </button>
        )}
        <button
          type="button"
          className="ai-issues-close"
          title="Dismiss"
          onMouseDown={(e) => { e.preventDefault(); deleteNode() }}
        >
          ×
        </button>
      </div>

      {status === 'loading' && (
        <div className="ai-issues-card">
          <p className="ai-improve-shimmer-text text-xs">Finding issues…</p>
        </div>
      )}

      {status === 'ready' && issues.length === 0 && (
        <div className="ai-issues-card">
          <p className="text-xs text-neutral-500">No issues found.</p>
        </div>
      )}

      {status === 'ready' && issues.map((issue) => (
        <div key={issue.id} className="ai-issues-card">
          <div className="ai-issues-card-head">
            <span className={`ai-issues-severity is-${issue.severity}`}>{issue.severity}</span>
            <button
              type="button"
              className="ai-issues-fix"
              disabled={fixingAll || fixingId === issue.id}
              onMouseDown={(e) => { e.preventDefault(); fixOne(issue) }}
            >
              {fixingId === issue.id ? '…' : 'Fix'}
            </button>
          </div>
          <p className="ai-issues-text">{issue.text}</p>
          <div className="ai-issues-content">
            <p className="ai-issues-suggestion">{issue.suggestion}</p>
          </div>
        </div>
      ))}
    </NodeViewWrapper>
  )
}
