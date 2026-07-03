import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { aiApi } from '@/lib/api/ai-client'

const DEBOUNCE_MS = 400
const MIN_BEFORE_CHARS = 3
const pluginKey = new PluginKey('aiAutocomplete')

declare module '@tiptap/core' {
  interface Storage {
    aiAutocomplete: {
      ghostText: string | null
    }
  }
}

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
