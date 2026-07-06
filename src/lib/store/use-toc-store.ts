import { create } from 'zustand'
import type { TocTemplateId } from '@/lib/editor/toc-templates'

interface TocStore {
  template: TocTemplateId
  templateModalOpen: boolean
  setTemplate: (t: TocTemplateId) => void
  openTemplateModal: () => void
  closeTemplateModal: () => void
}

export const useTocStore = create<TocStore>((set) => ({
  template: 'classic',
  templateModalOpen: false,
  setTemplate: (template) => set({ template }),
  openTemplateModal: () => set({ templateModalOpen: true }),
  closeTemplateModal: () => set({ templateModalOpen: false }),
}))
