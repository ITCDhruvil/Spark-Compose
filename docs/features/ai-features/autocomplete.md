# Autocomplete

## What it is

**Ghost-text suggestions** while you type — next word, sentence, or paragraph — powered by AI.

## Problem it solves

Speeds up repetitive report writing (“The works commenced on…”, standard safety boilerplate) by offering continuations you accept with **Tab** or **→**.

## How to use

1. **Spark AI → Autocomplete** → ON.
2. Choose scope: **Word**, **Sentence**, or **Para**.
3. Pause briefly while typing; ghost text appears.
4. Press **Tab** or **Right arrow** to accept; keep typing to dismiss.

## Notes

- Extension: `ai-autocomplete.ts`
- API: `/api/ai/complete`
- Optional env: `OPENAI_AUTOCOMPLETE_MODEL`
- Uses tokens on each suggestion request.
- Turn off for sensitive drafts or legal review.
