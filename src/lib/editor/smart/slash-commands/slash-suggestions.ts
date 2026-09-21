import type { Editor } from '@tiptap/react'
import type { CommandItem } from '@/components/editor/smart/slash-commands/slash-command-items'
import { getCommandByKey, getSlashCommands } from '@/components/editor/smart/slash-commands/slash-command-items'
import { isAiSlashKey } from '@/lib/editor/ai/plugin/ai-capabilities'
import { getRecentSlashKeys } from '@/lib/editor/core/preferences/editor-preferences'

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

function allowCommand(item: CommandItem, aiEnabled: boolean): boolean {
  if (aiEnabled) return true
  return !isAiSlashKey(item.key)
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

export function getRecentSlashCommands(aiEnabled = true): CommandItem[] {
  return getRecentSlashKeys()
    .map((key) => getCommandByKey(key))
    .filter((item): item is CommandItem => !!item && allowCommand(item, aiEnabled))
}

export function buildSlashSections(
  filtered: CommandItem[],
  editor: Editor | null,
  query: string,
  aiEnabled = true,
): SlashCommandSection[] {
  const q = query.trim()
  if (q) {
    return filtered.length ? [{ label: '', items: filtered }] : []
  }

  const catalog = getSlashCommands(aiEnabled)
  const recent = getRecentSlashCommands(aiEnabled)
  const suggested = editor
    ? getSuggestedSlashCommands(editor).filter((item) => allowCommand(item, aiEnabled))
    : []
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

  const rest = mark(filtered.length ? filtered : catalog)
  sections.push({ label: sections.length ? 'All commands' : '', items: rest })

  return sections
}
