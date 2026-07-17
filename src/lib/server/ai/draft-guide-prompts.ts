import type { AskDraftPlan, DraftGuideAction, DraftGuideRequest } from '@/lib/api/ai-types'
import { getDraftPlaybook } from '@/lib/editor/draft-playbooks'

function planContext(plan: AskDraftPlan): string {
  const playbook = getDraftPlaybook(plan.contentType)
  const whyLines = plan.whys
    ? Object.entries(plan.whys).map(([k, v]) => `- ${k}: ${v}`).join('\n')
    : ''
  const outline = (plan.outline ?? [])
    .map((s, i) => `${i + 1}. ${s.heading}${s.intent ? ` — ${s.intent}` : ''}`)
    .join('\n')
  return [
    `Draft name: ${plan.draftName || plan.topic}`,
    `Type: ${plan.contentType} (${playbook.label})`,
    `Audience: ${plan.audience}`,
    `Topic: ${plan.topic}`,
    plan.angle ? `Angle: ${plan.angle}` : '',
    plan.mustInclude ? `Must include: ${plan.mustInclude}` : '',
    plan.briefSummary ? `Brief: ${plan.briefSummary}` : '',
    whyLines ? `Interview WHYs:\n${whyLines}` : '',
    outline ? `Outline:\n${outline}` : '',
    `VOICE for this draft type (match tone in all guidance):\n${playbook.generationHints}`,
  ].filter(Boolean).join('\n')
}

export function draftGuidePrompt(req: DraftGuideRequest): string {
  const ctx = planContext(req.plan)

  if (req.action === 'proposeOutline') {
    return `You propose a writing outline AFTER an interview — tailored to THIS story, not a fixed template.
Return 3–6 H2 section headings that fit their topic, audience, and WHYs.
Also suggest a short draftName.
Match the draft-type voice (personal experience vs editorial vs case study vs blog vs technical guide).

Return JSON only:
{
  "draftName": "short working name",
  "outline": [
    { "id": "sec_1", "heading": "Section heading", "intent": "what this section should accomplish" }
  ]
}

CONTEXT:
${ctx}`
  }

  if (req.action === 'outlineImpact') {
    return `You suggest EXTRA sections the author could add to make this draft more impactful.
The current outline is already set — propose 2–4 optional sections NOT already in the outline.
Each suggestion needs a clear heading and a short why (how it increases impact for THIS draft type and story).
Match the draft-type voice. Do not duplicate existing headings.

Return JSON only:
{
  "impactSuggestions": [
    { "heading": "Section heading", "why": "One sentence on the impact this adds" }
  ]
}

CONTEXT:
${ctx}`
  }

  if (req.action === 'suggestTitles') {
    const avoid = (req.previousTitles ?? []).filter(Boolean).join(' | ')
    return `You help an author pick a title for a construction draft they will write themselves.
Propose exactly 3 distinct title options (not the same with tiny tweaks).
Titles should fit the brief, sound human — not clickbait — and match the draft-type voice.
${avoid ? `Avoid repeating these: ${avoid}` : ''}

Return JSON only:
{ "titles": ["Title one", "Title two", "Title three"] }

CONTEXT:
${ctx}`
  }

  if (req.action === 'sectionGuide') {
    return `You are a writing assistant sitting with the author in the editor.
They will write this section in THEIR own words. Give guidance only — do NOT write the section body.
Match the draft-type voice (e.g. experience share = personal & first-person coaching; article = editorial; case study = evidence-led; blog = conversational; technical guide = precise & safety-aware).

Section: ${req.sectionHeading || '(untitled)'}
${req.sectionId ? `Section id: ${req.sectionId}` : ''}

Return JSON only:
{
  "guide": {
    "heading": "confirm or lightly polish the section heading",
    "whatToWrite": "2–4 sentences: what belongs in this section for THEIR story",
    "howToWrite": "2–3 sentences: tone, structure tips, what to avoid — keep it coaching in the right voice",
    "tips": ["optional short tip", "optional short tip"]
  }
}

Be specific to the interview context. Talk like a colleague.

CONTEXT:
${ctx}`
  }

  // improveSection
  return `You are polishing ONE section the author already wrote.
Keep their voice and facts. Improve clarity, flow, and construction accuracy lightly.
Stay true to the draft-type voice in the CONTEXT.
Return the section as Markdown body only (paragraphs / lists / a small table if useful).
Do NOT include the section heading in the markdown (heading already exists in the editor).
Do NOT add meta lines like "Improved version" or "Here's a rewrite".

Return JSON only:
{ "improvedMarkdown": "..." }

Section heading: ${req.sectionHeading || ''}
Author draft:
${(req.sectionText ?? '').slice(0, 6000)}

CONTEXT:
${ctx}`
}

export function normalizeGuideAction(v: unknown): DraftGuideAction | null {
  if (
    v === 'suggestTitles'
    || v === 'sectionGuide'
    || v === 'improveSection'
    || v === 'proposeOutline'
    || v === 'outlineImpact'
  ) return v
  return null
}
