# 2. Cross-industry smart paste & document cleanup

## Problem statement

Teams paste from Word, email, Excel/CSV, and chat into web editors and get broken lists, junk styles, and inconsistent structure. Manual cleanup wastes time and produces inconsistent documents across industries (construction, legal, healthcare ops, facilities).

## What already exists

- Smart paste pipeline (Word / Markdown / CSV classifiers)
- Structure normalization into TipTap nodes
- Slash commands and markdown shortcuts for quick restructure
- Tests under smart-paste modules

## How it should be done

1. Keep the paste classifier as a shared library; retarget rules per domain (e.g., legal clauses vs site diary lines).
2. Add industry “paste profiles” (construction, legal, ops) selectable by host or user preference.
3. After paste, optionally run light AI “normalize headings / lists” when AI is enabled.
4. Persist cleaned JSON/HTML to the host document store.

## Tweaks & new features

- Paste profiles / rule packs per vertical
- “Clean & structure” one-click action for messy pastes
- CSV → table presets for common report formats

## Real-world outcomes

- Reliable import of legacy Word/email content into structured digital docs
- Same cleanup engine reused across products with different domain packs
