/** Slash command keys that require Spark AI (LLM). */
export const AI_SLASH_KEYS = ['ask', 'draft', 'draft-coach'] as const

export type AiSlashKey = (typeof AI_SLASH_KEYS)[number]

export type RichEditorAiConfig =
  | boolean
  | {
      enabled?: boolean
    }

/** Resolve host `ai` prop. Defaults to enabled so the demo app is unchanged. */
export function resolveAiEnabled(ai?: RichEditorAiConfig): boolean {
  if (ai === undefined) return true
  if (typeof ai === 'boolean') return ai
  if (ai.enabled === false) return false
  return true
}

export function isAiSlashKey(key: string | undefined): boolean {
  if (!key) return false
  return (AI_SLASH_KEYS as readonly string[]).includes(key)
}
