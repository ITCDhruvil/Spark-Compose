# Embedding the rich editor (mobile & hosts)

This repo is a Next.js TipTap editor with two layers:

| Layer | Examples | Needs OpenAI? |
|-------|----------|---------------|
| **Smart** | `/` structure commands, markdown shortcuts, smart paste, Spark Chart (table → chart), local spelling, formatting | No |
| **Spark AI** | Ask, Draft, Improve, grammar AI, autocomplete, summarize/translate, AI image caption | Yes (`/api/ai/*`) |

See also [docs/introduction/smart-vs-ai.md](docs/introduction/smart-vs-ai.md).

## Disable Spark AI (recommended for mobile)

Mount the editor with AI turned off:

```tsx
import { RichEditor } from '@/components/editor/rich-editor'

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

## Folder map (for later extraction)

| Path | Role |
|------|------|
| `src/components/editor/` + `src/lib/editor/` | Editor UI + smart logic |
| `src/components/editor/ai/` | Spark AI UI + hooks |
| `src/app/api/ai/` | LLM API routes |
| `src/lib/api/ai-*.ts` | Client for those routes |
| `src/lib/server/ai/` | Prompts, OpenAI streaming, cost |
| `src/lib/editor/ai-capabilities.ts` | Host `ai` prop resolver |

## Acceptance check

With `ai={false}`:

1. Toolbar has no Spark AI control.
2. `/ask` and `/draft` do not appear in the slash menu.
3. Selecting text shows the format bar only (no Spark AI panel).
4. Table → chart still works.
5. Network tab shows no `/api/ai/*` traffic from normal editing.
