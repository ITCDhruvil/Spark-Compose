# Grammar check

## What it is

**AI-powered grammar and punctuation** suggestions shown as underlines in the editor. Hover for a fix; click **Replace** to apply.

## Problem it solves

Spelling fixes single words; grammar needs **sentence context** (agreement, punctuation, clarity).

## How to use

1. **Spark AI → Grammar** → ON.
2. Keep typing. Issues appear as underlines:
   - **Amber** — grammar
   - **Blue** — punctuation
3. Hover the underline → popup with suggestion → **Replace**.

Spelling is handled separately by [spell check](./spell-check.md) (local, no AI).

## Notes

- Extension: `ai-grammar-check.tsx`
- API: `/api/ai/grammar-check`
- Uses OpenAI tokens — tracked on cost dashboard.
- Toggle off when drafting freely to avoid noise.
