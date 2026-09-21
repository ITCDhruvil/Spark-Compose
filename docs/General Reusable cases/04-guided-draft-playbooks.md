# 4. Guided draft / playbook authoring

## Problem statement

Authors struggle to start from a blank page. Organizations need repeatable document types (site diary, method statement, incident report, weekly client update) with guided sections so output is complete and consistent.

## What already exists

- Conversational draft, draft enhance, guided draft panels
- Draft playbooks and construction draft flows
- Slash commands `/draft`, `/draft-coach` (when AI enabled)

## How it should be done

1. Model each document type as a playbook: sections, required fields, example prompts.
2. Walk the user section-by-section; insert structured TipTap blocks as they confirm.
3. Allow org admins to clone playbooks and edit section prompts.
4. Export finished drafts to host storage or PDF/Word pipelines.

## Tweaks & new features

- Playbook CMS (CRUD for templates)
- Required-section checklist before “complete”
- Branching questions (e.g., incident severity → extra sections)

## Real-world outcomes

- Consistent first drafts for recurring operational documents
- Reduced training time for new field/office staff
