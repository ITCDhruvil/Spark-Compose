import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { Node as PmNode } from '@tiptap/pm/model'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { EditorView } from '@tiptap/pm/view'
import { aiApi } from '@/lib/api/ai-client'

const DEBOUNCE_MS = 120
const MIN_BEFORE_CHARS = 3
const CONTEXT_BEFORE = 600
const CONTEXT_AFTER = 120
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

function buildDecorations(doc: PmNode, ghost: GhostState): DecorationSet {
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
    // TipTap plugin closures capture the extension instance.
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- required for plugin callbacks
    const extension = this
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    let abortController: AbortController | null = null
    let ghost: GhostState = { text: null, from: 0 }
    let requestGeneration = 0

    function clearGhost(view: EditorView) {
      ghost = { text: null, from: 0 }
      extension.storage.ghostText = null
      view.dispatch(view.state.tr.setMeta(pluginKey, { ghost }))
    }

    function acceptGhost(view: EditorView): boolean {
      if (!ghost.text) return false
      const text = ghost.text
      const pos = ghost.from
      const tr = view.state.tr.insertText(text, pos)
      view.dispatch(tr)
      clearGhost(view)
      return true
    }

    function reconcileGhostWithEdit(view: EditorView) {
      if (!ghost.text) return

      const from = view.state.selection.from
      if (from < ghost.from) {
        clearGhost(view)
        return
      }

      if (from > ghost.from) {
        const inserted = view.state.doc.textBetween(ghost.from, from)
        if (inserted && ghost.text.startsWith(inserted)) {
          const remaining = ghost.text.slice(inserted.length)
          if (!remaining) {
            clearGhost(view)
          } else {
            ghost = { text: remaining, from }
            extension.storage.ghostText = remaining
            view.dispatch(view.state.tr.setMeta(pluginKey, { ghost }))
          }
        } else if (inserted) {
          clearGhost(view)
        }
      }
    }

    async function triggerCompletion(view: EditorView) {
      if (!extension.options.enabled()) return
      const { selection } = view.state
      if (!selection.empty) return

      const from = selection.from
      const before = view.state.doc.textBetween(Math.max(0, from - CONTEXT_BEFORE), from, '\n')
      const after = view.state.doc.textBetween(from, Math.min(view.state.doc.content.size, from + CONTEXT_AFTER), '\n')

      const scope = extension.options.scope?.() ?? 'sentence'
      const minChars = scope === 'word' ? 1 : MIN_BEFORE_CHARS
      if (!before || before.trim().length < minChars) return

      abortController?.abort()
      const ctrl = new AbortController()
      abortController = ctrl
      const generation = ++requestGeneration

      let accumulated = ''
      try {
        for await (const raw of aiApi.complete(
          { before, after, scope: extension.options.scope?.(), model: extension.options.model?.() },
          ctrl.signal,
        )) {
          if (generation !== requestGeneration || ctrl.signal.aborted) break

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
              requestGeneration++
              return true
            }
            return false
          },
        },
        view() {
          return {
            update(view, prevState) {
              if (view.state.selection.eq(prevState.selection) && view.state.doc.eq(prevState.doc)) return

              if (!view.state.selection.empty) {
                clearGhost(view)
                abortController?.abort()
                requestGeneration++
                if (debounceTimer) clearTimeout(debounceTimer)
                return
              }

              if (!view.state.doc.eq(prevState.doc)) {
                reconcileGhostWithEdit(view)
              } else if (ghost.text && view.state.selection.from !== ghost.from) {
                clearGhost(view)
                abortController?.abort()
                requestGeneration++
              }

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
