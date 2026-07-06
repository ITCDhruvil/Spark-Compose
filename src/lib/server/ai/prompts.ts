import type {
  AutocompleteScope, ConstructionContentType, ConstructionDraftLength,
  RewriteMode, SummaryLength,
} from '@/lib/api/ai-types'

const REWRITE_INSTRUCTIONS: Record<RewriteMode, string> = {
  spelling:
    'Fix ONLY spelling mistakes and typos. Do not change grammar, wording, punctuation style, or structure unless required to fix a clear typo. Preserve meaning, tone, and formatting.',
  grammar:
    'Fix grammar, spelling, and punctuation only. Do not rewrite for style or clarity beyond what is needed for correctness. Preserve meaning and tone.',
  concise: 'Make the text more concise without losing key information.',
  professional: 'Rewrite in a professional, formal tone.',
  simplify: 'Simplify the language for a general audience.',
  executive: 'Rewrite for an executive audience — clear, decisive, outcome-focused.',
  technical: 'Rewrite with precise technical language appropriate for specialists.',
  polish: 'Polish the prose for clarity, flow, and readability. Light edits only.',
  custom_tone: 'Rewrite to match the requested tone.',
}

export function completeMessages(
  before: string,
  after: string,
  scope: AutocompleteScope = 'sentence',
): { role: 'system' | 'user'; content: string }[] {
  const scopeHint = {
    word: 'Continue with only the next word or short phrase (under 6 words).',
    sentence: 'Continue to finish the current sentence only. Stop at . ! or ?',
    paragraph: 'Continue to finish the current paragraph only.',
  }[scope]

  const tail = before.slice(-500)
  const suffix = after.trim() ? after.slice(0, 100) : ''

  return [
    {
      role: 'system',
      content: `Inline autocomplete. ${scopeHint} Return ONLY the new continuation — no quotes, no repetition of existing text.`,
    },
    {
      role: 'user',
      content: suffix ? `${tail}⟦cursor⟧${suffix}` : tail,
    },
  ]
}

/** @deprecated use completeMessages */
export function completePrompt(before: string, after: string, scope: AutocompleteScope = 'sentence'): string {
  const msgs = completeMessages(before, after, scope)
  return `${msgs[0]!.content}\n\n${msgs[1]!.content}`
}

export function rewritePrompt(selection: string, mode: RewriteMode, before?: string, after?: string): string {
  const instruction = REWRITE_INSTRUCTIONS[mode]
  return `You are an expert editor. ${instruction}
Return ONLY the rewritten text — no preamble, no quotes.

${before ? `Context before:\n${before}\n\n` : ''}Text to rewrite:
${selection}
${after ? `\nContext after:\n${after}` : ''}`
}

export function summarizePrompt(text: string, length: SummaryLength): string {
  const size = { short: '2-3 sentences', medium: 'one short paragraph', detailed: '2-3 paragraphs' }[length]
  return `Summarize the following text in ${size}. Return only the summary.

${text}`
}

export function translatePrompt(text: string, targetLang: string): string {
  return `Translate the following text to ${targetLang}. Return only the translation.

${text}`
}

export function customTonePrompt(selection: string, tone: string, before?: string, after?: string): string {
  return `Rewrite the selection to match this tone/instruction: "${tone}"
Return only the rewritten text.

${before ? `Context before:\n${before}\n\n` : ''}Selection:
${selection}
${after ? `\nContext after:\n${after}` : ''}`
}

export function outlinePrompt(docText: string): string {
  return `Analyse the document and suggest 3-8 section headings that would improve its structure.
Return JSON: { "headings": [ { "level": 1|2|3, "text": "heading text" } ] }

Document:
${docText.slice(0, 12000)}`
}

export function suggestHeadingPrompt(
  paragraph: string,
  prevHeadings: { level: number; text: string }[],
  nextHeadings: { level: number; text: string }[],
  preferredLevel: number,
  kind: 'heading' | 'subtitle' = 'heading',
): string {
  const prev = prevHeadings.slice(-5).map((h) => `H${h.level}: ${h.text}`).join('\n') || '(none)'
  const next = nextHeadings.slice(0, 5).map((h) => `H${h.level}: ${h.text}`).join('\n') || '(none)'
  const role = kind === 'subtitle'
    ? 'a concise subtitle (secondary heading under a section title)'
    : 'a concise section title / heading'
  return `You write ${role} for a construction / field document in a rich-text editor.

Given ONE paragraph (or selected passage), propose ${role} that fits above it.

Previous headings (nearest last):
${prev}

Following headings (nearest first):
${next}

Preferred level from outline rules: H${preferredLevel}

Paragraph:
${paragraph.slice(0, 4000)}

Rules:
- "text": 3–10 words, no trailing period, no quotes, no markdown
- "level": 1, 2, or 3 — stay consistent with the outline. Prefer ${preferredLevel} unless the outline clearly needs another level.
- Do not invent content that is not supported by the paragraph

Return JSON only: { "level": 1|2|3, "text": "Heading text" }`
}

export function explainAudiencePrompt(
  selection: string,
  audience: 'explain' | 'crew' | 'client' | 'engineer',
): string {
  const goal = {
    explain: 'Explain clearly what this text means. Keep it concise. Replace the selection with the explanation only.',
    crew: 'Rewrite for a site crew / field workers: plain language, short sentences, actionable. Replace the selection with the rewrite only.',
    client: 'Rewrite for a client / owner: clear, professional, non-jargon where possible. Replace the selection with the rewrite only.',
    engineer: 'Rewrite for an engineer / technical reviewer: precise, specific, use correct technical terms. Replace the selection with the rewrite only.',
  }[audience]

  return `${goal}

Text:
${selection.slice(0, 6000)}

Return ONLY the rewritten or explained text — no preamble, no quotes.`
}

export function findIssuesPrompt(text: string): string {
  return `You review construction / field documents for risk and clarity.

Scan the text for issues such as:
- Vague claims or missing quantities/units
- Unsafe or incomplete safety wording
- Contradictions or unclear responsibilities
- Missing dates, locations, or acceptance criteria

For each issue provide a fix that can be applied in-place:
- "text": short description of the problem
- "originalSnippet": an EXACT contiguous substring copied from the source (required for apply)
- "suggestion": improved replacement for that substring only
- "severity": high | medium | low

Return JSON only:
{ "issues": [ { "severity": "high"|"medium"|"low", "text": "…", "originalSnippet": "…", "suggestion": "…" } ] }

Rules:
- 2–8 issues max; only meaningful ones
- originalSnippet MUST appear verbatim in the source text (include surrounding words if needed for a clean replace)
- suggestion must be a drop-in replacement with correct spacing, capitalization, and punctuation
- Do not glue words together; preserve spaces around the snippet
- If nothing material is wrong, return 1 low-severity polish with a real snippet

Text:
${text.slice(0, 8000)}`
}

export function autoStructurePrompt(text: string): string {
  return `You improve structure of a construction / field document. Apply only meaningful edits — not one per paragraph.

Choose operations that help the reader:
- heading / subtitle — section titles (level 1–3)
- bulletList / orderedList / taskList — turn a dense paragraph into a list BELOW it (items[])
- table — turn quantities/schedule-like notes into a table (headers[], rows[][]), placed BELOW the paragraph
- refactor — rewrite a messy paragraph in place (replacement = full new paragraph text)

Return JSON only:
{
  "operations": [
    {
      "matchPrefix": "first ~40 chars of the target paragraph (verbatim)",
      "action": "heading"|"subtitle"|"bulletList"|"orderedList"|"taskList"|"table"|"refactor",
      "level": 1|2|3,
      "text": "heading text when action is heading/subtitle",
      "items": ["list item", "..."],
      "headers": ["Col"],
      "rows": [["cell"]],
      "replacement": "full rewritten paragraph for refactor"
    }
  ]
}

Rules:
- 2–10 operations max; skip paragraphs that are already clear
- Prefer mix of headings + lists/tables when content warrants it
- matchPrefix must match the START of an existing paragraph
- For heading/subtitle: insert ABOVE the paragraph; include text + level (2 for heading, 3 for subtitle unless top-level title)
- For lists/table: content goes BELOW the matched paragraph
- For refactor: replacement must be well-formed prose (spaces, capitals, punctuation)
- Do not invent facts unsupported by the text
- Order operations top-to-bottom

Document:
${text.slice(0, 12000)}`
}

export function kpiWidgetsPrompt(text: string): string {
  return `Extract construction project KPIs from the notes or table below.

Return JSON only:
{ "kpis": [ { "label": "SPI", "value": "0.92", "trend": "+2% vs last week", "status": "good" } ] }

Rules:
- 3–6 KPI cards max
- Prefer metrics like SPI, CPI, open RFIs, defects, delays, productivity, safety incidents when present
- value must be short (number, %, or compact phrase)
- trend optional — short delta vs prior period when inferable
- status: "good" | "warn" | "bad" when clear; omit if neutral
- Do not invent numbers not supported by the text

Data:
${text.slice(0, 8000)}`
}

export function progressAnalyticsPrompt(text: string, mode: 'burndown' | 'trend' | 'csv'): string {
  const goal = mode === 'burndown'
    ? 'a burn-down series (remaining work or tasks decreasing over time)'
    : mode === 'trend'
      ? 'a progress or resource trend over time periods'
      : 'a clean tabular dataset suitable for charting from CSV-like notes'

  return `Normalize the following into ${goal} for a construction progress report.

Return JSON only:
{ "title": "Chart title", "headers": ["Period", "Value", ...], "rows": [["W1", "40"], ...] }

Rules:
- First column = time period (week, date, sprint, milestone)
- Include at least one numeric column for charting
- 3–24 rows; keep cell text short
- title should name the metric and context
- Do not invent data not supported by the source

Mode: ${mode}

Source:
${text.slice(0, 8000)}`
}

export function textToTablePrompt(text: string): string {
  return `Convert the following messy notes into a clean table for a construction document.

Return JSON only:
{ "headers": ["Col1", "Col2", ...], "rows": [["r1c1", "r1c2"], ...] }

Rules:
- Infer sensible column headers
- 2–6 columns, up to 20 rows
- Keep cell text short; use "" for unknown cells
- Do not invent facts not supported by the text

Text:
${text.slice(0, 8000)}`
}

export function actionItemsPrompt(text: string): string {
  return `Extract action items from meeting notes or a paragraph for a construction project.

Return JSON only:
{ "items": [ { "text": "action", "owner": "optional name/role", "due": "optional date or timeframe" } ] }

Rules:
- 2–10 items
- Prefer actionable verbs
- Include owner/due only when present or clearly implied
- text should stand alone as a checklist line (you may append " — Owner, due Date" when known)

Text:
${text.slice(0, 8000)}`
}

export function glossaryPrompt(text: string): string {
  return `You enforce construction terminology consistency in a field document.

Find informal, inconsistent, or imprecise terms and map them to preferred professional terms.
Examples: "forms" → "formwork", "rebar" stays if already correct, "cement" → "concrete" only when the material is concrete (not cement powder).

Return JSON only:
{ "terms": [ { "from": "exact phrase in the text", "to": "preferred term" } ] }

Rules:
- "from" must appear verbatim in the source (case-sensitive as written)
- Prefer whole words / short phrases (1–3 words)
- 3–20 replacements max; only clear improvements
- Do not change meaning, numbers, or proper names
- If already consistent, return { "terms": [] }

Text:
${text.slice(0, 12000)}`
}

export function imageCaptionPrompt(
  mode: 'caption' | 'alt',
  alt?: string,
  title?: string,
  context?: string,
): string {
  if (mode === 'alt') {
    return `Look at the image and write short alt text for accessibility (under 125 characters, no quotes).
Describe what is shown so a screen-reader user understands the image.

Return JSON only: { "text": "..." }`
  }

  // Figure caption — report style, not alt-text description
  return `You write FIGURE CAPTIONS for construction / technical documents (NOT alt text).

Look at the image. Write a short caption that would appear under "Figure N:" in a report.

Caption style (good):
- Charts / dashboards / data: name the metric, comparison, or period — e.g. "Monthly productivity by crew, Q3"
- Photos: subject + place/context — e.g. "Formwork on Level 3, north elevation"
- Diagrams / plans: what the drawing is for — e.g. "Lift plan zones for tower crane T-2"
- Slides / posters: the topic title, not a UI inventory

Not caption style (bad — too descriptive / alt-like):
- "A screenshot of a blue slide with orange headers"
- "An image showing a chart with bars and labels"
- Listing colors, layout, or UI chrome

Rules:
- One short phrase or sentence, no quotes, no "Figure N:" prefix (added by the app)
- Base it on what the image is ABOUT, using document context only to name the project/topic if it fits
- For data charts, prefer the insight or subject over visual description

Existing title: ${title?.trim() || '(none)'}
Document context (optional):
${(context ?? '').slice(0, 800) || '(none)'}

Return JSON only: { "text": "..." }`
}

export function askPresetInstruction(preset: 'default' | 'short' | 'detailed' | 'toolbox'): string {
  switch (preset) {
    case 'short':
      return 'Answer length: SHORT — 2–5 sentences max. Only the essentials.'
    case 'detailed':
      return 'Answer length: DETAILED — thorough explanation with bullets and specifics where useful.'
    case 'toolbox':
      return 'Answer style: TOOLBOX TALK — plain field language for a crew briefing. Short bullets, actionable, safety-first. No jargon without a quick plain-English gloss.'
    default:
      return 'Answer length: adaptive — brief for simple asks, longer with bullets when depth is needed.'
  }
}

export function briefGapsPrompt(document: string, brief: string): string {
  return `Compare a draft document against a short brief / requirements list for a construction document.

Brief (must cover):
${brief.slice(0, 4000)}

Document:
${document.slice(0, 10000)}

List gaps: requirements in the brief that are missing, weak, or incomplete in the document.

Return JSON only:
{ "gaps": ["gap one as a checklist item", ...] }

If fully covered, return gaps noting minor strengtheners, not an empty list.`
}

export function suggestListPrompt(
  paragraph: string,
  kind: 'bulletList' | 'orderedList' | 'taskList',
): string {
  const label =
    kind === 'orderedList' ? 'numbered list'
      : kind === 'taskList' ? 'checklist / to-do items'
        : 'bullet points'
  return `You help structure a construction / field document.

Given ONE paragraph (or selected passage), suggest 3–6 concise ${label} that expand or organize the ideas in it. Place them as supporting content below the paragraph.

Paragraph:
${paragraph.slice(0, 4000)}

Rules:
- Each item: short phrase or one sentence, no leading bullets/numbers, no markdown
- Stay faithful to the paragraph; do not invent unrelated topics
- Prefer actionable, field-relevant wording

Return JSON only: { "items": ["item one", "item two", ...] }`
}

export interface DraftImageAnalysis {
  index: number
  description: string
  alt: string
  caption: string
  placementHint: string
}

export function imagePlacementAnalysisPrompt(topic: string, audience: string, index: number, total: number): string {
  return `You are analyzing photo ${index} of ${total} for a construction / built-environment article.

Article topic: ${topic}
Audience: ${audience}

Look at the image carefully. Return JSON only:
{
  "description": "2-3 sentences of what is actually visible (materials, activity, location cues)",
  "alt": "short accessible alt text, max 12 words",
  "caption": "Figure-style caption: what it shows and why it matters in the article (one sentence)",
  "placementHint": "where in the article this photo should appear (e.g. after intro on site setup, in safety section, near conclusions)"
}

Do not invent details that are not visible. Be specific and field-accurate.`
}

export function constructionDraftPrompt(req: {
  contentType: ConstructionContentType
  audience: string
  topic: string
  angle?: string
  mustInclude?: string
  length?: ConstructionDraftLength
  referenceNotes?: string
  articleImagePlacementHint?: string
  imageCount?: number
  imageAnalyses?: DraftImageAnalysis[]
  aiDecidePlacement?: boolean
}): string {
  const wordTarget = { short: '400-600', medium: '800-1200', long: '1500-2500' }[req.length ?? 'medium']
  const imageCount = req.imageCount ?? 0
  const analyses = req.imageAnalyses ?? []

  let imageRules = ''
  if (imageCount > 0) {
    const analysisBlock = analyses.length
      ? `\nVision analysis of each photo (use this — do not invent different content):\n${analyses.map((a) =>
          `IMAGE_${a.index}:
- Visible: ${a.description}
- Alt: ${a.alt}
- Caption to use: ${a.caption}
- Placement: ${a.placementHint}`,
        ).join('\n\n')}\n`
      : ''

    const placementLine = req.aiDecidePlacement || !req.articleImagePlacementHint
      ? 'Place each image where the vision placement guidance says, integrated into the narrative.'
      : `User placement preference: ${req.articleImagePlacementHint}`

    imageRules = `
Images: You have ${imageCount} real photo(s). Insert EACH exactly once.
${analysisBlock}
Format on its own lines (caption must match the vision caption, lightly edited only if needed for grammar):

![alt text](IMAGE_1)

*Figure 1: Caption text here.*

Use IMAGE_1 … IMAGE_${imageCount} as URL placeholders only (never invent other URLs or omit an image).
${placementLine}
Figure numbers must be sequential (Figure 1, Figure 2, …).
`
  }

  return `You are a professional editor. Write ONLY a draft document — refuse any non-draft request.

Write a ${req.contentType.replace(/_/g, ' ')} for this audience: ${req.audience}
Topic: ${req.topic}
${req.angle ? `Angle: ${req.angle}\n` : ''}${req.mustInclude ? `Must include: ${req.mustInclude}\n` : ''}${req.referenceNotes ? `Reference notes:\n${req.referenceNotes}\n` : ''}${imageRules}
Target length: ${wordTarget} words.

STRUCTURE (required):
- Use real Markdown that will be rendered (not shown as raw symbols).
- Headings: ## and ### (and #### for smaller sections). Example: ## Safety Overview
- Bold key terms with **like this** (never leave stray asterisks).
- Mix paragraphs, bullet lists (- item), numbered lists (1. item), and at least one markdown table when comparing facts.
- Vary paragraph length for a clean, readable layout.
- Do not use HTML. Do not wrap the whole document in a code fence.

Return only the article body in Markdown — no front matter, no commentary.`
}

export function compareSummaryPrompt(original: string, summary: string): string {
  return `Score the ORIGINAL passage vs the SUMMARY on exactly these 5 benchmarks (0-100 each):
grammar, tone, clarity, conciseness, completeness.

For conciseness, a shorter summary that preserves meaning should score higher on the summary side.
For completeness, score how well key ideas are retained in the summary.

Return JSON only:
{
  "overall": { "original": <number>, "summary": <number>, "improvement": <summary minus original> },
  "benchmarks": [
    { "id": "grammar", "label": "Grammar", "original": <n>, "summary": <n>, "improvement": <n> },
    { "id": "tone", "label": "Tone", "original": <n>, "summary": <n>, "improvement": <n> },
    { "id": "clarity", "label": "Clarity", "original": <n>, "summary": <n>, "improvement": <n> },
    { "id": "conciseness", "label": "Conciseness", "original": <n>, "summary": <n>, "improvement": <n> },
    { "id": "completeness", "label": "Completeness", "original": <n>, "summary": <n>, "improvement": <n> }
  ]
}

ORIGINAL:
${original.slice(0, 4000)}

SUMMARY:
${summary.slice(0, 2000)}`
}
