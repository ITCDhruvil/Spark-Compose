# 9. Brief / spec compliance & find-issues review

## Problem statement

Drafts often miss requirements from a brief, scope, or specification. Reviewers need automated gap detection before client or QA submission.

## What already exists

- Find-issues AI panel
- Against-brief / brief-gaps style flows
- Compare-summary related APIs
- Construction draft ingest warnings pattern

## How it should be done

1. Attach a brief/spec (text or ingested file) to the document session.
2. Run find-issues / brief-gaps against current content.
3. Present issues as actionable checklist; jump-to location in editor.
4. Re-run after edits; store review history for compliance.

## Tweaks & new features

- Spec clause library linking
- Severity + owner assignment on issues
- Required re-check gate in publish workflow

## Real-world outcomes

- Fewer incomplete submissions and rework cycles
- Reusable “draft vs requirements” review for bids, designs, and ops docs
