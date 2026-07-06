# Image caption and alt text

## What it is

AI generates **caption** and **accessibility alt text** for selected images based on image content and document context.

## Problem it solves

Site photos need captions for reports and alt text for accessibility — tedious to write for every image.

## How to use

1. Click an **image** to select it.
2. **Image toolbar** → caption or alt action (AI icon).
3. Review generated text; edit manually if needed.

## Notes

- API: `/api/ai/image-caption`
- Hook: `use-ai-tools.ts` → `imageCaption`
- Upload images via `/api/uploads/image` for local hosting.
- Verify captions against actual site conditions.
