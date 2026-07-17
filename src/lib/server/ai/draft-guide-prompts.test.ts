import { describe, expect, it } from 'vitest'
import { draftGuidePrompt, normalizeGuideAction } from '@/lib/server/ai/draft-guide-prompts'
import type { AskDraftPlan } from '@/lib/api/ai-types'

const plan: AskDraftPlan = {
  contentType: 'experience_share',
  audience: 'Crew',
  topic: 'Iron rods incident',
  draftName: 'Rebar near-miss',
  outline: [
    { id: 'sec_1', heading: 'What happened' },
    { id: 'sec_2', heading: 'Stakes' },
  ],
  whys: { whatHappened: 'Rods shifted on deck' },
}

describe('draft-guide-prompts', () => {
  it('normalizeGuideAction accepts known actions', () => {
    expect(normalizeGuideAction('proposeOutline')).toBe('proposeOutline')
    expect(normalizeGuideAction('suggestTitles')).toBe('suggestTitles')
    expect(normalizeGuideAction('outlineImpact')).toBe('outlineImpact')
    expect(normalizeGuideAction('nope')).toBeNull()
  })

  it('proposeOutline prompt asks for conversation-specific sections', () => {
    const p = draftGuidePrompt({ action: 'proposeOutline', plan })
    expect(p).toContain('not a fixed template')
    expect(p).toContain('Iron rods incident')
    expect(p).toContain('VOICE for this draft type')
  })

  it('outlineImpact suggests extra sections', () => {
    const p = draftGuidePrompt({ action: 'outlineImpact', plan })
    expect(p).toContain('impactSuggestions')
    expect(p).toContain('NOT already in the outline')
  })

  it('sectionGuide asks for guidance not body copy', () => {
    const p = draftGuidePrompt({
      action: 'sectionGuide',
      plan,
      sectionHeading: 'What happened',
      sectionId: 'sec_1',
    })
    expect(p).toContain('do NOT write the section body')
    expect(p).toContain('What happened')
    expect(p).toContain('first-person')
  })
})
