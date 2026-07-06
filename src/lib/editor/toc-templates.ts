export type TocTemplateId = 'classic' | 'modern' | 'minimal' | 'formal' | 'dotted' | 'compact'

export interface TocTemplate {
  id: TocTemplateId
  label: string
  description: string
  title: string
}

export const TOC_TEMPLATES: TocTemplate[] = [
  {
    id: 'classic',
    label: 'Classic',
    description: 'Serif title with dotted leaders — default report style.',
    title: 'Table of Contents',
  },
  {
    id: 'modern',
    label: 'Modern',
    description: 'Clean sans-serif with subtle rules.',
    title: 'Contents',
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Light spacing, simple dot leaders.',
    title: 'Contents',
  },
  {
    id: 'formal',
    label: 'Formal',
    description: 'Centered title with rule lines for specifications.',
    title: 'Table of Contents',
  },
  {
    id: 'dotted',
    label: 'Dotted',
    description: 'Heavy dot leaders for maximum readability.',
    title: 'Index',
  },
  {
    id: 'compact',
    label: 'Compact',
    description: 'Tighter rows for long documents.',
    title: 'Contents',
  },
]

export function getTocTemplate(id: TocTemplateId): TocTemplate {
  return TOC_TEMPLATES.find((t) => t.id === id) ?? TOC_TEMPLATES[0]
}
