import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { useImproveDoc } from './use-improve-doc'
import * as aiClient from '@/lib/api/ai-client'

afterEach(() => {
  vi.restoreAllMocks()
})

function makeEditor() {
  return new Editor({
    extensions: [StarterKit],
    content: '<p>First paragraph with enough length.</p><p>Second paragraph with enough length.</p>',
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

  it('skips empty top-level blocks and does not call rewrite for them', async () => {
    async function* fakeStream(text: string) {
      yield JSON.stringify({ type: 'token', delta: text })
    }
    const spy = vi.spyOn(aiClient.aiApi, 'rewrite').mockImplementation((req) =>
      fakeStream(`${req.selection} improved`),
    )
    const editor = new Editor({
      extensions: [StarterKit],
      content: '<p>Only paragraph with enough length.</p><p></p>',
    })
    const { result } = renderHook(() => useImproveDoc(editor))

    await act(async () => {
      await result.current.run()
    })

    expect(spy).toHaveBeenCalledTimes(1)
    editor.destroy()
  })

  it('reports progress across blocks and ends with total===current', async () => {
    async function* fakeStream(text: string) {
      yield JSON.stringify({ type: 'token', delta: text })
    }
    vi.spyOn(aiClient.aiApi, 'rewrite').mockImplementation((req) => fakeStream(`${req.selection} improved`))
    const editor = makeEditor()
    const { result } = renderHook(() => useImproveDoc(editor))

    await act(async () => {
      await result.current.run()
    })

    expect(result.current.progress).toEqual({ current: 2, total: 2 })
    editor.destroy()
  })

  it('skips blocks under the minimum length gate and leaves their text unchanged', async () => {
    async function* fakeStream(text: string) {
      yield JSON.stringify({ type: 'token', delta: text })
    }
    const spy = vi.spyOn(aiClient.aiApi, 'rewrite').mockImplementation((req) =>
      fakeStream(`${req.selection} improved`),
    )
    const editor = new Editor({
      extensions: [StarterKit],
      content: '<p>This is a sufficiently long paragraph to pass the gate.</p><p>Hi</p>',
    })
    const { result } = renderHook(() => useImproveDoc(editor))

    await act(async () => {
      await result.current.run()
    })

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0].selection).toContain('sufficiently long paragraph')
    expect(editor.getText()).toContain('Hi')
    editor.destroy()
  })
})
