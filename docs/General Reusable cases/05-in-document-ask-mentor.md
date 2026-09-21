# 5. In-document Ask / mentor Q&A

## Problem statement

Workers need answers while writing (methods, safety, terminology) without leaving the document for a separate chatbot. Context should stay tied to the current draft.

## What already exists

- Inline Ask flow (prompt + answer TipTap extensions)
- Construction mentor system prompt and jailbreak guardrails
- SSE streaming ask API

## How it should be done

1. Keep Ask UI embedded in the editor.
2. Retarget system prompt + knowledge sources per domain or project.
3. Optionally ground answers in ingested project docs (see RAG case).
4. Log Q&A for audit in regulated environments.

## Tweaks & new features

- Project-scoped knowledge filters
- Cite sources in answers
- “Insert answer into doc” with formatting presets

## Real-world outcomes

- Just-in-time learning and clarification during authoring
- Reusable Ask shell for training, support, or field mentoring products
