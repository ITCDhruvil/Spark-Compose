'use client'

import type { Editor } from '@tiptap/react'
import {
  Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare, Quote, Code2, Table2, Minus,
  Info, AlertTriangle, AlertCircle, CheckCircle2, Video, Sparkles, ImageIcon, Columns3,
} from 'lucide-react'
import type { CalloutType } from './extensions/callout'
import { openDraftAnything } from '@/lib/editor/draft-anything-events'
import { openMediaModal } from '@/lib/editor/media-events'
import { convertToBulletList, convertToOrderedList } from './editor-list-utils'
import {
  parseSlashQuery,
  type ParsedSlashCommand,
} from '@/lib/editor/slash-command-parser'
import {
  getLastTable,
  recordSlashCommand,
  setLastCallout,
  setLastTable,
} from '@/lib/editor/editor-preferences'
import { buildSlashSections, type SlashCommandSection } from '@/lib/editor/slash-suggestions'

export interface CommandItem {
  title: string
  description: string
  icon: React.ReactNode
  command: (editor: Editor) => void
  /** Stable id for recent commands + React keys */
  key?: string
  recordKey?: string
}

function insertTable(editor: Editor, rows: number, cols: number, header: boolean) {
  editor.chain().focus().insertTable({ rows, cols, withHeaderRow: header }).run()
  setLastTable({ rows, cols, header })
}

function insertHeading(editor: Editor, level: 1 | 2 | 3, title?: string) {
  if (title) {
    editor.chain().focus().insertContent({
      type: 'heading',
      attrs: { level },
      content: [{ type: 'text', text: title }],
    }).run()
    return
  }
  editor.chain().focus().setHeading({ level }).run()
}

function insertCallout(editor: Editor, type: CalloutType) {
  editor.chain().focus().insertContent({
    type: 'callout',
    attrs: { type },
    content: [{ type: 'paragraph' }],
  }).run()
  setLastCallout(type)
}

function insertChecklist(editor: Editor, count: number) {
  const items = Array.from({ length: count }, () => ({
    type: 'taskItem',
    attrs: { checked: false },
    content: [{ type: 'paragraph' }],
  }))
  editor.chain().focus().insertContent({ type: 'taskList', content: items }).run()
}

function insertLastTable(editor: Editor) {
  const t = getLastTable()
  insertTable(editor, t.rows, t.cols, t.header)
}

const CALLOUT_ICONS: Record<CalloutType, React.ReactNode> = {
  info: <Info className="w-4 h-4" />,
  warning: <AlertTriangle className="w-4 h-4" />,
  error: <AlertCircle className="w-4 h-4" />,
  success: <CheckCircle2 className="w-4 h-4" />,
}

const HEADING_ICONS: Record<1 | 2 | 3, React.ReactNode> = {
  1: <Heading1 className="w-4 h-4" />,
  2: <Heading2 className="w-4 h-4" />,
  3: <Heading3 className="w-4 h-4" />,
}

export function commandFromParsed(parsed: ParsedSlashCommand): CommandItem {
  switch (parsed.kind) {
    case 'table': {
      const label = `${parsed.rows}×${parsed.cols}`
      return {
        key: `table-${label}`,
        recordKey: 'table',
        title: `Table ${label}`,
        description: parsed.header ? 'With header row' : 'Insert table',
        icon: <Table2 className="w-4 h-4" />,
        command: (e) => insertTable(e, parsed.rows, parsed.cols, parsed.header),
      }
    }
    case 'heading': {
      const title = parsed.title
      return {
        key: `h${parsed.level}-${title ?? ''}`,
        recordKey: `heading-${parsed.level}`,
        title: title ? `Heading ${parsed.level}: ${title}` : `Heading ${parsed.level}`,
        description: title ? 'Insert titled heading' : 'Section heading',
        icon: HEADING_ICONS[parsed.level],
        command: (e) => insertHeading(e, parsed.level, title),
      }
    }
    case 'callout':
      return {
        key: `callout-${parsed.type}`,
        recordKey: `callout-${parsed.type}`,
        title: `${parsed.type.charAt(0).toUpperCase()}${parsed.type.slice(1)} callout`,
        description: 'Insert callout block',
        icon: CALLOUT_ICONS[parsed.type],
        command: (e) => insertCallout(e, parsed.type),
      }
    case 'checklist':
      return {
        key: `checklist-${parsed.items}`,
        recordKey: 'checklist',
        title: `Checklist (${parsed.items} items)`,
        description: 'Task checklist with empty items',
        icon: <CheckSquare className="w-4 h-4" />,
        command: (e) => insertChecklist(e, parsed.items),
      }
    case 'cols':
      return {
        key: `cols-${parsed.cols}`,
        recordKey: 'table',
        title: `Table 3×${parsed.cols}`,
        description: 'Quick table with header row',
        icon: <Columns3 className="w-4 h-4" />,
        command: (e) => insertTable(e, 3, parsed.cols, true),
      }
  }
}

function lastTableCommandItem(): CommandItem {
  const t = getLastTable()
  const label = `${t.rows}×${t.cols}`
  return {
    key: `table-last-${label}`,
    recordKey: 'table',
    title: `Table ${label}`,
    description: t.header ? 'Last used · with header' : 'Last used table size',
    icon: <Table2 className="w-4 h-4" />,
    command: insertLastTable,
  }
}

export const SLASH_COMMANDS: CommandItem[] = [
  {
    key: 'ask',
    recordKey: 'ask',
    title: 'Ask',
    description: 'Tagged /ask block — type a question, then Ask or Improve',
    icon: <Sparkles className="w-4 h-4" />,
    command: (e) => e.chain().focus().insertAskPrompt().run(),
  },
  {
    key: 'draft',
    recordKey: 'draft',
    title: 'Draft',
    description: 'Pick a type, answer a few questions, get a draft',
    icon: <Sparkles className="w-4 h-4" />,
    command: () => openDraftAnything(),
  },
  {
    key: 'media',
    recordKey: 'media',
    title: 'Media',
    description: '/media · image, video, and other media',
    icon: <ImageIcon className="w-4 h-4" />,
    command: () => openMediaModal(),
  },
  {
    key: 'heading-1',
    recordKey: 'heading-1',
    title: 'Heading 1',
    description: 'Large section heading · or /h1 Title',
    icon: <Heading1 className="w-4 h-4" />,
    command: (e) => e.chain().focus().setHeading({ level: 1 }).run(),
  },
  {
    key: 'heading-2',
    recordKey: 'heading-2',
    title: 'Heading 2',
    description: 'Medium section heading · or /h2 Title',
    icon: <Heading2 className="w-4 h-4" />,
    command: (e) => e.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    key: 'heading-3',
    recordKey: 'heading-3',
    title: 'Heading 3',
    description: 'Small section heading · or /h3 Title',
    icon: <Heading3 className="w-4 h-4" />,
    command: (e) => e.chain().focus().setHeading({ level: 3 }).run(),
  },
  {
    key: 'bullet-list',
    recordKey: 'bullet-list',
    title: 'Bullet List',
    description: 'Create an unordered list · or type - at line start',
    icon: <List className="w-4 h-4" />,
    command: (e) => convertToBulletList(e),
  },
  {
    key: 'numbered-list',
    recordKey: 'numbered-list',
    title: 'Numbered List',
    description: 'Create an ordered list · or type 1. at line start',
    icon: <ListOrdered className="w-4 h-4" />,
    command: (e) => convertToOrderedList(e),
  },
  {
    key: 'checklist',
    recordKey: 'checklist',
    title: 'Checklist',
    description: 'Task checklist · or /checklist5',
    icon: <CheckSquare className="w-4 h-4" />,
    command: (e) => e.chain().focus().toggleTaskList().run(),
  },
  {
    key: 'quote',
    recordKey: 'quote',
    title: 'Quote',
    description: 'Insert a blockquote · or type > at line start',
    icon: <Quote className="w-4 h-4" />,
    command: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    key: 'code-block',
    recordKey: 'code-block',
    title: 'Code Block',
    description: 'Insert a code block · or type ```',
    icon: <Code2 className="w-4 h-4" />,
    command: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    key: 'table',
    recordKey: 'table',
    title: 'Table',
    description: 'Insert table · /table3x3 — uses last size when repeated',
    icon: <Table2 className="w-4 h-4" />,
    command: insertLastTable,
  },
  {
    key: 'divider',
    recordKey: 'divider',
    title: 'Divider',
    description: 'Horizontal rule · or type ---',
    icon: <Minus className="w-4 h-4" />,
    command: (e) => e.chain().focus().setHorizontalRule().run(),
  },
  {
    key: 'callout-info',
    recordKey: 'callout-info',
    title: 'Info callout',
    description: 'Information callout · /calloutinfo',
    icon: <Info className="w-4 h-4" />,
    command: (e) => insertCallout(e, 'info'),
  },
  {
    key: 'callout-warning',
    recordKey: 'callout-warning',
    title: 'Warning callout',
    description: 'Warning callout · /calloutwarning',
    icon: <AlertTriangle className="w-4 h-4" />,
    command: (e) => insertCallout(e, 'warning'),
  },
  {
    key: 'callout-error',
    recordKey: 'callout-error',
    title: 'Error callout',
    description: 'Error callout · /callouterror',
    icon: <AlertCircle className="w-4 h-4" />,
    command: (e) => insertCallout(e, 'error'),
  },
  {
    key: 'callout-success',
    recordKey: 'callout-success',
    title: 'Success callout',
    description: 'Success callout · /calloutsuccess',
    icon: <CheckCircle2 className="w-4 h-4" />,
    command: (e) => insertCallout(e, 'success'),
  },
  {
    key: 'video',
    recordKey: 'video',
    title: 'Video embed',
    description: 'Embed YouTube or Vimeo · paste URL on its own line',
    icon: <Video className="w-4 h-4" />,
    command: (e) => {
      const url = window.prompt('YouTube or Vimeo URL')
      if (url) e.chain().focus().setVideoEmbed(url).run()
    },
  },
]

const COMMAND_BY_KEY = new Map(SLASH_COMMANDS.map((c) => [c.key ?? c.title, c]))

export function getCommandByKey(key: string): CommandItem | undefined {
  return COMMAND_BY_KEY.get(key)
}

export function runSlashCommand(item: CommandItem, editor: Editor) {
  item.command(editor)
  const rk = item.recordKey ?? item.key
  if (rk) recordSlashCommand(rk)
}

function staticMatchesQuery(item: CommandItem, query: string): boolean {
  const q = query.toLowerCase().trim()
  if (!q) return true
  return (
    item.title.toLowerCase().includes(q)
    || item.description.toLowerCase().includes(q)
    || (item.key?.toLowerCase().includes(q) ?? false)
  )
}

function shouldHideStatic(item: CommandItem, parsed: ParsedSlashCommand): boolean {
  const title = item.title.toLowerCase()
  switch (parsed.kind) {
    case 'table':
      return title === 'table'
    case 'heading':
      return title === `heading ${parsed.level}`
    case 'callout':
      return title === `${parsed.type} callout`
    case 'checklist':
      return title === 'checklist'
    case 'cols':
      return title === 'table'
    default:
      return false
  }
}

function resolveFilteredCommands(query: string): CommandItem[] {
  const q = query.trim()
  const parsed = parseSlashQuery(q)
  const dynamic: CommandItem[] = []

  if (parsed) {
    dynamic.push(commandFromParsed(parsed))
  } else if (q.toLowerCase() === 'table') {
    dynamic.push(lastTableCommandItem())
  }

  const staticItems = SLASH_COMMANDS.filter((item) => {
    if (parsed && shouldHideStatic(item, parsed)) return false
    if (q.toLowerCase() === 'table' && item.key === 'table') return false
    return staticMatchesQuery(item, q)
  })

  if (dynamic.length) return [...dynamic, ...staticItems]
  if (!q) return SLASH_COMMANDS
  return staticItems
}

/** Resolve slash menu sections (recent, suggested, filtered). */
export function resolveSlashCommandSections(query: string, editor: Editor | null): SlashCommandSection[] {
  const filtered = resolveFilteredCommands(query)
  return buildSlashSections(filtered, editor, query)
}

/** Flat list for backwards compatibility. */
export function resolveSlashCommands(query: string): CommandItem[] {
  return resolveFilteredCommands(query)
}

export { insertLastTable }
