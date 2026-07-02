'use client'

import { Extension } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import Suggestion from '@tiptap/suggestion'
import { PluginKey } from '@tiptap/pm/state'
import {
  forwardRef, useEffect, useImperativeHandle, useState, useCallback,
} from 'react'
import tippy from 'tippy.js'
import type { Editor } from '@tiptap/react'
import { Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare, Quote, Code2, Table2, Minus, Info, AlertTriangle, AlertCircle, CheckCircle2, Video } from 'lucide-react'
import type { CalloutType } from './extensions/callout'

interface CommandItem {
  title: string
  description: string
  icon: React.ReactNode
  command: (editor: Editor) => void
}

const COMMANDS: CommandItem[] = [
  {
    title: 'Heading 1',
    description: 'Large section heading',
    icon: <Heading1 className="w-4 h-4" />,
    command: (e) => e.chain().focus().setHeading({ level: 1 }).run(),
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: <Heading2 className="w-4 h-4" />,
    command: (e) => e.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    icon: <Heading3 className="w-4 h-4" />,
    command: (e) => e.chain().focus().setHeading({ level: 3 }).run(),
  },
  {
    title: 'Bullet List',
    description: 'Create an unordered list',
    icon: <List className="w-4 h-4" />,
    command: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    title: 'Numbered List',
    description: 'Create an ordered list',
    icon: <ListOrdered className="w-4 h-4" />,
    command: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    title: 'Checklist',
    description: 'Create a task checklist',
    icon: <CheckSquare className="w-4 h-4" />,
    command: (e) => e.chain().focus().toggleTaskList().run(),
  },
  {
    title: 'Quote',
    description: 'Insert a blockquote',
    icon: <Quote className="w-4 h-4" />,
    command: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    title: 'Code Block',
    description: 'Insert a code block',
    icon: <Code2 className="w-4 h-4" />,
    command: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: 'Table',
    description: 'Insert a 3x3 table',
    icon: <Table2 className="w-4 h-4" />,
    command: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    title: 'Divider',
    description: 'Insert a horizontal rule',
    icon: <Minus className="w-4 h-4" />,
    command: (e) => e.chain().focus().setHorizontalRule().run(),
  },
  {
    title: 'Info callout',
    description: 'Information callout block',
    icon: <Info className="w-4 h-4" />,
    command: (e) => e.chain().focus().insertContent({ type: 'callout', attrs: { type: 'info' as CalloutType }, content: [{ type: 'paragraph' }] }).run(),
  },
  {
    title: 'Warning callout',
    description: 'Warning callout block',
    icon: <AlertTriangle className="w-4 h-4" />,
    command: (e) => e.chain().focus().insertContent({ type: 'callout', attrs: { type: 'warning' as CalloutType }, content: [{ type: 'paragraph' }] }).run(),
  },
  {
    title: 'Error callout',
    description: 'Error callout block',
    icon: <AlertCircle className="w-4 h-4" />,
    command: (e) => e.chain().focus().insertContent({ type: 'callout', attrs: { type: 'error' as CalloutType }, content: [{ type: 'paragraph' }] }).run(),
  },
  {
    title: 'Success callout',
    description: 'Success callout block',
    icon: <CheckCircle2 className="w-4 h-4" />,
    command: (e) => e.chain().focus().insertContent({ type: 'callout', attrs: { type: 'success' as CalloutType }, content: [{ type: 'paragraph' }] }).run(),
  },
  {
    title: 'Video embed',
    description: 'Embed YouTube or Vimeo',
    icon: <Video className="w-4 h-4" />,
    command: (e) => {
      const url = window.prompt('YouTube or Vimeo URL')
      if (url) e.chain().focus().setVideoEmbed(url).run()
    },
  },
]

interface CommandListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

interface CommandListProps {
  items: CommandItem[]
  command: (item: CommandItem) => void
}

const CommandList = forwardRef<CommandListRef, CommandListProps>(({ items, command }, ref) => {
  const [selected, setSelected] = useState(0)

  useEffect(() => setSelected(0), [items])

  const select = useCallback((index: number) => {
    const item = items[index]
    if (item) command(item)
  }, [items, command])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        setSelected((s) => (s - 1 + items.length) % items.length)
        return true
      }
      if (event.key === 'ArrowDown') {
        setSelected((s) => (s + 1) % items.length)
        return true
      }
      if (event.key === 'Enter') {
        select(selected)
        return true
      }
      return false
    },
  }))

  if (!items.length) return null

  return (
    <div className="z-50 bg-popover border rounded-lg shadow-lg overflow-hidden w-64">
      {items.map((item, i) => (
        <button
          key={item.title}
          type="button"
          onClick={() => select(i)}
          className={`flex items-center gap-3 w-full px-3 py-2 text-left text-sm transition-colors ${i === selected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}
        >
          <span className="text-muted-foreground flex-shrink-0">{item.icon}</span>
          <span>
            <span className="font-medium">{item.title}</span>
            <span className="block text-xs text-muted-foreground">{item.description}</span>
          </span>
        </button>
      ))}
    </div>
  )
})
CommandList.displayName = 'CommandList'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProps = any

const slashSuggestionPluginKey = new PluginKey('slashSuggestion')

export const SlashCommands = Extension.create({
  name: 'slashCommands',

  addProseMirrorPlugins() {
    return [
      Suggestion({
        pluginKey: slashSuggestionPluginKey,
        editor: this.editor,
        char: '/',
        command: ({ editor, range, props }: { editor: Editor; range: AnyProps; props: CommandItem }) => {
          editor.chain().focus().deleteRange(range).run()
          props.command(editor)
        },
        items: ({ query }: { query: string }) =>
          COMMANDS.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase())
          ),
        render: () => {
          let component: ReactRenderer<CommandListRef>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let popup: any[]

          return {
            onStart: (props: AnyProps) => {
              component = new ReactRenderer(CommandList, {
                props,
                editor: props.editor as Editor,
              })
              popup = tippy('body', {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              })
            },
            onUpdate(props: AnyProps) {
              component.updateProps(props)
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
              popup[0]?.setProps({ getReferenceClientRect: props.clientRect })
            },
            onKeyDown(props: { event: KeyboardEvent }) {
              if (props.event.key === 'Escape') {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                popup[0]?.hide()
                return true
              }
              return component.ref?.onKeyDown(props) ?? false
            },
            onExit() {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
              popup[0]?.destroy()
              component.destroy()
            },
          }
        },
      }),
    ]
  },
})
