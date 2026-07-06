# Markdown shortcuts

## What it is

**Line-start autoformat** — type familiar Markdown markers at the beginning of a line, then press **Space** or **Enter**, and the editor converts them to rich blocks.

## Problem it solves

Users who know Markdown (or Notion-style shortcuts) can format without leaving the keyboard or opening menus.

## How to use

| You type | You get |
|----------|---------|
| `# ` … | Heading 1 |
| `## ` … | Heading 2 |
| `### ` … | Heading 3 (up to `######`) |
| `- ` or `* ` + space | Bullet list |
| `1. ` + space | Numbered list |
| `[ ] ` + space | Task / checklist item |
| `> ` + space | Blockquote |
| `---` or `***` + Enter | Horizontal rule |
| ` ``` ` + space | Code block |
| ` ```js ` + space | Code block with language |

## Notes

- Extension: `markdown-shortcuts.ts`
- Works on **new lines** at line start; does not replace full-document Markdown import.
- Complements [slash commands](./slash-commands.md) — use whichever you prefer.
