import type { CalloutType } from '@/components/editor/core/callouts/extensions/callout'

const STORAGE_KEY = 'rich-editor-prefs-v1'
const MAX_RECENT = 5

export interface TablePrefs {
  rows: number
  cols: number
  header: boolean
}

export interface EditorPreferences {
  lastTable: TablePrefs
  lastCallout: CalloutType
  recentSlashKeys: string[]
}

const DEFAULT_PREFS: EditorPreferences = {
  lastTable: { rows: 3, cols: 3, header: true },
  lastCallout: 'info',
  recentSlashKeys: [],
}

function readPrefs(): EditorPreferences {
  if (typeof window === 'undefined') return { ...DEFAULT_PREFS }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    const parsed = JSON.parse(raw) as Partial<EditorPreferences>
    return {
      lastTable: { ...DEFAULT_PREFS.lastTable, ...parsed.lastTable },
      lastCallout: parsed.lastCallout ?? DEFAULT_PREFS.lastCallout,
      recentSlashKeys: Array.isArray(parsed.recentSlashKeys)
        ? parsed.recentSlashKeys.slice(0, MAX_RECENT)
        : [],
    }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

function writePrefs(prefs: EditorPreferences) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // ignore quota errors
  }
}

export function getEditorPreferences(): EditorPreferences {
  return readPrefs()
}

export function getLastTable(): TablePrefs {
  return readPrefs().lastTable
}

export function getLastCallout(): CalloutType {
  return readPrefs().lastCallout
}

export function setLastTable(table: TablePrefs) {
  const prefs = readPrefs()
  prefs.lastTable = table
  writePrefs(prefs)
}

export function setLastCallout(type: CalloutType) {
  const prefs = readPrefs()
  prefs.lastCallout = type
  writePrefs(prefs)
}

export function recordSlashCommand(key: string) {
  const prefs = readPrefs()
  const next = [key, ...prefs.recentSlashKeys.filter((k) => k !== key)].slice(0, MAX_RECENT)
  prefs.recentSlashKeys = next
  writePrefs(prefs)
}

export function getRecentSlashKeys(): string[] {
  return readPrefs().recentSlashKeys
}
