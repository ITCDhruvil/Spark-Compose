import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export const askGhostHintPluginKey = new PluginKey<{ active: boolean; decorations: DecorationSet }>('askGhostHint')

const HINT = 'End your question with ? or .'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    askGhostHint: {
      setAskGhostHint: (show: boolean) => ReturnType
    }
  }
}

function emptyTextblockPos(state: import('@tiptap/pm/state').EditorState): number | null {
  const { $from } = state.selection
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d)
    if (node.isTextblock) {
      return node.content.size === 0 ? $from.start(d) : null
    }
  }
  return null
}

function buildHintDecorations(state: import('@tiptap/pm/state').EditorState): DecorationSet {
  const pos = emptyTextblockPos(state)
  if (pos == null) return DecorationSet.empty

  return DecorationSet.create(state.doc, [
    Decoration.widget(pos, () => {
      const widget = document.createElement('span')
      widget.className = 'ai-ghost-text ask-ghost-hint'
      widget.textContent = HINT
      return widget
    }, { side: 1, key: 'ask-ghost-hint' }),
  ])
}

function syncEditorClass(view: import('@tiptap/pm/view').EditorView, active: boolean) {
  view.dom.classList.toggle('ask-ghost-active', active)
}

export const AskGhostHint = Extension.create({
  name: 'askGhostHint',

  addCommands() {
    return {
      setAskGhostHint:
        (show: boolean) =>
        ({ tr, dispatch, editor }) => {
          if (dispatch) {
            const next = tr.setMeta(askGhostHintPluginKey, { active: show })
            dispatch(next)
            // Class sync on next frame so DOM is ready
            requestAnimationFrame(() => {
              syncEditorClass(editor.view, show)
            })
          }
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: askGhostHintPluginKey,
        state: {
          init: () => ({ active: false, decorations: DecorationSet.empty }),
          apply(tr, prev, _oldState, newState) {
            const meta = tr.getMeta(askGhostHintPluginKey) as { active?: boolean } | undefined
            const active = typeof meta?.active === 'boolean' ? meta.active : prev.active

            if (!active) {
              return { active: false, decorations: DecorationSet.empty }
            }

            return {
              active: true,
              decorations: buildHintDecorations(newState),
            }
          },
        },
        props: {
          decorations(state) {
            return askGhostHintPluginKey.getState(state)?.decorations ?? DecorationSet.empty
          },
        },
        view(view) {
          return {
            update(v) {
              const active = askGhostHintPluginKey.getState(v.state)?.active === true
              syncEditorClass(v, active)
            },
            destroy() {
              syncEditorClass(view, false)
            },
          }
        },
      }),
    ]
  },
})
