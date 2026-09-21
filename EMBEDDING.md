# Embedding the rich editor (mobile & hosts)

> **Full guide for the mobile developer:** [docs/integration/mobile-integration.md](docs/integration/mobile-integration.md)  
> Also see: [docs/integration/README.md](docs/integration/README.md) · [docs/integration/ai-toggle.md](docs/integration/ai-toggle.md)

**Repo:** https://github.com/ITCDhruvil/Spark-Compose.git

This repo is a Next.js TipTap editor with two layers:

| Layer | Examples | Needs OpenAI? |
|-------|----------|---------------|
| **Smart** | `/` structure commands, markdown shortcuts, smart paste, Spark Chart (table → chart), local spelling, formatting | No |
| **Spark AI** | Ask, Draft, Improve, grammar AI, autocomplete, summarize/translate, AI image caption | Yes (`/api/ai/*`) |

See also [docs/introduction/smart-vs-ai.md](docs/introduction/smart-vs-ai.md).

## Disable Spark AI (recommended for mobile)

Mount the editor with AI turned off:

```tsx
import { RichEditor } from '@/components/editor'

<RichEditor
  ai={false}
  content={initialJsonOrHtml}
  onChange={(json, html) => { /* persist */ }}
/>
```

Equivalent object form:

```tsx
<RichEditor ai={{ enabled: false }} />
```

Default is `ai` enabled (demo app unchanged).

With `ai={false}`:

- No Spark AI toolbar, Ask/Draft panels, or AI selection actions
- Slash/palette omit `/ask`, `/draft`, `/draft-coach`
- TipTap Ask / grammar / autocomplete extensions are not registered
- No LLM calls are triggered from the editor UI
- **Still available:** `/` headings/lists/tables, smart paste, table → Spark Chart, local spelling, selection format bar, image resize/align

## How to ship this in a mobile app

TipTap is a **web** editor. Typical approach:

1. Run this Next app (or host the same React tree) and load it in a **WebView**.
2. Use `<RichEditor ai={false} />` so the WebView never advertises LLM features.
3. Do **not** set `OPENAI_API_KEY` in that environment. You can ignore or omit routes under `src/app/api/ai/`.

This is not a React Native native component library.

## Folder map (feature-named subfolders)

| Path | Role |
|------|------|
| `src/components/editor/core/<feature>/` | Toolbar, links, images, media, lists, dialogs, etc. |
| `src/components/editor/smart/<feature>/` | Slash commands, paste, tables, spark-chart, TOC, spell-check |
| `src/lib/editor/core/<feature>/` + `smart/<feature>/` | Smart logic (paste, slash, chart-from-table) |
| `src/components/editor/ai/<feature>/` | Spark AI UI + AI TipTap extensions |
| `src/lib/editor/ai/plugin/` | `ai` prop resolver + React context |
| `src/lib/editor/ai/<feature>/` | Ask, draft, writing-tools helpers |
| `src/app/api/ai/` | LLM API routes |
| `src/lib/api/ai-*.ts` | Client for those routes |
| `src/lib/server/ai/` | Prompts, OpenAI streaming, cost |
| `src/shared/ui/` | Shared dialogs / buttons |

Full tree: [docs/getting-started/project-structure.md](docs/getting-started/project-structure.md)

## Acceptance check

With `ai={false}`:

1. Toolbar has no Spark AI control.
2. `/ask` and `/draft` do not appear in the slash menu.
3. Selecting text shows the format bar only (no Spark AI panel).
4. Table → chart still works.
5. Network tab shows no `/api/ai/*` traffic from normal editing.
