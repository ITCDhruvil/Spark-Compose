# Command palette

## What it is

A searchable **command launcher** — like VS Code’s command palette — for editor actions without hunting the toolbar.

## Problem it solves

Power users and new users alike can run actions by **name** when they do not remember which icon to click.

## How to use

1. Press **Ctrl+Shift+P** (check shortcuts dialog for exact binding).
2. Type to filter commands (e.g. “image”, “find”, “focus”).
3. Press **Enter** to run.

### Example commands

- Insert link
- Find & replace
- Insert image
- Keyboard shortcuts help
- Embed video
- Insert callout
- Toggle focus mode
- Toggle spell check

## Notes

- Component: `command-palette.tsx`
- Actions are wired from `rich-editor.tsx`.
- Status bar hint: `Ctrl+Shift+P commands` on the editor footer.
