/** Slash + keyboard hints shown in the command palette (by slash command key). */
export const SLASH_COMMAND_SHORTCUTS: Record<string, string[]> = {
  ask: ['/ask'],
  draft: ['/draft'],
  media: ['/media'],
  'heading-1': ['/h1', 'Ctrl+Alt+1'],
  'heading-2': ['/h2', 'Ctrl+Alt+2'],
  'heading-3': ['/h3', 'Ctrl+Alt+3'],
  'bullet-list': ['- + Space', 'Ctrl+Shift+8'],
  'numbered-list': ['1. + Space', 'Ctrl+Shift+7'],
  checklist: ['/checklist5', '[] + Space'],
  quote: ['> + Space'],
  'code-block': ['``` + Space'],
  table: ['/table3x3', 'Ctrl+Alt+T'],
  divider: ['---'],
  'callout-info': ['/calloutinfo'],
  'callout-warning': ['/calloutwarning'],
  'callout-error': ['/callouterror'],
  'callout-success': ['/calloutsuccess'],
  video: ['paste URL'],
}

export const PALETTE_EDITOR_SHORTCUTS: Record<string, string[]> = {
  'table-last': ['/table', 'Ctrl+Alt+T'],
  'callout-last': ['/callout'],
  link: ['Ctrl+K'],
  find: ['Ctrl+F'],
  'block-up': ['Ctrl+Shift+↑'],
  'block-down': ['Ctrl+Shift+↓'],
  'block-dup': ['Ctrl+Shift+D'],
  'block-del': ['Ctrl+Shift+Backspace'],
  shortcuts: ['?'],
}
