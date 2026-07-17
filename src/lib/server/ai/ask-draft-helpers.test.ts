import { describe, expect, it } from 'vitest'
import {
  buildAskDraftSystemPrompt,
  ensureOther,
  isContentType,
  parsePlan,
  parseQuestions,
  parseReplyMessage,
} from '@/lib/server/ai/ask-draft-helpers'

describe('ask-draft-helpers', () => {
  it('ensureOther appends Other when missing', () => {
    expect(ensureOther(['Yes', 'No'])).toEqual(['Yes', 'No', 'Other'])
    expect(ensureOther(['Yes', 'Other'])).toEqual(['Yes', 'Other'])
  })

  it('parseQuestions maps ids and options', () => {
    const qs = parseQuestions({
      questions: [
        { id: 'audience', question: 'Who is this for?', options: ['Crew', 'PEs'] },
        { question: '  ', options: [] },
      ],
    })
    expect(qs).toHaveLength(1)
    expect(qs[0]).toEqual({
      id: 'audience',
      question: 'Who is this for?',
      options: ['Crew', 'PEs', 'Other'],
    })
  })

  it('parseQuestions keeps allowMultiple', () => {
    const qs = parseQuestions({
      questions: [{
        id: 'keyPoints',
        question: 'What key points should we cover?',
        options: ['Benefits', 'Cost', 'Other'],
        allowMultiple: true,
      }],
    })
    expect(qs[0]?.allowMultiple).toBe(true)
    expect(qs[0]?.options.at(-1)).toBe('Other')
  })

  it('parseReplyMessage reads message', () => {
    expect(parseReplyMessage({ message: '  Why this matters  ' })).toBe('Why this matters')
    expect(parseReplyMessage({})).toBe('')
  })

  it('parsePlan requires audience and topic and keeps whys', () => {
    expect(parsePlan({ audience: 'Crew', topic: '' })).toBeNull()
    const plan = parsePlan({
      contentType: 'experience_share',
      audience: 'Field supers',
      topic: 'Near miss on tower crane',
      length: 'short',
      includeSampleImage: true,
      whys: { whyNow: 'Recent audit', stakes: 'Life safety', noise: 1 },
      briefSummary: 'A near-miss story with takeaways.',
    })
    expect(plan).toMatchObject({
      contentType: 'experience_share',
      audience: 'Field supers',
      topic: 'Near miss on tower crane',
      length: 'short',
      includeSampleImage: true,
      briefSummary: 'A near-miss story with takeaways.',
      whys: { whyNow: 'Recent audit', stakes: 'Life safety' },
    })
  })

  it('parsePlan keeps outline and draftName', () => {
    const plan = parsePlan({
      contentType: 'experience_share',
      audience: 'Crew',
      topic: 'Rebar incident',
      length: 'medium',
      includeSampleImage: false,
      draftName: 'Rebar near-miss',
      outline: [
        { id: 'sec_1', heading: 'What happened', intent: 'Scene' },
        { id: 'sec_2', heading: 'What was at stake' },
        { id: 'sec_3', heading: 'Takeaway for the crew' },
      ],
    })
    expect(plan?.draftName).toBe('Rebar near-miss')
    expect(plan?.outline).toHaveLength(3)
    expect(plan?.outline?.[0]?.heading).toBe('What happened')
  })

  it('isContentType validates enum', () => {
    expect(isContentType('blog_post')).toBe(true)
    expect(isContentType('poem')).toBe(false)
  })

  it('buildAskDraftSystemPrompt injects pinned playbook', () => {
    const pinned = buildAskDraftSystemPrompt('article')
    expect(pinned).toContain('Active playbook: article')
    expect(pinned).toContain('replyToUser')
    expect(pinned).toContain('thesis:')
    expect(pinned).toMatch(/colleague|human|situation/i)

    const open = buildAskDraftSystemPrompt()
    expect(open).toContain('No content type pinned yet')
    expect(open).toContain('experience_share:')
  })
})
