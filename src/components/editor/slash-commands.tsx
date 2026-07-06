'use client'

import { Extension } from '@tiptap/core'
import Suggestion, { type SuggestionProps } from '@tiptap/suggestion'
import { ReactRenderer } from '@tiptap/react'
import tippy, { type Instance as TippyInstance, type PopperElement, sticky } from 'tippy.js'
import { SLASH_COMMANDS, resolveSlashCommandSections, runSlashCommand, type CommandItem } from './slash-command-items'
import { CommandList, type CommandListRef } from './slash-command-list'
import type { SlashCommandSection } from '@/lib/editor/slash-suggestions'

export const SlashCommands = Extension.create({
  name: 'slashCommands',

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashCommandSection, CommandItem>({
        editor: this.editor,
        char: '/',
        allowSpaces: true,
        initialItems: [{ label: '', items: SLASH_COMMANDS }],
        allowedPrefixes: null,
        command: ({ editor, range, props }) => {
          editor.chain().focus().deleteRange(range).run()
          runSlashCommand(props, editor)
        },
        items: ({ query, editor }) => resolveSlashCommandSections(query, editor),
        render: () => {
          let component: ReactRenderer<CommandListRef> | null = null
          let popup: TippyInstance | null = null

          const destroy = () => {
            popup?.destroy()
            component?.destroy()
            popup = null
            component = null
          }

          return {
            onStart: (props: SuggestionProps<SlashCommandSection, CommandItem>) => {
              component = new ReactRenderer(CommandList, {
                editor: props.editor,
                props: {
                  sections: props.items,
                  command: props.command,
                },
              })

              if (!props.clientRect) return

              const getRect = () => props.clientRect?.() ?? new DOMRect()

              popup = tippy(document.body, {
                getReferenceClientRect: getRect,
                appendTo: () => document.body,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
                sticky: true,
                plugins: [sticky],
                render: () => ({
                  popper: component!.element as PopperElement,
                }),
              })
            },

            onUpdate: (props: SuggestionProps<SlashCommandSection, CommandItem>) => {
              component?.updateProps({
                sections: props.items,
                command: props.command,
              })

              if (!props.clientRect) return

              popup?.setProps({
                getReferenceClientRect: () => props.clientRect?.() ?? new DOMRect(),
              })
            },

            onKeyDown: (props) => {
              if (props.event.key === 'Escape') {
                popup?.hide()
                return true
              }
              return component?.ref?.onKeyDown(props) ?? false
            },

            onExit: () => {
              requestAnimationFrame(destroy)
            },
          }
        },
      }),
    ]
  },
})
