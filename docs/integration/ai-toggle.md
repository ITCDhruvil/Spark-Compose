# The `ai` toggle

Host apps can turn Spark AI (LLM) on or off with a single prop on `RichEditor`. This is the supported “plugin” switch for embedding.

## API

```ts
ai?: boolean | { enabled?: boolean }
```

| Value | Result |
|-------|--------|
| omitted / `true` / `{ enabled: true }` | Spark AI on (default — demo app) |
| `false` / `{ enabled: false }` | Spark AI off — smart features only |

```tsx
<RichEditor ai={false} />
```

Resolver: [`src/lib/editor/ai/plugin/ai-capabilities.ts`](../../src/lib/editor/ai/plugin/ai-capabilities.ts)

Context for child components: [`src/lib/editor/ai/plugin/editor-ai-context.tsx`](../../src/lib/editor/ai/plugin/editor-ai-context.tsx)

## What gets gated when AI is off

| Registration point | Behavior |
|--------------------|----------|
| TipTap extensions | Omits Ask nodes, AiIssues, AiAutocomplete, AiGrammarCheck, AiLoadingMark |
| Toolbar | Hides `AiDropdown` / Spark AI segment |
| Selection bubble | Format bar only (`SelectionFormatMenu`) — no Spark AI panel |
| Slash + command palette | Filters out `ask`, `draft`, `draft-coach` |
| Draft / Ask / enhance panels | Not mounted |
| Image menu | Hides AI Caption / AI Alt |
| Grammar hook | Skipped |
| Local spellcheck | **Still runs** (smart) |

Wiring lives mainly in [`src/components/editor/rich-editor.tsx`](../../src/components/editor/rich-editor.tsx).

## What this is / is not

| Is | Is not |
|----|--------|
| Runtime product toggle | Tree-shaking AI out of the JS bundle |
| Safe way to ship mobile without LLM | A separate npm package (yet) |
| Enough to avoid `/api/ai` traffic from the UI | Removing AI source folders from the repo |

Optional future work: lazy-load `ai/` only when enabled, or extract `@spark/editor-ai`.

## Demo checkbox

[`src/app/page.tsx`](../../src/app/page.tsx) has a **Spark AI** checkbox for local testing. Mobile hosts should hardcode `ai={false}` instead of exposing that control.

## Related docs

- [Mobile integration guide](./mobile-integration.md)
- [Smart vs AI](../introduction/smart-vs-ai.md)
- Root handoff note: [`EMBEDDING.md`](../../EMBEDDING.md)
