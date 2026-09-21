# 8. Quality, grammar & glossary enforcement

## Problem statement

Enterprise documents must use approved terms, correct spelling, and clear grammar. Uncontrolled wording creates safety, contractual, and brand risk.

## What already exists

- Local spell-check dictionaries (including construction terms)
- AI grammar check extension
- Glossary AI feature
- Selection improve / tone tools

## How it should be done

1. Load org glossary + banned phrases into spell/glossary services.
2. Run grammar + glossary checks before publish.
3. Surface inline suggestions; require accept/reject for audit trails.
4. Optionally block publish until critical glossary violations are cleared.

## Tweaks & new features

- Tenant glossary admin + sync from standards DB
- Severity levels (must-fix vs suggestion)
- Export “quality report” for reviewers

## Real-world outcomes

- Consistent language across teams and subcontractors
- Reusable quality layer for any regulated writing domain
