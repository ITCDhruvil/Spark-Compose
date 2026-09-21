'use client'

import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Dialog } from '@/shared/ui/dialog'
import { findInEditor, replaceAllInEditor, replaceInEditor } from './editor-find-replace'

interface FindReplaceDialogProps {
  open: boolean
  onClose: () => void
  editor: Editor
}

export function FindReplaceDialog({ open, onClose, editor }: FindReplaceDialogProps) {
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (open) {
      setFindText('')
      setReplaceText('')
      setStatus('')
    }
  }, [open])

  const handleFindNext = () => {
    const match = findInEditor(editor, findText, { caseSensitive })
    if (!match) {
      setStatus('No matches found')
      return
    }
    editor.chain().focus().setTextSelection(match).run()
    setStatus('Match selected')
  }

  const handleReplace = () => {
    const ok = replaceInEditor(editor, findText, replaceText, caseSensitive)
    setStatus(ok ? 'Replaced' : 'No match at selection')
  }

  const handleReplaceAll = () => {
    const count = replaceAllInEditor(editor, findText, replaceText, caseSensitive)
    setStatus(count ? `Replaced ${count} occurrence${count === 1 ? '' : 's'}` : 'No matches found')
  }

  return (
    <Dialog open={open} onClose={onClose} title="Find & replace" className="max-w-md">
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Find</label>
          <input
            autoFocus
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Replace with</label>
          <input
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} />
          Match case
        </label>
        {status && <p className="text-xs text-muted-foreground">{status}</p>}
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" onClick={handleFindNext} className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted">
            Find next
          </button>
          <button type="button" onClick={handleReplace} className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted">
            Replace
          </button>
          <button type="button" onClick={handleReplaceAll} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90">
            Replace all
          </button>
        </div>
      </div>
    </Dialog>
  )
}
