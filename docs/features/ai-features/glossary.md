# Glossary

## What it is

Enforces **preferred terminology** across the **full document** — e.g. “RFI” not “rfi”, company product names, standard phrases.

## Problem it solves

Large reports drift in terminology; brand and compliance require consistent terms.

## How to use

1. Selection menu → **Glossary** (document-wide operation).
2. AI suggests/applies replacements per your glossary rules.
3. **Undo** window available if batch replace is wrong.

## Notes

- API: `/api/ai/glossary`
- Snapshots document before apply for undo (`use-ai-tools.ts`).
- Configure glossary source in prompts/server as project evolves.
