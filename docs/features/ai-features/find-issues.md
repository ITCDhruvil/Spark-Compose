# Find issues

## What it is

Scans **selected text** (or document section) for writing issues — clarity, accuracy, consistency — and shows them **in the document** as an issues block with fix actions.

## Problem it solves

Manual proofreading misses vague claims, contradictions, and weak phrasing. A structured issue list is faster than reading line-by-line.

## How to use

1. Select text.
2. Selection menu → **Find issues**.
3. Review listed issues in the editor block.
4. Apply individual fixes or **Fix all** where offered.

## Notes

- Panel: `use-find-issues-panel.ts`, `ai-issues-view.tsx`
- API: `/api/ai/find-issues`
- Uses AI tokens.
- Complements [grammar check](./grammar-check.md) (line-level) with document-level review.
