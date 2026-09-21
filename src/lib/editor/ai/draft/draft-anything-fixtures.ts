import type { ConstructionContentType, ConstructionDraftLength } from '@/lib/api/ai-types'

export interface DraftAnythingFixture {
  audience: string
  topic: string
  angle: string
  mustInclude: string
  length: ConstructionDraftLength
  photoPlacementHint: string
}

/** Sample photos served from /sample_images/ (copied from docs/sample_images). */
export const DRAFT_ANYTHING_SAMPLE_IMAGES = [
  { url: '/sample_images/sample.png', name: 'sample.png' },
  { url: '/sample_images/mistake.png', name: 'mistake.png' },
] as const

/** @deprecated use DRAFT_ANYTHING_SAMPLE_IMAGES */
export const DRAFT_ANYTHING_SAMPLE_IMAGE_URL = DRAFT_ANYTHING_SAMPLE_IMAGES[0].url

export const DRAFT_ANYTHING_FIXTURES: Record<ConstructionContentType, DraftAnythingFixture> = {
  article: {
    audience: 'Readers of a commercial construction trade magazine.',
    topic:
      'Tower crane over a mid-rise pour and a site quality issue: sequencing columns under the crane while catching workmanship mistakes early.',
    angle: 'Reported progress piece with one schedule risk and one quality recovery move.',
    mustInclude:
      'Use both site photos: (1) the tower crane / structural progress shot and (2) the mistake / defect photo. Place each with a factual caption — progress vs. what went wrong and how it is corrected.',
    length: 'long',
    photoPlacementHint:
      'Progress photo after the opening; mistake photo in a quality / lessons section with a corrective caption.',
  },
  blog_post: {
    audience: 'Field supers and project engineers scrolling between meetings.',
    topic:
      'Two photos from the same job: vertical progress under the tower crane, and a workmanship mistake we caught before it became a rework event.',
    angle: 'Friendly, visual-first blog that contrasts progress and a fixable defect.',
    mustInclude:
      'Open with the progress image, then use the mistake image when discussing QA. AI should write clear captions for both.',
    length: 'medium',
    photoPlacementHint: 'Lead with progress photo; mistake photo mid-article in the QA section.',
  },
  case_study: {
    audience: 'Owner reps comparing delivery methods on urban mid-rise work.',
    topic:
      'Urban mid-rise frame: crane-fed column pours and how a visible site mistake was documented and closed out.',
    angle: 'Case format: situation, constraint, intervention, outcome.',
    mustInclude:
      'Use the crane progress photo as evidence of delivery, and the mistake photo as evidence of QA discipline. Captions must stay factual.',
    length: 'long',
    photoPlacementHint: 'Progress image in Situation; mistake image in Intervention / Outcome.',
  },
  experience_share: {
    audience: 'Other supers and raising-gang leads.',
    topic:
      'What I check under the tower crane — and the one mistake I will not walk past on a pour day.',
    angle: 'First person, practical takeaways from two photos.',
    mustInclude:
      'Tie the story to both photos: crane/columns/rebar progress, then the mistake shot as a near-miss for quality.',
    length: 'medium',
    photoPlacementHint: 'Progress photo early; mistake photo where the narrator stops the work.',
  },
  technical_guide: {
    audience: 'Junior PEs and field engineers new to crane-supported pours.',
    topic:
      'Reading progress photos and defect photos: how to verify pour readiness and flag workmanship issues.',
    angle: 'Checklist style with photo callouts.',
    mustInclude:
      'Use both sample images. Caption the progress photo (crane, columns, rebar) and the mistake photo (what is wrong and what to check). Add a small checklist table.',
    length: 'medium',
    photoPlacementHint: 'Progress image near the top; mistake image beside the defect checklist.',
  },
}
