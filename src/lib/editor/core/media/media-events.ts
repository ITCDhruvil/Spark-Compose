/** Dispatched to open the Media picker modal (image, video, …). Used by `/media`. */
export const OPEN_MEDIA_EVENT = 'rich-editor:open-media'

export function openMediaModal() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OPEN_MEDIA_EVENT))
}
