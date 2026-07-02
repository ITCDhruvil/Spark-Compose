export const FONT_FAMILIES = [
  { label: 'Default', value: '' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Calibri', value: 'Calibri, sans-serif' },
  { label: 'Cambria', value: 'Cambria, serif' },
  { label: 'Comic Sans MS', value: '"Comic Sans MS", cursive' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Garamond', value: 'Garamond, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Impact', value: 'Impact, sans-serif' },
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Lucida Console', value: '"Lucida Console", monospace' },
  { label: 'Palatino', value: '"Palatino Linotype", Palatino, serif' },
  { label: 'Segoe UI', value: '"Segoe UI", sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
] as const

export const FONT_SIZES = [
  { label: '8', value: '8pt' },
  { label: '9', value: '9pt' },
  { label: '10', value: '10pt' },
  { label: '11', value: '11pt' },
  { label: '12', value: '12pt' },
  { label: '14', value: '14pt' },
  { label: '16', value: '16pt' },
  { label: '18', value: '18pt' },
  { label: '20', value: '20pt' },
  { label: '24', value: '24pt' },
  { label: '28', value: '28pt' },
  { label: '36', value: '36pt' },
  { label: '48', value: '48pt' },
] as const

export const TEXT_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9',
] as const

export const HIGHLIGHT_COLORS = [
  '#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#ff0000', '#0000ff',
  '#fce5cd', '#fff2cc', '#d9ead3', '#cfe2f3', '#d9d2e9', '#eeeeee',
] as const

export const IMAGE_WIDTHS = [
  { label: '25%', value: '25' },
  { label: '50%', value: '50' },
  { label: '75%', value: '75' },
  { label: '100%', value: '100' },
] as const

export const EDITOR_SHORTCUTS = [
  { keys: 'Ctrl+B', action: 'Bold' },
  { keys: 'Ctrl+I', action: 'Italic' },
  { keys: 'Ctrl+U', action: 'Underline' },
  { keys: 'Ctrl+Z', action: 'Undo' },
  { keys: 'Ctrl+Y / Ctrl+Shift+Z', action: 'Redo' },
  { keys: 'Ctrl+K', action: 'Insert link' },
  { keys: 'Ctrl+F', action: 'Find & replace' },
  { keys: '@', action: 'Mention user' },
  { keys: '/', action: 'Slash commands' },
  { keys: 'Ctrl+Shift+8', action: 'Bullet list' },
  { keys: 'Ctrl+Shift+7', action: 'Numbered list' },
  { keys: 'Tab', action: 'Indent list item' },
  { keys: 'Shift+Tab', action: 'Outdent list item' },
  { keys: 'Ctrl+Shift+X', action: 'Strikethrough' },
  { keys: 'Ctrl+E', action: 'Inline code' },
  { keys: 'Ctrl+Alt+1–4', action: 'Heading 1–4' },
  { keys: 'Ctrl+Shift+H', action: 'Highlight' },
  { keys: 'Ctrl+\\', action: 'Clear formatting' },
] as const
