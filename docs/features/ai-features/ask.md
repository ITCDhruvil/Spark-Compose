# Ask

## What it is

**In-document Q&A blocks** — type a construction question in the editor; AI answers inline without leaving the document.

## Problem it solves

Quick factual or procedural questions while writing (“What is a hold point?”) should not require switching to a separate chat app.

## How to use

1. Slash **`/ask`** or Selection menu → **Ask** (Insert section).
2. Type your question ending with `.` or `?`.
3. Submit → answer appears in linked **Answer** block below.
4. Optional: **Improve question** on the prompt block.

## Notes

- Blocks: `ask-blocks.ts`, `ask-prompt-view.tsx`, `ask-answer-view.tsx`
- API: `/api/ai/ask`
- For full long-form generation, use [Draft](./draft.md) instead.
