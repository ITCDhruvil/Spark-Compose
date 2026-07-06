# Summarize

## What it is

Produces a **shorter version** of selected text at three lengths: Short, Medium, Detailed.

## Problem it solves

Long site diaries and meeting notes need executive summaries or email intros without re-reading everything.

## How to use

1. Select text to summarize.
2. Selection menu → **Summarize** → choose length.
3. Summary inserts below; options to regenerate or revert original.

## Notes

- API: `/api/ai/summarize`
- Hook: summarize flow in `ai-selection-menu.tsx`
- Undo timer on confirm flows.
