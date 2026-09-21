# Project structure

High-level map of the repository so you know where to look when changing something.

The editor is organized by **feature layer** (`core` / `smart` / `ai`), then by **product feature name** (matching `docs/features/`).

```
Spark-Compose/
├── docs/                         # Product + integration documentation
├── EMBEDDING.md                  # Short mobile handoff note
├── public/                       # Static assets
├── src/
│   ├── app/                      # Next.js App Router pages & API routes
│   │   ├── page.tsx              # Home — mounts <RichEditor />
│   │   ├── cost/                 # Cost dashboard page
│   │   └── api/
│   │       ├── ai/               # Spark AI HTTP adapters (thin routes)
│   │       ├── cost/             # Usage & pricing APIs
│   │       └── uploads/          # Image upload
│   ├── components/
│   │   ├── editor/               # TipTap editor
│   │   │   ├── rich-editor.tsx   # Composition root (`ai` prop toggle)
│   │   │   ├── index.ts          # Public export: RichEditor
│   │   │   ├── core/
│   │   │   │   ├── toolbar/      # editor-toolbar, more-menu, popovers, export
│   │   │   │   ├── formatting/   # font-size, heading-style, color-picker, list utils
│   │   │   │   ├── links/        # link-dialog
│   │   │   │   ├── images/       # image-dialog, image-menu, resizable-image ext
│   │   │   │   ├── media/        # media-dialog, embed-dialog, video-embed ext
│   │   │   │   ├── callouts/     # callout ext
│   │   │   │   ├── comments/     # comment-dialog, editor-comment ext
│   │   │   │   ├── find-replace/ # find-replace dialog + util
│   │   │   │   ├── lists/        # list-style, block-indent exts
│   │   │   │   ├── drag-handle/  # drag-handle, empty-line-hint, autosave
│   │   │   │   ├── dialogs/      # use-editor-dialogs orchestrator
│   │   │   │   └── shortcuts/    # keyboard-shortcuts-dialog
│   │   │   ├── smart/
│   │   │   │   ├── slash-commands/    # slash-*, command-palette
│   │   │   │   ├── smart-paste/       # smart-paste + tests
│   │   │   │   ├── markdown-shortcuts/# markdown + block shortcut exts
│   │   │   │   ├── tables/            # table-menu, table-grid-picker
│   │   │   │   ├── spark-chart/       # chart-block*, charts/, kpi-row*
│   │   │   │   ├── document-outline/  # toc-* + toc-block ext
│   │   │   │   ├── spell-check/       # ai-spellcheck (local)
│   │   │   │   └── selection-format/  # selection-format-bar
│   │   │   └── ai/
│   │   │       ├── toolbar/           # ai-dropdown, ai-toggle-row, selection-ai-toggles
│   │   │       ├── selection/         # ai-selection-menu, rewrite/improve/summarize hooks
│   │   │       ├── ask/               # ask cards + ask TipTap extensions
│   │   │       ├── draft/             # conversational draft, draft-enhance, guided draft
│   │   │       ├── autocomplete/      # ai-autocomplete ext
│   │   │       ├── grammar-check/     # ai-grammar-check
│   │   │       ├── find-issues/       # ai-issues + use-find-issues-panel
│   │   │       ├── analytics/         # use-analytics-tools, analytics-features
│   │   │       └── shared/            # ai-loading-mark, use-ai-tools, upcoming-features
│   │   └── cost/                 # Cost dashboard components
│   ├── lib/
│   │   ├── editor/
│   │   │   ├── core/
│   │   │   │   ├── preferences/       # editor-preferences
│   │   │   │   ├── formatting/        # font-size-utils, heading-*, selection-transforms
│   │   │   │   ├── images/            # image-meta
│   │   │   │   └── media/             # media-events
│   │   │   ├── smart/
│   │   │   │   ├── slash-commands/    # slash-parser, suggestions, command-shortcuts
│   │   │   │   ├── smart-paste/       # paste-*
│   │   │   │   ├── spark-chart/       # chart-from-table, table-data
│   │   │   │   ├── document-outline/  # toc-*
│   │   │   │   └── spell-check/       # spell-dictionary, common-typos, construction-terms
│   │   │   └── ai/
│   │   │       ├── plugin/            # ai-capabilities, editor-ai-context
│   │   │       ├── ask/                 # stream-ask, ask-bot-events, lexical-to-tiptap
│   │   │       ├── draft/               # draft-*, guided-draft-*, playbooks
│   │   │       ├── writing-tools/       # tone-options, translate-languages
│   │   │       └── shared/              # ai-loading-text
│   │   ├── api/                  # Client wrappers (ai-client, types)
│   │   ├── server/ai/            # Prompts, OpenAI streaming, cost
│   │   └── store/                # Zustand (AI toggles, TOC)
│   └── shared/
│       └── ui/                   # Dialog, cancel/confirm buttons
├── .env.example
├── package.json
└── next.config.ts
```

## Dependency rule

```
app → rich-editor.tsx → core + smart (+ ai when enabled)
                     ↘ lib/editor/{core,smart,ai}
```

`core` must **not** import from `smart` or `ai`. Only `rich-editor.tsx` assembles optional AI.

## Key files for new developers

| If you want to… | Look at |
|-----------------|---------|
| Change the main editor | `src/components/editor/rich-editor.tsx` |
| Import the editor (hosts) | `src/components/editor` (`RichEditor`) |
| Toggle Spark AI off | `ai={false}` prop — see [AI toggle](../integration/ai-toggle.md) |
| Add a base TipTap extension | `src/components/editor/core/<feature>/extensions/` |
| Add a smart TipTap extension | `src/components/editor/smart/<feature>/extensions/` |
| Add an AI TipTap extension | `src/components/editor/ai/<feature>/extensions/` |
| Add a slash command | `src/components/editor/smart/slash-commands/slash-command-items.tsx` |
| Smart paste logic | `src/components/editor/smart/smart-paste/` + `src/lib/editor/smart/smart-paste/` |
| Table → chart | `src/lib/editor/smart/spark-chart/chart-from-table.ts` |
| Spark AI toolbar menu | `src/components/editor/ai/toolbar/ai-dropdown.tsx` |
| Selection bubble (AI) | `src/components/editor/ai/selection/ai-selection-menu.tsx` |
| Selection format only | `src/components/editor/smart/selection-format/selection-format-bar.tsx` |
| Add an AI API route | `src/app/api/ai/<feature>/route.ts` |
| Add AI prompt text | `src/lib/server/ai/prompts.ts` |
| Local spell check | `src/components/editor/smart/spell-check/extensions/ai-spellcheck.ts` |
| AI plugin toggle resolver | `src/lib/editor/ai/plugin/ai-capabilities.ts` |

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| UI | React 19 RC, Tailwind CSS |
| Editor | TipTap 3 / ProseMirror |
| Charts | Recharts |
| State | Zustand |
| Tests | Vitest, Testing Library |
| AI | OpenAI (server-side routes) |

## Data flow (AI features)

```
Browser (editor UI)
    → fetch /api/ai/*
        → route handler (src/app/api/ai/)
            → prompts + OpenAI
            → cost logging
        ← JSON response
    ← insert / replace in editor
```

AI keys never leave the server.

## Next step

→ [Troubleshooting](./troubleshooting.md) · [Mobile integration](../integration/mobile-integration.md) · [Introduction](../introduction/overview.md)
