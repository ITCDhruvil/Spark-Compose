import type { Editor } from '@tiptap/react'

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export type HeadingStyleValue =
  | { kind: 'paragraph' }
  | { kind: 'heading'; level: HeadingLevel }

export interface HeadingStyleOption {
  id: string
  label: string
  preview: string
  previewClass: string
  value: HeadingStyleValue
  section?: 'document' | 'outline'
}

/** Ribbon heading styles — order matters for active-state label resolution. */
export const HEADING_STYLE_OPTIONS: HeadingStyleOption[] = [
  {
    id: 'normal',
    label: 'Normal text',
    preview: 'Normal text',
    previewClass: 'heading-preview-normal',
    value: { kind: 'paragraph' },
  },
  {
    id: 'title',
    label: 'Title',
    preview: 'Title',
    previewClass: 'heading-preview-title',
    value: { kind: 'heading', level: 1 },
    section: 'document',
  },
  {
    id: 'subtitle',
    label: 'Subtitle',
    preview: 'Subtitle',
    previewClass: 'heading-preview-subtitle',
    value: { kind: 'heading', level: 3 },
    section: 'document',
  },
  {
    id: 'h1',
    label: 'Heading 1',
    preview: 'Heading 1',
    previewClass: 'heading-preview-h1',
    value: { kind: 'heading', level: 1 },
    section: 'outline',
  },
  {
    id: 'h2',
    label: 'Heading 2',
    preview: 'Heading 2',
    previewClass: 'heading-preview-h2',
    value: { kind: 'heading', level: 2 },
    section: 'outline',
  },
  {
    id: 'h3',
    label: 'Heading 3',
    preview: 'Heading 3',
    previewClass: 'heading-preview-h3',
    value: { kind: 'heading', level: 3 },
    section: 'outline',
  },
  {
    id: 'h4',
    label: 'Heading 4',
    preview: 'Heading 4',
    previewClass: 'heading-preview-h4',
    value: { kind: 'heading', level: 4 },
    section: 'outline',
  },
  {
    id: 'h5',
    label: 'Heading 5',
    preview: 'Heading 5',
    previewClass: 'heading-preview-h5',
    value: { kind: 'heading', level: 5 },
    section: 'outline',
  },
  {
    id: 'h6',
    label: 'Heading 6',
    preview: 'Heading 6',
    previewClass: 'heading-preview-h6',
    value: { kind: 'heading', level: 6 },
    section: 'outline',
  },
]

export function isHeadingStyleActive(
  option: HeadingStyleOption,
  isActive: (name: string, attrs?: Record<string, unknown>) => boolean,
): boolean {
  if (option.value.kind === 'paragraph') return isActive('paragraph')
  return isActive('heading', { level: option.value.level })
}

export function applyHeadingStyle(editor: Editor, option: HeadingStyleOption): void {
  if (option.value.kind === 'paragraph') {
    editor.chain().focus().setParagraph().run()
    return
  }
  editor.chain().focus().setHeading({ level: option.value.level }).run()
}
