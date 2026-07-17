# Draft

## What it is

**Conversational interview → guided writing in the editor.** After Q&A, the AI proposes a **real-time outline** from your story (not a fixed template). You write section by section; the assistant guides and can optionally polish a finished section.

## Problem it solves

One-shot “generate whole article” loses the author’s voice. Guided draft keeps learning + writing together.

## How to use

1. Slash **`/draft`** — pick a type and talk through the story (chips or free text).
2. When ready, review the **summary table** + **editable outline** (add/remove sections; pick impact suggestions).
3. **Start writing together** → editor opens guided mode:
   - Title: Confirm / Suggest another / Custom
   - Each section: what to write + how to write (you write in your tone)
   - Optional **Improve section** or skip to the next
4. Later, **`/draft-coach`** can still suggest knowledge enhancements on the full doc.

## Architecture

- Interview: `POST /api/ai/ask-draft` (tools + playbook WHYs + live `outline`)
- Guided writing: `POST /api/ai/draft-guide` (`proposeOutline`, `suggestTitles`, `sectionGuide`, `improveSection`)
- UI: conversational dialog → [`ai-guided-draft-panel.tsx`](../../../src/components/editor/ai/ai-guided-draft-panel.tsx)

## Notes

- No full `construction-draft` dump in the default path anymore.
- Always review for site-specific accuracy.
