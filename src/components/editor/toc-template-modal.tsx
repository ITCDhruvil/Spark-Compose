'use client'

import { Dialog } from '@/components/ui/dialog'
import { TOC_TEMPLATES, type TocTemplateId } from '@/lib/editor/toc-templates'
import { useTocStore } from '@/lib/store/use-toc-store'
import type { Editor } from '@tiptap/react'
import { applyTocTemplateToDocument } from '@/lib/editor/toc-utils'

interface TocTemplateModalProps {
  editor: Editor | null
}

function TemplatePreview({ id, active }: { id: TocTemplateId; active: boolean }) {
  return (
    <div
      className={`rounded-md border p-2.5 bg-background transition-shadow ${
        active ? 'border-primary ring-2 ring-primary/25' : 'border-border'
      } editor-toc-block editor-toc-${id} !m-0 !p-2 scale-[0.92] origin-top`}
    >
      <div className="editor-toc-title !text-[11px] !mb-1.5">Contents</div>
      <div className="editor-toc-entries !gap-0.5">
        <div className="editor-toc-row editor-toc-level-2 !py-0 pointer-events-none">
          <span className="editor-toc-label !text-[9px]">Scope</span>
          <span className="editor-toc-leader" />
          <span className="editor-toc-page !text-[9px]">3</span>
        </div>
        <div className="editor-toc-row editor-toc-level-2 !py-0 pointer-events-none">
          <span className="editor-toc-label !text-[9px]">Sequence</span>
          <span className="editor-toc-leader" />
          <span className="editor-toc-page !text-[9px]">4</span>
        </div>
      </div>
    </div>
  )
}

export function TocTemplateModal({ editor }: TocTemplateModalProps) {
  const open = useTocStore((s) => s.templateModalOpen)
  const close = useTocStore((s) => s.closeTemplateModal)
  const template = useTocStore((s) => s.template)
  const setTemplate = useTocStore((s) => s.setTemplate)

  const select = (id: TocTemplateId) => {
    setTemplate(id)
    if (editor) applyTocTemplateToDocument(editor, id)
    close()
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Index page style"
      description="Choose how the table of contents looks. Applies to existing index blocks in the document."
      className="max-w-2xl"
    >
      <div className="-mx-1 grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[70vh] overflow-y-auto scrollbar-hide">
        {TOC_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => select(t.id)}
            className="text-left rounded-lg border p-2 hover:bg-muted/40 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <TemplatePreview id={t.id} active={template === t.id} />
            <p className="mt-2 text-sm font-medium">{t.label}</p>
            <p className="text-[11px] text-muted-foreground leading-snug">{t.description}</p>
          </button>
        ))}
      </div>
    </Dialog>
  )
}
