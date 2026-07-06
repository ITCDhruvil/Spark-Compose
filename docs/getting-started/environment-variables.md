# Environment variables

Environment variables are settings the app reads when it starts. They live in `.env.local` at the project root.

## Quick setup

1. Copy `.env.example` → `.env.local`
2. Add your OpenAI API key
3. Restart the dev server if it was already running

## Variables

| Variable | Required? | Description |
|----------|-----------|-------------|
| `OPENAI_API_KEY` | **Yes** (for AI) | Server-side OpenAI key. Never exposed to the browser. |
| `OPENAI_MODEL` | No | Default chat model. Falls back to project default if unset. |
| `OPENAI_AUTOCOMPLETE_MODEL` | No | Model used for ghost-text autocomplete. |
| `NEXT_PUBLIC_API_URL` | No | Override API base URL (default: same-origin `/api`). |

## Example `.env.local`

```env
OPENAI_API_KEY=sk-proj-xxxxxxxx

# Optional overrides
# OPENAI_MODEL=gpt-4o-mini
# OPENAI_AUTOCOMPLETE_MODEL=gpt-4o-mini
```

## Important rules

1. **Never commit `.env.local`** — it is in `.gitignore`.
2. **Never put API keys in client code** — all AI calls go through `/api/ai/*` routes on the server.
3. **Restart after changes** — Next.js reads env files at startup. After editing `.env.local`, stop and run `npm run dev` again.

## Running without an API key

The editor UI loads and **smart features** (slash commands, paste, tables, local spell check) work without a key. **Spark AI** features that call the API will error until `OPENAI_API_KEY` is set.

## Next step

→ [Running locally](./running-locally.md)
