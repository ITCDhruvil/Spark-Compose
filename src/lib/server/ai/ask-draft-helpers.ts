import type {
  AskDraftPlan,
  AskDraftQuestion,
  ConstructionContentType,
  ConstructionDraftLength,
} from '@/lib/api/ai-types'
import {
  formatPlaybookForPrompt,
  getDraftPlaybook,
  listDraftPlaybooks,
} from '@/lib/editor/draft-playbooks'

const CONTENT_TYPES: ConstructionContentType[] = [
  'article',
  'blog_post',
  'case_study',
  'experience_share',
  'technical_guide',
]

export function isContentType(value: unknown): value is ConstructionContentType {
  return typeof value === 'string' && (CONTENT_TYPES as string[]).includes(value)
}

export function ensureOther(options: string[]): string[] {
  const cleaned = options.map((o) => o.trim()).filter(Boolean)
  if (!cleaned.some((o) => o.toLowerCase() === 'other')) cleaned.push('Other')
  return cleaned
}

export function parseQuestions(args: unknown): AskDraftQuestion[] {
  const raw = (args as { questions?: unknown })?.questions
  if (!Array.isArray(raw)) return []
  return raw
    .map((q, i) => {
      const item = q as {
        id?: string
        question?: string
        options?: string[]
        allowMultiple?: boolean
        multiSelect?: boolean
      }
      if (!item.question?.trim()) return null
      const allowMultiple = Boolean(item.allowMultiple ?? item.multiSelect)
      return {
        id: item.id?.trim() || `q_${i}`,
        question: item.question.trim(),
        options: ensureOther(Array.isArray(item.options) ? item.options : []),
        ...(allowMultiple ? { allowMultiple: true } : {}),
      }
    })
    .filter((q): q is AskDraftQuestion => q != null)
}

export function parseReplyMessage(args: unknown): string {
  const msg = (args as { message?: unknown })?.message
  return typeof msg === 'string' ? msg.trim() : ''
}

export function parsePlan(args: unknown, fallbackType?: ConstructionContentType): AskDraftPlan | null {
  const a = args as Partial<AskDraftPlan> & { whys?: unknown; outline?: unknown; draftName?: unknown }
  if (!a?.audience?.trim() || !a?.topic?.trim()) return null
  const contentType = isContentType(a.contentType)
    ? a.contentType
    : (fallbackType ?? 'blog_post')
  const length = (a.length ?? 'medium') as ConstructionDraftLength
  const whys: Record<string, string> = {}
  if (a.whys && typeof a.whys === 'object' && !Array.isArray(a.whys)) {
    for (const [k, v] of Object.entries(a.whys as Record<string, unknown>)) {
      if (typeof v === 'string' && v.trim()) whys[k] = v.trim()
    }
  }

  const outline: { id: string; heading: string; intent?: string }[] = []
  if (Array.isArray(a.outline)) {
    for (let i = 0; i < a.outline.length; i++) {
      const s = a.outline[i] as { id?: string; heading?: string; intent?: string }
      const heading = String(s?.heading ?? '').trim()
      if (!heading) continue
      outline.push({
        id: String(s?.id ?? `sec_${i + 1}`).trim() || `sec_${i + 1}`,
        heading,
        ...(s?.intent?.trim() ? { intent: s.intent.trim() } : {}),
      })
    }
  }

  const draftName = typeof a.draftName === 'string' ? a.draftName.trim() : ''

  return {
    contentType,
    audience: a.audience.trim(),
    topic: a.topic.trim(),
    angle: a.angle?.trim() ?? '',
    mustInclude: a.mustInclude?.trim() ?? '',
    length,
    includeSampleImage: Boolean(a.includeSampleImage),
    photoPlacementHint: a.photoPlacementHint?.trim() ?? '',
    ...(Object.keys(whys).length ? { whys } : {}),
    ...(a.briefSummary?.trim() ? { briefSummary: a.briefSummary.trim() } : {}),
    ...(draftName ? { draftName } : { draftName: a.topic.trim() }),
    ...(outline.length ? { outline } : {}),
  }
}

export function buildAskDraftSystemPrompt(contentType?: ConstructionContentType): string {
  const catalog = listDraftPlaybooks()
    .map((p) => `- ${p.id}: ${p.label} — ${p.openingPrompt.slice(0, 80)}…`)
    .join('\n')

  const playbookBlock = contentType
    ? formatPlaybookForPrompt(getDraftPlaybook(contentType))
    : `No content type pinned yet. Infer or ask early which type fits:
${catalog}
Once known, follow that playbook's required WHY slots.`

  return `You are a warm, experienced construction colleague helping someone craft a written piece.
You talk like a real person on site — not like a chatbot, form, or "AI coach."

Goals:
1) Understand *their* situation from what they just said, and ask about *that* specifically.
2) Gently collect playbook slots so you can submit a draft plan later.

VOICE (critical):
- React to their words first: acknowledge the incident, topic, or feeling ("Oh that sounds serious…", "Got it — rebar on site, yeah that can go wrong fast.").
- Then ask ONE natural follow-up about that situation — not a generic template question.
- Bad: "Why is it important to share this incident now?" / "Who is your target audience for this experience share?"
- Good: "Can you tell me what really happened with those iron rods, in short?" / "Who on the crew would need to hear this most — the guys handling bar, or the supers?"
- Never say "as an AI", "I'll coach you", "knowledge-first", "WHY slots", or lecture about writing craft unless they ask.
- Keep replyToUser to 1–3 short spoken sentences. Sound human.

GUARDRAILS:
- If they ask something unrelated to drafting this content, steer back with one friendly question + options (include Other).
- Never write the full draft body in chat — only conversation + tools, then submitDraftPlan.
- You must use tools — never plain text only.

Tools:
- replyToUser: human reaction + context (ties to their last message). Call with askUserQuestion.
- askUserQuestion: exactly ONE question, wording grounded in their situation. 3–5 concrete option chips ending with Other (options too should fit *their* story, not generic lists). Set allowMultiple=true when several answers reasonably apply together (e.g. key points to cover, audiences, must-include themes). Keep allowMultiple=false for mutually exclusive picks (audience OR topic OR length).
- askOptionalQuestions: after required slots filled, ask exactly ONE optional question per turn (e.g. length first, then images on a later turn). Never batch length + photos together. Friendly tone; Other on each. User may skip.
- submitDraftPlan: when audience, topic, contentType, length, and required playbook WHYs are known. MUST include draftName and a fresh outline (3–6 sections) proposed from THIS conversation — never a fixed generic template.

Workflow:
1. First turn: greet briefly in this type's spirit, then ask the most natural first question (often topic or who it's for) with options.
2. After each answer: react to *what they said*, fill what you can, ask the next missing slot in their language.
3. Never invent company names.
4. Before submitDraftPlan, offer optional questions ONE AT A TIME via askOptionalQuestions (e.g. length, then later photos). Do not put two optional questions in one response.
5. On submitDraftPlan: propose outline section headings tailored to their story (e.g. for an iron-rod incident, headings about what happened / stakes / takeaway — named in their words). Prefer medium length when unspecified. Your brief ready message (replyToUser or assistantMessage style) must match this draft type's voice — personal and clean for experience shares, editorial for articles, evidence-led for case studies, conversational for blogs, precise for technical guides.

Playbook slots are your checklist behind the scenes — do not expose them as jargon. Cover them through natural conversation.

${playbookBlock}`
}
