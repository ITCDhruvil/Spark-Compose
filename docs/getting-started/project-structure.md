# Project structure

High-level map of the repository so you know where to look when changing something.

```
rich-editor/
├── docs/                    # Product documentation (you are here)
├── public/                  # Static assets
├── src/
│   ├── app/                 # Next.js App Router pages & API routes
│   │   ├── page.tsx         # Home — main editor
│   │   ├── cost/            # Cost dashboard page
│   │   └── api/
│   │       ├── ai/          # Spark AI API endpoints
│   │       ├── cost/        # Usage & pricing APIs
│   │       └── uploads/     # Image upload
│   ├── components/
│   │   ├── editor/          # Editor UI, extensions, menus
│   │   │   ├── ai/          # Spark AI menus, hooks, cards
│   │   ├── extensions/      # TipTap node views & extensions
│   │   └── cost/            # Cost dashboard components
│   └── lib/
│       ├── api/             # Client-side API wrappers
│       ├── editor/          # Editor utilities (paste, tables, spell, etc.)
│       ├── server/ai/       # Server prompts, cost tracking
│       └── store/           # Zustand stores (AI toggles, TOC, etc.)
├── .env.example             # Template for environment variables
├── .env.local               # Your local secrets (not in Git)
├── package.json
└── next.config.ts
```

## Key files for new developers

| If you want to… | Look at |
|-----------------|---------|
| Change the main editor | `src/components/editor/rich-editor.tsx` |
| Add a TipTap extension | `src/components/editor/extensions/` |
| Add an AI API route | `src/app/api/ai/<feature>/route.ts` |
| Add AI prompt text | `src/lib/server/ai/prompts.ts` |
| Add slash command | `src/components/editor/slash-command-items.tsx` |
| Spark AI toolbar menu | `src/components/editor/ai/ai-dropdown.tsx` |
| Selection bubble menu | `src/components/editor/ai/ai-selection-menu.tsx` |
| Table floating toolbar | `src/components/editor/table-menu.tsx` |
| Chart blocks | `src/components/editor/extensions/chart-block.ts` |
| Local spell check | `src/components/editor/extensions/ai-spellcheck.ts` |
| Construction terms | `src/lib/editor/construction-terms.ts` |

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

→ [Troubleshooting](./troubleshooting.md) or [Introduction](../introduction/overview.md)
