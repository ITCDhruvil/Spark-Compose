# Integration & embedding

This section is for developers who want to **embed the Spark Compose editor into another app** (for example, a mobile app) — especially **without the AI features**.

If you were handed this repo to add the editor into a mobile app, start here.

## Documents

| Doc | What it covers |
|-----|----------------|
| [Mobile integration guide](./mobile-integration.md) | Full walkthrough: clone, run, embed in a WebView, disable AI |
| [The `ai` toggle](./ai-toggle.md) | Exactly what turns on/off, the `ai` prop API, and how it is wired |
| [Smart vs AI features](../introduction/smart-vs-ai.md) | Which features need an LLM and which run locally |

## The 30-second version

1. Clone the repo (link in the [mobile integration guide](./mobile-integration.md)).
2. Mount the editor with AI turned off:

```tsx
<RichEditor ai={false} content={content} onChange={handleChange} />
```

3. Do **not** set `OPENAI_API_KEY`. Ignore everything under `src/app/api/ai/`.
4. You still get slash commands, smart paste, tables, table-to-chart, local spelling, and all formatting.

## Important: this is a web editor

Spark Compose is built on **TipTap / ProseMirror + React (Next.js)**. It is a **web** editor, not a set of native React Native components. The supported mobile path is to host the web editor and load it inside a **WebView**. See the [mobile integration guide](./mobile-integration.md) for details.
