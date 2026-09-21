# 15. White-label SaaS document workspace

## Problem statement

ISVs and enterprises want a branded document product (editor + AI + templates + storage) under their own name, not a one-off demo app.

## What already exists

- Full Next.js editor app + AI APIs + cost page
- Feature-layered architecture (`core` / `smart` / `ai`)
- Embedding and AI toggle for hosts
- Rich docs for features and integration

## How it should be done

1. Package `RichEditor` + API routes as a product module.
2. Add multi-tenant auth, document DB, backup, and collaboration (Yjs wired).
3. Brand via theme, domain, and feature flags.
4. Close enterprise gaps: validation, rate limits, secure uploads, CI/CD, observability, audit/PII.

## Tweaks & new features

- Tenant admin console (users, glossaries, playbooks, budgets)
- Document library + versioning + backup
- Real-time co-editing and comments workflow

## Real-world outcomes

- Sell or deploy Spark Compose as a white-label workspace
- Reuse one codebase across many branded customer deployments
