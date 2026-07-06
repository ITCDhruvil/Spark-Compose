# Callouts and blocks

## What it is

Structured **block types** beyond plain paragraphs — callouts, code, tasks, columns, comments.

## Problem it solves

Safety and QA content needs visual emphasis (warnings, info) and checklists without manual formatting every time.

## Block types

| Block | Insert via |
|-------|------------|
| **Callouts** (info, warning, error, success) | `/callout`, slash menu, toolbar |
| **Task lists** | `/checklist`, markdown `[ ] `, suggestions |
| **Code blocks** | ` ``` ` markdown, slash |
| **Horizontal rule** | `---` + Enter |
| **Columns** | Slash / layout commands where available |
| **Comments** | Toolbar — inline editor comments |
| **Ask / Answer blocks** | `/ask` — see [Ask](../ai-features/ask.md) |

## Notes

- Callout extension: `callout.ts`
- Task lists: TipTap TaskList + TaskItem
- Ask blocks are AI-powered but inserted as document blocks.
