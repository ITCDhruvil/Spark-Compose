// src/lib/api/ai-types.ts

export type RewriteMode =
  | 'grammar' | 'concise' | 'professional' | 'simplify'
  | 'executive' | 'technical' | 'polish' | 'custom_tone'

export type AutocompleteScope = 'word' | 'sentence' | 'paragraph'
export type SummaryLength = 'short' | 'medium' | 'detailed'

export interface RewriteRequest {
  selection: string
  mode: RewriteMode
  before?: string
  after?: string
  docId?: string
  model?: string
}

export interface CompleteRequest {
  before: string
  after?: string
  docId?: string
  model?: string
  scope?: AutocompleteScope
}

export interface SummarizeRequest {
  text: string
  length: SummaryLength
  docId?: string
}

export interface TranslateRequest {
  text: string
  targetLang: string
  before?: string
  after?: string
  docId?: string
}

export interface OutlineRequest {
  docText: string
  docId?: string
}

export interface OutlineHeading {
  level: 1 | 2 | 3
  text: string
  offset?: number
}

export interface OutlineResponse {
  headings: OutlineHeading[]
}

export interface CustomToneRequest {
  selection: string
  tone: string
  before?: string
  after?: string
  docId?: string
}

export type ConstructionContentType =
  | 'article' | 'blog_post' | 'case_study' | 'experience_share' | 'technical_guide'
export type ConstructionDraftLength = 'short' | 'medium' | 'long'

export interface ConstructionDraftRequest {
  contentType: ConstructionContentType
  audience: string
  topic: string
  angle?: string
  mustInclude?: string
  length?: ConstructionDraftLength
  docId?: string
  model?: string
  articleImageBase64?: string
  articleImageMediaType?: string
  articleImagePublicUrl?: string
  articleImagePlacementHint?: string
  referenceSourceId?: string
  referenceNotes?: string
  referenceAiDecide?: boolean
}

export interface RagIngestResponse {
  sourceId: string
  chunkCount: number
  filename: string
  hasEmbeddings: boolean
  warnings: string[]
}

// ── Lexical JSON shapes returned by /ai/construction-draft ──
// Backend emits only these node types for construction drafts:
// root, paragraph, heading, quote, list, listitem, table, tablerow,
// tablecell, code, text, image. Types below are trimmed to that set.

export interface LexicalTextNode {
  type: 'text'
  version: 1
  text: string
  format: number
  detail: number
  mode: string
  style: string
}

export interface LexicalElementBase {
  version: 1
  direction: 'ltr' | 'rtl' | null
  format: '' | 'left' | 'center' | 'right' | 'justify' | 'start' | 'end'
  indent: number
  children: LexicalNode[]
}

export interface LexicalParagraphNode extends LexicalElementBase {
  type: 'paragraph'
}

export interface LexicalHeadingNode extends LexicalElementBase {
  type: 'heading'
  tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}

export interface LexicalQuoteNode extends LexicalElementBase {
  type: 'quote'
}

export interface LexicalListNode extends LexicalElementBase {
  type: 'list'
  listType: 'bullet' | 'number' | 'check'
  start: number
  tag: 'ul' | 'ol'
}

export interface LexicalListItemNode extends LexicalElementBase {
  type: 'listitem'
  value: number
  checked?: boolean
}

export interface LexicalCodeNode extends LexicalElementBase {
  type: 'code'
  language: string | null
}

export interface LexicalTableNode extends LexicalElementBase {
  type: 'table'
}

export interface LexicalTableRowNode extends LexicalElementBase {
  type: 'tablerow'
}

export interface LexicalTableCellNode extends LexicalElementBase {
  type: 'tablecell'
  headerState: number
  width?: number | null
  backgroundColor?: string | null
  colSpan?: number
  rowSpan?: number
}

export interface LexicalImageNode {
  type: 'image'
  version: 1
  src: string
  alt: string
  width: number
  alignment: string
}

export type LexicalBlockNode =
  | LexicalParagraphNode | LexicalHeadingNode | LexicalQuoteNode
  | LexicalListNode | LexicalListItemNode | LexicalCodeNode
  | LexicalTableNode | LexicalTableRowNode | LexicalTableCellNode
  | LexicalImageNode

export type LexicalNode = LexicalTextNode | LexicalBlockNode

export interface LexicalRootNode {
  type: 'root'
  version: 1
  direction: 'ltr' | 'rtl' | null
  format: '' | 'left' | 'center' | 'right' | 'justify' | 'start' | 'end'
  indent: number
  children: LexicalBlockNode[]
}

export interface LexicalEditorState {
  root: LexicalRootNode
}

export interface ConstructionDraftResponse {
  lexicalJson: LexicalEditorState
  warnings: string[]
}
