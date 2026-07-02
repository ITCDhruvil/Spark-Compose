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
