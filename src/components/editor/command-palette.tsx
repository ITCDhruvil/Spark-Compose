'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import type { LucideIcon } from 'lucide-react'
import {
  Search, Table2, Megaphone, Link2, Replace, ImageIcon, Video,
  ArrowUp, ArrowDown, Copy, Trash2, FileText, Focus, SpellCheck, Keyboard, Slash,
} from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import type { CalloutType } from './extensions/callout'
import { insertLastTable } from './slash-command-items'
import { runSlashCommand, getSlashCommands } from './slash-command-items'
import {
  deleteCurrentBlock,
  duplicateCurrentBlock,
  moveCurrentBlock,
} from '@/lib/editor/block-utils'
import { copyToClipboard, exportMarkdown } from './editor-export'
import { getLastCallout } from '@/lib/editor/editor-preferences'
import { PALETTE_EDITOR_SHORTCUTS, SLASH_COMMAND_SHORTCUTS } from '@/lib/editor/command-shortcuts'

export interface CommandPaletteActions {
  openLinkDialog: () => void
  openFindReplace: () => void
  openImageDialog: () => void
  openShortcutsDialog: () => void
  openEmbedDialog: () => void
  insertCallout: (type: CalloutType) => void
  toggleFocusMode: () => void
  toggleSpellCheck: () => void
}

export interface PaletteCommand {
  id: string
  title: string
  keywords: string
  /** Slash or keyboard hints shown on the right */
  shortcuts?: string[]
  icon?: React.ReactNode
  run: (editor: Editor, actions: CommandPaletteActions) => void
}

function paletteIcon(Icon: LucideIcon) {
  return <Icon className="w-4 h-4" />
}

function scoreMatch(query: string, cmd: PaletteCommand): number {
  const q = query.toLowerCase().trim()
  if (!q) return 1
  const title = cmd.title.toLowerCase()
  const keys = cmd.keywords.toLowerCase()
  const hints = (cmd.shortcuts ?? []).join(' ').toLowerCase()
  if (title === q) return 100
  if (title.startsWith(q)) return 80
  if (title.includes(q)) return 60
  if (hints.includes(q)) return 55
  if (keys.includes(q)) return 40
  if (q.split(/\s+/).every((w) => keys.includes(w) || title.includes(w))) return 30
  return 0
}

export function buildPaletteCommands(aiEnabled = true): PaletteCommand[] {
  const slashItems: PaletteCommand[] = getSlashCommands(aiEnabled).map((item) => {
    const key = item.key ?? item.title
    return {
      id: `slash-${key}`,
      title: item.title,
      keywords: `${item.title} ${item.description} insert block slash`,
      shortcuts: key ? SLASH_COMMAND_SHORTCUTS[key] : undefined,
      icon: item.icon,
      run: (editor) => runSlashCommand(item, editor),
    }
  })

  const editorCommands: PaletteCommand[] = [
    {
      id: 'table-last',
      title: 'Insert table (last size)',
      keywords: 'table grid rows columns insert',
      shortcuts: PALETTE_EDITOR_SHORTCUTS['table-last'],
      icon: paletteIcon(Table2),
      run: (editor) => insertLastTable(editor),
    },
    {
      id: 'callout-last',
      title: 'Insert callout (last type)',
      keywords: 'callout info warning box insert',
      shortcuts: PALETTE_EDITOR_SHORTCUTS['callout-last'],
      icon: paletteIcon(Megaphone),
      run: (editor, actions) => actions.insertCallout(getLastCallout()),
    },
    {
      id: 'link',
      title: 'Insert link',
      keywords: 'hyperlink url ctrl+k',
      shortcuts: PALETTE_EDITOR_SHORTCUTS.link,
      icon: paletteIcon(Link2),
      run: (_e, actions) => actions.openLinkDialog(),
    },
    {
      id: 'find',
      title: 'Find and replace',
      keywords: 'search find replace ctrl+f',
      shortcuts: PALETTE_EDITOR_SHORTCUTS.find,
      icon: paletteIcon(Replace),
      run: (_e, actions) => actions.openFindReplace(),
    },
    {
      id: 'image',
      title: 'Insert image',
      keywords: 'photo picture upload',
      icon: paletteIcon(ImageIcon),
      run: (_e, actions) => actions.openImageDialog(),
    },
    {
      id: 'video',
      title: 'Embed video',
      keywords: 'youtube vimeo embed',
      shortcuts: SLASH_COMMAND_SHORTCUTS.video,
      icon: paletteIcon(Video),
      run: (_e, actions) => actions.openEmbedDialog(),
    },
    {
      id: 'block-up',
      title: 'Move block up',
      keywords: 'reorder block move',
      shortcuts: PALETTE_EDITOR_SHORTCUTS['block-up'],
      icon: paletteIcon(ArrowUp),
      run: (editor) => { moveCurrentBlock(editor, 'up') },
    },
    {
      id: 'block-down',
      title: 'Move block down',
      keywords: 'reorder block move',
      shortcuts: PALETTE_EDITOR_SHORTCUTS['block-down'],
      icon: paletteIcon(ArrowDown),
      run: (editor) => { moveCurrentBlock(editor, 'down') },
    },
    {
      id: 'block-dup',
      title: 'Duplicate block',
      keywords: 'copy block clone',
      shortcuts: PALETTE_EDITOR_SHORTCUTS['block-dup'],
      icon: paletteIcon(Copy),
      run: (editor) => { duplicateCurrentBlock(editor) },
    },
    {
      id: 'block-del',
      title: 'Delete block',
      keywords: 'remove block',
      shortcuts: PALETTE_EDITOR_SHORTCUTS['block-del'],
      icon: paletteIcon(Trash2),
      run: (editor) => { deleteCurrentBlock(editor) },
    },
    {
      id: 'copy-md',
      title: 'Copy as Markdown',
      keywords: 'export copy markdown',
      icon: paletteIcon(FileText),
      run: async (editor) => { await copyToClipboard(exportMarkdown(editor)) },
    },
    {
      id: 'focus',
      title: 'Toggle focus mode',
      keywords: 'distraction free fullscreen zen',
      icon: paletteIcon(Focus),
      run: (_e, actions) => actions.toggleFocusMode(),
    },
    {
      id: 'spell',
      title: 'Toggle spell check',
      keywords: 'spelling grammar',
      icon: paletteIcon(SpellCheck),
      run: (_e, actions) => actions.toggleSpellCheck(),
    },
    {
      id: 'shortcuts',
      title: 'Keyboard shortcuts',
      keywords: 'help hotkeys keys',
      shortcuts: PALETTE_EDITOR_SHORTCUTS.shortcuts,
      icon: paletteIcon(Keyboard),
      run: (_e, actions) => actions.openShortcutsDialog(),
    },
    {
      id: 'slash-menu',
      title: 'Slash commands menu',
      keywords: 'slash insert block commands',
      shortcuts: ['/'],
      icon: paletteIcon(Slash),
      run: (editor) => { editor.chain().focus().insertContent('/').run() },
    },
  ]

  return [...slashItems, ...editorCommands]
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  editor: Editor
  actions: CommandPaletteActions
  aiEnabled?: boolean
}

export function CommandPalette({ open, onClose, editor, actions, aiEnabled = true }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const allCommands = useMemo(() => buildPaletteCommands(aiEnabled), [aiEnabled])

  const filtered = useMemo(() => {
    const scored = allCommands
      .map((cmd) => ({ cmd, score: scoreMatch(query, cmd) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.cmd.title.localeCompare(b.cmd.title))
    return scored.map((x) => x.cmd)
  }, [allCommands, query])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => setSelected(0), [query])

  const runSelected = useCallback(() => {
    const cmd = filtered[selected]
    if (!cmd) return
    void Promise.resolve(cmd.run(editor, actions))
    onClose()
  }, [actions, editor, filtered, onClose, selected])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((s) => Math.min(s + 1, Math.max(0, filtered.length - 1)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((s) => Math.max(s - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      runSelected()
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Command palette" className="max-w-lg">
      <div className="space-y-3 -mx-1">
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search commands…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="text-[10px] font-mono text-muted-foreground border rounded px-1.5 py-0.5 shrink-0">
            Ctrl+Shift+P
          </kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto scrollbar-hide border rounded-lg divide-y">
          {filtered.length === 0 ? (
            <li className="px-3 py-4 text-sm text-muted-foreground text-center">No matching commands</li>
          ) : filtered.map((cmd, i) => (
            <li key={cmd.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setSelected(i)}
                onClick={() => {
                  void Promise.resolve(cmd.run(editor, actions))
                  onClose()
                }}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                  i === selected ? 'bg-accent' : 'hover:bg-muted/60'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <span className="flex-shrink-0 text-muted-foreground w-4 flex justify-center">
                    {cmd.icon ?? null}
                  </span>
                  <span className="font-medium truncate">{cmd.title}</span>
                </span>
                {cmd.shortcuts?.length ? (
                  <span className="flex items-center gap-1 shrink-0">
                    {cmd.shortcuts.map((hint) => (
                      <kbd
                        key={hint}
                        className="text-[10px] font-mono text-muted-foreground border rounded px-1.5 py-0.5 whitespace-nowrap"
                      >
                        {hint}
                      </kbd>
                    ))}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  )
}
