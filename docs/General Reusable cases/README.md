# General reusable cases

Reusable product directions for **Spark Compose** — real-world problems that can be solved by tweaking existing smart/AI features and adding a small set of new ones, without rebuilding the editor from scratch.

Spark Compose is an AI-powered online document editor for construction and project teams. The cases below treat that core as a **generic document + AI platform** that can be retargeted by domain prompts, templates, host embedding, and persistence.

| # | Use case | File |
|---|----------|------|
| 1 | Embeddable smart editor (WebView / host apps) | [01-embeddable-smart-editor.md](./01-embeddable-smart-editor.md) |
| 2 | Cross-industry smart paste & document cleanup | [02-smart-paste-document-cleanup.md](./02-smart-paste-document-cleanup.md) |
| 3 | Domain-tuned AI writing assistant (any vertical) | [03-domain-tuned-ai-assistant.md](./03-domain-tuned-ai-assistant.md) |
| 4 | Guided draft / playbook authoring | [04-guided-draft-playbooks.md](./04-guided-draft-playbooks.md) |
| 5 | In-document Ask / mentor Q&A | [05-in-document-ask-mentor.md](./05-in-document-ask-mentor.md) |
| 6 | Progress reports with tables → charts & KPIs | [06-progress-reports-charts-kpis.md](./06-progress-reports-charts-kpis.md) |
| 7 | Multilingual client & field communication | [07-multilingual-communication.md](./07-multilingual-communication.md) |
| 8 | Quality, grammar & glossary enforcement | [08-quality-grammar-glossary.md](./08-quality-grammar-glossary.md) |
| 9 | Brief / spec compliance & find-issues review | [09-brief-compliance-find-issues.md](./09-brief-compliance-find-issues.md) |
| 10 | Action items & meeting-to-document workflows | [10-action-items-meeting-notes.md](./10-action-items-meeting-notes.md) |
| 11 | Project knowledge RAG inside the editor | [11-project-knowledge-rag.md](./11-project-knowledge-rag.md) |
| 12 | Enterprise AI cost metering & usage controls | [12-ai-cost-metering.md](./12-ai-cost-metering.md) |
| 13 | HSEQ / method statement / toolbox talk packs | [13-hseq-method-toolbox.md](./13-hseq-method-toolbox.md) |
| 14 | Mobile field reporting via WebView | [14-mobile-field-reporting.md](./14-mobile-field-reporting.md) |
| 15 | White-label SaaS document workspace | [15-white-label-saas-workspace.md](./15-white-label-saas-workspace.md) |

## Enterprise gaps (context)

These reuse paths assume closing production gaps: auth, rate limiting, upload security, CI/CD, observability, durable storage, collaboration, schema validation, and compliance/audit/PII controls.
