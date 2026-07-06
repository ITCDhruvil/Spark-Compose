import type { ConstructionContentType, ConstructionDraftLength } from '@/lib/api/ai-types'

export interface ConstructionDraftFixture {
  audience: string
  topic: string
  angle: string
  mustInclude: string
  length: ConstructionDraftLength
}

export const CONSTRUCTION_DRAFT_FIXTURES: Record<ConstructionContentType, ConstructionDraftFixture> = {
  article: {
    audience: 'Readers of a national commercial GC trade magazine.',
    topic:
      'Tower crane on a 22-story hotel: steel delivery windows slipped three days — who owned the float and how the GC recovered the critical path.',
    angle: 'Reported piece: timeline, one conflict (GC vs steel fab), one fix that worked.',
    mustInclude:
      'Add a markdown table: planned vs actual steel tons placed per week (made-up OK). Name crane standby cost as a line item discussion only.',
    length: 'long',
  },
  blog_post: {
    audience: 'Field crew and supers scrolling between breaks.',
    topic: 'Trench safety in one page: when to bench, when a box is mandatory, and what your spotter actually watches.',
    angle: 'Friendly, short sections; no lecturing; one clear "do this Monday" takeaway.',
    mustInclude: 'Start with a one-sentence TL;DR. End with a line inviting readers to share their own trench story.',
    length: 'short',
  },
  case_study: {
    audience: 'Owner rep and GC precon comparing delivery methods.',
    topic:
      'K–12 addition: switched to prefab exterior wall panels mid-design — impact on enclosure date and inspection sequencing.',
    angle: 'Classic case: situation, constraint, intervention, measured outcome, two lessons learned.',
    mustInclude:
      'Include a before/after table: calendar days to dry-in, truck deliveries to site, and QA punch items (example numbers).',
    length: 'long',
  },
  experience_share: {
    audience: 'Other ironworkers and raising-gang leads.',
    topic:
      'Raising a W36 beam on a windy afternoon: tagline slipped once, we called a full stop, reset the choker, and finished after a new lift plan.',
    angle: 'First person, one job, what I would do different next time.',
    mustInclude: 'No real company or site names. One sentence on what the foreman said at the stop-work moment.',
    length: 'medium',
  },
  technical_guide: {
    audience: 'Concrete finisher or QC tech who has not done PT slabs before.',
    topic: 'Field checklist after post-tensioning: what to verify before stressing records go to the EOR.',
    angle: 'Numbered steps, tools named, "stop and call engineer if" callouts.',
    mustInclude: 'Add a small table: task vs responsible party (finisher / PT tech / GC QC) — example roles only.',
    length: 'medium',
  },
}
