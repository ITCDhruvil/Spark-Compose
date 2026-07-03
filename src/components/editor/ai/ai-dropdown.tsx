'use client'

import { useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Sparkles, ChevronDown } from 'lucide-react'
import { ToolbarPopover } from '../toolbar-popover'
import { AiToggleRow } from './ai-toggle-row'
import { AiSummarizeSubmenu } from './ai-submenu-summarize'
import { AiOutlineSubmenu } from './ai-submenu-outline'
import { AiTranslateModal } from './ai-modal-translate'
import { AiToneModal } from './ai-modal-tone'
import { AiConstructionModal } from './ai-modal-construction'
import { useImproveDoc } from './use-improve-doc'
import { useAiStore } from '@/lib/store/use-ai-store'

export function AiDropdown({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false)
  const [translateOpen, setTranslateOpen] = useState(false)
  const [toneOpen, setToneOpen] = useState(false)
  const [constructionOpen, setConstructionOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const autocompleteEnabled = useAiStore((s) => s.autocompleteEnabled)
  const setAutocompleteEnabled = useAiStore((s) => s.setAutocompleteEnabled)
  const improveEnabled = useAiStore((s) => s.improveEnabled)
  const setImproveEnabled = useAiStore((s) => s.setImproveEnabled)
  const improveDoc = useImproveDoc(editor)

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        title="AI features"
        onMouseDown={(e) => { e.preventDefault(); setOpen((o) => !o) }}
        className="h-7 flex items-center gap-1 px-2 rounded-[3px] text-xs hover:bg-[#e8e8e8] dark:hover:bg-white/10 shrink-0 border border-[#d1d1d1] dark:border-border bg-white dark:bg-background"
      >
        <Sparkles className="w-3.5 h-3.5" />
        AI
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      <ToolbarPopover open={open} anchorRef={triggerRef} onClose={() => setOpen(false)} className="min-w-[280px] py-1">
        <AiToggleRow
          label="Autocomplete"
          description="Ghost text while you type. Tab or → to accept."
          checked={autocompleteEnabled}
          onChange={setAutocompleteEnabled}
        />
        <AiToggleRow
          label="Improve doc"
          description="AI cleanup pass across the document."
          checked={improveEnabled}
          onChange={setImproveEnabled}
          actionLabel={improveDoc.status === 'running' ? `${improveDoc.progress.current}/${improveDoc.progress.total}…` : 'Run improve'}
          onAction={() => improveDoc.run()}
          actionDisabled={!improveEnabled || improveDoc.status === 'running'}
        />
        <div className="border-t my-1" />
        <AiSummarizeSubmenu editor={editor} />
        <AiOutlineSubmenu editor={editor} />
        <div className="border-t my-1" />
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); setOpen(false); setTranslateOpen(true) }}
          className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted"
        >
          Translate
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); setOpen(false); setToneOpen(true) }}
          className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted"
        >
          Custom tone
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); setOpen(false); setConstructionOpen(true) }}
          className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted font-medium"
        >
          Construction draft
        </button>
      </ToolbarPopover>

      <AiTranslateModal open={translateOpen} onClose={() => setTranslateOpen(false)} editor={editor} />
      <AiToneModal open={toneOpen} onClose={() => setToneOpen(false)} editor={editor} />
      <AiConstructionModal open={constructionOpen} onClose={() => setConstructionOpen(false)} editor={editor} />
    </>
  )
}
