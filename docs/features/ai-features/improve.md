# Improve

## What it is

Rewrites the **selected text** for better grammar, clarity, and flow. Result appears below the selection with **Keep** / **Discard** / **Undo**.

## Problem it solves

Rough site notes need polishing before sending to client or filing — without rewriting from scratch.

## How to use

1. **Select** the text to improve.
2. Open the **selection menu** (Spark AI bubble) or use toolbar flow.
3. Click **Improve**.
4. Review the suggestion → **Keep** or **Discard**.

## Notes

- Hook: `use-improve-selection.ts`
- API: `/api/ai/rewrite` (improve mode)
- Streams in some flows for faster feedback.
- Always confirm before replacing original.
