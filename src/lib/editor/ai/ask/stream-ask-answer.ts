import type { Editor } from '@tiptap/core'
import type { AskPreset } from '@/lib/api/ai-types'
import { aiApi } from '@/lib/api/ai-client'
import { markdownToLexical } from '@/lib/server/ai/markdown-to-lexical'
import { lexicalToTiptapDoc } from '@/lib/editor/ai/ask/lexical-to-tiptap'

function streamingContent(text: string) {
  const lines = text.split('\n')
  return lines.map((line) => ({
    type: 'paragraph' as const,
    content: line.length > 0 ? [{ type: 'text' as const, text: line }] : [],
  }))
}

function writeAnswer(
  editor: Editor,
  answerPos: number,
  content: Record<string, unknown>[],
  streaming: boolean,
) {
  const nodeNow = editor.state.doc.nodeAt(answerPos)
  if (!nodeNow || nodeNow.type.name !== 'askAnswer') return false
  editor
    .chain()
    .insertContentAt(
      { from: answerPos, to: answerPos + nodeNow.nodeSize },
      {
        type: 'askAnswer',
        attrs: { streaming },
        content: content.length
          ? content
          : [{ type: 'paragraph' }],
      },
    )
    .run()
  return true
}

function writeLoading(editor: Editor, answerPos: number, nodeSize: number) {
  editor
    .chain()
    .insertContentAt(
      { from: answerPos, to: answerPos + nodeSize },
      {
        type: 'askAnswer',
        attrs: { streaming: true },
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: 'Thinking it through…', marks: [{ type: 'aiLoading' }] }],
        }],
      },
    )
    .run()
}

function writeError(editor: Editor, answerPos: number) {
  const nodeNow = editor.state.doc.nodeAt(answerPos)
  if (!nodeNow || nodeNow.type.name !== 'askAnswer') return
  writeAnswer(
    editor,
    answerPos,
    [{ type: 'paragraph', content: [{ type: 'text', text: 'Could not get an answer. Try again.' }] }],
    false,
  )
}

function finalizeMarkdown(editor: Editor, answerPos: number, body: string) {
  const doc = lexicalToTiptapDoc(markdownToLexical(body))
  const blocks = (doc.content as Record<string, unknown>[]) ?? []
  writeAnswer(
    editor,
    answerPos,
    blocks.length
      ? blocks
      : [{ type: 'paragraph', content: [{ type: 'text', text: body }] }],
    false,
  )
}

/**
 * Streams an ask answer into an existing askAnswer node with a typing effect,
 * then renders final Markdown.
 */
export async function streamAskAnswer(
  editor: Editor,
  answerPos: number,
  message: string,
  signal: AbortSignal,
  opts?: { existingNodeSize?: number; preset?: AskPreset },
): Promise<void> {
  const existing = editor.state.doc.nodeAt(answerPos)
  const nodeSize = opts?.existingNodeSize
    ?? (existing?.type.name === 'askAnswer' ? existing.nodeSize : 0)

  if (nodeSize > 0) {
    writeLoading(editor, answerPos, nodeSize)
  }

  let accumulated = ''
  let started = false
  let raf = 0
  let pending = false

  const flush = () => {
    pending = false
    writeAnswer(editor, answerPos, streamingContent(accumulated), true)
  }

  const scheduleFlush = () => {
    if (pending) return
    pending = true
    raf = requestAnimationFrame(flush)
  }

  try {
    for await (const raw of aiApi.askStream({ message, preset: opts?.preset ?? 'default' }, signal)) {
      if (signal.aborted) break
      const evt = JSON.parse(raw) as { type: string; delta?: string; message?: string }
      if (evt.type === 'error') throw new Error(evt.message ?? 'Ask failed')
      if (evt.type !== 'token' || !evt.delta) continue

      accumulated += evt.delta
      if (!started) {
        started = true
        writeAnswer(editor, answerPos, streamingContent(accumulated), true)
      } else {
        scheduleFlush()
      }
    }

    cancelAnimationFrame(raf)
    if (pending) flush()

    if (signal.aborted) return

    const body = accumulated.trim() || 'No answer returned.'
    finalizeMarkdown(editor, answerPos, body)
  } catch (err) {
    cancelAnimationFrame(raf)
    if (signal.aborted) return
    writeError(editor, answerPos)
    throw err
  }
}

/** Insert a loading askAnswer after `insertAt`, then stream into it. */
export async function insertAndStreamAskAnswer(
  editor: Editor,
  insertAt: number,
  message: string,
  signal: AbortSignal,
  opts?: { replaceExisting?: boolean; preset?: AskPreset },
): Promise<void> {
  const existing = editor.state.doc.nodeAt(insertAt)
  const replaceExisting = opts?.replaceExisting && existing?.type.name === 'askAnswer'

  const loadingBlock = {
    type: 'askAnswer',
    attrs: { streaming: true },
    content: [{
      type: 'paragraph',
      content: [{ type: 'text', text: 'Answering...', marks: [{ type: 'aiLoading' }] }],
    }],
  }

  if (replaceExisting && existing) {
    editor
      .chain()
      .focus()
      .insertContentAt({ from: insertAt, to: insertAt + existing.nodeSize }, loadingBlock)
      .run()
  } else {
    editor.chain().focus().insertContentAt(insertAt, loadingBlock).run()
  }

  await streamAskAnswer(editor, insertAt, message, signal, { preset: opts?.preset })
}
