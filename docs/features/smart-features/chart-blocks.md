# Chart blocks

## What it is

Charts inserted via **Spark Chart** live as first-class **chart blocks** in the document — not screenshots.

## Problem it solves

Charts should be selectable, deletable, and lightly editable without leaving the editor.

## How to use

1. **Select** — click the chart; blue outline appears.
2. **Edit title** — when selected, click the title line and type; **Enter** or blur to save.
3. **Change type** — toolbar above chart: click the type tag (e.g. “Line”) → pick another type.
4. **Delete** — trash icon in the same toolbar.

Toolbar scrolls **with** the chart (anchored inside the block).

## Notes

- TipTap node: `chartBlock` (`chart-block.ts`, `chart-block-view.tsx`)
- Toolbar: `chart-block-toolbar.tsx`
- Data is stored in node attributes (labels, datasets JSON).
