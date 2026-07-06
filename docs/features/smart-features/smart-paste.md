# Smart paste

## What it is

When you paste content from the clipboard, Spark Compose **detects the format** and converts it into proper editor blocks instead of dumping raw HTML or plain text.

## Problem it solves

- Pasting from **Word** often brings messy styling.
- Pasting **CSV** or tab-separated data should become a **table**.
- Pasting **Markdown** should become headings, lists, and tables.
- Structured **site reports** should map to sensible blocks.

## How to use

1. Copy content from Word, Excel, a web page, or a `.md` file.
2. Click in the editor.
3. Press **Ctrl+V** (or **Cmd+V** on Mac).

The editor chooses the best handler automatically.

## Supported behaviors (examples)

| Source | Typical result |
|--------|----------------|
| Tabular / CSV text | Table |
| Markdown | Headings, lists, tables, code |
| Word HTML | Cleaned paragraphs and lists |
| URLs | May become links (with link extension) |

## Notes

- Extension: `smart-paste.ts` with helpers in `paste-structure.ts`.
- No AI tokens — rule-based parsing.
- Very large pastes may take a moment to process.
