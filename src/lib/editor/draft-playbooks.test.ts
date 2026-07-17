import { describe, expect, it } from 'vitest'
import {
  DRAFT_PLAYBOOKS,
  formatPlaybookForPrompt,
  formatWhysForPrompt,
  getDraftPlaybook,
  listDraftPlaybooks,
} from '@/lib/editor/draft-playbooks'

describe('draft-playbooks', () => {
  it('defines all five content types', () => {
    const ids = listDraftPlaybooks().map((p) => p.id).sort()
    expect(ids).toEqual([
      'article',
      'blog_post',
      'case_study',
      'experience_share',
      'technical_guide',
    ].sort())
    expect(Object.keys(DRAFT_PLAYBOOKS)).toHaveLength(5)
  })

  it('gives each playbook required WHY slots and generation hints', () => {
    for (const playbook of listDraftPlaybooks()) {
      expect(playbook.requiredSlots.length).toBeGreaterThanOrEqual(3)
      expect(playbook.openingPrompt.length).toBeGreaterThan(20)
      expect(playbook.generationHints.length).toBeGreaterThan(20)
      for (const slot of playbook.requiredSlots) {
        expect(slot.key).toBeTruthy()
        expect(slot.whyHint).toBeTruthy()
        expect(slot.exampleQuestion).toBeTruthy()
      }
    }
  })

  it('experience_share includes story WHYs', () => {
    const keys = getDraftPlaybook('experience_share').requiredSlots.map((s) => s.key)
    expect(keys).toEqual(
      expect.arrayContaining(['whyNow', 'whatHappened', 'stakes', 'takeaway', 'whoShouldAct']),
    )
  })

  it('formats playbook for system prompt injection', () => {
    const text = formatPlaybookForPrompt(getDraftPlaybook('case_study'))
    expect(text).toContain('Active playbook: case_study')
    expect(text).toContain('Required WHY slots')
    expect(text).toContain('problem:')
    expect(text).toContain('whys[key]')
  })

  it('formats whys for generation prompt', () => {
    expect(formatWhysForPrompt(undefined)).toBe('')
    expect(formatWhysForPrompt({ takeaway: '  Lock out crane  ', empty: '' })).toBe(
      'Interview WHYs:\n- takeaway: Lock out crane',
    )
  })
})
