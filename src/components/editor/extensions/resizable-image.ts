import Image from '@tiptap/extension-image'
import { mergeAttributes, ResizableNodeView } from '@tiptap/core'

export type ImageAlign = 'left' | 'center' | 'right'

function applyImageLayout(el: HTMLImageElement, attrs: Record<string, unknown>) {
  const align = (attrs.align as ImageAlign) ?? 'center'
  el.setAttribute('data-align', align)
  el.className = `editor-image align-${align}`

  const width = attrs.width as number | null | undefined
  const height = attrs.height as number | null | undefined

  if (width) {
    el.style.width = `${width}px`
    el.style.height = height ? `${height}px` : 'auto'
    el.style.maxWidth = '100%'
    el.removeAttribute('data-size')
    return
  }

  const pct = String(attrs.sizePreset ?? '100')
  el.setAttribute('data-size', pct)
  el.style.width = `${pct}%`
  el.style.maxWidth = '100%'
  el.style.height = 'auto'
}

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: 'center' as ImageAlign,
        parseHTML: (element) => (element.getAttribute('data-align') as ImageAlign) || 'center',
        renderHTML: (attributes) => ({
          'data-align': attributes.align,
          class: `editor-image align-${attributes.align as string}`,
        }),
      },
      sizePreset: {
        default: '100',
        parseHTML: (element) => {
          const dataSize = element.getAttribute('data-size')
          if (dataSize) return dataSize
          const match = element.style.width.match(/^(\d+(?:\.\d+)?)%$/)
          return match?.[1] ?? '100'
        },
        renderHTML: (attributes) => {
          if (attributes.width) return {}
          const pct = attributes.sizePreset ?? '100'
          return {
            'data-size': pct,
            style: `width: ${pct}%; max-width: 100%; height: auto;`,
          }
        },
      },
    }
  },

  addNodeView() {
    const resize = this.options.resize
    if (typeof resize !== 'object' || !resize.enabled || typeof document === 'undefined') {
      return null
    }

    const { directions, minWidth, minHeight, alwaysPreserveAspectRatio } = resize
    const extension = this

    return ({ node, getPos, HTMLAttributes, editor }) => {
      const el = document.createElement('img')
      el.draggable = false

      const mergedAttributes = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)
      Object.entries(mergedAttributes).forEach(([key, value]) => {
        if (value == null) return
        if (key === 'width' || key === 'height' || key === 'style' || key === 'class') return
        el.setAttribute(key, String(value))
      })
      if (mergedAttributes.src != null) {
        el.src = mergedAttributes.src as string
      }

      applyImageLayout(el, node.attrs)

      const nodeView = new ResizableNodeView({
        element: el,
        editor,
        node,
        getPos,
        onResize: (width, height) => {
          el.style.width = `${width}px`
          el.style.height = `${height}px`
        },
        onCommit: (width, height) => {
          const pos = getPos()
          if (pos === undefined) return
          extension.editor.chain().setNodeSelection(pos).updateAttributes(extension.name, {
            width,
            height,
            sizePreset: null,
          }).run()
        },
        onUpdate: (updatedNode) => {
          if (updatedNode.type !== node.type) return false
          applyImageLayout(el, updatedNode.attrs)
          const nextSrc = updatedNode.attrs.src as string | null
          if (nextSrc && el.src !== nextSrc) {
            el.src = nextSrc
          }
          return true
        },
        options: {
          directions,
          min: { width: minWidth, height: minHeight },
          preserveAspectRatio: alwaysPreserveAspectRatio === true,
        },
      })

      const dom = nodeView.dom as HTMLElement
      dom.style.visibility = 'hidden'
      dom.style.pointerEvents = 'none'
      el.onload = () => {
        dom.style.visibility = ''
        dom.style.pointerEvents = ''
      }

      return nodeView
    }
  },
}).configure({
  inline: false,
  allowBase64: true,
  resize: { enabled: true, minWidth: 80 },
  HTMLAttributes: { class: 'editor-image' },
})
