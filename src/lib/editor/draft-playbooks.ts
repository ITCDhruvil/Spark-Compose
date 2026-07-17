import type { ConstructionContentType } from '@/lib/api/ai-types'

export interface DraftPlaybookSlot {
  key: string
  /** Why this slot matters — shown/used as conversational guidance */
  whyHint: string
  /** Seed wording; model adapts to prior answers */
  exampleQuestion: string
}

export interface DraftPlaybook {
  id: ConstructionContentType
  label: string
  /** First assistant line when this type is chosen */
  openingPrompt: string
  requiredSlots: DraftPlaybookSlot[]
  optionalSlots: DraftPlaybookSlot[]
  /** Injected into constructionDraftPrompt for structure/voice */
  generationHints: string
  /** Ready/confirm lead — matches draft type (personal, editorial, etc.) */
  confirmLead: string
}

const LENGTH_SLOT: DraftPlaybookSlot = {
  key: 'length',
  whyHint: 'Length shapes how deep we go — short for a skim, long for detail.',
  exampleQuestion: 'How long should this draft be?',
}

const IMAGE_SLOT: DraftPlaybookSlot = {
  key: 'images',
  whyHint: 'Photos ground the piece in a real job — skip if you have none.',
  exampleQuestion: 'Do you want to attach site photos for this draft?',
}

export const DRAFT_PLAYBOOKS: Record<ConstructionContentType, DraftPlaybook> = {
  experience_share: {
    id: 'experience_share',
    label: 'Share experience',
    openingPrompt:
      'Hey — let’s talk through what happened so we can turn it into something useful for the crew. What’s on your mind?',
    requiredSlots: [
      {
        key: 'whyNow',
        whyHint: 'Timing tells the reader why this story matters today.',
        exampleQuestion: 'Why share this experience now?',
      },
      {
        key: 'whatHappened',
        whyHint: 'Concrete events make the story believable.',
        exampleQuestion: 'What happened — the situation in plain terms?',
      },
      {
        key: 'stakes',
        whyHint: 'Stakes show why anyone should care.',
        exampleQuestion: 'What was at stake (safety, schedule, cost, reputation)?',
      },
      {
        key: 'takeaway',
        whyHint: 'The lesson is what readers carry into their next job.',
        exampleQuestion: 'What did you learn that others should take away?',
      },
      {
        key: 'whoShouldAct',
        whyHint: 'Naming who should act turns a story into guidance.',
        exampleQuestion: 'Who should act on this (crew, supers, PEs, owners)?',
      },
    ],
    optionalSlots: [LENGTH_SLOT, IMAGE_SLOT],
    generationHints: `Voice: first-person, honest, construction-field authentic.
Structure: hook with the moment → situation → what was tried → outcome → clear lesson → who should do what next.
Avoid corporate fluff; prefer specific site details the interview captured.`,
    confirmLead:
      'Here’s what we pulled from your story. Tweak the outline if you want — then we’ll write it like you’re sharing with someone on the next crew.',
  },

  case_study: {
    id: 'case_study',
    label: 'Case study',
    openingPrompt:
      'Alright — case studies work best when we nail the real problem first. What’s going on that you want to walk people through?',
    requiredSlots: [
      {
        key: 'problem',
        whyHint: 'A sharp problem statement focuses the whole case.',
        exampleQuestion: 'What problem were you solving?',
      },
      {
        key: 'constraints',
        whyHint: 'Constraints explain why the chosen approach was necessary.',
        exampleQuestion: 'What constraints shaped the work (schedule, budget, access, weather, crew)?',
      },
      {
        key: 'solution',
        whyHint: 'Readers need the approach, not only the result.',
        exampleQuestion: 'What solution or approach did you take?',
      },
      {
        key: 'outcome',
        whyHint: 'Measurable outcomes make the case credible.',
        exampleQuestion: 'What was the measurable outcome?',
      },
      {
        key: 'whyItMatters',
        whyHint: 'Link outcome to audience so the case transfers.',
        exampleQuestion: 'Why does this matter to your audience?',
      },
    ],
    optionalSlots: [LENGTH_SLOT, IMAGE_SLOT],
    generationHints: `Voice: professional, evidence-led.
Structure: context → problem → constraints → approach → results (numbers where given) → lessons / transferability.
Use a small comparison table when contrasting before/after or options.`,
    confirmLead:
      'Here’s the case spine from our chat. Adjust sections if you need — we’ll keep it evidence-led and useful for the next project.',
  },

  article: {
    id: 'article',
    label: 'Article',
    openingPrompt:
      'Let’s shape an article people will actually finish. What’s the topic you care about right now?',
    requiredSlots: [
      {
        key: 'whyNow',
        whyHint: 'Urgency or occasion hooks the reader.',
        exampleQuestion: 'Why cover this topic now?',
      },
      {
        key: 'thesis',
        whyHint: 'A clear thesis keeps sections from wandering.',
        exampleQuestion: 'What is your main thesis or claim?',
      },
      {
        key: 'keyPoints',
        whyHint: 'Key points become the article spine.',
        exampleQuestion: 'What 2–4 key points must the article cover?',
      },
      {
        key: 'proof',
        whyHint: 'Proof / sources separate opinion from useful guidance.',
        exampleQuestion: 'What proof, examples, or sources support your claim?',
      },
      {
        key: 'callToAction',
        whyHint: 'A CTA tells the reader what to do after reading.',
        exampleQuestion: 'What should the reader do or decide after reading?',
      },
    ],
    optionalSlots: [LENGTH_SLOT, IMAGE_SLOT],
    generationHints: `Voice: clear editorial, construction-aware.
Structure: lede with why-now → thesis → sectioned key points with evidence → short CTA close.
Use ## / ### headings; include at least one list or table where comparison helps.`,
    confirmLead:
      'Article plan looks solid. Shape the outline below, then we’ll write section by section with a clear thesis and clean structure.',
  },

  blog_post: {
    id: 'blog_post',
    label: 'Blog post',
    openingPrompt:
      'Cool — blog posts are best when there’s a hook and a clear takeaway. What do you want readers to walk away with?',
    requiredSlots: [
      {
        key: 'hook',
        whyHint: 'The hook is why someone keeps reading past the first lines.',
        exampleQuestion: 'What’s the hook or occasion for this post?',
      },
      {
        key: 'takeaway',
        whyHint: 'One takeaway focuses a busy reader.',
        exampleQuestion: 'What should the reader remember or do after reading?',
      },
      {
        key: 'tone',
        whyHint: 'Tone sets whether this feels field-side, PE-formal, or client-facing.',
        exampleQuestion: 'What tone should we use?',
      },
      {
        key: 'anecdotes',
        whyHint: 'Must-include anecdotes make it yours.',
        exampleQuestion: 'Any stories, quotes, or details that must appear?',
      },
    ],
    optionalSlots: [LENGTH_SLOT, IMAGE_SLOT],
    generationHints: `Voice: friendly, scannable, conversational.
Structure: strong hook → short sections with subheads → practical takeaway close.
Prefer short paragraphs and bullets; keep it blog-length energy even if medium/long.`,
    confirmLead:
      'Got a solid post shape. Nudge the outline if you like — then we’ll write it with a real hook and a clear takeaway.',
  },

  technical_guide: {
    id: 'technical_guide',
    label: 'Technical guide',
    openingPrompt:
      'Let’s build a how-to someone can actually use on site. What procedure are we walking through?',
    requiredSlots: [
      {
        key: 'skillLevel',
        whyHint: 'Skill level sets jargon and step depth.',
        exampleQuestion: 'What skill level is the audience (crew, foreman, PE)?',
      },
      {
        key: 'prerequisites',
        whyHint: 'Prerequisites stop people starting unprepared.',
        exampleQuestion: 'What prerequisites or tools are assumed?',
      },
      {
        key: 'procedure',
        whyHint: 'The goal procedure is the spine of the guide.',
        exampleQuestion: 'What is the goal procedure or outcome of the guide?',
      },
      {
        key: 'failureModes',
        whyHint: 'Failure modes prevent costly mistakes.',
        exampleQuestion: 'What common failure modes or gotchas should we warn about?',
      },
      {
        key: 'safety',
        whyHint: 'Safety / compliance belongs before risky steps.',
        exampleQuestion: 'Any safety or compliance points that must be included?',
      },
    ],
    optionalSlots: [LENGTH_SLOT, IMAGE_SLOT],
    generationHints: `Voice: instructional, precise, safety-conscious.
Structure: audience & prerequisites → numbered procedure → failure modes / troubleshooting → safety/compliance callouts.
Use checklists and numbered lists heavily; call out hazards clearly.`,
    confirmLead:
      'Procedure outline is ready. Edit steps if needed — then we’ll write it precise, checklist-friendly, and safety-first.',
  },
}

export function getDraftPlaybook(type: ConstructionContentType): DraftPlaybook {
  return DRAFT_PLAYBOOKS[type]
}

export function listDraftPlaybooks(): DraftPlaybook[] {
  return Object.values(DRAFT_PLAYBOOKS)
}

/** Format playbook slots for injection into the ask-draft system prompt */
export function formatPlaybookForPrompt(playbook: DraftPlaybook): string {
  const req = playbook.requiredSlots
    .map((s) => `- ${s.key}: WHY — ${s.whyHint} | Example Q — ${s.exampleQuestion}`)
    .join('\n')
  const opt = playbook.optionalSlots
    .map((s) => `- ${s.key}: WHY — ${s.whyHint} | Example Q — ${s.exampleQuestion}`)
    .join('\n')
  return `Active playbook: ${playbook.id} (${playbook.label})
Opening guidance: ${playbook.openingPrompt}

Required WHY slots (elicit conversationally; adapt wording to prior answers; do not dump all questions at once):
${req}

Optional slots (offer via askOptionalQuestions after required slots are filled):
${opt}

When submitting the plan, put each filled slot into whys[key] and synthesize angle/mustInclude from them.
Ask like a colleague reacting to their story — never expose slot keys or formal writing theory unless they ask.`
}

export function formatWhysForPrompt(whys: Record<string, string> | undefined): string {
  if (!whys) return ''
  const lines = Object.entries(whys)
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => `- ${k}: ${v.trim()}`)
  return lines.length ? `Interview WHYs:\n${lines.join('\n')}` : ''
}
