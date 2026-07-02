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
