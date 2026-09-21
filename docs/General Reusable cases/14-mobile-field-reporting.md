# 14. Mobile field reporting via WebView

## Problem statement

Field staff need to capture diaries, observations, and photos on phones/tablets without a full native editor rewrite. Connectivity and AI cost may be limited on site.

## What already exists

- WebView embedding guidance (`ai={false}` recommended)
- Image upload route and resizable images
- Smart paste, slash commands, local spell-check
- Autosave indicator UX (host still owns true persistence)

## How it should be done

1. Host the Next app (or editor route) in a mobile WebView.
2. Use smart-only mode by default; enable AI on Wi-Fi / office profiles.
3. Bridge camera/file pickers and save events to native storage or backend.
4. Sync documents when online; queue edits offline.

## Tweaks & new features

- Offline document queue
- Native camera → image block bridge
- Lightweight “field diary” template on open

## Real-world outcomes

- Practical mobile authoring without rewriting TipTap in React Native
- Same editor codebase for office and field
