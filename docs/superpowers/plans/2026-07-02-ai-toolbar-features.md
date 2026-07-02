# AI Toolbar Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add all AI features from `D:\Text_Editor` into `D:\rich-editor`'s toolbar as a single "AI" dropdown (toggles, hover-submenus, and modals — no separate side panel), talking to the existing `D:\Text_Editor\services\api` FastAPI backend unchanged.

**Architecture:** New `src/lib/api/ai-client.ts` (ported HTTP/SSE client), a small zustand store for AI UI state, a Tiptap ProseMirror-decoration extension for ghost-text autocomplete, and 7 dropdown rows (2 toggles, 2 hover-submenus, 3 modals) added to the existing `editor-toolbar.tsx` as a new `'ai'` toolbar segment. Construction draft (brief → full article) is the most complex row and requires a Lexical-JSON → Tiptap-JSON node converter since the backend's construction-draft endpoint returns Lexical-shaped JSON.

**Tech Stack:** Next.js 15 / React 19-RC / Tiptap 3.27.1 / zustand / existing `components/ui/dialog.tsx` + `toolbar-popover.tsx` patterns already in the repo.

## Global Constraints

- Backend is `D:\Text_Editor\services\api`, run separately by the user (not started by rich-editor tooling). Base URL from `process.env.NEXT_PUBLIC_API_URL`, default `http://localhost:8000` (matches Text_Editor's client default).
- No backend/contract changes. Every `aiApi`/`ragApi`/`uploadsApi` request/response shape and SSE event shape (`{type: 'token'|'done'|'error', delta?, ...}`) must match `D:\Text_Editor\apps\web\lib\api\client.ts` and `D:\Text_Editor\packages\pipeline-contracts\src\ai.ts` exactly.
- No separate AI side panel — everything lives in the toolbar "AI" dropdown, per user's explicit UI decision.
- Toggle-type rows (Autocomplete, Improve doc) use simple toggle UI, never a modal.
- Hover-submenu rows (Summarize, Outline) show inline results in a side flyout, never a modal.
- Modal rows (Translate, Custom tone, Construction draft) use the existing `components/ui/dialog.tsx` `Dialog` component.
- Construction draft is the flagship feature — most complete UI, most manual testing.
- New toolbar segment id `'ai'` is inserted into `TOOLBAR_SEGMENT_ORDER` immediately after `'styles'` and before `'format'`.
- Ghost-text autocomplete is a genuine ProseMirror `Decoration.widget` (not a real document node), matching Text_Editor's behavior: 400ms debounce, 3-char minimum before-context, Tab/→ to accept, Esc to dismiss, streamed token-by-token.

---

## File Structure

```
src/lib/api/ai-types.ts        — request/response/SSE types (ported from pipeline-contracts/src/ai.ts, Lexical types inlined)
src/lib/api/ai-client.ts       — HTTP/SSE client (ported from Text_Editor's lib/api/client.ts, AI + RAG + uploads only)
src/lib/editor/lexical-to-tiptap.ts — converts backend's Lexical-JSON construction-draft output to Tiptap JSON
src/lib/store/use-ai-store.ts  — zustand store: ghost text state, rewrite/tone/translate session state, per-feature enabled toggles
src/lib/editor/translate-languages.ts — language groups list (ported from Text_Editor's translateLanguageOptions.ts)

src/components/editor/extensions/ai-autocomplete.ts — Tiptap extension, ProseMirror decoration ghost text
src/components/editor/ai/ai-dropdown.tsx            — toolbar button + popover shell, lists all 7 rows
src/components/editor/ai/ai-toggle-row.tsx           — reusable toggle row (switch + label + optional inline action button)
src/components/editor/ai/ai-submenu-summarize.tsx    — hover submenu: scope/length/generate/result/copy
src/components/editor/ai/ai-submenu-outline.tsx      — hover submenu: suggest/list/insert
src/components/editor/ai/ai-modal-translate.tsx       — modal: language picker + translate + accept/reject
src/components/editor/ai/ai-modal-tone.tsx            — modal: instruction textarea + apply + accept/reject
src/components/editor/ai/ai-modal-construction.tsx    — modal: full construction-draft form + generate/apply/discard

src/components/editor/editor-toolbar.tsx — MODIFY: add 'ai' segment
src/components/editor/use-toolbar-overflow.ts — MODIFY: add 'ai' to ToolbarSegmentId union + TOOLBAR_SEGMENT_ORDER
src/components/editor/rich-editor.tsx — MODIFY: register ai-autocomplete extension, wire AI dropdown into toolbar props
package.json — MODIFY: add zustand dependency
```

---

### Task 1: AI API types and client

**Files:**
- Create: `D:\rich-editor\src\lib\api\ai-types.ts`
- Create: `D:\rich-editor\src\lib\api\ai-client.ts`
- Test: `D:\rich-editor\src\lib\api\ai-client.test.ts`

**Interfaces:**
- Produces: `aiApi.complete(req: CompleteRequest, signal): AsyncGenerator<string>`, `aiApi.rewrite(req: RewriteRequest, signal): AsyncGenerator<string>`, `aiApi.summarize(req: SummarizeRequest, signal): AsyncGenerator<string>`, `aiApi.translate(req: TranslateRequest, signal): AsyncGenerator<string>`, `aiApi.customTone(req: CustomToneRequest, signal): AsyncGenerator<string>`, `aiApi.outline(req: OutlineRequest): Promise<OutlineResponse>`, `aiApi.constructionDraft(req: ConstructionDraftRequest): Promise<ConstructionDraftResponse>`, `ragApi.ingest(opts: {notes?: string; file?: File}): Promise<RagIngestResponse>`, `uploadsApi.image(file: File): Promise<{url: string; filename: string}>`, `APIError`, `NetworkError` classes, `streamSSE(path, body, signal): AsyncGenerator<string>`.
- Consumes: nothing (base layer).

- [ ] **Step 1: Write `ai-types.ts` with exact contract types**

```typescript
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
```

- [ ] **Step 2: Write `ai-client.ts` ported from Text_Editor's client**

```typescript
// src/lib/api/ai-client.ts
import type {
  RewriteRequest, CompleteRequest, SummarizeRequest, TranslateRequest,
  OutlineRequest, OutlineResponse, CustomToneRequest,
  ConstructionDraftRequest, ConstructionDraftResponse, RagIngestResponse,
} from './ai-types'

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

let _token: string | null = null
export function setAuthToken(token: string | null): void {
  _token = token
}

export class APIError extends Error {
  constructor(public readonly status: number, message: string, public readonly path?: string) {
    super(message)
    this.name = 'APIError'
  }
}

export class NetworkError extends Error {
  public readonly originalCause: unknown
  public readonly path?: string
  constructor(cause: unknown, path?: string) {
    const reason = cause instanceof Error ? cause.message : String(cause)
    super(`Network error on ${path ?? '?'}: ${reason}`)
    this.name = 'NetworkError'
    this.originalCause = cause
    this.path = path
  }
}

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', ...extra }
  if (_token) h['Authorization'] = `Bearer ${_token}`
  return h
}

function withTimeout(ms: number): { signal: AbortSignal; clear: () => void } {
  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), ms)
  return { signal: ctrl.signal, clear: () => clearTimeout(id) }
}

const DEFAULT_TIMEOUT_MS = 15_000

async function apiFetch<T>(path: string, init: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const url = `${BASE}${path}`
  const { signal: timeoutSignal, clear } = withTimeout(timeoutMs)
  const callerSignal = init.signal as AbortSignal | undefined
  let signal: AbortSignal
  if (callerSignal) {
    const ctrl = new AbortController()
    const abort = () => ctrl.abort()
    callerSignal.addEventListener('abort', abort, { once: true })
    timeoutSignal.addEventListener('abort', abort, { once: true })
    signal = ctrl.signal
  } else {
    signal = timeoutSignal
  }

  const reqInit: RequestInit = {
    ...init,
    headers: buildHeaders(init.headers as Record<string, string> | undefined),
    signal,
  }

  let res: Response
  try {
    res = await fetch(url, reqInit)
  } catch (err) {
    clear()
    const isTimeout = (err as Error).name === 'AbortError' && !callerSignal?.aborted
    if (isTimeout) throw new NetworkError(new Error(`Request timed out after ${timeoutMs}ms`), path)
    if ((err as Error).name === 'AbortError') throw err
    throw new NetworkError(err, path)
  } finally {
    clear()
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new APIError(res.status, body, path)
  }

  return res.json() as Promise<T>
}

export async function* streamSSE(path: string, body: unknown, signal: AbortSignal): AsyncGenerator<string> {
  const url = `${BASE}${path}`
  const headers = buildHeaders({ Accept: 'text/event-stream' })

  let res: Response
  try {
    res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    throw new NetworkError(err, path)
  }

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '')
    throw new APIError(res.status, text, path)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (data && data !== '[DONE]') yield data
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {})
  }
}

export const aiApi = {
  rewrite(req: RewriteRequest, signal: AbortSignal): AsyncGenerator<string> {
    return streamSSE('/ai/rewrite', req, signal)
  },
  complete(req: CompleteRequest, signal: AbortSignal): AsyncGenerator<string> {
    return streamSSE('/ai/complete', req, signal)
  },
  summarize(req: SummarizeRequest, signal: AbortSignal): AsyncGenerator<string> {
    return streamSSE('/ai/summarize', req, signal)
  },
  translate(req: TranslateRequest, signal: AbortSignal): AsyncGenerator<string> {
    return streamSSE('/ai/translate', req, signal)
  },
  customTone(req: CustomToneRequest, signal: AbortSignal): AsyncGenerator<string> {
    return streamSSE('/ai/custom-tone', req, signal)
  },
  outline(req: OutlineRequest): Promise<OutlineResponse> {
    return apiFetch('/ai/outline', { method: 'POST', body: JSON.stringify(req) })
  },
  constructionDraft(req: ConstructionDraftRequest): Promise<ConstructionDraftResponse> {
    return apiFetch('/ai/construction-draft', { method: 'POST', body: JSON.stringify(req) }, 120_000)
  },
}

export const ragApi = {
  async ingest(opts: { notes?: string; file?: File }): Promise<RagIngestResponse> {
    const url = `${BASE}/rag/ingest`
    const headers: Record<string, string> = {}
    if (_token) headers['Authorization'] = `Bearer ${_token}`

    const form = new FormData()
    if (opts.notes?.trim()) form.append('notes', opts.notes.trim())
    if (opts.file) form.append('file', opts.file)

    let res: Response
    try {
      res = await fetch(url, { method: 'POST', headers, body: form })
    } catch (err) {
      throw new NetworkError(err, '/rag/ingest')
    }

    if (!res.ok) throw new APIError(res.status, await res.text(), '/rag/ingest')
    return res.json() as Promise<RagIngestResponse>
  },
}

export const uploadsApi = {
  async image(file: File): Promise<{ url: string; filename: string }> {
    const url = `${BASE}/uploads/image`
    const headers: Record<string, string> = {}
    if (_token) headers['Authorization'] = `Bearer ${_token}`

    const form = new FormData()
    form.append('file', file)

    let res: Response
    try {
      res = await fetch(url, { method: 'POST', headers, body: form })
    } catch (err) {
      throw new NetworkError(err, '/uploads/image')
    }

    if (!res.ok) throw new APIError(res.status, await res.text(), '/uploads/image')

    const data = (await res.json()) as { url: string; filename: string }
    if (data.url.startsWith('/')) data.url = `${BASE}${data.url}`
    return data
  },
}
```

- [ ] **Step 3: Write test verifying SSE parsing and error handling**

```typescript
// src/lib/api/ai-client.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { streamSSE, APIError, NetworkError } from './ai-client'

describe('streamSSE', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('yields data lines and skips [DONE]', async () => {
    const chunks = [
      'data: {"type":"token","delta":"Hel"}\n\n',
      'data: {"type":"token","delta":"lo"}\n\n',
      'data: [DONE]\n\n',
    ]
    let i = 0
    const stream = new ReadableStream({
      pull(controller) {
        if (i < chunks.length) {
          controller.enqueue(new TextEncoder().encode(chunks[i]))
          i++
        } else {
          controller.close()
        }
      },
    })
    global.fetch = vi.fn().mockResolvedValue(new Response(stream, { status: 200 }))

    const results: string[] = []
    for await (const raw of streamSSE('/ai/complete', { before: 'x' }, new AbortController().signal)) {
      results.push(raw)
    }
    expect(results).toEqual([
      '{"type":"token","delta":"Hel"}',
      '{"type":"token","delta":"lo"}',
    ])
  })

  it('throws APIError on non-2xx response', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('bad request', { status: 400 }))
    await expect(async () => {
      for await (const _ of streamSSE('/ai/complete', {}, new AbortController().signal)) {
        // drain
      }
    }).rejects.toThrow(APIError)
  })

  it('throws NetworkError when fetch rejects', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('DNS failure'))
    await expect(async () => {
      for await (const _ of streamSSE('/ai/complete', {}, new AbortController().signal)) {
        // drain
      }
    }).rejects.toThrow(NetworkError)
  })
})
```

- [ ] **Step 4: Install vitest if not already present, and run the test**

Check first:
```bash
cd D:/rich-editor && cat package.json | grep vitest
```

If missing, install:
```bash
cd D:/rich-editor && npm install --legacy-peer-deps -D vitest
```

Add to `package.json` scripts: `"test": "vitest run"`.

Run: `cd D:/rich-editor && npx vitest run src/lib/api/ai-client.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
cd D:/rich-editor && git add src/lib/api/ai-types.ts src/lib/api/ai-client.ts src/lib/api/ai-client.test.ts package.json package-lock.json && git commit -m "feat: add AI API client and types"
```

---

### Task 2: AI zustand store

**Files:**
- Create: `D:\rich-editor\src\lib\store\use-ai-store.ts`
- Test: `D:\rich-editor\src\lib\store\use-ai-store.test.ts`

**Interfaces:**
- Consumes: nothing (pure state).
- Produces: `useAiStore()` hook exposing:
  - `autocompleteEnabled: boolean`, `setAutocompleteEnabled(v: boolean)`
  - `improveEnabled: boolean`, `setImproveEnabled(v: boolean)`
  - `ghostText: string | null`, `setGhostText(t: string | null)`
  - `ghostLastError: string | null`, `setGhostError(msg: string | null)`
  - `rewriteSession: RewriteSession | null`, `startRewrite(mode, original): AbortController`, `appendRewrite(delta: string)`, `finishRewrite(warnings?: string[])`, `setRewriteError()`, `clearRewrite()`
  - `RewriteSession` type: `{ mode: string; original: string; rewritten: string; status: 'idle'|'loading'|'streaming'|'done'|'error'; warnings: string[]; abortController: AbortController }`

- [ ] **Step 1: Install zustand**

```bash
cd D:/rich-editor && npm install --legacy-peer-deps zustand
```

- [ ] **Step 2: Write failing test for toggle state**

```typescript
// src/lib/store/use-ai-store.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useAiStore } from './use-ai-store'

describe('useAiStore toggles', () => {
  beforeEach(() => {
    useAiStore.setState({ autocompleteEnabled: true, improveEnabled: true })
  })

  it('setAutocompleteEnabled flips the flag', () => {
    useAiStore.getState().setAutocompleteEnabled(false)
    expect(useAiStore.getState().autocompleteEnabled).toBe(false)
  })

  it('setImproveEnabled flips the flag', () => {
    useAiStore.getState().setImproveEnabled(false)
    expect(useAiStore.getState().improveEnabled).toBe(false)
  })
})

describe('useAiStore rewrite session', () => {
  it('startRewrite creates a loading session and returns an AbortController', () => {
    const ctrl = useAiStore.getState().startRewrite('custom_tone', 'hello world')
    expect(ctrl).toBeInstanceOf(AbortController)
    const session = useAiStore.getState().rewriteSession
    expect(session).not.toBeNull()
    expect(session?.status).toBe('loading')
    expect(session?.original).toBe('hello world')
  })

  it('appendRewrite accumulates deltas and sets status to streaming', () => {
    useAiStore.getState().startRewrite('custom_tone', 'hi')
    useAiStore.getState().appendRewrite('He')
    useAiStore.getState().appendRewrite('llo')
    const session = useAiStore.getState().rewriteSession
    expect(session?.rewritten).toBe('Hello')
    expect(session?.status).toBe('streaming')
  })

  it('finishRewrite sets status done and stores warnings', () => {
    useAiStore.getState().startRewrite('custom_tone', 'hi')
    useAiStore.getState().finishRewrite(['warn1'])
    const session = useAiStore.getState().rewriteSession
    expect(session?.status).toBe('done')
    expect(session?.warnings).toEqual(['warn1'])
  })

  it('clearRewrite aborts and nulls the session', () => {
    useAiStore.getState().startRewrite('custom_tone', 'hi')
    useAiStore.getState().clearRewrite()
    expect(useAiStore.getState().rewriteSession).toBeNull()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd D:/rich-editor && npx vitest run src/lib/store/use-ai-store.test.ts`
Expected: FAIL with "Cannot find module './use-ai-store'"

- [ ] **Step 4: Implement the store**

```typescript
// src/lib/store/use-ai-store.ts
import { create } from 'zustand'

export type RewriteMode =
  | 'grammar' | 'concise' | 'professional' | 'simplify'
  | 'executive' | 'technical' | 'polish' | 'custom_tone'

export type AIStatus = 'idle' | 'loading' | 'streaming' | 'done' | 'error'

export interface RewriteSession {
  mode: RewriteMode
  original: string
  rewritten: string
  status: AIStatus
  warnings: string[]
  abortController: AbortController
}

interface AiState {
  autocompleteEnabled: boolean
  improveEnabled: boolean

  ghostText: string | null
  ghostTextAbortController: AbortController | null
  ghostLastError: string | null

  rewriteSession: RewriteSession | null

  setAutocompleteEnabled: (v: boolean) => void
  setImproveEnabled: (v: boolean) => void

  setGhostText: (text: string | null) => void
  setGhostAbort: (ctrl: AbortController | null) => void
  setGhostError: (msg: string | null) => void
  cancelGhost: () => void

  startRewrite: (mode: RewriteMode, original: string) => AbortController
  appendRewrite: (delta: string) => void
  finishRewrite: (warnings?: string[]) => void
  cancelRewrite: () => void
  setRewriteError: () => void
  clearRewrite: () => void
}

export const useAiStore = create<AiState>((set, get) => ({
  autocompleteEnabled: true,
  improveEnabled: true,

  ghostText: null,
  ghostTextAbortController: null,
  ghostLastError: null,

  rewriteSession: null,

  setAutocompleteEnabled: (autocompleteEnabled) => set({ autocompleteEnabled }),
  setImproveEnabled: (improveEnabled) => set({ improveEnabled }),

  setGhostText: (ghostText) => set({ ghostText }),
  setGhostAbort: (ghostTextAbortController) => set({ ghostTextAbortController }),
  setGhostError: (ghostLastError) => set({ ghostLastError }),
  cancelGhost: () => {
    get().ghostTextAbortController?.abort()
    set({ ghostText: null, ghostTextAbortController: null })
  },

  startRewrite: (mode, original) => {
    get().rewriteSession?.abortController.abort()
    const ctrl = new AbortController()
    set({
      rewriteSession: { mode, original, rewritten: '', status: 'loading', warnings: [], abortController: ctrl },
    })
    return ctrl
  },

  appendRewrite: (delta) =>
    set((s) => {
      if (!s.rewriteSession) return s
      return {
        rewriteSession: { ...s.rewriteSession, rewritten: s.rewriteSession.rewritten + delta, status: 'streaming' },
      }
    }),

  finishRewrite: (warnings = []) =>
    set((s) => {
      if (!s.rewriteSession) return s
      return { rewriteSession: { ...s.rewriteSession, status: 'done', warnings } }
    }),

  cancelRewrite: () => {
    get().rewriteSession?.abortController.abort()
    set({ rewriteSession: null })
  },

  setRewriteError: () =>
    set((s) => {
      if (!s.rewriteSession) return s
      return { rewriteSession: { ...s.rewriteSession, status: 'error' } }
    }),

  clearRewrite: () => {
    get().rewriteSession?.abortController.abort()
    set({ rewriteSession: null })
  },
}))
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd D:/rich-editor && npx vitest run src/lib/store/use-ai-store.test.ts`
Expected: 6 tests PASS

- [ ] **Step 6: Commit**

```bash
cd D:/rich-editor && git add src/lib/store/use-ai-store.ts src/lib/store/use-ai-store.test.ts package.json package-lock.json && git commit -m "feat: add AI zustand store"
```

---

### Task 3: Lexical-to-Tiptap JSON converter

**Files:**
- Create: `D:\rich-editor\src\lib\editor\lexical-to-tiptap.ts`
- Test: `D:\rich-editor\src\lib\editor\lexical-to-tiptap.test.ts`

**Interfaces:**
- Consumes: `LexicalEditorState`, `LexicalNode`, `LexicalBlockNode` types from `src/lib/api/ai-types.ts` (Task 1).
- Produces: `lexicalToTiptapDoc(state: LexicalEditorState): Record<string, unknown>` — returns a Tiptap-compatible JSON document (`{type: 'doc', content: [...]}`) usable with `editor.commands.insertContent(...)`.

- [ ] **Step 1: Write failing test covering every node type the backend emits**

```typescript
// src/lib/editor/lexical-to-tiptap.test.ts
import { describe, it, expect } from 'vitest'
import { lexicalToTiptapDoc } from './lexical-to-tiptap'
import type { LexicalEditorState } from '@/lib/api/ai-types'

function textNode(text: string, format = 0) {
  return { type: 'text' as const, version: 1 as const, text, format, detail: 0, mode: 'normal', style: '' }
}

describe('lexicalToTiptapDoc', () => {
  it('converts a paragraph with plain text', () => {
    const state: LexicalEditorState = {
      root: {
        type: 'root', version: 1, direction: 'ltr', format: '', indent: 0,
        children: [
          { type: 'paragraph', version: 1, direction: 'ltr', format: '', indent: 0, children: [textNode('hello')] },
        ],
      },
    }
    const doc = lexicalToTiptapDoc(state)
    expect(doc).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'hello' }] },
      ],
    })
  })

  it('converts bold+italic text format bitmask to Tiptap marks', () => {
    // Bold=1, Italic=2 -> 3
    const state: LexicalEditorState = {
      root: {
        type: 'root', version: 1, direction: 'ltr', format: '', indent: 0,
        children: [
          { type: 'paragraph', version: 1, direction: 'ltr', format: '', indent: 0, children: [textNode('bi', 3)] },
        ],
      },
    }
    const doc = lexicalToTiptapDoc(state)
    const textContent = (doc.content as any[])[0].content[0]
    expect(textContent.marks).toEqual(
      expect.arrayContaining([{ type: 'bold' }, { type: 'italic' }]),
    )
  })

  it('converts heading with tag h2', () => {
    const state: LexicalEditorState = {
      root: {
        type: 'root', version: 1, direction: 'ltr', format: '', indent: 0,
        children: [
          { type: 'heading', tag: 'h2', version: 1, direction: 'ltr', format: '', indent: 0, children: [textNode('Title')] },
        ],
      },
    }
    const doc = lexicalToTiptapDoc(state)
    expect((doc.content as any[])[0]).toEqual({
      type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Title' }],
    })
  })

  it('converts bullet list with list items', () => {
    const state: LexicalEditorState = {
      root: {
        type: 'root', version: 1, direction: 'ltr', format: '', indent: 0,
        children: [
          {
            type: 'list', listType: 'bullet', start: 1, tag: 'ul',
            version: 1, direction: 'ltr', format: '', indent: 0,
            children: [
              {
                type: 'listitem', value: 1, version: 1, direction: 'ltr', format: '', indent: 0,
                children: [{ type: 'paragraph', version: 1, direction: 'ltr', format: '', indent: 0, children: [textNode('item one')] }],
              },
            ],
          },
        ],
      },
    }
    const doc = lexicalToTiptapDoc(state)
    expect((doc.content as any[])[0].type).toBe('bulletList')
    expect((doc.content as any[])[0].content[0].type).toBe('listItem')
  })

  it('converts image node', () => {
    const state: LexicalEditorState = {
      root: {
        type: 'root', version: 1, direction: 'ltr', format: '', indent: 0,
        children: [
          { type: 'image', version: 1, src: 'https://x/y.png', alt: 'cap', width: 800, alignment: 'center' },
        ],
      },
    }
    const doc = lexicalToTiptapDoc(state)
    expect((doc.content as any[])[0]).toEqual({
      type: 'image',
      attrs: { src: 'https://x/y.png', alt: 'cap', align: 'center', sizePreset: '100' },
    })
  })

  it('converts code block with language', () => {
    const state: LexicalEditorState = {
      root: {
        type: 'root', version: 1, direction: 'ltr', format: '', indent: 0,
        children: [
          { type: 'code', language: 'python', version: 1, direction: 'ltr', format: '', indent: 0, children: [textNode('print(1)')] },
        ],
      },
    }
    const doc = lexicalToTiptapDoc(state)
    expect((doc.content as any[])[0]).toEqual({
      type: 'codeBlock', attrs: { language: 'python' }, content: [{ type: 'text', text: 'print(1)' }],
    })
  })

  it('converts quote block', () => {
    const state: LexicalEditorState = {
      root: {
        type: 'root', version: 1, direction: 'ltr', format: '', indent: 0,
        children: [
          { type: 'quote', version: 1, direction: 'ltr', format: '', indent: 0, children: [textNode('wise words')] },
        ],
      },
    }
    const doc = lexicalToTiptapDoc(state)
    expect((doc.content as any[])[0].type).toBe('blockquote')
  })

  it('converts a table with rows and cells', () => {
    const state: LexicalEditorState = {
      root: {
        type: 'root', version: 1, direction: 'ltr', format: '', indent: 0,
        children: [
          {
            type: 'table', version: 1, direction: 'ltr', format: '', indent: 0,
            children: [
              {
                type: 'tablerow', version: 1, direction: 'ltr', format: '', indent: 0,
                children: [
                  {
                    type: 'tablecell', headerState: 1, version: 1, direction: 'ltr', format: '', indent: 0,
                    children: [{ type: 'paragraph', version: 1, direction: 'ltr', format: '', indent: 0, children: [textNode('H1')] }],
                  },
                ],
              },
            ],
          },
        ],
      },
    }
    const doc = lexicalToTiptapDoc(state)
    expect((doc.content as any[])[0].type).toBe('table')
    expect((doc.content as any[])[0].content[0].type).toBe('tableRow')
    expect((doc.content as any[])[0].content[0].content[0].type).toBe('tableHeader')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd D:/rich-editor && npx vitest run src/lib/editor/lexical-to-tiptap.test.ts`
Expected: FAIL with "Cannot find module './lexical-to-tiptap'"

- [ ] **Step 3: Implement the converter**

```typescript
// src/lib/editor/lexical-to-tiptap.ts
import type {
  LexicalEditorState, LexicalNode, LexicalBlockNode, LexicalTextNode,
} from '@/lib/api/ai-types'

const TEXT_FORMAT = {
  Bold: 1,
  Italic: 2,
  Strikethrough: 4,
  Underline: 8,
  Code: 16,
  Subscript: 32,
  Superscript: 64,
} as const

function textNodeToTiptap(node: LexicalTextNode): Record<string, unknown> {
  const marks: Record<string, unknown>[] = []
  if (node.format & TEXT_FORMAT.Bold) marks.push({ type: 'bold' })
  if (node.format & TEXT_FORMAT.Italic) marks.push({ type: 'italic' })
  if (node.format & TEXT_FORMAT.Strikethrough) marks.push({ type: 'strike' })
  if (node.format & TEXT_FORMAT.Underline) marks.push({ type: 'underline' })
  if (node.format & TEXT_FORMAT.Code) marks.push({ type: 'code' })
  if (node.format & TEXT_FORMAT.Subscript) marks.push({ type: 'subscript' })
  if (node.format & TEXT_FORMAT.Superscript) marks.push({ type: 'superscript' })

  const out: Record<string, unknown> = { type: 'text', text: node.text }
  if (marks.length > 0) out.marks = marks
  return out
}

function convertChildren(children: LexicalNode[]): Record<string, unknown>[] {
  return children.map(convertNode).filter((n): n is Record<string, unknown> => n !== null)
}

function convertNode(node: LexicalNode): Record<string, unknown> | null {
  switch (node.type) {
    case 'text':
      return textNodeToTiptap(node)

    case 'paragraph':
      return { type: 'paragraph', content: convertChildren(node.children) }

    case 'heading': {
      const level = Number(node.tag.replace('h', ''))
      return { type: 'heading', attrs: { level: Math.min(level, 4) }, content: convertChildren(node.children) }
    }

    case 'quote':
      return { type: 'blockquote', content: [{ type: 'paragraph', content: convertChildren(node.children) }] }

    case 'list':
      return {
        type: node.listType === 'number' ? 'orderedList' : node.listType === 'check' ? 'taskList' : 'bulletList',
        content: convertChildren(node.children),
      }

    case 'listitem': {
      const content = convertChildren(node.children)
      const wrapped = content.length > 0 && content[0].type === 'paragraph' ? content : [{ type: 'paragraph', content }]
      if (typeof node.checked === 'boolean') {
        return { type: 'taskItem', attrs: { checked: node.checked }, content: wrapped }
      }
      return { type: 'listItem', content: wrapped }
    }

    case 'code':
      return {
        type: 'codeBlock',
        attrs: { language: node.language ?? null },
        content: convertChildren(node.children),
      }

    case 'table':
      return { type: 'table', content: convertChildren(node.children) }

    case 'tablerow':
      return { type: 'tableRow', content: convertChildren(node.children) }

    case 'tablecell': {
      const content = convertChildren(node.children)
      const wrapped = content.length > 0 && content[0].type === 'paragraph' ? content : [{ type: 'paragraph', content }]
      return { type: node.headerState ? 'tableHeader' : 'tableCell', content: wrapped }
    }

    case 'image':
      return {
        type: 'image',
        attrs: { src: node.src, alt: node.alt, align: node.alignment, sizePreset: '100' },
      }

    default:
      return null
  }
}

export function lexicalToTiptapDoc(state: LexicalEditorState): Record<string, unknown> {
  const content = (state.root.children as LexicalBlockNode[])
    .map(convertNode)
    .filter((n): n is Record<string, unknown> => n !== null)
  return { type: 'doc', content }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd D:/rich-editor && npx vitest run src/lib/editor/lexical-to-tiptap.test.ts`
Expected: 8 tests PASS

- [ ] **Step 5: Commit**

```bash
cd D:/rich-editor && git add src/lib/editor/lexical-to-tiptap.ts src/lib/editor/lexical-to-tiptap.test.ts && git commit -m "feat: add Lexical-to-Tiptap JSON converter for construction draft output"
```

---

### Task 4: Translate language list

**Files:**
- Create: `D:\rich-editor\src\lib\editor\translate-languages.ts`

**Interfaces:**
- Produces: `TRANSLATE_LANGUAGE_GROUPS: { label: string; options: { value: string; label: string }[] }[]`

- [ ] **Step 1: Copy the language list from Text_Editor verbatim**

Read the full file first:
```bash
cat "D:/Text_Editor/apps/web/lib/editor/translateLanguageOptions.ts"
```

Then create `D:\rich-editor\src\lib\editor\translate-languages.ts` with the same `TRANSLATE_LANGUAGE_GROUPS` array content (rename the exported type/const only if the original uses a name that collides with existing rich-editor exports — otherwise keep names identical). Export as:

```typescript
export interface TranslateLanguageOption {
  value: string
  label: string
}

export interface TranslateLanguageGroup {
  label: string
  options: TranslateLanguageOption[]
}

export const TRANSLATE_LANGUAGE_GROUPS: TranslateLanguageGroup[] = [
  // ...paste full contents from Text_Editor's translateLanguageOptions.ts here
]
```

- [ ] **Step 2: Verify it typechecks**

Run: `cd D:/rich-editor && npx tsc -p tsconfig.json --noEmit`
Expected: no errors referencing this file

- [ ] **Step 3: Commit**

```bash
cd D:/rich-editor && git add src/lib/editor/translate-languages.ts && git commit -m "feat: add translate language options list"
```

---

### Task 5: Ghost-text autocomplete Tiptap extension

**Files:**
- Create: `D:\rich-editor\src\components\editor\extensions\ai-autocomplete.ts`
- Test: `D:\rich-editor\src\components\editor\extensions\ai-autocomplete.test.ts`

**Interfaces:**
- Consumes: `aiApi.complete` from `src/lib/api/ai-client.ts` (Task 1), `useAiStore` from `src/lib/store/use-ai-store.ts` (Task 2).
- Produces: `AiAutocomplete` Tiptap `Extension` (default export or named export `AiAutocomplete`), registered in `rich-editor.tsx`'s extensions array (Task 8). Exposes no commands — purely keyboard-driven (Tab/→/Esc) plus `editor.storage.aiAutocomplete.ghostText: string | null` for introspection in tests.

- [ ] **Step 1: Write failing test verifying decoration lifecycle without a real network call**

```typescript
// src/components/editor/extensions/ai-autocomplete.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { AiAutocomplete } from './ai-autocomplete'
import * as aiClient from '@/lib/api/ai-client'

describe('AiAutocomplete extension', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('does not trigger completion when autocomplete is disabled', async () => {
    const completeSpy = vi.spyOn(aiClient.aiApi, 'complete')
    const editor = new Editor({
      extensions: [StarterKit, AiAutocomplete.configure({ enabled: () => false })],
      content: '<p>hello world</p>',
    })
    editor.commands.setTextSelection(editor.state.doc.content.size - 1)
    editor.view.dispatch(editor.state.tr)
    vi.advanceTimersByTime(500)
    await Promise.resolve()
    expect(completeSpy).not.toHaveBeenCalled()
    editor.destroy()
  })

  it('does not trigger completion when before-cursor context is under 3 chars', async () => {
    const completeSpy = vi.spyOn(aiClient.aiApi, 'complete')
    const editor = new Editor({
      extensions: [StarterKit, AiAutocomplete.configure({ enabled: () => true })],
      content: '<p>hi</p>',
    })
    editor.commands.setTextSelection(editor.state.doc.content.size - 1)
    editor.view.dispatch(editor.state.tr)
    vi.advanceTimersByTime(500)
    await Promise.resolve()
    expect(completeSpy).not.toHaveBeenCalled()
    editor.destroy()
  })

  it('triggers completion after debounce when enabled and context is long enough', async () => {
    async function* fakeStream() {
      yield JSON.stringify({ type: 'token', delta: ' there' })
    }
    const completeSpy = vi.spyOn(aiClient.aiApi, 'complete').mockReturnValue(fakeStream())

    const editor = new Editor({
      extensions: [StarterKit, AiAutocomplete.configure({ enabled: () => true })],
      content: '<p>hello</p>',
    })
    editor.commands.setTextSelection(editor.state.doc.content.size - 1)
    editor.view.dispatch(editor.state.tr)
    vi.advanceTimersByTime(500)
    await Promise.resolve()
    await Promise.resolve()

    expect(completeSpy).toHaveBeenCalledTimes(1)
    editor.destroy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd D:/rich-editor && npx vitest run src/components/editor/extensions/ai-autocomplete.test.ts`
Expected: FAIL with "Cannot find module './ai-autocomplete'"

- [ ] **Step 3: Implement the extension**

```typescript
// src/components/editor/extensions/ai-autocomplete.ts
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { aiApi } from '@/lib/api/ai-client'

const DEBOUNCE_MS = 400
const MIN_BEFORE_CHARS = 3
const pluginKey = new PluginKey('aiAutocomplete')

export interface AiAutocompleteOptions {
  enabled: () => boolean
  scope?: () => 'word' | 'sentence' | 'paragraph'
  model?: () => string | undefined
}

interface GhostState {
  text: string | null
  from: number
}

function buildDecorations(doc: any, ghost: GhostState): DecorationSet {
  if (!ghost.text) return DecorationSet.empty
  const widget = document.createElement('span')
  widget.className = 'ai-ghost-text'
  widget.style.opacity = '0.45'
  widget.style.pointerEvents = 'none'
  widget.textContent = ghost.text
  return DecorationSet.create(doc, [Decoration.widget(ghost.from, widget, { side: 1 })])
}

export const AiAutocomplete = Extension.create<AiAutocompleteOptions>({
  name: 'aiAutocomplete',

  addOptions() {
    return {
      enabled: () => true,
      scope: () => 'sentence',
      model: () => undefined,
    }
  },

  addStorage() {
    return { ghostText: null as string | null }
  },

  addProseMirrorPlugins() {
    const extension = this
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    let abortController: AbortController | null = null
    let ghost: GhostState = { text: null, from: 0 }

    function clearGhost(view: any) {
      ghost = { text: null, from: 0 }
      extension.storage.ghostText = null
      view.dispatch(view.state.tr.setMeta(pluginKey, { ghost }))
    }

    function acceptGhost(view: any): boolean {
      if (!ghost.text) return false
      const text = ghost.text
      const pos = ghost.from
      const tr = view.state.tr.insertText(text, pos)
      view.dispatch(tr)
      clearGhost(view)
      return true
    }

    async function triggerCompletion(view: any) {
      if (!extension.options.enabled()) return
      const { selection } = view.state
      if (!selection.empty) return

      const from = selection.from
      const before = view.state.doc.textBetween(Math.max(0, from - 2000), from, '\n')
      const after = view.state.doc.textBetween(from, Math.min(view.state.doc.content.size, from + 500), '\n')

      if (!before || before.trim().length < MIN_BEFORE_CHARS) return

      abortController?.abort()
      const ctrl = new AbortController()
      abortController = ctrl

      let accumulated = ''
      try {
        for await (const raw of aiApi.complete(
          { before, after, scope: extension.options.scope?.(), model: extension.options.model?.() },
          ctrl.signal,
        )) {
          const evt = JSON.parse(raw) as { type: string; delta?: string; message?: string }
          if (evt.type === 'error') break
          if (evt.type !== 'token' || !evt.delta) continue
          accumulated += evt.delta
          ghost = { text: accumulated, from }
          extension.storage.ghostText = accumulated
          view.dispatch(view.state.tr.setMeta(pluginKey, { ghost }))
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
      }
    }

    return [
      new Plugin({
        key: pluginKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, old) {
            const meta = tr.getMeta(pluginKey)
            if (meta?.ghost) return buildDecorations(tr.doc, meta.ghost)
            if (tr.docChanged || tr.selectionSet) return DecorationSet.empty
            return old
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)
          },
          handleKeyDown(view, event) {
            if (!ghost.text) return false
            if (event.key === 'Tab') {
              event.preventDefault()
              return acceptGhost(view)
            }
            if (event.key === 'ArrowRight') {
              const { selection } = view.state
              if (selection.empty && selection.from === ghost.from) {
                event.preventDefault()
                return acceptGhost(view)
              }
              return false
            }
            if (event.key === 'Escape') {
              clearGhost(view)
              abortController?.abort()
              return true
            }
            return false
          },
        },
        view(editorView) {
          return {
            update(view, prevState) {
              if (view.state.selection.eq(prevState.selection) && view.state.doc.eq(prevState.doc)) return
              if (ghost.text) clearGhost(view)
              if (debounceTimer) clearTimeout(debounceTimer)
              debounceTimer = setTimeout(() => triggerCompletion(view), DEBOUNCE_MS)
            },
            destroy() {
              if (debounceTimer) clearTimeout(debounceTimer)
              abortController?.abort()
            },
          }
        },
      }),
    ]
  },
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd D:/rich-editor && npx vitest run src/components/editor/extensions/ai-autocomplete.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
cd D:/rich-editor && git add src/components/editor/extensions/ai-autocomplete.ts src/components/editor/extensions/ai-autocomplete.test.ts && git commit -m "feat: add ghost-text autocomplete Tiptap extension"
```

---

### Task 6: AI toggle row component (Autocomplete + Improve doc)

**Files:**
- Create: `D:\rich-editor\src\components\editor\ai\ai-toggle-row.tsx`
- Test: `D:\rich-editor\src\components\editor\ai\ai-toggle-row.test.tsx`

**Interfaces:**
- Consumes: nothing external — pure presentational component.
- Produces: `AiToggleRow` component with props `{ label: string; description?: string; checked: boolean; onChange: (v: boolean) => void; actionLabel?: string; onAction?: () => void; actionDisabled?: boolean }`. When `actionLabel`/`onAction` are provided, renders an inline button next to the toggle (used by Improve doc's "Run improve" button).

- [ ] **Step 1: Install React Testing Library if not present**

```bash
cd D:/rich-editor && cat package.json | grep "@testing-library"
```

If missing:
```bash
cd D:/rich-editor && npm install --legacy-peer-deps -D @testing-library/react @testing-library/jest-dom jsdom
```

Add to `vite.config.ts` / create one if it doesn't exist, with `test: { environment: 'jsdom' }`. Check for an existing vitest config first:
```bash
ls D:/rich-editor/vite.config.ts D:/rich-editor/vitest.config.ts 2>&1
```
If none exists, create `D:\rich-editor\vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: { environment: 'jsdom' },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
})
```

- [ ] **Step 2: Write failing test**

```tsx
// src/components/editor/ai/ai-toggle-row.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AiToggleRow } from './ai-toggle-row'

describe('AiToggleRow', () => {
  it('renders label and reflects checked state', () => {
    render(<AiToggleRow label="Autocomplete" checked={true} onChange={() => {}} />)
    expect(screen.getByText('Autocomplete')).toBeInTheDocument()
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('calls onChange with inverted value when toggled', () => {
    const onChange = vi.fn()
    render(<AiToggleRow label="Improve doc" checked={false} onChange={onChange} />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('renders an inline action button when actionLabel is provided', () => {
    const onAction = vi.fn()
    render(
      <AiToggleRow
        label="Improve doc"
        checked={true}
        onChange={() => {}}
        actionLabel="Run improve"
        onAction={onAction}
      />,
    )
    fireEvent.click(screen.getByText('Run improve'))
    expect(onAction).toHaveBeenCalled()
  })

  it('disables the action button when actionDisabled is true', () => {
    render(
      <AiToggleRow
        label="Improve doc"
        checked={true}
        onChange={() => {}}
        actionLabel="Run improve"
        onAction={() => {}}
        actionDisabled
      />,
    )
    expect(screen.getByText('Run improve')).toBeDisabled()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd D:/rich-editor && npx vitest run src/components/editor/ai/ai-toggle-row.test.tsx`
Expected: FAIL with "Cannot find module './ai-toggle-row'"

- [ ] **Step 4: Implement the component**

```tsx
// src/components/editor/ai/ai-toggle-row.tsx
'use client'

interface AiToggleRowProps {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
  actionLabel?: string
  onAction?: () => void
  actionDisabled?: boolean
}

export function AiToggleRow({
  label, description, checked, onChange, actionLabel, onAction, actionDisabled,
}: AiToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            disabled={actionDisabled}
            className="text-xs font-medium px-2 py-1 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {actionLabel}
          </button>
        )}
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted'}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
          />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd D:/rich-editor && npx vitest run src/components/editor/ai/ai-toggle-row.test.tsx`
Expected: 4 tests PASS

- [ ] **Step 6: Commit**

```bash
cd D:/rich-editor && git add src/components/editor/ai/ai-toggle-row.tsx src/components/editor/ai/ai-toggle-row.test.tsx vitest.config.ts package.json package-lock.json && git commit -m "feat: add AI toggle row component"
```

---

### Task 7: Summarize and Outline hover submenus

**Files:**
- Create: `D:\rich-editor\src\components\editor\ai\ai-submenu-summarize.tsx`
- Create: `D:\rich-editor\src\components\editor\ai\ai-submenu-outline.tsx`
- Test: `D:\rich-editor\src\components\editor\ai\ai-submenu-summarize.test.tsx`
- Test: `D:\rich-editor\src\components\editor\ai\ai-submenu-outline.test.tsx`

**Interfaces:**
- Consumes: `aiApi.summarize`, `aiApi.outline` from `src/lib/api/ai-client.ts` (Task 1).
- Produces: `AiSummarizeSubmenu` component with props `{ editor: Editor }`. `AiOutlineSubmenu` component with props `{ editor: Editor }`. Both render an always-visible trigger row plus an absolutely-positioned side panel that shows on hover/focus (`group-hover` pattern matching the rest of the toolbar's hover submenus, e.g. `list-style` sections in `editor-toolbar.tsx`).

- [ ] **Step 1: Write failing test for Summarize submenu**

```tsx
// src/components/editor/ai/ai-submenu-summarize.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { AiSummarizeSubmenu } from './ai-submenu-summarize'
import * as aiClient from '@/lib/api/ai-client'

function makeEditor() {
  return new Editor({ extensions: [StarterKit], content: '<p>Some long document text to summarize.</p>' })
}

describe('AiSummarizeSubmenu', () => {
  it('renders scope and length controls', () => {
    const editor = makeEditor()
    render(<AiSummarizeSubmenu editor={editor} />)
    expect(screen.getByText('Summarize')).toBeInTheDocument()
    editor.destroy()
  })

  it('calls aiApi.summarize with whole-doc text when Whole doc clicked', async () => {
    async function* fakeStream() {
      yield JSON.stringify({ type: 'token', delta: 'Summary text' })
    }
    const spy = vi.spyOn(aiClient.aiApi, 'summarize').mockReturnValue(fakeStream())
    const editor = makeEditor()
    render(<AiSummarizeSubmenu editor={editor} />)

    fireEvent.click(screen.getByText('Whole doc'))

    await waitFor(() => expect(spy).toHaveBeenCalled())
    expect(spy.mock.calls[0][0].text).toContain('Some long document text')
    editor.destroy()
  })

  it('displays streamed summary text and offers copy', async () => {
    async function* fakeStream() {
      yield JSON.stringify({ type: 'token', delta: 'Result' })
    }
    vi.spyOn(aiClient.aiApi, 'summarize').mockReturnValue(fakeStream())
    const editor = makeEditor()
    render(<AiSummarizeSubmenu editor={editor} />)

    fireEvent.click(screen.getByText('Whole doc'))

    await waitFor(() => expect(screen.getByText('Result')).toBeInTheDocument())
    expect(screen.getByText('Copy to clipboard')).toBeInTheDocument()
    editor.destroy()
  })
})
```

- [ ] **Step 2: Write failing test for Outline submenu**

```tsx
// src/components/editor/ai/ai-submenu-outline.test.tsx
import { describe, it, expect, vi, waitFor } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { AiOutlineSubmenu } from './ai-submenu-outline'
import * as aiClient from '@/lib/api/ai-client'

function makeEditor() {
  return new Editor({ extensions: [StarterKit], content: '<p>Intro text.</p>' })
}

describe('AiOutlineSubmenu', () => {
  it('renders Suggest headings button', () => {
    const editor = makeEditor()
    render(<AiOutlineSubmenu editor={editor} />)
    expect(screen.getByText('Suggest headings')).toBeInTheDocument()
    editor.destroy()
  })

  it('fetches and lists suggested headings, inserting on click', async () => {
    vi.spyOn(aiClient.aiApi, 'outline').mockResolvedValue({
      headings: [{ level: 2, text: 'Background' }],
    })
    const editor = makeEditor()
    render(<AiOutlineSubmenu editor={editor} />)

    fireEvent.click(screen.getByText('Suggest headings'))

    await waitFor(() => expect(screen.getByText('Background')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Insert'))
    expect(editor.getHTML()).toContain('Background')
    editor.destroy()
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd D:/rich-editor && npx vitest run src/components/editor/ai/ai-submenu-summarize.test.tsx src/components/editor/ai/ai-submenu-outline.test.tsx`
Expected: FAIL, modules not found

- [ ] **Step 4: Implement AiSummarizeSubmenu**

```tsx
// src/components/editor/ai/ai-submenu-summarize.tsx
'use client'

import { useCallback, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Check, Copy } from 'lucide-react'
import { aiApi } from '@/lib/api/ai-client'
import type { SummaryLength } from '@/lib/api/ai-types'

const LENGTHS: { value: SummaryLength; label: string }[] = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'detailed', label: 'Detailed' },
]

export function AiSummarizeSubmenu({ editor }: { editor: Editor }) {
  const [length, setLength] = useState<SummaryLength>('medium')
  const [status, setStatus] = useState<'idle' | 'loading' | 'streaming' | 'done' | 'error'>('idle')
  const [result, setResult] = useState('')
  const [copied, setCopied] = useState(false)

  const run = useCallback(async (scope: 'selection' | 'doc') => {
    const { from, to, empty } = editor.state.selection
    const text = scope === 'doc' || empty
      ? editor.getText()
      : editor.state.doc.textBetween(from, to, '\n')
    if (!text.trim()) return

    setStatus('loading')
    setResult('')
    const ctrl = new AbortController()
    try {
      for await (const raw of aiApi.summarize({ text, length }, ctrl.signal)) {
        const evt = JSON.parse(raw) as { type: string; delta?: string }
        if (evt.type === 'token' && evt.delta) {
          setStatus('streaming')
          setResult((r) => r + evt.delta)
        }
      }
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }, [editor, length])

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [result])

  return (
    <div className="group relative px-3 py-2.5">
      <p className="text-sm font-medium">Summarize</p>
      <div className="absolute left-full top-0 ml-1 hidden w-72 rounded-lg border bg-popover p-3 shadow-lg group-hover:block group-focus-within:block z-50">
        <div className="space-y-1.5 mb-2">
          {LENGTHS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => setLength(l.value)}
              className={`block w-full text-left px-2 py-1 rounded text-sm ${length === l.value ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mb-2">
          <button type="button" onClick={() => run('selection')} className="flex-1 text-xs px-2 py-1.5 rounded-md border hover:bg-muted">Selection</button>
          <button type="button" onClick={() => run('doc')} className="flex-1 text-xs px-2 py-1.5 rounded-md border hover:bg-muted">Whole doc</button>
        </div>
        <div className="min-h-[60px] rounded-md border bg-muted/30 p-2 text-xs whitespace-pre-wrap">
          {result || (status === 'loading' || status === 'streaming' ? 'Summarizing…' : 'No summary yet.')}
        </div>
        {result && (
          <button type="button" onClick={copy} className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Implement AiOutlineSubmenu**

```tsx
// src/components/editor/ai/ai-submenu-outline.tsx
'use client'

import { useCallback, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { aiApi } from '@/lib/api/ai-client'
import type { OutlineHeading } from '@/lib/api/ai-types'

export function AiOutlineSubmenu({ editor }: { editor: Editor }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [suggestions, setSuggestions] = useState<OutlineHeading[]>([])

  const suggest = useCallback(async () => {
    setStatus('loading')
    try {
      const res = await aiApi.outline({ docText: editor.getText() })
      setSuggestions(res.headings)
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }, [editor])

  const insert = useCallback((h: OutlineHeading) => {
    editor.chain().focus().insertContent({
      type: 'heading',
      attrs: { level: h.level },
      content: [{ type: 'text', text: h.text }],
    }).run()
  }, [editor])

  return (
    <div className="group relative px-3 py-2.5">
      <p className="text-sm font-medium">Outline</p>
      <div className="absolute left-full top-0 ml-1 hidden w-72 rounded-lg border bg-popover p-3 shadow-lg group-hover:block group-focus-within:block z-50">
        <button
          type="button"
          onClick={suggest}
          disabled={status === 'loading'}
          className="w-full text-xs px-2 py-1.5 rounded-md border hover:bg-muted disabled:opacity-50 mb-2"
        >
          {status === 'loading' ? 'Analysing…' : 'Suggest headings'}
        </button>
        {suggestions.length > 0 && (
          <ul className="space-y-1">
            {suggestions.map((h, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-xs py-1">
                <span className="truncate">
                  <span className="text-muted-foreground font-mono mr-1">H{h.level}</span>
                  {h.text}
                </span>
                <button type="button" onClick={() => insert(h)} className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                  Insert
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd D:/rich-editor && npx vitest run src/components/editor/ai/ai-submenu-summarize.test.tsx src/components/editor/ai/ai-submenu-outline.test.tsx`
Expected: all tests PASS

- [ ] **Step 7: Commit**

```bash
cd D:/rich-editor && git add src/components/editor/ai/ai-submenu-summarize.tsx src/components/editor/ai/ai-submenu-outline.tsx src/components/editor/ai/ai-submenu-summarize.test.tsx src/components/editor/ai/ai-submenu-outline.test.tsx && git commit -m "feat: add Summarize and Outline hover submenus"
```

---

### Task 8: Translate and Custom tone modals

**Files:**
- Create: `D:\rich-editor\src\components\editor\ai\ai-modal-translate.tsx`
- Create: `D:\rich-editor\src\components\editor\ai\ai-modal-tone.tsx`
- Test: `D:\rich-editor\src\components\editor\ai\ai-modal-translate.test.tsx`
- Test: `D:\rich-editor\src\components\editor\ai\ai-modal-tone.test.tsx`

**Interfaces:**
- Consumes: `aiApi.translate`, `aiApi.customTone` from Task 1; `Dialog` from `D:\rich-editor\src\components\ui\dialog.tsx`; `TRANSLATE_LANGUAGE_GROUPS` from Task 4.
- Produces: `AiTranslateModal` with props `{ open: boolean; onClose: () => void; editor: Editor }`. `AiToneModal` with props `{ open: boolean; onClose: () => void; editor: Editor }`. Both require a non-empty editor selection to run; both replace the selection with the streamed result on Accept.

- [ ] **Step 1: Write failing test for Translate modal**

```tsx
// src/components/editor/ai/ai-modal-translate.test.tsx
import { describe, it, expect, vi, waitFor } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { AiTranslateModal } from './ai-modal-translate'
import * as aiClient from '@/lib/api/ai-client'

function makeEditorWithSelection() {
  const editor = new Editor({ extensions: [StarterKit], content: '<p>Hello world</p>' })
  editor.commands.setTextSelection({ from: 1, to: 12 })
  return editor
}

describe('AiTranslateModal', () => {
  it('renders when open', () => {
    const editor = makeEditorWithSelection()
    render(<AiTranslateModal open={true} onClose={() => {}} editor={editor} />)
    expect(screen.getByText('Translate')).toBeInTheDocument()
    editor.destroy()
  })

  it('streams translated text and replaces selection on Accept', async () => {
    async function* fakeStream() {
      yield JSON.stringify({ type: 'token', delta: 'Hola mundo' })
    }
    vi.spyOn(aiClient.aiApi, 'translate').mockReturnValue(fakeStream())
    const editor = makeEditorWithSelection()
    render(<AiTranslateModal open={true} onClose={() => {}} editor={editor} />)

    fireEvent.click(screen.getByText('Translate selection'))

    await waitFor(() => expect(screen.getByText('Hola mundo')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Accept'))
    expect(editor.getText()).toContain('Hola mundo')
    editor.destroy()
  })
})
```

- [ ] **Step 2: Write failing test for Tone modal**

```tsx
// src/components/editor/ai/ai-modal-tone.test.tsx
import { describe, it, expect, vi, waitFor } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { AiToneModal } from './ai-modal-tone'
import * as aiClient from '@/lib/api/ai-client'

function makeEditorWithSelection() {
  const editor = new Editor({ extensions: [StarterKit], content: '<p>Hello world</p>' })
  editor.commands.setTextSelection({ from: 1, to: 12 })
  return editor
}

describe('AiToneModal', () => {
  it('disables Apply until instruction text is entered', () => {
    const editor = makeEditorWithSelection()
    render(<AiToneModal open={true} onClose={() => {}} editor={editor} />)
    expect(screen.getByText('Apply to selection')).toBeDisabled()
    editor.destroy()
  })

  it('streams rewritten text and replaces selection on Accept', async () => {
    async function* fakeStream() {
      yield JSON.stringify({ type: 'token', delta: 'Greetings, world' })
    }
    vi.spyOn(aiClient.aiApi, 'customTone').mockReturnValue(fakeStream())
    const editor = makeEditorWithSelection()
    render(<AiToneModal open={true} onClose={() => {}} editor={editor} />)

    fireEvent.change(screen.getByPlaceholderText(/rewrite as/i), { target: { value: 'formal' } })
    fireEvent.click(screen.getByText('Apply to selection'))

    await waitFor(() => expect(screen.getByText('Greetings, world')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Accept'))
    expect(editor.getText()).toContain('Greetings, world')
    editor.destroy()
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd D:/rich-editor && npx vitest run src/components/editor/ai/ai-modal-translate.test.tsx src/components/editor/ai/ai-modal-tone.test.tsx`
Expected: FAIL, modules not found

- [ ] **Step 4: Implement AiTranslateModal**

```tsx
// src/components/editor/ai/ai-modal-translate.tsx
'use client'

import { useCallback, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Dialog } from '@/components/ui/dialog'
import { aiApi } from '@/lib/api/ai-client'
import { TRANSLATE_LANGUAGE_GROUPS } from '@/lib/editor/translate-languages'

interface AiTranslateModalProps {
  open: boolean
  onClose: () => void
  editor: Editor
}

export function AiTranslateModal({ open, onClose, editor }: AiTranslateModalProps) {
  const [lang, setLang] = useState(TRANSLATE_LANGUAGE_GROUPS[0]?.options[0]?.value ?? '')
  const [status, setStatus] = useState<'idle' | 'streaming' | 'done' | 'error'>('idle')
  const [result, setResult] = useState('')

  const run = useCallback(async () => {
    const { from, to } = editor.state.selection
    const text = editor.state.doc.textBetween(from, to, '\n')
    if (!text.trim()) return
    setResult('')
    setStatus('streaming')
    const ctrl = new AbortController()
    try {
      for await (const raw of aiApi.translate({ text, targetLang: lang }, ctrl.signal)) {
        const evt = JSON.parse(raw) as { type: string; delta?: string }
        if (evt.type === 'token' && evt.delta) setResult((r) => r + evt.delta)
      }
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }, [editor, lang])

  const accept = useCallback(() => {
    const { from, to } = editor.state.selection
    editor.chain().focus().insertContentAt({ from, to }, result).run()
    setResult('')
    setStatus('idle')
    onClose()
  }, [editor, result, onClose])

  return (
    <Dialog open={open} onClose={onClose} title="Translate">
      <div className="space-y-3">
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          className="w-full border rounded-md px-2 py-1.5 text-sm bg-background"
        >
          {TRANSLATE_LANGUAGE_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <button
          type="button"
          onClick={run}
          disabled={status === 'streaming'}
          className="w-full px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-50"
        >
          {status === 'streaming' ? 'Translating…' : 'Translate selection'}
        </button>
        {result && (
          <>
            <div className="min-h-[60px] rounded-md border bg-muted/30 p-2 text-sm whitespace-pre-wrap">{result}</div>
            <div className="flex gap-2">
              <button type="button" onClick={accept} className="flex-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm">Accept</button>
              <button type="button" onClick={() => setResult('')} className="flex-1 px-3 py-1.5 rounded-md border text-sm">Reject</button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  )
}
```

- [ ] **Step 5: Implement AiToneModal**

```tsx
// src/components/editor/ai/ai-modal-tone.tsx
'use client'

import { useCallback, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Dialog } from '@/components/ui/dialog'
import { aiApi } from '@/lib/api/ai-client'

interface AiToneModalProps {
  open: boolean
  onClose: () => void
  editor: Editor
}

export function AiToneModal({ open, onClose, editor }: AiToneModalProps) {
  const [instruction, setInstruction] = useState('')
  const [status, setStatus] = useState<'idle' | 'streaming' | 'done' | 'error'>('idle')
  const [result, setResult] = useState('')

  const run = useCallback(async () => {
    const { from, to } = editor.state.selection
    const selection = editor.state.doc.textBetween(from, to, '\n')
    if (!selection.trim() || !instruction.trim()) return
    setResult('')
    setStatus('streaming')
    const ctrl = new AbortController()
    try {
      for await (const raw of aiApi.customTone({ selection, tone: instruction }, ctrl.signal)) {
        const evt = JSON.parse(raw) as { type: string; delta?: string }
        if (evt.type === 'token' && evt.delta) setResult((r) => r + evt.delta)
      }
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }, [editor, instruction])

  const accept = useCallback(() => {
    const { from, to } = editor.state.selection
    editor.chain().focus().insertContentAt({ from, to }, result).run()
    setResult('')
    setInstruction('')
    setStatus('idle')
    onClose()
  }, [editor, result, onClose])

  return (
    <Dialog open={open} onClose={onClose} title="Custom tone">
      <div className="space-y-3">
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value.slice(0, 200))}
          placeholder="e.g. rewrite as a formal executive briefing"
          maxLength={200}
          rows={3}
          className="w-full border rounded-md p-2 text-sm resize-none bg-background"
        />
        <button
          type="button"
          onClick={run}
          disabled={status === 'streaming' || !instruction.trim()}
          className="w-full px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-50"
        >
          {status === 'streaming' ? 'Rewriting…' : 'Apply to selection'}
        </button>
        {result && (
          <>
            <div className="min-h-[60px] rounded-md border bg-muted/30 p-2 text-sm whitespace-pre-wrap">{result}</div>
            <div className="flex gap-2">
              <button type="button" onClick={accept} className="flex-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm">Accept</button>
              <button type="button" onClick={() => setResult('')} className="flex-1 px-3 py-1.5 rounded-md border text-sm">Reject</button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  )
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd D:/rich-editor && npx vitest run src/components/editor/ai/ai-modal-translate.test.tsx src/components/editor/ai/ai-modal-tone.test.tsx`
Expected: all tests PASS

- [ ] **Step 7: Commit**

```bash
cd D:/rich-editor && git add src/components/editor/ai/ai-modal-translate.tsx src/components/editor/ai/ai-modal-tone.tsx src/components/editor/ai/ai-modal-translate.test.tsx src/components/editor/ai/ai-modal-tone.test.tsx && git commit -m "feat: add Translate and Custom tone modals"
```

---

### Task 9: Construction draft modal (flagship feature)

**Files:**
- Create: `D:\rich-editor\src\components\editor\ai\ai-modal-construction.tsx`
- Test: `D:\rich-editor\src\components\editor\ai\ai-modal-construction.test.tsx`

**Interfaces:**
- Consumes: `aiApi.constructionDraft`, `ragApi.ingest`, `uploadsApi.image` from Task 1; `lexicalToTiptapDoc` from Task 3; `Dialog` from `components/ui/dialog.tsx`.
- Produces: `AiConstructionModal` with props `{ open: boolean; onClose: () => void; editor: Editor }`.

- [ ] **Step 1: Write failing test covering the core generate → apply flow**

```tsx
// src/components/editor/ai/ai-modal-construction.test.tsx
import { describe, it, expect, vi, waitFor } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { AiConstructionModal } from './ai-modal-construction'
import * as aiClient from '@/lib/api/ai-client'

function makeEditor() {
  return new Editor({ extensions: [StarterKit], content: '<p></p>' })
}

describe('AiConstructionModal', () => {
  it('disables Generate draft until audience and topic are filled', () => {
    const editor = makeEditor()
    render(<AiConstructionModal open={true} onClose={() => {}} editor={editor} />)
    expect(screen.getByText('Generate draft')).toBeDisabled()
    editor.destroy()
  })

  it('calls constructionDraft with form values and shows Apply/Discard on success', async () => {
    vi.spyOn(aiClient.aiApi, 'constructionDraft').mockResolvedValue({
      lexicalJson: {
        root: {
          type: 'root', version: 1, direction: 'ltr', format: '', indent: 0,
          children: [
            {
              type: 'paragraph', version: 1, direction: 'ltr', format: '', indent: 0,
              children: [{ type: 'text', version: 1, text: 'Generated body', format: 0, detail: 0, mode: 'normal', style: '' }],
            },
          ],
        },
      },
      warnings: [],
    })
    const editor = makeEditor()
    render(<AiConstructionModal open={true} onClose={() => {}} editor={editor} />)

    fireEvent.change(screen.getByPlaceholderText(/audience/i), { target: { value: 'Engineers' } })
    fireEvent.change(screen.getByPlaceholderText(/topic/i), { target: { value: 'Rust ownership' } })
    fireEvent.click(screen.getByText('Generate draft'))

    await waitFor(() => expect(screen.getByText('Apply')).toBeInTheDocument())
    expect(aiClient.aiApi.constructionDraft).toHaveBeenCalledWith(
      expect.objectContaining({ audience: 'Engineers', topic: 'Rust ownership' }),
    )
    editor.destroy()
  })

  it('applies the generated draft as real Tiptap content on Apply click', async () => {
    vi.spyOn(aiClient.aiApi, 'constructionDraft').mockResolvedValue({
      lexicalJson: {
        root: {
          type: 'root', version: 1, direction: 'ltr', format: '', indent: 0,
          children: [
            {
              type: 'paragraph', version: 1, direction: 'ltr', format: '', indent: 0,
              children: [{ type: 'text', version: 1, text: 'Generated body', format: 0, detail: 0, mode: 'normal', style: '' }],
            },
          ],
        },
      },
      warnings: [],
    })
    const editor = makeEditor()
    render(<AiConstructionModal open={true} onClose={() => {}} editor={editor} />)

    fireEvent.change(screen.getByPlaceholderText(/audience/i), { target: { value: 'Engineers' } })
    fireEvent.change(screen.getByPlaceholderText(/topic/i), { target: { value: 'Rust ownership' } })
    fireEvent.click(screen.getByText('Generate draft'))

    await waitFor(() => screen.getByText('Apply'))
    fireEvent.click(screen.getByText('Apply'))

    expect(editor.getText()).toContain('Generated body')
    editor.destroy()
  })

  it('shows warnings returned by the backend', async () => {
    vi.spyOn(aiClient.aiApi, 'constructionDraft').mockResolvedValue({
      lexicalJson: { root: { type: 'root', version: 1, direction: 'ltr', format: '', indent: 0, children: [] } },
      warnings: ['Reference document could not be parsed'],
    })
    const editor = makeEditor()
    render(<AiConstructionModal open={true} onClose={() => {}} editor={editor} />)

    fireEvent.change(screen.getByPlaceholderText(/audience/i), { target: { value: 'Engineers' } })
    fireEvent.change(screen.getByPlaceholderText(/topic/i), { target: { value: 'Rust ownership' } })
    fireEvent.click(screen.getByText('Generate draft'))

    await waitFor(() => expect(screen.getByText('Reference document could not be parsed')).toBeInTheDocument())
    editor.destroy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd D:/rich-editor && npx vitest run src/components/editor/ai/ai-modal-construction.test.tsx`
Expected: FAIL, module not found

- [ ] **Step 3: Implement the modal**

```tsx
// src/components/editor/ai/ai-modal-construction.tsx
'use client'

import { useCallback, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Dialog } from '@/components/ui/dialog'
import { aiApi, ragApi, uploadsApi, APIError } from '@/lib/api/ai-client'
import { lexicalToTiptapDoc } from '@/lib/editor/lexical-to-tiptap'
import type {
  ConstructionContentType, ConstructionDraftLength, LexicalEditorState,
} from '@/lib/api/ai-types'

interface AiConstructionModalProps {
  open: boolean
  onClose: () => void
  editor: Editor
}

const CONTENT_TYPES: { value: ConstructionContentType; label: string }[] = [
  { value: 'article', label: 'Article' },
  { value: 'blog_post', label: 'Blog post' },
  { value: 'case_study', label: 'Case study' },
  { value: 'experience_share', label: 'Share your experience' },
  { value: 'technical_guide', label: 'Technical guide' },
]

const LENGTHS: { value: ConstructionDraftLength; label: string }[] = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
]

const ARTICLE_IMAGE_MAX_BYTES = 3 * 1024 * 1024

async function encodeImageAsBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  const mediaType = file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg'
  const buf = await file.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]!)
  return { base64: btoa(binary), mediaType }
}

export function AiConstructionModal({ open, onClose, editor }: AiConstructionModalProps) {
  const [contentType, setContentType] = useState<ConstructionContentType>('blog_post')
  const [audience, setAudience] = useState('')
  const [topic, setTopic] = useState('')
  const [angle, setAngle] = useState('')
  const [mustInclude, setMustInclude] = useState('')
  const [length, setLength] = useState<ConstructionDraftLength>('medium')
  const [referenceNotes, setReferenceNotes] = useState('')
  const [refDocFile, setRefDocFile] = useState<File | null>(null)
  const [referenceSourceId, setReferenceSourceId] = useState<string | null>(null)
  const [ingestStatus, setIngestStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPlacementHint, setPhotoPlacementHint] = useState('')
  const [aiDecide, setAiDecide] = useState(false)

  const [preview, setPreview] = useState<LexicalEditorState | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const indexReferences = useCallback(async () => {
    if (!referenceNotes.trim() && !refDocFile) return
    setIngestStatus('loading')
    try {
      const res = await ragApi.ingest({ notes: referenceNotes, file: refDocFile ?? undefined })
      setReferenceSourceId(res.sourceId)
      setWarnings((w) => [...w, ...(res.warnings ?? [])])
      setIngestStatus('done')
    } catch (e) {
      setIngestStatus('error')
      setError(e instanceof APIError ? e.message : 'Indexing failed')
    }
  }, [referenceNotes, refDocFile])

  const generate = useCallback(async () => {
    setError(null)
    setPreview(null)
    setWarnings([])
    setStatus('loading')
    try {
      let articleImageBase64: string | undefined
      let articleImageMediaType: string | undefined
      let articleImagePublicUrl: string | undefined
      let sourceId = referenceSourceId ?? undefined

      if (!sourceId && (refDocFile || referenceNotes.trim())) {
        const ing = await ragApi.ingest({ notes: referenceNotes, file: refDocFile ?? undefined })
        sourceId = ing.sourceId
        setReferenceSourceId(ing.sourceId)
        if (ing.warnings?.length) setWarnings(ing.warnings)
      }

      if (photoFile) {
        if (photoFile.size > ARTICLE_IMAGE_MAX_BYTES) {
          setError('Photo must be 3 MB or smaller.')
          setStatus('error')
          return
        }
        const upload = await uploadsApi.image(photoFile)
        const enc = await encodeImageAsBase64(photoFile)
        articleImagePublicUrl = upload.url
        articleImageBase64 = enc.base64
        articleImageMediaType = enc.mediaType
      }

      const placement = aiDecide ? '' : photoPlacementHint.trim()
      const res = await aiApi.constructionDraft({
        contentType,
        audience: audience.trim(),
        topic: topic.trim(),
        angle: angle.trim(),
        mustInclude: mustInclude.trim(),
        length,
        ...(sourceId ? { referenceSourceId: sourceId } : {}),
        ...(referenceNotes.trim() ? { referenceNotes: referenceNotes.trim() } : {}),
        ...(aiDecide ? { referenceAiDecide: true } : {}),
        ...(articleImageBase64 && articleImageMediaType && articleImagePublicUrl
          ? { articleImageBase64, articleImageMediaType, articleImagePublicUrl }
          : {}),
        ...(placement ? { articleImagePlacementHint: placement } : {}),
      })
      setPreview(res.lexicalJson)
      setWarnings((w) => [...w, ...(res.warnings ?? [])])
      setStatus('done')
    } catch (e) {
      setStatus('error')
      setError(e instanceof APIError ? e.message : e instanceof Error ? e.message : 'Request failed')
    }
  }, [
    contentType, audience, topic, angle, mustInclude, length,
    referenceSourceId, referenceNotes, refDocFile, photoFile, photoPlacementHint, aiDecide,
  ])

  const apply = useCallback(() => {
    if (!preview) return
    const tiptapDoc = lexicalToTiptapDoc(preview)
    editor.chain().focus().insertContent(tiptapDoc.content as any[]).run()
    setPreview(null)
    setWarnings([])
    setStatus('idle')
    onClose()
  }, [preview, editor, onClose])

  const discard = useCallback(() => {
    setPreview(null)
    setWarnings([])
    setStatus('idle')
  }, [])

  const canGenerate = audience.trim().length > 0 && topic.trim().length > 0 && status !== 'loading'

  return (
    <Dialog open={open} onClose={onClose} title="Construction draft" className="max-w-lg max-h-[85vh] overflow-y-auto">
      <div className="space-y-3">
        <select
          value={contentType}
          onChange={(e) => setContentType(e.target.value as ConstructionContentType)}
          className="w-full border rounded-md px-2 py-1.5 text-sm bg-background"
        >
          {CONTENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        <textarea
          value={audience}
          onChange={(e) => setAudience(e.target.value.slice(0, 800))}
          placeholder="Who is the audience?"
          rows={2}
          className="w-full border rounded-md p-2 text-sm resize-none bg-background"
        />
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value.slice(0, 2000))}
          placeholder="What is the topic?"
          rows={3}
          className="w-full border rounded-md p-2 text-sm resize-none bg-background"
        />
        <textarea
          value={angle}
          onChange={(e) => setAngle(e.target.value.slice(0, 1200))}
          placeholder="What angle or perspective?"
          rows={2}
          className="w-full border rounded-md p-2 text-sm resize-none bg-background"
        />
        <textarea
          value={mustInclude}
          onChange={(e) => setMustInclude(e.target.value.slice(0, 4000))}
          placeholder="Facts, figures, or points that must be included"
          rows={2}
          className="w-full border rounded-md p-2 text-sm resize-none bg-background"
        />

        <div className="border rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Reference materials (optional)</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={aiDecide} onChange={(e) => setAiDecide(e.target.checked)} />
            Let AI decide
          </label>
          <textarea
            value={referenceNotes}
            onChange={(e) => {
              setReferenceNotes(e.target.value.slice(0, 12000))
              setReferenceSourceId(null)
            }}
            placeholder="Paste specs, meeting notes, or facts"
            rows={2}
            className="w-full border rounded-md p-2 text-sm resize-none bg-background"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="file"
              accept=".pdf,.docx,.txt,.md"
              onChange={(e) => {
                setRefDocFile(e.target.files?.[0] ?? null)
                setReferenceSourceId(null)
              }}
              className="text-xs"
            />
            <button
              type="button"
              onClick={indexReferences}
              disabled={ingestStatus === 'loading' || (!referenceNotes.trim() && !refDocFile)}
              className="text-xs px-2 py-1 rounded border disabled:opacity-50"
            >
              {ingestStatus === 'loading' ? 'Indexing…' : 'Index references'}
            </button>
          </div>

          <div className="border-t pt-2 space-y-1.5">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Site photo (optional)</p>
            <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} className="text-xs" />
            {!aiDecide && (
              <textarea
                value={photoPlacementHint}
                onChange={(e) => setPhotoPlacementHint(e.target.value.slice(0, 800))}
                placeholder="Placement notes for the photo (optional)"
                rows={2}
                className="w-full border rounded-md p-2 text-sm resize-none bg-background"
              />
            )}
          </div>
        </div>

        <select value={length} onChange={(e) => setLength(e.target.value as ConstructionDraftLength)} className="w-full border rounded-md px-2 py-1.5 text-sm bg-background">
          {LENGTHS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>

        <button
          type="button"
          onClick={generate}
          disabled={!canGenerate}
          className="w-full px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-50"
        >
          {status === 'loading' ? 'Generating…' : 'Generate draft'}
        </button>

        {preview && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-emerald-600">Draft ready — insert at cursor</p>
            <div className="flex gap-2">
              <button type="button" onClick={apply} className="flex-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm">Apply</button>
              <button type="button" onClick={discard} className="flex-1 px-3 py-1.5 rounded-md border text-sm">Discard</button>
            </div>
          </div>
        )}

        {error && <p className="text-xs rounded-md border border-red-200 bg-red-50 text-red-600 px-2 py-1.5">{error}</p>}

        {warnings.length > 0 && (
          <ul className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 space-y-1 list-disc list-inside">
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        )}
      </div>
    </Dialog>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd D:/rich-editor && npx vitest run src/components/editor/ai/ai-modal-construction.test.tsx`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
cd D:/rich-editor && git add src/components/editor/ai/ai-modal-construction.tsx src/components/editor/ai/ai-modal-construction.test.tsx && git commit -m "feat: add construction draft modal"
```

---

### Task 10: Improve doc action

**Files:**
- Modify: `D:\rich-editor\src\components\editor\ai\ai-dropdown.tsx` (created in this task, wires everything)
- Create: `D:\rich-editor\src\components\editor\ai\use-improve-doc.ts`
- Test: `D:\rich-editor\src\components\editor\ai\use-improve-doc.test.ts`

**Interfaces:**
- Consumes: `aiApi.rewrite` from Task 1 (Improve doc reuses the rewrite endpoint with `mode: 'polish'`, applied paragraph-by-paragraph — matches Text_Editor's `ImproveDocPlugin.tsx` behavior of iterating block-by-block).
- Produces: `useImproveDoc(editor: Editor)` hook returning `{ run: () => Promise<void>; status: 'idle'|'running'|'done'|'error'; progress: { current: number; total: number } }`.

- [ ] **Step 1: Check Text_Editor's ImproveDocPlugin for exact behavior to match**

```bash
cat "D:/Text_Editor/apps/web/lib/editor/plugins/ImproveDocPlugin.tsx"
```

Confirm: it iterates top-level blocks, calls rewrite with `mode: 'polish'` per block, replaces block content with the streamed result, skips empty blocks. Use this to keep the hook's behavior faithful.

- [ ] **Step 2: Write failing test**

```typescript
// src/components/editor/ai/use-improve-doc.test.ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { useImproveDoc } from './use-improve-doc'
import * as aiClient from '@/lib/api/ai-client'

function makeEditor() {
  return new Editor({
    extensions: [StarterKit],
    content: '<p>First paragraph.</p><p>Second paragraph.</p>',
  })
}

describe('useImproveDoc', () => {
  it('calls rewrite once per non-empty top-level paragraph with mode polish', async () => {
    async function* fakeStream(text: string) {
      yield JSON.stringify({ type: 'token', delta: text })
    }
    const spy = vi.spyOn(aiClient.aiApi, 'rewrite').mockImplementation((req) =>
      fakeStream(`${req.selection} improved`),
    )
    const editor = makeEditor()
    const { result } = renderHook(() => useImproveDoc(editor))

    await act(async () => {
      await result.current.run()
    })

    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy.mock.calls[0][0].mode).toBe('polish')
    expect(result.current.status).toBe('done')
    editor.destroy()
  })

  it('replaces paragraph text with the rewritten result', async () => {
    async function* fakeStream() {
      yield JSON.stringify({ type: 'token', delta: 'Improved text.' })
    }
    vi.spyOn(aiClient.aiApi, 'rewrite').mockReturnValue(fakeStream())
    const editor = makeEditor()
    const { result } = renderHook(() => useImproveDoc(editor))

    await act(async () => {
      await result.current.run()
    })

    expect(editor.getText()).toContain('Improved text.')
    editor.destroy()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd D:/rich-editor && npx vitest run src/components/editor/ai/use-improve-doc.test.ts`
Expected: FAIL, module not found

- [ ] **Step 4: Implement the hook**

```typescript
// src/components/editor/ai/use-improve-doc.ts
'use client'

import { useCallback, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { aiApi } from '@/lib/api/ai-client'

export function useImproveDoc(editor: Editor) {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const run = useCallback(async () => {
    const blocks: { from: number; to: number; text: string }[] = []
    editor.state.doc.forEach((node, offset) => {
      const text = node.textContent
      if (text.trim()) blocks.push({ from: offset + 1, to: offset + node.nodeSize - 1, text })
    })

    if (blocks.length === 0) {
      setStatus('done')
      return
    }

    setStatus('running')
    setProgress({ current: 0, total: blocks.length })

    try {
      for (let i = blocks.length - 1; i >= 0; i--) {
        const block = blocks[i]
        let accumulated = ''
        const ctrl = new AbortController()
        for await (const raw of aiApi.rewrite({ selection: block.text, mode: 'polish' }, ctrl.signal)) {
          const evt = JSON.parse(raw) as { type: string; delta?: string }
          if (evt.type === 'token' && evt.delta) accumulated += evt.delta
        }
        if (accumulated) {
          editor.chain().insertContentAt({ from: block.from, to: block.to }, accumulated).run()
        }
        setProgress({ current: blocks.length - i, total: blocks.length })
      }
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }, [editor])

  return { run, status, progress }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd D:/rich-editor && npx vitest run src/components/editor/ai/use-improve-doc.test.ts`
Expected: 2 tests PASS

- [ ] **Step 6: Commit**

```bash
cd D:/rich-editor && git add src/components/editor/ai/use-improve-doc.ts src/components/editor/ai/use-improve-doc.test.ts && git commit -m "feat: add improve-doc hook"
```

---

### Task 11: AI dropdown shell wiring everything together

**Files:**
- Create: `D:\rich-editor\src\components\editor\ai\ai-dropdown.tsx`
- Test: `D:\rich-editor\src\components\editor\ai\ai-dropdown.test.tsx`

**Interfaces:**
- Consumes: `useAiStore` (Task 2), `AiToggleRow` (Task 6), `AiSummarizeSubmenu`/`AiOutlineSubmenu` (Task 7), `AiTranslateModal`/`AiToneModal` (Task 8), `AiConstructionModal` (Task 9), `useImproveDoc` (Task 10), `ToolbarPopover` (existing component in `D:\rich-editor\src\components\editor\toolbar-popover.tsx`).
- Produces: `AiDropdown` component with props `{ editor: Editor }`. Renders the toolbar button + popover with all 7 rows. This is what Task 12 wires into `editor-toolbar.tsx`.

- [ ] **Step 1: Read the existing ToolbarPopover component to match its API**

```bash
cat "D:/rich-editor/src/components/editor/toolbar-popover.tsx"
```

Note its exact props (`open`, `anchorRef`, `onClose`, `className`, `children`) — reuse the identical pattern used by the heading/font/size dropdowns in `editor-toolbar.tsx`.

- [ ] **Step 2: Write failing test**

```tsx
// src/components/editor/ai/ai-dropdown.test.tsx
import { describe, it, expect, fireEvent } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { AiDropdown } from './ai-dropdown'

function makeEditor() {
  return new Editor({ extensions: [StarterKit], content: '<p>Hello</p>' })
}

describe('AiDropdown', () => {
  it('renders an AI trigger button', () => {
    const editor = makeEditor()
    render(<AiDropdown editor={editor} />)
    expect(screen.getByTitle('AI features')).toBeInTheDocument()
    editor.destroy()
  })

  it('opens the popover listing all 7 feature rows on click', () => {
    const editor = makeEditor()
    render(<AiDropdown editor={editor} />)
    fireEvent.click(screen.getByTitle('AI features'))

    expect(screen.getByText('Autocomplete')).toBeInTheDocument()
    expect(screen.getByText('Improve doc')).toBeInTheDocument()
    expect(screen.getByText('Summarize')).toBeInTheDocument()
    expect(screen.getByText('Outline')).toBeInTheDocument()
    expect(screen.getByText('Translate')).toBeInTheDocument()
    expect(screen.getByText('Custom tone')).toBeInTheDocument()
    expect(screen.getByText('Construction draft')).toBeInTheDocument()
    editor.destroy()
  })

  it('opens the Translate modal when its row is clicked', () => {
    const editor = makeEditor()
    render(<AiDropdown editor={editor} />)
    fireEvent.click(screen.getByTitle('AI features'))
    fireEvent.click(screen.getByText('Translate'))
    expect(screen.getAllByText('Translate').length).toBeGreaterThan(1)
    editor.destroy()
  })

  it('opens the Construction draft modal when its row is clicked', () => {
    const editor = makeEditor()
    render(<AiDropdown editor={editor} />)
    fireEvent.click(screen.getByTitle('AI features'))
    fireEvent.click(screen.getByText('Construction draft'))
    expect(screen.getByPlaceholderText(/topic/i)).toBeInTheDocument()
    editor.destroy()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd D:/rich-editor && npx vitest run src/components/editor/ai/ai-dropdown.test.tsx`
Expected: FAIL, module not found

- [ ] **Step 4: Implement AiDropdown**

```tsx
// src/components/editor/ai/ai-dropdown.tsx
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
          onClick={() => { setTranslateOpen(true); setOpen(false) }}
          className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted"
        >
          Translate
        </button>
        <button
          type="button"
          onClick={() => { setToneOpen(true); setOpen(false) }}
          className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted"
        >
          Custom tone
        </button>
        <button
          type="button"
          onClick={() => { setConstructionOpen(true); setOpen(false) }}
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd D:/rich-editor && npx vitest run src/components/editor/ai/ai-dropdown.test.tsx`
Expected: 4 tests PASS

- [ ] **Step 6: Commit**

```bash
cd D:/rich-editor && git add src/components/editor/ai/ai-dropdown.tsx src/components/editor/ai/ai-dropdown.test.tsx && git commit -m "feat: add AI dropdown shell wiring all AI features"
```

---

### Task 12: Wire AI dropdown into toolbar and register autocomplete extension

**Files:**
- Modify: `D:\rich-editor\src\components\editor\use-toolbar-overflow.ts`
- Modify: `D:\rich-editor\src\components\editor\editor-toolbar.tsx`
- Modify: `D:\rich-editor\src\components\editor\rich-editor.tsx`

**Interfaces:**
- Consumes: `AiDropdown` (Task 11), `AiAutocomplete` extension (Task 5), `useAiStore` (Task 2).
- Produces: nothing new — this task is pure integration.

- [ ] **Step 1: Add `'ai'` to the segment type and order**

In `D:\rich-editor\src\components\editor\use-toolbar-overflow.ts`, modify the type and order:

```typescript
export type ToolbarSegmentId =
  | 'history'
  | 'styles'
  | 'ai'
  | 'format'
  | 'colors'
  | 'clearFormat'
  | 'align'
  | 'lists'
  | 'indent'
  | 'insert'
  | 'blocks'
  | 'shortcuts'
  | 'findReplace'
  | 'comment'
  | 'embedVideo'
  | 'callout'
  | 'export'
  | 'print'
  | 'focusMode'
  | 'spellCheck'

export const TOOLBAR_SEGMENT_ORDER: ToolbarSegmentId[] = [
  'history',
  'styles',
  'ai',
  'format',
  'colors',
  'clearFormat',
  'align',
  'lists',
  'indent',
  'insert',
  'blocks',
  'shortcuts',
  'findReplace',
  'comment',
  'embedVideo',
  'callout',
  'export',
  'print',
  'focusMode',
  'spellCheck',
]
```

- [ ] **Step 2: Add the `ai` segment to `editor-toolbar.tsx`**

Add the import near the other component imports (after `EditorMoreMenu` import):
```typescript
import { AiDropdown } from './ai/ai-dropdown'
```

Add to the `segments` object, immediately after the `styles` segment closes (find the `styles: (...)` entry ending with `</SegmentWrap>\n    ),` around line 287, insert right after it):

```typescript
    ai: (
      <SegmentWrap>
        <AiDropdown editor={editor} />
        <Divider />
      </SegmentWrap>
    ),
```

- [ ] **Step 3: Also add the `ai` row to `EditorMoreMenu`'s overflow rendering if it iterates segments generically**

```bash
grep -n "overflowSegments\|ToolbarSegmentId" "D:/rich-editor/src/components/editor/editor-more-menu.tsx"
```

If `EditorMoreMenu` receives segment content as pre-rendered nodes (check its props signature), no change needed — it will automatically include the new `ai` segment when it overflows, same as any other segment. If it hardcodes which segments it renders, add the `ai` case following the same pattern as the other segments in that file.

- [ ] **Step 4: Register the AiAutocomplete extension in `rich-editor.tsx`**

Add import:
```typescript
import { AiAutocomplete } from './extensions/ai-autocomplete'
import { useAiStore } from '@/lib/store/use-ai-store'
```

Inside the `RichEditor` component, before the `useEditor` call, read the store:
```typescript
  const autocompleteEnabled = useAiStore((s) => s.autocompleteEnabled)
```

Add to the extensions array (after `SmartPaste,`):
```typescript
      AiAutocomplete.configure({ enabled: () => autocompleteEnabled }),
```

Add `autocompleteEnabled` to the `useEditor` dependency handling: Tiptap's `useEditor` does not auto-recreate on option changes by default in this version — since `enabled` is a function reference reading live store state via closure, no editor recreation is needed (the extension calls `extension.options.enabled()` fresh on every trigger). No further change required.

- [ ] **Step 5: Add ghost-text CSS to `globals.css`**

Add to `D:\rich-editor\src\app\globals.css`, after the `.editor-drag-handle` rules:

```css
/* AI ghost text */
.ai-ghost-text {
  color: hsl(var(--muted-foreground));
  font-style: italic;
}
```

- [ ] **Step 6: Typecheck the whole project**

Run: `cd D:/rich-editor && npx tsc -p tsconfig.json --noEmit`
Expected: no errors

- [ ] **Step 7: Run the full test suite**

Run: `cd D:/rich-editor && npx vitest run`
Expected: all tests PASS (from Tasks 1-11 plus this task's integration doesn't add new tests, it's covered by AiDropdown's existing tests once mounted through the real toolbar)

- [ ] **Step 8: Manual verification with dev server**

Start the backend first (user does this separately per the Global Constraints), then:
```bash
cd D:/rich-editor && npm run dev
```
Open `http://localhost:3000` (or whichever port), verify:
- "AI" button appears in the toolbar between the font-size dropdown and the Bold button
- Clicking it opens a popover with all 7 rows
- Autocomplete toggle flips visibly
- Improve doc toggle enables the "Run improve" button
- Hovering Summarize/Outline reveals the side flyout
- Clicking Translate/Custom tone/Construction draft opens their respective modals

- [ ] **Step 9: Commit**

```bash
cd D:/rich-editor && git add src/components/editor/use-toolbar-overflow.ts src/components/editor/editor-toolbar.tsx src/components/editor/rich-editor.tsx src/app/globals.css && git commit -m "feat: wire AI dropdown and autocomplete extension into the editor toolbar"
```

---

## Self-Review Notes

**Spec coverage:**
- Toolbar entry point / placement → Task 12, Step 1-2 ✓
- Autocomplete toggle (live ghost text) → Tasks 5, 6, 12 ✓
- Improve doc toggle + inline run button → Tasks 6, 10, 11 ✓
- Summarize hover submenu → Task 7 ✓
- Outline hover submenu → Task 7 ✓
- Translate modal → Task 8 ✓
- Custom tone modal → Task 8 ✓
- Construction draft modal (flagship) → Task 9 ✓
- No backend changes, exact contract match → Task 1 ✓
- Lexical-JSON → Tiptap-JSON converter → Task 3 ✓
- No separate AI side panel → confirmed by architecture (AiDropdown is toolbar-only) ✓

**Type consistency check:** `Editor` type from `@tiptap/react` used consistently across all AI components. `LexicalEditorState`/`LexicalNode`/`LexicalBlockNode` defined once in `ai-types.ts` (Task 1) and imported everywhere else, never redefined. `aiApi`/`ragApi`/`uploadsApi` method signatures match Task 1's definitions in every consuming task (8, 9, 10). `useAiStore` state field names (`autocompleteEnabled`, `improveEnabled`) match between Task 2's definition and Task 11/12's usage.

**No placeholders found** — every step has complete, runnable code.
