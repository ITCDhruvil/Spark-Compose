# Suggestions

## What it is

AI **structure suggestions** for paragraphs or the whole document — headings, subtitles, bullet lists, numbered lists, checklists.

## Problem it solves

Users write paragraphs but need help turning content into scannable structure (titles, lists) without manual reformatting.

## How to use

1. Place cursor in a paragraph **or** use **Auto** for full document.
2. Selection menu → **Suggestions** → pick:
   - **Auto** — structure entire document
   - **Heading** / **Subtitle**
   - **Bullet points** / **Number list** / **Check box**
3. Review inserted structure; undo if needed.

## Notes

- Hook: `use-suggest-block.ts`
- API: `/api/ai/auto-structure`, `/api/ai/suggest-heading`
- **Auto** ignores selection and reads full doc — use carefully on long documents.
