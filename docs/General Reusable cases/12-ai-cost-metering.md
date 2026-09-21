# 12. Enterprise AI cost metering & usage controls

## Problem statement

LLM features can become expensive and unauditable. Enterprises need per-user / per-feature cost visibility, budgets, and kill switches before wide rollout.

## What already exists

- Cost dashboard page (`/cost`)
- Local cost log store (`.data/ai-cost-logs.json`)
- Feature/user headers (`x-ai-feature`, `x-user-id`)
- Pricing helpers for OpenAI models

## How it should be done

1. Persist cost logs in a real database keyed by tenant/user/feature.
2. Authenticate users; stop trusting client-only `x-user-id`.
3. Enforce quotas / rate limits before calling OpenAI.
4. Expose admin dashboards and alerts on spend spikes.

## Tweaks & new features

- Budget policies and soft/hard caps
- Chargeback reports by project
- Feature flags per tenant

## Real-world outcomes

- Safe enterprise AI rollout with financial control
- Reusable metering layer for any product embedding Spark AI
