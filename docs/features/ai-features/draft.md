# Draft

## What it is

**Generate new document content** from a brief — topic, audience, tone, and construction context — via the **Draft Anything** / construction draft flow.

## Problem it solves

Starting from a blank page for method statements, emails, or site updates is slow. Users describe what they need and insert a draft to edit.

## How to use

1. **Selection menu → Draft**, or slash **`/draft`**, or Draft card from toolbar flows.
2. Fill in:
   - What to write about
   - Audience / document type (where shown)
   - Optional constraints
3. **Generate** → review → **Insert** into editor.

## Notes

- API: `/api/ai/construction-draft`, `/api/ai/ask-draft`
- UI: `ai-draft-anything-card.tsx`, `ai-ask-flow-card.tsx`
- Marked **New** in Spark AI catalog.
- Always review for site-specific accuracy before issuing formally.
