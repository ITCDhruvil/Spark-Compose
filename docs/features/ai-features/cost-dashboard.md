# Cost dashboard

## What it is

**Cost & Analysis** page (`/cost`) showing AI **usage**, **token costs**, and breakdown by **feature** and user (demo).

## Problem it solves

Teams need visibility into AI spend per feature (autocomplete vs draft vs summarize) to budget and optimize.

## How to use

1. From home page, click **Cost & Analysis** (top right).
2. Review:
   - Overview totals
   - Per-feature usage
   - Logs and pricing configuration (admin-style views)

## Notes

- APIs: `/api/cost/overview`, `/api/cost/features`, `/api/cost/logs`, `/api/cost/pricing`, `/api/cost/users`
- Server logging: `cost-store.ts`, `cost-opts.ts`
- Local dev stores logs under `.data/` (gitignored).
- Not end-user facing in production without access control — treat as ops/admin tool.
