# 11. Project knowledge RAG inside the editor

## Problem statement

Answers and drafts should reflect project-specific specs, drawings notes, and standards — not only the base LLM. Today ingest is a stub (`hasEmbeddings: false`, in-memory store).

## What already exists

- `/api/rag/ingest` and in-memory `rag-store`
- Ask / draft routes that can accept context
- Roadmap items for hybrid project RAG

## How it should be done

1. Replace in-memory store with vector + keyword index (persistent).
2. Ingest PDF/DOCX/MD with chunking and citations.
3. Ground Ask and Draft responses in retrieved chunks; show sources.
4. Scope corpus by project/tenant with access control.

## Tweaks & new features

- Persistent vector DB (e.g., pgvector)
- Citation UI in Ask answers
- ACL-aware retrieval

## Real-world outcomes

- Project-grounded writing and Q&A
- Foundation for enterprise knowledge workspaces built on the same editor
