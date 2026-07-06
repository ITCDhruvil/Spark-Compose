import Image from '@tiptap/extension-image'
import { mergeAttributes, ResizableNodeView } from '@tiptap/core'

export type ImageAlign = 'left' | 'center' | 'right'
export type ImageMetaLoading = 'caption' | 'alt' | null

function applyImageLayout(
  el: HTMLImageElement,
  attrs: Record<string, unknown>,
  figure?: HTMLElement | null,
  container?: HTMLElement | null,
) {
  const align = (attrs.align as ImageAlign) ?? 'center'
  el.setAttribute('data-align', align)
  el.className = `editor-image align-${align}`
  if (figure) {
    const selected = figure.classList.contains('is-selected')
    figure.setAttribute('data-align', align)
    figure.className = `editor-image-figure align-${align}`
    if (selected) figure.classList.add('is-selected')
  }

  const width = attrs.width as number | null | undefined
  const height = attrs.height as number | null | undefined

  if (width) {
    el.style.width = `${width}px`
    el.style.height = height ? `${height}px` : 'auto'
    el.style.maxWidth = '100%'
    el.removeAttribute('data-size')
    if (container) {
      container.style.width = ''
      container.style.maxWidth = '100%'
    }
    return
  }

  const pct = String(attrs.sizePreset ?? '100')
  el.setAttribute('data-size', pct)
  // Size the outer container as % of the editor; image fills it.
  el.style.width = '100%'
  el.style.maxWidth = '100%'
  el.style.height = 'auto'
  if (container) {
    container.style.width = `${pct}%`
    container.style.maxWidth = '100%'
  }
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
      caption: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-caption'),
        renderHTML: (attributes) =>
          attributes.caption ? { 'data-caption': attributes.caption } : {},
      },
      metaLoading: {
        default: null,
        rendered: false,
      },
    }
  },

  addNodeView() {
    const resize = this.options.resize
    if (typeof resize !== 'object' || !resize.enabled || typeof document === 'undefined') {
      return null
    }

    const { directions, minWidth, minHeight, alwaysPreserveAspectRatio } = resize
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- required for node view callbacks
    const extension = this

    return ({ node, getPos, HTMLAttributes }) => {
      const el = document.createElement('img')
      el.draggable = false

      const figure = document.createElement('div')
      figure.className = 'editor-image-figure'
      figure.setAttribute('data-align', (node.attrs.align as ImageAlign) ?? 'center')

      const mergedAttributes = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)
      Object.entries(mergedAttributes).forEach(([key, value]) => {
        if (value == null) return
        if (key === 'width' || key === 'height' || key === 'style' || key === 'class') return
        el.setAttribute(key, String(value))
      })
      if (mergedAttributes.src != null) {
        el.src = mergedAttributes.src as string
      }

      let resizeContainer: HTMLElement | null = null

      const nodeView = new ResizableNodeView({
        element: el,
        editor: extension.editor,
        node,
        getPos,
        onResize: (width, height) => {
          if (resizeContainer) resizeContainer.style.width = ''
          el.style.width = `${width}px`
          el.style.height = `${height}px`
        },
        onCommit: (width, height) => {
          const pos = getPos()
          if (pos === undefined) return
          extension.editor.chain().setNodeSelection(pos).updateAttributes(extension.name, {
            width: Math.round(width),
            height: Math.round(height),
            sizePreset: null,
          }).run()
        },
        onUpdate: (updatedNode) => {
          if (updatedNode.type !== node.type) return false
          applyImageLayout(el, updatedNode.attrs, figure, resizeContainer)
          const nextSrc = updatedNode.attrs.src as string | null
          if (nextSrc && el.getAttribute('src') !== nextSrc) {
            el.src = nextSrc
          }
          return true
        },
        options: {
          directions: directions ?? ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
          min: { width: minWidth ?? 80, height: minHeight ?? 40 },
          preserveAspectRatio: alwaysPreserveAspectRatio !== false,
          className: {
            container: 'editor-image-resize',
            wrapper: 'editor-image-resize-wrap',
            handle: 'editor-image-resize-handle',
            resizing: 'is-resizing',
          },
        },
      })

      resizeContainer = nodeView.dom as HTMLElement
      applyImageLayout(el, node.attrs, figure, resizeContainer)
      figure.appendChild(resizeContainer)

      const innerDom = nodeView.dom as HTMLElement
      innerDom.style.visibility = 'hidden'
      innerDom.style.pointerEvents = 'none'
      el.onload = () => {
        innerDom.style.visibility = ''
        innerDom.style.pointerEvents = ''
      }
      if (el.complete) {
        innerDom.style.visibility = ''
        innerDom.style.pointerEvents = ''
      }

      const innerUpdate = nodeView.update?.bind(nodeView)
      type NodeViewExtras = {
        selectNode?: () => void
        deselectNode?: () => void
        ignoreMutation?: (mutation: MutationRecord | { type: 'selection' }) => boolean
      }
      const extras = nodeView as typeof nodeView & NodeViewExtras

      return {
        dom: figure,
        update: (updatedNode, decorations, innerDecorations) => {
          if (updatedNode.type.name !== extension.name) return false
          return innerUpdate
            ? innerUpdate(updatedNode, decorations, innerDecorations) !== false
            : true
        },
        selectNode: () => {
          extras.selectNode?.()
          figure.classList.add('is-selected')
        },
        deselectNode: () => {
          extras.deselectNode?.()
          figure.classList.remove('is-selected')
        },
        destroy: () => {
          nodeView.destroy?.()
        },
        ignoreMutation: (mutation) =>
          extras.ignoreMutation?.(mutation) ?? true,
      }
    }
  },
}).configure({
  inline: false,
  allowBase64: true,
  resize: {
    enabled: true,
    minWidth: 80,
    minHeight: 40,
    alwaysPreserveAspectRatio: true,
  },
  HTMLAttributes: { class: 'editor-image' },
})
