# Slash commands

## What it is

Type `/` at the start of a line (or after a space) to open a **command menu**. Pick an item or keep typing to filter — e.g. `/table3x3`, `/h2 Site update`, `/draft`.

## Problem it solves

Inserting tables, callouts, headings, and media usually takes multiple toolbar clicks. Slash commands reduce that to **one typed phrase**.

## How to use

1. Click in the editor where you want the new block.
2. Type `/`.
3. Type to filter or use arrow keys.
4. Press **Enter** or click a command.

### Examples

| Type | Result |
|------|--------|
| `/table` | Default 3×3 table with header |
| `/table4x6` or `/table 4x6` | 4 rows × 6 columns |
| `/table3x3header` | Table with header row |
| `/h1`, `/h2`, `/h3` | Heading level |
| `/h2 Weekly report` | Heading with title text |
| `/callout warning` | Warning callout block |
| `/checklist5` | Task list with 5 items |
| `/draft` | Open Draft flow |
| `/ask` | Insert Ask block |

Recent commands appear at the top of the menu.

## Notes

- Implemented in `slash-commands.tsx` and `slash-command-parser.ts`.
- Parameterized forms like `/table3x3` work with or without spaces (`/table 3x3`).
- Does **not** use AI.
