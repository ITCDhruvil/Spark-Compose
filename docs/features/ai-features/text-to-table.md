# Text to table

## What it is

Converts **selected unstructured text** into a **structured table** using AI to detect rows and columns.

## Problem it solves

Pasted lists, email snippets, or bullet dumps should become proper tables without manual cell entry.

## How to use

1. Select the text (CSV-like, tab-separated, or list-like content works best).
2. Selection menu → **To table**.
3. Confirm the inserted table; edit cells as needed.

## Notes

- API: `/api/ai/text-to-table`
- Hook: `use-ai-tools.ts` → `textToTable`
- Different from [smart paste](../smart-features/smart-paste.md) (rule-based) — this is for messier prose.
