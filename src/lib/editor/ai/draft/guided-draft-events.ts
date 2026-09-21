import type { AskDraftPlan } from '@/lib/api/ai-types'

export const OPEN_GUIDED_DRAFT_EVENT = 'rich-editor:open-guided-draft'

export interface GuidedDraftEventDetail {
  plan: AskDraftPlan
}

/** Open guided writing mode (title → sections) after conversational Q&A. */
export function openGuidedDraft(plan: AskDraftPlan) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(OPEN_GUIDED_DRAFT_EVENT, { detail: { plan } satisfies GuidedDraftEventDetail }),
  )
}
