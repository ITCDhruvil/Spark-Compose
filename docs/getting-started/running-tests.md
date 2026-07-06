# Running tests

The project uses **Vitest** for unit tests.

## Run all tests once

```bash
npm run test
```

Vitest compiles and runs test files (typically `*.test.ts` / `*.test.tsx` under `src/`).

## What gets tested

Examples of covered areas:

- Slash command parsing
- Chart-from-table utilities
- AI client helpers
- Editor preferences and paste logic
- Component behavior (dropdown, autocomplete, etc.)

## Run a single test file

```bash
npx vitest run src/lib/editor/chart-from-table.test.ts
```

## Watch mode (during development)

```bash
npx vitest
```

Vitest re-runs tests when files change.

## Linting

```bash
npm run lint
```

Uses Next.js ESLint config.

## Next step

→ [Project structure](./project-structure.md)
