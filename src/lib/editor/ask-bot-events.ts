/** Dispatched to open the construction Ask bot (`/ask`). */
export const OPEN_ASK_BOT_EVENT = 'rich-editor:open-ask-bot'

export function openAskBot() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OPEN_ASK_BOT_EVENT))
}
