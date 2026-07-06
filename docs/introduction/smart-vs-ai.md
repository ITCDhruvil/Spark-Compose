# Smart editor vs AI

Spark Compose deliberately splits features into two layers. This keeps the product fast, predictable, and cost-aware.

## Smart features (no AI)

These run **on your device** or with deterministic logic. They do **not** call OpenAI and do **not** use API tokens.

| Examples | Why without AI |
|----------|----------------|
| Slash commands | User knows exact intent — no guesswork |
| Markdown shortcuts | Industry-standard patterns |
| Smart paste | Rule-based HTML/Markdown/CSV parsing |
| Local spell check | Instant fix on space; construction dictionary |
| Spark Chart (table → chart) | Math on table cells; Recharts render |
| Table / image / chart toolbars | Direct document operations |
| Command palette | Keyboard navigation |
| Block drag handle | Native editor commands |

**Problem they solve:** “I know what I want — just let me do it in one step.”

See: [Smart features index](../features/smart-features/README.md)

## AI features (Spark AI)

These send context to **server-side** `/api/ai/*` routes, which call OpenAI (or future providers).

| Examples | Why AI helps |
|----------|--------------|
| Improve / tone / translate | Language understanding |
| Summarize / explain | Compression and reframing |
| Draft / Ask | Generative content |
| Against brief | Semantic gap analysis |
| KPI widgets / progress analytics | Interpret messy project text |
| Grammar check (AI mode) | Contextual grammar beyond rules |
| Autocomplete | Predict next words/sentences |

**Problem they solve:** “I have rough content — help me polish, restructure, or generate.”

See: [AI features index](../features/ai-features/README.md)

## Spell check is special

| Mode | Type | Notes |
|------|------|-------|
| **Spelling** toggle | **Local** | Common typos + construction terms; no tokens |
| **Grammar** toggle | **AI** | Calls grammar API; uses tokens |

Both toggles live under **Spark AI** in the toolbar for discoverability, but spelling is intentionally **not** AI-powered.

## Design principle

```
Everyday action  →  smart feature (fast, free, offline-capable where possible)
Judgment / language task  →  Spark AI (confirm, undo, cost-tracked)
```

## Next step

→ [Roadmap](./roadmap.md)
