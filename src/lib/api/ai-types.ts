// src/lib/api/ai-types.ts

export type RewriteMode =
  | 'grammar' | 'spelling' | 'concise' | 'professional' | 'simplify'
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

export type SuggestBlockKind =
  | 'heading'
  | 'subtitle'
  | 'bulletList'
  | 'orderedList'
  | 'taskList'

export interface SuggestBlockRequest {
  kind: SuggestBlockKind
  paragraph: string
  prevHeadings: { level: 1 | 2 | 3; text: string }[]
  nextHeadings: { level: 1 | 2 | 3; text: string }[]
  preferredLevel: 1 | 2 | 3
}

export interface SuggestBlockResponse {
  level?: 1 | 2 | 3
  text?: string
  items?: string[]
}

export type ExplainAudience = 'explain' | 'crew' | 'client' | 'engineer'

export type AskPreset = 'default' | 'short' | 'detailed' | 'toolbox'

export interface GlossaryTerm {
  from: string
  to: string
}

export interface GlossaryRequest {
  text: string
}

export interface GlossaryResponse {
  terms: GlossaryTerm[]
}

export interface ImageCaptionRequest {
  /** Image URL or data URL — required for genuine vision captioning */
  src: string
  /** Existing alt/title if any */
  alt?: string
  title?: string
  /** Optional surrounding document text for context */
  context?: string
  mode: 'caption' | 'alt'
}

export interface ImageCaptionResponse {
  text: string
}

export interface FindIssuesRequest {
  text: string
}

export interface FindIssueItem {
  id: string
  severity: 'high' | 'medium' | 'low'
  text: string
  originalSnippet: string
  suggestion: string
}

export interface FindIssuesResponse {
  issues: FindIssueItem[]
}

export type AutoStructureAction =
  | 'heading'
  | 'subtitle'
  | 'bulletList'
  | 'orderedList'
  | 'taskList'
  | 'table'
  | 'refactor'

export interface AutoStructureOp {
  /** Start of the paragraph this op applies to / sits above */
  matchPrefix: string
  action: AutoStructureAction
  level?: 1 | 2 | 3
  text?: string
  items?: string[]
  headers?: string[]
  rows?: string[][]
  /** Full replacement paragraph text when action is refactor */
  replacement?: string
}

export interface AutoStructureResponse {
  operations: AutoStructureOp[]
  /** @deprecated use operations */
  headings?: { matchPrefix: string; level: 1 | 2 | 3; text: string }[]
}

export interface TextToTableRequest {
  text: string
}

export interface TextToTableResponse {
  headers: string[]
  rows: string[][]
}

export type KpiStatus = 'good' | 'warn' | 'bad'

export interface KpiItem {
  label: string
  value: string
  trend?: string
  status?: KpiStatus
}

export interface KpiWidgetsRequest {
  text: string
}

export interface KpiWidgetsResponse {
  kpis: KpiItem[]
}

export type ProgressAnalyticsMode = 'burndown' | 'trend' | 'csv'

export interface ProgressAnalyticsRequest {
  text: string
  mode: ProgressAnalyticsMode
}

export interface ProgressAnalyticsResponse {
  title?: string
  headers: string[]
  rows: string[][]
}

export interface ActionItemsRequest {
  text: string
}

export interface ActionItemRow {
  text: string
  owner?: string
  due?: string
}

export interface ActionItemsResponse {
  items: ActionItemRow[]
}

export interface BriefGapsRequest {
  document: string
  brief: string
}

export interface BriefGapsResponse {
  gaps: string[]
}

export interface CompareSummaryRequest {
  original: string
  summary: string
}

export interface SummaryBenchmarkScore {
  id: 'grammar' | 'tone' | 'clarity' | 'conciseness' | 'completeness'
  label: string
  original: number
  summary: number
  improvement: number
}

export interface CompareSummaryResponse {
  overall: { original: number; summary: number; improvement: number }
  benchmarks: SummaryBenchmarkScore[]
}

export interface AskDraftQuestion {
  id: string
  question: string
  options: string[]
}

export interface AskDraftPlan {
  contentType: ConstructionContentType
  audience: string
  topic: string
  angle?: string
  mustInclude?: string
  length?: ConstructionDraftLength
  includeSampleImage?: boolean
  photoPlacementHint?: string
}

export interface AskDraftRequest {
  prompt: string
  messages?: unknown[]
  toolResults?: { toolCallId: string; output: string }[]
}

export type AskDraftResponse =
  | {
      type: 'questions'
      kind: 'required' | 'optional'
      questions: AskDraftQuestion[]
      messages: unknown[]
      pendingToolCallIds: string[]
      pendingToolNames: string[]
    }
  | {
      type: 'ready'
      plan: AskDraftPlan
      messages: unknown[]
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

export interface ConstructionDraftImage {
  base64: string
  mediaType: string
  publicUrl: string
}

export interface ConstructionDraftRequest {
  contentType: ConstructionContentType
  audience: string
  topic: string
  angle?: string
  mustInclude?: string
  length?: ConstructionDraftLength
  docId?: string
  model?: string
  /** @deprecated prefer articleImages */
  articleImageBase64?: string
  articleImageMediaType?: string
  articleImagePublicUrl?: string
  articleImages?: ConstructionDraftImage[]
  articleImagePlacementHint?: string
  /** When true, vision analyzes each photo for placement + captions. */
  referenceAiDecide?: boolean
  referenceSourceId?: string
  referenceSourceIds?: string[]
  referenceNotes?: string
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
  imageAnalyses?: {
    index: number
    description: string
    alt: string
    caption: string
    placementHint: string
  }[]
}
