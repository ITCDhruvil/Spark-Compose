# Against brief

## What it is

Compares your **document** (or selection context) against a **requirements brief** you paste in — and lists **gaps** (missing topics, non-compliance).

## Problem it solves

Method statements and tender responses must cover PPE, lift plans, weather, etc. Manual checklist comparison is slow and error-prone.

## How to use

1. Selection menu → **Against brief**.
2. Paste requirements (“Must include…”, client spec bullets).
3. Click **Check gaps**.
4. Review gap list; edit document to address items.

## Notes

- API: `/api/ai/brief-gaps`
- Panel in `ai-selection-menu.tsx` (`panel === 'brief'`)
- Works best with explicit, bullet-style requirements.
