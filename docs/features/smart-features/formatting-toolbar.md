# Formatting toolbar

## What it is

The **top ribbon** with bold, italic, lists, alignment, fonts, colors, links, and the **Spark AI** dropdown.

## Problem it solves

Standard rich-text formatting must stay one click away for users who do not use shortcuts.

## Highlights

- Undo / redo
- Headings, lists (with style previews), indentation
- Font family, font size popover
- Text color, highlight, sub/superscript
- Links, images, tables, callouts, embeds
- Comments, spell check browser toggle
- **Spark AI** ribbon — all AI toggles and feature catalog
- Overflow **More** menu when the window is narrow

## Notes

- `editor-toolbar.tsx` with responsive overflow (`use-toolbar-overflow.ts`)
- Spark AI entry: `ai-dropdown.tsx`
