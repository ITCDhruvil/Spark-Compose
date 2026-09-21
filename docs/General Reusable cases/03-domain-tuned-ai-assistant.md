# 3. Domain-tuned AI writing assistant (any vertical)

## Problem statement

Generic chatbots produce vague copy. Enterprises need writing help that speaks their domain (construction today; later facilities, energy, manufacturing, AEC consultancy) with consistent tone, terminology, and refusal boundaries.

## What already exists

- Spark AI: improve, rewrite, tone, summarize, translate, draft, autocomplete
- Construction-focused system prompts and playbooks
- Opt-in AI plugin toggle for hosts
- OpenAI streaming via `/api/ai/*`

## How it should be done

1. Externalize domain prompts into config packs (system voice, glossary, refusal topics).
2. Swap the construction pack for another vertical without changing UI.
3. Keep feature UI (selection menu, draft, ask) identical; change only prompt + glossary data.
4. Gate AI behind auth, quotas, and audit logs for enterprise use.

## Tweaks & new features

- Prompt pack registry (construction, HSEQ, client-comms, generic business)
- Tenant-level default tone and terminology
- Admin UI to upload glossary / style guide

## Real-world outcomes

- One editor product serving multiple industries via configuration
- Faster vertical expansion without rebuilding AI UI
