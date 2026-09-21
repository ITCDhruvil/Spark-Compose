import { Node, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { TocEntry } from '@/lib/editor/smart/document-outline/toc-utils'
import {
  insertTableOfContents as insertToc,
  refreshTocPageNumbers as refreshToc,
  scrollToHeadingId,
  buildTocPageRefreshTransaction,
  findTocBlockPosInDoc,
} from '@/lib/editor/smart/document-outline/toc-utils'
import type { TocTemplateId } from '@/lib/editor/smart/document-outline/toc-templates'

export interface TocBlockAttrs {
  template: TocTemplateId
  indexPages: number
  title: string
  entries: TocEntry[]
}

export const tocPageRefreshKey = new PluginKey('tocPageRefresh')

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tocBlock: {
      insertTableOfContents: (opts: { indexPages: number; template: TocTemplateId }) => ReturnType
      refreshTocPageNumbers: () => ReturnType
    }
  }
}

function renderTocDom(
  dom: HTMLElement,
  attrs: TocBlockAttrs,
  onLinkClick: (id: string) => void,
) {
  const { template, indexPages, title, entries } = attrs
  dom.className = `editor-toc-block editor-toc-${template}`
  dom.dataset.tocBlock = ''
  dom.dataset.template = template
  dom.dataset.indexPages = String(indexPages)
  dom.contentEditable = 'false'

  dom.innerHTML = ''

  const titleEl = document.createElement('h2')
  titleEl.className = 'editor-toc-title'
  titleEl.textContent = title
  dom.appendChild(titleEl)

  if (indexPages > 1) {
    const spacer = document.createElement('div')
    spacer.className = 'editor-toc-page-spacer'
    spacer.setAttribute('aria-hidden', 'true')
    spacer.style.minHeight = `${(indexPages - 1) * 880}px`
    dom.appendChild(spacer)
  }

  const list = document.createElement('nav')
  list.className = 'editor-toc-entries'
  list.setAttribute('aria-label', 'Table of contents')

  for (const entry of entries) {
    const row = document.createElement('button')
    row.type = 'button'
    row.className = `editor-toc-row editor-toc-level-${entry.level}`
    row.dataset.tocLink = entry.id

    const label = document.createElement('span')
    label.className = 'editor-toc-label'
    label.textContent = entry.text

    const leader = document.createElement('span')
    leader.className = 'editor-toc-leader'
    leader.setAttribute('aria-hidden', 'true')

    const page = document.createElement('span')
    page.className = 'editor-toc-page'
    page.textContent = String(entry.page)

    row.appendChild(label)
    row.appendChild(leader)
    row.appendChild(page)

    row.addEventListener('click', (e) => {
      e.preventDefault()
      onLinkClick(entry.id)
    })

    list.appendChild(row)
  }

  dom.appendChild(list)
}

export const TocBlock = Node.create({
  name: 'tocBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      template: { default: 'classic' },
      indexPages: { default: 1 },
      title: { default: 'Table of Contents' },
      entries: {
        default: [],
        parseHTML: (el) => {
          const raw = el.getAttribute('data-entries')
          if (!raw) return []
          try {
            return JSON.parse(raw) as TocEntry[]
          } catch {
            return []
          }
        },
        renderHTML: (attrs) => ({
          'data-entries': JSON.stringify(attrs.entries ?? []),
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-toc-block]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-toc-block': '' })]
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: tocPageRefreshKey,
        view(view) {
          let raf = 0

          const flush = () => {
            raf = 0
            const state = view.state
            if (!state?.doc) return
            if (findTocBlockPosInDoc(state.doc) == null) return

            const tr = buildTocPageRefreshTransaction(state, view)
            if (!tr) return
            view.dispatch(tr)
          }

          const schedule = () => {
            cancelAnimationFrame(raf)
            // Two frames: let heading ids + layout settle before measuring positions.
            raf = requestAnimationFrame(() => {
              raf = requestAnimationFrame(flush)
            })
          }

          return {
            update(v, prevState) {
              if (v.state.doc.eq(prevState.doc)) return
              if (findTocBlockPosInDoc(v.state.doc) == null) return
              schedule()
            },
            destroy() {
              cancelAnimationFrame(raf)
            },
          }
        },
      }),
    ]
  },

  addNodeView() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- required for node view callbacks
    const extension = this
    return ({ node, editor }) => {
      const dom = document.createElement('div')

      const render = (n: typeof node) => {
        renderTocDom(
          dom,
          n.attrs as TocBlockAttrs,
          (id) => scrollToHeadingId(editor, id),
        )
      }

      render(node)

      return {
        dom,
        update(updated) {
          if (updated.type.name !== extension.name) return false
          render(updated)
          return true
        },
        selectNode() {
          dom.classList.add('is-selected')
        },
        deselectNode() {
          dom.classList.remove('is-selected')
        },
        ignoreMutation: () => true,
        stopEvent: (event) => {
          const target = event.target as HTMLElement
          return !!target.closest?.('[data-toc-link]')
        },
      }
    }
  },

  addCommands() {
    return {
      insertTableOfContents:
        (opts) =>
        ({ editor }) => {
          if (editor.isDestroyed) return false
          return insertToc(editor, opts)
        },
      refreshTocPageNumbers:
        () =>
        ({ editor }) => {
          if (editor.isDestroyed) return false
          return refreshToc(editor)
        },
    }
  },
})
