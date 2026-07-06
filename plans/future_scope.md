# AI Editor Feature Roadmap

## 1. Content Generation (Selection-Aware)

### Image Generation
- Generate site photos from selected text.
- Create diagrams or technical illustrations.
- Auto-insert generated images with captions and alt text.

### Diagram & Flowchart Generation
- Convert selected procedures or method statements into:
  - Flowcharts
  - Sequence diagrams
  - Process diagrams

### Before / After Visuals
- Generate progress comparison images.
- Create "As-Built vs Planned" visual comparisons.

### Icon & Callout Library
- PPE icons
- Hazard callouts
- Hold point markers
- Quality indicators
- Insert as reusable editor blocks.

---

## 2. Construction-Specific Authoring

### Method Statement Builder
Generate structured documents containing:
- Scope
- Resources & Plant
- Materials
- Work Sequence
- Risks
- Controls
- Permits
- Quality Checks

### Toolbox Talk & RAMS Generator
- Generate Toolbox Talks.
- Create RAMS documents.
- Convert notes into standardized formats.

### Specification / Clause Validation
- Validate content against:
  - Uploaded specifications
  - Standards
  - Project brief
  - Company glossary

### Drawing References
- Link paragraphs to:
  - Drawing numbers
  - Figure references
  - Sheet numbers
  - Revision IDs

### Inspection & Test Plans (ITP)
Generate native editor blocks for:
- Inspection points
- Hold points
- Checklists
- QA/QC records

---

## 3. Social & Publishing

### Multi-Platform Export
Export documents as:
- LinkedIn posts
- X (Twitter) threads
- Instagram carousel content
- Email newsletters

### Platform Preview
Live preview for:
- Character limits
- Image crops
- Formatting
- Layout

### Smart Suggestions
Generate:
- Hashtags
- Mentions
- Project tags
- Safety tags
- Trade-specific keywords

### Publishing Assistant
Create:
- Weekly posting schedules
- Short-form copy
- Long-form copy
- Toolbox updates

### Site Update Cards
Generate ready-to-share cards containing:
- Photo
- Caption
- Location
- Status
- Suitable for WhatsApp, Teams, and Slack.

---

## 4. Graphs, Data & Analytics

### Charts from Tables
Convert selected tables into:
- Bar Charts
- Line Charts
- Pie Charts
- Area Charts
- Scatter Charts
- Doughnut Charts

### KPI Widgets
Create visual KPI cards such as:
- SPI
- CPI
- Open RFIs
- Issues
- Delays
- Productivity

### Progress Analytics
Generate:
- Burn-down charts
- Progress graphs
- Resource trends
- CSV visualizations

### Cost & Usage Insights
Embed lightweight:
- Cost analysis
- Resource usage
- Budget summaries
- Consumption trends

### Citations & Sources
Attach:
- References
- Source links
- Standards
- Evidence
- Supporting documents

---

## 5. Collaboration & Workflow

### Review Modes
Different AI review perspectives:
- Client
- Engineer
- Project Manager
- Site Supervisor
- Construction Crew

### AI Approval Workflow
Support:
- Comments
- Suggested edits
- Approval history
- Audit trail

### Templates Library
Pre-built templates for:
- Weekly Reports
- Daily Reports
- Incident Reports
- Variation Orders
- NCRs
- Handover Documents
- Site Instructions
- Meeting Minutes

### Project Workspace
Support:
- Multiple documents
- Shared glossary
- Shared standards
- Shared assets
- Centralized project knowledge

---

## 6. Media & Multimodal

### Accurate In-Editor Dictation
Push-to-talk (or pause-based) mic control in the toolbar that inserts speech at the cursor with high accuracy — not browser Web Speech alone.

Implementation approach:
- Capture audio via `MediaRecorder` (utterance-sized chunks or hold-to-talk).
- Transcribe with OpenAI Whisper / `gpt-4o-transcribe` via `POST /api/ai/dictate`.
- Bias recognition with a domain `prompt`: surrounding paragraph text + construction terms from the local dictionary (`rebar`, `formwork`, `scaffold`, `ITP`, etc.).
- Light post-process with existing typo / construction-term dictionaries before insert.
- Optional phase 2: spoken commands (`new line`, `period`, `comma`, `delete that`).
- Optional interim display via Web Speech API; **final text always from Whisper**.
- Track usage as cost feature `dictate` (same pattern as other AI routes).

Out of scope for v1: continuous low-latency streaming (Deepgram / Realtime API) unless live captions are required.

### Video Generation
Generate:
- Site clips
- Explainer videos
- Construction animations
- Video stills

### Voice-to-Document
Convert longer recordings (not live dictation) into:
- Structured notes
- Meeting minutes
- Toolbox Talks
- Action items

### PDF & Drawing Intelligence
Import and extract:
- Text
- Tables
- Figures
- Drawings
- Annotations
- Metadata

Support intelligent referencing and RAG-based retrieval across uploaded project documents.
