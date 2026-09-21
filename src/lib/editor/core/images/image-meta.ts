import type { Editor } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'
import type { Node as PMNode } from '@tiptap/pm/model'

export function getSelectedImagePos(editor: Editor): number | null {
  const { selection } = editor.state
  if (selection instanceof NodeSelection && selection.node.type.name === 'image') {
    return selection.from
  }
  return null
}

/** 1-based index of this image among all images in the document. */
export function getImageFigureNumber(editor: Editor, imagePos: number): number {
  let index = 0
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'image') return
    index += 1
    if (pos === imagePos) return false
  })
  return index || 1
}

function isCaptionParagraph(node: PMNode): boolean {
  if (node.type.name !== 'paragraph') return false
  const t = node.textContent
  return /^Figure\s+\d+:/i.test(t) || t === 'Writing caption…'
}

function isAltParagraph(node: PMNode): boolean {
  if (node.type.name !== 'paragraph') return false
  const t = node.textContent
  return t.startsWith('Alt: ') || t === 'Writing alt text…'
}

function paraWithText(text: string, loading: boolean) {
  return {
    type: 'paragraph' as const,
    content: loading
      ? [{ type: 'text' as const, text, marks: [{ type: 'aiLoading' as const }] }]
      : [{ type: 'text' as const, text, marks: [{ type: 'italic' as const }] }],
  }
}

/**
 * Insert or update the caption / alt paragraph directly under the image.
 * Caption uses "Figure N: …"; alt uses "Alt: …".
 */
export function upsertImageMetaParagraph(
  editor: Editor,
  imagePos: number,
  kind: 'caption' | 'alt',
  text: string,
  loading: boolean,
): void {
  const imageNode = editor.state.doc.nodeAt(imagePos)
  if (!imageNode || imageNode.type.name !== 'image') return

  const afterImage = imagePos + imageNode.nodeSize
  const next = editor.state.doc.nodeAt(afterImage)

  if (kind === 'caption') {
    const figureNo = getImageFigureNumber(editor, imagePos)
    const display = loading ? 'Writing caption…' : `Figure ${figureNo}: ${text}`
    const para = paraWithText(display, loading)

    if (next && isCaptionParagraph(next)) {
      editor.chain().focus().insertContentAt(
        { from: afterImage, to: afterImage + next.nodeSize },
        para,
      ).run()
    } else {
      editor.chain().focus().insertContentAt(afterImage, para).run()
    }

    if (!loading) {
      // Re-select image (positions may have shifted by 0 for replace-in-place)
      const pos = getSelectedImagePos(editor) ?? imagePos
      editor.chain().setNodeSelection(pos).updateAttributes('image', {
        caption: text,
        title: text,
        metaLoading: null,
      }).run()
    }
    return
  }

  // Alt paragraph sits after caption paragraph if present
  let altPos = afterImage
  const maybeCaption = editor.state.doc.nodeAt(afterImage)
  if (maybeCaption && isCaptionParagraph(maybeCaption)) {
    altPos = afterImage + maybeCaption.nodeSize
  }
  const altNext = editor.state.doc.nodeAt(altPos)
  const display = loading ? 'Writing alt text…' : `Alt: ${text}`
  const para = paraWithText(display, loading)

  if (altNext && isAltParagraph(altNext)) {
    editor.chain().focus().insertContentAt(
      { from: altPos, to: altPos + altNext.nodeSize },
      para,
    ).run()
  } else {
    editor.chain().focus().insertContentAt(altPos, para).run()
  }

  if (!loading) {
    const pos = getSelectedImagePos(editor) ?? imagePos
    editor.chain().setNodeSelection(pos).updateAttributes('image', {
      alt: text,
      metaLoading: null,
    }).run()
  }
}

/** Renumber all "Figure N:" caption paragraphs to match image order. */
export function renumberFigureCaptions(editor: Editor): void {
  const updates: { from: number; to: number; text: string }[] = []
  let figureNo = 0

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'image') {
      figureNo += 1
      const after = pos + node.nodeSize
      const next = editor.state.doc.nodeAt(after)
      if (next && isCaptionParagraph(next) && next.textContent !== 'Writing caption…') {
        const body = next.textContent.replace(/^Figure\s+\d+:\s*/i, '')
        const text = `Figure ${figureNo}: ${body}`
        if (text !== next.textContent) {
          updates.push({ from: after, to: after + next.nodeSize, text })
        }
      }
    }
  })

  if (!updates.length) return
  // Apply bottom-up
  updates.sort((a, b) => b.from - a.from)
  let chain = editor.chain().focus()
  for (const u of updates) {
    chain = chain.insertContentAt(
      { from: u.from, to: u.to },
      paraWithText(u.text, false),
    )
  }
  chain.run()
}
