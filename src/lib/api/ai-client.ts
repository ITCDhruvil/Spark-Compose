// src/lib/api/ai-client.ts
import type {
  RewriteRequest, CompleteRequest, SummarizeRequest, TranslateRequest,
  OutlineRequest, OutlineResponse, SuggestBlockRequest, SuggestBlockResponse, CustomToneRequest,
  FindIssuesRequest, FindIssuesResponse, TextToTableRequest, TextToTableResponse,
  KpiWidgetsRequest, KpiWidgetsResponse, ProgressAnalyticsRequest, ProgressAnalyticsResponse,
  ActionItemsRequest, ActionItemsResponse, BriefGapsRequest, BriefGapsResponse,
  ExplainAudience, AutoStructureResponse, AskPreset,
  GlossaryRequest, GlossaryResponse, ImageCaptionRequest, ImageCaptionResponse,
  ConstructionDraftRequest, ConstructionDraftResponse, RagIngestResponse,
  CompareSummaryRequest, CompareSummaryResponse,
  AskDraftRequest, AskDraftResponse,
} from './ai-types'

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '')

function apiUrl(path: string): string {
  return BASE ? `${BASE}${path}` : path
}

function resolvePublicUrl(relativePath: string): string {
  if (!relativePath.startsWith('/')) return relativePath
  if (!BASE) return relativePath
  if (BASE.startsWith('http')) return `${new URL(BASE).origin}${relativePath}`
  return `${BASE}${relativePath}`
}

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

const USER_ID_KEY = 'rich-editor-user-id'

function getClientUserId(): string {
  if (typeof window === 'undefined') return 'local-user'
  try {
    let id = localStorage.getItem(USER_ID_KEY)
    if (!id) {
      id = `user-${Math.random().toString(36).slice(2, 8)}`
      localStorage.setItem(USER_ID_KEY, id)
    }
    return id
  } catch {
    return 'local-user'
  }
}

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-user-id': getClientUserId(),
    ...extra,
  }
  if (_token) h['Authorization'] = `Bearer ${_token}`
  return h
}

function featureHeader(feature: string): Record<string, string> {
  return { 'x-ai-feature': feature }
}

function withTimeout(ms: number): { signal: AbortSignal; clear: () => void } {
  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), ms)
  return { signal: ctrl.signal, clear: () => clearTimeout(id) }
}

const DEFAULT_TIMEOUT_MS = 15_000

async function apiFetch<T>(path: string, init: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const url = apiUrl(path)
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

export async function* streamSSE(
  path: string,
  body: unknown,
  signal: AbortSignal,
  feature?: string,
): AsyncGenerator<string> {
  if (signal.aborted) return

  const url = apiUrl(path)
  const headers = buildHeaders({
    Accept: 'text/event-stream',
    ...(feature ? featureHeader(feature) : {}),
  })

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

function postJson<T>(path: string, body: unknown, feature: string, signal?: AbortSignal, timeoutMs?: number): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
    signal,
    headers: featureHeader(feature),
  }, timeoutMs)
}

export const aiApi = {
  spellWord(
    req: { word: string; context?: string },
    signal?: AbortSignal,
  ): Promise<{ corrected: string; changed: boolean }> {
    return postJson('/api/ai/spell-word', req, 'spelling', signal, 8_000)
  },
  grammarCheck(
    req: { text: string },
    signal?: AbortSignal,
  ): Promise<{
    issues: {
      start: number
      end: number
      type: 'spelling' | 'grammar' | 'punctuation'
      message: string
      suggestion: string
    }[]
  }> {
    return postJson('/api/ai/grammar-check', req, 'grammar', signal, 15_000)
  },
  rewrite(req: RewriteRequest, signal: AbortSignal): AsyncGenerator<string> {
    const feature =
      req.mode === 'grammar' ? 'grammar'
        : req.mode === 'spelling' ? 'spelling'
          : 'improve'
    return streamSSE('/api/ai/rewrite', req, signal, feature)
  },
  complete(req: CompleteRequest, signal: AbortSignal): AsyncGenerator<string> {
    return streamSSE('/api/ai/complete', req, signal, 'autocomplete')
  },
  summarize(req: SummarizeRequest, signal: AbortSignal): AsyncGenerator<string> {
    return streamSSE('/api/ai/summarize', req, signal, 'summarize')
  },
  translate(req: TranslateRequest, signal: AbortSignal): AsyncGenerator<string> {
    return streamSSE('/api/ai/translate', req, signal, 'translate')
  },
  customTone(req: CustomToneRequest, signal: AbortSignal): AsyncGenerator<string> {
    return streamSSE('/api/ai/custom-tone', req, signal, 'tone')
  },
  outline(req: OutlineRequest): Promise<OutlineResponse> {
    return postJson('/api/ai/outline', req, 'outline')
  },
  suggestBlock(req: SuggestBlockRequest): Promise<SuggestBlockResponse> {
    return postJson('/api/ai/suggest-heading', req, 'suggest')
  },
  findIssues(req: FindIssuesRequest): Promise<FindIssuesResponse> {
    return postJson('/api/ai/find-issues', req, 'find-issues')
  },
  autoStructure(req: { text: string }): Promise<AutoStructureResponse> {
    return postJson('/api/ai/auto-structure', req, 'suggest')
  },

  textToTable(req: TextToTableRequest): Promise<TextToTableResponse> {
    return postJson('/api/ai/text-to-table', req, 'to-table')
  },
  kpiWidgets(req: KpiWidgetsRequest): Promise<KpiWidgetsResponse> {
    return postJson('/api/ai/kpi-widgets', req, 'kpi-widgets')
  },
  progressAnalytics(req: ProgressAnalyticsRequest): Promise<ProgressAnalyticsResponse> {
    return postJson('/api/ai/progress-analytics', req, 'progress-analytics')
  },
  actionItems(req: ActionItemsRequest): Promise<ActionItemsResponse> {
    return postJson('/api/ai/action-items', req, 'action-items')
  },
  briefGaps(req: BriefGapsRequest): Promise<BriefGapsResponse> {
    return postJson('/api/ai/brief-gaps', req, 'against-brief')
  },
  explain(req: { selection: string; audience: ExplainAudience }, signal: AbortSignal): AsyncGenerator<string> {
    const toneByAudience: Record<ExplainAudience, string> = {
      explain: 'Explain clearly what this text means. Keep it concise. Output only the explanation.',
      crew: 'Rewrite for a site crew / field workers: plain language, short sentences, actionable. Output only the rewrite.',
      client: 'Rewrite for a client / owner: clear, professional, minimal jargon. Output only the rewrite.',
      engineer: 'Rewrite for an engineer / technical reviewer: precise and specific. Output only the rewrite.',
    }
    return streamSSE('/api/ai/custom-tone', {
      selection: req.selection,
      tone: toneByAudience[req.audience],
    }, signal, 'explain')
  },

  /** @deprecated use suggestBlock */
  suggestHeading(req: SuggestBlockRequest): Promise<SuggestBlockResponse> {
    return postJson('/api/ai/suggest-heading', req, 'suggest')
  },
  constructionDraft(req: ConstructionDraftRequest, signal?: AbortSignal): Promise<ConstructionDraftResponse> {
    return postJson('/api/ai/construction-draft', req, 'draft', signal, 120_000)
  },
  askDraft(req: AskDraftRequest): Promise<AskDraftResponse> {
    return postJson('/api/ai/ask-draft', req, 'draft', undefined, 120_000)
  },
  glossary(req: GlossaryRequest): Promise<GlossaryResponse> {
    return postJson('/api/ai/glossary', req, 'glossary')
  },
  imageCaption(req: ImageCaptionRequest): Promise<ImageCaptionResponse> {
    return postJson('/api/ai/image-caption', req, 'image-caption')
  },
  askStream(
    req: { message: string; history?: { role: 'user' | 'assistant'; content: string }[]; preset?: AskPreset },
    signal: AbortSignal,
  ): AsyncGenerator<string> {
    return streamSSE('/api/ai/ask', req, signal, 'ask')
  },
  async ask(
    req: { message: string; history?: { role: 'user' | 'assistant'; content: string }[]; preset?: AskPreset },
    signal?: AbortSignal,
  ): Promise<{ answer: string; refused?: boolean }> {
    const ctrl = new AbortController()
    const onAbort = () => ctrl.abort()
    if (signal) {
      if (signal.aborted) ctrl.abort()
      else signal.addEventListener('abort', onAbort, { once: true })
    }
    const timer = setTimeout(() => ctrl.abort(), 60_000)
    let answer = ''
    try {
      for await (const raw of streamSSE('/api/ai/ask', req, ctrl.signal, 'ask')) {
        const evt = JSON.parse(raw) as { type: string; delta?: string; message?: string }
        if (evt.type === 'error') throw new APIError(500, evt.message ?? 'Ask failed', '/api/ai/ask')
        if (evt.type === 'token' && evt.delta) answer += evt.delta
      }
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }
    return { answer, refused: false }
  },
  compareSummary(req: CompareSummaryRequest): Promise<CompareSummaryResponse> {
    return postJson('/api/ai/compare-summary', req, 'compare-summary')
  },
}

export const ragApi = {
  async ingest(opts: { notes?: string; file?: File }): Promise<RagIngestResponse> {
    const url = apiUrl('/api/rag/ingest')
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
    const url = apiUrl('/api/uploads/image')
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

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      let message = text || `Upload failed (${res.status})`
      try {
        const parsed = JSON.parse(text) as { error?: string }
        if (parsed.error) message = parsed.error
      } catch {
        // keep text
      }
      throw new APIError(res.status, message, '/uploads/image')
    }

    const data = (await res.json()) as { url: string; filename: string }
    if (!data.url) throw new APIError(500, 'Upload response missing url', '/uploads/image')
    data.url = resolvePublicUrl(data.url)
    return data
  },
}
