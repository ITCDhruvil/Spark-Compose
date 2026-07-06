import type { Editor } from '@tiptap/react'
import type { CommandItem } from '@/components/editor/slash-command-items'
import { getCommandByKey, SLASH_COMMANDS } from '@/components/editor/slash-command-items'
import { getRecentSlashKeys } from './editor-preferences'

export interface SlashCommandSection {
  label: string
  items: CommandItem[]
}

function dedupeItems(items: CommandItem[]): CommandItem[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const id = item.key ?? item.title
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

/** Contextual slash menu suggestions based on cursor line text. */
export function getSuggestedSlashCommands(editor: Editor): CommandItem[] {
  const { $from } = editor.state.selection
  const parent = $from.parent
  const lineText = parent.textContent.slice(0, $from.parentOffset).trim()
  const suggestions: CommandItem[] = []

  if (/^\d+[.)]\s*$/.test(lineText) || /^\d+[.)]\s+\S/.test(lineText)) {
    const item = getCommandByKey('numbered-list')
    if (item) suggestions.push(item)
  }

  if (/^[-*•]\s*$/.test(lineText)) {
    const item = getCommandByKey('bullet-list')
    if (item) suggestions.push(item)
  }

  if (editor.isActive('table')) {
    const item = getCommandByKey('table')
    if (item) suggestions.push(item)
  }

  if ($from.parent.type.name === 'paragraph' && parent.content.size === 0) {
    const table = getCommandByKey('table')
    const h2 = getCommandByKey('heading-2')
    const checklist = getCommandByKey('checklist')
    if (table) suggestions.push(table)
    if (h2) suggestions.push(h2)
    if (checklist) suggestions.push(checklist)
  }

  return dedupeItems(suggestions)
}

export function getRecentSlashCommands(): CommandItem[] {
  return getRecentSlashKeys()
    .map((key) => getCommandByKey(key))
    .filter((item): item is CommandItem => !!item)
}

export function buildSlashSections(
  filtered: CommandItem[],
  editor: Editor | null,
  query: string,
): SlashCommandSection[] {
  const q = query.trim()
  if (q) {
    return filtered.length ? [{ label: '', items: filtered }] : []
  }

  const recent = getRecentSlashCommands()
  const suggested = editor ? getSuggestedSlashCommands(editor) : []
  const used = new Set<string>()
  const sections: SlashCommandSection[] = []

  const mark = (items: CommandItem[]) =>
    items.filter((item) => {
      const id = item.key ?? item.title
      if (used.has(id)) return false
      used.add(id)
      return true
    })

  const recentFiltered = mark(recent)
  if (recentFiltered.length) {
    sections.push({ label: 'Recent', items: recentFiltered })
  }

  const suggestedFiltered = mark(suggested)
  if (suggestedFiltered.length) {
    sections.push({ label: 'Suggested', items: suggestedFiltered })
  }

  const rest = mark(filtered.length ? filtered : SLASH_COMMANDS)
  sections.push({ label: sections.length ? 'All commands' : '', items: rest })

  return sections
}
