# 1. Embeddable smart editor (WebView / host apps)

## Problem statement

Host products (mobile apps, portals, LMS, CRM) need a polished rich-text surface without rebuilding TipTap/ProseMirror or shipping LLM features into every environment. Many hosts want formatting, paste cleanup, tables, and charts — but must keep AI off for cost, compliance, or offline constraints.

## What already exists

- `<RichEditor ai={false} />` (and `ai={{ enabled: false }}`)
- Smart layer: slash commands, markdown shortcuts, smart paste, Spark Chart, local spell-check, TOC
- Public export via `src/components/editor`
- Integration docs: `EMBEDDING.md`, `docs/integration/mobile-integration.md`

## How it should be done

1. Mount `RichEditor` in a host page or WebView with `ai={false}`.
2. Pass `content` / `onChange` so the host owns persistence (API, DB, or native storage).
3. Omit `OPENAI_API_KEY` in that environment; ignore `/api/ai/*` routes.
4. Optionally theme via CSS variables / Tailwind to match the host brand.
5. Add a thin host bridge (postMessage) for save, load, and file pickers if needed.

## Tweaks & new features

- Host SDK wrapper (save/load events, auth token injection)
- Theme tokens and read-only / review modes
- Offline-first content cache for field apps

## Real-world outcomes

- Faster embedding of a production-grade editor into existing products
- Lower risk and cost by shipping smart features without LLM dependency
