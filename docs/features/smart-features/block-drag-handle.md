# Block drag handle

## What it is

A **grip handle** appears beside blocks when you hover near the left margin. Use it to move, duplicate, convert, or delete whole blocks.

## Problem it solves

Reordering sections in long reports is painful with cut-paste alone. Block-level handles match modern editors (Notion, Google Docs outline drag).

## How to use

1. Hover to the left of a paragraph, heading, or block.
2. Click the **⋮⋮** grip to open the menu, or drag to reorder.
3. Menu options typically include:
   - **Convert** — paragraph ↔ heading ↔ list ↔ callout, etc.
   - **Duplicate**
   - **Delete**
   - **Insert** image / video (where configured)

## Notes

- Component: `editor-drag-handle.tsx`
- Uses TipTap drag-handle extension.
- Does not use AI.
