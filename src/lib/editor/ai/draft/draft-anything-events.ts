/** Dispatched to open the Draft flow (type → questions → draft). Used by `/draft`. */
export const OPEN_DRAFT_ANYTHING_EVENT = 'rich-editor:open-draft-anything'

export function openDraftAnything() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OPEN_DRAFT_ANYTHING_EVENT))
}

/** @deprecated Use openDraftAnything — opens the Ask flow, not the full form. */
export const openAskFlow = openDraftAnything

export const OPEN_DRAFT_ENHANCE_EVENT = 'rich-editor:open-draft-enhance'

export interface DraftEnhanceEventDetail {
  brief?: string
  topic?: string
  contentType?: string
  audience?: string
}

/** Show the full-width draft enhancement / knowledge suggestion strip. */
export function openDraftEnhance(detail?: DraftEnhanceEventDetail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OPEN_DRAFT_ENHANCE_EVENT, { detail: detail ?? {} }))
}
